import * as React from 'react';
import './app.css';
import Ranges from "./Ranges";
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs/index";

function getJson<T> (): Promise<T> {
    return fetch("LFA123.mp4.out.json").then(r => r.json());
}

function normalizeToRanges (json: JsonResult[]) {
    //[[0, [0.8, 0.1]], [1, [0.6, 0.3]], [2, [0.8, 0.1]]] -> [{start: 0, end: 2, label: '0'}]
    return json.reduce((ranges: LabeledRange[], item, i, arr) => {
        let range: LabeledRange;
        const predictions = item[1];
        const max = Math.max(...predictions);
        const index = predictions.indexOf(max);
        if (!ranges.length) {
            range = {
                start : item[0],
                end : item[0] + 1,
                label : `${index}`
            };
            ranges.push(range);
        } else {
            range = ranges[ranges.length - 1];
            if (`${index}` === range.label) {
                range.end = item[0] + 1;
            } else {
                range = {
                    start : item[0],
                    end : item[0] + 1,
                    label : `${index}`
                };
                ranges.push(range);
            }
        }
        return ranges;
    }, []);
}

interface JsonResult {
    '0': number;
    '1': [number, number]
}

interface AppProps {
}

interface AppState {
    fn: number;
    total: number;
    ranges: LabeledRange[];
}

export default class App extends React.Component<AppProps, AppState> {

    state = {
        fn : 42,
        total : 0,
        ranges : [] as LabeledRange[]
    };

    changeFn = (fn: number) => {
        this.setState({fn});
    };
    private player: VG.Player;

    componentDidMount () {
        getJson<JsonResult[]>().then(json => {
            // console.log(json);
            this.setState({total : json.length, ranges : normalizeToRanges(json)})
        });

        const kdown = fromEvent<MouseEvent>(document, 'keydown');

        kdown.subscribe(e => {
            console.log(e);
            let {fn} = this.state;
            let step = 0;
            switch (e.code) {
                case "ArrowRight":
                    step = 1;
                    break;
                case "ArrowLeft":
                    step = -1;
                    break;
            }
            fn += step;
            this.setState({fn});
        });
    }

    ranges = [
        {start : 0, end : 42, label : "kuku"},
        {start : 42, end : 47, label : "kuku1"}, {
            start : 47,
            end : 57,
            label : "kuku"
        }, {
            start : 57,
            end : 87,
            label : "kuku1"
        }];

    containerRef = (el) => {
        if (el) {
            let pConfig = {
                hotkeys : true,
                playlist : false,
                search : false,
                theme : 'vg',
                plugins : ['filmstrip']
            };
            const player = new VG.Player(el, pConfig);

            player.loadUrl("http://10.0.1.140/bstorage/home/chexov/testvideo/LFA.mp4", (err) => {
                this.player = player;
                console.log(err, "player");
                player.addEventListener("timeupdate", this.onTimeUpdate);
            });
        }
    };

    onTimeUpdate = (ts) => {
        console.log(ts);
        this.setState({fn : ts.frame})
    };

    onSelectFrame = (fn) => {
        if (this.player) {
            this.player.seekFrame(fn);
        }
    };

    render () {
        const {fn} = this.state;
        return <div>
            <div ref={this.containerRef}>

            </div>
            {this.state.ranges.length > 0 ?
                <Ranges pointer={fn}
                        ranges={this.state.ranges} end={this.state.total}
                        onClick={this.onSelectFrame}
                />
                : null
            }
            <div>
                Frame number <input type="number" value={fn} onChange={(e) => this.changeFn(+e.target.value)}/>
            </div>
        </div>
    }
}