export interface SVGRectUtil {
    width: number;
    x: number;
    right: number;
    next: SVGRectUtil;
    prev: SVGRectUtil;
}

class SVGRectUtils implements SVGRectUtil {
    constructor (private svg: SVGRectElement) {
    }

    get width () {
        return this.svg ? this.svg.width.baseVal.value : 0;
    }

    set width (w: number) {
        if (w <= 0) {
            this.svg.remove();
        }
        this.svg.setAttribute("width", `${w}`);
    }

    get x () {
        return this.svg ? this.svg.x.baseVal.value : 0;
    }

    set x (x: number) {
        this.svg.setAttribute("x", `${x}`);
    }

    get right () {
        return this.x + this.width;
    }

    get next (): SVGRectUtil {
        return rect(<SVGRectElement>this.svg.nextElementSibling);
    }

    get prev (): SVGRectUtil {
        return rect(<SVGRectElement>this.svg.previousElementSibling);
    }
}

export function rect (svg: SVGRectElement): SVGRectUtil {
    if (!svg) {
        return null;
    }
    return new SVGRectUtils(svg);
}