var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var URLArgsProvider = require('../../../lib/providers/URLArgsProvider');
var ServiceLocator = require('catberry-locator');
var events = require('events');
var URI = require('catberry-uri').URI;
var testCases = require('../../cases/lib/providers/URLArgsProvider.json');

lab.experiment('lib/providers/URLArgsProvider', function () {
  lab.experiment('#getArgsByUri', function () {
    testCases.getArgsByUri.forEach(function (testCase) {
      lab.test(testCase.name, function (done) {
        var locator = createLocator(testCase.routes);
        var provider = locator.resolveInstance(URLArgsProvider);
        var uri = new URI(testCase.uri);
        var args = provider.getArgsByUri(uri);
        assert.deepEqual(args, testCase.expectedArgs);
        done();
      });
    });
  });

  lab.experiment('#getSignalByUri', function () {
    testCases.getSignalByUri.forEach(function (testCase) {
      lab.test(testCase.name, function (done) {
        var locator = createLocator(testCase.routes);
        var provider = locator.resolveInstance(URLArgsProvider);
        var uri = new URI(testCase.uri);
        var signal = provider.getSignalByUri(uri);
        assert.deepEqual(signal, testCase.expectedSignal);
        done();
      });
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
