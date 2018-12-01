
interface Point {
	x: number;
	y: number;
}
interface Vector {
	x: number;
	y: number;
	distance: number;
	angle: number;
}

function B(ctx: CanvasRenderingContext2D): void { ctx.beginPath(); }
function M(ctx: CanvasRenderingContext2D, p: Point): void { ctx.moveTo(p.x, p.y); }
function L(ctx: CanvasRenderingContext2D, p: Point): void { ctx.lineTo(p.x, p.y); } // add fletch arg?
function Q(ctx: CanvasRenderingContext2D, p: Point, q: Point): void { ctx.quadraticCurveTo(p.x, p.y, q.x, q.y); }
function C(ctx: CanvasRenderingContext2D, p: Point, q: Point, r: Point): void { ctx.bezierCurveTo(p.x, p.y, q.x, q.y, r.x, r.y); }
function S(ctx: CanvasRenderingContext2D): void { ctx.stroke(); }
function F(ctx: CanvasRenderingContext2D): void { ctx.fill(); }
function Z(ctx: CanvasRenderingContext2D): void { ctx.closePath(); }
function T(ctx: CanvasRenderingContext2D, p: Point, text: string): void { ctx.fillText(text, p.x, p.y); }
function ArcTo(ctx: CanvasRenderingContext2D, a: Point, b: Point, r: number) { ctx.arcTo(a.x, a.y, b.x, b.y, r); }
function A(ctx: CanvasRenderingContext2D, c: Point, r: Point, a: Point, b: Point, clockwise: Point): void {
	
	var radius = Math.hypot(r.y - c.y, r.x - c.x);
	var startAngle = Math.atan2(a.y - c.y, a.x - c.x);
	var endAngle = Math.atan2(b.y - c.y, b.x - c.x);
	var ccw = clockwise.x < c.x; // think of a clock - if the point is toward the 1 side, go clockwise, if to the 11 side, counterclockwise
	
	ctx.arc(c.x, c.y, radius, startAngle, endAngle, ccw);
}

function Path(ctx: CanvasRenderingContext2D, cmds: string, ps: Point[], origin: boolean): string {
	
	var parts = [];
	var k = 0;
	
	if (origin)
	{
		for (var i = 0; i < ps.length; i++)
		{
			ps[i] = { x: ps[i].x - ctx.canvas.width / 2, y: ps[i].y - ctx.canvas.height / 2 };
		}
		
		ctx.save();
		ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
	}
	
	for (var i = 0; i < cmds.length; i++)
	{
		var c = cmds[i];
		
		if (c == 'M')
		{
			var p = ps[k++];
			M(ctx, p);
			parts.push(c);
			parts.push(p.x);
			parts.push(p.y);
		}
		else if (c == 'L')
		{
			var p = ps[k++];
			L(ctx, p);
			parts.push(c);
			parts.push(p.x);
			parts.push(p.y);
		}
		else if (c == 'Q')
		{
			var p = ps[k++];
			var q = ps[k++];
			Q(ctx, p, q);
			parts.push(c);
			parts.push(p.x);
			parts.push(p.y);
			parts.push(q.x);
			parts.push(q.y);
		}
		else if (c == 'C')
		{
			var p = ps[k++];
			var q = ps[k++];
			var r = ps[k++];
			C(ctx, p, q, r);
			parts.push(c);
			parts.push(p.x);
			parts.push(p.y);
			parts.push(q.x);
			parts.push(q.y);
			parts.push(r.x);
			parts.push(r.y);
		}
		else if (c == 'A')
		{
			var p = ps[k++];
			var q = ps[k++];
			var r = ps[k++];
			var s = ps[k++];
			var t = ps[k++];
			A(ctx, p, q, r, s, t);
			
			// rX,rY rotation, arc, sweep, eX,eY
			
			//var radius = Math.hypot(q.y - p.y, q.x - p.x);
			//var startAngle = Math.atan2(r.y - p.y, r.x - p.x);
			//var endAngle = Math.atan2(s.y - p.y, s.x - p.x);
			//var cw = t.x >= p.x; // think of a clock - if the point is toward the 1 side, go clockwise, if to the 11 side, counterclockwise
			
			// path strings might use the SVG arc formula, actually
			//parts.push(c);
			//parts.push(p.x);
			//parts.push(p.y);
			//parts.push(radius);
			//parts.push(startAngle);
			//parts.push(endAngle);
			//parts.push(cw ? '1' : '0');
		}
		else if (c == 'Z')
		{
			Z(ctx);
			parts.push(c);
		}
		else
		{
			throw new Error();
		}
	}
	
	if (origin)
	{
		ctx.restore();
	}
	
	return parts.join(' ');
}

