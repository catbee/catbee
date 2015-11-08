var requireHelper = require('../helpers/requireHelper');

class WatcherLoader {
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
    this._watcherFinder = $serviceLocator.resolve('watcherFinder');
  }

  /**
   * Current release flag.
   * @type {boolean}
   * @private
   */
  _isRelease = false;

  /**
   * Current map of loaded watchers by names.
   * @type {Object}
   * @private
   */
  _loadedWatchers = null;

  /**
   * Current watcher finder.
   * @type {WatcherFinder}
   * @private
   */
  _watcherFinder = null;

  /**
   * Loads all watchers into a memory.
   * @returns {Promise<Object>} Promise for map of loaded stores.
   */
  load () {
    if (this._loadedWatchers) {
      return Promise.resolve(this._loadedWatchers);
    }

    var result = Object.create(null);

    return this._watcherFinder.find()
      .then(details => {
        var watcherPromises = Object
          .keys(details)
          .map(name => this._getWatcher(details[name]));

        return Promise.all(watcherPromises);
      })
      .then(watchers => {
        watchers.forEach(watcher => {
          if (!watcher || typeof watcher !== 'object') {
            return;
          }

          result[watcher.name] = watcher;
        });

        this._loadedWatchers = result;
        this._watcherFinder.watch();

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
   * Get watcher object by found details
   * @param {Object} watcherDetails
   * @param {String} watcherDetails.name
   * @param {String} watcherDetails.path
   * @return {Promise<Object>}
   * @private
   */
  _getWatcher ({ name, path }) {
    var definition;

    try {
      definition = require(requireHelper.getAbsoluteRequirePath(path));
    } catch (e) {
      return Promise.resolve(null);
    }

    if (typeof definition === 'function' || typeof definition === 'object') {
      return Promise.resolve({ name, definition });
    } else {
      return Promise.resolve(null);
    }
  }
}

module.exports = WatcherLoader;
