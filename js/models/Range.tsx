interface Range {
    start: number;
    end: number;
}

export interface LabeledRange extends Range {
    label: string;
}