var Baobab = require('baobab');
var stateHelper = require('../helpers/stateHelper');

class StateBase {
  /**
   * Main class for control application state.
   * Use Baobab as main state storage and expose interface for state modification.
   * @constructor
   * @param {ServiceLocator} serviceLocator
   */
  constructor (serviceLocator) {
    this._tree = new Baobab();
    this._locator = serviceLocator;
  }

  /**
   * Service locator reference
   * @type {ServiceLocator}
   * @private
   */
  _locator = null;

  /**
   * Baobab tree reference
   * @type {Baobab}
   * @private
   */
  _tree = null;

  /**
   * Signals run history
   * @type {Array}
   * @private
   */
  _history = [];

  /**
   * Find and run signal, after signal is resolved,
   * all result will pushed to history stack.
   * @param {String} name
   * @param {Object} [args={}]
   * @return {Promise}
   */
  runSignal (name, args = {}) {
    var signals = this._locator.resolveAll('signalDefinitions');
    var signal = signals.find(signal => signal.name === name);
    var signalRun = signal.runner.apply(null, [args]);

    return signalRun
      .then(signalRunResults => this._history.push(signalRunResults));
  }

  /**
   * Signal factory. Create signal functions with deep analyzed structure.
   * Every signal run, have full meta information about every action called within signal.
   * Before create, signal will be analyzed for correct definition.
   *
   * @example:
   *  var actions = [
   *    syncAction,
   *    [
   *      asyncAction,
   *      {
   *        success: [successSyncAction],
   *        error: [errorSyncAction]
   *      }
   *    ]
   *  ];
   *
   *  var name = 'example';
   *  var signal = state.createSignal(name, actions);
   *
   *  // You can run signal as function that return Promise with results
   *  signal();
   *
   * Every function in this example is pure.
   * That have 3 args: signalArgs, state, output.
   * All args passed automatically when you run signal.
   *
   * @param {String} name
   * @param {Array} actions
   * @return {Function}
   */
  createSignal (name, actions) {
    StateBase._analyze(name, actions);

    return (args) => {
      return new Promise((resolve, reject) => {
        StateBase._checkArgs(args, name);
        // Transform signal definition to flatten array
        var tree = StateBase._staticTree(actions);

        // Create signal definition
        var signal = {
          name, args,
          branches: tree.branches,
          isExecuting: true,
          duration: 0
        };

        var start = Date.now();
        var promise = { resolve, reject };

        // Start recursive run tree branches
        StateBase._runBranch(0, {
          tree, args, signal, promise, start,
          state: this._tree
        });
      });
    }
  }

  /**
   * Run tree branch, or resolve signal
   * if no more branches in recursion.
   * @param {Number} index
   * @param {Object} options
   * @param {Object} options.tree
   * @param {Object} options.args
   * @param {Object} options.signal
   * @param {Object} options.promise
   * @param {Date}   options.start
   * @param {Baobab} options.state
   * @private
   */
  static _runBranch (index, options) {
    var { tree, signal, start, promise } = options;
    var currentBranch = tree.branches[index];

    if (!currentBranch && tree.branches === signal.branches) {
      if (tree.branches[index - 1]) {
        tree.branches[index - 1].duration = Date.now() - start;
      }

      signal.isExecuting = false;

      if (promise) {
        promise.resolve(signal);
      }

      return;
    }

    if (!currentBranch) {
      return;
    }

    return Array.isArray(currentBranch) ?
      StateBase._runAsyncBranch(index, currentBranch, options) :
      StateBase._runSyncBranch(index, currentBranch, options);
  }

  /**
   * Run async branch
   * @param {Number} index
   * @param {Object} currentBranch
   * @param {Object} options
   * @param {Object} options.tree
   * @param {Object} options.args
   * @param {Object} options.signal
   * @param {Object} options.promise
   * @param {Date}   options.start
   * @param {Baobab} options.state
   * @returns {Promise}
   * @private
   */
  static _runAsyncBranch (index, currentBranch, options) {
    var { tree, args, signal, state, promise, start } = options;

    var promises = currentBranch
      .map(action => {
        var actionFunc = tree.actions[action.actionIndex];
        var actionArgs = StateBase._createActionArgs(args, action, state, true);

        action.isExecuting = true;
        action.args = stateHelper.merge({}, args);

        var next = StateBase._createNextAsyncAction(actionFunc);
        actionFunc.apply(null, actionArgs.concat(next.fn));

        return next.promise
          .then(result => {
            action.hasExecuted = true;
            action.isExecuting = false;
            action.output = result.args;
            stateHelper.merge(args, result.args);

            if (result.path) {
              var output = action.outputs[result.path];

              return StateBase._runBranch(0, {
                args, signal, state, start, promise,
                tree: {
                  actions: tree.actions,
                  branches: output
                }
              });
            }
          });
      });

    return Promise.all(promises)
      .then(() => StateBase._runBranch(index + 1, options));
  }

