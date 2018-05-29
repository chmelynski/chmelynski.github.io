"use strict";
var General = (function () {
    function General(width, height) {
        //canvas: HTMLCanvasElement; // the <canvas> element - this is for the passthrough usage e.g. ctx.canvas.width
        this.canvas = { width: 0, height: 0 };
        this.pixelsPerCubit = 1;
        this.cubitsPerPixel = 1;
        this.pointsPerCubit = 1;
        this.cubitsPerPoint = 1;
        this.fontFamily = 'serif';
        this.bold = false;
        this.italic = false;
        this.fontSize = 10; // this is what we display in font UI
        this.fontSizePt = 10;
        this.fontSizeUnits = 'pt';
        this.currentPoint = { x: 0, y: 0 }; // this is only needed for arcTo, because we need to synthesize it for PDF and have no access to the current point
        this._textAlign = 'left'; // start (default), end, left, right, center - we should change this from left to start.  does opentype.js support RTL?
        this._textBaseline = 'alphabetic'; // alphabetic (default), top, hanging, middle, ideographic, bottom
        this._lineWidth = 1;
        this._fillStyle = 'rgb(0,0,0)'; // make these objects and parse in the setter?
        this._strokeStyle = 'rgb(0,0,0)'; // make these objects and parse in the setter?
        this._lineDashArray = []; // setLineDash([onPixels, offPixels, onPixels, offPixels, ...])
        this._lineDashOffset = 0;
        this._lineJoin = 'miter'; // miter (default), bevel, round
        this._lineCap = 'butt'; // butt (default), round, square
        this._miterLimit = 10; // is this part of the spec or just a chrome thing?  what is the default miter limit for PDF?
        this._globalAlpha = 1.0; // float in [0,1] - 0 = transparent, 1 = opaque
        this._globalCompositeOperation = 'source-over'; // source-over (default), source-in, source-out, source-atop, destination-over, destination-in, destination-out, destination-atop, lighter, copy, xor (darker was removed from the spec)
        this._shadowColor = 'rgba(0, 0, 0, 0)';
        this._shadowBlur = 0; // float, not sure exactly how to implement
        this._shadowOffsetX = 0;
        this._shadowOffsetY = 0;
        this.msFillRule = 'evenodd'; // evenodd or nonzero, presumably
        this.msImageSmoothingEnabled = false; // not sure if false is the default
        this.mozImageSmoothingEnabled = false; // not sure if false is the default
        this.webkitImageSmoothingEnabled = false; // not sure if false is the default
        this.oImageSmoothingEnabled = false; // not sure if false is the default
        this.fillColor = { r: 0, g: 0, b: 0, a: 255 };
        this.strokeColor = { r: 0, g: 0, b: 0, a: 255 };
        this.canvas.width = width;
        this.canvas.height = height;
        //this.fontSizePx = this.fontSizePt * this.cubitsPerPoint * this.pixelsPerCubit;
        //this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
        //this.fontObject = Canvas.fontDict[this.fontFamily]; // type TrueTypeFont or OpenTypeFont
    }
    Object.defineProperty(General.prototype, "textAlign", {
        // all these getters and setters were here to split the set command to pdf/ctx.  what now?  i think we can delete them
        get: function () { return this._textAlign; },
        set: function (value) { this._textAlign = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "textBaseline", {
        get: function () { return this._textBaseline; },
        set: function (value) { this._textBaseline = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "lineWidth", {
        get: function () { return this._lineWidth; },
        set: function (value) { this._lineWidth = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "fillStyle", {
        get: function () { return this._fillStyle; },
        set: function (value) { this._fillStyle = value; this.fillColor = this.ParseColor(value); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "strokeStyle", {
        get: function () { return this._strokeStyle; },
        set: function (value) { this._strokeStyle = value; this.strokeColor = this.ParseColor(value); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "lineDashOffset", {
        get: function () { return this._lineDashOffset; },
        set: function (value) { this._lineDashOffset = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "lineJoin", {
        get: function () { return this._lineJoin; },
        set: function (value) { this._lineJoin = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "lineCap", {
        get: function () { return this._lineCap; },
        set: function (value) { this._lineCap = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "miterLimit", {
        get: function () { return this._miterLimit; },
        set: function (value) { this._miterLimit = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "globalAlpha", {
        get: function () { return this._globalAlpha; },
        set: function (value) { this._globalAlpha = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "globalCompositeOperation", {
        get: function () { return this._globalCompositeOperation; },
        set: function (value) { this._globalCompositeOperation = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "shadowColor", {
        get: function () { return this._shadowColor; },
        set: function (value) { this._shadowColor = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "shadowBlur", {
        get: function () { return this._shadowBlur; },
        set: function (value) { this._shadowBlur = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "shadowOffsetX", {
        get: function () { return this._shadowOffsetX; },
        set: function (value) { this._shadowOffsetX = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "shadowOffsetY", {
        get: function () { return this._shadowOffsetY; },
        set: function (value) { this._shadowOffsetY = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(General.prototype, "font", {
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
    General.prototype.getLineDash = function () {
        return this._lineDashArray;
    };
    General.prototype.setLineDash = function (value) {
        this._lineDashArray = value;
    };
    General.prototype.setFontSize = function (fontSize) {
        // this should be a setter, but requires deletion of this.fontSize or creation of a shadow variable
        this.fontSize = fontSize;
        this.fontSizePt = fontSize;
        this.fontSizePx = this.fontSizePt * this.cubitsPerPoint * this.pixelsPerCubit;
        this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
    };
    General.prototype.setFont = function (fontFamily, bold, italic) {
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
    General.prototype.setFontObject = function (filename) {
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
    };
    General.prototype.alignText = function (text) {
        var leftToRight = true; // pull this from the font somehow?
        var computedTextAlign = null;
        var dxCu = 0;
        var dyCu = 0;
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
            var textMetricsCu = this.measureText(text);
            if (computedTextAlign == 'center') {
                dxCu = -textMetricsCu.width / 2;
            }
            else if (computedTextAlign == 'right') {
                dxCu = -textMetricsCu.width;
            }
            else {
                throw new Error();
            }
        }
        if (this.textBaseline == 'alphabetic') {
        }
        else if (this.textBaseline == 'top') {
            dyCu = this.fontObject.ascender / this.fontObject.unitsPerEm * this.fontSizeCu;
        }
        else if (this.textBaseline == 'middle') {
            dyCu = -this.fontObject.descender / this.fontObject.unitsPerEm * this.fontSizeCu; // descender is negative, i guess
        }
        else if (this.textBaseline == 'bottom') {
            dyCu = this.fontObject.descender / this.fontObject.unitsPerEm * this.fontSizeCu; // descender is negative, i guess
        }
        else if (this.textBaseline == 'ideographic') {
        }
        else if (this.textBaseline == 'hanging') {
        }
        else {
            throw new Error();
        }
        return { dxCu: dxCu, dyCu: dyCu };
    };
    General.prototype.measureText = function (text) {
        var widthCu = null;
        if (text == ' ') {
            widthCu = this.fontSizeCu; // scale by some amount?
        }
        else {
            var path = this.fontObject.getPath(text, 0, 0, this.fontSizeCu, { kerning: true });
            var bbox = path.getBoundingBox();
            widthCu = bbox.x2 - bbox.x1; // since the font is in unscaled units, this is in cubits because we pass in font size as cubits above
        }
        return { width: widthCu };
    };
    General.prototype.beginPath = function () { };
    General.prototype.closePath = function () { };
    General.prototype.moveTo = function (x, y) { };
    General.prototype.lineTo = function (x, y) { };
    General.prototype.quadraticCurveTo = function (x1, y1, x, y) { };
    General.prototype.bezierCurveTo = function (x1, y1, x2, y2, x, y) { };
    General.prototype.fill = function () { };
    General.prototype.stroke = function () { };
    General.prototype.clip = function () { };
    General.prototype.fillRect = function (left, top, width, height) { this.drawRect(left, top, width, height, true, false); };
    General.prototype.strokeRect = function (left, top, width, height) { this.drawRect(left, top, width, height, false, true); };
    General.prototype.fillCircle = function (cx, cy, r) { this.drawCircle(cx, cy, r, true, false); };
    General.prototype.strokeCircle = function (cx, cy, r) { this.drawCircle(cx, cy, r, false, true); };
    General.prototype.fillPath = function (path) { this.drawPath(path, true, false); };
    General.prototype.strokePath = function (path) { this.drawPath(path, false, true); };
    General.prototype.drawRect = function (left, top, width, height, doFill, doStroke) { };
    General.prototype.drawCircle = function (cx, cy, r, doFill, doStroke) { };
    General.prototype.drawPath = function (path, doFill, doStroke) {
        var args = [];
        var s = '';
        // first split up the argstring.  this is not as simple on splitting on whitespace, because it is legal to smush letters and numbers together
        for (var i = 0; i < path.length; i++) {
            var c = path[i];
            var n = c.charCodeAt(0);
            if ((65 <= n && n <= 90) || (97 <= n && n <= 122)) {
                if (s.length > 0) {
                    args.push(parseFloat(s));
                    s = '';
                }
                args.push(c); // this relies on letters coming as single letters only
            }
            else if (n == 32 || n == 13 || n == 10 || n == 9 || n == 44) {
                if (s.length > 0) {
                    args.push(parseFloat(s));
                    s = '';
                }
            }
            else {
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
        for (var i = 0; i < args.length; i++) {
            var arg = args[i]; // arg must be a single letter at this point
            var n = arg.charCodeAt(0);
            lastCommand = arg;
            // if the command is upper case, that means we use absolute coordinates.  so we zero out the current position
            // (this means that when computing coordinates to go to, we always add x and y
            if (65 <= n && n <= 90) {
                if (arg == 'H') {
                    x = 0;
                }
                else if (arg == 'V') {
                    y = 0;
                }
                else {
                    x = 0;
                    y = 0;
                }
            }
            if (arg == 'M' || arg == 'm') {
                x += args[++i];
                y += args[++i];
                // this is where we return to on a Z command (is this correct?)
                origx = x;
                origy = y;
                //this.beginPath();
                this.moveTo(x, y);
            }
            else if (arg == 'Z' || arg == 'z') {
                this.closePath();
            }
            else if (arg == 'L' || arg == 'l') {
                x += args[++i];
                y += args[++i];
                this.lineTo(x, y);
            }
            else if (arg == 'H' || arg == 'h') {
                x += args[++i];
                this.lineTo(x, y);
            }
            else if (arg == 'V' || arg == 'v') {
                y += args[++i];
                this.lineTo(x, y);
            }
            else if (arg == 'C' || arg == 'c') {
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
            else if (arg == 'S' || arg == 's') {
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
            else if (arg == 'Q' || arg == 'q') {
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
            else if (arg == 'T' || arg == 't') {
                // see https://developer.mozilla.org/en/SVG/Tutorial/Paths
                // As before, the shortcut looks at the previous control point you used, and infers a new one from it.
                // This means that after your first control point, you can make fairly complex shapes by specifying only end points.
                // Note that this only works if the previous command was a Q or a T command.
                // If it is not, then the control point is assumed to be the same as the previous point, and you'll only draw lines.
                if (lastControlPointX == null) {
                    lastControlPointX = lastEndPointX;
                }
                if (lastControlPointY == null) {
                    lastControlPointY = lastEndPointY;
                }
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
            else if (arg == 'A' || arg == 'a') {
                var rx = x + args[++i];
                var ry = y + args[++i];
                var xAxisRotation = args[++i];
                var largeArcFlag = args[++i]; // 0 or 1
                var sweepFlag = args[++i]; // 0 or 1
                x += args[++i];
                y += args[++i];
                throw new Error();
            }
            else {
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
        if (doFill) {
            this.fill();
        }
        if (doStroke) {
            this.stroke();
        }
    };
    General.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
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
    General.prototype.drawImageImpl = function (image, dx, dy, dw, dh, sx, sy, sw, sh) { };
    General.prototype.arc = function (cx, cy, r, startAngle, endAngle, bAntiClockwise) { };
    General.prototype.rect = function (left, top, width, height) {
        var savedCurrentPoint = { x: this.currentPoint.x, y: this.currentPoint.y };
        this.moveTo(left, top);
        this.lineTo(left + width, top);
        this.lineTo(left + width, top + height);
        this.lineTo(left, top + height);
        this.lineTo(left, top);
        this.currentPoint.x = savedCurrentPoint.x;
        this.currentPoint.y = savedCurrentPoint.y;
    };
    General.prototype.arcTo = function (x1, y1, x2, y2, r) {
        // this is basically API sugar for easy creation of round rects
        // from the current point, draw an imaginary line to (x1,y1) and then to (x2,y2)
        // then draw the arc of radius r that fits inside the corner formed
        // only the arc is drawn
        var x0 = this.currentPoint.x;
        var y0 = this.currentPoint.y;
        var v10 = { x: x1 - x0, y: y1 - y0 };
        var v12 = { x: x1 - x2, y: y1 - y2 };
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
    };
    General.prototype.rotate = function (angle) {
        // to rotate counterclockwise about the origin
        // (  cos a   -sin a   0  ) ( x )   ( x0 )   ( x cos a - y sin a )
        // (  sin a    cos a   0  ) ( y ) = ( y0 ) = ( y cos a + x sin a )
        // (    0       0      1  ) ( 1 )   (  1 )   (         1         )
        // it kills me to accept the canvas convention of clockwise rotation, but we want to maintain code compatibility with canvas
        this.rotateClockwise(angle);
    };
    General.prototype.rotateClockwise = function (angle) { };
    // extensions
    General.prototype.drawBezier = function (x0, y0, x1, y1, x2, y2, x3, y3) {
        this.beginPath();
        this.moveTo(x0, y0);
        this.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        this.stroke();
    };
    General.prototype.drawLine = function (x1, y1, x2, y2) {
        this.beginPath();
        this.moveTo(x1, y1);
        this.lineTo(x2, y2);
        this.stroke();
    };
    General.prototype.ParseColor = function (str) {
        // 'this' is undefined in this context - need a reference if we're to use the savedCanvasContext
        //if (typeof window != 'undefined')
        //{
        //	this.savedCanvasContext.fillStyle = str; // this will convert from 'red' to 'rgb(255,0,0)'
        //	str = this.savedCanvasContext.fillStyle;
        //}
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
        if (str.substr(0, 4) == 'rgb(') {
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
    General.prototype.ParseRgbColor = function (str) {
        // str = 'rgb(0,0,0)' or 'rgba(0,0,0,0)'
        var parens = str.substring(str.indexOf('('));
        var rgb = parens.substring(1, parens.length - 1);
        var rgblist = rgb.split(',');
        var color = {};
        color.r = parseInt(rgblist[0]);
        color.g = parseInt(rgblist[1]);
        color.b = parseInt(rgblist[2]);
        return color;
    };
    General.prototype.ParseHexColor = function (hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };
    General.prototype.ConvertColorToPdf = function (str) {
        var color = this.ParseColor(str);
        var pdfstr = (color.r / 255).toString() + ' ' + (color.g / 255).toString() + ' ' + (color.b / 255).toString();
        return pdfstr;
    };
    // this class contains state and functions that call the path functions
    General.fontNameToFontObject = {};
    return General;
}());
exports.General = General;
