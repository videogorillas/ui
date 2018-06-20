import {JsonResult} from "./RangesManager";
import {LabeledRange} from "./Range";
import {saveFile} from "../utils/FetchUtils";
import {fromJson} from "../utils/JsonlUtils";

export default class PredictionsDataSource {
    predictions: JsonResult[] = [];

    constructor (predictions: JsonResult[] = []) {
        this.predictions = predictions;
    }

    update (updated: LabeledRange[]) {
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

    delete (deleted: LabeledRange[]) {
        // console.log("deleted", deleted);
        const start = deleted[0].start;
        const end = deleted[deleted.length - 1].end;
        this.predictions.fill(undefined, start, end);
        // console.log(this.predictions);
    };

    saveAsJsonl = () => {
        const jsonl = fromJson(this.predictions);
        const blob = new Blob([jsonl], {type : 'application/json'});
        saveFile(blob, 'predictions.jsonl');
    };
}