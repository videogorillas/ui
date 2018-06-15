import * as React from 'react';
import {LabeledRange} from "../models/Range";

interface RangesProps {
    ranges: LabeledRange[];
    colorMap?: { [label: string]: string };
    start?: number;
    end: number;
    selectedIndex: number;

    onRangeSelectedIndex (i: number): void;
}

const defaultColors = ["rgb(0,0,255)", "rgb(0,255,0)", "rgb(0,255,255)"];

interface RangesState {
}

export default class Ranges extends React.Component<RangesProps, RangesState> {

    static defaultProps = {
        start : 0,
        end : 100
    };
    private svgRef: React.RefObject<any> = React.createRef();

    get unit () {
        return 1 / this.props.end;
    }

    render () {
        return (
            <svg width="100%" height="150" x={0}
                 preserveAspectRatio="none meet"
                 ref={this.svgRef}
            >
                <g>
                    <rect x={0} y={0} width="100%" height="150" fill={"grey"}/>
                </g>
                {this.renderRanges()}

            </svg>);
    }

    private renderRanges () {
        return this.props.ranges.map((range, i) => {
            const {start, end, label} = range;
            return (<rect x={`${start / this.props.end * 100}%`}
                          y="20"
                          width={`${(end - start) / this.props.end * 100}%`}
                          height="100"
                          fill={this.getColor(range, i)}
                          key={`${start}-${end}-${label}`}
                          onMouseDown={this.activateRange.bind(this, i)}
            >{start}-{end}-{label}</rect>)
        });
    }

    private activateRange (i: number) {
        this.setState({activeRangeIndex : i});
        this.props.onRangeSelectedIndex(i);
    }

    private getColor (range: LabeledRange, i: number): string {
        if (i == this.props.selectedIndex) {
            return "rgb(250,155,0)";
        }
        return defaultColors[+range.label];
    }

}
