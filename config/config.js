var normalizePort = function (val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		return val;
	}

	if (port >= 0) {
		return port;
	}

	return false;
}

if (typeof argv == 'undefined') {
	argv = {};
}

this.http = {
	port: argv['--PORT'] || 28764
};

this.websocket = {
	keepalive: true,
	keepaliveInterval: 13000,
	dropConnectionOnKeepaliveTimeout: true,
	keepaliveGracePeriod: 60000,
	autoAcceptConnections: false,
	useSecProtocols: true,
	pingData: '',
	secProtocols: 'a33bfaupx5jylzsh'
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

// // ONLINE CONFIG
// this.redis = {
// 	host: 'r-2zedf730278c3524.redis.rds.aliyuncs.com',
// 	port: 6379,
// 	max_clients: 100,
// 	perform_checks: false,
// 	database: 0,
// 	perfix: "websocketCenter_",
// 	options: {
// 		auth_pass: 'M8pmIq0z2X0P3tqc'
// 	}
// };

// this.mysql = {
// 	host: "rds3yie2u3yie2u.mysql.rds.aliyuncs.com",
// 	port: 3306,
// 	user: 'cloudpoint',
// 	password: '1122qqrds',
// 	database: 'cloudpoint'
// };

// this.gatewayHostName = 'wss://websocketCenter1.cpo2o.com';

// TEST CONFIG
this.redis = {
	host: '127.0.0.1', // default 
	port: 6379, // default 
	max_clients: 30, // defalut 
	perform_checks: false, // checks for needed push/pop functionality
	database: 0, // database number to use
	perfix: "websocketCenter_",
	options: {
		auth_pass: '033481033481'
	} // options for createClient of node-redis, optional 
};

this.mysql = {
	host: "127.0.0.1",
	port: 3306,
	user: 'hewenhan',
	password: '033481033481',
	database: 'uu'
};

this.gatewayHostName = 'ws://192.168.10.102';
