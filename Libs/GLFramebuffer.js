/**
Implementation of a WebGL framebuffer.
<p>Author: Hans Rudolf Bär</p>
<p>Mail: hbaer@ethz.ch</p>
<p>Date: 2013-05-19</p>
<p>2016-03-29: Updated</p>

@module GLFramebuffer
*/

'use strict';

(function(extern) {

	function GLF(gl, options) {

		var o = options || {},
			type = { byte: gl.UNSIGNED_BYTE, float: gl.FLOAT }[o.type ? o.type : 'byte'];
		
		var framebuffer = gl.createFramebuffer();

		var print = function() {
			console.log.apply(console, arguments);
		}

		/**
		Gets the texture.
		
		@method getTexture
		@return {Object} The texture attached to this framebuffer
		**/
		this.getTexture = function() {
			return this.texture;
		}

		/**
		Checks if this framebuffer is complete.
		
		@method checkCompleteness
		@chainable
		@return {GLFramebuffer} The object itself
		**/
		this.checkCompleteness = function() {
			if (! gl.isFramebuffer(framebuffer)) {
				alert('Failed to create framebuffer object.');
			}
			else {
				print('Successfully created a framebuffer object.');
			}
			var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			print(status === gl.FRAMEBUFFER_COMPLETE ? 'Framebuffer is complete.' : 'Framebuffer is not complete');
			return this;
		}

		/**
		Binds this framebuffer.
		
		@method bind
		@chainable
		@return {GLFramebuffer} The object itself
		**/
		this.bind = function() {
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			return this;
		}

		/**
		Detaches this framebuffer.
		
		@method unbind
		@chainable
		@return {GLFramebuffer} The object itself
		**/
		this.unbind = function() {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			return this;
		}

		/**
		Prints a report about this framebuffer.
		
		@method report
		@chainable
		@return {GLFramebuffer} The object itself
		**/
		this.report = function() {
			print('');
			print('FRAMEBUFFER INFO');
			print('Is a framebuffer:', gl.isFramebuffer(framebuffer));
			print('Red bits:', gl.getParameter(gl.RED_BITS));
			print('Green bits:', gl.getParameter(gl.GREEN_BITS));
			print('Blue bits:', gl.getParameter(gl.BLUE_BITS));
			print('Alpha bits:', gl.getParameter(gl.ALPHA_BITS));
			return this;
		}

		/**
		Attaches a texture to this framebuffer.
		
		@method attachTexture
		@chainable
		@return {GLFramebuffer} The object itself
		**/
		this.attachTexture = function() {
			this.texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, type, null);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
			return this;
		}

		/**
		Clears this framebuffer.
		
		@method clear
		@chainable
		@return {GLFramebuffer} The object itself
		**/
		this.clear = function() {
			gl.clearColor(0.0, 0.0, 0.0, 0.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			return this;
		}

		/**
		Updates this framebuffer.
		Call this method for instance when the framebuffer needs to be resized.
		
		@method update
		@chainable
		@return {GLFramebuffer} The object itself
		**/
		this.update = function() {
			this.bind();
			this.attachTexture();
			this.clear();
			this.unbind();
			return this;
		}
		
		this.update();
	}
	
	/**
	@class GLFramebuffer
	**/
	extern.GLFramebuffer = {
		/**
		Creates a GL program.
		
		@method create
		@param {Object} [options] The parameters to control the texture
			@param {String} [options.type=byte] Either 'float' or 'byte'
		@return {GLFramebuffer} The new GL framebuffer
		**/
		create: function(gl, options) {
			return new GLF(gl, options);
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
