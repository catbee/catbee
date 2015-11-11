var util = require('util');

const ARG_NAMES_NODE_NAME = 'argnames';
const COMMENTS_NODE_NAME = 'comments_before';
const START_NODE_NAME = 'start';
const END_NODE_NAME = 'end';
const PROPERTY_NODE_NAME = 'property';
const CONDITION_NODE_NAME = 'condition';
const KEYWORD_TYPE = 'keyword';
const OPERATOR_TYPE = 'operator';
const FUNCTION_KEYWORD = 'function';
const VAR_KEYWORD = 'var';
const SET_OPERATOR = '=';
const INJECTION_PREFIX = '$';

class InjectionFinder {
  /**
   * Current processing stack.
   * @type {Array}
   * @private
   */
  _stack = null;

  /**
   * Current result set.
   * @type {Object}
   * @private
   */
  _result = null;

  /**
   * Finds names of all dependency injections used in source.
   * @param {Object} ast AST from UglifyJS.
   * @returns {Array<string>} List of names.
   */
  find (ast) {
    this._stack = Object
      .keys(ast)
      .map(function (key) {
        return {
          key: key,
          value: ast[key]
        };
      });

    this._result = Object.create(null);
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
    return Object.keys(this._result);
  };

  /**
   * Handles "Function arguments" node from AST.
   * @param {Object} argNames AST node with function arguments.
   * @private
   */
  _argNamesHandler (argNames) {
    var areInjections = argNames.some(isInjection);

    if (!areInjections) {
      return;
    }

    argNames.forEach(this._addArgNameToResult, this);
  };

  /**
   * Add argument name to result set.
   * @param {Object} argName Argument name from AST.
   * @private
   */
  _addArgNameToResult (argName) {
    this._result[argName.name] = true;
  };

  /**
   * Adds inner key to queue.
   * @param {Object} value Current object from AST node.
   * @param {string} nextKey Object key to add to queue.
   * @private
   */
  _nextHandler (value, nextKey) {
    if (!value[nextKey] || typeof (value[nextKey]) !== 'object') {
      return;
    }
    if (nextKey === START_NODE_NAME ||
      nextKey === END_NODE_NAME ||
      nextKey === COMMENTS_NODE_NAME ||
      nextKey === CONDITION_NODE_NAME ||
      nextKey === PROPERTY_NODE_NAME
    ) {
      return;
    }

    this._stack.push({
      key: nextKey,
      value: value[nextKey]
    });
  };

  /**
   * Handles "Array" node from AST.
   * @param {Array} array Array from AST node.
   * @private
   */
  _arrayHandler (array) {
    array.forEach(this._objectHandler, this);
  };

  /**
   * Handles "Object" node from AST.
   * @param {Object} object Object in AST node.
   * @private
   */
  _objectHandler  (object) {
      if (!object || typeof (object) !== 'object') {
        return;
      }

      // anti-infinite loop protection
      if (object.isProcessedByCat) {
        return;
      }
      object.isProcessedByCat = true;

    if (object.start) {
      if (object.start.type === KEYWORD_TYPE &&
        object.start.value !== FUNCTION_KEYWORD &&
        object.start.value !== VAR_KEYWORD) {
        return;
      }
      if (object.start.type === OPERATOR_TYPE &&
        object.start.value !== SET_OPERATOR) {
        return;
      }
    }
    if (object.hasOwnProperty(OPERATOR_TYPE) &&
      object[OPERATOR_TYPE] !== SET_OPERATOR) {
      return;
    }
      Object
        .keys(object)
        .forEach(function (key) {
          this._nextHandler(object, key);
        }, this);
  };
}

/**
 * Determines if the argument name from AST is a dependency injection.
 * @param {Object} argName Argument name from AST node.
 * @returns {boolean} Is argument injection.
 */
function isInjection(argName) {
  return (argName.name[0] === INJECTION_PREFIX);
}

module.exports = InjectionFinder;
