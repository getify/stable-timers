/*! stable-timers
    v0.0.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
	if (typeof define === "function" && define.amd) { define(definition); }
	else if (typeof module !== "undefined" && module.exports) { module.exports = definition(); }
	else { context[name] = definition(name,context); }
})("StableTimers",this,function DEF(){
	"use strict";

	var global = Function("return this")(),
		timer_entries = [], tick = null, counter = 0,
		default_interval = 4, next_tick_ts = null,
		tick_type = 0, needs_sort = false, public_api,

		_setTimeout = global.setTimeout,
		_setInterval = global.setInterval,
		_clearTimeout = global.clearTimeout,
		_clearInterval = global.clearInterval
	;

	function setTimeout(fn,delay) {
		return setTimer(
			/*keepGoing=*/false,
			/*callback=*/fn,
			/*interval=*/delay,
			/*args=*/[].slice.call(arguments,2)
		);
	}

	function clearTimeout(id) {
		removeTimerEntry(id,/*repeatingInterval=*/false);
	}

	function setInterval(fn,delay) {
		return setTimer(
			/*keepGoing=*/true,
			/*callback=*/fn,
			/*interval=*/delay,
			/*args=*/[].slice.call(arguments,2)
		);
	}

	function clearInterval(id) {
		removeTimerEntry(id,/*repeatingInterval=*/true);
	}

	function removeTimerEntry(id,repeatingInterval) {
		for (var i=0; i<timer_entries.length; i++) {
			// found matching entry?
			if (timer_entries[i][1] === id &&
				timer_entries[i][3] === repeatingInterval
			) {
				// remove entry
				timer_entries.splice(i,1);
				break;
			}
		}

		if (timer_entries.length == 0) {
			clearTick();
		}
	}

	function setupTickClock(now) {
		tick = _setInterval(runTick,default_interval);
		next_tick_ts = now + default_interval;
		tick_type = 0;
	}

	function clearTick() {
		if (tick != null) {
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

	// setup one-time tick at adjusted `nextTS` time
	function adjustTick(nowTS,nextTS,nextInterval) {
		clearTick();

		// setup adjustment tick
		tick = _setTimeout(function adjustmentTick(){
			tick = null;
			runTick();

			// resume regular repeating ticks?
			if (timer_entries.length > 0 && tick == null) {
				setupTickClock(nowTS);
			}
		},nextInterval);

		next_tick_ts = nextTS;

		// adjustment tick will be one-time
		tick_type = 1;
	}

	function setTimer(keepGoing,callback,interval,args) {
		var id = counter++, entry_ts, now = Date.now();

		interval = Math.max(+interval || 0,0);

		// create timer entry
		entry_ts = now + interval;
		timer_entries.push(
			[
				/*timestamp=*/entry_ts,
				/*timerID=*/id,
				/*interval=*/interval,
				/*repeat=*/!!keepGoing,
				/*timerCallback=*/callback,
				/*args=*/args
			]
		);
		needs_sort = true;

		// need to setup next tick?
		if (tick == null) {
			setupTickClock(now);
		}
		// need to adjust next tick to earlier timestamp?
		else if (entry_ts < next_tick_ts) {
			adjustTick(
				/*nowTS=*/now,
				/*nextTS=*/Math.max(
					entry_ts,
					// clamp minimum timestamp
					(now + default_interval)
				),
				/*nextInterval=*/Math.max(
					interval,
					// clamp minimum interval
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
		var entry, idx, now = Date.now();

		next_tick_ts += default_interval;

		// timer entries in potentially unsorted order?
		if (needs_sort && timer_entries.length > 1) {
			timer_entries.sort(sortTimers);
			needs_sort = false;
		}

		while (timer_entries.length > 0) {
			// next timer entry ready to run at this moment?
			// note: using `Date.now()` here instead of `now`
			//   to make sure to take into account how long
			//   previous entries have taken to run on this tick
			if (timer_entries[0][0] <= Date.now()) {
				// extract and run entry
				entry = timer_entries.shift();
				entry[4].apply(this,entry[5]);

				// re-insert repeating entry (aka setInterval)?
				if (entry[3]) {
					// update to next timestamp
					// note: using `now` here instead of `Date.now()`
					//   to prevent the entry from being relative to
					//   how long previous entries have taken to run
					//   on this tick
					entry[0] = entry[2] + now;
					idx = 0;

					// need to find (sorted) insert index?
					if (timer_entries.length > 0) {
						for (var i=0; i<timer_entries.length; i++) {
							// found the first entry later than new entry
							if (timer_entries[i][0] < entry[0]) {
								idx = i;
								break;
							}
						}
					}

					// insert entry at correct (sorted) location
					time_entries.splice(idx,0,entry);
				}
			}
			else {
				// need to adjust next tick to later timestamp?
				if (tick != null && next_tick_ts < timer_entries[0][0]) {
					// note: using `now` here instead of `Date.now()`
					//   to prevent the adjustment from being relative
					//   to how long previous entries have taken to run
					//   on this tick
					adjustTick(
						/*nowTS=*/now,
						/*nextTS=*/timer_entries[0][0],
						/*nextInterval=*/(timer_entries[0][0] - now)
					);
				}

				// no more entries to inspect this tick
				break;
			}
		}

		// all entries processed?
		if (timer_entries.length == 0) {
			clearTick();
		}
	}

	// overwrite the global timer APIs directly
	function replaceGlobals() {
		global.setTimeout = setTimeout;
		global.clearTimeout = clearTimeout;
		global.setInterval = setInterval;
		global.clearInterval = clearInterval;

		return public_api;
	}

	public_api = {
		replaceGlobals: replaceGlobals,

		setTimeout: setTimeout,
		clearTimeout: clearTimeout,
		setInterval: setInterval,
		clearInterval: clearInterval
	};

	return public_api;
});
