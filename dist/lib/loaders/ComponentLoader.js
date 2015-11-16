'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var fs = require('../promises/fs');
var requireHelper = require('../helpers/requireHelper');
var moduleHelper = require('../helpers/moduleHelper');
var path = require('path');
var util = require('util');
var LoaderBase = require('../base/LoaderBase');

var INFO_WATCHING_FILES = 'Watching components for changes';
var WARN_COMPONENT_ROOT_NOT_FOUND = 'Component "%s" not found, blank page will be rendered';
var WARN_COMPONENT_LOGIC = 'File at %s of component "%s" not found or\n  does not export a constructor function. Skipping...';
var INFO_COMPONENT_CHANGED = 'Component "%s" has been changed, reinitializing...';
var INFO_COMPONENT_ADDED = 'Component "%s" has been added, initializing...';
var INFO_COMPONENT_UNLINKED = 'Component "%s" has been unlinked, removing...';

var ComponentLoader = (function (_LoaderBase) {
  _inherits(ComponentLoader, _LoaderBase);

  /**
   * Creates new instance of the component loader.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @param {boolean} isRelease Release mode flag.
   * @constructor
   * @extends LoaderBase
   */

  function ComponentLoader($serviceLocator, isRelease) {
    _classCallCheck(this, ComponentLoader);

    _get(Object.getPrototypeOf(ComponentLoader.prototype), 'constructor', this).call(this, $serviceLocator.resolveAll('componentTransform'));

    this._isRelease = false;
    this._loadedComponents = null;
    this._logger = null;
    this._eventBus = null;
    this._componentFinder = null;
    this._templateProvider = null;
    this._serviceLocator = $serviceLocator;
    this._logger = $serviceLocator.resolve('logger');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._templateProvider = $serviceLocator.resolve('templateProvider');
    this._componentFinder = $serviceLocator.resolve('componentFinder');
    this._isRelease = Boolean(isRelease);
  }

  /**
   * Gets absolute path to a logic file.
   * @param {Object} componentDetails Component details object.
   * @returns {String} Absolute path to a logic file.
   */

  /**
   * Current release flag.
   * @type {boolean}
   * @private
   */

  _createClass(ComponentLoader, [{
    key: 'load',

    /**
     * Loads all components into a memory.
     * @returns {Promise<Object>} Promise for map of loaded components.
     */
    value: function load() {
      var _this = this;

      if (this._loadedComponents) {
        return _Promise.resolve(this._loadedComponents);
      }

      var isDocumentFound = false;
      var result = _Object$create(null);

      return this._componentFinder.find().then(function (components) {
        var componentPromises = _Object$keys(components).map(function (componentName) {
          var componentDetails = components[componentName];
          if (moduleHelper.isDocumentComponent(componentDetails.name)) {
            isDocumentFound = true;
          }
          return _this._getComponent(componentDetails);
        });

        return _Promise.all(componentPromises);
      }).then(function (componentList) {
        componentList.forEach(function (component) {
          if (!component || typeof component !== 'object') {
            return;
          }

          result[component.name] = component;
        });

        _this._loadedComponents = result;

        if (!_this._isRelease) {
          _this._logger.info(INFO_WATCHING_FILES);
          _this._componentFinder.watch();
          _this._handleChanges();
        }

        if (!isDocumentFound) {
          _this._logger.warn(util.format(WARN_COMPONENT_ROOT_NOT_FOUND, moduleHelper.DOCUMENT_COMPONENT_NAME));
        }

        _this._eventBus.emit('allComponentsLoaded', result);
        return _this._loadedComponents;
      });
    }

    /**
     * Gets current map of components by names.
     * @returns {Object} Map of components by names.
     */
  }, {
    key: 'getComponentsByNames',
    value: function getComponentsByNames() {
      return this._loadedComponents || _Object$create(null);
    }

    /**
     * Gets component object by found component details.
     * @param {Object} componentDetails Found details.
     * @returns {Object} Component object.
     * @private
     */
  }, {
    key: '_getComponent',
    value: function _getComponent(componentDetails) {
      var _this2 = this;

      var constructor;
      var logicPath = getLogicPath(componentDetails);

      try {
        constructor = require(logicPath);
      } catch (e) {
        this._eventBus.emit('error', e);
        return _Promise.resolve(null);
      }

      if (typeof constructor !== 'function') {
        this._logger.warn(util.format(WARN_COMPONENT_LOGIC, logicPath, componentDetails.name));
        return _Promise.resolve(null);
      }

      var component = _Object$create(componentDetails);
      component.constructor = constructor;

      return this._loadTemplateSources(component).then(function () {
        return _this2._compileTemplates(component);
      }).then(function (compiledTemplates) {
        return _this2._applyTransforms(component).then(function (transformed) {
          component = transformed;
          return _this2._registerTemplates(component, compiledTemplates);
        });
      }).then(function () {
        _this2._eventBus.emit('componentLoaded', component);
        return component;
      })['catch'](function (reason) {
        _this2._eventBus.emit('error', reason);
        return null;
      });
    }

    /**
     * Handles watch changes.
     * @private
     */
  }, {
    key: '_handleChanges',
    value: function _handleChanges() {
      var _this3 = this;

      var loadComponent = function loadComponent(componentDetails) {
        _this3._getComponent(componentDetails).then(function (component) {
          return _this3._loadedComponents[componentDetails.name] = component;
        });
      };

      this._componentFinder.on('add', function (componentDetails) {
        _this3._logger.info(util.format(INFO_COMPONENT_ADDED, componentDetails.path));
        requireHelper.clearCacheKey(getLogicPath(componentDetails));
        loadComponent(componentDetails);
      }).on('changeLogic', function (componentDetails) {
        requireHelper.clearCacheKey(getLogicPath(componentDetails));
        _this3._logger.info(util.format(INFO_COMPONENT_CHANGED, componentDetails.path));
        loadComponent(componentDetails);
      }).on('changeTemplates', function (componentDetails) {
        _this3._logger.info(util.format(INFO_COMPONENT_CHANGED, componentDetails.path));
        loadComponent(componentDetails);
      }).on('unlink', function (componentDetails) {
        _this3._logger.info(util.format(INFO_COMPONENT_UNLINKED, componentDetails.path));
        requireHelper.clearCacheKey(getLogicPath(componentDetails));
        delete _this3._loadedComponents[componentDetails.name];
      });
    }

    /**
     * Loads template sources from files.
     * @param {Object} component Component.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_loadTemplateSources',
    value: function _loadTemplateSources(component) {
      return _Promise.resolve()
      // load template sources
      .then(function () {
        var templateSourcePromise = _Promise.resolve().then(function () {
          var templatePath = path.resolve(path.dirname(component.path), component.properties.template);
          return fs.readFile(templatePath).then(function (source) {
            component.templateSource = source.toString();
          });
        });

        var errorTemplateSourcePromise = _Promise.resolve().then(function () {
          component.errorTemplateSource = null;
          var relativePath = component.properties.errorTemplate;
          if (typeof relativePath !== 'string') {
            return _Promise.resolve();
          }
          var templatePath = path.resolve(path.dirname(component.path), component.properties.errorTemplate);
          return fs.readFile(templatePath).then(function (source) {
            component.errorTemplateSource = source.toString();
          });
        });

        return _Promise.all([templateSourcePromise, errorTemplateSourcePromise]);
      });
    }

    /**
     * Compiles template sources of the component.
     * @param {Object} component Component.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_compileTemplates',
    value: function _compileTemplates(component) {
      var _this4 = this;

      return _Promise.resolve().then(function () {
        var templateCompilePromise = _Promise.resolve().then(function () {
          return _this4._templateProvider.compile(component.templateSource, component.name);
        });
        var errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
        var errorTemplateCompilePromise = _Promise.resolve().then(function () {
          if (!component.errorTemplateSource) {
            return null;
          }
          return _this4._templateProvider.compile(component.errorTemplateSource, errorTemplateName);
        });

        return _Promise.all([templateCompilePromise, errorTemplateCompilePromise]);
      }).then(function (compiledTemplates) {
        return {
          template: compiledTemplates[0],
          errorTemplate: compiledTemplates[1] || null
        };
      });
    }

    /**
     * Registers templates into component and template provider.
     * @param {Object} component Component.
     * @param {{template: string, errorTemplate: string}} templates
     * Compiled templates.
     * @private
     */
  }, {
    key: '_registerTemplates',
    value: function _registerTemplates(component, templates) {
      var _this5 = this;

      this._templateProvider.registerCompiled(component.name, templates.template);

      component.template = {
        render: function render(context) {
          return _this5._templateProvider.render(component.name, context);
        }
      };

      if (!templates.errorTemplate) {
        return;
      }

      var errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
      this._templateProvider.registerCompiled(errorTemplateName, templates.errorTemplate);

      component.errorTemplate = {
        render: function render(context) {
          return _this5._templateProvider.render(errorTemplateName, context);
        }
      };
    }
  }]);

  return ComponentLoader;
})(LoaderBase);

function getLogicPath(componentDetails) {
  return path.resolve(path.dirname(componentDetails.path), componentDetails.properties.logic);
}

module.exports = ComponentLoader;

/**
 * Current map of loaded components by names.
 * @type {Object}
 * @private
 */

/**
 * Current logger.
 * @type {Logger}
 * @private
 */

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */

/**
 * Current component finder.
 * @type {ComponentFinder}
 * @private
 */

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */