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
      var method = this._tree[methodName];

      if (!method) {
        return state;
      }

      state[methodName] = method.bind(this._tree);
      return state;
    }, state);

    return state;
  }
}

module.exports = State;
