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

var SIGNALS_DEFAULT_FOLDER = 'signals';
var SIGNALS_DEFAULT_GLOB = '**/*.js';
var ACTIONS_DEFAULT_FOLDER = 'actions';
var ACTIONS_DEFAULT_GLOB = '**/*.js';

var SignalFinder = (function (_EventEmitter) {
  _inherits(SignalFinder, _EventEmitter);

  /**
   * Load and watch for signals and actions in folders
   * Emit events when signal or action is reloaded
   */

  function SignalFinder($eventBus) {
    _classCallCheck(this, SignalFinder);

    _get(Object.getPrototypeOf(SignalFinder.prototype), 'constructor', this).call(this);

    this._eventBus = null;
    this._fileWatcher = null;
    this._signalsFolder = null;
    this._actionsFolder = null;
    this._signalsGlobExpression = null;
    this._actionsGlobExpression = null;
    this._foundSignalFiles = null;
    this._eventBus = $eventBus;

    this._signalsFolder = SIGNALS_DEFAULT_FOLDER;
    this._signalsGlobExpression = path.join(this._signalsFolder, SIGNALS_DEFAULT_GLOB);
    this._signalsGlobExpression = requireHelper.getValidPath(this._signalsGlobExpression);

    this._actionsFolder = ACTIONS_DEFAULT_FOLDER;
    this._actionsGlobExpression = path.join(this._actionsFolder, ACTIONS_DEFAULT_GLOB);
    this._actionsGlobExpression = requireHelper.getValidPath(this._actionsGlobExpression);
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */

  _createClass(SignalFinder, [{
    key: 'find',

    /**
     * Finds all paths to signals and actions.
     * @returns {Promise<Object>}
     */
    value: function find() {
      var _this = this;

      if (this._foundSignalFiles) {
        return _Promise.resolve(this._foundSignalFiles);
      }

      this._foundSignalFiles = _Object$create(null);

      return this.findSignalFiles().then(function () {
        return _this._foundSignalFiles;
      });
    }

    /**
     * Find all paths to signals
     * @returns {Promise}
     */
  }, {
    key: 'findSignalFiles',
    value: function findSignalFiles() {
      var _this2 = this;

      return new _Promise(function (resolve, reject) {
        var signalsFilesGlob = new glob.Glob(_this2._signalsGlobExpression, GLOB_SETTINGS);

        signalsFilesGlob.on('match', function (match) {
          var signalFileDescriptor = _this2._createSignalFileDescriptor(match);
          _this2._foundSignalFiles[signalFileDescriptor.name] = signalFileDescriptor;
          _this2._eventBus.emit('signalFileFound', signalFileDescriptor);
        }).on('error', function (e) {
          return reject(e);
        }).on('end', function () {
          return resolve();
        });
      });
    }

    /**
     * Watches signals and actions for changing.
     */
  }, {
    key: 'watch',
    value: function watch() {
      if (this._fileWatcher) {
        return;
      }

      var reload = this._reload.bind(this);

      this._fileWatcher = chokidar.watch([this._signalsFolder, this._actionsFolder], CHOKIDAR_OPTIONS).on('add', reload).on('change', reload).on('unlink', reload);
    }

    /**
     * Creates found signal descriptor.
     * @param {string} filename Signal filename.
     * @returns {{name: string, path: string}} Found signal descriptor.
     * @private
     */
  }, {
    key: '_createSignalFileDescriptor',
    value: function _createSignalFileDescriptor(filename) {
      var relative = path.relative(this._signalsFolder, filename);
      var basename = path.basename(relative, '.js');
      var directory = path.dirname(relative);
      var name = directory !== '.' ? path.dirname(relative) + '/' + basename : basename;

      return {
        name: name.replace(/\\/g, '/'),
        path: path.relative(process.cwd(), filename)
      };
    }

    /**
     * Reload all signals and actions
     * @private
     */
  }, {
    key: '_reload',
    value: function _reload() {
      var _this3 = this;

      this._foundSignalFiles = null;

      return _Promise.all([this._reloadByGlob(this._signalsGlobExpression), this._reloadByGlob(this._actionsGlobExpression)]).then(function () {
        return _this3.emit('reload');
      });
    }

    /**
     * Reload all entities by glob expression
     * @param {String} globExpression
     * @returns {Promise}
     * @private
     */
  }, {
    key: '_reloadByGlob',
    value: function _reloadByGlob(globExpression) {
      return new _Promise(function (fulfill, reject) {
        var filesGlob = new glob.Glob(globExpression, GLOB_SETTINGS);

        filesGlob.on('match', function (match) {
          return requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(match));
        }).on('error', reject).on('end', fulfill);
      });
    }
  }]);

  return SignalFinder;
})(EventEmitter);

module.exports = SignalFinder;

/**
 * Current file watcher.
 * @type {Object}
 * @private
 */

/**
 * Signals folder
 * @type {String}
 * @private
 */

/**
 * Actions folder
 * @type {String}
 * @private
 */

/**
 * Signals glob
 * @type {String}
 * @private
 */

/**
 * Actions glob
 * @type {String}
 * @private
 */

/**
 * Current set of last found signals.
 * @type {Object}
 * @private
 */