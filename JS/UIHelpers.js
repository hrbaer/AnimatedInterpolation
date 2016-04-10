// Get a DOM element
function getElement(any) {
  return typeof(any) === 'string' ?  document.querySelector(any) : any;
}


// Adjust the resolution of the canvas
function setupResolution(canvas) {
  var scaleFactor = window.devicePixelRatio || 1;
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
  if (scaleFactor > 1) {
    canvas.width = canvas.width * scaleFactor;
    canvas.height = canvas.height * scaleFactor;
  }
}


// Convert Color Brewer colors to RGB arry
function colorBrewerToRGBArray(colors) {
  return colors.reduce(function(p, c) {
    p.push(parseInt(c.substr(1, 2), 16));
    p.push(parseInt(c.substr(3, 2), 16));
    p.push(parseInt(c.substr(5, 2), 16));
    return p;
  }, []);
}


// Create a color scale from one or more color brewer codes
function createColorBrewerScale(spec) {
  return spec.reduce(function(p, c) {
    var color = colorbrewer[c.name][c.size];
    if (c.reversed) {
      color = color.slice().reverse();
    }
    return p.concat(color)
  }, []);
}


// Handle slider with attached label
function sliderHandler(slider, label, callback, display) {
  slider = getElement(slider);
  label = getElement(label);
  var handler = function() {
    handler.setValue = function(value) {
      callback(label.textContent = display ? display(value) : value);
      if (slider.value !== value) { slider.value = value }
    };
    slider.addEventListener('input', function(event) {
      handler.setValue(event.target.value);
    }, false);
    handler.setValue(slider.value);
    return handler;
  };
  handler();
  return handler;
};


// jQuery-like selector
function $(selector) {
  return document.querySelector(selector);
}


// Show the average number of frames per second
function fpsHandler(selector) {
  var element = $(selector);
  var counter = 0;
  var acc = 0;
  return function(dt) {
    acc += dt;
    counter += 1;
    if (acc > 250) {
      var fps = 1000 * counter / acc;
      element.textContent = Math.round(fps);
      counter = 0;
      acc = 0;
    }
  }
}


// Time parser for seconds, minutes and hours
  function toSecs(v) {
    var p = v.split(' ');
    var s = +p[0];
    if (p.length > 1) {
      switch (p[1]) {
      case 'min':
        s *= 60;
        break;
      case 'h':
        s *= 3600;
        break;
      }
    }
    return s;
  }


// Request or exit fullscreen mode for any display element.
function toggleFullScreen() {
  var isFullScreen = false;
  if (!document.fullscreenElement &&
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
    else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
    else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    }
    else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    isFullScreen = true;
  }
  else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
    else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
  return isFullScreen;
}
