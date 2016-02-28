'use strict';
var express = require('express');
var request = require('request');
var _ = require('underscore');

///////////////////////   EXPRESS   ///////////////////////////
var app = express();
var STATIC_FOLDER = '/public';  //The folder, inside the server, where the static content is stored.
var BASE_URL = 'https://atooma-homework.appspot.com/calendar';
/** The system port used by the server
  * On hosts like Heroku, you'll need to use the one set by the environment
  * on default, instead, we choose port 8080.
  */
var PORT = process.env.PORT || 9999;

var eventQueue = [];

function validateStringParam(param) {
  if (_.isString(param) && !_.isEmpty(param)) {
    return true;
  } else {
    return false;
  }
}

function buildCalendarUrl(calendar) {
  return [BASE_URL, calendar].join('/');
}

function filterEvents(events, eventName) {
  if (validateStringParam(eventName)) {
    return _.filter(events, function(event) {
      return event.title === eventName;
    })
  } else {
    return events;
  }
}

function formatEvent(event){
  return {
    'event': event.title,
    'date': new Date(event.timestamp)
  };
}

function formatEventsList(events) {
  return JSON.stringify(_.map(events, formatEvent));
}

function addEventWrapper(email, calendar) {

  return function addEvent(event) {
    function processEvent() {
      console.log('Event ' + event.title +  '[' + email + ']' + '[' + calendar + ']');
    }
    var delay = event.timestamp - Date.now();
    console.log(event, delay)
    eventQueue.push(email, calendar, event);
    if (delay >= 0) {
      setTimeout(processEvent, delay);
    }
  };
}

function route (req, res) {
  var email = req.params.email;
  var calendar = req.params.calendar;
  var eventName = req.params.event;

  if (!validateStringParam(email) || !validateStringParam(calendar)) {
    res.render('404.jade', {title: '500: email or calendar id not valid'});
    return;
  }

  var addEvent = addEventWrapper(email, calendar);
  var url = buildCalendarUrl(calendar);

  request({
    headers: {
      'Authorization': email,
      'Content-Type': 'application/json'
    },
    uri: url,
    method: 'GET'
  }, function (err, reqRes, body) {
    var body = JSON.parse(body);
    console.log(body)
    var events = filterEvents(body.events, eventName);
    console.log(eventName, events)

    _.each(events, addEvent);
    res.status(200).send(formatEventsList(events));
  });

}

//Static support in order to add an instruction page and serve front-end
app.use('/', express.static(__dirname + STATIC_FOLDER));


app.get('/:email/:calendar', function(req, res) {
    return route(req, res);
});

//alternative path for custom event
app.get('/:email/:calendar/:event', function(req, res) {
    return route(req, res);
});

// Handle 404 with a fallback page
app.use(function(req, res) {
  res.status(400);
  res.render('404.jade', {title: '404: Resource Not Found'});
});

app.listen(PORT);
console.log('Listening to port: ' + PORT);

process.on('exit', function(code) {
  console.log('About to exit with code:', code);
});
