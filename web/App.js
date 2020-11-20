import React, { useReducer, useState } from "react";
import { AppBoundary } from "./AppBoundary";
import Feed from "./Feed";
import Footer from "./Footer";
import Form from "./Form";
import Header from "./Header";

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

// Context used for passing the global state and dispatch function down.
export const sessionContext = React.createContext();

// App is the main component, and is mainly concerned with high-level features
// like state management and top-level components.
export function App() {
  const [session, sessionDispatch] = useReducer(
    reducer,
    {},
    (defaultState = {}) => {
      if (localStorage.getItem("session")) {
        const session = JSON.parse(localStorage.getItem("session"));

        return {
          ...defaultState,
          logged: true,
          token: session.token,
        };
      }
      return defaultState;
    }
  );

  const [isFormOpen, setIsFormOpen] = useState(false);

  // If we aren't logged, we handle user identification, either redirecting the
  // user to the authentication backend or getting the token from the
  // redirected URL.
  if (!session.logged) {
    let params = new URLSearchParams(window.location.hash.slice(1));

    if (params.get("access_token")) {
      sessionDispatch({
        type: "logged_in",
        token: params.get("access_token"),
        expiresIn: params.get("expires_in"),
      });

      localStorage.setItem(
        "session",
        JSON.stringify({
          token: params.get("access_token"),
          expiresIn: params.get("expires_in"),
        })
      );
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
    <AppBoundary>
      <sessionContext.Provider value={session}>
        <Header openNewPostForm={() => setIsFormOpen(true)} isFormOpen={isFormOpen} />
        <Form onClose={() => setIsFormOpen(false)} isOpen={isFormOpen} />
        <Feed />
        <Footer />
      </sessionContext.Provider>
    </AppBoundary>
  );
}
