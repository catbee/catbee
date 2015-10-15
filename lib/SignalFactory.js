var stateHelper = require('./helpers/stateHelper');

class SignalFactory {
  constructor ($serviceLocator) {
    this._state = $serviceLocator.resolve('state');
  }

  /**
   * State reference
   * @type {State}
   * @private
   */
  _state = null;

  /**
   * Create signal instance ready for multiple runs
   * @param {String} name
   * @param {Array} chain
   * @return {Function} signal function
   */
  create (name, chain) {
    this._analyze(name, chain);
    return (input) => {
      // Run signal, and send results when it end
      return new Promise((resolve, reject) => {
        SignalFactory._checkArgs(input, name);
        var tree = this._staticTree(chain);

        var signal = {
          name, input,
          branches: tree.branches,
          isExecuting: true,
          duration: 0
        };

        var start = Date.now();
        var promise = { resolve, reject };

        this._runBranch(0, { signal, tree, start, input, promise });
      });
    }
  }

  /**
   * Run tree branch
   * @param index
   * @param options
   * @private
   */
  _runBranch (index, options) {
    var currentBranch = options.tree.branches[index];

    if (!currentBranch && options.tree.branches === options.signal.branches) {
      if (options.tree.branches[index - 1]) {
        options.tree.branches[index - 1].duration = Date.now() - options.start;
      }

      options.signal.isExecuting = false;

      if (options.promise) {
        options.promise.resolve(options.signal);
      }
      return;
    }

    if (!currentBranch) {
      return;
    }

    Array.isArray(currentBranch) ?
      this._runAsyncBranch(index, currentBranch, options) :
      this._runSyncBranch(index, currentBranch, options);
  }

  /**
   * Run async branch
   * @param index
   * @param currentBranch
   * @param options
   * @returns {*}
   * @private
   */
  _runAsyncBranch (index, currentBranch, options) {
    var promises = currentBranch
      .map(action => {
        var actionFunc = options.tree.actions[action.actionIndex];
        var actionArgs = this._createActionArgs(options.input, action, true);

        action.isExecuting = true;
        action.input = stateHelper.merge({}, options.input);

        var next = this._createNextAsyncAction(actionFunc, options.signal.name);
        actionFunc.apply(null, actionArgs.concat(next.fn));

        return next.promise
          .then(result => {
            action.hasExecuted = true;
            action.isExecuting = false;
            action.output = result.arg;
            stateHelper.merge(options.input, result.arg);

            console.log(action.outputs);

            var nextBranchOptions = {
              signal: options.signal,
              tree: options.tree,
              start: options.start,
              input: options.input,
              promise: options.promise
            };

            if (result.path) {
              return this._runBranch(0, nextBranchOptions);
            }
          });
      });

    return Promise.all(promises)
      .then(() => {
        return this._runBranch(options.branches, index + 1, Date.now(), options.promise);
      })
      .catch(() => {

      });
  }

  /**
   * Run sync branch
   * @param index
   * @param currentBranch
   * @param options
   * @returns {*}
   * @private
   */
  _runSyncBranch (index, currentBranch, options) {
    try {
      var action = currentBranch;
      var actionFunc = options.tree.actions[action.actionIndex];
      var actionArgs = this._createActionArgs(options.input, action, false);

      action.mutations = [];
      action.input = stateHelper.merge({}, options.input);

      var next = this._createNextSyncAction(actionFunc, options.signal.name);
      actionFunc.apply(null, actionArgs.concat(next));

      let result = next._result || {};
      stateHelper.merge(options.input, result.arg);

      action.isExecuting = false;
      action.hasExecuted = true;
      action.output = result.arg;

      return this._runBranch(index + 1, options);
    } catch (e) {
      console.log(e.stack);
    }
  }

  /**
   * Create action arguments
   * @param {*} input
   * @param {Object} action
   * @param {Boolean} isAsync
   * @returns {Array}
   * @private
   */
  _createActionArgs (input, action, isAsync) {
    var getStateMutatorsAndAccessors = this._state.getStateMutatorsAndAccessors.bind(this._state);
    var state = getStateMutatorsAndAccessors(action, isAsync);
    return [ input, state ];
  }

