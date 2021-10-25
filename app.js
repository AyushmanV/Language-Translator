const express=require('express');
const ejs=require('ejs');
const bodyParser=require('body-parser');
const https=require('https');
//const redis=require('redis');
const mongoose=require('mongoose');

const app=express();

app.set('view engine','ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect('mongodb://localhost:27017/tanslatorDB',{useNewUrlParser:true});

const translatorSchema=new mongoose.Schema({
  key:{
    type:String,
    required:true
  },
  value:{
    type:String,
    required:true
  }
});

const Translate = mongoose.model('Translate',translatorSchema);

//similar languages for pre chaching list

const prechachelanguages = [
  ["kn", "bn", "gu", "pa", "ta", "te"],  //hi
  ["cy","fr", "de", "it", "es", "nl"],   //en
  ["de", "it", "es", "nl"],              //fr
  ["hi","ta","te","gu"]                  //kn
]

//const redisClient=redis.createClient();

app.get('/',function(req,res){
  res.render('index',{translated_text:''});
})

app.post('/',function(req,res){
  //var firsttime=new Date().getMilliseconds();
  var source=req.body.source;
  var target=req.body.target;
  var content=req.body.content;
  //put the redis code here
  Translate.findOne({key:source+target+content},function(err,result){
    if(!err){
      if(result!=null){
        console.log('Matched');
        //var secondtime=new Date().getMilliseconds();
        //console.log(secondtime-firsttime);
        res.render('index',{translated_text:result.value})
      }
      else{
        console.log('Entered');

        //fetching the translated language for languages in the pre chaching list

        var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl="+source+"&tl="+target+"&dt=t&q=" + encodeURI(content);

        let sr=-1;
        if(source==='hi')
        sr=0;
        else if(source==='en')
        sr=1;
        else if(source==='fr')
        sr=2;
        else if(source==='kn')
        sr=3;
        if(sr!=-1){
          console.log(sr);
          for(let j=0;j<prechachelanguages[sr].length;j++){
            var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl="+source+"&tl="+prechachelanguages[sr][j]+"&dt=t&q=" + encodeURI(content);
            https.get(url,function(response){
              response.on('data',function(data1){
                const dat1=JSON.parse(data1);
                const trans1=new Translate({
                  key:`${source}${prechachelanguages[sr][j]}${content}`,
                  value:dat1[0][0][0]
                })
                trans1.save();
              })
            })
          }
        }

        //fetching the translated language for the inputted source and target languages

        https.get(url,function(response){
          response.on('data',function(data){
            const dat=JSON.parse(data);
            const trans=new Translate({
              key:`${source}${target}${content}`,
              value:dat[0][0][0]
            })
            //console.log(trans);
            trans.save();
            //var secondtime=new Date().getMilliseconds();
            //console.log(secondtime-firsttime);
            res.render('index',{translated_text:dat[0][0][0]});
          })
        })
      }
    }
  })
})

/*redisClient.get(source+target+content,function(err,result){
    if(err)
    console.log(err);
    else if(result!=null){
      console.log('matched');
      var secondtime=new Date().getMilliseconds();
      console.log(secondtime-firsttime);
      res.render('index',{translated_text:result});
    }
    else{
      console.log('Entered');
      var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl="+source+"&tl="+target+"&dt=t&q=" + encodeURI(content);
      https.get(url,function(response){
        response.on('data',function(data){
          var dat=JSON.parse(data);
          var str=JSON.stringify(dat[0][0][0]);
          redisClient.set(source+target+content,str);
          var secondtime=new Date().getMilliseconds();
          console.log(secondtime-firsttime);
          res.render('index',{translated_text:str});
        })
      });
    }
  })*/

app.use(function(err, req, res, next) {
    res.status(err.status || 500).json(response.error(err.status || 500));
});

app.listen(3000,function(err){
  console.log("server starting at port 3000");
});




