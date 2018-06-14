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
        zoom: 2
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
        const zoom = this.state.zoom;

        if (this.outSvg.current && zoom > 1) {
            const w = this.outSvg.current.clientWidth;//window
            const cur_trx = -this.innerG.current.transform.animVal[0].matrix.e;
            const max_tr_x = w * (zoom - 1);
            // console.log('tr_x max_tr_x', Math.round(cur_trx), max_tr_x);
            const t1 = Math.max(0, cur_trx / w / zoom);
            const t2 = Math.min(1, (cur_trx + w) / w / zoom);
            // console.log('t1 t2', t1, t2);
            const videoPos = this.props.pointer / 100;
            // console.log('videopos', videoPos);
            let new_trx = 0;
            if (videoPos < t1 + 0.1 / zoom) // move to the left of current window
                if (videoPos < 0.1 / zoom) {
                    new_trx = 0;
                } else {
                    new_trx = (videoPos * zoom - 0.1) * w;
                }
            else if (videoPos > t2 - 0.1 / zoom) // move to the right of current window
                if (videoPos > 1 - 0.1 / zoom) {
                    new_trx = max_tr_x;
                } else {
                    new_trx = (videoPos * zoom - 0.9) * w;
                }

            else
                new_trx = cur_trx;
            return -new_trx;
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
        const videoPos = this.props.pointer / 100;
        return (
            <g>
                <rect x={`${this.props.pointer}%`}
                      y="20"
                      width={1}
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