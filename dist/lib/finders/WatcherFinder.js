'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var path = require('path');
var events = require('events');
var EventEmitter = events.EventEmitter;
var glob = require('glob');
var requireHelper = require('../helpers/requireHelper');
var chokidar = require('chokidar');
var util = require('util');

var CHOKIDAR_OPTIONS = {
  ignoreInitial: true,
  cwd: process.cwd(),
  ignorePermissionErrors: true
};

var GLOB_SETTINGS = {
  nosort: true,
  silent: true,
  nodir: true
};

var WATCHERS_DEFAULT_FOLDER = 'watchers';
var WATCHERS_DEFAULT_GLOB = '**/*.js';

var WatcherFinder = (function (_EventEmitter) {
  _inherits(WatcherFinder, _EventEmitter);

  function WatcherFinder($eventBus) {
    _classCallCheck(this, WatcherFinder);

    _get(Object.getPrototypeOf(WatcherFinder.prototype), 'constructor', this).call(this);

    this._eventBus = null;
    this._fileWatcher = null;
    this._watchersFolder = null;
    this._watchersGlobExpression = null;
    this._foundWatchers = null;
    this._eventBus = $eventBus;

    this._watchersFolder = WATCHERS_DEFAULT_FOLDER;
    this._watchersGlobExpression = path.join(this._watchersFolder, WATCHERS_DEFAULT_GLOB);
    this._watchersGlobExpression = requireHelper.getValidPath(this._watchersGlobExpression);
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */

  _createClass(WatcherFinder, [{
    key: 'find',

    /**
     * Finds all paths to Watchers
     * @returns {Promise<Object>} Promise for set of found watchers by names.
     */
    value: function find() {
      var _this = this;

      if (this._foundWatchers) {
        return _Promise.resolve(this._foundWatchers);
      }

      this._foundWatchers = _Object$create(null);

      return new _Promise(function (resolve, reject) {
        var watcherFilesGlob = new glob.Glob(_this._watchersGlobExpression, GLOB_SETTINGS);

        watcherFilesGlob.on('match', function (match) {
          var watcherDescriptor = _this._createWatcherDescriptor(match);
          _this._foundWatchers[watcherDescriptor.name] = watcherDescriptor;
          _this._eventBus.emit('watcherFound', watcherDescriptor);
        }).on('error', reject).on('end', resolve);
      }).then(function () {
        return _this._foundWatchers;
      })['catch'](function (error) {
        return _this.emit('error', error);
      });
    }

    /**
     * Watches components for changing.
     */
  }, {
    key: 'watch',
    value: function watch() {
      var _this2 = this;

      if (this._fileWatcher) {
        return;
      }

      this._fileWatcher = chokidar.watch(this._watchersGlobExpression, CHOKIDAR_OPTIONS).on('error', function (error) {
        _this2.emit('error', error);
      }).on('add', function (filename) {
        var watcher = _this2._createWatcherDescriptor(filename);
        _this2._foundWatchers[watcher.name] = watcher;
        _this2.emit('add', watcher);
      }).on('change', function (filename) {
        var watcher = _this2._createWatcherDescriptor(filename);
        delete _this2._foundWatchers[watcher.name];
        _this2._foundWatchers[watcher.name] = watcher;
        _this2.emit('change', watcher);
      }).on('unlink', function (filename) {
        var watcher = _this2._createWatcherDescriptor(filename);
        delete _this2._foundWatchers[watcher.name];
        _this2.emit('unlink', watcher);
      });
    }

    /**
     * Creates found watcher descriptor
     * @param {string} filename Store filename.
     * @returns {{name: string, path: string}} Found store descriptor.
     * @private
     */
  }, {
    key: '_createWatcherDescriptor',
    value: function _createWatcherDescriptor(filename) {
      var relative = path.relative(this._watchersFolder, filename);
      var basename = path.basename(relative, '.js');
      var directory = path.dirname(relative);
      var name = directory !== '.' ? path.dirname(relative) + '/' + basename : basename;

      return {
        name: name.replace(/\\/g, '/'), // normalize name for Windows
        path: path.relative(process.cwd(), filename)
      };
    }
  }]);

  return WatcherFinder;
})(EventEmitter);

module.exports = WatcherFinder;

/**
 * Current file watcher.
 * @type {Object}
 * @private
 */

/**
 * Watchers folder
 * @type {String}
 * @private
 */

/**
 * Watchers glob expression
 * @type {null}
 * @private
 */

/**
 * Current set of paths to watchers
 * @type {Object}
 * @private
 */