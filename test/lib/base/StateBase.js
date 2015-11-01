var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Baobab = require('baobab');
var assert = require('assert');
var StateBase = require('../../../lib/base/StateBase');
var ServiceLocator = require('catberry-locator');

function createLocator () {
  var locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', {});
  return locator;
}

function noop () {}

lab.experiment('lib/StateBase', function() {
  lab.experiment('#integration', function () {
    var locator;
    var state;

    lab.beforeEach(function(done) {
      locator = createLocator();
      state = new StateBase(locator);
      done();
    });

    lab.test('should run signal with one sync action', function(done) {
      var name = 'test';
      var runner = state.createSignal(name, [noop]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal('test');

      done();
    });

    lab.test('should throw exception if signal defined incorrect', function(done) {
      var name = 'test';
      assert.throws(state.createSignal.bind(state, name, [undefined]), Error);

      done();
    });

    lab.test('should run signal with one sync action and modify state', function(done) {
      function sync (args, state) {
        state.set('hello', args.hello);
      }

      var name = 'test';
      var runner = state.createSignal(name, [sync]);
      locator.registerInstance('signalDefinitions', { runner, name });

      state.runSignal('test', {
        hello: 'world'
      });

      setTimeout(function() {
        assert.equal(state._tree.get('hello'), 'world');
        done();
      }, 0);
    });

    lab.test('should run signal with two sync action and modify state', function(done) {
      function first (args, state) {
        state.set('hello', 'world');
      }

      function second (args, state) {
        state.set('hello', 'planet');
      }

      var name = 'test';
      var runner = state.createSignal(name, [first, second]);
      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal('test');

      setTimeout(function() {
        assert.equal(state._tree.get('hello'), 'planet');
        done();
      }, 0);
    });

    lab.test('should run signal with one async action and output to success', function (done) {
      function async (args, state, output) {
        output.success();
      }

      function success () {
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        [
          async, {
            success: [
              success
            ]
          }
        ]
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should pass async acton output args to next actions', function (done) {
      function async (args, state, output) {
        output.success({ test: 'test' });
      }

      function success (args) {
        assert(args.test);
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        [
          async, {
            success: [success]
          }
        ]
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should not contains mutators if action is async', function (done) {
      function async (args, state, output) {
        assert(!state.set);
        assert(state.get);
        output.success();
      }

      function success (args, state) {
        assert(state.set);
        assert(state.get);
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        [
          async, {
            success: [
              success
            ]
          }
        ]
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should can output to different ways from sync action', function (done) {
      function sync (args, state, output) {
        output.success();
      }

      function success () {
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [sync, {
        success: [
          success
        ]
      }]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should pass arguments to outputs if action is sync', function (done) {
      function sync (args, state, output) {
        output.success({ test: 'test' });
      }

      function success (args) {
        assert(args.test);
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [sync, {
        success: [
          success
        ]
      }]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should correct run chain of sync and async actions', function (done) {
      var times = 0;

      function syncWithoutOutputFirst () {
        times += 1;
        assert.equal(times, 1);
      }

      function syncWithoutOutputSecond () {
        times += 1;
        assert.equal(times, 4);
      }

      function syncWithOutput (args, state, output) {
        times += 1;
        assert.equal(times, 2);
        output.success();
      }

      function async (args, state, output) {
        times += 1;
        assert.equal(times, 5);
        output.success();
      }

      function successSync () {
        times += 1;
        assert.equal(times, 3);
      }

      function successAsync () {
        times += 1;
        assert.equal(times, 6);
      }

      function syncFinal () {
        times += 1;
        assert.equal(times, 7);
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        syncWithoutOutputFirst,
        syncWithOutput, { success: [successSync] },
        syncWithoutOutputSecond,
        [
          async, {
            success: [
              successAsync
            ]
          }
        ],
        syncFinal
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('must pass and extend args thru all actions', function (done) {
      function async (args, state, output) {
        assert(args.sync);
        output.success({ async: 'async' });
      }

      function sync (args, state, output) {
        assert(args.test);
        output({ sync: 'sync'});
      }

      function success (args) {
        assert(args.async);
        assert(args.test);
        assert(args.sync);
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        sync,
        [async, { success: [success]}]
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name, {
        test: 'test'
      });
    });

    lab.test('Deep async actions must run correctly', function (done) {
      function async (args, state, output) {
        output.success();
      }

      function sync (args, state, output) {
        output.success();
      }

      function success () {
        done();
      }

      function successSync (args) {
        assert(args);
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        [
          async, {
            success: [
              sync, {
                success: [
                  successSync
                ]
              },
              [async, {
                success: [
                  success
                ]
              }]
            ]
          }
        ]
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('Should run output actions when ready parent action in async concurrence run', function (done) {
      var times = 0;

      function slow (args, state, output) {
        setTimeout(function () {
          output.success();
        }, 10);
      }

      function fast (args, state, output) {
        setTimeout(function () {
          output.success();
        }, 0);
      }

      function slowSuccess () {
        times += 1;
        assert.equal(times, 2);
        done();
      }

      function fastSuccess () {
        times += 1;
        assert.equal(times, 1);
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        [
          slow, {
            success: [
              slowSuccess
            ]
          },
          fast, {
            success: [
              fastSuccess
            ]
          }
        ]
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should can have ways to output in custom outputs', function (done) {
      function sync (args, state, output) {
        output.custom();
      }

      sync.outputs = ['custom'];

      function custom () {
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        sync, {
          custom: [custom]
        }
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should can accept outputs like objects', function (done) {
      function sync (args, state, output) {
        output.custom();
      }

      sync.outputs = {
        custom: true
      };

      function custom () {
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        sync, {
          custom: [custom]
        }
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });

    lab.test('should can output from sync to async action', function (done) {
      function sync (args, state, output) {
        output.success();
      }

      function async (args, state, output) {
        output.success();
      }

      function success () {
        done();
      }

      var name = 'test';
      var runner = state.createSignal(name, [
        sync, {
          success: [
            [ async, { success: [ success ]} ]
          ]
        }
      ]);

      locator.registerInstance('signalDefinitions', { runner, name });
      state.runSignal(name);
    });
  });

  lab.experiment('#analyze', function() {
    lab.test('should throw error if action is not a function', function(done) {
      assert.throws(StateBase._analyze.bind(null, 'test', [undefined]), Error);
      done();
    });

    lab.test('should not throw error if action is a function', function(done) {
      assert.doesNotThrow(StateBase._analyze.bind(null, 'test', [noop]));
      done();
    });

    lab.test('should throw error if in async array method is not defined', function(done) {
      var actions = [noop, [undefined]];
      assert.throws(StateBase._analyze.bind(null, 'test', actions), Error);
      done();
    });

    lab.test('should not throw error if in async array method is a function', function(done) {
      var actions = [noop, [noop]];
      assert.doesNotThrow(StateBase._analyze.bind(null, 'test', actions));
      done();
    });
  });

  lab.experiment('#checkArgs', function() {
    lab.test('Should throw exception if signal args is not serialized', function(done) {
      var a = {};
      a.b = a;
      assert.throws(StateBase._checkArgs.bind(null, a, 'test'), Error);
      done();
    });

    lab.test('Should not throw exception if signal args is serialized', function(done) {
      assert.doesNotThrow(StateBase._checkArgs.bind(null, { test: 'test' }, 'test'));
      done();
    });
  });

  lab.experiment('#staticTree', function() {
    lab.test('Should return branches and actions as static tree', function(done) {
      var tree = StateBase._staticTree([noop]);
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
      var tree = StateBase._staticTree([
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

    lab.test('Should return empty tree if no passed function or array', function (done) {
      var tree = StateBase._staticTree([{}]);
      assert.equal(tree.branches.length, 0);
      assert.equal(tree.actions.length, 0);
      done();
    });
  });

  lab.experiment('#createActionArgs', function() {
    var tree;

    lab.beforeEach(function(done) {
      tree = new Baobab();
      done();
    });

    lab.test('Should not have mutators if action is async', function(done) {
      var args = StateBase._createActionArgs({}, noop, tree, true);
      var state = args[1];

      assert(state);
      assert(state.get);
      assert(state.exists);
      assert(!state.set);

      done();
    });

    lab.test('Should have mutators if action is sync', function(done) {
      var args = StateBase._createActionArgs({}, noop, tree, false);
      var state = args[1];

      assert(state);
      assert(state.get);
      assert(state.exists);
      assert(state.set);

      done();
    });

    lab.test('Should contains input in return array', function(done) {
      var args = StateBase._createActionArgs({ test: 'test' }, noop, tree, false);
      var input = args[0];
      assert.equal(input.test, 'test');
      done();
    });

    lab.experiment('Test simple tree mutations and accessors', function() {
      lab.test('#set', function(done) {
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
        var state = args[1];

        state.set('test', 'test');
        var value = state.get('test');
        assert.equal(value, 'test');

        done();
      });

      lab.test('#apply', function(done) {
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
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
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
        var state = args[1];

        state.set('test', []);
        state.concat('test', ['test']);
        var value = state.get(['test', 0]);
        assert.equal(value, 'test');

        done();
      });

      lab.test('#deepMerge', function(done) {
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
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
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
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
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
        var state = args[1];

        state.set('test', 'test');
        state.unset('test');
        var value = state.get('test');
        assert(!value);

        done();
      });

      lab.test('#splice', function(done) {
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
        var state = args[1];

        state.set('test', [0,1,2]);
        state.splice('test', [0, 2]);
        var value = state.get('test');
        assert.equal(value[0], 2);

        done();
      });

      lab.test('#unshift', function(done) {
        var args = StateBase._createActionArgs({}, { mutations: [] }, tree, false);
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
