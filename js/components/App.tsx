import * as React from 'react';
import './app.css';
import Ranges from "./Ranges";
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs/index";
import {saveFile} from "../utils/FetchUtils";
import ClassCaptions from "./ClassCaptions";
import {JsonResult, jsonToRanges, toJson, readJsonlFile, fromJson} from "../utils/JsonlUtils";
import SVGStrip from "./SVGStrip";

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
    private predictions: JsonResult[] = [];
    private saveResults = () => {
        const jsonl = fromJson(this.predictions);
        const blob = new Blob([jsonl], {type : 'application/json'});
        saveFile(blob, 'test.jsonl');
    };

    updatePrediction = (updated: LabeledRange[]) => {
        console.log(updated);
        for (const range of updated) {
            for (let i = range.start; i < range.end; i++) {
                const predict: [number, number] = [0, 0];
                predict[+range.label] = 1;
                this.predictions[i] = [i, predict];
            }
        }
        console.log(this.predictions);
    };

    deletePrediction = (deleted: LabeledRange[]) => {
        console.log("deleted", deleted);
        const start = deleted[0].start;
        const end = deleted[deleted.length - 1].end;
        this.predictions.fill(undefined, start, end);
    };

    async fetchJsonl (url: string) {
        const response = await fetch(url);
        const jsonlText = await response.text();
        this.predictions = toJson<JsonResult>(jsonlText);
        const ranges = await jsonToRanges(this.predictions);
        this.setState({ranges})
    }

    componentDidMount () {
        // TODO: dynamic URL
        // const url = 'cruz-smoking.jsonl';
        // this.fetchJsonl(url);
        const url = 'LFA123.mp4.out.json';
        fetch(url).then(r => r.json()).then(async json => {
            this.predictions = json;
            const ranges = await jsonToRanges(this.predictions);
            this.setState({ranges});
        });

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

        const mp4 = "http://10.0.1.140/bstorage/home/chexov/testvideo/LFA.mp4";
        // const mp4 = "http://blender.local/bstorage/datasets/vg_smoke/smoking_scenes/045%20-%20Penelope%20Cruz%20Smoking.mkv.mp4";
        player.loadUrl(mp4, (err: Error) => {
            const timeline = player.getTimeline();
            this.setState({total : timeline.getFrameCount()});
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
        this.setState({frame})
    };

    onStripClick = (ratio: number) => {
        const frame = Math.round(this.state.total * ratio);
        this.onSelectFrame(frame);
    };

    onSelectFrame = (frame: number) => {
        if (this.player) {
            this.player.seekFrame(frame);
        }
    };

    private fileUpload = async (e) => {
        const fileList = e.target.files;
        const results = await readJsonlFile<JsonResult>(fileList[0]);
        this.predictions = results;
        const ranges = await jsonToRanges(results);
        this.setState({ranges})
    };

    render () {
        const {frame, total, ranges} = this.state;
        return <div>
            <div ref={this.containerRef}>

            </div>
            <input type="file" id="fileInput" onChange={this.fileUpload}/>
            <button onClick={this.saveResults}>Save results</button>
            {/* TODO: classes?
            <ClassCaptions classes={this.classes} predictions={this.predictions} current={frame}/>*/}
            {total > 0 ?
                <SVGStrip pointer={frame / total * 100} onClick={this.onStripClick}>
                    <Ranges ranges={ranges} end={total}
                            onChangeRanges={this.updatePrediction} onDeleteRanges={this.deletePrediction}/>
                </SVGStrip>
                : null
            }
            <div>
                Frame number <input type="number" value={frame} onChange={(e) => this.onSelectFrame(+e.target.value)}/>
            </div>
        </div>
    }
}