function Line(ctx: CanvasRenderingContext2D, a: Point, b: Point, fletches: number): void {
	
	// 0 = no fletches
	// 1 = forward fletch
	// 2 = reverse fletch
	// 3 = both fletches
	
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();
	if (fletches % 2 == 1) { DrawFletch(ctx, a, b); }
	if (fletches > 1) { DrawFletch(ctx, b, a); }
}
function LineH(ctx: CanvasRenderingContext2D, a: Point, b: Point, fletches: number): void {
	
	// 0 = no fletches
	// 1 = forward fletch
	// 2 = reverse fletch
	// 3 = both fletches
	
	var bprime = { x: b.x, y: a.y };
	
	ctx.beginPath();
	ctx.moveTo(a.x, a.y+0.5);
	ctx.lineTo(bprime.x, bprime.y+0.5);
	ctx.stroke();
	if (fletches % 2 == 1) { DrawFletch(ctx, a, bprime); }
	if (fletches > 1) { DrawFletch(ctx, bprime, a); }
}
function LineV(ctx: CanvasRenderingContext2D, a: Point, b: Point, fletches: number): void {
	
	// 0 = no fletches
	// 1 = forward fletch
	// 2 = reverse fletch
	// 3 = both fletches
	
	var bprime = { x: a.x, y: b.y };
	
	ctx.beginPath();
	ctx.moveTo(a.x+0.5, a.y);
	ctx.lineTo(bprime.x+0.5, bprime.y);
	ctx.stroke();
	if (fletches % 2 == 1) { DrawFletch(ctx, a, bprime); }
	if (fletches > 1) { DrawFletch(ctx, bprime, a); }
}
function Dot(ctx: CanvasRenderingContext2D, a: Point): void {
	ctx.beginPath();
	ctx.arc(a.x, a.y, 3, 0, Math.PI * 2, false);
	ctx.fill();
}
function Dots(ctx: CanvasRenderingContext2D, ps: Point[]): void {
	
	for (var i = 0; i < ps.length; i++)
	{
		var a = ps[i];
		
		ctx.beginPath();
		ctx.arc(a.x, a.y, 3, 0, Math.PI * 2, false);
		ctx.fill();
	}
}
function Segments(ctx: CanvasRenderingContext2D, ps: Point[], fletches: number): void {
	
	ctx.beginPath();
	ctx.moveTo(ps[0].x, ps[0].y);
	for (var i = 1; i < ps.length; i++) { ctx.lineTo(ps[i].x, ps[i].y); }
	if (fletches % 2 == 1) { DrawFletch(ctx, ps[ps.length - 2], ps[ps.length - 1]); }
	if (fletches > 1) { DrawFletch(ctx, ps[1], ps[0]); }
	ctx.stroke();
}
function Segments2(ctx: CanvasRenderingContext2D, ps: Point[]): void {
	
	ctx.beginPath();
	ctx.moveTo(ps[0].x, ps[0].y);
	for (var i = 1; i < ps.length; i++) { ctx.lineTo(ps[i].x, ps[i].y); }
}
function DrawSpline(ctx: CanvasRenderingContext2D, p: Point[]): void {
	
	if (p.length < 2 || 4 < p.length) { console.log('Wrong number of points'); return; }
	
	ctx.beginPath();
	ctx.moveTo(p[0].x, p[0].y);
	
	if (p.length == 2)
	{
		ctx.lineTo(p[1].x, p[1].y);
	}
	else if (p.length == 3)
	{
		ctx.quadraticCurveTo(p[1].x, p[1].y, p[2].x, p[2].y);
	}
	else if (p.length == 4)
	{
		ctx.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
	}
	
	ctx.stroke();
}
function DrawFletch(ctx: CanvasRenderingContext2D, srcPoint: Point, dstPoint: Point): void {
	
	var Vector = function(src: Point, dst: Point): Vector {
		
		var dx = dst.x - src.x;
		var dy = dst.y - src.y;
		
		var v = {
			x: dx,
			y: dy,
			distance: Math.sqrt(dx * dx + dy * dy),
			angle: Math.atan2(dy, dx),
		};
		
		return v;
	};
	var RecalcXY = function(vector: Vector): void {
		vector.x = vector.distance * Math.cos(vector.angle);
		vector.y = vector.distance * Math.sin(vector.angle);
	};
	var RotateDegrees = function(vector: Vector, angle: number): void {
		vector.angle += angle / 360 * Math.PI * 2;
		RecalcXY(vector);
	};
	var SetDist = function(vector: Vector, dist: number): void {
		vector.distance = dist;
		RecalcXY(vector);
	};
	
	var fletchLength = 10;
	var fletchDegrees = 30;
	
	var dstFletchVecR = Vector(dstPoint, srcPoint);
	var dstFletchVecL = Vector(dstPoint, srcPoint);
	RotateDegrees(dstFletchVecR, +fletchDegrees);
	RotateDegrees(dstFletchVecL, -fletchDegrees);
	SetDist(dstFletchVecR, fletchLength);
	SetDist(dstFletchVecL, fletchLength);
	
	ctx.moveTo(dstPoint.x, dstPoint.y);
	ctx.lineTo(dstPoint.x + dstFletchVecR.x, dstPoint.y + dstFletchVecR.y);
	ctx.moveTo(dstPoint.x, dstPoint.y);
	ctx.lineTo(dstPoint.x + dstFletchVecL.x, dstPoint.y + dstFletchVecL.y);
}

