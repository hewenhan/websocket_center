// // client message like
//     {
//         type: 'utf8',
//         utf8Data: '{"type":"login","serial":"1471329462378","uniqueid":"cc79cfb87a42"}' 
//     }
// print process.argv

argv = {
	'-L': 0
};

for (var i = 0; i < process.argv.length; i = i + 2) {
	argv[process.argv[i]] = process.argv[i + 1];
}

setTimeout(function () {
	var wsServer = require('./apps/ws/websocketServer').wsServer;
	var connectionsProcess = require('./apps/ws/connectionsProcess');

	var heapdump = require('heapdump');
	var fs = require('fs');
	var path = require('path');
	fs.writeFileSync(path.join(__dirname, 'app.pid'), process.pid);
}, argv['-L']);