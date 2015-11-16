'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var util = require('util');
var CookieWrapperBase = require('../lib/base/CookieWrapperBase');

var CookieWrapper = (function (_CookieWrapperBase) {
  _inherits(CookieWrapper, _CookieWrapperBase);

  function CookieWrapper($window) {
    _classCallCheck(this, CookieWrapper);

    _get(Object.getPrototypeOf(CookieWrapper.prototype), 'constructor', this).call(this);
    this._window = null;

    this.getCookieString = function () {
      return this._window.document.cookie ? this._window.document.cookie.toString() : '';
    };

    this._window = $window;
  }

  /**
   * Current browser window.
   * @type {Window}
   * @private
   */

  _createClass(CookieWrapper, [{
    key: 'set',

    /**
     * Sets cookie to this wrapper.
     * @param {Object} cookieSetup Cookie setup object.
     * @param {string} cookieSetup.key Cookie key.
     * @param {string} cookieSetup.value Cookie value.
     * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
     * @param {Date?} cookieSetup.expires Expire date.
     * @param {string?} cookieSetup.path URI path for cookie.
     * @param {string?} cookieSetup.domain Cookie domain.
     * @param {boolean?} cookieSetup.secure Is cookie secured.
     * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
     * @returns {string} Cookie setup string.
     */
    value: function set(cookieSetup) {
      var cookie = this._convertToCookieSetup(cookieSetup);
      this._window.document.cookie = cookie;
      return cookie;
    }
  }]);

  return CookieWrapper;
})(CookieWrapperBase);

module.exports = CookieWrapper;

/**
 * Gets current cookie string.
 * @returns {string} Cookie string.
 */