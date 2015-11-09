class CookieWrapperBase {
  /**
   * Gets map of cookie values by name.
   * @returns {Object} Cookies map by names.
   */
  getAll () {
    var string = this.getCookieString();
    return this._parseCookieString(string);
  }

  /**
   * Gets cookie value by name.
   * @param {string} name Cookie name.
   * @returns {string} Cookie value.
   */
  get (name) {
    if (typeof (name) !== 'string') {
      return '';
    }

    return this.getAll()[name] || '';
  }

  /**
   * Parses cookie string into map of cookie key/value pairs.
   * @param {string} string Cookie string.
   * @returns {Object} Object with cookie values by keys.
   * @protected
   */
  _parseCookieString (string) {
    var cookie = Object.create(null);

    if (typeof (string) !== 'string') {
      return cookie;
    }

    string
      .split(/; */)
      .forEach(cookiePair => {
        var equalsIndex = cookiePair.indexOf('=');
        if (equalsIndex < 0) {
          return;
        }

        var key = cookiePair
          .substr(0, equalsIndex)
          .trim();
        var value = cookiePair
          .substr(equalsIndex + 1, cookiePair.length)
          .trim();

        value = value.replace(/^"|"$/g, '');
        cookie[key] = value;
      });

    return cookie;
  }

  /**
   * Converts cookie setup object to cookie string.
   * @param {Object} cookieSetup Cookie setup object.
   * @param {string} cookieSetup.key Cookie key.
   * @param {string} cookieSetup.value Cookie value.
   * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
   * @param {Date?} cookieSetup.expires Expire date.
   * @param {string?} cookieSetup.path URI path for cookie.
   * @param {string?} cookieSetup.domain Cookie domain.
   * @param {boolean?} cookieSetup.secure Is cookie secured.
   * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
   * @returns {string} Cookie string.
   * @protected
   */
  _convertToCookieSetup (cookieSetup) {
    if (typeof (cookieSetup.key) !== 'string' ||
      typeof (cookieSetup.value) !== 'string') {
      throw new Error('Wrong key or value');
    }

    var cookie = cookieSetup.key + '=' + cookieSetup.value;

    // http://tools.ietf.org/html/rfc6265#section-4.1.1
    if (typeof (cookieSetup.maxAge) === 'number') {
      cookie += '; Max-Age=' + cookieSetup.maxAge.toFixed();
      if (!cookieSetup.expires) {
        // by default expire date = current date + max-age in seconds
        cookieSetup.expires = new Date(Date.now() +
        cookieSetup.maxAge * 1000);
      }
    }

    if (cookieSetup.expires instanceof Date) {
      cookie += '; Expires=' + cookieSetup.expires.toUTCString();
    }

    if (typeof (cookieSetup.path) === 'string') {
      cookie += '; Path=' + cookieSetup.path;
    }

    if (typeof (cookieSetup.domain) === 'string') {
      cookie += '; Domain=' + cookieSetup.domain;
    }

    if (typeof (cookieSetup.secure) === 'boolean' &&
      cookieSetup.secure) {
      cookie += '; Secure';
    }

    if (typeof (cookieSetup.httpOnly) === 'boolean' &&
      cookieSetup.httpOnly) {
      cookie += '; HttpOnly';
    }

    return cookie;
  }
}

module.exports = CookieWrapperBase;
