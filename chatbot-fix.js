(function(){
  'use strict';
  function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function settings(){
    var d={name:'Property Assistant',placeholder:'বাংলা / Banglish / English-এ লিখুন...',startup:'Hi! বাংলা, Banglish বা English-এ প্রশ্ন করুন। আমি property, price, rent, rooms ও location নিয়ে help করতে পারি.',quick:[{label:'Buy',message:'Buy'},{label:'Rent',message:'Rent'},{label:'Price',message:'Price'},{label:'Contact',message:'যোগাযোগ চাই'}]};
    try{return Object.assign(d,JSON.parse(localStorage.getItem('borshaChatbotSettings')||'{}'));}catch(e){return d;}
  }
  function properties(){
    try{var p=JSON.parse(localStorage.getItem('borshaProperties')||'null');if(Array.isArray(p)&&p.length)return p;}catch(e){}
    return [];
  }
  function reply(text){
    var q=String(text||'').toLowerCase(), p=properties();
    var hit=p.find(function(x){return q.indexOf(String(x.title||'').toLowerCase())>=0;})||p.find(function(x){return q.indexOf(String(x.location||'').toLowerCase())>=0;});
    var bn=/[\u0980-\u09ff]/.test(text), bl=/\b(koto|koita|koyta|ache|ase|nai|chai|dam|room|bed|bath|rent|buy|price|location|property|agent|contact|whatsapp)\b/i.test(text);
    if(hit){var facts=(hit.beds||0)+' beds, '+(hit.rooms||0)+' rooms, '+(hit.baths||0)+' baths, '+(hit.size||'size on request');if(bn)return hit.title+'-এ '+facts+' আছে। Location: '+hit.location+'.';if(bl)return hit.title+'-e '+facts+' ache. Location: '+hit.location+'.';return hit.title+' has '+facts+'. Location: '+hit.location+'.';}
    if(/\brent|ভাড়া|ভাড়া|bhara|vara\b/i.test(q)){var r=p.filter(function(x){return x.status==='For Rent';});return r.length?'Rental properties: '+r.map(function(x){return x.title;}).join(', '):'Ekhon kono rental property nei.';}
    if(/\bbuy|sale|কেনা|বিক্রি\b/i.test(q)){var s=p.filter(function(x){return x.status==='For Sale';});return s.length?'For-sale properties: '+s.map(function(x){return x.title;}).join(', '):'Ekhon kono sale property nei.';}
    if(/contact|যোগাযোগ|whatsapp|ফোন|এজেন্ট/i.test(q))return bn?'Contact page বা নিচের WhatsApp button ব্যবহার করুন।':'Contact page or the WhatsApp button ব্যবহার করুন.';
    return settings().startup;
  }
  function boot(){
    if(document.querySelector('.chatbot-launcher'))return;
    var s=settings(), wrap=document.createElement('div');
    wrap.innerHTML='<button class="chatbot-launcher" id="chatbotLauncher" aria-label="Open property assistant" title="'+escapeHtml(s.name)+'"><span>✦</span></button>'+
      '<section class="chatbot-panel" id="chatbotPanel" aria-label="'+escapeHtml(s.name)+'"><div class="chatbot-head"><div><strong>'+escapeHtml(s.name)+'</strong><small>বাংলা · Banglish · English</small></div><button id="chatbotClose" aria-label="Close chatbot">×</button></div><div class="chatbot-messages" id="chatbotMessages"><div class="chat-msg bot">'+escapeHtml(s.startup)+'</div></div><div class="chatbot-quick">'+(s.quick||[]).filter(function(x){return x.label&&x.message;}).map(function(x){return '<button data-chat="'+escapeHtml(x.message)+'">'+escapeHtml(x.label)+'</button>';}).join('')+'</div><form class="chatbot-form" id="chatbotForm"><input id="chatbotInput" autocomplete="off" placeholder="'+escapeHtml(s.placeholder)+'"><button aria-label="Send message">➜</button></form></section>';
    document.body.appendChild(wrap);
    var panel=document.getElementById('chatbotPanel'), input=document.getElementById('chatbotInput'), messages=document.getElementById('chatbotMessages');
    function add(t,w){var d=document.createElement('div');d.className='chat-msg '+(w||'bot');d.textContent=t;messages.appendChild(d);messages.scrollTop=messages.scrollHeight;}
    document.getElementById('chatbotLauncher').onclick=function(){panel.classList.toggle('open');if(panel.classList.contains('open'))input.focus();};
    document.getElementById('chatbotClose').onclick=function(){panel.classList.remove('open');};
    Array.prototype.forEach.call(document.querySelectorAll('[data-chat]'),function(b){b.onclick=function(){var t=b.getAttribute('data-chat');add(t,'user');add(reply(t));};});
    document.getElementById('chatbotForm').onsubmit=function(e){e.preventDefault();var t=input.value.trim();if(!t)return;add(t,'user');input.value='';add(reply(t));};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
