
// we need a few different versions
// 1. a script that you can bolt on to existing canvas code, using a normal list of points - the point list has to be defined before as data, not as code, and you have to download it after modification
// 2. a system that reloads external js files to do the drawing - again, you can't backpropagate changes to the point positions here - you have to display the point list and copy and paste it to the file
// 3. code is housed in a codemirror on the page - changes to coordinates get backpropagated to code automatically

// ok, we broke .get() by allowing var x = p.add()
// this is because when we freeze, we have to return the point, which is easiest implemented by calling get() from add()
// but that screws up the cursor
// so instead, let's just get rid of get() and getn(), and assign names to points
// so spacebar now adds p.add(x, y), - with a comma at the end, for use in list literals

// we could add a second cursor - so one for add and one for get
// that works

// we need to write documentation for this

interface Point {
	x: number;
	y: number;
	selected?: boolean;
	line?: LinkedList<string>;
}
interface Grid {
	margin: number;
	xScale: number;
	yScale: number;
	xMajor: number;
	yMajor: number;
	xBoxes: number;
	yBoxes: number;
}
interface SelectionBox {
	top: number;
	left: number;
	width: number;
	height: number;
}
interface Vector {
	x: number;
	y: number;
	distance: number;
	angle: number;
}
interface Math {
	hypot(dx: number, dy: number): number;
}

class LinkedList<T> {
	
	data: T;
	prev: LinkedList<T>;
	next: LinkedList<T>;
	
	constructor() {
		this.prev = this;
		this.next = this;
	}
	add(data: T): LinkedList<T> {
		
		// this must be called on the sentinel
		
		var elt = new LinkedList<T>();
		elt.data = data;
		
		elt.next = this;
		elt.prev = this.prev;
		this.prev.next = elt;
		this.prev = elt;
		
		return elt;
	}
	remove(): void {
		
		// this cannot be called on the sentinel
		this.prev.next = this.next;
		this.next.prev = this.prev;
	}
	enumerate(): T[] {
		
		// this must be called on the sentinel
		
		var list: T[] = [];
		var elt = this.next;
		
		while (elt !== this)
		{
			list.push(elt.data);
			elt = elt.next;
		}
		
		return list;
	}
}

class PointListElt {
	
	data: Point;
	prev: PointListElt;
	next: PointListElt;
	
	remove(): void {
		
		// this cannot be called on the sentinel
		this.prev.next = this.next;
		this.next.prev = this.prev;
	}
}
class PointList extends PointListElt {
	
	cursor: PointListElt;
	frozen: boolean;
	frozenCursor: PointListElt;
	
	constructor() {
		super();
		this.data = null;
		this.prev = this;
		this.next = this;
		this.cursor = this;
		this.frozen = false;
		this.frozenCursor = this;
	}
	resetCursor(): void {
		this.cursor = this;
	}
	resetFrozenCursor(): void {
		this.frozenCursor = this;
	}
	add(x: number, y: number): Point {
		
		if (this.frozen)
		{
			this.frozenCursor = this.frozenCursor.next;
			if (this.frozenCursor == this) { throw new Error(); }
			return this.frozenCursor.data;
		}
		
		var elt = new PointListElt();
		elt.data = { x: x, y: y, selected: false, line: null };
		
		elt.next = this;
		elt.prev = this.prev;
		this.prev.next = elt;
		this.prev = elt;
		
		return elt.data;
	}
	get(): Point {
		
		// advance the cursor first, then return. has to be this way so it works from the beginning
		// if at end, this will return null (and then start from the beginning if called again)
		
		this.cursor = this.cursor.next;
		if (this.cursor == this) { throw new Error(); }
		return this.cursor.data;
	}
	getn(n: number): Point[] {
		
		// advance the cursor first, then return. has to be this way so it works from the beginning
		// if at end, this will return null (and then start from the beginning if called again)
		
		var l = [];
		
		for (var i = 0; i < n; i++)
		{
			this.cursor = this.cursor.next;
			if (this.cursor == this) { throw new Error(); }
			l.push(this.cursor.data);
		}
		
		return l;
	}
	freeze(): void {
		this.frozen = true;
	}
	unfreeze(): void {
		this.frozen = false;
	}
	enumerate(): Point[] {
		
		var list = [];
		var elt = this.next;
		
		while (elt !== this)
		{
			list.push(elt.data);
			elt = elt.next;
		}
		
		return list;
	}
	forEach(fn: (Point, number) => void): void {
		
		var elt = this.next;
		var index = 0;
		
		while (elt !== this)
		{
			fn(elt.data, index);
			elt = elt.next;
			index++;
		}
	}
}

