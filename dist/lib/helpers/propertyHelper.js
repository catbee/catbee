"use strict";

var _Object$defineProperty = require("babel-runtime/core-js/object/define-property")["default"];

module.exports = {
  /**
   * Defines read-only property.
   * @param {Object} object Object to define property in.
   * @param {string} name Name of the property.
   * @param {*} value Property value.
   */
  defineReadOnly: function defineReadOnly(object, name, value) {
    _Object$defineProperty(object, name, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: value
    });
  }
};