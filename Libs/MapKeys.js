/*
  MAP KEYS

  Presenting map keys.

  Dependencies: D3 library

  Author:
  H. R. Baer
  hbaer@ethz.ch

  Version history:
  0.1.0 07/02/2016
*/

(function (global) {

  var mapKeys = function(selector, keyData, listener, options) {

    var aspectRatio = 1.5;
    var domElement = d3.select(selector);
    var node = domElement.node();
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    domElement.on('click', function() { if (listener) { listener(d3.event) } });
    var container = domElement.append('div')
      .attr('class', 'map-keys-container')
      .classed('reverse', options.reverse);
    var keysPanel = container.append('div')
      .attr('class', 'keys-panel');
    var valuesPanel = container.append('div')
      .attr('class', 'values-panel');
  
    keysPanel.selectAll('div')
        .data(keyData.symbols)
      .enter().append('div')
        .attr('id', function(d, i) { return 'symbol-index-' + i })
        .attr('title', function(d, i) { return keyData.labels ? keyData.labels[i] : '' })
        .attr({ 'class': 'symbols-box'})
        .style('background', function(d) { return d });

    valuesPanel.selectAll('div')
        .data(keyData.values)
      .enter().append('div')
        .attr('id', function(d, i) { return 'value-index-' + i })
        .attr({ 'class': 'values-box' })
        .classed('string', function(d) { return typeof d === 'string' } )
        .text(function(d) { return options.units ? d + options.units : d; });

    valuesPanel.classed('hide-ends', keyData.values.length > keyData.symbols.length);

    // On resize, determine what layout to use, horizontal or vertical
    function resize() {
      var bounds = domElement.node().getBoundingClientRect();
      var ratio = bounds.width / bounds.height;
      container.classed('horizontal', ratio > aspectRatio).classed('vertical', ratio <= aspectRatio)
    }
    resize();
  
    d3.select(window).on('resize', function() {
      resize();
    });
  
  }
  
  global.mapKeys = mapKeys;

})(window);
