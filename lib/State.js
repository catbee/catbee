var StateBase = require('./base/StateBase');

class State extends StateBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
    this._watcherLoader = $serviceLocator.resolve('watcherLoader');
  }

  /**
   * Watcher loader reference
   * @type {WatcherLoader}
   * @private
   */
  _watcherLoader = null;

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
   * @param {String} watcherName
   * @param {Object} attributes
   * @param {String} attributes.args
   * @return {Cursor}
   */
  getWatcher (watcherName, { args = '' }) {
    var watchers = this._watcherLoader.getWatchersByNames();
    var watcher = watchers[watcherName];
    var definition;

    if (typeof watcher.definition === 'function') {
      definition = watcher.definition.apply(null, [args]);
    }

    definition = definition ? definition : watcher.definition;
    return this._tree.watch(definition);
  }
}

module.exports = State;
