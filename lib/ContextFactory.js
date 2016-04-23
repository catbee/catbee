'use strict';

var propertyHelper = require('./helpers/propertyHelper');

class ContextFactory {
  // Creates new instance of the context factory.
  constructor (locator) {
    this._serviceLocator = locator;
  }

  // Creates new context for modules.
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
