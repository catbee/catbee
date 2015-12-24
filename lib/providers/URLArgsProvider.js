var routeHelper = require('./../helpers/routeHelper');
var catberryUri = require('catberry-uri');
var URI = catberryUri.URI;

class URLArgsProvider {
  constructor ($serviceLocator) {
    this._uriMappers = getUriMappers($serviceLocator);
  }

  /**
   * Current list of URI mappers.
   * @type {Array}
   * @private
   */
  _uriMappers = null;

  /**
   * Gets args and signals by specified location URI.
   * @param {URI} location URI location.
   * @returns {Object} Args object.
   */
  getArgsAndSignalByUri (location) {
    if (this._uriMappers.length === 0) {
      return {
        signal: null,
        args: null
      };
    }

    location = location.clone();
    location.path = routeHelper.removeEndSlash(location.path);

    var args = getArgs(this._uriMappers, location);
    var signal = getSignal(this._uriMappers, location);

    return runPostMapping({ args, signal }, this._uriMappers, location);
  }
}

/**
 * Gets list of URI mappers.
 * @param {ServiceLocator} serviceLocator Service locator to get route
 * definitions.
 * @returns {Array} List of URI mappers.
 */
function getUriMappers (serviceLocator) {
  var uriMappers = [];

  serviceLocator.resolveAll('routeDefinition')
    .forEach(route => {
      var mapperUri = new URI(route.expression);
      mapperUri.path = routeHelper.removeEndSlash(mapperUri.path);
      var mapper = routeHelper.compileRoute(mapperUri);

      uriMappers.push({
        expression: mapper.expression,
        signal: route.signal,
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

/**
 * Get signal
 * @param {Array} uriMappers
 * @param {URI} location
 * @returns {String}
 */
function getSignal (uriMappers, location) {
  var signal = null;

  uriMappers.some(mapper => {
    if (mapper.expression.test(location.path)) {
      signal = mapper.signal;
      return true;
    }
    return false;
  });

  return signal;
}

/**
 * Gets args
 * @param {Array} uriMappers
 * @param {URI} location
 * @returns {Object|null}
 */
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

/**
 * Run handler after signal and args was get
 * @param {Object} data
 * @param {Array} uriMappers
 * @param {URI} location
 */
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

/**
 * Noop function
 * @param {*} data
 * @returns {*}
 */
function noop (data) {
  return data;
}

module.exports = URLArgsProvider;
