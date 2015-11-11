var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var events = require('events');
var URI = require('catberry-uri').URI;
var ServiceLocator = require('catberry-locator');
var CookieWrapper = require('../../lib/CookieWrapper');
var DocumentRenderer = require('../../lib/DocumentRenderer');
var ModuleApiProvider = require('../../lib/providers/ModuleApiProvider');
var ContextFactory = require('../../lib/ContextFactory');
var ServerResponse = require('../mocks/ServerResponse');
var ComponentAsync = require('../mocks/ComponentAsync');
var Component = require('../mocks/Component');
var ComponentErrorAsync = require('../mocks/ComponentErrorAsync');
var ComponentError = require('../mocks/ComponentError');
var State = require('../../lib/State');
var appstate = require('appstate');

lab.experiment('lib/DocumentRenderer', function() {
  lab.experiment('#render', function() {
    lab.test('should render nothing if no such component', function (done) {

      var components = {
        document: {
          name: 'document',
          constructor: ComponentAsync,
          template: {
            render: function (context) {
              var template = `<!DOCTYPE html>
              <html>
              <head><title>Hello</title></head>
              <body>
              document – ${context.name}
              <cat-comp id="1"></cat-comp>
              <cat-async-comp id="2"/>
              </body>
              </html>`;
              return Promise.resolve(template);
            }
          }
        }
      };

      var routingContext = createRoutingContext({}, {}, components);
      var expected = `<!DOCTYPE html>
              <html>
              <head><title>Hello</title></head>
              <body>
              document – document
              <cat-comp id="1"></cat-comp>
              <cat-async-comp id="2"/>
              </body>
              </html>`;

      var documentRenderer = routingContext.locator.resolve('documentRenderer');

      documentRenderer.render({
        signal: 'test',
        args: {}
      }, routingContext);

      routingContext.middleware.response
        .on('error', done)
        .on('finish', () => {
          assert.strictEqual(routingContext.middleware.response.result, expected, 'Wrong HTML');
          done();
        });
    });

    lab.test('should ignore second head and document tags', function(done) {
      var components = {
        document: {
          name: 'document',
          constructor: ComponentAsync,
          template: {
            render: function (context) {
              var template = `<!DOCTYPE html>
                <html>
                <head></head>
                <body>
                document – ${context.name}
                <head></head>
                <document></document>
                </body>
                </html>`;
              return Promise.resolve(template);
            }
          }
        },
        head: {
          name: 'head',
          constructor: ComponentAsync,
          template: {
            render: function (context) {
              var template = `<title>head – ${context.name}</title>`;
              return Promise.resolve(template);
            }
          }
        }
      };
      var routingContext = createRoutingContext({}, {}, components);
      var expected = `<!DOCTYPE html>
                <html>
                <head><title>head – head</title></head>
                <body>
                document – document
                <head></head>
                <document></document>
                </body>
                </html>`;

      var documentRenderer = routingContext.locator.resolve('documentRenderer');

      documentRenderer.render({
        signal: 'test',
        args: {}
      }, routingContext);

      routingContext.middleware.response
        .on('error', done)
        .on('finish', function () {
          assert.strictEqual(routingContext.middleware.response.result, expected, 'Wrong HTML');
          done();
        });
    });

    lab.test('should properly render components without watchers', function (done) {
      var components = {
        document: {
          name: 'document',
          constructor: ComponentAsync,
          template: {
            render: function (context) {
              var template = '<!DOCTYPE html>' +
                '<html>' +
                '<head></head>' +
                '<body>' +
                'document – ' + context.name +
                '<cat-comp id="1"></cat-comp>' +
                '<cat-async-comp id="2"></cat-async-comp>' +
                '</body>' +
                '</html>';
              return Promise.resolve(template);
            }
          }
        },
        head: {
          name: 'head',
          constructor: ComponentAsync,
          template: {
            render: function (context) {
              var template = '<title>' +
                'head – ' + context.name +
                '</title>';
              return Promise.resolve(template);
            }
          }
        },
        comp: {
          name: 'comp',
          constructor: Component,
          template: {
            render: function (context) {
              var template = '<div>' +
                'content – ' + context.name +
                '</div>';
              return Promise.resolve(template);
            }
          }
        },
        'async-comp': {
          name: 'async-comp',
          constructor: ComponentAsync,
          template: {
            render: function (context) {
              var template = '<div>' +
                'test – ' + context.name +
                '</div>';
              return Promise.resolve(template);
            }
          }
        }
      };

      var routingContext = createRoutingContext({}, {}, components);
      var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title>head – head</title></head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"1\"><div>content – comp</div></cat-comp>' +
        '<cat-async-comp id=\"2\">' +
        '<div>test – async-comp</div>' +
        '</cat-async-comp>' +
        '</body>' +
        '</html>';

      var documentRenderer = routingContext.locator.resolve('documentRenderer');
      documentRenderer.render({
        signal: 'test',
        args: {}
      }, routingContext);

      routingContext.middleware.response
        .on('error', done)
        .on('finish', function () {
          assert.strictEqual(routingContext.middleware.response.result, expected, 'Wrong HTML');
          done();
        });
    });
  });

  lab.test('should properly render errors in components', function(done) {
    var errorTemplate = {
      render: function (context) {
        return Promise.resolve('Error: ' + context.message);
      }
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="1"></cat-comp>' +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentErrorAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: ComponentError,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<div>' +
              'content – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentErrorAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({ isRelease: true }, {}, components);
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head>Error: head</head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"1\">Error: comp</cat-comp>' +
        '<cat-async-comp id=\"2\">' +
        'Error: async-comp' +
        '</cat-async-comp>' +
        '</body>' +
        '</html>';

    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    documentRenderer.render({
      signal: '',
      args: {}
    }, routingContext);

    routingContext.middleware.response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(routingContext.middleware.response.result, expected, 'Wrong HTML');
        done();
      });
  });

  lab.test('should properly render errors in component constructor', function (done) {
    function ErrorConstructor() {
      throw new Error('test');
    }

    var errorTemplate = {
      render: function (context) {
        return Promise.resolve('Error: ' + context.message);
      }
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="1"></cat-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentErrorAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: ErrorConstructor,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<div>' +
              'content – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({ isRelease: true }, {}, components);
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head>Error: head</head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"1\">Error: test</cat-comp>' +
        '</body>' +
        '</html>';

    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    documentRenderer.render({
      signal: 'test',
      args: {}
    }, routingContext);

    routingContext.middleware.response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(routingContext.middleware.response.result, expected, 'Wrong HTML');
        done();
      });
  });

  lab.test('should properly render nothing if error in error template', function (done) {
    var errorTemplate = {
      render: function () {
        throw new Error('template');
      }
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="1"></cat-comp>' +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentErrorAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: ComponentError,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<div>' +
              'content – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentErrorAsync,
        errorTemplate: errorTemplate,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({ isRelease: true }, {}, components);
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head></head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"1\"></cat-comp>' +
        '<cat-async-comp id=\"2\">' +
        '</cat-async-comp>' +
        '</body>' +
        '</html>';

    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    documentRenderer.render({}, routingContext);

    routingContext.middleware.response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(
          routingContext.middleware.response.result, expected, 'Wrong HTML');
        done();
      });
  });

  lab.test('should properly render debug info', function (done) {
    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="1"></cat-comp>' +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentErrorAsync,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: ComponentError,
        template: {
          render: function (context) {
            var template = '<div>' +
              'content – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentErrorAsync,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({}, {}, components);
    var documentRenderer = routingContext.locator.resolve('documentRenderer');

    documentRenderer.render({
      signal: 'test',
      args: {}
    }, routingContext);

    routingContext.middleware.response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(routingContext.middleware.response.result.length > 0, true, 'Wrong HTML');
        done();
      });
  });

  lab.test('should set code 200 and required headers', function (done) {
    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="1"></cat-comp>' +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: Component,
        template: {
          render: function (context) {
            var template = '<div>' +
              'content – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({}, {}, components);
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title>head – head</title></head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"1\"><div>content – comp</div></cat-comp>' +
        '<cat-async-comp id=\"2\">' +
        '<div>test – async-comp</div>' +
        '</cat-async-comp>' +
        '</body>' +
        '</html>';

    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    documentRenderer.render({
      signal: 'test',
      args: {}
    }, routingContext);

    var response = routingContext.middleware.response;

    response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(response.result, expected, 'Wrong HTML');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(Object.keys(response.setHeaders).length, 2);
        assert.strictEqual(typeof(response.setHeaders['Content-Type']), 'string');
        assert.strictEqual(typeof(response.setHeaders['X-Powered-By']), 'string');
        done();
      });
  });

  lab.it('should set code 302 and Location if redirect in HEAD', function (done) {
    function Head() {}

    Head.prototype.render = function () {
      this.$context.redirect('/to/garden');
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: Head,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({}, {}, components);
    var response = routingContext.middleware.response;
    var documentRenderer = routingContext.locator.resolve('documentRenderer');

    documentRenderer.render({
      signal: 'test',
      args: {}
    }, routingContext);

    response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(response.result, '', 'Should be empty content');
        assert.strictEqual(response.status, 302);
        assert.strictEqual(Object.keys(response.setHeaders).length, 1);
        assert.strictEqual(response.setHeaders.Location, '/to/garden');
        done();
      });
  });

  lab.test('should set header if set cookie in HEAD', function (done) {
    function Head() {}

    Head.prototype.render = function () {
      this.$context.cookie.set({
        key: 'first', value: 'value1'
      });
      this.$context.cookie.set({
        key: 'second', value: 'value2'
      });
      return this.$context;
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: Head,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({}, {}, components);
    var response = routingContext.middleware.response;
    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title>head – head</title></head>' +
        '<body>' +
        'document – document' +
        '<cat-async-comp id=\"2\">' +
        '<div>test – async-comp</div>' +
        '</cat-async-comp>' +
        '</body>' +
        '</html>';

    documentRenderer.render({}, routingContext);

    response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(response.result, expected, 'Wrong HTML');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(Object.keys(response.setHeaders).length, 3);
        assert.strictEqual(typeof(response.setHeaders['Content-Type']), 'string');
        assert.strictEqual(typeof(response.setHeaders['X-Powered-By']), 'string');
        assert.deepEqual(response.setHeaders['Set-Cookie'], ['first=value1', 'second=value2']);
        done();
      });
  });

  lab.test('should pass to the next middleware if notFound()', function (done) {
    function Head() {}
    Head.prototype.render = function () {
      this.$context.notFound();
      return this.$context;
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: Head,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({}, {}, components);
    var response = routingContext.middleware.response;
    var documentRenderer = routingContext.locator.resolve('documentRenderer');

    routingContext.middleware.next = function () {
      done();
    };

    documentRenderer.render({}, routingContext);
    response
      .on('error', done)
      .on('finish', function () {
        assert.fail('Should not finish the response');
      });
  });

  lab.test('should render inline script if clearFragment() in HEAD', function (done) {
    function Head() {}
    Head.prototype.render = function () {
      this.$context.clearFragment();
      return this.$context;
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-async-comp id="2"></cat-async-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: Head,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      'async-comp': {
        name: 'async-comp',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };
    var routingContext = createRoutingContext({}, {}, components);
    var response = routingContext.middleware.response;
    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title>head – head</title></head>' +
        '<body>' +
        '<script>window.location.hash = \'\';</script>' +
        'document – document' +
        '<cat-async-comp id=\"2\">' +
        '<div>test – async-comp</div>' +
        '</cat-async-comp>' +
        '</body>' +
        '</html>';

    documentRenderer.render({
      signal: 'test',
      args: ''
    }, routingContext);

    response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(response.result, expected, 'Wrong HTML');
        done();
      });
  });

  lab.test('should render inline script if clearFragment()', function (done) {
    function ClearFragmentComponent() {}
    ClearFragmentComponent.prototype.render = function () {
      this.$context.clearFragment();
      return this.$context;
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="2"></cat-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: ClearFragmentComponent,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };
    var routingContext = createRoutingContext({}, {}, components);
    var response = routingContext.middleware.response;
    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title>head – head</title></head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"2\">' +
        '<script>window.location.hash = \'\';</script>' +
        '<div>test – comp</div>' +
        '</cat-comp>' +
        '</body>' +
        '</html>';

    documentRenderer.render({
      signal: 'test',
      args: {}
    }, routingContext);
    response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(response.result, expected, 'Wrong HTML');
        done();
      });
  });

  lab.test('should render inline script if redirect()', function (done) {
    function RedirectComponent() {}
    RedirectComponent.prototype.render = function () {
      this.$context.redirect('/to/garden');
      return this.$context;
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="2"></cat-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: RedirectComponent,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };
    var routingContext = createRoutingContext({}, {}, components);
    var response = routingContext.middleware.response;
    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title>head – head</title></head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"2\">' +
        '<script>window.location.assign(\'/to/garden\');</script>' +
        '<div>test – comp</div>' +
        '</cat-comp>' +
        '</body>' +
        '</html>';

    documentRenderer.render({}, routingContext);
    response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(response.result, expected, 'Wrong HTML');
        done();
      });
  });

  lab.test('should render inline script if cookie.set()', function (done) {
    function CookieComponent() {}
    CookieComponent.prototype.render = function () {
      this.$context.cookie.set({
        key: 'key',
        value: 'value'
      });
      return this.$context;
    };

    var components = {
      document: {
        name: 'document',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<!DOCTYPE html>' +
              '<html>' +
              '<head></head>' +
              '<body>' +
              'document – ' + context.name +
              '<cat-comp id="2"></cat-comp>' +
              '</body>' +
              '</html>';
            return Promise.resolve(template);
          }
        }
      },
      head: {
        name: 'head',
        constructor: ComponentAsync,
        template: {
          render: function (context) {
            var template = '<title>' +
              'head – ' + context.name +
              '</title>';
            return Promise.resolve(template);
          }
        }
      },
      comp: {
        name: 'comp',
        constructor: CookieComponent,
        template: {
          render: function (context) {
            var template = '<div>' +
              'test – ' + context.name +
              '</div>';
            return Promise.resolve(template);
          }
        }
      }
    };

    var routingContext = createRoutingContext({}, {}, components);
    var response = routingContext.middleware.response;
    var documentRenderer = routingContext.locator.resolve('documentRenderer');
    var expected = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title>head – head</title></head>' +
        '<body>' +
        'document – document' +
        '<cat-comp id=\"2\">' +
        '<script>window.document.cookie = \'key=value\';</script>' +
        '<div>test – comp</div>' +
        '</cat-comp>' +
        '</body>' +
        '</html>';

    documentRenderer.render({}, routingContext);
    response
      .on('error', done)
      .on('finish', function () {
        assert.strictEqual(response.result, expected, 'Wrong HTML');
        done();
      });
  });
});

function createRoutingContext(config, watchers, components, actions = []) {
  var locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);

  locator.register('cookieWrapper', CookieWrapper, config);
  locator.register('contextFactory', ContextFactory, config, true);
  locator.register('documentRenderer', DocumentRenderer, config, true);
  locator.register('moduleApiProvider', ModuleApiProvider, config, true);

  var signalFactory = locator.resolveInstance(State);

  locator.registerInstance('componentLoader', {
    load: function () {
      return Promise.resolve();
    },
    getComponentsByNames: function () {
      return components;
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

  locator.registerInstance('signalLoader', {
    load: function () {
      var name = 'test';
      var fn = appstate.create(name, actions);
      locator.registerInstance('signal', { fn, name });
      return Promise.resolve();
    }
  });

  locator.registerInstance('config', config);

  var eventBus = new events.EventEmitter();

  eventBus.on('error', function () {

  });

  locator.registerInstance('eventBus', eventBus);

  var contextFactory = locator.resolve('contextFactory');

  return contextFactory.create({
    referrer: new URI(),
    location: new URI(),
    userAgent: 'test',
    middleware: {
      response: new ServerResponse(),
      next: function () {}
    }
  });
}
