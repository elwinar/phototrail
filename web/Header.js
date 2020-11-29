import React, { memo } from "react";
import styles from "./Header.scss";

function Header({ logo, onLogout }) {
  return (
    <header className={styles.Header}>
      {logo ? (
        <img className={styles.Logo} src={logo} />
      ) : (
        <h1 className={styles.Title}>Phototrail</h1>
      )}
      <button className={styles.Logout} onClick={onLogout}>
        ⏻
      </button>
    </header>
  );
}

export default memo(Header);
