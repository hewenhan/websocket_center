var pingConfig = require('../../config/config').echoRule;
if (pingConfig == null) {
	pingConfig = {
		enabled: false,
		pingMsg: {          //INIT ping massage JSON OBJ
			type: 'ping'
		},
		pongMsg: {
			type: 'pong'    //INIT pong massage JSON OBJ
		},
		pingInterval: 3,    //second
		outOfCountKickConnection: 5   // out of this count then kick this connection
	}
}


var sendMsg = function () {
	var connections = require('./websocketServer').connections;
	for (var i = 0; i < connections.length; i++) {
		var connection = connections[i];
		if (!connection.pongCheck) {
			connection.pongLose++;
		} else {
			connection.pongLose = -1;
		}
		if (connection.pongLose >= pingConfig.outOfCountKickConnection) {
			connection.close();
			return;
		}
		connection.pongCheck = null;
		connection.sendMsg(pingConfig.pingMsg);
	}
	console.log(new Date() + 'send msg to all client');
};

var sendMsgLoop = function () {
	setTimeout(sendMsgLoopStart, (pingConfig.pingInterval * 1000));
};

var sendMsgLoopStart = function () {
	sendMsg();
	sendMsgLoop();
};

if (pingConfig.enabled) {
	module.exports = sendMsgLoopStart();
}
