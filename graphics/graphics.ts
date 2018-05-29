
// there is a whole lot of convention involved here, including:
// 1. object-oriented vertices/polygons or arrays of floats/integers?
// 2. how do we represent the scene graph and transformations - i use Bones, but Daz works differently
// 3. the device can be a Uint8Array bitmap, a CanvasRenderingContext2D, a Canvas, a native SVG, etc. etc.

var THREE: any;
//var exports = {}; // when compiled with tsc --target es5 --module none graphics.ts - this creates exports.Foo = Foo lines, which works in node, but fails in browser because exports is not defined.  so we need to add a var exports = {} line for it to work in the browser, but that line breaks it for node

interface ScanLineData {
	normala?: Vector3;
	normalb?: Vector3;
	normalc?: Vector3;
	normald?: Vector3;
	ua?: number;
	ub?: number;
	uc?: number;
	ud?: number;
	va?: number;
	vb?: number;
	vc?: number;
	vd?: number;
	currentY?: number;
}

var GenerateId: (obj: any) => string = (function(): (obj: any) => string {
	
	var guids = {};
	
	return function(obj: any): string {
		
		var s = null;
		
		do
		{
			s = '';
			
			for (var i = 0; i < 6; i++)
			{
				var n = Math.floor(Math.random() * 36);
				
				if (n < 10)
				{
					s += String.fromCharCode(48 + n); // 0-9
				}
				else
				{
					s += String.fromCharCode(87 + n); // a-z
				}
			}
		} while (guids[s]);
		
		guids[s] = obj;
		
		return s;
	}
})();

// these could be methods of Vector3
function ParseCoordinates(str: string): Vector3 {
	var c = str.substr(1, str.length - 2).split(',');
	return new Vector3(parseFloat(c[0]), parseFloat(c[1]), parseFloat(c[2]));
}
function CoordinatesToString(v: Vector3): string {
	return '(' + v.x.toString() + ',' + v.y.toString() + ',' + v.z.toString() + ')';
}
function MakeVector3(list: number[]): Vector3 {
	return new Vector3(list[0], list[1], list[2]);
}
function InterpolateVector(v1: Vector3, v2: Vector3, gradient: number): Vector3 {
	return v1.add(v2.subtract(v1).multiplyScalar(gradient));
}

function Interpolate(min: number, max: number, gradient: number): number {
	return min + (max - min) * Clamp(gradient, 0, 1);
}
function Clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

function DrawUvMap(ctx: CanvasRenderingContext2D, mesh: Geometry): void {
	
	for (var i = 0; i < mesh.polygons.length; i++)
	{
		var poly = mesh.polygons[i];
		var uvs = [];
		
		// what does this loop do and do we / should we do it elsewhere as part of a general normalization of the uv set?
		for (var k = 0; k < poly.vertices.length; k++)
		{
			var vertex = poly.vertices[k];
			
			if (mesh.uvSet.pviDict[i] && mesh.uvSet.pviDict[i][vertex.index])
			{
				uvs.push(mesh.uvSet.uvs[mesh.uvSet.pviDict[i][vertex.index]]);
			}
			else
			{
				uvs.push(mesh.uvSet.uvs[vertex.index]);
			}
		}
		
		ctx.beginPath();
		
		for (var k = 0; k < uvs.length; k++)
		{
			var a = uvs[k];
			var b = uvs[(k+1)%uvs.length];
			
			if (a && b) // hack to just get something drawn
			{
				var x1 = a[0] * ctx.canvas.width;
				var y1 = a[1] * ctx.canvas.height;
				var x2 = b[0] * ctx.canvas.width;
				var y2 = b[1] * ctx.canvas.height;
				
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
			}
		}
		
		ctx.stroke();
	}
}

