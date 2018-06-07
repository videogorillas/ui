export interface SVGRectUtil {
    width: number;
    x: number;
    right: number;
    next: SVGRectUtil;
    prev: SVGRectUtil;

    isLeft (x: number): boolean;

    isRight (x: number): boolean;

    changeLeft (withX: number): void;

    changeRight (withX: number): void;
}

class SVGRectUtils implements SVGRectUtil {
    constructor (private svg: SVGRectElement) {
    }

    get width () {
        return this.svg && this.svg.width ? this.svg.width.baseVal.value : 0;
    }

    set _width (w: number) {
        if (w > 0) {
            this.svg.setAttribute("width", `${w}`);
        }
    }

    get x () {
        return this.svg && this.svg.x ? this.svg.x.baseVal.value : 0;
    }

    set x (x: number) {
        this.svg.setAttribute("x", `${x}`);
    }

    get right () {
        return this.x + this.width;
    }

    get next (): SVGRectUtil {
        return rectUtil(<SVGRectElement>this.svg.nextElementSibling);
    }

    get prev (): SVGRectUtil {
        return rectUtil(<SVGRectElement>this.svg.previousElementSibling);
    }

    get half () {
        return this.x + this.width / 2;
    }

    isLeft (x: number): boolean {
        return this.x < x && x < this.half;
    }

    isRight (x: number): boolean {
        return x >= this.half && x < this.right;
    }

    changeRight (deltaX: number): void {
        let dx = Math.max(deltaX, (this.width) * -1);
        const next = this.next;
        if (next) {
            dx = Math.min(dx, next.x - this.right);
        }
        this._width = this.width + dx;
    }

    changeLeft (deltaX: number): void {
        let dx = Math.min(this.width, Math.max(deltaX, this.width * -1));
        const prev = this.prev;
        if (prev) {
            dx = Math.max(dx, prev.right - this.x);
        }
        this.x += dx;
        this._width = this.width - dx;
    }
}

export function rectUtil (svg: SVGRectElement): SVGRectUtil {
    if (!svg || !(svg instanceof SVGRectElement)) {
        return null;
    }
    return new SVGRectUtils(svg);
}