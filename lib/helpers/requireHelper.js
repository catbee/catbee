module.exports = {
  // Creates absolute path for require.
  getAbsoluteRequirePath (filename) {
    return process.cwd() + '/' + filename;
  },

  // Clears node.js require cache by key.
  clearCacheKey (key) {
    delete require.cache[key];
  },

  // Gets valid require path replacing all backslashes with slashes.
  getValidPath (path) {
    return typeof (path) === 'string' ? path.replace(/\\/g, '\\\\') : '';
  }
};
