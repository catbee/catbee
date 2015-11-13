var util = require('util');
var CookieWrapperBase = require('../lib/base/CookieWrapperBase');

class CookieWrapper extends CookieWrapperBase {
  constructor ($window) {
    super();
    this._window = $window;
  }

  /**
   * Current browser window.
   * @type {Window}
   * @private
   */
  _window = null;

  /**
   * Gets current cookie string.
   * @returns {string} Cookie string.
   */
  getCookieString = function () {
    return this._window.document.cookie ?
      this._window.document.cookie.toString() :
      '';
  };

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
  set (cookieSetup) {
    var cookie = this._convertToCookieSetup(cookieSetup);
    this._window.document.cookie = cookie;
    return cookie;
  };
}

module.exports = CookieWrapper;
