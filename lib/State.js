var StateBase = require('./base/StateBase');

class State extends StateBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
  }

  /**
   * Set initial application state
   * @param {Object} URLState
   * @param {String} URLState.signal
   * @param {Object} URLState.args
   * @return {Promise}
   */
  setInitialState ({ signal, args }) {
    return this.runSignal(signal, args);
  }
}

module.exports = State;
