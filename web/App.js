import React, { useEffect, useState, Fragment } from "react";
import styles from "./App.scss";
import Header from "./Header";
import Feed from "./Feed";
import Footer from "./Footer";
import Form from "./Form";

// App is the main component, and is mainly concerned with high-level features
// like state management and top-level components.
export function App() {
  return (
    <Fragment>
      <Header />
      <Feed />
      <Footer />
    </Fragment>
  );

  /*
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <React.Fragment>
      <Header
        openNewPostForm={() => setIsFormOpen(true)}
        isFormOpen={isFormOpen}
      />
      <Form onClose={() => setIsFormOpen(false)} isOpen={isFormOpen} />
      <Footer />
    </React.Fragment>
  );
  */
}
