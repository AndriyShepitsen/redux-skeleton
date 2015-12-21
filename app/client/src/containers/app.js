import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { incrementCounter } from '../actions/counter';
import { Link } from 'react-router';
import semantic from 'semantic-ui';

class App extends Component {
    constructor(props) {
        super(props);
        console.log(semantic);
    }

    incrementCounter() {
        const {dispatch} = this.props;

        dispatch(incrementCounter());
    }

    render() {
        const {counter} = this.props;
        const incrementCounter = this.incrementCounter.bind(this);

        return (
            <div>
                <div className="ui pointing menu">
                    <a className="item">
                        Home
                    </a>
                    <a className="item">
                        Messages
                    </a>
                    <a className="item active">
                        Friends
                    </a>
                    <div className="right menu">
                        <div className="item">
                            <div className="ui transparent icon input">
                                <input type="text" placeholder="Search..."/>
                                    <i className="search link icon"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="ui segment">
                    <p></p>
                </div>
                <header>
                    <h1>Counter</h1>
                </header>
                <main>
                    <p>Count: {counter.count}</p>
                    <button onClick={incrementCounter}>Increment</button>
                    <p>
                        <Link to="/modify-counter">Modify Counter</Link>
                    </p>
                </main>
            </div>
    );
    }
    }

    App.propTypes = {
        counter: PropTypes.object.isRequired
    };

    function mapStateToProps(state) {
        const {counter} = state;

        return {
        counter
    };
    }

    export default connect(mapStateToProps)(App);
