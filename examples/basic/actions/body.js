var Baobab = require('baobab');

module.exports = {
  setState (args, state) {
    state.set('first', 'Eugene');
  },

  getState (args, state) {
    state.set('last', 'Dementev');
  },

  setComputed (args, state) {
    state.set('fullName', Baobab.monkey({
      cursors: {
        first: ['first'],
        last: ['last']
      },
      get: function(data) {
        return data.first + ' ' + data.last;
      }
    }))
  }
};
