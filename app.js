'use strict';
var App = Ember.Application.create();

App.Router.map(function() {
	this.route('browse');
	this.resource('search', function() {
		this.route('query', {path: '/:query'});
	});
	this.route('makom', {path: '/makom/:id'});
	this.route('near-me');
});

App.ApplicationRoute = Ember.Route.extend({
	model: function() {
		return Ember.$.getJSON('mikomos.json');
	},
});

App.ApplicationController = Ember.Controller.extend({
	isHome: function() {
		var path = this.get('currentPath');
		return path === 'index';
	}.property('currentPath')
});

App.IndexController = Ember.Controller.extend({
	databaseDate: function() {
		var pulled = this.get('model.meta.time_pulled');
		var d = new Date(pulled);
//		return d.toUTCString('en-US');
		return moment.unix(d).fromNow();
	}.property('model.meta.time_pulled'),
	actions: {
		search: function(query) {
			this.transitionToRoute('search.query', query);
		}
	}
});

App.BrowseRoute = Ember.Route.extend({
	model: function() {
		return this.modelFor('application').mikomos;
	}
});

App.NearMeRoute = Ember.Route.extend({
	setupController: function(controller, model) {
		this._super(controller, model);
		var model = this.modelFor('application').mikomos;
		var position;
		navigator.geolocation.getCurrentPosition(function(position) {
			var lat = position.coords.latitude,
				lon = position.coords.longitude;
			console.log(lat);
			controller.set('position', position.coords);
		});
	}
});

App.MakomRoute = Ember.Route.extend({
	model: function(params) {
		var number = Number(params.id);
		var model = this.modelFor('application').mikomos;
		return model.findBy('id', number);
	}
});

App.SearchIndexRoute = Ember.Route.extend({
	model: function() {
		var model = this.modelFor('application').mikomos;
//		return model.slice(0,500);
		return model;
	}
});

App.SearchIndexController = Ember.ArrayController.extend({
	offset: 0,
	searchTerm: '',
	selectedCountry: '',
	selectedState: '',
	neighborhood: '',
	filtered: function() {
		this.set('offset', 0);
		var model = this.get('model');
		var country = this.get('selectedCountry');
		var searchTerm = this.get('searchTerm');
		var state = this.get('selectedState');
		var neighborhood = this.get('neighborhood');
		var category = this.get('selectedCategory');

		var filtered = model;
		if(searchTerm.length > 2) {
			var regex = new RegExp(searchTerm, 'i');
			filtered = filtered.filter(function(item) {
				return item.title.match(regex);
			});
		}
		if(country) {
			filtered = filtered.filterBy('country', country);
		}
		if(state) {
			filtered = filtered.filterBy('state', state);
		}
		if(neighborhood) {
			filtered = filtered.filterBy('neighborhood', neighborhood);
		}
		if(category) {
			filtered = filtered.filter(function(item) {
				return _.contains(item.categories, category)
			});
		}
		return filtered;
	}.property('selectedCountry', 'selectedState', 'neighborhood', 'selectedCategory', 'searchTerm'),
	categories: function() {
		var categories = [];
		var model = this.get('model');
		model.forEach(function(place) {
			place.categories.forEach(function(category) {
				if(!_.contains(categories, category)) {
					categories.push(category);
				}
			});
		});
//		console.log(categories);
		return categories;
	}.property('selectedCategory'),
	countries: function() {
		var countries = [];
		var model = this.get('model');
		
		model.forEach(function(place) {
			if(!_.contains(countries, place.country) && place.country) {
				countries.push(place.country);
			}
		});
		countries.push('');
		return countries.sort();
	}.property(),
	states: function() {
		this.setProperties({selectedState: null, neighborhood: null});
		var states = [];
		var model = this.get('model');
		var country = this.get('selectedCountry');
		model.forEach(function(place) {
			if(place.country === country) {
				if(!_.contains(states, place.state) && place.state) {
					states.push(place.state);
				}
			}
		});
		states.push('');
		return states.sort();
	}.property('selectedCountry'),
	neighborhoods: function() {
		this.set('neighborhood', null);
		var neighborhoods = [];
		var model = this.get('model');
		var state = this.get('selectedState');
		var country = this.get('selectedCountry');
		model.forEach(function(place) {
			if(place.state === state) {
				if(!_.contains(neighborhoods, place.neighborhood) && place.neighborhood) {
					neighborhoods.push(place.neighborhood);
				}
			}
		});
		neighborhoods.push('');
		return neighborhoods.sort();
	}.property('selectedState', 'selectedCountry'),
	actions: {
		resetAll: function() {
			this.setProperties({
				searchTerm: '',
				selectedCountry: null,
				selectedState: null,
				selectedNeighborhood: null,
				selectedCategory: null
			});
		},
		clearTerm: function() {
			this.set('searchTerm', '');
		},
		clearCategory: function() {
			this.set('selectedCategory', null);
		}
	}
});

