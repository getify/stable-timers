var StableTimers = require("./index.js");

StableTimers.replaceGlobals();

var now = Date.now();

setTimeout(function(){
	console.log("3");
},1000);

StableTimers.setTimeout(function(){
	console.log("4");
},1000);

setTimeout(function(){
	setTimeout(function(){
		console.log("1");
	},1000 - (Date.now() - now));
},500);

StableTimers.setTimeout(function(){
	StableTimers.setTimeout(function(){
		console.log("2");
	},1000 - (Date.now() - now));
},500);
