var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var URLArgsProvider = require('../../../lib/providers/URLArgsProvider');
var ServiceLocator = require('catberry-locator');
var events = require('events');
var URI = require('catberry-uri').URI;
var testCases = require('../../cases/lib/providers/URLArgsProvider.json');

lab.experiment('lib/providers/URLArgsProvider', () => {
  lab.experiment('#getArgsByUri', () => {
    testCases.getArgsByUri.forEach((testCase) => {
      lab.test(testCase.name, (done) => {
        var locator = createLocator(testCase.routes);
        var provider = new URLArgsProvider(locator);
        var uri = new URI(testCase.uri);
        var args = provider.getArgsByUri(uri);
        assert.deepEqual(args, testCase.expectedArgs);
        done();
      });
    });

    lab.test('Should map args if method map passed', function (done) {
      var locator = createLocator([
        {
          expression: '/',
          map: function (args) {
            args.x = 1;
            return args;
          }
        }
      ]);

      var provider = new URLArgsProvider(locator);
      var uri = new URI('/');

      var args = provider.getArgsByUri(uri);
      assert.deepEqual(args, { x: 1 });
      done();
    });

    lab.test('should match regex expression', function (done) {
      var locator = createLocator([
        {
          expression: /^\/foo-\d+$/,
          map: function (args) {
            args.x = 1;
            return args;
          }
        }
      ]);

      var provider = new URLArgsProvider(locator);
      var uri = new URI('/foo-42');

      var args = provider.getArgsByUri(uri);
      assert.deepEqual(args, { x: 1 });
      done();
    });
  });
});

function createLocator(routeDefinitions) {
  var locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);

  routeDefinitions.forEach(function (routeDefinition) {
    locator.registerInstance('routeDefinition', routeDefinition);
  });

  return locator;
}
