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

}

module.exports = LoggerBase;
