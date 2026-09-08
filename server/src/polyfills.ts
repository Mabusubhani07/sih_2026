/**
 * Global DOM polyfills required by PDF and OCR parsing in Node.js / Serverless runtimes.
 * Ensures DOMMatrix, DOMMatrixReadOnly, DOMPoint, DOMPointReadOnly, DOMRect, DOMRectReadOnly,
 * and Path2D are available on globalThis, global, window, and self before any parser initializes.
 */

export class DOMMatrix {
  a: number = 1;
  b: number = 0;
  c: number = 0;
  d: number = 1;
  e: number = 0;
  f: number = 0;

  m11: number = 1;
  m12: number = 0;
  m13: number = 0;
  m14: number = 0;

  m21: number = 0;
  m22: number = 1;
  m23: number = 0;
  m24: number = 0;

  m31: number = 0;
  m32: number = 0;
  m33: number = 1;
  m34: number = 0;

  m41: number = 0;
  m42: number = 0;
  m43: number = 0;
  m44: number = 1;

  is2D: boolean = true;
  isIdentity: boolean = true;

  constructor(init?: string | number[] | Float32Array | Float64Array) {
    if (Array.isArray(init) || (init && typeof (init as any).length === 'number')) {
      const arr = init as number[];
      if (arr.length === 6) {
        this.a = this.m11 = arr[0];
        this.b = this.m12 = arr[1];
        this.c = this.m21 = arr[2];
        this.d = this.m22 = arr[3];
        this.e = this.m41 = arr[4];
        this.f = this.m42 = arr[5];
        this.is2D = true;
      } else if (arr.length === 16) {
        this.m11 = this.a = arr[0];
        this.m12 = this.b = arr[1];
        this.m13 = arr[2];
        this.m14 = arr[3];

        this.m21 = this.c = arr[4];
        this.m22 = this.d = arr[5];
        this.m23 = arr[6];
        this.m24 = arr[7];

        this.m31 = arr[8];
        this.m32 = arr[9];
        this.m33 = arr[10];
        this.m34 = arr[11];

        this.m41 = this.e = arr[12];
        this.m42 = this.f = arr[13];
        this.m43 = arr[14];
        this.m44 = arr[15];
        this.is2D = false;
      }
    }
    this.updateIdentity();
  }

  private updateIdentity() {
    this.isIdentity =
      this.m11 === 1 && this.m12 === 0 && this.m13 === 0 && this.m14 === 0 &&
      this.m21 === 0 && this.m22 === 1 && this.m23 === 0 && this.m24 === 0 &&
      this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0 &&
      this.m41 === 0 && this.m42 === 0 && this.m43 === 0 && this.m44 === 1;
  }

  multiply(other: DOMMatrix): DOMMatrix {
    return new DOMMatrix([
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.e + this.c * other.f + this.e,
      this.b * other.e + this.d * other.f + this.f,
    ]);
  }

  translate(tx: number = 0, ty: number = 0, _tz: number = 0): DOMMatrix {
    const copy = new DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
    copy.e += tx * this.a + ty * this.c;
    copy.f += tx * this.b + ty * this.d;
    copy.m41 = copy.e;
    copy.m42 = copy.f;
    copy.updateIdentity();
    return copy;
  }

  scale(scaleX: number = 1, scaleY: number = scaleX, _scaleZ: number = 1): DOMMatrix {
    const copy = new DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
    copy.a *= scaleX;
    copy.b *= scaleX;
    copy.m11 = copy.a;
    copy.m12 = copy.b;
    copy.c *= scaleY;
    copy.d *= scaleY;
    copy.m21 = copy.c;
    copy.m22 = copy.d;
    copy.updateIdentity();
    return copy;
  }

