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

    this._loadedWatchers = Object.create(null);

    return Promise.resolve()
      .then(() => {
        var watchers = this._serviceLocator.resolveAll('watcher');
        var watcherPromises = [];

        watchers.forEach(watcher => watcherPromises.unshift(this._processWatcher(watcher)));
        return Promise.all(watcherPromises);
      })
      .then(watchers => {
        watchers.forEach(watcher => {
          if (!watcher || typeof (watcher) !== 'object') {
            return;
          }

          this._loadedWatchers[watcher.name] = watcher;
        });

        this._eventBus.emit('allWatchersLoaded', watchers);
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
   * Process watchers
   * @param {String} name
   * @param {Object} definition
   * @private
   */
  _processWatcher ({ name, definition }) {
    if (typeof definition === 'function' || typeof definition === 'object') {
      return Promise.resolve({ name, definition });
    } else {
      return Promise.resolve(null);
    }
  }
}

module.exports = WatcherLoader;
