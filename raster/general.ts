
interface opentype {
	parse(buffer: ArrayBuffer): Font;
	load(url: string, callback: (err: any, font: Font) => void): void;
	loadSync(url: string): Font;
}
interface Font {
	
	unitsPerEm: number;
	ascender: number;
	descender: number;
	glyphs: Glyph[];
	familyName: string;
	styleName: string;
	supported: boolean;
	
	getPath(text: string, x: number, y: number, fontSize: number, options: { kerning?: boolean }): Path;
	getPaths(text: string, x: number, y: number, fontSize: number, options: { kerning?: boolean }): Path[];
	draw(ctx: General, text: string, x: number, y: number, fontSize: number, options: { kerning?: boolean }): void;
	drawPoints(ctx: General, text: string, x: number, y: number, fontSize: number, options: { kerning?: boolean }): void;
	drawMetrics(ctx: General, text: string, x: number, y: number, fontSize: number, options: { kerning?: boolean }): void;
	stringToGlyphs(str: string): Glyph[];
	charToGlyph(char: string): Glyph;
	getKerningValue(leftGlyph: Glyph, rightGlyph: Glyph): number;
	getKerningValue(leftGlyphIndex: number, rightGlyphIndex: number): number;
	toTables(): any;
	toArrayBuffer(): ArrayBuffer;
}
interface Glyph {
	font: Font;
	name: string;
	unicode: number;
	unicodes: number[];
	index: number;
	advanceWidth: number;
	xMin: number;
	yMin: number;
	xMax: number;
	yMax: number;
	path: Path;
	
	getPath(x: number, y: number, fontSize: number): Path;
	draw(ctx: General, x: number, y: number, fontSize: number): void;
	drawPoints(ctx: General, x: number, y: number, fontSize: number): void;
	drawMetrics(ctx: General, x: number, y: number, fontSize: number): void;
}
interface Path {
	commands: PathCommand[];
	fill: string;
	stroke: string;
	strokeWidth: string;
	
	draw(ctx: General): void;
	getBoundingBox(): BoundingBox;
	toPathData(decimalPlaces: number): string;
	toSVG(decimalPlaces: number): string;
}
interface PathCommand {
	type: PathCommandType;
	x?: number;
	y?: number;
	x1?: number;
	y1?: number;
	x2?: number;
	y2?: number;
}
type PathCommandType = 'M' | 'L' | 'C' | 'Q' | 'Z';
interface BoundingBox {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

type CSSUnit = "pt" | "px" | "cu" | "in" | "cm";
type TextAlign = "left" | "center" | "right" | "start" | "end";
type TextBaseline = "top" | "middle" | "center" | "bottom" | "alphabetic" | "hanging" | "ideographic";
interface Color { r?: number; g?: number; b?: number; a?: number; }
interface Dict<T> { [index: string]: T; }

export class General {
	
	// this class contains state and functions that call the path functions
	
	static fontNameToFontObject: Dict<Font> = {};
	
	//canvas: HTMLCanvasElement; // the <canvas> element - this is for the passthrough usage e.g. ctx.canvas.width
	canvas: { width: number; height: number } = { width: 0, height: 0 };
	
	pixelsPerCubit: number = 1;
	cubitsPerPixel: number = 1;
	pointsPerCubit: number = 1;
	cubitsPerPoint: number = 1;
	
	fontFamily: string = 'serif';
	bold: boolean = false;
	italic: boolean = false;
	fontSize: number = 10; // this is what we display in font UI
	fontSizePt: number = 10;
	fontSizePx: number;
	fontSizeCu: number;
	fontSizeUnits: CSSUnit = 'pt';
	fontObject: Font;
	
	currentPoint: { x: number; y: number; } = { x : 0 , y : 0 }; // this is only needed for arcTo, because we need to synthesize it for PDF and have no access to the current point
	
