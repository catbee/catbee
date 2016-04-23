var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var testCases = require('../../cases/lib/helpers/routeHelper.json');
var routeHelper = require('../../../lib/helpers/routeHelper');

lab.experiment('lib/helpers/routeHelper', () => {
  lab.experiment('#removeEndSlash', () => {
    testCases.removeEndSlash.forEach((testCase) => {
      lab.test(testCase.name, function (done) {
        var result = routeHelper.removeEndSlash(testCase.uri);
        assert.strictEqual(result, testCase.expected);
        done();
      });
    });
  });
});
