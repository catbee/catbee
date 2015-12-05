/**
 * Basic functionality for loggers
 *
 * @abstract
 * @class
 * */
class LoggerBase {
  /**
   * Current levels of logging.
   *
   * @type {Object}
   * @protected
   */
  _levels = {
    debug: true,
    trace: true,
    info: true,
    warn: true,
    error: true,
    fatal: true
  };

  /**
   * Set levels of logging from config.
   *
   * @param {string|Object} levels
   * @protected
   */
  _setLevels (levels) {
    if (typeof (levels) === 'object') {
      this._levels = levels;
    }

    if (typeof (levels) === 'string') {
      this._levels = {};

      levels
        .toLowerCase()
        .split(',')
        .forEach(level => this._levels[level] = true);
    }
  }

  /**
   * Format error to send by network.
   *
   * @param {string|Object|Error} error
   * @returns {{message: string, fields: Object}}
   * @protected
   */
  _errorFormatter (error) {
    var fields = {};
    var message;

    if (error instanceof Error) {
      fields.stack = error.stack;
      message = `${error.name}: ${error.message}`;
    } else if (typeof error === 'object') {
      message = error.message;
      delete error.message;
      fields = error;
      fields.stack = error.stack || new Error(error).stack;
    } else if (typeof error === 'string') {
      fields.stack = new Error(error).stack;
      message = error;
    }

    return { message, fields };
  }

  /**
   * List of log message enrichments
   *
   * @type {Array<function>}
   * @private
   */
  _enrichments = [];

  /**
   * Add log message enrichment.
   * Enrichments is a function which executed with log object for enrich him.
   *
   * @example: function enrichment (logObject) {
   *   logObject.session = cookie.session_token
   * }
   *
   * @param {function} enrichment
   */
  addEnrichment (enrichment) {
    if (typeof enrichment !== 'function') {
      this.error(new TypeError('Enrichment must be a function'));
      return;
    }

    this._enrichments.push(enrichment);
  }

  /**
   * Remove single enrichment.
   *
   * @param {function} enrichment
   */
  removeEnrichment (enrichment) {
    var index = this._enrichments.indexOf(enrichment);

    if (index === -1) {
      this.info('Enrichment not found. Remove nothing');
      return;
    }

    this._enrichments.splice(index, 1);
  }

  /**
   * Drop all current log message enrichments.
   */
  dropEnrichments () {
    this._enrichments = [];
  }

  /**
   * Apply all enrichments to log object.
   *
   * @param {Object} log
   * @param {string} level
   * @protected
   */
  _enrichLog (log, level) {
    this._enrichments.forEach((enrich) => enrich(log, level));
  }

  /**
   * Logs with stack trace.
   *
   * @param {string} level
   * @param {Error|string} error
   * @param {Object|undefined} data
   * @protected
   */
  _error (level, error, data) {
    var { message, fields } = this._errorFormatter(error);
    var meta = Object.assign({}, fields, data);

    this._send(level, message, meta);
  }

  /**
   * Logs without stack trace.
   *
   * @param {string} level
   * @param {string} message
   * @param {Object|undefined} data
   * @protected
   */
  _message (level, message, data = {}) {
    this._send(level, message, data);
  }

  /**
   * Enrich log message and send to log(level, log) method which must be realized by
   * inheritor.
   *
   * @param {string} level
   * @param {string} message
   * @param {Object} meta
   * @protected
   */
  _send (level, message, meta = {}) {
    var log = { message, ...meta };

    this._enrichLog(log, level);

    try {
      this.log(level, log);
    } catch (e) {
      throw new Error('Logger must realize log(level: string, log: Object) method');
    }
  }
}

module.exports = LoggerBase;
