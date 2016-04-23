var CookieWrapperBase = require('./base/CookieWrapperBase');

class CookieWrapper extends CookieWrapperBase {
  constructor () {
    super();
    this.setCookie = [];
    this.cookieSetups = [];
  }

  // Current list of cookie strings were set in this instance of wrapper.
  setCookie = null;

  // Current list of cookie setups were set in this instance of wrapper.
  cookieSetups = null;

  // Current cookie string.
  _initialCookieString = '';

  // Initializes manager with specified cookie string.
  initWithString (cookieString) {
    this._initialCookieString = cookieString;
  }

  // Gets current cookie string.
  getCookieString () {
    var string = this._initialCookieString;
    this.cookieSetups.forEach((cookieSetup) => {
      string += (string ? '; ' : '') +
      cookieSetup.key + '=' +
      cookieSetup.value;
    });
    return string;
  }

  // Sets cookie to this wrapper.
  set (cookieSetup) {
    var cookie = this._convertToCookieSetup(cookieSetup);
    this.setCookie.push(cookie);
    this.cookieSetups.push(cookieSetup);
    return cookie;
  }
}

module.exports = CookieWrapper;
