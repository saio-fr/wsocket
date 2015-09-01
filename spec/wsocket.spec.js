/*-------------------------------------------------*\
 |                                                 |
 |      /$$$$$$    /$$$$$$   /$$$$$$   /$$$$$$     |
 |     /$$__  $$  /$$__  $$ |_  $$_/  /$$__  $$    |
 |    | $$  \__/ | $$  \ $$   | $$   | $$  \ $$    |
 |    |  $$$$$$  | $$$$$$$$   | $$   | $$  | $$    |
 |     \____  $$ | $$__  $$   | $$   | $$  | $$    |
 |     /$$  \ $$ | $$  | $$   | $$   | $$  | $$    |
 |    |  $$$$$$/ | $$  | $$  /$$$$$$ |  $$$$$$/    |
 |     \______/  |__/  |__/ |______/  \______/     |
 |                                                 |
 |                                                 |
 |                                                 |
 |    *---------------------------------------*    |
 |    |   © 2015 SAIO - All Rights Reserved   |    |
 |    *---------------------------------------*    |
 |                                                 |
\*-------------------------------------------------*/

var WSocket = require('../src/main.js');
var when = require('when');

describe('WSocket, with real crossbar server,', function() {

  it('should not open with a wrong server ip', function(done) {
    pending('this test is long. So, pray the Lord that it works...');
    var conn = new WSocket('ws://42.42.42.42:8080', 'test');
    expect(conn.state).toEqual('new');

    var p = conn.open();
    expect(conn.state).toEqual('opening');
    p.then(function() {
        expect(false).toBe(true);
        return conn.close();
      }).then(function() {
        done();
      }, function(err) {
        expect(err.type).toEqual('unreachable');
        expect(conn.state).toEqual('close');
        done();
      });
  }, 100000);

  it('should not connect with an unsupported protocol', function(done) {
    pending('protocol check unimplemented in autobahn.js for now');
    done();
  }, 100000);

  it('should not connect with a wrong realm name', function(done) {

    var conn = new WSocket('ws://127.0.0.1:8080', 'wrong');
    expect(conn.state).toEqual('new');

    var p = conn.open();
    expect(conn.state).toEqual('opening');
    p.then(function() {
        expect(false).toBe(true);
        return conn.close();
      }).then(function() {
        done();
      }, function(err) {
        // autobahn fail in browser: err.type is 'timeout' instead of 'wamp.error.no_such_realm'
        expect(err.type === 'wamp.error.no_such_realm' || err.type === 'timeout').toBe(true);
        expect(conn.state).toEqual('close');
        done();
      });
  }, 100000);

  it('should open then close / standard', function(done) {

    var conn = new WSocket('ws://127.0.0.1:8080', 'test');
    expect(conn.state).toEqual('new');

    var p = conn.open();
    expect(conn.state).toEqual('opening');
    p.then(function() {
        expect(conn.state).toEqual('open');
        expect(typeof conn.authId).toEqual('string');
        expect(conn.authId.length > 0).toBe(true);
        var pClose = conn.close();
        expect(conn.state).toEqual('closing');
        return pClose;
      }).then(function() {
        expect(conn.state).toEqual('close');
        done();
      }, function() {
        expect(false).toBe(true);
        done();
      });
  }, 100000);

  it('should pub sub/unsub standard', function(done) {
    var pubConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var subConn = new WSocket('ws://127.0.0.1:8081', 'test');

    var pub1sent = false;
    var pub1recv = false;
    var pub2sent = false;
    var pub2recv = false;

    var onevent = function(args) {
      if (args[0] === 1) {
        pub1recv = true;
      }
      if (args[0] === 2) {
        pub2recv = true;
      }
    };

    when.all([pubConn.open(), subConn.open()])
      .then(function() {
        return subConn.subscribe('public.test', onevent);
      }).then(function() {
        return pubConn.publish('public.test', [1]);
      }).then(function() {
        pub1sent = true;
        setTimeout(function() {
          subConn.unsubscribe('public.test', onevent)
            .then(function() {
              return pubConn.publish('public.test', [2]);
            }).then(function() {
              pub2sent = true;
            }, function(err) {
              console.log(err);
            });

        }, 3000);
      },

      function() {
        expect(false).toBe(true);
      });

    setTimeout(function() {
      when.all([pubConn.close(), subConn.close()])
        .then(function() {
          expect(pub1sent).toBe(true);
          expect(pub1recv).toBe(true);
          expect(pub2sent).toBe(true);
          expect(pub2recv).toBe(false);
          done();
        });
    }, 6000);
  }, 100000);

  it('should pub sub/unsub prefix style', function(done) {
    var pubConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var subConn = new WSocket('ws://127.0.0.1:8081', 'test');
    var prefixsuccess = false;

    var onevent = function(args, kwargs, details) {
      if (details.prefix === 'public.test' && details.suffix === '42') {
        prefixsuccess = true;
      }
    };

    var close = function() {
      when.all([pubConn.close(), subConn.close()])
        .then(function() {
          expect(prefixsuccess).toBe(true);
          done();
        });
    };

    when.all([pubConn.open(), subConn.open()])
    .then(function() {
      return subConn.subscribe('public.test', onevent, {match: 'prefix'});
    }).then(function() {
      return pubConn.publish('public.test.42', [1, 1]);
    }).catch(function() {
      expect(false).toBe(true);
    });

    setTimeout(function() {
      subConn.unsubscribe('public.test', onevent)
        .then(function() {
          close();
        }, function() {
          expect(false).toBe(true);
          close();
        });
    }, 4000);
  }, 100000);

  it('should pub sub/unsub wildcard style', function(done) {
    var pubConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var subConn = new WSocket('ws://127.0.0.1:8081', 'test');

    var wildcardsuccess = false;

    var onevent = function(args, kwargs, details) {
      if (details.wildcards[0] === '42') {
        wildcardsuccess = true;
      }
    };

    var close = function() {
      when.all([pubConn.close(), subConn.close()])
      .then(function() {
        expect(wildcardsuccess).toBe(true);
        done();
      });
    };

    when.all([pubConn.open(), subConn.open()])
      .then(function() {
        return subConn.subscribe('public..test', onevent, {match: 'wildcard'});
      }).then(function() {
        return pubConn.publish('public.42.test', [1, 1]);
      }, function() {
        expect(false).toBe(true);
      });

    setTimeout(function() {
      subConn.unsubscribe('public..test', onevent)
        .then(function() {
          close();
        }, function() {
          expect(false).toBe(true);
          close();
        });
    }, 4000);
  }, 100000);

  it('should call reg/unreg standard', function(done) {
    var callConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var regConn = new WSocket('ws://127.0.0.1:8081', 'test');

    var call1success = false;
    var call2success = false;

    var procedure = function(args) {
      return args[0] + args[1];
    };

    var close = function() {
      when.all([callConn.close(), regConn.close()])
        .then(function() {
          expect(call1success).toBe(true);
          expect(call2success).toBe(false);
          done();
        });
    };

    when.all([callConn.open(), regConn.open()])
      .then(function() {
        return regConn.register('public.test', procedure);
      }).then(function() {
        return callConn.call('public.test', [1, 1]);
      }).then(function(result) {
        call1success = result === 2;
      }).then(function() {
        return regConn.unregister('public.test', procedure);
      }).then(function() {
        return callConn.call('public.test', [1, 1]);
      }).then(function(result2) {
        call2success = result2 === 2;
        close();
      }).catch(function() {
        close();
      });
  }, 100000);

  it('should call reg/unreg prefix style', function(done) {
    var callConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var regConn = new WSocket('ws://127.0.0.1:8081', 'test');

    var prefixsuccess = false;
    var callsuccess = false;

    var procedure = function(args, kwargs, details) {
      if (details.prefix === 'public.test' && details.suffix === '42') {
        prefixsuccess = true;
      }
      return args[0] + args[1];
    };

    var close = function() {
      when.all([callConn.close(), regConn.close()])
        .then(function() {
          expect(prefixsuccess).toBe(true);
          expect(callsuccess).toBe(true);
          done();
        });
    };

    when.all([callConn.open(), regConn.open()])
      .then(function() {
        return regConn.register('public.test', procedure, {match: 'prefix'});
      }).then(function() {
        return callConn.call('public.test.42', [1, 1]);
      }).then(function(result) {
        callsuccess = result === 2;
      }).then(function() {
        return regConn.unregister('public.test', procedure);
      }).then(function() {
        close();
      }).catch(function() {
        expect(false).toBe(true);
        close();
      });
  }, 100000);

  it('should call reg/unreg wildcard style', function(done) {
    var callConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var regConn = new WSocket('ws://127.0.0.1:8081', 'test');

    var wildcardsuccess = false;
    var callsuccess = false;

    var procedure = function(args, kwargs, details) {
      if (details.wildcards[0] === '42') {
        wildcardsuccess = true;
      }
      return args[0] + args[1];
    };

    var close = function() {
      when.all([callConn.close(), regConn.close()])
        .then(function() {
          expect(wildcardsuccess).toBe(true);
          expect(callsuccess).toBe(true);
          done();
        });
    };

    when.all([callConn.open(), regConn.open()])
      .then(function() {
        return regConn.register('public..test', procedure, {match: 'wildcard'});
      }).then(function() {
        return callConn.call('public.42.test', [1, 1]);
      }).then(function(result) {
        callsuccess = result === 2;
      }).then(function() {
        return regConn.unregister('public..test', procedure);
      }).then(function() {
        close();
      }).catch(function() {
        expect(false).toBe(true);
        close();
      });
  }, 100000);

  it('should fail to pub/sub/call/reg on restricted namespaces if not auth', function(done) {

    var conn = new WSocket('ws://127.0.0.1:8080', 'test');

    var pubFail = false;
    var subFail = false;
    var callFail = false;
    var regFail = false;

    var onevent = function() {
      return;
    };

    var procedure = function(args) {
      return args[0] + args[1];
    };

    conn.open()
      .then(function() {
        conn.publish('private.test')
          .then(function() {}, function() {
            pubFail = true;
          });

        conn.subscribe('private.test', onevent)
          .catch(function() {
            subFail = true;
          });

        conn.call('private.test', [1, 1])
          .catch(function() {
            callFail = true;
          });

        conn.register('private.test', procedure)
          .catch(function() {
            regFail = true;
          });
      });

    setTimeout(function() {
      conn.close()
        .then(function() {
          expect(pubFail).toBe(true);
          expect(subFail).toBe(true);
          expect(callFail).toBe(true);
          expect(regFail).toBe(true);
          done();
        });
    }, 4000);
  }, 100000);

  it('should connect in auth way and call/reg on restricted namespaces', function(done) {
    var callConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var regConn = new WSocket('ws://127.0.0.1:8081', 'test', {
      authId: 'auth',
      password: 'auth'
    });

    var regSuccess = false;
    var callSuccess = false;

    var procedure = function() {
      return 42;
    };

    var close = function() {
      when.all([callConn.close(), regConn.close()])
        .then(function() {
          expect(regSuccess).toBe(true);
          expect(callSuccess).toBe(true);
          done();
        });
    };

    when.all([callConn.open(), regConn.open()])
      .then(function() {
        expect(regConn.authId).toEqual('auth');
        expect(regConn.role).toEqual('auth');
        return regConn.register('protected.test', procedure);
      }).then(function() {
        regSuccess = true;
        return callConn.call('protected.test', [42]);
      }).then(function(result) {
        callSuccess = result === 42;
        return callConn.unregister('protected.test', procedure);
      }).then(function() {
        close();
      }).catch(function() {
        expect(false).toBe(true);
        close();
      });
  }, 100000);

  it('should unsub by namespace only', function(done) {
    var pubConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var subConn = new WSocket('ws://127.0.0.1:8081', 'test');

    var pub1recv = false;
    var pub2recv = false;

    var onevent1 = function() {
      pub1recv = true;
    };

    var onevent2 = function() {
      pub2recv = true;
    };

    var close = function() {
      when.all([pubConn.close(), subConn.close()])
        .then(function() {
          expect(pub1recv).toBe(false);
          expect(pub2recv).toBe(false);
          done();
        });
    };

    when.all([pubConn.open(), subConn.open()])
      .then(function() {
        return subConn.subscribe('public.test', onevent1);
      }).then(function() {
        return subConn.subscribe('public.test', onevent2);
      }).then(function() {
        return subConn.unsubscribe('public.test');
      }).then(function() {
        return pubConn.publish('public.test');
      }).catch(function() {
        expect(false).toBe(true);
      });

    setTimeout(close, 6000);
  }, 100000);

  it('should unsub by handler only', function(done) {
    var pubConn = new WSocket('ws://127.0.0.1:8080', 'test');
    var subConn = new WSocket('ws://127.0.0.1:8081', 'test');

    var nPubRecv = 0;

    var onevent = function() {
      ++nPubRecv;
    };

    var close = function() {
      when.all([pubConn.close(), subConn.close()])
        .then(function() {
          expect(nPubRecv).toEqual(0);
          done();
        });
    };

    when.all([pubConn.open(), subConn.open()])
      .then(function() {
        return subConn.subscribe('public.test', onevent);
      }).then(function() {
        return subConn.subscribe('public.test2', onevent);
      }).then(function() {
        return subConn.unsubscribe(undefined, onevent);
      }).then(function() {
        return pubConn.publish('public.test');
      }).then(function() {
        return pubConn.publish('public.test2');
      }).catch(function(err) {
        console.log(err);
        expect(false).toBe(true);
      });

    setTimeout(close, 6000);
  }, 100000);
});
