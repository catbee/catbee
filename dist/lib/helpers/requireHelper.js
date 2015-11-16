'use strict';

module.exports = {
  /**
   * Creates absolute path for require.
   * @param {string} filename Path to file.
   * @returns {string} Absolute path.
   */
  getAbsoluteRequirePath: function getAbsoluteRequirePath(filename) {
    return process.cwd() + '/' + filename;
  },

  /**
   * Clears node.js require cache by key.
   * @param {string} key Cache key.
   */
  clearCacheKey: function clearCacheKey(key) {
    delete require.cache[key];
  },

  /**
   * Gets valid require path replacing all backslashes with slashes.
   * @param {String} path Path to file.
   * @returns {String} Valid require path.
   */
  getValidPath: function getValidPath(path) {
    return typeof path === 'string' ? path.replace(/\\/g, '\\\\') : '';
  }
};