var propertyHelper = require('./helpers/propertyHelper');

class ContextFactory {
  /**
   * Creates new instance of the context factory.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @constructor
   */
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
  }

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Creates new context for modules.
   * @param {Object} additional Additional parameters.
   * @param {URI} additional.referrer Current referrer.
   * @param {URI} additional.location Current location.
   * @param {String} additional.userAgent Current user agent.
   * @return {Object}
   */
  create (additional) {
    var apiProvider = this._serviceLocator.resolve('moduleApiProvider');
    var context = Object.create(apiProvider);

    Object
      .keys(additional)
      .forEach((key) => propertyHelper.defineReadOnly(context, key, additional[key]));

    return context;
  }
}

module.exports = ContextFactory;
