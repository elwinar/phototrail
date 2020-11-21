import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import { AppBoundary } from "./AppBoundary.js";
import "./index.scss";

(async function () {
  // randomString generate cryptographically-secure random strings for the needs
  // of the OAuth login flow.
  function randomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let numbers = new Uint32Array(length);
    window.crypto.getRandomValues(numbers);

    let result = "";
    for (let i = 0; i < numbers.length; i++) {
      result += chars.charAt(numbers[i] % chars.length);
    }

    return result;
  }

  // Check the hash for the access_token. If we've got one,
  // we've just returned from auth, so we put the token in the local
  // storage.
  let params = new URLSearchParams(window.location.hash.slice(1));
  if (params.get("access_token")) {
    const user = await fetch(`${document.config.baseURL}/me`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + params.get("access_token"),
      },
    }).then((res) => res.json());
    console.log(user);

    localStorage.setItem(
      "session",
      JSON.stringify({
        token: params.get("access_token"),
        expiration: Date.now() + parseInt(params.get("expires_in")) * 1000,
        user_id: user.id,
        user_name: user.name,
      })
    );

    // Remove the ugly hash from the URL. It also avoids someone
    // bookmarking it by error.
    history.pushState("", document.title, window.location.pathname);
  }

  // Check if we've got something in the local storage. If we do, put the token
  // in the state and be happy.
  document.session = JSON.parse(localStorage.getItem("session"));
  if (!document.session || !document.session.token || document.session.expiration < Date.now()) {
    localStorage.clear();

    // If we don't, stop right there and redirect to the auth.
    params = new URLSearchParams({
      client_id: document.config.authClientID,
      redirect_uri: window.location.origin,
      scope: "openid profile email",
      response_type: "token",
      nonce: randomString(8),
      state: randomString(8),
    });
    window.location.replace(`https://${document.config.authDomain}/authorize?${params.toString()}`);
  } else {
    ReactDOM.render(
      <AppBoundary>
        <App />
      </AppBoundary>,
      document.getElementById("root")
    );
  }
})();