  /**
   * Run sync branch
   * @param {Number} index
   * @param {Object} currentBranch
   * @param {Object} options
   * @param {Object} options.tree
   * @param {Object} options.args
   * @param {Object} options.signal
   * @param {Object} options.promise
   * @param {Date}   options.start
   * @param {Baobab} options.state
   * @returns {Promise|undefined}
   * @private
   */
  static _runSyncBranch (index, currentBranch, options) {
    var { args, tree, signal, state, start, promise } = options;

    try {
      var action = currentBranch;
      var actionFunc = tree.actions[action.actionIndex];
      var actionArgs = StateBase._createActionArgs(args, action, state, false);

      action.mutations = [];
      action.args = stateHelper.merge({}, args);

      var next = StateBase._createNextSyncAction(actionFunc);
      actionFunc.apply(null, actionArgs.concat(next));

      var result = next._result || {};
      stateHelper.merge(args, result.args);

      action.isExecuting = false;
      action.hasExecuted = true;
      action.output = result.args;

      if (result.path) {
        action.outputPath = result.path;
        var output = action.outputs[result.path];

        var result = StateBase._runBranch(0, {
          args, signal, state, start, promise,
          tree: {
            actions: tree.actions,
            branches: output
          }
        });

        if (result && result.then) {
          return result.then(function () {
            return StateBase._runBranch(index + 1, options);
          });
        } else {
          return StateBase._runBranch(index + 1, options);
        }
      } else {
        return StateBase._runBranch(index + 1, options);
      }
    } catch (e) {
      console.log(e.stack);
    }
  }

  /**
   * Add output paths to next function.
   * It's method allow define custom outputs for every action.
   * By default, allow 2 outputs: success and error.
   * You can define custom output this way:
   *
   * @example
   *  function action (args, state, output) {
   *    output.custom();
   *  }
   *
   *  action.outputs = ['success', 'error', 'custom'];
   *
   * @param {Function} action
   * @param {Function} next
   * @returns {*}
   * @private
   */
  static _addOutputs (action, next) {
    if (!action.outputs) {
      next.success = next.bind(null, 'success');
      next.error = next.bind(null, 'error');
    } else if (Array.isArray(action.outputs)) {
      action.outputs.forEach(function (key) {
        next[key] = next.bind(null, key);
      });
    } else {
      Object.keys(action.outputs).forEach(function (key) {
        next[key] = next.bind(null, key);
      });
    }

    return next;
  }

  /**
   * Create next function in signal chain.
   * It's unified method for async and sync actions.
   * @param {Function} action
   * @param {Function} [resolver]
   * @returns {Function}
   * @private
   */
  static _createNextFunction (action, resolver) {
    return function next (...args) {
      var path = typeof args[0] === 'string' ? args[0] : null;
      var arg = path ? args[1] : args[0];

      var result = {
        path: path ? path : action.defaultOutput,
        args: arg
      };

      if (resolver) {
        resolver(result);
      } else {
        next._result = result;
      }
    }
  }

  /**
   * Create next sync action
   * @param {Function} actionFunc
   * @returns {Function}
   * @private
   */
  static _createNextSyncAction (actionFunc) {
    var next = StateBase._createNextFunction(actionFunc);
    next = StateBase._addOutputs(actionFunc, next);

    return next;
  }

  /**
   * Create next sync action
   * @param {Function} actionFunc
   * @returns {{}}
   * @private
   */
  static _createNextAsyncAction (actionFunc) {
    var resolver = null;
    var promise = new Promise((resolve) => resolver = resolve);
    var fn = StateBase._createNextFunction(actionFunc, resolver);
    StateBase._addOutputs(actionFunc, fn);

    return { fn, promise };
  }

  /**
   * Create action arguments for every action.
   * State object exposed as special patched collection of
   * mutation/accessors functions of Baobab Tree.
   * @param {*} args
   * @param {Object} action
   * @param {Object} state
   * @param {Boolean} isAsync
   * @returns {Array}
   * @private
   */
  static _createActionArgs (args, action, state, isAsync) {
    var stateMethods = StateBase._getStateMutatorsAndAccessors(state, action, isAsync);
    return [ args, stateMethods ];
  }

