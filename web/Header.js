import React, { memo } from "react";
import styles from "./Header.scss";

function Header({ logo }) {
  return (
    <header className={styles.Header}>
      {logo ? <img className={styles.Logo} src={logo} /> : <h1>Phototrail</h1>}
    </header>
  );
}

export default memo(Header);
