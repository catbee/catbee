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

const WATCHERS_DEFAULT_FOLDER = 'watchers';
const WATCHERS_DEFAULT_GLOB = '**/*.js';

class WatcherFinder extends EventEmitter {
  constructor () {
    super();

    this._watchersFolder = WATCHERS_DEFAULT_FOLDER;
    this._watchersGlobExpression = path.join(this._watchersFolder, WATCHERS_DEFAULT_GLOB);
    this._watchersGlobExpression = requireHelper.getValidPath(this._watchersGlobExpression);
  }

  /**
   * Current file watcher.
   * @type {Object}
   * @private
   */
  _fileWatcher = null;

  /**
   * Watchers folder
   * @type {String}
   * @private
   */
  _watchersFolder = null;

  /**
   * Watchers glob expression
   * @type {null}
   * @private
   */
  _watchersGlobExpression = null;

  /**
   * Current set of paths to watchers
   * @type {Object}
   * @private
   */
  _foundWatchers = null;

  /**
   * Finds all paths to Watchers
   * @returns {Promise<Object>} Promise for set of found watchers by names.
   */
  find () {
    if (this._foundWatchers) {
      return Promise.resolve(this._foundWatchers);
    }

    this._foundWatchers = Object.create(null);

    return new Promise((resolve, reject) => {
      var watcherFilesGlob = new glob.Glob(this._watchersGlobExpression, GLOB_SETTINGS);

      watcherFilesGlob
        .on('match', match => {
          var watcherDescriptor = this._createWatcherDescriptor(match);
          this._foundWatchers[watcherDescriptor.name] = watcherDescriptor;
        })
        .on('error', reject)
        .on('end', resolve);
    })
    .then(() => this._foundWatchers)
    .catch(error => this.emit('error', error));
  }

  /**
   * Watches components for changing.
   */
  watch () {
    if (this._fileWatcher) {
      return;
    }

    this._fileWatcher = chokidar.watch(this._watchersGlobExpression, CHOKIDAR_OPTIONS)
      .on('error', error => {
        this.emit('error', error);
      })
      .on('add', filename => {
        var watcher = this._createWatcherDescriptor(filename);
        this._foundWatchers[watcher.name] = watcher;
        this.emit('add', watcher);
      })
      .on('change', filename => {
        var watcher = this._createWatcherDescriptor(filename);
        delete this._foundWatchers[watcher.name];
        this._foundWatchers[watcher.name] = watcher;
        this.emit('change', watcher);
      })
      .on('unlink', filename => {
        var watcher = this._createWatcherDescriptor(filename);
        delete this._foundWatchers[watcher.name];
        this.emit('unlink', watcher);
      });
  }

  /**
   * Creates found watcher descriptor
   * @param {string} filename Store filename.
   * @returns {{name: string, path: string}} Found store descriptor.
   * @private
   */
  _createWatcherDescriptor (filename) {
    var relative = path.relative(this._watchersFolder, filename);
    var basename = path.basename(relative, '.js');
    var directory = path.dirname(relative);
    var name = directory !== '.' ? path.dirname(relative) + '/' + basename : basename;

    return {
      name: name.replace(/\\/g, '/'), // normalize name for Windows
      path: path.relative(process.cwd(), filename)
    };
  }
}

module.exports = WatcherFinder;
