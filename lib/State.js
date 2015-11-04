var StateBase = require('./base/StateBase');

class State extends StateBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
  }

  /**
   * Set initial application state
   * @param {Object} URLState
   * @return {Promise}
   */
  setInitialState (URLState) {
    return this.runSignal(URLState.signal, URLState.args);
  }
}

module.exports = State;
