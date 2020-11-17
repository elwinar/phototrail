import React from 'react';
import styles from './App.scss';

// AppBoundary is the error-catching component for the whole app.
export class AppBoundary extends React.Component {
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
		this.setState({error: false});
	}

	render() {
		if (this.state.error !== false) {
			return (
				<React.Fragment>
					<Header/>
					<h2>something went wrong</h2>
					<p>{ this.state.error.message }</p>
					<pre>{ this.state.info.componentStack.slice(1) }</pre>
					{ this.state.showStack
						? (
							<React.Fragment>
								<p><a href="#" onClick={() => this.setState({showStack: false})}>hide stack</a></p>
								<pre>{ this.state.error.stack }</pre>
							</React.Fragment>
						)
						: <p><a href="#" onClick={() => this.setState({showStack: true})}>show stack</a></p>
					}
					<p><a href="#" onClick={() => this.goback()}>go back</a></p>
					<Footer/>
				</React.Fragment>
			);
		}

		return this.props.children;
	}
}

// Context used for passing the global state and dispatch function down.
const ctx = React.createContext();

// Zero state represent the uninitialized state value. Kinda like a default
// value.
const zeroState = {
};

// The reducer handles global state changes. Not strictly necessary for now,
// but the future addition of features relying on more complex logic and API
// calls makes it useful.
function reducer(state, action) {
	console.log(action);
	switch (action.type) {
		default:
			throw new Error(`unknown action ${action.type}`);
	}
}

// App is the main component, and is mainly concerned with high-level features
// like state management and top-level components.
export function App() {
	const [state, dispatch] = React.useReducer(reducer, zeroState);

	// Finally, render the component itself. The header and searchbar are
	// always displayed, and the table gives way for fallback display in
	// case of error or if the first query didn't execute yet.
	return (
		<ctx.Provider value={{dispatch}}>
			<Header/>
			<Footer/>
		</ctx.Provider>
	);
}

// Header is a separate component so it can be shared in the AppBoundary and in
// the App itself.
function Header() {
	return (
		<header className={styles.Header}>
			<h1>Phototrail <sup>{document.Version}</sup></h1>
		</header>
	);
}

// Footer is a separate component so it can be shared in the AppBoundary and in
// the App itself.
function Footer() {
	return (
		<footer className={styles.Footer}>
			<p>For documentation, issues, see the <a href="https://github.com/elwinar/phototrail">repository</a>.</p>
		</footer>
	)
}