	protected _textAlign: TextAlign = 'left'; // start (default), end, left, right, center - we should change this from left to start.  does opentype.js support RTL?
	protected _textBaseline: TextBaseline = 'alphabetic'; // alphabetic (default), top, hanging, middle, ideographic, bottom
	protected _lineWidth: number = 1;
	protected _fillStyle: string = 'rgb(0,0,0)'; // make these objects and parse in the setter?
	protected _strokeStyle: string = 'rgb(0,0,0)'; // make these objects and parse in the setter?
	protected _lineDashArray: number[] = []; // setLineDash([onPixels, offPixels, onPixels, offPixels, ...])
	protected _lineDashOffset: number = 0;
	protected _lineJoin: string = 'miter'; // miter (default), bevel, round
	protected _lineCap: string = 'butt'; // butt (default), round, square
	protected _miterLimit: number = 10; // is this part of the spec or just a chrome thing?  what is the default miter limit for PDF?
	protected _globalAlpha: number = 1.0; // float in [0,1] - 0 = transparent, 1 = opaque
	protected _globalCompositeOperation: string = 'source-over'; // source-over (default), source-in, source-out, source-atop, destination-over, destination-in, destination-out, destination-atop, lighter, copy, xor (darker was removed from the spec)
	protected _shadowColor: string = 'rgba(0, 0, 0, 0)';
	protected _shadowBlur: number = 0; // float, not sure exactly how to implement
	protected _shadowOffsetX: number = 0;
	protected _shadowOffsetY: number = 0;
	
	msFillRule: string = 'evenodd'; // evenodd or nonzero, presumably
	msImageSmoothingEnabled: boolean = false; // not sure if false is the default
	mozImageSmoothingEnabled: boolean = false; // not sure if false is the default
	webkitImageSmoothingEnabled: boolean = false; // not sure if false is the default
	oImageSmoothingEnabled: boolean = false; // not sure if false is the default
	
	protected fillColor: Color = {r:0,g:0,b:0,a:255};
	protected strokeColor: Color = {r:0,g:0,b:0,a:255};
	
	// all these getters and setters were here to split the set command to pdf/ctx.  what now?  i think we can delete them
	get textAlign(): TextAlign { return this._textAlign; }
	set textAlign(value: TextAlign) { this._textAlign = value; }
	get textBaseline(): TextBaseline { return this._textBaseline; }
	set textBaseline(value: TextBaseline) { this._textBaseline = value; }
	get lineWidth(): number { return this._lineWidth; }
	set lineWidth(value: number) { this._lineWidth = value; }
	get fillStyle(): string { return this._fillStyle; }
	set fillStyle(value: string) { this._fillStyle = value; this.fillColor = this.ParseColor(value); }
	get strokeStyle(): string { return this._strokeStyle; }
	set strokeStyle(value: string) { this._strokeStyle = value; this.strokeColor = this.ParseColor(value); }
	get lineDashOffset(): number { return this._lineDashOffset; }
	set lineDashOffset(value: number) { this._lineDashOffset = value; }
	get lineJoin(): string { return this._lineJoin; }
	set lineJoin(value: string) { this._lineJoin = value; }
	get lineCap(): string { return this._lineCap; }
	set lineCap(value: string) { this._lineCap = value; }
	get miterLimit(): number { return this._miterLimit; }
	set miterLimit(value: number) { this._miterLimit = value; }
	get globalAlpha(): number { return this._globalAlpha; }
	set globalAlpha(value: number) { this._globalAlpha = value; }
	get globalCompositeOperation(): string { return this._globalCompositeOperation; }
	set globalCompositeOperation(value: string) { this._globalCompositeOperation = value; }
	get shadowColor(): string { return this._shadowColor; }
	set shadowColor(value: string) { this._shadowColor = value; }
	get shadowBlur(): number { return this._shadowBlur; }
	set shadowBlur(value: number) { this._shadowBlur = value; }
	get shadowOffsetX(): number { return this._shadowOffsetX; }
	set shadowOffsetX(value: number) { this._shadowOffsetX = value; }
	get shadowOffsetY(): number { return this._shadowOffsetY; }
	set shadowOffsetY(value: number) { this._shadowOffsetY = value; }

