'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var moduleHelper = require('../../lib/helpers/moduleHelper');
var LoaderBase = require('../../lib/base/LoaderBase');
var util = require('util');

var ComponentLoader = (function (_LoaderBase) {
  _inherits(ComponentLoader, _LoaderBase);

  function ComponentLoader($serviceLocator) {
    _classCallCheck(this, ComponentLoader);

    _get(Object.getPrototypeOf(ComponentLoader.prototype), 'constructor', this).call(this, $serviceLocator.resolveAll('componentTransform'));

    this._eventBus = null;
    this._serviceLocator = null;
    this._templateProvider = null;
    this._loadedComponents = null;
    this._serviceLocator = $serviceLocator;
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._templateProvider = $serviceLocator.resolve('templateProvider');
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */

  _createClass(ComponentLoader, [{
    key: 'load',

    /**
     * Loads components when it is in a browser.
     * @returns {Promise} Promise for nothing.
     */
    value: function load() {
      var _this = this;

      if (this._loadedComponents) {
        return _Promise.resolve(this._loadedComponents);
      }

      this._loadedComponents = _Object$create(null);

      return _Promise.resolve().then(function () {
        var components = _this._serviceLocator.resolveAll('component');
        var componentPromises = [];

        // the list is a stack, we should reverse it
        components.forEach(function (component) {
          componentPromises.unshift(_this._processComponent(component));
        });
        return _Promise.all(componentPromises);
      }).then(function (components) {
        components.forEach(function (component) {
          if (!component || typeof component !== 'object') {
            return;
          }
          _this._loadedComponents[component.name] = component;
        });
        _this._eventBus.emit('allComponentsLoaded', components);
        return _this._loadedComponents;
      });
    }

    /**
     * Processes component and apply required operations.
     * @param {Object} componentDetails Loaded component details.
     * @returns {Object} Component object.
     * @private
     */
  }, {
    key: '_processComponent',
    value: function _processComponent(componentDetails) {
      var _this2 = this;

      var component = _Object$create(componentDetails);

      return this._applyTransforms(component).then(function (transformed) {
        component = transformed;
        _this2._templateProvider.registerCompiled(component.name, component.templateSource);
        component.template = {
          render: function render(dataContext) {
            return _this2._templateProvider.render(component.name, dataContext);
          }
        };

        if (typeof component.errorTemplateSource === 'string') {
          var errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
          _this2._templateProvider.registerCompiled(errorTemplateName, component.errorTemplateSource);
          component.errorTemplate = {
            render: function render(dataContext) {
              return _this2._templateProvider.render(errorTemplateName, dataContext);
            }
          };
        }
        _this2._eventBus.emit('componentLoaded', component);
        return component;
      })['catch'](function (reason) {
        return _this2._eventBus.emit('error', reason);
      });
    }

    /**
     * Gets map of components by names.
     * @returns {Object} Map of components by names.
     */
  }, {
    key: 'getComponentsByNames',
    value: function getComponentsByNames() {
      return this._loadedComponents || _Object$create(null);
    }
  }]);

  return ComponentLoader;
})(LoaderBase);

module.exports = ComponentLoader;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */

/**
 * Current map of loaded components by names.
 * @type {Object} Map of components by names.
 * @private
 */