export class Color4 {
	r: number;
	g: number;
	b: number;
	a: number;
	constructor(r: number, g: number, b: number, a?: number) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}
	toString(): string {
		return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
	}
}
export class Vector2 {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
	toString(): string {
		return "{X: " + this.x + " Y:" + this.y + "}";
	}
	add(that: Vector2): Vector2 {
		return new Vector2(this.x + that.x, this.y + that.y);
	}
	subtract(that: Vector2): Vector2 {
		return new Vector2(this.x - that.x, this.y - that.y);
	}
	negate(): Vector2 {
		return new Vector2(-this.x, -this.y);
	}
	scale(scale: number): Vector2 {
		return new Vector2(this.x * scale, this.y * scale);
	}
	equals(that: Vector2): boolean {
		return this.x === that.x && this.y === that.y;
	}
	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	lengthSquared(): number {
		return (this.x * this.x + this.y * this.y);
	}
	normalize(): number {
		var len = this.length();
		if (len === 0) { return; }
		var num = 1.0 / len;
		this.x *= num;
		this.y *= num;
	}
	static Zero(): Vector2 {
		return new Vector2(0, 0);
	}
	static Copy(source: Vector2): Vector2 {
		return new Vector2(source.x, source.y);
	}
	static Normalize(vector: Vector2): Vector2 {
		var newVector = Vector2.Copy(vector);
		newVector.normalize();
		return newVector;
	}
	static Minimize(left: Vector2, right: Vector2): Vector2 {
		var x = (left.x < right.x) ? left.x : right.x;
		var y = (left.y < right.y) ? left.y : right.y;
		return new Vector2(x, y);
	}
	static Maximize(left: Vector2, right: Vector2): Vector2 {
		var x = (left.x > right.x) ? left.x : right.x;
		var y = (left.y > right.y) ? left.y : right.y;
		return new Vector2(x, y);
	}
	static Transform(vector: Vector2, transformation: Matrix): Vector2 {
		var x = (vector.x * transformation.m[0]) + (vector.y * transformation.m[4]);
		var y = (vector.x * transformation.m[1]) + (vector.y * transformation.m[5]);
		return new Vector2(x, y);
	}
	static Distance(value1: Vector2, value2: Vector2): number {
		return Math.sqrt(Vector2.DistanceSquared(value1, value2));
	}
	static DistanceSquared(value1: Vector2, value2: Vector2): number {
		var x = value1.x - value2.x;
		var y = value1.y - value2.y;
		return (x * x) + (y * y);
	}
}
export class Vector3 {
	x: number;
	y: number;
	z: number;
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	toString(): string {
		return "{X: " + this.x + " Y:" + this.y + " Z:" + this.z + "}";
	}
	add(that: Vector3): Vector3 {
		return new Vector3(this.x + that.x, this.y + that.y, this.z + that.z);
	}
	subtract(that: Vector3): Vector3 {
		return new Vector3(this.x - that.x, this.y - that.y, this.z - that.z);
	}
	negate(): Vector3 {
		return new Vector3(-this.x, -this.y, -this.z);
	}
	scale(scale: number): Vector3 {
		return new Vector3(this.x * scale, this.y * scale, this.z * scale);
	}
	equals(that: Vector3): boolean {
		return this.x === that.x && this.y === that.y && this.z === that.z;
	}
	multiplyScalar(that: number): Vector3 {
		return new Vector3(this.x * that, this.y * that, this.z * that);
	}
	multiply(that: Vector3): Vector3 {
		return new Vector3(this.x * that.x, this.y * that.y, this.z * that.z);
	}
	divide(that: Vector3): Vector3 {
		return new Vector3(this.x / that.x, this.y / that.y, this.z / that.z);
	}
	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
	lengthSquared(): number {
		return (this.x * this.x + this.y * this.y + this.z * this.z);
	}
	normalize(): Vector3 {
		var len = this.length();
		if (len === 0) { return this; }
		var num = 1.0 / len;
		this.x *= num;
		this.y *= num;
		this.z *= num;
		return this;
	}
	static FromArray(array: number[], offset: number): Vector3 {
		if (!offset) { offset = 0; }
		return new Vector3(array[offset], array[offset + 1], array[offset + 2]);
	}
	static Zero(): Vector3 {
		return new Vector3(0, 0, 0);
	}
	static Up(): Vector3 {
		return new Vector3(0, 1.0, 0);
	}
	static Copy(source: Vector3): Vector3 {
		return new Vector3(source.x, source.y, source.z);
	}
	static TransformCoordinates(vector: Vector3, transformation: Matrix) {
		var x = (vector.x * transformation.m[0]) + (vector.y * transformation.m[4]) + (vector.z * transformation.m[8]) + transformation.m[12];
		var y = (vector.x * transformation.m[1]) + (vector.y * transformation.m[5]) + (vector.z * transformation.m[9]) + transformation.m[13];
		var z = (vector.x * transformation.m[2]) + (vector.y * transformation.m[6]) + (vector.z * transformation.m[10]) + transformation.m[14];
		var w = (vector.x * transformation.m[3]) + (vector.y * transformation.m[7]) + (vector.z * transformation.m[11]) + transformation.m[15];
		return new Vector3(x / w, y / w, z / w);
	}
	static TransformNormal(vector: Vector3, transformation: Matrix) {
		var x = (vector.x * transformation.m[0]) + (vector.y * transformation.m[4]) + (vector.z * transformation.m[8]);
		var y = (vector.x * transformation.m[1]) + (vector.y * transformation.m[5]) + (vector.z * transformation.m[9]);
		var z = (vector.x * transformation.m[2]) + (vector.y * transformation.m[6]) + (vector.z * transformation.m[10]);
		return new Vector3(x, y, z);
	}
	static Dot(left: Vector3, right: Vector3): number {
		return (left.x * right.x + left.y * right.y + left.z * right.z);
	}
	static Cross(left: Vector3, right: Vector3): Vector3 {
		var x = left.y * right.z - left.z * right.y;
		var y = left.z * right.x - left.x * right.z;
		var z = left.x * right.y - left.y * right.x;
		return new Vector3(x, y, z);
	}
	static Normalize(vector: Vector3): Vector3 {
		var newVector = Vector3.Copy(vector);
		newVector.normalize();
		return newVector;
	}
	static Distance(value1: Vector3, value2: Vector3): number {
		return Math.sqrt(Vector3.DistanceSquared(value1, value2));
	}
	static DistanceSquared(value1: Vector3, value2: Vector3): number {
		var x = value1.x - value2.x;
		var y = value1.y - value2.y;
		var z = value1.z - value2.z;
		return (x * x) + (y * y) + (z * z);
	}
}
export class Matrix {
	m: number[] = [];
	constructor() { }
	isIdentity(): boolean {
		if(this.m[0] != 1.0 || this.m[5] != 1.0 || this.m[10] != 1.0 || this.m[15] != 1.0) {
			return false;
		}
		if(this.m[12] != 0.0 || this.m[13] != 0.0 || this.m[14] != 0.0 || this.m[4] != 0.0 || this.m[6] != 0.0 || this.m[7] != 0.0 || this.m[8] != 0.0 || this.m[9] != 0.0 || this.m[11] != 0.0 || this.m[12] != 0.0 || this.m[13] != 0.0 || this.m[14] != 0.0) {
			return false;
		}
		return true;
	}
	determinant(): number {
		var temp1 = (this.m[10] * this.m[15]) - (this.m[11] * this.m[14]);
		var temp2 = (this.m[9] * this.m[15]) - (this.m[11] * this.m[13]);
		var temp3 = (this.m[9] * this.m[14]) - (this.m[10] * this.m[13]);
		var temp4 = (this.m[8] * this.m[15]) - (this.m[11] * this.m[12]);
		var temp5 = (this.m[8] * this.m[14]) - (this.m[10] * this.m[12]);
		var temp6 = (this.m[8] * this.m[13]) - (this.m[9] * this.m[12]);
		return ((((this.m[0] * (((this.m[5] * temp1) - (this.m[6] * temp2)) + (this.m[7] * temp3))) - (this.m[1] * (((this.m[4] * temp1) - (this.m[6] * temp4)) + (this.m[7] * temp5)))) + (this.m[2] * (((this.m[4] * temp2) - (this.m[5] * temp4)) + (this.m[7] * temp6)))) - (this.m[3] * (((this.m[4] * temp3) - (this.m[5] * temp5)) + (this.m[6] * temp6))));
	}
	toArray(): number[] {
		return this.m;
	}
	invert(): void {
		var l1 = this.m[0];
		var l2 = this.m[1];
		var l3 = this.m[2];
		var l4 = this.m[3];
		var l5 = this.m[4];
		var l6 = this.m[5];
		var l7 = this.m[6];
		var l8 = this.m[7];
		var l9 = this.m[8];
		var l10 = this.m[9];
		var l11 = this.m[10];
		var l12 = this.m[11];
		var l13 = this.m[12];
		var l14 = this.m[13];
		var l15 = this.m[14];
		var l16 = this.m[15];
		var l17 = (l11 * l16) - (l12 * l15);
		var l18 = (l10 * l16) - (l12 * l14);
		var l19 = (l10 * l15) - (l11 * l14);
		var l20 = (l9 * l16) - (l12 * l13);
		var l21 = (l9 * l15) - (l11 * l13);
		var l22 = (l9 * l14) - (l10 * l13);
		var l23 = ((l6 * l17) - (l7 * l18)) + (l8 * l19);
		var l24 = -(((l5 * l17) - (l7 * l20)) + (l8 * l21));
		var l25 = ((l5 * l18) - (l6 * l20)) + (l8 * l22);
		var l26 = -(((l5 * l19) - (l6 * l21)) + (l7 * l22));
		var l27 = 1.0 / ((((l1 * l23) + (l2 * l24)) + (l3 * l25)) + (l4 * l26));
		var l28 = (l7 * l16) - (l8 * l15);
		var l29 = (l6 * l16) - (l8 * l14);
		var l30 = (l6 * l15) - (l7 * l14);
		var l31 = (l5 * l16) - (l8 * l13);
		var l32 = (l5 * l15) - (l7 * l13);
		var l33 = (l5 * l14) - (l6 * l13);
		var l34 = (l7 * l12) - (l8 * l11);
		var l35 = (l6 * l12) - (l8 * l10);
		var l36 = (l6 * l11) - (l7 * l10);
		var l37 = (l5 * l12) - (l8 * l9);
		var l38 = (l5 * l11) - (l7 * l9);
		var l39 = (l5 * l10) - (l6 * l9);
		this.m[0] = l23 * l27;
		this.m[4] = l24 * l27;
		this.m[8] = l25 * l27;
		this.m[12] = l26 * l27;
		this.m[1] = -(((l2 * l17) - (l3 * l18)) + (l4 * l19)) * l27;
		this.m[5] = (((l1 * l17) - (l3 * l20)) + (l4 * l21)) * l27;
		this.m[9] = -(((l1 * l18) - (l2 * l20)) + (l4 * l22)) * l27;
		this.m[13] = (((l1 * l19) - (l2 * l21)) + (l3 * l22)) * l27;
		this.m[2] = (((l2 * l28) - (l3 * l29)) + (l4 * l30)) * l27;
		this.m[6] = -(((l1 * l28) - (l3 * l31)) + (l4 * l32)) * l27;
		this.m[10] = (((l1 * l29) - (l2 * l31)) + (l4 * l33)) * l27;
		this.m[14] = -(((l1 * l30) - (l2 * l32)) + (l3 * l33)) * l27;
		this.m[3] = -(((l2 * l34) - (l3 * l35)) + (l4 * l36)) * l27;
		this.m[7] = (((l1 * l34) - (l3 * l37)) + (l4 * l38)) * l27;
		this.m[11] = -(((l1 * l35) - (l2 * l37)) + (l4 * l39)) * l27;
		this.m[15] = (((l1 * l36) - (l2 * l38)) + (l3 * l39)) * l27;
	}
	multiply(other: Matrix): Matrix {
		var result = new Matrix();
		result.m[0] = this.m[0] * other.m[0] + this.m[1] * other.m[4] + this.m[2] * other.m[8] + this.m[3] * other.m[12];
		result.m[1] = this.m[0] * other.m[1] + this.m[1] * other.m[5] + this.m[2] * other.m[9] + this.m[3] * other.m[13];
		result.m[2] = this.m[0] * other.m[2] + this.m[1] * other.m[6] + this.m[2] * other.m[10] + this.m[3] * other.m[14];
		result.m[3] = this.m[0] * other.m[3] + this.m[1] * other.m[7] + this.m[2] * other.m[11] + this.m[3] * other.m[15];
		result.m[4] = this.m[4] * other.m[0] + this.m[5] * other.m[4] + this.m[6] * other.m[8] + this.m[7] * other.m[12];
		result.m[5] = this.m[4] * other.m[1] + this.m[5] * other.m[5] + this.m[6] * other.m[9] + this.m[7] * other.m[13];
		result.m[6] = this.m[4] * other.m[2] + this.m[5] * other.m[6] + this.m[6] * other.m[10] + this.m[7] * other.m[14];
		result.m[7] = this.m[4] * other.m[3] + this.m[5] * other.m[7] + this.m[6] * other.m[11] + this.m[7] * other.m[15];
		result.m[8] = this.m[8] * other.m[0] + this.m[9] * other.m[4] + this.m[10] * other.m[8] + this.m[11] * other.m[12];
		result.m[9] = this.m[8] * other.m[1] + this.m[9] * other.m[5] + this.m[10] * other.m[9] + this.m[11] * other.m[13];
		result.m[10] = this.m[8] * other.m[2] + this.m[9] * other.m[6] + this.m[10] * other.m[10] + this.m[11] * other.m[14];
		result.m[11] = this.m[8] * other.m[3] + this.m[9] * other.m[7] + this.m[10] * other.m[11] + this.m[11] * other.m[15];
		result.m[12] = this.m[12] * other.m[0] + this.m[13] * other.m[4] + this.m[14] * other.m[8] + this.m[15] * other.m[12];
		result.m[13] = this.m[12] * other.m[1] + this.m[13] * other.m[5] + this.m[14] * other.m[9] + this.m[15] * other.m[13];
		result.m[14] = this.m[12] * other.m[2] + this.m[13] * other.m[6] + this.m[14] * other.m[10] + this.m[15] * other.m[14];
		result.m[15] = this.m[12] * other.m[3] + this.m[13] * other.m[7] + this.m[14] * other.m[11] + this.m[15] * other.m[15];
		return result;
	}
	equals(value: Matrix): boolean {
		return (this.m[0] === value.m[0] && this.m[1] === value.m[1] && this.m[2] === value.m[2] && this.m[3] === value.m[3] && this.m[4] === value.m[4] && this.m[5] === value.m[5] && this.m[6] === value.m[6] && this.m[7] === value.m[7] && this.m[8] === value.m[8] && this.m[9] === value.m[9] && this.m[10] === value.m[10] && this.m[11] === value.m[11] && this.m[12] === value.m[12] && this.m[13] === value.m[13] && this.m[14] === value.m[14] && this.m[15] === value.m[15]);
	}
	static FromValues(initialM11: number, initialM12: number, initialM13: number, initialM14: number, initialM21: number, initialM22: number, initialM23: number, initialM24: number, initialM31: number, initialM32: number, initialM33: number, initialM34: number, initialM41: number, initialM42: number, initialM43: number, initialM44: number): Matrix {
		var result = new Matrix();
		result.m[0] = initialM11;
		result.m[1] = initialM12;
		result.m[2] = initialM13;
		result.m[3] = initialM14;
		result.m[4] = initialM21;
		result.m[5] = initialM22;
		result.m[6] = initialM23;
		result.m[7] = initialM24;
		result.m[8] = initialM31;
		result.m[9] = initialM32;
		result.m[10] = initialM33;
		result.m[11] = initialM34;
		result.m[12] = initialM41;
		result.m[13] = initialM42;
		result.m[14] = initialM43;
		result.m[15] = initialM44;
		return result;
	}
	static Identity(): Matrix {
		return Matrix.FromValues(1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0);
	}
	static Zero(): Matrix {
		return Matrix.FromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
	static Copy(source: Matrix): Matrix {
		return Matrix.FromValues(source.m[0], source.m[1], source.m[2], source.m[3], source.m[4], source.m[5], source.m[6], source.m[7], source.m[8], source.m[9], source.m[10], source.m[11], source.m[12], source.m[13], source.m[14], source.m[15]);
	}
	static RotationX(angle: number): Matrix {
		var result = Matrix.Zero();
		var s = Math.sin(angle);
		var c = Math.cos(angle);
		result.m[0] = 1.0;
		result.m[15] = 1.0;
		result.m[5] = c;
		result.m[10] = c;
		result.m[9] = -s;
		result.m[6] = s;
		return result;
	}
	static RotationY(angle: number): Matrix {
		var result = Matrix.Zero();
		var s = Math.sin(angle);
		var c = Math.cos(angle);
		result.m[5] = 1.0;
		result.m[15] = 1.0;
		result.m[0] = c;
		result.m[2] = -s;
		result.m[8] = s;
		result.m[10] = c;
		return result;
	}
	static RotationZ(angle: number): Matrix {
		var result = Matrix.Zero();
		var s = Math.sin(angle);
		var c = Math.cos(angle);
		result.m[10] = 1.0;
		result.m[15] = 1.0;
		result.m[0] = c;
		result.m[1] = s;
		result.m[4] = -s;
		result.m[5] = c;
		return result;
	}
	static RotationAxis(axis: Vector3, angle: number): Matrix {
		var s = Math.sin(-angle);
		var c = Math.cos(-angle);
		var c1 = 1 - c;
		axis.normalize();
		var result = Matrix.Zero();
		result.m[0] = (axis.x * axis.x) * c1 + c;
		result.m[1] = (axis.x * axis.y) * c1 - (axis.z * s);
		result.m[2] = (axis.x * axis.z) * c1 + (axis.y * s);
		result.m[3] = 0.0;
		result.m[4] = (axis.y * axis.x) * c1 + (axis.z * s);
		result.m[5] = (axis.y * axis.y) * c1 + c;
		result.m[6] = (axis.y * axis.z) * c1 - (axis.x * s);
		result.m[7] = 0.0;
		result.m[8] = (axis.z * axis.x) * c1 - (axis.y * s);
		result.m[9] = (axis.z * axis.y) * c1 + (axis.x * s);
		result.m[10] = (axis.z * axis.z) * c1 + c;
		result.m[11] = 0.0;
		result.m[15] = 1.0;
		return result;
	}
	static RotationYawPitchRoll(yaw: number, pitch: number, roll: number): Matrix {
		return Matrix.RotationZ(roll).multiply(Matrix.RotationX(pitch)).multiply(Matrix.RotationY(yaw));
	}
	static Scaling(x: number, y: number, z: number): Matrix {
		var result = Matrix.Zero();
		result.m[0] = x;
		result.m[5] = y;
		result.m[10] = z;
		result.m[15] = 1.0;
		return result;
	}
	static Translation(x: number, y: number, z: number): Matrix {
		var result = Matrix.Identity();
		result.m[12] = x;
		result.m[13] = y;
		result.m[14] = z;
		return result;
	}
	static LookAtLH(eye: Vector3, target: Vector3, up: Vector3): Matrix {
		var zAxis = target.subtract(eye);
		zAxis.normalize();
		var xAxis = Vector3.Cross(up, zAxis);
		xAxis.normalize();
		var yAxis = Vector3.Cross(zAxis, xAxis);
		yAxis.normalize();
		var ex = -Vector3.Dot(xAxis, eye);
		var ey = -Vector3.Dot(yAxis, eye);
		var ez = -Vector3.Dot(zAxis, eye);
		return Matrix.FromValues(xAxis.x, yAxis.x, zAxis.x, 0, xAxis.y, yAxis.y, zAxis.y, 0, xAxis.z, yAxis.z, zAxis.z, 0, ex, ey, ez, 1);
	}
	static PerspectiveLH(width: number, height: number, znear: number, zfar: number): Matrix {
		var matrix = Matrix.Zero();
		matrix.m[0] = (2.0 * znear) / width;
		matrix.m[1] = matrix.m[2] = matrix.m[3] = 0.0;
		matrix.m[5] = (2.0 * znear) / height;
		matrix.m[4] = matrix.m[6] = matrix.m[7] = 0.0;
		matrix.m[10] = -zfar / (znear - zfar);
		matrix.m[8] = matrix.m[9] = 0.0;
		matrix.m[11] = 1.0;
		matrix.m[12] = matrix.m[13] = matrix.m[15] = 0.0;
		matrix.m[14] = (znear * zfar) / (znear - zfar);
		return matrix;
	}
	static PerspectiveFovLH(fov: number, aspect: number, znear: number, zfar: number): Matrix {
		var matrix = Matrix.Zero();
		var tan = 1.0 / (Math.tan(fov * 0.5));
		matrix.m[0] = tan / aspect;
		matrix.m[1] = matrix.m[2] = matrix.m[3] = 0.0;
		matrix.m[5] = tan;
		matrix.m[4] = matrix.m[6] = matrix.m[7] = 0.0;
		matrix.m[8] = matrix.m[9] = 0.0;
		matrix.m[10] = -zfar / (znear - zfar);
		matrix.m[11] = 1.0;
		matrix.m[12] = matrix.m[13] = matrix.m[15] = 0.0;
		matrix.m[14] = (znear * zfar) / (znear - zfar);
		return matrix;
	}
	static Transpose(matrix: Matrix): Matrix {
		var result = new Matrix();
		result.m[0] = matrix.m[0];
		result.m[1] = matrix.m[4];
		result.m[2] = matrix.m[8];
		result.m[3] = matrix.m[12];
		result.m[4] = matrix.m[1];
		result.m[5] = matrix.m[5];
		result.m[6] = matrix.m[9];
		result.m[7] = matrix.m[13];
		result.m[8] = matrix.m[2];
		result.m[9] = matrix.m[6];
		result.m[10] = matrix.m[10];
		result.m[11] = matrix.m[14];
		result.m[12] = matrix.m[3];
		result.m[13] = matrix.m[7];
		result.m[14] = matrix.m[11];
		result.m[15] = matrix.m[15];
		return result;
	}
}
export class Shapes {
	static Line(p: Vector3, q: Vector3): Geometry {
		
		var geometry = new Geometry();
		geometry.vertices.push(new Vertex(p.x, p.y, p.z));
		geometry.vertices.push(new Vertex(q.x, q.y, q.z));
		
		var polygon = new Polygon();
		polygon.vertices.push(geometry.vertices[0]);
		polygon.vertices.push(geometry.vertices[1]);
		geometry.polygons.push(polygon);
		
		return geometry;
	}
	static Plane(x: number, y: number, z: number): Geometry {
		
		var geometry = new Geometry();
		geometry.label = 'geometry';
		
		if (x == 0)
		{
			geometry.vertices = [ new Vertex(0, 0, 0) , new Vertex(0, 0, z) , new Vertex(0, y, z) , new Vertex(0, y, 0) ];;
		}
		else if (y == 0)
		{
			geometry.vertices = [ new Vertex(0, 0, 0) , new Vertex(x, 0, 0) , new Vertex(x, 0, z) , new Vertex(0, 0, z) ];
		}
		else if (z == 0)
		{
			geometry.vertices = [ new Vertex(0, 0, 0) , new Vertex(x, 0, 0) , new Vertex(x, y, 0) , new Vertex(0, y, 0) ];
		}
		else
		{
			throw new Error('one of x, y, or z needs to be 0');
		}
		
		var plane = new Polygon();
		plane.vertices.push(geometry.vertices[0]);
		plane.vertices.push(geometry.vertices[1]);
		plane.vertices.push(geometry.vertices[2]);
		plane.vertices.push(geometry.vertices[3]);
		plane.normal = new Vector3(x == 0 ? 1 : 0, y == 0 ? 1 : 0, z == 0 ? 1 : 0);
		
		geometry.polygons.push(plane);
		geometry.polyNormals.push(plane.normal);
		
		geometry.uvSet.uvs = [ [ 0 , 0 ] , [ 1 , 0 ] , [ 1 , 1 ] , [ 0 , 1 ] ];
		
		return geometry;
	}
	static Cube(x: number, y: number, z: number): Geometry {
		
		var geometry = new Geometry();
		geometry.label = 'cube';
		
		geometry.vertices.push(new Vertex(0, 0, 0));
		geometry.vertices.push(new Vertex(0, y, 0));
		geometry.vertices.push(new Vertex(0, 0, z));
		geometry.vertices.push(new Vertex(0, y, z));
		geometry.vertices.push(new Vertex(x, 0, 0));
		geometry.vertices.push(new Vertex(x, y, 0));
		geometry.vertices.push(new Vertex(x, 0, z));
		geometry.vertices.push(new Vertex(x, y, z));
		
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 0, 1, 3, 2));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 4, 5, 7, 6));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 0, 1, 5, 4));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 2, 3, 7, 6));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 0, 2, 6, 4));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 1, 3, 7, 5));
		
		var textureWidth = x + y + x + y;
		var textureHeight = y + z + y;
		
		var points: [number, number][] = [
			[0,0], // in the diagram we made, we used 1-indexing for these coordinates, so this first element is just padding
			[0,0],
			[0,y],
			[0,y+z],
			[x,0],
			[x,y],
			[x,y+z],
			[x+y,y],
			[x+y,y+z],
			[x+y,y+z+y],
			[x+y+x,y],
			[x+y+x,y+z],
			[x+y+x,y+z+y],
			[y,x+y+x+y],
			[y+z,x+y+x+y]
		].map(function(uv: [number, number]): [number, number] { return [ uv[0] / textureWidth , uv[1] / textureHeight ]; }); // normalize
		
		geometry.uvSet.uvs = [
			points[5], // the first 8 uvs match up with the vertex list
			points[7],
			points[6],
			points[8],
			points[2],
			points[10],
			points[3],
			points[11], 
			points[4], // pvis start here - these are the red numbers in the pvi diagram
			points[9], // the 3rd number in the pvi lists below is just 8-13 consecutively, referring to this list
			points[13],
			points[1],
			points[12],
			points[14]
		];
		
		geometry.uvSet.pvi = [
			[2,1,8],
			[3,2,9],
			[1,4,10],
			[2,5,11],
			[3,6,12],
			[1,6,13]
		];
		
		geometry.polyNormals.push(new Vector3(-1,  0,  0));
		geometry.polyNormals.push(new Vector3(+1,  0,  0));
		geometry.polyNormals.push(new Vector3( 0,  0, -1));
		geometry.polyNormals.push(new Vector3( 0,  0, +1));
		geometry.polyNormals.push(new Vector3( 0, -1,  0));
		geometry.polyNormals.push(new Vector3( 0, +1,  0));
		
		geometry.uvSet.makePviDict();
		
		return geometry;
	}
	static MultiCube(x: number, y: number, z: number): Geometry {
		
		// each face has its own Material
		
		var geometry = new Geometry();
		geometry.label = 'cube';
		
		geometry.vertices.push(new Vertex(0, 0, 0));
		geometry.vertices.push(new Vertex(0, y, 0));
		geometry.vertices.push(new Vertex(0, 0, z));
		geometry.vertices.push(new Vertex(0, y, z));
		geometry.vertices.push(new Vertex(x, 0, 0));
		geometry.vertices.push(new Vertex(x, y, 0));
		geometry.vertices.push(new Vertex(x, 0, z));
		geometry.vertices.push(new Vertex(x, y, z));
		
		// the polygon group index has been changed from 0,0,0,0,0,0 to 0,1,2,3,4,5
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 0, 1, 3, 2));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 1, 4, 5, 7, 6));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 2, 0, 1, 5, 4));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 3, 2, 3, 7, 6));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 4, 0, 2, 6, 4));
		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 5, 1, 3, 7, 5));
		
		geometry.uvSet.uvs = [
			[0,0], // lower left
			[1,0], // lower right
			[1,1], // upper right
			[0,1], // upper left
			[0,0], // these uvs 4-7 are not strictly necessary but are here so that the initial assignment of uvs by vertex goes smoothly
			[1,0],
			[1,1],
			[0,1]
		];
		
		// the first index is 000011112222333344445555
		// the third index is 012301230123012301230123
		// thus the second index is the significant one - see the cube geometry diagram
		// each side face of the cube (polygons 0,1,2,3) has a natural viewpoint - look at it so that the bottom is on the bottom and the top is on the top
		// the top (polygon 5) and bottom (polygon 4) faces don't really have a natural viewpoint, so the uv orientation there is ad hoc
		geometry.uvSet.pvi = [
			[0,2,0],
			[0,0,1],
			[0,1,2],
			[0,3,3],
			[1,4,0],
			[1,6,1],
			[1,7,2],
			[1,5,3],
			[2,4,0],
			[2,0,1],
			[2,1,2],
			[2,5,3],
			[3,6,0],
			[3,2,1],
			[3,3,2],
			[3,7,3],
			[4,4,0],
			[4,0,1],
			[4,2,2],
			[4,6,3],
			[5,1,0],
			[5,5,1],
			[5,7,2],
			[5,3,3],
		];
		
		geometry.polyNormals.push(new Vector3(-1,  0,  0));
		geometry.polyNormals.push(new Vector3(+1,  0,  0));
		geometry.polyNormals.push(new Vector3( 0,  0, -1));
		geometry.polyNormals.push(new Vector3( 0,  0, +1));
		geometry.polyNormals.push(new Vector3( 0, -1,  0));
		geometry.polyNormals.push(new Vector3( 0, +1,  0));
		
		geometry.uvSet.makePviDict();
		
		return geometry;
	}
	static Cylinder(segments: number, length: number, radius: number): Geometry {
		
		// the length of the cylinder is along the y axis, and the circular part is x-z
		
		// obsolete: the cylinder goes from y=0 to y=1, and the radius is 1
		// obsolete: nVertices = segments * 2 + 2
		// obsolete: nPolygons = segments * 3
		
		var geometry = new Geometry();
		geometry.label = 'cylinder';
		
		// for our purposes, a hollow cylinder is okay
		// the cylinder goes from y=0 to y=length
		// nVertices = segments * 2
		// nPolygons = segments
		
		// the two center points at top and bottom
		//geometry.vertices.push({ coordinates : {x:0,y:0,z:0} , Normal : new Vector3(0, 0, 0) });
		//geometry.vertices.push({ coordinates : {x:0,y:1,z:0} , Normal : new Vector3(0, 0, 0) });
		
		geometry.vertices = [];
		geometry.vertexNormals = [];
		
		for (var y = 0; y < 2; y++)
		{
			for (var i = 0; i < segments; i++)
			{
				var angleRad = i / segments * 2 * Math.PI;
				
				var vx = radius * Math.cos(angleRad);
				var vy = y * length; // meaning, either 0 or length
				var vz = radius * Math.sin(angleRad);
				geometry.vertices.push(new Vertex(vx, vy, vz));
				geometry.vertexNormals.push(new Vector3(vx, 0, vz).normalize());
			}
		}
		
		// the triangles around the top and bottom - spokes radiating out from the center
		//for (var y = 0; y < 2; y++)
		//{
		//	for (var i = 0; i < segments; i++)
		//	{
		//		var a = (i + 0) % segments;
		//		var b = (i + 1) % segments;
		//		
		//		var va = y;
		//		var vb = 2 + y * segments + a;
		//		var vc = 2 + y * segments + b;
		//		geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, va, vb, vc));
		//	}
		//}
		
		var capPoints = 0; // this is 2 if we have caps on the cylinders, and 0 if the cylinder is hollow
		
		// the rectangles along the sides
		for (var i = 0; i < segments; i++)
		{
			var a = (i + 0) % segments;
			var b = (i + 1) % segments;
			
			var va = capPoints + 0 * segments + a;
			var vb = capPoints + 0 * segments + b;
			var vc = capPoints + 1 * segments + b;
			var vd = capPoints + 1 * segments + a;
			geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, va, vb, vc, vd));
		}
		
		for (var y = 0; y < 2; y++)
		{
			for (var i = 0; i < segments; i++)
			{
				geometry.uvSet.uvs.push([i/segments,y]);
			}
		}
		
		geometry.uvSet.uvs.push([1,0]);
		geometry.uvSet.uvs.push([1,1]);
		
		geometry.uvSet.pvi.push([segments - 1, 0 * segments, 2 * segments + 0]);
		geometry.uvSet.pvi.push([segments - 1, 1 * segments, 2 * segments + 1]);
		
		geometry.uvSet.makePviDict();
		
		return geometry;
	}
	static Sphere(nHemiLatitudeLines: number, nHemiLongitudeLines: number): Geometry {
		//
		//var lats = nHemiLatitudeLines * 2 + 1;
		//var longs = nHemiLongitudeLines * 2;
		//
		//var vertices = 2 + lats * longs;
		//
		//var radius = 1;
		//
		//var polygons = [];
		//var points = [];
		//var northPole = {coordinates:{x:0,z:0,y:+radius},Normal:new Vector3(0, 0, 0)};
		//var southPole = {coordinates:{x:0,z:0,y:-radius},Normal:new Vector3(0, 0, 0)};
		//points.push(northPole);
		//points.push(southPole);
		//
		//var pointMatrix = {};
		//for (var i = -nHemiLatitudeLines; i <= nHemiLatitudeLines; i++) { pointMatrix[i] = []; }
		//
		//// points on the equator
		//for (var j = 0; j < longs; j++)
		//{
		//	var theta = j / longs * Math.PI * 2;
		//	var x = Math.cos(theta);
		//	var y = 0;
		//	var z = Math.sin(theta);
		//	var vertex = new Vertex(x, y, z);
		//	vertex.normal = new Vector3(x, y, z).normalized();
		//	points.push(vertex);
		//	pointMatrix[0].push(vertex);
		//}
		//
		//for (var i = 1; i <= nHemiLatitudeLines; i++)
		//{
		//	for (var k = -1; k <= 1; k += 2) // north or south latitude
		//	{
		//		for (var j = 0; j < longs; j++)
		//		{
		//			var theta = j / longs * Math.PI * 2;
		//			var phi = i / (nHemiLatitudeLines + 1) * k * Math.PI / 2; // 1/2 or 1/3,2/3 or 1/4,2/4,3/4, etc.
		//			
		//			var x = radius * Math.cos(theta) * Math.cos(phi);
		//			var z = radius * Math.sin(theta) * Math.cos(phi);
		//			var y = radius * Math.sin(phi);
		//			var vertex = new Vertex(x, y, z);
		//			vertex.normal = new Vector3(x, y, z).normalized();
		//			points.push(vertex);
		//			pointMatrix[i * k].push(vertex);
		//		}
		//	}
		//}
		//
		//for (var i = -nHemiLatitudeLines; i <= nHemiLatitudeLines; i++)
		//{
		//	for (var j = 0; j < pointMatrix[i].length; j++)
		//	{
		//		// latitude segments
		//		var polygon = new Polygon();
		//		polygon.vertices.push(pointMatrix[i][j]);
		//		polygon.vertices.push(pointMatrix[i][(j+1) % pointMatrix[i].length]);
		//		polygons.push(polygon);
		//		
		//		// longitude segments - a point connects with the point to its north
		//		var polygon = new Polygon();
		//		polygon.vertices.push(pointMatrix[i][j]);
		//		
		//		if (!pointMatrix[i + 1])
		//		{
		//			polygon.vertices.push(northPole);
		//		}
		//		else
		//		{
		//			polygon.vertices.push(pointMatrix[i+1][j]);
		//		}
		//		
		//		polygons.push(polygon);
		//	}
		//}
		//
		//// now connect the south pole to the lowest points
		//for (var j = 0; j < longs; j++)
		//{
		//	var polygon = new Polygon();
		//	polygon.vertices.push(southPole);
		//	polygon.vertices.push(pointMatrix[-nHemiLatitudeLines][j]);
		//	polygons.push(polygon);
		//}
		//
		//var geometry = new Geometry();
		//
		//geometry.vertices = points;
		//geometry.polygons = polygons;
		//
		//return geometry;
		return null;
	}
}
export class Vertex {
	
