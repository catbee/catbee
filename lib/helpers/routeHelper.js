var util = require('util');
var catberryUri = require('catberry-uri');
var URI = catberryUri.URI;

var URI_PATH_REPLACEMENT_REG_EXP_SOURCE = '([^\\/\\\\]*)';
var URI_QUERY_REPLACEMENT_REG_EXP_SOURCE = '([^&?=]*)';
var PATH_END_SLASH_REG_EXP = /(.+)\/($|\?|#)/;
var EXPRESSION_ESCAPE_REG_EXP = /[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g;
var IDENTIFIER_REG_EXP_SOURCE = '[$A-Z_][\\dA-Z_$]*';
var PARAMETER_REG_EXP = new RegExp(`:${IDENTIFIER_REG_EXP_SOURCE}`, 'gi');
var SLASHED_BRACKETS_REG_EXP = /\\\[|\\\]/;


var NO_OP_MAPPER = {
  expression: /^$/,
  map () {
    return null;
  }
};

module.exports = {
  /**
   * Removes slash from the end of URI path.
   * @param {string} uriPath URI path to process.
   * @returns {string}
   */
  removeEndSlash (uriPath) {
    if (!uriPath || typeof (uriPath) !== 'string') {
      return '';
    }
    if (uriPath === '/') {
      return uriPath;
    }
    return uriPath.replace(PATH_END_SLASH_REG_EXP, '$1$2');
  },

  /**
   * Gets URI mapper from the route expression like /some/:id/details?filter=:filter or /^\/users\/.*$/
   * @param {String|RegExp} routeUri Expression that defines route. Can be either String or regular expression
   * @returns {{expression: RegExp, map: Function}|null} URI mapper object.
   */
  compileRoute (routeExpression) {
    if (routeExpression) {
      switch (Object.getPrototypeOf(routeExpression)) {
      case String.prototype: return compileStringRouteExpression(routeExpression);
      case RegExp.prototype: return compileRegexExpressionRoute(routeExpression);
      }
    }
    return NO_OP_MAPPER;
  }
};

/**
 * Creates new URI path-to-state object mapper.
 * @param {RegExp} expression Regular expression to match URI path.
 * @param {Array} parameters List of parameter descriptors.
 * @returns {Function} URI mapper function.
 */
function createUriPathMapper (expression, parameters) {
  return (uriPath, args) => {
    var matches = uriPath.match(expression);
    if (!matches || matches.length < 2) {
      return args;
    }

    // start with second match because first match is always
    // the whole URI path
    matches = matches.splice(1);

    parameters.forEach((parameter, index) => {
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
 * @param {String} query Query string from uri mapping
 * query parameter names.
 * @returns {Function} URI mapper function.
 */
function createUriQueryMapper (query) {
  var parameters = extractQueryParameters(query);
  return (queryValues, args) => {
    queryValues = queryValues || Object.create(null);

    Object.keys(queryValues)
      .forEach(queryKey => {
        var parameter = parameters[queryKey];

        if (!parameter) {
          return;
        }

        var value = util.isArray(queryValues[queryKey]) ?
          queryValues[queryKey]
            .map(parameter.map)
            .filter(value => value !== null) :
          parameter.map(queryValues[queryKey]);

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
function createUriQueryValueMapper (expression) {
  return value => {
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
function getParameterDescriptor (parameter) {
  var parts = parameter.split(SLASHED_BRACKETS_REG_EXP);

  return {
    name: parts[0].trim().substring(1)
  };
}

/**
 * Extracts query parameters to a key-value object
 * @param {String} query
 * @returns {Object} key-value query parameter map
 */
function extractQueryParameters (query) {
  return Object.keys(query.values)
    .reduce((queryParameters, name) => {
      // arrays in routing definitions are not supported
      if (util.isArray(query.values[name])) {
        return queryParameters;
      }

      // escape regular expression characters
      var escaped = query.values[name].replace(EXPRESSION_ESCAPE_REG_EXP, '\\$&');

      // get all occurrences of routing parameters in URI path
      var regExpSource = '^' + escaped.replace(PARAMETER_REG_EXP, URI_QUERY_REPLACEMENT_REG_EXP_SOURCE) + '$';
      var queryParameterMatches = escaped.match(PARAMETER_REG_EXP);

      if (!queryParameterMatches ||
          queryParameterMatches.length === 0) {
        return;
      }

      var parameter = getParameterDescriptor(queryParameterMatches[queryParameterMatches.length - 1]);
      var expression = new RegExp(regExpSource, 'i');
      parameter.map = createUriQueryValueMapper(expression);
      queryParameters[name] = parameter;
      return queryParameters;
    }, Object.create(null));
}

/**
 * Creates a mapper for string route definition
 * @param {String} routeExpression string route uri definition
 * @returns {{expression: RegExp, map: Function}|null} URI mapper object.
 */
function compileStringRouteExpression (routeExpression) {
  var routeUri = new URI(routeExpression);
  routeUri.path = module.exports.removeEndSlash(routeUri.path);
  if (!routeUri) {
    return null;
  }

  // escape regular expression characters
  var escaped = routeUri.path.replace(
    EXPRESSION_ESCAPE_REG_EXP, '\\$&'
  );

  // get all occurrences of routing parameters in URI path
  var regExpSource = '^' + escaped.replace(PARAMETER_REG_EXP, URI_PATH_REPLACEMENT_REG_EXP_SOURCE) + '$';
  var expression = new RegExp(regExpSource, 'i');
  var pathParameterMatches = escaped.match(PARAMETER_REG_EXP);
  var pathParameters = pathParameterMatches ? pathParameterMatches.map(getParameterDescriptor) : null;

  var pathMapper = pathParameters ? createUriPathMapper(expression, pathParameters) : null;
  var queryMapper = routeUri.query ? createUriQueryMapper(routeUri.query) : null;

  return {
    expression: expression,
    map: uri => {
      var args = Object.create(null);

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

/**
 * Creates a mapper for regex route definition
 * @param {RegExp} expression regex route uri definition
 * @returns {{expression: RegExp, map: Function}} URI mapper object.
 */
function compileRegexExpressionRoute (expression) {
  return {
    expression,
    map: () => Object.create(null)
  };
}


