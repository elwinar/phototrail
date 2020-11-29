import React, { Fragment } from "react";

// AppBoundary is the error-catching component for the whole app.
export default class AppBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: false,
    };
  }

  componentDidCatch(error, info) {
    this.setState({
      error: error,
      info: info,
    });
  }

  goback() {
    this.setState({ error: false });
  }

  render() {
    if (this.state.error !== false) {
      return (
        <Fragment>
          <h2>something went wrong</h2>
          <p>{this.state.error.message}</p>
          <pre>{this.state.info.componentStack.slice(1)}</pre>
          {this.state.showStack ? (
            <Fragment>
              <p>
                <a href="#" onClick={() => this.setState({ showStack: false })}>
                  hide stack
                </a>
              </p>
              <pre>{this.state.error.stack}</pre>
            </Fragment>
          ) : (
            <p>
              <a href="#" onClick={() => this.setState({ showStack: true })}>
                show stack
              </a>
            </p>
          )}
          <p>
            <a href="#" onClick={() => this.goback()}>
              go back
            </a>
          </p>
        </Fragment>
      );
    }

    return this.props.children;
  }
}