  rotate(angle: number): DOMMatrix {
    const copy = new DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    copy.a = this.a * cos + this.c * sin;
    copy.b = this.b * cos + this.d * sin;
    copy.c = this.a * -sin + this.c * cos;
    copy.d = this.b * -sin + this.d * cos;
    copy.m11 = copy.a;
    copy.m12 = copy.b;
    copy.m21 = copy.c;
    copy.m22 = copy.d;
    copy.updateIdentity();
    return copy;
  }

  inverse(): DOMMatrix {
    const det = this.a * this.d - this.b * this.c;
    if (!det) return new DOMMatrix();
    return new DOMMatrix([
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det,
    ]);
  }

  transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: point.x * this.a + point.y * this.c + this.e,
      y: point.x * this.b + point.y * this.d + this.f,
    };
  }

  toFloat32Array(): Float32Array {
    return new Float32Array([
      this.m11, this.m12, this.m13, this.m14,
      this.m21, this.m22, this.m23, this.m24,
      this.m31, this.m32, this.m33, this.m34,
      this.m41, this.m42, this.m43, this.m44,
    ]);
  }

  toFloat64Array(): Float64Array {
    return new Float64Array([
      this.m11, this.m12, this.m13, this.m14,
      this.m21, this.m22, this.m23, this.m24,
      this.m31, this.m32, this.m33, this.m34,
      this.m41, this.m42, this.m43, this.m44,
    ]);
  }

  static fromArray(arr: number[]): DOMMatrix {
    return new DOMMatrix(arr);
  }

  static fromMatrix(other?: any): DOMMatrix {
    return new DOMMatrix(other ? [other.a, other.b, other.c, other.d, other.e, other.f] : undefined);
  }
}

export class DOMPoint {
  constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}
  matrixTransform(matrix: DOMMatrix): DOMPoint {
    const pt = matrix.transformPoint({ x: this.x, y: this.y });
    return new DOMPoint(pt.x, pt.y, this.z, this.w);
  }
  toJSON() { return { x: this.x, y: this.y, z: this.z, w: this.w }; }
  static fromPoint(point?: any): DOMPoint {
    return new DOMPoint(point?.x || 0, point?.y || 0, point?.z || 0, point?.w ?? 1);
  }
}

export class DOMRect {
  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
  get top() { return this.y; }
  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get bottom() { return this.y + this.height; }
  static fromRect(other?: any): DOMRect {
    return new DOMRect(other?.x || 0, other?.y || 0, other?.width || 0, other?.height || 0);
  }
  toJSON() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
}

export class Path2D {
  constructor(_path?: any) {}
  addPath(_path?: any, _transform?: any) {}
  closePath() {}
  moveTo(_x: number, _y: number) {}
  lineTo(_x: number, _y: number) {}
  bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, _x: number, _y: number) {}
  arc(_x: number, _y: number, _r: number, _s: number, _e: number, _ccw?: boolean) {}
  rect(_x: number, _y: number, _w: number, _h: number) {}
}

export function installGlobalPolyfills() {
  const g = (typeof globalThis !== 'undefined' ? globalThis : global) as any;
  const targets: any[] = [g];
  try { if (typeof global !== 'undefined' && global !== g) targets.push(global); } catch {}
  try { if (g.window && g.window !== g) targets.push(g.window); } catch {}
  try { if (g.self && g.self !== g) targets.push(g.self); } catch {}

  for (const t of targets) {
    if (!t.DOMMatrix) t.DOMMatrix = DOMMatrix;
    if (!t.DOMMatrixReadOnly) t.DOMMatrixReadOnly = DOMMatrix;
    if (!t.DOMPoint) t.DOMPoint = DOMPoint;
    if (!t.DOMPointReadOnly) t.DOMPointReadOnly = DOMPoint;
    if (!t.DOMRect) t.DOMRect = DOMRect;
    if (!t.DOMRectReadOnly) t.DOMRectReadOnly = DOMRect;
    if (!t.Path2D) t.Path2D = Path2D;
  }
}

installGlobalPolyfills();
