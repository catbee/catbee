var winston = require('winston');
var toYAMLFormatter = require('winston-console-formatter');
var LoggerBase = require('./base/LoggerBase');

/**
 * Creates server logger.
 *
 * @param {Object} $config
 * @param {Object} $serviceLocator
 * @class
 */
class Logger extends LoggerBase {
  constructor ($config) {
    super();

    this._config = $config;
    this._config.logger = this._config.logger || {};

    this._setLevels(this._config.logger.levels);

    this.addEnrichment((log) => log.from = 'Server');

    this._logger = new winston.Logger({
      level: 'trace',
      levels: { fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 }
    });

    /**
     * Native winston interface for add/remove transports.
     */
    this.addTransport = this._logger.add.bind(this._logger);
    this.removeTransport = this._logger.remove.bind(this._logger);

    /**
     * Entry point for server logs.
     * Executes from LoggerBase.
     */
    this.log = this._logger.log.bind(this._logger);

    this._initConsoleLogger(this._config.logger.console);
  }

  dropTransports () {
    Object
      .keys(this._logger.transports)
      .forEach((transport) => this.removeTransport(transport));
  }

  /**
   * Init console transport logger
   *
   * @param {Object} userConfig
   * @private
   */
  _initConsoleLogger (userConfig = {}) {
    var config = toYAMLFormatter.config(userConfig, {
      colors: {
        trace: 'blue',
        debug: 'cyan',
        info: 'green',
        warn: 'yellow',
        error: 'red',
        fatal: 'magenta'
      }
    });

    this.addTransport(winston.transports.Console, config);
  }

  /**
   * Logs debug message.
   *
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  debug (error, meta = {}) {
    if (!this._levels.debug) {
      return;
    }

    this._message('debug', error, meta);
  }

  /**
   * Logs trace message.
   *
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  trace (error, meta = {}) {
    if (!this._levels.trace) {
      return;
    }

    this._message('trace', error, meta);
  }

  /**
   * Logs info message.
   *
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  info (error, meta = {}) {
    if (!this._levels.info) {
      return;
    }

    this._message('info', error, meta);
  }

  /**
   * Logs warn message.
   *
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  warn (error, meta = {}) {
    if (!this._levels.warn) {
      return;
    }

    this._message('warn', error, meta);
  }

  /**
   * Logs error message.
   *
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  error (error, meta = {}) {
    if (!this._levels.error) {
      return;
    }

    this._error('error', error, meta);
  }

  /**
   * Logs fatal message.
   *
   * @param {string|Object|Error} error
   * @param {Object|undefined} meta
   */
  fatal (error, meta = {}) {
    if (!this._levels.fatal) {
      return;
    }

    this._error('fatal', error, meta);
  }
}

module.exports = Logger;
