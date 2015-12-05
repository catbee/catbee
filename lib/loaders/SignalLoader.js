var requireHelper = require('../helpers/requireHelper');
var util = require('util');
var appstate = require('appstate');
var LoaderBase = require('../base/LoaderBase');

const INFO_WATCHING_FILES = 'Watching signals for changes';
const INFO_RELOAD_FILES = 'All actions and signals reloaded';
const WARN_DUPLICATE_SIGNAL_NAME = 'Signal name %s already register... Skipping...';

class SignalLoader extends LoaderBase {
  /**
   * Creates new instance of the component loader.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @param {boolean} isRelease Release mode flag.
   * @constructor
   * @extends LoaderBase
   */
  constructor ($serviceLocator, isRelease) {
    super($serviceLocator.resolveAll('signalTransform'));

    this._serviceLocator = $serviceLocator;
    this._logger = $serviceLocator.resolve('logger');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._signalFinder = $serviceLocator.resolve('signalFinder');
    this._isRelease = Boolean(isRelease);
  }

  /**
   * Current release flag.
   * @type {Boolean}
   * @private
   */
  _isRelease = false;

  /**
   * Current watching handler flag.
   * @type {Boolean}
   * @private
   */
  _isWatching = false;

  /**
   * Logger reference
   * @type {Logger}
   * @private
   */
  _logger = null;

  /**
   * Event Bus reference
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Current service locator
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Current signal finder
   * @type {SignalFinder}
   * @private
   */
  _signalFinder = null;

  /**
   * Current map of loaded signals by names.
   * @type {Object} Map of components by names.
   * @private
   */
  _loadedSignals = null;

  /**
   * Load signals
   * @returns {Promise}
   */
  load () {
    if (this._loadedSignals) {
      return Promise.resolve(this._loadedSignals);
    }

    var result = Object.create(null);

    this._signalFinder.find()
      .then(signalFiles => this._parseSignalFiles(signalFiles))
      .then(signalFileList => {
        signalFileList.forEach(signalList => {
          if (!Array.isArray(signalList)) {
            return;
          }

          signalList.forEach(signal => {
            if (!signal || typeof (signal) !== 'object') {
              return;
            }

            if (signal.name in result) {
              this._logger.warn(util.format(
                WARN_DUPLICATE_SIGNAL_NAME, signal.name
              ));

              return;
            }

            result[signal.name] = signal.fn;
          });
        });

        this._loadedSignals = result;
        this._eventBus.emit('allSignalsLoaded', result);
        return this._loadedSignals;
      })
      .then(() => {
        if (!this._isRelease && !this._isWatching) {
          this._logger.info(INFO_WATCHING_FILES);
          this._signalFinder.watch();
          this._handleChanges();
          this._isWatching = true;
        }
      });
  }

  /**
   * Return current signals hash map
   * @returns {Object}
   */
  getSignalsByNames () {
    return this._loadedSignals || Object.create(null);
  }

  /**
   * Parse signals files, and get signals definitions from it.
   * @param {Object} signalFiles
   * @returns {Promise}
   */
  _parseSignalFiles (signalFiles) {
    var signalPromises = Object.keys(signalFiles)
      .map(signalFileName => this._getSignalsFromFile(signalFiles[signalFileName]));

    return Promise.all(signalPromises);
  }

  /**
   * Require signals file, and save signals from it
   * @param {Object} signalFile
   * @returns {Promise}
   * @private
   */
  _getSignalsFromFile (signalFile) {
    var file;

    try {
      file = require(requireHelper.getAbsoluteRequirePath(signalFile.path));
    } catch (e) {
      this._eventBus.emit('error', e);
      return Promise.resolve();
    }

    var signalPromises = Object
      .keys(file)
      .map((name) => {
        var actions = file[name];
        return this._applyTransforms(actions)
          .then((transformedActions) => {
            try {
              var fn = appstate.create(name, transformedActions);
              var signal = { name, fn };

              this._eventBus.emit('signalLoaded', signal);
              return signal;
            } catch (e) {
              this._eventBus.emit('error', e);
            }
          });
      });

    return Promise.all(signalPromises);
  }

  /**
   * Reload all signals and actions on every change
   * @private
   */
  _handleChanges () {
    this._signalFinder.on('reload', () => {
      this._logger.info(INFO_RELOAD_FILES);
      this._loadedSignals = null;
      this.load();
    });
  }
}

module.exports = SignalLoader;
