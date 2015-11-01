var StateBase = require('./base/StateBase');

class State extends StateBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
  }

  /**
   * Set initial application state
   * @param {Object} routingContext
   * @param {Object} URLState
   * @return {Promise}
   */
  setInitialState (routingContext, URLState) {
    var signal = URLState._signal;
    return this.runSignal(signal);
  }
}

module.exports = State;
