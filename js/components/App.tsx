import * as React from 'react';
import {ChangeEvent} from 'react';
import './app.css';
import Ranges from "./Ranges";
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs/index";
import {saveFile} from "../utils/FetchUtils";
import ClassCaptions from "./ClassCaptions";
import {fetchJson, fromJson, readJsonFile} from "../utils/JsonlUtils";
import SVGStrip from "./SVGStrip";
import Player from "./Player";
import KeyMap from "./KeyMap";
import CSVSelect from "./CSVSelect";
import {JsonResult, default as RangesManager} from "../models/RangesManager";

const queryString = require('query-string');

interface AppProps {
}

interface AppState {
    frame: number;
    total: number;
    ranges: LabeledRange[];
    selectedRangeIndex: number;
    videoUrl?: string;
    jsonUrl?: string;
    csvUrl?: string;
}

// const mp4 = "http://10.0.1.140/bstorage/home/chexov/testvideo/LFA.mp4";
// const mp4 = "http://blender.local/bstorage/datasets/vg_smoke/smoking_scenes/045%20-%20Penelope%20Cruz%20Smoking.mkv.mp4";
// const url = 'cruz-smoking.jsonl';
// const url = 'LFA123.mp4.out.json';

export default class App extends React.Component<AppProps, AppState> {
    private manager: RangesManager;
    private predictions: JsonResult[] = [];

    constructor (props: AppProps) {
        super(props);
        const parsed = queryString.parse(location.search);
        const {videoUrl, json, csv} = parsed;
        if (json) {
            this.fetchJson(json);
        }
        this.manager = new RangesManager();
        this.state = {
            frame : 0,
            total : 0,
            ranges : [],
            selectedRangeIndex : -1,
            videoUrl,
            csvUrl : csv
        };
    }


    private saveResults = () => {
        const jsonl = fromJson(this.predictions);
        const blob = new Blob([jsonl], {type : 'application/json'});
        saveFile(blob, 'test.jsonl');
    };

    updatePrediction = (updated: LabeledRange[]) => {
        // console.log("updated", updated);
        for (const range of updated) {
            for (let i = range.start; i <= range.end; i++) {
                const predict: [number, number] = [0, 0];
                predict[+range.label] = 1;
                this.predictions[i] = [i, predict];
            }
        }
        // console.log(this.predictions);
    };

    deletePrediction = (deleted: LabeledRange[]) => {
        // console.log("deleted", deleted);
        const start = deleted[0].start;
        const end = deleted[deleted.length - 1].end;
        this.predictions.fill(undefined, start, end);
        // console.log(this.predictions);
    };

    private get currentCaption () {
        const prediction = this.predictions[this.state.frame];
        if (!prediction) {
            return;
        }
        const max = Math.max(...prediction[1]);
        return `${prediction[1].indexOf(max)}`;
    };

    async fetchJson (url: string) {
        try {
            const json = await fetchJson<JsonResult>(url);
            this.predictions = json;
            const ranges = await this.manager.fromJson(this.predictions);
            this.setState({ranges});
        } catch (e) {
            console.log(e);
        }

    }

    private keyMap = {
        f : "Select range under the pointer",
        Escape : "Deselect range",
        Delete : "Delete selected range",
        "1-0" : "Set class 1-0",
        "i" : "Set in point",
        "o" : "Set out point",
        "+" : "Zoom in",
        "-" : "Zoom out"
    };

    componentDidMount () {
        const kdown = fromEvent<KeyboardEvent>(document, 'keydown');

        kdown.subscribe((e: KeyboardEvent) => {
            // console.log('code', e.code, 'key', e.key);
            let {frame} = this.state;
            let step = 0;
            switch (e.code) {
                case "ArrowRight":
                    step = 1;
                    break;
                case "ArrowLeft":
                    step = -1;
                    break;
                case "Backspace":
                case "Delete":
                    this.deleteSelectedRange();
                    return;
                case "Enter":
                    const target = e.target as HTMLInputElement;
                    if (target.id === "videoUrl") {
                        this.setState({videoUrl : target.value});
                    }
                    return;
                case "Escape":
                    this.setState({selectedRangeIndex : -1});
                    return;
                case "KeyF":
                    this.setState({selectedRangeIndex : this.manager.closest(frame)});
                    return;
                case "Digit1":
                case "Digit2":
                case "Digit3":
                case "Digit4":
                case "Digit5":
                case "Digit6":
                case "Digit7":
                case "Digit8":
                case "Digit9":
                case "Digit0":
                    this.setClass(e.key);
                    return;
            }
            frame += step;
            this.setState({frame});
        });
    }

