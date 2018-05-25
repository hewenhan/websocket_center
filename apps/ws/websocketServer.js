var webSocketServer = require('websocket').server;
var server = require('./httpHandshakeServer');
var config = require('../../config/config');
var webSocketConfig = config.websocket;
var msgEvent = require('../msgEvent');
var pingConfig = require('../../config/config').echoRule;
var fns = require('../common/wsFunctions');

var websocketSpace = require('websocket');

websocketSpace.connection.prototype.sendMsg = function(json) {
	var resultData = JSON.stringify(json);
	// console.log(new Date() + 'send msg to ' + JSON.stringify(this.socket._peername));
	try {
		this.sendUTF(resultData);
	} catch (e) {
		console.log(e);
	}
};
websocketSpace.connection.prototype.handleKeepaliveTimer = function() {
	this._debug('handleKeepaliveTimer');
	this._keepaliveTimeoutID = null;
	this.ping(webSocketConfig.pingData);

	if (this.config.dropConnectionOnKeepaliveTimeout) {
		this.setGracePeriodTimer();
	} else {
		this.setKeepaliveTimer();
	}
};

fns.deleteAllCache();

var wsServer = new webSocketServer({
	httpServer: server,
	keepalive: webSocketConfig.keepalive,
	keepaliveInterval: webSocketConfig.keepaliveInterval,
	dropConnectionOnKeepaliveTimeout: webSocketConfig.dropConnectionOnKeepaliveTimeout,
	keepaliveGracePeriod: webSocketConfig.keepaliveGracePeriod,
	autoAcceptConnections: webSocketConfig.autoAcceptConnections
});

wsServer.clientIdConnections = {};

wsServer.serverAddress = config.gatewayHostName + ':' + config.http.port;

var secProtocols = webSocketConfig.secProtocols;
if (!webSocketConfig.useSecProtocols) {
	secProtocols = null;
}

var originIsAllowed = function (requestedProtocols) {
	// put logic here to detect whether the specified origin is allowed.
	if (requestedProtocols.indexOf(secProtocols) != -1) {
		return true;
	}
	return false;
}

fns.registerWsServerAddress(wsServer.serverAddress);
fns.connectToWsServers();

wsServer.on('request', function(request) {
	if (webSocketConfig.useSecProtocols) {
		if (!originIsAllowed(request.requestedProtocols)) {
			// Make sure we only accept requests from an allowed origin
			request.reject(404, 'error requestedProtocols');
			console.log((new Date()) + ' Connection from ' + request.requestedProtocols + ' rejected.');
			return;
		}
	}

	var connection = request.accept(secProtocols, request.origin);

	connection.pongLose = -1;
	connection.pongCheck = null;

	if (connection.socket._peername == null) {
		connection.close();
		return;
	}

	connection.clientId = fns.createClientId(connection.socket._peername);
	wsServer.clientIdConnections[connection.clientId] = connection;

	fns.bindClientIdToServerAddress(connection.clientId, wsServer.serverAddress);

	console.log(new Date() + ': ' + connection.clientId + ' IS CONNECTED');
	console.log('CONNECTIONS COUNT: ' + wsServer.connections.length);

	connection.on('message', function(message) {
		if (message.type === 'utf8') {
			try {
				JSON.parse(message.utf8Data);
			} catch (e) {
				console.log('MESSAGE IS NOT A JSON STRING');
				return;
			}

			var data = JSON.parse(message.utf8Data);
			var pongMsgKeys = Object.keys(pingConfig.pongMsg);
			var matchingCount = 0;
			for (var i = 0; i < pongMsgKeys.length; i++) {
				if (data[pongMsgKeys[i]] == pingConfig.pongMsg[pongMsgKeys[i]]) {
					matchingCount++;
				}
			}
			if (matchingCount === pongMsgKeys.length) {
				connection.pongCheck = true;
			}

			msgEvent(data, connection);
		}
	});

	connection.on('ping', function(cancel, data) {
		// console.log(data);
	});
	connection.on('pong', function(data) {
		fns.bindClientIdToServerAddress(this.clientId, wsServer.serverAddress);
		if (typeof this.uniqueId == 'undefined') {
			return;
		}
		fns.updateDeviceRuntime(this.uniqueId);
		fns.bindUniqueIdToClient(this.uniqueId, this.clientId);
	});

	connection.on('close', function(reasonCode, description) {
		fns.destroyConnection(this);
		console.log((new Date()) + ': ' + this.clientId + ' IS DISCONNECTED.');
		fns.unbindClientId(this.clientId);
		if (typeof this.uniqueId == 'undefined') {
			return;
		}
		fns.unbindUniqueId(this.uniqueId);
	});

});

module.exports = wsServer;
