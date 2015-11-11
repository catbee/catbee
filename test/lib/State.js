var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var State = require('../../lib/State');
var ServiceLocator = require('catberry-locator');
var appstate = require('appstate');

function noop () {}

lab.experiment('lib/State', function() {
  var state;
  var locator;

  lab.beforeEach(function(done) {
    locator = new ServiceLocator();
    state = new State(locator);
    done();
  });

  lab.experiment('#setInitialState', function() {
    lab.test('return promise', function(done) {
      var name = 'test';
      var fn = appstate.create(name, [noop]);
      locator.registerInstance('signal', { fn, name });

      state.setInitialState({
        signal: name,
        args: {}
      })
        .then(function(result) {
          assert(result);
          assert.equal(typeof result, 'object');
          done();
        });
    });
  });
});
