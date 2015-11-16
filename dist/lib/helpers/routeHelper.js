'use strict';

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var util = require('util');

var URI_PATH_REPLACEMENT_REG_EXP_SOURCE = '([^\\/\\\\]*)';
var URI_QUERY_REPLACEMENT_REG_EXP_SOURCE = '([^&?=]*)';
var PATH_END_SLASH_REG_EXP = /(.+)\/($|\?|#)/;
var EXPRESSION_ESCAPE_REG_EXP = /[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g;
var IDENTIFIER_REG_EXP_SOURCE = '[$A-Z_][\\dA-Z_$]*';
var PARAMETER_REG_EXP = new RegExp(':' + IDENTIFIER_REG_EXP_SOURCE, 'gi');
var SLASHED_BRACKETS_REG_EXP = /\\\[|\\\]/;

module.exports = {
  /**
   * Removes slash from the end of URI path.
   * @param {string} uriPath URI path to process.
   * @returns {string}
   */
  removeEndSlash: function removeEndSlash(uriPath) {
    if (!uriPath || typeof uriPath !== 'string') {
      return '';
    }
    if (uriPath === '/') {
      return uriPath;
    }
    return uriPath.replace(PATH_END_SLASH_REG_EXP, '$1$2');
  },

  /**
   * Gets URI mapper from the route expression like
   * /some/:id[store1, store2, store3]/details?filter=:filter[store3]
   * @param {URI} routeUri Expression that defines route.
   * @returns {{expression: RegExp, map: Function}}
   * URI mapper object.
   */
  compileRoute: function compileRoute(routeUri) {
    if (!routeUri) {
      return null;
    }

    // escape regular expression characters
    var escaped = routeUri.path.replace(EXPRESSION_ESCAPE_REG_EXP, '\\$&');

    // get all occurrences of routing parameters in URI path
    var queryMapper, pathMapper;
    var regExpSource = '^' + escaped.replace(PARAMETER_REG_EXP, URI_PATH_REPLACEMENT_REG_EXP_SOURCE) + '$';
    var expression = new RegExp(regExpSource, 'i');
    var pathParameterMatches = escaped.match(PARAMETER_REG_EXP);
    var pathParameters = pathParameterMatches ? pathParameterMatches.map(getParameterDescriptor) : null;

    if (pathParameters) {
      pathMapper = createUriPathMapper(expression, pathParameters);
    }

    if (routeUri.query) {
      var queryParameters = _Object$create(null);
      _Object$keys(routeUri.query.values).forEach(function (name) {
        // arrays in routing definitions are not supported
        if (util.isArray(routeUri.query.values[name])) {
          return;
        }

        // escape regular expression characters
        var escaped = routeUri.query.values[name].replace(EXPRESSION_ESCAPE_REG_EXP, '\\$&');

        // get all occurrences of routing parameters in URI path
        var regExpSource = '^' + escaped.replace(PARAMETER_REG_EXP, URI_QUERY_REPLACEMENT_REG_EXP_SOURCE) + '$';
        var queryParameterMatches = escaped.match(PARAMETER_REG_EXP);

        if (!queryParameterMatches || queryParameterMatches.length === 0) {
          return;
        }

        var parameter = getParameterDescriptor(queryParameterMatches[queryParameterMatches.length - 1]);
        var expression = new RegExp(regExpSource, 'i');
        parameter.map = createUriQueryValueMapper(expression);
        queryParameters[name] = parameter;
      });

      queryMapper = createUriQueryMapper(queryParameters);
    }

    return {
      expression: expression,
      map: function map(uri) {
        var args = _Object$create(null);

        if (pathMapper) {
          pathMapper(uri.path, args);
        }

        if (queryMapper && uri.query) {
          queryMapper(uri.query.values, args);
        }

        return args;
      }
    };
  }
};

/**
 * Creates new URI path-to-state object mapper.
 * @param {RegExp} expression Regular expression to match URI path.
 * @param {Array} parameters List of parameter descriptors.
 * @returns {Function} URI mapper function.
 */
function createUriPathMapper(expression, parameters) {
  return function (uriPath, args) {
    var matches = uriPath.match(expression);
    if (!matches || matches.length < 2) {
      return args;
    }

    // start with second match because first match is always
    // the whole URI path
    matches = matches.splice(1);

    parameters.forEach(function (parameter, index) {
      var value = matches[index];

      try {
        value = decodeURIComponent(value);
      } catch (e) {
        // nothing to do
      }

      args[parameter.name] = value;
    });
  };
}

/**
 * Creates new URI query-to-args object mapper.
 * @param {Object} parameters List of possible query parameter descriptors by
 * query parameter names.
 * @returns {Function} URI mapper function.
 */
function createUriQueryMapper(parameters) {
  return function (queryValues, args) {
    queryValues = queryValues || _Object$create(null);

    _Object$keys(queryValues).forEach(function (queryKey) {
      var parameter = parameters[queryKey];

      if (!parameter) {
        return;
      }

      var value = util.isArray(queryValues[queryKey]) ? queryValues[queryKey].map(parameter.map).filter(function (value) {
        return value !== null;
      }) : parameter.map(queryValues[queryKey]);

      if (value === null) {
        return;
      }

      args[parameter.name] = value;
    });
  };
}

/**
 * Maps query parameter value using the parameters expression.
 * @param {RegExp} expression Regular expression to get parameter value.
 * @returns {Function} URI query string parameter value mapper function.
 */
function createUriQueryValueMapper(expression) {
  return function (value) {
    value = value.toString();
    var matches = value.match(expression);
    if (!matches || matches.length === 0) {
      return null;
    }

    // the value is the second item, the first is a whole string
    var mappedValue = matches[matches.length - 1];
    try {
      mappedValue = decodeURIComponent(mappedValue);
    } catch (e) {
      // nothing to do
    }

    return mappedValue;
  };
}

/**
 * Gets description of parameters from its expression.
 * @param {string} parameter Parameter expression.
 * @returns {{name: string}} Parameter descriptor.
 */
function getParameterDescriptor(parameter) {
  var parts = parameter.split(SLASHED_BRACKETS_REG_EXP);

  return {
    name: parts[0].trim().substring(1)
  };
}