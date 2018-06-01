import * as React from 'react';
import './app.css';
import Ranges from "./Ranges";

function getJson<T> (): Promise<T> {
    return fetch("LFA123.mp4.out.json").then(r => r.json());
}

interface JsonResult {
    [index: number]: [number, number]
}

interface AppProps {
};

export default class App extends React.Component<AppProps, Object> {

    componentDidMount () {
        // getJson<JsonResult[]>().then(json => {
        //     console.log(json)
        // });
    }

    render () {
        return <div><Ranges ranges={[{start: 0, end: 42, label: "kuku"}, {start: 42, end: 47, label: "kuku1"}]}/></div>
    }
}