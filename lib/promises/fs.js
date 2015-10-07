var fs = require('fs');
var helper = require('./promiseHelper');

module.exports = {
  exists (toCheck) {
    return new Promise(fulfill => fs.exists(toCheck, isExists => fulfill(isExists)));
  },
  makeDir: helper.callbackToPromise(fs.mkdir),
  readFile: helper.callbackToPromise(fs.readFile),
  writeFile: helper.callbackToPromise(fs.writeFile),
  unlink: helper.callbackToPromise(fs.unlink)
};
