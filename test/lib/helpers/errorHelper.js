var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var routeHelper = require('../../../lib/helpers/errorHelper');

lab.experiment('lib/helpers/errorHelper', function () {
  lab.experiment('#prettyPrint', function () {
    lab.test('should return empty string if wrong error argument', function (done) {
      var result = routeHelper.prettyPrint(null, null);
      assert.strictEqual(result, '');
      done();
    });
  });
});
