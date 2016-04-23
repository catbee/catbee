'use strict';

var propertyHelper = require('./../helpers/propertyHelper');
var ModuleApiProviderBase = require('./../base/ModuleApiProviderBase');
var util = require('util');

const SCRIPT_TAG_REGEXP = /<(\/)?(script)>/ig;
const SCRIPT_TAG_REPLACEMENT = '&lt;$1$2&gt;';
const SCRIPT_REDIRECT_FORMAT = 'window.location.assign(\'%s\');';
const SCRIPT_SET_COOKIE_FORMAT = 'window.document.cookie = \'%s\';';
const SCRIPT_CLEAR_FRAGMENT_FORMAT = 'window.location.hash = \'\';';
const SCRIPT_ELEMENT_FORMAT = `<script>%s</script>`;

class ModuleApiProvider extends ModuleApiProviderBase {
  // Creates new instance of the module API provider.
  constructor ($serviceLocator) {
    super($serviceLocator);

    propertyHelper.defineReadOnly(this, 'isBrowser', false);
    propertyHelper.defineReadOnly(this, 'isServer', true);

    this.actions = {
      redirectedTo: '',
      isNotFoundCalled: false,
      isFragmentCleared: false
    };
  }

  // Sets not found flag that means Catbee should pass control to another middleware.
  notFound () {
    this.actions.isNotFoundCalled = true;
    return Promise.resolve();
  }

  // Redirects current page to specified URI.
  redirect (uriString) {
    this.actions.redirectedTo = uriString;
    return Promise.resolve();
  }

  // Clears current URI's fragment.
  clearFragment () {
    this.actions.isFragmentCleared = true;
    return Promise.resolve();
  }

  // Gets inline script for making stored actions.
  getInlineScript () {
    var scriptLines = '';

    if (this.cookie.setCookie.length > 0) {
      this.cookie.setCookie.forEach(cookieSetup => {
        scriptLines += util.format(SCRIPT_SET_COOKIE_FORMAT, escapeString(cookieSetup));
      });
      this.cookie.setCookie = [];
    }

    if (this.actions.redirectedTo) {
      scriptLines += util.format(SCRIPT_REDIRECT_FORMAT, escapeString(this.actions.redirectedTo));
      this.actions.redirectedTo = null;
    }

    if (this.actions.isFragmentCleared) {
      scriptLines += util.format(SCRIPT_CLEAR_FRAGMENT_FORMAT);
      this.actions.isFragmentCleared = false;
    }

    if (scriptLines.length > 0) {
      scriptLines = scriptLines.replace(SCRIPT_TAG_REGEXP, SCRIPT_TAG_REPLACEMENT);
      scriptLines = util.format(SCRIPT_ELEMENT_FORMAT, scriptLines);
    }

    return scriptLines;
  }
}

// Escapes string with inline script.
function escapeString (str) {
  return str.replace(/['\\]/g, '\\$&');
}

module.exports = ModuleApiProvider;