	get font(): string { return this.fontSize.toString() + this.fontSizeUnits + ' ' + this.fontFamily; }
	set font(str: string) {
		
		if (!str) { return; } // this catches null, undefined, and empty string
		
		var letterIndex = str.search(/[A-Za-z]/);
		var spaceIndex = str.search(' ');
		
		// the above fails on '10 pt Helvetica' (space between 10 and pt), so do this
		if (letterIndex > spaceIndex) { spaceIndex = letterIndex + str.substr(letterIndex).search(' '); }
		
		var part0 = str.substring(0, letterIndex).trim();
		var part1 = str.substring(letterIndex, spaceIndex);
		var part2 = str.substring(spaceIndex+1);
		
		this.fontSize = parseFloat(part0);
		this.fontSizeUnits = part1 as CSSUnit;
		
		if (this.fontSizeUnits == 'pt')
		{
			this.fontSizePt = this.fontSize;
			this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
			this.fontSizePx = this.fontSizeCu * this.pixelsPerCubit;
		}
		else if (this.fontSizeUnits == 'px')
		{
			this.fontSizePx = this.fontSize;
			this.fontSizeCu = this.fontSizePx * this.cubitsPerPixel;
			this.fontSizePt = this.fontSizeCu * this.pointsPerCubit;
		}
		else if (this.fontSizeUnits == 'cu')
		{
			this.fontSizeCu = this.fontSize;
			this.fontSizePx = this.fontSizeCu * this.pixelsPerCubit;
			this.fontSizePt = this.fontSizeCu * this.pointsPerCubit;
		}
		else
		{
			// other possible units are em, ex, and %
			// standard values:
			// 1em = 12pt
			// 1ex = ??
			// 100% = 12pt
			
			throw new Error('Unsupported font size type: "' + this.fontSizeUnits + '"');
		}
		
		// we split into words, search for 'bold' and 'italic', and remove those words if present
		
		var words = part2.split(' ');
		
		var bold = false;
		var italic = false;
		
		for (var i = 0; i < words.length; i++)
		{
			if (words[i] == 'bold')
			{
				bold = true;
				words[i] = '';
			}
			
			if (words[i] == 'italic')
			{
				italic = true;
				words[i] = '';
			}
		}
		
		var fontFamily = words.join('').trim();
		
		this.setFont(fontFamily, bold, italic);
		
		if (typeof window != 'undefined')
		{
			//this.savedCanvasContext.font = this.fontSize.toString() + this.fontSizeUnits + ' ' + this.fontFamily;
		}
	}
	getLineDash(): number[] { return this._lineDashArray; }
	setLineDash(value: number[]): void { this._lineDashArray = value; }
	
	constructor(width: number, height: number) {
		
		this.canvas.width = width;
		this.canvas.height = height;
		
		//this.fontSizePx = this.fontSizePt * this.cubitsPerPoint * this.pixelsPerCubit;
		//this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
		//this.fontObject = Canvas.fontDict[this.fontFamily]; // type TrueTypeFont or OpenTypeFont
	}
	