    private setClass (key: string) {
        let range: LabeledRange;
        let {selectedRangeIndex, frame} = this.state;
        if (selectedRangeIndex > -1) {
            range = this.manager.setLabel(selectedRangeIndex, key);
        } else {
            range = {start : frame, end : frame + 1, label : key};
            this.manager.insert(range);
        }
        this.updatePrediction([range]);
        this.setState({ranges : this.manager.ranges, selectedRangeIndex : -1});
    }

    onTimeUpdate = (ts: { frame: number }) => {
        const frame = ts.frame;
        if (frame != this.state.frame) {
            this.setState({frame});
        }
    };

    videoLoaded = (timeline: { getFrameCount (): number }) => {
        this.setState({total : timeline.getFrameCount()});
    };

    onStripClick = (ratio: number) => {
        const frame = Math.round(this.state.total * ratio);
        this.onSelectFrame(frame);
    };

    onSelectFrame = (frame: number) => {
        this.setState({frame});
    };

    private fileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        const results = await readJsonFile<JsonResult>(fileList[0]);
        this.predictions = results;
        const ranges = await this.manager.fromJson(results);
        this.setState({ranges})
    };


    private onMarkRange = (range: LabeledRange) => {
        const {total} = this.state;
        const start = Math.round(range.start * total);
        const end = Math.round(range.end * total);
        const i = this.manager.insert({start, end, label : "new"});
        this.updatePrediction(this.manager.updated);
        this.deletePrediction(this.manager.deleted);
        this.setState({ranges : this.manager.ranges, selectedRangeIndex : i});
        // console.log("insertNewRange", ranges);
    };

    private selectRangeIndex = (i: number) => {
        this.setState({selectedRangeIndex : i})
    };

    private deleteSelectedRange () {
        let {selectedRangeIndex : i, ranges} = this.state;
        if (i >= 0) {
            this.deletePrediction(this.manager.delete(i));
            this.setState({selectedRangeIndex : -1, ranges});
        }
    }

    private csvSelectChange = (sources: string[]) => {
        this.setState({videoUrl : sources[0]});
        this.fetchJson(sources[1]);
    };


    render () {
        const {frame, total, ranges, selectedRangeIndex, videoUrl, csvUrl} = this.state;

        return <div>
            {csvUrl &&
            <div>
                <CSVSelect csvUrl={csvUrl} onSelect={this.csvSelectChange}/>
            </div>
            }
            {videoUrl &&
            <div>
                <Player url={videoUrl} onTimeUpdate={this.onTimeUpdate} frame={frame} onLoad={this.videoLoaded}/>
                <ClassCaptions current={this.currentCaption}/>
                <div>
                    Frame number <input type="number" value={frame}
                                        onChange={(e) => this.onSelectFrame(+e.target.value)}/>
                </div>
            </div>
            }
            {total > 0 ?
                <SVGStrip pointer={frame / total} onClick={this.onStripClick} onMark={this.onMarkRange}>
                    <Ranges ranges={ranges} end={total} onRangeSelectedIndex={this.selectRangeIndex}
                            selectedIndex={selectedRangeIndex}/>
                </SVGStrip>
                : null
            }

            {!videoUrl &&

            <div>
                <div>
                    <h2>Use URL query string like <strong><code>/?videoUrl=VIDEO_URL&json=JSON_URL</code></strong> or
                        inputs below to load video and json</h2>
                </div>
                <hr/>
                <label htmlFor="videoUrl">Enter <strong>video</strong> file url <input type="text"
                                                                                       id="videoUrl"/></label>

            </div>
            }
            {!this.predictions.length &&
            <div>
                <label htmlFor="fileInput">Choose <b>json or jsonl</b> file <input type="file" id="fileInput"
                                                                                   onChange={this.fileUpload}/></label>
            </div>
            }
            {!!this.predictions.length &&
            <div>
                <button onClick={this.saveResults}>Save results</button>
            </div>
            }
            {videoUrl &&
            <div>
                <hr/>
                <KeyMap keymap={this.keyMap}/>
            </div>
            }
        </div>
    }


}
