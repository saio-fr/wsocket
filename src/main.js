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

var autobahn = require('autobahn');
var when = require('when');
var events = require('events');
var _ = require('underscore');

var WSocket = function(url, realm, options) {
  var that = this;

  that.state = 'new';

  events.EventEmitter.call(that);
  that.setMaxListeners(0);
  var autobahnOptions = {
    url: url,
    realm: realm
  };

  if (typeof options !== 'undefined' &&
      typeof options.authId === 'string' &&
      typeof options.password === 'string') {
    autobahnOptions.authmethods = ['wampcra'];
    autobahnOptions.authid = options.authId;
    var password = options.password;
    autobahnOptions.onchallenge = function(session, method, extra) {
      if (method === 'wampcra') {
        // jscs: disable
        return autobahn.auth_cra.sign(password, extra.challenge);
      }
    };
  }

  that._autobahnConnection = new autobahn.Connection(autobahnOptions);
  that._session = undefined; // ! undefined if state != open

  // { [sub/regID]: handler/procedure }
  that._subscriptions = {};
  that._registrations = {};

  that._autobahnConnection.onopen = function(session, details) {
    that._session = session;
    that.authId = details.authid;
    that.role = details.authrole;
    that.state = 'open';
    that.emit('open');
  };

  that._autobahnConnection.onclose = function(reason, details) {
    that._session = undefined;
    that.authId = undefined;
    that.role = undefined;
    that.state = 'close';

    // emits ('close', message, type, wampURI) or ('reconnecting')
    switch(reason){
    case 'unsupported':
      that.emit('close', 'protocol unsupported', 'transport');
      break;

    case 'unreachable':
      if (!details.will_retry) {
        that.emit('close', 'connection timeout', 'transport');
      }
      break;

    case 'lost':
      if (details.will_retry) {
        that.state = 'reconnecting';
        that.emit('reconnecting');
      } else {
        that.emit('close', 'connection timeout', 'transport');
      }
      break;

    case 'closed':
      var message = !!details.message && !!details.message.length ? details.message : 'app close';
      that.emit('close', message, 'wamp', details.reason);
      break;

    default:
      that.emit('close', reason, 'transport');
    }
  };
};

_.extend(WSocket.prototype, events.EventEmitter.prototype);

WSocket.prototype.open = function() {
  var that = this;
  return when.promise(function(resolve, reject) {
    var err;
    if (that.state !== 'new') {
      err = new Error('can\'t open, socket state: ' + that.state + ' != \'new\'');
      err.type = 'state';
      reject(err);
      return;
    }

    var onsuccess, onfailure;

    onsuccess = function() {
      that.removeListener('close', onfailure);
      resolve();
    };

    onfailure = function(message, type, url) {
      that.removeListener('open', onsuccess);
      err = new Error(message);
      err.type = type;
      if (type === 'wamp') {
        err.url = url;
      }
      reject(err);
    };

    that.once('open', onsuccess);
    that.once('close', onfailure);

    that.state = 'opening';
    try {
      that._autobahnConnection.open();
    } catch (errMessage) {
      that.state = 'close';
      that.removeListener('open', onsuccess);
      that.removeListener('close', onfailure);
      err = new Error(errMessage);
      err.type = 'internal';
      reject(err);
    }
  });
};

WSocket.prototype.close = function() {
  var that = this;
  return when.promise(function(resolve, reject) {
    var err;
    if (that.state === 'new' || that.state === 'closing' || that.state === 'close') {
      err = new Error('can\'t close, socket state: ' + that.state);
      err.type = 'state';
      reject(err);
      return;
    }

    var onclose = function() {
      resolve();
    };

    that.once('close', onclose);

    that.state = 'closing';
    try {
      that._autobahnConnection.close();
    } catch (errMessage) {
      that.state = 'close';
      that.removeListener('close', onclose);
      err = new Error(errMessage);
      err.type = 'internal';
      reject(err);
    }
  });
};

WSocket.prototype.publish = function(namespace, args, kwargs) {
  var that = this;
  return that._whenConnected()
    .then(function() {
      var pubAction = that._session.publish.bind(that._session, namespace, args, kwargs, {
        acknowledge: true
      });
      return that._try(pubAction);
    }).then(function() {});
};

WSocket.prototype.subscribe = function(namespace, handler, options) {
  var that = this;
  return that._whenConnected()
    .then(function() {
      var match = options && options.match ? options.match : 'exact';
      var adaptedHandler = that._adaptHandler(namespace, 'topic', handler, match);
      var subAction = that._session.subscribe.bind(
          that._session, namespace, adaptedHandler, options);
      return that._try(subAction);
    }).then(function(subscription) {
      that._subscriptions[subscription.id] = handler;
    });
};

WSocket.prototype.unsubscribe = function(namespace, handler) {
  var that = this;

  var checkNamespace = typeof namespace === 'string';
  var checkHandler = typeof handler === 'function';

  var unsub = function(subscription) {
    var mustUnsub = true;
    if (checkNamespace && subscription.topic !== namespace) {
      mustUnsub = false;
    }
    if (checkHandler && that._subscriptions[subscription.id] !== handler) {
      mustUnsub = false;
    }

    if (mustUnsub) {
      var unsubAction = subscription.unsubscribe.bind(subscription);
      return that._try(unsubAction)
        .then(function() {
          delete that._subscriptions[subscription.id];
        });
    } else {
      return when.resolve();
    }
  };

  var unsubPerNamespace = function(subsPerNamespace) {
    return when.map(subsPerNamespace, unsub);
  };

  return that._whenConnected()
    .then(function() {
      var subs = that._session.subscriptions;
      return when.map(subs, unsubPerNamespace);
    });
};

