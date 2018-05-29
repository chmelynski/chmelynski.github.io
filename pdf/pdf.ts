
// a PDF is a single page
// the font dicts are static, to be shared across all pages
// but the image dicts are still per-page
// PDF.Export([pdf1, pdf2]) => string

type CSSUnit = 'pt' | 'px' | 'cu' | 'in' | 'cm';
type TextAlign = 'left' | 'center' | 'right' | 'start' | 'end';
type TextBaseline = 'top' | 'middle' | 'center' | 'bottom' | 'alphabetic' | 'hanging' | 'ideographic';
interface Color { r?: number; g?: number; b?: number; a?: number; }
interface Dict<T> { [index: string]: T; }

class PDF {
	
	// colors
	_fillStyle: string = 'rgb(0,0,0)';
	_strokeStyle: string = 'rgb(0,0,0)';
	fillColor: Color = {r:0,g:0,b:0,a:255};
	strokeColor: Color = {r:0,g:0,b:0,a:255};
	get fillStyle(): string { return this._fillStyle; }
	set fillStyle(value: string) { this._fillStyle = value; this.fillColor = this.ParseColor(value); this.PushCommand(this.ConvertColorToPdf(value) + ' rg'); }
	get strokeStyle(): string { return this._strokeStyle; }
	set strokeStyle(value: string) { this._strokeStyle = value; this.strokeColor = this.ParseColor(value); this.PushCommand(this.ConvertColorToPdf(value) + ' RG'); }
	ParseColor(str: string): Color {
		
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
		if (str.substr(0, 4) == 'rgb(' || str.substr(0, 5) == 'rgba(')
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
		color.a = ((rgblist.length > 3) ? parseInt(rgblist[3]) : 255);
		return color;
	}
	ParseHexColor(hex: string): Color {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
	}
	ConvertColorToPdf(str: string): string {
		
		var regex = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/;
		var match = regex.exec(str);
		
		if (match != null)
		{
			var r = (parseInt(match[0]) / 255).toFixed(3);
			var g = (parseInt(match[1]) / 255).toFixed(3);
			var b = (parseInt(match[2]) / 255).toFixed(3);
			return r + ' ' + g + ' ' + b;
		}
		else
		{
			return '0 0 0';
		}
	}
	
	// lines
	_lineWidth: number = 1;
	_lineDashArray: number[] = []; // setLineDash([onPixels, offPixels, onPixels, offPixels, ...])
	_lineDashOffset: number = 0;
	_lineJoin: string = 'miter'; // miter (default), bevel, round
	_lineCap: string = 'butt'; // butt (default), round, square
	_miterLimit: number = 10; // is this part of the spec or just a chrome thing?  what is the default miter limit for PDF?
	get lineWidth(): number { return this._lineWidth; }
	set lineWidth(value: number) { this._lineWidth = value; this.PushCommand(value.toString() + ' w'); }
	get lineDashOffset(): number { return this._lineDashOffset; }
	set lineDashOffset(value: number) { this._lineDashOffset = value; this.PushCommand('[ ' + this._lineDashArray.join(' ') + ' ] ' + this._lineDashOffset.toString() + ' d'); }
	get lineJoin(): string { return this._lineJoin; }
	set lineJoin(value: string) { this._lineJoin = value; this.PushCommand({miter:'0',round:'1',bevel:'2'}[value] + ' j'); }
	get lineCap(): string { return this._lineCap; }
	set lineCap(value: string) { this._lineCap = value; this.PushCommand({butt:'0',round:'1',square:'2'}[value] + ' J'); }
	get miterLimit(): number { return this._miterLimit; }
	set miterLimit(value: number) { this._miterLimit = value; this.PushCommand(value.toString() + ' M'); }
	getLineDash(): number[] { return this._lineDashArray; }
	setLineDash(value: number[]): void { this._lineDashArray = value; this.PushCommand('[ ' + this._lineDashArray.join(' ') + ' ] ' + this._lineDashOffset.toString() + ' d'); }
	
	// text
	textAlign: TextAlign = 'left'; // start (default), end, left, right, center - we should change this from left to start.  does opentype.js support RTL?
	textBaseline: TextBaseline = 'alphabetic'; // alphabetic (default), top, hanging, middle, ideographic, bottom
	
