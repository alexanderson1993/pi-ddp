var gpio = require('rpi-gpio');
var ddp = require('ddp');
var fs = require('fs');


var HID = require('node-hid');
var underscore = require('underscore');

var settings = fs.readFileSync('./settings.json',{encoding:'UTF-8'});
settings = JSON.parse(settings);

//////////////////////////////////////////////////////
/////				DDP Client					 /////
//////////////////////////////////////////////////////

var ddpclient = new ddp({
	host: settings.host,
	port: settings.port,
	ssl: false,
	autoReconnect: true,
	autoReconnectTimer: 500,
	maintainCollections: true,
	ddpVersion: '1',
	useSockJs: true
});

ddpclient.connect(function(error, wasReconnect){
	if (error){
		console.log('DDP Connection Error!',error);
		return;
	}

	if (wasReconnect){
		console.log('Reestablishment of a connection.');
	}

	console.log('Connected to ' + settings.host + ' on port ' + settings.port);

	ddpclient.subscribe('pins',[],function(){});
	var observer = ddpclient.observe("pins");
	observer.added = function(id){
		newFields = ddpclient.collections.pins[id];
		if (newFields.type == 'out')
			writeToPin(newFields.number,newFields.state);
	}
	observer.changed = function(id){
		newFields = ddpclient.collections.pins[id];
		if (newFields.type == 'out')
			writeToPin(newFields.number,newFields.state);
	}
	observer.removed = function(id, oldValue){
		writeToPin(oldValue.number,false);
	}

	readFromPin(12,34,function(pin,value){
		ddpclient.call('pinInput',[pin,value],function(err,result){
			//console.log(pin,value,result);
		})
	})
});


//////////////////////////////////////////////////////
/////				GPIO Reader					 /////
//////////////////////////////////////////////////////

function writeToPin(pin,state){
	gpio.setup(pin, gpio.DIR_OUT, function(){
		gpio.write(pin,state,function(err){
			if (err) throw err;
		});
	});
}

function readFromPin(pin,interval,callback){
	interval = interval || 500;
	gpio.setup(pin, gpio.DIR_IN,function(){
		var curValue = false;
		setInterval(function(){
			gpio.read(pin,function(err,value){
				if (value != curValue){
					curValue = value;
					callback(pin,value);
				}
			});
		},interval);
	});
}


//////////////////////////////////////////////////////
/////				RFID Reader					 /////
//////////////////////////////////////////////////////
var devices = HID.devices();

//Assume that the topmost device is the one we want.
var path = devices[0].path;

var device = new HID.HID(path);

//Create our function
var brigState = false;
toggleBrig = underscore.debounce(function(){
	ddpclient.call('brigToggle',function(err,result){
		brigState = result;
		console.log(brigState);
	})
},100,true);

device.on('data',toggleBrig);

