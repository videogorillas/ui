import * as React from "react";
import {fetchCsv} from "../utils/FetchUtils";
import {ChangeEvent} from "react";

interface CSVProps {
    onSelect (csvLine: string[]): void;

    csvUrl?: string;
}

interface CSVState {
    csv?: string[][];
    n?: number;
}

export default class CSVSelect extends React.Component<CSVProps, CSVState> {

    constructor (props: CSVProps) {
        super(props);
        if (props.csvUrl) {
            this.fetchCsv(props.csvUrl);
        }
        this.state = {
            n : -1
        }
    }

    componentWillReceiveProps (next: CSVProps) {
        if (next.csvUrl != this.props.csvUrl) {
            this.fetchCsv(next.csvUrl);
        }
    }

    private onSelect = (e: ChangeEvent<HTMLSelectElement>) => {
        const n = +e.target.value;
        this.setState({n});
        const csvLine = this.state.csv[n];
        this.props.onSelect(csvLine);
    };

    private async fetchCsv (csvUrl: string) {
        const csv = await fetchCsv(csvUrl);
        this.setState({csv});
    }

    render () {

        const {csv, n} = this.state;
        if (!csv) {
            return null;
        }
        return (
            <select value={n} onChange={this.onSelect}>
                <option disabled value={-1}>Select video url</option>
                {csv.map((line, i) => {
                    return <option key={line[0] + i} value={i}>{line[0]}</option>
                })}
            </select>);
    }
}