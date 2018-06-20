import {LabeledRange} from "./Range";

export type JsonResult = [number, [number, number]];

export interface RangesDelegate {
    update (updated: LabeledRange[]): void;

    delete (deleted: LabeledRange[]): void;
}

export default class RangesDataSource {
    ranges: LabeledRange[];
    delegate: RangesDelegate;

    constructor (ranges: LabeledRange[] = []) {
        this.ranges = ranges;
    }

    async fromJson (jsonIterator: AsyncIterableIterator<JsonResult>) {
        this.ranges = [];
        for await (const item of jsonIterator) {
            let range: LabeledRange;
            const predictions = item[1];
            const max = Math.max(...predictions);
            const index = predictions.indexOf(max);
            if (!this.ranges.length) {
                range = {
                    start : item[0],
                    end : item[0] + 1,
                    label : `${index}`
                };
                this.ranges.push(range);
            } else {
                range = this.ranges[this.ranges.length - 1];
                if (`${index}` === range.label) {
                    range.end = item[0] + 1;
                } else {
                    range = {
                        start : item[0],
                        end : item[0] + 1,
                        label : `${index}`
                    };
                    this.ranges.push(range);
                }
            }
        }
        return this.ranges;
    }

    closest (x: number): number {
        return this.findClosestIndex(x, [...this.ranges]);
    }

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

    delete (index: number) {
        this.delegate.delete(this.ranges.splice(index, 1));
    }

    insert (range: LabeledRange): number {
        //closest left range
        const i = this.findClosestIndex(range.start, this.ranges);
        const closest = this.ranges[i];
        const next = closest && this.ranges[i + 1];
        // 1. no ranges
        if (!closest || !next) {
            this.ranges.push(range);
            this.delegate.update([range]);
            return i + 1;
        }
        // 2. before closest
        if (closest.start > range.end) {
            this.ranges.unshift(range);
            this.delegate.update([range]);
            return i;
        }
        // 3. inside closest
        const updated = [];
        const sameStart = closest.start == range.start;
        const sameEnd = range.end == closest.end;
        const clone = {...closest};
        //3.1. same start / same end
        if (sameStart) {
            // & same end
            if (sameEnd) {
                this.ranges[i] = range;
                this.delegate.update([range]);
                return i;
            }
            // before closest end
            if (range.end < closest.end) {
                clone.start = range.end;
                closest.end = range.end;
                //delete clone
                this.delegate.delete([clone]);
                this.delegate.update([closest]);
                return i;
            }
            // after closest end
            else {
                closest.end = range.end;
                updated.push(closest);

                const j = this.findClosestIndex(range.end, this.ranges);
                if (j > -1) {
                    const nextClosest = this.ranges[j];
                    const tail = {...nextClosest};
                    tail.start = range.end;
                    this.delegate.delete(this.ranges.splice(i + 1, j - i, tail));
                    updated.push(tail);
                }
                this.delegate.update(updated);
                return i;
            }
        }
        //3.2. after closest start
        else if (closest.start < range.start) {
            if (sameEnd) {
                clone.end = range.start;
                closest.start = range.start;
                this.delegate.delete([clone]);
                return i;
            }
            // before closest end
            if (range.end < closest.end) {
                // set closest end to new range start
                closest.end = range.start;
                // set clone end to new range start
                clone.start = range.end;

                updated.push(closest);
                if (range.end - range.start > 0) {
                    //split ranges on closest index and insert new range and clone
                    this.ranges.splice(i + 1, 0, range, clone);
                    updated.push(range);
                } else {
                    //split ranges on closest index and insert clone
                    this.ranges.splice(i + 1, 0, clone);
                }
                updated.push(clone);
                this.delegate.update(updated);
            }
            //after closest end
            else {
                // and there is next range
                if (next) {
                    // insert range after closest in the gap between two ranges
                    if (range.start > closest.end && range.end < next.start) {
                        // split ranges on closest index and insert new range
                        this.ranges.splice(i + 1, 0, range);
                        updated.push(range);
                    }
                    else if (range.end > next.start) {
                        //closest right range
                        const j = this.findClosestIndex(range.end, this.ranges);
                        const nextClosest = this.ranges[j];
                        const tail = {...nextClosest};
                        tail.start = range.end;

                        // overlap left closest
                        if (range.start < closest.end) {
                            closest.end = range.start;
                        }
                        //split ranges on closest index, delete overlapped and insert new range and clone
                        this.delegate.delete(this.ranges.splice(i + 1, j - i, range, tail));
                        updated.push(closest, range, tail);
                    }
                }
            }

        }
        this.delegate.update(updated);
        return i + 1;
    }

    setLabel (i: number, label: string) {
        this.ranges[i].label = label;
        this.delegate.update([this.ranges[i]]);
        return this.ranges[i];
    }
}