var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var StateProvider = require('../../../lib/providers/StateProvider');
var ServiceLocator = require('catberry-locator');
var events = require('events');
var URI = require('catberry-uri').URI;
var testCases = require('../../cases/lib/providers/StateProvider.json');

lab.experiment('lib/providers/StateProvider', function () {
  lab.experiment('#getStateByUri', function () {
    testCases.getStateByUri.forEach(function (testCase) {
      lab.test(testCase.name, function (done) {
        var locator = createLocator(testCase.routes);
        var provider = locator.resolveInstance(StateProvider);
        var uri = new URI(testCase.uri);
        var state = provider.getStateByUri(uri);
        assert.deepEqual(state, testCase.expectedState);
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
