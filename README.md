wsocket - API Reference
================================

Constructor :
-------------
`WSocket ( url, realm, options )`  

 * Arguments :  
   `url : String` : `"[protocol]://[address]:[port]/[path]"`  
   `realm : String` : Autobahn realm
   `options : Object` : *optional*, should contain :  

   * `authId : String`  
   * `password : String`

 * Returns : `WSocket`

Properties :
------------
 * `state : String` : "new" || "opening" || "open" || "reconnecting" || "closing" || "close"

---

 * `authId : String` : ID affected by remote server authentication, `undefined` if not connected.

---

 * `role : String`: role affected by remote server authentication, `undefined` if not connected.

Methods :
---------
`open ()`

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  

   * `{ type: "state", message: "can't open, socket state : [state] != 'new'" }`  
   * `{ type: "internal", message: [it depends...] }` : should never happen  
   * `{ type: "transport", message: "protocol unsupported" || "connection timeout" }`
   * `{ type: "wamp", message: [wamp close message] || "app close", url: [wamp close reason url] }` :  
   see doc about close event below (far far away)  
   RQ : if the realm name is wrong, the thrown error may have the message 'connection timeout' instead of 'wamp.error.no_such_realm' in some browsers  

---

`close ()`  

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  

   * `{ type: "state", message: "can't close, socket state : [state]" }`  
   * `{ type: "internal", message: [it depends...] }` : should never happen  

---

`publish ( namespace, args, kwargs )`  

 * Arguments :  

   `namespace : String`, wamp uri  
   `args : Array`, *optional*  
   `kwargs : Object`, *optional*

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  

   * `{ type: "internal", message: [it depends...] }` : should never happen  
   * `{ type: "state", message: "connection new || closing || closed" }`  
   * `{ type: "wamp", message: [wamp error message], url: [wamp error url] }`  
   see [wamp exceptions doc](http://autobahn.ws/python/reference/autobahn.wamp.html#module-autobahn.wamp.exception) for a complete list (i hope) of wamp error URLs & messages.  

---

`subscribe ( namespace, handler, options )`  

 * Arguments :  

   `namespace : String`, wamp uri  
   `handler : function ( args, kwargs, details )`  

   * `args : Array`  
   * `kwargs : Object`
   * `details : Object`,  
   contains Autobahn/Crossbar publication details :  
   `topic : String`
   and match policy specific details :
   `prefix : String`, if prefix match  
	 `suffix : String`, if prefix match  
	 `wildcards : Array<String>`, if wildcard match, contains wildcard values

  `options : Object`, *optional*  

   * `match : "prefix" || "wildcard" || "exact"`, exact match by default

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error` (see publish errors)

---

`unsubscribe ( namespace, options )`  

 * Arguments :  

   `namespace : String`, *optional*, wamp uri  
   `handler : function ( args, kwargs, details )`, *optional*  

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error` (see publish errors)

---

`call ( namespace, args, kwargs )`  

 * Arguments :  

   `namespace : String`, wamp uri  
   `args : Array`  
   `kwargs : Object`  

 * Returns : `Promise`  

   `resolve ( result )`, where result type is application-specific  
   `reject ( err )` where `err : Error` (see publish errors)  
      RQ: if err is a wamp error with url "wamp.error.runtime_error",
      the message is the one thrown by the remote procedure.

---

`register  ( namespace, procedure, options )`  

 * Arguments :  

   `namespace : String`, wamp uri  
   `procedure : function ( args, kwargs, details )`, same details as subscribe handlers except for `details.topic` which is replaced by `details.procedure`  
   `options : Object`, *optional*

  * `match : "prefix" || "wildcard" || "exact"`, exact match by default
  * `invoke : "first" || "last" || "random" || "roundrobin" || "single"`, single invocation by default, see [crossbar doc](http://crossbar.io/docs/Shared-Registrations/) for more info.

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error` (see publish errors)

---

`unregister ( namespace, procedure )`  

 * Arguments :  

   `namespace : String`, *optional* wamp uri, unregister all procedures if not provided  
   `procedure : function ( args, kwargs, details )`, unregister only that procedure from that namespace  

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error` (see publish errors)

Events :
--------
WSocket inherits from Events.EventEmitter from node.js. So event listener signature must be : `function([, args])` (i.e. event uri not forwarded, just event args in that order).

 * `"open"` : `undefined`  

---

 * `"reconnecting"` : `undefined`  

---

 * `"close"` :  
  - `message : String`, just for the computer's reading pleasure.  
  - `type : "transport" || "wamp"`,  
  - `url : [wamp url]` def only if type is "wamp".  

Running the tests :
-------------------
You need docker.  
After a local install (with devDependencies):

```bash
$ npm test # only run linting tests
$ npm run test.integration # unit test with a dockerized crossbar server
$ npm run test.integration.clean
```
