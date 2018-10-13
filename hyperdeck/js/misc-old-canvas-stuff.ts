
//  unit - in, cm, mm, pt - default in
//  pixelsPerUnit - default 100/in
//  cubitsPerUnit - default 100/in

//if (typeof params == 'undefined') { params = {}; }
//var type = params.type ? params.type : 'canvas';

//var pointsPerUnitDict = {in:72,cm:72/2.54,mm:72/25.4,pt:1};
//var unit = params.unit ? params.unit : 'in';
//
//var pixelsPerUnit = params.pixelsPerUnit ? params.pixelsPerUnit : 100;
//var cubitsPerUnit = params.cubitsPerUnit ? params.cubitsPerUnit : 100;
//var pointsPerUnit = pointsPerUnitDict[unit];
//
//this.pixelsPerCubit = pixelsPerUnit / cubitsPerUnit;
//this.cubitsPerPixel = cubitsPerUnit / pixelsPerUnit;
//this.pointsPerCubit = pointsPerUnit / cubitsPerUnit;
//this.cubitsPerPoint = cubitsPerUnit / pointsPerUnit;

//this.sections = [];
//this.pages = []; // should be indexed by names as well
//this.type = type; // 'canvas' or 'svg' - NewSection() uses this

// FinalizeGraphics() sets this and ExportLocalToPdf() reads it
//this.pdfContextArray = null;

//this.matrix = new Matrix();

// this is so we can have a global styles object used across different draw functions without having to have a fixed object name 'styles' or having to pass the object around
//this.styles = null;

// for saving and restoring the below parameters
//this.styleStack = [];

//if (typeof window != 'undefined')
//{
//	// this is used for conversion of 'red' -> 'rgb(255,0,0)' and text measurement and access of pixel data of image components
//	this.savedCanvas = document.createElement('canvas');
//	this.savedCanvasContext = this.savedCanvas.getContext('2d');
//	this.savedCanvasContext.font = this.font;
//}

//sections: Section[] = [];
//currentSection: Section;
//
//// FinalizeGraphics() sets this and ExportLocalToPdf() reads it
//pdfContextArray: any;

// this is so we can have a global styles object used across different draw functions without having to have a fixed object name 'styles' or having to pass the object around
//styles: Style = null;
//styleStack: Style[] = []; // for saving and restoring the below parameters

//savedCanvas: HTMLCanvasElement = null;
//savedCanvasContext: CanvasRenderingContext2D = null;


SetActiveSection(nameOrIndexOrSection: any): void {

	var type = typeof(nameOrIndexOrSection);
	var section = null;
	
	if (type == 'string' || type == 'number')
	{
		section = this.sections[nameOrIndexOrSection];
	}
	else
	{
		section = nameOrIndexOrSection;
	}
	
	if (this.type == 'canvas')
	{
		this.g = section.canvasContext;
		this.canvas = section.canvasContext.canvas;
	}
	else if (this.type == 'bitmap')
	{
		this.bmp = section.bmp;
		this.canvas = section.bmp; // width and height will still work, at least
	}
	
	this.commands = section.pdfCommands[0]; // this is temporary - the drawing functions have to look at the y coordinate and change page as needed
	this.eltStrings = section.eltStrings;
	this.currentSection = section;
}
NewSection(width: number, height: number, nPages: number): Section {
	
	var section = new Section(this, width, height, nPages);
	
	this.sections.push(section);
	//if (params.name) { this.sections[params.name] = section; }
	
	this.SetActiveSection(section);
	
	return section;
}

class Section {
	
	parent: Canvas;
	
	// replace with a Hyperdeck.Widgets.Box? (which raises the question of whether Box should be in Hyperdeck.Widgets)
	width: number;
	height: number;
	left: number;
	right: number;
	cx: number;
	wr: number;
	top: number;
	bottom: number;
	cy: number;
	hr: number;
	
	nPages: number;
	
	// so for now, this refers to page size?  we need to distinguish between page dimensions and section dimensions
	wdCu: number;
	hgCu: number;
	pxWidth: number;
	pxHeight: number;
	ptWidth: number;
	ptHeight: number;
	
	div: HTMLDivElement;
	
	canvasContext: CanvasRenderingContext2D;
	bmp: Bitmap;
	
	eltStrings: string[][] = [];
	
	pdfCommands: string[][] = [];
	
