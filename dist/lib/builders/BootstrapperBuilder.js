'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var path = require('path');
var util = require('util');
var pfs = require('../promises/fs');
var hrTimeHelper = require('../helpers/hrTimeHelper');
var moduleHelper = require('../helpers/moduleHelper');
var requireHelper = require('../helpers/requireHelper');

var BOOTSTRAPPER_FILENAME = 'Bootstrapper.js';
var BROWSER_ROOT_PATH = path.join(__dirname, '..', '..', 'browser');
var COMPONENT_FORMAT = '\n{' + 'name: \'%s\', ' + 'constructor: %s, ' + 'properties: %s, ' + 'templateSource: \'%s\', ' + 'errorTemplateSource: %s' + '}';
var ENTITY_FORMAT = '\n{name: \'%s\', definition: %s}';
var COMPONENTS_REPLACE = '/**__components**/';
var WATCHERS_REPLACE = '/**__watchers**/';
var SIGNALS_REPLACE = '/**__signals**/';
var ROUTE_DEFINITIONS_REPLACE = '\'__routes\'';
var ROUTE_DEFINITIONS_FILENAME = 'routes.js';
var REQUIRE_FORMAT = 'require(\'%s\')';
var INFO_BUILDING_BOOTSTRAPPER = 'Building bootstrapper...';
var INFO_BOOTSTRAPPER_BUILT = 'Bootstrapper has been built (%s)';

var BootstrapperBuilder = (function () {
  function BootstrapperBuilder($serviceLocator) {
    _classCallCheck(this, BootstrapperBuilder);

    this._templateProvider = null;
    this._logger = null;
    this._eventBus = null;

    this._eventBus = $serviceLocator.resolve('eventBus');
    this._templateProvider = $serviceLocator.resolve('templateProvider');
    this._logger = $serviceLocator.resolve('logger');
  }

  /**
   * Escapes template source for including to bootstrapper.
   * @param {string} source Template compiled source.
   * @returns {string} escaped string.
   */

  /**
   * Current template provider.
   * @type {TemplateProvider}
   * @private
   */

  _createClass(BootstrapperBuilder, [{
    key: 'build',

    /**
     * Creates real bootstrapper code for bundle build.
     * @param {Object} components
     * @param {Object} signals
     * @param {Object} watchers
     * @returns {Promise<string>} Promise for source code of real bootstrapper.
     */
    value: function build(components, signals, watchers) {
      var _this = this;

      var bootstrapperTemplatePath = path.join(BROWSER_ROOT_PATH, BOOTSTRAPPER_FILENAME);
      var routeDefinitionsPath = path.join(process.cwd(), ROUTE_DEFINITIONS_FILENAME);

      var startTime = hrTimeHelper.get();
      this._logger.info(INFO_BUILDING_BOOTSTRAPPER);

      return pfs.readFile(bootstrapperTemplatePath, {
        encoding: 'utf8'
      }).then(function (file) {
        return _Promise.all([_this._generateRequiresForComponents(components), _this._generateRequires(signals), _this._generateRequires(watchers)]).then(function (results) {
          return {
            file: file,
            components: results[0],
            signals: results[1],
            watchers: results[2]
          };
        });
      }).then(function (context) {
        // check if paths exist and create require statements or undefined
        return pfs.exists(routeDefinitionsPath).then(function (isExists) {
          var requireString = isExists ? util.format(REQUIRE_FORMAT, './' + path.relative(process.cwd(), requireHelper.getValidPath(routeDefinitionsPath))) : 'null';

          return context.file.replace(COMPONENTS_REPLACE, context.components).replace(WATCHERS_REPLACE, context.watchers).replace(SIGNALS_REPLACE, context.signals).replace(ROUTE_DEFINITIONS_REPLACE, requireString);
        });
      }).then(function (boostrapper) {
        _this._logger.info(util.format(INFO_BOOTSTRAPPER_BUILT, hrTimeHelper.toMessage(hrTimeHelper.get(startTime))));
        return boostrapper;
      })['catch'](function (reason) {
        return _this._eventBus.emit('error', reason);
      });
    }

    /**
     * Generates replacements for every component.
     * @returns {Promise<string>} Promise for JSON string that describes components.
     * @private
     */
  }, {
    key: '_generateRequiresForComponents',
    value: function _generateRequiresForComponents(components) {
      var _this2 = this;

      var promises = [];

      _Object$keys(components).forEach(function (componentName) {
        var componentDetails = components[componentName];
        var componentPath = path.dirname(componentDetails.path);
        var logicFile = components[componentName].properties.logic || moduleHelper.DEFAULT_LOGIC_FILENAME;
        var logicPath = path.resolve(componentPath, logicFile);
        var relativeLogicPath = path.relative(process.cwd(), logicPath);
        var constructor;

        try {
          constructor = require(logicPath);
        } catch (e) {
          _this2._eventBus.emit('error', e);
        }

        if (typeof constructor !== 'function' || typeof componentDetails.properties.template !== 'string') {
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
        var templatePromises = templates.map(function (template) {
          return pfs.readFile(template.path).then(function (source) {
            var result = _Object$create(template);
            result.source = source.toString();
            return result;
          });
        });

        var promise = _Promise.all(templatePromises)
        // compile sources
        .then(function (templates) {
          var compilePromises = templates.map(function (template) {
            var compiled = _this2._templateProvider.compile(template.source, template.name);
            return _Promise.resolve(compiled).then(function (compiled) {
              var result = _Object$create(template);
              result.compiledSource = compiled;
              return result;
            });
          });

          return _Promise.all(compilePromises);
        }).then(function (templates) {
          var requireString = util.format(REQUIRE_FORMAT, './' + requireHelper.getValidPath(relativeLogicPath));
          var templatesString = templates.length > 1 && typeof templates[1].compiledSource === 'string' ? '\'' + escapeTemplateSource(templates[1].compiledSource) + '\'' : 'null';

          return util.format(COMPONENT_FORMAT, componentName, requireString, JSON.stringify(componentDetails.properties), escapeTemplateSource(templates[0].compiledSource), templatesString);
        });
        promises.push(promise);
      });

      return _Promise.all(promises).then(function (components) {
        return components.join(',');
      });
    }

    /**
     * Generates replacements for every signal or watcher.
     * @param {Object} entities
     * @returns {Promise<string>} Promise for JSON string that describes entity.
     * @private
     */
  }, {
    key: '_generateRequires',
    value: function _generateRequires(entities) {
      var entitiesRequires = [];
      _Object$keys(entities).forEach(function (entityName) {
        var requireExpression = entities[entityName].path ? util.format(REQUIRE_FORMAT, requireHelper.getValidPath('./' + path.relative(process.cwd(), entities[entityName].path))) : null;
        if (!requireExpression) {
          return;
        }
        entitiesRequires.push(util.format(ENTITY_FORMAT, entityName, requireExpression));
      });
      return _Promise.resolve(entitiesRequires.join(','));
    }
  }]);

  return BootstrapperBuilder;
})();

function escapeTemplateSource(source) {
  return source.replace(/(\\.)/g, '\\$&').replace(/'/g, '\\\'').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

module.exports = BootstrapperBuilder;

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