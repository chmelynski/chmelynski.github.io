var Hyperdeck;
(function (Hyperdeck) {
    class Diagram {
        constructor(ctx, afterChange, options) {
            this.regex = /\{(\s*[A-Za-z_$][A-Za-z0-9_$]*\s*:\s*\d+\s*,?)+\s*\}/g; // object literals whose fields are all integers - { x: 0, y: 0 }
            this.selectionBox = null;
            this.pointRadius = 3;
            this.showPoints = true;
            this.ctx = ctx;
            this.ctx.canvas.style.cursor = 'default';
            this.afterChange = afterChange;
            this.setHandlers();
            if (options) {
                Object.assign(this, options);
            }
        }
        setHandlers() {
            const diagram = this;
            const r = diagram.pointRadius;
            const rr = r * r;
            let savedX = null;
            let savedY = null;
            diagram.ctx.canvas.onmousemove = function (e) { savedX = e.offsetX; savedY = e.offsetY; };
            diagram.ctx.canvas.onmousedown = function (e) {
                const points = diagram.points;
                function AfterSelect() {
                    for (const p of points) {
                        p.selected = false;
                    }
                    for (const p of diagram.selected) {
                        p.selected = true;
                    }
                }
                let ax = e.offsetX;
                let ay = e.offsetY;
                if (diagram.selectionBox !== null) {
                    // check for hit on selection box, if so, move in bulk
                    if (diagram.selectionBox.left < ax && diagram.selectionBox.top < ay && ax < (diagram.selectionBox.left + diagram.selectionBox.width) && ay < (diagram.selectionBox.top + diagram.selectionBox.height)) {
                        diagram.ctx.canvas.onmousemove = function (e) {
                            const mx = e.offsetX;
                            const my = e.offsetY;
                            const dx = mx - ax;
                            const dy = my - ay;
                            diagram.selectionBox.top += dy;
                            diagram.selectionBox.left += dx;
                            for (const p of diagram.selected) {
                                p.x += dx;
                                p.y += dy;
                            }
                            diagram.draw();
                            ax = mx;
                            ay = my;
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
                const axMin = ax - r;
                const axMax = ax + r;
                const ayMin = ay - r;
                const ayMax = ay + r;
                let hit = null;
                for (const p of points) {
                    if (axMax < p.x || axMin > p.x || ayMax < p.y || ayMin > p.y) {
                        continue;
                    }
                    const dd = (p.x - ax) * (p.x - ax) + (p.y - ay) * (p.y - ay);
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
                    const correctionX = ax - hit.x;
                    const correctionY = ay - hit.y;
                    diagram.ctx.canvas.onmousemove = function (e) {
                        const mx = e.offsetX;
                        const my = e.offsetY;
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
                    const mx = e.offsetX;
                    const my = e.offsetY;
                    const tp = diagram.selectionBox.top = Math.min(ay, my);
                    const lf = diagram.selectionBox.left = Math.min(ax, mx);
                    const wd = diagram.selectionBox.width = Math.max(ax, mx) - Math.min(ax, mx);
                    const hg = diagram.selectionBox.height = Math.max(ay, my) - Math.min(ay, my);
                    const rt = lf + wd;
                    const bt = tp + hg;
                    diagram.selected = [];
                    for (const p of points) {
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
                    diagram.ctx.canvas.onmousemove = function (e) { savedX = e.offsetX; savedY = e.offsetY; };
                    diagram.ctx.canvas.onmouseup = null;
                };
            };
        }
        sendText() {
            // send text back to the codemirror
            this.changePointCoords(); // write the new literal objects to the chunks
            this.code = this.chunks.map(x => x[0]).join('');
            this.afterChange(this.code);
        }
        receiveText(code) {
            // receive text from the codemirror
            this.code = code;
            this.findPoints(); // sets this.points and this.chunks
            this.compile(); // textually replace point literals with references to _p[i], the point objects, whose values will change with events
            this.selectionBox = null; // arguably better to null the box on canvas blur
            this.draw();
        }
        // override these functions to work with something other than javascript code
        findPoints() {
            // we partition the text into chunks - points write to their chunk as the point moves
            this.chunks = [];
            this.points = [];
            let prev = 0;
            let match = this.regex.exec(this.code);
            while (match !== null) {
                // we box the chunk so both this.chunks and point.chunk can reference the box
                this.chunks.push([this.code.substring(prev, match.index)]);
                prev = match.index + match[0].length;
                const objLiteral = match[0];
                const p = {
                    x: null,
                    y: null,
                    z: null,
                    xChunk: null,
                    yChunk: null,
                    zChunk: null,
                    selected: false
                };
                //const parts = objLiteral.replace('{', '').replace('}', '').split(',');
                //const [key, val] = part.split(':').map(x => x.trim());
                const keyvalRegex = /([A-Za-z_$][A-Za-z0-9_$]*)(\s*:\s*)(\d+)/g;
                let keyvalMatch = keyvalRegex.exec(objLiteral);
                let objPrev = 0;
                while (keyvalMatch !== null) {
                    this.chunks.push([objLiteral.substring(objPrev, keyvalMatch.index)]);
                    objPrev = keyvalMatch.index + keyvalMatch[0].length;
                    const key = keyvalMatch[1];
                    const mid = keyvalMatch[2];
                    const val = keyvalMatch[3];
                    this.chunks.push([key]);
                    this.chunks.push([mid]);
                    const chunk = [val];
                    this.chunks.push(chunk);
                    const value = parseInt(val);
                    if (key === 'x') {
                        p.x = value;
                        p.xChunk = chunk;
                    }
                    else if (key === 'y') {
                        p.y = value;
                        p.yChunk = chunk;
                    }
                    else if (key === 'z') {
                        p.z = value;
                        p.zChunk = chunk;
                    }
                    keyvalMatch = keyvalRegex.exec(objLiteral);
                }
                this.chunks.push([objLiteral.substr(objPrev)]);
                this.points.push(p);
                match = this.regex.exec(this.code);
            }
            this.chunks.push([this.code.substr(prev)]);
        }
        compile() {
            for (let i = 0; i < this.points.length; i++) {
                const p = this.points[i];
                if (p.xChunk) {
                    p.xChunk[0] = '_p[' + i.toString() + '].x';
                }
                if (p.yChunk) {
                    p.yChunk[0] = '_p[' + i.toString() + '].y';
                }
                if (p.zChunk) {
                    p.zChunk[0] = '_p[' + i.toString() + '].z';
                }
            }
            const code = this.chunks.map(x => x[0]).join('');
            const headers = [
                "ctx.fillStyle = 'white';",
                "ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);"
            ];
            this.fn = new Function('ctx, _p', headers.join('\n') + code);
        }
        changePointCoords() {
            for (const p of this.points) {
                if (p.xChunk) {
                    p.xChunk[0] = p.x.toString();
                }
                if (p.yChunk) {
                    p.yChunk[0] = p.y.toString();
                }
                if (p.zChunk) {
                    p.zChunk[0] = p.z.toString();
                }
            }
        }
        exportPath() {
            const ctx = new PathGen();
            const centeredPoints = this.points.map(p => ({ x: p.x - this.ctx.canvas.width / 2, y: p.y - this.ctx.canvas.height / 2 }));
            try {
                this.fn(ctx, centeredPoints);
            }
            catch (e) {
                console.log(e);
            }
            return ctx.write();
        }
        draw() {
            try {
                this.fn(this.ctx, this.points);
            }
            catch (e) {
                console.log(e);
            }
            if (this.showPoints) {
                this.drawPoints();
            }
            if (this.selectionBox) {
                this.drawSelectionBox();
            }
        }
        drawPoints() {
            this.ctx.save();
            for (const p of this.points) {
                this.ctx.fillStyle = p.selected ? 'orange' : 'green';
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, this.pointRadius, 0, Math.PI * 2, false);
                this.ctx.fill();
            }
            this.ctx.restore();
        }
        drawSelectionBox() {
            this.ctx.save();
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = 'rgb(128,128,128)';
            this.ctx.strokeRect(this.selectionBox.left + 0.5, this.selectionBox.top + 0.5, this.selectionBox.width, this.selectionBox.height);
            this.ctx.restore();
        }
    }
    Hyperdeck.Diagram = Diagram;
    class PathGen {
        constructor() {
            // This implements a subset of the canvas interface, but stores the commands to a path string like "M 0 0 L 10 0"
            this.precision = 0;
            this.fillStyle = null;
            this.strokeStyle = null;
            this.lineWidth = null;
            this.canvas = { width: 0, height: 0 };
            this.parts = [];
        }
        fillRect() { }
        stroke() { }
        fill() { }
        write() {
            return this.parts.join(' ');
        }
        beginPath() {
        }
        moveTo(x, y) {
            this.parts.push('M');
            this.parts.push(x.toFixed(this.precision));
            this.parts.push(y.toFixed(this.precision));
        }
        lineTo(x, y) {
            this.parts.push('L');
            this.parts.push(x.toFixed(this.precision));
            this.parts.push(y.toFixed(this.precision));
        }
        quadraticCurveTo(x1, y1, x2, y2) {
            this.parts.push('Q');
            this.parts.push(x1.toFixed(this.precision));
            this.parts.push(y1.toFixed(this.precision));
            this.parts.push(x2.toFixed(this.precision));
            this.parts.push(y2.toFixed(this.precision));
        }
        bezierCurveTo(x1, y1, x2, y2, x3, y3) {
            this.parts.push('C');
            this.parts.push(x1.toFixed(this.precision));
            this.parts.push(y1.toFixed(this.precision));
            this.parts.push(x2.toFixed(this.precision));
            this.parts.push(y2.toFixed(this.precision));
            this.parts.push(x3.toFixed(this.precision));
            this.parts.push(y3.toFixed(this.precision));
        }
        arc(cx, cy, r, startAngle, endAngle, bAntiClockwise) {
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
        closePath() {
            this.parts.push('Z');
        }
    }
})(Hyperdeck || (Hyperdeck = {}));
// Alt+3
