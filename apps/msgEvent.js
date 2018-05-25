var clientList = require('../config/config');
var fns = require('./common/wsFunctions');
var fs = require('fs');

var backendCommands = function (data, connection) {
	switch (data.command) {

		case 'sendToClientById':
		fns.sendToRemoteClient(data.clientId, data.sendMsg);
		break;

		case 'sendToClientByUniqueId':
		fns.getClientIdByUniqueid(data.clientId, function (err, reply) {
			fns.sendToRemoteClient(reply, data.sendMsg);
		});
		break;

		case 'sendToAllClient':
		fns.sendToAllClient(data.sendMsg);
		break;

		default:
		return;
		
	}
};

var clientCommands = function (data, connection) {
	switch (data.type) {

		case 'login':
		fns.bindUniqueIdToClient(data.uniqueid, connection.clientId, function (err) {
			if (err) {
				console.log(err);
				return;
			}
			var logData = new Date() + ':\n	UNIQUE_ID: ' + data.uniqueid + '\n	CLIENT_ID: ' + connection.clientId + "\n";
			var logFile = './logs/login.log';
			fs.appendFile(logFile, logData, {encoding: 'utf8', flag: 'a+'});
			var result = {
				type: 'loginConfirm',
				serial: data.serial
			};
			connection.sendMsg(result);
		});
		break;

		default:
		return;
		
	}
};

var gatewayCommands = function (data, connection) {
	switch (data.command) {

		case 'sendToLocalClientById':
		fns.sendToLocalClientById(data.clientId, data.msg);
		break;

		case 'sendToAllLocatClient':
		fns.sendToAllLocatClient(data.msg);
		break;

		default:
		return;

	}
};

// Send To Local Connections Must From Gateway
// Else Send To Other Address Then not be gateway

module.exports = function (data, connection) {
	switch (data.identity) {
		
		case 'backend':
		backendCommands(data, connection);
		break;

		case 'client':
		clientCommands(data, connection);
		break;

		case 'gateway':
		gatewayCommands(data, connection);
		break;

		default:
		return;
	}
};