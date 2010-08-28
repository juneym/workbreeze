/** @type {number} **/ var lastStamp = 0;

var queueTimer;
var newTimer;
var filterTimer;

/** @type {Array} **/ var queue    = [];
/** @type {Array} **/ var joblist  = [];

var places = {
	/** @type {jQuery} **/ templateJob: null,
	/** @type {jQuery} **/ placeJob:    null,
	/** @type {jQuery} **/ buttonPlay:  null,
	/** @type {jQuery} **/ buttonPause: null
}

var options = {
	/** @const **/  checkInterval = 30000;
	/** @const **/ siteIconPrefix: 'sico',
	/** @const **/ animationSpeed: 'slow'
}

function checkJobPlace() {
	while (joblist.length > 20) {
		tmpEl = joblist.shift();
		tmpEl.fadeOut(options.animationSpeed, function() { 
			$(this).remove();
		});
	}
}

function checkNewJobs() {
	dropNewTimer();

	$.ajax({
		url: '/up',
		type: 'POST',
		data: {
			'stamp': lastStamp
		},
		dataType: 'json',
		success: /** @param {*} data JSON data **/ function(data) {
			setNewTimer(options.checkInterval);

			parseJobs(data, false);
		},
		error: function() {
			setNewTimer(options.checkInterval);
		}
	});
}

function dropQueueTimer() {
	if (null != queueTimer) {
		clearTimeout(queueTimer);
	}
}

function dropNewTimer() {
	if (null != newTimer) {
		clearTimeout(newTimer);
	}
}

/**
 * Sets the queue checker timer
 * @param {!number} interval Interval
 */
function setQueueTimer(interval) {
	dropQueueTimer();
	queueTimer = setInterval(checkQueue, interval);
}

/**
 * Sets the new jobs checker timer
 * @param {!number} interval Interval
 */
function setNewTimer(interval) {
	dropNewTimer();
	newTimer = setInterval(checkNewJobs, interval);
}

/**
 * Pop the job from queue
 * @param {!boolean} instantly Disable slideDown animation
 */
function popFromQueue(instantly) {
	var tmpEl = queue.pop();

	joblist.push(tmpEl);
	
	tmpEl
		.hide()
		.prependTo(places.placeJob);
		
	if (!instantly)
		tmpEl.slideDown(options.animationSpeed, function() {
			checkJobForFilter($(this));
		} );
	else
		tmpEl.show();

	checkJobPlace();
}

function checkQueue() {
	if (queue.length > 0)
		popFromQueue(false);
}

/**
 * Add job to queue
 * @param {!Object} job Job object
 * @param {!boolean} instantly Disable slideDown animation
 */
function addJob(job, instantly) {
	if (job.stamp > lastStamp) {
		lastStamp = job.stamp;
	}

	var jobEl = places.templateJob.clone();

	jobEl
		.attr( {
			'site': job.site
		} )
		.hide();

	lnk = $("<a>")
		.addClass(siteIconPrefix)
		.addClass(siteIconPrefix + '_' + sites[job.site].folder)
		.attr({
			'href': '/jobs/' + sites[job.site].folder + '/' + job.id + '.html',
			'title': job.title + ' ' + langVal('on') + ' ' + sites[job.site].name
		})
		.html(job.title)
		.appendTo($('li.title', jobEl));

	$('li.desc', jobEl).html(job.desc);
	
	var stmp = new Date(job.stamp * 1000);
	
	$('li.time', jobEl).html(
		checkTimeVal(stmp.getHours()) + ':' +
		checkTimeVal(stmp.getMinutes())
	);
	
	queue.push(jobEl);
	
	if (instantly)
		popFromQueue(instantly);
}

/**
 * Parse job info
 * @param {!Array} job Job info array
 * @param {!boolean} instantly Disable slideDown animation
 */
function parseJobs(jobs, instantly) {
	for (var i = jobs.length - 1; i >= 0; i--) {
		var job = {
			id:    jobs[i]['i'],
			site:  jobs[i]['s'],
			stamp: jobs[i]['st'],
			title: jobs[i]['t'],
			desc:  jobs[i]['d']
		};
		
		addJob(job, instantly);
	}
}

function init() {
	$("#bfoot").css({'opacity': 0.7});

	finit();

	places.templateJob = $('ul.job:first');
	places.placeJob    = $('#right');
	
	places.buttonPlay  = $('#play');
	places.buttonPause = $('#play');
	
	places.buttonPause.click(function() {
		places.buttonPause.slideUp(options.animationSpeed);
		places.buttonPlay.slideDown(options.animationSpeed);
	
		queue = [];
		dropNewTimer();
	} );
	
	places.buttonPlay.click(function() {
		places.buttonPlay.slideUp(options.animationSpeed);
		places.buttonPause.slideDown(options.animationSpeed);

		lastStamp = Math.round(new Date().getTime() / 1000);
		setNewTimer(5000);
	} );
	
	setQueueTimer(5000);
	setNewTimer(5000);
	
	// removing right content
	$('#right > *').remove();
	
	// init request
	$.ajax({
		url: '/init',
		type: 'POST',
		data: {
			'lang':  getLangVersion(),
			'sites': getSitesVersion(),
			'cats':  getCatsVersion()
		},
		dataType: 'json',
		success: /** @param {*} data JSON data **/ function(data) {
			if ('undefined' != typeof(data['l']))
				loadLang(data['l']);

			localize();
			
			if ('undefined' != typeof(data['c']))
				loadCats(data['c']);
				
			initCats();
			
			if ('undefined' != typeof(data['s']))
				loadSites(data['s']);
			
			initSites();
			
			parseJobs(data['j'], true);
		}
	});
	
	$('#keyword')
		.keyup(function(e) {
			if (null != filterTimer) {
				clearTimeout(filterTimer);
			}
	
			if (e.keyCode == 13) {
				handleFilter();
			} else {
				filterTimer = setTimeout(handleFilter, 2000);
			}
		});
}

$( function() {
	init();
} );