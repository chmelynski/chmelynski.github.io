var Hyperdeck;
(function (Hyperdeck) {
    var Diagram = (function () {
        function Diagram(ctx, afterChange) {
            //text: string = null;
            this.regex = /\{(\s*\S+\s*:\s*\d+\s*,?)+\s*\}/g; // object literals whose fields are all integers - { x: 0, y: 0 }
            this.selectionBox = null;
            this.pointRadius = 3;
            this.showPoints = true;
            var diagram = this;
            this.ctx = ctx;
            this.afterChange = afterChange;
            this.ctx.canvas.style.cursor = 'default';
            this.setHandlers();
        }
        Diagram.prototype.setHandlers = function () {
            var diagram = this;
            var r = diagram.pointRadius;
            var rr = r * r;
            var savedX = null;
            var savedY = null;
            diagram.ctx.canvas.onmousemove = function (e) { savedX = e.offsetX; savedY = e.offsetY; };
            diagram.ctx.canvas.onmousedown = function (e) {
                //var points = diagram.points.enumerate();
                //diagram.points.freeze(); // disables add
                var points = diagram.points;
                function AfterSelect() {
                    for (var i = 0; i < points.length; i++) {
                        points[i].selected = false;
                    }
                    for (var i = 0; i < diagram.selected.length; i++) {
                        diagram.selected[i].selected = true;
                    }
                }
                var ax = e.offsetX;
                var ay = e.offsetY;
                if (diagram.selectionBox !== null) {
                    // check for hit on selection box, if so, move in bulk
                    if (diagram.selectionBox.left < ax && diagram.selectionBox.top < ay && ax < (diagram.selectionBox.left + diagram.selectionBox.width) && ay < (diagram.selectionBox.top + diagram.selectionBox.height)) {
                        //var a = diagram.Inverse({ x: ax, y: ay });
                        diagram.ctx.canvas.onmousemove = function (e) {
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
                            for (var i = 0; i < diagram.selected.length; i++) {
                                var p = diagram.selected[i];
                                p.x += dx;
                                p.y += dy;
                            }
                            diagram.draw();
                            ax = mx;
                            ay = my;
                            //a.i = m.i;
                            //a.j = m.j;
                        };
                        diagram.ctx.canvas.onmouseup = function (e) {
                            diagram.changePointCoords();
                            diagram.sendText();
                            diagram.ctx.canvas.onmousemove = function (e) { savedX = e.offsetX; savedY = e.offsetY; };
                            diagram.ctx.canvas.onmouseup = null;
                        };
                        return;
                    }
                    else {
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
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    if (axMax < p.x || axMin > p.x || ayMax < p.y || ayMin > p.y) {
                        continue;
                    }
                    var dd = (p.x - ax) * (p.x - ax) + (p.y - ay) * (p.y - ay);
                    if (dd < rr) {
                        hit = p;
                        break;
                    }
                }
                // if we hit an individual point, drag it
                if (hit !== null) {
                    diagram.selected = [hit];
                    AfterSelect();
                    diagram.draw();
                    var correctionX = ax - p.x;
                    var correctionY = ay - p.y;
                    diagram.ctx.canvas.onmousemove = function (e) {
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
                        diagram.draw();
                    };
                    diagram.ctx.canvas.onmouseup = function (e) {
                        diagram.changePointCoords();
                        diagram.sendText();
                        diagram.ctx.canvas.onmousemove = function (e) { savedX = e.offsetX; savedY = e.offsetY; };
                        diagram.ctx.canvas.onmouseup = null;
                    };
                    return;
                }
                // if we didn't hit anything, draw a selection box
                diagram.selectionBox = { top: 0, left: 0, width: 0, height: 0 };
                diagram.selected = [];
                AfterSelect();
                diagram.draw();
                diagram.ctx.canvas.onmousemove = function (e) {
                    var mx = e.offsetX;
                    var my = e.offsetY;
                    var tp = diagram.selectionBox.top = Math.min(ay, my);
                    var lf = diagram.selectionBox.left = Math.min(ax, mx);
                    var wd = diagram.selectionBox.width = Math.max(ax, mx) - Math.min(ax, mx);
                    var hg = diagram.selectionBox.height = Math.max(ay, my) - Math.min(ay, my);
                    var rt = lf + wd;
                    var bt = tp + hg;
                    diagram.selected = [];
                    for (var i = 0; i < points.length; i++) {
                        var p = points[i];
                        if (lf < p.x && p.x < rt && tp < p.y && p.y < bt) {
                            diagram.selected.push(p);
                        }
                    }
                    AfterSelect();
                    diagram.draw();
                };
                diagram.ctx.canvas.onmouseup = function (e) {
                    // enforce a minimum size for a persistent selection box - this means we can click sloppily on blank space to discard box
                    if (diagram.selectionBox.width < 3 && diagram.selectionBox.height < 3) {
                        diagram.selectionBox = null;
                        diagram.selected = [];
                        AfterSelect();
                        diagram.draw();
                    }
                    //diagram.points.unfreeze();
                    diagram.ctx.canvas.onmousemove = function (e) { savedX = e.offsetX; savedY = e.offsetY; };
                    diagram.ctx.canvas.onmouseup = null;
                };
            };
        };
        Diagram.prototype.sendText = function () {
            // send text back to the codemirror
            this.changePointCoords();
            this.code = this.chunks.map(function (x) { return x[0]; }).join('');
            //this.compile(); // do we need this?
            this.afterChange(this.code);
        };
        Diagram.prototype.receiveText = function (code) {
            // receive text from the codemirror
            this.code = code;
            this.findPoints(); // sets this.points and this.chunks
            this.compile();
            this.selectionBox = null; // arguably better to null the box on canvas blur
            this.draw();
        };
        Diagram.prototype.compile = function () {
            for (var i = 0; i < this.points.length; i++) {
                this.points[i].chunk[0] = '_p[' + i.toString() + ']';
            }
            var code = this.chunks.map(function (x) { return x[0]; }).join('');
            this.fn = new Function('ctx, _p', code);
        };
        Diagram.prototype.changePointCoords = function () {
            this.points.forEach(function (p) {
                p.chunk[0] = '{ x: ' + p.x.toString() + ', y: ' + p.y.toString() + '}';
            });
        };
        Diagram.prototype.findPoints = function () {
            // we partition the text into chunks - points write to their chunk as the point moves
            this.chunks = [];
            this.points = [];
            var prev = 0;
            var match = this.regex.exec(this.code);
            while (match !== null) {
                this.chunks.push([this.code.substring(prev, match.index)]);
                prev = match.index + match[0].length;
                var chunk = [match[0]]; // we box the chunk so both chunks and the point can reference the box
                this.chunks.push(chunk);
                var p = {
                    x: null,
                    y: null,
                    chunk: chunk
                };
                var parts = match[0].replace('{', '').replace('}', '').split(',');
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];
                    var _a = part.split(':').map(function (x) { return x.trim(); }), key = _a[0], val = _a[1];
                    p[key] = parseInt(val);
                }
                this.points.push(p);
                match = this.regex.exec(this.code);
            }
            this.chunks.push([this.code.substr(prev)]);
        };
        Diagram.prototype.exportPath = function () {
            var _this = this;
            var ctx = new PathGen();
            var centeredPoints = this.points.map(function (p) { return ({ x: p.x - _this.ctx.canvas.width / 2, y: p.y - _this.ctx.canvas.height / 2 }); });
            try {
                this.fn(ctx, centeredPoints);
            }
            catch (e) {
                console.log(e);
            }
            return ctx.write();
        };
        Diagram.prototype.draw = function () {
            try {
                this.fn(this.ctx, this.points);
            }
            catch (e) { }
            if (this.showPoints) {
                this.drawPoints();
            }
            if (this.selectionBox) {
                this.drawSelectionBox();
            }
        };
        Diagram.prototype.drawPoints = function () {
            var _this = this;
            this.points.forEach(function (p) {
                _this.ctx.fillStyle = p.selected ? 'orange' : 'green';
                _this.ctx.beginPath();
                _this.ctx.arc(p.x, p.y, _this.pointRadius, 0, Math.PI * 2, false);
                _this.ctx.fill();
            });
        };
        Diagram.prototype.drawSelectionBox = function () {
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = 'rgb(128,128,128)';
            this.ctx.strokeRect(this.selectionBox.left + 0.5, this.selectionBox.top + 0.5, this.selectionBox.width, this.selectionBox.height);
        };
        return Diagram;
    }());
    Hyperdeck.Diagram = Diagram;
    var PathGen = (function () {
        function PathGen() {
            // This implements a subset of the canvas interface, but stores the commands to a path string like "M 0 0 L 10 0"
            this.precision = 0;
            this.fillStyle = null;
            this.strokeStyle = null;
            this.lineWidth = null;
            this.canvas = { width: 0, height: 0 };
            this.parts = [];
        }
        PathGen.prototype.fillRect = function () { };
        PathGen.prototype.stroke = function () { };
        PathGen.prototype.fill = function () { };
        PathGen.prototype.write = function () {
            return this.parts.join(' ');
        };
        PathGen.prototype.beginPath = function () {
        };
        PathGen.prototype.moveTo = function (x, y) {
            this.parts.push('M');
            this.parts.push(x.toFixed(this.precision));
            this.parts.push(y.toFixed(this.precision));
        };
        PathGen.prototype.lineTo = function (x, y) {
            this.parts.push('L');
            this.parts.push(x.toFixed(this.precision));
            this.parts.push(y.toFixed(this.precision));
        };
        PathGen.prototype.quadraticCurveTo = function (x1, y1, x2, y2) {
            this.parts.push('Q');
            this.parts.push(x1.toFixed(this.precision));
            this.parts.push(y1.toFixed(this.precision));
            this.parts.push(x2.toFixed(this.precision));
            this.parts.push(y2.toFixed(this.precision));
        };
        PathGen.prototype.bezierCurveTo = function (x1, y1, x2, y2, x3, y3) {
            this.parts.push('C');
            this.parts.push(x1.toFixed(this.precision));
            this.parts.push(y1.toFixed(this.precision));
            this.parts.push(x2.toFixed(this.precision));
            this.parts.push(y2.toFixed(this.precision));
            this.parts.push(x3.toFixed(this.precision));
            this.parts.push(y3.toFixed(this.precision));
        };
        PathGen.prototype.arc = function (cx, cy, r, startAngle, endAngle, bAntiClockwise) {
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
        };
        PathGen.prototype.closePath = function () {
            this.parts.push('Z');
        };
        return PathGen;
    }());
})(Hyperdeck || (Hyperdeck = {}));
// Alt+2 or 3,2
