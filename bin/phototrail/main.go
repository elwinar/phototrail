package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	_ "github.com/elwinar/phototrail/bin/phototrail/internal"
	"github.com/inconshreveable/log15"
	"github.com/jmoiron/sqlx"
	"github.com/julienschmidt/httprouter"
	"github.com/phyber/negroni-gzip/gzip"
	"github.com/rakyll/statik/fs"
	"github.com/rs/cors"
	"github.com/urfave/negroni"
	_ "rsc.io/sqlite"
)

var (
	Version = "N/C"
	BuiltAt = "N/C"
	Commit  = "N/C"
)

// main is tasked to bootstrap the service and notify of termination signals.
func main() {
	var s service
	s.configure()

	err := s.init()
	if err != nil {
		s.logger.Crit("initializing", "err", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		signals := make(chan os.Signal, 2)
		signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
		<-signals
		cancel()
	}()

	s.run(ctx)
}

// wrap an error using the provided message and arguments.
func wrap(err error, msg string, args ...interface{}) error {
	return fmt.Errorf("%s: %w", fmt.Sprintf(msg, args...), err)
}

type service struct {
	// Configuration.
	authDomain   string
	authClientID string
	bind         string
	dataDir      string
	printVersion bool

	// Dependencies
	assets   http.FileSystem
	database *sqlx.DB
	logger   log15.Logger
	rootHTML string
}

// configure read and validate the configuration of the service and populate
// the appropriate fields.
func (s *service) configure() {
	fs := flag.NewFlagSet("phototrail-"+Version, flag.ExitOnError)
	fs.Usage = func() {
		fmt.Fprintln(fs.Output(), "Usage of rcoredumpd: phototrail [options]")
		fs.PrintDefaults()
	}

	// General options.
	fs.StringVar(&s.authDomain, "auth-domain", "", "auth0 domain to use for login")
	fs.StringVar(&s.authClientID, "auth-client-id", "", "auth0 client id to use for login")
	fs.StringVar(&s.bind, "bind", "localhost:1117", "address to listen to")
	fs.StringVar(&s.dataDir, "data-dir", "./data", "directory to store server's data")
	fs.BoolVar(&s.printVersion, "version", false, "print the version of rcoredumpd")

	fs.Parse(os.Args[1:])
}

// init does the actual bootstraping of the service, once the configuration is
// read. It encompass any start-up task like ensuring the storage directories
// exist, initializing the index if needed, registering the endpoints, etc.
func (s *service) init() (err error) {
	if s.printVersion {
		fmt.Println("phototrail", Version)
		os.Exit(0)
	}

	s.logger = log15.New()
	s.logger.SetHandler(log15.StreamHandler(os.Stdout, log15.LogfmtFormat()))

	s.logger.Debug("retrieving embeded assets")
	s.assets, err = fs.New()
	if err != nil {
		return wrap(err, `retrieving embeded assets`)
	}

	s.logger.Debug("initializing data directory")
	err = os.Mkdir(s.dataDir, os.ModeDir|0774)
	if err != nil && !errors.Is(err, os.ErrExist) {
		return wrap(err, `creating data directory`)
	}

	s.logger.Debug("connecting to the database")
	s.database, err = sqlx.Connect("sqlite3", filepath.Join(s.dataDir, "database.sqlite"))
	if err != nil {
		return wrap(err, `connecting to database`)
	}

	s.logger.Debug("building assets")
	s.rootHTML = fmt.Sprintf(`
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Phototrail</title>
				<link rel="stylesheet" href="/assets/index.css">
				<link rel="shortcut icon" type="image/svg" href="/assets/favicon.svg"/>
			</head>
			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				<script>
					document.Version = '%s';
					document.BuiltAt = '%s';
					document.Commit = '%s';
					document.config = {
						authDomain: '%s',
						authClientID: '%s',
					};
				</script>
				<script src="/assets/index.js"></script>
			</body>
		</html>
	`, Version, BuiltAt, Commit, s.authDomain, s.authClientID)

	return nil
}

// run does the actual running of the service until the context is closed.
func (s *service) run(ctx context.Context) {
	s.logger.Debug("registering routes")
	router := httprouter.New()
	router.GET("/", s.root)
	router.GET("/about", s.about)

	router.ServeFiles("/assets/*filepath", s.assets)
	router.NotFound = http.HandlerFunc(s.notFound)
	router.MethodNotAllowed = http.HandlerFunc(s.methodNotAllowed)

	s.logger.Debug("registering middlewares")
	stack := negroni.New()
	stack.Use(negroni.NewRecovery())
	stack.Use(negroni.HandlerFunc(s.logRequest))
	stack.Use(cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodDelete},
	}))
	stack.Use(gzip.Gzip(gzip.DefaultCompression))
	stack.UseHandler(router)

	s.logger.Debug("starting server")
	server := &http.Server{
		Addr:    s.bind,
		Handler: stack,
	}
	go func() {
		<-ctx.Done()
		ctx, cancel := context.WithTimeout(ctx, 1*time.Minute)
		defer cancel()
		err := server.Shutdown(ctx)
		if err != nil {
			s.logger.Error("shuting server down", "err", err)
			return
		}
	}()
	err := server.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		s.logger.Error("closing server", "err", err)
	}
	s.logger.Info("stopping server")
}

// Log a request with a few metadata to ensure requests are monitorable.
func (s *service) logRequest(rw http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	start := time.Now()

	next(rw, r)

	res := rw.(negroni.ResponseWriter)
	s.logger.Info("request",
		"started_at", start,
		"duration", time.Since(start),
		"method", r.Method,
		"path", r.URL.Path,
		"status", res.Status(),
	)
}

// write a payload and a status to the ResponseWriter.
func write(w http.ResponseWriter, status int, payload interface{}) {
	w.WriteHeader(status)
	raw, err := json.Marshal(payload)
	if err != nil {
		panic(err)
	}
	_, _ = w.Write(raw)
}

// Error type for API return values.
type Error struct {
	Err string `json:"error"`
}

// write an error and a status to the ResponseWriter.
func writeError(w http.ResponseWriter, status int, err error) {
	write(w, status, Error{Err: err.Error()})
}

func (s *service) notFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, fmt.Errorf(`endpoint %q not found`, r.URL.Path))
}

func (s *service) methodNotAllowed(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusMethodNotAllowed, fmt.Errorf(`method %q not allowed for endpoint %q`, r.Method, r.URL.Path))
}

func (s *service) root(rw http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	_, err := rw.Write([]byte(s.rootHTML))
	if err != nil {
		s.logger.Error("writing response", "err", err)
	}
}

func (s *service) about(rw http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	write(rw, http.StatusOK, map[string]string{
		"built_at": BuiltAt,
		"commit":   Commit,
		"version":  Version,
	})
}