	coordinates: Vector3; // relative to the geometry
	worldCoordinates: Vector3; // absolute
	normal: Vector3;
	
	textureCoordinates: Vector2 = null;
	
	projection: Vector3 = null;
	projectedWorldCoordinates: Vector3 = null;
	projectedNormal: Vector3 = null;
	
	color: Color4 = null; // mostly for 3D scatter plots
	
	index: number; // index into geometry.vertices
	
	cameraVector: Vector3 = null;
	lightVectors: Vector3[] = []; // perhaps this should be a sparse dictionary - for situations where most lights are culled
	
	constructor(x: number, y: number, z: number) {
		
		this.coordinates = new Vector3(x, y, z);
		this.normal = new Vector3(0, 0, 0);
		this.worldCoordinates = new Vector3(0, 0, 0);
	}
	project(transformMatrix: Matrix, worldMatrix: Matrix) {
		
		this.projection = Vector3.TransformCoordinates(this.coordinates, transformMatrix);
		this.projectedWorldCoordinates = Vector3.TransformCoordinates(this.coordinates, worldMatrix);
		this.projectedNormal = Vector3.TransformCoordinates(this.normal, worldMatrix);
	}
}
export class Polygon {
	
	vertices: Vertex[] = [];
	uvs: Vector2[] = null; // if uvs is null, the polygon gets its uv's from the underlying vertices
	normal: Vector3 = null;
	
	group: number = 0;
	materialGroup: number = 0;
	
	constructor() {
		
	}
	static Make(vertices: Vertex[], group: number, materialGroup: number, ...indices: number[]): Polygon {
		var polygon = new Polygon();
		polygon.group = group;
		polygon.materialGroup = materialGroup;
		for (var k = 0; k < indices.length; k++) { polygon.vertices.push(vertices[indices[k]]); }
		return polygon;
	}
}
export class Geometry {
	
	id: string;
	name: string = 'geometry';
	label: string = 'geometry'; // some parts of the code use id, some use name.  in general, id should be unique, name should be readable
	
	type: string = 'polygon_mesh'; // polygon_mesh or subdivision_surface
	
	vertices: Vertex[] = [];
	polygons: Polygon[] = [];
	
	polygon_groups: string[] = [ 'Default' ];
	polygon_material_groups: string[] = [ 'Default' ];
	
	matrix: Matrix;
	scale: Vector3;
	position: Vector3;
	rotation: Vector3;
	
	polyNormals: Vector3[] = [];
	vertexNormals: Vector3[] = [];
	uvSet: UvSet = null;
	
	constructor() {
		this.id = GenerateId(this);
		this.uvSet = new UvSet();
	}
	computeFacesNormals(): void {
		
		// this calculates polygon normals from vertex normals
		
		for (var i = 0; i < this.polygons.length; i++)
		{
			var poly = this.polygons[i];
			
			// assumption of triangle
			var va = poly.vertices[0];
			var vb = poly.vertices[1];
			var vc = poly.vertices[2];
			
			poly.normal = (va.normal.add(vb.normal.add(vc.normal))).scale(1 / 3).normalize();
		}
	}
	calculateNormals(): void {
		
		// this calculates polygon normals denovo using a cross product of polygon edges
		
		this.polyNormals = [];
		
		for (var i = 0; i < this.polygons.length; i++)
		{
			var poly = this.polygons[i];
			
			if (!poly.normal)
			{
				var vertices = [];
				
				for (var k = 2; k < poly.vertices.length; k++)
				{
					vertices.push(poly.vertices[k]);
				}
				
				var a = vertices[0];
				var b = vertices[1];
				var c = vertices[2];
				var ab = new Vector3(b.coordinates.x - a.coordinates.x, b.coordinates.y - a.coordinates.y, b.coordinates.z - a.coordinates.z);
				var ac = new Vector3(c.coordinates.x - a.coordinates.x, c.coordinates.y - a.coordinates.y, c.coordinates.z - a.coordinates.z);
				
				// it appears that the vertices are ordered such that this cross product vector points outward from the mesh, like we want
				var cross = Vector3.Cross(ab, ac);
				cross.normalize();
				
				poly.normal = cross;
				this.polyNormals.push(cross);
			}
		}
	}
	centroid(): Vector3 {
		
		// this requires that this.worldMatrix be set
		// also this assumes that the transform of the centroid (which is what we calculate) is equal to the centroid of the transform (which is what we want)
		
		var xsum = 0;
		var ysum = 0;
		var zsum = 0;
		
		var n = this.vertices.length;
		
		for (var i = 0; i < n; i++)
		{
			xsum += this.vertices[i].coordinates.x;
			ysum += this.vertices[i].coordinates.y;
			zsum += this.vertices[i].coordinates.z;
		}
		
		var p = new Vector3(xsum / n, ysum / n, zsum / n);
		var q = this.matrix ? Vector3.TransformCoordinates(p, this.matrix) : p;
		
		return q;
	}
	exportToDaz(): any {
		
		var json: any = {};
		json.id = this.id;
		json.name = this.name;
		json.label = this.label;
		json.type = this.type;
		json.vertices = { values : this.vertices , count : this.vertices.length }; // [ [ x , y , z ] ]
		json.polylist = { values : this.polygons , count : this.polygons.length }; // [ [ groupIndex, materialGroupIndex, a, b, c, d ] ]
		json.polygon_groups = { count : this.polygon_groups.length , values : this.polygon_groups };
		json.polygon_material_groups = { count : this.polygon_material_groups.length , values : this.polygon_material_groups };
		json.default_uv_set = '#' + this.uvSet.id;
		
		json.extra = [ {
			type : "studio_geometry_channels",
			channels : [
				{channel : {id : "SubDIALevel",type : "int",name : "SubDIALevel",label : "SubDivision Level",visible : false,value : 1,current_value : 1,min : 0,max : 2,clamped : true,step_size : 1},group : "/General/Mesh Resolution"},
				{channel : {id : "SubDAlgorithmControl",type : "enum",name : "SubDAlgorithmControl",label : "SubDivision Algorithm",visible : false,value : 0,current_value : 0,enum_values : [ "Catmark", "Bilinear", "Loop", "Catmull-Clark (Legacy)" ]},group : "/General/Mesh Resolution"},
				{channel : {id : "SubDEdgeInterpolateLevel",type : "enum",name : "SubDEdgeInterpolateLevel",label : "Edge Interpolation",visible : false,value : 2,current_value : 2,enum_values : [ "Soft Corners And Edges", "Sharp Edges and Corners", "Sharp Edges" ]},group : "/General/Mesh Resolution"}
		] } ];
		
		return json;
	}
	exportToThreeJs(): any {
		
		return null;
		// this needs to be reworked to convert from Vertex -> index
		
		//var geometry = new THREE.Geometry();
		//
		//for (var i = 0; i < this.vertices.length; i++)
		//{
		//	geometry.vertices.push(new THREE.Vector3(this.vertices[i][0], this.vertices[i][1], this.vertices[i][2]));
		//}
		//
		//for (var i = 0; i < this.polygons.length; i++)
		//{
		//	if (this.polygons[i].vertices.length == 3)
		//	{
		//		geometry.faces.push(new THREE.Face3(this.polygons[i][2], this.polygons[i][3], this.polygons[i][4]));
		//	}
		//	else if (this.polygons[i].length == 4)
		//	{
		//		// Face3( a, b, c, normal, color, materialIndex )
		//		
		//		geometry.faces.push(new THREE.Face3(this.polygons[i][2], this.polygons[i][3], this.polygons[i][4]));
		//		geometry.faces.push(new THREE.Face3(this.polygons[i][2], this.polygons[i][4], this.polygons[i][5]));
		//		
		//		//geometry.faces.push(new THREE.Face4(this.polygons[i][2], this.polygons[i][3], this.polygons[i][4], this.polygons[i][5]));
		//	}
		//	else
		//	{
		//		throw new Error();
		//	}
		//}
		//
		//return geometry;
	}
	static ReadDaz(json: any): Geometry {
		
		var vertices = json.vertices.values; // [ [x,y,z] ]
		var polygons = json.polylist.values; // [ [polygonGroupIndex,polygonMaterialGroupIndex,vertexIndex0,vertexIndex1,vertexIndex2,vertexIndex3] ]
		
		var geometry = new Geometry();
		
		for (var i = 0; i < vertices.length; i++)
		{
			geometry.vertices.push(new Vertex(vertices[i][0], vertices[i][1], vertices[i][2]));
		}
		
		for (var i = 0; i < polygons.length; i++)
		{
			var polygon = new Polygon();
			polygon.group = polygons[i][0];
			polygon.materialGroup = polygons[i][1];
			
			for (var k = 2; k < polygons[i].length; k++)
			{
				polygon.vertices.push(geometry.vertices[polygons[i][k]]);
			}
			
			geometry.polygons.push(polygon);
		}
		
		return geometry;
	}
	static ReadObjFile(ls: string[]): Geometry {
		
		// Wavefront OBJ format
		// http://www.martinreddy.net/gfx/3d/OBJ.spec
		// http://en.wikipedia.org/wiki/Wavefront_.obj_file
		// http://meshlab.sourceforge.net/ - software for editing meshes
		
		var geometry = new Geometry();
		var uv = geometry.uvSet;
		
		var vertexNormalIndex = 0;
		
		for (var i = 0; i < ls.length; i++)
		{
			var l = ls[i].trim();
			
			if (l.length <= 1) { continue; }
		
			if (l.substr(0, 2) == "v ")
			{
				var vs = l.substring(2).split(' ').map(function(x) { return parseFloat(x); });;
				geometry.vertices.push(new Vertex(vs[0], vs[1], vs[2]));
			}
			else if (l.substr(0, 3) == "vt ")
			{
				var vts = l.substring(3).split(' ').map(function(x) { return parseFloat(x); });;
				uv.uvs.push([vts[0], vts[1]]);
			}
			else if (l.substr(0, 3) == "vn ")
			{
				// note that this code requires the vn line to come after the v line - probably going to be the case, but could fail
				var vns = l.substring(3).split(' ').map(function(x) { return parseFloat(x); });
				geometry.vertexNormals.push(new Vector3(vns[0], vns[1], vns[2]));
			}
			else if (l.substr(0, 2) == "f ")
			{
				// do nothing here - we do another pass below to read the faces
			}
			else if (l.substr(0, 7) == "usemtl ")
			{
				// use material
				// EX: usemtl PCBbar01
				//geometry.textureFile = l.Split()[1];
			}
			else if (l.substr(0, 2) == "s ")
			{
				// scale?
				// EX: s 0
				//geometry.s = l;
			}
			else if (l.substr(0, 2) == "o ")
			{
				// EX: o racketRH
			}
			else if (l.substr(0, 2) == "g\t")
			{
				// group?
				// EX: g\t\tFigure\t\t1
				//geometry.g = l;
			}
			else if (l.substr(0, 2) == "g ")
			{
		
			}
			else if (l.substr(0, 1) == "#")
			{
				// comment
			}
			else
			{
				throw new Error();
			}
		}
		
		for (var i = 0; i < ls.length; i++)
		{
			var l = ls[i].trim();
		
			if (l.substr(0, 2) == "f ")
			{
				// EX: f 2370/4 2369/1 965/2
				// these are 1-indexed
				// 3 vertices, first half (before the slash) is the index into the vertices
				// second half is the index into the vts (which i assume are uvs, but they're not in [0,1], so not sure
				
				// sometimes there are 3 parts of the slashes?
				// 123/456/789
				// index into vertex normals?
				
				// t = [ [ 2370 , 4] , [ 2369 , 1 ] , [ 965 , 2 ] ]
				var t = l.substr(2).split(' ').map(function(x) { return x.split('/').map(function(s) { return parseInt(s); }); });
				geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, ...t.map(function(x) { return x[0]; })));
				
				for (var k = 0; k < t.length; k++)
				{
					if (t[k][0] != t[k][1])
					{
						uv.pvi.push([geometry.polygons.length-1, t[k][0], t[k][1]]);
					}
				}
			}
		}
		
		return geometry;
	}
}
export class UvSet {
	
