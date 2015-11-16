'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var LoggerBase = (function () {
  function LoggerBase() {
    _classCallCheck(this, LoggerBase);

    this._levels = {
      debug: true,
      trace: true,
      info: true,
      warn: true,
      error: true,
      fatal: true
    };
  }

  _createClass(LoggerBase, [{
    key: '_setLevels',

    /**
     * Set levels of logging from config.
     *
     * @param {string|Object} levels
     * @protected
     */
    value: function _setLevels(levels) {
      var _this = this;

      if (typeof levels === 'object') {
        this._levels = levels;
      }

      if (typeof levels === 'string') {
        this._levels = {};

        levels.toLowerCase().split(',').forEach(function (level) {
          return _this._levels[level] = true;
        });
      }
    }

    /**
     * Format error to send by network.
     *
     * @param {string|Object|Error} error
     * @returns {{message: string, fields: Object}}
     * @protected
     */
  }, {
    key: '_errorFormatter',
    value: function _errorFormatter(error) {
      var fields = {};
      var message;

      if (error instanceof Error) {
        fields.stack = error.stack;
        message = error.name + ': ' + error.message;
      } else if (typeof error === 'object') {
        message = error.message;
        delete error.message;
        fields = error;
        fields.stack = error.stack || new Error(error).stack;
      } else if (typeof error === 'string') {
        fields.stack = new Error(error).stack;
        message = error;
      }

      return { message: message, fields: fields };
    }
  }]);

  return LoggerBase;
})();

module.exports = LoggerBase;

/**
 * Current levels of logging.
 * @type {Object}
 * @protected
 */