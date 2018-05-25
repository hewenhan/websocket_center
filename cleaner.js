var __config = require('./config/config');
var redis = require('redis-pool-fns')(__config.redis);

var WebSocketClient = require('websocket').client;
var webSocketConfig = require('./config/config').websocket;

var getWebsocketAddress = function (callback) {
	redis.zRange('clientServerList', 0, -1, function (err, serversList) {
		callback(serversList);
	});
};

var cleanLostWebsocketLoop = function () {
	setTimeout(cleanLostWebsocketStart, 3000);
};

var removeFailedWsServer = function (wsAddress) {
	delete serverList[wsAddress];
	redis.zRem('clientServerList', [wsAddress]);
};

var serverList = {};

var checkServerConneciton = function (serverAddress) {
	var secProtocols = webSocketConfig.secProtocols;

	var client = new WebSocketClient();

	client.once('connect', function(connection) {

		connection.once('close', function (reasonCode, description) {
			console.log('close');
			removeFailedWsServer(serverAddress);
		});

		serverList[serverAddress] = connection;
		console.log(new Date() + ': ' + serverAddress+ ' IS CONNECT SUCCESS');
	});

	client.once('connectFailed', function (errorDescription) {
		removeFailedWsServer(serverAddress);
	});

	try {
		client.connect(serverAddress, secProtocols);
		serverList[serverAddress] = {};
	} catch (e) {
		removeFailedWsServer(serverAddress);
		console.log('Connect To Remote Client SERVER ERROR!');
		return;
	}
};

var cleanLostWebsocketStart = function () {
	getWebsocketAddress(function (redisServerList) {
		console.log(redisServerList);
		if (redisServerList == null) {
			return;
		}
		for (var i = 0; i < redisServerList.length; i++) {
			if (serverList[redisServerList[i]]) {
				continue;
			}
			checkServerConneciton(redisServerList[i]);
		}
	});
	cleanLostWebsocketLoop();
};

cleanLostWebsocketStart();