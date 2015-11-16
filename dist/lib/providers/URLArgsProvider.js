'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var routeHelper = require('./../helpers/routeHelper');
var catberryUri = require('catberry-uri');
var URI = catberryUri.URI;

var URLArgsProvider = (function () {
  function URLArgsProvider($serviceLocator) {
    _classCallCheck(this, URLArgsProvider);

    this._uriMappers = null;

    this._uriMappers = getUriMappers($serviceLocator);
  }

  /**
   * Gets list of URI mappers.
   * @param {ServiceLocator} serviceLocator Service locator to get route
   * definitions.
   * @returns {Array} List of URI mappers.
   */

  /**
   * Current list of URI mappers.
   * @type {Array}
   * @private
   */

  _createClass(URLArgsProvider, [{
    key: 'getArgsByUri',

    /**
     * Gets args by specified location URI.
     * @param {URI} location URI location.
     * @returns {Object} Args object.
     */
    value: function getArgsByUri(location) {
      if (this._uriMappers.length === 0) {
        return null;
      }

      location = location.clone();
      location.path = routeHelper.removeEndSlash(location.path);

      var args = getArgs(this._uriMappers, location);

      if (!args) {
        return null;
      }

      return args;
    }

    /**
     * Gets signal by specified location URI.
     * @param {URI} location URI location
     * @returns {String}
     */
  }, {
    key: 'getSignalByUri',
    value: function getSignalByUri(location) {
      if (this._uriMappers.length === 0) {
        return null;
      }

      location = location.clone();
      location.path = routeHelper.removeEndSlash(location.path);

      var signal = getSignal(this._uriMappers, location);

      if (!signal) {
        return null;
      }

      return signal;
    }
  }]);

  return URLArgsProvider;
})();

function getUriMappers(serviceLocator) {
  var uriMappers = [];

  serviceLocator.resolveAll('routeDefinition').forEach(function (route) {
    var mapperUri = new URI(route.expression);
    mapperUri.path = routeHelper.removeEndSlash(mapperUri.path);
    var mapper = routeHelper.compileRoute(mapperUri);

    uriMappers.push({
      expression: mapper.expression,
      signal: route.signal,
      map: function map(uri) {
        var args = mapper.map(uri);
        _Object$assign(args, route.args);
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
function getSignal(uriMappers, location) {
  var signal = null;

  uriMappers.some(function (mapper) {
    if (mapper.expression.test(location.path)) {
      signal = mapper.signal;
      return true;
    }
    return false;
  });

  return signal;
}

/**
 * Gets args.
 * @param {Array} uriMappers
 * @param {URI} location
 * @returns {Object|null}
 */
function getArgs(uriMappers, location) {
  var args = null;

  uriMappers.some(function (mapper) {
    if (mapper.expression.test(location.path)) {
      args = mapper.map(location) || _Object$create(null);
      return true;
    }
    return false;
  });

  return args;
}

module.exports = URLArgsProvider;