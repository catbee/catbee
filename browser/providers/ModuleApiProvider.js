var propertyHelper = require('../../lib/helpers/propertyHelper');
var ModuleApiProviderBase = require('../../lib/base/ModuleApiProviderBase');

class ModuleApiProvider extends ModuleApiProviderBase {
  // Creates new instance of the module API provider.
  constructor (locator) {
    super(locator);

    propertyHelper.defineReadOnly(this, 'isBrowser', true);
    propertyHelper.defineReadOnly(this, 'isServer', false);
  }

  // Reloads the page for handling "not found" error.
  notFound () {
    var window = this.locator.resolve('window');
    window.location.reload();
    return Promise.resolve();
  }

  // Redirects current page to specified URI.
  redirect (uriString, options) {
    var requestRouter = this.locator.resolve('requestRouter');
    return requestRouter.go(uriString, options);
  }

  // Clears current location URI's fragment.
  clearFragment () {
    var window = this.locator.resolve('window');
    var position = window.document.body.scrollTop;

    window.location.hash = '';
    window.document.body.scrollTop = position;

    return Promise.resolve();
  }
}

module.exports = ModuleApiProvider;
