import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs";
import {filter, flatMap, map, sample, takeUntil} from "rxjs/operators";
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
        fromEvent(document, 'mousedown')
            .pipe(filter((e: MouseEvent) => e.target instanceof SVGRectElement),
                flatMap((e: MouseEvent) => {
                    const rect: SVGRectUtil = rectUtil(e.target as SVGRectElement);
                    const rightSide = rect.isRight(e.clientX - svgLeft);
                    let x = e.clientX;
                    return move.pipe(
                        map<MouseEvent, SVGRectUtil>((mm: MouseEvent) => {
                            const deltaX = mm.clientX - x;
                            x = mm.clientX;
                            if (rightSide) {
                                rect.changeRight(deltaX);
                            } else {
                                rect.changeLeft(deltaX);
                            }
                            return rect;
                        }),
                        takeUntil(up)
                    );
                }),
                sample(up))
            .subscribe((rect: SVGRectUtil) => {
                const ranges = [...this.state.ranges];
                let i = this.state.activeRangeIndex;
                const width = Math.round(this.pxToRUnit(rect.width));
                if (width <= 0) {
                    ranges.splice(i, 1);
                    i = -1;
                } else {
                    const range = ranges[i];
                    const start = Math.round(this.pxToRUnit(rect.x));
                    range.start = start;
                    range.end = start + width;
                }
                this.setState({ranges, activeRangeIndex : i});
            });
    }

    private pxToRUnit (px: number) {
        return px / (this.unit * this._width);
    }

    render () {
        return (<div>
            <svg style={{width : "100%"}} ref={this.svgRef}>
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