	id: string;
	name: string = 'uv';
	label: string = 'uv';
	
	uvs: [number, number][] = [];
	pvi: [number, number, number][] = [];
	
	pviDict: any = null;
	
	constructor() {
		this.id = GenerateId(this);
	}
	makePviDict(): void {
		
		var d = {};
		
		for (var i = 0; i < this.pvi.length; i++)
		{
			var polygonIndex = this.pvi[i][0];
			var vertexIndex = this.pvi[i][1];
			var uvIndex = this.pvi[i][2];
			
			// why are we pushing a 2-list rather than a dict like below?
			if (!d[polygonIndex]) { d[polygonIndex] = []; }
			d[polygonIndex].push([vertexIndex, uvIndex]);
			
			//if (!d[polygonIndex]) { d[polygonIndex] = {}; }
			//d[polygonIndex][vertexIndex] = uvIndex;
		}
		
		this.pviDict = d;
	}
	exportToDaz(): any {
		
		var json: any = {};
		json.id = this.id;
		json.name = this.name;
		json.label = this.label;
		json.vertex_count = this.uvs.length;
		json.uvs = { count : this.uvs.length , values : this.uvs };
		json.polygon_vertex_indices = this.pvi;
		return json;
	}
	static ReadDaz(json: any): UvSet {
		
		var uv = new UvSet();
		uv.id = json.id;
		uv.name = json.name;
		uv.label = json.label;
		uv.uvs = json.uvs.values; // [ [u,v] ]
		uv.pvi = json.polygon_vertex_indices; // [ [polygonIndex,vertexIndex,uvIndex] ]
		
		// make the pvi dict?
		
		uv.makePviDict();
		
		return uv;
	}
}
export class Bone {
	
	id: string; // GenerateId() - a randomly-generated globally unique id would probably work here, to save us from mucking around with uniqueness
	url: string = null; // used for node instances i think - refers to the node library
	name: string = 'node';
	label: string = 'node'; // this is the thing that we can muck around with - the human-readable name
	
	type: string = 'node'; // node, figure, bone, light, camera
	
	source: string = null; // A string representing the URI of the node asset that this node asset was derived from.
	parent: Bone = null; // A string representing the URI of the parent node definition. Parents must appear above children in the file.
	
	// you can have both geometries and children, right?  like think the bones of a g2f - they have both
	
	children: Bone[] = []; // [ Bone ]
	
	// before, i stored Light/Camera in geometries above, which isn't a terrible idea but also possibly unnecessarily confusing
	geometry: Geometry = null; // Geometry/Mesh or Light or Camera
	light: Light = null; // if the Bone is a light, store the Light object here
	camera: Camera = null; // if the Bone is a camera, store the Camera object here
	
	materials: Material[] = []; // Material
	
	// i think since tiling depends on size it should be dealt with here in Bone, but DAZ disagrees
	//this.uvs = [ { uvset : null , hOffset : 0 , vOffset : 0 , hTiles : 1 , vTiles : 1 } ];
	
	// here's another ambiguity: a 'vector' is defined in math class to be direction and magnitude
	// the origin is not assumed to be relevant
	// but in applications, the origin is frequently relevant, and magnitude is often not important
	// so what do we call the 6-tuple that holds an origin and a unit direction?
	
	transforms: any[] = []; // rotation of angle about a given vector (with origin and unit direction) should be a primitive
	matrix: Matrix = null; // Matrix - matrixes are multiplied from the top down and cached here
	// perhaps 'matrix' should be renamed 'worldMatrix', since we are also caching 'transformMatrix' in the mesh object once it is calculated
	worldView: Matrix = null;
	transformMatrix: Matrix = null;
	
	
	// this is how DAZ does it.  surely there is a way to reconcile this with the vision above
	// but it might require decomposition of the matrix into separate translation, rotation, scale components
	// and i don't know how to do that or even if it is always possible
	transform: any = {translation:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
	
	//projectedVertexes: Vertex[] = null;
	
	rotation_order: string = 'XYZ';
	inherits_scale: boolean = true; // A boolean value indicating whether or not the immediate parent node's local scale is compensated for when calculating this node's world space transform. If false, this node's world space transform is multiplied by the inverse of parent node's local scale.
	
	// these appear to be derived values (hence visible:false), and it doesn't break anything if we just leave these default values in place
	// we might even be able to just not add these fields at all and let daz generate them
	center_point: any[] = [
	{id:"x",type:"float",name:"xOrigin",label:"X Origin",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01},
	{id:"y",type:"float",name:"yOrigin",label:"Y Origin",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01},
	{id:"z",type:"float",name:"zOrigin",label:"Z Origin",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01}];
	end_point: any[] = [
	{id:"x",type:"float",name:"xEnd",label:"X End",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01},
	{id:"y",type:"float",name:"yEnd",label:"Y End",visible:false,value:1,current_value:1,min:-10000,max:10000,step_size:0.01},
	{id:"z",type:"float",name:"zEnd",label:"Z End",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01}];
	orientation: any[] = [
	{id:"x",type:"float",name:"xOrientation",label:"X Orientation",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01},
	{id:"y",type:"float",name:"yOrientation",label:"Y Orientation",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01},
	{id:"z",type:"float",name:"zOrientation",label:"Z Orientation",visible:false,value:0,current_value:0,min:-10000,max:10000,step_size:0.01}];
	
	rotation: any[] = [
	{id:"x",type:"float",name:"XRotate",label:"X Rotate",value:0,current_value:0,min:-10000,max:10000,step_size:0.5},
	{id:"y",type:"float",name:"YRotate",label:"Y Rotate",value:0,current_value:0,min:-10000,max:10000,step_size:0.5},
	{id:"z",type:"float",name:"ZRotate",label:"Z Rotate",value:0,current_value:0,min:-10000,max:10000,step_size:0.5}];
	translation: any[] = [
	{id:"x",type:"float",name:"XTranslate",label:"X Translate",value:0,current_value:0,min:-10000,max:10000,step_size:1},
	{id:"y",type:"float",name:"YTranslate",label:"Y Translate",value:0,current_value:0,min:-10000,max:10000,step_size:1},
	{id:"z",type:"float",name:"ZTranslate",label:"Z Translate",value:0,current_value:0,min:-10000,max:10000,step_size:1}];
	scale: any[] = [
	{id:"x",type:"float",name:"XScale",label:"X Scale",value:1,current_value:1,min:-10000,max:10000,display_as_percent:true,step_size:0.005},
	{id:"y",type:"float",name:"YScale",label:"Y Scale",value:1,current_value:1,min:-10000,max:10000,display_as_percent:true,step_size:0.005},
	{id:"z",type:"float",name:"ZScale",label:"Z Scale",value:1,current_value:1,min:-10000,max:10000,display_as_percent:true,step_size:0.005}];
	general_scale: any = 
	{id:"general_scale",type:"float",name:"Scale",label:"Scale",value:1,current_value:1,min:-10000,max:10000,display_as_percent:true,step_size:0.005};
	
	extra: any[] = [ {
		type : "studio_node_channels",
		channels : [
			{channel:{id:"Point At",type:"numeric_node",name:"Point At",label:"Point At",value:1,current_value:1,min:0,max:1,clamped:true,step_size:0.01,needs_node:true,node:null},group:"/General/Misc"},
			{channel:{id:"Renderable",type:"bool",name:"Renderable",label:"Visible in Render",value:true,current_value:true},group:"/Display/Rendering"},
			// also visible:false below, for lights and presumably cameras?  intangible objects that don't cast shadows.  can this be omitted?
			{channel:{id:"Cast Shadows",type:"bool",name:"Cast Shadows",label:"Cast Shadows",value:true,current_value:true},group:"/Display/Rendering"},
			{channel:{id:"Render Priority",type:"enum",name:"Render Priority",label:"Render Priority",visible:false,value:3,current_value:3,enum_values:[ "Lowest", "Low", "Below Normal", "Normal", "Above Normal", "High", "Highest" ]},group:"/Display/Rendering"},
			{channel:{id:"Visible",type:"bool",name:"Visible",label:"Visible",value:true,current_value:true},group:"/Display/Scene View"},
			{channel:{id:"Selectable",type:"bool",name:"Selectable",label:"Selectable",value:true,current_value:true},group:"/Display/Scene View"}
		]
	} ];
	
	constructor() {
		this.id = GenerateId(this);
	}
	SetParent(parent: Bone): void {
		this.parent = parent;
		parent.children.push(this);
	}
	Leaves(): Bone[] {
		
		var list = [];
		
		if (this.geometry)
		{
			list.push(this);
		}
		
		if (this.children)
		{
			for (var i = 0; i < this.children.length; i++)
			{
				list = list.concat(this.children[i].Leaves());
			}
		}
		
		return list;
	}
	Descendants(): Bone[] {
		
		// Descendants() collects Bone objects, whereas Leaves() collects Mesh objects
		
		var list = [];
		list.push(this);
		
		if (this.children)
		{
			for (var i = 0; i < this.children.length; i++)
			{
				list = list.concat(this.children[i].Descendants());
			}
		}
		
		return list;
	}
	Multiply(parentMatrix: Matrix): void {
		
		// to calculate the whole scene, we do root.Multiply(identityMatrix)
		
		this.matrix = parentMatrix;
		
		for (var i = 0; i < this.transforms.length; i++)
		{
			this.matrix = this.matrix.multiply(this.transforms[i]);
		}
		
		if (this.children)
		{
			for (var i = 0; i < this.children.length; i++)
			{
				this.children[i].Multiply(this.matrix);
			}
		}
	}
	createInstance(): any {
		
		var json: any = {};
		json.id = GenerateId(json);
		json.url = '#' + this.id;
		json.name = this.name;
		json.label = this.label;
		return json;
	}
	exportToDaz(): any {
		
		var json: any = {};
		json.type = this.type;
		json.id = this.id;
		if (this.url) { json.url = this.url; } // '#' + nodelib.id - link to the node library
		json.name = this.name;
		json.label = this.label;
		
		if (this.parent) { json.parent = '#' + this.parent.id; } // the parent id must be generated before this, which isn't great
		
		json.rotation_order = this.rotation_order;
		json.inherits_scale = this.inherits_scale;
		json.center_point = this.center_point;
		json.end_point = this.end_point;
		json.orientation = this.orientation;
		json.rotation = this.rotation;
		json.translation = this.translation;
		json.scale = this.scale;
		json.general_scale = this.general_scale;
		
		//json.presentation = {type:'Prop',label:'',description:'',icon_large:'',colors:[[0.3529412,0.3529412,0.3529412],[1,1,1]]};
		
		json.extra = this.extra;
		
		if (this.children.length > 1)
		{
			json.extra.push({type:"studio/node/group_node"});
		}
		
		json.geometries = [];
		
		var geos = [ this.geometry ]; // stopgap until we migrate from Bone.geometry to Bone.geometries
		for (var i = 0; i < geos.length; i++)
		{
			var geometry = geos[i];
			
			var geo: any = {};
			geo.id = GenerateId(geo);
			geo.url = '#' + geometry.id; // link to the geometry library
			geo.name = geometry.name;
			geo.label = geometry.label;
			geo.type = geometry.type;
			json.geometries.push(geo);
		}
		
		return json;
	}
	static ReadDaz(json: any): Bone {
		
		var node = new Bone();
		node.type = json.type; // are url and type mutually exclusive?
		node.id = json.id;
		node.url = json.url;
		node.name = json.name;
		node.label = json.label;
		
		if (json.type == 'light')
		{
			node.light = Light.ReadDaz(json);
		}
		else if (json.type == 'camera')
		{
			node.camera = Camera.ReadDaz(json);
		}
		
		// transformation stuff
		node.inherits_scale = json.inherits_scale;
		node.rotation_order = json.rotation_order;
		node.center_point = json.center_point;
		node.end_point = json.end_point;
		node.orientation = json.orientation;
		node.rotation = json.rotation;
		node.translation = json.translation;
		node.scale = json.scale;
		node.general_scale = json.general_scale;
		
		node.extra = json.extra;
		
		return node;
	}
}
export class Light {
	
	name: string = null;
	
	type = 'linear'; // 'linear_point_light', 'point', 'spot', 'directional'
	
	on: boolean = true;
	
	color: Color4;
	intensity: number = 1;
	
	position: Vector3;
	target: Bone = null; // spot and directional only
	direction: Vector3 = null; // spot and directional only, equal to target minus position
	
	shadowType: string = 'none'; // 'none' (what else?)
	castsShadows: boolean = false;
	shadowSoftness: number = 0;
	shadowBias: number = 1;
	falloffStart: number = 100; // linear and point only
	falloffEnd: number = 200; // linear and point only
	