	setFontSize(fontSize: number): void {
		
		// this should be a setter, but requires deletion of this.fontSize or creation of a shadow variable
		
		this.fontSize = fontSize;
		this.fontSizePt = fontSize;
		this.fontSizePx = this.fontSizePt * this.cubitsPerPoint * this.pixelsPerCubit;
		this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
	}
	setFont(fontFamily: string, bold: boolean, italic: boolean): void {
		
		this.fontFamily = fontFamily;
		this.bold = bold;
		this.italic = italic;
		
		var suffix = '';
		
		if (bold && italic)
		{
			suffix = 'Z';
		}
		else if (bold)
		{
			suffix = 'B';
		}
		else if (italic)
		{
			suffix = 'I';
		}
		
		var filename = fontFamily + suffix;
		
		this.setFontObject(filename);
	}
	setFontObject(filename: string): void {
		
		this.fontObject = General.fontNameToFontObject[filename];
		
		// parse default font if it hasn't been parsed yet
		//if (!Canvas.fontDict[filename] && Canvas.defaultFonts[filename])
		//{
		//	var uint8array = Base64StringToUint8Array(Canvas.defaultFonts[filename]);
		//	Canvas.fontDict[filename] = opentype.parse(uint8array.buffer); // fontDict is in Canvas rather than the instance because components needs access to it
		//	Canvas.fontNameToUint8Array[filename] = uint8array;
		//}
		
		// we can't load fonts lazily because that would introduce an asynchronity (fonts are set by user code, we can't just inject a callback)
		// so we're going to have to do synchronous fonts.  various solutions:
		// 1. load fonts on page load - this is slow, but oh well
		//  a. packaging fonts into a js file is nice because we know they go into the browser cache.  could deliver fonts as font files, but would they be cached?
		//  b. failing that, maybe cache them in localstorage - this duplicates the storage for each url, but that's probably not an issue
		// 2. opt-in fonts - either in a Font component or a font section of the Document or a global font settings or something - just like opt-in js libs
		// 3. user uploaded fonts - again, just like Libraries
		
		//this.fontObject = Canvas.fontDict[filename] ? Canvas.fontDict[filename] : Canvas.fontDict['serif']; // serif is the default
		
		// in theory, we could dump the font command to PDF here, rather than doing it in each fillText call
	}
	alignText(text: string): { dxCu: number; dyCu: number } {
		
		var leftToRight = true; // pull this from the font somehow?
		var computedTextAlign = null;
		
		var dxCu = 0;
		var dyCu = 0;
		
		if (this.textAlign == 'start')
		{
			if (leftToRight)
			{
				computedTextAlign = 'left';
			}
			else
			{
				computedTextAlign = 'right';
			}
		}
		else if (this.textAlign == 'end')
		{
			if (leftToRight)
			{
				computedTextAlign = 'right';
			}
			else
			{
				computedTextAlign = 'left';
			}
		}
		else
		{
			computedTextAlign = this.textAlign;
		}
		
		if (computedTextAlign == 'left')
		{
			
		}
		else
		{
			var textMetricsCu = this.measureText(text);
			
			if (computedTextAlign == 'center')
			{
				dxCu = -textMetricsCu.width / 2;
			}
			else if (computedTextAlign == 'right')
			{
				dxCu = -textMetricsCu.width;
			}
			else
			{
				throw new Error();
			}
		}
		
		if (this.textBaseline == 'alphabetic')
		{
			
		}
		else if (this.textBaseline == 'top')
		{
			dyCu = this.fontObject.ascender / this.fontObject.unitsPerEm * this.fontSizeCu;
		}
		else if (this.textBaseline == 'middle')
		{
			dyCu = -this.fontObject.descender / this.fontObject.unitsPerEm * this.fontSizeCu; // descender is negative, i guess
		}
		else if (this.textBaseline == 'bottom')
		{
			dyCu = this.fontObject.descender / this.fontObject.unitsPerEm * this.fontSizeCu; // descender is negative, i guess
		}
		else if (this.textBaseline == 'ideographic')
		{
			// ?
		}
		else if (this.textBaseline == 'hanging')
		{
			// ?
		}
		else
		{
			throw new Error();
		}
		
		return {dxCu:dxCu,dyCu:dyCu};
	}
	measureText(text: string): { width: number } {
		
		var widthCu = null;
		
		if (text == ' ')
		{
			widthCu = this.fontSizeCu; // scale by some amount?
		}
		else
		{
			var path = this.fontObject.getPath(text, 0, 0, this.fontSizeCu, { kerning: true });
			var bbox = path.getBoundingBox();
			widthCu = bbox.x2 - bbox.x1; // since the font is in unscaled units, this is in cubits because we pass in font size as cubits above
		}
		
		return { width: widthCu };
	}
	
	beginPath(): void { }
	closePath(): void { }
	moveTo(x: number, y: number): void { }
	lineTo(x: number, y: number): void { }
	quadraticCurveTo(x1: number, y1: number, x: number, y: number): void { }
	bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void { }
	fill(): void { }
	stroke(): void { }
	clip(): void { }
	
	fillRect(left: number, top: number, width: number, height: number): void { this.drawRect(left, top, width, height, true, false); }
	strokeRect(left: number, top: number, width: number, height: number): void { this.drawRect(left, top, width, height, false, true); }
	fillCircle(cx: number, cy: number, r: number): void { this.drawCircle(cx, cy, r, true, false); }
	strokeCircle(cx: number, cy: number, r: number): void { this.drawCircle(cx, cy, r, false, true); }
	fillPath(path: string): void { this.drawPath(path, true, false); }
	strokePath(path: string): void { this.drawPath(path, false, true); }
	
