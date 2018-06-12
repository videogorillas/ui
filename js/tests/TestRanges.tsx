import * as React from 'react';
import {render} from 'react-dom';
import Ranges from "../components/Ranges";

const ranges = [{"start" : 0, "end" : 53, "label" : "1"}, {"start" : 53, "end" : 55, "label" : "0"}, {
    "start" : 55,
    "end" : 69,
    "label" : "1"
}, {"start" : 69, "end" : 75, "label" : "0"}, {"start" : 75, "end" : 84, "label" : "1"}, {
    "start" : 84,
    "end" : 85,
    "label" : "0"
}, {"start" : 85, "end" : 91, "label" : "1"}, {"start" : 91, "end" : 95, "label" : "0"}, {
    "start" : 95,
    "end" : 99,
    "label" : "1"
}, {"start" : 99, "end" : 100, "label" : "0"}, {"start" : 100, "end" : 104, "label" : "1"}, {
    "start" : 104,
    "end" : 107,
    "label" : "0"
}, {"start" : 107, "end" : 113, "label" : "1"}, {"start" : 113, "end" : 115, "label" : "0"}, {
    "start" : 115,
    "end" : 158,
    "label" : "1"
}];

render(
    <div>
        <Ranges ranges={ranges} end={200} onClick={(frame) => console.log(frame)} pointer={42}/>
    </div>,
    document.getElementById('root'),
);