var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var promiseHelper = require('../../../lib/promises/promiseHelper');

lab.experiment('lib/promises/promiseHelper', function () {
  lab.experiment('#callbackToPromise', function () {
    lab.test('should convert callback to promise and pass result', function (done) {
      var some = function (callback) {
        setTimeout(function () {
          callback(null, 'hello');
        }, 10);
      };
      promiseHelper.callbackToPromise(some)()
        .then(function (value) {
          assert.strictEqual(value, 'hello');
        })
        .then(function () {
          done();
        }, function (reason) {
          done(reason);
        });
    });
    lab.test('should convert callback to promise and pass error', function (done) {
      var some = function (callback) {
        setTimeout(function () {
          callback(new Error('hello'));
        }, 10);
      };
      promiseHelper.callbackToPromise(some)()
        .then(function () {
          assert.fail();
        }, function (reason) {
          assert.strictEqual(reason instanceof Error, true);
          assert.strictEqual(reason.message, 'hello');
        })
        .then(function () {
          done();
        }, function (reason) {
          done(reason);
        });
    });
  });
});