WSocket.prototype.call = function(namespace, args, kwargs) {
  var that = this;
  return that._whenConnected()
    .then(function() {
      var callAction = that._session.call.bind(that._session, namespace, args, kwargs);
      return that._try(callAction);
    });
};

WSocket.prototype.register = function(namespace, procedure, options) {
  var that = this;
  return that._whenConnected()
    .then(function() {
      var match = options && options.match ? options.match : 'exact';
      var adaptedProcedure = that._adaptHandler(namespace, 'procedure', procedure, match);
      adaptedProcedure = that._formatProcedureThrow(adaptedProcedure);
      var regAction = that._session.register.bind(
        that._session, namespace, adaptedProcedure, options
      );
      return that._try(regAction);
    }).then(function(registration) {
      that._registrations[registration.id] = procedure;
    });
};

WSocket.prototype.unregister = function(namespace, procedure) {
  var that = this;

  var checkNamespace = typeof namespace === 'string';
  var checkProcedure = typeof procedure === 'function';

  var unreg = function(registration) {
    var mustUnreg = true;
    if (checkNamespace && registration.procedure !== namespace) {
      mustUnreg = false;
    }
    if (checkProcedure && that._registrations[registration.id] !== procedure) {
      mustUnreg = false;
    }

    if (mustUnreg) {
      var unregAction = registration.unregister.bind(registration);
      return that._try(unregAction)
        .then(function() {
          delete that._registrations[registration.id];
        });
    } else {
      return when.resolve();
    }
  };

  return that._whenConnected()
    .then(function() {
      var regs = that._session.registrations;
      return when.map(regs, unreg);
    });
};

WSocket.prototype._whenConnected = function() {
  var that = this;
  return when.promise(function(resolve, reject) {
    var err;
    switch (that.state) {
    case 'new':
      err = new Error('connection new, call open() first');
      err.type = 'new';
      reject(err);
      return;

    case 'open':
      resolve();
      return;

    case 'closing':
      err = new Error('connection closing');
      err.type = 'close';
      reject(err);
      return;

    case 'close':
      err = new Error('connection closed');
      err.type = 'close';
      reject(err);
      return;

    default:
      var onopen, onclose;
      onopen = function() {
        that.removeListener('close', onclose);
        resolve();
      };

      onclose = function() {
        that.removeListener('open', onopen);
        err = new Error('connection closed');
        err.type = 'close';
        reject(err);
      };

      that.once('open', onopen);
      that.once('close', onclose);
      return;
    }
  });
};

// rejects and possibly transforms autobahn errors, js errors and strings in "typed" js Errors
// we suppose that action returns a promise, can throw and is a function binded to its args
WSocket.prototype._try = function(action) {
  var that = this;
  return when.try(action)
    .catch(function(err) {
      return when.reject(that._formatError(err));
    });
};

WSocket.prototype._formatError = function(err) {
  var outErr;
  if (err instanceof autobahn.Error) {
    outErr = new Error(err.args[0]);
    outErr.type = 'wamp';
    outErr.url = err.error;
    return outErr;
  }
  if (err instanceof Error) {
    if (typeof err.type === 'undefined') {
      err.type = 'internal';
    }
    return err;
  }

  // else we should have a string
  outErr = new Error(err);
  outErr.type = 'internal';
  return outErr;
};

// return an adapted procedure that if throws or rejects, it will with an autobahn error
WSocket.prototype._formatProcedureThrow = function(procedure) {
  return function(args, kwargs, details) {
    return when.try(procedure, args, kwargs, details)
      .catch(function(err) {
        return when.reject(err.message);
      });
  };
};

WSocket.prototype._adaptHandler = function(namespace, handlerType, callback, match) {
  switch (match) {
  case 'prefix':
    return function(args, kwargs, details) {
      details.prefix = namespace;
      details.suffix = '';
      if (details[handlerType].length > details.prefix.length) {
        details.suffix = details[handlerType].substring(details.prefix.length + 1);
      }
      return callback(args, kwargs, details);
    };
  case 'wildcard':
    var regexpStr = '';
    var units = namespace.split('.');
    for (var i = 0; i < units.length; ++i) {
      if (units[i] === '') {
        if (i === 0) {
          regexpStr += '(?:[^\.]+\.)*';
        }
        regexpStr += '([^\.]+)';
      } else {
        regexpStr += units[i];
      }

      if (i < units.length - 1) {
        regexpStr += '\.';
      } else {
        regexpStr += '.*';
      }
    }
    return function(args, kwargs, details) {
      var wildcardFinder = new RegExp(regexpStr, 'g');
      var wildcards = wildcardFinder.exec(details[handlerType]);
      if (wildcards !== null) {
        // a global regexp success exec always returns the complete string in result[0]
        wildcards.shift();
      }
      details.wildcards = wildcards;
      return callback(args, kwargs, details);
    };
  default:
    return function(args, kwargs, details) {
      details[handlerType] = namespace;
      return callback(args, kwargs, details);
    };
  }
};

module.exports = WSocket;
