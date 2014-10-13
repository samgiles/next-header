PHONY: build

install:
	bower install

build: install
	origami-build-tools build

watch:
	origami-build-tools build --watch

run: build
	static
