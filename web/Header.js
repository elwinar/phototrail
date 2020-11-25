import React from "react";
import styles from "./Header.scss";

export default function Header() {
  const logoPath = `${document.config.baseURL}/images/logo.svg`;

  const [hasLogo, setHasLogo] = React.useState(false);

  React.useEffect(function lookupLogo() {
    new Promise((resolve) => {
      const img = new Image();
      img.onload = function () {
        resolve(true);
      };
      img.onerror = function () {
        resolve(false);
      };
      img.src = logoPath;
    }).then((res) => {
      setHasLogo(res);
    });
  }, []);

  return (
    <header className={styles.Header}>
      {hasLogo ? <img className={styles.Logo} src={logoPath} /> : <h1>Phototrail</h1>}
    </header>
  );
}
