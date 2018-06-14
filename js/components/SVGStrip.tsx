import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {convertPoint} from "../utils/SvgUtils";
import {MouseEvent} from "react";

interface StripState {
    markers: LabeledRange[];
    inOutMarkers: LabeledRange[];
    zoom: number;
}

interface StripProps {
    pointer: number;

    onClick (frame: number): void;
}

export default class SVGStrip extends React.Component<StripProps, StripState> {

    state: StripState = {
        markers: [],
        inOutMarkers: [],
        zoom: 1
    };
    private deltaX = 0;
    private innerG: React.RefObject<any> = React.createRef();


    componentWillReceiveProps(next: StripProps) {
        this.deltaX += this.props.pointer - next.pointer;
    }

    private outSvg: React.RefObject<any> = React.createRef();

    private markIn(x: number, r: LabeledRange) {
        let {start, end} = r;
        if (start < x && x < end) {
            const head = {...r};
            head.end = x;
            r.start = x;
            // // TODO: pass to?
            // this.props.onDeleteRanges([head]);
            // this.props.onChangeRanges([r]);
        }
    }

    private markOut(x: number, r: LabeledRange) {
        let {start, end} = r;
        if (start < x && x < end) {
            const tail = {...r};
            tail.start = x;
            r.end = x;
            // TODO: pass to?
            // this.props.onDeleteRanges([tail]);
            // this.props.onChangeRanges([r]);
        }
    }

    private inOutPoints(x1: number, x2: number) {
        return {start: Math.min(x1, x2), end: Math.max(x1, x2)};
    }

    private svgClick = (e: MouseEvent<SVGGElement>) => {
        let offsetX = e.nativeEvent.offsetX;
        let g = e.currentTarget;
        const t = g.getCTM();
        const p1 = this.outSvg.current.createSVGPoint();
        p1.x = offsetX;
        const x = convertPoint(p1, t).x;
        const xRatio = x / g.getBBox().width;
        this.props.onClick(xRatio);
    };

    get _translateX() {
        // 1. pointer in % to unscaled width
        // 2. translate to pointer position
        console.log(this.props.pointer/100);
        if (this.outSvg.current && this.state.zoom > 1) {
            const w = this.outSvg.current.clientWidth;//window
            const p = -this.props.pointer * this.state.zoom;
            const curX = this.innerG.current.transform.animVal[0].matrix.e;
            // console.log(curX);
            console.log(this.deltaX, this.props.pointer);
            return w * p / 100;
        }
        return 0;
    }

    render() {
        const {zoom} = this.state;
        return <div>
            <input type="range" onChange={e => this.setState({zoom: +e.target.value})} value={zoom} min={1}
                   max={10}
                   step={0.5}/>
            <svg width="100%" height="150" ref={this.outSvg}>
                <g transform={`matrix(${zoom} 0 0 1 ${this._translateX} 0)`}
                   onMouseDown={this.svgClick} ref={this.innerG}>
                    <rect x={0} width={"100%"}/>
                    {this.props.children}
                    {this.renderPointer()}
                </g>
                {this.renderMarkers()}
            </svg>
        </div>;
    }

    private renderPointer(): any {
        // this.props.pointer
        return (
            <g>
                <rect x={`${this.props.pointer}%`}
                      y="20"
                      width={2}
                      height="100"
                      style={{fill: "red"}}
                />
            </g>
        );
    }


    private renderMarkers(): any {
        let {markers, inOutMarkers} = this.state;
        return markers.concat(inOutMarkers).map((marker, i) => {
            const {start, end, label} = marker;
            const k = `${start}-${end}-${label}`;
            return (<g key={`marker-${k}`}>
                <text
                    x={start}
                    y="18"
                    stroke="none"
                    fill="black">
                    {marker.label}
                </text>
                <rect x={start}
                      y="20"
                      width={Math.max(2, end - start)}
                      height="100"
                      fill="yellow"
                />
            </g>)
        });
    }
}