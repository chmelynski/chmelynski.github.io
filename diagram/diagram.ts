
namespace Hyperdeck {

/*

The goal of Diagram is to provide lightweight interactivity to canvas-based graphics, while maintaining code as the sole source of truth.

The interactivity is based around moving points, which are flexible and can represent all manner of values - an individual point can reference an absolute location, or a horizontal or vertical guideline, if only the x or y coordinate is taken into account. Two points can represent a length, width, height, gap, etc. With more points you can represent increasingly complex geometric operations.

How these goals are tied together: Diagram scans the code for object literals such as { x: 0, y: 0 } (in fact, it scans for object literals containing integer fields - other fields, such as x1,y1,x2,y2,r,g,b could be added to customize the look and feel of the point). These literals are turned into points, which are displayed on the canvas and can be dragged around. As the point is dragged, it writes its new coordinates back to the code (to optimize, this is actually done on end of drag).

The tricky part is that we don't want to re-compile the code on every frame of the drag, which means that the code has to be transformed to reference point objects, whose coordinates are changed by the drag. The code itself and the compiled function can then remain constant through the drag. To do this, we replace { x: 0, y: 0 } with _p[i] before compiling the code. The points are stored and send to the compiled function as _p.


TO DO:

diagram
-------
wrap the drawing of the selection box in a save and restore

diagram component
-----------------
the show points button interacts weirdly with the focus - the canvas only redraws when it receives focus? something.
automatically prepend a fillRect white line to the user code, to clear the canvas 
does it pass the Diag component or ctx to the user code?



*/

interface Point {
    x: number;
    y: number;
    selected?: boolean;
    chunk?: string[];
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

export class Diagram {
    
    ctx: CanvasRenderingContext2D;
    
    width: number;
    height: number;
    
    //text: string = null;
    regex: RegExp = /\{(\s*\S+\s*:\s*\d+\s*,?)+\s*\}/g; // object literals whose fields are all integers - { x: 0, y: 0 }
    
    code: string;
    fn: Function;
    //lines: LinkedList<string>;
    //codeCursor: LinkedList<string>;
    
    points: Point[];
    chunks: string[][]; // [ ["foo"] , ["{x:0}"] , ["bar"] , ["{y:0}"] , ["baz"] ] - chunks are boxed to provide reference-style mechanics - the point holds a reference to the box, and can thus change the string underneath the nose of the overarching array. without boxing, the points would have to store the index of the string within the chunks array
    
    selected: Point[];
    selectionBox: SelectionBox = null;
    
    afterChange: (code: string) => void; // this is called after the code is changed by a canvas event, generally to send the updated text to the editor
    
    pointRadius: number = 3;
    showPoints: boolean = true;
    
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
            
            //var points = diagram.points.enumerate();
            //diagram.points.freeze(); // disables add
            
            var points = diagram.points;
            
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
                    
                    diagram.draw();
                };
                diagram.ctx.canvas.onmouseup = function(e) {
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
                
                //diagram.points.unfreeze();
                diagram.ctx.canvas.onmousemove = function(e) { savedX = e.offsetX; savedY = e.offsetY; };
                diagram.ctx.canvas.onmouseup = null;
            };
        };
    }
    
    sendText(): void {
        // send text back to the codemirror
        this.changePointCoords();
        this.code = this.chunks.map(x => x[0]).join('');
        //this.compile(); // do we need this?
        this.afterChange(this.code);
    }
    receiveText(code: string): void {
        // receive text from the codemirror
        this.code = code;
        this.findPoints(); // sets this.points and this.chunks
        this.compile();
        this.selectionBox = null; // arguably better to null the box on canvas blur
        this.draw();
    }
    
    compile(): void {
        
        for (let i = 0; i < this.points.length; i++)
        {
            this.points[i].chunk[0] = '_p[' + i.toString() + ']';
        }
        
        const code = this.chunks.map(x => x[0]).join('');
        
        const headers = [
            "ctx.fillStyle = 'white';",
            "ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);"
        ];
        
        this.fn = new Function('ctx, _p', headers.join('\n') + code);
    }
    changePointCoords(): void {
        this.points.forEach(function (p: Point): void {
            p.chunk[0] = '{ x: ' + p.x.toString() + ', y: ' + p.y.toString() + ' }';
        });
    }
    
    findPoints(): void {
        
        // we partition the text into chunks - points write to their chunk as the point moves
        
        this.chunks = [];
        this.points = [];
        
        let prev = 0;
        
        let match = this.regex.exec(this.code);
        while (match !== null)
        {
            this.chunks.push([ this.code.substring(prev, match.index) ]);
            prev = match.index + match[0].length;
            
            const chunk = [ match[0] ]; // we box the chunk so both chunks and the point can reference the box
            this.chunks.push(chunk);
            
            const p = {
                x: null,
                y: null,
                chunk: chunk
            };
            
            const parts = match[0].replace('{', '').replace('}', '').split(',');
            
            for (let i = 0; i < parts.length; i++)
            {
                const part = parts[i];
                const [key, val] = part.split(':').map(x => x.trim());
                p[key] = parseInt(val);
            }
            
            this.points.push(p);
            
            match = this.regex.exec(this.code);
        }
        
        this.chunks.push([ this.code.substr(prev) ]);
    }
    
    exportPath(): string {
        
        const ctx = new PathGen();
        const centeredPoints = this.points.map(p => ({ x: p.x - this.ctx.canvas.width / 2, y: p.y - this.ctx.canvas.height / 2 }));
        
        try { this.fn(ctx, centeredPoints); } catch(e) { console.log(e); }
        
        return ctx.write();
    }
    
    draw(): void {
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
    
    // This implements a subset of the canvas interface, but stores the commands to a path string like "M 0 0 L 10 0"
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

}

// Alt+2 or 3,2

