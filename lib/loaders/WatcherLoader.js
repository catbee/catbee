var requireHelper = require('../helpers/requireHelper');
var util = require('util');
var path = require('path');

const INFO_WATCHING_FILES = 'Watching watchers for changes';
const INFO_WATCHER_CHANGED = 'Watcher "%s" has been changed, reinitializing...';
const INFO_WATCHER_ADDED = 'Watcher "%s" has been added, initializing...';
const INFO_WATCHER_UNLINKED = 'Watcher "%s" has been unlinked, removing...';

class WatcherLoader {
  constructor ($serviceLocator, isRelease) {
    this._serviceLocator = $serviceLocator;
    this._watcherFinder = $serviceLocator.resolve('watcherFinder');
    this._logger = $serviceLocator.resolve('logger');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._isRelease = Boolean(isRelease);
  }

  /**
   * Current release flag.
   * @type {boolean}
   * @private
   */
  _isRelease = false;

  /**
   * Logger reference
   * @type {Logger}
   * @private
   */
  _logger = null;

  /**
   * Event bus reference
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

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
        var watcherPromises = Object.keys(details)
          .map(name => this._getWatcher(details[name]));

        return Promise.all(watcherPromises);
      })
      .then(watchers => {
        watchers.forEach(watcher => {
          if (!watcher || typeof watcher !== 'object') {
            return;
          }

          result[watcher.name] = watcher.definition;
        });

        this._loadedWatchers = result;

        if (!this._isRelease) {
          this._logger.info(INFO_WATCHING_FILES);
          this._watcherFinder.watch();
          this._handleChanges();
        }

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

  /**
   * Reload all signals and actions on every change
   * @private
   */
  _handleChanges () {
    var loadWatcher = (watcherDetails) => {
      return this._getWatcher(watcherDetails)
        .then(watcher => {
          this._loadedWatchers[watcher.name] = watcher.definition;
        });
    };

    this._watcherFinder
      .on('add', watcherDetails => {
        this._logger.info(util.format(
          INFO_WATCHER_ADDED, watcherDetails.path
        ));
        requireHelper.clearCacheKey(
          requireHelper.getAbsoluteRequirePath(watcherDetails.path)
        );
        loadWatcher(watcherDetails);
      })
      .on('change', watcherDetails => {
        this._logger.info(util.format(
          INFO_WATCHER_CHANGED, watcherDetails.path
        ));
        requireHelper.clearCacheKey(
          requireHelper.getAbsoluteRequirePath(watcherDetails.path)
        );
        loadWatcher(watcherDetails);
      })
      .on('unlink', watcherDetails => {
        this._logger.info(util.format(
          INFO_WATCHER_UNLINKED, watcherDetails.path
        ));
        requireHelper.clearCacheKey(
          requireHelper.getAbsoluteRequirePath(watcherDetails.path)
        );
        delete this._loadedWatchers[watcherDetails.name];
      });
  }
}

module.exports = WatcherLoader;