	drawRect(left: number, top: number, width: number, height: number, doFill: boolean, doStroke: boolean): void { }
	drawCircle(cx: number, cy: number, r: number, doFill: boolean, doStroke: boolean): void { }
	drawPath(path: string, doFill: boolean, doStroke: boolean): void {
		
		var args = [];
		
		var s = '';
		
		// first split up the argstring.  this is not as simple on splitting on whitespace, because it is legal to smush letters and numbers together
		for (var i = 0; i < path.length; i++)
		{
			var c = path[i];
			var n = c.charCodeAt(0);
			
			if ((65 <= n && n <= 90) || (97 <= n && n <= 122))
			{
				if (s.length > 0)
				{
					args.push(parseFloat(s));
					s = '';
				}
				
				args.push(c); // this relies on letters coming as single letters only
			}
			else if (n == 32 || n == 13 || n == 10 || n == 9 || n == 44) // 44 = comma
			{
				if (s.length > 0)
				{
					args.push(parseFloat(s));
					s = '';
				}
			}
			else
			{
				s += c;
			}
		}
		
		var x = 0;
		var y = 0;
		
		var origx = 0;
		var origy = 0;
		
		var lastCommand = null;
		var lastEndPointX = null;
		var lastEndPointY = null;
		var lastControlPointX = null;
		var lastControlPointY = null;
		
		this.beginPath();
		
		for (var i = 0; i < args.length; i++)
		{
			var arg: string = args[i]; // arg must be a single letter at this point
			var n = arg.charCodeAt(0);
			lastCommand = arg;
			
			// if the command is upper case, that means we use absolute coordinates.  so we zero out the current position
			// (this means that when computing coordinates to go to, we always add x and y
			if (65 <= n && n <= 90)
			{
				if (arg == 'H')
				{
					x = 0;
				}
				else if (arg == 'V')
				{
					y = 0;
				}
				else
				{
					x = 0;
					y = 0;
				}
			}
			
			if (arg == 'M' || arg == 'm')
			{
				x += args[++i];
				y += args[++i];
				
				// this is where we return to on a Z command (is this correct?)
				origx = x;
				origy = y;
				
				//this.beginPath();
				this.moveTo(x, y);
				//this.beginPath()
			}
			else if (arg == 'Z' || arg == 'z')
			{
				this.closePath();
				//this.lineTo(origx, origy);
			}
			else if (arg == 'L' || arg == 'l')
			{
				x += args[++i];
				y += args[++i];
				this.lineTo(x, y);
			}
			else if (arg == 'H' || arg == 'h')
			{
				x += args[++i];
				this.lineTo(x, y);
			}
			else if (arg == 'V' || arg == 'v')
			{
				y += args[++i];
				this.lineTo(x, y);
			}
			else if (arg == 'C' || arg == 'c')
			{
				var x1 = x + args[++i];
				var y1 = y + args[++i];
				var x2 = x + args[++i];
				var y2 = y + args[++i];
				x += args[++i];
				y += args[++i];
				
				lastEndPointX = x;
				lastEndPointY = y;
				lastControlPointX = x2;
				lastControlPointY = y2;
				
				this.bezierCurveTo(x1, y1, x2, y2, x, y);
			}
			else if (arg == 'S' || arg == 's')
			{
				// see https://developer.mozilla.org/en/SVG/Tutorial/Paths
				
				// S produces the same type of curve as earlier, but if it follows another S command or a C command,
				// the first control point is assumed to be a reflection of the one used previously.
				// If the S command doesn't follow another S or C command, then it is assumed that both control points for the curve are the same.
				
				// that is, the first control point is a reflection about the end point of the previous curve (preserving slope in chained beziers)
				
				var x1 = lastEndPointX + (lastEndPointX - lastControlPointX);
				var y1 = lastEndPointY + (lastEndPointY - lastControlPointY);
				var x2 = x + args[++i];
				var y2 = y + args[++i];
				x += args[++i];
				y += args[++i];
				
				lastEndPointX = x;
				lastEndPointY = y;
				lastControlPointX = x2;
				lastControlPointY = y2;
				
				this.bezierCurveTo(x1, y1, x2, y2, x, y);
			}
			else if (arg == 'Q' || arg == 'q')
			{
				var x1 = x + args[++i];
				var y1 = y + args[++i];
				x += args[++i];
				y += args[++i];
				
				lastEndPointX = x;
				lastEndPointY = y;
				lastControlPointX = x1;
				lastControlPointY = y1;
				
				this.quadraticCurveTo(x1, y1, x, y);
			}
			else if (arg == 'T' || arg == 't')
			{
				// see https://developer.mozilla.org/en/SVG/Tutorial/Paths
				
				// As before, the shortcut looks at the previous control point you used, and infers a new one from it.
				// This means that after your first control point, you can make fairly complex shapes by specifying only end points.
				// Note that this only works if the previous command was a Q or a T command.
				// If it is not, then the control point is assumed to be the same as the previous point, and you'll only draw lines.
				
				if (lastControlPointX == null) { lastControlPointX = lastEndPointX; }
				if (lastControlPointY == null) { lastControlPointY = lastEndPointY; }
				
				var x1 = lastEndPointX + (lastEndPointX - lastControlPointX);
				var y1 = lastEndPointY + (lastEndPointY - lastControlPointY);
				x += args[++i];
				y += args[++i];
				
				lastEndPointX = x;
				lastEndPointY = y;
				lastControlPointX = x1;
				lastControlPointY = y1;
				
				this.quadraticCurveTo(x1, y1, x, y);
			}
			else if (arg == 'A' || arg == 'a')
			{
				var rx = x + args[++i];
				var ry = y + args[++i];
				var xAxisRotation = args[++i];
				var largeArcFlag = args[++i]; // 0 or 1
				var sweepFlag = args[++i]; // 0 or 1
				x += args[++i];
				y += args[++i];
				
				throw new Error();
				//this.arc(x, y, radius, startAngle, endAngle, anticlockwise);
			}
			else
			{
				// i've run into situations where there are implied commands - i.e. 'arg' will be a number and we have to infer the command
				// basically the rule is this: if the last command was m/M, the implied command is l/L
				// otherwise the implied command is the same as the last command
				
				// for now though, fuckit, let's just modify the path offline
				// the reason being that we either have to duplicate the code here to implement the implied commands
				// or otherwise somehow inject the command into the list, rewind i, and continue the loop
				// frankly, neither option is great
				
				//if (lastCommand == 'm')
				//{
				//	x += parseFloat(args[++i]);
				//	y += parseFloat(args[++i]);
				//	this.lineTo(x, y);
				//}
				//else if (lastCommand == 'M')
				//{
				//
				//}
				//else
				//{
				//
				//}
				
				throw new Error();
			}
			
			lastEndPointX = x;
			lastEndPointY = y;
		}
		
		if (doFill) { this.fill(); }
		if (doStroke) { this.stroke(); }
	}
	
