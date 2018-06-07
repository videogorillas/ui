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
    pointer: number;

    onClick (frame: number): void;
}

const defaultColors = ["rgb(0,0,255)", "rgb(0,255,0)", "rgb(0,255,255)"];

interface RangesState {
    activeRangeIndex: number;
    ranges: LabeledRange[];
    markers: LabeledRange[];
    inOutMarkers: LabeledRange[];
    newRange?: LabeledRange;
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
            ranges : props.ranges,
            markers : [],
            inOutMarkers : [],
            newRange : {
                start : -1,
                end : -1,
                //TODO: label for newRange?
                label : "2"
            }
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

    componentWillReceiveProps (nextP: RangesProps) {

    }


    componentDidMount () {
        if (this.svgRef.current) {
            this.forceUpdate();
        }

        const kdown = fromEvent<MouseEvent>(document, 'keydown');

        kdown.subscribe(e => {
            const {pointer} = this.props;
            const {markers, ranges, newRange, inOutMarkers, activeRangeIndex} = this.state;
            let newState: any = {};
            let range = {...newRange};
            switch (e.code) {
                case "KeyI":
                    if (activeRangeIndex > 0) {
                        this.markIn(pointer, ranges[activeRangeIndex]);
                    } else {
                        range.start = pointer;
                        inOutMarkers.push({start : pointer, end : pointer + 1, label : e.key});
                        newState.inOutMarkers = inOutMarkers;
                    }
                    break;
                case "KeyO":
                    if (activeRangeIndex > 0) {
                        this.markOut(pointer, ranges[activeRangeIndex]);
                    } else {
                        range.end = pointer;
                        inOutMarkers.push({start : pointer, end : pointer + 1, label : e.key});
                        newState.inOutMarkers = inOutMarkers;
                    }
                    break;
                case "Backspace":
                case "Delete":
                    this.deleteActiveRange();
                    break;
                case "Digit1":
                case "Digit2":
                case "Digit3":
                case "Digit4":
                case "Digit5":
                case "Digit6":
                case "Digit7":
                case "Digit8":
                case "Digit9":
                case "Digit0":
                    markers.push({start : pointer, end : pointer + 1, label : e.key});
                    newState.markers = markers;
                    break;
                case "Escape":
                    newState.activeRangeIndex = -1;
                    newState.inOutMarkers = [];
            }
            let {start, end} = range;
            if (start > -1 && end > -1) {
                range = {...range, ...this.inOutPoints(start, end)};

                this.insertNewRange(ranges, range);
                range = {
                    start : -1,
                    end : -1,
                    //TODO: label for newRange?
                    label : "2"
                };
                newState.inOutMarkers = [];
            }
            newState.newRange = range;
            this.setState(newState);
        });

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
                this.editRanges(rect);
            });
    }

    private insertNewRange (ranges: LabeledRange[], range: LabeledRange) {
        //closest left range
        const closest = this.findClosest(range.start, ranges);
        const i = ranges.indexOf(closest);

        // split closest range
        if (closest.start < range.start && range.end < closest.end) {
            const tail = {...closest};
            closest.end = range.start;
            tail.start = range.end;
            if (range.start - range.end > 0) {
                ranges.splice(i + 1, 0, range, tail);
            } else {
                ranges.splice(i + 1, 0, tail);
            }

            console.log(closest, range, tail, i);
            return
        }

        //insert range after closest
        //in the gap between two ranges
        const next = ranges[i + 1];
        if (next && range.start > closest.end && range.end < next.start) {
            ranges.splice(i + 1, 0, range);
            return;
        }

        // overlap with next ranges
        if (next && range.end > next.start) {
            //closest right range
            const nextClosest = this.findClosest(range.end, ranges);
            const j = ranges.indexOf(nextClosest);
            const tail = {...nextClosest};
            tail.start = range.end;

            // overlap left closest
            if (range.start < closest.end) {
                closest.end = range.start;
            }
            ranges.splice(i + 1, j - i, range, tail);
        }
    }

    private markIn (x: number, r: LabeledRange) {
        let {start, end} = r;
        if (start < x && x < end) {
            r.start = x;
        }
    }

    private markOut (x: number, r: LabeledRange) {
        let {start, end} = r;
        if (start < x && x < end) {
            r.end = x;
        }
    }

    private sortRanges (r1: LabeledRange, r2: LabeledRange) {
        return r1.start - r2.start;
    }


    private inOutPoints (x1: number, x2: number) {
        return {start : Math.min(x1, x2), end : Math.max(x1, x2)};
    }

    private deleteActiveRange () {
        let {activeRangeIndex : i} = this.state;
        if (i >= 0) {
            const ranges = [...this.state.ranges];
            ranges.splice(i, 1);
            this.setState({ranges, activeRangeIndex : -1});
        }
    }

    private findClosest (x: number, ranges: LabeledRange[]): LabeledRange {
        if (ranges.length == 1) {
            return ranges[0]
        }
        let mid = ranges.length / 2 | 0;
        if (ranges[mid].start > x) {
            //left half
            return this.findClosest(x, ranges.slice(0, mid))
        } else {
            //right half
            return this.findClosest(x, ranges.slice(mid))
        }
    }

    private editRanges (rect: SVGRectUtil) {
        let i = this.state.activeRangeIndex;
        if (i < 0) {
            return;
        }
        const ranges = [...this.state.ranges];
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
    }

    private pxToRUnit (px: number) {
        return px / (this.unit * this._width);
    }

    private unitsToPx (units: number) {
        return units * this.unit * this._width
    }

    svgClick = (e) => {
        const frame = Math.round(this.pxToRUnit(e.nativeEvent.offsetX));
        console.log(e.nativeEvent.offsetX, frame);
        this.props.onClick(frame);
        this.setState({activeRangeIndex : -1});
    };

    render () {
        return (<div>
            <svg style={{width : "100%", background : "grey"}} ref={this.svgRef}
                 onMouseDownCapture={this.svgClick}
            >
                {this.renderRanges()}
                {this.renderMarkers()}
                {this.renderPointer()}
            </svg>
        </div>);
    }

    private renderPointer (): any {
        return (
            <g>
                <rect x={this.unitsToPx(this.props.pointer)}
                      y="20"
                      width={this.unitsToPx(1)}
                      height="100"
                      style={{fill : "red"}}
                />
            </g>
        );
    }


    private renderMarkers (): any {
        let {markers, inOutMarkers} = this.state;
        return markers.concat(inOutMarkers).map((marker, i) => {
            const x = this.unitsToPx(marker.start);
            const k = `${marker.start}-${marker.end}-${marker.label}`;
            return (<g key={`marker-${k}`}>
                <text
                    x={x}
                    y="18"
                    stroke="none"
                    fill="black">
                    {marker.label}
                </text>
                <rect x={x}
                      y="20"
                      width={this.unitsToPx(marker.end - marker.start)}
                      height="100"
                      style={{fill : "yellow"}}
                />
            </g>)
        });
    }

    private renderRanges () {
        if (!this.svgRef.current) {
            return null;
        }

        return this.state.ranges.map((range, i) => {
            return (<rect x={this.unitsToPx(range.start)}
                          y="20"
                          width={this.unitsToPx(range.end - range.start)}
                          height="100"
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
        if (i == this.state.activeRangeIndex) {
            return "rgb(250,155,0)";
        }
        return defaultColors[range.label];
    }

}