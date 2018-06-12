export async function fetchJsonl (url: string): Promise<ReadableStream | null> {
    const response = await fetch(url);
    return response.body;
}

export function streamAsyncIterator (stream: ReadableStream) {
    // Get a lock on the stream:
    const reader = stream.getReader();

    return {
        next () {
            // Stream reads already resolve with {done, value}, so
            // we can just call read:
            return reader.read();
        },
        return () {
            // Release the lock if the iterator terminates.
            reader.releaseLock();
            return {};
        },
        // for-await calls this on whatever it's passed, so
        // iterators tend to return themselves.
        [Symbol.asyncIterator] () {
            return this;
        }
    };
}

export async function* jsonlIterator (url: string) {
    const stream = await fetchJsonl(url);
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

export async function* fileReader (files: FileList): AsyncIterableIterator<string> {
    for (const file of Array.from(files)) {
        const reader = new FileReader();
        const result = new Promise<FileReaderProgressEvent>((resolve, reject) => {
            reader.onload = resolve;
            reader.onerror = reject;
        });
        reader.readAsText(file);
        try {
            const event = await result;
            yield event.target.result;
        } catch (e) {
            throw e;
        }
    }
}

export async function readJsonlFile (file: File): Promise<any> {
    const reader = new FileReader();
    const result = new Promise<FileReaderProgressEvent>((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
    });
    reader.readAsText(file);
    try {
        const event = await result;
        const lines = event.target.result.trim().split('\n');
        const json = lines.map((line: string) => JSON.parse(line));
        return json;
    } catch (e) {
        console.log("Bad JSON", e);
    }
}

export function saveFile (blob: Blob, fileName: string) {
    const a = document.createElement("a");
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}
