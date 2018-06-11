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