function Label(ctx: CanvasRenderingContext2D, src: Point, dst: Point, text: string, offset: number): void {
	
	var dx = dst.x - src.x;
	var dy = dst.y - src.y;
	
	var octant = Math.round((Math.atan2(dy, dx) / Math.PI + 1/8) * 4 + 3); // 0-7, NW -> W
	
	var textAligns = ['right','center','left','left','left','center','right','right'];
	var textBaselines = ['bottom','bottom','bottom','middle','top','top','top','middle'];
	
	ctx.beginPath()
	ctx.moveTo(src.x, src.y);
	ctx.lineTo(dst.x, dst.y);
	ctx.stroke();
	
	ctx.textAlign = textAligns[octant];
	ctx.textBaseline = textBaselines[octant];
	ctx.fillText(text, dst.x, dst.y);
}

function Rect(ctx: CanvasRenderingContext2D, a: Point, b: Point): void {
	ctx.rect(a.x+0.5, a.y+0.5, b.x - a.x, b.y - a.y);
}
function Circle(ctx: CanvasRenderingContext2D, a: Point, b: Point): void {
	var r = Math.hypot(b.x - a.x, b.y - a.y);
	ctx.arc(a.x, a.y, r, 0, Math.PI * 2, false);
}

function Table(ctx: CanvasRenderingContext2D, p: Point, q: Point, rows: number, cols: number): void {
	
	// p = top left corner
	// q = defines row and col sizes
	
	var dx = q.x - p.x;
	var dy = q.y - p.y;
	
	var lf = p.x;
	var tp = p.y;
	var rt = p.x + cols * dx;
	var bt = p.y + rows * dy;
	
	ctx.beginPath();
	
	for (var i = 0; i <= rows; i++)
	{
		ctx.moveTo(lf, p.y + dy * i + 0.5);
		ctx.lineTo(rt, p.y + dy * i + 0.5);
	}
	
	for (var i = 0; i <= cols; i++)
	{
		ctx.moveTo(p.x + dx * i + 0.5, tp);
		ctx.lineTo(p.x + dx * i + 0.5, bt);
	}
	
	ctx.stroke();
}
function TableWithText(ctx: CanvasRenderingContext2D, p: Point, q: Point, text: string[][]): void {
	
	var dx = q.x - p.x;
	var dy = q.y - p.y;
	
	var rows = text.length;
	var cols = text[0].length;
	
	var lf = p.x;
	var tp = p.y;
	var rt = p.x + cols * dx;
	var bt = p.y + rows * dy;
	
	ctx.beginPath();
	
	for (var i = 0; i <= rows; i++)
	{
		ctx.moveTo(lf, p.y + dy * i + 0.5);
		ctx.lineTo(rt, p.y + dy * i + 0.5);
	}
	
	for (var i = 0; i <= cols; i++)
	{
		ctx.moveTo(p.x + dx * i + 0.5, tp);
		ctx.lineTo(p.x + dx * i + 0.5, bt);
	}
	
	ctx.stroke();
	
	for (var i = 0; i < rows; i++)
	{
		for (var j = 0; j < cols; j++)
		{
			ctx.fillText(text[i][j], lf + (j + 0.5) * dx, tp + (i + 0.5) * dy);
		}
	}
}
function TableExtent(ctx: CanvasRenderingContext2D, p: Point, q: Point, r: Point): void {
	
	// p = top left corner
	// q = defines row and col sizes
	// r = bottom right corner (the table stops before the point)
	
	var dx = q.x - p.x;
	var dy = q.y - p.y;
	
	if (dx == 0 || dy == 0) { return; }
	
	var rows = Math.floor((r.y - p.y) / dy);
	var cols = Math.floor((r.x - p.x) / dx);
	
	var lf = p.x;
	var tp = p.y;
	var rt = p.x + cols * dx;
	var bt = p.y + rows * dy;
	
	ctx.beginPath();
	
	for (var i = 0; i <= rows; i++)
	{
		ctx.moveTo(lf, p.y + dy * i + 0.5);
		ctx.lineTo(rt, p.y + dy * i + 0.5);
	}
	
	for (var i = 0; i <= cols; i++)
	{
		ctx.moveTo(p.x + dx * i + 0.5, tp);
		ctx.lineTo(p.x + dx * i + 0.5, bt);
	}
	
	ctx.stroke();
}
function TableFree(ctx: CanvasRenderingContext2D, ps: Point[]): void {
	
	// the points are the corners of a diagonal path - A1, B2, C3, etc. - that way each point can specify both a row height and a col width
	// this means if the table is not a square n x n, then there will be excess points that only specify one or the other
	// the best way to deal with this is to H() or V() those excess points
	
	var lf = ps[0].x;
	var tp = ps[0].y;
	var rt = ps[ps.length - 1].x;
	var bt = ps[ps.length - 1].y;
	
	ctx.beginPath();
	
	for (var i = 0; i < ps.length; i++)
	{
		ctx.moveTo(lf, ps[i].y + 0.5);
		ctx.lineTo(rt, ps[i].y + 0.5);
	}
	
	for (var i = 0; i < ps.length; i++)
	{
		ctx.moveTo(ps[i].x + 0.5, tp);
		ctx.lineTo(ps[i].x + 0.5, bt);
	}
	
	ctx.stroke();
}

