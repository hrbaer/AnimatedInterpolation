/**
Implementation of a WebGL program.
<p>Author: Hans Rudolf Bär</p>
<p>Mail: hbaer@ethz.ch</p>
<p>Date: 2013-05-14</p>

Version history
2013-07-17
  Added HTML element textures
  Moved texture parameters to internal function
2016-03-29
  Updated

@module GLProgram
*/

'use strict';

(function(extern) {

  var VERTICES = [ -1, -1, -1, 1, 1, -1, 1, 1 ],
    TEXCOORDS = [ 0, 0, 0, 1, 1, 0, 1, 1 ];

  function GLP(gl) {

    var SHADERTYPES = { vert: gl.VERTEX_SHADER, frag: gl.FRAGMENT_SHADER };

    var program = gl.createProgram(),
      textures = {},
      unitQuad = {},
      uniformTypeInfo,
      pending = 0;

    function createUniformTypeInfo() {
      uniformTypeInfo = {};
      var num = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < num; ++i) {
        var activeUniform = gl.getActiveUniform(program, i);
        var type = activeUniform.type;
        switch (activeUniform.type) {
          case gl.INT:
          type = '1i';
          break;
          case gl.INT_VEC2:
          type = '2i';
          break;
          case gl.INT_VEC3:
          type = '3i';
          break;
          case gl.INT_VEC4:
          type = '4i';
          break;
          case gl.FLOAT:
          type = '1f';
          break;
          case gl.FLOAT_VEC2:
          type = '2f';
          break;
          case gl.FLOAT_VEC3:
          type = '3f';
          break;
          case gl.FLOAT_VEC4:
          type = '4f';
          break;
          case gl.FLOAT_MAT2:
          type = 'Matrix2fv';
          break;
          case gl.FLOAT_MAT3:
          type = 'Matrix3fv';
          break;
          case gl.FLOAT_MAT4:
          type = 'Matrix4fv';
          break;
        }
        uniformTypeInfo[activeUniform.name] = type;
      }
    }

    function createShader(id, source, shaderType) {
      var shader = gl.createShader(SHADERTYPES[shaderType]);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new GLError('Could not compile shader "' + id + '"', {
          infoLog: gl.getShaderInfoLog(shader),
          source : gl.getShaderSource(shader)
        });
      }
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }

    function shaderTypeFromURL(url) {
      var pos = url.lastIndexOf('.');
      return pos < 0 ? '' : url.substr(pos + 1).toLowerCase();
    }

    function setTextureParameters(params) {
      var p = params || {},
        minfilter = { nearest: gl.NEAREST, linear: gl.LINEAR }[p.minfilter ? p.minfilter : 'nearest'],
        magfilter = { nearest: gl.NEAREST, linear: gl.LINEAR }[p.magfilter ? p.magfilter : 'nearest'],
        wraps = { clamp: gl.CLAMP_TO_EDGE, repeat: gl.REPEAT }[p.wraps ? p.wraps : 'clamp'],
        wrapt = { clamp: gl.CLAMP_TO_EDGE, repeat: gl.REPEAT }[p.wrapt ? p.wrapt : 'clamp']

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magfilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minfilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapt);
    }

    /**
    Gets the attribute location

    @method getAttributeLocation
    @param {String} name The name of the attribute location
    @return {Number} The attribute location
    **/
    this.getAttributeLocation = function(name) {
      return gl.getAttribLocation(program, name);
    }

    /**
    Loads a shader.

    @method loadShader
    @chainable
    @param {String} id The id of the shader program
    @param {String} [def] Any code such as #define to prepend to the shader program
    @return {GLProgram} The object itself
    **/
    this.loadShader = function(id, def) {
      var shaderScript = document.getElementById(id),
        source = def ? def + '\n' : '',
        node = shaderScript.firstChild;
      while (node) {
        if (node.nodeType == Node.TEXT_NODE) {
          source += node.nodeValue;
        }
        node = node.nextSibling;
      }
      var shaderType = shaderScript.getAttribute('type');
      if (shaderType == "x-shader/x-fragment") {
        shaderType = 'frag';
      }
      else if (shaderType == "x-shader/x-vertex") {
        shaderType = 'vert';
      }
      else {
        alert('Element "' + id + '" does not contain a valid shader program');
        return this;
      }
      createShader(id, source, shaderType);
      return this;
    }

    /**
    Loads a shader from an URL.
    @TODO Implement asynchronous loading.

    @method loadShaderFromURL
    @chainable
    @param {String} url The URL to load the shader program from
    @param {String} id The id of the shader program
    @param {String} [def] Any code such as #define to prepend to the shader program
    @param {Function} [callback] A function that is called when loading is finished
    @return {GLProgram} The object itself
    **/
    this.loadShaderFromURL = function(url, id, def, callback) {
      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function(e) {
        switch(this.readyState) {
          case this.UNSENT:
          break;
          case this.OPENED:
          break;
          case this.HEADERS_RECEIVED:
          break;
          case this.LOADING:
          break;
          case this.DONE:
          var source = (def ? def + '\n' : '') + this.responseText;
          var shaderType = shaderTypeFromURL(url);
          createShader(id, source, shaderType);
          if (callback) {
            callback();
          }
          break;
        }
      };

      xhr.open("GET", url, false);
      xhr.overrideMimeType('text/plain');
      xhr.responseType = 'text';
      xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
      xhr.send();
      return this;
    }

    /**
    Links the previously compiled program.

    @method linkProgram
    @chainable
    @return {GLProgram} The object itself
    **/
    this.linkProgram = function() {
      gl.linkProgram(program);
      var infoLog = gl.getProgramInfoLog(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        throw new GLError('Program failed to link.', {
          infoLog: infoLog
        });
      }
      this.useProgram();
      return this;
    }

    /**
    Uses the previously created program.

    @method useProgram
    @chainable
    @return {GLProgram} The object itself
    **/
    this.useProgram = function() {
      gl.useProgram(program);
      return this;
    }

    /**
    Sets an uniform value.
    Note that this method takes care of calling the appropriate GL function.

    @method setUniform
    @chainable
    @param {String} name The name of the uniform variable
    @param {Object} arg* The uniform values to pass
    @return {GLProgram} The object itself
    **/
    this.setUniform = function(name, arg) {
      var type = this.getUniformType(name),
        loc = gl.getUniformLocation(program, name),
        method = 'uniform' + type;
      if (type) {
        if (type.indexOf('Matrix') == 0) {
          gl[method].call(gl, loc, false, arg);
        }
        else {
          var args = Array.prototype.slice.call(arguments, 1);
          Array.prototype.unshift.call(args, loc);
          gl[method].apply(gl, args);
        }
      }
      return this;
    }

    /**
    Gets an uniform value.

    @method getUniform
    @chainable
    @param name The name of the uniform value
    @return {Object} The uniform value
    **/
    this.getUniform = function(name) {
      return gl.getUniform(program, gl.getUniformLocation(program, name));
    }

    /**
    Queries the type of an uniform value.

    @method getUniformType
    @param name The name of the uniform value to query
    @return {String} The type of the uniform value
    **/
    this.getUniformType = function(name) {
      if (!uniformTypeInfo) {
        createUniformTypeInfo()
      }
      return uniformTypeInfo[name];
    }

    /**
    Defines the attribute float array.

    @method setAttributeFloatArray
    @chainable
    @param {String} attributeName The name of the attribute
    @param {Array} array The coordinates to pass use
    @return {GLProgram} The object itself
    **/
    this.setAttributeFloatArray = function(attributeName, array) {
      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
      var attributeLocation = this.getAttributeLocation(attributeName);
      gl.enableVertexAttribArray(attributeLocation);
      gl.vertexAttribPointer(attributeLocation, 2, gl.FLOAT, false, 0, 0);
      return this;
    }

    /**
    Defines the unit quadrangle.

    @method defineUnitQuad
    @chainable
    @param {String} positionAttributeName The name of the position attribute
    @param {String} texcoordAttributeName The name of the texture coordinates attribute
    @return {GLProgram} The object itself
    **/
    this.defineUnitQuad = function(positionAttributeName, texcoordAttributeName) {

      function createBuffer(data) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        return buffer;
      };

      unitQuad.positionBuffer = createBuffer(VERTICES);
      unitQuad.positionBufferName = positionAttributeName;

      unitQuad.texcoordBuffer = createBuffer(TEXCOORDS);
      unitQuad.texcoordBufferName = texcoordAttributeName;

      return this;
    }

    /**
    Draws the previously defined quadrangle.

    @method drawDefinedQuad
    @chainable
    @return {GLProgram} The object itself
    **/
    this.drawDefinedQuad = function() {

      function useBuffer(name, buffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        var attributeLocation = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(attributeLocation);
        gl.vertexAttribPointer(attributeLocation, 2, gl.FLOAT, false, 0, 0);
      }

      useBuffer(unitQuad.positionBufferName, unitQuad.positionBuffer);
      useBuffer(unitQuad.texcoordBufferName, unitQuad.texcoordBuffer);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return this;
    }

    /**
    Draws a quadrangle.

    @method drawQuad
    @chainable
    @param {String} positionAttributeName The name of the position attribute
    @param {String} texcoordAttributeName The name of the texture coordinates attribute
    @return {GLProgram} The object itself
    **/
    this.drawQuad = function(positionAttributeName, texcoordAttributeName) {
      this.defineUnitQuad(positionAttributeName, texcoordAttributeName);
      this.drawDefinedQuad();
      return this;
    }

    /**
    Binds the previously loaded texture.

    @method bindLoadedTexture
    @chainable
    @params textureName The uniform texture name
    @params unit The texture unit
    @return {Object} The uniform value
    **/
    this.bindLoadedTexture = function(textureName, unit) {
      var texture = textures[textureName];
      if (! texture) {
        console.error("Texture '" + textureName + "' does not exist!");
      }
      this.bindTexture(texture.id, textureName, unit);
      return this;
    }

    /**
    Binds the texture.

    @method bindTexture
    @chainable
    @params textureId The texture id
    @params uniformName The name of the texture
    @params unit The texture unit
    @return {Object} The uniform value
    **/
    this.bindTexture = function(textureId, uniformName, unit) {
      var tul = gl.getUniformLocation(program, uniformName);
      if (! tul) {
        console.error('Uniform location "' + uniformName + '" ist not used in shader.');
        return;
      }
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textureId);
      gl.uniform1i(tul, unit);
      return this;
    }

    /**
    Unbinds a texture.

    @method unbindTexture
    @chainable
    @params unit The texture unit
    @return {Object} The uniform value
    **/
    this.unbindTexture = function(unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return this;
    }

    /**
    Creates a texture.

    @method createTexture
    @chainable
    @param {String} textureName The name of the texture
    @param {Array} data The data to create the texture from
    @param {Number} width The required width of the texture
    @param {Number} height The required height of the texture
    @param {Object} [options] The parameters to control the texture
      @param {String} [options.type=byte] Either 'float' or 'byte'
      @param {String} [options.color=rgb] Either 'alpha', 'rgb' or 'rgba'
      @param {String} [options.minfilter=nearest] Either 'nearest' or 'linear'
      @param {String} [options.maxfilter=nearest] Either 'nearest' or 'linear'
      @param {String} [options.wraps=clamp] Either 'clamp' or 'repeat'
    @return {GLProgram} The object itself
    **/
    this.createTexture = function(textureName, data, width, height, options) {
      var o = options || {},
        type = { byte: gl.UNSIGNED_BYTE, float: gl.FLOAT }[o.type ? o.type : 'byte'],
        Arr = { byte: Uint8Array, float: Float32Array }[o.type ? o.type : 'byte'],
        color = { alpha: gl.ALPHA, rgb: gl.RGB, rgba: gl.RGBA }[o.color ? o.color : 'rgba'],
        texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, color, width, height, 0, color, type, data ? new Arr(data) : data);
      setTextureParameters(options);
      gl.bindTexture(gl.TEXTURE_2D, null);
      textures[textureName] = { id: texture, width: width, height: height };
      return this;
    }

    /**
    Creates an image texture.
    The argument of the callback function tells about the number of pending requests.

    @method createImageTexture
    @chainable
    @param {String} textureName The name of the texture
    @param {String} imageURL The URL of the image
    @param {Function} [callback] A function called when the texture is loaded
    @param {Object} [options] The parameters to control the texture
    @return {GLProgram} The object itself
    **/
    this.createImageTexture = function(textureName, imageURL, callback, options) {
      var texture = { id: gl.createTexture() },
        image = new Image();
      pending += 1;
      image.onload = function() {
        texture.width = image.width;
        texture.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        setTextureParameters(options);
        // gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        pending -= 1;
        if (callback) {
          callback(pending);
        }
      }
      image.crossOrigin = "anonymous";
      image.src = imageURL;
      textures[textureName] = texture;
      return this;
    }

    /**
    Creates a texture from an HTML element such as image, canvas or video

    @method createHTMLElementTexture
    @chainable
    @param {String} textureName The name of the texture
    @param {Object} element The HTML element
    @param {Object} [options] The parameters to control the texture
    @return {GLProgram} The object itself
    **/
    this.createHTMLElementTexture = function(textureName, element, options) {
      var texture = {
        id: gl.createTexture(),
        width: element.width,
        height: element.height
      };
      gl.bindTexture(gl.TEXTURE_2D, texture.id);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
      setTextureParameters(options);
      gl.bindTexture(gl.TEXTURE_2D, null);
      textures[textureName] = texture;
      return this;
    }

    /**
    Places an image texture into an existing texture.
    Make sure that you have already created a texture.
    The argument of the callback function tells about the number of pending requests.

    @method placeImageTexture
    @chainable
    @param {String} textureName The name of the texture
    @param {String} imageURL The URL of the image
    @param {Number} xoffset The horizontal position within the existing texure
    @param {Number} yoffset The vertical position within the existing texure
    @param {Function} [callback] A function called when the texture is loaded
    @return {GLProgram} The object itself
    **/
    this.placeImageTexture = function(textureName, imageURL, xoffset, yoffset, callback) {
      var texture = textures[textureName],
        image = new Image();
      pending += 1;
      image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture.id);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.bindTexture(gl.TEXTURE_2D, null);
        pending -= 1;
        if (callback) {
          callback(pending);
        }
      }
      image.crossOrigin = "anonymous";
      image.src = imageURL;
      return this;
    }

    /**
    Copies a texture rectangle to a new position.
    Make sure the the texture rectangle to copy is completely contained within the texture.

    @method copyTexture
    @chainable
    @param {String} textureName The name of the texture
    @param {Number} x The horizontal position of the texure rectangle to copy
    @param {Number} y The vertical position of the texure rectangle to copy
    @param {Number} width The width of the rectangle to copy
    @param {Number} height The height of the rectangle to copy
    @param {Number} xoffset The new horizontal position within the texure
    @param {Number} yoffset The new vertical position within the texure
    @return {GLProgram} The object itself
    **/
    this.copyTexture = function(textureName, x, y, width, height, xoffset, yoffset) {
      var texture = textures[textureName];
      gl.bindTexture(gl.TEXTURE_2D, texture.id);
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, x, y, width, height);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return this;
    }

    /**
    Creates a uniform color texture.
    The texture dimension will be 1 by 1.

    @method copyTexture
    @chainable
    @param {String} textureName The name of the texture
    @param {Number} color The texture color
    @return {GLProgram} The object itself
    **/
    this.createColorTexture = function(textureName, color) {
      return this.createTexture(textureName, color, 1, 1);
    }

    /**
    Gets texture info.
    The texture info is an object providing texture id, width and height

    @method getTextureInfo
    @param {String} textureName The name of the texture
    @return {Object} The texture info
    **/
    this.getTextureInfo = function(textureName) {
      return textures[textureName];
    }
  }

  /**
  @class GLProgram
  **/
  extern.GLProgram = {
    /**
    Creates a GL program.

    @method create
    @return {GLProgram} The new GL program
    **/
    create: function(gl) {
      return new GLP(gl);
    },

    /**
    The current version.

    @property VERSION
    @type String
    @final
    **/
    VERSION: '1.0.0'
  };

})(window);