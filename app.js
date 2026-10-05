(function(){
  var a=document.createElement('script');
  a.src='app-legacy.js';
  a.onload=function(){
    var b=document.createElement('script');
    b.src='app-enhancements.js';
    b.defer=true;
    document.head.appendChild(b);
    var c=document.createElement('script');
    c.src='chatbot-fix.js';
    c.defer=true;
    document.head.appendChild(c);
  };
  document.head.appendChild(a);
})();
