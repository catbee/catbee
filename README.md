Catbee [![Build Status](https://travis-ci.org/catbee/catbee.svg?branch=master)](https://travis-ci.org/markuplab/catbee)
======

<img src="https://raw.githubusercontent.com/markuplab/catbee-todomvc/master/logo.png" width="100" height="100" />

## Catbee

Catbee is basic for isomorphic (universal) applications. Library allows to work with SSR (Server Side Rendering) in NodeJS and supports a SPA (Signal Page Application) in your browser.

## Getting Started

To write the application on Catbee you don't need a lot of energy.
The example code below shows a simple isomorphic app.

#### The server-side application.
Code below, run the server on Express.js and intercept requests through the middleware.
Library process request, create routing context and pass it to the view layer. 
In this example, we use custom view layer based on W3C Web Components. 
You can write own, or use one of official packages.

``` javascript
// server.js
var express = require('express');
var catbee = require('catbee');
var components = require('catbee-web-components');
var document = require('./components/document');

var app = express();
var cat = catbee.create();

components.register(cat.locator, document);
cat.registerRoute({ expression: '/' });

app.use(cat.getMiddleware());

app.listen(3000);
```

#### Client-side application.
Client-side application have 2 stages:

1. Initialization application stage.
2. Update application state stage.

At first stage, Catbee wrap History API and send to document renderer init command. 
At second stage, Catbee wait History API events, and send to document renderer update command with new routing context.

``` javascript
// browser.js
var catbee = require('catbee');
var components = require('catbee-web-components');
var document = require('./components/document');

var cat = catbee.create();

components.register(cat.locator, document);
cat.registerRoute({ expression: '/' });

cat.startWhenReady();
```

#### Example of isomorphic component.
In this examples, was used [Catbee Web Components](https://github.com/catbee/catbee-web-components) package as document renderer implementation. Catbee is not promoting any particular approach to rendering HTML, but some of them are officially supported. You can use any library for rendering HTML'a (React, Vue, Angular, Deku ...), with only one condition, library code must be able to work isomorphically.

```
// document.js
class Document {
  template (ctx) {
    return `Hello ${ctx.name}!`;
  }
  
  render () {
    return { name: 'world' }
  }
}

module.exports = {
  constructor: Document
}
```

## Installation

Install core package:

```
npm i catbee --save
```

Install document rednerer package:

```
npm i catbee-web-components --save
```

## List of Document Renderers Packages

[Catbee Web Components](https://github.com/catbee/catbee-web-components)

[WIP] Catbee Vue 

## API Reference

#### Instantiation

`catbee.create(config)`

Create instance of application. Accepts config object as first argument.

```
var config = {
  isRelease: true
};

var cat = catbee.create(config);
```

#### registerRoute(definition)

Register route inside application. 

```
var cat = catbee.create();

cat.registerRoute({
  expression: '/:category/?id=:id',
  args: {
    type: 'news'  
  },
  map: (args) => {
    return args;
  }
})
```
### Browser
#### startWhenReady() 

Start application and wrap History API. 
Return promise that resolve when document will be ready.

### Server
#### getMiddleware()

Return Express/Connect middleware.

## Contributors
Most of code taken from [Catberry](https://github.com/catberry/catberry) isomorphic framework. Thanks [Denis Rechkunov](https://github.com/pragmadash) and all Catberry contributors.