class Diagram {
	
	pointRadius: number = 3;
	
	ctx: CanvasRenderingContext2D;
	
	width: number;
	height: number;
	
	points: PointList;
	selected: Point[];
	
	code: string;
	fn: Function;
	lines: LinkedList<string>;
	codeCursor: LinkedList<string>;
	afterChange: (code: string) => void; // this is called after the code is changed by a canvas event
	
	shift: boolean = false;
	ctrl: boolean = false;
	alt: boolean = false;
	
	showPoints: boolean = true;
	
	selectionBox: SelectionBox = null;
	
	constructor(ctx: CanvasRenderingContext2D, afterChange: (code: string) => void) {
		
		var diagram = this;
		
		this.ctx = ctx;
		this.afterChange = afterChange;
		
		this.ctx.canvas.style.cursor = 'default';
		
		this.setHandlers();
	}
	setHandlers(): void {
		
		var diagram = this;
		
		var r = diagram.pointRadius;
		var rr = r * r;
		
		var savedX = null;
		var savedY = null;
		
		diagram.ctx.canvas.onmousemove = function(e) { savedX = e.offsetX; savedY = e.offsetY; };
		
		diagram.ctx.canvas.onmousedown = function(e) {
			
			var points = diagram.points.enumerate();
			diagram.points.freeze(); // disables add
			
			function AfterSelect() {
				for (var i = 0; i < points.length; i++) { points[i].selected = false; }
				for (var i = 0; i < diagram.selected.length; i++) { diagram.selected[i].selected = true; }
			}
			
			var ax = e.offsetX;
			var ay = e.offsetY;
			
			if (diagram.selectionBox !== null)
			{
				// check for hit on selection box, if so, move in bulk
				if (diagram.selectionBox.left < ax && diagram.selectionBox.top < ay && ax < (diagram.selectionBox.left + diagram.selectionBox.width) && ay < (diagram.selectionBox.top + diagram.selectionBox.height))
				{
					//var a = diagram.Inverse({ x: ax, y: ay });
					
					diagram.ctx.canvas.onmousemove = function(e) {
						
						var mx = e.offsetX;
						var my = e.offsetY;
						
						// snap to the major grid
						//var m = diagram.Inverse({ x: mx, y: my });
						
						//var di = m.i - a.i;
						//var dj = m.j - a.j;
						
						var dx = mx - ax;
						var dy = my - ay;
						
						diagram.selectionBox.top += dy;
						diagram.selectionBox.left += dx;
						
						for (var i = 0; i < diagram.selected.length; i++)
						{
							var p = diagram.selected[i];
							p.x += dx;
							p.y += dy;
							//p.i += di;
							//p.j += dj;
							//diagram.TransformInPlace(p);
						}
						
						diagram.draw();
						
						ax = mx;
						ay = my;
						//a.i = m.i;
						//a.j = m.j;
					};
					diagram.ctx.canvas.onmouseup = function(e) {
						diagram.points.unfreeze();
						diagram.changePointCoords();
						diagram.sendText();
						diagram.ctx.canvas.onmousemove = function(e) { savedX = e.offsetX; savedY = e.offsetY; };
						diagram.ctx.canvas.onmouseup = null;
					};
					
					return;
				}
				else // if a selection box exists and the mousedown misses it, clear the selection box
				{
					diagram.selectionBox = null;
					diagram.selected = [];
					AfterSelect();
				}
			}
			
			// check for hit on an individual point
			var axMin = ax - r;
			var axMax = ax + r;
			var ayMin = ay - r;
			var ayMax = ay + r;
			
			var hit = null;
			
			for (var i = 0; i < points.length; i++)
			{
				var p = points[i];
				
				if (axMax < p.x || axMin > p.x || ayMax < p.y || ayMin > p.y) { continue; }
				
				var dd = (p.x - ax) * (p.x - ax) + (p.y - ay) * (p.y - ay);
				
				if (dd < rr)
				{
					hit = p;
					break;
				}
			}
			
			// if we hit an individual point, drag it
			if (hit !== null)
			{
				diagram.selected = [ hit ];
				AfterSelect();
				diagram.draw();
				
				var correctionX = ax - p.x;
				var correctionY = ay - p.y;
				
				diagram.ctx.canvas.onmousemove = function(e) {
					
					var mx = e.offsetX;
					var my = e.offsetY;
					
					// snap to the major grid
					//var {i, j} = diagram.Inverse({ x: mx, y: my });
					//
					//hit.i = i;
					//hit.j = j;
					//
					//if (hit.i < 0) { hit.i = 0; }
					//if (hit.j < 0) { hit.j = 0; }
					//if (hit.i > diagram.iMax) { hit.i = diagram.iMax; }
					//if (hit.j > diagram.jMax) { hit.j = diagram.jMax; }
					
					hit.x = mx + correctionX;
					hit.y = my + correctionY;
					
					//diagram.TransformInPlace(hit);
					diagram.draw();
				};
				diagram.ctx.canvas.onmouseup = function(e) {
					diagram.points.unfreeze();
					diagram.changePointCoords();
					diagram.sendText();
					diagram.ctx.canvas.onmousemove = function(e) { savedX = e.offsetX; savedY = e.offsetY; };
					diagram.ctx.canvas.onmouseup = null;
				};
				
				return;
			}
			
			// if we didn't hit anything, draw a selection box
			diagram.selectionBox = { top: 0, left: 0, width: 0, height: 0 };
			diagram.selected = [];
			AfterSelect();
			diagram.draw();
			
			diagram.ctx.canvas.onmousemove = function(e) {
				
				var mx = e.offsetX;
				var my = e.offsetY;
				
				var tp = diagram.selectionBox.top = Math.min(ay, my);
				var lf = diagram.selectionBox.left = Math.min(ax, mx);
				var wd = diagram.selectionBox.width = Math.max(ax, mx) - Math.min(ax, mx);
				var hg = diagram.selectionBox.height = Math.max(ay, my) - Math.min(ay, my);
				var rt = lf + wd;
				var bt = tp + hg;
				
				diagram.selected = [];
				
				for (var i = 0; i < points.length; i++)
				{
					var p = points[i];
					
					if (lf < p.x && p.x < rt && tp < p.y && p.y < bt)
					{
						diagram.selected.push(p);
					}
				}
				
				AfterSelect();
				diagram.draw();
			};
			diagram.ctx.canvas.onmouseup = function(e) {
				
				// enforce a minimum size for a persistent selection box - this means we can click sloppily on blank space to discard box
				if (diagram.selectionBox.width < 3 && diagram.selectionBox.height < 3)
				{
					diagram.selectionBox = null;
					diagram.selected = [];
					AfterSelect();
					diagram.draw();
				}
				
				diagram.points.unfreeze();
				diagram.ctx.canvas.onmousemove = function(e) { savedX = e.offsetX; savedY = e.offsetY; };
				diagram.ctx.canvas.onmouseup = null;
			};
		};
		
		diagram.ctx.canvas.onkeyup = function(e) {
			
			var key = e.keyCode;
			
			if (key == 16)
			{
				diagram.shift = false;
			}
			else if (key == 17)
			{
				diagram.ctrl = false;
			}
			else if (key == 18)
			{
				diagram.alt = false;
			}
		};
		
		diagram.ctx.canvas.onkeydown = function(e) {
			
			var key = e.keyCode;
			var letter = e.key;
			
			e.preventDefault();
			e.stopPropagation();
			
			if (key == 16)
			{
				diagram.shift = true;
			}
			else if (key == 17)
			{
				diagram.ctrl = true;
			}
			else if (key == 18)
			{
				diagram.alt = true;
			}
			else if (key == 32)
			{
				diagram.insert('p.add(' + savedX.toString() + ', ' + savedY.toString() + ');');
			}
			
			if (letter == 'v' || letter == 'V')
			{
				if (diagram.ctrl)
				{
					//diagram.Paste(diagram.shift);
				}
			}
			else if (letter == 'b' || letter == 'B')
			{
				diagram.insert('B(ctx);');
			}
			else if (letter == 'm' || letter == 'M')
			{
				diagram.insert('M(ctx, p.get());');
			}
			else if (letter == 'l' || letter == 'L')
			{
				diagram.insert('L(ctx, p.get());');
			}
			else if (letter == 'q' || letter == 'Q')
			{
				diagram.insert('Q(ctx, p.get(), p.get());');
			}
			else if (letter == 'c' || letter == 'C')
			{
				diagram.insert('C(ctx, p.get(), p.get(), p.get());');
			}
			else if (letter == 's' || letter == 'S')
			{
				diagram.insert('S(ctx);');
			}
			else if (letter == 'f' || letter == 'F')
			{
				diagram.insert('F(ctx);');
			}
			else if (letter == 'z' || letter == 'Z')
			{
				diagram.insert('Z(ctx);');
			}
		};
	}
	
