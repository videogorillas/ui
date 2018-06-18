import * as React from 'react';
import './app.css';
import Ranges from "./Ranges";
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs/index";
import {saveFile} from "../utils/FetchUtils";
import ClassCaptions from "./ClassCaptions";
import {JsonResult, jsonToRanges, toJson, readJsonFile, fromJson, fetchJson} from "../utils/JsonlUtils";
import SVGStrip from "./SVGStrip";
import {ChangeEvent} from "react";
import Player from "./Player";

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
}

// const mp4 = "http://10.0.1.140/bstorage/home/chexov/testvideo/LFA.mp4";
// const mp4 = "http://blender.local/bstorage/datasets/vg_smoke/smoking_scenes/045%20-%20Penelope%20Cruz%20Smoking.mkv.mp4";
// const url = 'cruz-smoking.jsonl';
// const url = 'LFA123.mp4.out.json';

export default class App extends React.Component<AppProps, AppState> {

    constructor (props: AppProps) {
        super(props);
        const parsed = queryString.parse(location.search);
        console.log(parsed);
        const {videoUrl, json} = parsed;
        if (json) {
            this.fetchJson(json);
        }
        this.state = {
            frame : 0,
            total : 0,
            ranges : [],
            selectedRangeIndex : -1,
            videoUrl
        };
    }


    private predictions: JsonResult[] = [];
    private saveResults = () => {
        const jsonl = fromJson(this.predictions);
        const blob = new Blob([jsonl], {type : 'application/json'});
        saveFile(blob, 'test.jsonl');
    };

    updatePrediction = (updated: LabeledRange[]) => {
        console.log("updated", updated);
        for (const range of updated) {
            for (let i = range.start; i <= range.end; i++) {
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
        const json = await fetchJson<JsonResult>(url);
        this.predictions = json;
        const ranges = await jsonToRanges(this.predictions);
        this.setState({ranges});
    }

    private keyMap = {
        f : "Select range under the pointer",
        Escape : "Deselect range",
        Delete : "Delete selected range",
        "1-0" : "Set class 1-0"
    };

    componentDidMount () {
        const kdown = fromEvent<KeyboardEvent>(document, 'keydown');

        kdown.subscribe((e: KeyboardEvent) => {
            console.log('code', e.code, 'key', e.key);
            let {frame, ranges} = this.state;
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
                    if (e.target.id === "videoUrl") {
                        this.setState({videoUrl : e.target.value});
                    }
                    return;
                case "Escape":
                    this.setState({selectedRangeIndex : -1});
                    return;
                case "KeyF":
                    const selectedRangeIndex = this.findClosestIndex(frame, ranges);
                    this.setState({selectedRangeIndex});
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
        let {ranges, selectedRangeIndex, frame} = this.state;
        if (selectedRangeIndex > -1) {
            range = ranges[selectedRangeIndex];
            range.label = key;
        } else {
            range = {start : frame, end : frame + 1, label : key};
            ranges = this.insertNewRange(ranges, range);
        }
        this.updatePrediction([range]);
        this.setState({ranges, selectedRangeIndex : -1});
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
        const ranges = await jsonToRanges(results);
        this.setState({ranges})
    };

    private findClosestIndex (x: number, ranges: LabeledRange[], m = 0): number {
        if (ranges.length == 0) {
            return -1;
        }
        if (ranges.length == 1) {
            return m
        }
        let mid = ranges.length / 2 | 0;
        if (ranges[mid].start > x) {
            //left half
            return this.findClosestIndex(x, ranges.slice(0, mid), m)
        } else {
            //right half
            return this.findClosestIndex(x, ranges.slice(mid), mid + m)
        }
    }

    private insertNewRange (ranges: LabeledRange[], range: LabeledRange): LabeledRange[] {
        //closest left range
        const i = this.findClosestIndex(range.start, ranges);
        const closest = ranges[i];
        const next = closest && ranges[i + 1];
        if (!closest || !next) {
            ranges.push(range);
            this.updatePrediction([range]);
            this.selectRangeIndex(i + 1);
            return;
        }
        const updated = [];
        // range and closest are same
        if (closest.start == range.start && range.end == closest.end) {
            ranges[i] = range;
            updated.push(range);
        }
        // before closest
        else if (closest.start > range.end) {
            ranges.unshift(range);
            this.updatePrediction([range]);
        }
        // split closest range
        else if (closest.start < range.start && range.end < closest.end) {
            // clone closest as tail
            const tail = {...closest};

            // set closest end to new range start
            closest.end = range.start;
            updated.push(closest);

            // set tail end to new range start
            tail.start = range.end;

            if (range.end - range.start > 0) {
                //split ranges on closest index and insert new range and tail
                ranges.splice(i + 1, 0, range, tail);
                updated.push(range);
            } else {
                //split ranges on closest index and insert tail
                ranges.splice(i + 1, 0, tail);
            }

            updated.push(tail);
            console.log(closest, range, tail, i);
        }
        //insert range after closest in the gap between two ranges
        else if (next && range.start > closest.end && range.end < next.start) {
            // split ranges on closest index and insert new range
            ranges.splice(i + 1, 0, range);
            updated.push(range);
        }
        // overlap with next ranges
        else if (next && range.end > next.start) {
            //closest right range
            const j = this.findClosestIndex(range.end, ranges);
            const nextClosest = ranges[j];
            const tail = {...nextClosest};
            tail.start = range.end;

            // overlap left closest
            if (range.start < closest.end) {
                closest.end = range.start;
            }

            //split ranges on closest index, delete overlapped and insert new range and tail
            const deleted = ranges.splice(i + 1, j - i, range, tail);

            this.deletePrediction(deleted);
            updated.push(closest, range, tail);
        }
        this.updatePrediction(updated);
        this.selectRangeIndex(i + 1);
        return ranges;
    }


    private onMarkRange = (range: LabeledRange) => {
        const {total} = this.state;
        const start = Math.round(range.start * total);
        const end = Math.round(range.end * total);
        const ranges = this.insertNewRange([...this.state.ranges], {start, end, label : "new"});
        this.setState({ranges});
    };

    private selectRangeIndex = (i: number) => {
        this.setState({selectedRangeIndex : i})
    };

    private deleteSelectedRange () {
        let {selectedRangeIndex : i, ranges} = this.state;
        if (i >= 0) {
            const deleted = ranges.splice(i, 1);
            this.deletePrediction(deleted);
            this.setState({selectedRangeIndex : -1, ranges});
        }
    }

    render () {
        const {frame, total, ranges, selectedRangeIndex, videoUrl} = this.state;
        return <div>
            {videoUrl &&
            <div>
                <Player url={videoUrl} onTimeUpdate={this.onTimeUpdate} frame={frame} onLoad={this.videoLoaded}/>
                <ClassCaptions current={this.currentCaption}/>
                <div>
                    Frame number <input type="number" value={frame}
                                        onChange={(e) => this.onSelectFrame(+e.target.value)}/>
                    <button onClick={this.saveResults}>Save results</button>
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
            <div>
                <input type="text" id="videoUrl"/>
            </div>
            <div>
                <input type="file" id="fileInput" onChange={this.fileUpload}/>
            </div>

        </div>
    }


}
