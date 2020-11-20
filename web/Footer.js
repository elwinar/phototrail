import React from "react";
import styles from "./Footer.scss";

export default function Footer() {
  return (
    <p className={styles.Footer}>
      For documentation, issues, see the{" "}
      <a href="https://github.com/elwinar/phototrail">repository</a>.
    </p>
  );
}
