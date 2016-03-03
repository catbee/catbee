Catbee [![Build Status](https://travis-ci.org/markuplab/catbee.svg?branch=master)](https://travis-ci.org/markuplab/catbee)
======

<img src="https://raw.githubusercontent.com/markuplab/catbee-todomvc/master/logo.png" width="100" height="100" />

High level isomorphic framework based on best practices from Catberry, Baobab and Cerebral.

Catbee is [Catberry](https://github.com/catberry/catberry) small brother (read as fork). Unlike the Catberry, Catbee use "Single State Tree" conception.
All state mutations run in signals, and powered by [AppState](https://github.com/markuplab/appstate) module.

#### Examples
[Catbee TodoMVC](https://github.com/markuplab/catbee-todomvc)

#### API changes between Catberry and Catbee

Main changes in Catbee affected to data flow architecture. All data focused in [Baobab tree](https://github.com/Yomguithereal/baobab), instead of distributed flux stores in Catberry. Tree contains full application state, and have 2 interfaces: modify API also known as "Signals", and read API also known as "Watchers". 

Signal is signular way to modify state tree. It's look like middleware, but more flexible and adopted for sync/async operations. You can read more about signals [here](http://cerebraljs.com) and [here](https://github.com/markuplab/appstate). Now, we recommend run signal on every user actions, when you need change application state, and also signal automaticly run on every url change. 

Signals use "composition" conception, and contains array of independant functions. It's very simple way to maintain big codebase.

```js
var signal = [
  setLoading, // Sync function
  [ // Here we run parallel functions
    getUser, { // Async function with 2 outputs success and error
      success: [setUser], // Run if we call output.success in getUser
      error: [setUserError] // Run if we call output.error in getUser
    },
    getNews, { // It's function will run paraller with getUser, like Promise.all
      loaded: [setNews],
      error: [setNewsError]
    }
  ],
  unsetLoading
];
```

Components can access data by [watchers](https://github.com/Yomguithereal/baobab#specialized-getters). We have 2 main reasons to use watchers. We need data context for template rendering, and also we need state update events to rerender component. You don't need bind watchers manually, it's inside Catbee. 

```js
// Here we use simple Baobab.watch API
module.exports = {
  news: ['news', 'data'],
  isVisible: ['news', 'UIState', 'isVisible']
};

// You can also use Baobab.watch dynamicly
module.exports = function (attributes) {
  // Here attributes is <cat-component id="unique" cat-id="1" watcher= "dynamic"></cat-component>
  var id = attributes['cat-id'];
  
  return {
    title: ['news', 'data', { id: id }, 'title']
  };
}
```

#### Stores reworked to Watchers
No more stores. Watchers binded to component like stores, by attribute `watcher`. Also you don't need run this.$context.changed, it's run automaticly. 

```js
this.$context.getStoreData -> this.$context.getWatcherData // -> Promise
```

#### this.$context.sendAction() reworked to this.$context.signal()
No more actions. All activity and logic centralized in signals. All signals load/reload/register automaticly by Catbee, you can look [example here](https://github.com/markuplab/catbee-todomvc/tree/master/signals).

#### New routing definition style
```js
module.exports = [
  {
    expression: '/news/:id', // id is dynamic arg
    signal: 'newsRoute',
    map: mapFn,
    args: {
      page: 'newsCard' // static args
    }
  }
];
```

#### New logger system
Catbee use winston as server logger instead Log4js used in Catberry. Also we add special [YAML-like](https://github.com/eugeny-dementev/winston-console-formatter) console formatter.

#### this.$context.state
State instance available in this.$context as read-only object.

### context.headers
Request headers object. Available only on server side.

#### Silent redirects
On every URL change, we run signal, sometime it's little overhead. You can change URL without signal execution.
`this.$context.redirect('/some/url?filter=active', { silent: true });`

#### Browserify Plugins
Catberry support browserify transforms, we also support pluggins.

Example here: https://github.com/markuplab/catbee-boilerplate/blob/master/services/browserify/cssmodules/index.js

#### All other API fully compatible with Catberry
http://catberry.org/documentation

#### You can get more infomation here:

[Boilerplate](https://github.com/markuplab/catbee-boilerplate)

[Component Generator](https://github.com/markuplab/generator-catbee)

#### Big thanx to Denis Rechkunov, Catberry, Baobab and Cerebral contributors for cool projects.
