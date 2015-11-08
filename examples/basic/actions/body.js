module.exports = {
  setState (args, state) {
    state.set('hello', 'test');
  },

  getState (args, state) {
    state.set('hello', 'overwritten');
  }
};
