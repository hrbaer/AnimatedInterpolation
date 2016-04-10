function timeDriver(selector, current, start, stop, callback, lang) {

  lang = lang ? lang : 'en';
  
  var months = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  }
  var monthNames = months[lang];

  function dateTime(current, start, stop) {

    var date = current;
    start = start.valueOf();
    stop = stop.valueOf();
    
    if (start > stop) {
      var tmp = stop;
      stop = start;
      start = tmp;
    }
    var range = stop - start;
      
    var keep = function() {
      current = date.valueOf();
      while (current > stop) {
        current -= range;
      }
      while (current < start) {
        current += range;
      }
      date = new Date(current);
    }
    
    var pad = function(val) {
      return '00'.concat(val).slice(-2);
    }

    var ext = {

      getDate: function() {
        return date;
      },

      setDate: function(d) {
        date = d;
      },

      showYear: function() {
        return date.getFullYear();
      },
  
      putYear: function(year) {
        if (!isNaN(+year)) {
          date.setFullYear(year);
          keep();
        }
      },
  
      pushYear: function(years) {
        ext.putYear(date.getFullYear() + years);
      },
  
      showMonth: function() {
        return date.getMonth();
      },
  
      showMonthName: function() {
        return monthNames[date.getMonth()];
      },
  
      putMonth: function(month) {
        if (!isNaN(+month)) {
          month = +month;
        }
        else {
          for (var i in monthNames) {
            if (monthNames.hasOwnProperty(i)) {
              var name = monthNames[i];
              if (name.match(new RegExp('^' + month, 'i'))) {
                month = i;
                break;
              }
            }
          }
        }
        if (!isNaN(+month)) {
          date.setMonth(month);
          keep();
        }
      },
  
      pushMonth: function(months) {
        ext.putMonth(date.getMonth() + months);
      },
  
      showDay: function() {
        return date.getDate();
      },
  
      putDay: function(day) {
        if (!isNaN(+day)) {
          date.setDate(day);
          keep();
        }
      },
  
      pushDay: function(days) {
        ext.putDay(date.getDate() + days);
      },

      showHours: function() {
        return pad(date.getHours());
      },
    
      putHours: function(hours) {
        if (!isNaN(+hours)) {
          date.setHours(hours);
          keep();
        }
      },
    
      pushHours: function(hours) {
        ext.putHours(date.getHours() + hours);
      },
    
      showMinutes: function() {
        return pad(date.getMinutes());
      },
    
      putMinutes: function(minutes) {
        if (!isNaN(+minutes)) {
          date.setMinutes(minutes);
          keep();
        }
      },
    
      pushMinutes: function(minutes) {
        ext.putMinutes(date.getMinutes() + minutes);
      },
    
      showSeconds: function() {
        return pad(date.getSeconds());
      },
    
      putSeconds: function(seconds) {
        if (!isNaN(+seconds)) {
          date.setSeconds(seconds);
          keep();
        }
      },
    
      pushSeconds: function(seconds) {
        ext.putSeconds(date.getSeconds() + seconds);
      },
      
    };
    return ext;
  }

  var date = dateTime(current, start, stop);
    
  // The template used to construct the input control and to enable communication between user and the input control.
  var templates = {
    en: [[
      { type: 'field', id: 'month', show: date.showMonthName, push: date.pushMonth, put: date.putMonth },
      { type: 'text', text: ' ' },
      { type: 'field', id: 'day', show: date.showDay, push: date.pushDay, put: date.putDay },
      { type: 'text', text: ', ' },
      { type: 'field', id: 'year', show: date.showYear, push: date.pushYear, put: date.putYear },
      { type: 'text', text: ' ' },
      { type: 'field', id: 'hours', show: date.showHours, push: date.pushHours, put: date.putHours },
      { type: 'text', text: ':' },
      { type: 'field', id: 'minutes', show: date.showMinutes, push: date.pushMinutes, put: date.putMinutes },
      { type: 'text', text: ':' },
      { type: 'field', id: 'seconds', show: date.showSeconds, push: date.pushSeconds, put: date.putSeconds }
    ]],
    de: [[
      { type: 'field', id: 'day', show: date.showDay, push: date.pushDay, put: date.putDay },
      { type: 'text', text: '. ' },
      { type: 'field', id: 'month', show: date.showMonthName, push: date.pushMonth, put: date.putMonth },
      { type: 'text', text: ' ' },
      { type: 'field', id: 'year', show: date.showYear, push: date.pushYear, put: date.putYear },
      { type: 'text', text: ' ' },
      { type: 'field', id: 'hours', show: date.showHours, push: date.pushHours, put: date.putHours },
      { type: 'text', text: ':' },
      { type: 'field', id: 'minutes', show: date.showMinutes, push: date.pushMinutes, put: date.putMinutes },
      { type: 'text', text: ':' },
      { type: 'field', id: 'seconds', show: date.showSeconds, push: date.pushSeconds, put: date.putSeconds }
    ]]
  };
  
  var template = templates[lang];

  // Create the driver input element
  var din = driveIn(selector);
    din.template(template)
    .domElement
    .addEventListener('change', function(evt) { callback(date.getDate().valueOf()); });

  return function(d) {
    var active = din.domElement.contains(document.activeElement);
    if (!active) {
      date.setDate(d);
      din.update();
    }
    return active;
  };
}