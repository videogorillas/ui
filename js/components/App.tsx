import * as React from 'react';
import './app.css';
import Ranges from "./Ranges";
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs/index";
import {jsonlIterator} from "../utils/FetchUtils";

type JsonResult = [number, [number, number]];

interface AppProps {
}

interface AppState {
    frame: number;
    total: number;
    ranges: LabeledRange[];
}

export default class App extends React.Component<AppProps, AppState> {

    state = {
        frame : 0,
        total : 0,
        ranges : [] as LabeledRange[]
    };
    classes = ['no smoking', 'smoking'];
    changeFn = (frame: number) => {
        this.setState({frame});
    };
    private player: VG.Player;
    private predictions: number[] = [];

    async fetchJsonl () {
        const url = 'cruz-smoking.jsonl';
        const ranges = [];
        let total = 0;
        this.predictions = [];
        for await (const item of jsonlIterator(url)) {
            total += 1;
            let range: LabeledRange;
            const predictions = item[1];
            const max = Math.max(...predictions);
            const index = predictions.indexOf(max);
            this.predictions.push(index);
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
        }
        this.setState({ranges, total})
    }

    componentDidMount () {
        this.fetchJsonl();

        const kdown = fromEvent<MouseEvent>(document, 'keydown');

        kdown.subscribe(e => {
            console.log(e);
            let {frame} = this.state;
            let step = 0;
            switch (e.code) {
                case "ArrowRight":
                    step = 1;
                    break;
                case "ArrowLeft":
                    step = -1;
                    break;
            }
            frame += step;
            this.setState({frame});
        });
    }

    containerRef = (el) => {
        if (el) {
            let pConfig = {
                hotkeys : true,
                playlist : false,
                search : false,
                theme : 'vg',
                plugins : ['filmstrip']
            };
            this.setupPlayer(el, pConfig);
        }
    };

    private setupPlayer (el, pConfig) {
        const player = new VG.Player(el, pConfig);

        // const mp4 = "http://10.0.1.140/bstorage/home/chexov/testvideo/LFA.mp4";
        const mp4 = "http://blender.local/bstorage/datasets/vg_smoke/smoking_scenes/045%20-%20Penelope%20Cruz%20Smoking.mkv.mp4";
        player.loadUrl(mp4, (err) => {
            // VG.Captions.parseSubs(player.getTimeline(), "LFA123.mp4.out.srt", 'srt', (err, subs) => {
            //     if (err) {
            //         console.error("error parsing subs", err);
            //         return;
            //     }
            //     console.log("SRT OK", subs);
            //     player.addCaptions(subs);
            //     player.play();
            // });
            this.player = player;
            console.log(err, "player");
            player.addEventListener("timeupdate", this.onTimeUpdate);
        });
    }

    onTimeUpdate = (ts) => {
        const frame = ts.frame;
        console.log(this.predictions[frame]);
        this.setState({frame})
    };

    onSelectFrame = (frame) => {
        if (this.player) {
            this.player.seekFrame(frame);
        }
    };

    render () {
        const {frame} = this.state;
        return <div>
            <div ref={this.containerRef}>

            </div>
            <div>
                {this.classes[this.predictions[frame]]}
            </div>
            {this.state.ranges.length > 0 ?
                <Ranges pointer={frame}
                        ranges={this.state.ranges} end={this.state.total}
                        onClick={this.onSelectFrame}
                />
                : null
            }
            <div>
                Frame number <input type="number" value={frame} onChange={(e) => this.changeFn(+e.target.value)}/>
            </div>
        </div>
    }
}