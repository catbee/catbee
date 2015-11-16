'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var propertyHelper = require('./../helpers/propertyHelper');
var ModuleApiProviderBase = require('./../base/ModuleApiProviderBase');
var util = require('util');

var SCRIPT_TAG_REGEXP = /<(\/)?(script)>/ig;
var SCRIPT_TAG_REPLACEMENT = '&lt;$1$2&gt;';
var SCRIPT_REDIRECT_FORMAT = 'window.location.assign(\'%s\');';
var SCRIPT_SET_COOKIE_FORMAT = 'window.document.cookie = \'%s\';';
var SCRIPT_CLEAR_FRAGMENT_FORMAT = 'window.location.hash = \'\';';
var SCRIPT_ELEMENT_FORMAT = '<script>%s</script>';

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

    this.actions = null;
    propertyHelper.defineReadOnly(this, 'isBrowser', false);
    propertyHelper.defineReadOnly(this, 'isServer', true);

    this.actions = {
      redirectedTo: '',
      isNotFoundCalled: false,
      isFragmentCleared: false
    };
  }

  /**
   * Escapes string with inline script.
   * @param {string} str String to escape.
   * @returns {String}
   */

  /**
   * Current set of done actions.
   * @type {Object}
   * @private
   */

  _createClass(ModuleApiProvider, [{
    key: 'notFound',

    /**
     * Sets not found flag that means Catberry should pass control
     * to another middleware.
     * @returns {Promise} Promise for nothing.
     */
    value: function notFound() {
      this.actions.isNotFoundCalled = true;
      return _Promise.resolve();
    }

    /**
     * Redirects current page to specified URI.
     * @param {string} uriString URI to direct.
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'redirect',
    value: function redirect(uriString) {
      this.actions.redirectedTo = uriString;
      return _Promise.resolve();
    }

    /**
     * Clears current URI's fragment.
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'clearFragment',
    value: function clearFragment() {
      this.actions.isFragmentCleared = true;
      return _Promise.resolve();
    }

    /**
     * Gets inline script for making stored actions.
     * @returns {String} SCRIPT tag with inline JavaScript to make actions.
     */
  }, {
    key: 'getInlineScript',
    value: function getInlineScript() {
      var scriptLines = '';

      if (this.cookie.setCookie.length > 0) {
        this.cookie.setCookie.forEach(function (cookieSetup) {
          scriptLines += util.format(SCRIPT_SET_COOKIE_FORMAT, escapeString(cookieSetup));
        });
        this.cookie.setCookie = [];
      }

      if (this.actions.redirectedTo) {
        scriptLines += util.format(SCRIPT_REDIRECT_FORMAT, escapeString(this.actions.redirectedTo));
        this.actions.redirectedTo = null;
      }

      if (this.actions.isFragmentCleared) {
        scriptLines += util.format(SCRIPT_CLEAR_FRAGMENT_FORMAT);
        this.actions.isFragmentCleared = false;
      }

      if (scriptLines.length > 0) {
        scriptLines = scriptLines.replace(SCRIPT_TAG_REGEXP, SCRIPT_TAG_REPLACEMENT);
        scriptLines = util.format(SCRIPT_ELEMENT_FORMAT, scriptLines);
      }

      return scriptLines;
    }
  }]);

  return ModuleApiProvider;
})(ModuleApiProviderBase);

function escapeString(str) {
  return str.replace(/['\\]/g, '\\$&');
}

module.exports = ModuleApiProvider;