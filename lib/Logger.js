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
class Logger extends LoggerBase {
  constructor ($config, $serviceLocator) {
    super();

    this._config = $config.logger || {};
    this._serviceLocator = $serviceLocator;

    this._setLevels(this._config.levels);

    this._initConsoleLogger(this._config.console);
    this._initLogstashLogger(this._config.logstash);

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
  _transports = [];

  /**
   * Add transport to list.
   *
   * @param {Object} transport
   * @private
   */
  _addTransport (transport) {
    this._transports.push(transport);
  }

  /**
   * Init console transport logger
   *
   * @param {Object} userConfig
   * @private
   */
  _initConsoleLogger (userConfig = {}) {
    var config = toYAMLFormatter.config(userConfig);

    this._addTransport(new winston.transports.Console(config));
  }

  /**
   * Init logstash transport logger
   *
   * @param {Object} config
   * @private
   */
  _initLogstashLogger (config) {
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
  debug (error, meta) {
    if (!this._levels.debug) {
      return;
    }

    this._sendError('debug', error, meta);
  }

  /**
   * Logs trace message.
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  trace (error, meta) {
    if (!this._levels.trace) {
      return;
    }

    this._sendError('trace', error, meta);
  }

  /**
   * Logs info message.
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  info (error, meta) {
    if (!this._levels.info) {
      return;
    }

    this._sendError('info', error, meta);
  }

  /**
   * Logs warn message.
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  warn (error, meta) {
    if (!this._levels.warn) {
      return;
    }

    this._sendError('warn', error, meta);
  }

  /**
   * Logs error message.
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  error (error, meta) {
    if (!this._levels.error) {
      return;
    }

    this._sendError('error', error, meta);
  }

  /**
   * Logs fatal message.
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  fatal (error, meta) {
    if (!this._levels.fatal) {
      return;
    }

    this._sendError('fatal', error, meta);
  }

  _sendError (level, error, data) {
    var { message, fields } = this._errorFormatter(error);
    var meta = Object.assign(fields, data);

    this._logger.log(level, {
      message, ...meta,
      from: 'Server Error'
    });
  }
}

module.exports = Logger;
