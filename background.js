!(function() {
  var app = (function() {
    var app = {
      loadedUrls: 0,
      totalUrls: 0,
      progress: function() {
        if (this.totalUrls > 0 && this.loadedUrls < this.totalUrls) {
          chrome.browserAction.setBadgeText({
            text: "" + (100 * this.loadedUrls / this.totalUrls).toFixed(0) + "%"
          });
        } else {
          chrome.browserAction.setBadgeText({text: ""});
        }
      },
      getFilename: function(url, isAsset) {
        var U = new URL(url);
        var pathname = U.pathname;
        if (pathname.lastIndexOf('/') == pathname.length - 1) {
          pathname = pathname.substring(0, pathname.length - 1);
        }
        if (isAsset) {
          var idx = pathname.lastIndexOf("assets");
          if (idx != -1) {
            return decodeURIComponent(pathname.substring(idx + 7));
          }
        }
        var parts = pathname.split("/");
        if (parts.length > 1) {
          return  decodeURIComponent(parts[parts.length - 1]);
        }
        return decodeURIComponent(pathname);
      },
      fetchImage: function(url) {
        var self = this;
        return new Promise(function(resolve, reject) {
          if (url) {
            if (0 === url.indexOf("data:")) resolve(url, true);
            else {
              var xhr = new XMLHttpRequest();
              xhr.responseType = "blob";
              xhr.timeout = 30 * 1000;
              xhr.open("GET", url, true);
              xhr.onload = function() {
                resolve(xhr.response, false);
                self.loadedUrls ++;
                self.progress();
              };

              xhr.ontimeout = reject;
              xhr.onerror = reject;
              xhr.send();
            }
          } else reject("empty url");
        });
      },
      downloadAsZip: function(urls, name) {
        if (urls.length > 0) {
          this.totalUrls = urls.length;
          var zip = new JSZip();
          Promise.all(
            urls.map(function(url) {
              return app.fetchImage(url).then(function(blob, base64) {
                var filename = app.getFilename(url, true);
                var file = zip;
                filename.split('/').forEach(function(path, index, arr) {
                  if (index == arr.length - 1) {
                    file = file.file(path, blob, { base64: base64 });
                  } else {
                    file = file.folder(path);
                  }
                });
                return file;
              });
            })
          )
            .then(function () {
              return zip.generateAsync({ type: "blob" }).then(function (blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = name || "assets.zip";
                var e = document.createEvent("MouseEvents");
                e.initMouseEvent(
                  "click", true, false, null, 0, 0, 0, 0, 0
                  , false, false, false, false, 0, null
                );
                a.dispatchEvent(e);
              });
            })
            .catch(function(e) {
              console.error(e);
              chrome.browserAction.setBadgeText({text: "出错"});
            });
        } else {
          chrome.browserAction.setBadgeText({text: ""});
        }
      }
    };
    return app;
  })();
  chrome.runtime.onMessage.addListener(function(
    request,
    sender,
    response
  ) {
    chrome.browserAction.setBadgeText({text: "0%"});
    var urls = request.urls;
    if (request.project) {
      var base =(function(href) {
        var url = new URL(href);
        url.hash = "";
        return url.toString();
       })(request.href);
      urls = [];
      request.project.slices.forEach(function(slice) {
        slice.exportable.forEach(function(exp) {
          urls.push(base + 'assets/' + exp.path);
        });
      });
    }
    if (urls instanceof Array) {
      var zipname = app.getFilename(request.href || "Assets");
      app.downloadAsZip(urls, zipname + ".zip");
    }
  });
  chrome.browserAction.onClicked.addListener(function() {
    chrome.browserAction.setBadgeText({text: "..."});
    chrome.tabs.executeScript({file: 'content.js'});
  });
})();
