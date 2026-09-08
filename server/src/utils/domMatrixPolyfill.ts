/**
 * DOMMatrix & Geometry Polyfill for Node.js / Serverless runtimes.
 * Resolves "DOMMatrix is not defined" when pdf-parse (pdf.worker.mjs)
 * executes 2D/3D affine matrix transformations during PDF rasterization
 * or image geometry calculations.
 */

export class DOMMatrix {
  // 2D affine properties
  a: number = 1;
  b: number = 0;
  c: number = 0;
  d: number = 1;
  e: number = 0;
  f: number = 0;

  // 3D matrix properties (4x4)
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

  private sync2D() {
    this.a = this.m11;
    this.b = this.m12;
    this.c = this.m21;
    this.d = this.m22;
    this.e = this.m41;
    this.f = this.m42;
    this.updateIdentity();
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

  multiplySelf(other: DOMMatrix): this {
    const res = this.multiply(other);
    this.a = this.m11 = res.a;
    this.b = this.m12 = res.b;
    this.c = this.m21 = res.c;
    this.d = this.m22 = res.d;
    this.e = this.m41 = res.e;
    this.f = this.m42 = res.f;
    this.updateIdentity();
    return this;
  }

  translate(tx: number = 0, ty: number = 0, tz: number = 0): DOMMatrix {
    const copy = new DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
    return copy.translateSelf(tx, ty, tz);
  }

  translateSelf(tx: number = 0, ty: number = 0, _tz: number = 0): this {
    this.e += tx * this.a + ty * this.c;
    this.f += tx * this.b + ty * this.d;
    this.m41 = this.e;
    this.m42 = this.f;
    this.updateIdentity();
    return this;
  }

  scale(scaleX: number = 1, scaleY: number = scaleX, _scaleZ: number = 1): DOMMatrix {
    const copy = new DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
    return copy.scaleSelf(scaleX, scaleY);
  }

  scaleSelf(scaleX: number = 1, scaleY: number = scaleX, _scaleZ: number = 1): this {
    this.a *= scaleX;
    this.b *= scaleX;
    this.m11 = this.a;
    this.m12 = this.b;

    this.c *= scaleY;
    this.d *= scaleY;
    this.m21 = this.c;
    this.m22 = this.d;

    this.updateIdentity();
    return this;
  }

  rotate(angle: number): DOMMatrix {
    const copy = new DOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
    return copy.rotateSelf(angle);
  }

  rotateSelf(angle: number): this {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const a = this.a * cos + this.c * sin;
    const b = this.b * cos + this.d * sin;
    const c = this.a * -sin + this.c * cos;
    const d = this.b * -sin + this.d * cos;

    this.a = this.m11 = a;
    this.b = this.m12 = b;
    this.c = this.m21 = c;
    this.d = this.m22 = d;

    this.updateIdentity();
    return this;
  }

  inverse(): DOMMatrix {
    const det = this.a * this.d - this.b * this.c;
    if (!det) {
      return new DOMMatrix();
    }
    return new DOMMatrix([
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det,
    ]);
  }

  invertSelf(): this {
    const inv = this.inverse();
    this.a = this.m11 = inv.a;
    this.b = this.m12 = inv.b;
    this.c = this.m21 = inv.c;
    this.d = this.m22 = inv.d;
    this.e = this.m41 = inv.e;
    this.f = this.m42 = inv.f;
    this.updateIdentity();
    return this;
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

  toString(): string {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
  }
}

export class DOMPoint {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  matrixTransform(matrix: DOMMatrix): DOMPoint {
    const res = matrix.transformPoint({ x: this.x, y: this.y });
    return new DOMPoint(res.x, res.y, this.z, this.w);
  }
}

export class DOMRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;

  constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.top = y;
    this.left = x;
    this.right = x + width;
    this.bottom = y + height;
  }
}

/**
 * Polyfill installation helper: guarantees DOMMatrix, DOMPoint, DOMRect are bound
 * across all global scopes (global, globalThis, window).
 */
export function ensureDomMatrixPolyfill(): void {
  const g = globalThis as any;
  if (!g.DOMMatrix) {
    g.DOMMatrix = DOMMatrix;
    g.DOMMatrixReadOnly = DOMMatrix;
  }
  if (!g.DOMPoint) {
    g.DOMPoint = DOMPoint;
    g.DOMPointReadOnly = DOMPoint;
  }
  if (!g.DOMRect) {
    g.DOMRect = DOMRect;
    g.DOMRectReadOnly = DOMRect;
  }
}

// Auto-run on module import
ensureDomMatrixPolyfill();
