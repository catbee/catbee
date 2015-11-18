var path = require('path');
var events = require('events');
var EventEmitter = events.EventEmitter;
var glob = require('glob');
var requireHelper = require('../helpers/requireHelper');
var chokidar = require('chokidar');
var util = require('util');

const CHOKIDAR_OPTIONS = {
  ignoreInitial: true,
  cwd: process.cwd(),
  ignorePermissionErrors: true
};

const GLOB_SETTINGS = {
  nosort: true,
  silent: true,
  nodir: true
};

const SIGNALS_DEFAULT_FOLDER = 'signals';
const SIGNALS_DEFAULT_GLOB = '**/*.js';
const ACTIONS_DEFAULT_FOLDER = 'actions';
const ACTIONS_DEFAULT_GLOB = '**/*.js';

class SignalFinder extends EventEmitter {
  /**
   * Load and watch for signals and actions in folders
   * Emit events when signal or action is reloaded
   */
  constructor ($eventBus) {
    super();

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
  _eventBus = null;

  /**
   * Current file watcher.
   * @type {Object}
   * @private
   */
  _fileWatcher = null;

  /**
   * Signals folder
   * @type {String}
   * @private
   */
  _signalsFolder = null;

  /**
   * Actions folder
   * @type {String}
   * @private
   */
  _actionsFolder = null;

  /**
   * Signals glob
   * @type {String}
   * @private
   */
  _signalsGlobExpression = null;

  /**
   * Actions glob
   * @type {String}
   * @private
   */
  _actionsGlobExpression = null;

  /**
   * Current set of last found signals.
   * @type {Object}
   * @private
   */
  _foundSignalFiles = null;

  /**
   * Finds all paths to signals and actions.
   * @returns {Promise<Object>}
   */
  find () {
    if (this._foundSignalFiles) {
      return Promise.resolve(this._foundSignalFiles);
    }

    this._foundSignalFiles = Object.create(null);

    return this.findSignalFiles()
      .then(() => this._foundSignalFiles);
  }

  /**
   * Find all paths to signals
   * @returns {Promise}
   */
  findSignalFiles () {
    return new Promise((resolve, reject) => {
      var signalsFilesGlob = new glob.Glob(this._signalsGlobExpression, GLOB_SETTINGS);

      signalsFilesGlob
        .on('match', match => {
          var signalFileDescriptor = this._createSignalFileDescriptor(match);
          this._foundSignalFiles[signalFileDescriptor.name] = signalFileDescriptor;
          this._eventBus.emit('signalFileFound', signalFileDescriptor);
        })
        .on('error', (e) => reject(e))
        .on('end', () => resolve());
    });
  }

  /**
   * Watches signals and actions for changing.
   */
  watch () {
    if (this._fileWatcher) {
      return;
    }

    var reload = this._reload.bind(this);

    this._fileWatcher = chokidar.watch([
      this._signalsFolder,
      this._actionsFolder
    ], CHOKIDAR_OPTIONS)
      .on('add', reload)
      .on('change', reload)
      .on('unlink', reload);
  }

  /**
   * Creates found signal descriptor.
   * @param {string} filename Signal filename.
   * @returns {{name: string, path: string}} Found signal descriptor.
   * @private
   */
  _createSignalFileDescriptor (filename) {
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
  _reload () {
    this._foundSignalFiles = null;

    return Promise.all([
      this._reloadByGlob(this._signalsGlobExpression),
      this._reloadByGlob(this._actionsGlobExpression)
    ])
    .then(() => this.emit('reload'));
  }

  /**
   * Reload all entities by glob expression
   * @param {String} globExpression
   * @returns {Promise}
   * @private
   */
  _reloadByGlob (globExpression) {
    return new Promise((fulfill, reject) => {
      var filesGlob = new glob.Glob(globExpression, GLOB_SETTINGS);

      filesGlob
        .on('match', match => requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(match)))
        .on('error', reject)
        .on('end', fulfill);
    });
  }
}

module.exports = SignalFinder;