	drawImage(image: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
	
		// this bullshit is necessary because the drawImage function puts the src args before the dst args if they exist
		// like so - these are three valid ways to call the function:
		//CanvasRenderingContext2D.drawImage(image, dx, dy);
		//CanvasRenderingContext2D.drawImage(image, dx, dy, dw, dh);
		//CanvasRenderingContext2D.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
		
		if (dx === undefined)
		{
			dx = sx;
			dy = sy;
			sx = 0;
			sy = 0;
			
			if (sw === undefined)
			{
				sw = image.width;
				sh = image.height;
				dw = sw;
				dh = sh;
			}
			else
			{
				dw = sw;
				dh = sh;
				sw = image.width;
				sh = image.height;
			}
		}
		
		this.drawImageImpl(image, dx, dy, dw, dh, sx, sy, sw, sh);
	}
	drawImageImpl(image: any, dx: number, dy: number, dw: number, dh: number, sx: number, sy: number, sw: number, sh: number): void { }
	
	arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, bAntiClockwise: boolean): void { }
	rect(left: number, top: number, width: number, height: number): void {
		
		var savedCurrentPoint = { x : this.currentPoint.x , y : this.currentPoint.y };
		this.moveTo(left, top);
		this.lineTo(left+width, top);
		this.lineTo(left+width, top+height);
		this.lineTo(left, top+height);
		this.lineTo(left, top);
		this.currentPoint.x = savedCurrentPoint.x;
		this.currentPoint.y = savedCurrentPoint.y;
	}
	arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void {
		
		// this is basically API sugar for easy creation of round rects
		// from the current point, draw an imaginary line to (x1,y1) and then to (x2,y2)
		// then draw the arc of radius r that fits inside the corner formed
		// only the arc is drawn
		
		var x0 = this.currentPoint.x;
		var y0 = this.currentPoint.y;
		
		var v10 = { x : x1 - x0 , y : y1 - y0 };
		var v12 = { x : x1 - x2 , y : y1 - y2 };
		var dot = v10.x * v12.x + v10.y * v12.y;
		var v10len = Math.sqrt(v10.x * v10.x + v10.y * v10.y);
		var v12len = Math.sqrt(v12.x * v12.x + v12.y * v12.y);
		var angle = Math.acos(dot / (v10len * v12len));
		var a = angle / 2;
		
		var d1c = r / Math.sin(a);
		var d1b = r / Math.tan(a);
		
		var bearing10 = Math.atan2(y0 - y1, x0 - x1);
		var bearing12 = Math.atan2(y2 - y1, x2 - x1);
		var bearing1c = (bearing10 + bearing12) / 2;
		
		var bx = x1 + d1b * Math.cos(bearing10);
		var by = y1 + d1b * Math.sin(bearing10);
		
		var dx = x1 + d1b * Math.cos(bearing12);
		var dy = y1 + d1b * Math.sin(bearing12);
		
		var cx = x1 + d1c * Math.cos(bearing1c);
		var cy = y1 + d1c * Math.sin(bearing1c);
		
		var bearingcb = Math.atan2(by - cy, bx - cx);
		var bearingcd = Math.atan2(dy - cy, dx - cx);
		
		var startAngle = bearingcb;
		var endAngle = bearingcd;
		
		this.lineTo(bx, by);
		this.arc(cx, cy, r, startAngle, endAngle, false);
		this.moveTo(dx, dy);
	}
	
