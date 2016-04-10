/*
  Drive-In

  Fast input by clicking, scrolling and typing.

  Author
  H. R. Baer
  hbaer@ethz.ch

  Version 1
  16. 09. 2015

  Version 1.1
  01. 10. 2015

  Version 1.12
  15. 10. 2015
*/

+function(global) {

  "use strict";

  // D R I V E - I N

  var driveIn = function(selector) {

    // HTML text input element selector for the date.
    var driveInput = document.querySelector(selector);
    
    // Needs update
    var needsUpdate = true;

    // Number of pixels for one unit.
    var HPIXELS = 22, VPIXELS = 7;
    
    // Remove children
    while (driveInput.firstChild) {
      driveInput.removeChild(driveInput.firstChild);
    }

    // Is element visible?
    function isVisible(element) {
      return window.getComputedStyle(element).display !== 'none';
    }
    
    // Transforms pixel changes to steps
    var transformer = function(horizontal, vertical) {
      var nx = 0, ny = 0, timeoutID;
      return function(dx, dy) {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(function() {
          nx = 0;
          ny = 0;
        }, 250);
        if (Math.abs(nx) > HPIXELS) {
          horizontal(nx / Math.abs(nx));
          nx = 0;
        }
        if (Math.abs(ny) > VPIXELS) {
          vertical(ny / Math.abs(ny));
          ny = 0;
        }
        nx -= Math.abs(dx) > Math.abs(dy) ? dx : 0;
        ny += Math.abs(dy) > Math.abs(dx) ? dy : 0;
      }
    };
    
    // Horizontal scrolling
    function horizontalScroller(dx) {
      if (dx > 0) { selectNextField(); }
      else if (dx < 0) { selectPreviousField(); };
    }
    
    // Vertical scrolling
    function verticalScroller(dy) {
      getNextValue(dy);
      setSelectionRange(document.activeElement);
    }
    
    // Sets up event handlers for each field
    function addFieldListeners(field) {

      // Key event handling
      field.addEventListener('keydown', function(evt) {

        var key = evt.keyCode || evt.which;
        switch(key) {

          // Moves selection to next field on the right.
          case 39:
            setField(this);
            selectNextField();
            evt.preventDefault();
            break;

          // Moves selection to next field on the left.
          case 37:
            setField(this);
            selectPreviousField();
            evt.preventDefault();
            break;

          // Increases the selected date component value.
          case 40:
            getNextValue(1);
            setSelectionRange(this);
            dispatchChangeEvent();
            evt.preventDefault();
            break;

          // Decreases the selected date component value.
          case 38:
            getNextValue(-1);
            setSelectionRange(this);
            dispatchChangeEvent();
            evt.preventDefault();
            break;

          // Updates on carriage return.
          case 13:
            setField(this);
            setSelectionRange(this);
            dispatchChangeEvent();
            evt.preventDefault();
            break;

          default:
            needsUpdate = true;
            break;
        }
      });

      // Selects fields on mouse up
      field.addEventListener('mouseup', function(evt) {
        if (document.activeElement === this) {
          dispatchClickEvent(this.id)
        }
        if (!evt.shiftKey) {
          setField(this);
          this.focus();
          setSelectionRange(this);
          dispatchChangeEvent();
        }
        evt.preventDefault();
      });
      
      field.addEventListener('focus', function(evt) {
        setSelectionRange(this);
        dispatchChangeEvent();
        evt.preventDefault();
      });
      
      field.addEventListener('blur', function(evt) {
        setField(this);
        evt.preventDefault();
      });
      
      var lastPos;
      
      // Event handling for touch screens
      field.addEventListener("touchstart", function(evt) {
        var touch = event.touches[0];
        lastPos = { x: touch.screenX, y: touch.screenY };
        setSelectionRange(this);
        evt.preventDefault();
      });
    
      field.addEventListener("touchend", function(evt) {
        evt.preventDefault();
      });
    
      // Changing values by touch motion
      field.addEventListener("touchmove", function(evt) {
        var touch = event.touches[0];
        var dx = lastPos.x - touch.screenX;
        var dy = touch.screenY - lastPos.y;
        if (this.__params__) {
          this.__params__.transform(dx, dy);
          dispatchChangeEvent();
        }
        lastPos.x = touch.screenX;
        lastPos.y = touch.screenY;
        evt.preventDefault();
      });

    }
    
    function addContainerListeners(container) {
      // Change to alternative representation
      container.addEventListener('mousedown', function(evt) {
        if (evt.shiftKey) {
          var next = this.nextSibling || this.parentElement.firstChild;
          if (this !== next) {
            this.style.display = 'none';
            next.style.display = 'inherit';
            update(next);
            next.focus();
            setSelectionRange(next);
          }
        }
        evt.preventDefault();
      });
    }
    
    function addTyperListeners(driver) {
      // Change values by mouse wheel
      driver.addEventListener('wheel', function(evt) {
        var field = document.activeElement;
        if (field && field.__params__) {
          if (evt.altKey) {
            field.__params__.transform(evt.deltaY, evt.deltaX);
          }
          else {
            field.__params__.transform(evt.deltaX, evt.deltaY);
          }
          dispatchChangeEvent();
        }
        evt.preventDefault();
      });
    }
    
    // Adds driver fields as defined in the template.
    function createDriver(driverElement, templates) {
      templates.forEach(function(template, i) {
        var container = document.createElement('div');
        container.style.display = i == 0 ? 'inherit' : 'none';
        template.forEach(function(v) {
          switch(v.type) {
          case 'field':
            var field = document.createElement('div');
            field.id = v.id;
            field.classList.add(v.type);
            field.contentEditable = true;
            // field.textContent = v.show();
            field.__params__ = v;
            field.__params__.transform = transformer(horizontalScroller, verticalScroller);
            container.appendChild(field);
            addFieldListeners(field);
            break;
          case 'view':
            var view = document.createElement('div');
            if (v.id != undefined) { view.id = v.id }
            view.classList.add(v.type);
            // view.textContent = v.show();
            view.__params__ = v;
            container.appendChild(view);
            break;
          case 'text':
            var text = document.createTextNode(v.text);
            container.appendChild(text);
            break;
          case 'html':
            var html = document.createElement('div');
            html.classList.add(v.type);
            // html.innerHTML = v.show();
            html.__params__ = v;
            container.appendChild(html);
            break;
          }
        });
        addContainerListeners(container);
        driverElement.appendChild(container);
        update(container);
      });
      addTyperListeners(driverElement);
    }
    
    // Sends the field's current value to the external function
    function setField(field) {
      var params = field.__params__;
      params.put(field.textContent);
      update(field.parentElement);
    }
    
    function getAllElements(parent, selector) {
      return parent.querySelectorAll(selector);
    }
    
    // Gets the display values from the external function.
    function update(element) {
      var divs = getAllElements(element, 'div');
      for (var i = 0; i < divs.length; ++i) {
        var div = divs.item(i);
        if (div.__params__ && div.__params__.show) {
          var text = div.__params__.show();
          if (text === undefined) {
            div.classList.add('hidden');
          }
          else {
            div.classList.remove('hidden');
            if (div.classList.contains('field') || div.classList.contains('view')) {
              div.textContent = text;
            }
            else if (div.classList.contains('html')) {
              div.innerHTML = text;
            }
          }
        }
      }
    }
    
    // Changes the external field value by the number of steps.
    function getNextValue(dx, dy) {
      var field = document.activeElement;
      var params = field.__params__;
      if (params && params.push) {
        needsUpdate = true;
        params.push(dx, dy);
        update(field.parentElement);
      }
    }
    
    // Selects the field before this field.
    function selectPreviousField() {
      var field = document.activeElement;
      field.blur();
      while (field) {
        var field = field.previousSibling || field.parentElement.lastChild;
        if (field.__params__ && field.__params__.type === 'field' && isVisible(field)) {
          field.focus();
          return;
        }
      }
    }
    
    // Selects the field after this field.
    function selectNextField() {
      var field = document.activeElement;
      field.blur();
      while (field) {
        var field = field.nextSibling || field.parentElement.firstChild;
        if (field.__params__ && field.__params__.type === 'field' && isVisible(field)) {
          field.focus();
          return;
        }
      }
    }
    
    // Selects a range of characters.
    function setSelectionRange(element, from, to) {
      var text = element.firstChild;
      from = from || 0;
      to = to || text.length;
      var range = document.createRange();
      range.setStart(text, from);
      range.setEnd(text, to);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    // Gets the current settings from the external function
    function getCurrentValues() {
      var values = {};
      var divs = getAllElements(driveInput, 'div');
      for (var i = 0; i < divs.length; ++i) {
        var div = divs.item(i);
        var params = div.__params__;
        if (div.id && params && params.show) {
          values[div.id] = params.show();
        }
      }
      return values;
    }
    
    // Dispatches a change event. 
    function dispatchChangeEvent() {
      if (needsUpdate) {
        var evt = new CustomEvent('change', {
          detail: {
            asString: driveInput.textContent,
            asData: getCurrentValues()
          }
        });
        driveInput.dispatchEvent(evt);
        needsUpdate = false;
      }
    }
    
    // Dispatches a click event. 
    function dispatchClickEvent(id) {
      var evt = new CustomEvent('click', {
        detail: {
          asString: id
        }
      });
      driveInput.dispatchEvent(evt);
    }
    
    
    // EXPORTED INTERFACE
    var driver = {};
    
    // Sets the template for this driver
    driver.template = function(template) {
      createDriver(driveInput, Array.isArray(template[0]) ? template : [template]);
      return driver;
    };
    
    // Updates to the last values
    driver.update = function() {
      update(driveInput);
      return driver;
    };
    
    // The driver's DOM element
    driver.domElement = driveInput;
    
    return driver;
  }

  global.driveIn = driveIn;

}(window);