function H(a: Point, b: Point): Point {
	return { x: b.x, y: a.y };
}
function V(a: Point, b: Point): Point {
	return { x: a.x, y: b.y };
}
function Hori(ps: Point[]): Point[] {
	
	if (ps.length == 0) { return []; }
	
	var qs = [];
	
	for (var i = 0; i < ps.length; i++)
	{
		qs.push({ x: ps[i].x, y: ps[0].y });
	}
	
	return qs;
}
function Vert(ps: Point[]): Point[] {
	
	if (ps.length == 0) { return []; }
	
	var qs = [];
	
	for (var i = 0; i < ps.length; i++)
	{
		qs.push({ x: ps[0].x, y: ps[i].y });
	}
	
	return qs;
}
function HoriU(a: Point, b: Point, n: number): Point[] {
	
	var qs = [];
	
	for (var i = 0; i < n; i++)
	{
		qs.push({ x: a.x + i * (b.x - a.x), y: a.y });
	}
	
	return qs;
}
function VertU(a: Point, b: Point, n: number): Point[] {
	
	var qs = [];
	
	for (var i = 0; i < n; i++)
	{
		qs.push({ x: a.x, y: a.y + i * (b.y - a.y) });
	}
	
	return qs;
}
function HV(h: Point, v: Point): Point {
	return { x: v.x, y: h.y };
}

