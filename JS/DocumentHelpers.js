// Load an HTML document
function loadHTML(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'document';
  xhr.overrideMimeType('text/html');
  xhr.onload = function(evt) {
    callback(xhr.response);
  };
  xhr.send(null);
}



function insertSelection(url, selection, parent, callback) {
  parent = typeof(parent) == 'string' ? document.querySelector(parent) : parent;
  loadHTML(url, function(html) {
    selection = html.querySelectorAll(selection);
    [].slice.call(selection).forEach(function(element) {
      parent.appendChild(element);
    });
    callback();
  });
}

function insertScripts(url, callback) {
  insertSelection(url, 'script', document.head, callback);
}
