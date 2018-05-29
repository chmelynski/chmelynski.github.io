var express = require('express');
var app = express();
app.use(express.static('.'));
app.listen(713, function(){});
console.log('listening on port 713...');