	fontFamily: string = 'serif';
	bold: boolean = false;
	italic: boolean = false;
	fontSize: number = 10; // this is what we display in font UI
	fontSizePt: number = 10;
	fontSizePx: number;
	fontSizeCu: number;
	fontSizeUnits: CSSUnit = 'pt';
	fontObject: any;
	
	cubitsPerPoint: number = 1 / 12; // this works on my screen
	pointsPerCubit: number = 12;
	cubitsPerPixel: number = 1 / 17;
	pixelsPerCubit: number = 17;
	
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
	setFontObject(filename: string): void { }
	
	// misc
	_globalAlpha: number = 1.0; // float in [0,1] - 0 = transparent, 1 = opaque
	_globalCompositeOperation: string = 'source-over'; // source-over (default), source-in, source-out, source-atop, destination-over, destination-in, destination-out, destination-atop, lighter, copy, xor (darker was removed from the spec)
	get globalAlpha(): number { return this._globalAlpha; }
	set globalAlpha(value: number) { this._globalAlpha = value; }
	get globalCompositeOperation(): string { return this._globalCompositeOperation; }
	set globalCompositeOperation(value: string) { this._globalCompositeOperation = value; }
	
	shadowColor: string = 'rgba(0, 0, 0, 0)';
	shadowBlur: number = 0; // float, not sure exactly how to implement
	shadowOffsetX: number = 0;
	shadowOffsetY: number = 0;
	
	// ----------- before this line is the canvas compatibility stuff, after is the pdf-specific stuff
	
	static precision = 3; // number of decimal places to put in outputted commands
	
	width: number;
	height: number;
	
	commands: string[] = [];
	
	//static fontDict: Dict<Font> = {}; // "serif" => SourceSerifPro-Regular.otf, "sans-serif" => SourceSansPro-Regular.otf
	static fontNameToUint8Array: Dict<Uint8Array> = {}; // "Helvetica" => Uint8Array
	static fontNameToIndex: Dict<number> = {} // { "Times-Roman" : 1 , "Helvetica" : 2 } - used by fillText
	static fontCount: number = 0; // used by fillText
	
