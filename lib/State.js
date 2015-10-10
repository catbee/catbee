var Baobab = require('baobab');

class State {
  constructor () {
    this._tree = new Baobab();
  }

  /**
   * Baobab tree reference
   * @type {Baobab}
   * @private
   */
  _tree = null;

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
