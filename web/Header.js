import React from "react";
import "./App.scss";

export default function Header({ openNewPostForm, isFormOpen }) {
  return (
    <header className="header">
      <h1>Phototrail</h1>
      {!isFormOpen && <button onClick={openNewPostForm}>New post</button>}
    </header>
  );
}