	constructor(parent: Canvas, width: number, height: number, nPages: number) {
		
		this.parent = parent;
		
		this.width = width;
		this.height = height;
		this.left = 0;
		this.right = width;
		this.cx = width / 2;
		this.wr = width / 2;
		this.top = 0;
		this.bottom = height;
		this.cy = height / 2;
		this.hr = height / 2;
		
		this.nPages = nPages;
		
		this.wdCu = width;
		this.hgCu = height;
		this.pxWidth = width * parent.pixelsPerCubit;
		this.pxHeight = height * parent.pixelsPerCubit;
		this.ptWidth = width * parent.pointsPerCubit;
		this.ptHeight = height * parent.pointsPerCubit;
		
		for (var i = 0; i < nPages; i++)
		{
			// this needs to be added to each newly-created sublist of pdfCommands
			// the other option is to calculate page.ptHeight - y for everything
			var pageCommands = [];
			pageCommands.push('1 0 0 1 0 ' + this.ptHeight.toString() + ' cm'); // the initial PDF transform
			pageCommands.push(this.parent.pointsPerCubit.toString() + ' 0 0 -' + this.parent.pointsPerCubit.toString() + ' 0 0 cm');
			this.pdfCommands.push(pageCommands);
		}
		
		if (typeof window != 'undefined')
		{
			var div = document.createElement('div');
			div.style.border = '1px solid #c3c3c3';
			//div.style.margin = '1em'; // any subcanvases will be children of this div, which means the top-level canvas has to be flush with this div on the left top so that the absolute positioning on the subcanvas works.  however, we want gaps between the sections - don't know how best to do that now
			div.style.width = this.pxWidth.toString();
			div.style.height = (this.pxHeight * this.nPages).toString();
			this.div = div;
		}
		
		if (parent.type == 'canvas')
		{
			if (typeof window != 'undefined')
			{
				var canvas = document.createElement('canvas');
				canvas.width = this.pxWidth;
				canvas.height = this.pxHeight * this.nPages;
				canvas.setAttribute('tabIndex', parent.sections.length.toString());
				
				var ctx = canvas.getContext('2d');
				this.canvasContext = ctx;
				
				this.div.appendChild(canvas);
				
				ctx.scale(parent.pixelsPerCubit, parent.pixelsPerCubit);
			}
		}
		else if (parent.type == 'bitmap')
		{
			this.bmp = new Bitmap(this.pxWidth, this.pxHeight * this.nPages, 3);
		}
		else if (parent.type == 'svg')
		{
			
		}
		else
		{
			throw new Error();
		}
	}
	SetDimensions(nPages: number, wd: number, hg: number): void {
		
		// new page sizes should be able to be set automatically when graphical elements are drawn out of bounds
		
		var section = this;
		
		section.nPages = nPages;
		section.wdCu = wd;
		section.hgCu = hg;
		section.pxWidth = wd * section.parent.pixelsPerCubit;
		section.pxHeight = hg * section.parent.pixelsPerCubit;
		section.ptWidth = wd * section.parent.pointsPerCubit;
		section.ptHeight = hg * section.parent.pointsPerCubit;
		
		if (section.parent.type == 'canvas')
		{
			if (typeof window != 'undefined')
			{
				var canvas = section.canvasContext.canvas;
				canvas.width = section.pxWidth;
				canvas.height = section.pxHeight * nPages;
				section.canvasContext = canvas.getContext('2d');
				section.canvasContext.scale(section.parent.pixelsPerCubit, section.parent.pixelsPerCubit);
			}
		}
		
		section.pdfCommands = [];
		
		for (var i = 0; i < nPages; i++)
		{
			// this needs to be added to each newly-created sublist of pdfCommands
			// the other option is to calculate page.ptHeight - y for everything
			var pageCommands = [];
			pageCommands.push('1 0 0 1 0 ' + section.ptHeight.toString() + ' cm'); // the initial PDF transform
			pageCommands.push(section.parent.pointsPerCubit.toString() + ' 0 0 -' + section.parent.pointsPerCubit.toString() + ' 0 0 cm');
			section.pdfCommands.push(pageCommands);
		}
	}
}
class Style {
	
	fontSize: number;
	fontFamily: string;
	fontSizeUnits: CSSUnit;
	lineWidth: number
	strokeStyle: string;
	fillStyle: string;
	font: string;
	textAlign: TextAlign;
	textBaseline: TextBaseline;
	transform: Matrix;
	
	color: string;
	fill: string;
	stroke: string;
	
