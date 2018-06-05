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
        return this.svg ? this.svg.width.baseVal.value : 0;
    }

    set _width (w: number) {
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
        const dx = Math.max(deltaX, (this.width) * -1);
        this._width = this.width + dx;
        // const next = this.next;
        // if (next && this.right > next.x) {
        //     next.changeLeft(deltaX);
        // }
    }

    changeLeft (deltaX: number): void {
        const dX = Math.min(this.width, Math.max(deltaX, this.width * -1));
        this.x += dX;
        this._width = this.width - dX;
        // const prev = this.prev;
        // if (prev && this.x < prev.right) {
        //     prev.changeRight(deltaX);
        // }
    }
}

export function rectUtil (svg: SVGRectElement): SVGRectUtil {
    if (!svg) {
        return null;
    }
    return new SVGRectUtils(svg);
}