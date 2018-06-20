import * as React from 'react';
import {LabeledRange} from "../models/Range";
import {convertPoint} from "../utils/SvgUtils";
import {MouseEvent} from "react";
import {fromEvent} from "rxjs";

interface StripState {
    markers: LabeledRange[];
    inOutMarkers: LabeledRange[];
    zoom: number;
}

interface StripProps {
    pointer: number;

    onClick (frame: number): void;

    onMark (markers: LabeledRange[]): void;
}

export default class SVGStrip extends React.Component<StripProps, StripState> {

    state: StripState = {
        markers : [],
        inOutMarkers : [],
        zoom : 1
    };
    private innerG: React.RefObject<any> = React.createRef();
    private outSvg: React.RefObject<SVGSVGElement> = React.createRef();


    componentDidMount () {
        const kdown = fromEvent<MouseEvent<Document>>(document, 'keydown');
        kdown.subscribe((e: KeyboardEvent) => {
            const {pointer} = this.props;
            const {markers, inOutMarkers, zoom} = this.state;
            const w = this.outSvg.current.width.baseVal.value;
            const mark = {start : pointer, end : pointer + 1 / w, label : e.key};
            switch (e.code) {
                case "KeyI":
                    inOutMarkers[0] = mark;
                    this.mark(inOutMarkers);
                    break;
                case "KeyO":
                    inOutMarkers[1] = mark;
                    this.mark(inOutMarkers);
                    break;
                case "Equal":
                    this.setState({zoom : Math.min(zoom + 1, 10)});
                    return;
                case "Minus":
                    this.setState({zoom : Math.max(zoom - 1, 1)});
                    return;
                case "Escape":
                    this.setState({inOutMarkers : []});
                    return;
            }
        });
    }


    private mark (inOutMarkers: LabeledRange[]) {
        this.props.onMark(inOutMarkers.filter(x => !!x));
        if (inOutMarkers[0] && inOutMarkers[1]) {
            this.setState({inOutMarkers : []});
        } else {
            this.setState({inOutMarkers});
        }
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
            <div>zoom <input type="range" onChange={e => this.setState({zoom : +e.target.value})} value={zoom} min={1}
                             max={10}
                             step={0.5}/>
            </div>
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
        let {markers, inOutMarkers, zoom} = this.state;
        return markers.concat(Object.values(inOutMarkers)).map((marker, i) => {
            const {start, end, label} = marker;
            const k = `${start}-${end}-${label}`;
            return (<g key={`marker-${k}`}>
                <text
                    x={`${start * zoom * 100}%`}
                    y="18"
                    stroke="none"
                    fill="black">
                    {marker.label}
                </text>
                <rect x={`${start * zoom * 100}%`}
                      y="20"
                      width={`${(end - start) * zoom * 100}%`}
                      height="100"
                      fill="yellow"
                />
            </g>)
        });
    }
}