App.SearchQueryRoute = Ember.Route.extend({
	model: function(params) {
		var model = this.modelFor('application').mikomos;
		var regex = new RegExp(params.query, 'i');
		return model.filter(function(item) {
			return item.title.match(regex);
		});
	}
});

App.ResultsViewComponent = Ember.Component.extend({
	offset: 0,
	limit: 20,
	modelLength: function() {
		return this.get('model').length;
	}.property('model'),
	maxRecord: function() {
		var limit = this.get('limit');
		var offset = this.get('offset');
		var length = this.get('modelLength');
		var maxRecord = offset + limit;
		if(maxRecord > length) {
			return length;
		}
		else {
			return maxRecord;
		}
	}.property('offset', 'limit', 'modelLength'),
	arrangedContent: function() {
		var model = this.get('model');
		var limit = this.get('limit');
		var offset = this.get('offset');
		var sliced = model.slice(offset, offset + limit);
		return sliced;
	}.property('model', 'offset', 'limit'),
	noPreviousPage: function() {
		return this.get('offset') === 0;
	}.property('offset'),
	noNextPage: function() {
		var limit = this.get('limit');
		var offset = this.get('offset');
		var length = this.get('model').length;
		if(length === 0) {
			return true;
		} else {
			return offset + limit > length;
		}
	}.property('offset', 'limit', 'model'),
	actions: {
		prevPage: function() {
			var offset = this.get('offset');
			var	limit = this.get('limit');
			if(offset !== 0) {
				this.decrementProperty('offset', limit);
			}
		},
		nextPage: function() {
			var offset = this.get('offset');
			var limit = this.get('limit');
			var length = this.get('model.length');
			if(offset + limit < length) {
				this.incrementProperty('offset', limit);
			}
		}
	}
});

App.BackButtonComponent = Ember.Component.extend({
	tagName: 'button',
	classNames: ['btn', 'btn-default', 'navbar-btn'],
	click: function() {
		history.back();
	}
});

App.AutoCompleteComponent = Ember.Component.extend({
	searchText: '',
	searchResults: function() {
		var searchText = this.get('searchText');
		var model = this.get('model');
		
		if (!searchText){
			return;
		}
		if (searchText.length > 2) {
			var regex = new RegExp(searchText, 'i');
			var result = model.filter(function(item) {
				return item.title.match(regex);
			});
		}
		return result;
	}.property('searchText'),
	actions: {
		search: function() {
			var query = this.get('searchText');
//			console.log(query);
			this.sendAction('search', query);
		}
	}
});

App.RadioButtonComponent = Ember.Component.extend({
	tagName : "input",
	type : "radio",
	attributeBindings : ["type", "value", "checked:checked"],
	click : function() {
		this.set("selection", this.$().val());
	},
	checked : function() {
		return this.get("value") === this.get("selection");
	}.property('selection')
});