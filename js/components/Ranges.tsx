import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs";
import {filter, flatMap, map, takeUntil} from "rxjs/operators";

interface RangesProps {
    ranges: LabeledRange[];
    colorMap?: { [label: string]: string };
    start?: number;
    end: number;
}

const defaultColors = ["rgb(0,0,255)", "rgb(0,255,0)"];

interface RangesState {
    activeRangeIndex: number;
}

export default class Ranges extends React.Component<RangesProps, RangesState> {
    static defaultProps = {
        start : 0,
        end : 100
    };
    private svgRef: React.RefObject<any> = React.createRef();

    state: RangesState = {
        activeRangeIndex : -1
    };

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
        return this.props.ranges[this.state.activeRangeIndex];
    }

    componentDidMount () {
        if (this.svgRef.current) {
            this.forceUpdate();
        }
        const move = fromEvent<MouseEvent>(document, 'mousemove');
        const up = fromEvent(document, 'mouseup');

        fromEvent<MouseEvent>(document, 'mousedown')
            .pipe(flatMap<MouseEvent, any>(e => {
                const rect: SVGRectElement = e.target;
                const x = e.clientX;
                const left = rect.x.baseVal.value;
                const w = rect.width.baseVal.value;
                const right = left + w;
                return move.pipe(filter(x => this._range), map<MouseEvent, any>(mm => {
                    const deltaX = mm.clientX - e.clientX;
                    if (x > (left + right) / 2) {
                        const rw = Math.max(w + deltaX, 0);
                        rect.setAttribute("width", `${rw}`);
                    } else {
                        const x = Math.min(left + deltaX, right);
                        rect.setAttribute("x", `${x}`);
                        const rw = Math.max(w - deltaX, 0);
                        rect.setAttribute("width", `${rw}`);
                    }

                    return 0;
                }), takeUntil(up));
            }))
            .subscribe(rw => {
                const end = rw / (this.unit * this._width);
                // console.log(end | 0);
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

    render () {
        return (<div>
            <svg style={{width : "50%"}} ref={this.svgRef}>
                {this.renderRanges()}
            </svg>
        </div>);
    }

    private renderRanges () {
        if (!this.svgRef.current) {
            return null;
        }

        return this.props.ranges.map((range, i) => {
            return (<rect x={this.getX(range)}
                          y="0"
                          width={this.getWidth(range)} height="100"
                          style={{fill : this.getColor(range, i)}}
                          key={`${range.start}-${range.end}-${range.label}`}
                          onMouseDownCapture={this.activateRange.bind(this, i)}
            />)
        });

    }

    private activateRange (n: number) {
        console.log("activate");
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