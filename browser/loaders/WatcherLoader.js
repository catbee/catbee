class WatcherLoader {
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Current map of loaded components by names.
   * @type {Object} Map of components by names.
   * @private
   */
  _loadedWatchers = null;

  /**
   * Loads components when it is in a browser.
   * @returns {Promise} Promise for nothing.
   */
  load () {
    if (this._loadedWatchers) {
      return Promise.resolve(this._loadedWatchers);
    }

    var result = Object.create(null);

    return Promise.resolve()
      .then(() => {
        var watchers = this._serviceLocator.resolveAll('watcher');
        var watcherPromises = [];

        watchers.forEach(watcher => watcherPromises.unshift(this._getWatcher(watcher)));
        return Promise.all(watcherPromises);
      })
      .then(watchers => {
        watchers.forEach(watcher => {
          if (!watcher || typeof (watcher) !== 'object') {
            return;
          }

          result[watcher.name] = watcher.definition;
        });

        this._loadedWatchers = result;
        this._eventBus.emit('allWatchersLoaded', result);
        return this._loadedWatchers;
      });
  }

  /**
   * Gets current map of watchers by names.
   * @returns {Object} Map of stores by names.
   */
  getWatchersByNames () {
    return this._loadedWatchers || Object.create(null);
  }

  /**
   * Get valid watchers
   * @param {String} name
   * @param {Object} definition
   * @return {Promise}
   * @private
   */
  _getWatcher ({ name, definition }) {
    if (typeof definition === 'function' || typeof definition === 'object') {
      var watcher = { name, definition };
      this._eventBus.emit('watcherLoaded', watcher);
      return Promise.resolve(watcher);
    }

    return Promise.resolve(null);
  }
}

module.exports = WatcherLoader;
