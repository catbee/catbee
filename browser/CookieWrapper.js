var CookieWrapperBase = require('../lib/base/CookieWrapperBase');

class CookieWrapper extends CookieWrapperBase {
  constructor ($window) {
    super();
    this._window = $window;
  }

  // Current browser window.
  _window = null;

  // Gets current cookie string.
  getCookieString () {
    return this._window.document.cookie ?
      this._window.document.cookie.toString() :
      '';
  }

  // Sets cookie to this wrapper.
  set (cookieSetup) {
    var cookie = this._convertToCookieSetup(cookieSetup);
    this._window.document.cookie = cookie;
    return cookie;
  }
}

module.exports = CookieWrapper;
