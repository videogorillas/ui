import * as React from "react";

interface PlayerProps {
    url: string;
    frame: number;

    onLoad (timeline: { getFrameCount (): number }): void;

    onTimeUpdate (ts: { frame: number }): void;
}

interface PlayerState {
}

export default class Player extends React.Component<PlayerProps, PlayerState> {
    private player: VG.Player;
    private frame: number;

    private setupPlayer = (el: HTMLElement) => {
        if (el && !this.player) {
            const playerConfig = {
                hotkeys : true,
                playlist : false,
                search : false,
                theme : 'vg',
                plugins : ['filmstrip']
            };
            this.player = new VG.Player(el, playerConfig);

            if (this.props.url) {
                this.loadUrl(this.props.url);
            }
        }
    };

    componentWillReceiveProps (next: PlayerProps) {
        const {url} = this.props;
        if (next.url != url) {
            this.loadUrl(next.url);
        }
        if (this.player && next.frame != this.frame) {
            this.player.seekFrame(next.frame);
        }
    }

    private onTimeUpdate = (ts: { frame: number }) => {
        this.frame = ts.frame;
        this.props.onTimeUpdate(ts);
    };

    private loadUrl (url: string) {
        const player = this.player;
        this.player = null;
        player.loadUrl(url, (err: Error) => {
            if (err) {
                throw err;
            }
            player.addEventListener("timeupdate", this.onTimeUpdate);
            const timeline = player.getTimeline();
            this.player = player;
            this.props.onLoad(timeline);
        });

    }

    render () {
        return (
            <div ref={this.setupPlayer}>

            </div>)
    }
}