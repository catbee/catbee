var stateHelper = require('./helpers/stateHelper');

class SignalFactory {
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
      return new Promise((fulfill, reject) => {
        SignalFactory._checkArgs(args, name);
        var branches = this._staticTree(chain);

        var signal = {
          name, input, branches,
          isExecuting: true,
          duration: 0
        };

        var now = Date.now();
        this._runBranch(signal, branches, 0, now);
        fulfill();
      });
    }
  }

  _runBranch (signal, branches, index, start) {
    var currentBranch = branches[index];

    if (!currentBranch && branches === signal.branches) {
      if (branches[index - 1]) {
        branches[index - 1].duration = Date.now() - start;
      }

      signal.isExecuting = false;
      return;
    }

    if (!currentBranch) {
      return;
    }

    Array.isArray(currentBranch) ?
      this._runAsyncBranch(branches, currentBranch, signal.input) :
      this._runSyncBranch(branches, currentBranch, signal.input);
  }

  _runAsyncBranch (branches, currentBranch, signalInput) {
    var promises = currentBranch
      .map(action => {
        var actionFunc = actions[action.actionIndex];
        var input = actionFunc.defaultInput ? utils.merge({}, actionFunc.defaultInput, signalInput) : signalInput;
        var actionArgs = this._createActionArgs.async(action, input);

        action.isExecuting = true;
        action.input = stateHelper.merge({}, input);

        var next = this._createNext.async(actionFunc);
        actionFunc.apply(null, actionArgs.concat(next.fn));

        return next.promise
          .then(result => {
            action.hasExecuted = true;
            action.isExecuting = false;
            action.output = result.arg;
            stateHelper.merge(input, result.arg);

            if (result.path) {
              return this._runBranch(action.outputs[result.path], 0, Date.now());
            }
          });
      });

    return Promise.all(promises)
      .then(() => {
        return this._runBranch(branches, index + 1, Date.now());
      })
      .catch(() => {

      });
  }

  _runSyncBranch (currentBranch, input) {
    try {

    } catch (e) {

    }
  }

  _createActionArgs () {

  }

  _createNext () {

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
   * @param action
   * @param parentAction
   * @param path
   * @param actions
   * @param isSync
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
   * @param action
   * @param parentAction
   * @param path
   * @param actions
   * @param isSync
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
