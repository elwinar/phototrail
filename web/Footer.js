import React, { memo } from "react";
import styles from "./Footer.scss";

function Footer() {
  return (
    <p className={styles.Footer}>
      For documentation, issues, see the{" "}
      <a href="https://github.com/elwinar/phototrail">repository</a>.
    </p>
  );
}

export default memo(Footer);
