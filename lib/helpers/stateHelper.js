module.exports = {
  /**
   * Get function name
   * @param {Function} fn
   * @returns {String}
   */
  getFunctionName (fn) {
    var name = fn.toString();
    name = name.substr('function '.length);
    name = name.substr(0, name.indexOf('('));
    return name;
  }
};
