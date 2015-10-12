var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var SignalFactory = require('../../lib/SignalFactory');

lab.experiment('lib/SignalFactory', function() {
  function noop () {

  }

  lab.experiment('#analyze', function() {
    lab.test('should throw error if action is not a function', function(done) {
      var factory = new SignalFactory();
      assert.throws(factory._analyze.bind(factory, 'test', [undefined]), Error);
      done();
    });

    lab.test('should not throw error if action is a function', function(done) {
      var factory = new SignalFactory();
      assert.doesNotThrow(factory._analyze.bind(factory, 'test', [noop]));
      done();
    });

    lab.test('should throw error if in async array method is not defined', function(done) {
      var factory = new SignalFactory();
      var actions = [noop, [undefined]];
      assert.throws(factory._analyze.bind(factory, 'test', actions), Error);
      done();
    });

    lab.test('should not throw error if in async array method is a function', function(done) {
      var factory = new SignalFactory();
      var actions = [noop, [noop]];
      assert.doesNotThrow(factory._analyze.bind(factory, 'test', actions));
      done();
    });
  });
});
