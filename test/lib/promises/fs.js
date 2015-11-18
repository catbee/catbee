var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var fs = require('../../../lib/promises/fs');

lab.experiment('lib/promises/fs', function () {
  lab.experiment('#exists', function () {
    lab.test('should determine that file exists', function (done) {
      fs.exists(__filename)
        .then(function (isExists) {
          assert.strictEqual(isExists, true);
        })
        .then(function () {
          done();
        }, function (reason) {
          done(reason);
        });
    });
    lab.test('should determine that file does not exist', function (done) {
      fs.exists(__filename + '.never')
        .then(function (isExists) {
          assert.strictEqual(isExists, false);
        })
        .then(function () {
          done();
        }, function (reason) {
          done(reason);
        });
    });
  });
});
