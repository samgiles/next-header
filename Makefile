PHONY: build

install:
	bower install

build: install
	origami-build-tools build
