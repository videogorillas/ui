///<reference path="../utils/SvgUtils.ts"/>
import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs";
import {filter, flatMap, map, reduce, sample, takeUntil, window} from "rxjs/operators";
import {rect, SVGRectUtil} from "../utils/SvgUtils";

interface RangesProps {
    ranges: LabeledRange[];
    colorMap?: { [label: string]: string };
    start?: number;
    end: number;
}

const defaultColors = ["rgb(0,0,255)", "rgb(0,255,0)"];

interface RangesState {
    activeRangeIndex: number;
    ranges: LabeledRange[];
}

export default class Ranges extends React.Component<RangesProps, RangesState> {
    static defaultProps = {
        start : 0,
        end : 100
    };
    private svgRef: React.RefObject<any> = React.createRef();


    constructor (props: RangesProps) {
        super(props);
        this.state = {
            activeRangeIndex : -1,
            ranges : props.ranges
        };
    }


    get unit () {
        return 1 / this.props.end;
    }

    get _width () {
        if (!this.svgRef.current) {
            return 0;
        }
        return this.svgRef.current.clientWidth
    }

    get _range (): LabeledRange {
        return this.state.ranges[this.state.activeRangeIndex];
    }

    get _nextRange (): LabeledRange {
        return this.state.ranges[this.state.activeRangeIndex + 1];
    }

    get _prevRange (): LabeledRange {
        return this.state.ranges[this.state.activeRangeIndex - 1];
    }

    componentDidMount () {
        if (this.svgRef.current) {
            this.forceUpdate();
        }
        const move = fromEvent<MouseEvent>(document, 'mousemove');
        const up = fromEvent(document, 'mouseup');

        fromEvent<MouseEvent>(document, 'mousedown')
            .pipe(flatMap<MouseEvent, any>(e => {
                let i = this.state.activeRangeIndex;
                console.log('doc', this.state.activeRangeIndex);
                const r: SVGRectUtil = rect(e.target);
                const x = e.clientX;
                const left = r.x;
                const w = r.width;
                const right = left + w;
                const range = {};
                return move.pipe(filter(x => this._range), map<MouseEvent, any>(mm => {
                    const deltaX = mm.clientX - e.clientX;
                    const next = r.next;
                    const prev = r.prev;
                    //dragging rightwards
                    if (x > (left + right) / 2) {
                        const rw = Math.max(w + deltaX, 0);
                        if (next && (r.right) > next.x) {
                            const dL = r.x + rw - next.x;
                            next.x = dL + next.x;
                            const w = next.width - dL;
                            next.width = Math.max(w, 0);
                            // nextRange.start = this.pxToRUnit(next.x);
                            // console.log('next start', nextRange.start | 0);
                        }
                        r.width = rw;
                        const end = this.pxToRUnit(r.right) | 0;
                        range.end = end;
                        console.log(end);
                    } else {
                        //dragging leftwards
                        const x = Math.min(left + deltaX, right);
                        const rw = Math.max(w - deltaX, 0);
                        if (prev && x < prev.right) {
                            const dW = prev.right - x;
                            prev.width = Math.max(prev.width - dW, 0);
                        }
                        r.x = Math.max(x, 0);
                        r.width = rw;
                        // this._range.start = this.pxToRUnit(r.x);
                    }

                    console.log('move', deltaX);
                    return deltaX;
                }), takeUntil(up));
            }), sample(up))
            .subscribe(rw => {
                console.log('subscribe', rw);
            });

        const source = fromEvent<KeyboardEvent>(document, 'keydown').subscribe(e => {
            console.log(e);
            //TODO: update svg
            // if (this._range) {
            //     switch (e.key) {
            //         case "ArrowRight":
            //             this._range.start += 1;
            //             break;
            //         case "ArrowLeft":
            //             this._range.end -= 1;
            //             break;
            //     }
            // }
            //TODO: update state
        });

    }

    private pxToRUnit (px: number) {
        return px / (this.unit * this._width);
    }

    render () {
        return (<div>
            <svg onMouseDown={() => console.log('svg')} style={{width : "100%"}} ref={this.svgRef}>
                {this.renderRanges()}
            </svg>
        </div>);
    }

    private renderRanges () {
        if (!this.svgRef.current) {
            return null;
        }

        return this.state.ranges.map((range, i) => {
            return (<rect x={this.getX(range)}
                          y="0"
                          width={this.getWidth(range)} height="100"
                          style={{fill : this.getColor(range, i)}}
                          key={`${range.start}-${range.end}-${range.label}`}
                          onMouseDown={this.activateRange.bind(this, i)}
            />)
        });

    }

    private activateRange (n: number) {
        this.setState({activeRangeIndex : n});
    }

    private getColor (range: LabeledRange, i: number): string {
        if (range == this._range) {
            return "rgb(255,0,0)";
        }
        return defaultColors[i % defaultColors.length];
    }

    private getWidth (range: LabeledRange): number {
        let count = range.end - range.start;
        return count * this.unit * this._width;
    }

    private getX (range: LabeledRange): number {
        return range.start * this.unit * this._width;
    }


}