var CookieWrapperBase = require('./base/CookieWrapperBase');

class CookieWrapper extends CookieWrapperBase {
  constructor () {
    super();
    this.setCookie = [];
    this.cookieSetups = [];
  }

  /**
   * Current list of cookie strings were set in this instance of wrapper.
   * @type {Array}
   */
  setCookie = null;

  /**
   * Current list of cookie setups were set in this instance of wrapper.
   * @type {Array}
   */
  cookieSetups = null;

  /**
   * Current cookie string.
   * @type {string}
   * @private
   */
  _initialCookieString = '';

  /**
   * Initializes manager with specified cookie string.
   * @param {string} cookieString Cookie string.
   */
  initWithString (cookieString) {
    this._initialCookieString = cookieString;
  }

  /**
   * Gets current cookie string.
   * @returns {string} Cookie string.
   */
  getCookieString () {
    var string = this._initialCookieString;
    this.cookieSetups.forEach((cookieSetup) => {
      string += (string ? '; ' : '') +
      cookieSetup.key + '=' +
      cookieSetup.value;
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
  set (cookieSetup) {
    var cookie = this._convertToCookieSetup(cookieSetup);
    this.setCookie.push(cookie);
    this.cookieSetups.push(cookieSetup);
    return cookie;
  }
}

module.exports = CookieWrapper;