  /**
   * Create next sync action
   * @param {*} input
   * @param {Function} action
   * @param {Boolean} isSync
   * @returns {Function}
   * @private
   */
  _createNextSyncAction (actionFunc, signalName) {
    var next = this._createNextFunction(actionFunc, signalName);
    next = this._addOutputs(actionFunc, next);

    return next;
  }

  /**
   * Create next sync action
   * @param {Function} action
   * @param {String} signalName
   * @returns {{}}
   * @private
   */
  _createNextAsyncAction (actionFunc, signalName) {
    var resolver = null;
    var promise = new Promise((resolve) => resolver = resolve);
    var fn = this._createNextFunction(actionFunc, signalName, resolver);
    this._addOutputs(actionFunc, fn);

    return { fn, promise };
  }

  /**
   * Create next function
   * @param {Function} action
   * @param {String} signalName
   * @param {Function} [resolver]
   * @returns {Function}
   * @private
   */
  _createNextFunction (action, signalName, resolver) {
    return function next (...args) {
      var path = typeof args[0] === 'string' ? args[0] : null;
      var arg = path ? args[1] : args[0];

      if (next.hasRun) {
        throw new Error(`
          State - You are running an async output on a synchronous action in ${signalName}.
          The action is ${action.name}. Either put it in an array or make sure the output is synchronous.
        `);
      }

      if (!path && !action.defaultOutput && action.outputs) {
        throw new Error(
          `
            Cerebral: There is a wrong output of action "${stateHelper.getFunctionName(action)}"
            in signal "${signalName}". Set defaultOutput or use one of outputs
            ${JSON.stringify(Object.keys(action.output || action.outputs))}
          `
        );
      }

      var result = {
        path: path ? path : action.defaultOutput,
        arg: arg
      };

      if (resolver) {
        resolver(result);
      } else {
        next._result = result;
      }
    }
  }

  /**
   * Add output paths
   * @param {Function} action
   * @param {Function} next
   * @returns {*}
   * @private
   */
  _addOutputs (action, next) {
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
   * Transform signal actions to static tree
   * @param signalActions
   * @returns {{ actions: [], branches: [] }}
   * @private
   */
  _staticTree (signalActions) {
    var actions = [];
    var branches = this._transformBranch(signalActions, [], [], actions, false);
    return { actions, branches };
  }

  /**
   * Transform tree branch
   * @param action
   * @param parentAction
   * @param path
   * @param actions
   * @param isSync
   * @private
   */
  _transformBranch (action, parentAction, path, actions, isSync) {
    return Array.isArray(action) ?
      this._transformAsyncBranch(action, parentAction, path, actions, isSync) :
      this._transformSyncBranch(action, parentAction, path, actions, isSync);
  }

  /**
   * Transform action to async branch
   * @param {Function} action
   * @param {Array} parentAction
   * @param {Array} path
   * @param {Array} actions
   * @param {Boolean} isSync
   * @returns {*}
   * @private
   */
  _transformAsyncBranch (action, parentAction, path, actions, isSync) {
    action = action.slice();
    isSync = !isSync;
    return action
      .map((subAction, index) => {
        path.push(index);
        var result = this._transformBranch(subAction, action, path, actions, isSync);
        path.pop();
        return result;
      })
      .filter(action => !!action);
  }

  /**
   * Transform action to sync branch
   * @param {Function} action
   * @param {Array} parentAction
   * @param {Array} path
   * @param {Array} actions
   * @param {Boolean} isSync
   * @returns {{
   *    name: *, input: {}, output: null, duration: number,
   *    mutations: Array, isAsync: boolean, outputPath: null,
   *    isExecuting: boolean, hasExecuted: boolean,
   *    path: *, outputs: null, actionIndex: number
   *  }|undefined}
   * @private
   */
  _transformSyncBranch (action, parentAction, path, actions, isSync) {
    if (typeof action !== 'function') {
      return;
    }

    var branch = {
      name: stateHelper.getFunctionName(action),
      input: {},
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
          paths[key] = this._transformBranch(nextAction[key], parentAction, path, actions, false);
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
  _analyze (signalName, actions) {
    actions.forEach((action, index) => {
      if (typeof action === 'undefined') {
        throw new Error(
          `
            State: Action number "${index}" in signal "${signalName}" does not exist.
            Check that you have spelled it correctly!
          `
        );
      }

      if (Array.isArray(action)) {
        this._analyze(signalName, action);
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

module.exports = SignalFactory;
