import * as React from 'react';
import './app.css';
import Ranges from "./Ranges";
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs/index";
import {jsonlIterator, readJsonlFile, saveFile} from "../utils/FetchUtils";
import ClassCaptions from "./ClassCaptions";

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
    private saveResults = () => {
        const blob = new Blob([JSON.stringify(this.state.ranges)], {type : 'application/json'});
        saveFile(blob, 'test.json');
    };

    async fetchJsonl (url: string) {
        const jsonlIterator1 = jsonlIterator(url);
        const ranges = await this.jsonToRanges(jsonlIterator1);
        this.setState({ranges, total : this.predictions.length})
    }

    private async jsonToRanges (jsonIterator: AsyncIterableIterator<JsonResult>) {
        const ranges = [];
        this.predictions = [];
        for await (const item of jsonIterator) {
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
        return ranges;
    }

    componentDidMount () {
        // TODO: dynamic URL
        // const url = 'cruz-smoking.jsonl';
        // this.fetchJsonl(url);

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

    containerRef = (el: HTMLElement) => {
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

    private setupPlayer (el: HTMLElement, pConfig: any) {
        const player = new VG.Player(el, pConfig);

        // const mp4 = "http://10.0.1.140/bstorage/home/chexov/testvideo/LFA.mp4";
        const mp4 = "http://blender.local/bstorage/datasets/vg_smoke/smoking_scenes/045%20-%20Penelope%20Cruz%20Smoking.mkv.mp4";
        player.loadUrl(mp4, (err: Error) => {
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

    onTimeUpdate = (ts: { frame: number }) => {
        const frame = ts.frame;
        console.log(this.predictions[frame]);
        this.setState({frame})
    };

    onSelectFrame = (frame: number) => {
        if (this.player) {
            this.player.seekFrame(frame);
        }
    };

    private fileUpload = async (e) => {
        const fileList = e.target.files;
        const results = await readJsonlFile(fileList[0]);
        const ranges = await this.jsonToRanges(results);
        this.setState({ranges, total : this.predictions.length})
    };

    render () {
        const {frame} = this.state;
        return <div>
            <div ref={this.containerRef}>

            </div>
            <input type="file" id="fileInput" onChange={this.fileUpload}/>
            <button onClick={this.saveResults}>Save results</button>
            <ClassCaptions classes={this.classes} predictions={this.predictions} current={frame}/>
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