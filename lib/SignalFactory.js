class SignalFactory {
  constructor () {

  }

  /**
   * Create signal instance ready for multiple runs
   * @param {Object} signalDefinition
   * @param {String} signalDefinition.name
   * @param {Array} signalDefinition.chain
   * @return {Function} signal function
   */
  create ({ name, chain }) {
    return function signal (args) {
      this._analyze(name, chain);

      // Run signal, and send results when it end
      return new Promise((fulfill, reject) => {

      });
    }
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
}

module.exports = SignalFactory;
