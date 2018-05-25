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

wsConnection.prototype.sendCountCommand = function (uniqueid, count, serial, luckyInnings, uid) {
	var _this = this;
	fns.getClientIdByUniqueid(uniqueid, function (err, reply) {
		var clientId = reply;
		// console.log(clientId);
		var message = {
			identity: 'backend',
			command: 'sendToClientById',
			clientId: clientId,
			sendMsg: {
				type: 'count',
				count: count,
				serial: serial,
				luckyInnings: luckyInnings,
				uid: uid
			}
		};

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

	var getDwjDeviceSql = `SELECT device_id FROM club_2g.deviceid_list WHERE is_dwj = "1"`;
	query(getDwjDeviceSql, function (err, rows) {
		if (err) {
			console.log(err);
			return;
		}
		var dwjDeviceArr = [];
		for (var i = 0; i < rows.length; i++) {
			dwjDeviceArr.push(String(rows[i].device_id));
		}

		var beforeTime = 90;
		console.log(new Date() + ': GET ORDERS');
		var toTime = Date.parse(new Date()) / 1000;
		var fromTime = toTime - beforeTime;
		redis.send_command('ZREVRANGEBYSCORE', ['order_devicerun', toTime, fromTime], function (err, reply) {
			console.log(new Date() + ': GET ORDERS DONE');
			console.log(reply);
			if (err) {
				console.log(err);
				return;
			}
			for (var i = 0; i < reply.length; i++) {
				var orderArr = reply[i].split('_');
				var order = orderArr[0];
				var uniqueId = String(orderArr[1]);
				var number = parseInt(orderArr[2]);
				var type = parseInt(orderArr[3]);
				var luckyInnings = parseInt(orderArr[4] || 0);
				var uid = orderArr[5] || 0;

				if (dwjDeviceArr.indexOf(uniqueId) === -1) {
					_this.sendCountCommand(uniqueId, number, order, luckyInnings, uid);
					continue;
				}
				sendTcpCountCommand(uniqueId, number, order);
			}
		});

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