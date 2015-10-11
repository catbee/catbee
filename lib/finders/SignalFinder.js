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
  constructor () {
    super();

    this._signalsFolder = SIGNALS_DEFAULT_FOLDER;
    this._signalsGlobExpression = path.join(this._signalsFolder, SIGNALS_DEFAULT_GLOB);
    this._signalsGlobExpression = requireHelper.getValidPath(this._signalsGlobExpression);

    this._actionsFolder = ACTIONS_DEFAULT_FOLDER;
    this._actionsGlobExpression = path.join(this._actionsFolder, ACTIONS_DEFAULT_GLOB);
    this._actionsGlobExpression = requireHelper.getValidPath(this._actionsGlobExpression);
  }

  /**
   * Current file watcher.
   * @type {FSWatcher}
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
  _foundSignals = null;

  /**
   * Current set of last found actions.
   * @type {Object}
   * @private
   */
  _foundActions = null;

  /**
   * Finds all paths to signals and actions.
   * @returns {Promise<Object>}
   */
  find () {
    if (this._foundSignals) {
      return Promise.resolve(this._foundSignals);
    }

    this._foundSignals = Object.create(null);
    this._foundActions = Object.create(null);

    return Promise.all([
      this.findActions(),
      this.findSignals()
    ]).then(() => this._foundSignals);
  }

  /**
   * Find all paths to actions
   * @returns {Promise}
   */
  findActions () {
    return new Promise((fulfill, reject) => {
      var actionsFilesGlob = new glob.Glob(this._actionsGlobExpression, GLOB_SETTINGS);

      actionsFilesGlob
        .on('match', match => {
          var actionDescriptor = this._createActionDescriptor(match);
          this._foundActions[actionDescriptor.name] = actionDescriptor;
        })
        .on('error', () => {
          reject();
        })
        .on('end', () => {
          fulfill();
        });
    });
  }

  /**
   * Find all paths to singals
   * @returns {Promise}
   */
  findSignals () {
    return new Promise((fulfill, reject) => {
      var signalsFilesGlob = new glob.Glob(this._signalsGlobExpression, GLOB_SETTINGS);

      signalsFilesGlob
        .on('match', match => {
          var signalDescriptor = this._createSignalDescriptor(match);
          this._foundSignals[signalDescriptor.name] = signalDescriptor;
        })
        .on('error', () => {
          reject();
        })
        .on('end', () => {
          fulfill();
        });
    });
  }

  /**
   * Watches signals and actions for changing.
   */
  watch () {
    // need to implement
  }

  /**
   * Creates found signal descriptor.
   * @param {string} filename Signal filename.
   * @returns {{name: string, path: string}} Found signal descriptor.
   * @private
   */
  _createSignalDescriptor (filename) {
    var relative = path.relative(this._signalsFolder, filename);
    var basename = path.basename(relative, '.js');
    var directory = path.dirname(relative);
    var signalName = directory !== '.' ? path.dirname(relative) + '/' + basename : basename;

    return {
      name: signalName,
      path: path.relative(process.cwd(), filename)
    };
  }

  /**
   * Creates found signal descriptor.
   * @param {string} filename Signal filename.
   * @returns {{name: string, path: string}} Found signal descriptor.
   * @private
   */
  _createActionDescriptor (filename) {
    var relative = path.relative(this._actionsFolder, filename);
    var basename = path.basename(relative, '.js');
    var directory = path.dirname(relative);
    var actionName = directory !== '.' ? path.dirname(relative) + '/' + basename : basename;

    return {
      name: actionName,
      path: path.relative(process.cwd(), filename)
    };
  }
}

module.exports = SignalFinder;
