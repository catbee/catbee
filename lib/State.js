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

  /**
   * Get watcher from tree
   * @param {Object} watcherDefinition
   * @return {Cursor}
   */
  getWatcher (watcherDefinition) {
    return this._tree.watch(watcherDefinition);
  }
}

module.exports = State;
