class LoggerBase {
  /**
   * Current levels of logging.
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
   *
   *
   * @param {Object} log
   * @param {string} level
 * @protected
   */
  _enrichLog (log, level) {
    this._enrichments.forEach((enrich) => enrich(log, level));
  }
}

module.exports = LoggerBase;
