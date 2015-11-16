'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var CookieWrapperBase = require('./base/CookieWrapperBase');

var CookieWrapper = (function (_CookieWrapperBase) {
  _inherits(CookieWrapper, _CookieWrapperBase);

  function CookieWrapper() {
    _classCallCheck(this, CookieWrapper);

    _get(Object.getPrototypeOf(CookieWrapper.prototype), 'constructor', this).call(this);
    this.setCookie = null;
    this.cookieSetups = null;
    this._initialCookieString = '';
    this.setCookie = [];
    this.cookieSetups = [];
  }

  /**
   * Current list of cookie strings were set in this instance of wrapper.
   * @type {Array}
   */

  _createClass(CookieWrapper, [{
    key: 'initWithString',

    /**
     * Initializes manager with specified cookie string.
     * @param {string} cookieString Cookie string.
     */
    value: function initWithString(cookieString) {
      this._initialCookieString = cookieString;
    }

    /**
     * Gets current cookie string.
     * @returns {string} Cookie string.
     */
  }, {
    key: 'getCookieString',
    value: function getCookieString() {
      var string = this._initialCookieString;
      this.cookieSetups.forEach(function (cookieSetup) {
        string += (string ? '; ' : '') + cookieSetup.key + '=' + cookieSetup.value;
      });
      return string;
    }

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
  }, {
    key: 'set',
    value: function set(cookieSetup) {
      var cookie = this._convertToCookieSetup(cookieSetup);
      this.setCookie.push(cookie);
      this.cookieSetups.push(cookieSetup);
      return cookie;
    }
  }]);

  return CookieWrapper;
})(CookieWrapperBase);

module.exports = CookieWrapper;

/**
 * Current list of cookie setups were set in this instance of wrapper.
 * @type {Array}
 */

/**
 * Current cookie string.
 * @type {string}
 * @private
 */