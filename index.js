(function stableTimers(){
	"use strict";

	var global = Function("return this")(),
		_setTimeout = global.setTimeout,
		_setInterval = global.setInterval,
		_clearTimeout = global.clearTimeout,
		_clearInterval = global.clearInterval,
		timer_entries = [], tick = null, counter = 0,
		default_interval = 4, next_tick_ts = null,
		tick_type = 0, needs_sort = false
	;

	global.setTimeout = function setTimeout(fn,delay) {
		return setTimer(
			/*keepGoing=*/false,
			/*callback=*/fn,
			/*interval=*/delay,
			/*args=*/[].slice.call(arguments,2)
		);
	};

	global.clearTimeout2 = function clearTimeout(id) {
		removeTimerEntry(id,/*repeatingInterval=*/false);
	};

	global.setInterval = function setInterval(fn,delay) {
		return setTimer(
			/*keepGoing=*/true,
			/*callback=*/fn,
			/*interval=*/delay,
			/*args=*/[].slice.call(arguments,2)
		);
	};

	global.clearInterval = function clearInterval(id) {
		removeTimerEntry(id,/*repeatingInterval=*/true);
	};

	function removeTimerEntry(id,repeatingInterval) {
		for (var i=0; i<timer_entries.length; i++) {
			// found matching entry?
			if (timer_entries[i][1] === id &&
				timer_entries[i][3] === repeatingInterval
			) {
				timer_entries.splice(i,1);
				break;
			}
		}

		if (timer_entries.length == 0) {
			clearTick();
		}
	}

	function setupRepeatingTicks() {
		tick = _setInterval(runTick,default_interval);
		next_tick_ts = Date.now() + default_interval;
		tick_type = 0;
	}

	function clearTick() {
		if (tick) {
			// repeating tick?
			if (tick_type == 0) {
				_clearInterval(tick);
			}
			else {
				_clearTimeout(tick);
			}
		}
		tick = next_tick_ts = null;
	}

	// setup one-time tick at adjusted `fromNow` time
	function adjustTick(fromNow) {
		clearTick();

		// setup adjustment tick
		tick = _setTimeout(function adjustmentTick(){
			tick = null;
			runTick();

			// resume regular repeating ticks?
			if (timer_entries.length > 0 && !tick) {
				setupRepeatingTicks();
			}
		},fromNow);

		// calculate appropriate next tick timestamp
		next_tick_ts = Date.now() + fromNow;

		// adjustment tick will be one-time
		tick_type = 1;
	}

	function setTimer(keepGoing,callback,interval,args) {
		var id = counter++, entry_ts;

		interval = Math.max(+interval || 0,0);

		// create timer entry
		needs_sort = true;
		entry_ts = Date.now() + interval;
		timer_entries.push(
			[
				/*timestamp=*/entry_ts,
				/*timerID=*/id,
				/*interval=*/interval,
				/*repeat=*/!!keepGoing,
				/*timerCallback=*/callback
			].concat(args)
		);

		// need to setup next tick?
		if (!tick) {
			setupRepeatingTicks();
		}
		// need to adjust next tick to earlier timestamp?
		else if (entry_ts < next_tick_ts) {
			adjustTick(
				/*nextInterval=*/Math.max(
					interval,
					default_interval
				)
			);
		}

		return id;
	}

	function sortTimers(t1,t2) {
		// comparing timestamps
		if (t1[0] < t2[0]) return -1;
		else if (t1[0] > t2[0]) return 1;
		else {
			// comparing expressed timer intervals
			if (t1[2] < t2[2]) return -1;
			else if (t1[2] > t2[2]) return 1;
			else {
				// comparing monotonically incremented
				// numeric IDs
				if (t1[1] < t2[1]) return -1;
				else return 1;
			}
		}
	}

	function runTick() {
		var entry, idx;

		next_tick_ts += default_interval;

		// timer entries in potentially unsorted order?
		if (needs_sort && timer_entries.length > 1) {
			timer_entries.sort(sortTimers);
			needs_sort = false;
		}

		while (timer_entries.length > 0) {
			// timer entry ready to run?
			if (timer_entries[0][0] <= Date.now()) {
				entry = timer_entries.shift();
				entry[4].apply(this,entry.slice(5));

				// re-insert repeating entry?
				if (entry[3]) {
					entry[0] = Date.now() + entry[2];
					idx = 0;

					// need to find insert index?
					if (timer_entries.length > 0) {
						for (var i=0; i<timer_entries.length; i++) {
							if (timer_entries[i][0] < entry[0]) {
								idx = i;
								break;
							}
						}
					}

					// insert at sorted location
					time_entries.splice(idx,0,entry);
				}
			}
			else {
				// need to adjust next tick to later timestamp?
				if (tick && next_tick_ts < timer_entries[0][0]) {
					adjustTick(
						/*nextInterval=*/Math.max(
							timer_entries[0][0] - Date.now(),
							default_interval
						)
					);
				}

				// no more entries to inspect this tick
				break;
			}
		}

		// all entries processed?
		if (timer_entries.length == 0 && tick != null) {
			clearTick();
		}
	}

})();
