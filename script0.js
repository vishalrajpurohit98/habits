
if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
  window.addEventListener('load', function(){
    try{ navigator.serviceWorker.register('sw.js'); }catch(e){}
  });
}
