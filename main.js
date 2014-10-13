var Delegate = require('dom-delegate');
var header = document.querySelector('.o-header');
var delegate = new Delegate(header);

delegate.on('click', '.o-header-button-js', function(event) {
	event.preventDefault();

	// HACK
	var targetPanel = event.target.getAttribute('data-target-panel')
		|| event.target.parentNode.getAttribute('data-target-panel');
	var currentPanel = header.getAttribute('data-panel');
	if (currentPanel !== targetPanel) {
		header.setAttribute('data-panel', targetPanel);
	} else {
		header.removeAttribute('data-panel');
	}
});
