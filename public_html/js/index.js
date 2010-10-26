/** @type {number} **/ var lastStamp = 0;
/** @type {number} **/ var updateCount = 0;

var queueTimer;
var newTimer;
var filterTimer;

/** @type {Boolean} **/ var updatingBottom = false;
/** @type {Boolean} **/ var helpVisible = false;
/** @type {number} **/  var lastBottom = 0;
/** @type {Boolean} **/ var paused = false;

/** @type {Array} **/ var queue    = [];
/** @type {Array} **/ var joblist  = [];
/** @type {Array} **/ var money = ['%d р.', '$%d'];

var places = {
	/** @type {jQuery} **/ templateJob: null,
	/** @type {jQuery} **/ placeJob:    null,
	/** @type {jQuery} **/ buttonPlay:  null,
	/** @type {jQuery} **/ buttonPause: null,
	/** @type {jQuery} **/ logo:        null,
	/** @type {jQuery} **/ keyword:     null,
	/** @type {jQuery} **/ filterMode:  null
}

var options = {
	/** @type {number} **/  defJobPageCount: 30,
	/** @type {number} **/  maxJobPageCount: 30,
	/** @const **/ maxTitleLength:           75,
	/** @const **/ checkInterval:            60000,
	/** @const **/ checkIntervalFiltered:    90000,
	/** @const **/ siteIconPrefix:           'sico',
	/** @const **/ animationSpeed:           'slow',
	
	/** @const **/ classSelected:            'jsel',
	/** @const **/ classNotSelected:         'jrem',
	
	/** @const **/ elementSites:             'sites',
	/** @const **/ elementLang:              'lang',
	/** @const **/ elementCats:              'cats',
	/** @const **/ elementKeywords:          'keys',
	/** @const **/ elementJobStamp:          'jstamp',
	/** @const **/ elementFilter:            'filter'
}

function checkJobPlace() {
	while (joblist.length > options.maxJobPageCount) {
/* <debug> */
		console.info('Removing last job');
/* </debug> */
	
		tmpEl = joblist.shift();
		tmpEl.fadeOut(options.animationSpeed, function() { 
			$(this).remove();
		});
	}
}

/**
 * Prepare a query for new jobs request
 * @param {!number} stamp
 * @return {Object} Params
 */
function prepareDataForJobs(stamp) {
	var adata = {};	
	adata[options.elementJobStamp] = stamp;

	if (settings.filterMode) {
		if (sites.length != settings.selsites.length) {
			adata[options.elementFilter + '_' + options.elementSites] = settings.selsites.join(',');
		}
		
		if (cats.length != settings.selcats.length) {
			adata[options.elementFilter + '_' + options.elementCats] = settings.selcats.join(',');
		}
		
		if (settings.keywords.length > 0) {
			adata[options.elementFilter + '_' + options.elementKeywords] = settings.keywords.join(',');
		}
	}

	return adata;
}

