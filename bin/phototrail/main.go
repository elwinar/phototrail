package main

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	_ "github.com/elwinar/phototrail/bin/phototrail/internal"
	"github.com/inconshreveable/log15"
	"github.com/jmoiron/sqlx"
	"github.com/julienschmidt/httprouter"
	_ "github.com/mattn/go-sqlite3"
	"github.com/patrickmn/go-cache"
	"github.com/phyber/negroni-gzip/gzip"
	"github.com/rakyll/statik/fs"
	"github.com/rs/cors"
	"github.com/urfave/negroni"
	"go4.org/syncutil/singleflight"
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
	authDomain       string
	authClientID     string
	authClientSecret string
	bind             string
	dataDir          string
	printVersion     bool

	// Dependencies
	assets   http.FileSystem
	database *sqlx.DB
	logger   log15.Logger
	group    *singleflight.Group
	cache    *cache.Cache
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
	fs.StringVar(&s.authClientSecret, "auth-client-secret", "", "auth0 client secret to use for login")
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
	s.database.SetMaxOpenConns(1)

	_, err = s.database.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		return wrap(err, `activating foreign keys`)
	}

	s.group = new(singleflight.Group)
	s.cache = cache.New(1*time.Minute, 2*time.Minute)

	return nil
}

// run does the actual running of the service until the context is closed.
func (s *service) run(ctx context.Context) {
	s.logger.Debug("registering routes")
	router := httprouter.New()
	router.GET("/", s.root)
	router.GET("/about", s.about)
	router.GET("/me", s.me)
	router.GET("/login", s.login)
	router.GET("/logout", s.logout)
	router.POST("/refresh", s.refresh)
	router.GET("/feed", s.feed)
	router.POST("/posts", s.createPost)
	router.POST("/posts/:post_id/images", s.uploadImage)
	router.DELETE("/posts/:post_id", s.deletePost)
	router.POST("/posts/:post_id/like", s.likePost)
	router.DELETE("/posts/:post_id/like", s.unlikePost)
	router.POST("/posts/:post_id/comments", s.createComment)
	router.DELETE("/posts/:post_id/comments/:comment_id", s.deleteComment)

	router.ServeFiles("/assets/*filepath", s.assets)
	router.ServeFiles("/images/*filepath", http.Dir(filepath.Join(s.dataDir, "images/")))
	router.NotFound = http.HandlerFunc(s.notFound)
	router.MethodNotAllowed = http.HandlerFunc(s.methodNotAllowed)

	s.logger.Debug("registering middlewares")
	stack := negroni.New()
	stack.Use(negroni.NewRecovery())
	stack.Use(negroni.HandlerFunc(s.logRequest))
	stack.Use(cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
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
	w.Header().Set("Content-Type", "application/json")
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

func (s *service) root(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	_, err := w.Write([]byte(fmt.Sprintf(`
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
				</script>
				<script src="/assets/index.js"></script>
			</body>
		</html>
	`, Version, BuiltAt, Commit)))
	if err != nil {
		s.logger.Error("writing response", "err", err)
	}
}

func (s *service) about(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	write(w, http.StatusOK, map[string]string{
		"built_at": BuiltAt,
		"commit":   Commit,
		"version":  Version,
	})
}

type token struct {
	Access    string `json:"access_token"`
	Refresh   string `json:"refresh_token"`
	ExpiresIn int    `json:"expires_in"`
}

func (t token) Encode() string {
	var p = make(url.Values)
	p.Add("access_token", t.Access)
	p.Add("refresh_token", t.Refresh)
	p.Add("expires_in", strconv.Itoa(t.ExpiresIn))
	return p.Encode()
}

type user struct {
	ID   int    `db:"id"`
	Sub  string `json:"sub" db:"sub"`
	Name string `json:"nickname" db:"name"`
}

type feed struct {
	Posts []post `json:"posts"`
}

type post struct {
	ID        int       `json:"id"         db:"id"`
	UserID    int       `json:"user_id"    db:"user_id"`
	UserName  string    `json:"user_name"  db:"user_name"`
	Text      string    `json:"text"       db:"text"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	Images    []string  `json:"images"     db:"-"`
	Likes     []like    `json:"likes"      db:"-"`
	Comments  []comment `json:"comments"   db:"-"`
}

type like struct {
	PostID   int    `json:"-"         db:"post_id"`
	UserID   int    `json:"user_id"   db:"user_id"`
	UserName string `json:"user_name" db:"user_name"`
}

type comment struct {
	ID        int       `json:"id"         db:"id"`
	PostID    int       `json:"-"          db:"post_id"`
	UserID    int       `json:"user_id"    db:"user_id"`
	UserName  string    `json:"user_name"  db:"user_name"`
	Text      string    `json:"text"       db:"text"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

func (s *service) authenticateRequest(r *http.Request) (user, error) {
	header := r.Header.Get("Authorization")

	v, err := s.group.Do(header, func() (interface{}, error) {
		// If the result is already in the cache, we're ok.
		if v, ok := s.cache.Get(header); ok {
			return v, nil
		}

		// Else, kindly ask auth0 if the token is valid.
		req, err := http.NewRequest(http.MethodGet, fmt.Sprintf(`%s/userinfo`, s.authDomain), nil)
		if err != nil {
			return user{}, wrap(err, "building request")
		}
		req.Header.Set("Authorization", header)

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return user{}, wrap(err, "executing request")
		}
		defer res.Body.Close()

		if res.StatusCode != http.StatusOK {
			return user{}, errors.New("invalid token")
		}

		// Parse the user information from the token introspection.
		var u user
		err = json.NewDecoder(res.Body).Decode(&u)
		if err != nil {
			return u, wrap(err, "parsing response")
		}

		// Create or update the user.
		err = s.database.GetContext(r.Context(), &u, `
			select id
			from users
			where sub = ?
		`, u.Sub)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return u, wrap(err, "querying user")
		}

		if err != nil {
			res, err := s.database.ExecContext(r.Context(), `
				insert into users (sub, name)
				values (?, ?)
			`, u.Sub, u.Name)
			if err != nil {
				return u, wrap(err, "inserting user")
			}
			ID, _ := res.LastInsertId()
			u.ID = int(ID)
		} else {
			_, err := s.database.ExecContext(r.Context(), `
				update users
				set name = ?
				where id = ?
			`, u.Name, u.ID)
			if err != nil {
				return u, wrap(err, "updating user")
			}
		}

		// Store the user in the cache for later.
		s.cache.SetDefault(header, u)

		return u, nil
	})
	u := v.(user)

	return u, err
}

func (s *service) login(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	proto := r.Header.Get("X-Forwarded-Proto")
	if len(proto) == 0 {
		proto = "http"
	}

	// If we haven't got a code, we redirect to auth0's endpoint.
	if r.URL.Query().Get("code") == "" {
		var params = make(url.Values)
		params.Add("client_id", s.authClientID)
		params.Add("scope", "openid email profile offline_access")
		params.Add("response_type", "code")
		params.Add("redirect_uri", fmt.Sprintf("%s://%s%s", proto, r.Host, r.URL))
		params.Add("state", base64.URLEncoding.EncodeToString([]byte(r.Header.Get("Referer"))))
		http.Redirect(w, r, fmt.Sprintf(`%s/authorize?%s`, s.authDomain, params.Encode()), http.StatusFound)
		return
	}

	// If we've got a code, exchange it for the access_token and
	// refresh_token.
	var params = make(url.Values)
	params.Add("grant_type", "authorization_code")
	params.Add("client_id", s.authClientID)
	params.Add("client_secret", s.authClientSecret)
	params.Add("code", r.URL.Query().Get("code"))
	params.Add("redirect_uri", fmt.Sprintf("%s://%s%s", proto, r.Host, r.URL))
	res, err := http.Post(
		fmt.Sprintf(`%s/oauth/token`, s.authDomain),
		"application/x-www-form-urlencoded",
		strings.NewReader(params.Encode()),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "requesting token"))
		return
	}
	defer res.Body.Close()

	var t token
	err = json.NewDecoder(res.Body).Decode(&t)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "parsing token"))
		return
	}

	referer, err := base64.URLEncoding.DecodeString(r.URL.Query().Get("state"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "retrieving referer"))
		return
	}

	http.Redirect(w, r, fmt.Sprintf(`%s#%s`, string(referer), t.Encode()), http.StatusFound)
}

