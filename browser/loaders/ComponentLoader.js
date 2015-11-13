var moduleHelper = require('../../lib/helpers/moduleHelper');
var LoaderBase = require('../../lib/base/LoaderBase');
var util = require('util');

class ComponentLoader extends LoaderBase {
  constructor ($serviceLocator) {
    var transforms = $serviceLocator.resolveAll('componentTransform');
    super(transforms);

    this._serviceLocator = $serviceLocator;
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._templateProvider = $serviceLocator.resolve('templateProvider');
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Current template provider.
   * @type {TemplateProvider}
   * @private
   */
  _templateProvider = null;

  /**
   * Current map of loaded components by names.
   * @type {Object} Map of components by names.
   * @private
   */
  _loadedComponents = null;

  /**
   * Loads components when it is in a browser.
   * @returns {Promise} Promise for nothing.
   */
  load () {
    if (this._loadedComponents) {
      return Promise.resolve(this._loadedComponents);
    }

    this._loadedComponents = Object.create(null);

    var self = this;
    return Promise.resolve()
      .then(function () {
        var components = self._serviceLocator.resolveAll('component'),
          componentPromises = [];

        // the list is a stack, we should reverse it
        components.forEach(function (component) {
          componentPromises.unshift(
            self._processComponent(component)
          );
        });
        return Promise.all(componentPromises);
      })
      .then(function (components) {
        components.forEach(function (component) {
          if (!component || typeof (component) !== 'object') {
            return;
          }
          self._loadedComponents[component.name] = component;
        });
        self._eventBus.emit('allComponentsLoaded', components);
        return self._loadedComponents;
      });
  }

  /**
   * Processes component and apply required operations.
   * @param {Object} componentDetails Loaded component details.
   * @returns {Object} Component object.
   * @private
   */
  _processComponent (componentDetails) {
    var self = this;
    var component = Object.create(componentDetails);

    return this._applyTransforms(component)
      .then(function (transformed) {
        component = transformed;
        self._templateProvider.registerCompiled(
          component.name, component.templateSource
        );
        component.template = {
          render: function (dataContext) {
            return self._templateProvider.render(
              component.name, dataContext
            );
          }
        };
        if (typeof (component.errorTemplateSource) === 'string') {
          var errorTemplateName = moduleHelper.getNameForErrorTemplate(
            component.name
          );
          self._templateProvider.registerCompiled(
            errorTemplateName, component.errorTemplateSource
          );
          component.errorTemplate = {
            render: function (dataContext) {
              return self._templateProvider.render(
                errorTemplateName, dataContext
              );
            }
          };
        }
        self._eventBus.emit('componentLoaded', component);
        return component;
      })
      .catch(function (reason) {
        self._eventBus.emit('error', reason);
        return null;
      });
  }

  /**
   * Gets map of components by names.
   * @returns {Object} Map of components by names.
   */
  getComponentsByNames () {
    return this._loadedComponents || Object.create(null);
  }
}

module.exports = ComponentLoader;
