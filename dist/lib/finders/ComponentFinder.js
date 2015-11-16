'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var path = require('path');
var requireHelper = require('../helpers/requireHelper');
var moduleHelper = require('../helpers/moduleHelper');
var chokidar = require('chokidar');
var util = require('util');
var events = require('events');
var EventEmitter = events.EventEmitter;
var glob = require('glob');

var COMPONENT_NAME_REGEXP = /^[\w-]+$/i;
var CHOKIDAR_OPTIONS = {
  ignoreInitial: true,
  cwd: process.cwd(),
  ignorePermissionErrors: true
};
var COMPONENTS_DEFAULT_GLOB = ['components/**/component.json'];

var ComponentFinder = (function (_EventEmitter) {
  _inherits(ComponentFinder, _EventEmitter);

  /**
   * Creates new instance of the component finder.
   * @param {EventEmitter} $eventBus Event bus to exchange events.
   * @param {String?} componentsGlob Glob expression for searching components.
   * @constructor
   */

  function ComponentFinder($eventBus, componentsGlob) {
    _classCallCheck(this, ComponentFinder);

    _get(Object.getPrototypeOf(ComponentFinder.prototype), 'constructor', this).call(this);

    this._fileWatcher = null;
    this._eventBus = null;
    this._foundComponents = null;
    this._foundComponentsByDirs = null;
    this._componentsGlob = COMPONENTS_DEFAULT_GLOB;
    this._eventBus = $eventBus;

    if (typeof componentsGlob === 'string') {
      this._componentsGlob = [componentsGlob];
    } else if (util.isArray(componentsGlob)) {
      var areStrings = componentsGlob.every(function (expression) {
        return typeof expression === 'string';
      });
      if (areStrings) {
        this._componentsGlob = componentsGlob;
      }
    }
  }

  /**
   * Gets component inner path which is relative to CWD.
   * @param {string} componentPath Path to a component.
   * @param {string} innerPath The path inside the component.
   * @returns {string} The path which is relative to CWD.
   */

  /**
   * Current file watcher.
   * @type {Object}
   * @private
   */

  _createClass(ComponentFinder, [{
    key: 'find',

    /**
     * Finds all paths to components.
     * @returns {Promise<Object>} Promise for set of found components by names.
     */
    value: function find() {
      var _this = this;

      if (this._foundComponents) {
        return _Promise.resolve(this._foundComponents);
      }

      this._foundComponents = _Object$create(null);
      this._foundComponentsByDirs = _Object$create(null);

      var cache = {};
      var symlinks = {};
      var statCache = {};

      var promises = this._componentsGlob.map(function (expression) {
        return new _Promise(function (resolve, reject) {
          var componentFilesGlob = new glob.Glob(expression, {
            cache: cache, statCache: statCache, symlinks: symlinks,
            nosort: true,
            silent: true,
            nodir: true
          });

          componentFilesGlob.on('match', function (match) {
            var componentDescriptor = _this._createComponentDescriptor(match);
            _this._addComponent(componentDescriptor);
            _this._eventBus.emit('componentFound', componentDescriptor);
          }).on('error', function (error) {
            return reject(error);
          }).on('end', function () {
            return resolve();
          });
        });
      });

      return _Promise.all(promises).then(function () {
        return _this._foundComponents;
      });
    }

    /**
     * Creates found component descriptor.
     * @param {string} filename Component filename.
     * @returns {{name: string, path: string, properties: Object}|null}
     * Found component descriptor.
     * @private
     */
  }, {
    key: '_createComponentDescriptor',
    value: function _createComponentDescriptor(filename) {
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

      if (typeof properties.logic !== 'string') {
        properties.logic = moduleHelper.DEFAULT_LOGIC_FILENAME;
      }

      if (typeof properties.template !== 'string') {
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
  }, {
    key: 'watch',
    value: function watch() {
      var _this2 = this;

      if (this._fileWatcher) {
        return;
      }

      this._fileWatcher = chokidar.watch(_Object$keys(this._foundComponentsByDirs), CHOKIDAR_OPTIONS).on('error', function (error) {
        return _this2._eventBus.emit('error', error);
      }).on('change', function (filename) {
        var component = _this2._recognizeComponent(filename);
        if (!component || component.path === filename) {
          return;
        }

        var changeArgs = {
          filename: filename, component: component
        };

        // logic file is changed
        var relativeLogic = getRelativeForComponent(component.path, component.properties.logic);

        if (filename === relativeLogic) {
          _this2.emit('changeLogic', component);
          _this2.emit('change', changeArgs);
          return;
        }

        // template files are changed
        var relativeTemplate = getRelativeForComponent(component.path, component.properties.template);
        var relativeErrorTemplate = typeof component.properties.errorTemplate === 'string' ? getRelativeForComponent(component.path, component.properties.errorTemplate) : null;

        if (filename === relativeTemplate || filename === relativeErrorTemplate) {
          _this2.emit('changeTemplates', component);
          _this2.emit('change', changeArgs);
          return;
        }

        _this2.emit('change', changeArgs);
      }).on('unlink', function (filename) {
        var component = _this2._recognizeComponent(filename);
        if (!component || component.path === filename) {
          return;
        }
        _this2.emit('change', {
          filename: filename, component: component
        });
      }).on('add', function (filename) {
        var component = _this2._recognizeComponent(filename);
        if (!component || component.path === filename) {
          return;
        }
        _this2.emit('change', {
          filename: filename, component: component
        });
      });

      chokidar.watch(this._componentsGlob, CHOKIDAR_OPTIONS).on('error', function (error) {
        return _this2._eventBus.emit('error', error);
      }).on('add', function (filename) {
        var newComponent = _this2._createComponentDescriptor(filename);
        _this2._addComponent(newComponent);
        _this2.emit('add', newComponent);
      }).on('change', function (filename) {
        var component = _this2._recognizeComponent(filename);
        if (!component) {
          return;
        }
        var newComponent = _this2._createComponentDescriptor(component.path);

        _this2._removeComponent(component);
        _this2.emit('unlink', component);

        _this2._addComponent(newComponent);
        _this2.emit('add', newComponent);
      }).on('unlink', function (filename) {
        var component = _this2._recognizeComponent(filename);
        if (!component) {
          return;
        }
        _this2._removeComponent(component);
        _this2.emit('unlink', component);
      });
    }

    /**
     * Recognizes path to cat-component.json by path to a file of the component.
     * @param {string} filename Filename of internal file of the component.
     * @returns {string} Path ot cat-component.json.
     * @private
     */
  }, {
    key: '_recognizeComponent',
    value: function _recognizeComponent(filename) {
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
  }, {
    key: '_removeComponent',
    value: function _removeComponent(component) {
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
  }, {
    key: '_addComponent',
    value: function _addComponent(component) {
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
  }]);

  return ComponentFinder;
})(EventEmitter);

function getRelativeForComponent(componentPath, innerPath) {
  return path.relative(process.cwd(), path.normalize(path.join(path.dirname(componentPath), innerPath)));
}

module.exports = ComponentFinder;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */

/**
 * Current set of last found components.
 * @type {Object}
 * @private
 */

/**
 * Current set of last found components.
 * @type {Object}
 * @private
 */

/**
 * Current components glob.
 * @type {Array|String}
 * @private
 */