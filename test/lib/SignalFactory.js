var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var SignalFactory = require('../../lib/SignalFactory');
var State = require('../../lib/State');
var ServiceLocator = require('catberry-locator');

function noop () {}

function createLocator () {
  var locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', {});
  locator.register('state', State, {}, true);
  return locator;
}

lab.experiment('lib/SignalFactory', function() {
  var locator;

  lab.beforeEach(function(done) {
    locator = createLocator();
    done();
  });

  lab.experiment('#integration', function () {
    lab.test('should run signal with one sync action', function(done) {
      var factory = new SignalFactory(locator);

      function sync (args, state) {
        state.set('hello', args.hello);
      }

      var signal = factory.create('test', [
        sync
      ]);

      //signal({ hello: 'world' });
      done();
    });

    lab.test('should run signal with one async action', function(done) {
      var factory = new SignalFactory(locator);
      var async = factory.create('asyncTest', [
        [
          function (args, state, output) {
            output.success();
          }, {
            success: [
              function success () {
                console.log('success');
                done();
              }
            ],
            error: [
              function error () {
                console.log('error');
                done();
              }
            ]
          }
        ]
      ]);

      async();
    });
  });

  lab.experiment('#analyze', function() {
    lab.test('should throw error if action is not a function', function(done) {
      var factory = new SignalFactory(locator);
      assert.throws(factory._analyze.bind(factory, 'test', [undefined]), Error);
      done();
    });

    lab.test('should not throw error if action is a function', function(done) {
      var factory = new SignalFactory(locator);
      assert.doesNotThrow(factory._analyze.bind(factory, 'test', [noop]));
      done();
    });

    lab.test('should throw error if in async array method is not defined', function(done) {
      var factory = new SignalFactory(locator);
      var actions = [noop, [undefined]];
      assert.throws(factory._analyze.bind(factory, 'test', actions), Error);
      done();
    });

    lab.test('should not throw error if in async array method is a function', function(done) {
      var factory = new SignalFactory(locator);
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
      var factory = new SignalFactory(locator);
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
      var factory = new SignalFactory(locator);
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
      factory = new SignalFactory(locator);
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

  lab.experiment('#createActionArgs', function() {
    lab.test('Should not have mutators if action is async', function(done) {
      var factory = new SignalFactory(locator);
      var args = factory._createActionArgs({}, noop, true);
      var state = args[1];

      assert(state);
      assert(state.get);
      assert(state.exists);
      assert(!state.set);

      done();
    });

    lab.test('Should have mutators if action is sync', function(done) {
      var factory = new SignalFactory(locator);
      var args = factory._createActionArgs({}, noop, false);
      var state = args[1];

      assert(state);
      assert(state.get);
      assert(state.exists);
      assert(state.set);

      done();
    });

    lab.test('Should contains input in return array', function(done) {
      var factory = new SignalFactory(locator);
      var args = factory._createActionArgs({ test: 'test' }, noop, false);
      var input = args[0];
      assert.equal(input.test, 'test');
      done();
    });

    lab.experiment('Test simple tree mutations and accessors', function() {
      var factory;

      lab.beforeEach(function(done) {
        var locator = createLocator();
        factory = new SignalFactory(locator);
        done();
      });

      lab.test('#set', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        state.set('test', 'test');
        var value = state.get('test');
        assert.equal(value, 'test');

        done();
      });

      lab.test('#apply', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        var initial = state.get('test');
        assert(!initial);

        state.apply('test', function() {
          return 'test';
        });

        var value = state.get('test');
        assert.equal(value, 'test');

        done();
      });

      lab.test('#concat', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        state.set('test', []);
        state.concat('test', ['test']);
        var value = state.get(['test', 0]);
        assert.equal(value, 'test');

        done();
      });

      lab.test('#deepMerge', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        state.set('test', {
          test: {
            test: 'test'
          }
        });

        state.deepMerge('test', {
          test: {
            test: 'value'
          }
        });

        var value = state.get(['test', 'test', 'test']);
        assert.equal(value, 'value');

        done();
      });

      lab.test('#merge', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        state.set('test', {
          test: 'test'
        });

        state.merge('test', {
          test: 'value'
        });

        var value = state.get(['test', 'test']);
        assert.equal(value, 'value');

        done();
      });

      lab.test('#unset', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        state.set('test', 'test');
        state.unset('test');
        var value = state.get('test');
        assert(!value);

        done();
      });

      lab.test('#splice', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        state.set('test', [0,1,2]);
        state.splice('test', [0, 2]);
        var value = state.get('test');
        assert.equal(value[0], 2);

        done();
      });

      lab.test('#unshift', function(done) {
        var args = factory._createActionArgs({}, { mutations: [] }, false);
        var state = args[1];

        state.set('test', []);
        state.unshift('test', 0);
        var value = state.get(['test', 0]);
        assert.equal(value, 0);

        done();
      });
    });
  })
});
