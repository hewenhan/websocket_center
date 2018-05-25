var __config = require('../../config/config');
var redis = require('redis-pool-fns')(__config.redis);

var WebSocketClient = require('websocket').client;
var webSocketConfig = require('../../config/config').websocket;
var crypto = require('crypto');


var clientServerList = require('../../config/config').clientServers;

var jsonToString = function (json) {
	try {
		JSON.stringify(json);
	} catch (e) {
		return json;
	}
	return JSON.stringify(json);
};


var remoteClientServerConnections = {};

var sendToRemoteClientServer = function (wsAddress, callback) {
	if (remoteClientServerConnections[wsAddress] == null) {
		console.log(new Date() + ": REMOTE SERVER " + remoteClientServerConnections[wsAddress] + "IS NOT IN CONNECTION");
		return;
	} else {
		callback(remoteClientServerConnections[wsAddress]);
	}
};

var randomStr = function (length) {
	var length = parseInt(length);
	var str = '';
	if (length / 25 >= 1) {
		for (var i = 0; i < Math.floor(length / 25); i++) {
			str += Math.random().toString(36).substr(2, 25);
		}
	}
	str += Math.random().toString(36).substr(2, length % 25);
	return str;
};

var _this = this;

this.createClientId = function (peerName) {
	if (peerName == null) {
		return;
	}
	var shaObj = crypto.createHash('sha256');
	console.log(new Date() + ' CREATE A CLIENT_ID: ' + peerName.address + peerName.port + new Date().getTime() + randomStr(5));
	shaObj.update(peerName.address + peerName.port + new Date().getTime() + randomStr(5));
	return shaObj.digest("HEX").toUpperCase();
};

var formatNumLength = function (int, length) {
	var intLength = int.toString().length;
	var freeLength = length - intLength;
	var fillStr = '';
	for (var i = 0; i < freeLength; i++) {
		fillStr += '0';
	}
	return fillStr + int.toString();
};

var createManDate = function (timeObject) {
	var YYYY = timeObject.getFullYear().toString();
	var MM = formatNumLength(timeObject.getMonth() + 1, 2);
	var DD = formatNumLength(timeObject.getDate(), 2);
	return YYYY + '-' + MM + '-' + DD;
};

this.updateDeviceRuntime = function (uniqueId) {
	var date = createManDate(new Date());
	var key = uniqueId + '_' + date;
	redis.get('deviceRuntime_' + key, function (err, reply) {
		if (err) {
			console.log(err);
			return;
		}
		if (reply == null) {
			var runtime = webSocketConfig.keepaliveInterval / 1000;
			redis.set('deviceRuntime_' + key, runtime, 86400);
		} else {
			var runtime = (reply * 1) + (webSocketConfig.keepaliveInterval / 1000);
			redis.set('deviceRuntime_' + key, runtime, 86400);
		}
	});
	redis.zAdd('device_online_set', uniqueId, new Date().getTime());
};

this.registerWsServerAddress = function (wsAddress) {
	redis.get('clientServerList', function (err, serversList) {
		serversList = JSON.parse(serversList);
		if (serversList == null || serversList.length == null) {
			serversList = [];
		}
		if (serversList.indexOf(wsAddress) > -1) {
			return;
		}
		serversList.push(wsAddress);
		redis.set('clientServerList', JSON.stringify(serversList));
	});
};

this.getClientWsServer = function (callback) {
	redis.get('clientServerList', function (err, serversList) {
		serversList = JSON.parse(serversList);
		if (serversList == null) {
			serversList = [];
		}
		callback(serversList);
	});
};

this.deleteAllCache = function () {
	redis.delPatt('uniqueIdBind_*', function (err, keys) {console.log(keys)});
	redis.delPatt('wsServerBind_*', function (err, keys) {console.log(keys)});
};

this.getClientIdByUniqueid = function (uniqueId, callback) {
	redis.get('uniqueIdBind_' + uniqueId, callback);
};

this.bindUniqueIdToClient = function (uniqueId, clientId, callback) {
	if (uniqueId == null) {
		console.log(new Date() + ": ERROR UNIQUEID ID IS UNDEFINED");
		return;
	}
	var connections = require('../ws/websocketServer').clientIdConnections;
	if (connections[clientId] == null) {
		console.log(new Date() + ": ERROR CONNECTIONS ID IS UNDEFINED");
		return;
	}
	connections[clientId].uniqueId = uniqueId;
	redis.set('uniqueIdBind_' + uniqueId, clientId, 180, callback);
};

