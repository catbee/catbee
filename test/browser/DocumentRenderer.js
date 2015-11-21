var Lab = require('lab');
var lab = exports.lab = Lab.script();
var fs = require('fs');
var assert = require('assert');
var events = require('events');
var jsdom = require('jsdom');
var Logger = require('../mocks/Logger');
var Component = require('../mocks/Component');
var ComponentAsync = require('../mocks/ComponentAsync');
var ComponentError = require('../mocks/ComponentError');
var ComponentErrorAsync = require('../mocks/ComponentErrorAsync');
var ContextFactory = require('../../lib/ContextFactory');
var ModuleApiProvider = require('../../lib/providers/ModuleApiProvider');
var CookieWrapper = require('../../browser/CookieWrapper');
var ComponentLoader = require('../../browser/loaders/ComponentLoader');
var DocumentRenderer = require('../../browser/DocumentRenderer');
var ServiceLocator = require('catberry-locator');
var appstate = require('appstate');

lab.experiment('browser/DocumentRenderer', function () {
  lab.experiment('#initWithState', function () {
    lab.test('should init and bind all components in right order', function (done) {
      var html = fs.readFileSync(__dirname + '/../cases/browser/DocumentRenderer/initWithState.html');

      var bindCalls = [];

      function NestComponent() {}

      NestComponent.prototype.bind = function () {
        var id = this.$context.attributes.id ?
        '-' + this.$context.attributes.id : '';
        bindCalls.push(this.$context.name + id);
      };

      var components = [
        {
          name: 'comp',
          constructor: NestComponent,
          templateSource: ''
        },
        {
          name: 'head',
          constructor: NestComponent,
          templateSource: ''
        },
        {
          name: 'document',
          constructor: NestComponent,
          templateSource: ''
        }
      ];

      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = [
        'comp-1',
        'comp-2',
        'comp-3',
        'comp-4',
        'comp-5',
        'comp-6',
        'comp-7',
        'comp-8',
        'comp-9',
        'comp-10',
        'comp-11',
        'comp-12',
        'comp-13',
        'comp-14',
        'comp-15',
        'comp-16',
        'comp-17',
        'comp-18',
        'head',
        'document'
      ];

      eventBus.on('error', done);
      jsdom.env({
        html: html,
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.initWithState({ signal: 'test' }, {})
            .then(function () {
              assert.deepEqual(bindCalls, expected);
              done();
            })
            .catch(done);
        }
      });
    });
  });

  lab.experiment('#renderComponent', function () {
    lab.test('should render component into HTML element', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = 'test<br><div>Hello, World!</div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, expected);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render asynchronous component into HTML element', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = 'test-async<br><div>Hello, World!</div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, expected);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render debug output instead the content when error in debug mode', function (done) {
      var components = [
        {
          name: 'test',
          constructor: ComponentError,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var check = /Error: test/;

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test');
          element.setAttribute('id', 'unique');

          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(check.test(element.innerHTML), true);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render debug output instead the content when error in debug mode', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentErrorAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var check = /Error: test-async/;

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test-async');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(check.test(element.innerHTML), true);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render empty string instead the content when error in release mode', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentErrorAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {
        isRelease: true
      });
      var eventBus = locator.resolve('eventBus');

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test-async');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, '');
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render empty string instead the content when error in release mode', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentErrorAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, { isRelease: true });
      var eventBus = locator.resolve('eventBus');

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test-async');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, '');
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should do nothing if there is no such component', function (done) {
      var components = [];
      var locator = createLocator(components, { isRelease: true });
      var eventBus = locator.resolve('eventBus');


      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, '');
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should do nothing if component is HEAD', function (done) {
      var head = '<title>First title</title>' +
          '<base href="someLink1" target="_parent">' +
          '<noscript>noScript1</noscript>' +
          '<style type="text/css">' +
          'some styles1' +
          '</style>' +
          '<style type="text/css">' +
          'some styles2' +
          '</style>' +
          '<script type="application/javascript">' +
          'some scripts1' +
          '</script>' +
          '<script type="application/javascript">' +
          'some scripts2' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc1">' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc2">' +
          '</script>' +
          '<link rel="stylesheet" href="someStyleLink1">' +
          '<link rel="stylesheet" href="someStyleLink2">' +
          '<meta name="name1" content="value1">' +
          '<meta name="name2" content="value2">' +
          '<meta name="name3" content="value3">';

        var components = [{
          name: 'head',
          templateSource: '<title>Second title</title>',
          constructor: ComponentError
        }];
        var locator = createLocator(components, {});
        var eventBus = locator.resolve('eventBus');

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'head');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          window.document.head.innerHTML = head;
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);

          renderer.renderComponent(window.document.head)
            .then(function () {
              assert.strictEqual(window.document.head.innerHTML, head);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should do nothing if there is no Element\'s ID', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test');

          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, '');
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render nested components', function (done) {
      var components = [
        {
          name: 'test1',
          constructor: ComponentAsync,
          templateSource: '<div>Hello from test1</div>' +
          '<cat-test2 id="unique2"/>'
        },
        {
          name: 'test2',
          constructor: ComponentAsync,
          templateSource: '<span>' +
          'Hello from test2' +
          '<cat-test3 id="unique3"/>' +
          '</span>'
        },
        {
          name: 'test3',
          constructor: ComponentAsync,
          templateSource: 'Hello from test3'

        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = 'test1<br>' +
        '<div>Hello from test1</div>' +
        '<cat-test2 id="unique2">' +
        'test2<br>' +
        '<span>' +
        'Hello from test2' +
        '<cat-test3 id="unique3">' +
        'test3<br>' +
        'Hello from test3' +
        '</cat-test3>' +
        '</span>' +
        '</cat-test2>';

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test1');

          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, expected);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render nested components with cycles', function (done) {
      var components = [
        {
          name: 'test1',
          constructor: ComponentAsync,
          templateSource: '<div>Hello from test1</div>' +
          '<cat-test2 id="unique2"/>'
        },
        {
          name: 'test2',
          constructor: ComponentAsync,
          templateSource: '<span>' +
          'Hello from test2' +
          '<cat-test3 id="unique3"/>' +
          '</span>'
        },
        {
          name: 'test3',
          constructor: ComponentAsync,
          templateSource: '<cat-test1 id="unique1"/>'

        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = 'test1<br>' +
        '<div>Hello from test1</div>' +
        '<cat-test2 id="unique2">' +
        'test2<br>' +
        '<span>' +
        'Hello from test2' +
        '<cat-test3 id="unique3">' +
        'test3<br>' +
        '<cat-test1 id="unique1"></cat-test1>' +
        '</cat-test3>' +
        '</span>' +
        '</cat-test2>';

      eventBus.on('error', done);

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test1');

          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, expected);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should merge HEAD component with new rendered HTML', function (done) {
      var head = '<title>First title</title>' +
          '<base href="someLink1" target="_parent">' +
          '<style type="text/css">' +
          'some styles1' +
          '</style>' +
          '<style type="text/css">' +
          'some styles2' +
          '</style>' +
          '<script type="application/javascript">' +
          'some scripts1' +
          '</script>' +
          '<script type="application/javascript">' +
          'some scripts2' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc1">' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc2">' +
          '</script>' +
          '<link rel="stylesheet" href="someStyleLink1">' +
          '<link rel="stylesheet" href="someStyleLink2">' +
          '<meta name="name1" content="value1">' +
          '<meta name="name2" content="value2">' +
          '<meta name="name3" content="value3">',
        expected = '<title>Second title</title>' +
          '<base href="someLink2" target="_parent">' +
          '<style type="text/css">' +
          'some styles1' +
          '</style>' +
          '<style type="text/css">' +
          'some styles2' +
          '</style>' +
          '<script type="application/javascript">' +
          'some scripts1' +
          '</script>' +
          '<script type="application/javascript">' +
          'some scripts2' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc1">' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc2">' +
          '</script>' +
          '<link rel="stylesheet" href="someStyleLink1">' +
          '<link rel="stylesheet" href="someStyleLink2">' +
          '<meta name="name1" content="value1">' +
          'head<br><noscript>noScript2</noscript>' +
          '<style type="text/css">' +
          'some styles3' +
          '</style>' +
          '<script type="application/javascript">' +
          'some scripts3' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc3">' +
          '</script>' +
          '<link rel="stylesheet" href="someStyleLink3">' +
          '<meta name="name4" content="value4">',
        components = [{
          name: 'head',
          templateSource: '<title>Second title</title>' +
          '<base href="someLink2" target="_parent">' +
          '<noscript>noScript2</noscript>' +
          '<style type="text/css">' +
          'some styles1' +
          '</style>' +
          '<script type="application/javascript">' +
          'some scripts1' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc1">' +
          '</script>' +
          '<link rel="stylesheet" href="someStyleLink1">' +
          '<meta name="name1" content="value1">' +
          '<style type="text/css">' +
          'some styles3' +
          '</style>' +
          '<script type="application/javascript">' +
          'some scripts3' +
          '</script>' +
          '<script type="application/javascript" ' +
          'src="someScriptSrc3">' +
          '</script>' +
          '<link rel="stylesheet" href="someStyleLink3">' +
          '<meta name="name4" content="value4">',
          constructor: Component
        }],
        locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          window.document.head.innerHTML = head;
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(
            DocumentRenderer
          );
          renderer.renderComponent(window.document.head)
            .then(function () {
              assert.strictEqual(
                window.document.head.innerHTML, expected
              );
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should bind all events from bind method', function (done) {
      function Component1() {}
      Component1.prototype.render = function () {
        return this.$context;
      };
      Component1.prototype.bind = function () {
        return {
          click: {
            'a.clickable': function (event) {
              event.target.innerHTML += 'Component1';
            }
          }
        };
      };

      function Component2() {}
      Component2.prototype.render = function () {
        return this.$context;
      };
      Component2.prototype.bind = function () {
        return {
          click: {
            'a.clickable': function (event) {
              event.currentTarget.innerHTML = 'Component2';
            }
          }
        };
      };

      var components = [
        {
          name: 'test1',
          constructor: Component1,
          templateSource: '<div><a class="clickable"></a></div>' +
          '<cat-test2 id="unique2"/>'
        },
        {
          name: 'test2',
          constructor: Component2,
          templateSource: '<span><a class="clickable"></a></span>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      var expected = 'test1<br><div><a class="clickable">' +
        'Component1' +
        '</a></div>' +
        '<cat-test2 id="unique2">' +
        'test2<br>' +
        '<span><a class="clickable">' +
        'Component2Component1' +
        '</a></span>' +
        '</cat-test2>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test1');
          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              var event,
                links = element.querySelectorAll('a.clickable');
              for (var i = 0; i < links.length; i++) {
                event = window.document
                  .createEvent('MouseEvents');
                event.initEvent('click', true, true);
                links[i].dispatchEvent(event);
              }

              setTimeout(function () {
                assert.strictEqual(element.innerHTML, expected);
                done();
              }, 10);
            })
            .catch(done);
        }
      });
    });

    lab.test('should handle dispatched events', function (done) {
      function Component1() {}
      Component1.prototype.render = function () {
        return this.$context;
      };
      Component1.prototype.bind = function () {
        return {
          click: {
            'a.clickable': function (event) {
              event.target.parentNode.innerHTML += 'Component1';
              event.currentTarget
                .parentNode.innerHTML += 'Component1';
            }
          }
        };
      };

      var components = [
        {
          name: 'test1',
          constructor: Component1,
          templateSource: '<div><a class="clickable">' +
          '<span><div class="toclick"></div></span>' +
          '</a></div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      var expected = 'test1<br><div><a class="clickable">' +
        '<span><div class="toclick"></div>Component1</span>' +
        '</a>Component1</div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test1');
          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              var event,
                toClick = element.querySelectorAll('div.toclick');
              for (var i = 0; i < toClick.length; i++) {
                event = window.document
                  .createEvent('MouseEvents');
                event.initEvent('click', true, true);
                toClick[i].dispatchEvent(event);
              }

              setTimeout(function () {
                assert.strictEqual(element.innerHTML, expected);
                done();
              }, 10);
            })
            .catch(done);
        }
      });
    });

    lab.test('should do nothing if event selector does not match', function (done) {
      function Component1() {}
      Component1.prototype.render = function () {
        return this.$context;
      };
      Component1.prototype.bind = function () {
        return {
          click: {
            'a.non-clickable': function (event) {
              event.target.innerHTML = 'Component1';
            }
          }
        };
      };

      var components = [
        {
          name: 'test1',
          constructor: Component1,
          templateSource: '<div><a class="clickable"></a></div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      var expected = 'test1<br><div><a class="clickable"></a></div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test1');
          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              var event,
                links = element.querySelectorAll('a.clickable');
              for (var i = 0; i < links.length; i++) {
                event = window.document
                  .createEvent('MouseEvents');
                event.initEvent('click', true, true);
                links[i].dispatchEvent(event);
              }

              setTimeout(function () {
                assert.strictEqual(element.innerHTML, expected);
                done();
              }, 10);
            })
            .catch(done);
        }
      });
    });

    lab.test('should do nothing if event handler is not a function', function (done) {
      function Component1() {}
      Component1.prototype.render = function () {
        return this.$context;
      };
      Component1.prototype.bind = function () {
        return {
          click: {
            'a.clickable': 'wrong'
          }
        };
      };

      var components = [
        {
          name: 'test1',
          constructor: Component1,
          templateSource: '<div><a class="clickable"></a></div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      var expected = 'test1<br><div><a class="clickable"></a></div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test1');
          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              var event,
                links = element.querySelectorAll('a.clickable');
              for (var i = 0; i < links.length; i++) {
                event = window.document
                  .createEvent('MouseEvents');
                event.initEvent('click', true, true);
                links[i].dispatchEvent(event);
              }

              setTimeout(function () {
                assert.strictEqual(element.innerHTML, expected);
                done();
              }, 10);
            })
            .catch(done);
        }
      });
    });

    lab.test('should unbind all events and call unbind', function (done) {
      var bindCounters = {
        first: 0,
        second: 0
      };
      var unbindCounters = {
        first: 0,
        second: 0
      };
      function Component1() {}
      Component1.prototype.render = function () {
        return this.$context;
      };
      Component1.prototype.bind = function () {
        bindCounters.first++;
        if (bindCounters.first > 1) {
          return;
        }
        return {
          click: {
            'a.clickable': function (event) {
              event.target.innerHTML = 'Component1';
            }
          }
        };
      };
      Component1.prototype.unbind = function () {
        unbindCounters.first++;
      };

      function Component2() {}
      Component2.prototype.render = function () {
        return this.$context;
      };
      Component2.prototype.bind = function () {
        bindCounters.second++;
        if (bindCounters.second > 1) {
          return;
        }
        return {
          click: {
            'a.clickable': function (event) {
              event.target.innerHTML = 'Component2';
            }
          }
        };
      };
      Component2.prototype.unbind = function () {
        unbindCounters.second++;
      };

      var components = [
        {
          name: 'test1',
          constructor: Component1,
          templateSource: '<div><a class="clickable"></a></div>' +
          '<cat-test2 id="unique2"/>'
        },
        {
          name: 'test2',
          constructor: Component2,
          templateSource: '<span><a class="clickable"></a></span>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      var expected = 'test1<br><div><a class="clickable">' +
        '</a></div>' +
        '<cat-test2 id="unique2">' +
        'test2<br>' +
        '<span><a class="clickable">' +
        '</a></span>' +
        '</cat-test2>';

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test1');
          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              return renderer.renderComponent(element);
            })
            .then(function () {
              var event,
                links = element.querySelectorAll('a.clickable');
              for (var i = 0; i < links.length; i++) {
                event = window.document
                  .createEvent('MouseEvents');
                event.initEvent('click', true, true);
                links[i].dispatchEvent(event);
              }

              setTimeout(function () {
                assert.strictEqual(element.innerHTML, expected);
                assert.strictEqual(bindCounters.first, 2);
                assert.strictEqual(bindCounters.second, 2);
                assert.strictEqual(unbindCounters.first, 1);
                assert.strictEqual(unbindCounters.second, 1);
                done();
              }, 10);
            })
            .catch(done);
        }
      });
    });

    lab.test('should use the same component instance if it\'s element recreated after rendering', function (done) {
      var instances = {
        first: [],
        second: [],
        third: []
      };
      function Component1() {
        instances.first.push(this);
      }
      Component1.prototype.render = function () {
        return this.$context;
      };
      function Component2() {
        instances.second.push(this);
      }
      Component2.prototype.render = function () {
        return this.$context;
      };
      function Component3() {
        instances.third.push(this);
      }
      Component3.prototype.render = function () {
        return this.$context;
      };
      var components = [
        {
          name: 'test1',
          constructor: Component1,
          templateSource: '<div>Hello from test1</div>' +
          '<cat-test2 id="unique2"/>'
        },
        {
          name: 'test2',
          constructor: Component2,
          templateSource: '<span>' +
          'Hello from test2' +
          '<cat-test3 id="unique3"/>' +
          '</span>'
        },
        {
          name: 'test3',
          constructor: Component3,
          templateSource: 'Hello from test3'

        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test1');
          element.setAttribute('id', 'unique1');
          renderer.renderComponent(element)
            .then(function () {
              return renderer.renderComponent(element);
            })
            .then(function () {
              return renderer.renderComponent(element);
            })
            .then(function () {
              assert.strictEqual(instances.first.length, 1);
              assert.strictEqual(instances.second.length, 1);
              assert.strictEqual(instances.third.length, 1);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should use new component instance if it\'s element removed after rendering', function (done) {
      var instances = {
        first: [],
        second: [],
        third: []
      };
      var templates = {},
        counter = 0,
        templateProvider = {
          registerCompiled: function (name, source) {
            templates[name] = source;
          },
          render: function (name) {
            if (counter % 2 === 0) {
              return Promise.resolve('');
            }

            return Promise.resolve(templates[name]);
          }
        };
      function Component1() {
        instances.first.push(this);
      }
      Component1.prototype.render = function () {
        return this.$context;
      };
      function Component2() {
        instances.second.push(this);
      }
      Component2.prototype.render = function () {
        return this.$context;
      };
      function Component3() {
        instances.third.push(this);
      }
      Component3.prototype.render = function () {
        return this.$context;
      };
      var components = [
        {
          name: 'test1',
          constructor: Component1,
          templateSource: '<div>Hello from test1</div>' +
          '<cat-test2 id="unique2"/>'
        },
        {
          name: 'test2',
          constructor: Component2,
          templateSource: '<span>' +
          'Hello from test2' +
          '<cat-test3 id="unique3"/>' +
          '</span>'
        },
        {
          name: 'test3',
          constructor: Component3,
          templateSource: 'Hello from test3'

        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          locator.registerInstance(
            'templateProvider', templateProvider
          );
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test1');
          element.setAttribute('id', 'unique1');
          counter++;
          renderer.renderComponent(element)
            .then(function () {
              counter++;
              return renderer.renderComponent(element);
            })
            .then(function () {
              counter++;
              return renderer.renderComponent(element);
            })
            .then(function () {
              assert.strictEqual(instances.first.length, 1);
              assert.strictEqual(instances.second.length, 2);
              assert.strictEqual(instances.third.length, 2);
              done();
            })
            .catch(done);
        }
      });
    });
  });

  lab.experiment('#createComponent', function () {
    lab.test('should properly create and render component', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      var expected = 'test<br><div>Hello, World!</div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.createComponent('cat-test', {
              id: 'unique'
            })
            .then(function (element) {
              assert.strictEqual(element.innerHTML, expected);
              assert.strictEqual(
                renderer
                  .getComponentByElement(element) instanceof
                Component, true
              );
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should properly bind nested components', function (done) {
      var components = [
        {
          name: 'test1',
          constructor: Component,
          templateSource: '<div>Hello from test1!</div>' +
          '<cat-test2 id="test2"></cat-test2>' +
          '<cat-test3 id="test3"></cat-test3>'
        },
        {
          name: 'test2',
          constructor: Component,
          templateSource: '<div>Hello from test2!</div>'
        },
        {
          name: 'test3',
          constructor: Component,
          templateSource: '<div>Hello from test3!</div>'
        },
        {
          name: 'test4',
          constructor: Component,
          templateSource: '<div>Hello from test4!</div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      var expected1 = 'test1<br><div>Hello from test1!</div>' +
        '<cat-test2 id="test2">' +
        'test2<br><div>Hello from test2!</div>' +
        '</cat-test2>' +
        '<cat-test3 id="test3">' +
        'test3<br><div>Hello from test3!</div>' +
        '</cat-test3>';

      var expected2 = 'test4<br><div>Hello from test4!</div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.createComponent('cat-test1', {
              id: 'test1'
            })
            .then(function (element) {
              assert.strictEqual(element.innerHTML, expected1);
              return renderer.createComponent(
                'cat-test4', {
                  id: 'test4'
                }
              );
            })
            .then(function (element) {
              assert.strictEqual(element.innerHTML, expected2);
              assert.strictEqual(
                renderer.getComponentById('test1') instanceof
                Component, true
              );
              assert.strictEqual(
                renderer.getComponentById('test2') instanceof
                Component, true
              );
              assert.strictEqual(
                renderer.getComponentById('test3') instanceof
                Component, true
              );
              assert.strictEqual(
                renderer.getComponentById('test4') instanceof
                Component, true
              );

              return renderer.collectGarbage();
            })
            .then(function () {
              assert.strictEqual(
                renderer.getComponentById('test1'), null
              );
              assert.strictEqual(
                renderer.getComponentById('test2'), null
              );
              assert.strictEqual(
                renderer.getComponentById('test3'), null
              );
              assert.strictEqual(
                renderer.getComponentById('test4'), null
              );

              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should reject promise if wrong component', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.createComponent('cat-wrong', {
              id: 'unique'
            })
            .then(function () {
              done(new Error('Should fail'));
            })
            .catch(function (reason) {
              assert.strictEqual(
                reason.message,
                'Component for tag "cat-wrong" not found'
              );
              done();
            });
        }
      });
    });

    lab.test('should reject promise if ID is not specified', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.createComponent('cat-test', {})
            .then(function () {
              done(new Error('Should fail'));
            })
            .catch(function (reason) {
              assert.strictEqual(
                reason.message,
                'The ID is not specified or already used'
              );
              done();
            });
        }
      });
    });

    lab.test('should reject promise if ID is already used', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.createComponent('cat-test', {
              id: 'some'
            })
            .then(function () {
              return renderer.createComponent(
                'cat-test', {
                  id: 'some'
                }
              );
            })
            .then(function () {
              done(new Error('Should fail'));
            })
            .catch(function (reason) {
              assert.strictEqual(
                reason.message,
                'The ID is not specified or already used'
              );
              done();
            });
        }
      });
    });

    lab.test('should reject promise if tag name is not a string', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.createComponent(500, {
              id: 'some'
            })
            .then(function () {
              done(new Error('Should fail'));
            })
            .catch(function (reason) {
              assert.strictEqual(
                reason.message,
                'Tag name should be a string ' +
                'and attributes should be an object'
              );
              done();
            });
        }
      });
    });

    lab.test('should reject promise if attributes set is not an object', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {}),
        eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.createComponent('cat-test', 100)
            .then(function () {
              done(new Error('Should fail'));
            })
            .catch(function (reason) {
              assert.strictEqual(
                reason.message,
                'Tag name should be a string ' +
                'and attributes should be an object'
              );
              done();
            });
        }
      });
    });
  });

  lab.experiment('#collectGarbage', function () {
    lab.test('should unlink component if it is not in DOM', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        },
        {
          name: 'head',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer),
            element = window.document.createElement('cat-test');
          element.setAttribute('id', 'unique');
          Promise.all([
              renderer.createComponent('cat-test', {
                id: 'unique1'
              }),
              renderer.createComponent('cat-test', {
                id: 'unique2'
              })
            ])
            .then(function (elements) {
              window.document.body.appendChild(elements[0]);
              var instance1 = renderer.getComponentById('unique1');
              var instance2 = renderer.getComponentById('unique2');
              assert.strictEqual(
                instance1 instanceof Component, true
              );
              assert.strictEqual(
                instance2 instanceof Component, true
              );
              return renderer.collectGarbage();
            })
            .then(function () {
              var instance1 = renderer.getComponentById(
                'unique1'
                ),
                instance2 = renderer.getComponentById(
                  'unique2'
                );
              assert.strictEqual(
                instance1 instanceof Component, true
              );
              assert.strictEqual(instance2, null);
              done();
            })
            .catch(done);
        }
      });
    });
  });
});

function createLocator(components, config, watchers, actions = []) {
  var locator = new ServiceLocator();

  components.forEach(function (component) {
    locator.registerInstance('component', component);
  });

  locator.registerInstance('signalLoader', {
    load: function () {
      return Promise.resolve();
    },
    getSignalsByNames: function () {
      var name = 'test';
      var fn = appstate.create(name, actions);
      var signals = Object.create(null);
      signals[name] = fn;
      return signals;
    }
  });

  locator.registerInstance('watcherLoader', {
    load: function () {
      return Promise.resolve();
    },
    getWatchersByNames: function () {
      return watchers;
    }
  });

  locator.register('componentLoader', ComponentLoader, config, true);
  locator.register('contextFactory', ContextFactory, config, true);
  locator.register('moduleApiProvider', ModuleApiProvider, config);
  locator.register('cookieWrapper', CookieWrapper, config);
  locator.register('logger', Logger);
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', config);
  locator.registerInstance('eventBus', new events.EventEmitter());

  var templates = {};
  locator.registerInstance('templateProvider', {
    registerCompiled: function (name, compiled) {
      templates[name] = compiled;
    },
    render: function (name, context) {
      return Promise.resolve(
        context.name + '<br>' + templates[name]
      );
    }
  });
  return locator;
}
