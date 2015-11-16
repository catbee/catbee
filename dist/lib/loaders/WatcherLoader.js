'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var requireHelper = require('../helpers/requireHelper');
var util = require('util');
var path = require('path');

var INFO_WATCHING_FILES = 'Watching watchers for changes';
var INFO_WATCHER_CHANGED = 'Watcher "%s" has been changed, reinitializing...';
var INFO_WATCHER_ADDED = 'Watcher "%s" has been added, initializing...';
var INFO_WATCHER_UNLINKED = 'Watcher "%s" has been unlinked, removing...';

var WatcherLoader = (function () {
  function WatcherLoader($serviceLocator, isRelease) {
    _classCallCheck(this, WatcherLoader);

    this._isRelease = false;
    this._logger = null;
    this._eventBus = null;
    this._loadedWatchers = null;
    this._watcherFinder = null;

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

  _createClass(WatcherLoader, [{
    key: 'load',

    /**
     * Loads all watchers into a memory.
     * @returns {Promise<Object>} Promise for map of loaded stores.
     */
    value: function load() {
      var _this = this;

      if (this._loadedWatchers) {
        return _Promise.resolve(this._loadedWatchers);
      }

      var result = _Object$create(null);

      return this._watcherFinder.find().then(function (details) {
        var watcherPromises = _Object$keys(details).map(function (name) {
          return _this._getWatcher(details[name]);
        });

        return _Promise.all(watcherPromises);
      }).then(function (watchers) {
        watchers.forEach(function (watcher) {
          if (!watcher || typeof watcher !== 'object') {
            return;
          }

          result[watcher.name] = watcher.definition;
        });

        _this._loadedWatchers = result;

        if (!_this._isRelease) {
          _this._logger.info(INFO_WATCHING_FILES);
          _this._watcherFinder.watch();
          _this._handleChanges();
        }

        return _this._loadedWatchers;
      });
    }

    /**
     * Gets current map of watchers by names.
     * @returns {Object} Map of stores by names.
     */
  }, {
    key: 'getWatchersByNames',
    value: function getWatchersByNames() {
      return this._loadedWatchers || _Object$create(null);
    }

    /**
     * Get watcher object by found details
     * @param {Object} watcherDetails
     * @param {String} watcherDetails.name
     * @param {String} watcherDetails.path
     * @return {Promise<Object>}
     * @private
     */
  }, {
    key: '_getWatcher',
    value: function _getWatcher(_ref) {
      var name = _ref.name;
      var path = _ref.path;

      var definition;

      try {
        definition = require(requireHelper.getAbsoluteRequirePath(path));
      } catch (e) {
        return _Promise.resolve(null);
      }

      if (typeof definition === 'function' || typeof definition === 'object') {
        var watcher = { name: name, definition: definition };
        this._eventBus.emit('watcherLoaded', watcher);
        return _Promise.resolve(watcher);
      } else {
        return _Promise.resolve(null);
      }
    }

    /**
     * Reload all signals and actions on every change
     * @private
     */
  }, {
    key: '_handleChanges',
    value: function _handleChanges() {
      var _this2 = this;

      var loadWatcher = function loadWatcher(watcherDetails) {
        return _this2._getWatcher(watcherDetails).then(function (watcher) {
          _this2._loadedWatchers[watcher.name] = watcher.definition;
        });
      };

      this._watcherFinder.on('add', function (watcherDetails) {
        _this2._logger.info(util.format(INFO_WATCHER_ADDED, watcherDetails.path));
        requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(watcherDetails.path));
        loadWatcher(watcherDetails);
      }).on('change', function (watcherDetails) {
        _this2._logger.info(util.format(INFO_WATCHER_CHANGED, watcherDetails.path));
        requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(watcherDetails.path));
        loadWatcher(watcherDetails);
      }).on('unlink', function (watcherDetails) {
        _this2._logger.info(util.format(INFO_WATCHER_UNLINKED, watcherDetails.path));
        requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(watcherDetails.path));
        delete _this2._loadedWatchers[watcherDetails.name];
      });
    }
  }]);

  return WatcherLoader;
})();

module.exports = WatcherLoader;

/**
 * Logger reference
 * @type {Logger}
 * @private
 */

/**
 * Event bus reference
 * @type {EventEmitter}
 * @private
 */

/**
 * Current map of loaded watchers by names.
 * @type {Object}
 * @private
 */

/**
 * Current watcher finder.
 * @type {WatcherFinder}
 * @private
 */