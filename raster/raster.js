var Bitmap = (function () {
    function Bitmap(width, height, bytesPerPixel) {
        this.magic = 'BM';
        this.reserved1 = 0;
        this.reserved2 = 0;
        this.offset = 54;
        this.size2 = 40; // size of the second half of the header chunk
        this.planes = 1;
        this.compression = 0;
        this.sizeImage = 0;
        this.xPelsPerMeter = 0;
        this.yPelsPerMeter = 0;
        this.clrUsed = 0;
        this.clrImportant = 0;
        var headerSize = 54;
        this.width = width;
        this.height = height;
        this.bytesPerPixel = bytesPerPixel;
        this.bitcount = bytesPerPixel * 8;
        this.bytesPerRaster = width * bytesPerPixel;
        //if (this.bytesPerRaster % 2 == 1) { this.bytesPerRaster++; } // each horizontal pixel line must occupy an even number of bytes
        if (this.bytesPerRaster % 4 > 0) {
            this.bytesPerRaster += (4 - this.bytesPerRaster % 4);
        } // each horizontal pixel line must occupy a multiple of 4 bytes
        this.size = headerSize + height * this.bytesPerRaster;
        this.pixels = new Uint8Array(this.size);
        var x = this.pixels;
        var c = 0;
        x[c++] = 'B'.charCodeAt(0);
        x[c++] = 'M'.charCodeAt(0);
        x[c++] = this.size % 256;
        x[c++] = Math.floor(this.size / 256) % 256;
        x[c++] = Math.floor(this.size / 256 / 256) % 256;
        x[c++] = Math.floor(this.size / 256 / 256 / 256) % 256;
        x[c++] = this.reserved1 % 256;
        x[c++] = Math.floor(this.reserved1 / 256) % 256;
        x[c++] = this.reserved2 % 256;
        x[c++] = Math.floor(this.reserved2 / 256) % 256;
        x[c++] = this.offset % 256;
        x[c++] = Math.floor(this.offset / 256) % 256;
        x[c++] = Math.floor(this.offset / 256 / 256) % 256;
        x[c++] = Math.floor(this.offset / 256 / 256 / 256) % 256;
        x[c++] = this.size2 % 256;
        x[c++] = Math.floor(this.size2 / 256) % 256;
        x[c++] = Math.floor(this.size2 / 256 / 256) % 256;
        x[c++] = Math.floor(this.size2 / 256 / 256 / 256) % 256;
        x[c++] = this.width % 256;
        x[c++] = Math.floor(this.width / 256) % 256;
        x[c++] = Math.floor(this.width / 256 / 256) % 256;
        x[c++] = Math.floor(this.width / 256 / 256 / 256) % 256;
        x[c++] = this.height % 256;
        x[c++] = Math.floor(this.height / 256) % 256;
        x[c++] = Math.floor(this.height / 256 / 256) % 256;
        x[c++] = Math.floor(this.height / 256 / 256 / 256) % 256;
        x[c++] = this.planes % 256;
        x[c++] = Math.floor(this.planes / 256) % 256;
        x[c++] = this.bitcount % 256;
        x[c++] = Math.floor(this.bitcount / 256) % 256;
        x[c++] = this.compression % 256;
        x[c++] = Math.floor(this.compression / 256) % 256;
        x[c++] = Math.floor(this.compression / 256 / 256) % 256;
        x[c++] = Math.floor(this.compression / 256 / 256 / 256) % 256;
        x[c++] = this.sizeImage % 256;
        x[c++] = Math.floor(this.sizeImage / 256) % 256;
        x[c++] = Math.floor(this.sizeImage / 256 / 256) % 256;
        x[c++] = Math.floor(this.sizeImage / 256 / 256 / 256) % 256;
        x[c++] = this.xPelsPerMeter % 256;
        x[c++] = Math.floor(this.xPelsPerMeter / 256) % 256;
        x[c++] = Math.floor(this.xPelsPerMeter / 256 / 256) % 256;
        x[c++] = Math.floor(this.xPelsPerMeter / 256 / 256 / 256) % 256;
        x[c++] = this.yPelsPerMeter % 256;
        x[c++] = Math.floor(this.yPelsPerMeter / 256) % 256;
        x[c++] = Math.floor(this.yPelsPerMeter / 256 / 256) % 256;
        x[c++] = Math.floor(this.yPelsPerMeter / 256 / 256 / 256) % 256;
        x[c++] = this.clrUsed % 256;
        x[c++] = Math.floor(this.clrUsed / 256) % 256;
        x[c++] = Math.floor(this.clrUsed / 256 / 256) % 256;
        x[c++] = Math.floor(this.clrUsed / 256 / 256 / 256) % 256;
        x[c++] = this.clrImportant % 256;
        x[c++] = Math.floor(this.clrImportant / 256) % 256;
        x[c++] = Math.floor(this.clrImportant / 256 / 256) % 256;
        x[c++] = Math.floor(this.clrImportant / 256 / 256 / 256) % 256;
        for (var i = headerSize; i < this.pixels.length; i++) {
            this.pixels[i] = 255;
        }
    }
    Bitmap.prototype.getPixel = function (x, y) {
        // the x and y params measure from the top left, but the pixels are stored starting from the bottom left
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
            var index = this.offset + ((this.height - y - 1) * this.bytesPerRaster) + x * this.bytesPerPixel; // note that (0,0) is the bottom left
            var color = {};
            color.b = this.pixels[index + 0]; // also note the order is BGR, not RGB
            color.g = this.pixels[index + 1];
            color.r = this.pixels[index + 2];
            if (this.bitcount == 32) {
                color.a = this.pixels[index + 3];
            }
            return color;
        }
        else {
            throw new Error();
        }
    };
    Bitmap.prototype.setPixel = function (x, y, color) {
        // the interface of this function takes an (x,y) coordinate assuming y=0 is the top of the canvas
        // but in bmp, (0,0) is the bottom left
        // do we deal with globalAlpha here?  do we deal with gradient fills here?
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
            if (color.a != null) {
                var background = this.getPixel(x, y);
                var blend = {};
                var factor = (color.a ? (color.a / 255) : 1);
                var inverse = 1 - factor;
                color.r = Math.floor(color.r * factor + background.r * inverse);
                color.g = Math.floor(color.g * factor + background.g * inverse);
                color.b = Math.floor(color.b * factor + background.b * inverse);
            }
            var index = this.offset + ((this.height - y - 1) * this.bytesPerRaster) + x * this.bytesPerPixel; // note that (0,0) is the bottom left
            this.pixels[index + 0] = color.b; // also note the order is BGR, not RGB
            this.pixels[index + 1] = color.g;
            this.pixels[index + 2] = color.r;
        }
    };
    return Bitmap;
}());
//interface Bitmap {
//	offset: number;
//	bytesPerRaster: number;
//	bytesPerPixel: number;
//	width: number;
//	height: number;
//	pixels: Uint8Array;
//	getPixel(x: number, y: number): Color;
//	setPixel(x: number, y: number, color: Color): void;
//}
//var Bitmap;
var Raster = (function () {
    function Raster(width, height) {
        this.canvas = { width: 0, height: 0 };
        this.textAlign = 'left'; // start (default), end, left, right, center - we should change this from left to start.  does opentype.js support RTL?
        this.textBaseline = 'alphabetic'; // alphabetic (default), top, hanging, middle, ideographic, bottom
        this.lineWidth = 1;
        this._fillStyle = 'rgb(0,0,0)'; // make these objects and parse in the setter?
        this._strokeStyle = 'rgb(0,0,0)'; // make these objects and parse in the setter?
        this.lineDashArray = []; // setLineDash([onPixels, offPixels, onPixels, offPixels, ...])
        this.lineDashOffset = 0;
        this.lineJoin = 'miter'; // miter (default), bevel, round
        this.lineCap = 'butt'; // butt (default), round, square
        this.miterLimit = 10; // is this part of the spec or just a chrome thing?  what is the default miter limit for PDF?
        this.globalAlpha = 1.0; // float in [0,1] - 0 = transparent, 1 = opaque
        this.globalCompositeOperation = 'source-over'; // source-over (default), source-in, source-out, source-atop, destination-over, destination-in, destination-out, destination-atop, lighter, copy, xor (darker was removed from the spec)
        this.shadowColor = 'rgba(0, 0, 0, 0)';
        this.shadowBlur = 0; // float, not sure exactly how to implement
        this.shadowOffsetX = 0;
        this.shadowOffsetY = 0;
        this.fillColor = { r: 0, g: 0, b: 0, a: 255 };
        this.strokeColor = { r: 0, g: 0, b: 0, a: 255 };
        this.fontFamily = 'serif';
        this.bold = false;
        this.italic = false;
        this.fontSize = 10; // this is what we display in font UI
        this.fontSizePt = 10;
        this.fontSizeUnits = 'pt';
        this.cubitsPerPoint = 1 / 12; // this works on my screen
        this.pointsPerCubit = 12;
        this.cubitsPerPixel = 1 / 17;
        this.pixelsPerCubit = 17;
        // bit getter - if (x & mask[i] > 0)
        // bit setter - x |= mask[i]
        // bit clearer - x &= ~mask[i] - i don't think we need to clear bits though
        this.mask = [0x0001, 0x0002, 0x0004, 0x0008, 0x0010, 0x0020, 0x0040, 0x0080, 0x0100, 0x0200, 0x0400, 0x0800, 0x1000, 0x2000, 0x4000, 0x8000];
        this.splines = null;
        this.startPoint = null;
        this.currentPoint = null;
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.bytesPerPixel = 3;
        //this.pixels = new Uint8Array(width * height * this.bytesPerPixel);
        this.bitmap = new Bitmap(width, height, this.bytesPerPixel);
        this.n = 3;
        this.nn = this.n * this.n;
        //this.samples = new Uint8Array(width * height * this.nn);
        this.samples = new Uint16Array(width * height);
    }
    Object.defineProperty(Raster.prototype, "fillStyle", {
        get: function () { return this._fillStyle; },
        set: function (value) { this._fillStyle = value; this.fillColor = this.ParseColor(value); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Raster.prototype, "strokeStyle", {
        get: function () { return this._strokeStyle; },
        set: function (value) { this._strokeStyle = value; this.strokeColor = this.ParseColor(value); },
        enumerable: true,
        configurable: true
    });
    Raster.prototype.getLineDash = function () { return this.lineDashArray; };
    Raster.prototype.setLineDash = function (value) { this.lineDashArray = value; };
    Object.defineProperty(Raster.prototype, "font", {
        get: function () { return this.fontSize.toString() + this.fontSizeUnits + ' ' + this.fontFamily; },
        set: function (str) {
            if (!str) {
                return;
            } // this catches null, undefined, and empty string
            var letterIndex = str.search(/[A-Za-z]/);
            var spaceIndex = str.search(' ');
            // the above fails on '10 pt Helvetica' (space between 10 and pt), so do this
            if (letterIndex > spaceIndex) {
                spaceIndex = letterIndex + str.substr(letterIndex).search(' ');
            }
            var part0 = str.substring(0, letterIndex).trim();
            var part1 = str.substring(letterIndex, spaceIndex);
            var part2 = str.substring(spaceIndex + 1);
            this.fontSize = parseFloat(part0);
            this.fontSizeUnits = part1;
            if (this.fontSizeUnits == 'pt') {
                this.fontSizePt = this.fontSize;
                this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
                this.fontSizePx = this.fontSizeCu * this.pixelsPerCubit;
            }
            else if (this.fontSizeUnits == 'px') {
                this.fontSizePx = this.fontSize;
                this.fontSizeCu = this.fontSizePx * this.cubitsPerPixel;
                this.fontSizePt = this.fontSizeCu * this.pointsPerCubit;
            }
            else if (this.fontSizeUnits == 'cu') {
                this.fontSizeCu = this.fontSize;
                this.fontSizePx = this.fontSizeCu * this.pixelsPerCubit;
                this.fontSizePt = this.fontSizeCu * this.pointsPerCubit;
            }
            else {
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
            for (var i = 0; i < words.length; i++) {
                if (words[i] == 'bold') {
                    bold = true;
                    words[i] = '';
                }
                if (words[i] == 'italic') {
                    italic = true;
                    words[i] = '';
                }
            }
            var fontFamily = words.join('').trim();
            this.setFont(fontFamily, bold, italic);
            if (typeof window != 'undefined') {
            }
        },
        enumerable: true,
        configurable: true
    });
    Raster.prototype.setFontSize = function (fontSize) {
        // this should be a setter, but requires deletion of this.fontSize or creation of a shadow variable
        this.fontSize = fontSize;
        //this.fontSizePt = fontSize;
        //this.fontSizePx = this.fontSizePt * this.cubitsPerPoint * this.pixelsPerCubit;
        //this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
    };
    Raster.prototype.setFont = function (fontFamily, bold, italic) {
        this.fontFamily = fontFamily;
        this.bold = bold;
        this.italic = italic;
        var suffix = '';
        if (bold && italic) {
            suffix = 'Z';
        }
        else if (bold) {
            suffix = 'B';
        }
        else if (italic) {
            suffix = 'I';
        }
        var filename = fontFamily + suffix;
        this.setFontObject(filename);
    };
    Raster.prototype.setFontObject = function (filename) {
        this.fontObject = Raster.fontNameToFontObject[filename]; // dict filled separately and prior to this
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
    };
    Raster.prototype.fillText = function (text, x, y) {
        var dxPxdyPx = this.alignText(text);
        var dxPx = dxPxdyPx.dxPx;
        var dyPx = dxPxdyPx.dyPx;
        var xPx = x + dxPx;
        var yPx = y + dyPx;
        this.fontObject.draw(this, text, xPx, yPx, this.fontSizePx, {});
    };
    Raster.prototype.alignText = function (text) {
        var leftToRight = true; // pull this from the font somehow?
        var computedTextAlign = null;
        var dxPx = 0;
        var dyPx = 0;
        if (this.textAlign == 'start') {
            if (leftToRight) {
                computedTextAlign = 'left';
            }
            else {
                computedTextAlign = 'right';
            }
        }
        else if (this.textAlign == 'end') {
            if (leftToRight) {
                computedTextAlign = 'right';
            }
            else {
                computedTextAlign = 'left';
            }
        }
        else {
            computedTextAlign = this.textAlign;
        }
        if (computedTextAlign == 'left') {
        }
        else {
            var textMetricsPx = this.measureText(text);
            if (computedTextAlign == 'center') {
                dxPx = -textMetricsPx.width / 2;
            }
            else if (computedTextAlign == 'right') {
                dxPx = -textMetricsPx.width;
            }
            else {
                throw new Error();
            }
        }
        if (this.textBaseline == 'alphabetic') {
        }
        else if (this.textBaseline == 'top') {
            dyPx = this.fontObject.ascender / this.fontObject.unitsPerEm * this.fontSizePx;
        }
        else if (this.textBaseline == 'middle') {
            dyPx = -this.fontObject.descender / this.fontObject.unitsPerEm * this.fontSizePx; // descender is negative, i guess
        }
        else if (this.textBaseline == 'bottom') {
            dyPx = this.fontObject.descender / this.fontObject.unitsPerEm * this.fontSizePx; // descender is negative, i guess
        }
        else if (this.textBaseline == 'ideographic') {
        }
        else if (this.textBaseline == 'hanging') {
        }
        else {
            throw new Error();
        }
        return { dxPx: dxPx, dyPx: dyPx };
    };
    Raster.prototype.measureText = function (text) {
        var widthPx = null;
        if (text == ' ') {
            widthPx = this.fontSizePx; // scale by some amount?
        }
        else {
            var path = this.fontObject.getPath(text, 0, 0, this.fontSizePx, { kerning: true });
            var bbox = path.getBoundingBox();
            widthPx = bbox.x2 - bbox.x1; // since the font is in unscaled units, this is in cubits because we pass in font size as cubits above
        }
        return { width: widthPx };
    };
    Raster.prototype.ParseColor = function (str) {
        var colorDict = {
            black: { r: 0, g: 0, b: 0, a: 255 },
            red: { r: 255, g: 0, b: 0, a: 255 },
            green: { r: 0, g: 255, b: 0, a: 255 },
            blue: { r: 0, g: 0, b: 255, a: 255 },
            gray: { r: 128, g: 128, b: 128, a: 255 },
            white: { r: 255, g: 255, b: 255, a: 255 },
            yellow: { r: 255, g: 255, b: 0, a: 255 },
            orange: { r: 255, g: 128, b: 0, a: 255 },
            purple: { r: 255, g: 0, b: 255, a: 255 }
        };
        if (str.substr(0, 4) == 'rgb(' || str.substr(0, 5) == 'rgba(') {
            return this.ParseRgbColor(str);
        }
        else if (str.substr(0, 4) == 'hsl(') {
            throw new Error();
        }
        else if (str[0] == '#') {
            return this.ParseHexColor(str);
        }
        else if (colorDict[str]) {
            return colorDict[str];
        }
        else {
            throw new Error();
        }
    };
    Raster.prototype.ParseRgbColor = function (str) {
        // str = 'rgb(0,0,0)' or 'rgba(0,0,0,0)'
        var parens = str.substring(str.indexOf('('));
        var rgb = parens.substring(1, parens.length - 1);
        var rgblist = rgb.split(',');
        var color = {};
        color.r = parseInt(rgblist[0]);
        color.g = parseInt(rgblist[1]);
        color.b = parseInt(rgblist[2]);
        color.a = ((rgblist.length > 3) ? parseInt(rgblist[3]) : 255);
        return color;
    };
    Raster.prototype.ParseHexColor = function (hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    };
    // these functions call setPixel directly
    Raster.prototype.fillRectSharp = function (left, top, width, height) {
        for (var i = 0; i < width; i++) {
            for (var j = 0; j < height; j++) {
                var x = left + i;
                var y = top + j;
                this.setPixel(x, y, this.fillColor);
            }
        }
    };
    Raster.prototype.strokeRectSharp = function (left, top, width, height) {
        // this is not quite the same as canvas - the stroke is contained entirely within the fill area - it's just the outer pixel of the fill
        for (var i = 0; i < width; i++) {
            var x = left + i;
            var y1 = top;
            var y2 = top + height - 1;
            this.setPixel(x, y1, this.strokeColor);
            this.setPixel(x, y2, this.strokeColor);
        }
        for (var j = 0; j < height; j++) {
            var x1 = left;
            var x2 = left + width - 1;
            var y = top + j;
            this.setPixel(x1, y, this.strokeColor);
            this.setPixel(x2, y, this.strokeColor);
        }
    };
    Raster.prototype.clearRect = function (left, top, width, height) {
        for (var i = 0; i < height; i++) {
            for (var j = 0; j < width; j++) {
                var x = left + j;
                var y = top + i;
                this.setPixel(x, y, { r: 255, g: 255, b: 255, a: 255 });
            }
        }
    };
    Raster.prototype.fillCircle = function (cx, cy, r) {
        // this is great for full circles but we want to move to arcs
        var rr = r * r;
        var n = 3;
        var nn = n * n;
        var sub = 1 / n;
        var lf = Math.floor(cx - r - 1);
        var rt = Math.floor(cx + r + 2);
        var tp = Math.floor(cy - r - 1);
        var bt = Math.floor(cy + r + 2);
        for (var xPixel = lf; xPixel <= rt; xPixel++) {
            for (var yPixel = tp; yPixel <= bt; yPixel++) {
                var sum = 0;
                for (var a = 0; a < n; a++) {
                    for (var b = 0; b < n; b++) {
                        var x = (xPixel + a * sub + sub / 2);
                        var y = (yPixel + b * sub + sub / 2);
                        var dd = (x - cx) * (x - cx) + (y - cy) * (y - cy);
                        if (dd < rr) {
                            sum++;
                        }
                    }
                }
                if (sum > 0) {
                    this.fillColor.a = Math.floor(255 * sum / nn);
                    this.setPixel(xPixel, yPixel, this.fillColor);
                }
            }
        }
    };
    Raster.prototype.drawLine = function (x0, y0, x1, y1) {
        // Brensenham algorithm
        // http://rosettacode.org/wiki/Raster_graphics_operations
        // http://stackoverflow.com/questions/4672279/bresenham-algorithm-in-javascript
        // http://rosettacode.org/wiki/Bitmap/Midpoint_circle_algorithm
        // http://rosettacode.org/wiki/Xiaolin_Wu%27s_line_algorithm - antialiased lines
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var sx = (x0 < x1) ? 1 : -1;
        var sy = (y0 < y1) ? 1 : -1;
        var err = dx - dy;
        if (isNaN(err)) {
            throw new Error('NaN passed into Bitmap.drawLine');
        }
        var color = this.strokeColor;
        while (true) {
            this.setPixel(x0, y0, color);
            if ((x0 == x1) && (y0 == y1)) {
                break;
            }
            var e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < +dx) {
                err += dx;
                y0 += sy;
            }
        }
    };
    Raster.prototype.drawBezier = function (x0, y0, x1, y1, x2, y2, x3, y3) {
        // this samples points along the bezier curve, finds the pixel the point falls in, and determines how far the point is from the center of that pixel
        // then fills the pixel with a grayscale value depending on distance from center, subject to a ratchet where the pixel only gets darker
        // this works reasonably well, subject to the constraint that line width must be 1 and the color fill must be a solid 255 of something
        // the same basic algorithm can also be used for lines and arcs
        // to accomodate varying line widths, we could sample the curve into a set of rectangles, and then fill the rectangles using the fill algo
        // but then the rectangles would have some overlap at the joins, which would make the joins darker
        // so what we really need are flush joins - which means we break it into trapezoids, really
        // any shape works, as long as it is made out of lines
        // but really, all we're doing here is trying to naively offset the bezier curve.  which heck, we can accept the artifacts at sharp turns
        // the sampling is the same though - we just get line segments on the sides
        var dist = function (x0, y0, x1, y1) { return Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)); };
        var d = 3 * Math.floor(dist(x0, y0, x1, y1) + dist(x1, y1, x2, y2) + dist(x2, y2, x3, y3));
        for (var i = 0; i <= d; i++) {
            var t = i / d;
            var x = ComputeBezier(t, x0, x1, x2, x3);
            var y = ComputeBezier(t, y0, y1, y2, y3);
            var pixelX = Math.floor(x);
            var pixelY = Math.floor(y);
            if (0 <= pixelX && pixelX < this.width && 0 <= pixelY && pixelY < this.height) {
                var distanceFromPixelCenter = dist(x, y, pixelX + 0.5, pixelY + 0.5);
                var grayscale = Math.floor(distanceFromPixelCenter * 255);
                if (grayscale < this.getPixel(pixelX, pixelY).r) {
                    this.setPixel(pixelX, pixelY, { r: grayscale, g: grayscale, b: grayscale });
                }
            }
        }
    };
    Raster.prototype.drawArc = function (spline) {
        // offset arcs, test for r < p < R
        var a = spline.startAngle;
        var b = spline.endAngle;
        var r = spline.radius - this.lineWidth / 2;
        var R = spline.radius + this.lineWidth / 2;
        var cx = spline.center.x;
        var cy = spline.center.y;
        var rr = r * r;
        var RR = R * R;
        var bbox = BoundingBox(this, [spline]);
        var n = 3;
        var nn = n * n;
        var sub = 1 / n;
        for (var xPixel = bbox.xMin; xPixel <= bbox.xMax; xPixel++) {
            for (var yPixel = bbox.yMin; yPixel <= bbox.yMax; yPixel++) {
                var sum = 0;
                for (var a = 0; a < n; a++) {
                    for (var b = 0; b < n; b++) {
                        var x = (xPixel + a * sub + sub / 2);
                        var y = (yPixel + b * sub + sub / 2);
                        var dd = (x - cx) * (x - cx) + (y - cy) * (y - cy);
                        var angle = Math.atan2(y, x); // we can't use the built-in atan2, we'll have to do our own that returns in the range [0,2pi)
                        if (rr < dd && dd < RR && ((a < b) ? (a < angle && b < angle) : (a < angle || b < angle))) {
                            sum++;
                        }
                    }
                }
                if (sum > 0) {
                    this.fillColor.a = Math.floor(255 * sum / nn);
                    this.setPixel(xPixel, yPixel, this.fillColor);
                }
            }
        }
    };
    Raster.prototype.beginPath = function () {
        this.splines = [];
        this.startPoint = { x: 0, y: 0 };
        this.currentPoint = { x: 0, y: 0 };
    };
    Raster.prototype.closePath = function () {
        this.splines.push({ type: 0 /* Line */, points: [{ x: this.currentPoint.x, y: this.currentPoint.y }, { x: this.startPoint.x, y: this.startPoint.y }] });
        this.currentPoint.x = this.startPoint.x;
        this.currentPoint.y = this.startPoint.y;
    };
    Raster.prototype.moveTo = function (x, y) {
        this.startPoint.x = x;
        this.startPoint.y = y;
        this.currentPoint.x = x;
        this.currentPoint.y = y;
    };
    Raster.prototype.lineTo = function (x, y) {
        this.splines.push({ type: 0 /* Line */, points: [{ x: this.currentPoint.x, y: this.currentPoint.y }, { x: x, y: y }] });
        this.currentPoint.x = x;
        this.currentPoint.y = y;
    };
    Raster.prototype.quadraticCurveTo = function (x1, y1, x, y) {
        this.splines.push({ type: 1 /* Quadratic */, points: [{ x: this.currentPoint.x, y: this.currentPoint.y }, { x: x1, y: y1 }, { x: x, y: y }] });
        this.currentPoint.x = x;
        this.currentPoint.y = y;
    };
    Raster.prototype.bezierCurveTo = function (x1, y1, x2, y2, x, y) {
        this.splines.push({ type: 2 /* Cubic */, points: [{ x: this.currentPoint.x, y: this.currentPoint.y }, { x: x1, y: y1 }, { x: x2, y: y2 }, { x: x, y: y }] });
        this.currentPoint.x = x;
        this.currentPoint.y = y;
    };
    Raster.prototype.arcTo = function (r, x1, y1, x2, y2) { };
    Raster.prototype.fill = function () {
        //DebugSplines(this.splines);
        var bbox = BoundingBox(this, this.splines);
        for (var yPix = bbox.yMin; yPix <= bbox.yMax; yPix++) {
            for (var i = 0; i < this.n; i++) {
                var y = yPix + (i + 0.5) / this.n;
                var xs = SplineIntersections(this.splines, y);
                // we use the odd-even rule - intersections must come in pairs - the first one turns the fill on, the second turns it off
                for (var k = 0; k < xs.length; k += 2) {
                    var x0 = xs[k + 0];
                    var x1 = xs[k + 1];
                    if (x1 < 0 || x0 > this.width) {
                        continue;
                    } // discard underflow and overflow
                    var xPix0 = Math.floor(x0);
                    var xPix1 = Math.ceil(x1);
                    if (xPix0 < 0) {
                        xPix0 = 0;
                    } // left side straddle
                    if (xPix1 >= this.width) {
                        xPix1 = this.width - 1;
                    } // right side straddle
                    for (var xPix = xPix0; xPix <= xPix1; xPix++) {
                        for (var j = 0; j < this.n; j++) {
                            var x = xPix + (j + 0.5) / this.n;
                            if (x0 < x && x < x1) {
                                // we could move this index formula out of the loop and and increment by (this.n-1)*this.n after each pixel
                                //var sampleIndex = (yPix * this.width + xPix) * this.nn + i * this.n + j;
                                //this.samples[sampleIndex] = 1;
                                var sampleIndex = yPix * this.width + xPix;
                                var maskIndex = i * this.n + j;
                                this.samples[sampleIndex] |= this.mask[maskIndex];
                            }
                        }
                    }
                }
            }
        }
        //document.getElementById('samples').innerText = DebugSamples(this);
        this.applyColor(bbox, this.fillColor);
    };
    Raster.prototype.stroke = function () {
        var points = [];
        var margin = this.lineWidth + 1;
        // generate sample points along the length of the splines
        for (var i = 0; i < this.splines.length; i++) {
            var spline = this.splines[i];
            var length = SplineLength(spline);
            var n = Math.floor(length) * 2; // sample points can be spaced arbitrarily tightly
            if (n == 0) {
                n = 1;
            } // even tiny line segments get at least one point
            if (spline.type == 3 /* Arc */) {
                for (var k = 0; k <= n; k++) {
                    var t = k / n;
                    var angle = spline.startAngle + t * (spline.endAngle - spline.startAngle);
                    var x = spline.center.x + spline.radius * Math.cos(angle);
                    var y = spline.center.y + spline.radius * Math.sin(angle);
                    if (x < -margin || x > (this.width + margin) || y < -margin || y > (this.height + margin)) {
                        continue;
                    }
                    points.push({ x: x, y: y });
                }
            }
            else {
                var xcoeffs = SplineCoeffs(spline, 'x');
                var ycoeffs = SplineCoeffs(spline, 'y');
                for (var k = 0; k <= n; k++) {
                    var t = k / n;
                    var x = SplineEval(spline, t, xcoeffs);
                    var y = SplineEval(spline, t, ycoeffs);
                    if (x < -margin || x > (this.width + margin) || y < -margin || y > (this.height + margin)) {
                        continue;
                    }
                    points.push({ x: x, y: y });
                }
            }
        }
        var bbox = BoundingBox(this, this.splines);
        var rr = (this.lineWidth / 2) * (this.lineWidth / 2);
        // for each spline point, test a neighborhood of pixel samples for distance < lineWidth / 2
        for (var k = 0; k < points.length; k++) {
            var p = points[k];
            var xFlor = Math.max(0, Math.floor(p.x) - 2);
            var yFlor = Math.max(0, Math.floor(p.y) - 2);
            var xCeil = Math.min(this.width - 1, xFlor + 4);
            var yCeil = Math.min(this.height - 1, yFlor + 4);
            for (var yPix = yFlor; yPix <= yCeil; yPix++) {
                //var sampleIndex = (yPix * this.width + xFlor) * this.nn;
                var sampleIndex = yPix * this.width + xFlor;
                for (var xPix = xFlor; xPix <= xCeil; xPix++) {
                    var maskIndex = 0;
                    for (var i = 0; i < this.n; i++) {
                        for (var j = 0; j < this.n; j++) {
                            //if (this.samples[sampleIndex] == 1) { sampleIndex++; continue; }
                            if ((this.samples[sampleIndex] & this.mask[maskIndex]) > 0) {
                                maskIndex++;
                                continue;
                            }
                            var x = xPix + (j + 0.5) / this.n;
                            var y = yPix + (i + 0.5) / this.n;
                            var dd = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
                            //if (dd < rr) { this.samples[sampleIndex] = 1; }
                            if (dd < rr) {
                                this.samples[sampleIndex] |= this.mask[maskIndex];
                            }
                            maskIndex++;
                        }
                    }
                    sampleIndex++;
                }
            }
        }
        //document.getElementById('samples').innerText = DebugSamples(this);
        this.applyColor(bbox, this.strokeColor);
    };
    Raster.prototype.stroke2 = function () {
        // each path segment has a bounding box - we need only test subpixels within that bounding box
        // the functions drawLine and drawBezier below are rough implentations, good only when lineWidth = 1
        // to implement thicker lines, there are two options:
        // 1. offset curves and just run the fill algo - problem is that offsetting beziers is difficult - see http://pomax.github.io/bezierinfo/#offsetting
        // 2. calculate minimum distance to the curve and test that against the lineWidth
        //     this is elegant, except that finding the minimum for bezier curves requires finding roots of a 5th degree polynomial
        //     dd = (cx - x(t))*(cx - x(t)) + (cy - y(t))*(cy - y(t))
        //     since x(t) and y(t) are 3rd degree, the square is 6th, and then the derivative is 5th
        // 3. brute force the distance - just test points along the curve to try and determine whether the point is within the lineWidth
        //    there's a lot of low-hanging optimization to be done here because all we're doing is determining whether a point is within the lineWidth or not
        //    large numbers of points can be thrown away immediately, and then for the rest, all we have to do is find a single point on the curve such that the distance between the test point and the curve point is less than lineWidth - we don't actually need to find the minimum
        for (var i = 0; i < this.splines.length; i++) {
            var spline = this.splines[i];
            var type = spline.type;
            var p = spline.points;
            if (type == 0 /* Line */) {
                this.drawLine(p[0].x, p[0].y, p[1].x, p[1].y);
            }
            else if (type == 1 /* Quadratic */) {
                this.drawBezier(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, p[2].x, p[2].y); // cp2 = end point
            }
            else if (type == 2 /* Cubic */) {
                this.drawBezier(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
            }
            else if (type == 3 /* Arc */) {
                this.drawArc(spline);
            }
            else {
                throw new Error();
            }
        }
    };
    Raster.prototype.applyColor = function (bbox, color) {
        for (var y = bbox.yMin; y <= bbox.yMax; y++) {
            //var sampleIndex = (y * this.width + bbox.xMin) * this.nn;
            var sampleIndex = y * this.width + bbox.xMin;
            //var pixelIndex = (y * this.width + bbox.xMin) * this.bytesPerPixel;
            var pixelIndex = this.bitmap.offset + ((this.height - y - 1) * this.bitmap.bytesPerRaster) + bbox.xMin * this.bytesPerPixel;
            for (var x = bbox.xMin; x <= bbox.xMax; x++) {
                var sum = 0;
                //for (var k = 0; k < this.nn; k++)
                //{
                //	sum += this.samples[sampleIndex + k];
                //	this.samples[sampleIndex + k] = 0; // sample array gets cleared to zero
                //}
                for (var k = 0; k < this.nn; k++) {
                    sum += (((this.samples[sampleIndex] & this.mask[k]) > 0) ? 1 : 0);
                }
                this.samples[sampleIndex] = 0;
                if (sum > 0) {
                    var alpha = sum / this.nn * this.globalAlpha;
                    var inverse = 1 - alpha;
                    //this.pixels[pixelIndex + 0] = Math.floor(color.r * alpha + this.pixels[pixelIndex + 0] * inverse);
                    //this.pixels[pixelIndex + 1] = Math.floor(color.g * alpha + this.pixels[pixelIndex + 1] * inverse);
                    //this.pixels[pixelIndex + 2] = Math.floor(color.b * alpha + this.pixels[pixelIndex + 2] * inverse);
                    //if (this.bytesPerPixel == 4) { this.pixels[pixelIndex + 3] = 255; }
                    ////if (this.bytesPerPixel == 4) { this.pixels[pixelIndex + 3] = color.a; }
                    this.bitmap.pixels[pixelIndex + 0] = Math.floor(color.b * alpha + this.bitmap.pixels[pixelIndex + 0] * inverse);
                    this.bitmap.pixels[pixelIndex + 1] = Math.floor(color.g * alpha + this.bitmap.pixels[pixelIndex + 1] * inverse);
                    this.bitmap.pixels[pixelIndex + 2] = Math.floor(color.r * alpha + this.bitmap.pixels[pixelIndex + 2] * inverse);
                }
                //sampleIndex += this.nn;
                sampleIndex++;
                pixelIndex += this.bytesPerPixel;
            }
        }
    };
    Raster.prototype.fillRect = function (left, top, width, height) { this.drawRect(left, top, width, height, true, false); };
    Raster.prototype.strokeRect = function (left, top, width, height) { this.drawRect(left, top, width, height, false, true); };
    Raster.prototype.drawRect = function (left, top, width, height, doFill, doStroke) {
        var p1 = { x: left, y: top };
        var p2 = { x: left + width, y: top };
        var p3 = { x: left + width, y: top + height };
        var p4 = { x: left, y: top + height };
        this.beginPath();
        this.moveTo(p1.x, p1.y);
        this.lineTo(p2.x, p2.y);
        this.lineTo(p3.x, p3.y);
        this.lineTo(p4.x, p4.y);
        this.closePath();
        if (doFill) {
            this.fill();
        }
        if (doStroke) {
            this.stroke();
        }
    };
    Raster.prototype.rect = function (left, top, width, height) {
        this.splines.push({ type: 0 /* Line */, points: [{ x: left, y: top }, { x: left + width, y: top }] });
        this.splines.push({ type: 0 /* Line */, points: [{ x: left + width, y: top }, { x: left + width, y: top + height }] });
        this.splines.push({ type: 0 /* Line */, points: [{ x: left + width, y: top + height }, { x: left, y: top + height }] });
        this.splines.push({ type: 0 /* Line */, points: [{ x: left, y: top + height }, { x: left, y: top }] });
    };
    Raster.prototype.arc = function (cx, cy, r, startAngle, endAngle, bAntiClockwise) {
        if (!bAntiClockwise) {
            var temp = startAngle;
            startAngle = endAngle;
            endAngle = temp;
        }
        if (startAngle >= endAngle) {
            return;
        } // startAngle must be less than endAngle
        // now that we've guaranteed that start < end, we can normalize to [0,2pi) and handle origin straddling in ArcHoriIntersections 
        startAngle %= Math.PI * 2;
        endAngle %= Math.PI * 2;
        if (startAngle < 0) {
            startAngle += Math.PI * 2;
        }
        if (endAngle < 0) {
            endAngle += Math.PI * 2;
        }
        this.splines.push({ type: 3 /* Arc */, center: { x: cx, y: cy }, radius: r, startAngle: startAngle, endAngle: endAngle });
    };
    Raster.prototype.getPixel = function (x, y) {
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
            //var index = (y * this.width + x) * this.bytesPerPixel;
            //var color: Color = {};
            //color.r = this.pixels[index + 0];
            //color.g = this.pixels[index + 1];
            //color.b = this.pixels[index + 2];
            //if (this.bytesPerPixel == 4) { color.a = this.pixels[index + 3]; }
            var index = this.bitmap.offset + ((this.height - y - 1) * this.bitmap.bytesPerRaster) + x * this.bytesPerPixel;
            var color = {
                b: this.bitmap.pixels[index + 0],
                g: this.bitmap.pixels[index + 1],
                r: this.bitmap.pixels[index + 2]
            };
            //if (this.bytesPerPixel == 4) { color.a = this.bitmap.pixels[index + 3]; }
            return color;
        }
        else {
            throw new Error();
        }
    };
    Raster.prototype.setPixel = function (x, y, color) {
        // the interface of this function takes an (x,y) coordinate assuming y=0 is the top of the canvas
        // but in bmp, (0,0) is the bottom left
        // do we deal with globalAlpha here?  do we deal with gradient fills here?
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
            var background = this.getPixel(x, y);
            var blend = {};
            var factor = color.a / 255;
            var inverse = 1 - factor;
            blend.r = Math.floor(color.r * factor + background.r * inverse);
            blend.g = Math.floor(color.g * factor + background.g * inverse);
            blend.b = Math.floor(color.b * factor + background.b * inverse);
            //var index = ((this.height - y - 1) * this.width + x) * this.bytesPerPixel; // note that (0,0) is the bottom left
            var index = this.bitmap.offset + ((this.height - y - 1) * this.bitmap.bytesPerRaster) + x * this.bytesPerPixel;
            this.bitmap.pixels[index + 0] = blend.b; // also note the order is BGR, not RGB
            this.bitmap.pixels[index + 1] = blend.g;
            this.bitmap.pixels[index + 2] = blend.r;
        }
    };
    Raster.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
        // this bullshit is necessary because the drawImage function puts the src args before the dst args if they exist
        // like so - these are three valid ways to call the function:
        //CanvasRenderingContext2D.drawImage(image, dx, dy);
        //CanvasRenderingContext2D.drawImage(image, dx, dy, dw, dh);
        //CanvasRenderingContext2D.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        if (dx === undefined) {
            dx = sx;
            dy = sy;
            sx = 0;
            sy = 0;
            if (sw === undefined) {
                sw = image.width;
                sh = image.height;
                dw = sw;
                dh = sh;
            }
            else {
                dw = sw;
                dh = sh;
                sw = image.width;
                sh = image.height;
            }
        }
        this.drawImageImpl(image, dx, dy, dw, dh, sx, sy, sw, sh);
    };
    Raster.prototype.drawImageImpl = function (image, dx, dy, dw, dh, sx, sy, sw, sh) {
        // image is of type Bitmap, HTMLImageElement, HTMLCanvasElement, HTMLVideoElement
        // g.drawImage(image, dx, dy) - natural width and height are used
        // g.drawImage(image, dx, dy, dw, dh) - image is scaled to fit specified width and height
        // g.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) - all parameters specified, image scaled as needed (note that src params come first here)
        if (dw === undefined) {
            dw = image.width;
        }
        if (dh === undefined) {
            dh = image.height;
        }
        if (sx === undefined) {
            sx = 0;
        }
        if (sy === undefined) {
            sy = 0;
        }
        if (sw === undefined) {
            sw = image.width;
        }
        if (sh === undefined) {
            sh = image.height;
        }
        for (var i = 0; i < dw; i++) {
            for (var j = 0; j < dh; j++) {
                var dstX = dx + i;
                var dstY = dy + j;
                var srcX = sx + Math.floor(i * sw / dw);
                var srcY = sy + Math.floor(j * sh / dh);
                this.setPixel(dstX, dstY, image.getPixel(srcX, srcY));
            }
        }
    };
    // ----------- fonts
    Raster.fontNameToFontObject = {}; // must be filled prior to setting ctx.font
    return Raster;
}());
var debug = false;
function SplineCoeffs(spline, axis) {
    var coeffs = null;
    if (spline.type == 0 /* Line */) {
        coeffs = LineCoeffs(spline.points[0][axis], spline.points[1][axis]);
    }
    else if (spline.type == 1 /* Quadratic */) {
        coeffs = QuadCoeffs(spline.points[0][axis], spline.points[1][axis], spline.points[2][axis]);
    }
    else if (spline.type == 2 /* Cubic */) {
        coeffs = BezzCoeffs(spline.points[0][axis], spline.points[1][axis], spline.points[2][axis], spline.points[3][axis]);
    }
    else {
        throw new Error();
    }
    return coeffs;
}
function SplineEval(spline, t, coeffs) {
    var result = null;
    if (spline.type == 0 /* Line */) {
        result = LineEval(t, coeffs[0], coeffs[1]);
    }
    else if (spline.type == 1 /* Quadratic */) {
        result = QuadEval(t, coeffs[0], coeffs[1], coeffs[2]);
    }
    else if (spline.type == 2 /* Cubic */) {
        result = BezzEval(t, coeffs[0], coeffs[1], coeffs[2], coeffs[3]);
    }
    else {
        throw new Error();
    }
    return result;
}
function LineCoeffs(a, b) { return [-a + b, a]; }
function QuadCoeffs(a, b, c) { return [a - 2 * b + c, -2 * a + 2 * b, a]; }
function BezzCoeffs(a, b, c, d) { return [-a + 3 * b - 3 * c + d, 3 * a - 6 * b + 3 * c, -3 * a + 3 * b, a]; }
function LineEval(t, a, b) { return a * t + b; }
function QuadEval(t, a, b, c) { return a * t * t + b * t + c; }
function BezzEval(t, a, b, c, d) { return a * t * t * t + b * t * t + c * t + d; }
function SplineIntersections(splines, y) {
    var xs = [];
    var intersectingSplines = [];
    for (var i = 0; i < splines.length; i++) {
        var spline = splines[i];
        var intersects = false; // this should probably return the number of intersections
        if (spline.type == 0 /* Line */) {
            intersects = LineHoriIntersections(spline.points, y, xs);
        }
        else if (spline.type == 1 /* Quadratic */) {
            intersects = QuadraticHoriIntersections(spline.points, y, xs);
        }
        else if (spline.type == 2 /* Cubic */) {
            intersects = CubicHoriIntersections(spline.points, y, xs);
        }
        else if (spline.type == 3 /* Arc */) {
            intersects = ArcHoriIntersections(spline, y, xs);
        }
        else {
            throw new Error();
        }
        if (intersects) {
            intersectingSplines.push(i);
        }
    }
    if (xs.length % 2 == 1) {
        //console.log(intersectingSplines);
        console.log('Odd number of intersections at y=' + y);
    }
    xs.sort(function (a, b) { if (a < b) {
        return -1;
    }
    else {
        return 1;
    } });
    //console.log(yPix + ' ' + i + ' [' + xs.map(d => d.toFixed(1)).join(',') + ']'); // log intersections
    return xs;
}
function LineHoriIntersections(line, y, xs) {
    // this gives the intersection points of a line segment with an infinite horizontal line
    // we return only the x-coordinate of the intersection point, since y is fixed
    // if there are no intersections, return an empty list
    // if the line is horizontal and coincident with the infinite line, return the endpoints of the segment
    var yEqual = Math.abs(line[1].y - line[0].y) < 0.000001;
    if (yEqual) {
        var xEqual = Math.abs(line[1].x - line[0].x) < 0.000001;
        if (xEqual) {
            return false;
        }
        if (Math.abs(line[0].y - y) < 0.000001) {
            xs.push(line[0].x);
            xs.push(line[1].x);
            return true;
        }
        else {
            return false;
        }
    }
    else {
        var sign = (y - line[0].y) * (y - line[1].y);
        if (sign < 0) {
            var dx = line[1].x - line[0].x;
            var dy = line[1].y - line[0].y;
            var dyNeeded = y - line[0].y;
            var x = line[0].x + dx * dyNeeded / dy;
            xs.push(x);
            return true;
        }
        else {
            return false;
        }
    }
}
function QuadraticHoriIntersections(quadratic, y, xs) {
    var ycoeffs = QuadCoeffs(quadratic[0].y - y, quadratic[1].y - y, quadratic[2].y - y);
    var roots = QuadraticRoots(ycoeffs[0], ycoeffs[1], ycoeffs[2]);
    var inInterval = roots.filter(function (t) { return 0.0 <= t && t < 1.0; }); // [0,1) - empirically determined by trying to draw fonts without artifacts
    if (inInterval.length == 0) {
        return false;
    }
    var xcoeffs = QuadCoeffs(quadratic[0].x, quadratic[1].x, quadratic[2].x);
    for (var i = 0; i < inInterval.length; i++) {
        var t = inInterval[i];
        xs.push(QuadEval(t, xcoeffs[0], xcoeffs[1], xcoeffs[2]));
    }
    return true;
}
function CubicHoriIntersections(cubic, y, xs) {
    var ycoeffs = BezzCoeffs(cubic[0].y - y, cubic[1].y - y, cubic[2].y - y, cubic[3].y - y);
    var roots = CubicRoots(ycoeffs[0], ycoeffs[1], ycoeffs[2], ycoeffs[3]);
    var inInterval = roots.filter(function (t) { return 0.0 <= t && t < 1.0; });
    if (inInterval.length == 0) {
        return false;
    }
    var xcoeffs = BezzCoeffs(cubic[0].x, cubic[1].x, cubic[2].x, cubic[3].x);
    for (var i = 0; i < inInterval.length; i++) {
        var t = inInterval[i];
        xs.push(BezzEval(t, xcoeffs[0], xcoeffs[1], xcoeffs[2], xcoeffs[3]));
    }
    return true;
}
function ArcHoriIntersections(arc, y, xs) {
    // ArcHoriIntersections({center:{x:0,y:0},radius:1,startAngle:0,endAngle:Math.PI*2}, 0, xs) => [-1, 1]
    var tp = arc.center.y - arc.radius;
    var bt = arc.center.y + arc.radius;
    if (y <= tp || bt <= y) {
        return false;
    } // the equal to test will exclude single-point-of-contact at the zenith or nadir
    var normed = (arc.center.y - y) / arc.radius; // map y to [ -1 , +1 ]
    var angle1 = Math.asin(normed); // Math.asin maps [ -1 , +1 ] => [ -Math.PI/2 , +Math.PI/2 ]
    var angle2 = Math.PI - angle1; // the reflection of angle1 over the y axis - the asin range interval makes this convenient
    if (angle1 < 0) {
        angle1 += Math.PI * 2;
    } // our angle interval starts at the east compass point and goes counterclockwise
    if (angle2 < 0) {
        angle2 += Math.PI * 2;
    }
    var x1 = arc.center.x + arc.radius * Math.cos(angle1);
    var x2 = arc.center.x + arc.radius * Math.cos(angle2);
    // range is inclusive/exclusive [ startAngle , endAngle )
    if (arc.startAngle < arc.endAngle) {
        if (arc.startAngle <= angle1 && angle1 < arc.endAngle) {
            xs.push(x1);
        }
        if (arc.startAngle <= angle2 && angle2 < arc.endAngle) {
            xs.push(x2);
        }
    }
    else {
        if (arc.startAngle <= angle1 || angle1 < arc.endAngle) {
            xs.push(x1);
        }
        if (arc.startAngle <= angle2 || angle2 < arc.endAngle) {
            xs.push(x2);
        }
    }
    return true;
}
function LinearRoots(a, b) {
    // a*x + b = 0
    if (a == 0) {
        if (b == 0) {
            // infinite roots
            return [-Infinity, +Infinity];
        }
        else {
            // no roots
            return [];
        }
    }
    else {
        return [-b / a];
    }
}
function QuadraticRoots(a, b, c) {
    if (Math.abs(a) < 0.000001) {
        return LinearRoots(b, c);
    }
    var discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
        return [];
    }
    if (discriminant == 0) {
        return [b / (2 * a)];
    }
    var r0 = (-b + Math.sqrt(discriminant)) / (2 * a);
    var r1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    return [r0, r1];
}
function CubicRoots(a, b, c, d) {
    // based on http://mysite.verizon.net/res148h4j/javascript/script_exact_cubic.html#the%20source%20code
    // a*x*x*x + b*x*x + c*x + d = 0
    //if (a == 0) { return QuadraticRoots(b, c, d); }
    if (Math.abs(a) < 0.000001) {
        return QuadraticRoots(b, c, d);
    } // since the a coeff is the result of a floating point calc, need some tolerance
    var A = b / a;
    var B = c / a;
    var C = d / a;
    var Q = (3 * B - Math.pow(A, 2)) / 9;
    var R = (9 * A * B - 27 * C - 2 * Math.pow(A, 3)) / 54;
    var D = Math.pow(Q, 3) + Math.pow(R, 2); // polynomial discriminant
    //console.log('Q: ' + Q);
    //console.log('R: ' + R);
    //console.log('D: ' + D);
    function sgn(x) { if (x < 0.0) {
        return -1;
    }
    else {
        return 1;
    } }
    var t = [];
    if (D >= 0) {
        var S = sgn(R + Math.sqrt(D)) * Math.pow(Math.abs(R + Math.sqrt(D)), (1 / 3));
        var T = sgn(R - Math.sqrt(D)) * Math.pow(Math.abs(R - Math.sqrt(D)), (1 / 3));
        t.push(-A / 3 + (S + T)); // real root
        var Im = Math.abs(Math.sqrt(3) * (S - T) / 2); // complex part of root pair
        //console.log('S: ' + Q);
        //console.log('T: ' + R);
        //console.log('Im: ' + Im);
        if (Im == 0) {
            t.push(-A / 3 - (S + T) / 2); // real part of complex root
            t.push(-A / 3 - (S + T) / 2); // real part of complex root
        }
    }
    else {
        var th = Math.acos(R / Math.sqrt(-Math.pow(Q, 3)));
        //console.log('th: ' + th);
        t.push(2 * Math.sqrt(-Q) * Math.cos(th / 3) - A / 3);
        t.push(2 * Math.sqrt(-Q) * Math.cos((th + 2 * Math.PI) / 3) - A / 3);
        t.push(2 * Math.sqrt(-Q) * Math.cos((th + 4 * Math.PI) / 3) - A / 3);
    }
    //console.log(t);
    return t;
}
function LineLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    var nx = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4);
    var ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4);
    var d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (d == 0) {
        return [];
    }
    else {
        return [{ x: nx / d, y: ny / d }];
    }
}
function BezierLineIntersections(bezier, line) {
    // what work do these coefficients do?  the point is to transform the line segment to be the horizontal zero, and then find the zeroes of the bezier
    var A = line[1].y - line[0].y; // A = y2-y1
    var B = line[0].x - line[1].x; // B = x1-x2
    var C = line[0].x * (line[0].y - line[1].y) + line[0].y * (line[1].x - line[0].x); // C = x1*(y1-y2)+y1*(x2-x1)
    // we set the first point of the line to (0,0) and the last point to (1,0)
    // that's why we only take the roots in [0,1]
    //console.log('A: ' + A);
    //console.log('B: ' + B);
    //console.log('C: ' + C);
    function bezierCoeffs(a, b, c, d) { return [-a + 3 * b + -3 * c + d, 3 * a - 6 * b + 3 * c, -3 * a + 3 * b, a]; }
    var bx = bezierCoeffs(bezier[0].x, bezier[1].x, bezier[2].x, bezier[3].x);
    var by = bezierCoeffs(bezier[0].y, bezier[1].y, bezier[2].y, bezier[3].y);
    var a = A * bx[0] + B * by[0];
    var b = A * bx[1] + B * by[1];
    var c = A * bx[2] + B * by[2];
    var d = A * bx[3] + B * by[3] + C;
    //console.log('a: ' + a);
    //console.log('b: ' + b);
    //console.log('c: ' + c);
    //console.log('d: ' + d);
    var roots = CubicRoots(a, b, c, d);
    var inUnit = roots.filter(function (t) { return 0.0 <= t && t <= 1.0; });
    var intersections = [];
    for (var i = 0; i < inUnit.length; i++) {
        var t = inUnit[i];
        var x = bx[0] * t * t * t + bx[1] * t * t + bx[2] * t + bx[3];
        //var y = by[0]*t*t*t + by[1]*t*t + by[2]*t + by[3];
        intersections.push(x);
    }
    return intersections;
}
function SplineLength(spline) {
    // this calculates the exact length for arcs and an approximate length for bezier curves
    var p = spline.points;
    var length = null;
    if (spline.type == 0 /* Line */) {
        var length1 = Math.sqrt((p[1].x - p[0].x) * (p[1].x - p[0].x) + (p[1].y - p[0].y) * (p[1].y - p[0].y));
        length = length1;
    }
    else if (spline.type == 1 /* Quadratic */) {
        var length1 = Math.sqrt((p[1].x - p[0].x) * (p[1].x - p[0].x) + (p[1].y - p[0].y) * (p[1].y - p[0].y));
        var length2 = Math.sqrt((p[2].x - p[1].x) * (p[2].x - p[1].x) + (p[2].y - p[1].y) * (p[2].y - p[1].y));
        length = length1 + length2;
    }
    else if (spline.type == 2 /* Cubic */) {
        var length1 = Math.sqrt((p[1].x - p[0].x) * (p[1].x - p[0].x) + (p[1].y - p[0].y) * (p[1].y - p[0].y));
        var length2 = Math.sqrt((p[2].x - p[1].x) * (p[2].x - p[1].x) + (p[2].y - p[1].y) * (p[2].y - p[1].y));
        var length3 = Math.sqrt((p[3].x - p[2].x) * (p[3].x - p[2].x) + (p[3].y - p[2].y) * (p[3].y - p[2].y));
        length = length1 + length2 + length3;
    }
    else if (spline.type == 3 /* Arc */) {
        length = spline.radius * (spline.endAngle - spline.startAngle);
    }
    else {
        throw new Error();
    }
    return length;
}
function ComputeBezier(t, a, b, c, d) {
    return (-a + 3 * b + -3 * c + d) * t * t * t + (3 * a - 6 * b + 3 * c) * t * t + (-3 * a + 3 * b) * t + a;
}
function LineToSplines(line, lineWidth) {
    var p = line.points;
    var dx = p[1].x - p[0].x;
    var dy = p[1].y - p[0].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx); // unsure whether these angles are correct
    var a = angle + Math.PI / 2;
    var b = angle - Math.PI / 2;
    var r = lineWidth / 2;
    var ap = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    var bp = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    ap[0].x = p[0].x + r * Math.cos(a); // find start point of parallel line a by offsetting from p[0]
    ap[0].y = p[0].y + r * Math.sin(a);
    ap[1].x = ap[0].x + dist * Math.cos(angle); // apply original vector to get the end point of parallel line a
    ap[1].y = ap[0].y + dist * Math.sin(angle);
    bp[0].x = p[0].x + r * Math.cos(b); // and do the same for parallel line b
    bp[0].y = p[0].y + r * Math.sin(b);
    bp[1].x = bp[0].x + dist * Math.cos(angle);
    bp[1].y = bp[0].y + dist * Math.sin(angle);
    var splineA = { type: 0 /* Line */, points: ap };
    var splineB = { type: 0 /* Line */, points: bp };
    var arcA = { type: 3 /* Arc */, center: p[0], radius: r, startAngle: a, endAngle: b }; // not sure on the angles here
    var arcB = { type: 3 /* Arc */, center: p[1], radius: r, startAngle: b, endAngle: a }; // not sure on the angles here
    return [splineA, splineB, arcA, arcB];
}
function StrokeMesh(lines) {
    // one way to do strokes is to offset each spline and then do a normal fill
    // this is easy enough for lines and arcs, but offsetting bezier curves is very difficult
    // LineToSplines above is a first draft of offsetting lines
    // the problem here is that we have overlapping splines and don't know how to do nonzero filling rule instead of even-odd
    // specifically the rounded joints of each line will overlap
    // so what we do instead is treat each segment as an independent thing w/r/t even-odd
    // but maintain only one subpixel array
}
function BoundingBox(raster, splines) {
    var xMin = +Infinity;
    var xMax = -Infinity;
    var yMin = +Infinity;
    var yMax = -Infinity;
    for (var i = 0; i < splines.length; i++) {
        var spline = splines[i];
        if (spline.type == 3 /* Arc */) {
            // arcs are monotonic in both x and y, so the extremes are limited to the NESW poles and the endpoints
            var a = spline.startAngle;
            var b = spline.endAngle;
            var E = 0;
            var N = Math.PI / 2;
            var W = Math.PI;
            var S = 3 * Math.PI / 2;
            var ax = spline.center.x + spline.radius * Math.cos(a);
            var ay = spline.center.y + spline.radius * Math.sin(a);
            var bx = spline.center.x + spline.radius * Math.cos(b);
            var by = spline.center.y + spline.radius * Math.sin(b);
            xMin = Math.min(ax, bx);
            yMin = Math.min(ay, by);
            xMax = Math.max(ax, bx);
            yMax = Math.max(ay, by);
            if (a < b) {
                if (a < N && N < b) {
                    yMin = spline.center.y - spline.radius;
                }
                if (a < E && E < b) {
                    xMax = spline.center.x + spline.radius;
                }
                if (a < S && S < b) {
                    yMax = spline.center.y + spline.radius;
                }
                if (a < W && W < b) {
                    xMin = spline.center.x - spline.radius;
                }
            }
            else {
                if (a < N || N < b) {
                    yMin = spline.center.y - spline.radius;
                }
                if (a < E || E < b) {
                    xMax = spline.center.x + spline.radius;
                }
                if (a < S || S < b) {
                    yMax = spline.center.y + spline.radius;
                }
                if (a < W || W < b) {
                    xMin = spline.center.x - spline.radius;
                }
            }
        }
        else {
            for (var j = 0; j < spline.points.length; j++) {
                var p = spline.points[j];
                if (p.x < xMin) {
                    xMin = p.x;
                }
                if (p.y < yMin) {
                    yMin = p.y;
                }
                if (p.x > xMax) {
                    xMax = p.x;
                }
                if (p.y > yMax) {
                    yMax = p.y;
                }
            }
        }
    }
    xMin = Math.max(0, Math.floor(xMin - 1));
    xMax = Math.min(raster.width - 1, Math.floor(xMax + 2));
    yMin = Math.max(0, Math.floor(yMin - 1));
    yMax = Math.min(raster.height - 1, Math.floor(yMax + 2));
    return {
        xMin: xMin,
        xMax: xMax,
        yMin: yMin,
        yMax: yMax,
        xRange: xMax - xMin,
        yRange: yMax - yMin
    };
}
function DebugPixels(ctx) {
    function PadLeft(k, n) {
        var str = k.toString();
        var padding = '';
        for (var i = 0; i < n - str.length; i++) {
            padding += '0';
        }
        return padding + str;
    }
    var ls = [];
    for (var i = 0; i < ctx.height; i++) {
        var l = [];
        for (var j = 0; j < ctx.width; j++) {
            var index = ctx.bitmap.offset + ((ctx.height - i - 1) * ctx.bitmap.bytesPerRaster) + j * ctx.bytesPerPixel;
            var str = PadLeft(ctx.bitmap.pixels[index + 2], 3) + '/' + PadLeft(ctx.bitmap.pixels[index + 1], 3) + '/' + PadLeft(ctx.bitmap.pixels[index + 0], 3);
            l.push(str);
        }
        ls.push(l.join(' '));
    }
    return ls.join('\n');
}
function DebugSamples(ctx) {
    var ls = [];
    for (var y = 0; y < ctx.height; y++) {
        for (var i = 0; i < ctx.n; i++) {
            var l = [];
            for (var x = 0; x < ctx.width; x++) {
                var index = y * ctx.width + x;
                for (var j = 0; j < ctx.n; j++) {
                    var maskIndex = i * ctx.n + j;
                    var str = ((ctx.samples[index] & ctx.mask[maskIndex]) > 0) ? 'x' : '0';
                    l.push(str);
                }
                l.push(' ');
            }
            ls.push(l.join(' '));
        }
        ls.push('');
    }
    return ls.join('\n');
}
function DebugSplines(splines) {
    var table = document.createElement('table');
    var tr = null;
    for (var i = 0; i < splines.length; i++) {
        var spline = splines[i];
        if (i % 10 == 0) {
            tr = document.createElement('tr');
            table.appendChild(tr);
        }
        var td = document.createElement('td');
        tr.appendChild(td);
        var ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.style.border = '1px solid gray';
        ctx.canvas.width = 100;
        ctx.canvas.height = 100;
        td.appendChild(ctx.canvas);
        if (spline.type == 0 /* Line */) {
            ctx.beginPath();
            ctx.moveTo(spline.points[0].x, spline.points[0].y);
            ctx.lineTo(spline.points[1].x, spline.points[1].y);
            ctx.stroke();
        }
        else if (spline.type == 1 /* Quadratic */) {
            ctx.beginPath();
            ctx.moveTo(spline.points[0].x, spline.points[0].y);
            ctx.quadraticCurveTo(spline.points[1].x, spline.points[1].y, spline.points[2].x, spline.points[2].y);
            ctx.stroke();
        }
        else if (spline.type == 2 /* Cubic */) {
            ctx.beginPath();
            ctx.moveTo(spline.points[0].x, spline.points[0].y);
            ctx.bezierCurveTo(spline.points[1].x, spline.points[1].y, spline.points[2].x, spline.points[2].y, spline.points[3].x, spline.points[3].y);
            ctx.stroke();
        }
        else if (spline.type == 3 /* Arc */) {
            ctx.beginPath();
            ctx.arc(spline.center.x, spline.center.y, spline.radius, spline.startAngle, spline.endAngle, false);
            ctx.stroke();
        }
        else {
            throw new Error();
        }
    }
    document.body.appendChild(table);
}
exports.Raster = Raster;
