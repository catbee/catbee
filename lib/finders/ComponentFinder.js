var path = require('path');
var requireHelper = require('../helpers/requireHelper');
var moduleHelper = require('../helpers/moduleHelper');
var chokidar = require('chokidar');
var util = require('util');
var events = require('events');
var EventEmitter = events.EventEmitter;
var glob = require('glob');

const COMPONENT_NAME_REGEXP = /^[\w-]+$/i;
const CHOKIDAR_OPTIONS = {
  ignoreInitial: true,
  cwd: process.cwd(),
  ignorePermissionErrors: true
};
const COMPONENTS_DEFAULT_GLOB = [
  'components/**/component.json'
];

class ComponentFinder extends EventEmitter {
  /**
   * Creates new instance of the component finder.
   * @param {EventEmitter} $eventBus Event bus to exchange events.
   * @param {String?} componentsGlob Glob expression for searching components.
   * @constructor
   */
  constructor ($eventBus, componentsGlob) {
    super();

    this._eventBus = $eventBus;

    if (typeof (componentsGlob) === 'string') {
      this._componentsGlob = [componentsGlob];
    } else if (util.isArray(componentsGlob)) {
      var areStrings = componentsGlob.every(expression => typeof (expression) === 'string');
      if (areStrings) {
        this._componentsGlob = componentsGlob;
      }
    }
  }

  /**
   * Current file watcher.
   * @type {Object}
   * @private
   */
  _fileWatcher = null;

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Current set of last found components.
   * @type {Object}
   * @private
   */
  _foundComponents = null;

  /**
   * Current set of last found components.
   * @type {Object}
   * @private
   */
  _foundComponentsByDirs = null;

  /**
   * Current components glob.
   * @type {Array|String}
   * @private
   */
  _componentsGlob = COMPONENTS_DEFAULT_GLOB;

  /**
   * Finds all paths to components.
   * @returns {Promise<Object>} Promise for set of found components by names.
   */
  find () {
    if (this._foundComponents) {
      return Promise.resolve(this._foundComponents);
    }

    this._foundComponents = Object.create(null);
    this._foundComponentsByDirs = Object.create(null);

    var cache = {};
    var symlinks = {};
    var statCache = {};

    var promises = this._componentsGlob.map((expression) => {
      return new Promise((resolve, reject) => {
        var componentFilesGlob = new glob.Glob(
          expression, {
            cache, statCache, symlinks,
            nosort: true,
            silent: true,
            nodir: true
          }
        );

        componentFilesGlob
          .on('match', (match) => {
            var componentDescriptor = this._createComponentDescriptor(match);
            this._addComponent(componentDescriptor);
            this._eventBus.emit('componentFound', componentDescriptor);
          })
          .on('error', error => reject(error))
          .on('end', () => resolve());
      });
    });

    return Promise.all(promises)
      .then(() => this._foundComponents);
  }

  /**
   * Creates found component descriptor.
   * @param {string} filename Component filename.
   * @returns {{name: string, path: string, properties: Object}|null}
   * Found component descriptor.
   * @private
   */
  _createComponentDescriptor (filename) {
    if (!filename) {
      return null;
    }

    var absolutePath = requireHelper.getAbsoluteRequirePath(filename);
    requireHelper.clearCacheKey(absolutePath);

    var properties;

    try {
      properties = require(absolutePath);
    } catch (e) {
      this._eventBus.emit('error', e);
    }

    if (!properties) {
      return null;
    }

    var componentName = (properties.name || path.basename(path.dirname(filename))).toLowerCase();

    if (!COMPONENT_NAME_REGEXP.test(componentName)) {
      return null;
    }

    if (typeof (properties.logic) !== 'string') {
      properties.logic = moduleHelper.DEFAULT_LOGIC_FILENAME;
    }

    if (typeof (properties.template) !== 'string') {
      return null;
    }

    return {
      name: componentName,
      properties: properties,
      path: path.relative(process.cwd(), filename)
    };
  }

