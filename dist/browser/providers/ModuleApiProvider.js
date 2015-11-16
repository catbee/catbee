'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var propertyHelper = require('../../lib/helpers/propertyHelper');
var ModuleApiProviderBase = require('../../lib/base/ModuleApiProviderBase');

var ModuleApiProvider = (function (_ModuleApiProviderBase) {
  _inherits(ModuleApiProvider, _ModuleApiProviderBase);

  /**
   * Creates new instance of the module API provider.
   * @param {ServiceLocator} $serviceLocator Service locator
   * to resolve dependencies.
   * @constructor
   * @extends ModuleApiProviderBase
   */

  function ModuleApiProvider($serviceLocator) {
    _classCallCheck(this, ModuleApiProvider);

    _get(Object.getPrototypeOf(ModuleApiProvider.prototype), 'constructor', this).call(this, $serviceLocator);

    propertyHelper.defineReadOnly(this, 'isBrowser', true);
    propertyHelper.defineReadOnly(this, 'isServer', false);
  }

  /**
   * Reloads the page for handling "not found" error.
   * @returns {Promise} Promise for nothing.
   */

  _createClass(ModuleApiProvider, [{
    key: 'notFound',
    value: function notFound() {
      var window = this.locator.resolve('window');
      window.location.reload();
      return _Promise.resolve();
    }

    /**
     * Redirects current page to specified URI.
     * @param {string} uriString URI to redirect.
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'redirect',
    value: function redirect(uriString) {
      var requestRouter = this.locator.resolve('requestRouter');
      return requestRouter.go(uriString);
    }

    /**
     * Clears current location URI's fragment.
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'clearFragment',
    value: function clearFragment() {
      var window = this.locator.resolve('window');
      var position = window.document.body.scrollTop;

      window.location.hash = '';
      window.document.body.scrollTop = position;

      return _Promise.resolve();
    }
  }]);

  return ModuleApiProvider;
})(ModuleApiProviderBase);

module.exports = ModuleApiProvider;