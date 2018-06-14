import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {fromEvent} from "rxjs";
import {filter, flatMap, map, sample, takeUntil} from "rxjs/operators";
import {convertPoint, rectUtil, SVGRectUtil} from "../utils/SvgUtils";
import {MouseEvent} from "react";

interface RangesProps {
    ranges: LabeledRange[];
    colorMap?: { [label: string]: string };
    start?: number;
    end: number;

    onChangeRanges (updated: LabeledRange[]): void;

    onDeleteRanges (deleted: LabeledRange[]): void;
}

const defaultColors = ["rgb(0,0,255)", "rgb(0,255,0)", "rgb(0,255,255)"];

interface RangesState {
    activeRangeIndex: number;
    ranges: LabeledRange[];
    newRange?: LabeledRange;
}

export default class Ranges extends React.Component<RangesProps, RangesState> {

    static defaultProps = {
        start : 0,
        end : 100
    };
    private svgRef: React.RefObject<any> = React.createRef();
    private rangesRef: React.RefObject<any> = React.createRef();


    constructor (props: RangesProps) {
        super(props);
        this.state = {
            activeRangeIndex : -1,
            ranges : props.ranges,
            newRange : {
                start : -1,
                end : -1,
                //TODO: label for newRange?
                label : "2"
            },
        };
    }


    get unit () {
        return 1 / this.props.end;
    }

    // get _width () {
    //     if (this.outSvg.current) {
    //         return this.outSvg.current.clientWidth;
    //     }
    //     return 0;
    // };

    componentWillReceiveProps (nextP: RangesProps) {
        if (nextP.ranges != this.props.ranges) {
            this.setState({ranges : nextP.ranges});
        }
    }


    componentDidMount () {
        // if (this.outSvg.current) {
        //     this.forceUpdate();
        // }
        //
        // const kdown = fromEvent<MouseEvent<Document>>(document, 'keydown');
        //
        // kdown.subscribe((e: KeyboardEvent) => {
        //     const {pointer} = this.props;
        //     const {markers, ranges, newRange, inOutMarkers, activeRangeIndex} = this.state;
        //     let newState: any = {};
        //     let range = {...newRange};
        //     switch (e.code) {
        //         case "KeyI":
        //             if (activeRangeIndex > -1) {
        //                 this.markIn(pointer, ranges[activeRangeIndex]);
        //             } else {
        //                 range.start = pointer;
        //                 inOutMarkers.push({start : pointer, end : pointer + 1, label : e.key});
        //                 newState.inOutMarkers = inOutMarkers;
        //             }
        //             break;
        //         case "KeyO":
        //             if (activeRangeIndex > -1) {
        //                 this.markOut(pointer, ranges[activeRangeIndex]);
        //             } else {
        //                 range.end = pointer;
        //                 inOutMarkers.push({start : pointer, end : pointer + 1, label : e.key});
        //                 newState.inOutMarkers = inOutMarkers;
        //             }
        //             break;
        //         case "KeyF":
        //             const closest = this.findClosest(pointer, ranges);
        //             const i = ranges.indexOf(closest);
        //             this.activateRange(i);
        //             break;
        //         case "Backspace":
        //         case "Delete":
        //             this.deleteActiveRange();
        //             break;
        //         case "Digit1":
        //         case "Digit2":
        //         case "Digit3":
        //         case "Digit4":
        //         case "Digit5":
        //         case "Digit6":
        //         case "Digit7":
        //         case "Digit8":
        //         case "Digit9":
        //         case "Digit0":
        //             markers.push({start : pointer, end : pointer + 1, label : e.key});
        //             newState.markers = markers;
        //             break;
        //         case "Escape":
        //             newState.activeRangeIndex = -1;
        //             newState.inOutMarkers = [];
        //     }
        //     let {start, end} = range;
        //     if (start > -1 && end > -1) {
        //         range = {...range, ...this.inOutPoints(start, end)};
        //
        //         this.insertNewRange(ranges, range);
        //         range = {
        //             start : -1,
        //             end : -1,
        //             //TODO: label for newRange?
        //             label : "2"
        //         };
        //         newState.inOutMarkers = [];
        //     }
        //     newState.newRange = range;
        //     this.setState(newState);
        // });

        // const move = fromEvent<MouseEvent<Document>>(document, 'mousemove');
        // const up = fromEvent(document, 'mouseup');
        // fromEvent(this.svgRef.current, 'mousedown')
        //     .pipe(filter((e: MouseEvent<SVGSVGElement>) => e.target instanceof SVGRectElement),
        //         flatMap((e: MouseEvent<SVGSVGElement>) => {
        //             const svgLeft = this.svgRef.current.getBoundingClientRect().left;
        //             const rect: SVGRectUtil = rectUtil(e.target as SVGRectElement);
        //             const rightSide = rect.isRight(e.clientX - svgLeft);
        //             let x = e.clientX - svgLeft;
        //             return move.pipe(
        //                 map<MouseEvent<Document>, SVGRectUtil>((mm: MouseEvent<Document>) => {
        //                     const deltaX = mm.clientX - x;
        //                     x = mm.clientX;
        //                     if (rightSide) {
        //                         rect.changeRight(deltaX);
        //                     } else {
        //                         rect.changeLeft(deltaX);
        //                     }
        //                     return rect;
        //                 }),
        //                 takeUntil(up)
        //             );
        //         }),
        //         sample(up))
        //     .subscribe((rect: SVGRectUtil) => {
        //         this.editRanges(rect);
        //     });
    }

