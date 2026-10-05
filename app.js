(function(){
  var a=document.createElement('script');
  a.src='app-legacy.js';
  a.onload=function(){
    if(typeof window.initChatbot==='function') window.initChatbot();
    var b=document.createElement('script');
    b.src='app-enhancements.js';
    b.defer=true;
    document.head.appendChild(b);
  };
  document.head.appendChild(a);
})();
