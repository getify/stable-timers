require("./index.js");

setTimeout(function(){
	console.log("2");
},1000);

setTimeout(function(){
	setTimeout(function(){
		console.log("1");
	},497);
},500);