this.unbindUniqueId = function (uniqueId) {
	redis.del('uniqueIdBind_' + uniqueId);
};

this.bindClientIdToServerAddress = function (clientId, serverAddress, callback) {
	redis.set('wsServerBind_' + clientId, serverAddress, null, callback);
};

this.unbindClientId = function (clientId) {
	redis.del('wsServerBind_' + clientId);
};

this.sendToRemoteClient = function (clientId, json) {
	console.log(json);
	redis.get('wsServerBind_' + clientId, function (err, reply) {
		var clientServersAdress = reply;
		if (reply == null) {
			console.log(new Date() + ": CLIENT_ID IS NULL");
			return;
		}
		sendToRemoteClientServer(clientServersAdress, function (clientConnection) {
			var message = {};
			message.identity = 'gateway';
			message.clientId = clientId;
			message.command = 'sendToLocalClientById';
			message.msg = json;
			var messageStr = jsonToString(message);
			try {
				clientConnection.sendUTF(messageStr);
			} catch (e) {
				console.log(e);
			}
			console.log(new Date() + ': SEND TO REMOTE SERVER ' + clientServersAdress);
		});
	});
};

this.sendToAllClient = function (json) {
	redis.get('clientServerList', function (err, serversList) {
		serversList = JSON.parse(serversList);
		for (var i = 0; i < serversList.length; i++) {
			var clientServersAdress = serversList[i];
			sendToRemoteClientServer(clientServersAdress, function (clientConnection) {
				var message = {};
				message.identity = 'gateway';
				message.command = 'sendToAllLocatClient';
				message.msg = json;
				var messageStr = jsonToString(message);
				clientConnection.sendUTF(messageStr);
			});
		}
	});
};

this.sendToLocalClientById = function (clientId, msgJson) {
	var server = require('../ws/websocketServer');
	if (typeof server.clientIdConnections[clientId] == 'undefined') {
		console.log(new Date() + ": " + clientId + " IS NOT CONNECTINT ON " + server.serverAddress);
		return;
	}
	server.clientIdConnections[clientId].sendMsg(msgJson);
	console.log(new Date() + ": ON SERVER " + server.serverAddress + " SEND TO " + clientId + " SUCCESS");
};



this.sendToAllLocatClient = function (msgJson) {
	var connections = require('../ws/websocketServer').connections;
	for (var i = 0; i < connections.length; i++) {
		connections[i].sendMsg(msgJson);
	}
};

this.destroyConnection = function (connection) {
	var serverObject = require('../ws/websocketServer');
	var clientId = connection.clientId;
	delete serverObject.clientIdConnections[clientId];
};

this.getIPAdress = function () {
	var interfaces = require('os').networkInterfaces();
	var address = [];
	for(var devName in interfaces){
		var iface = interfaces[devName];
		for(var i=0;i<iface.length;i++){
			var alias = iface[i];
			if(alias.family === 'IPv4' && !alias.internal){
				var addressArr = alias.address.split('.');
				if (addressArr[0] == '127' || addressArr[0] == '10'|| addressArr[0] == '172') {
					continue;
				}
				address.push(alias.address);
			}
		}
	}
	return address[address.length - 1];
};

var registerClientServerAddress = function (client, serverAddress) {
	client.once('connect', function(connection) {
		remoteClientServerConnections[serverAddress] = connection;
		console.log(new Date() + ': ' + serverAddress+ ' IS CONNECT SUCCESS');
	});
};

var connectToWsServersLoop = function () {
	setTimeout(_this.connectToWsServers, 3000);
};

this.connectToWsServers = function () {
	var secProtocols = webSocketConfig.secProtocols;
	_this.getClientWsServer(function (serversList) {
		for (var i = 0; i < serversList.length; i++) {
			if (remoteClientServerConnections[serversList[i]] != null) {
				// console.log(new Date() + ': ' + serversList[i] + ' CONNECTED IS WORKING RIGHT');
				// console.log(remoteClientServerConnections[serversList[i]]);
				continue;
			}

			var client = new WebSocketClient();
			registerClientServerAddress(client, serversList[i]);

			try {
				client.connect(serversList[i], secProtocols);
			} catch (e) {
				console.log('Connect To Remote Client SERVER ERROR!');
				return;
			}
		}
		connectToWsServersLoop();
	});
};