	hAlign: TextAlign;
	vAlign: TextBaseline;
	
	constructor() {
		
	}
	
	Save(): void {
		var saved: Style = {
			fontFamily: this.fontFamily,
			fontSize: this.fontSize,
			fontSizeUnits: this.fontSizeUnits,
			textAlign: this.textAlign,
			textBaseline: this.textBaseline,
			fillStyle: this.fillStyle,
			strokeStyle: this.strokeStyle,
			lineWidth: this.lineWidth
		};
		this.styleStack.push(saved);
	}
	Restore(): void {
		var saved = this.styleStack.pop();
		this.fontFamily = saved.fontFamily;
		this.fontSize = saved.fontSize;
		this.fontSizeUnits = saved.fontSizeUnits;
		this.textAlign = saved.textAlign;
		this.textBaseline = saved.textBaseline;
		this.fillStyle = saved.fillStyle;
		this.strokeStyle = saved.strokeStyle;
		this.lineWidth = saved.lineWidth;
	}
	SetStyle(style: StyleOrIndex): void {
		
		if (style === undefined) { return; }
		
		if (typeof(style) == 'string') { style = this.styles[style]; }
		
		if (style.font)
		{
			this.font = style.font;
		}
		else if (style.fontFamily && style.fontSize)
		{
			this.font = style.fontSize + 'pt ' + style.fontFamily;
		}
		
		if (style.color)
		{
			this.lineWidth = 1;
			this.strokeStyle = style.color;
			this.fillStyle = style.color;
		}
		
		if (style.fill)
		{
			this.fillStyle = style.fill;
		}
		
		if (style.stroke)
		{
			this.strokeStyle = style.stroke;
		}
		
		var hAlign: TextAlign = 'left';
		var vAlign: TextBaseline = 'bottom';
		if (style.hAlign) { hAlign = style.hAlign; }
		if (style.vAlign) { vAlign = style.vAlign; }
		this.textAlign = hAlign;
		this.textBaseline = vAlign;
	}
	SaveStyle(): Style {
		
		return {
			lineWidth: this.lineWidth,
			strokeStyle: this.strokeStyle,
			fillStyle: this.fillStyle,
			font: this.font,
			textAlign: this.textAlign,
			textBaseline: this.textBaseline,
			transform: this.matrix
		};
	}
}

class Transform {
	
	// Transform is a wrapper around calls to an underlying, sort of like middleware
	underlying: any;
	
	debugTransform: boolean = true; // this calculates the transform but does not use it - the commands are passed through to the <canvas>
	useOwnTransform: boolean = false;
	matrix: Matrix;
	matrixStack: Matrix[] = [];
	loggerStack: string[] = []; // 'scale(10)', 'rotate(90)', 'translate(10, 20)' - convert angles to degrees for this
	savedMatrixStack: Matrix[] = [];
	
	clearRect(left: number, top: number, width: number, height: number): void {
		
		//var savedFillStyle = this.fillStyle;
		//this.fillStyle = 'rgb(255,255,255)';
		//this.fillRect(left, top, width, height);
		//this.fillStyle = savedFillStyle;
	}
	drawRect(left: number, top: number, width: number, height: number, doFill: boolean, doStroke: boolean): void {
		
		var p1 = { x : left , y : top };
		var p2 = { x : left + width , y : top };
		var p3 = { x : left + width , y : top + height };
		var p4 = { x : left , y : top + height };
		
		this.beginPath();
		this.moveTo(p1.x, p1.y);
		this.lineTo(p2.x, p2.y);
		this.lineTo(p3.x, p3.y);
		this.lineTo(p4.x, p4.y);
		this.closePath();
		if (doFill) { this.fill(); }
		if (doStroke) { this.stroke(); }
	}
	
	moveTo(x: number, y: number): void {
		
		var p = Matrix.Apply(this.matrix, {x:x,y:y});
		x = p.x;
		y = p.y;
	}
	lineTo(x: number, y: number): void {
		
		var p = Matrix.Apply(this.matrix, {x:x,y:y});
		x = p.x;
		y = p.y;
	}
	quadraticCurveTo(x1: number, y1: number, x: number, y: number): void {
		
		var p1 = Matrix.Apply(this.matrix, {x:x1,y:y1});
		var p = Matrix.Apply(this.matrix, {x:x,y:y});
		x1 = p1.x;
		y1 = p1.y;
		x = p.x;
		y = p.y;
	}
	bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
		
