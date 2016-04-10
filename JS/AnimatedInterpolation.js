/*
  Animated Interpolation

  Author:
  H. R. Baer
  hbaer@ethz.ch

  Version history:
  0.1.0 29/03/2016
  0.2.0 10/04/2016
*/

window.addEventListener('load', function() {

  "use strict";

  // WebGL
  var gl,
      canvas = document.getElementById('canvas1'),
      interpolateProgram, modelProgram, colorCodeProgram, copyToCanvasProgram,
      framebuffer1, framebuffer2,
      filterType = 'linear',
      shading = 1.0, shadingFactor = 1,
      exponent = 2.7,
      mapRatio;
  // Basemap
  var svgCanvas, mapImage,
      blending = 1,
      bounds;
  // Raster data
  var grid;
  // Interface an paramerers
  var lang = document.documentElement.lang,
      animationHandler, shadingHandler,
      minRange = 0, maxRange = 1,
      colorScale;
  // Animation
  var animationLength = '-1 s,-2 s,-5 s,-10 s,-15 s,-30 s,-1 min,-2 min,-5 min,-10 min,-30 min,∞,30 min,10 min,5 min,2 min,1 min,30 s,15 s,10 s,5 s,2 s,1 s'.split(','),
      showFPS = fpsHandler('#label-frames'),
      startTime, stopTime,
      duration = 30000,
      start = 0,
      relativeTime,
      timeSetter,
      running = false;


  /*
   * Handle episodes
   */
  function loadEpisode(episode) {

    shading = shadingFactor = 1;
    relativeTime = 0;
    
    bounds = episode.bounds;

    var colorBrewer;
    if (colorBrewer = episode['color-brewer']) {
      colorBrewer = createColorBrewerScale(colorBrewer);
      colorScale = colorBrewerToRGBArray(colorBrewer);
    }
    else {
      colorScale = episode['color-scale'];
    }
    colorCodeProgram.createTexture('colorscale', colorScale, colorScale.length / 3, 1, { color: 'rgb' })

    var dataRange;
    if (dataRange = episode['data-range']) {
      minRange = dataRange[0];
      maxRange = dataRange[1];
    }

    var colorCodes = { symbols: colorBrewer };
    colorCodes.values = colorCodes.symbols.map(function(e, i) {
      return Math.round(minRange + i * (maxRange - minRange) / colorCodes.symbols.length);
    });
    colorCodes.values.push(maxRange);

    var symbolRange;
    if (symbolRange = episode['symbol-range']) {
      var minSymbol = symbolRange[0];
      var maxSymbol = symbolRange[1];
      var numSymbols = colorCodes.symbols.length;
      var classWidth = (maxRange - minRange) / numSymbols;
      var startIndex = Math.round((minSymbol - minRange) / classWidth);
      var stopIndex = Math.round((maxSymbol - minRange) / classWidth);
      colorCodes.symbols = colorCodes.symbols.slice(startIndex, stopIndex);
      colorCodes.values = colorCodes.values.slice(startIndex, stopIndex + 1);
    }

    mapKeys('#map-keys-panel', colorCodes, function(evt) {}, { reverse: true });

    var animation;
    if (animation = episode['animation']) {
      var index = animationLength.indexOf(animation);
      animationHandler.setValue(index);
    }

    var timePeriod;
    if (timePeriod = episode['time-period']) {
      var begin = new Date(timePeriod.start);
      var end = new Date(timePeriod.stop);
      startTime = begin.valueOf()
      stopTime = end.valueOf()

      timeSetter = timeDriver('.driver#drive-date-time', begin, begin, end, function(t) {
        relativeTime = (t - startTime) / (stopTime - startTime);
      }, lang);
    }

    shadingFactor = 1;
    var shadingControl;
    if (shadingControl = episode['shading']) {
      shadingFactor = shadingControl;
    }
    shadingHandler.setValue(shading);
    
    document.querySelector('#map-description').textContent = episode['description'][lang];
    
    mapRatio = (bounds[2] - bounds[0]) / (bounds[3] - bounds[1]);

    // Load map image
    var mapFile;
    if (mapFile = episode['map-file']) {
      mapImage.onload = function() {
        createMapTexture();
      }
      mapImage.src = mapFile;
    }

    loadPointTimeSeries(episode['data-file'], episode['loc-file'], loadDatabase);
    
    var gridFile;
    if (gridFile = episode['grid-file']) {
      grid = new Grid();
      grid.loadData(gridFile, loadGrid);
    }
    else {
      modelProgram.useProgram()
        .createTexture('dtm', [1], 1, 1, { color: 'alpha', type: 'float', minfilter: filterType, magfilter: filterType })
    }
    
    start = Date.now();
  }

  insertScripts('Shaders/shaders.html', init);


  // Create a map texture from the base map
  function createMapTexture() {
    var ctx = svgCanvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, svgCanvas.width, svgCanvas.height);
    if (mapImage.width) {
      ctx.drawImage(mapImage, 0, 0, svgCanvas.width, svgCanvas.height);
    }

    var map = ctx.getImageData(0, 0, svgCanvas.width, svgCanvas.height).data;
    copyToCanvasProgram.useProgram()
      .createTexture('map', map, svgCanvas.width, svgCanvas.height, { color: 'rgba' });
  }


  /*
   * Load point measurement time series.
   * Expects two data sets: the measurements and the station list.
   * Measurement should contain: stat, time, var.
   * Station list should contain: stat, x, y, z.
   * The function creates an object organized by time stamp.
   * Each time stamp contains data for all stations.
   */
  function loadPointTimeSeries(measurements, locations, callback) {

    // Read and transform measurements
    var stats = new Set();
    d3.tsv(measurements, function(d) {
      stats.add(d.stat);
      d.var = parseFloat(d.var);
      d.t = new Date(d.time);
      d.time = d.t.valueOf();
      return d;
    }, function(data) {

      // Group measurements by time stamp
      var groupsByTimestamp = d3.nest()
        .key(function(d) { return d.time; })
        .entries(data);

      // Transform locations
      d3.tsv(locations, function(d) {
        return { stat: d.stat, x: +d.x, y: +d.y, z: +d.z };
      }, function(locs) {

        // Organize locations by names
        var locsObj = locs.reduce(function(p, c) {
          p[c.stat] = c;
          return p;
        }, {});

        // Avoid gaps in the table
        var data = groupsByTimestamp.map(function(e) {
          var measObj = e.values.reduce(function(p, c) {
            p[c.stat] = c;
            return p;
          }, {});
          var rec = [];
          stats.forEach(function(s) {
            var loc = locsObj[s];
            var meas = measObj[s];
            rec.push({ stat: s, x: loc.x, y: loc.y, z: loc.z, v0: meas ? meas.var : Number.NaN, t: e.key });
          });
          return rec;
        });
        
        // Return the data
        callback(data);
      });
    });
    
  };


  // Calculate regression
  function calculateRegression(data, accX, accY) {
    var meanX = d3.mean(data, accX);
    var meanY = d3.mean(data, accY);
    var sumXY = 0.0, sumXX = 0.0;
    data.forEach(function(d) {
      var valX = accX(d);
      var valY = accY(d);
      if (!isNaN(valX) && !isNaN(valY)) {
        sumXY += (valX - meanX) * (valY - meanY);
        sumXX += (valX - meanX) * (valX - meanX);
      }
    });
    var b = sumXY / sumXX;
    var a = meanY - b * meanX;
    return { a: a, b: b };
  }


  // Normalize the data values
  function normalize(slice, reg, accX, accY) {
    slice.forEach(function(d) {
      var valX = accX(d);
      var valY = accY(d);
      d.v0 = valY - reg * valX;
      d.z = reg;
    })
  }


  // Turn the database into a map texture
  function loadDatabase(data) {

    var numTimes = data.length;
    var numStations = data[0].length;
    
    // console.log('# time slices', numTimes, '# stations', numStations);

    data.forEach(function(e) {
      var regression = calculateRegression(e, function(d) { return d.z }, function(d) { return d.v0 });
      normalize(e, regression.b, function(d) { return d.z }, function(d) { return d.v0 });
    })
    
    data = d3.transpose(data);
    var a = [];
    var min = Number.MAX_VALUE, max = -min;
    data.forEach(function(e) {
      e.forEach(function(e) {
        var x = (e.x - bounds[0]) / (bounds[2] - bounds[0]);
        var y = (e.y - bounds[1]) / (bounds[3] - bounds[1]);
        var v0 = e.v0;
        if (isNaN(v0)) {
          x = y = -10e10;
          v0 = 0;
        }
        else {
          min = Math.min(min, v0);
          max = Math.max(max, v0);
        }
        a.push(x);
        a.push(y);
        a.push(e.z);
        a.push(v0);
      })
    });
    
    console.log('Minimum value: ' + min.toFixed(1) + ', maximum value: ' + max.toFixed(1));

    createInterpolator(a, numTimes, numStations);

  }


  // Creates the interpolator program
  function createInterpolator(data, numTimes, numStations) {
    interpolateProgram = GLProgram.create(gl)
      .loadShader('copyVertices')
      .loadShader('interpolate', '#define SIZE ' + numStations)
      .linkProgram()
      .setUniform('wh', canvas.width, canvas.height)
      .setUniform('stations', numStations)
      .setUniform('times', numTimes)
      .createTexture('data', data, numTimes, numStations, { color: 'rgba', type: 'float', minfilter: filterType, magfilter: filterType })
      .bindLoadedTexture('data', 1)
      .defineUnitQuad('vPosition', 'vTexCoord');
  }


  // Load the grid
  function loadGrid(data) {
    modelProgram.useProgram()
      .createTexture('dtm', data, grid.getNumCols(), grid.getNumRows(), { color: 'alpha', type: 'float', minfilter: filterType, magfilter: filterType })
  }


  // Render each frame of the animated map
  function render() {

    var dt = Date.now() - start;
    start = Date.now();
    showFPS(dt);
    dt = isNaN(duration) ? 0 : dt / duration;

    if (relativeTime < 0 || relativeTime > 1) {
      setTimeout(function() {
        console.log(relativeTime);
        start = Date.now();
        requestAnimationFrame(render);
      }, 1500);
      relativeTime = relativeTime > 1 ? 0 : relativeTime < 0 ? 1 : relativeTime;
    }
    else {
      requestAnimationFrame(render);
    }

    if (timeSetter) {
      var t = startTime + relativeTime * (stopTime - startTime);
      var active = timeSetter(new Date(t));
      dt = active ? 0 : dt;
    }

    // Interpolate
    framebuffer1.bind();
    interpolateProgram.useProgram()
      .bindLoadedTexture('data', 1)
      .setUniform('power', exponent)
      .setUniform('time', relativeTime)
      .drawDefinedQuad()
    framebuffer1.unbind();

    // Model
    framebuffer2.bind();
    modelProgram.useProgram()
      .bindTexture(framebuffer1.texture, 'source', 0)
      .bindLoadedTexture('dtm', 1)
      .drawDefinedQuad()
      .unbindTexture(1)
      .unbindTexture(0);
    framebuffer2.unbind();

    // Color code
    framebuffer1.bind();
    colorCodeProgram.useProgram()
      .bindTexture(framebuffer2.texture, 'source', 0)
      .bindLoadedTexture('colorscale', 1)
      .setUniform('dx', 1.0 / canvas.width)
      .setUniform('dy', 1.0 / canvas.height)
      .setUniform('sz', shading)
      .setUniform('minval', minRange)
      .setUniform('maxval', maxRange)
      .drawDefinedQuad()
      .unbindTexture(1)
      .unbindTexture(0);
    framebuffer1.unbind();

    // Copy to canvas
    copyToCanvasProgram.useProgram()
      .bindTexture(framebuffer1.texture, 'source', 0)
      .bindLoadedTexture('map', 1)
      .setUniform('blending', blending)
      .drawDefinedQuad()
      .unbindTexture(1)
      .unbindTexture(0);

    gl.finish();

    relativeTime += dt;

  }


  // Initialize data interpolation
  function init() {
    canvas.width = 385;
    canvas.height = 240;

    setupResolution(canvas);

    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });

    var ext = gl.getExtension('OES_texture_float');
    if (!ext) {
      throw 'Floating-point textures are not supported.';
    }
    ext = gl.getExtension('OES_texture_float_linear');
    if (!ext) {
      throw 'Linear interpolation for floating-point textures is not supported.';
    }

    framebuffer1 = GLFramebuffer.create(gl, { type: 'float' })
      .bind()
      // .report()
      // .checkCompleteness()
      .unbind();

    framebuffer2 = GLFramebuffer.create(gl, { type: 'float' })
      .bind()
      // .report()
      // .checkCompleteness()
      .unbind();

    modelProgram = GLProgram.create(gl)
      .loadShader('copyVertices')
      .loadShader('model')
      .linkProgram()
      .createTexture('dtm', [0], 1, 1, { color: 'alpha', type: 'float', minfilter: filterType, magfilter: filterType })
      .defineUnitQuad('vPosition', 'vTexCoord');

    colorCodeProgram = GLProgram.create(gl)
      .loadShader('copyVertices')
      .loadShader('colorCodeAndShade')
      .linkProgram()
      .defineUnitQuad('vPosition', 'vTexCoord');

    copyToCanvasProgram = GLProgram.create(gl)
      .loadShader('copyVertices')
      .loadShader('copyTexture')
      .linkProgram()
      .defineUnitQuad('vPosition', 'vTexCoord');

    createInterpolator([], 0, 0);
    
    svgCanvas = document.createElement('canvas');
    mapImage = new Image();

  }


  // Resize the map
  function resize() {

    // Calculate the new map dimensions
    var container = canvas.parentElement;
    var width = container.offsetWidth;
    var height = container.offsetHeight;

    if (mapRatio) {
      var ratio = width / height;
      if (mapRatio < ratio) {
        width = Math.round(mapRatio * height);
      }
      else if (mapRatio > ratio) {
        height = Math.round(width / mapRatio);
      }
    }

    canvas.width = width;
    canvas.height = height;
    setupResolution(canvas);

    // Update the frame buffers
    framebuffer1.update();
    framebuffer2.update();

    // Update the viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    if (gl) {
      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // Rastersize the map
    svgCanvas.width = canvas.width;
    svgCanvas.height = canvas.height;

    // Recreate the base map
    createMapTexture();
  }


  window.addEventListener('resize', function(evt) {
    resize();
  })


  function setAnimation(value) {
    duration = 1000 * toSecs(value);
  }


  function setShading(value) {
    shading = shadingFactor * value;
  }


  function setBlending(value) {
    blending = 0.01 * value;
  }


  animationHandler = sliderHandler('#slider-animation', '#label-animation', setAnimation, function(i) { return animationLength[i] });
  shadingHandler = sliderHandler('#slider-shading', '#label-shading', setShading);
  sliderHandler('#slider-blending', '#label-blending', setBlending);


  // Fullscreen button
  $('#fullscreen-button').addEventListener('click', function(event) {
    var isFullScreen = toggleFullScreen();
    this.classList[isFullScreen ? 'add' : 'remove']('on');
  });


   // Load a JSON file.
  function loadJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('text/json');
    xhr.open("GET", url, true);
    xhr.onload = function() {
      var data = JSON.parse(xhr.responseText);
      callback(data);
    }
    xhr.send();
  }


  // Reset animation.
  $('#reset-button').addEventListener('click', function(evt) {
    relativeTime = 2;
  });


  // Choose an episode.
  $('#episode-options').addEventListener('change', function(evt) {
    var spec = this.options[this.selectedIndex].dataset.spec;
    loadJSON(spec, function(_) {
      loadEpisode(_);
      if (!running) {
        resize();
        render();
        running = true;
      }
    })
  });


  // Load the index file and present  its contents
  loadJSON('Data/index.json', function(episode) {
    var select = document.querySelector('#episode-options');
    episode.forEach(function(e) {
      var option = document.createElement('option');
      option.dataset.spec = e.spec;
      option.textContent = e.title[lang];
      select.appendChild(option);
    })
  });

});
