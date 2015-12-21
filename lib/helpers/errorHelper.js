var util = require('util');

var TITLE = `Catbee@1.2.1 (<a href="https://github.com/markuplab/catbee/issues "target="_blank">report an issue</a>)`;
var AMP = /&/g;
var LT = /</g;
var GT = />/g;
var QUOT = /\"/g;
var SINGLE_QUOT = /\'/g;
var ERROR_MESSAGE_REGEXP = /^(?:[\w$]+): (?:.+)\r?\n/i;
var ERROR_MESSAGE_FORMAT = `<span style="color: red; font-size: 16pt; font-weight: bold;">%s%s</span>`;
var NEW_LINE = /\r?\n/g;

module.exports = {
  /**
   * Prints error with pretty formatting.
   * @param {Error} error Error to print.
   * @param {string} userAgent User agent information.
   * @returns {string} HTML with all information about error.
   */
  prettyPrint (error, userAgent) {
    if (!error || typeof (error) !== 'object') {
      return '';
    }

    var dateString = (new Date()).toUTCString() + ';<br/>';
    var userAgentString = (userAgent ? (userAgent + ';<br/>') : '');
    var name = (typeof (error.name) === 'string' ? error.name + ': ' : '');
    var message = String(error.message || '');
    var stack = String(error.stack || '').replace(ERROR_MESSAGE_REGEXP, '');
    var fullMessage = util.format(ERROR_MESSAGE_FORMAT, escape(name), escape(message));

    return '<div style="background-color: white; font-size: 12pt;">' +
      dateString +
      userAgentString +
      TITLE + '<br/><br/>' +
      fullMessage + '<br/><br/>' +
      escape(stack) +
      '</div>';
  }
};

/**
 * Escapes error text.
 * @param {string} value Error text.
 * @returns {string} escaped and formatted string.
 */
function escape (value) {
  return value
    .replace(AMP, '&amp;')
    .replace(LT, '&lt;')
    .replace(GT, '&gt;')
    .replace(QUOT, '&quot;')
    .replace(SINGLE_QUOT, '&#39;')
    .replace(NEW_LINE, '<br/>');
}
