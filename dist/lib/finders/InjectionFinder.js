'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var util = require('util');

var ARG_NAMES_NODE_NAME = 'argnames';
var COMMENTS_NODE_NAME = 'comments_before';
var START_NODE_NAME = 'start';
var END_NODE_NAME = 'end';
var PROPERTY_NODE_NAME = 'property';
var CONDITION_NODE_NAME = 'condition';
var KEYWORD_TYPE = 'keyword';
var OPERATOR_TYPE = 'operator';
var FUNCTION_KEYWORD = 'function';
var VAR_KEYWORD = 'var';
var SET_OPERATOR = '=';
var INJECTION_PREFIX = '$';

var InjectionFinder = (function () {
  function InjectionFinder() {
    _classCallCheck(this, InjectionFinder);

    this._stack = null;
    this._result = null;
  }

  /**
   * Determines if the argument name from AST is a dependency injection.
   * @param {Object} argName Argument name from AST node.
   * @returns {boolean} Is argument injection.
   */

  _createClass(InjectionFinder, [{
    key: 'find',

    /**
     * Finds names of all dependency injections used in source.
     * @param {Object} ast AST from UglifyJS.
     * @returns {Array<string>} List of names.
     */
    value: function find(ast) {
      this._stack = _Object$keys(ast).map(function (key) {
        return {
          key: key,
          value: ast[key]
        };
      });

      this._result = _Object$create(null);
      var current = null;

      while (this._stack.length > 0) {
        current = this._stack.pop();
        if (current.key === ARG_NAMES_NODE_NAME) {
          this._argNamesHandler(current.value);
          continue;
        }

        if (util.isArray(current.value)) {
          this._arrayHandler(current.value);
          continue;
        }

        this._objectHandler(current.value);
      }
      return _Object$keys(this._result);
    }

    /**
     * Handles "Function arguments" node from AST.
     * @param {Object} argNames AST node with function arguments.
     * @private
     */
  }, {
    key: '_argNamesHandler',
    value: function _argNamesHandler(argNames) {
      var areInjections = argNames.some(isInjection);

      if (!areInjections) {
        return;
      }

      argNames.forEach(this._addArgNameToResult, this);
    }

    /**
     * Add argument name to result set.
     * @param {Object} argName Argument name from AST.
     * @private
     */
  }, {
    key: '_addArgNameToResult',
    value: function _addArgNameToResult(argName) {
      this._result[argName.name] = true;
    }

    /**
     * Adds inner key to queue.
     * @param {Object} value Current object from AST node.
     * @param {string} nextKey Object key to add to queue.
     * @private
     */
  }, {
    key: '_nextHandler',
    value: function _nextHandler(value, nextKey) {
      if (!value[nextKey] || typeof value[nextKey] !== 'object') {
        return;
      }
      if (nextKey === START_NODE_NAME || nextKey === END_NODE_NAME || nextKey === COMMENTS_NODE_NAME || nextKey === CONDITION_NODE_NAME || nextKey === PROPERTY_NODE_NAME) {
        return;
      }

      this._stack.push({
        key: nextKey,
        value: value[nextKey]
      });
    }

    /**
     * Handles "Array" node from AST.
     * @param {Array} array Array from AST node.
     * @private
     */
  }, {
    key: '_arrayHandler',
    value: function _arrayHandler(array) {
      array.forEach(this._objectHandler, this);
    }

    /**
     * Handles "Object" node from AST.
     * @param {Object} object Object in AST node.
     * @private
     */
  }, {
    key: '_objectHandler',
    value: function _objectHandler(object) {
      if (!object || typeof object !== 'object') {
        return;
      }

      // anti-infinite loop protection
      if (object.isProcessedByCat) {
        return;
      }
      object.isProcessedByCat = true;

      if (object.start) {
        if (object.start.type === KEYWORD_TYPE && object.start.value !== FUNCTION_KEYWORD && object.start.value !== VAR_KEYWORD) {
          return;
        }
        if (object.start.type === OPERATOR_TYPE && object.start.value !== SET_OPERATOR) {
          return;
        }
      }
      if (object.hasOwnProperty(OPERATOR_TYPE) && object[OPERATOR_TYPE] !== SET_OPERATOR) {
        return;
      }
      _Object$keys(object).forEach(function (key) {
        this._nextHandler(object, key);
      }, this);
    }
  }]);

  return InjectionFinder;
})();

function isInjection(argName) {
  return argName.name[0] === INJECTION_PREFIX;
}

module.exports = InjectionFinder;

/**
 * Current processing stack.
 * @type {Array}
 * @private
 */

/**
 * Current result set.
 * @type {Object}
 * @private
 */