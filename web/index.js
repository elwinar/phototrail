import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import { AppBoundary } from "./AppBoundary.js";
import "./index.scss";

(async function () {
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

    localStorage.setItem(
      "session",
      JSON.stringify({
        token: params.get("access_token"),
        refresh_token: params.get("refresh_token"),
        expiration: Date.now() + parseInt(params.get("expires_in")) * 1000,
        user_id: user.id,
        user_name: user.name,
      })
    );

    // Remove the ugly hash from the URL. It also avoids someone
    // bookmarking it by error.
    history.pushState("", document.title, window.location.pathname);
  }

  // Check if we've got something in the local storage. If we don't, stop right
  // there and redirect to the auth. If we do, put the token in the state and
  // be happy.
  document.session = JSON.parse(localStorage.getItem("session"));
  if (!document.session || !document.session.token || document.session.expiration < Date.now()) {
    localStorage.clear();
    window.location.replace(`${document.config.baseURL}/login`);
  } else {
    ReactDOM.render(
      <AppBoundary>
        <App />
      </AppBoundary>,
      document.getElementById("root")
    );
  }
})();