function Bearing(c: Point, a: Point, r: Point): Point {
	
	var angle = Math.atan2(a.y - c.y, a.x - c.x);
	var dist = Math.hypot(r.y - c.y, r.x - c.x);
	
	var x = c.x + dist * Math.cos(angle);
	var y = c.y + dist * Math.sin(angle);
	
	return { x: x, y: y };
}

function Repeat(a: Point, b: Point, c: Point): Point[] {
	
	// right now this goes in the direction of a -> b, up to the radius defined by c
	// but i think it would be better to go in the direction a -> c, with the interval defined by b
	
	// returns [a, b, b+(b-a), b+(b-a)+(b-a), ...]
	
	var d = Math.hypot(b.x - a.x, b.y - a.y);
	var end = Math.hypot(c.x - a.x, c.y - a.y);
	
	if (d < 0.001) { return []; }
	
	var n = Math.floor(end / d);
	
	var qs = [];
	
	for (var i = 0; i <= n; i++)
	{
		qs.push({ x: a.x + (b.x - a.x) * i, y: a.y + (b.y - a.y) * i });
	}
	
	return qs;
}
function Struts(a: Point, b: Point, ts: number[]): Point[] {
	
	// place points along line from a to b at selected milestones
	// (milestones can lie outside of [0,1])
	
	var dx = b.x - a.x;
	var dy = b.y - a.y;
	
	var points = [];
	
	for (var i = 0; i < ts.length; i++)
	{
		var x = a.x + ts[i] * dx;
		var y = a.y + ts[i] * dy;
		
		points.push({ x: x, y: y });
	}
	
	return points;
}
function Intersection(a: Point, b: Point, c: Point, d: Point): Point {
	
	// throw out degenerate lines
	if (a.x == b.x && a.y == b.y) { return null; }
	if (c.x == d.x && c.y == d.y) { return null; }
	
	// first deal with special cases of horizontal or vertical lines
	if (a.x == b.x)
	{
		if (c.x == d.x) // vertical x vertical
		{
			return null;
		}
		else // vertical x (horizontal or oblique)
		{
			var dx = d.x - c.x;
			var dy = d.y - c.y;
			var m = dy / dx;
			var y = c.y + m * (a.x - c.x);
			return { x: a.x, y: y };
		}
	}
	else if (a.y == b.y)
	{
		if (c.x == d.x) // horizontal x vertical
		{
			return { x: c.x, y: a.y };
		}
		else if (c.y == d.y) // horizontal x horizontal
		{
			return null;
		}
	}
	else
	{
		if (c.x == d.x) // (horizontal or oblique) x vertical
		{
			var dx = b.x - a.x;
			var dy = b.y - a.y;
			var m = dy / dx;
			var y = a.y + m * (c.x - a.x);
			return { x: c.x, y: y };
		}
	}
	
	var dxab = b.x - a.x;
	var dyab = b.y - a.y;
	var dxcd = d.x - c.x;
	var dycd = d.y - c.y;
	
	var mab = dyab / dxab;
	var mcd = dycd / dxcd;
	
	var bab = a.y - a.x * mab;
	var bcd = c.y - c.x * mcd;
	
	if (mab == mcd && bab == bcd) { return null; }
	
	var x = (bcd - bab) / (mab - mcd);
	var y = mab * x + bab;
	
	return { x: x, y: y };
}
function IntersectionH(a: Point, b: Point, h: Point): Point {
	
	if (a.y == b.y) { return null; }
	if (a.x == b.x) { return { x: a.x, y: h.y }; }
	
	var slope = (b.y - a.y) / (b.x - a.x);
	var intercept = a.y - a.x * slope;
	
	var x = (h.y - intercept) / slope;
	
	return { x: x, y: h.y };
}
function IntersectionV(a: Point, b: Point, v: Point): Point {
	
	if (a.x == b.x) { return null; }
	if (a.y == b.y) { return { x: v.x, y: a.y }; }
	
	var slope = (b.y - a.y) / (b.x - a.x);
	var intercept = a.y - a.x * slope;
	
	var y = slope * v.x + intercept;
	
	return { x: v.x, y: y };
}

