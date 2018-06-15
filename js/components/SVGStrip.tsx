import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {convertPoint} from "../utils/SvgUtils";
import {MouseEvent} from "react";
import {fromEvent} from "rxjs";

interface StripState {
    markers: LabeledRange[];
    inOutMarkers: { in?: LabeledRange, out?: LabeledRange };
    zoom: number;
}

interface StripProps {
    pointer: number;

    onClick (frame: number): void;

    onMark (marker: LabeledRange): void;
}

export default class SVGStrip extends React.Component<StripProps, StripState> {

    state: StripState = {
        markers : [],
        inOutMarkers : {},
        zoom : 1
    };
    private innerG: React.RefObject<any> = React.createRef();
    private outSvg: React.RefObject<SVGSVGElement> = React.createRef();


    componentDidMount () {
        this.outSvg.current
        const kdown = fromEvent<MouseEvent<Document>>(document, 'keydown');
        kdown.subscribe((e: KeyboardEvent) => {
            const {pointer} = this.props;
            const {markers, inOutMarkers} = this.state;
            const w = this.outSvg.current.width.baseVal.value;
            const mark = {start : pointer, end : pointer + 1 / w, label : e.key};
            switch (e.code) {
                case "KeyI":
                    inOutMarkers.in = mark;
                    break;
                case "KeyO":
                    inOutMarkers.out = mark;
                    break;
                // case "Digit1":
                // case "Digit2":
                // case "Digit3":
                // case "Digit4":
                // case "Digit5":
                // case "Digit6":
                // case "Digit7":
                // case "Digit8":
                // case "Digit9":
                // case "Digit0":
                //     markers.push({start : pointer, end : pointer + 1, label : e.key});
                //     newState.markers = markers;
                //     break;
            }
            console.log(inOutMarkers);
            if (inOutMarkers.in && inOutMarkers.out) {
                const start = Math.min(this.state.inOutMarkers.in.start, this.state.inOutMarkers.out.start);
                const end = Math.max(this.state.inOutMarkers.in.end, this.state.inOutMarkers.out.end);
                this.props.onMark({start, end, label : "mark"});
                this.setState({inOutMarkers : {}});
            } else {
                this.setState({inOutMarkers});
            }
        });
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

    get _translateX () {
        const zoom = this.state.zoom;
        if (this.outSvg.current && zoom > 1) {
            const w = this.outSvg.current.clientWidth;//window
            const scaledW = w * zoom;
            const T = this.innerG.current.getCTM(); //transformation matrix
            const cur_trx = -T.e;
            const t1 = Math.max(0, cur_trx / scaledW);
            const t2 = Math.min(1, (cur_trx + w) / scaledW);
            const videoPos = this.props.pointer;
            let new_trx = 0;
            if (videoPos < t1 + 0.1 / zoom) // move to the left of current window
                new_trx = w * Math.max(videoPos * zoom - 0.1, 0);
            else if (videoPos > t2 - 0.1 / zoom) // move to the right of current window
                new_trx = w * Math.min(videoPos * zoom - 0.9, zoom - 1);
            else
                new_trx = cur_trx;
            return -new_trx;
        }

        return 0;
    }

    render () {
        const {zoom} = this.state;
        return <div>
            <input type="range" onChange={e => this.setState({zoom : +e.target.value})} value={zoom} min={1}
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

    private renderPointer (): any {
        return (
            <g>
                <rect x={`${this.props.pointer * 100}%`}
                      y="20"
                      width={1}
                      height="100"
                      style={{fill : "red"}}
                      id="pointer"
                />
            </g>
        );
    }


    private renderMarkers (): any {
        let {markers, inOutMarkers} = this.state;
        return markers.concat(Object.values(inOutMarkers)).map((marker, i) => {
            const {start, end, label} = marker;
            const k = `${start}-${end}-${label}`;
            return (<g key={`marker-${k}`}>
                <text
                    x={`${start * 100}%`}
                    y="18"
                    stroke="none"
                    fill="black">
                    {marker.label}
                </text>
                <rect x={`${start * 100}%`}
                      y="20"
                      width={`${(end - start) * 100}%`}
                      height="100"
                      fill="yellow"
                />
            </g>)
        });
    }
}