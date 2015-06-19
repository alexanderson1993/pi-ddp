var HID = require('node-hid');
var underscore = require('underscore');
var devices = HID.devices();

//Assume that the topmost device is the one we want.

var path = devices[0].path;

var device = new HID.HID(path);

//Create our function
var brigState = false;
toggleBrig = underscore.debounce(function(){
	brigState = !brigState;
	console.log(brigState);
},100,true);

device.on('data',toggleBrig);
