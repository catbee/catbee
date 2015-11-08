var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var testCases = require('../../cases/lib/streams/ComponentReadable.json');
var ServerResponse = require('../../mocks/ServerResponse');
var ComponentReadable = require('../../../lib/streams/ComponentReadable');

lab.experiment('lib/streams/ComponentReadable', function () {
  lab.experiment('#foundComponentHandler', function () {
    testCases.cases.forEach(function (testCase) {
      lab.test(testCase.name, function (done) {
        var concat = '';
        var parser = new ComponentReadable(createContext(), testCase.inputStreamOptions);

        parser._isFlushed = true;
        parser._foundComponentHandler = function (tagDetails) {
          var id = tagDetails.attributes.id || '';
          return Promise.resolve('content-' + tagDetails.name + id);
        };
        parser.renderHTML(testCase.input);

        parser
          .on('data', function (chunk) {
            concat += chunk;
          })
          .on('end', function () {
            assert.strictEqual(concat, testCase.expected, 'Wrong HTML content');
            done();
          });
      });
    });
  });
});

function createContext() {
  return {
    routingContext: {
      middleware: {
        response: new ServerResponse(),
        next: function () {}
      }
    }
  };
}
