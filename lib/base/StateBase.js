var Baobab = require('baobab');

class StateBase {
  constructor () {
    this._tree = new Baobab();
  }

  /**
   * Baobab tree reference
   * @type {Baobab}
   * @private
   */
  _tree = null;
}

module.exports = StateBase;