	insert(line: string): void {
		
		var diagram = this;
		
		var elt = new LinkedList<string>();
		elt.data = line;
		
		// insert before cursor line
		elt.next = diagram.codeCursor;
		elt.prev = diagram.codeCursor.prev;
		diagram.codeCursor.prev.next = elt;
		diagram.codeCursor.prev = elt;
		
		diagram.sendText();
		diagram.clearPoints();
		diagram.draw();
		diagram.matchPointsWithLines();
	}
	
	receiveText(code: string, cursor: number): void {
		
		var diagram = this;
		
		this.code = code;
		this.compile();
		
		this.lines = new LinkedList<string>();
		this.code.split('\n').forEach(function(line: string, index: number) {
			var elt = diagram.lines.add(line);
			if (index == cursor) { diagram.codeCursor = elt; }
		});
		
		this.points = new PointList();
		
		this.selectionBox = null; // arguably better to null the box on canvas blur
		this.draw();
		
		this.matchPointsWithLines();
	}
	sendText(): void {
		this.code = this.lines.enumerate().join('\n');
		this.compile();
		this.afterChange(this.code);
	}
	compile(): void {
		
		var header = [
			"ctx.canvas.width = document.getElementById('width').value;",
			"ctx.canvas.height = document.getElementById('height').value;",
			"ctx.fillStyle = 'white';",
			"ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);"
		];
		
		this.fn = new Function('ctx, p', header.join('\n') + this.code);
	}
	changePointCoords(): void {
		
		this.points.forEach(function (p: Point): void {
			//var tabs = p.line.data.match(/^\t+/);
			//var ntabs = (tabs == null) ? 0 : tabs[0].length;
			//p.line.data = '\t'.repeat(ntabs) + 'p.add(' + p.x.toString() + ', ' + p.y.toString() + ');';
			p.line.data = p.line.data.replace(/p\.add\(\s*\d+,\s*\d+\s*\)/, 'p.add(' + p.x.toString() + ', ' + p.y.toString() + ')')
		});
	}
	clearPoints(): void {
		this.points = new PointList();
	}
	matchPointsWithLines(): void {
		
		var lines = [];
		var line = this.lines.next;
		while (line !== this.lines)
		{
			if (line.data.match('p.add')) { lines.push(line); }
			line = line.next;
		}
		
		var points = this.points.enumerate();
		for (var i = 0; i < points.length; i++)
		{
			points[i].line = lines[i];
		}
	}
	
