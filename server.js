var express = require('express');
var app = express();
//var options = { setHeaders: function(res, path, stat) { res.set('Access-Control-Allow-Origin', 'http://sandbox.hyperdeck.io'); } };
var options = { setHeaders: function(res, path, stat) { res.set('Access-Control-Allow-Origin', null); } };
app.use(express.static('.', options));
app.listen(713, function(){});
console.log('listening on port 713...');
