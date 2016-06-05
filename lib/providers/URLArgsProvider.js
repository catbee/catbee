'use strict';

var routeHelper = require('./../helpers/routeHelper');
var catberryUri = require('catberry-uri');
var URI = catberryUri.URI;

class URLArgsProvider {
  constructor (locator) {
    this._uriMappers = getUriMappers(locator);
  }

  // Gets args by specified location URI.
  getArgsByUri (location) {

    if (this._uriMappers.length === 0) {
      return null;
    }

    location = location.clone();
    location.path = routeHelper.removeEndSlash(location.path);

    var args = getArgs(this._uriMappers, location);
    return runPostMapping(args, this._uriMappers, location);
  }
}

// Gets list of URI mappers.
function getUriMappers (serviceLocator) {
  var routeDefinitions;

  try {
    routeDefinitions = serviceLocator.resolveAll('routeDefinition');
  } catch (e) {
    routeDefinitions = [];
  }

  return routeDefinitions
    .map(route => {
      var mapperUri = new URI(route.expression);
      mapperUri.path = routeHelper.removeEndSlash(mapperUri.path);
      var mapper = routeHelper.compileRoute(mapperUri);

      return {
        expression: mapper.expression,
        map: route.map || noop,
        argsMap: uri => {
          var args = mapper.map(uri);
          Object.assign(args, route.args);
          return args;
        }
      }
    });
}

// Gets args
function getArgs (uriMappers, location) {
  var args = null;

  uriMappers.some(mapper => {
    if (mapper.expression.test(location.path)) {
      args = mapper.argsMap(location) || Object.create(null);
      return true;
    }
    return false;
  });

  return args;
}

// Run handler after args was get
function runPostMapping (args, uriMappers, location) {
  uriMappers.some(mapper => {
    if (mapper.expression.test(location.path)) {
      args = mapper.map(args);
      return true;
    }
    return false;
  });

  return args;
}

// Noop function for promise
function noop (data) {
  return data;
}

module.exports = URLArgsProvider;
