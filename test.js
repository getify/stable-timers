var stable_timers = require("./index.js");

var now = Date.now();

stable_timers.setTimeout(function(){
	console.log("2");
},1000);

stable_timers.setTimeout(function(){
	stable_timers.setTimeout(function(){
		console.log("1");
	},1000 - (Date.now() - now));
},500);
