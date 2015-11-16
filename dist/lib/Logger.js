'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _extends = require('babel-runtime/helpers/extends')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var winston = require('winston');
var toYAMLFormatter = require('winston-console-formatter');
var LoggerBase = require('./base/LoggerBase');
var Graylog2 = require('winston-graylog2');

/**
 * Creates server logger.
 * @param {Object} $config
 * @param {Object} $serviceLocator
 * @constructor
 */

var Logger = (function (_LoggerBase) {
  _inherits(Logger, _LoggerBase);

  function Logger($config) {
    _classCallCheck(this, Logger);

    _get(Object.getPrototypeOf(Logger.prototype), 'constructor', this).call(this);

    this._transports = [];
    this._config = $config;
    this._config.logger = this._config.logger || {};

    this._setLevels(this._config.logger.levels);

    this._initConsoleLogger(this._config.logger.console);
    this._initLogstashLogger(this._config.logger.logstash);

    this._logger = new winston.Logger({
      transports: this._transports
    });
  }

  /**
   * List of winston transport loggers
   *
   * @type {Array}
   * @private
   */

  _createClass(Logger, [{
    key: '_addTransport',

    /**
     * Add transport to list.
     *
     * @param {Object} transport
     * @private
     */
    value: function _addTransport(transport) {
      this._transports.push(transport);
    }

    /**
     * Init console transport logger
     *
     * @param {Object} userConfig
     * @private
     */
  }, {
    key: '_initConsoleLogger',
    value: function _initConsoleLogger() {
      var userConfig = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var config = toYAMLFormatter.config(userConfig);

      this._addTransport(new winston.transports.Console(config));
    }

    /**
     * Init logstash transport logger
     *
     * @param {Object} config
     * @private
     */
  }, {
    key: '_initLogstashLogger',
    value: function _initLogstashLogger(config) {
      if (!config) {
        return;
      }

      this._addTransport(new Graylog2(config));
    }

    /**
     * Logs debug message.
     * @param {string|Object|Error} error
     * @param {Object|undefined} meta
     */
  }, {
    key: 'debug',
    value: function debug(error, meta) {
      if (!this._levels.debug) {
        return;
      }

      this._message('debug', error, meta);
    }

    /**
     * Logs trace message.
     * @param {string|Object|Error} error
     * @param {Object|undefined} meta
     */
  }, {
    key: 'trace',
    value: function trace(error, meta) {
      if (!this._levels.trace) {
        return;
      }

      this._message('trace', error, meta);
    }

    /**
     * Logs info message.
     * @param {string|Object|Error} error
     * @param {Object|undefined} meta
     */
  }, {
    key: 'info',
    value: function info(error, meta) {
      if (!this._levels.info) {
        return;
      }

      this._message('info', error, meta);
    }

    /**
     * Logs warn message.
     * @param {string|Object|Error} error
     * @param {Object|undefined} meta
     */
  }, {
    key: 'warn',
    value: function warn(error, meta) {
      if (!this._levels.warn) {
        return;
      }

      this._message('warn', error, meta);
    }

    /**
     * Logs error message.
     * @param {string|Object|Error} error
     * @param {Object|undefined} meta
     */
  }, {
    key: 'error',
    value: function error(_error, meta) {
      if (!this._levels.error) {
        return;
      }

      this._error('error', _error, meta);
    }

    /**
     * Logs fatal message.
     * @param {string|Object|Error} error
     * @param {Object|undefined} meta
     */
  }, {
    key: 'fatal',
    value: function fatal(error, meta) {
      if (!this._levels.fatal) {
        return;
      }

      this._error('fatal', error, meta);
    }
  }, {
    key: '_error',
    value: function _error(level, error, data) {
      var _errorFormatter = this._errorFormatter(error);

      var message = _errorFormatter.message;
      var fields = _errorFormatter.fields;

      var meta = _Object$assign({}, fields, data);

      this._send(level, message, meta);
    }
  }, {
    key: '_message',
    value: function _message(level, message) {
      var meta = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      this._send(level, message, meta);
    }
  }, {
    key: '_send',
    value: function _send(level, message) {
      var meta = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      this._logger.log(level, _extends({
        message: message }, meta, {
        from: 'Server'
      }));
    }
  }]);

  return Logger;
})(LoggerBase);

module.exports = Logger;