	exportPath(): string {
		
		var centeredPoints = new PointList();
		
		var ps = this.points.enumerate();
		
		for (var i = 0; i < ps.length; i++)
		{
			centeredPoints.add(ps[i].x - this.ctx.canvas.width / 2, ps[i].y - this.ctx.canvas.height / 2 );
		}
		
		var ctx = new PathGen();
		
		this.points.resetCursor();
		this.points.resetFrozenCursor();
		
		try { this.fn(ctx, centeredPoints); } catch(e) { console.log(e); }
		
		return ctx.write();
	}
	
	draw(): void {
		
		this.points.resetCursor();
		this.points.resetFrozenCursor();
		
		try { this.fn(this.ctx, this.points); } catch(e) { }
		
		if (this.showPoints) { this.drawPoints(); }
		if (this.selectionBox) { this.drawSelectionBox(); }
	}
	drawPoints(): void {
		
		this.points.forEach(p => {
			this.ctx.fillStyle = p.selected ? 'orange' : 'green';
			this.ctx.beginPath();
			this.ctx.arc(p.x, p.y, this.pointRadius, 0, Math.PI*2, false);
			this.ctx.fill();
		});
	}
	drawSelectionBox(): void {
		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = 'rgb(128,128,128)';
		this.ctx.strokeRect(this.selectionBox.left+0.5, this.selectionBox.top+0.5, this.selectionBox.width, this.selectionBox.height);
	}
}