	constructor(options?: any) {
		
		this.color = new Color4(1, 1, 1, 1);
		this.position = Vector3.Zero();
		
		if (options)
		{
			for (var key in options) 
			{
				this[key] = options[key];
			}
		}
	}
	createInstance(json: any): void {
		
	}
	exportToDaz(): any {
		
		// we seem to be getting a point light, not a linear point light.  must look into
		
		// scene.AddLight({id:'light1',type:'linear_point_light',transform:{translation:{x:0,y:0,z:0}}});
		
		// params.id
		// params.type = 'linear_point_light', (what else?)
		// params.transform = { rotation : {} , translation : {} , scale : {} }
		// params.color = [1, 1, 1]
		// params.intensity = 1
		// params.shadowType = 'none', (what else?)
		// params.shadowSoftness = 0
		// params.shadowBias = 1
		// params.on = true
		
		// light-specific fields (for a linear point light)
		var json: any = {};
		json.color = [ this.color.r , this.color.g , this.color.b ];
		json.point = {};
		json.point.intensity = (this.intensity !== undefined) ? this.intensity : 1;
		json.point.shadow_type = (this.shadowType !== undefined) ? this.shadowType : 'none';
		json.point.shadow_softness = (this.shadowSoftness !== undefined) ? this.shadowSoftness : 0;
		json.point.shadow_bias = (this.shadowBias !== undefined) ? this.shadowBias : 1;
		json.on = (this.on !== undefined) ? this.on : true;
		
		// was going to be used to shorten the lightExtra instantiation, but we decided it's more readable to have the names below, with the objects
		var ids = ['Shadow Type','Illumination','Color','Intensity','Shadow Color','Shadow Intensity','Shadow Softness','Shadow Bias','Display Persistence','Opacity','Falloff Start','Falloff End'];
		
		var lightExtra = [ 
			{channel:{id:"Shadow Type",type:"enum",name:"Shadow Type",label:"Shadow Type",value:0,current_value:0,"enum_values":[ "None", "Deep Shadow Map", "Raytraced (Software Only)" ]},group:"/Shadow"},
			{channel:{id:"Illumination",type:"enum",name:"Illumination",label:"Illumination",value:3,current_value:3,"enum_values":[ "Off", "Diffuse Only", "Specular Only", "On" ]},group:"/Light"},
			{channel:{id:"Color",type:"color",name:"Color",label:"Color",value:[1,1,1],current_value:[1,1,1],min:0,max:1,clamped:true},group:"/Light"},
			{channel:{id:"Intensity",type:"float",name:"Intensity",label:"Intensity",value:1,current_value:1,min:0,max:2,clamped:true,display_as_percent:true,step_size:0.01},group:"/Light"},
			{channel:{id:"Shadow Color",type:"color",name:"Shadow Color",label:"Shadow Color",value:[0,0,0],current_value:[0,0,0],min:0,max:1,clamped:true},group:"/Shadow"},
			{channel:{id:"Shadow Intensity",type:"float",name:"Shadow Intensity",label:"Shadow Intensity",value:1,current_value:1,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01},group:"/Shadow"},
			{channel:{id:"Shadow Softness",type:"float",name:"Shadow Softness",label:"Shadow Softness",value:0,current_value:0,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01},group:"/Shadow"},
			{channel:{id:"Shadow Bias",type:"float",name:"Shadow Bias",label:"Shadow Bias",value:1,current_value:1,min:0.01,max:20,clamped:true,step_size:0.01},group:"/Shadow"},
			{channel:{id:"Display Persistence",type:"bool",name:"Display Persistence",label:"Display Persistence",value:false,current_value:false},group:"/Display/Scene View/Misc"},
			{channel:{id:"Opacity",type:"float",name:"Opacity",label:"Opacity",value:0.15,current_value:0.15,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01},group:"/Display/Scene View/Light Sphere"},
			{channel:{id:"Falloff Start",type:"float",name:"Falloff Start",label:"Falloff Start",value:33,current_value:33,min:0,max:5000,clamped:true,step_size:0.01},group:"/Light"},
			{channel:{id:"Falloff End",type:"float",name:"Falloff End",label:"Falloff End",value:100,current_value:100,min:1,max:5000,clamped:true,step_size:0.01},group:"/Light"}
		];
		
		json.extra = [];
		json.extra.push({ type : 'studio/node/light/' + this.type });
		json.extra = json.extra.concat([ {
			type : "studio_node_channels",
			channels : [
				{channel:{id:"Point At",type:"numeric_node",name:"Point At",label:"Point At",value:1,current_value:1,min:0,max:1,clamped:true,step_size:0.01,needs_node:true,node:null},group:"/General/Misc"},
				{channel:{id:"Renderable",type:"bool",name:"Renderable",label:"Visible in Render",value:true,current_value:true},group:"/Display/Rendering"},
				// also visible:false below, for lights and presumably cameras?  intangible objects that don't cast shadows.  can this be omitted?
				{channel:{id:"Cast Shadows",type:"bool",name:"Cast Shadows",label:"Cast Shadows",value:true,current_value:true},group:"/Display/Rendering"},
				{channel:{id:"Render Priority",type:"enum",name:"Render Priority",label:"Render Priority",visible:false,value:3,current_value:3,enum_values:[ "Lowest", "Low", "Below Normal", "Normal", "Above Normal", "High", "Highest" ]},group:"/Display/Rendering"},
				{channel:{id:"Visible",type:"bool",name:"Visible",label:"Visible",value:true,current_value:true},group:"/Display/Scene View"},
				{channel:{id:"Selectable",type:"bool",name:"Selectable",label:"Selectable",value:true,current_value:true},group:"/Display/Scene View"}
			]
		} ]);
		json.extra[1].channels = json.extra[1].channels.concat(lightExtra); // additions to the studio node channels
	}
	static ReadDaz(json: any): Light {
		
		var light = new Light();
		light.color = new Color4(json.color.r, json.color.g, json.color.b, 1);
		if (json.point) { light.type = 'point'; }
		// light.point.intensity
		// light.point.shadow_type - none, raytraced
		// light.point.shadow_softness
		// light.point.shadow_bias
		light.on = json.on;
		return light;
	}
}
export class Camera {
	
	position: Vector3 = null;
	target: Vector3;
	
	focalLength: number = 0;
	fieldOfView: number = 0.5; // field of view in the y direction, in radians.
	
	znear: number = 0.01;
	zfar: number = 1;
	
	constructor() {
		
		this.target = Vector3.Zero();
	}
	createInstance(json: any): void {
		
	}
	exportToDaz(): any {
		
		var json: any = {};
		json.perspective = {};
		json.perspective.znear = 5;
		json.perspective.zfar = 4000;
		json.perspective.yfov = 0.5403064;
		json.perspective.focal_length = 65;
		json.perspective.depth_of_field = false;
		json.perspective.focal_distance = 408.543;
		json.perspective.fstop = 22;
		
		var boolExtras = [];
		boolExtras.push({id:'Perspective',value:true,group:'/Camera'});
		boolExtras.push({id:'DOF',value:false,group:'/Camera'}); // label:"Depth of Field"
		boolExtras.push({id:'Local Dimensions',value:false,group:'/Dimensions'}); // label:"Use Local Dimensions"
		boolExtras.push({id:'Constrain Proportions',value:true,group:'/Dimensions'}); // visible:false
		boolExtras.push({id:'Display Persistence',value:false,group:'/Display/Scene View/Misc'});
		boolExtras.push({id:'DOF Plane Visibility',value:true,group:'/Display/Scene View/Depth Of Field'});
		boolExtras.push({id:'Near DOF Plane Visibility',value:false,group:'/Display/Camera View/Depth Of Field'});
		boolExtras.push({id:'Far DOF Plane Visibility',value:false,group:'/Display/Camera View/Depth Of Field'});
		
		var floatExtras = [];
		floatExtras.push({id:'Frame Width',value:36,group:'/Camera'}); // label:'Frame Width (mm)'
		floatExtras.push({id:'Focal Length',value:65,group:'/Camera'}); // label:'Focal Length (mm)'
		floatExtras.push({id:'Depth of Field',value:450,group:'/Camera'}); // label:'Focal Distance', "current_value" : 408.543,
		floatExtras.push({id:'Aperature',value:22,group:'/Camera'}); // label:'F/Stop'
		
		var cameraExtras = [];
		
		for (var i = 0; i < boolExtras.length; i++)
		{
			var x = boolExtras[i];
			
			var o: {channel?: any; group?: any} = {};
			o.channel = {};
			o.channel.id = x.id;
			o.channel.type = 'bool';
			o.channel.name = x.id;
			o.channel.label = x.id;
			o.channel.value = x.value;
			o.channel.current_value = x.value;
			o.group = x.group;
			
			cameraExtras.push(o);
		}
		
		for (var i = 0; i < floatExtras.length; i++)
		{
			var x = floatExtras[i];
			
			var o: {channel?: any; group?: any} = {};
			o.channel = {};
			o.channel.id = x.id;
			o.channel.type = 'float';
			o.channel.name = x.id;
			o.channel.label = x.id;
			o.channel.value = x.value;
			o.channel.current_value = x.value;
			o.channel.min = -10000;
			o.channel.max = 10000;
			o.channel.step_size = 1;
			o.group = x.group;
			
			cameraExtras.push(o);
		}
		
		cameraExtras.push({"channel":{"id" : "Dimension Preset","type" : "string","name" : "Dimension Preset","label" : "Dimension Preset","visible" : false,"value" : "","current_value" : ""},"group" : "/Dimensions"});
		
		cameraExtras = cameraExtras.concat([
			{channel:{id:"Pixel Size",type:"int2",name:"Pixel Size",label:"Pixel Size",visible:false,value:[ 1800, 1200 ],current_value:[ 1800, 1200 ],min:1,max:10000,clamped:true,step_size:1},group:"/Dimensions"},
			{channel:{id:"Aspect Ratio",type:"float2",name:"Aspect Ratio",label:"Aspect Ratio",visible:false,value:[ 3, 2 ],current_value:[ 3, 2 ],min:0.0001,max:10000,clamped:true,step_size:1},group:"/Dimensions"},
			{channel:{id:"Sight Line Opacity",type:"float",name:"Sight Line Opacity",label:"Sight Line Opacity",value:0.3,current_value:0.3,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01},group:"/Display/Scene View/Line of Sight"},
			{channel:{id:"Focal Point Scale",type:"float",name:"Focal Point Scale",label:"Focal Point Scale",value:1,current_value:1,min:0,max:2,clamped:true,display_as_percent:true,step_size:0.01},group:"/Display/Scene View/Line of Sight"},
			{channel:{id:"DOF Overlay Opacity",type:"float",name:"DOF Overlay Opacity",label:"DOF Overlay Opacity",value:0.05,current_value:0.05,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01},group:"/Display/Camera View/Depth Of Field"},
			{channel:{id:"FOV Opacity",type:"float",name:"FOV Opacity",label:"FOV Opacity",value:0.3,current_value:0.3,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01},group:"/Display/Scene View/Field of View"},
			{channel:{id:"FOV Length",type:"float",name:"FOV Length",label:"FOV Length",value:5,current_value:5,min:0,max:100,clamped:true,step_size:0.1},group:"/Display/Scene View/Field of View"},
			{channel:{id:"FOV Color",type:"color",name:"FOV Color",label:"FOV Color",value:[ 1, 1, 1 ],current_value:[ 1, 1, 1 ],min:0,max:1,clamped:true},group:"/Display/Scene View/Field of View"},
			{channel:{id:"DOF Plane Color",type:"color",name:"DOF Plane Color",label:"DOF Plane Color",value:[ 1, 1, 1 ],current_value:[ 1, 1, 1 ],min:0,max:1,clamped:true},group:"/Display/Scene View/Depth Of Field"},
			{channel:{id:"DOF Overlay Color",type:"color",name:"DOF Overlay Color",label:"DOF Overlay Color",value:[ 1, 1, 1 ],current_value:[ 1, 1, 1 ],min:0,max:1,clamped:true},group:"/Display/Camera View/Depth Of Field"}
		]);
		
		json.extra = [ {
			type : "studio_node_channels",
			channels : [
				{channel:{id:"Point At",type:"numeric_node",name:"Point At",label:"Point At",value:1,current_value:1,min:0,max:1,clamped:true,step_size:0.01,needs_node:true,node:null},group:"/General/Misc"},
				{channel:{id:"Renderable",type:"bool",name:"Renderable",label:"Visible in Render",value:true,current_value:true},group:"/Display/Rendering"},
				// also visible:false below, for lights and presumably cameras?  intangible objects that don't cast shadows.  can this be omitted?
				{channel:{id:"Cast Shadows",type:"bool",name:"Cast Shadows",label:"Cast Shadows",value:true,current_value:true},group:"/Display/Rendering"},
				{channel:{id:"Render Priority",type:"enum",name:"Render Priority",label:"Render Priority",visible:false,value:3,current_value:3,enum_values:[ "Lowest", "Low", "Below Normal", "Normal", "Above Normal", "High", "Highest" ]},group:"/Display/Rendering"},
				{channel:{id:"Visible",type:"bool",name:"Visible",label:"Visible",value:true,current_value:true},group:"/Display/Scene View"},
				{channel:{id:"Selectable",type:"bool",name:"Selectable",label:"Selectable",value:true,current_value:true},group:"/Display/Scene View"}
			]
		} ];
		json.extra.channels = json.extra.channels.concat(cameraExtras); // additions to the studio node channels
	}
	static ReadDaz(json: any): Camera {
		
		var camera = new Camera();
		
		return camera;
	}
}
export class Channel {
	
	id: string;
	type: string;
	name: string;
	label: string;
	
	// these might need to be generics
	value: number;
	current_value: number;
	min?: number;
	max?: number;
	step_size?: number;
	
	visible?: boolean;
	display_as_percent?: boolean;
	clamped?: boolean;
	default_image_gamma?: boolean;
	mappable?: boolean;
	
	// maybe this will be useful, maybe not
	constructor() {
		
		
	}
	exportToDaz(): void {
		
	}
	static ReadDaz(json: any): Channel {
		
		var channel = new Channel();
		channel.id = json.id;
		channel.type = json.type;
		channel.name = json.name;
		channel.label = json.label;
		channel.visible = json.visible;
		channel.value = json.value;
		channel.current_value = json.current_value;
		channel.min = json.min;
		channel.max = json.max;
		channel.step_size = json.step_size;
		if (json.clamped) { channel.clamped = json.clamped; }
		if (json.default_image_gamma) { channel.default_image_gamma = json.default_image_gamma; }
		if (json.mappable) { channel.mappable = json.mappable; }
		if (json.display_as_percent) { channel.display_as_percent = json.display_as_percent; }
		return channel;
	}
}
export class Material {
	
	type: string = 'plastic'; // glass, metal, plastic, skin - a hint for the receiving application about what type of shader to use
	
	id: string = GenerateId(this);
	name: string = 'material';
	label: string = 'material';
	
	source: string = null; // A string representing the URI of the material asset that this asset was derived from, if any.
	
	// used in library only
	uv_set: UvSet = null; // UvSet, converted to url upon export - the material library needs this, not the instance
	
	// used in instances only
	geometry: Geometry = null; // Geometry, converted to url upon export of instance
	groups: string[] = null; // [ "6_Eyelash" ]
	
	// these are the user-important values with the channel cruft removed
	// colorMap, strengthMap, and normalMap are image urls, e.g. '#foo'
	diffuse: any    = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
	specular: any   = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
	ambient: any    = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
	reflection: any = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
	refraction: any = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null , index : 0 };
	glossiness: any   = { strength : 1 , strengthMap : null };
	transparency: any = { strength : 1 , strengthMap : null };
	bump: any         = { strength : 0 , strengthMap : null , min : -0.01 , max : +0.01 };
	displacement: any = { strength : 0 , strengthMap : null , min : -0.10 , max : +0.10 };
	normalMap: any = null;
	uv: any = { hOffset : 0 , vOffset : 0 , hTiles : 1 , vTiles : 1 };
	