		var p1 = Matrix.Apply(this.matrix, {x:x1,y:y1});
		var p2 = Matrix.Apply(this.matrix, {x:x2,y:y2});
		var p = Matrix.Apply(this.matrix, {x:x,y:y});
		x1 = p1.x;
		y1 = p1.y;
		x2 = p2.x;
		y2 = p2.y;
		x = p.x;
		y = p.y;
	}
	arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void {
		
		var p1 = Matrix.Apply(this.matrix, {x:x1,y:y1});
		var p2 = Matrix.Apply(this.matrix, {x:x2,y:y2});
		x1 = p1.x;
		y1 = p1.y;
		x2 = p2.x;
		y2 = p2.y;
	}
	arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, bAntiClockwise: boolean): void {
		
		var p = Matrix.Apply(this.matrix, {x:cx,y:cy});
		cx = p.x;
		cy = p.y;
	}
	
	rect(left: number, top: number, width: number, height: number): void {
		
		var p1 = Matrix.Apply(this.matrix, {x:left,y:top});
		var p2 = Matrix.Apply(this.matrix, {x:left+width,y:top+height});
	}
	
	save(): void {
		this.savedMatrixStack.push(this.matrix);
		if (this.useOwnTransform) { return; }
	}
	restore(): void {
		this.matrix = this.savedMatrixStack.pop();
		this.matrixStack = []; // restoration obliterates the logger and saved matrix chain
		this.loggerStack = [];
		if (this.useOwnTransform) { return; }
	}
	scale(x: number, y: number): void {
		var m = Matrix.Scale(x, y);
		this.matrix = Matrix.Multiply(m, this.matrix);
		this.matrixStack.push(m);
		this.loggerStack.push('scale(' + x.toString() + ' ' + y.toString() + ')');
		if (this.useOwnTransform) { return; }
	}
	rotateCounterClockwise(angle: number): void {
		var m = Matrix.Rotate(angle);
		this.matrix = Matrix.Multiply(m, this.matrix);
		this.matrixStack.push(m);
		this.loggerStack.push('rotate(' + (angle / (Math.PI * 2) * 360).toString() + ')');
		if (this.useOwnTransform) { return; }
	}
	rotateClockwise(angle: number): void {
		var m = Matrix.Rotate(-angle);
		this.matrix = Matrix.Multiply(m, this.matrix);
		this.matrixStack.push(m);
		this.loggerStack.push('rotate(' + (angle / (Math.PI * 2) * 360).toString() + ')');
		if (this.useOwnTransform) { return; }
	}
	translate(x: number, y: number): void {
		var m = Matrix.Translate(x, y);
		this.matrix = Matrix.Multiply(m, this.matrix);
		this.matrixStack.push(m);
		this.loggerStack.push('translate(' + x.toString() + ',' + y.toString() + ')');
		if (this.useOwnTransform) { return; }
	}
	transform(sx: number, kx: number, ky: number, sy: number, dx: number, dy: number): void {
		var m = new Matrix();
		m.m = [[sx, kx, dx],[sy, ky, dy],[0,0,1]];
		this.matrix = Matrix.Multiply(m, this.matrix);
		this.matrixStack.push(m);
		this.loggerStack.push('matrix(' + sx.toString() + ' ' + ky.toString() + ' ' + kx.toString() + ' ' + sy.toString() + ' ' + dx.toString() + ' ' + dy.toString() + ')');
		if (this.useOwnTransform) { return; }
	}
	setTransform(sx: number, kx: number, ky: number, sy: number, dx: number, dy: number): void {
		var m = new Matrix();
		m.m = [[sx, kx, dx],[sy, ky, dy],[0,0,1]];
		this.matrix = Matrix.Multiply(m, this.matrix);
		this.matrixStack.push(m);
		this.loggerStack = [ 'matrix(' + sx.toString() + ' ' + ky.toString() + ' ' + kx.toString() + ' ' + sy.toString() + ' ' + dx.toString() + ' ' + dy.toString() + ')' ];
		if (this.useOwnTransform) { return; }
	}
	resetTransform(): void {
		this.matrix = new Matrix();
		this.matrixStack = [];
		this.loggerStack = [];
		if (this.useOwnTransform) { return; }
	}
}
class Matrix {
	
	rows: number = 3;
	cols: number = 3;
	m: any = [[1,0,0],[0,1,0],[0,0,1]];
	
