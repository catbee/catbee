var routeHelper = require('./../helpers/routeHelper');
var catberryUri = require('catberry-uri');
var URI = catberryUri.URI;

class URLArgsProvider {
  constructor (locator) {
    this._uriMappers = getUriMappers(locator);
  }

  // Current list of URI mappers.
  _uriMappers = null;

  // Gets args and signals by specified location URI.
  getArgsByUri (location) {
    if (this._uriMappers.length === 0) {
      return {};
    }

    location = location.clone();
    location.path = routeHelper.removeEndSlash(location.path);

    var args = getArgs(this._uriMappers, location);
    return runPostMapping(args, this._uriMappers, location);
  }
}

// Gets list of URI mappers.
function getUriMappers (serviceLocator) {
  var uriMappers = [];

  serviceLocator.resolveAll('routeDefinition')
    .forEach(route => {
      var mapperUri = new URI(route.expression);
      mapperUri.path = routeHelper.removeEndSlash(mapperUri.path);
      var mapper = routeHelper.compileRoute(mapperUri);

      uriMappers.push({
        expression: mapper.expression,
        map: route.map || noop,
        argsMap: uri => {
          var args = mapper.map(uri);
          Object.assign(args, route.args);
          return args;
        }
      });
    });

  return uriMappers;
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

// Run handler after signal and args was get
function runPostMapping (data, uriMappers, location) {
  uriMappers.some(mapper => {
    if (mapper.expression.test(location.path)) {
      data = mapper.map(data);
      return true;
    }
    return false;
  });

  return data;
}

// Noop function for promise
function noop (data) {
  return data;
}

module.exports = URLArgsProvider;
