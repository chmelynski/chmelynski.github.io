
var fs = require('fs');
var express = require('express');

var app = express();
app.use(express.static('C:\\users\\adam\\desktop\\three'));
app.listen(3000, function(){});

