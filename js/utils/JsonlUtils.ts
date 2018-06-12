import {fileReader, streamAsyncIterator} from "./FetchUtils";
import {LabeledRange} from "../models/Range";

export async function* jsonlIterator (stream: ReadableStream) {
    let partial = '';
    for await (const chunk of streamAsyncIterator(stream)) {
        let utf8 = new TextDecoder('utf-8');
        const lines = utf8.decode(chunk).split('\n');
        for (const line of lines) {
            try {
                const jline = JSON.parse(partial + line);
                partial = '';
                yield jline;
            } catch (e) {
                partial += line;
            }
        }
    }
}

export function parseJsonlText<T> (text: string): T[] {
    const lines = text.trim().split('\n');
    return lines.map((line: string) => JSON.parse(line));
}

export async function readJsonlFile<T> (file: File): Promise<T[]> {
    try {
        const event = await fileReader(file);
        return parseJsonlText(event.target.result) as T[];
    } catch (e) {
        console.log("Bad JSON", e);
    }
}

export type JsonResult = [number, [number, number]];

export async function jsonToRanges (jsonIterator: AsyncIterableIterator<JsonResult>) {
    const ranges = [];
    for await (const item of jsonIterator) {
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
    return ranges;
}

function rangesToJsonl (ranges: LabeledRange[]) {
    for (const range of ranges) {

    }
}