"use strict";

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _Promise = require("babel-runtime/core-js/promise")["default"];

var LoaderBase = (function () {
  /**
   * Create basic implementation of a module loader.
   * @param {Array} transforms Array of module transformations.
   * @constructor
   */

  function LoaderBase(transforms) {
    _classCallCheck(this, LoaderBase);

    this._transforms = null;

    this._transforms = transforms;
  }

  /**
   * Current transform list
   * @type {Array}
   * @private
   */

  _createClass(LoaderBase, [{
    key: "_applyTransforms",

    /**
     * Applies all transformations registered in Service Locator.
     * @param {Object} module Loaded module.
     * @param {number?} index Transformation index in a list.
     * @returns {Promise<Object|Array>} Transformed module.
     * @protected
     */
    value: function _applyTransforms(module, index) {
      var _this = this;

      if (index === undefined) {
        // the list is a stack, we should reverse it
        index = this._transforms.length - 1;
      }

      if (index < 0) {
        return _Promise.resolve(module);
      }

      var transformation = this._transforms[index];

      return _Promise.resolve().then(function () {
        return transformation.transform(module);
      }).then(function (transformedModule) {
        return _this._applyTransforms(transformedModule, index - 1);
      });
    }
  }]);

  return LoaderBase;
})();

module.exports = LoaderBase;