function checkNewJobs() {
	var adata = prepareDataForJobs(lastStamp);

	$.up({
		data: adata,
		success: function(data) {
			if (null == data) 
				return;
		
			if ('j' in data) {
/* <debug> */
				console.info('New jobs pack: ' + data['j'].length);
/* </debug> */
				parseJobs(data['j']);
			}
		
			setNewTimer(settings.filterMode ? options.checkIntervalFiltered : options.checkInterval);
		},
		error: function() {
			setNewTimer(options.checkInterval * 2);
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
 */
function popFromQueue() {
	var tmpJob = queue.pop();
	var tmpEl = tmpJob.element;

	joblist.push(tmpEl);
	
	tmpEl
		.hide();
		
	if (tmpJob.stamp < 0) {
		tmpEl.appendTo(places.placeJob);
		
/* <debug> */
		console.info('increment maxJobPageCount');
/* </debug> */
		
		options.maxJobPageCount++;
	} else {
		if (
			$(window).scrollTop() == 0
			&& options.maxJobPageCount - 2 >= options.defJobPageCount
		) {
/* <debug> */
			console.info('decrement maxJobPageCount');
/* </debug> */
		
			options.maxJobPageCount = options.maxJobPageCount - 2;
		}
	
		tmpEl.prependTo(places.placeJob);

		if (options.windowHidden) {
			var tmptitle = $('.title', tmpEl).val();
			var desc     = $('.desc', tmpEl).val();

			notifications.notify(tmptitle, desc);
		}
	}
		
	tmpEl.show();

	// make job normal
	setTimeout( function() {
		tmpEl.animate( {
			'margin-left': '0px'
		}, 'slow' );
	}, 30000 );
	
	if (!settings.filterMode) {
		checkJobForFilter(tmpEl);
	}

	checkJobPlace();
}

function checkQueue() {
	if (queue.length > 0)
		popFromQueue();
}

/**
 * Add job to queue
 * @param {!Object} job Job object
 */
function addJob(job) {
	var abstemp = Math.abs(job.stamp);

	if (abstemp > lastStamp) {
		lastStamp = abstemp;
	}

	var jobEl = places.templateJob.clone();

	jobEl
		.attr( {
			'stamp': abstemp,
			'site': job.site,
			'cats': job.cats.join(',')
		} )
		// set new jobs a little offset
		.css( {
			'margin-left': '-10px'
		} )
		.hide();

	var htmltitle = job.title;

	if (job.title.length > options.maxTitleLength) {
		var tmpindex = job.title.substring(0, options.maxTitleLength).lastIndexOf(' ');

		if (tmpindex < 0) {
			tmpindex = options.maxTitleLength;
		}

		htmltitle = job.title.substring(0, tmpindex) + '...';
	}

	lnk = $("<a>")
		.addClass(options.siteIconPrefix)
		.addClass(options.siteIconPrefix + '_' + sites[job.site][0])
		.attr({
			'href': '/jobs/' + sites[job.site][1] + '/' + job.id + '.html',
			'title': job.title + ' ' + langVal('on') + ' ' + sites[job.site][2]
		})
		.html(htmltitle)
		.appendTo($('li.title', jobEl));

	$('li.desc', jobEl).html(job.desc);
	
	var stmp = new Date(abstemp * 1000);
	
	$('li.time', jobEl).html(humanizedTime(stmp));

	if (undefined != job.money) {
		var fmt = money[job.currency];
	
		$('li.money', jobEl).html(fmt.replace('%d', job.money));
	}

	var tmpDesc = job.title + ' ' + job.desc;
	tmpDesc = tmpDesc.replace(/&(lt|gt);/g, function(strMatch, p1) {
		return (p1 == 'lt') ? '<' : '>';
	});
	tmpDesc = tmpDesc.replace(/<\/?[^>]+(>|$)/g, '');
	tmpDesc = tmpDesc.toLowerCase();

	$('li.k', jobEl).html(tmpDesc);
	
	var jEl = {
		stamp: job.stamp,
		element: jobEl
	};
	
	queue.push(jEl);
	
	popFromQueue();
}

/**
 * Parse job info
 * @param {!Array} job Job info array
 */
function parseJobs(jobs) {
	for (var i = jobs.length - 1; i >= 0; i--) {
		var job = {
			id:    jobs[i]['i'],
			site:  jobs[i]['s'],
			stamp: jobs[i]['st'],
			title: jobs[i]['t'],
			cats:  jobs[i]['c'],
			desc:  jobs[i]['d']
		};

		if ('m' in jobs[i]) {
			job.money = jobs[i]['m'][0];
			job.currency = jobs[i]['m'][1];
		}
		
		addJob(job);
	}
}

function streamToggle() {
	if (paused) {
		streamPlay();
	} else {
		streamPause();
	}
}

function streamPause() {
/* <production>
	if ('undefined' != typeof(_gaq)) {
		_gaq.push(['_trackEvent', 'Stream', 'Pause']);
	}
</production> */

	places.buttonPause.slideUp(options.animationSpeed);
	places.buttonPlay.slideDown(options.animationSpeed);

	queue = [];
	dropNewTimer();

	paused = true;
}

function streamPlay() {
	if (
		0 == settings.selsites.length
		|| 0 == settings.selcats.length
	) {
		return;
	}

	streamAutoPause = false;
	paused = false;

/* <production>
	if ('undefined' != typeof(_gaq)) {
		_gaq.push(['_trackEvent', 'Stream', 'Resume']);
	}
</production> */

	places.buttonPlay.slideUp(options.animationSpeed);
	places.buttonPause.slideDown(options.animationSpeed);

	lastStamp = Math.round(new Date().getTime() / 1000);
	setNewTimer(5000);
}

function updateBottom() {
	var firstStamp = $('ul:last', places.placeJob).attr('stamp');
	
	if (lastBottom == firstStamp) {
		return;
	} else {
		lastBottom = firstStamp;
	}

	updatingBottom = true;

	dropNewTimer();

/* <debug> */
	console.info('update less than ' + firstStamp);
/* </debug> */

	var adata = prepareDataForJobs(-firstStamp);

	$.up({
		data: adata,
		success: function(data) {
			if (null === data) {
				return;
			}
			
			if ('j' in data) {
/* <debug> */
				console.info('New jobs bottom pack: ' + data['j'].length);
/* </debug> */
				parseJobs(data['j']);
			}	
		},
		ping: function() {
			updatingBottom = false;

			setNewTimer(settings.filterMode ? options.checkIntervalFiltered : options.checkInterval);
		}
	});
}

function init() {
	places.logo        = $('#logo');
	places.templateJob = $('ul.job:first');
	places.placeJob    = $('#jobs');
	places.keyword     = $('#keyword');
	places.filterMode  = $('#mode_f');

	if (settings.keywords.length != 0) {
		places.keyword.val(settings.keywords.join(', '));
	}
	
	if (settings.filterMode) {
		places.filterMode.toggleClass('checked');
	}
	
	var adata = prepareDataForJobs(0);
	
	adata[options.elementLang]     = getLangVersion();
	adata[options.elementSites]    = getSitesVersion();
	adata[options.elementCats]     = getCatsVersion();
	
	$.up({
		data: adata,
		success: function(data) {
			$('html, body').css({scrollTop:0});
			
			setNewTimer(options.checkInterval);
	
			if (null == data) 
				return;

			if ('l' in data) {
/* <debug> */
				console.info('New lang pack');
/* </debug> */
				loadLang(data['l']);
			}
			
			if ('c' in data) {
/* <debug> */
				console.info('New categories pack');
/* </debug> */
				loadCats(data['c']);
			}
			
			if ('s' in data) {
/* <debug> */
				console.info('New sites pack');
/* </debug> */
				loadSites(data['s']);
			}
			
			if ('j' in data) {
/* <debug> */
				console.info('New jobs pack: ' + data['j'].length);
/* </debug> */
				parseJobs(data['j']);
			}
		},
		ping: function() {
			$(window).scroll(function() {
				if (
					$(window).scrollTop() >= $(document).height() - $(window).height()
					&& !updatingBottom
				) {
					updateBottom();
				}
			} );
			
			localize();
			initCats();
			initSites();
		}
	});
		
	$('#bfoot, .help, #menu').css({'opacity': 0.8});

	places.buttonPlay  = $('#play');
	places.buttonPause = $('#pause');
	
	places.buttonPause.click(streamToggle);
	places.buttonPlay.click(streamToggle);
	
	places.logo.ajaxStart(function() {
		$(this).animate({'opacity': 0.7}, options.animationSpeed);
	});
	
	places.logo.ajaxStop(function() {
		$(this).animate({'opacity': 1});
	});

	setQueueTimer(5000);
	
	// removing right content
	$('#right ul').remove();
	
	$('#help').click(function() {
		$('.help').animate({'opacity': 'toggle', 'height': 'toggle'}, options.animationSpeed);
		
		if (!helpVisible) {
			$('html, body').animate({'scrollTop':0}, 'slow');
		}
		
		helpVisible = !helpVisible;
	});
	
	places.keyword
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
		
	places.filterMode.click(function() {
		settings.toggleFilterMode();
		settings.save();
		places.filterMode.toggleClass('checked');		
	});
};

$( function() {
	init();
} );
