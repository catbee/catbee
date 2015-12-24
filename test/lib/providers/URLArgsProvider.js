var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var URLArgsProvider = require('../../../lib/providers/URLArgsProvider');
var ServiceLocator = require('catberry-locator');
var events = require('events');
var URI = require('catberry-uri').URI;
var testCases = require('../../cases/lib/providers/URLArgsProvider.json');

lab.experiment('lib/providers/URLArgsProvider', function () {
  lab.experiment('#getArgsAndSignalByUri', function () {
    testCases.getArgsAndSignalByUri.forEach(function (testCase) {
      lab.test(testCase.name, function (done) {
        var locator = createLocator(testCase.routes);
        var provider = locator.resolveInstance(URLArgsProvider);
        var uri = new URI(testCase.uri);
        var argsAndSignal = provider.getArgsAndSignalByUri(uri);
        assert.deepEqual(argsAndSignal, testCase.expectedArgsAndSignal);
        done();
      });
    });

    lab.test('Should map args if method map passed', function (done) {
      var locator = createLocator([
        {
          expression: '/',
          signal: 'Hello',
          map: function ({ signal, args }) {
            signal = 'test';
            return { signal, args };
          }
        }
      ]);

      var provider = locator.resolveInstance(URLArgsProvider);
      var uri = new URI('/');

      var argsAndSignal = provider.getArgsAndSignalByUri(uri);
      assert.deepEqual(argsAndSignal, {
        args: {},
        signal: 'test'
      });
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
