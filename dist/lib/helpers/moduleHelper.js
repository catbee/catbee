'use strict';

var _Promise = require('babel-runtime/core-js/promise')['default'];

var helper = {
  COMPONENT_PREFIX: 'cat-',
  COMPONENT_PREFIX_REGEXP: /^cat-/i,
  COMPONENT_ERROR_TEMPLATE_POSTFIX: '--error',
  DOCUMENT_COMPONENT_NAME: 'document',
  DOCUMENT_ELEMENT_NAME: 'html',
  HEAD_COMPONENT_NAME: 'head',
  ATTRIBUTE_ID: 'id',
  ATTRIBUTE_WATCHER: 'watcher',
  DEFAULT_LOGIC_FILENAME: 'index.js',

  /**
   * Creates name for error template of component.
   * @param {String} componentName name of component.
   * @returns {string} Name of error template of the component.
   */
  getNameForErrorTemplate: function getNameForErrorTemplate(componentName) {
    if (typeof componentName !== 'string') {
      return '';
    }
    return componentName + helper.COMPONENT_ERROR_TEMPLATE_POSTFIX;
  },

  /**
   * Determines if specified component name is the "document" component name.
   * @param {string} componentName Name of the component.
   * @returns {boolean} True if specified component is the "document" component.
   */
  isDocumentComponent: function isDocumentComponent(componentName) {
    return componentName.toLowerCase() === helper.DOCUMENT_COMPONENT_NAME;
  },
  /**
   * Determines if specified component name is the "head" component name.
   * @param {string} componentName Name of the component.
   * @returns {boolean} True if specified component is the "head" component.
   */
  isHeadComponent: function isHeadComponent(componentName) {
    return componentName.toLowerCase() === helper.HEAD_COMPONENT_NAME;
  },

  /**
   * Gets the original component name without prefix.
   * @param {String} fullComponentName Full component name (tag name).
   * @returns {String} The original component name without prefix.
   */
  getOriginalComponentName: function getOriginalComponentName(fullComponentName) {
    if (typeof fullComponentName !== 'string') {
      return '';
    }
    fullComponentName = fullComponentName.toLowerCase();
    if (fullComponentName === helper.HEAD_COMPONENT_NAME) {
      return fullComponentName;
    }
    if (fullComponentName === helper.DOCUMENT_COMPONENT_NAME || fullComponentName === helper.DOCUMENT_ELEMENT_NAME) {
      return helper.DOCUMENT_COMPONENT_NAME;
    }
    return fullComponentName.replace(helper.COMPONENT_PREFIX_REGEXP, '');
  },

  /**
   * Gets valid tag name for component.
   * @param {String} componentName Name of the component.
   * @returns {string} Name of the tag.
   */
  getTagNameForComponentName: function getTagNameForComponentName(componentName) {
    if (typeof componentName !== 'string') {
      return '';
    }
    var upperComponentName = componentName.toUpperCase();
    if (componentName === helper.HEAD_COMPONENT_NAME) {
      return upperComponentName;
    }
    if (componentName === helper.DOCUMENT_COMPONENT_NAME) {
      return helper.DOCUMENT_ELEMENT_NAME.toUpperCase();
    }
    return helper.COMPONENT_PREFIX.toUpperCase() + upperComponentName;
  },

  /**
   * Gets method of the module that can be invoked.
   * @param {Object} module Module implementation.
   * @param {string} prefix Method prefix (i.e. handle).
   * @param {string?} name Name of the entity to invoke method for
   * (will be converted to camel casing).
   * @returns {Function} Method to invoke.
   */
  getMethodToInvoke: function getMethodToInvoke(module, prefix, name) {
    if (!module || typeof module !== 'object') {
      return defaultPromiseMethod;
    }
    var methodName = helper.getCamelCaseName(prefix, name);
    if (typeof module[methodName] === 'function') {
      return module[methodName].bind(module);
    }
    if (typeof module[prefix] === 'function') {
      return module[prefix].bind(module, name);
    }

    return defaultPromiseMethod;
  },

  /**
   * Gets name in camel casing for everything.
   * @param {string} prefix Prefix for the name.
   * @param {string} name Name to convert.
   * @return {string}
   */
  getCamelCaseName: function getCamelCaseName(prefix, name) {
    if (!name) {
      return '';
    }

    var parts = name.split(/[^a-z0-9]/i);
    var camelCaseName = String(prefix || '');

    parts.forEach(function (part) {
      if (!part) {
        return;
      }

      // first character in method name must be in lowercase
      camelCaseName += camelCaseName ? part[0].toUpperCase() : part[0].toLowerCase();
      camelCaseName += part.substring(1);
    });

    return camelCaseName;
  },

  /**
   * Gets safe promise resolved from action.
   * @param {Function} action Action to wrap with safe promise.
   * @returns {Promise}
   */
  getSafePromise: function getSafePromise(action) {
    var result;
    try {
      result = action();
    } catch (e) {
      return _Promise.reject(e);
    }
    return _Promise.resolve(result);
  }
};

/**
 * Just returns resolved promise.
 * @returns {Promise} Promise for nothing.
 */
function defaultPromiseMethod() {
  return _Promise.resolve();
}

module.exports = helper;