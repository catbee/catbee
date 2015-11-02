var routeHelper = require('./../helpers/routeHelper');
var catberryUri = require('catberry-uri');
var URI = catberryUri.URI;

class StateProvider {
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
   * Gets state by specified location URI.
   * @param {URI} location URI location.
   * @returns {Object} State object.
   */
  getStateByUri (location) {
    if (this._uriMappers.length === 0) {
      return null;
    }

    location = location.clone();

    location.path = routeHelper.removeEndSlash(location.path);
    var state = getState(this._uriMappers, location);

    if (!state) {
      return null;
    }

    // make state object immutable
    Object.keys(state)
      .forEach(storeName => {
        Object.freeze(state[storeName]);
      });
    Object.freeze(state);

    return state;
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
    });
  return uriMappers;
}

/**
 * Gets state.
 * @param {Array} uriMappers
 * @param {URI} location
 * @returns {Object|null}
 */
function getState (uriMappers, location) {
  var state = null;

  uriMappers.some(mapper => {
    if (mapper.expression.test(location.path) && mapper.signal) {
      state = mapper.map(location) || Object.create(null);
      Object.assign(state, { _signal: mapper.signal });
      return true;
    }
    return false;
  });

  return state;
}

module.exports = StateProvider;
