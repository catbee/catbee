/**
 * __BrowserBundle.js template file
 * @reference builders/BootstrapperBuilder
 */
var Catberry = require('../../browser/Catberry.js');
var BootstrapperBase = require('../../lib/base/BootstrapperBase.js');
var ModuleApiProvider = require('../../browser/providers/ModuleApiProvider');
var CookieWrapper = require('../../browser/CookieWrapper');
var Logger = require('../../browser/Logger.js');

/*eslint-disable */
var watchers = [ /**__watchers**/ ];
var components = [ /**__components**/ ];
var signals = [ /**__signals**/ ];
var routes = '__routes' || [];
/*eslint-enable */

/**
 * Creates new instance of the browser Catberry's bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
class Bootstrapper extends BootstrapperBase {
  constructor () {
    super(Catberry);

    this.create = this.create.bind(this);
  }

  /**
   * Configures Catberry's service locator.
   * @param {Object} configObject Application config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    super.configure(configObject, locator);

    locator.register('moduleApiProvider', ModuleApiProvider, configObject, true);
    locator.register('cookieWrapper', CookieWrapper, configObject, true);
    locator.register('logger', Logger, configObject, true);
    locator.registerInstance('window', window);

    routes.forEach(route => locator.registerInstance('routeDefinition', route));
    watchers.forEach(watcher => locator.registerInstance('watcher', watcher));
    signals.forEach(signal => locator.registerInstance('signal', signal));
    components.forEach(component => locator.registerInstance('component', component));
  }
}

module.exports = new Bootstrapper();
