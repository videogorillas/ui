package com.vg.ui.components;


import static org.stjs.bridge.react.React.DOM.div;
import static org.stjs.bridge.react.React.DOM.rect;
import static org.stjs.bridge.react.React.DOM.svg;
import static org.stjs.javascript.Global.window;
import static org.stjs.javascript.JSCollections.$map;

import org.stjs.bridge.react.Component;
import org.stjs.bridge.react.internal.Event;
import org.stjs.bridge.react.internal.ReactElement;
import org.stjs.javascript.Array;
import org.stjs.javascript.Map;
import org.stjs.javascript.dom.Element;
import org.stjs.javascript.functions.Callback1;

import com.vg.js.bridge.Rx;
import com.vg.js.bridge.Rx.Disposable;
import com.vg.ui.model.Range;

public class RangesComponent extends Component<RangesComponent.Props, RangesComponent.State> {

    private Disposable subscription;
    private Element rangeEl;

    public RangesComponent(Props props) {
        super(props);
        State state = new State();
        state.zoom = 1;
        state.pos = 0;
        this.state = state;
    }

    @Override
    public void componentDidMount(Element element) {
        this.subscription = Rx.Observable.fromEvent(window, "keydown").filter(e -> this.rangeEl != null).subscribe(e -> {
            int zoom = this.state.zoom;
            int pos = this.state.pos;
            State s = new State();
            //TODO: make this independent from the #redthing
            int left = 0;
            Element thing = window.document.getElementById("redthing");
            if (thing != null) {
                left = thing.offsetLeft;
            }

            int elWidth = this.rangeEl.clientWidth;
            int maxZoom = this.props.framesTotal * 10 / elWidth;
            switch (e.keyCode) {
            case 38:
            case 58:
                if (maxZoom >= 1) {
                    pos = pos - left;
                    zoom = zoom * 2;
                }
                s.zoom = zoom;
                s.pos = Math.min(0, pos);
                this.setState(s);
                break;
            case 40:
            case 50:
                zoom = Math.max(1, zoom / 2);
                int parentWidth = this.rangeEl.parentElement.clientWidth;
                pos = Math.max(pos + left / 2, parentWidth - elWidth);
                s.zoom = zoom;
                s.pos = Math.min(0, pos);
                this.setState(s);
                break;
            }
        });
    }

    @Override
    public void componentWillUnmount() {
        this.subscription.dispose();
    }

    public static class State {
        public int pos;
        public int zoom;
    }

    public static class Props extends com.vg.rt.Props {

        public Callback1<Integer> onClick;
        public Array<Range> ranges;
        public int framesTotal;

        public Props(String key) {
            super(key);
        }

    }

    @Override
    public ReactElement<?> render() {
        Callback1<Event> onClick = (e) -> {
            double framesPerPixel = (double) this.props.framesTotal / e.currentTarget.clientWidth;
            int x = Math.abs(this.state.pos) + e.clientX;
            double frame = x * framesPerPixel;
            int fn = (int) frame | 0;
            this.props.onClick.$invoke(fn);
        };
        double w = 100.0 * this.state.zoom;
        Map<String, Object> style = $map("width", w
                + "%", "height", "15px", "position", "relative", "transform", "translateX(" + this.state.pos + "px)");
        Callback1<Element> ref = (el) -> {
            this.rangeEl = el;
        };
        Map<String, Object> attrs = $map("className", "vstatus__ranges", "onClick", onClick, "style", style, "ref", ref);
        ReactElement<?> redthing = div($map("className", "vstatus__redthing", "id", "redthing"));
        ReactElement<?> current = div($map("className", "vstatus__current_moment"));
        return div(attrs, redthing, current, this.renderSvg());
    }

    private Object renderSvg() {
        Map<String, Object> attrs = $map("width", "100%", "height", "100%");
        return svg(attrs, this.renderRanges());
    }

    private Object renderRanges() {
        return this.props.ranges.map((range, i, a) -> {
            double width = range.width;
            double left = range.start * 100.0 / this.props.framesTotal;
            String fill = range.status == null ? "#777C88" : "#F78870";
            Map<String, Object> style = $map("fill", fill, "stroke", fill, "strokeWidth", 1);
            Map<String, Object> attrs = $map("key", "range-" + i, "x", left + "%", "y", 0, "width", width + "%",
                    "height", "100%", "style", style);
            return rect(attrs);
        });
    }
}
