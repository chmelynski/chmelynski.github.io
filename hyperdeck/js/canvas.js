var Canvas = (function () {
    function Canvas(ctx) {
        this.fontFamily = 'serif';
        this.bold = false;
        this.italic = false;
        this.fontSize = 10; // this is what we display in font UI
        this.fontSizeUnits = 'pt';
        this.fontSizePt = 10;
        this.ctx = ctx;
    }
    Object.defineProperty(Canvas.prototype, "fillStyle", {
        get: function () { return this.ctx.fillStyle; },
        set: function (value) { this.ctx.fillStyle = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "strokeStyle", {
        get: function () { return this.ctx.strokeStyle; },
        set: function (value) { this.ctx.strokeStyle = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "textAlign", {
        get: function () { return this.ctx.textAlign; },
        set: function (value) { this.ctx.textAlign = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "textBaseline", {
        get: function () { return this.ctx.textBaseline; },
        set: function (value) { this.ctx.textBaseline = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "lineWidth", {
        get: function () { return this.ctx.lineWidth; },
        set: function (value) { this.ctx.lineWidth = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "lineDashOffset", {
        get: function () { return this.ctx.lineDashOffset; },
        set: function (value) { this.ctx.lineDashOffset = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "lineJoin", {
        get: function () { return this.ctx.lineJoin; },
        set: function (value) { this.ctx.lineJoin = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "lineCap", {
        get: function () { return this.ctx.lineCap; },
        set: function (value) { this.ctx.lineCap = value; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "miterLimit", {
        get: function () { return this.ctx.miterLimit; },
        set: function (value) { this.ctx.miterLimit = value; },
        enumerable: true,
        configurable: true
    });
    Canvas.prototype.getLineDash = function () { return this.ctx.getLineDash(); };
    Canvas.prototype.setLineDash = function (value) { this.ctx.setLineDash(value); };
    Object.defineProperty(Canvas.prototype, "font", {
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
            //if (this.fontSizeUnits == 'pt')
            //{
            //	this.fontSizePt = this.fontSize;
            //	this.fontSizeCu = this.fontSizePt * this.cubitsPerPoint;
            //	this.fontSizePx = this.fontSizeCu * this.pixelsPerCubit;
            //}
            //else if (this.fontSizeUnits == 'px')
            //{
            //	this.fontSizePx = this.fontSize;
            //	this.fontSizeCu = this.fontSizePx * this.cubitsPerPixel;
            //	this.fontSizePt = this.fontSizeCu * this.pointsPerCubit;
            //}
            //else if (this.fontSizeUnits == 'cu')
            //{
            //	this.fontSizeCu = this.fontSize;
            //	this.fontSizePx = this.fontSizeCu * this.pixelsPerCubit;
            //	this.fontSizePt = this.fontSizeCu * this.pointsPerCubit;
            //}
            //else
            //{
            //	// other possible units are em, ex, and %
            //	// standard values:
            //	// 1em = 12pt
            //	// 1ex = ??
            //	// 100% = 12pt
            //	
            //	throw new Error('Unsupported font size type: "' + this.fontSizeUnits + '"');
            //}
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
        },
        enumerable: true,
        configurable: true
    });
    Canvas.prototype.setFont = function (fontFamily, bold, italic) {
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
    Canvas.prototype.setFontObject = function (filename) { };
    // the fillText toggle function must sync with measureText in order for typesetting and other stuff to work properly
    Canvas.prototype.fillText = function (text, x, y) { this.fillTextTrueOrOpenType(text, x, y); };
    Canvas.prototype.fillTextTrueOrOpenType = function (text, x, y) {
        if (this.fontObject.constructor.name == 'Font') {
            this.fillTextOpenType(text, x, y);
        }
        else if (this.fontObject.constructor.name == 'TrueTypeFont') {
            this.fillTextTrueType(text, x, y);
        }
        else {
            throw new Error();
        }
    };
    Canvas.prototype.fillTextTrueType = function (text, x, y) {
        this.beginPath();
        var fontScale = this.fontSizePt / 72; // magic number - not correct - right now this is being used as font scale -> pixel scale conversion via multiplication
        var characterWidth = 10; // i just put this in, it should be defined somewhere else - is it?
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var fn = function (point) {
                return {
                    x: x + point.x * fontScale,
                    y: y - point.y * fontScale,
                    onCurve: point.onCurve
                };
            };
            if (code == 32) {
                x += characterWidth;
            }
            else {
                var width = this.DrawGlyph(this.fontObject, text.charCodeAt(i) - 29, fn);
                //var width = this.fontObject.drawGlyph(text.charCodeAt(i) - 29, this, fn);
                x += width * fontScale; // this is where we put a kerning number
            }
            //x += characterWidth;
            this.fill();
        }
    };
    Canvas.prototype.fillTextOpenType = function (text, x, y) {
        // x and y are in cubits at this point
        var dxCudyCu = this.alignText(text); // what units are dx and dy in?
        var dxCu = dxCudyCu.dx;
        var dyCu = dxCudyCu.dy;
        var xCu = x + dxCu;
        var yCu = y + dyCu;
        this.fontObject.draw(this, text, xCu, yCu, this.fontSizeCu, {});
    };
    Canvas.prototype.fillTextNative = function (text, x, y) {
        //this.ctx.textAlign = this.textAlign;
        //this.ctx.textBaseline = this.textBaseline;
        //this.ctx.fillStyle = this.fillStyle;
        //
        //// alternate approach, where we scale the font using a transform rather than canvas's hard to predict font parser
        //this.ctx.font = '12pt ' + this.fontFamily;
        //this.ctx.save();
        //this.ctx.translate(x, y);
        //this.ctx.scale(this.fontSize / 12, this.fontSize / 12);
        //this.ctx.fillText(text, 0, 0);
        //this.ctx.restore();
        //this.ctx.font = this.fontSize.toString() + this.fontSizeUnits + ' ' + this.fontFamily;
        //this.ctx.fillText(text, x, y);
    };
    Canvas.prototype.alignText = function (text) {
        var ctx = this;
        var _a = this.measureText(text), width = _a.width, height = _a.height;
        var dx = 0;
        var dy = 0;
        if (ctx.textAlign == 'left' || ctx.textAlign == 'start') {
        }
        else if (ctx.textAlign == 'center') {
            dx = -width / 2;
        }
        else if (ctx.textAlign == 'right' || ctx.textAlign == 'end') {
            dx = -width;
        }
        else {
            throw new Error();
        }
        //var textHeightUnits = ctx.fontSize / ctx.unitsToPt;
        if (ctx.textBaseline == 'middle') {
            dy = height / 2;
        }
        else if (ctx.textBaseline == 'top') {
            dy = height;
        }
        else if (ctx.textBaseline == 'bottom') {
        }
        else if (ctx.textBaseline == 'alphabetic') {
        }
        else if (ctx.textBaseline == 'ideographic') {
        }
        else {
            throw new Error();
        }
        return { dx: dx, dy: dy };
    };
    Canvas.prototype.measureText = function (str) { return this.measureTextOpenType(str); };
    Canvas.prototype.measureTextNative = function (str) {
        return { width: this.ctx.measureText(str).width, height: 0 };
    };
    Canvas.prototype.measureTextTrueType = function (str) {
        var sum = 0;
        for (var i = 0; i < str.length; i++) {
            var code = str.charCodeAt(i) - 29;
            var wd = this.fontObject.getGlyphWidth(code);
            sum += wd;
        }
        var width = sum * this.fontSizePt / 72; // magic number - not correct - right now this is being used as font scale -> pixel scale conversion via multiplication
        return { width: width, height: 0 };
    };
    Canvas.prototype.measureTextOpenType = function (str) {
        // coordinates in the font object are converted to path coordinate by multiplying by: 1 / font.unitsPerEm * fontSize
        // basically fontSize specifies the em size
        // so if we specify a fontSize of 1, what we're doing is asking for coordinates in ems
        // we then multiply that by the fontSize in pixels, points, or cubits to get the size in units we need
        var x = 0;
        var y = 0;
        var fontSize = 1;
        var path = this.fontObject.getPath(str, x, y, fontSize);
        // now there's a Path.getBoundingBox() function so we can probably use that instead of doing it ourselves
        var xMin = +Infinity;
        var xMax = -Infinity;
        var yMin = +Infinity;
        var yMax = -Infinity;
        for (var i = 0; i < path.commands.length; i++) {
            var command = path.commands[i];
            if (command.x) {
                xMin = Math.min(xMin, command.x);
                yMin = Math.min(yMin, command.y);
                xMax = Math.max(xMax, command.x);
                yMax = Math.max(yMax, command.y);
            }
            if (command.x1) {
                xMin = Math.min(xMin, command.x1);
                yMin = Math.min(yMin, command.y1);
                xMax = Math.max(xMax, command.x1);
                yMax = Math.max(yMax, command.y1);
            }
            if (command.x2) {
                xMin = Math.min(xMin, command.x2);
                yMin = Math.min(yMin, command.y2);
                xMax = Math.max(xMax, command.x2);
                yMax = Math.max(yMax, command.y2);
            }
        }
        var wdEm = xMax - xMin;
        var hgEm = yMax - yMin;
        var wdCu = wdEm * this.fontSizeCu;
        var hgCu = hgEm * this.fontSizeCu;
        //var wdPx = wdEm * this.fontSizePx;
        //var hgPx = hgEm * this.fontSizePx;
        //var wdPt = wdEm * this.fontSizePt;
        //var hgPt = hgEm * this.fontSizePt;
        return { width: wdCu, height: hgCu };
    };
    Canvas.prototype.strokeText = function (text, x, y) { this.strokeTextOpenType(text, x, y); };
    Canvas.prototype.strokeTextOpenType = function (text, x, y) {
        var dxCudyCu = this.alignText(text);
        var dxCu = dxCudyCu.dx;
        var dyCu = dxCudyCu.dy;
        // in order to stroke text, we get the Path from the Font, change some fields on the Path, and then call Path.draw(ctx)
        // this might also have to be used for fillTextOpenType if we want to draw in a color other than black
        // note that we pass the fontObject coordinates in cubits, because the fontObject will call ctx, which is already appropriately scaled
        var path = this.fontObject.getPath(this, text, x + dxCu, y + dyCu, this.fontSizeCu, {});
        path.fill = null;
        path.stroke = this.strokeStyle;
        path.strokeWidth = this.lineWidth;
        path.draw(this);
    };
    Canvas.prototype.fillTextDebug = function (text, x, y) {
        console.log('fill' + '\t"' + text + '"\t' + x + '\t' + y);
    };
    Canvas.prototype.measureTextDebug = function (str) {
        //console.log('measure' + '\t"' + str + '"\t' + DebugStyle(this));
        return { width: str.length * 6, height: 12 };
    };
    Canvas.prototype.DrawDots = function (path, dx, dy, multiplier) {
        // annotate a path with dots at the end points and control points
        var oldstyle = this.fillStyle;
        this.fillStyle = 'rgb(255,0,0)';
        this.font = '10px Courier New';
        for (var i = 0; i < path.length; i++) {
            for (var k = 1; k < path[i].length; k += 2) {
                var x = path[i][k + 0];
                var y = path[i][k + 1];
                var tx = (x - dx) / multiplier;
                var ty = (dy - y) / multiplier;
                //this.DrawCircle(x, y, 2, true, false);
                if (x < 400) {
                    this.textAlign = "right";
                }
                else {
                    this.textAlign = "left";
                }
            }
        }
        this.fillStyle = oldstyle;
    };
    Canvas.prototype.DrawGlyph = function (font, index, fn) {
        // return type is boolean | number
        this.beginPath();
        //var glyph = font.readGlyph(index);
        var glyph = font.getGlyph(index);
        if (glyph === null || glyph.type !== "simple") {
            return false;
        }
        var i = 0;
        var contour = 0;
        var firstPointOfContour = true;
        var endIndex = 0;
        var firstContourPoint = { x: 0, y: 0 };
        while (i < glyph.points.length) {
            var point = fn(glyph.points[i++]);
            if (firstPointOfContour) {
                this.moveTo(point.x, point.y);
                firstPointOfContour = false;
                firstContourPoint = { x: point.x, y: point.y };
            }
            else {
                if (!point.onCurve) {
                    if (i > glyph.contourEnds[contour]) {
                        this.quadraticCurveTo(point.x, point.y, firstContourPoint.x, firstContourPoint.y);
                        endIndex = i - 1;
                    }
                    else {
                        var point2 = fn(glyph.points[i++]);
                        if (!point2.onCurve) {
                            if (i > glyph.contourEnds[contour]) {
                                this.bezierCurveTo(point.x, point.y, point2.x, point2.y, firstContourPoint.x, firstContourPoint.y);
                                endIndex = i - 1;
                            }
                            else {
                                var point3 = fn(glyph.points[i]);
                                if (!point3.onCurve) {
                                    var endx = (point2.x + point3.x) / 2;
                                    var endy = (point2.y + point3.y) / 2;
                                    this.bezierCurveTo(point.x, point.y, point2.x, point2.y, endx, endy);
                                }
                                else {
                                    i++;
                                    endIndex = i - 1;
                                    this.bezierCurveTo(point.x, point.y, point2.x, point2.y, point3.x, point3.y);
                                }
                            }
                        }
                        else {
                            endIndex = i - 1;
                            this.quadraticCurveTo(point.x, point.y, point2.x, point2.y);
                        }
                    }
                }
                else {
                    endIndex = i - 1;
                    this.lineTo(point.x, point.y);
                }
            }
            if (endIndex === glyph.contourEnds[contour]) {
                contour++;
                firstPointOfContour = true;
            }
        }
        this.fill();
        //i = 0;
        //while (i < glyph.points.length)
        //{
        //	var p = fn(glyph.points[i]);
        //	
        //	this.beginPath();
        //	this.arc(p.x, p.y, 2, 0, Math.PI * 2, true);
        //	this.fillStyle = 'rgb(255,0,0)';
        //	this.fill();
        //	this.font = '6pt Arial';
        //	this.fillStyle = 'black';
        //	this.fillText(i.toString(), p.x + 4, p.y)
        //	i++;
        //}
        var width = font.getGlyphWidth(index);
        return width;
    };
    Canvas.prototype.beginPath = function () {
        this.ctx.beginPath();
    };
    Canvas.prototype.closePath = function () {
        this.ctx.closePath();
    };
    Canvas.prototype.moveTo = function (x, y) {
        this.ctx.moveTo(x, y);
    };
    Canvas.prototype.lineTo = function (x, y) {
        this.ctx.lineTo(x, y);
    };
    Canvas.prototype.quadraticCurveTo = function (x1, y1, x, y) {
        this.ctx.quadraticCurveTo(x1, y1, x, y);
    };
    Canvas.prototype.bezierCurveTo = function (x1, y1, x2, y2, x, y) {
        this.ctx.bezierCurveTo(x1, y1, x2, y2, x, y);
    };
    Canvas.prototype.arcTo = function (x1, y1, x, y, r) {
        this.ctx.arcTo(x1, y1, x, y, r);
    };
    Canvas.prototype.arc = function (cx, cy, r, startAngle, endAngle, bAntiClockwise) {
        this.ctx.arc(cx, cy, r, startAngle, endAngle, bAntiClockwise);
    };
    Canvas.prototype.rect = function (left, top, width, height) {
        this.ctx.rect(left, top, width, height);
    };
    Canvas.prototype.fill = function () {
        this.ctx.fill();
    };
    Canvas.prototype.stroke = function () {
        this.ctx.stroke();
    };
    Canvas.prototype.clip = function () {
        this.ctx.clip();
    };
    Canvas.prototype.save = function () {
        this.ctx.save();
    };
    Canvas.prototype.restore = function () {
        this.ctx.restore();
    };
    Canvas.prototype.scale = function (x, y) {
        this.ctx.scale(x, y);
    };
    Canvas.prototype.rotate = function (angle) {
        // ctx - clockwise, radians
        this.ctx.rotate(angle);
    };
    Canvas.prototype.rotateCounterClockwise = function (angle) {
        // not part of the canvas spec
    };
    Canvas.prototype.rotateClockwise = function (angle) {
        // not part of the canvas spec
    };
    Canvas.prototype.translate = function (x, y) {
        this.ctx.translate(x, y);
    };
    Canvas.prototype.transform = function (sx, kx, ky, sy, dx, dy) {
        // note that the order of arguments for CanvasRenderingContext2D is different than the order for SVG and PDF
        // namely, Canvas does kx, ky and SVG/PDF do ky, kx
        // wait, are we sure about that?  maybe we should double check what the canvas transform expects
        // this is multiplied to the current transformation matrix
        // m11 m12 dx
        // m21 m22 dy
        //  0   0   1
        // m11 = sx = horizontal scale
        // m12 = kx = horizontal skew
        // m21 = ky = vertical skew
        // m22 = sy = vertical scale
        // dx = horizontal translation
        // dy = vertical translation
        // m11 m12 dx     x     x0
        // m21 m22 dy  *  y  =  y0
        //  0   0   1     1     1
        // so when a new matrix is multiplied to the existing matrix, it is post-multiplied to the current matrix
        // m0 * m1 * m2 * v = v0
        this.ctx.transform(sx, kx, ky, sy, dx, dy);
    };
    Canvas.prototype.setTransform = function (sx, kx, ky, sy, dx, dy) {
    };
    Canvas.prototype.resetTransform = function () {
        // not part of the canvas spec
    };
    Canvas.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
        this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    };
    Canvas.prototype.fillRect = function (left, top, width, height) {
        this.ctx.fillRect(left, top, width, height);
    };
    Canvas.prototype.strokeRect = function (left, top, width, height) {
        this.ctx.strokeRect(left, top, width, height);
    };
    Canvas.prototype.clearRect = function (left, top, width, height) {
        this.ctx.clearRect(left, top, width, height);
    };
    Canvas.prototype.drawRect = function (left, top, width, height, doFill, doStroke) {
    };
    Canvas.prototype.drawCircle = function (cx, cy, r, doFill, doStroke) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
        if (doFill) {
            this.ctx.fill();
        }
        if (doStroke) {
            this.ctx.stroke();
        }
    };
    Canvas.prototype.drawPath = function (path, doFill, doStroke) { };
    //isPointInPath(path: Path2D, x: number, y: number): boolean {
    //	
    //	// the path argument is optional - again, an annoying situation where optional arguments are put first
    //	return this.ctx.isPointInPath(path, x, y); // typescript says that ctx already has isPointInPath: boolean?
    //}
    //isPointInStroke(path: Path2D, x: number, y: number): boolean {
    //	
    //	// the path argument is optional
    //	return this.ctx.isPointInStroke(path, x, y);
    //}
    Canvas.prototype.getImageData = function (left, top, width, height) {
        return this.ctx.getImageData(left, top, width, height);
    };
    Canvas.prototype.putImageData = function (img, left, top) {
        this.ctx.putImageData(img, left, top);
    };
    Canvas.prototype.createImageData = function (width, height) {
        // if width is an ImageData object, pull the width/height from that object
        return this.ctx.createImageData(width, height);
    };
    Canvas.prototype.createLinearGradient = function (x1, y1, x2, y2) {
        return this.ctx.createLinearGradient(x1, y1, x2, y2);
    };
    Canvas.prototype.createRadialGradient = function (x1, y1, r1, x2, y2, r2) {
        return this.ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
    };
    Canvas.prototype.createPattern = function (source, repeat) {
        return this.ctx.createPattern(source, repeat);
    };
    return Canvas;
}());
// Alt + 2,1
