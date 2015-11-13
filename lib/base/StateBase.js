var Baobab = require('baobab');

class StateBase {
  /**
   * Main class for control application state.
   * Use Baobab as main state storage and expose interface for state modification.
   * @constructor
   * @param {ServiceLocator} serviceLocator
   */
  constructor (serviceLocator) {
    this._tree = new Baobab();
    this._locator = serviceLocator;
    this._signalLoader = serviceLocator.resolve('signalLoader');
  }

  /**
   * Service locator reference
   * @type {ServiceLocator}
   * @private
   */
  _locator = null;

  /**
   * Signal Loader reference
   * @type {SignalLoader}
   * @private
   */
  _signalLoader = null;

  /**
   * Baobab tree reference
   * @type {Baobab}
   */
  _tree = null;

  /**
   * Find and run signal, after signal is resolved,
   * all result will pushed to history stack.
   * @param {String} name
   * @param {Object} [args={}]
   * @return {Promise}
   */
  runSignal (name, args = {}) {
    if (!name) {
      return Promise.resolve();
    }

    var signals = this._signalLoader.getSignalsByNames();
    var signal = signals[name];

    if (!signal) {
      return Promise.resolve();
    }

    return signal.fn.apply(null, [this._tree, args]);
  }

  /**
   * Get watcher from tree
   * @param {Object} definition
   * @return {Cursor}
   */
  getWatcher (definition) {
    return this._tree.watch(definition);
  }
}

module.exports = StateBase;
