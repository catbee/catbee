var path = require('path');
var util = require('util');
var pfs = require('../promises/fs');
var hrTimeHelper = require('../helpers/hrTimeHelper');
var moduleHelper = require('../helpers/moduleHelper');
var requireHelper = require('../helpers/requireHelper');

const BOOTSTRAPPER_FILENAME = 'Bootstrapper.js';
const BROWSER_ROOT_PATH = path.join(__dirname, '..', '..', 'browser');
const STORE_FORMAT = '\n{name: \'%s\', constructor: %s}';
const STORES_REPLACE = '/**__stores**/';
const COMPONENT_FORMAT = '\n{' +
      'name: \'%s\', ' +
      'constructor: %s, ' +
      'properties: %s, ' +
      'templateSource: \'%s\', ' +
      'errorTemplateSource: %s' +
      '}';
const COMPONENTS_REPLACE = '/**__components**/';
const ROUTE_DEFINITIONS_REPLACE = '\'__routeDefinitions\'';
const ROUTE_DEFINITIONS_FILENAME = 'routes.js';
const REQUIRE_FORMAT = 'require(\'%s\')';
const INFO_BUILDING_BOOTSTRAPPER = 'Building bootstrapper...';
const INFO_BOOTSTRAPPER_BUILT = 'Bootstrapper has been built (%s)';

class BootstrapperBuilder {
  constructor ($serviceLocator) {
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._templateProvider = $serviceLocator.resolve('templateProvider');
    this._logger = $serviceLocator.resolve('logger');
  }

  /**
   * Current template provider.
   * @type {TemplateProvider}
   * @private
   */
  _templateProvider = null;

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
   * Creates real bootstrapper code for bundle build.
   * @param {Object} stores Found stores.
   * @param {Object} components Found components.
   * @returns {Promise<string>} Promise for source code of real bootstrapper.
   */
  build (stores, components) {
    var bootstrapperTemplatePath = path.join(BROWSER_ROOT_PATH, BOOTSTRAPPER_FILENAME);
    var routeDefinitionsPath = path.join(process.cwd(), ROUTE_DEFINITIONS_FILENAME);

    var startTime = hrTimeHelper.get();
    this._logger.info(INFO_BUILDING_BOOTSTRAPPER);

    return pfs.readFile(bootstrapperTemplatePath, {
        encoding: 'utf8'
      })
      .then(file => {
        return Promise.all([
            self._generateRequiresForStores(stores),
            self._generateRequiresForComponents(components)
          ])
          .then(function (results) {
            return {
              file: file,
              stores: results[0],
              components: results[1]
            };
          });
      })
      .then(function (context) {
        // check if paths exist and create require statements or undefined
        return pfs.exists(routeDefinitionsPath)
          .then(function (isExists) {
            var requireString = isExists ? util.format(
              REQUIRE_FORMAT,
              './' +
              path.relative(
                process.cwd(),
                requireHelper.getValidPath(routeDefinitionsPath)
              )) : 'null';
            return context.file
              .replace(COMPONENTS_REPLACE, context.components)
              .replace(STORES_REPLACE, context.stores)
              .replace(ROUTE_DEFINITIONS_REPLACE, requireString);
          });
      })
      .then(function (boostrapper) {
        self._logger.info(util.format(
          INFO_BOOTSTRAPPER_BUILT,
          hrTimeHelper.toMessage(hrTimeHelper.get(startTime))
        ));
        return boostrapper;
      })
      .catch(function (reason) {
        self._eventBus.emit('error', reason);
      });
  };

  /**
   * Generates replacements for every store.
   * @param {Object} stores Found stores.
   * @returns {Promise<string>} Promise for JSON string that describes components.
   * @private
   */
  _generateRequiresForStores (stores) {
    var storeRequires = [];
    Object
      .keys(stores)
      .forEach(function (storeName) {
        var requireExpression = stores[storeName].path ?
          util.format(
            REQUIRE_FORMAT,
            requireHelper.getValidPath(
              './' +
              path.relative(process.cwd(), stores[storeName].path)
            )
          ) : null;
        if (!requireExpression) {
          return;
        }
        storeRequires.push(util.format(
          STORE_FORMAT, storeName, requireExpression
        ));
      });
    return Promise.resolve(storeRequires.join(','));
  };

  /**
   * Generates replacements for every component.
   * @returns {Promise<string>} Promise for JSON string that describes components.
   * @private
   */
  _generateRequiresForComponents (components) {
    var self = this,
      promises = [];

    Object.keys(components)
      .forEach(function (componentName) {
        var componentDetails = components[componentName],
          componentPath = path.dirname(componentDetails.path),
          logicFile = components[componentName].properties.logic ||
            moduleHelper.DEFAULT_LOGIC_FILENAME,
          logicPath = path.resolve(
            componentPath, logicFile
          ),
          relativeLogicPath = path
            .relative(process.cwd(), logicPath),
          constructor;

        try {
          constructor = require(logicPath);
        } catch (e) {
          self._eventBus.emit('error', e);
        }

        if (typeof (constructor) !== 'function' ||
          typeof (componentDetails.properties.template) !== 'string') {
          return;
        }

        var templates = [];

        templates.push({
          name: componentDetails.name,
          isErrorTemplate: false,
          path: path.resolve(
            componentPath, componentDetails.properties.template
          )
        });

        if (componentDetails.properties.errorTemplate) {
          var errorTemplateName = moduleHelper.getNameForErrorTemplate(
            componentDetails.name
            ),
            errorTemplatePath = path.resolve(
              componentPath,
              componentDetails.properties.errorTemplate
            );
          templates.push({
            name: errorTemplateName,
            isErrorTemplate: true,
            path: errorTemplatePath
          });
        }

        // load sources
        var templatePromises = templates.map(function (template) {
          return pfs.readFile(template.path)
            .then(function (source) {
              var result = Object.create(template);
              result.source = source.toString();
              return result;
            });
        });

        var promise = Promise.all(templatePromises)
          // compile sources
          .then(function (templates) {
            var compilePromises = templates
              .map(function (template) {
                var compiled = self._templateProvider.compile(
                  template.source, template.name
                );
                return Promise.resolve(compiled)
                  .then(function (compiled) {
                    var result = Object.create(template);
                    result.compiledSource = compiled;
                    return result;
                  });
              });

            return Promise.all(compilePromises);
          })
          .then(function (templates) {
            var requireString = util.format(
              REQUIRE_FORMAT,
                './' +
                requireHelper.getValidPath(relativeLogicPath)
              ),
              templatesString = templates.length > 1 &&
              typeof (templates[1].compiledSource) === 'string' ?
              '\'' + escapeTemplateSource(
                templates[1].compiledSource
              ) + '\'' : 'null';

            return util.format(COMPONENT_FORMAT,
              componentName, requireString,
              JSON.stringify(componentDetails.properties),
              escapeTemplateSource(templates[0].compiledSource),
              templatesString
            );
          });
        promises.push(promise);
      });

    return Promise.all(promises)
      .then(function (components) {
        return components.join(',');
      });
  };
}

/**
 * Escapes template source for including to bootstrapper.
 * @param {string} source Template compiled source.
 * @returns {string} escaped string.
 */
function escapeTemplateSource(source) {
  return source
    .replace(/(\\.)/g, '\\$&')
    .replace(/'/g, '\\\'')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

module.exports = BootstrapperBuilder;
