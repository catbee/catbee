'use strict';

var routeHelper = require('./../helpers/routeHelper');
var catberryUri = require('catberry-uri');
var URI = catberryUri.URI;

class URLArgsProvider {
  /**
   * Implements URL args provider for server environment.
   * @param {ServiceLocator} locator
   * @constructor
   */
  constructor (locator) {
    /**
     * Current list of URI mappers.
     * @type {Array}
     * @private
     */
    this._uriMappers = getUriMappers(locator);
  }

  /**
   * Gets args by specified location URI.
   * @param {Object} location
   */
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

/**
 * Gets list of URI mappers.
 * @param {ServiceLocator} serviceLocator Service locator to get route
 * definitions.
 * @returns {Array} List of URI mappers.
 */
function getUriMappers (serviceLocator) {
  var routeDefinitions;

  try {
    routeDefinitions = serviceLocator.resolveAll('routeDefinition');
  } catch (e) {
    routeDefinitions = [];
  }

  return routeDefinitions
    .map(route => {
      var mapper = routeHelper.compileRoute(route.expression);

      return {
        expression: mapper.expression,
        map: route.map || noop,
        argsMap: uri => {
          var args = mapper.map(uri);
          Object.assign(args, route.args);
          return args;
        }
      };
    });
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
 * @param {Object} args
 * @param {Array} uriMappers
 * @param {URI} location
 * @return {Object}
 */
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

/**
 * Noop function
 * @param {*} data
 * @returns {*}
 */
function noop (data) {
  return data;
}

module.exports = URLArgsProvider;
