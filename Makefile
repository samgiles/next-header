PHONY: build

install:
	bower install

build: install
	origami-build-tools build

watch:
	origami-build-tools build --watch

run: build
	static

update-nav:
	curl http://next-companies-et-al.herokuapp.com/v1/ubernav.json > src/uber-index.json
