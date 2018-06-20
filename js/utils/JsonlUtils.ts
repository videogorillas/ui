import {fileReader} from "./FetchUtils";
import {LabeledRange} from "../models/Range";

export function toJson<T> (text: string): T[] {
    const lines = text.trim().split('\n');
    return lines.map((line: string) => JSON.parse(line));
}

export function fromJson<T> (json: T[]) {
    let jsonl = "";
    for (const line of json) {
        const str = JSON.stringify(line);
        jsonl += str + "\n";
    }
    return jsonl;
}

async function readTextFile (file: File): Promise<string> {
    try {
        const event = await fileReader(file);
        return event.target.result;
    } catch (e) {
        console.log("Error", e);
    }
}

export function parseResponse<T> (text: string): T[] {
    let json: T[];
    try {
        json = JSON.parse(text);
    } catch (e) {
        json = toJson(text) as T[];
    }
    return json;
}

export async function fetchJson<T> (url: string): Promise<T[]> {
    const response = await fetch(url);
    const text = await response.text();
    return parseResponse(text);
}

export async function readJsonFile<T> (file: File): Promise<T[]> {
    const text = await readTextFile(file);
    return parseResponse(text);
}