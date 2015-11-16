'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var propertyHelper = require('./helpers/propertyHelper');

var ContextFactory = (function () {
  /**
   * Creates new instance of the context factory.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @constructor
   */

  function ContextFactory($serviceLocator) {
    _classCallCheck(this, ContextFactory);

    this._serviceLocator = null;

    this._serviceLocator = $serviceLocator;
  }

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */

  _createClass(ContextFactory, [{
    key: 'create',

    /**
     * Creates new context for modules.
     * @param {Object} additional Additional parameters.
     * @param {URI} additional.referrer Current referrer.
     * @param {URI} additional.location Current location.
     * @param {String} additional.userAgent Current user agent.
     * @return {Object}
     */
    value: function create(additional) {
      var apiProvider = this._serviceLocator.resolve('moduleApiProvider');
      var context = _Object$create(apiProvider);

      _Object$keys(additional).forEach(function (key) {
        return propertyHelper.defineReadOnly(context, key, additional[key]);
      });

      return context;
    }
  }]);

  return ContextFactory;
})();

module.exports = ContextFactory;