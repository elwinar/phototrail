import React from "react";
import styles from "./ErrorBoundary.scss";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // Update state so the next render will show the fallback UI.
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className={styles.ErrorCard}>
          <p>Sorry, this post could not be loaded.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
