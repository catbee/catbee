var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var SignalFactory = require('../../lib/SignalFactory');

lab.experiment('lib/SignalFactory', function() {
  function noop () {}

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

  lab.experiment('#checkArgs', function() {
    lab.test('Should throw exception if signal args is not serialized', function(done) {
      var a = {};
      a.b = a;
      assert.throws(SignalFactory._checkArgs.bind(null, a, 'test'), Error);
      done();
    });

    lab.test('Should not throw exception if signal args is serialized', function(done) {
      assert.doesNotThrow(SignalFactory._checkArgs.bind(null, { test: 'test' }, 'test'));
      done();
    });
  });

  lab.experiment('#staticTree', function() {
    lab.test('Should return branches and actions as static tree', function(done) {
      var factory = new SignalFactory();
      var tree = factory._staticTree([noop]);
      var branch = tree.branches[0];
      var path = branch.path[0];
      var outputs = branch.outputs;
      var actionIndex = branch.actionIndex;

      assert.equal(path, 0);
      assert.equal(outputs, null);
      assert.equal(actionIndex, 0);

      done();
    });

    lab.test('Should correct format branches for async actions', function(done) {
      var factory = new SignalFactory();
      var tree = factory._staticTree([
        [
          noop, {
            success: [
              noop
            ],
            error: [
              noop
            ]
          }
        ]
      ]);

      var asyncBranch = tree.branches[0][0];

      assert.equal(asyncBranch.path[0], 0);
      assert(asyncBranch.outputs.success);
      assert(asyncBranch.outputs.error);

      done();
    });
  });

  lab.experiment('#create', function() {
    var factory;

    lab.before(function (done) {
      factory = new SignalFactory();
      done();
    });

    lab.test('Should return function', function(done) {
      var signal = factory.create('name', [noop]);
      assert(typeof signal === 'function');
      done();
    });

    lab.test('Run signal return promise', function(done) {
      var signal = factory.create('name', [noop]);
      var signalRun = signal();
      assert(signalRun instanceof Promise);
      done();
    });
  });
});
