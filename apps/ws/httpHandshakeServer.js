var httpConfig = require('../../config/config.js').http;
var fs = require('fs');

var options = {
	key: fs.readFileSync('cert/214512531350797.key'),
	cert: fs.readFileSync('cert/214512531350797.pem')
};

// // wss
// var https = require('https');
// var server = https.createServer(options, function(request, response) {
// 	console.log((new Date()) + ' Received request for ' + request.url);
// 	response.writeHead(404);
// 	response.end();
// });

// ws
var https = require('http');
var server = https.createServer(function(request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	response.writeHead(404);
	response.end();
});

server.listen(httpConfig.port, function() {
	console.log((new Date()) + ' Server is listening on port ' + httpConfig.port);
});

module.exports = server;