///<reference path="../utils/SvgUtils.ts"/>
import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs";
import {
    exhaust,
    filter,
    flatMap,
    groupBy,
    map,
    mergeMap,
    reduce,
    sample,
    takeUntil,
    toArray,
    window
} from "rxjs/operators";
import {rectUtil, SVGRectUtil} from "../utils/SvgUtils";

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
        const svgLeft = this.svgRef.current.getBoundingClientRect().left;
        fromEvent<MouseEvent>(document, 'mousedown')
            .pipe(flatMap<MouseEvent, any>(e => {
                const rect: SVGRectUtil = rectUtil(e.target);
                const rightSide = rect.isRight(e.clientX - svgLeft);
                let x = e.clientX;

                return move.pipe(filter(x => this._range), map<MouseEvent, any>(mm => {
                        const deltaX = mm.clientX - x;
                        x = mm.clientX;
                        //TODO: do not decrease width < 10px
                        //dragging rightwards
                        if (rightSide) {
                            rect.changeRight(deltaX);
                            const next = rect.next;
                            if (next && rect.right > next.x) {
                                next.changeLeft(deltaX);
                            }
                        } else {
                            //dragging leftwards
                            rect.changeLeft(deltaX);
                            const prev = rect.prev;
                            if (prev && rect.x < prev.right) {
                                prev.changeRight(deltaX);
                            }
                        }
                        return deltaX;
                    }),
                    takeUntil(up),
                    reduce((acc, deltaX) => {
                        const x = acc + deltaX;
                        return x;
                    }),
                    map(x => {
                        console.log(x);
                        return {x};
                    })
                );
            }))
            .subscribe(t => {
                // const ranges = [...this.state.ranges];
                // let i = this.state.activeRangeIndex;
                // const range = ranges[i];
                // const next = ranges[i + 1];
                // const prev = ranges[i - 1];
                // const deltaU = Math.round(this.pxToRUnit(t.x));
                // if (t.right) {
                //     range.end += deltaU;
                //     if (next && range.end > next.start) {
                //         next.start += deltaU;
                //     }
                // } else {
                //     range.start += deltaU;
                //     if (prev && range.start < prev.end) {
                //         prev.end += deltaU;
                //     }
                // }
                // console.log(ranges);
                console.log('subscribe', t);
                // this.setState({ranges});

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
        console.log('rect');
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