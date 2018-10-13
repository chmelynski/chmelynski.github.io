
var fs = require('fs');
var express = require('express');
var app = express();

var options = { setHeaders : function(res, path, stat) { res.set('Access-Control-Allow-Origin', 'http://sandbox.hyperdeck.io'); } };
app.use(express.static('C:\\users\\adam\\desktop', options));

// general middleware
//app.use(function (req, res, next) { console.log('Time:', Date.now()); next(); });

app.get('/', function (req, res) {
	res.send('Hello World!');
});

var server = app.listen(80, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Example app listening at http://%s:%s', host, port);
});

