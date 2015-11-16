"use strict";

var _Promise = require("babel-runtime/core-js/promise")["default"];

module.exports = {
  /**
   * Converts method with callback to method that returns promise.
   * @param {Function} methodWithCallback Method with callback.
   * @returns {Function} Method that returns promise.
   */
  callbackToPromise: function callbackToPromise(methodWithCallback) {
    var _this = this;

    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return new _Promise(function (fulfill, reject) {
        args.push(function (error, result) {
          if (error) {
            reject(error);
            return;
          }
          fulfill(result);
        });

        methodWithCallback.apply(_this, args);
      });
    };
  }
};