var LoggerBase = require('../lib/base/LoggerBase');

/**
 * Creates browser logger.
 * @param {Object} $config
 * @param {Window} $window
 * @param {Object} $uhr
 * @constructor
 */
class Logger extends LoggerBase {
  constructor ($config, $window, $uhr) {
    super();

    this._config = $config;
    this._config.logger = this._config.logger || {};
    this._window = $window;
    this._uhr = $uhr;

    this._setLevels(this._config.logger.levels);

    this.debug = this.debug.bind(this);
    this.trace = this.trace.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
    this.fatal = this.fatal.bind(this);
    this.onerror = this.onerror.bind(this);
  }

  /**
   * Catberry UHR reference
   * @type {UHR}
   * @private
   */
  _uhr = null;

  /**
   * Browser window reference
   *
   * @type {Window}
   * @private
   */
  _window = null;

  /**
   * Catberry logger config reference
   * @type {Object}
   * @private
   */
  _config = null;

  /**
   * Window error event handler.
   *
   * @param {ErrorEvent} error
   * @param {String} message
   * @param {Number} lineno - line number
   * @param {Number} colno - column number
   * @param {String} filename - script
   */
  onerror ({ message, filename, lineno, colno, error }) {
    this._sendError({
      message,
      stack: error.stack,
      filename: filename,
      line: `${lineno}:${colno}`
    });
  }

  /**
   * Logs trace message.
   * @param {string} messages Trace message.
   */
  trace (...messages) {
    if (!this._levels.trace) {
      return;
    }

    if (console.log) {
      console.log(...messages);
    }
  }

  /**
   * Logs trace message.
   * @param {string} messages Trace message.
   */
  debug (...messages) {
    if (!this._levels.debug) {
      return;
    }

    if (console.log) {
      console.log(...messages);
    }
  }

  /**
   * Logs info message.
   * @param {string} messages Information message.
   */
  info (...messages) {
    if (!this._levels.info) {
      return;
    }

    if (console.info) {
      console.info(...messages);
    }
  }

  /**
   * Logs warn message.
   * @param {...string} messages Warning message.
   */
  warn (...messages) {
    if (!this._levels.warn) {
      return;
    }

    if (console.warn) {
      console.warn(...messages);
    }
  }

  /**
   * Logs error message.
   * @param {string|Object|Error} message Error object or message.
   * @param {Object|undefined} meta
   */
  error (message, meta = {}) {
    if (!this._levels.error) {
      return;
    }

    this._sendError(message, meta);
    Logger.writeError(message);
  }

  /**
   * Logs error message.
   * @param {string|Object|Error} message Error object or message.
   * @param {Object|undefined} meta
   */
  fatal (message, meta = {}) {
    if (!this._levels.fatal) {
      return;
    }

    this._sendError(message, meta);
    Logger.writeError(message, meta);
  }

  /**
   * Writes error to console.
   * @param {...(string|Error|Object)} errors.
   */
  static writeError (...errors) {
    if (console.error) {
      console.error(...errors);
    }
  }

  _sendError (error, data) {
    var { message, fields } = this._errorFormatter(error);
    var meta = Object.assign({}, fields, data);

    this._request({
      message, ...meta,
      from: 'Client',
      userHRef: this._window.location.href,
      userAgent: this._window.navigator.userAgent
    });
  }

  _request (data) {
    if (!this._config.logger.url) {
      return;
    }

    var loggerHost = this._config.logger.host;
    if (!loggerHost) {
      let protocol = this._window.location.protocol;
      let host = this._window.location.host;

      loggerHost = `${protocol}//${host}`;
    }

    var headers = {
      'Content-Type': 'application/json'
    };
    var options = { data, headers };

    var url = this._config.logger.url;

    this._uhr
      .post(`${loggerHost}/${url}`, options)
      .catch(cause => Logger.writeError(cause));
  }
}

module.exports = Logger;
