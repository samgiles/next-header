'use strict';

var reqwest = require('reqwest');
var Delegate = require('dom-delegate');
var header = document.querySelector('.o-header');
var myFtButton = header.querySelector('.o-header-button[data-target-panel="myft"]');
var defaultPanel = header.getAttribute('data-default-panel');
var delegate = new Delegate(header);
var bodyDelegate = new Delegate();
var Notify = require('./src/js/Notify');
require('next-user-preferences');
var User = require('next-user-model-component');

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


// Listen for the notification poller to report the number of new items
document.addEventListener('notifications:load', function(e) {
    var notifications = e.detail;
    document.querySelector('.notify-badge').textContent = notifications.count;
});

document.addEventListener('notifications:new', function(e) {
	var data = e.detail;
	
	var id = data.notifications[0].item;
	reqwest({
		url: '/' + id,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}
	}).then(function(res) {
		new Notify({
			title: 'New article in ' + data.stream.displayText,
			body: res.headline,
			lifespan: 1000 * 10,
			onclick: function() {
				location.href = '/' + res.id;
			}
		}).show();
	}).fail(function(err) {
		new Notify({
			title: 'New article in ' + data.stream.displayText,
			lifespan: 1000 * 10,
			onclick: function() {
				location.href = '/' + data.notifications[0].item;
			}
		}).show();
	});


});

// Make the follow button visible  
function setFollowingButton () {
	var uid = new User(document.cookie).id();
	if (uid) {
		myFtButton.setAttribute('href', '/users/' + uid + '/following/new');
		myFtButton.textContent = 'Following';
		myFtButton.insertAdjacentHTML('beforeend', '<span class="notify-badge"></span>');
	}
}

function transitionMyFtButton (type) {

	function listener() {
		myFtButton.classList.remove('transitioning');
		myFtButton.removeEventListener('transitionend', listener);
	}

	myFtButton.addEventListener('transitionend', listener);
	myFtButton.classList.add('transitioning');
	myFtButton.classList.add('myft--' + type);
	myFtButton.offsetWidth; //forces repaint

	myFtButton.classList.remove('myft--' + type);
}

document.addEventListener('favourites:add', function (e) {
	transitionMyFtButton('add-favourite');
});

document.addEventListener('favourites:remove', function (e) {
	transitionMyFtButton('remove-favourite');
});

reqwest('http://next-companies-et-al.herokuapp.com/v1/ubernav.json', function(resp) {
	var data = resp.data;
	header.querySelector('.o-header__secondary--menu-js').innerHTML = '<ul class="uber-index">'
		+ data.map(function(item) {
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

setFollowingButton();
