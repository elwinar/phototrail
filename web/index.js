import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Header from "./Header";
import Footer from "./Footer";
import AppBoundary from "./AppBoundary.js";
import "./index.scss";
import "regenerator-runtime/runtime";

if (!document.config) {
  document.config = {
    baseURL: window.location.origin,
  };
}

(async function () {
  // Check the hash for the access_token. If we've got one,
  // we've just returned from auth, so we put the token in the local
  // storage.
  let params = new URLSearchParams(window.location.hash.slice(1));
  if (params.get("access_token")) {
    localStorage.setItem(
      "session",
      JSON.stringify({
        token: params.get("access_token"),
        refresh_token: params.get("refresh_token"),
        expiration: Date.now() + parseInt(params.get("expires_in")) * 1000,
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
    return;
  }

  // Retrieve the user information. This is done on every load to avoid having
  // issues when refreshing the database.
  const user = await fetch(`${document.config.baseURL}/me`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + params.get("access_token"),
    },
  }).then((res) => res.json());
  document.session = {
    ...document.session,
    user_id: user.id,
    user_name: user.name,
  };

  // Detect if we've got a logo, so it can be used in the header.
  const logo = await new Promise(async (resolve) => {
    const path = `${document.config.baseURL}/images/logo.svg`;
    const img = new Image();
    img.onload = function () {
      resolve(path);
    };
    img.onerror = function () {
      resolve(undefined);
    };
    img.src = path;
  });

  ReactDOM.render(
    <Fragment>
      <Header
        logo={logo}
        onLogout={() => {
          localStorage.clear();
          window.location.replace(`${document.config.baseURL}/logout`);
        }}
      />
      <AppBoundary>
        <App />
      </AppBoundary>
      <Footer />
    </Fragment>,
    document.getElementById("root")
  );
})();
