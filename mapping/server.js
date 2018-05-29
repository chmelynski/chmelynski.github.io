
var express = require('express');
var app = express();

var options = { setHeaders : function(res, path, stat) { res.set('Access-Control-Allow-Origin', 'http://sandbox.hyperdeck.io'); } };
app.use(express.static('.', options));
app.listen(713, function(){});

//app.get('/', function (req, res) { res.send('Hello World!'); });

console.log('listening on port 713...');
console.log('static folder root: .');