  /**
   * Watches components for changing.
   */
  watch () {
    if (this._fileWatcher) {
      return;
    }

    this._fileWatcher = chokidar.watch(Object.keys(this._foundComponentsByDirs), CHOKIDAR_OPTIONS)
      .on('error', error => this._eventBus.emit('error', error))
      .on('change', filename => {
        var component = this._recognizeComponent(filename);
        if (!component || component.path === filename) {
          return;
        }

        var changeArgs = {
          filename, component
        };

        // logic file is changed
        var relativeLogic = getRelativeForComponent(component.path, component.properties.logic);

        if (filename === relativeLogic) {
          this.emit('changeLogic', component);
          this.emit('change', changeArgs);
          return;
        }

        // template files are changed
        var relativeTemplate = getRelativeForComponent(component.path, component.properties.template);
        var relativeErrorTemplate =
          typeof (component.properties.errorTemplate) === 'string' ?
            getRelativeForComponent(component.path, component.properties.errorTemplate) : null;

        if (filename === relativeTemplate || filename === relativeErrorTemplate) {
          this.emit('changeTemplates', component);
          this.emit('change', changeArgs);
          return;
        }

        this.emit('change', changeArgs);
      })
      .on('unlink', filename => {
        var component = this._recognizeComponent(filename);
        if (!component || component.path === filename) {
          return;
        }
        this.emit('change', {
          filename, component
        });
      })
      .on('add', filename => {
        var component = this._recognizeComponent(filename);
        if (!component || component.path === filename) {
          return;
        }
        this.emit('change', {
          filename, component
        });
      });

    chokidar.watch(this._componentsGlob, CHOKIDAR_OPTIONS)
      .on('error', error => this._eventBus.emit('error', error))
      .on('add', filename => {
        var newComponent = this._createComponentDescriptor(filename);
        this._addComponent(newComponent);
        this.emit('add', newComponent);
      })
      .on('change', filename => {
        var component = this._recognizeComponent(filename);
        if (!component) {
          return;
        }
        var newComponent = this._createComponentDescriptor(component.path);

        this._removeComponent(component);
        this.emit('unlink', component);

        this._addComponent(newComponent);
        this.emit('add', newComponent);
      })
      .on('unlink', filename => {
        var component = this._recognizeComponent(filename);
        if (!component) {
          return;
        }
        this._removeComponent(component);
        this.emit('unlink', component);
      });
  }

  /**
   * Recognizes path to cat-component.json by path to a file of the component.
   * @param {string} filename Filename of internal file of the component.
   * @returns {string} Path ot cat-component.json.
   * @private
   */
  _recognizeComponent (filename) {
    var current = filename;
    var component = null;

    while (current !== '.') {
      if (current in this._foundComponentsByDirs) {
        component = this._foundComponentsByDirs[current];
        break;
      }
      current = path.dirname(current);
    }
    return component;
  }

  /**
   * Removes found component.
   * @param {Object} component Component descriptor to remove.
   * @private
   */
  _removeComponent (component) {
    var dirName = path.dirname(component.path);
    var absolutePath = requireHelper.getAbsoluteRequirePath(component.path);

    requireHelper.clearCacheKey(absolutePath);

    delete this._foundComponents[component.name];
    delete this._foundComponentsByDirs[dirName];

    if (this._fileWatcher) {
      this._fileWatcher.unwatch(dirName);
    }
  }

  /**
   * Adds found component.
   * @param {Object} component Component descriptor.
   * @private
   */
  _addComponent (component) {
    if (!component) {
      return;
    }

    if (this._foundComponents[component.name]) {
      return;
    }
    var dirName = path.dirname(component.path);
    this._foundComponents[component.name] = component;
    this._foundComponentsByDirs[dirName] = component;

    if (this._fileWatcher) {
      this._fileWatcher.add(dirName);
    }
  }
}

/**
 * Gets component inner path which is relative to CWD.
 * @param {string} componentPath Path to a component.
 * @param {string} innerPath The path inside the component.
 * @returns {string} The path which is relative to CWD.
 */
function getRelativeForComponent (componentPath, innerPath) {
  return path.relative(process.cwd(), path.normalize(path.join(path.dirname(componentPath), innerPath)));
}

module.exports = ComponentFinder;
