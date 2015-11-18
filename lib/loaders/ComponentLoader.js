var fs = require('../promises/fs');
var requireHelper = require('../helpers/requireHelper');
var moduleHelper = require('../helpers/moduleHelper');
var path = require('path');
var util = require('util');
var LoaderBase = require('../base/LoaderBase');

const INFO_WATCHING_FILES = 'Watching components for changes';
const WARN_COMPONENT_ROOT_NOT_FOUND = 'Component "%s" not found, blank page will be rendered';
const WARN_COMPONENT_LOGIC = `File at %s of component "%s" not found or
  does not export a constructor function. Skipping...`;
const INFO_COMPONENT_CHANGED = 'Component "%s" has been changed, reinitializing...';
const INFO_COMPONENT_ADDED = 'Component "%s" has been added, initializing...';
const INFO_COMPONENT_UNLINKED = 'Component "%s" has been unlinked, removing...';

class ComponentLoader extends LoaderBase {
  /**
   * Creates new instance of the component loader.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @param {boolean} isRelease Release mode flag.
   * @constructor
   * @extends LoaderBase
   */
  constructor ($serviceLocator, isRelease) {
    super($serviceLocator.resolveAll('componentTransform'));

    this._serviceLocator = $serviceLocator;
    this._logger = $serviceLocator.resolve('logger');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._templateProvider = $serviceLocator.resolve('templateProvider');
    this._componentFinder = $serviceLocator.resolve('componentFinder');
    this._isRelease = Boolean(isRelease);
  }

  /**
   * Current release flag.
   * @type {boolean}
   * @private
   */
  _isRelease = false;

  /**
   * Current map of loaded components by names.
   * @type {Object}
   * @private
   */
  _loadedComponents = null;

  /**
   * Current logger.
   * @type {Logger}
   * @private
   */
  _logger = null;

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Current component finder.
   * @type {ComponentFinder}
   * @private
   */
  _componentFinder = null;

  /**
   * Current template provider.
   * @type {TemplateProvider}
   * @private
   */
  _templateProvider = null;

  /**
   * Loads all components into a memory.
   * @returns {Promise<Object>} Promise for map of loaded components.
   */
  load () {
    if (this._loadedComponents) {
      return Promise.resolve(this._loadedComponents);
    }

    var isDocumentFound = false;
    var result = Object.create(null);

    return this._componentFinder.find()
      .then(components => {
        var componentPromises = Object.keys(components)
          .map(componentName => {
            var componentDetails = components[componentName];
            if (moduleHelper.isDocumentComponent(componentDetails.name)) {
              isDocumentFound = true;
            }
            return this._getComponent(componentDetails);
          });

        return Promise.all(componentPromises);
      })
      .then(componentList => {
        componentList.forEach(component => {
          if (!component || typeof (component) !== 'object') {
            return;
          }

          result[component.name] = component;
        });

        this._loadedComponents = result;

        if (!this._isRelease) {
          this._logger.info(INFO_WATCHING_FILES);
          this._componentFinder.watch();
          this._handleChanges();
        }

        if (!isDocumentFound) {
          this._logger.warn(util.format(
            WARN_COMPONENT_ROOT_NOT_FOUND,
            moduleHelper.DOCUMENT_COMPONENT_NAME
          ));
        }

        this._eventBus.emit('allComponentsLoaded', result);
        return this._loadedComponents;
      });
  }

  /**
   * Gets current map of components by names.
   * @returns {Object} Map of components by names.
   */
  getComponentsByNames () {
    return this._loadedComponents || Object.create(null);
  }

  /**
   * Gets component object by found component details.
   * @param {Object} componentDetails Found details.
   * @returns {Object} Component object.
   * @private
   */
  _getComponent (componentDetails) {
    var constructor;
    var logicPath = getLogicPath(componentDetails);

    try {
      constructor = require(logicPath);
    } catch (e) {
      this._eventBus.emit('error', e);
      return Promise.resolve(null);
    }

    if (typeof (constructor) !== 'function') {
      this._logger.warn(util.format(
        WARN_COMPONENT_LOGIC, logicPath, componentDetails.name
      ));
      return Promise.resolve(null);
    }

    var component = Object.create(componentDetails);
    component.constructor = constructor;

    return this._loadTemplateSources(component)
      .then(() => this._compileTemplates(component))
      .then(compiledTemplates => {
        return this._applyTransforms(component)
          .then((transformed) => {
            component = transformed;
            return this._registerTemplates(component, compiledTemplates);
          });
      })
      .then(() => {
        this._eventBus.emit('componentLoaded', component);
        return component;
      })
      .catch((reason) => {
        this._eventBus.emit('error', reason);
        return null;
      });
  }

