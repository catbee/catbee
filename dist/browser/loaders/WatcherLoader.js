'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var WatcherLoader = (function () {
  function WatcherLoader($serviceLocator) {
    _classCallCheck(this, WatcherLoader);

    this._eventBus = null;
    this._serviceLocator = null;
    this._loadedWatchers = null;

    this._serviceLocator = $serviceLocator;
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */

  _createClass(WatcherLoader, [{
    key: 'load',

    /**
     * Loads components when it is in a browser.
     * @returns {Promise} Promise for nothing.
     */
    value: function load() {
      var _this = this;

      if (this._loadedWatchers) {
        return _Promise.resolve(this._loadedWatchers);
      }

      var result = _Object$create(null);

      return _Promise.resolve().then(function () {
        var watchers = _this._serviceLocator.resolveAll('watcher');
        var watcherPromises = [];

        watchers.forEach(function (watcher) {
          return watcherPromises.unshift(_this._getWatcher(watcher));
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
        _this._eventBus.emit('allWatchersLoaded', result);
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
     * Get valid watchers
     * @param {String} name
     * @param {Object} definition
     * @private
     */
  }, {
    key: '_getWatcher',
    value: function _getWatcher(_ref) {
      var name = _ref.name;
      var definition = _ref.definition;

      if (typeof definition === 'function' || typeof definition === 'object') {
        var watcher = { name: name, definition: definition };
        this._eventBus.emit('watcherLoaded', watcher);
        return _Promise.resolve(watcher);
      } else {
        return _Promise.resolve(null);
      }
    }
  }]);

  return WatcherLoader;
})();

module.exports = WatcherLoader;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */

/**
 * Current map of loaded components by names.
 * @type {Object} Map of components by names.
 * @private
 */