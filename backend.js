var WebSocketClient = require('websocket').client;
var wsConnection = require('websocket').connection;

var __config = require('./config/config');

var redis = require('redis-pool-fns')(__config.redis);
require('mysql-pool-crud')(__config.mysql);
var reqHttp = require("request_http");

var fns = require('./apps/common/wsFunctions');

var sendToClient = function (cid, userData, callback) {
	var cidNum = Number(cid);
	var cidBuff = Buffer.alloc(16);
	cidBuff.writeUIntBE(cidNum, 0, 16);
	var cidStr = cidBuff.toString('hex').toLocaleUpperCase();

	var options = {
		method: 'post',
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Length': userData.length
		},
		url: 'http://tcpserver.cpo2o.com:8000/admin/push_msg?cid=' + cidStr,
		data: userData
	};

	reqHttp(options, function (err, text) {
		if (err) {
			console.log(err);
			callback(err, null);
			return;
		}
		callback(null, text);
	});
};

var buildUserData = function (cmdInt, dataBuf) {
	if (typeof cmdInt != 'number' || dataBuf instanceof Buffer == false) {
		throw new Error('Params is aviable');
	}

	var cmdBuf = Buffer.alloc(1);
	cmdBuf.writeInt8(cmdInt);

	var lengthBuf = Buffer.alloc(1);
	lengthBuf.writeUInt8(dataBuf.length);
	return Buffer.concat([cmdBuf, lengthBuf, dataBuf]);
};

var sendTcpCountCommand = function (uniqueId, number, order) {
	var numBuf = Buffer.alloc(1);
	numBuf.writeUIntBE(number, 0, 1);
	var orderBuf = Buffer.from(order);
	var dataBuf = Buffer.concat([numBuf, orderBuf]);
	var userData = buildUserData(0x01, dataBuf);
	sendToClient(uniqueId, userData, function (err, text) {
		if (err) {
			console.log(err);
			return;
		}
		console.log(`send tcp ${text.toString('utf8')}`);
	});
};

var sendOrderLoop = function (_this) {
	var cb = function () {
		_this.getMinutesAgoOrders();
	};
	_this.sendOrderLoopTimeOut = setTimeout(cb, 2000);
};

wsConnection.prototype.getOrderInfoAndSend = function (orderId) {
	var _this = this;

	redis.send_command('HGETALL', [`credit_start_order_${orderId}`], function (err, orderInfo) {
		if (err) {
			console.log(err);
			return;
		}
		if (orderInfo == null) {
			console.log('ORDER INFO IS NULL');
			return;
		}
		var message = {
			identity: 'backend',
			command: 'sendToClientByUniqueId',
			clientId: orderInfo.device_id,
			sendMsg: {
				type: 'count',
				data: orderInfo
			}
		};
		console.log(message);
		message = JSON.stringify(message);
		_this.sendUTF(message, function (err) {
			if (err) {
				console.log(err);
			}
			console.log('send');
		});
	});
};

wsConnection.prototype.getMinutesAgoOrders = function () {
	var _this = this;

	var nowTime = new Date().getTime();
	var fromTime = nowTime - (180 * 1000);

	console.log(`${new Date()}: GET ORDERS`);

	redis.send_command('ZRANGEBYSCORE', ['credit_start_order_list', fromTime, '+inf'], function (err, orderArr) {
		if (err) {
			callback(err);
			return;
		}
		console.log(`${new Date()}: GET ORDERS DONE`);
		console.log(orderArr);
		for (var i = 0; i < orderArr.length; i++) {
			_this.getOrderInfoAndSend(orderArr[i]);
		}
	});

	sendOrderLoop(_this);
};
wsConnection.prototype.clearSendOrderLoop = function () {
	clearTimeout(this.sendOrderLoopTimeOut);
};

var retryConnectToServer = function () {
	setTimeout(connectToSever, 3000);
};

var connectToSever = function () {
	var client = new WebSocketClient();


	client.once('connect', function(connection) {

		console.log(new Date() + ": CONNECT TO SERVER SUCCESS");

		connection.getMinutesAgoOrders();

		connection.once('close', function (err) {
			if (err) {
				console.log(err);
			}
			connection.clearSendOrderLoop();
			retryConnectToServer();
		})
	});

	client.once('connectFailed', function (err) {
		if (err) {
			console.log(err);
		}
		retryConnectToServer();
	});

	fns.getClientWsServer(function (serverList) {
		if (serverList.length === 0) {
			console.log('NO GATEWAY SERVER!!!');
			retryConnectToServer();
			return;
		}
		client.connect(serverList[0], 'a33bfaupx5jylzsh');
	});
};

connectToSever();