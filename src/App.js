import React, { Component } from 'react';
import fetch from 'isomorphic-fetch';
import PropTypes from 'prop-types';
import {sortBy} from 'lodash';
import classNames from 'classnames';
import './App.css';

const DEFAULT_QUERY = 'redux';
const DEFAULT_HPP = '100';

const PATH_BASE = 'https://hn.algolia.com/api/v1';
const PATH_SEARCH = '/search';
const PARAM_SEARCH = 'query=';
const PARAM_PAGE = 'page=';
const PARAM_HPP = 'hitsPerPage=';

const url = `${PATH_BASE}${PATH_SEARCH}?${PARAM_SEARCH}${DEFAULT_QUERY}&${PARAM_PAGE}`

const SORTS = {
    NONE: list => list,
    TITLE: list => sortBy(list, 'title'),
    AUTHOR: list => sortBy(list, 'author'),
    COMMENTS: list => sortBy(list, 'num_comments').reverse(),
    POINTS: list => sortBy(list, 'points').reverse()
}

const updateSearchTopStories = (hits, page) =>
    (prevState) => {
        const {searchKey, results} = prevState;

        const oldHits = results && results[searchKey]
        ? results[searchKey].hits
        :[];

        const updatedHits = [
            ...oldHits, ...hits
        ];

        return {
            results: {
                ...results,
                [searchKey]: {hits: updatedHits, page}
            },
            isLoading: false
        };
    };

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            results: null,
            searchKey: '',
            searchTerm: DEFAULT_QUERY,
            error: null,
            isLoading: false,
        };

        this.needsToSearchTopStories = this.needsToSearchTopStories.bind(this);
        this.setSearchTopStories = this.setSearchTopStories.bind(this);
        this.fetchSearchTopStories = this.fetchSearchTopStories.bind(this);
        this.onSearchChange = this.onSearchChange.bind(this);
        this.onSearchSubmit = this.onSearchSubmit.bind(this);
        this.onDismiss = this.onDismiss.bind(this);
    }

    needsToSearchTopStories(searchTerm) {
        return !this.state.results[searchTerm];
    }

    setSearchTopStories(result) {
        const {hits, page} = result;
        this.setState(updateSearchTopStories(hits, page));
    }

    fetchSearchTopStories(searchTerm, page = 0) {

        this.setState({isLoading: true});

        fetch(`${PATH_BASE}${PATH_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}${page}&${PARAM_HPP}${DEFAULT_HPP}`)
        .then(response => response.json())
        .then(result => this.setSearchTopStories(result))
        .catch(e => this.setState({error: e}));
    }

    componentDidMount() {
        const {searchTerm} = this.state;
        this.setState({searchKey: searchTerm});
        this.fetchSearchTopStories(searchTerm);
    }

    onDismiss(id) {
        const {searchKey, results} = this.state;
        const {hits, page} = results[searchKey];

        const isNotId = item => item.objectID !== id;

        const updatedHits = hits.filter(isNotId);

        this.setState({
            result: {
                ...results,
                [searchKey]: {hits: updatedHits, page}
            }
        });
    }

    onSearchChange(event) {
        this.setState({searchTerm: event.target.value});
    }

    onSearchSubmit(event) {
        const {searchTerm} = this.state;
        this.setState({searchKey: searchTerm})

        if(this.needsToSearchTopStories(searchTerm)) {
            this.fetchSearchTopStories(searchTerm);
        }

        event.preventDefault();
    }

    render() {
        const  {searchTerm, results, searchKey, error, isLoading} = this.state;
        const page = (results && results[searchKey] && results[searchKey].page) || 0;
        const list = (results && results[searchKey] && results[searchKey].hits) || [];

        return (
            <div className='page'>
                <div className='interactions'>
                    <Search
                        value={searchTerm}
                        onChange={this.onSearchChange}
                        onSubmit={this.onSearchSubmit}
                    >
                    Search
                    </Search>
                </div>
                { error
                    ? <div class='interactions'>
                        <p>An error has occured.</p>
                    </div>
                    : <Table
                        list={list}
                        onDismiss={this.onDismiss}
                    />
                }
                <div className='interactions'>
                    <ButtonWithLoading
                        isLoading={isLoading}
                        onClick={() => this.fetchSearchTopStories(searchKey, page + 1)}
                    >
                    More
                    </ButtonWithLoading>
                </div>
            </div>
        );
    }
}

