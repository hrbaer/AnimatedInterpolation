/**
Implementation of a WebGL Error.
<p>Author: Hans Rudolf Bär</p>
<p>Mail: hbaer@ethz.ch</p>
<p>Date: 2013-06-01</p>
<p>2016-03-29: Updated</p>

@module GLError
*/

'use strict';

(function(extern) {

	/**
	@class GLError
	**/
	extern.GLError = function(message, info)	{
		this.name = 'GLError';
		this.message = message || '';

		this.show = function() {
			
			var lineNumber;
			if (info.infoLog) {
				lineNumber = parseInt(info.infoLog.match(/[1-9][0-9]*/)) - 1;
			}
			
			var panel = document.createElement('div');
			panel.setAttribute('class', 'errorPanel');
			document.body.appendChild(panel);
			panel.addEventListener('click', function(evt) {
				document.body.removeChild(panel);
			}, false);
			
			var title = document.createElement('h2');
			title.innerHTML = 'Shader Error';
			panel.appendChild(title);
			
			var msg = document.createElement('p');
			msg.innerHTML = message;
			panel.appendChild(msg);
			
			if (info.infoLog) {
				var log = document.createElement('pre');
				log.innerHTML = info.infoLog;
				log.setAttribute('class', 'error');
				panel.appendChild(log);
			}
			
			var tip = document.createElement('p');
			tip.innerHTML = 'Click anywhere to continue.';
			panel.appendChild(tip);
			
			var code = document.createElement('h3');
			code.innerHTML = 'Source Code';
			panel.appendChild(code);
			
			if (this.sourceURL) {
				var paragraph = document.createElement('p');
				var file = document.createElement('a');
				file.innerHTML = this.sourceURL;
				file.setAttribute('href', this.sourceURL);
				file.setAttribute('target', '_blank');
				paragraph.appendChild(file);
				panel.appendChild(paragraph);
			}
			
			if (info.source) {
				var lines = info.source.split('\n');
				var n = lines.length;
				var field = '0000';
				for (var i = 0; i < n; ++i) {
					var src = document.createElement('pre');
					src.setAttribute('class', 'source');
					var num = '' + (i + 1);
					num = field.substring(0, field.length - num.length) + num
					src.innerHTML = num + '\t' + lines[i].replace(/\t/g, '    ');
					if (i === lineNumber) {
						var errorLine = document.createElement('h3');
						errorLine.innerHTML = 'Line of Error';
						panel.insertBefore(errorLine, tip);
						src.setAttribute('class', 'hilite');
						panel.insertBefore(src.cloneNode(true), tip);
					}
					panel.appendChild(src);
				}
			}
		}
	}
	extern.GLError.prototype = Error.prototype;
	
})(window);
