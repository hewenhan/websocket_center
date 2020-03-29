# DESCRIPTION
`version v0.0.6`

This is a frame of websocket developers for nodejs v10.15.2

## FEATURE
- ### DISTRIBUTED
- ### HIGH AVAILABILITY
- ### HIGH PERFORMANCE
- ### PURE WEBSOCKET PROTOCOL
	- #### SECOND WEBSOCKET PROTOCOL SUPPORT
	- #### NATIVE WEBSOCKET PING/PONG SUPPORT
- ### EXTEND PROTOCOL SUPPORT
	- #### ON MESSAGE PING/PONG SUPPORT
- ### REDIS CONNECTION POOL

### ILLUSTRATION

# USEAGE
## Download the full project folder
install all package form folder root path the package.js file like:

    npm install

and run app.js file with node

	node app.js

then your websocket project was already run.

# RULE
## `NOW THESE MESSAGE IS VERY IMPORTANT`
This frame is not only a `server` use to get connection but also a `client` use to send command.

All message send and recive use JSON object.

### DATA FORMAT
All project send message must be a json object.

Like connection.sendMsg({success: true});

### THE CONFIG FILE IN `/config/config.js`
		this.http = {
			port: 8080
		};
		
		this.websocket = {
		    keepalive: true,
		    keepaliveInterval: 3000,
		    dropConnectionOnKeepaliveTimeout: true,
		    keepaliveGracePeriod: 60000,
		    autoAcceptConnections: false,
		    useSecProtocols: true,
		    secProtocols: 'echo-protocol'
		};
		
		// TEST CONFIG
		this.redis = {
		    host: '127.0.0.1', // default 
		    port: 6379, // default 
		    max_clients: 30, // defalut 
		    perform_checks: false, // checks for needed push/pop functionality
		    database: 0, // database number to use
		    perfix: "websocket_",
		    options: {
		    	auth_pass: '233233233'
		    } // options for createClient of node-redis, optional 
		};
		
		this.echoRule = {
		    enabled: false,
		    pingMsg: {          //INIT ping massage JSON OBJ
		        type: 'ping'
		    },
		    pongMsg: {
		        type: 'pong'    //INIT pong massage JSON OBJ
		    },
		    pingInterval: 3,    //second
		    outOfCountKickConnection: 5,   // out of this count then kick this connection
		};

		this.gatewayHostName = 'ws://192.168.10.102';

### echoRule:
if your websocket keepalive ping/pong is not support by ISP.

then you can use a message ping/pong to keep connection alive.

change the `enable` to `true` to enable the message ping/pong.

`pingInterval` is second for send a ping message to all client pre time.

`pingMsg`  will init the ping data format;

### http:
`port`: The listen port number of your web server;

### websocket:
`keepalive`: `boolean` of use websocket ping/pong.

`keepaliveInterval`: `int` second of every ping time.

# API
- connection.sendMsg(jsonObject)

		send to this connection a msessage with Json Object.

- connection.sendUTF(string)

		send to this connection a msessage with String.

- connection.close()

		close this connection.

- connection.ping(data)

		send to this connection a websocket ping.

- connection.pong(data)

		send to this connection a websocket pong.

- fns.sendToRemoteClientServer(wsAddress, callback)

		send the message to remote websocket server.
		websocket address like "ws://127.0.0.1"

		callback param is this connection

		useage:

		fns.sendToRemoteClientServer("ws://127.0.0.1", function (connection) {
			connection.sendMsg({msg: 'hello world'});
		});
		

- fns.registerWsServerAddress(wsAddress)

		register the argument to websocket address like:

		fns.registerWsServerAddress("ws://127.0.0.1");

- fns.getClientIdByUniqueid(uniqueId, callback)
- fns.bindUniqueIdToClient(uniqueId, clientId, callback)
- fns.bindClientIdToServerAddress(clientId, serverAddress, callback)
- fns.unbindClientId(clientId)
- fns.sendToRemoteClient(clientId, json)
- fns.sendToAllClient(json)
- fns.sendToLocalClientById(clientId, msgJson)
- fns.sendToAllLocatClient(msgJson)
- fns.getIPAdress()

# message data rule

		{
			identity: String
			command: String
			snedMsg: String
		}

# identity
		this is in message send to websocket server on message only can be responseived.
		server recive date only accept identity "backend", "client", "gateway".
		like {identity: "backend"}

# command
		this is in message send to websocket server on message only can be responseived.
		server recive date only accept command:

`sendToClientById`, `sendToAllClient`, `sendToLocalClientById`, `sendToAllLocatClient`.
		{
			identity: 'backend',
			command: 'sendToClientById',
			clientId: clientId,
			sendMsg: {
				type: 'count',
				count: count,
				serial: serial
			}
		};