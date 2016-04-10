function Grid() {
  this.header = new Array(6);
  this.scaling = 1.0;
  this.offset = 0.0;
}

/*
  Lädt eine Rasterdatei.
  Parameter:
  url URL der Tabelle
*/
Grid.prototype.loadData = function(url, callback) {
  var req = new XMLHttpRequest();
  req.overrideMimeType('text/plain');
  req.open("GET", url, true);
  var self = this;
  req.onload = function() {
    var data = req.responseText;
    self.parseData(data);
    callback(self.data);
  };
  req.send(null);
}

/* Parsen der Rasterdaten. Nur für Textformat verwenden. */
Grid.prototype.parseData = function(data) {
  this.statistics = null;
  var hs = this.header.length;
  var lines = data.split(/\n/);
  this.header = new Array(hs);
  for (var i = 0; i < hs; ++i) {
    var fields = lines[i].split(/\s+/, 2);
    var value = i < 2 ? parseInt(fields[1]) : parseFloat(fields[1]);
    this.header[fields[0]] = value;
  }
  var nrows = this.getNumRows();
  var ncols = this.getNumCols();
  var tab = new Array(nrows * ncols);
  var i = 0;
  for (var r = 0; r < nrows; ++r) {
    var values = lines[r + hs].split(/\s/);
    for (var c = 0; c < ncols; ++c) {
      tab[i] = parseFloat(values[c]);
      ++i;
    }
  }
  this.data = tab;
}

Grid.prototype.normalizeData = function() {
  var stats = this.getStatistics();
  var min = stats.minValue;
  var max = stats.maxValue;
  var scale = 1.0 / (max - min);
  var n = this.data.length;
  var values = this.data;
  for (var i = 0; i < n; ++i) {
    values[i] = (values[i] - min) * scale;
  }
  this.offset = -min;
  this.scaling = scale;
}

Grid.prototype.toString = function() {
  var info =
  'Number or rows: ' + this.getNumRows() + '\n' +
  'Number or columns: ' + this.getNumCols();
  return info;
}

/* Gibt Anzahl Kolonnen zurück. */
Grid.prototype.getNumCols = function() {
  return this.header['ncols'];
}

/* Gibt Anzahl Zeilen zurück. */
Grid.prototype.getNumRows = function() {
  return this.header['nrows'];
}

/* Gibt Zellengrösse zurück. */
Grid.prototype.getCellSize = function() {
  return this.header['cellsize'];
}

/* Gibt Breite zurück. */
Grid.prototype.getWidth = function() {
  return (this.getNumCols() - 1) * this.getCellSize();
}

/* Gibt Höhe zurück. */
Grid.prototype.getHeight = function() {
  return (this.getNumRows() - 1) * this.getCellSize();
}

/* Statisktik berechnen. */
Grid.prototype.getStatistics = function() {
  if (! this.statistics) {
    this.statistics = new Object();
    this.statistics.toString = function() {
      var info =
      'Minimum value: ' + this.minValue + '\n' +
      'Maximum value: ' + this.maxValue + '\n' +
      'Mean value: ' + this.meanValue;
      return info;
    }
    var numCells = this.getNumRows() * this.getNumCols();
    var nodat = this.header['NODATA_value'];
    var n = 0;
    var sum = 0.0;
    var min = this.data[0];
    var max = min;
    for (var i = 0; i < numCells; ++i) {
      var value = this.data[i];
      if (value != nodat) {
        ++n;
        sum += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    this.statistics.meanValue = sum / n;
    this.statistics.minValue = min;
    this.statistics.maxValue = max;
  }
  return this.statistics;
}

