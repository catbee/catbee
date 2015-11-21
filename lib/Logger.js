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
  constructor ($config) {
    super();

    this._config = $config;
    this._config.logger = this._config.logger || {};

    this._setLevels(this._config.logger.levels);

    this._initConsoleLogger(this._config.logger.console);
    this._initLogstashLogger(this._config.logger.logstash);

    this._logger = new winston.Logger({
      level: 'trace',
      levels: { fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 },
      transports: this._transports
    });

    /**
     * Native winston interface for add/remove transports.
     */
    this.add = this._logger.add.bind(this._logger);
    this.remove = this._logger.remove.bind(this._logger);
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

    this._message('debug', error, meta);
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

    this._message('trace', error, meta);
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

    this._message('info', error, meta);
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

    this._message('warn', error, meta);
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

    this._error('error', error, meta);
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

    this._error('fatal', error, meta);
  }

  _error (level, error, data) {
    var { message, fields } = this._errorFormatter(error);
    var meta = Object.assign({}, fields, data);

    this._send(level, message, meta);
  }

  _message (level, message, meta = {}) {
    this._send(level, message, meta);
  }

  _send (level, message, meta = {}) {
    this._logger.log(level, {
      message, ...meta,
      from: 'Server'
    });
  }
}

module.exports = Logger;
