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

var adaptHandler = require('../src/main.js').prototype._adaptHandler;

describe('adaptHandler', function() {
  var unadaptedHandler = function(args, kwargs, details) {
    expect(args).toEqual([]);
    expect(kwargs).toEqual({});
    return details;
  };

  var testPattern = function(regNamespace, handlerType, expectedDetails, match) {
    //var adapter = new Adpater(regNamespace, handlerType, unadaptedHandler, match);
    var adaptedHandler = adaptHandler(regNamespace, handlerType, unadaptedHandler, match);
    var inDetails = {};
    inDetails[handlerType] = expectedDetails[handlerType];
    var outDetails = adaptedHandler([], {}, inDetails);

    expect(outDetails[handlerType]).toEqual(expectedDetails[handlerType]);
    switch (match) {
    case 'prefix':
      expect(outDetails.prefix).toEqual(expectedDetails.prefix);
      expect(outDetails.suffix).toEqual(expectedDetails.suffix);
      expect(outDetails.wildcards).toBeUndefined();
      break;

    case 'wildcard':
      expect(outDetails.prefix).toBeUndefined();
      expect(outDetails.suffix).toBeUndefined();
      if (expectedDetails.wildcards === null) {
        expect(outDetails.wildcards).toEqual(null);
      } else {
        expect(typeof outDetails.wildcards).toEqual('object');
        expect(outDetails.wildcards).not.toEqual(null);
        expect(outDetails.wildcards.length).toEqual(expectedDetails.wildcards.length);
        for (var i = 0; i < outDetails.wildcards.length; ++i) {
          expect(outDetails.wildcards[i]).toEqual(expectedDetails.wildcards[i]);
        }
      }

      break;

    default:
      expect(outDetails.prefix).toBeUndefined();
      expect(outDetails.suffix).toBeUndefined();
      expect(outDetails.wildcards).toBeUndefined();
      break;
    }
  };

  it('should be transparent if undefined match', function() {
    testPattern(
      'com.example.test',
      'topic',
      {
        topic: 'com.example.test'
      },
      undefined
    );
  });

  it('should be transparent if exact match', function() {
    testPattern(
      'com.example.test',
      'topic',
      {
        topic: 'com.example.test'
      },
      'exact'
    );
  });

  it('should add a full prefix and an empty suffix if prefix match && call with same namespace',
  function() {
    testPattern(
      'com.example.test',
      'topic',
      {
        topic: 'com.example.test',
        prefix: 'com.example.test',
        suffix: ''
      },
      'prefix'
    );
  });

  it('should add right prefix/suffix if prefix match && call with suffixed namespace', function() {
    testPattern(
      'com.example',
      'topic',
      {
        topic: 'com.example.test',
        prefix: 'com.example',
        suffix: 'test'
      },
      'prefix'
    );
  });

  it('should find 1 wildcard when wildcard match && wildcard reg in the middle', function() {
    testPattern(
      'com.example..test',
      'topic',
      {
        topic: 'com.example.42.test',
        wildcards: ['42']
      },
      'wildcard'
    );
  });

  it('should find 2 wildcard when wildcard match && 2 wildcard reg in the middle and separated',
  function() {
    testPattern(
      'com.example..test..test',
      'topic',
      {
        topic: 'com.example.42.test.43.test',
        wildcards: ['42', '43']
      },
      'wildcard'
    );
  });

  it('should find 1 wildcard when wildcard match && 1 wildcard reg at the end', function() {
    testPattern(
      'com.example.test.',
      'topic',
      {
        topic: 'com.example.test.42',
        wildcards: ['42']
      },
      'wildcard'
    );
  });

  it('should find 1 wildcard when wildcard match && 1 wildcard reg at the start', function() {
    testPattern(
      '.example.test',
      'topic',
      {
        topic: '42.example.test',
        wildcards: ['42']
      },
      'wildcard'
    );
  });

  it('should find 1 wildcard when wildcard match && 1 wildcard reg at the start with a prefix call',
  function() {
    testPattern(
      '.example.test',
      'topic',
      {
        topic: 'com.42.example.test',
        wildcards: ['42']
      },
      'wildcard'
    );
  });

  // TODO test regexp doesn't match? and empty match?
  it('should find 1 wildcard when wildcard match && 1 wildcard reg at the end && call with suffix',
  function() {
    testPattern(
      'com.example.test.',
      'topic',
      {
        topic: 'com.example.test.42.test',
        wildcards: ['42']
      },
      'wildcard'
    );
  });

  it('should find 2 wildcard when wildcard match && 2 following wildcards reg in the middle',
  function() {
    testPattern(
      'com.example.test...test',
      'topic',
      {
        topic: 'com.example.test.42.43.test',
        wildcards: ['42', '43']
      },
      'wildcard'
    );
  });

  it('should find wildcards == null when wildcard match && there is no match', function() {
    testPattern(
      'com.example.test..test',
      'topic',
      {
        topic: 'com.example.test2..test',
        wildcards: null
      },
      'wildcard'
    );
  });

  it('should find null when wildcard match && called with 1 empty wildcard', function() {
    testPattern(
      'com.example.test..test',
      'topic',
      {
        topic: 'com.example.test..test',
        wildcards: null
      },
      'wildcard'
    );
  });
});
