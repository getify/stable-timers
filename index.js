(function stableTimers(){
	"use strict";

	var global = Function("return this")(),
		_setTimeout = global.setTimeout,
		_setInterval = global.setInterval,
		_clearTimeout = global.clearTimeout,
		_clearInterval = global.clearInterval,
		queue = [], tick = null, counter = 0,
		default_interval = 4
	;

	global.setTimeout = function setTimeout(fn,delay) {
		console.log("timer set");
		return setTimer(
			/*keepGoing=*/false,
			/*callback=*/fn,
			/*interval=*/delay,
			/*args=*/[].slice.call(arguments,2)
		);
	};

	global.clearTimeout = function clearTimeout(id) {
		for (var i=0; i<queue.length; i++) {
			if (queue[i] && queue[i][1] === id) {
				queue.splice(i,1);
				break;
			}
		}

		if (queue.length == 0) {
			_clearInterval(tick);
			tick = null;
		}
	};

	global.setInterval = function setInterval(fn,delay) {
		return setTimer(
			/*keepGoing=*/true,
			/*callback=*/fn,
			/*interval=*/delay,
			/*args=*/[].slice.call(arguments,2)
		);
	};

	global.clearInterval = global.clearTimeout;

	function setTimer(keepGoing,callback,interval,args) {
		var ts = Date.now() + (+interval || 0);
		var id = counter++;

		args.unshift(ts,id,keepGoing,callback);
		queue.push(args);
		if (!tick) {
			tick = _setInterval(runTick,default_interval);
		}
		return id;
	}

	function sortTimers(t1,t2) {
		if (t1[0] < t2[0]) return -1;
		else if (t1[0] > t2[0]) return 1;
		else {
			if (t1[1] < t2[1]) return -1;
			else return 1;
		}
	}

	function runTick() {
		var ts = Date.now();

		queue.sort(sortTimers);

		while (queue.length > 0) {
			if (queue[0][0] <= ts) {
				queue[0][3].apply(this,queue[0].slice(3));
				queue.shift();
			}
			else break;
		}

		if (queue.length == 0) {
			_clearInterval(tick);
			tick = null;
		}
	}

})();