func (s *service) logout(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	proto := r.Header.Get("X-Forwarded-Proto")
	if len(proto) == 0 {
		proto = "http"
	}

	var params = make(url.Values)
	params.Add("client_id", s.authClientID)
	params.Add("returnTo", fmt.Sprintf("%s://%s", proto, r.Host))
	http.Redirect(w, r, fmt.Sprintf(`%s/v2/logout?%s`, s.authDomain, params.Encode()), http.StatusFound)
	return
}

func (s *service) refresh(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var t token
	err := json.NewDecoder(r.Body).Decode(&t)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing token"))
		return
	}

	// If we've got a code, exchange it for the access_token and
	// refresh_token.
	var params = make(url.Values)
	params.Add("grant_type", "refresh_token")
	params.Add("client_id", s.authClientID)
	params.Add("client_secret", s.authClientSecret)
	params.Add("refresh_token", t.Refresh)
	res, err := http.Post(
		fmt.Sprintf(`%s/oauth/token`, s.authDomain),
		"application/x-www-form-urlencoded",
		strings.NewReader(params.Encode()),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "requesting token"))
		return
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(res.Body)
		writeError(w, http.StatusInternalServerError, errors.New(string(body)))
		return
	}

	err = json.NewDecoder(res.Body).Decode(&t)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "parsing token"))
		return
	}

	write(w, http.StatusOK, t)
}