const Search = ({value, onChange, onSubmit, children}) => {
    let input;
    return (
        <form onSubmit={onSubmit}>
            {children} <input
                type='text'
                value={value}
                onChange={onChange}
                ref={(node) => input = node}
            />
            <button type='submit'>{children}</button>
        </form>
    )
}

const largeColumn = {width: '40%'};
const mediumColumn = {width: '30%'};
const smallColumn = {width: '10%'};

class Table extends Component {
    constructor(props) {
        super(props);

        this.state = {
            sortKey: 'NONE',
            isSortReverse: false
        }

        this.onSort = this.onSort.bind(this);
    }

    onSort(sortKey) {
        const isSortReverse = this.state.sortKey === sortKey && !this.state.isSortReverse;
        this.setState({sortKey, isSortReverse});
    }

    render() {
        const {list, onDismiss} = this.props;
        const {sortKey, isSortReverse} = this.state;

        const sortedList = SORTS[sortKey](list);
        const reversedSortedList = isSortReverse
            ? sortedList.reverse()
            : sortedList;

        return (
            <div className='table'>
                <div className='table-header'>
                    <span style={{width: '40%'}}>
                        <Sort sortKey={'TITLE'} onSort={this.onSort} activeSortKey={sortKey}>
                            Title
                        </Sort>
                    </span>
                    <span style={{width: '30%'}}>
                        <Sort sortKey={'AUTHOR'} onSort={this.onSort} activeSortKey={sortKey}>
                            Author
                        </Sort>
                    </span>
                    <span style={{width: '10%'}}>
                        <Sort sortKey={'COMMENTS'} onSort={this.onSort} activeSortKey={sortKey}>
                            Comments
                        </Sort>
                    </span>
                    <span style={{width: '10%'}}>
                        <Sort sortKey={'POINTS'} onSort={this.onSort} activeSortKey={sortKey}>
                            Points
                        </Sort>
                    </span>
                    <span style={{width: '10%'}}>
                        Archive
                    </span>
                </div>
                {reversedSortedList.map(item =>
                    <div key={item.objectID} className='table-row'>
                        <span style={largeColumn}>
                            <a href={item.url}>{item.title}</a>
                        </span>
                        <span style={mediumColumn}>{item.author}</span>
                        <span style={smallColumn}>{item.num_comments}</span>
                        <span style={smallColumn}>{item.points}</span>
                        <span style={smallColumn}>
                            <Button
                                onClick={() => onDismiss(item.objectID)}
                                className='button-inline'>
                                Dismiss
                            </Button>
                        </span>
                    </div>
                )}
            </div>
        );
    }
}

const Button = ({onClick, className='', children}) =>
    <button
        onClick={onClick}
        className={className}
        type='button'
    >
        {children}
    </button>

const Loading = () =>
    <div>Loading...</div>

const Sort = ({sortKey, activeSortKey, onSort, children}) => {
    const sortClass = classNames(
        'button-inline',
        {'button-active': sortKey === activeSortKey}
    );

    return(
        <Button
            className={sortClass}
            onClick={() => onSort(sortKey)}
        >
            {children}
        </Button>
    )
}
const withLoading = (Component) => ({isLoading, ...rest}) =>
    isLoading
    ? <Loading/>
    : <Component {...rest}/>

const ButtonWithLoading = withLoading(Button);

Button.propTypes = {
    onClick: PropTypes.func.isRequired,
    className: PropTypes.string,
    children: PropTypes.node.isRequired
};

Table.propTypes = {
    list: PropTypes.array.isRequired,
    onDismiss: PropTypes.func.isRequired
}

export default App;

export {Button, Search, Table};