  /**
   * Get state mutators and accessors
   * Each mutation will save in action descriptor.
   * This method allow add ability
   * to gather information about call every function.
   * @param {Object} state
   * @param {Object} action
   * @param {Boolean} isAsync
   * @return {Object}
   */
  static _getStateMutatorsAndAccessors (state, action, isAsync) {
    var mutators = [
      'apply',
      'concat',
      'deepMerge',
      'push',
      'merge',
      'unset',
      'set',
      'splice',
      'unshift'
    ];

    var accessors = [
      'get',
      'exists'
    ];

    var methods = [];

    if (isAsync) {
      methods = methods.concat(accessors);
    } else {
      methods = methods.concat(mutators);
      methods = methods.concat(accessors);
    }

    var stateMethods = Object.create(null);
    methods.reduce((stateMethods, methodName) => {
      var method = state[methodName].bind(state);

      stateMethods[methodName] = (...args) => {
        var path = [];
        var firstArg = args[0];

        if (Array.isArray(firstArg)) {
          path = args.shift();
        } else if (typeof firstArg === 'string') {
          path = [args.shift()]
        }

        if (args.length === 0) {
          return method.apply(null, [path.slice()]);
        }

        action.mutations.push({
          name: methodName,
          path: path.slice(),
          args: args
        });

        return method.apply(null, [path.slice()].concat(args));
      };

      return stateMethods;
    }, stateMethods);

    return stateMethods;
  }

  /**
   * Transform signal actions to static tree.
   * Every function will be exposed as object definition,
   * that will store meta information and function call results.
   * @param {Array} signalActions
   * @returns {{ actions: [], branches: [] }}
   * @private
   */
  static _staticTree (signalActions) {
    var actions = [];
    var branches = StateBase._transformBranch(signalActions, [], [], actions, false);
    return { actions, branches };
  }

  /**
   * Transform tree branch
   * @param {Function} action
   * @param {Array}    args
   * @param {Array|Function}    args.parentAction
   * @param {Array}    args.path
   * @param {Array}    args.actions
   * @param {Boolean}  args.isSync
   * @return {Object}
   * @private
   */
  static _transformBranch (action, ...args) {
    return Array.isArray(action) ?
      StateBase._transformAsyncBranch.apply(null, [action, ...args]) :
      StateBase._transformSyncBranch.apply(null, [action, ...args]);
  }

  /**
   * Transform action to async branch
   * @param {Function} action
   * @param {Array|Function} parentAction
   * @param {Array} path
   * @param {Array} actions
   * @param {Boolean} isSync
   * @returns {*}
   * @private
   */
  static _transformAsyncBranch (action, parentAction, path, actions, isSync) {
    action = action.slice();
    isSync = !isSync;
    return action
      .map((subAction, index) => {
        path.push(index);
        var result = StateBase._transformBranch(subAction, action, path, actions, isSync);
        path.pop();
        return result;
      })
      .filter(action => !!action);
  }

  /**
   * Transform action to sync branch
   * @param {Function} action
   * @param {Array|Function} parentAction
   * @param {Array} path
   * @param {Array} actions
   * @param {Boolean} isSync
   * @returns {{
   *    name: *, args: {}, output: null, duration: number,
   *    mutations: Array, isAsync: boolean, outputPath: null,
   *    isExecuting: boolean, hasExecuted: boolean,
   *    path: *, outputs: null, actionIndex: number
   *  }|undefined}
   * @private
   */
  static _transformSyncBranch (action, parentAction, path, actions, isSync) {
    if (typeof action !== 'function') {
      return;
    }

    var branch = {
      name: stateHelper.getFunctionName(action),
      args: {},
      output: null,
      duration: 0,
      mutations: [],
      isAsync: !isSync,
      outputPath: null,
      isExecuting: false,
      hasExecuted: false,
      path: path.slice(),
      outputs: null,
      actionIndex: actions.indexOf(action) === -1 ? actions.push(action) - 1 : actions.indexOf(action)
    };

    var nextAction = parentAction[parentAction.indexOf(action) + 1];
    if (!Array.isArray(nextAction) && typeof nextAction === 'object') {
      parentAction.splice(parentAction.indexOf(nextAction), 1);

      branch.outputs = Object.keys(nextAction)
        .reduce((paths, key) => {
          path = path.concat('outputs', key);
          paths[key] = StateBase._transformBranch(nextAction[key], parentAction, path, actions, false);
          path.pop();
          path.pop();
          return paths;
        }, {});
    }

    return branch;
  }

  /**
   * Analyze actions for errors
   * @param {String} signalName
   * @param {Array} actions
   * @private
   */
  static _analyze (signalName, actions) {
    actions.forEach((action, index) => {
      if (typeof action === 'undefined' || typeof action === 'string') {
        throw new Error(
          `
            State: Action number "${index}" in signal "${signalName}" does not exist.
            Check that you have spelled it correctly!
          `
        );
      }

      if (Array.isArray(action)) {
        StateBase._analyze(signalName, action);
      }
    });
  }

  /**
   * Check arguments
   * @param {*} args
   * @param {String} name
   * @private
   */
  static _checkArgs (args, name) {
    try {
      JSON.stringify(args);
    } catch (e) {
      throw new Error(`State - Could not serialize arguments to signal. Please check signal ${name}`);
    }
  }
}

module.exports = StateBase;
