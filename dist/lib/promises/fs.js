'use strict';

var _Promise = require('babel-runtime/core-js/promise')['default'];

var fs = require('fs');
var helper = require('./promiseHelper');

module.exports = {
  exists: function exists(toCheck) {
    return new _Promise(function (fulfill) {
      return fs.exists(toCheck, function (isExists) {
        return fulfill(isExists);
      });
    });
  },
  makeDir: helper.callbackToPromise(fs.mkdir),
  readFile: helper.callbackToPromise(fs.readFile),
  writeFile: helper.callbackToPromise(fs.writeFile),
  unlink: helper.callbackToPromise(fs.unlink)
};