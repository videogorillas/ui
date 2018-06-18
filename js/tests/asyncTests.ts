import {fetchJsonl, jsonlIterator, streamAsyncIterator} from '../utils/FetchUtils';
import {LabeledRange} from "../models/Range";

async function testFetchJsonl () {
    const url = 'cruz-smoking.jsonl';
    const ranges = [];
    for await (const item of jsonlIterator(url)) {
        //[0, [0.8, 0.1]], [1, [0.6, 0.3]]
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
    }
    console.log(ranges);
    return ranges;
}

// testFetchJsonl();