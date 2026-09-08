/**
 * Global DOM polyfills required by pdf-parse (pdf.js) in Node.js environments.
 * This file MUST be the first import in the application entrypoint so that
 * the globals are set before pdf.js initializes during module resolution.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;

if (typeof g.DOMMatrix === 'undefined') {
  g.DOMMatrix = class DOMMatrix {
    constructor(_init?: string | number[]) {}
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true; isIdentity = true;
    multiply(_other: any) { return new g.DOMMatrix(); }
    translate(_tx?: number, _ty?: number, _tz?: number) { return new g.DOMMatrix(); }
    scale(_sx?: number, _sy?: number, _sz?: number) { return new g.DOMMatrix(); }
    rotate(_rx?: number, _ry?: number, _rz?: number) { return new g.DOMMatrix(); }
    inverse() { return new g.DOMMatrix(); }
    transformPoint(_point?: any) { return { x: 0, y: 0, z: 0, w: 1 }; }
    toFloat32Array() { return new Float32Array(16); }
    toFloat64Array() { return new Float64Array(16); }
    static fromArray(_arr: number[]) { return new g.DOMMatrix(); }
    static fromMatrix(_other?: any) { return new g.DOMMatrix(); }
  };
}

if (typeof g.DOMPoint === 'undefined') {
  g.DOMPoint = class DOMPoint {
    constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}
    matrixTransform(_matrix?: any) { return new g.DOMPoint(); }
    toJSON() { return { x: this.x, y: this.y, z: this.z, w: this.w }; }
    static fromPoint(_point?: any) { return new g.DOMPoint(); }
  };
}

if (typeof g.DOMRect === 'undefined') {
  g.DOMRect = class DOMRect {
    constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
    get top() { return this.y; }
    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get bottom() { return this.y + this.height; }
    static fromRect(_other?: any) { return new g.DOMRect(); }
    toJSON() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
  };
}

if (typeof g.Path2D === 'undefined') {
  g.Path2D = class Path2D {
    constructor(_path?: any) {}
    addPath(_path?: any, _transform?: any) {}
    closePath() {}
    moveTo(_x: number, _y: number) {}
    lineTo(_x: number, _y: number) {}
    bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, _x: number, _y: number) {}
    arc(_x: number, _y: number, _r: number, _s: number, _e: number, _ccw?: boolean) {}
    rect(_x: number, _y: number, _w: number, _h: number) {}
  };
}