    private insertNewRange (ranges: LabeledRange[], range: LabeledRange) {
        //closest left range
        const closest = this.findClosest(range.start, ranges);
        const i = closest && ranges.indexOf(closest);
        const next = closest && ranges[i + 1];
        if (!closest || !next) {
            ranges.push(range);
            this.props.onChangeRanges([range]);
            return;
        }
        const updated = [];

        // before closest
        if (closest.start > range.end) {
            ranges.unshift(range);
            this.props.onChangeRanges([range]);
        }
        // split closest range
        else if (closest.start < range.start && range.end < closest.end) {
            // clone closest as tail
            const tail = {...closest};

            // set closest end to new range start
            closest.end = range.start;
            updated.push(closest);

            // set tail end to new range start
            tail.start = range.end;

            if (range.end - range.start > 0) {
                //split ranges on closest index and insert new range and tail
                ranges.splice(i + 1, 0, range, tail);
                updated.push(range);
            } else {
                //split ranges on closest index and insert tail
                ranges.splice(i + 1, 0, tail);
            }

            updated.push(tail);
            console.log(closest, range, tail, i);
        }
        //insert range after closest in the gap between two ranges
        else if (next && range.start > closest.end && range.end < next.start) {
            // split ranges on closest index and insert new range
            ranges.splice(i + 1, 0, range);
            updated.push(range);
        }
        // overlap with next ranges
        else if (next && range.end > next.start) {
            //closest right range
            const nextClosest = this.findClosest(range.end, ranges);
            const j = ranges.indexOf(nextClosest);
            const tail = {...nextClosest};
            tail.start = range.end;

            // overlap left closest
            if (range.start < closest.end) {
                closest.end = range.start;
            }

            //split ranges on closest index, delete overlapped and insert new range and tail
            const deleted = ranges.splice(i + 1, j - i, range, tail);

            this.props.onDeleteRanges(deleted);
            updated.push(closest, range, tail);
        }
        this.props.onChangeRanges(updated);
    }

    private deleteActiveRange () {
        let {activeRangeIndex : i} = this.state;
        if (i >= 0) {
            const ranges = [...this.state.ranges];
            const deleted = ranges.splice(i, 1);
            this.props.onDeleteRanges(deleted);
            this.setState({ranges, activeRangeIndex : -1});
        }
    }

    private findClosest (x: number, ranges: LabeledRange[]): LabeledRange {
        if (ranges.length == 0) {
            return;
        }
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
        // let i = this.state.activeRangeIndex;
        // if (i < 0) {
        //     return;
        // }
        // const ranges = [...this.state.ranges];
        // const width = Math.round(this.pxToRUnit(rect.width));
        // if (width <= 0) {
        //     const deleted = ranges.splice(i, 1);
        //     i = -1;
        //     this.props.onDeleteRanges(deleted);
        // } else {
        //     const deleted = [];
        //     const range = ranges[i];
        //     const start = Math.round(this.pxToRUnit(rect.x));
        //     if (range.start != start) {
        //         const head = {...range};
        //         head.end = start;
        //         deleted.push(head);
        //     }
        //     const end = start + width;
        //     if (range.end != end) {
        //         const tail = {...range};
        //         tail.start = end;
        //         deleted.push(tail);
        //     }
        //     range.start = start;
        //     range.end = end;
        //     if (deleted.length) {
        //         this.props.onDeleteRanges(deleted);
        //     }
        //     this.props.onChangeRanges([range]);
        // }
        // this.setState({ranges, activeRangeIndex : i});
    }

    // private pxToRUnit (px: number) {
    //     return px / (this.unit * this._width);
    // }
    //
    // private unitsToPx (units: number) {
    //     return units * this.unit * this._width
    // }

    svgClick = (e: MouseEvent<SVGSVGElement>) => {
        // let x = e.nativeEvent.offsetX;
        // if (this.rangesRef.current) {
        //     const t = this.rangesRef.current.getCTM();
        //     const p1 = this.svgRef.current.createSVGPoint();
        //     p1.x = x;
        //     x = convertPoint(p1, t).x;
        // }
        // this.setState({activeRangeIndex : -1});
    };

    render () {
        return (
            <svg width="100%" height="150" x={0}
                 preserveAspectRatio="none meet"
                 ref={this.svgRef}
                 onMouseDownCapture={this.svgClick}
            >
                <g>
                    <rect x={0} y={0} width="100%" height="150" fill={"grey"}/>
                </g>
                {this.renderRanges()}

            </svg>);
    }

    private renderRanges () {
        return this.state.ranges.map((range, i) => {
            const {start, end, label} = range;
            return (<rect x={`${start / this.props.end * 100}%`}
                          y="20"
                          width={`${(end - start) / this.props.end * 100}%`}
                          height="100"
                          fill={this.getColor(range, i)}
                          key={`${start}-${end}-${label}`}
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
        return defaultColors[+range.label];
    }

}
