const LEVELS = {
  DEBUG: 'debug',
  TRACE: 'trace',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

/**
 * Creates browser logger.
 * @param {Object|string} levels Levels to log.
 * @supported Chrome, Firefox>=2.0, Internet Explorer>=8, Opera, Safari.
 * @constructor
 */
class Logger {
  constructor (levels) {
    if (typeof (levels) === 'object') {
      this._levels = levels;
    }

    if (typeof(levels) === 'string') {
      this._levels = {};
      Object.keys(LEVELS)
        .forEach(level => {
          this._levels[LEVELS[level]] =
            (levels.search(LEVELS[level]) !== -1);
        }, this);
    }

    this.debug = this.debug.bind(this);
    this.trace = this.trace.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
    this.fatal = this.fatal.bind(this);
  }

  /**
   * Current levels of logging.
   * @type {Object}
   * @private
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
   * Logs trace message.
   * @param {string} message Trace message.
   */
  trace (message) {
    if (!this._levels.trace) {
      return;
    }

    if (console.log) {
      console.log(message);
    }
  }

  /**
   * Logs trace message.
   * @param {string} message Trace message.
   */
  debug (message) {
    if (!this._levels.debug) {
      return;
    }

    if (console.log) {
      console.log(message);
    }
  }

  /**
   * Logs info message.
   * @param {string} message Information message.
   */
  info (message) {
    if (!this._levels.info) {
      return;
    }

    if (console.info) {
      console.info(message);
    }
  };

  /**
   * Logs warn message.
   * @param {string} message Warning message.
   */
  warn (message) {
    if (!this._levels.warn) {
      return;
    }

    if (console.warn) {
      console.warn(message);
    }
  };

  /**
   * Logs error message.
   * @param {string|Error} error Error object or message.
   */
  error (error) {
    if (!this._levels.error) {
      return;
    }

    Logger.writeError(error);
  };

  /**
   * Logs error message.
   * @param {string|Error} error Error object or message.
   */
  fatal (error) {
    if (!this._levels.fatal) {
      return;
    }
    Logger.writeError(error);
  };

  /**
   * Writes error to console.
   * @param {Error|string} error Error to write.
   */
  static writeError (error) {
    try {
      if (!(error instanceof Error)) {
        error = typeof(error) === 'string' ? new Error(error) : new Error();
      }
      if (console.error) {
        console.error(error);
      }
    } catch (e) {
      Logger.writeError(e);
    }
  }
}