function Translate(ps: Point[], a: Point): Point[] {
	
	var dx = a.x - ps[0].x;
	var dy = a.y - ps[0].y;
	
	var result = [];
	
	for (var i = 0; i < ps.length; i++)
	{
		var p = ps[i];
		result.push({ x: p.x + dx, y: p.y + dy });
	}
	
	return result;
}

function Reflect(ps: Point[], a: Point, b: Point): Point[] {
	
	var result = [];
	
	var axis = Math.atan2(b.y - a.y, b.x - a.x);
	
	for (var i = 0; i < ps.length; i++)
	{
		var p = ps[i];
		var angle = Math.atan2(p.y - a.y, p.x - a.x);
		var dist = Math.hypot(p.y - a.y, p.x - a.x);
		var newangle = axis + (axis - angle);
		var x = a.x + dist * Math.cos(newangle);
		var y = a.y + dist * Math.sin(newangle);
		result.push({ x: x, y: y });
	}
	
	return result;
}
function ReflectH(ps: Point[], a: Point): Point[] {
	
	var result = [];
	
	for (var i = 0; i < ps.length; i++)
	{
		var p = ps[i];
		var x = p.x;
		var y = p.y + (a.y - p.y) * 2;
		result.push({ x: x, y: y });
	}
	
	return result;
}
function ReflectV(ps: Point[], a: Point): Point[] {
	
	var result = [];
	
	for (var i = 0; i < ps.length; i++)
	{
		var p = ps[i];
		var x = p.x + (a.x - p.x) * 2;
		var y = p.y;
		result.push({ x: x, y: y });
	}
	
	return result;
}
function Radial(ps: Point[], c: Point, n: number): Point[] {
	
	// n is the total number of copies, including the original set of points - that's why we start at i = 1
	
	var result = [];
	
	for (var i = 1; i < n; i++)
	{
		var dtheta = Math.PI * 2 * i / n;
		
		for (var k = 0; k < ps.length; k++)
		{
			var angle = Math.atan2(ps[k].y - c.y, ps[k].x - c.x);
			var dist = Math.hypot(ps[k].y - c.y, ps[k].x - c.x);
			var newangle = angle + dtheta;
			var x = c.x + dist * Math.cos(newangle);
			var y = c.y + dist * Math.sin(newangle);
			result.push({ x: x, y: y });
		}
	}
	
	return result;
}

