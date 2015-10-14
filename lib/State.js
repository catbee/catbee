var StateBase = require('./base/StateBase');

class State extends StateBase {
  constructor () {
    super();
  }

  /**
   * Set initial application state
   * @param {Object} routingContext
   * @param {Object} URLState
   * @return {State}
   */
  setInitialState (routingContext, URLState) {
    return this;
  }

  runSignal () {

  }

  /**
   * Get state mutators and accessors
   * Each mutation will save in action descriptor
   * @param {Function} action
   * @param {Boolean} isAsync
   * @return {Object}
   */
  getStateMutatorsAndAccessors (action, isAsync) {
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

    var state = Object.create(null);
    methods.reduce((state, methodName) => {
      var method = this._tree[methodName].bind(this._tree);

      if (!method) {
        return state;
      }

      state[methodName] = (...args) => {
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

      return state;
    }, state);

    return state;
  }
}

module.exports = State;
