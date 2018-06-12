export async function fetchStream (url: string) {
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

export function saveFile (blob: Blob, fileName: string) {
    const a = document.createElement("a");
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

export async function fileReader(file: File){
    const reader = new FileReader();
    const result = new Promise<FileReaderProgressEvent>((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
    });
    reader.readAsText(file);
    return await result;
}