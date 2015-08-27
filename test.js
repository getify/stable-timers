var stable_timers = require("./index.js");

stable_timers.setTimeout(function(){
	console.log("2");
},1000);

stable_timers.setTimeout(function(){
	stable_timers.setTimeout(function(){
		console.log("1");
	},497);
},500);
