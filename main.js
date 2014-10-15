'use strict';

require('fetch');
var Delegate = require('dom-delegate');
var header = document.querySelector('.o-header');
var defaultPanel = header.getAttribute('data-default-panel');
var delegate = new Delegate(header);
var bodyDelegate = new Delegate();

delegate.on('click', '.o-header-button-js', function(event) {
	event.preventDefault();
	event.stopPropagation();

	// HACK
	var targetPanel = event.target.getAttribute('data-target-panel')
		|| event.target.parentNode.getAttribute('data-target-panel')
		|| defaultPanel;
	var currentPanel = header.getAttribute('data-panel');
	if (currentPanel !== targetPanel && targetPanel !== defaultPanel) {
		bodyDelegate.root(document.body);
		header.setAttribute('data-panel', targetPanel);
	} else {
		bodyDelegate.root();
		if (defaultPanel) {
			header.setAttribute('data-panel', defaultPanel);
		} else {
			header.removeAttribute('data-panel');
		}
	}
});

delegate.on('click', function(event) {
	event.stopPropagation();
});

bodyDelegate.on('click', function(event) {
	event.preventDefault();
	event.stopPropagation();
	if (defaultPanel) {
		header.setAttribute('data-panel', defaultPanel);
	} else {
		header.removeAttribute('data-panel');
	}
});

window.fetch('http://next-companies-et-al.herokuapp.com/v1/ubernav.json')
	.then(function(res) { return res.json(); })
	.then(function(navData){
		header.querySelector('.o-header__secondary--menu-js').innerHTML = '<ul class="uber-index">'
			+ navData.data.map(function(item) {
			return '<li class="uber-index__title" data-o-grid-colspan="6 M6 L3 XL3">'
				+ '<a href="' + item.nextUrl + '">' + item.title + '</a>'
				+ '<ul class="uber-index__children">'
				+ item.navigationItems.map(function(child) {
					return '<li class="uber-index__child"><a href="' + child.nextUrl + '">' + child.title + '</a></li>';
				}).join('')
				+ '</ul>'
				+ '</li>';
			}).join('');
			+ '</ul>';
	});