  /**
   * Handles watch changes.
   * @private
   */
  _handleChanges () {
    var loadComponent = componentDetails => {
      this._getComponent(componentDetails)
        .then(component => this._loadedComponents[componentDetails.name] = component);
    };

    this._componentFinder
      .on('add', componentDetails => {
        this._logger.info(util.format(
          INFO_COMPONENT_ADDED, componentDetails.path
        ));
        requireHelper.clearCacheKey(
          getLogicPath(componentDetails)
        );
        loadComponent(componentDetails);
      })
      .on('changeLogic', componentDetails => {
        requireHelper.clearCacheKey(getLogicPath(componentDetails));
        this._logger.info(util.format(
          INFO_COMPONENT_CHANGED, componentDetails.path
        ));
        loadComponent(componentDetails);
      })
      .on('changeTemplates', componentDetails => {
        this._logger.info(util.format(
          INFO_COMPONENT_CHANGED, componentDetails.path
        ));
        loadComponent(componentDetails);
      })
      .on('unlink', componentDetails => {
        this._logger.info(util.format(
          INFO_COMPONENT_UNLINKED, componentDetails.path
        ));
        requireHelper.clearCacheKey(getLogicPath(componentDetails));
        delete this._loadedComponents[componentDetails.name];
      });
  }

  /**
   * Loads template sources from files.
   * @param {Object} component Component.
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _loadTemplateSources (component) {
    return Promise.resolve()
      // load template sources
      .then(() => {
        var templateSourcePromise = Promise.resolve()
          .then(() => {
            var templatePath = path.resolve(
              path.dirname(component.path),
              component.properties.template
            );
            return fs.readFile(templatePath)
              .then((source) => {
                component.templateSource = source.toString();
              });
          });

        var errorTemplateSourcePromise = Promise.resolve()
          .then(() => {
            component.errorTemplateSource = null;
            var relativePath = component.properties.errorTemplate;
            if (typeof (relativePath) !== 'string') {
              return Promise.resolve();
            }
            var templatePath = path.resolve(
              path.dirname(component.path),
              component.properties.errorTemplate
            );
            return fs.readFile(templatePath)
              .then((source) => {
                component.errorTemplateSource = source.toString();
              });
          });

        return Promise.all([
          templateSourcePromise,
          errorTemplateSourcePromise
        ]);
      });
  }

  /**
   * Compiles template sources of the component.
   * @param {Object} component Component.
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _compileTemplates (component) {
    return Promise.resolve()
      .then(() => {
        var templateCompilePromise = Promise.resolve()
          .then(() => this._templateProvider.compile(component.templateSource, component.name));
        var errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
        var errorTemplateCompilePromise = Promise.resolve()
            .then(() => {
              if (!component.errorTemplateSource) {
                return null;
              }
              return this._templateProvider.compile(component.errorTemplateSource, errorTemplateName);
            });

        return Promise.all([
          templateCompilePromise,
          errorTemplateCompilePromise
        ]);
      })
      .then((compiledTemplates) => {
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
  _registerTemplates (component, templates) {
    this._templateProvider.registerCompiled(component.name, templates.template);

    component.template = {
      render: context => this._templateProvider.render(component.name, context)
    };

    if (!templates.errorTemplate) {
      return;
    }

    var errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
    this._templateProvider.registerCompiled(errorTemplateName, templates.errorTemplate);

    component.errorTemplate = {
      render: (context) => this._templateProvider.render(errorTemplateName, context)
    };
  }
}

/**
 * Gets absolute path to a logic file.
 * @param {Object} componentDetails Component details object.
 * @returns {String} Absolute path to a logic file.
 */
function getLogicPath (componentDetails) {
  return path.resolve(path.dirname(componentDetails.path), componentDetails.properties.logic);
}

module.exports = ComponentLoader;