	constructor() { }
	static Multiply(a: Matrix, b: Matrix): Matrix {
		
		if (a.cols != b.rows) { throw new Error(); }
		
		var m = new Matrix();
		
		for (var i = 0; i < a.rows; i++)
		{
			for (var j = 0; j < b.cols; j++)
			{
				var sum = 0;
				
				for (var k = 0; k < a.cols; k++)
				{
					sum += a.m[i][k] * b.m[k][j];
				}
				
				m.m[i][j] = sum;
			}
		}
		
		return m;
	}
	static Translate(x: number, y: number): Matrix {
		var m = new Matrix();
		m.m = [[1,0,x],[0,1,y],[0,0,1]];
		return m;
	}
	static Scale(x: number, y: number): Matrix {
		var m = new Matrix();
		if (typeof(y) === 'undefined') { y = x; }
		m.m = [[x,0,0],[0,y,0],[0,0,1]];
		return m;
	}
	static Rotate(angleRad: number): Matrix {
		var m = new Matrix();
		m.m = [[Math.cos(angleRad),-Math.sin(angleRad),0],[Math.sin(angleRad),Math.cos(angleRad),0],[0,0,1]];
		return m
	}
	static Apply(m: Matrix, p: Point): Point {
		
		return {
			x: m.m[0][0] * p.x + m.m[0][1] * p.y + m.m[0][2],
			y: m.m[1][0] * p.x + m.m[1][1] * p.y + m.m[1][2]
		};
	}
}

// convert this to the Transform class?
function ParseSvgTransform(str: string): Transform2[] {
	
	var transform = [];
	// translate : { x : 0 , y : 0 }
	// scale : { x : 1 , y : 1 }
	// matrix : { sx : 1 , ky : 0 , kx : 0 , sy : 1 , dx : 0 , dy : 0 }
	if (str === undefined) { return transform; }
	
	var regex = RegExp('[\(\)]')
	var parts = str.split(regex);
	
	var k = 0;
	
	while (k < parts.length)
	{
		var part = parts[k].trim();
		
		if (part == 'translate')
		{
			var args = parts[++k].split(',');
			transform.push({ type : 'translate' , x : parseFloat(args[0]) , y : parseFloat(args[1])});
		}
		else if (part == 'scale')
		{
			var args = parts[++k].split(',');
			
			if (args.length == 1)
			{
				transform.push({ type : 'scale' , x : parseFloat(args[0]) , y : parseFloat(args[0])});
			}
			else if (args.length == 2)
			{
				transform.push({ type : 'scale' , x : parseFloat(args[0]) , y : parseFloat(args[1])});
			}
			else
			{
				throw new Error();
			}
		}
		else if (part == 'matrix')
		{
			var args = parts[++k].split(' ');
			var sx = parseFloat(args[0]);
			var ky = parseFloat(args[1]);
			var kx = parseFloat(args[2]);
			var sy = parseFloat(args[3]);
			var dx = parseFloat(args[4]);
			var dy = parseFloat(args[5]);
			transform.push({ type : 'transform' , sx : sx , ky : ky , kx : kx , sy : sy , dx : dx , dy : dy });
		}
		else if (part == 'rotate')
		{
			throw new Error();
		}
		else if (part == '')
		{
			// whitespace between transforms
		}
		else
		{
			throw new Error();
		}
		
		k++;
	}
	
	return transform;
}
interface Transform2 {
	
	type: TransformType;
	
	// type == 'scale' or 'translate'
	x?: number;
	y?: number;
	
	// type == 'transform'
	sx?: number;
	sy?: number;
	kx?: number;
	ky?: number;
	dx?: number;
	dy?: number;
}
type TransformType = 'translate' | 'scale' | 'rotate' | 'transform';

interface Point {
	x?: number;
	y?: number;
	onCurve?: boolean;
}
interface Path2D { }
interface CanvasRenderingContext2D {
	//isPointInPath: (path: Path2D, x: number, y: number) => boolean;
	isPointInStroke: (path: Path2D, x: number, y: number) => boolean;
}
interface TextMetrics { height?: number; }
interface ColorStop { d: number; color: Color; }
class Gradient {
	
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	colorStops: ColorStop[] = [];
	
	constructor(x1, y1, x2, y2) { this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; }
	addColorStop = function(d: number, color: Color): void { this.colorStops.push({d:d,color:color}); }
}
class Pattern {
	
	source: any;
	repeat: any;
	
	constructor(source: any, repeat: any) { this.source = source; this.repeat = repeat; }
}
