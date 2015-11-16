'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _extends = require('babel-runtime/helpers/extends')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var LoggerBase = require('../lib/base/LoggerBase');

/**
 * Creates browser logger.
 * @param {Object} $config
 * @param {Window} $window
 * @param {Object} $uhr
 * @constructor
 */

var Logger = (function (_LoggerBase) {
  _inherits(Logger, _LoggerBase);

  function Logger($config, $window, $uhr) {
    _classCallCheck(this, Logger);

    _get(Object.getPrototypeOf(Logger.prototype), 'constructor', this).call(this);

    this._uhr = null;
    this._window = null;
    this._config = null;
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

  _createClass(Logger, [{
    key: 'onerror',

    /**
     * Window error event handler.
     *
     * @param {ErrorEvent} error
     * @param {String} message
     * @param {Number} lineno - line number
     * @param {Number} colno - column number
     * @param {String} filename - script
     */
    value: function onerror(_ref) {
      var message = _ref.message;
      var filename = _ref.filename;
      var lineno = _ref.lineno;
      var colno = _ref.colno;
      var error = _ref.error;

      this._sendError({
        message: message,
        stack: error.stack,
        filename: filename,
        line: lineno + ':' + colno
      });
    }

    /**
     * Logs trace message.
     * @param {string} messages Trace message.
     */
  }, {
    key: 'trace',
    value: function trace() {
      if (!this._levels.trace) {
        return;
      }

      if (console.log) {
        console.log.apply(console, arguments);
      }
    }

    /**
     * Logs trace message.
     * @param {string} messages Trace message.
     */
  }, {
    key: 'debug',
    value: function debug() {
      if (!this._levels.debug) {
        return;
      }

      if (console.log) {
        console.log.apply(console, arguments);
      }
    }

    /**
     * Logs info message.
     * @param {string} messages Information message.
     */
  }, {
    key: 'info',
    value: function info() {
      if (!this._levels.info) {
        return;
      }

      if (console.info) {
        console.info.apply(console, arguments);
      }
    }

    /**
     * Logs warn message.
     * @param {...string} messages Warning message.
     */
  }, {
    key: 'warn',
    value: function warn() {
      if (!this._levels.warn) {
        return;
      }

      if (console.warn) {
        console.warn.apply(console, arguments);
      }
    }

    /**
     * Logs error message.
     * @param {string|Object|Error} message Error object or message.
     * @param {Object|undefined} meta
     */
  }, {
    key: 'error',
    value: function error(message) {
      var meta = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  }, {
    key: 'fatal',
    value: function fatal(message) {
      var meta = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  }, {
    key: '_sendError',
    value: function _sendError(error, data) {
      var _errorFormatter = this._errorFormatter(error);

      var message = _errorFormatter.message;
      var fields = _errorFormatter.fields;

      var meta = _Object$assign({}, fields, data);

      this._request(_extends({
        message: message }, meta, {
        from: 'Client',
        userHRef: this._window.location.href,
        userAgent: this._window.navigator.userAgent
      }));
    }
  }, {
    key: '_request',
    value: function _request(data) {
      if (!this._config.logger.url) {
        return;
      }

      var loggerHost = this._config.logger.host;
      if (!loggerHost) {
        var protocol = this._window.location.protocol;
        var host = this._window.location.host;

        loggerHost = protocol + '//' + host;
      }

      var headers = {
        'Content-Type': 'application/json'
      };
      var options = { data: data, headers: headers };

      var url = this._config.logger.url;

      this._uhr.post(loggerHost + '/' + url, options)['catch'](function (cause) {
        return Logger.writeError(cause);
      });
    }
  }], [{
    key: 'writeError',
    value: function writeError() {
      if (console.error) {
        console.error.apply(console, arguments);
      }
    }
  }]);

  return Logger;
})(LoggerBase);

module.exports = Logger;

/**
 * Browser window reference
 *
 * @type {Window}
 * @private
 */

/**
 * Catberry logger config reference
 * @type {Object}
 * @private
 */