	constructor() {
		
	}
	load(json: any): void {
		
		for (var key in json)
		{
			for (var key2 in json[key])
			{
				this[key][key2] = json[key][key2];
			}
		}
	}
	exportToDaz(): any {
		
		// is this more createInstance instead?
		
		// image_file : "/C%3A/Users/adam/Desktop/daz2/sky.jpg" - can be used in place of image
		
		// so, because the full material channel contains a lot of cruft that remains constant - all the display_as_percent stuff - 
		// it does sort of make sense to let instance overrides do most of the work.  overrides need only include basics like id, type, name, current_value
		
		// which means that the exportToDaz function need only return the big default material library
		// as far as i can tell, the only thing that really needs to vary between different material library objects is the uv_set
		// so that means that the material lib joins the geometry lib and the uv_set lib to make a triplet
		
		// geometry -> uv_set
		// material -> uv_set
		// material_instance -> material
		// geometry_instance -> geometry
		// material_instance -> geometry_instance
		// node_instance contains geometry_instance
		// node_instance -> node
		// node -> ??
		
		var json = {
		type : this.type,
		id : this.id,
		uv_set : this.uv_set.id,
		diffuse:{channel:{id:"diffuse",type:"color",name:"Diffuse Color",label:"Diffuse Color",value:[ 1, 1, 1 ],current_value:[ 1, 1, 1 ],min:0,max:1,clamped:true,default_image_gamma:0,mappable:true},group:"/Diffuse"},
		diffuse_strength:{channel:{id:"diffuse_strength",type:"float",name:"Diffuse Strength",label:"Diffuse Strength",value:1,current_value:1,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Diffuse"},
		specular:{channel:{id:"specular",type:"color",name:"Specular Color",label:"Specular Color",value:[ 0.6, 0.6, 0.6 ],current_value:[ 0.6, 0.6, 0.6 ],min:0,max:1,clamped:true,default_image_gamma:0,mappable:true},group:"/Specular"},
		specular_strength:{channel:{id:"specular_strength",type:"float",name:"Specular Strength",label:"Specular Strength",value:1,current_value:1,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Specular"},
		glossiness:{channel:{id:"glossiness",type:"float",name:"Glossiness",label:"Glossiness",value:1,current_value:1,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Specular"},
		ambient:{channel:{id:"ambient",type:"color",name:"Ambient Color",label:"Ambient Color",value:[ 0, 0, 0 ],current_value:[ 0, 0, 0 ],min:0,max:1,clamped:true,default_image_gamma:0,mappable:true},group:"/Ambient"},
		ambient_strength:{channel:{id:"ambient_strength",type:"float",name:"Ambient Strength",label:"Ambient Strength",value:1,current_value:1,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Ambient"},
		reflection:{channel:{id:"reflection",type:"color",name:"Reflection Color",label:"Reflection Color",value:[ 1, 1, 1 ],current_value:[ 1, 1, 1 ],min:0,max:1,clamped:true,default_image_gamma:0,mappable:true},group:"/Reflection"},
		reflection_strength:{channel:{id:"reflection_strength",type:"float",name:"Reflection Strength",label:"Reflection Strength",value:0,current_value:0,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Reflection"},
		refraction:{channel:{id:"refraction",type:"color",name:"Refraction Color",label:"Refraction Color",value:[ 1, 1, 1 ],current_value:[ 1, 1, 1 ],min:0,max:1,clamped:true,default_image_gamma:0,mappable:true},group:"/Refraction"},
		refraction_strength:{channel:{id:"refraction_strength",type:"float",name:"Refraction Strength",label:"Refraction Strength",value:0,current_value:0,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Refraction"},
		ior:{channel:{id:"ior",type:"float",name:"Index of Refraction",label:"Index of Refraction",value:0,current_value:0,min:0,max:10,clamped:true,step_size:0.01},group:"/Refraction"},
		bump:{channel:{id:"bump",type:"float",name:"Bump Strength",label:"Bump Strength",value:0,current_value:0,min:0,max:2,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true,invalid_without_map:true},group:"/Bump"},
		bump_min:{channel:{id:"bump_min",type:"float",name:"Negative Bump",label:"Negative Bump",value:-0.01,current_value:-0.01,min:-10000,max:10000,step_size:0.01},group:"/Bump"},
		bump_max:{channel:{id:"bump_max",type:"float",name:"Positive Bump",label:"Positive Bump",value:0.01,current_value:0.01,min:-10000,max:10000,step_size:0.01},group:"/Bump"},
		displacement:{channel:{id:"displacement",type:"float",name:"Displacement Strength",label:"Displacement Strength",value:0,current_value:0,min:0,max:2,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true,invalid_without_map:true},group:"/Displacement"},
		displacement_min:{channel:{id:"displacement_min",type:"float",name:"Minimum Displacement",label:"Minimum Displacement",value:-0.1,current_value:-0.1,min:-10000,max:10000,step_size:0.01},group:"/Displacement"},
		displacement_max:{channel:{id:"displacement_max",type:"float",name:"Maximum Displacement",label:"Maximum Displacement",value:0.1,current_value:0.1,min:-10000,max:10000,step_size:0.01},group:"/Displacement"},
		transparency:{channel:{id:"transparency",type:"float",name:"Opacity Strength",label:"Opacity Strength",value:1,current_value:1,min:0,max:1,clamped:true,display_as_percent:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Opacity"},
		normal:{channel:{id:"normal",type:"image",name:"Normal Map",label:"Normal Map",default_image_gamma:1},group:"/Normal Mapping"},
		u_offset:{channel:{id:"u_offset",type:"float",name:"Horizontal Offset",label:"Horizontal Offset",value:0,current_value:0,min:-10000,max:10000,step_size:0.01},group:"/Tiling"},
		u_scale:{channel:{id:"u_scale",type:"float",name:"Horizontal Tiles",label:"Horizontal Tiles",value:1,current_value:1,min:-10000,max:10000,step_size:0.01},group:"/Tiling"},
		v_offset:{channel:{id:"v_offset",type:"float",name:"Vertical Offset",label:"Vertical Offset",value:0,current_value:0,min:-10000,max:10000,step_size:0.01},group:"/Tiling"},
		v_scale:{channel:{id:"v_scale",type:"float",name:"Vertical Tiles",label:"Vertical Tiles",value:1,current_value:1,min:-10000,max:10000,step_size:0.01},group:"/Tiling"},
		extra:[{type:"studio_material_channels",channels:[{channel:{id:"Multiply Specular Through Opacity",type:"bool",name:"Multiply Specular Through Opacity",label:"Multiply Specular Through Opacity",value:true,current_value:true},group:"/Specular"},{channel:{id:"Sheen Color",type:"color",name:"Sheen Color",label:"Sheen Color",visible:false,value:[ 0.4, 0.4, 0.4 ],current_value:[ 0.4, 0.4, 0.4 ],min:0,max:1,clamped:true,default_image_gamma:0,mappable:true},group:"/Subsurface"},{channel:{id:"Scatter Color",type:"color",name:"Scatter Color",label:"Scatter Color",visible:false,value:[ 0.8, 0.1490196, 0.05882353 ],current_value:[ 0.8, 0.1490196, 0.05882353 ],min:0,max:1,clamped:true,default_image_gamma:0,mappable:true},group:"/Subsurface"},{channel:{id:"Thickness",type:"float",name:"Thickness",label:"Thickness",visible:false,value:0.25,current_value:0.25,min:0,max:1,clamped:true,step_size:0.01,default_image_gamma:1,mappable:true},group:"/Subsurface"},{channel:{id:"Lighting Model",type:"enum",name:"Lighting Model",label:"Lighting Model",value:0,current_value:0,enum_values:[ "Plastic", "Metallic", "Skin", "Glossy (Plastic)", "Matte", "Glossy (Metallic)" ]},group:"/General"},{channel:{id:"Smooth On",type:"bool",name:"Smooth On",label:"Smooth",value:true,current_value:true},group:"/Smoothing"},{channel:{id:"Smooth Angle",type:"float",name:"Smooth Angle",label:"Angle",value:89.9,current_value:89.9,min:0,max:180,clamped:true,step_size:0.01},group:"/Smoothing"},{channel:{id:"Render Priority",type:"enum",name:"Render Priority",label:"Render Priority",visible:false,value:3,current_value:3,enum_values:[ "Lowest", "Low", "Below Normal", "Normal", "Above Normal", "High", "Highest" ]},group:"/Render Priority"},{channel:{id:"Propagate Priority",type:"bool",name:"Propagate Priority",label:"Propagate Priority",visible:false,value:false,current_value:false},group:"/Render Priority"}]}]
		};
		
		return json;
	}
	static oldOverrideCode(material: Material, x: any): void {
		
		var types = [ 'diffuse' , 'specular' , 'ambient' , 'reflection' , 'refraction' ];
		
		for (var i = 0; i < types.length; i++)
		{
			var type = types[i];
			
			if (material[type])
			{
				if (material[type].color) { x[type].channel.current_value = [material[type].color.r, material[type].color.g, material[type].color.b]; }
				if (material[type].colorMap) { x[type].channel.image = material[type].colorMap; }
				if (material[type].strength) { x[type + '_strength'].channel.current_value = material[type].strength; }
				if (material[type].strengthMap) { x[type + '_strength'].channel.image = material[type].strengthMap; }
			}
		}
		
		var types = [ 'glossiness' , 'transparency' ];
		
		for (var i = 0; i < types.length; i++)
		{
			var type = types[i];
			
			if (material[type])
			{
				if (material[type].strength) { x[type].channel.current_value = material[type].strength; }
				if (material[type].strengthMap) { x[type].channel.image = material[type].strengthMap; }
			}
		}
		
		var types = [ 'bump' , 'displacement' ];
		
		for (var i = 0; i < types.length; i++)
		{
			var type = types[i];
			
			if (material[type])
			{
				if (material[type].strength) { x[type].channel.current_value = material[type].strength; }
				if (material[type].strengthMap) { x[type].channel.image = material[type].strengthMap; }
				if (material[type].min) { x[type + '_min'].channel.current_value = material[type].min; }
				if (material[type].max) { x[type + '_max'].channel.current_value = material[type].max; }
			}
		}
		
		
		if (material.normalMap) { x.normal.channel.image = material.normalMap; }
		if (material.refraction && material.refraction.index) { x.refraction.index = material.refraction.index; }
		
		//if (node.uv)
		//{
		//	if (node.uv.uvset) { x.uv_set = node.uv.uvset; }
		//	if (node.uv.hOffset) { x.u_offset.channel.current_value = node.uv.hOffset; }
		//	if (node.uv.vOffset) { x.v_offset.channel.current_value = node.uv.vOffset; }
		//	if (node.uv.hTiles) { x.u_scale.channel.current_value = node.uv.hTiles; }
		//	if (node.uv.vTiles) { x.v_scale.channel.current_value = node.uv.vTiles; }
		//}
	}
	createInstance(): any {
		
		// Ok, so the material lib contains a reference to a uv set, but the material instance contains a reference to a geometry instance.
		// The material instance links to a geometry instance and specifies the polygon groups to attach the material to.
		
		// we can also override the defaults in the material library with channels in the instance
		
		var json: any = {};
		json.id = GenerateId(json);
		json.url = '#' + this.id;
		json.geometry = '#' + this.geometry.id;
		json.groups = this.groups; // A string_array of polygon group names (see geometry) to attach the material to.
		
		// examples of instance overrides - do we really need type and name?
		//diffuse:{channel:{id:"diffuse",type:"color",name:"Diffuse Color",current_value:[ 1, 1, 1 ],image:null},group:"/Diffuse"},
		//diffuse_strength:{channel:{id:"diffuse_strength",type:"float",name:"Diffuse Strength",current_value:1,image:null},group:"/Diffuse"},
		//specular:{channel:{id:"specular",type:"color",name:"Specular Color",current_value:[ 0.6, 0.6, 0.6 ],image:null},group:"/Specular"},
		//specular_strength:{channel:{id:"specular_strength",type:"float",name:"Specular Strength",current_value:1,image:null},group:"/Specular"},
		//glossiness:{channel:{id:"glossiness",type:"float",name:"Glossiness",current_value:1,image:null},group:"/Specular"},
		//ambient:{channel:{id:"ambient",type:"color",name:"Ambient Color",current_value:[ 0, 0, 0 ],image:null},group:"/Ambient"},
		//ambient_strength:{channel:{id:"ambient_strength",type:"float",name:"Ambient Strength",current_value:1,image:null},group:"/Ambient"},
		//reflection:{channel:{id:"reflection",type:"color",name:"Reflection Color",current_value:[ 1, 1, 1 ],image:null},group:"/Reflection"},
		//reflection_strength:{channel:{id:"reflection_strength",type:"float",name:"Reflection Strength",current_value:0,image:null},group:"/Reflection"},
		//refraction:{channel:{id:"refraction",type:"color",name:"Refraction Color",current_value:[ 1, 1, 1 ],image:null},group:"/Refraction"},
		//refraction_strength:{channel:{id:"refraction_strength",type:"float",name:"Refraction Strength",current_value:0,image:null},group:"/Refraction"},
		//ior:{channel:{id:"ior",type:"float",name:"Index of Refraction",current_value:0},group:"/Refraction"},
		//bump:{channel:{id:"bump",type:"float",name:"Bump Strength",current_value:0,image:null},group:"/Bump"},
		//bump_min:{channel:{id:"bump_min",type:"float",name:"Negative Bump",current_value:-0.01},group:"/Bump"},
		//bump_max:{channel:{id:"bump_max",type:"float",name:"Positive Bump",current_value:0.01},group:"/Bump"},
		//displacement:{channel:{id:"displacement",type:"float",name:"Displacement Strength",current_value:0,image:null},group:"/Displacement"},
		//displacement_min:{channel:{id:"displacement_min",type:"float",name:"Minimum Displacement",current_value:-0.10},group:"/Displacement"},
		//displacement_max:{channel:{id:"displacement_max",type:"float",name:"Maximum Displacement",current_value:0.10},group:"/Displacement"},
		//transparency:{channel:{id:"transparency",type:"float",name:"Opacity Strength",current_value:1,image:null},group:"/Opacity"},
		//normal:{channel:{id:"normal",type:"image",name:"Normal Map",image:null},group:"/Normal Mapping"},
		//u_offset:{channel:{id:"u_offset",type:"float",name:"Horizontal Offset",current_value:0},group:"/Tiling"},
		//u_scale:{channel:{id:"u_scale",type:"float",name:"Horizontal Tiles",current_value:1},group:"/Tiling"},
		//v_offset:{channel:{id:"v_offset",type:"float",name:"Vertical Offset",current_value:0},group:"/Tiling"},
		//v_scale:{channel:{id:"v_scale",type:"float",name:"Vertical Tiles",current_value:1},group:"/Tiling"}
		
		return json;
	}
	static ReadDaz(json: any): Material {
		
		var material = new Material();
		
		return material;
	}
}
export class Texture {
	
	id: string;
	name: string = 'image';
	label: string = 'image';
	
	url: string = null; // link to image library
	
	filename: string = null;
	
	width: number = null;
	height: number = null;
	internalBuffer: Uint8ClampedArray = null; // ImageData.data (Uint8ClampedArray) or Bitmap.pixels (Uint8Array)
	bytesPerPixel: number = null;
	
	constructor() {
		
		this.id = GenerateId(this);
	}
	load(img: any): void {
		
		if (img.constructor.name == 'CanvasRenderingContext2D')
		{
			this.width = img.canvas.width;
			this.height = img.canvas.height;
			
			var internalContext: CanvasRenderingContext2D = img;
			
			this.internalBuffer = internalContext.getImageData(0, 0, this.width, this.height).data;
		}
		else if (img.constructor.name == 'HTMLImageElement')
		{
			this.width = img.width;
			this.height = img.height;
			
			var internalCanvas = document.createElement('canvas');
			internalCanvas.width = img.width;
			internalCanvas.height = img.height;
			
			var internalContext: CanvasRenderingContext2D = internalCanvas.getContext('2d');
			internalContext.drawImage(img, 0, 0);
			
			this.internalBuffer = internalContext.getImageData(0, 0, this.width, this.height).data;
		}
		else if (img.magic && img.magic == 19778) // a Bitmap - 19778 = 'BM'
		{
			this.width = img.width;
			this.height = img.height;
			this.internalBuffer = img.pixels;
			this.bytesPerPixel = img.bytesPerPixel;
		}
		else
		{
			throw new Error();
		}
	}
	map(tu: number, tv: number): Color4 {
		
		if (this.internalBuffer)
		{
			var u = Math.abs(((tu * this.width) % this.width)) >> 0;
			var v = Math.abs(((tv * this.height) % this.height)) >> 0;
			
			var index = (u + v * this.width) * this.bytesPerPixel;
			
			var r = null;
			var g = null;
			var b = null;
			var a = 255;
			
			// normal canvas/image is RGBA
			//var r = this.internalBuffer[index + 0];
			//var g = this.internalBuffer[index + 1];
			//var b = this.internalBuffer[index + 2];
			//var a = this.internalBuffer[index + 3];
			
			// BMP file format defines ABGR, not RGBA
			
			if (this.bytesPerPixel == 3)
			{
				b = this.internalBuffer[index + 0];
				g = this.internalBuffer[index + 1];
				r = this.internalBuffer[index + 2];
			}
			else if (this.bytesPerPixel == 4)
			{
				a = this.internalBuffer[index + 0];
				b = this.internalBuffer[index + 1];
				g = this.internalBuffer[index + 2];
				r = this.internalBuffer[index + 3];
			}
			else
			{
				throw new Error();
			}
			
			return new Color4(r / 255.0, g / 255.0, b / 255.0, a / 255.0);
		}
		else
		{
			return new Color4(1, 1, 1, 1);
		}
	}
	exportToDaz(): any {
		
		var json: any = {};
		json.id = this.id; // this is a case where we want human-readable ids, so as to link via id
		// either that or we have to have Material have pointers to Texture, rather than ids
		// which is probably better anyway
		json.name = this.id;
		json.map_gamma = 0;
		json.map = [];
		json.map[0] = {};
		json.map[0].url = this.url;
		json.map[0].label = this.id;
		return json;
	}
	static ReadDaz(json: any): Texture {
		
		var image = new Texture();
		
		return image;
	}
}
export class Scene {
	
	// i previously thought that nodes and materials were parallel arrays, but that can't be right
	
	root: Bone = null;
	nodes: Bone[] = []; // parents must come before children in this list, just like in DAZ
	uvs: UvSet[] = [];
	modifiers: any[] = [];
	materials: Material[] = [];
	animations: Animation[] = [];
	textures: Texture[] = [];
	
	current_camera: string = null; // A string representing the URI of a camera node_instance within the scene to use as the current camera.
	
	cameras: Camera[] = []; // this is a cache - cameras are canonically stored in the nodes list
	lights: Light[] = []; // this is a cache - lights are canonically stored in the nodes list
	
	camera: Camera; // can we put this in Device instead?
	
	// possible addtional options under studio_render_settings:
	// aspect_ratio : [ 400 , 600 ]
	// imageSize : [ 800 , 1200 ]
	extra: any[] = [{type:"studio_scene_settings",current_time:0,background_color:[1,1,1],backdrop_visible:false,backdrop_visible_in_render:true},{type:"studio_render_settings",render_options:{active_renderer:"DzDelightRenderer",startTime:0,endTime:1,renderMovToId:"MovieFile",renderViewport:true,renderType:"Software",renderStyle:"Normal",rayTraceDepth:2,openGLPasses:8,useGLSL:true,isCurrentFrameRender:true,useMotionBlur:false,motionBlurPct:100,motionBlurSamples:2,xPixelSamples:4,yPixelSamples:4,shadowSamples:16,shadingRate:1,doubleSided:true,gain:1,gamma:1,pixelFilter:"Sinc",xFilterWidth:6,yFilterWidth:6,gammaCorrection:"GCOff"}}];
	
	constructor() {
		this.camera = new Camera(); // can we put this in Device instead?
	}
	setCameraPositionVector(vector: Vector3) { this.camera.position = vector };
	setCameraPosition(x: number, y: number, z: number) { this.camera.position = new Vector3(x, y, z); };
	setCameraTarget(x: number, y: number, z: number) { this.camera.target = new Vector3(x, y, z); };
	exportToDaz(): any {
		
		var json: any = {};
		//if (this.nodes.length > 0) { json.nodes = this.nodes.map(function(x) { return x.createInstance(); }); }
		//if (this.uvs.length > 0) { json.uvs = this.uvs.map(function(x) { return x.createInstance(); }); }
		//if (this.modifiers.length > 0) { json.modifiers = this.modifiers.map(function(x) { return x.createInstance(); }); }
		//if (this.materials.length > 0) { json.materials = this.materials.map(function(x) { return x.createInstance(); }); }
		//if (this.animations.length > 0) { json.animations = this.animations.map(function(x) { return x.createInstance(); }); }
		json.extra = this.extra;
		return json;
	}
	static ReadDaz(json: any): Scene {
		
		var scene = new Scene();
		if (json.nodes) { scene.nodes = json.nodes.map(function(x) { return Bone.ReadDaz(x); }); }
		if (json.uvs) { scene.uvs = json.uvs.map(function(x) { return UvSet.ReadDaz(x); }); }
		//if (json.modifiers) { scene.modifiers = json.modifiers.map(function(x) { return Modifier.ReadDaz(x); }); }
		if (json.materials) { scene.materials = json.materials.map(function(x) { return Material.ReadDaz(x); }); }
		if (json.animations) { scene.animations = json.animations.map(function(x) { return Animation.ReadDaz(x); }); }
		if (json.current_camera) { scene.current_camera = json.current_camera; }
		return scene;
	}
}
export class Animation {
	
	url: string = null; // A string representing the URI referring to the channel to target with this animation.
	keys: any[] = null; // An array of time/value pairs, with an optional nested array that defines an interpolation type and its associated values (if any), one for each keyframe.
	
	// Keys must appear in order of ascending time. The number of values specified for each key must match the number of components of the property specified in the url. To provide animation data for a single component of a multi-component property, use the sub-property selector syntax (see Asset Addressing) to specify which component is desired, then provide the number of values required to specify a value for keys of that type.
	
	// The assumed key interpolation type is Catmull-Rom Spline Tangent for float channels and Linear for all others.
	
	// examples:
	// vector/color - { "url" : "hips#translation" , "keys" : [ [ 0.0, [1.23, 2.34, 4.55] ], [ 1.0, [6.78, 5.23, 1.90] ] ] }
	// float - { "url" : "hips#translation/x" , "keys" : [ [ 0.0, 1.23 ], [ 1.0, 6.78 ] ] }
	
	// A float including the optional interpolation type/value array:
	// { "url" : "hips#translation/x" , "keys" : [ [ 0.0, 1.23, ["TCB", -0.5, 0.2, 0.5] ], [ 1.0, 6.78, ["LINEAR"] ] ] }
	
	// An alternate float including the optional interpolation type/value array:
	// { "url" : "Dress:#Morph_001?value/value" , "keys" : [ [ 0.5666667, 1, ["HERMITE", 0,0 ] ], [ 0.6, 0, ["CONST"] ] ] }
	
	constructor() {
		
	}
	exportToDaz(): any {
		
		var json: any = {};
		json.url = this.url;
		json.keys = this.keys;
		return json;
	}
	static ReadDaz(json: any): Animation {
		
		var animation = new Animation();
		animation.url = json.url;
		animation.keys = json.keys;
		return animation;
	}
}
export class Duf {
	
	//this.ids: any = {}; // maybe deal with unique ids here?
	
	geometry_library: Geometry[] = null;
	uv_set_library: UvSet[] = null;
	node_library: Bone[] = null;
	material_library: Material[] = null;
	image_library: Texture[] = null;
	scene: Scene = null;
	
	constructor() {
		
	}
	exportToDaz(): any {
		
		var json: any = {};
		json.file_version = '0.6.0.0';
		if (this.geometry_library) { json.geometry_library = this.geometry_library.map(x => x.exportToDaz()); }
		if (this.uv_set_library) { json.uv_set_library = this.uv_set_library.map(x => x.exportToDaz()); }
		if (this.node_library) { json.node_library = this.node_library.map(x => x.exportToDaz()); }
		if (this.material_library) { json.material_library = this.material_library.map(x => x.exportToDaz()); }
		if (this.image_library) { json.image_library = this.image_library.map(x => x.exportToDaz()); }
		if (this.scene) { json.scene = this.scene.exportToDaz(); }
		//json.material_library.push(materialLibraryDefault);
		return json;
	}
	static ReadDaz(json: any): Duf {
		
		var duf = new Duf();
		// "file_version" : "0.6.0.0",
		// "asset_info" : {
		// 	"id" : "/C%3A/Users/adam/Desktop/dufs/lights-cell.duf",
		// 	"type" : "preset_light",
		// 	"contributor" : {
		// 		"author" : "adam.chmelynski",
		// 		"email" : "",
		// 		"website" : ""
		// 	},
		// 	"revision" : "1.0",
		// 	"modified" : "2016-04-22T13:30:42Z"
		// }
		if (json.geometry_library) { duf.geometry_library = json.geometry_library.map(x => Geometry.ReadDaz(x)); }
		if (json.uv_set_library) { duf.uv_set_library = json.uv_set_library.map(x => UvSet.ReadDaz(x)); }
		if (json.node_library) { duf.node_library = json.node_library.map(x => Bone.ReadDaz(x)); }
		if (json.material_library) { duf.material_library = json.material_library.map(x => Material.ReadDaz(x)); }
		if (json.image_library) { duf.image_library = json.image_library.map(x => Texture.ReadDaz(x)); }
		if (json.scene) { duf.scene = Scene.ReadDaz(json.scene); }
		return duf;
	}
}
export class Device {
	
	ctx: CanvasRenderingContext2D = null;
	//canvas: HTMLCanvasElement = null;
	
	lf: number;
	tp: number;
	wd: number;
	hg: number;
	rt: number;
	bt: number;
	
	backBuffer: ImageData; // (or Uint8ClampedArray?)
	depthBuffer: Float32Array;
	
	renderMode: string = 'line'; // 'point, 'line', 'polygon'
	labelVertexes: boolean = false;
	static polyfaces = { 3 : [[0,1,2]] , 4 : [[0,1,2],[0,2,3]] , 5 : [] };
	
	scene: Scene = null;
	camera: Camera = null; // the current camera is kept track of by Device, not by Scene
	
	static Read(json: any): Device {
		
		var device = new Device(json.ctx, json.left, json.top, json.width, json.height);
		device.renderMode = json.renderMode;
		
		var camera = device.camera = new Camera();
		camera.position = new Vector3(json.camera.position[0], json.camera.position[1], json.camera.position[2]);
		camera.target = new Vector3(json.camera.target[0], json.camera.target[1], json.camera.target[2]);
		
		var scene = device.scene = new Scene();
		var bone = scene.root = new Bone();
		
		if (json.root.geometry.shape)
		{
			bone.geometry = Shapes[json.root.geometry.shape].apply(null, json.root.geometry.args);
		}
		
		return device;
	}
	
	constructor(ctx: CanvasRenderingContext2D, left?: number, top?: number, width?: number, height?: number) {
		
		this.ctx = ctx;
		
		if (left === undefined) { left = 0; }
		if (top === undefined) { top = 0; }
		if (width === undefined) { width = this.ctx.canvas.width; }
		if (height === undefined) { height = this.ctx.canvas.height; }
		
		this.lf = left;
		this.tp = top;
		this.wd = width;
		this.hg = height;
		this.rt = left + width;
		this.bt = top + height;
		
		//this.backBuffer = canvas.pixels; // this was in the Bitmap branch above
		//this.depthBuffer = new Float32Array(this.wd * this.hg); // changed from Array
	}
	DrawLineMesh(geometry: Geometry): void {
		
		this.ctx.beginPath();
		
		for (var i = 0; i < geometry.polygons.length; i++)
		{
			var poly = geometry.polygons[i];
			
			for (var j = 0; j < poly.vertices.length; j++)
			{
				var a = j;
				var b = (j + 1) % poly.vertices.length;
				
				var x1 = this.lf + poly.vertices[a].projection.x * this.wd + this.wd / 2;
				var y1 = this.tp - poly.vertices[a].projection.y * this.hg + this.hg / 2;
				var x2 = this.lf + poly.vertices[b].projection.x * this.wd + this.wd / 2;
				var y2 = this.tp - poly.vertices[b].projection.y * this.hg + this.hg / 2;
				
				var inplay1 = (this.lf < x1 - 1) && (x1 < this.rt) && (this.tp < y1 - 1) && (y1 < this.bt); // this -1 correction is frustrating - before i added it, dots were being drawn on the edge of the in-play area of the canvas and then were not being erased by clearRect.  no idea why
				var inplay2 = (this.lf < x2 - 1) && (x2 < this.rt) && (this.tp < y2 - 1) && (y2 < this.bt);
				if (!inplay1 && !inplay2) { continue; } // this is too aggressive - we could display part of the lines by clamping the points to the visible window
				// but the calculations are nontrivial - you could have one point in play and one not, or both points could be out of play but part of the line between them is still visible
				// there's no easy way to determine whether to clamp or just to discard the line
				// if we were purely staying in canvas, we could use transformations and clipping regions and not have to have any of this code
				// but then we lose compatibility with PDF
				
				this.ctx.moveTo(x1, y1);
				this.ctx.lineTo(x2, y2);
				
				if (poly.vertices.length == 2) { break; }
			}
		}
		
		this.ctx.stroke();
	}
	DrawPoints(geometry: Geometry): void {
		
		
		var radius = 2;
		
		for (var i = 0; i < geometry.vertices.length; i++)
		{
			var vertex = geometry.vertices[i];
			
			var x = this.lf + vertex.projection.x * this.wd + this.wd / 2;
			var y = this.tp - vertex.projection.y * this.hg + this.hg / 2;
			
			if (x <= this.lf || y <= this.tp || x >= this.rt || y >= this.bt) { continue; } 
			
			this.ctx.fillStyle = vertex.color.toString();
			this.ctx.beginPath();
			this.ctx.arc(x, y, radius, 0, Math.PI * 2, true);
			this.ctx.fill();
			
			if (this.labelVertexes) { this.ctx.fillStyle = 'black'; this.ctx.fillText(i.toString(), x + 3, y); }
		}
	}
	LabelVertexes(geometry: Geometry): void {
		
		for (var i = 0; i < geometry.vertices.length; i++)
		{
			var vertex = geometry.vertices[i];
			
			var x = this.lf + vertex.projection.x * this.wd + this.wd / 2;
			var y = this.tp - vertex.projection.y * this.hg + this.hg / 2;
			
			if (x <= this.lf || y <= this.tp || x >= this.rt || y >= this.bt) { continue; } 
			
			var label = i.toString(); // change as needed
			this.ctx.fillText(label, x + 3, y);
		}
	}
	DrawShadedPolygon(node: Bone, poly: Polygon, polyIndex: number): void {
		
		var mesh = node.geometry;
		var material = node.materials[poly.materialGroup];
		
		var relevantPolyfaces = Device.polyfaces[poly.vertices.length];
		
		for (var k = 0; k < relevantPolyfaces.length; k++)
		{
			var a = relevantPolyfaces[k][0];
			var b = relevantPolyfaces[k][1];
			var c = relevantPolyfaces[k][2];
			
			// if a polygon references vertex objects
			var vertexA = poly.vertices[a];
			var vertexB = poly.vertices[b];
			var vertexC = poly.vertices[c];
			
			//// if a polygon is just a list of vertex indices
			//var vertexIndexA = poly[a+2];
			//var vertexIndexB = poly[b+2];
			//var vertexIndexC = poly[c+2];
			
			var normals = [];
			
			if (mesh.polyNormals) // flat meshes, like planes and cubes
			{
				var transformedNormal = Vector3.TransformNormal(mesh.polyNormals[polyIndex], node.matrix);
				normals.push(transformedNormal);
				normals.push(transformedNormal);
				normals.push(transformedNormal);
				// if (transformedNormal.z >= 0) { continue; }
			}
			else if (mesh.vertexNormals) // curved meshes, like cylinders and spheres
			{
				normals.push(vertexA.projectedNormal);
				normals.push(vertexB.projectedNormal);
				normals.push(vertexC.projectedNormal);
			}
			
			var ToXY = function(l) { return new Vector2(l[0], l[1]); };
			vertexA.textureCoordinates = ToXY(mesh.uvSet.uvs[vertexA.index]);
			vertexB.textureCoordinates = ToXY(mesh.uvSet.uvs[vertexB.index]);
			vertexC.textureCoordinates = ToXY(mesh.uvSet.uvs[vertexC.index]);
			
			if (mesh.uvSet.pviDict[polyIndex])
			{
				for (var l = 0; l < mesh.uvSet.pviDict[polyIndex].length; l++)
				{
					var vi = mesh.uvSet.pviDict[polyIndex][l];
					if (vertexA.index == vi[0]) { vertexA.textureCoordinates = ToXY(mesh.uvSet.uvs[vi[1]]); }
					if (vertexB.index == vi[0]) { vertexB.textureCoordinates = ToXY(mesh.uvSet.uvs[vi[1]]); }
					if (vertexC.index == vi[0]) { vertexC.textureCoordinates = ToXY(mesh.uvSet.uvs[vi[1]]); }
				}
			}
			
			var color = 1.0;
			this.DrawTriangle(vertexA, vertexB, vertexC, new Color4(color, color, color, 1), material, normals);
		}
	}
	DrawTriangle(v1: Vertex, v2: Vertex, v3: Vertex, color: Color4, material, normals): void {
		
		// sort the vertices by y coordinate, ascending
		if (v1.coordinates.y > v2.coordinates.y) { var temp = v2; v2 = v1; v1 = temp; }
		if (v2.coordinates.y > v3.coordinates.y) { var temp = v2; v2 = v3; v3 = temp; }
		if (v1.coordinates.y > v2.coordinates.y) { var temp = v2; v2 = v1; v1 = temp; }
		
		var p1 = v1.coordinates;
		var p2 = v2.coordinates;
		var p3 = v3.coordinates;
		
		//var lightPos = new Vector3(0, 10, 10);
		//var lightPos = this.scene.lights[0].position;
		
		// for flat meshes, like planes or cubes, we want to use the polygon normal for all vertices
		// for curved meshes, like cylinders or spheres, we want to use the vertex normal
		
		var ComputeNDotL = function(vertex, normal, lightPosition) {
			var lightDirection = lightPosition.subtract(vertex);
			normal.normalize();
			lightDirection.normalize();
			
			var finalVector = Math.abs(Vector3.Dot(normal, lightDirection)); // both sides - mostly for planes
			//var finalVector = Math.max(0, Vector3.Dot(normal, lightDirection)); // one side - for meshes with an interior and exterior
			
			return finalVector;
		};
		
		// why isn't this computed in DrawShadedPolygon?
		//var nl1 = ComputeNDotL(v1.worldCoordinates, normals[0], lightPos);
		//var nl2 = ComputeNDotL(v2.worldCoordinates, normals[1], lightPos);
		//var nl3 = ComputeNDotL(v3.worldCoordinates, normals[2], lightPos);
		var normal1 = normals[0];
		var normal2 = normals[1];
		var normal3 = normals[2];
		
		var data: any = {};
		
		var dP1P2;
		var dP1P3;
		
		// what happens if P1/P2 or P1/P3 are the same point?  then the slope is undefined
		// also, what happens if P1, P2, and P3 are collinear?
		// in both of these degenerate cases, the polygon collapses to a line
		// and if P1, P2, and P3 are all the same point, the polygon collapses to a point
		
		// calculate the inverse slope of P1/P2 and P1/P3
		if (p2.y - p1.y > 0) { dP1P2 = (p2.x - p1.x) / (p2.y - p1.y); } else if (p2.x < p1.x) { dP1P2 = -Infinity; } else if (p2.x > p1.x) { dP1P2 = +Infinity; } else { dP1P2 = 0; }
		if (p3.y - p1.y > 0) { dP1P3 = (p3.x - p1.x) / (p3.y - p1.y); } else { dP1P3 = 0; }
		
		if (dP1P2 > dP1P3)
		{
			for (var y = p1.y >> 0; y <= p3.y >> 0; y++)
			{
				data.currentY = y;
				
				if (y < p2.y)
				{
					//data.ndotla = nl1;
					//data.ndotlb = nl3;
					//data.ndotlc = nl1;
					//data.ndotld = nl2;
					data.normala = normal1;
					data.normalb = normal3;
					data.normalc = normal1;
					data.normald = normal2;
					
					data.ua = v1.textureCoordinates.x;
					data.ub = v3.textureCoordinates.x;
					data.uc = v1.textureCoordinates.x;
					data.ud = v2.textureCoordinates.x;
					
					data.va = v1.textureCoordinates.y;
					data.vb = v3.textureCoordinates.y;
					data.vc = v1.textureCoordinates.y;
					data.vd = v2.textureCoordinates.y;
					
					this.ProcessScanLine(data, v1, v3, v1, v2, color, material);
				}
				else
				{
					//data.ndotla = nl1;
					//data.ndotlb = nl3;
					//data.ndotlc = nl2;
					//data.ndotld = nl3;
					data.normala = normal1;
					data.normalb = normal3;
					data.normalc = normal2;
					data.normald = normal3;
					
					data.ua = v1.textureCoordinates.x;
					data.ub = v3.textureCoordinates.x;
					data.uc = v2.textureCoordinates.x;
					data.ud = v3.textureCoordinates.x;
					
					data.va = v1.textureCoordinates.y;
					data.vb = v3.textureCoordinates.y;
					data.vc = v2.textureCoordinates.y;
					data.vd = v3.textureCoordinates.y;
					
					this.ProcessScanLine(data, v1, v3, v2, v3, color, material);
				}
			}
		}
		else
		{
			for (var y = p1.y >> 0; y <= p3.y >> 0; y++)
			{
				data.currentY = y;
				
				if (y < p2.y)
				{
					//data.ndotla = nl1;
					//data.ndotlb = nl2;
					//data.ndotlc = nl1;
					//data.ndotld = nl3;
					data.normala = normal1;
					data.normalb = normal2;
					data.normalc = normal1;
					data.normald = normal3;
					
					data.ua = v1.textureCoordinates.x;
					data.ub = v2.textureCoordinates.x;
					data.uc = v1.textureCoordinates.x;
					data.ud = v3.textureCoordinates.x;
					
					data.va = v1.textureCoordinates.y;
					data.vb = v2.textureCoordinates.y;
					data.vc = v1.textureCoordinates.y;
					data.vd = v3.textureCoordinates.y;
					
					this.ProcessScanLine(data, v1, v2, v1, v3, color, material);
				}
				else
				{
					//data.ndotla = nl2;
					//data.ndotlb = nl3;
					//data.ndotlc = nl1;
					//data.ndotld = nl3;
					data.normala = normal2;
					data.normalb = normal3;
					data.normalc = normal1;
					data.normald = normal3;
					
					data.ua = v2.textureCoordinates.x;
					data.ub = v3.textureCoordinates.x;
					data.uc = v1.textureCoordinates.x;
					data.ud = v3.textureCoordinates.x;
					
					data.va = v2.textureCoordinates.y;
					data.vb = v3.textureCoordinates.y;
					data.vc = v1.textureCoordinates.y;
					data.vd = v3.textureCoordinates.y;
					
					this.ProcessScanLine(data, v2, v3, v1, v3, color, material);
				}
			}
		}
	}
	ProcessScanLine(data: ScanLineData, va: Vertex, vb: Vertex, vc: Vertex, vd: Vertex, color: Color4, material): void {
		
		var pa = va.coordinates;
		var pb = vb.coordinates;
		var pc = vc.coordinates;
		var pd = vd.coordinates;
		
		//console.log(data.currentY + ' ' + pa.x + ' ' + pb.x + ' ' + pc.x + ' ' + pd.x);
		
		var gradient1 = pa.y != pb.y ? (data.currentY - pa.y) / (pb.y - pa.y) : 1;
		var gradient2 = pc.y != pd.y ? (data.currentY - pc.y) / (pd.y - pc.y) : 1;
		
		var sx = Interpolate(pa.x, pb.x, gradient1) >> 0;
		var ex = Interpolate(pc.x, pd.x, gradient2) >> 0;
		var z1 = Interpolate(pa.z, pb.z, gradient1);
		var z2 = Interpolate(pc.z, pd.z, gradient2);
		//var snl = Interpolate(data.ndotla, data.ndotlb, gradient1);
		//var enl = Interpolate(data.ndotlc, data.ndotld, gradient2);
		var snl = InterpolateVector(data.normala, data.normalb, gradient1);
		var enl = InterpolateVector(data.normalc, data.normald, gradient2);
		var su = Interpolate(data.ua, data.ub, gradient1);
		var eu = Interpolate(data.uc, data.ud, gradient2);
		var sv = Interpolate(data.va, data.vb, gradient1);
		var ev = Interpolate(data.vc, data.vd, gradient2);
		
		//console.log(data.currentY + ' ' + sx + ' ' + ex);
		
		//if (ex < sx) { var temp = ex; ex = sx; sx = temp; }
		
		for (var x = sx; x < ex; x++)
		{
			var y = data.currentY;
			
			if (x >= 0 && y >= 0 && x < this.wd && y < this.hg)
			{
				var gradient = (x - sx) / (ex - sx);
				
				var u = Interpolate(su, eu, gradient);
				var v = Interpolate(sv, ev, gradient);
				
				var z = Interpolate(z1, z2, gradient);
				
				//var ndotl = Interpolate(snl, enl, gradient);
				var normal = InterpolateVector(snl, enl, gradient);
				
				this.ShadePoint(x, y, z, u, v, normal, material);
			}
		}
	}
	ShadePoint(x: number, y: number, z: number, u: number, v: number, normal: Vector3, material: Material): void {
		
		var index = ((x >> 0) + (y >> 0) * this.wd);
		var index4 = index * 4;
		if (this.depthBuffer[index] < z) { return; }
		
		var diffuseColor;
		
		if (material)
		{
			//this.diffuse    = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
			//this.specular   = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
			//this.ambient    = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
			
			//this.reflection = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
			//this.refraction = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null , index : 0 };
			
			//this.glossiness   = { strength : 1 , strengthMap : null };
			//this.transparency = { strength : 1 , strengthMap : null };
			
			//this.bump         = { strength : 0 , strengthMap : null , min : -0.01 , max : +0.01 };
			//this.displacement = { strength : 0 , strengthMap : null , min : -0.10 , max : +0.10 };
			//this.normalMap = null;
			
			//this.uv = { uvset : '#default' , hOffset : 0 , vOffset : 0 , hTiles : 1 , vTiles : 1 };
			
			// this need only be done once per Bone and should not be in the ShadePoint function
			//var diffuseColor = material.diffuse.color;
			
			
			var diffuseMap = this.scene.textures[material.diffuse.colorMap.substr(1)];
			if (!diffuseMap) { console.log(material.diffuse.colorMap.substr(1)); }
			
			if (material.bump)
			{
				var bumpMap = this.scene.textures[material.bump.strengthMap.substr(1)];
				var uDiff = bumpMap.map(u+1, v).r - bumpMap.map(u-1, v).r;
				var vDiff = bumpMap.map(u, v+1).r - bumpMap.map(u, v-1).r;
				normal = normal; // calculate the new normal
			}
			
			//var specularColor = material.specular.color;
			//var specularStrength = material.specular.strength;
			//var ambientStrength = material.ambient.strength;
			//var transparencyMap = this.scene.textures[material.diffuse.strengthMap.substr(1)];
			
			diffuseColor = diffuseMap.map(u, v);
			
			//if (transparencyMap)
			//{
			//	// this interacts with the depthbuffer - it's not as easy as setting or not these days
			//	var transparencyColor = transparencyMap.map(u, v);
			//}
		}
		else
		{
			diffuseColor = new Color4(1, 1, 1, 1);
		}
		
		var ComputeNDotL = function(vertex, normal, lightPosition) {
			var lightDirection = lightPosition.subtract(vertex);
			normal.normalize();
			lightDirection.normalize();
			
			var finalVector = Math.abs(Vector3.Dot(normal, lightDirection)); // both sides - mostly for planes
			//var finalVector = Math.max(0, Vector3.Dot(normal, lightDirection)); // one side - for meshes with an interior and exterior
			
			return finalVector;
		};
		
		var ndotls = [];
		
		// lightVector[], normalVector, and cameraVector all need to be determined for each vertex and then interpolated
		// where do we get these from?
		var cameraVector: Vector3 = null;
		var lightVectors: Vector3[] = null;
		
		cameraVector.normalize();
		for (var i = 0; i < lightVectors.length; i++)
		{
			var lightVector = lightVectors[i];
			var light = this.scene.lights[i];
			
			lightVector.normalize();
			
			var lightReflectionVector = null; // how does one reflect a vector over another vector?
			
			var cameraReflectionAngle = Math.acos(Vector3.Dot(cameraVector, lightReflectionVector));
			
			if (cameraReflectionAngle < material.glossiness.strength)
			{
				// specular highlight
			}
			
			// deal with color and intensity and distance
			
			var normalDotLight = Vector3.Dot(normal, lightVector);
		}
		
		var vertex: Vertex; // where does this come from?
		
		this.scene.lights.forEach(function(light) {
			ndotls.push(ComputeNDotL(vertex, normal, light.position));
		});
		
		var ndotl = ndotls[0]; // need to figure out how to combine light colors
		
		var lightColor = new Color4(1, 1, 1, 1);
		var finalColor = new Color4(lightColor.r * ndotl * diffuseColor.r, lightColor.g * ndotl * diffuseColor.g, lightColor.b * ndotl * diffuseColor.b, 1); // light
		//var finalColor = new Color4(diffuseColor.r, diffuseColor.g, diffuseColor.b, 1); // no light
		
		finalColor.r = Math.floor(finalColor.r * 255);
		finalColor.g = Math.floor(finalColor.g * 255);
		finalColor.b = Math.floor(finalColor.b * 255);
		finalColor.a = Math.floor(finalColor.a * 255);
		
		//console.log(x + '\t' + y + '\t' + z + '\t' + u + '\t' + v + '\t' + ndotl + '\t' + finalColor);
		//if (x % 10 == 0 && y % 10 == 0) { console.log(x + '\t' + y + '\t' + finalColor); }
		
		this.depthBuffer[index] = z;
		
		//this.ctx.setPixel(x, y, finalColor); // setPixel only exists on Bitmap
		//this.backBuffer[index4 + 0] = finalColor.r * 255;
		//this.backBuffer[index4 + 1] = finalColor.g * 255;
		//this.backBuffer[index4 + 2] = finalColor.b * 255;
		//this.backBuffer[index4 + 3] = finalColor.a * 255;
	}
	Render(): void {
		
		var device = this;
		
		if (this.ctx) { this.ctx.clearRect(this.lf, this.tp, this.wd, this.hg); }
		
		if (this.renderMode == 'polygon')
		{
			// this fails for SVG, because GriddlCanvas.getImageData passes through to CanvasRenderingContext2D.getImageData
			// maybe we should create a separate canvas for the render, and then convert to base64 and draw it on the page as an image?
			
			if (this.backBuffer == null)
			{
				this.backBuffer = this.ctx.getImageData(this.lf, this.tp, this.wd, this.hg); // canvas
			}
			
			for (var i = 0; i < this.depthBuffer.length; i++) { this.depthBuffer[i] = 10000000; }
		}
		
		var camera = this.camera;
		var viewMatrix = Matrix.LookAtLH(camera.position, camera.target, Vector3.Up());
		var projectionMatrix = Matrix.PerspectiveFovLH(camera.fieldOfView, this.wd / this.hg, camera.znear, camera.zfar);
		
		// now scene just does what DAZ does and stores the nodes in topological sort order and just look at the parent urls
		// so this will need to change
		// of course DAZ doesn't chain node-level transformations, so this approach is still different - don't get rid of the chaining stuff
		if (!this.scene.root) { this.scene.root = this.scene.nodes[0]; } // this is a temporary fix - we need to reconcile approaches
		this.scene.root.Multiply(Matrix.Identity()); // new
		
		var nodes = this.scene.root.Leaves();
		
		for (var i = 0; i < nodes.length; i++)
		{
			// old version
			//var mesh = meshes[i];
			//var scaleMatrix = Matrix.Scaling(mesh.scale.x, mesh.scale.y, mesh.scale.z);
			//var rotationMatrix = Matrix.RotationYawPitchRoll(mesh.rotation.y, mesh.rotation.x, mesh.rotation.z);
			//var translationMatrix = Matrix.Translation(mesh.position.x, mesh.position.y, mesh.position.z);
			//var worldMatrix = scaleMatrix.multiply(rotationMatrix).multiply(translationMatrix);
			
			var node = nodes[i];
			
			var geos = [ node.geometry ]; // to be converted to node.geometries
			for (var k = 0; k < geos.length; k++)
			{
				var mesh = geos[0];
				
				var worldMatrix = node.matrix;
				node.worldView = worldMatrix.multiply(viewMatrix);
				node.transformMatrix = node.worldView.multiply(projectionMatrix);
				
				for (var j = 0; j < mesh.vertices.length; j++)
				{
					mesh.vertices[j].project(node.transformMatrix, node.matrix);
				}
				
				// the world matrix is passed to Project because we need to know world coordinates (and world normal) for lighting
				
				if (this.renderMode == 'point')
				{
					this.DrawPoints(mesh);
				}
				else 
				{
					if (this.renderMode == 'polygon')
					{
						mesh.vertices.forEach(function(vertex) {
							
							vertex.cameraVector = camera.position.subtract(vertex.worldCoordinates);
							
							this.scene.lights.forEach(function(light) {
								vertex.lightVectors.push(light.position.subtract(vertex.worldCoordinates));
							});
						});
						
						mesh.polygons.forEach(function(poly, j) { this.DrawShadedPolygon(node, poly, j); });
					}
					else if (this.renderMode == 'line')
					{
						this.DrawLineMesh(mesh);
					}
				}
			}
			
			if (this.labelVertexes) { this.LabelVertexes(mesh); }
		}
		
		if (this.ctx.putImageData && this.renderMode == 'polygon')
		{
			this.ctx.putImageData(this.backBuffer, this.lf, this.tp);
		}
	}
	OrbitControls(): void {
		
		// this assumes the camera target is (0,0,0) - we need to generalize it so that it orbits around the camera target
		
		var device = this;
		
		var savedRenderMode = null;
		
		device.ctx.canvas.onmousedown = function(downEvent) {
			
			savedRenderMode = device.renderMode;
			//device.renderMode = 'point';
			
			var cx = device.camera.position.x - device.camera.target.x;
			var cy = device.camera.position.y - device.camera.target.y;
			var cz = device.camera.position.z - device.camera.target.z;
			
			var theta = Math.atan2(cz, cx);
			var radius = Math.sqrt(cx*cx+cy*cy+cz*cz);
			var phi = Math.acos(cy/radius);
			
			var origX = downEvent.offsetX;
			var origY = downEvent.offsetY;
			
			device.ctx.canvas.onmousemove = function(moveEvent) {
				
				var currX = moveEvent.offsetX;
				var currY = moveEvent.offsetY;
				
				var dx = currX - origX;
				var dy = currY - origY;
				
				var newtheta = theta - dx / 200;
				var newphi = phi - dy / 200;
				
				//if (newphi > (Math.PI/2)) { newphi = Math.PI / 2; }
				//if (newphi < (-Math.PI/2)) { newphi = -Math.PI / 2; }
				
				var nx = radius * Math.cos(newtheta) * Math.sin(newphi);
				var nz = radius * Math.sin(newtheta) * Math.sin(newphi);
				var ny = radius * Math.cos(newphi);
				
				device.camera.position = device.camera.target.add(new Vector3(nx, ny, nz));
				device.Render();
			};
			
			device.ctx.canvas.onmouseup = function() {
				device.ctx.canvas.onmousemove = null;
				device.ctx.canvas.onmouseup = null;
				device.renderMode = savedRenderMode;
				device.Render();
			};
		};
		
		device.ctx.canvas.onmousewheel = function(wheelEvent) {
			
			// largely copy pasted from above
			
			var cx = device.camera.position.x - device.camera.target.x;
			var cy = device.camera.position.y - device.camera.target.y;
			var cz = device.camera.position.z - device.camera.target.z;
			
			var theta = Math.atan2(cz, cx);
			var radius = Math.sqrt(cx*cx+cy*cy+cz*cz);
			var phi = Math.acos(cy/radius);
			
			var newradius = radius + (wheelEvent.wheelDelta / 120) * 10;
			
			var nx = newradius * Math.cos(theta) * Math.sin(phi);
			var nz = newradius * Math.sin(theta) * Math.sin(phi);
			var ny = newradius * Math.cos(phi);
			
			device.camera.position = device.camera.target.add(new Vector3(nx, ny, nz));
			device.Render();
		};
	}
}

