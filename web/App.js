import React from "react";
import styles from "./App.scss";

// AppBoundary is the error-catching component for the whole app.
export class AppBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: false,
    };
  }

  componentDidCatch(error, info) {
    this.setState({
      error: error,
      info: info,
    });
  }

  goback() {
    this.setState({ error: false });
  }

  render() {
    if (this.state.error !== false) {
      return (
        <React.Fragment>
          <Header />
          <h2>something went wrong</h2>
          <p>{this.state.error.message}</p>
          <pre>{this.state.info.componentStack.slice(1)}</pre>
          {this.state.showStack ? (
            <React.Fragment>
              <p>
                <a href="#" onClick={() => this.setState({ showStack: false })}>
                  hide stack
                </a>
              </p>
              <pre>{this.state.error.stack}</pre>
            </React.Fragment>
          ) : (
            <p>
              <a href="#" onClick={() => this.setState({ showStack: true })}>
                show stack
              </a>
            </p>
          )}
          <p>
            <a href="#" onClick={() => this.goback()}>
              go back
            </a>
          </p>
          <Footer />
        </React.Fragment>
      );
    }

    return this.props.children;
  }
}

// Context used for passing the global state and dispatch function down.
const ctx = React.createContext();

// Zero state represent the uninitialized state value. Kinda like a default
// value.
const zeroState = {};

function initializeState(state) {
  return {
    ...state,
  };
}

// randomString generate cryptographically-secure random strings for the needs
// of the OAuth login flow.
function randomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let numbers = new Uint32Array(length);
  window.crypto.getRandomValues(numbers);

  let result = "";
  for (let i = 0; i < numbers.length; i++) {
    result += chars.charAt(numbers[i] % chars.length);
  }

  return result;
}

// The reducer handles global state changes. Not strictly necessary for now,
// but the future addition of features relying on more complex logic and API
// calls makes it useful.
function reducer(state, action) {
  console.log(action);
  switch (action.type) {
    case "logged_in":
      return {
        ...state,
        logged: true,
        token: action.token,
      };
    default:
      throw new Error(`unknown action ${action.type}`);
  }
}

// App is the main component, and is mainly concerned with high-level features
// like state management and top-level components.
export function App() {
  const [state, dispatch] = React.useReducer(
    reducer,
    zeroState,
    initializeState
  );

  // If we aren't logged, we handle user identification, either redirecting the
  // user to the authentication backend or getting the token from the
  // redirected URL.
  if (!state.logged) {
    let params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get("access_token")) {
      dispatch({
        type: "logged_in",
        token: params.get("access_token"),
        expiresIn: params.get("expires_in"),
      });
    } else {
      params = new URLSearchParams({
        client_id: document.config.authClientID,
        redirect_uri: window.location.origin,
        scope: "openid profile email",
        response_type: "token",
        nonce: randomString(8),
        state: randomString(8),
      });
      window.location.replace(
        `https://${document.config.authDomain}/authorize?${params.toString()}`
      );
    }
  }

  // Finally, render the component itself. The header and searchbar are
  // always displayed, and the table gives way for fallback display in
  // case of error or if the first query didn't execute yet.
  return (
    <ctx.Provider value={{ dispatch }}>
      <Header />
      <Footer />
    </ctx.Provider>
  );
}

// Header is a separate component so it can be shared in the AppBoundary and in
// the App itself.
function Header() {
  return (
    <header className={styles.Header}>
      <h1>
        Phototrail <sup>{document.Version}</sup>
      </h1>
    </header>
  );
}

// Footer is a separate component so it can be shared in the AppBoundary and in
// the App itself.
function Footer() {
  return (
    <footer className={styles.Footer}>
      <p>
        For documentation, issues, see the{" "}
        <a href="https://github.com/elwinar/phototrail">repository</a>.
      </p>
    </footer>
  );
}