func (s *service) me(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	write(w, http.StatusOK, map[string]interface{}{
		"id":   u.ID,
		"name": u.Name,
	})
}

func (s *service) feed(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	_, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	// The 'from' parameter is a timestamp so we remove the issue with
	// asynchronicity in the feed pagination. Also, the query for getting
	// the posts IDs is that much faster (this is essentially a late row
	// lookup in disguise.)
	raw := r.URL.Query().Get("from")
	if raw == "" {
		raw = time.Now().Format(time.RFC3339)
	}
	from, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing 'from' parameter"))
		return
	}

	// The 'limit' parameter is a simple integer.
	raw = r.URL.Query().Get("limit")
	if raw == "" {
		raw = "20"
	}
	limit, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing 'limit' parameter"))
		return
	}

	var f feed

	// Retrieve the post IDs for the feed. Just the IDs now, as we will
	// need it for various things. It also makes a nice late row retrieval.
	var postIDs []int
	err = s.database.SelectContext(r.Context(), &postIDs, `
		select id
		from posts
		where created_at < ?
		order by created_at desc
		limit ?
	`, from, limit)
	if err != nil {
		s.logger.Error("querying feed", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "querying feed"))
		return
	}

	if len(postIDs) == 0 {
		write(w, http.StatusOK, f)
		return
	}

	// Retrieve the posts themselves.
	query, args, err := sqlx.In(`
		select p.id, u.id as user_id, u.name as user_name, p.text, p.created_at
		from posts as p
		left join users as u on p.user_id = u.id
		where p.id in (?)
		order by created_at desc
	`, postIDs)
	if err != nil {
		s.logger.Error("building posts query", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "building posts query"))
		return
	}
	err = s.database.SelectContext(r.Context(), &f.Posts, query, args...)
	if err != nil {
		s.logger.Error("querying posts", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "querying posts"))
		return
	}

	// Retrieve the images for the posts. The path is prefixed with the
	// images endpoint so the frontend has nothing to do to load the image
	// except prefixing it with the API base URL.
	query, args, err = sqlx.In(`
		select post_id, path
		from images
		where post_id in (?)
	`, postIDs)
	if err != nil {
		s.logger.Error("building images query", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "building images query"))
		return
	}
	rows, err := s.database.QueryxContext(r.Context(), query, args...)
	if err != nil {
		s.logger.Error("querying images", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "querying images"))
		return
	}
	var images = make(map[int][]string)
	for rows.Next() {
		var image struct {
			PostID int    `db:"post_id"`
			Path   string `db:"path"`
		}
		err = rows.StructScan(&image)
		if err != nil {
			s.logger.Error("scanning images", "err", err)
			writeError(w, http.StatusInternalServerError, wrap(err, "scanning images"))
			return
		}
		images[image.PostID] = append(images[image.PostID], filepath.Join("/images/", image.Path))
	}

	// Retrieve the likes for the posts.
	query, args, err = sqlx.In(`
		select l.post_id, u.id as user_id, u.name as user_name
		from likes as l
		left join users as u on l.user_id = u.id
		where l.post_id in (?)
	`, postIDs)
	if err != nil {
		s.logger.Error("building likes query", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "building likes query"))
		return
	}
	rows, err = s.database.QueryxContext(r.Context(), query, args...)
	if err != nil {
		s.logger.Error("querying likes", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "querying likes"))
		return
	}
	var likes = make(map[int][]like)
	for rows.Next() {
		var l like
		err = rows.StructScan(&l)
		if err != nil {
			s.logger.Error("scanning likes", "err", err)
			writeError(w, http.StatusInternalServerError, wrap(err, "scanning likes"))
			return
		}
		likes[l.PostID] = append(likes[l.PostID], l)
	}

	// Retrieve the comments for the posts.
	query, args, err = sqlx.In(`
		select c.id, c.post_id, u.id as user_id, u.name as user_name, c.text, c.created_at
		from comments as c
		left join users as u on c.user_id = u.id
		where c.post_id in (?)
	`, postIDs)
	if err != nil {
		s.logger.Error("building comments query", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "building comments query"))
		return
	}
	rows, err = s.database.QueryxContext(r.Context(), query, args...)
	if err != nil {
		s.logger.Error("querying comments", "err", err)
		writeError(w, http.StatusInternalServerError, wrap(err, "querying comments"))
		return
	}
	var comments = make(map[int][]comment)
	for rows.Next() {
		var c comment
		err = rows.StructScan(&c)
		if err != nil {
			s.logger.Error("scanning comments", "err", err)
			writeError(w, http.StatusInternalServerError, wrap(err, "scanning comments"))
			return
		}
		comments[c.PostID] = append(comments[c.PostID], c)
	}

	// Reconstruct the feed.
	for i, p := range f.Posts {
		p.Likes = likes[p.ID]
		p.Images = images[p.ID]
		p.Comments = comments[p.ID]
		f.Posts[i] = p
	}

	write(w, http.StatusOK, f)
}

