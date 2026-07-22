'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8');
const AUNTIE_TOBI_DIRECTORY = require('./directory.json');

function searchBusinesses(query, limit, cityHint) {
  limit = limit || 6;
  var stopWords = ['the','and','for','near','find','looking','where','can','are','any','have','you','what','best','good','in','at','a','an','i','me','my','do','is','it'];
  var allWords = query.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(function(w){return w.length>2;});
  var serviceWords = allWords.filter(function(w){return stopWords.indexOf(w)===-1&&w.length>2;});
  if(!serviceWords.length) serviceWords=allWords;

  var ukCities=['london','birmingham','manchester','leeds','bristol','sheffield','liverpool','nottingham','coventry','leicester','edinburgh','glasgow','cardiff','belfast','newcastle','brighton','reading','oxford','cambridge','southampton','portsmouth','wolverhampton','bradford','derby','exeter','hull','luton','peterborough','stoke','sunderland','basildon','laindon','kent','surrey','norwich','colchester','chelmsford','basingstoke','southend','york','worcester','bath','bournemouth'];

  var queryLoc=null;
  var queryWords=query.toLowerCase();
  ukCities.forEach(function(city){if(queryWords.indexOf(city)!==-1)queryLoc=city;});
  var nearbyCity=queryLoc||(cityHint?cityHint.toLowerCase():null);

  function scoreBusinesses(businesses,locFilter){
    return businesses.map(function(b){
      var score=0;
      var nameL=b.name.toLowerCase();
      var catL=(b.cat||'').toLowerCase();
      var locL=(b.loc||'').toLowerCase();
      var descL=(b.desc||'').toLowerCase();
      var kwStr=(b.keywords||[]).join(' ').toLowerCase();
      serviceWords.forEach(function(w){
        if(nameL.indexOf(w)!==-1)score+=10;
        if(catL.indexOf(w)!==-1)score+=8;
        if(kwStr.indexOf(w)!==-1)score+=6;
        if(descL.indexOf(w)!==-1)score+=3;
      });
      if(b.verified)score+=5;
      if(locFilter&&locL.indexOf(locFilter)!==-1)score+=20;
      return Object.assign({},b,{score:score});
    }).filter(function(b){return b.score>0;})
     .sort(function(a,b){return b.score-a.score;});
  }

  if(nearbyCity){
    var nearbyResults=scoreBusinesses(AUNTIE_TOBI_DIRECTORY,nearbyCity).slice(0,limit);
    if(nearbyResults.length>0)return{results:nearbyResults,scope:'local',city:nearbyCity};
  }
  return{results:scoreBusinesses(AUNTIE_TOBI_DIRECTORY,null).slice(0,limit),scope:'uk',city:nearbyCity};
}

function formatBusinessContext(businesses,scope,city){
  if(!businesses.length)return'';
  var bizData=businesses.map(function(b){
    return{slug:b.slug,name:b.name,cat:b.cat||'',loc:b.loc||'UK',desc:b.desc?b.desc.substring(0,100):'',verified:b.verified||false,wa:b.wa||'',phone:b.phone||''};
  });
  var scopeNote=scope==='local'&&city
    ?'\n[SEARCH_SCOPE: Found '+businesses.length+' businesses near '+city+'.]'
    :'\n[SEARCH_SCOPE: No businesses found locally in '+(city||'users city')+' - showing UK-wide. Do NOT say near '+(city||'their city')+'.]';
  return'\n\n<<<BIZ_JSON:'+JSON.stringify(bizData)+'>>>'+scopeNote;
}

exports.handler=async function(event){
  if(event.httpMethod==='OPTIONS'){
    return{statusCode:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'},body:''};
  }

  if(event.httpMethod==='GET'){
    var k=process.env.OPENROUTER_API_KEY;
    return{statusCode:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({status:'ok',hasApiKey:!!k,keyPrefix:k?k.substring(0,8)+'...':'NOT SET',directory:AUNTIE_TOBI_DIRECTORY.length+' businesses'})};
  }

  try{
    var body=JSON.parse(event.body);
    var apiKey=process.env.OPENROUTER_API_KEY;
    if(!apiKey)return{statusCode:500,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify({error:'OPENROUTER_API_KEY not set'})};

    var lastMessage=body.messages&&body.messages.length>0?body.messages[body.messages.length-1].content||'':'';
    var recentMessages=body.messages?body.messages.slice(-4):[];

    var isBusinessSearch=/find|looking for|where can i|recommend|near me|hair|makeup|restaurant|food|shop|salon|church|accountant|solicitor|lawyer|doctor|dentist|photographer|fashion|clothing|tailor|business|caterer|cake|gele|wig|stylist|barber|beautician|lash|nail|tutor|cleaner|dj|grocery|groceries|foodstore|event planner/i.test(lastMessage);

    var businessContext='';
    if(isBusinessSearch){
      var userCity=body.userCity||'';
      var searchResult=searchBusinesses(lastMessage,6,userCity);
      if(searchResult.results.length>0)businessContext=formatBusinessContext(searchResult.results,searchResult.scope,searchResult.city);
    }

    var systemContent=SYSTEM_PROMPT+(businessContext||'');
    var messages=[{role:'system',content:systemContent}].concat(recentMessages);
    var requestBody=JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:500,messages:messages});

    var result=await new Promise(function(resolve,reject){
      var req=https.request({hostname:'openrouter.ai',path:'/api/v1/chat/completions',method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey,'HTTP-Referer':'https://auntietobi.co.uk','X-Title':'Auntie Tobi','Content-Length':Buffer.byteLength(requestBody)}},function(res){
        var data='';
        res.on('data',function(c){data+=c;});
        res.on('end',function(){try{resolve(JSON.parse(data));}catch(e){reject(e);}});
      });
      req.on('error',reject);
      req.setTimeout(20000,function(){req.destroy();reject(new Error('Timeout'));});
      req.write(requestBody);
      req.end();
    });

    var reply=result.choices&&result.choices[0]&&result.choices[0].message?result.choices[0].message.content:null;
    if(!reply){console.log('OpenRouter error:',JSON.stringify(result).substring(0,300));reply='Sorry, I could not get a response. Please try again!';}

    if(businessContext&&businessContext.indexOf('<<<BIZ_JSON:')!==-1){
      reply=reply.replace('[SHOW_BIZ_CARDS]','')+'\n'+businessContext.trim();
    }

    return{statusCode:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify({content:[{type:'text',text:reply}]})};

  }catch(err){
    console.log('Error:',err.message);
    return{statusCode:500,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify({error:err.message})};
  }
};
