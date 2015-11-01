var StateBase = require('./base/StateBase');

class State extends StateBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
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
}

module.exports = State;
