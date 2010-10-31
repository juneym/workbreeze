/**
 * Sites object
 * @constructor
 * @this {workbreeze.sites}
 * @param {workbreeze.storage} storage Storage
 * @param {Object} s Options
 */
workbreeze.sites = function(storage, s) {
	var self = this;
	
	/**
	 * Options
	 * @type {Object}
	 */
	var options = $.extend( {
		iconPrefix: 'sico',
		place: '#sites'
	}, s);
	
	var place = $(options.place);

	/**
	 * Array of sites
	 * @type {Array} 
	 */
	var sites = [];
	
	var selected = [];
	
	/**
	 * Toggle selected item
	 * @todo refactor and group
	 * @param {number} item
	 */
	var toggleSelected = function(item) {
		$('#s' + item, options.place).toggleClass('checked');
	
		var index = $.inArray(item, selected);
			
		if (index >= 0) {
			selected.splice(index, 1);
		} else {
			selected.push(item);
		}
	}
	
	/**
	 * Filter item identifier
	 * @const
	 * @type {string}
	 */
	self.identifier = 'sites';
	
	/**
	 * Filter item value
	 * @return {Array}
	 */
	self.getValue = function() {
		return selected;
	}

	/**
	 * Set the filter item value
	 * @param {Object|string} value
	 */
	self.setValue = function(value) {
		selected = value || [];
		
		$('li', place).each( function() {
			var self = $(this);
		
			var tmp = self.attr('site');
			
			if (tmp) {
				var tmpch  = self.hasClass('checked');
			
				if (tmp in selected) {
					if (!tmpch) {
						self.addClass('checked');
					}
				} else {
					if (tmpch) {
						self.removeClass('checked');
					}
				}
			}
		} );
	}

	/**
	 * Get local storage sites version
	 * @return {number} Site object version
	 */
	self.getLocalVersion = function() {
		var sver = storage.getVersion(self.identifier);
	
		if (sver > 0) {
			var tmp = storage.get(self.identifier);

			sites = tmp[1];
		}

		return sver;
	}
	
	/**
	 * Getter
	 * @param {number} index Index
	 * @return {Array} Site item
	 */
	self.get = function(index) {
		return sites[index];
	}

	/**
	 * Sites count
	 * @return {number} Sites count
	 */
	self.count = function() {
		return sites.length;
	}

	/**
	 * Load sites
	 * @param {!Object} val Load site objects from ajax request
	 */
	self.load = function(val) {
		var tmp = val['vl'];

		$(tmp).each( function() {	
			var site = this;
		
			var item = [];
			item[0] = site['i'];  // id
			item[1] = site['f'];  // folder
			item[2] = site['n'];  // name
			item[3] = site['u'];  // url
		
			sites[item[0]] = item;
		} );
	
		storage.set(self.identifier, sites, val['v']);
	}

	/**
	 * onChanged handler
	 */
	self.onChanged = function() { };

	/**
	 * Init sites info
	 */
	self.init = function() {
		$(sites).each( function() {
			var site = this;

			var sp  = $('<span></span>')
				.addClass(options.iconPrefix)
				.addClass(options.iconPrefix + '_' + site[0])
				.html(site[2]);

			var li = $('<li></li>')
				.addClass('checkable')
				.attr( {
					'id'   : 's' + site[0],
					'site' : site[0]
				} )
				.click(site[0], function(e) {
					toggleSelected(e.data);
					
					self.onChanged();
				} );
		
			li.appendTo(place);
			sp.appendTo(li);
		} );
	}
}
