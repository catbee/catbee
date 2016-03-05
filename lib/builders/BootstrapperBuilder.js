var path = require('path');
var util = require('util');
var pfs = require('../promises/fs');
var hrTimeHelper = require('../helpers/hrTimeHelper');
var moduleHelper = require('../helpers/moduleHelper');
var requireHelper = require('../helpers/requireHelper');

const BOOTSTRAPPER_FILENAME = 'Bootstrapper.js';
const BROWSER_ROOT_PATH = path.join(__dirname, '..', '..', 'browser');
const COMPONENT_FORMAT = '\n{' +
      'name: \'%s\', ' +
      'constructor: %s, ' +
      'properties: %s, ' +
      'templateSource: \'%s\', ' +
      'errorTemplateSource: %s' +
      '}';
const ENTITY_FORMAT = '\n{name: \'%s\', definition: %s}';
const COMPONENTS_REPLACE = '/**__components**/';
const WATCHERS_REPLACE = '/**__watchers**/';
const SIGNALS_REPLACE = '/**__signals**/';
const ROUTE_DEFINITIONS_REPLACE = '\'__routes\'';
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
   * @param {Object} components
   * @param {Object} signals
   * @param {Object} watchers
   * @returns {Promise<string>} Promise for source code of real bootstrapper.
   */
  build (components, signals, watchers) {
    var bootstrapperTemplatePath = path.join(BROWSER_ROOT_PATH, BOOTSTRAPPER_FILENAME);
    var routeDefinitionsPath = path.join(process.cwd(), ROUTE_DEFINITIONS_FILENAME);

    var startTime = hrTimeHelper.get();
    this._logger.info(INFO_BUILDING_BOOTSTRAPPER);

    return pfs.readFile(bootstrapperTemplatePath, {
      encoding: 'utf8'
    })
    .then(file => {
      return Promise.all([
        this._generateRequiresForComponents(components),
        this._generateRequires(signals),
        this._generateRequires(watchers)
      ])
      .then(results => ({
        file: file,
        components: results[0],
        signals: results[1],
        watchers: results[2]
      }));
    })
    .then(context => {
      // check if paths exist and create require statements or undefined
      return pfs.exists(routeDefinitionsPath)
        .then(isExists => {
          var requireString = isExists ? util.format(
            REQUIRE_FORMAT,
            './' +
            path.relative(
              process.cwd(),
              requireHelper.getValidPath(routeDefinitionsPath)
            )) : 'null';

          return context.file
            .replace(COMPONENTS_REPLACE, context.components)
            .replace(WATCHERS_REPLACE, context.watchers)
            .replace(SIGNALS_REPLACE, context.signals)
            .replace(ROUTE_DEFINITIONS_REPLACE, requireString);
        });
    })
    .then(boostrapper => {
      this._logger.info(util.format(
        INFO_BOOTSTRAPPER_BUILT,
        hrTimeHelper.toMessage(hrTimeHelper.get(startTime))
      ));
      return boostrapper;
    })
    .catch(reason => this._eventBus.emit('error', reason));
  }

  /**
   * Generates replacements for every component.
   * @param {Object} components
   * @returns {Promise<string>} Promise for JSON string that describes components.
   * @private
   */
  _generateRequiresForComponents (components) {
    var promises = [];

    Object.keys(components)
      .forEach(componentName => {
        var componentDetails = components[componentName];
        var componentPath = path.dirname(componentDetails.path);
        var logicFile = components[componentName].properties.logic || moduleHelper.DEFAULT_LOGIC_FILENAME;
        var logicPath = path.resolve(componentPath, logicFile);
        var relativeLogicPath = path.relative(process.cwd(), logicPath);

        if (typeof (componentDetails.properties.template) !== 'string') {
          return;
        }

        var templates = [];

        templates.push({
          name: componentDetails.name,
          isErrorTemplate: false,
          path: path.resolve(componentPath, componentDetails.properties.template)
        });

        if (componentDetails.properties.errorTemplate) {
          var errorTemplateName = moduleHelper.getNameForErrorTemplate(componentDetails.name);
          var errorTemplatePath = path.resolve(componentPath, componentDetails.properties.errorTemplate);

          templates.push({
            name: errorTemplateName,
            isErrorTemplate: true,
            path: errorTemplatePath
          });
        }

        // load sources
        var templatePromises = templates.map(template => {
          return pfs.readFile(template.path)
            .then(source => {
              var result = Object.create(template);
              result.source = source.toString();
              return result;
            });
        });

        var promise = Promise.all(templatePromises)
          // compile sources
          .then(templates => {
            var compilePromises = templates
              .map(template => {
                var compiled = this._templateProvider.compile(template.source, template.name);
                return Promise.resolve(compiled)
                  .then(compiled => {
                    var result = Object.create(template);
                    result.compiledSource = compiled;
                    return result;
                  });
              });

            return Promise.all(compilePromises);
          })
          .then(templates => {
            var requireString = util.format(
              REQUIRE_FORMAT,
                './' +
                requireHelper.getValidPath(relativeLogicPath)
            );
            var templatesString = templates.length > 1 &&
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
      .then(components => components.join(','));
  }

  /**
   * Generates replacements for every signal or watcher.
   * @param {Object} entities
   * @returns {Promise<string>} Promise for JSON string that describes entity.
   * @private
   */
  _generateRequires (entities) {
    var entitiesRequires = [];
    Object
      .keys(entities)
      .forEach(entityName => {
        var requireExpression = entities[entityName].path ?
          util.format(
            REQUIRE_FORMAT,
            requireHelper.getValidPath(
              './' +
              path.relative(process.cwd(), entities[entityName].path)
            )
          ) : null;
        if (!requireExpression) {
          return;
        }
        entitiesRequires.push(util.format(ENTITY_FORMAT, entityName, requireExpression));
      });
    return Promise.resolve(entitiesRequires.join(','));
  }
}

/**
 * Escapes template source for including to bootstrapper.
 * @param {string} source Template compiled source.
 * @returns {string} escaped string.
 */
function escapeTemplateSource (source) {
  return source
    .replace(/(\\.)/g, '\\$&')
    .replace(/'/g, '\\\'')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

module.exports = BootstrapperBuilder;
