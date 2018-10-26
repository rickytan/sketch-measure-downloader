!(function() {
  var project = JSON.parse(document.scripts[0].text.match(/SMApp\((.+)\)\ }\);/)[1]);
  var imgs = document.querySelectorAll('img[src^="assets"]');
  // var urls = Array.prototype.slice.call(imgs).map(function(img) {
  //   return img.src;
  // });
  window.chrome.runtime.sendMessage({
    project: project,
    // urls: urls, 
    href: window.location.href
  });
})();