func (s *service) createPost(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	var p post
	err = json.NewDecoder(r.Body).Decode(&p)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing payload"))
		return
	}

	res, err := s.database.ExecContext(r.Context(), `
		insert into posts (user_id, text)
		values (?, ?)
	`, u.ID, p.Text)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "inserting post"))
		return
	}

	postID, _ := res.LastInsertId()

	write(w, http.StatusOK, map[string]interface{}{"acknowledged": true, "post_id": postID})
}

func (s *service) uploadImage(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	postID, err := strconv.ParseInt(p.ByName("post_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing post_id"))
		return
	}

	var owner user
	err = s.database.GetContext(r.Context(), &owner, `
		select user_id as id
		from posts
		where id = ?
	`, postID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, wrap(err, "finding post"))
		return
	}

	if owner.ID != u.ID {
		writeError(w, http.StatusUnauthorized, errors.New("can't add image in post of another user"))
		return
	}

	raw, err := ioutil.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "reading body"))
		return
	}

	hash := fmt.Sprintf(`%x`, md5.Sum(raw))

	dir := filepath.Join(s.dataDir, "images", string(hash[:2]))
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		err := os.Mkdir(dir, os.ModeDir|0774)
		if err != nil {
			writeError(w, http.StatusInternalServerError, wrap(err, "creating storage directory"))
			return
		}
	}

	name := string(hash[2:])
	err = ioutil.WriteFile(filepath.Join(dir, name), []byte(raw), 0774)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "storing file"))
		return
	}

	path := filepath.Join(string(hash[:2]), string(hash[2:]))
	_, err = s.database.ExecContext(r.Context(), `
		insert into images (post_id, path)
		values (?, ?)
	`, postID, path)

	write(w, http.StatusOK, map[string]interface{}{
		"path": filepath.Join("/images/", path),
	})
}

