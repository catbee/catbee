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
  },

  /**
   * Merge two objects
   * @param {Object} target
   * @param {Object} source
   * @returns {Object}
   */
  merge (target, source) {
    source = source || {};
    return Object
      .keys(source)
      .reduce((target, key) => {
        target[key] = source[key];
        return target;
      }, target);
  }
};
