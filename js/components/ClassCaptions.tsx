import * as React from 'react';
import {fromEvent} from "rxjs";
import {flatMap, map, takeUntil} from "rxjs/operators";

interface CaptionsProps {
    current: string;
}

interface CaptionsState {
}

export default class ClassCaptions extends React.Component<CaptionsProps, CaptionsState> {

    private captRef = (el) => {
        this.el = el;
    };
    private el: HTMLElement;

    componentDidMount () {
        const video = document.querySelector('video');
        if (video) {
            const {left, width, bottom} = video.getBoundingClientRect();
            this.el.style.top = `${bottom + 10}px`;
            this.el.style.left = `${left + width / 2}px`;
        }

        const move = fromEvent<MouseEvent>(document, 'mousemove');
        const up = fromEvent(document, 'mouseup');
        fromEvent(this.el, 'mousedown')
            .pipe(flatMap((e: MouseEvent) => {
                const start = {x : e.clientX, y : e.clientY};
                return move.pipe(
                    map<MouseEvent, any>((mm: MouseEvent) => {
                        const deltaX = mm.clientX - start.x;
                        const deltaY = mm.clientY - start.y;
                        start.x = mm.clientX;
                        start.y = mm.clientY;
                        return {x : deltaX, y : deltaY};
                    }),
                    takeUntil(up)
                );
            }))
            .subscribe((coords: { x: number, y: number }) => {
                const rect = this.el.getBoundingClientRect();
                this.el.style.top = `${rect.top + coords.y}px`;
                this.el.style.left = `${rect.left + coords.x}px`;
            });
    }

    render () {
        const {current} = this.props;
        return (
            <div ref={this.captRef} style={{
                position : 'absolute',
                top : '0',
                left : '0',
                padding : '10px',
                background : 'rgba(0,0,0,0.5)',
                color : 'white',
                zIndex : 999
            }}>
                {current}
            </div>);
    }

}