func (s *service) deletePost(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	postID, err := strconv.ParseInt(p.ByName("post_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing post_id"))
		return
	}

	var owner user
	err = s.database.GetContext(r.Context(), &owner, `
		select user_id as id
		from posts
		where id = ?
	`, postID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, wrap(err, "finding post"))
		return
	}

	if owner.ID != u.ID {
		writeError(w, http.StatusUnauthorized, errors.New("can't remove post of another user"))
		return
	}

	_, err = s.database.ExecContext(r.Context(), `
		delete from posts
		where id = ?
	`, postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "deleting post"))
		return
	}

	write(w, http.StatusOK, map[string]interface{}{"acknowledged": true})
}

func (s *service) createComment(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	postID, err := strconv.ParseInt(p.ByName("post_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing post_id"))
		return
	}

	var c comment
	err = json.NewDecoder(r.Body).Decode(&c)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing payload"))
		return
	}

	res, err := s.database.ExecContext(r.Context(), `
		insert into comments (user_id, post_id, text)
		values (?, ?, ?)
	`, u.ID, postID, c.Text)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "inserting comment"))
		return
	}
	commentID, _ := res.LastInsertId()

	write(w, http.StatusOK, map[string]interface{}{
		"comment_id": commentID,
	})
}

func (s *service) deleteComment(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	commentID, err := strconv.ParseInt(p.ByName("comment_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing comment_id"))
		return
	}

	var owner user
	err = s.database.GetContext(r.Context(), &owner, `
		select user_id as id
		from comments
		where id = ?
	`, commentID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, wrap(err, "finding comment"))
		return
	}

	if owner.ID != u.ID {
		writeError(w, http.StatusUnauthorized, errors.New("can't remove comment of another user"))
		return
	}

	_, err = s.database.ExecContext(r.Context(), `
		delete from comments
		where id = ?
	`, commentID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "deleting comment"))
		return
	}

	write(w, http.StatusOK, map[string]interface{}{"acknowledged": true})
}

func (s *service) likePost(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	postID, err := strconv.ParseInt(p.ByName("post_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing post_id"))
		return
	}

	_, err = s.database.ExecContext(r.Context(), `
		insert or ignore into likes (user_id, post_id)
		values (?, ?)
	`, u.ID, postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "inserting like"))
		return
	}

	write(w, http.StatusOK, map[string]interface{}{"acknowledged": true})
}

func (s *service) unlikePost(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	u, err := s.authenticateRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, wrap(err, "authenticating request"))
		return
	}

	postID, err := strconv.ParseInt(p.ByName("post_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, wrap(err, "parsing post_id"))
		return
	}

	_, err = s.database.ExecContext(r.Context(), `
		delete from likes
		where user_id = ?
		and post_id = ?
	`, u.ID, postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, wrap(err, "removing like"))
		return
	}

	write(w, http.StatusOK, map[string]interface{}{"acknowledged": true})
}
