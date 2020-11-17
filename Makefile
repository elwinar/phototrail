root = $(shell pwd)
build_dir = $(root)/build
bin_dir = $(root)/bin
release_dir = $(root)/release

tag = $(shell git describe --tags --dirty)
commit = $(shell git rev-parse @)
built_at = $(shell date '+%FT%T%:z')
ldflags="-X main.Version=${tag} -X main.Commit=${commit} -X main.BuiltAt=${built_at}"

targets=linux/amd64
pkg=github.com/elwinar/phototrail

.PHONY: help
help: ## Get help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-10s\033[0m %s\n", $$1, $$2}'

.PHONY: all
all: install build ## Install dependencies & build all targets

.PHONY: install
install: ## Install the dependencies needed for building the package
	npm install
	go mod download
	go get github.com/rakyll/statik

.PHONY: build
build: web phototrail ## Build all targets

.PHONY: serve
serve: ## Run the web interface
	./node_modules/.bin/parcel -d $(build_dir)/web/ --host 0.0.0.0 web/index.html web/favicon.svg

.PHONY: web
web: ## Build the web interface
	rm -rf $(build_dir)/web
	./node_modules/.bin/parcel build -d $(build_dir)/web/ web/index.js web/favicon.svg
	rm -rf $(bin_dir)/phototrail/internal
	statik -f -src $(build_dir)/web -dest $(bin_dir)/phototrail/ -p internal -m

.PHONY: phototrail
phototrail: ## Build the server
	go build -o $(build_dir) -ldflags $(ldflags) $(bin_dir)/phototrail

.PHONY: clean
clean: ## Remove all artifacts and untracked files
	rm -rf $(build_dir)
	rm -rf $(release_dir)
	rm -rf .cache
	rm -rf node_modules
	git clean -df

