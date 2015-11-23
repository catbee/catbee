var moduleHelper = require('../../lib/helpers/moduleHelper');
var LoaderBase = require('../../lib/base/LoaderBase');

class ComponentLoader extends LoaderBase {
  constructor ($serviceLocator) {
    super($serviceLocator.resolveAll('componentTransform'));

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

    return Promise.resolve()
      .then(() => {
        var components = this._serviceLocator.resolveAll('component');
        var componentPromises = [];

        // the list is a stack, we should reverse it
        components.forEach(component => {
          componentPromises.unshift(this._processComponent(component));
        });
        return Promise.all(componentPromises);
      })
      .then(components => {
        components.forEach(component => {
          if (!component || typeof (component) !== 'object') {
            return;
          }
          this._loadedComponents[component.name] = component;
        });
        this._eventBus.emit('allComponentsLoaded', components);
        return this._loadedComponents;
      });
  }

  /**
   * Processes component and apply required operations.
   * @param {Object} componentDetails Loaded component details.
   * @returns {Object} Component object.
   * @private
   */
  _processComponent (componentDetails) {
    var component = Object.create(componentDetails);

    return this._applyTransforms(component)
      .then(transformed => {
        component = transformed;
        this._templateProvider.registerCompiled(component.name, component.templateSource);
        component.template = {
          render: dataContext => this._templateProvider.render(component.name, dataContext)
        };

        if (typeof (component.errorTemplateSource) === 'string') {
          var errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
          this._templateProvider.registerCompiled(errorTemplateName, component.errorTemplateSource);
          component.errorTemplate = {
            render: dataContext => this._templateProvider.render(errorTemplateName, dataContext)
          };
        }
        this._eventBus.emit('componentLoaded', component);
        return component;
      })
      .catch(reason => this._eventBus.emit('error', reason));
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
