libWSocket - API Reference
================================

Constructor : 
-------------
`WSocket ( url, realm, options )`  
 
 * Arguments :  
   `url : String` : `"[protocol]://[address]:[port]/[path]"`  
   `realm : String` : Autobahn realm   
   `options : Object` : *optional*, should contain :  
   
   * `authID : String`  
   * `password : String`
    		
 * Returns : `WSocket`

Properties :
------------
 * `state : String` : "new" || "opening" || "open" || "reconnecting" || "closing" || "close"

---

 * `authID : String` : ID affected by remote server authentication, `undefined` if not connected.

---

 * `role : String`: role affected by remote server authentication, `undefined` if not connected.

Methods :
---------
`open ()`

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  
   
   * `{ type : "state", message : "can't open, socket state : [state] != 'new'" }`  
   * `{ type : "internal", message : [it depends...] }` : should never happen  
   * `{ type : [close.reason], message : [close.message] }` : see doc about close event below (far far away)  
   RQ : if the realm name is wrong, the thrown error may have the type 'timeout' instead of 'wamp.error.no_such_realm' in some browsers  

---

`close ()`  

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  
   
   * `{ type : "state", message : "can't close, socket state : [state]" }`  
   * `{ type : "internal", message : [it depends...] }` : should never happen  

---

`publish ( namespace, args, kwargs )`  

 * Arguments :  

   `namespace : String`, wamp uri  
   `args : Array`, *optional*  
   `kwargs : Object`, *optional*

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  
   
   * `{ type : "internal", message : [it depends...] }` : should never happen  
   * `{ type : [wamp error URI], message : [wamp error message], wamp : true }`  
   see [wamp exceptions doc](http://autobahn.ws/python/reference/autobahn.wamp.html#module-autobahn.wamp.exception) for a complete list (i hope) of wamp error URIs   

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
   `reject ( err )` where `err : Error`  
   
   * `{ type : "internal", message : [it depends...] }` : should never happen  
   * `{ type : [wamp error URI], message : [wamp error message], wamp : true }`

---

`unsubscribe ( namespace, options )`  

 * Arguments :  

   `namespace : String`, *optional*, wamp uri  
   `handler : function ( args, kwargs, details )`, *optional*  

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  
   
   * `{ type : "internal", message : [it depends...] }` : should never happen  
   * `{ type : [wamp error URI], message : [wamp error message], wamp : true }`

---

`call ( namespace, args, kwargs )`  

 * Arguments :  

   `namespace : String`, wamp uri  
   `args : Array`  
   `kwargs : Object`  

 * Returns : `Promise`  

   `resolve ( result )`, where result type is application-specific   
   `reject ( err )` where `err : Error`  
   
   * `{ type : "internal", message : [it depends...] }` : should never happen  
   * `{ type : [wamp error URI], message : [wamp error message], wamp : true }`

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
   `reject ( err )` where `err : Error`  
   
   * `{ type : "internal", message : [it depends...] }` : should never happen  
   * `{ type : [wamp error URI], message : [wamp error message], wamp : true }`

---

`unregister ( namespace, procedure )`  

 * Arguments :  

   `namespace : String`, *optional* wamp uri, unregister all procedures if not provided  
   `procedure : function ( args, kwargs, details )`, unregister only that procedure from that namespace  

 * Returns : `Promise`  

   `resolve ()`  
   `reject ( err )` where `err : Error`  
   
   * `{ type : "internal", message : [it depends...] }` : should never happen  
   * `{ type : [wamp error URI], message : [wamp error message], wamp : true }`

Events :
--------
WSocket inherits from Events.EventEmitter from node.js. So event listener signature must be : `function([, args])` (i.e. event uri not forwarded, just event args in that order).

 * `"open"` :  
  `undefined`  

---

 * `"reconnecting"` :  
  `undefined`  

---

 * `"close"` :  
  `level : "transport" || "application" || "unknown"`, 
  `reason : String "unsupported" || "unreachable" || "timeout"` if transport level, else wamp uri.
  `message : String`, just for the computer's reading pleasure.  

Running the tests :
--------
First, start the test Crossbar server. You can run it on localhost with the command : `npm run start-crossbar-local`. When you have finished the tests stop it with `npm run stop-crossbar-local`. For that you need to have Crossbar installed.  
If you want to run the server elsewhere, put its IP address in the file spec/testconfig.json.
You can also run it in a docker vm. See spec/WSocketCrossbarServer/Dockerfile. RQ: this Dockerfile needs the directory spec/WSocketCrossbarServer/Dockerfile/.crossbar/config.json. Moreover, you need to expose the ports 50000 & 50001.

To run the test suite for Node.js, run `npm run test-node`.  
To run the test suite for browser js, run `npm run test-browser`.  It will start a http server.
When you're done, and after stopping the Crossbar server if you've run it in local, run `npm run clean`.  