	rotate(angle: number): void {
		
		// to rotate counterclockwise about the origin
		// (  cos a   -sin a   0  ) ( x )   ( x0 )   ( x cos a - y sin a )
		// (  sin a    cos a   0  ) ( y ) = ( y0 ) = ( y cos a + x sin a )
		// (    0       0      1  ) ( 1 )   (  1 )   (         1         )
		
		// it kills me to accept the canvas convention of clockwise rotation, but we want to maintain code compatibility with canvas
		this.rotateClockwise(angle);
	}
	rotateClockwise(angle: number): void { }
	
	// extensions
	drawBezier(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
		this.beginPath();
		this.moveTo(x0, y0);
		this.bezierCurveTo(x1, y1, x2, y2, x3, y3);
		this.stroke();
	}
	drawLine(x1: number, y1: number, x2: number, y2: number): void {
		this.beginPath();
		this.moveTo(x1, y1);
		this.lineTo(x2, y2);
		this.stroke();
	}
	
	ParseColor(str: string): Color {
		
		// 'this' is undefined in this context - need a reference if we're to use the savedCanvasContext
		//if (typeof window != 'undefined')
		//{
		//	this.savedCanvasContext.fillStyle = str; // this will convert from 'red' to 'rgb(255,0,0)'
		//	str = this.savedCanvasContext.fillStyle;
		//}
		
		var colorDict = {
			black: {r:0,g:0,b:0,a:255},
			red: {r:255,g:0,b:0,a:255},
			green: {r:0,g:255,b:0,a:255},
			blue: {r:0,g:0,b:255,a:255},
			gray: {r:128,g:128,b:128,a:255},
			white: {r:255,g:255,b:255,a:255},
			yellow: {r:255,g:255,b:0,a:255},
			orange: {r:255,g:128,b:0,a:255},
			purple: {r:255,g:0,b:255,a:255}
		};
		if (str.substr(0, 4) == 'rgb(')
		{
			return this.ParseRgbColor(str);
		}
		else if (str.substr(0, 4) == 'hsl(')
		{
			throw new Error();
		}
		else if (str[0] == '#')
		{
			return this.ParseHexColor(str);
		}
		else if (colorDict[str])
		{
			return colorDict[str];
		}
		else
		{
			throw new Error();
		}
	}
	ParseRgbColor(str: string): Color {
		// str = 'rgb(0,0,0)' or 'rgba(0,0,0,0)'
		var parens = str.substring(str.indexOf('('));
		var rgb = parens.substring(1, parens.length - 1);
		var rgblist = rgb.split(',');
		var color: Color = {};
		color.r = parseInt(rgblist[0]);
		color.g = parseInt(rgblist[1]);
		color.b = parseInt(rgblist[2]);
		return color;
	}
	ParseHexColor(hex: string): Color {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
	ConvertColorToPdf(str: string): string {
		var color = this.ParseColor(str);
		var pdfstr = (color.r / 255).toString() + ' ' + (color.g / 255).toString() + ' ' + (color.b / 255).toString();
		return pdfstr;
	}
}