class PathGen {
	
	precision: number = 0;
	parts: string[];
	
	fillStyle: string = null;
	strokeStyle: string = null;
	lineWidth: string = null;
	canvas: { width: number, height: number } = { width: 0, height: 0 };
	fillRect(): void { }
	stroke(): void { }
	fill(): void { }
	
	constructor() {
		this.parts = [];
	}
	write(): string {
		return this.parts.join(' ');
	}
	beginPath(): void {
		
	}
	moveTo(x: number, y: number): void {
		this.parts.push('M');
		this.parts.push(x.toFixed(this.precision));
		this.parts.push(y.toFixed(this.precision));
	}
	lineTo(x: number, y: number): void {
		this.parts.push('L');
		this.parts.push(x.toFixed(this.precision));
		this.parts.push(y.toFixed(this.precision));
	}
	quadraticCurveTo(x1: number, y1: number, x2: number, y2: number): void {
		this.parts.push('Q');
		this.parts.push(x1.toFixed(this.precision));
		this.parts.push(y1.toFixed(this.precision));
		this.parts.push(x2.toFixed(this.precision));
		this.parts.push(y2.toFixed(this.precision));
	}
	bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
		this.parts.push('C');
		this.parts.push(x1.toFixed(this.precision));
		this.parts.push(y1.toFixed(this.precision));
		this.parts.push(x2.toFixed(this.precision));
		this.parts.push(y2.toFixed(this.precision));
		this.parts.push(x3.toFixed(this.precision));
		this.parts.push(y3.toFixed(this.precision));
	}
	arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, bAntiClockwise: boolean): void {
		
		// there are two possible ellipses for the path to travel around and two different possible paths on both ellipses, giving four possible paths. The first argument is the large-arc-flag. It simply determines if the arc should be greater than or less than 180 degrees; in the end, this flag determines which direction the arc will travel around a given circle. The second argument is the sweep-flag. It determines if the arc should begin moving at negative angles or positive ones, which essentially picks which of the two circles you will travel around.
		
		// rX,rY rotation, arc, sweep, eX,eY
		
		var large = ((endAngle - startAngle) > Math.PI) ? '1' : '0';
		
		var rx = r;
		var ry = r;
		var xAxisRotation = '0';
		var largeArcFlag = large;
		var sweepFlag = '1';
		var x = cx + r * Math.cos(endAngle);
		var y = cy + r * Math.sin(endAngle);
		
		this.parts.push('A');
		this.parts.push(rx.toFixed(this.precision));
		this.parts.push(ry.toFixed(this.precision));
		this.parts.push(xAxisRotation);
		this.parts.push(largeArcFlag);
		this.parts.push(sweepFlag);
		this.parts.push(x.toFixed(this.precision));
		this.parts.push(y.toFixed(this.precision));
	}
	closePath(): void {
		this.parts.push('Z');
	}
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
	
	var bprime = { x: b.x, y: a.y, selected: false, line: null }
	
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
	
	var bprime = { x: a.x, y: b.y, selected: false, line: null }
	
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
	return { x: b.x, y: a.y, selected: false, line: null };
}
function V(a: Point, b: Point): Point {
	return { x: a.x, y: b.y, selected: false, line: null };
}
function Hori(ps: Point[]): Point[] {
	
	if (ps.length == 0) { return []; }
	
	var qs = [];
	
	for (var i = 0; i < ps.length; i++)
	{
		qs.push({ x: ps[i].x, y: ps[0].y, selected: false, line: null });
	}
	
	return qs;
}
function Vert(ps: Point[]): Point[] {
	
	if (ps.length == 0) { return []; }
	
	var qs = [];
	
	for (var i = 0; i < ps.length; i++)
	{
		qs.push({ x: ps[0].x, y: ps[i].y, selected: false, line: null });
	}
	
	return qs;
}
function HoriU(a: Point, b: Point, n: number): Point[] {
	
	var qs = [];
	
	for (var i = 0; i < n; i++)
	{
		qs.push({ x: a.x + i * (b.x - a.x), y: a.y, selected: false, line: null });
	}
	
	return qs;
}
function VertU(a: Point, b: Point, n: number): Point[] {
	
	var qs = [];
	
	for (var i = 0; i < n; i++)
	{
		qs.push({ x: a.x, y: a.y + i * (b.y - a.y), selected: false, line: null });
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
		
		points.push({ x: x, y: y, selected: false, line: null });
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
			return { x: a.x, y: y, selected: false, line: null };
		}
	}
	else if (a.y == b.y)
	{
		if (c.x == d.x) // horizontal x vertical
		{
			return { x: c.x, y: a.y, selected: false, line: null };
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
			return { x: c.x, y: y, selected: false, line: null };
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
	
	return { x: x, y: y, selected: false, line: null };
}
function IntersectionH(a: Point, b: Point, h: Point): Point {
	
	if (a.y == b.y) { return null; }
	if (a.x == b.x) { return { x: a.x, y: h.y, selected: false, line: null }; }
	
	var slope = (b.y - a.y) / (b.x - a.x);
	var intercept = a.y - a.x * slope;
	
	var x = (h.y - intercept) / slope;
	
	return { x: x, y: h.y, selected: false, line: null };
}
function IntersectionV(a: Point, b: Point, v: Point): Point {
	
	if (a.x == b.x) { return null; }
	if (a.y == b.y) { return { x: v.x, y: a.y, selected: false, line: null }; }
	
	var slope = (b.y - a.y) / (b.x - a.x);
	var intercept = a.y - a.x * slope;
	
	var y = slope * v.x + intercept;
	
	return { x: v.x, y: y, selected: false, line: null };
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
		result.push({ x: x, y: y, selected: false, line: null });
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
			result.push({ x: x, y: y, selected: false, line: null });
		}
	}
	
	return result;
}