	imageDict: Dict<PdfImageXObject> = {}; // { Im1 : XObject1 , Im2 : XObject2 }
	imageXObjects: PdfImageXObject[] = []; // [ XObject1 , XObject2 ]
	
	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.PushCommand('1 0 0 1 0 ' + this.height.toString() + ' cm');
		this.PushCommand(this.pointsPerCubit.toString() + ' 0 0 -' + this.pointsPerCubit.toString() + ' 0 0 cm');
	}
	
	PushCommand(cmd: string): void {
		// this is mostly for debugging - we want to have a central place to put a breakpoint to inspect all PDF commands that come through
		if (cmd.match(/NaN/)) { throw new Error(cmd); }
		this.commands.push(cmd);
	}
	
	static Export(pdfs: PDF[]): string {
		
		var objects = [];
		
		var catalog: PdfCatalog = { Type : "Catalog" , Pages : null };
		var pages: PdfPages = { Type : "Pages" , Count : pdfs.length , Kids : [] };
		catalog.Pages = pages;
		objects.push(catalog);
		objects.push(pages);
		
		var fontResourceDict: Dict<PdfFont> = {}; // { F1 : 3 0 R , F2 : 4 0 R , etc. }
		var imageResourceDict: Dict<PdfImageXObject> = {};  // { Im1 : 5 0 R , Im2 : 6 0 R , etc. }
		
		// all fonts and images used in the document are put in separate objects here - page resource dicts refer to this section via indirect references
		// seems to me that the image dict could stay in a per-page thing, rather than being collected into one global dict
		// this works because images will rarely be shared across pages
		// fonts, on the other hand, will be shared and should be collected into one
		
		
		// section 5.7, p.455 - Font Descriptors
		// section 5.8, p.465 - Embedded Font Programs
		// this.fontNameToIndex = { "Times-Roman" : 1 , "Helvetica" : 2 }
		// this.fontDict = { "F1" : "Times-Roman" , "F2" : "Helvetica" }
		for (var key in PDF.fontNameToIndex)
		{
			var fontId = 'F' + PDF.fontNameToIndex[key];
			
			var font: PdfFont = null;
			
			if (key == 'Times-Roman' || key == 'Helvetica')
			{
				font = { Type : "Font" , Subtype : "Type1" , BaseFont : key }; // or lookup the font name in some global font dictionary to get the right font objects
				objects.push(font);
			}
			else
			{
				var fontType = 'OpenType'; // we probably need to store this in the Font component or something - .ttf or .otf
				
				if (fontType == 'TrueType')
				{
					var uint8Array = PDF.fontNameToUint8Array[key]; // file bytes go here
					var stream = Uint8ArrayToAsciiHexDecode(uint8Array);
					var fontStreamDictionary: PdfFontStreamDictionary = { Length : stream.length , Filter : "ASCIIHexDecode" , Length1 : uint8Array.length }; // Length1 = length after being decoded
					fontStreamDictionary["[stream]"] = stream;
					var fontDescriptor: PdfFontDescriptor = { Type : "FontDescriptor" , FontName : key , FontFile2 : fontStreamDictionary };
					font = { Type : "Font" , Subtype : "TrueType" , BaseFont : key , FontDescriptor : fontDescriptor };
					objects.push(font);
					objects.push(fontDescriptor);
					objects.push(fontStreamDictionary);
				}
				else if (fontType == 'OpenType')
				{
					var uint8Array = PDF.fontNameToUint8Array[key]; // file bytes go here
					var stream = Uint8ArrayToAsciiHexDecode(uint8Array);
					var fontStreamDictionary: PdfFontStreamDictionary = { Length : stream.length , Filter : "ASCIIHexDecode" , Length1 : uint8Array.length , Subtype : "OpenType" };
					fontStreamDictionary["[stream]"] = stream;
					var fontDescriptor: PdfFontDescriptor = { Type : "FontDescriptor" , FontName : key , FontFile3 : fontStreamDictionary };
					font = { Type : "Font" , Subtype : "TrueType" , BaseFont : key , FontDescriptor : fontDescriptor }; // should the Subtype still be TrueType?
					objects.push(font);
					objects.push(fontDescriptor);
					objects.push(fontStreamDictionary);
				}
				else
				{
					throw new Error();
				}
			}
			
			fontResourceDict[fontId] = font;
		}
		
		// this.imageDict = { "Im1" : XObject1 , "Im2" : XObject2 }
		/*for (var key in this.imageDict)
		{
			var xObject = this.imageDict[key];
			
			objects.push(xObject);
			imageResourceDict[key] = xObject;
		}*/
		
		for (var i = 0; i < pdfs.length; i++)
		{
			var pdf = pdfs[i];
			var commands = pdf.commands.join('\n');
			
			var page: PdfPage = {
				Type: "Page",
				Parent: pages,
				MediaBox: [ 0 , 0 , pdf.width , pdf.height ] ,
				Resources: { Font : {} , XObject : {} } ,
				Contents: null
			};
			var pagecontent: PdfPageContents = {
				Length: commands.length ,
				"[stream]": commands
			};
			
			// so, the *correct* approach here would be to only put the resources that are necessary to the page in the page's resource dict
			// however, that requires bookkeeping, and for what?  to save a few bytes?
			// so instead, we're just going to load the page's resource dict with the pointers to all fonts and images found in the document
			//if (section.fontDict) { page.Resources.Font = section.fontDict; }
			//if (section.imageDict) { page.Resources.XObject = section.imageDict; }
			//page.Resources.Font = fontResourceDict;
			//page.Resources.XObject = imageResourceDict;
			
			// this is the ducktape code for fonts that we use right now
			//page.Resources.Font.F1 = font;
			
			page.Contents = pagecontent;
			pages.Kids.push(page);
			objects.push(page);
			objects.push(pagecontent);
		}
		
		for (var i = 0; i < objects.length; i++)
		{
			objects[i]['[index]'] = i + 1;
		}
		
		var objstarts = [];
		var bytes = 0;
		
		var filelines = [];
		filelines.push('%PDF-1.7');
		filelines.push('');
		
		var bytes = '%PDF-1.7\r\n\r\n'.length;
		
		for (var i = 0; i < objects.length; i++)
		{
			var obj = objects[i];
			var objlines = [];
			
			objstarts.push(bytes);
			
			objlines.push(obj['[index]'].toString() + ' 0 obj');
			objlines.push(WritePdfObj(obj, false));
			
			if (obj['[stream]'])
			{
				objlines.push('stream');
				objlines.push(obj['[stream]']);
				objlines.push('endstream');
			}
			
			objlines.push('endobj');
			objlines.push('');
			
			var objstr = objlines.join('\r\n');
			bytes += objstr.length;
			filelines.push(objstr);
		}
		
		var xrefstart = bytes;
		
		filelines.push('xref');
		filelines.push('0 ' + (objects.length + 1).toString());
		filelines.push('0000000000 65535 f');
		for (var i = 0; i < objects.length; i++)
		{
			var bytestart = objstarts[i].toString();
			var len = bytestart.length;
			var line = '';
			for (var k = 0; k < 10 - len; k++)
			{
				line += '0';
			}
			line += bytestart + ' 00000 n';
			filelines.push(line);
		}
		
		filelines.push('trailer');
		filelines.push('<<');
		filelines.push('/Size ' + (objects.length + 1).toString());
		if (objects[0].Type != 'Catalog') { throw new Error(); } // check for the assumption that root is 1 0 R
		filelines.push('/Root 1 0 R');
		filelines.push('>>');
		filelines.push('startxref');
		filelines.push(xrefstart.toString());
		filelines.push('%%EOF');
		return filelines.join('\r\n');
	}
	
	fillText(text: string, x: number, y: number): void {
		
		// x and y come in as cubits - conversion to points is done by the scaling done at the beginning of the page commands
		// but should font size be specified in cubits?  probably
		
		// now that we've separated PDF into its own class, we should deal only in points - let the splitter handle the cubits/points conversion
		// on the other hand, implementing the conversion with a transform is better than doing the transform ourselves
		// on the other other hand, then we need to make sure the initial transform interacts well with user-specified transforms
		// in particular that a user overwrite of the transform needs to be hooked and the cubit->point/y-axis inversion injected
		
		// no, the PDF class should implement a proper canvas interface, which means definitely doing the y-axis inversion
		
		// cubits->points is a separate issue that is independent of having a proper implementation of the canvas interface
		
		if (!PDF.fontNameToIndex[this.fontFamily])
		{
			PDF.fontNameToIndex[this.fontFamily] = PDF.fontCount + 1;
			PDF.fontCount++;
		}
		
		// this could be changed from F1, F2, etc. to TimesNewRoman, Arial, etc., but it would require some reworking
		// if we do that, you have to also change the code in MakePdf that does this same construction
		var fontId = 'F' + PDF.fontNameToIndex[this.fontFamily];
		
		// a couple things here: repeating BT, Tf, and ET on every fillText is obviously more verbose than it needs to be
		// it would be nice to be able to batch fillText commands and then dump them in one block
		// two ways to do batching:
		// 1. the client controls it - this would require new Canvas functions, such as fillTexts(texts)
		// 2. Canvas does it automatically in the background - much trickier, obviously
		//   would require an inTextBlock boolean, and also would require dumping the font when the font field is set, not here
		
		// the inTextBlock flag could be set here in fillText, but would have to be cleared in literally every other drawing function
		
		// a much more overhaul-y way of doing this would be to cache *all* drawing commands and then optimize as needed
		// to be fair, we already sort of do this with the PDF command lists - we could just examine those before dumping the file to eliminate duplicate BT, Tf, ET commands
		
		this.PushCommand('BT');
		this.PushCommand('/' + fontId + ' ' + this.fontSizeCu.toFixed(PDF.precision) + ' Tf'); // /F1 12 Tf
		//this.PushCommand(x.toString() + ' ' + y.toString() + ' TD');
		this.PushCommand('1 0 0 -1 ' + x.toFixed(PDF.precision) + ' ' + y.toFixed(PDF.precision) + ' Tm'); // 1 0 0 -1 50 50 Tm - the -1 flips the y axis
		this.PushCommand('(' + text + ') Tj'); // (foo) Tj
		this.PushCommand('ET');
	}
	
	clearRect(left: number, top: number, width: number, height: number): void {
		
		//this.PushCommand('1 1 1 rg');
		//this.PushCommand(left.toString() + ' ' + top.toString() + ' ' + width.toString() + ' ' + height.toString() + ' re');
		//this.PushCommand('F');
		//this.fillStyle = this.fillStyle; // this self-assign will undo the white fill set above
	}
	
	fillRect(left: number, top: number, width: number, height: number): void {
		this.drawRect(left, top, width, height, true, false);
	}
	strokeRect(left: number, top: number, width: number, height: number): void {
		this.drawRect(left, top, width, height, false, true);
	}
	drawRect(left: number, top: number, width: number, height: number, doFill: boolean, doStroke: boolean): void {
		
		this.rect(left, top, width, height);
		if (doFill) { this.PushCommand('F'); }
		if (doStroke) { this.PushCommand('S'); }
	}
	drawCircle(cx: number, cy: number, r: number, doFill: boolean, doStroke: boolean): void {
		
		// http://hansmuller-flex.blogspot.com/2011/04/approximating-circular-arc-with-cubic.html
		// we draw 4 bezier curves, one for each 90-degree quarter of the circle
		// first find the points at north,south,east,west - those are the endpoints
		// the control points are displaced vertically and horizontally from the endpoints (which makes sense, think of the tangent lines)
		// the displacement is the magic number k times the radius
		var k = 0.5522847498; // magic number: (4 / 3) * (Math.sqrt(2) - 1)
		
		var nx = cx;
		var ny = cy - r;
		var ex = cx + r;
		var ey = cy;
		var sx = cx;
		var sy = cy + r;
		var wx = cx - r;
		var wy = cy;
		
		var enx1 = ex;
		var eny1 = ey + k * r;
		var enx2 = nx + k * r;
		var eny2 = ny;
		var nwx1 = nx - k * r;
		var nwy1 = ny;
		var nwx2 = wx;
		var nwy2 = wy + k * r;
		var wsx1 = wx;
		var wsy1 = wy - k * r;
		var wsx2 = sx - k * r;
		var wsy2 = sy;
		var sex1 = sx + k * r;
		var sey1 = sy;
		var sex2 = ex;
		var sey2 = ey - k * r;
		
		this.moveTo(ex, ey);
		this.bezierCurveTo(enx1, eny1, enx2, eny2, nx, ny);
		this.bezierCurveTo(nwx1, nwy1, nwx2, nwy2, wx, wy);
		this.bezierCurveTo(wsx1, wsy1, wsx2, wsy2, sx, sy);
		this.bezierCurveTo(sex1, sey1, sex2, sey2, ex, ey);
		
		//this.PushCommand(ex.toString()+' '+ey.toString()+' m');
		//this.PushCommand(enx1.toString()+' '+eny1.toString()+' '+enx2.toString()+' '+eny2.toString()+' '+nx.toString()+' '+ny.toString()+' c');
		//this.PushCommand(nwx1.toString()+' '+nwy1.toString()+' '+nwx2.toString()+' '+nwy2.toString()+' '+wx.toString()+' '+wy.toString()+' c');
		//this.PushCommand(wsx1.toString()+' '+wsy1.toString()+' '+wsx2.toString()+' '+wsy2.toString()+' '+sx.toString()+' '+sy.toString()+' c');
		//this.PushCommand(sex1.toString()+' '+sey1.toString()+' '+sex2.toString()+' '+sey2.toString()+' '+ex.toString()+' '+ey.toString()+' c');
		
		if (doFill) { this.PushCommand('F'); }
		if (doStroke) { this.PushCommand('S'); }
	}
	
	beginPath(): void {
		
	}
	closePath(): void {
		this.PushCommand('h');
	}
	moveTo(x: number, y: number): void {
		this.PushCommand(x.toFixed(PDF.precision) + ' ' + y.toFixed(PDF.precision) + ' m');
	}
	lineTo(x: number, y: number): void {
		this.PushCommand(x.toFixed(PDF.precision) + ' ' + y.toFixed(PDF.precision) + ' l');
	}
	quadraticCurveTo(x1: number, y1: number, x: number, y: number): void {
		// put the end point as the second control point
		this.PushCommand(x1.toFixed(PDF.precision) + ' ' + y1.toFixed(PDF.precision) + ' ' + x.toFixed(PDF.precision) + ' ' + y.toFixed(PDF.precision) + ' ' + x.toFixed(PDF.precision) + ' ' + y.toFixed(PDF.precision) + ' c');
	}
	bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
		this.PushCommand(x1.toFixed(PDF.precision) + ' ' + y1.toFixed(PDF.precision) + ' ' + x2.toFixed(PDF.precision) + ' ' + y2.toFixed(PDF.precision) + ' ' + x.toFixed(PDF.precision) + ' ' + y.toFixed(PDF.precision) + ' c');
	}
	arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, bAntiClockwise: boolean): void {
		
		// http://hansmuller-flex.blogspot.com/2011/04/approximating-circular-arc-with-cubic.html
		// http://pomax.github.io/bezierinfo/#circles_cubic
		
		var quadrantAngle = Math.PI / 2;
		
		// we'll assume that the direction is clockwise
		
		if (!bAntiClockwise)
		{
			var temp = startAngle;
			startAngle = endAngle;
			endAngle = temp;
		}
		
		var angleRemaining = endAngle - startAngle;
		var count = 0;
		
		var p0x = cx + r * Math.cos(startAngle);
		var p0y = cy + r * Math.sin(startAngle);
		
		this.moveTo(p0x, p0y);
		
		while (count < 4 && angleRemaining > 0)
		{
			var angle = Math.min(angleRemaining, quadrantAngle);
			
			// the control points are tangent to the endpoints
			
			var f = 4/3*Math.tan(angle/4);
			
			var p1x = p0x + r * f * -Math.sin(startAngle);
			var p1y = p0y + r * f * +Math.cos(startAngle);
			var p2x = cx + r * (Math.cos(startAngle + angle) + f * Math.sin(startAngle + angle));
			var p2y = cy + r * (Math.sin(startAngle + angle) - f * Math.cos(startAngle + angle));
			
			var p3x = cx + r * Math.cos(startAngle + angle);
			var p3y = cy + r * Math.sin(startAngle + angle);
			
			this.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
			
			p0x = p3x;
			p0y = p3y;
			
			startAngle += quadrantAngle;
			angleRemaining -= quadrantAngle;
			count++;
		}
	}
	rect(left: number, top: number, width: number, height: number): void {
		this.PushCommand(left.toFixed(PDF.precision) + ' ' + top.toFixed(PDF.precision) + ' ' + width.toFixed(PDF.precision) + ' ' + height.toFixed(PDF.precision) + ' re');
	}
	fill(): void {
		this.PushCommand('F');
	}
	stroke(): void {
		this.PushCommand('S');
	}
	
	drawImageImpl(pixelData: Uint8ClampedArray, wd: number, hg: number, dx: number, dy: number, dw: number, dh: number): void {
		
		// we generate an imageXObject and put it in a dictionary that maps ids to imageXObjects { 'Im1' : imageXObject , 'Im2' : imageXObject }
		// the image data is encoded as hex string ( RR GG BB RR GG BB ), EX: '4EF023'
		// this means that one byte of color data is transformed into a two-character string
		// this ascii hex string is attached stored at imageXObject['[stream]']
		
		var imageXObject: PdfImageXObject = {};
		imageXObject.Type = 'XObject';
		imageXObject.Subtype = 'Image';
		imageXObject.ColorSpace = 'DeviceRGB';
		imageXObject.BitsPerComponent = 8;
		
		var imagestreamlines = [];
		
		for (var i = 0; i < hg; i++)
		{
			for (var j = 0; j < wd; j++)
			{
				var R = pixelData[(i * wd + j) * 4 + 0];
				var G = pixelData[(i * wd + j) * 4 + 1];
				var B = pixelData[(i * wd + j) * 4 + 2];
				var A = pixelData[(i * wd + j) * 4 + 3];
				
				var hex = '';
				hex += ((R < 0x10) ? '0' : '') + R.toString(16).toUpperCase()
				hex += ((G < 0x10) ? '0' : '') + G.toString(16).toUpperCase()
				hex += ((B < 0x10) ? '0' : '') + B.toString(16).toUpperCase()
				imagestreamlines.push(hex);
			}
		}
		
		var imagestream = imagestreamlines.join('');
		
		imagestream += '>\r\n';
		
		imageXObject['[stream]'] = imagestream;
		
		imageXObject.Width = wd;
		imageXObject.Height = hg;
		imageXObject.Length = imagestream.length;
		imageXObject.Filter = 'ASCIIHexDecode';
		
		this.imageXObjects.push(imageXObject);
		
		// dw 0 0 dh dx (dy+dh) cm
		var scale = 1;
		var imagematrix = '';
		imagematrix += (scale * dw).toString() + ' 0 0 ';
		imagematrix += (scale * dh).toString() + ' ';
		imagematrix += (scale * dx).toString() + ' ';
		//imagematrix += (this.currentSection.height - scale * (dy + dh)).toString() + ' cm';
		imagematrix += (scale * (dy + dh)).toString() + ' cm';
		
		// /Im1 Do
		var imagename = 'Im' + this.imageXObjects.length.toString();
		var imagecommand = '/' + imagename + ' Do';
		
		this.imageDict[imagename] = imageXObject;
		
		this.PushCommand('q'); // save the current matrix
		this.PushCommand(imagematrix); // dw 0 0 dh dx (dy+dh) cm
		this.PushCommand(imagecommand); // /Im1 Do
		this.PushCommand('Q'); // restore the current matrix
	}
	
	save(): void {
		this.PushCommand('q');
	}
	restore(): void {
		this.PushCommand('Q');
	}
	scale(x: number, y: number): void {
		var sx = x;
		var kx = 0;
		var dx = 0;
		var sy = y;
		var ky = 0;
		var dy = 0;
		this.PushCommand(sx.toString() + ' ' + ky.toString() + ' ' + kx.toString() + ' ' + sy.toString() + ' ' + dx.toString() + ' ' + dy.toString() + ' cm');
	}
	rotateCounterClockwise(angle: number): void {
		var sx = Math.cos(angle);
		var kx = -Math.sin(angle);
		var dx = 0;
		var sy = Math.cos(angle);
		var ky = Math.sin(angle);
		var dy = 0;
		this.PushCommand(sx.toString() + ' ' + ky.toString() + ' ' + kx.toString() + ' ' + sy.toString() + ' ' + dx.toString() + ' ' + dy.toString() + ' cm');
	}
	rotateClockwise(angle: number): void {
		var sx = Math.cos(-angle);
		var kx = -Math.sin(-angle);
		var dx = 0;
		var sy = Math.cos(-angle);
		var ky = Math.sin(-angle);
		var dy = 0;
		this.PushCommand(sx.toString() + ' ' + ky.toString() + ' ' + kx.toString() + ' ' + sy.toString() + ' ' + dx.toString() + ' ' + dy.toString() + ' cm');
	}
	translate(x: number, y: number): void {
		var sx = 1;
		var kx = 0;
		var dx = x;
		var sy = 1;
		var ky = 0;
		var dy = y;
		this.PushCommand(sx.toString() + ' ' + ky.toString() + ' ' + kx.toString() + ' ' + sy.toString() + ' ' + dx.toString() + ' ' + dy.toString() + ' cm');
	}
	transform(sx: number, kx: number, ky: number, sy: number, dx: number, dy: number): void {
		// discussion of transformations starts on page 207 of the PDF spec
		// PDF transformation matrices specify the conversion from the transformed coordinate system to the untransformed system
		// this means that we specify a point to be drawn (x y 1) in the transformed system and then it is multiplied by the matrix to transform it to the original system
		
		//  a  b  c  d  e  f cm
		// sx ky kx sy dx dy cm
		
		//          a b o
		//          c d 0
		// (x y 1)  e f 1
		
		//          sx ky o
		//          kx sy 0
		// (x y 1)  dx dy 1
		
		// x0 = x * a + y * c + e = x * sx + y * kx + dx
		// y0 = x * b + y * d + f = x * ky + y * sy + dy
		// (where x0 and y0 represent the coordinates in the original coordinate system - that is, as they appear on screen)
		
		// this, maddeningly and appropriately enough, is the inverse of the transformation matrix of canvas
		// in PDF, we have a row vector on the left and the matrix on the right
		// in canvas, we have a column vector on the right and a matrix on the left
		
		// when a new matrix is added to the chain, it is premultiplied
		
		// all of this assumes that we are transforming the coordinate system, not the points!  but possibly it works for the points too
		// row vector = matrix on right = premultiply chained matrices    v0 = rowvector * m2 * m1 * m0
		// col vector = matrix on left = postmultiply chained matrices    m0 * m1 * m2 * colvector = v0
		
		var sx = sx;
		var kx = kx;
		var dx = dx;
		var sy = sy;
		var ky = ky;
		var dy = dy;
		this.PushCommand(sx.toString() + ' ' + ky.toString() + ' ' + kx.toString() + ' ' + sy.toString() + ' ' + dx.toString() + ' ' + dy.toString() + ' cm');
	}
	setTransform(sx: number, kx: number, ky: number, sy: number, dx: number, dy: number): void {
		//this.PushCommand('');
	}
	resetTransform(): void {
		//this.PushCommand('');
	}
}
interface PdfCatalog {
	Type: "Catalog";
	Pages: PdfPages;
}
interface PdfPages {
	Type: "Pages";
	Count: number;
	Kids: PdfPage[]; // PdfPage & PdfPages?
}
interface PdfPage {
	Type: "Page";
	Parent: PdfPages;
	MediaBox: [ number , number , number , number ];
	Resources: { Font : {} , XObject : {} };
	Contents: PdfPageContents;
}
interface PdfPageContents {
	Length: number;
	"[stream]"?: any;
}
interface PdfFont {
	Type: "Font";
	Subtype: string; // "Type1", "TrueType", "OpenType", others?
	BaseFont: string;
	FontDescriptor?: PdfFontDescriptor;
}
interface PdfFontDescriptor {
	Type: "FontDescriptor";
	FontName: string;
	FontFile2?: PdfFontStreamDictionary;
	FontFile3?: any;
}
interface PdfFontStreamDictionary {
	Subtype?: string;
	Length: number;
	Length1: number;
	Filter: string; // "ASCIIHexDecode", others
	"[stream]"?: any;
}
interface PdfImageXObject {
	Type?: "XObject";
	Subtype?: "Image";
	ColorSpace?: "DeviceRGB"; // others are allowed by the spec
	BitsPerComponent?: number;
	Width?: number;
	Height?: number;
	Length?: number;
	Filter?: "ASCIIHexDecode"; // others are allowed by the spec
}
function Base64StringToUint8Array(str: string): Uint8Array {
	
	function b64ToUint6(n) { return n>64&&n<91?n-65:n>96&&n<123?n-71:n>47&&n<58?n+4:n===43?62:n===47?63:0;}
	
	var nBlocksSize = 3;
	var sB64Enc = str.replace(/[^A-Za-z0-9\+\/]/g, ""); // remove all non-eligible characters from the string
	var nInLen = sB64Enc.length;
	var nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2;
	var taBytes = new Uint8Array(nOutLen);
	
	for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++)
	{
		nMod4 = nInIdx & 3;
		nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
		
		if (nMod4 === 3 || nInLen - nInIdx === 1)
		{
			for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++)
			{
				taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
			}
			
			nUint24 = 0;
		}
	}
	
	return taBytes;
}
function WritePdfDict(obj: any): string {
	var str = '';
	str += '<<';
	str += '\r\n';
	for (var key in obj)
	{
		if (key[0] != '[') // avoid [index], [stream], etc. fields
		{
			str += '/' + key + ' ';
			str += WritePdfObj(obj[key], true);
			str += '\r\n';
		}
	}
	str += '>>';
	//str += '\r\n';
	return str;
}
function WritePdfList(list: any[]): string {
	//var str = '';
	//str += '[ ';
	//list.forEach(function(obj) { str += WritePdfObj(obj, true); str += ' '; });
	//str += ']';
	//return str;
	
	var str = '[ ' + list.map(function(obj) { return WritePdfObj(obj, true); }).join(' ') + ']';
	return str;
}
function WritePdfObj(obj: any, canBeIndirect: boolean): string {
	var s = null;
	var type = typeof(obj);
	
	if (type == 'object')
	{
		if (canBeIndirect && obj['[index]'])
		{
			s = obj['[index]'].toString() + ' 0 R';
		}
		else
		{
			if (obj.concat) // this is how we test for a list
			{
				s = WritePdfList(obj);
			}
			else
			{
				s = WritePdfDict(obj);
			}
		}
	}
	else if (type == 'number')
	{
		s = obj.toString();
	}
	else if (type == 'string')
	{
		if (obj[0] == '"')
		{
			s = '(' + obj.substring(1, obj.length - 1) + ')';
		}
		else
		{
			s = '/' + obj.toString();
		}
	}
	else
	{
		throw new Error('"' + type + '" is not a recogized type');
	}
	
	return s;
}
function Uint8ArrayToAsciiHexDecode(uint8Array: Uint8Array): string {
	
	var ascii = [];
	
	for (var i = 0; i < uint8Array.length; i++)
	{
		var b = uint8Array[i];
		var hex = ((b < 0x10) ? '0' : '') + b.toString(16).toUpperCase();
		ascii.push(hex);
	}
	
	return ascii.join('');
}

exports.PDF = PDF;

