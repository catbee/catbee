var requireHelper = require('../helpers/requireHelper');
var State = require('../State');

class SignalLoader {
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
    this._signalFinder = $serviceLocator.resolve('signalFinder');
    this._signalFactory = this._serviceLocator.resolveInstance(State);
  }

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
   * State instance reference. Used as signals factory.
   * @type {State}
   * @private
   */
  _signalFactory = null;

  /**
   * Is signal already loaded flag
   * @type {Boolean}
   * @private
   */
  _isLoad = false;

  /**
   * Load signals
   */
  load () {
    if (this._isLoad) {
      return Promise.resolve();
    }

    this._signalFinder.find()
      .then((signalFiles) => this._parseSignalFiles(signalFiles))
      .then(() => {
        this._isLoad = true;
      })
      .then(() => {
        this._signalFinder.watch();
        this._handleChanges();
      });
  }

  /**
   * Parse signals files, and get signals definitions from it.
   * @param {Object} signalFiles
   */
  _parseSignalFiles (signalFiles) {
    var signalPromises = Object.keys(signalFiles)
      .map(signalFileName => this._getSignalsFromFile(signalFiles[signalFileName]));

    return Promise.all(signalPromises);
  }

  /**
   * Require signals file, and save signals from it
   * @param {Object} signalFile
   * @private
   */
  _getSignalsFromFile (signalFile) {
    var file;

    try {
      file = require(requireHelper.getAbsoluteRequirePath(signalFile.path));
    } catch (e) {
      return Promise.resolve(null);
    }

    Object
      .keys(file)
      .forEach((name) => {
        var definition = file[name];
        var runner = this._signalFactory.createSignal(name, definition);
        this._serviceLocator.registerInstance('signalDefinitions', { runner, name });
      });
  }

  /**
   * Handle changes emitted by watcher
   * @private
   */
  _handleChanges () {
    this._signalFinder.once('reload', () => {
      this._serviceLocator.unregister('signalDefinitions');
      this._isLoad = false;
      this.load();
    });
  }
}

module.exports = SignalLoader;
