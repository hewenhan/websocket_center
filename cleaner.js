var __config = require('./config/config');
var redis = require('redis-pool-fns')(__config.redis);

var WebSocketClient = require('websocket').client;
var webSocketConfig = require('./config/config').websocket;

var getWebsocketAddress = function (callback) {
	redis.get('clientServerList', callback);
};

var cleanLostWebsocketLoop = function () {
	setTimeout(cleanLostWebsocketStart, 3000);
};

var updateServerList = function (serverList) {
	var wsServerList = [];
	for (var i in serverList) {
		wsServerList.push(i);
	}
	redis.set('clientServerList', JSON.stringify(wsServerList), null, function (err) {
		if (err) {
			console.log(err);
			return;
		}
		console.log('UPDATE SERVER LIST DONE');
	});
};

var serverList = {};

var checkServerConneciton = function (serverAddress) {

	if (serverList[serverAddress] != null) {
		return;
	}

	var secProtocols = webSocketConfig.secProtocols;

	var client = new WebSocketClient();
	client.on('connect', function(connection) {

		connection.on('close', function (reasonCode, description) {
			console.log('close');
			delete serverList[serverAddress];
		});

		serverList[serverAddress] = connection;
		console.log(new Date() + ': ' + serverAddress+ ' IS CONNECT SUCCESS');
	});
	client.on('connectFailed', function (errorDescription) {
		delete serverList[serverAddress];
		updateServerList(serverList);
	});
	try {
		client.connect(serverAddress, secProtocols);
	} catch (e) {
		updateServerList(serverList);
		console.log('Connect To Remote Client SERVER ERROR!');
		return;
	}
};

var cleanLostWebsocketStart = function () {
	getWebsocketAddress(function (err, serverList) {
		if (err) {
			console.log(err);
			return;
		}
		if (serverList == null) {
			return;
		}

		serverList = JSON.parse(serverList);
		console.log(serverList);
		for (var i = 0; i < serverList.length; i++) {
			checkServerConneciton(serverList[i]);
		}
	});
	cleanLostWebsocketLoop();
};

cleanLostWebsocketStart();