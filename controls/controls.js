var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Controls;
(function (Controls) {
    var Control = (function () {
        function Control(obj, fld, afterChange) {
            this.div = document.createElement('div');
            this.obj = obj;
            this.fld = fld;
            this.value = this.obj[this.fld];
            this.afterChange = afterChange;
        }
        Control.prototype.pull = function () {
            this.value = this.obj[this.fld];
        };
        Control.prototype.push = function () {
            this.obj[this.fld] = this.value;
        };
        Control.prototype.set = function (value) {
            this.value = value;
            this.obj[this.fld] = value;
            this.afterChange();
        };
        return Control;
    }());
    var Text = (function (_super) {
        __extends(Text, _super);
        function Text(obj, fld, afterChange, width, height) {
            _super.call(this, obj, fld, afterChange);
            this.input = document.createElement('input');
            this.input.style.width = width + 'px';
            this.input.style.height = height + 'px';
            this.div.appendChild(this.input);
            this.input.value = this.value.toString();
            this.font = '11pt Courier New';
            this.textColor = 'rgb(0,0,0)';
            this.backColor = 'rgb(255,255,255)';
            this.textAlign = 'right';
            this.textMargin = 4;
            this.setHandlers();
        }
        Text.prototype.init = function () {
            this.draw();
        };
        Text.prototype.setHandlers = function () {
            var control = this;
            this.input.onchange = function (e) {
                control.set(control.input.value);
            };
        };
        Text.prototype.setXY = function () {
            //this.x = null;
            //this.y = this.canvas.height / 2;
            //
            //if (this.textAlign == 'left')
            //{
            //	this.x = this.textMargin;
            //}
            //else if (this.textAlign == 'right')
            //{
            //	this.x = this.canvas.width - this.textMargin;
            //}
            //else if (this.textAlign == 'center')
            //{
            //	this.x = this.canvas.width / 2;
            //}
            //else
            //{
            //	throw new Error();
            //}
        };
        Text.prototype.draw = function () {
            //this.setXY();
            //this.ctx.fillStyle = this.backColor;
            //this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            //
            //this.ctx.font = this.font;
            //this.ctx.textAlign = this.textAlign;
            //this.ctx.textBaseline = 'middle';
            //this.ctx.fillStyle = this.textColor;
            //this.ctx.fillText(this.value, this.x, this.y);
        };
        return Text;
    }(Control));
    Controls.Text = Text;
    var Number = (function (_super) {
        __extends(Number, _super);
        function Number(obj, fld, afterChange, width, height, digits, decims) {
            _super.call(this, obj, fld, afterChange);
            this.digits = digits;
            this.decims = decims;
            this.charWidth = 10;
            this.font = '11pt Courier New';
            this.textColor = 'rgb(0,0,0)';
            this.backColor = 'rgb(255,255,255)';
            this.textAlign = 'right';
            this.textMargin = 4;
            this.canvas = document.createElement('canvas');
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx = this.canvas.getContext('2d');
            this.div.appendChild(this.canvas);
            this.init();
        }
        Number.prototype.init = function () {
            this.setHandlers();
            this.position();
            this.draw();
        };
        Number.prototype.setHandlers = function () {
            var control = this;
            var mx = null;
            var my = null;
            var alt = false;
            var ctrl = false;
            var shift = false;
            this.canvas.onmousemove = function (e) {
                mx = e.offsetX;
                my = e.offsetY;
                control.hoveredIndex = Math.floor((mx - control.left) / control.charWidth);
                if (control.chars[control.hoveredIndex] == '.' || control.chars[control.hoveredIndex] == '-') {
                    control.hoveredIndex = null;
                }
                control.draw();
            };
            this.canvas.onmouseleave = function (e) {
                control.hoveredIndex = null;
                control.draw();
            };
            this.canvas.onmousewheel = function (e) {
                if (control.hoveredIndex == null) {
                    return;
                }
                var n = e.wheelDelta / 120;
                var value = control.value + n * control.powers[control.hoveredIndex];
                control.set(value);
                control.position();
                control.hoveredIndex = Math.floor((mx - control.left) / control.charWidth);
                if (control.chars[control.hoveredIndex] == '.' || control.chars[control.hoveredIndex] == '-') {
                    control.hoveredIndex = null;
                } // this can happen when you roll over pos to neg
                control.draw();
            };
        };
        Number.prototype.position = function () {
            // 12
            // -12
            // 12.34
            // -12.34
            // .34
            // -.34
            var text = this.value.toFixed(this.decims);
            var dash = (this.value < 0) ? '-' : '';
            var point = text.indexOf('.');
            var digits = (point < 0 ? text.length : point) - dash.length;
            //var decims = text.length - digits - (point < 0 ? 0 : 1) - dash.length;
            function Repeat(c, n) { var l = []; for (var i = 0; i < n; i++) {
                l.push(c);
            } return l.join(''); }
            if (digits > this.digits) {
                this.digits = digits;
            }
            if (digits < this.digits) {
                text = dash + Repeat('0', this.digits - digits) + text.substr(dash.length);
            } // add digits
            //if (decims > this.decims) { text = text.substr(0, text.length - (decims - this.decims)); }
            //if (decims < this.decims) { text = text + Repeat('0', this.decims - decims); }
            this.chars = [];
            this.powers = [];
            var power = Math.pow(10, this.digits - 1);
            for (var i = 0; i < text.length; i++) {
                this.chars.push(text[i]);
                if (text[i] == '-' || text[i] == '.') {
                    this.powers.push(0);
                }
                else {
                    this.powers.push(power);
                    power /= 10;
                }
            }
            this.left = null;
            this.y = this.canvas.height / 2;
            if (this.textAlign == 'left') {
                this.left = this.textMargin;
            }
            else if (this.textAlign == 'right') {
                this.left = this.canvas.width - this.textMargin - this.charWidth * this.chars.length;
            }
            else if (this.textAlign == 'center') {
                this.left = this.canvas.width / 2 - this.charWidth * this.chars.length / 2;
            }
            else {
                throw new Error();
            }
        };
        Number.prototype.draw = function () {
            this.ctx.fillStyle = this.backColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.font = this.font;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            for (var i = 0; i < this.chars.length; i++) {
                this.ctx.fillStyle = (this.hoveredIndex == i) ? 'red' : 'black';
                this.ctx.fillText(this.chars[i], this.left + this.charWidth * i, this.y);
            }
        };
        return Number;
    }(Control));
    Controls.Number = Number;
    var Pill = (function (_super) {
        __extends(Pill, _super);
        function Pill(obj, fld, afterChange) {
            _super.call(this, obj, fld, afterChange);
            this.hovered = { row: null, col: null };
        }
        Pill.prototype.init = function () {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.cols * this.width;
            this.canvas.height = this.rows * this.height;
            this.ctx = this.canvas.getContext('2d');
            this.div.appendChild(this.canvas);
            this.setHandlers();
            this.draw();
        };
        Pill.prototype.draw = function () {
        };
        Pill.prototype.drawHighlight = function () {
            var ctx = this.ctx;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            // highlight hovered cell
            if (this.hovered.row != null && this.hovered.col != null) {
                ctx.fillStyle = 'rgb(200,200,200)';
                ctx.fillRect(this.hovered.col * this.width, this.hovered.row * this.height, this.width, this.height);
            }
            // highlight selected cell
            var selectedCol = this.value.charCodeAt(0) - 65;
            var selectedRow = parseInt(this.value[1]) - 1;
            ctx.fillStyle = 'orange';
            ctx.fillRect(selectedCol * this.width, selectedRow * this.height, this.width, this.height);
        };
        Pill.prototype.setHandlers = function () {
            var control = this;
            var mx = null;
            var my = null;
            this.canvas.onmousemove = function (e) {
                mx = e.offsetX;
                my = e.offsetY;
                control.hovered.row = Math.floor(my / control.height);
                control.hovered.col = Math.floor(mx / control.width);
                control.draw();
            };
            this.canvas.onmousedown = function (e) {
                mx = e.offsetX;
                my = e.offsetY;
                var row = Math.floor(my / control.height);
                var col = Math.floor(mx / control.width);
                control.set(String.fromCharCode(col + 65) + (row + 1).toString());
                control.draw();
            };
            this.canvas.onmouseleave = function (e) {
                control.hovered.row = null;
                control.hovered.col = null;
                control.draw();
            };
        };
        return Pill;
    }(Control));
    var TextPill = (function (_super) {
        __extends(TextPill, _super);
        function TextPill(obj, fld, afterChange, rows, cols, width, height, labels) {
            _super.call(this, obj, fld, afterChange);
            this.rows = rows;
            this.cols = cols;
            this.width = width;
            this.height = height;
            this.font = '10pt Courier New';
            this.labels = labels;
            this.init();
        }
        TextPill.prototype.draw = function () {
            var ctx = this.ctx;
            this.drawHighlight();
            ctx.font = this.font;
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (var i = 0; i < this.labels.length; i++) {
                var row = Math.floor(i / this.cols);
                var col = i % this.cols;
                var x = (col + 0.5) * this.width;
                var y = (row + 0.5) * this.height;
                ctx.fillText(this.labels[i], x, y);
            }
        };
        return TextPill;
    }(Pill));
    Controls.TextPill = TextPill;
    var Origin = (function (_super) {
        __extends(Origin, _super);
        function Origin(obj, fld, afterChange) {
            _super.call(this, obj, fld, afterChange);
            this.rows = 5;
            this.cols = 5;
            this.width = 27;
            this.height = 27;
            this.init();
        }
        Origin.prototype.draw = function () {
            var ctx = this.ctx;
            var size = this.width;
            var zeroLength = 0;
            var halfLength = 13;
            var fullLength = 17;
            var fletchLength = 3;
            var halfcenter = Math.floor(size / 2);
            var margin = 5;
            var radius = 3;
            var midpoint = Math.floor(size * 5 / 2);
            function DrawCorner(ctx, x, y, dx, dy) {
                x += margin * dx;
                y += margin * dy;
                var xhalf = (dx < 0 ? -1 : +1) * 0.5;
                var yhalf = (dy < 0 ? -1 : +1) * 0.5;
                ctx.beginPath();
                // vertical stroke
                ctx.moveTo(x + xhalf, y + dy * zeroLength);
                ctx.lineTo(x + xhalf, y + dy * fullLength);
                Fletch(ctx, x + xhalf, y + dy * fullLength + yhalf, dy > 0 ? 'S' : 'N', fletchLength);
                // horizontal stroke
                ctx.moveTo(x + dx * zeroLength, y + yhalf);
                ctx.lineTo(x + dx * fullLength, y + yhalf);
                Fletch(ctx, x + dx * fullLength + xhalf, y + yhalf, dx > 0 ? 'E' : 'W', fletchLength);
                ctx.stroke();
            }
            function DrawDotArrow(ctx, x, y, dx, dy, direction) {
                ctx.beginPath();
                ctx.moveTo(x + Math.abs(dy) * 0.5, y + Math.abs(dx) * 0.5);
                ctx.lineTo(x + Math.abs(dy) * 0.5 + dx * fullLength, y + Math.abs(dx) * 0.5 + dy * fullLength);
                Fletch(ctx, x + dx * fullLength + Math.abs(dy) * 0.5, y + dy * fullLength + Math.abs(dx) * 0.5, direction, fletchLength);
                ctx.stroke();
                //ctx.beginPath();
                //ctx.arc(x + Math.abs(dy) * 0.5, y + Math.abs(dx) * 0.5, radius, 0, Math.PI * 2, false);
                //ctx.fill();
            }
            var xs = [size * 0, size * 1, size * 2, size * 3, size * 4, size * 5];
            var ys = [size * 0, size * 1, size * 2, size * 3, size * 4, size * 5];
            this.drawHighlight();
            ctx.fillStyle = 'black';
            // NW
            DrawCorner(ctx, xs[0], ys[0], +1, +1);
            DrawCorner(ctx, xs[2], ys[0], -1, +1);
            DrawCorner(ctx, xs[0], ys[2], +1, -1);
            DrawCorner(ctx, xs[2], ys[2], -1, -1);
            // NE
            DrawCorner(ctx, xs[3], ys[0], +1, +1); // NW
            DrawCorner(ctx, xs[5], ys[0], -1, +1); // NE
            DrawCorner(ctx, xs[3], ys[2], +1, -1); // SW
            DrawCorner(ctx, xs[5], ys[2], -1, -1); // SE
            // SW
            DrawCorner(ctx, xs[0], ys[3], +1, +1);
            DrawCorner(ctx, xs[2], ys[3], -1, +1);
            DrawCorner(ctx, xs[0], ys[5], +1, -1);
            DrawCorner(ctx, xs[2], ys[5], -1, -1);
            // SE
            DrawCorner(ctx, xs[3], ys[3], +1, +1);
            DrawCorner(ctx, xs[5], ys[3], -1, +1);
            DrawCorner(ctx, xs[3], ys[5], +1, -1);
            DrawCorner(ctx, xs[5], ys[5], -1, -1);
            // toward center
            DrawDotArrow(ctx, midpoint, margin, 0, +1, 'S'); // N
            DrawDotArrow(ctx, xs[5] - margin, midpoint, -1, 0, 'W'); // E
            DrawDotArrow(ctx, midpoint, ys[5] - margin, 0, -1, 'N'); // S
            DrawDotArrow(ctx, margin, midpoint, +1, 0, 'E'); // W
            // out from center
            DrawDotArrow(ctx, midpoint, midpoint - halfcenter - margin, 0, -1, 'N'); // N
            DrawDotArrow(ctx, midpoint + halfcenter + margin, midpoint, +1, 0, 'E'); // E
            DrawDotArrow(ctx, midpoint, midpoint + halfcenter + margin, 0, +1, 'S'); // S
            DrawDotArrow(ctx, midpoint - halfcenter - margin, midpoint, -1, 0, 'W'); // W
            ctx.beginPath();
            ctx.arc(midpoint, midpoint, radius, 0, Math.PI * 2, false);
            ctx.fill();
        };
        return Origin;
    }(Pill));
    Controls.Origin = Origin;
    var Anchor = (function (_super) {
        __extends(Anchor, _super);
        function Anchor(obj, fld, afterChange) {
            _super.call(this, obj, fld, afterChange);
            this.rows = 3;
            this.cols = 3;
            this.width = 45;
            this.height = 45;
            this.init();
        }
        Anchor.prototype.draw = function () {
            var ctx = this.ctx;
            var size = this.width;
            var zeroLength = 0;
            var halfLength = Math.floor(size * 0.3);
            var fullLength = Math.floor(size * 0.6);
            var fletchLength = 3;
            var margin = 3 + Math.floor(size * 0.1);
            var zz = 0;
            var wd = size * 3;
            var hg = size * 3;
            var lf = zz + margin;
            var cx = Math.floor(wd / 2);
            var rt = wd - margin;
            var tp = zz + margin;
            var cy = Math.floor(hg / 2);
            var bt = hg - margin;
            this.drawHighlight();
            ctx.beginPath();
            ctx.moveTo(lf + zeroLength, tp + 0.5);
            ctx.lineTo(lf + fullLength, tp + 0.5);
            Fletch(ctx, lf + fullLength + 0.5, tp + 0.5, 'E', fletchLength);
            ctx.moveTo(lf + 0.5, tp + zeroLength);
            ctx.lineTo(lf + 0.5, tp + fullLength);
            Fletch(ctx, lf + 0.5, tp + fullLength + 0.5, 'S', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - halfLength, tp + 0.5);
            ctx.lineTo(cx + halfLength, tp + 0.5);
            Fletch(ctx, cx - halfLength - 0.5, tp + 0.5, 'W', fletchLength);
            Fletch(ctx, cx + halfLength + 0.5, tp + 0.5, 'E', fletchLength);
            ctx.moveTo(cx + 0.5, tp + zeroLength);
            ctx.lineTo(cx + 0.5, tp + halfLength);
            Fletch(ctx, cx + 0.5, tp + halfLength + 0.5, 'S', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rt - zeroLength, tp + 0.5);
            ctx.lineTo(rt - fullLength, tp + 0.5);
            Fletch(ctx, rt - fullLength - 0.5, tp + 0.5, 'W', fletchLength);
            ctx.moveTo(rt - 0.5, tp + zeroLength);
            ctx.lineTo(rt - 0.5, tp + fullLength);
            Fletch(ctx, rt - 0.5, tp + fullLength + 0.5, 'S', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lf + 0.5, cy - halfLength);
            ctx.lineTo(lf + 0.5, cy + halfLength);
            Fletch(ctx, lf + 0.5, cy - halfLength - 0.5, 'N', fletchLength);
            Fletch(ctx, lf + 0.5, cy + halfLength + 0.5, 'S', fletchLength);
            ctx.moveTo(lf + zeroLength, cy + 0.5);
            ctx.lineTo(lf + halfLength, cy + 0.5);
            Fletch(ctx, lf + halfLength + 0.5, cy + 0.5, 'E', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 0.5, cy - halfLength);
            ctx.lineTo(cx + 0.5, cy + halfLength);
            Fletch(ctx, cx + 0.5, cy - halfLength - 0.5, 'N', fletchLength);
            Fletch(ctx, cx + 0.5, cy + halfLength + 0.5, 'S', fletchLength);
            ctx.moveTo(cx - halfLength, cy + 0.5);
            ctx.lineTo(cx + halfLength, cy + 0.5);
            Fletch(ctx, cx - halfLength - 0.5, cy + 0.5, 'W', fletchLength);
            Fletch(ctx, cx + halfLength + 0.5, cy + 0.5, 'E', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rt - 0.5, cy - halfLength);
            ctx.lineTo(rt - 0.5, cy + halfLength);
            Fletch(ctx, rt - 0.5, cy - halfLength - 0.5, 'N', fletchLength);
            Fletch(ctx, rt - 0.5, cy + halfLength + 0.5, 'S', fletchLength);
            ctx.moveTo(rt - zeroLength, cy + 0.5);
            ctx.lineTo(rt - halfLength, cy + 0.5);
            Fletch(ctx, rt - halfLength - 0.5, cy + 0.5, 'W', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lf + 0.5, bt - zeroLength);
            ctx.lineTo(lf + 0.5, bt - fullLength);
            Fletch(ctx, lf + 0.5, bt - fullLength - 0.5, 'N', fletchLength);
            ctx.moveTo(lf + zeroLength, bt - 0.5);
            ctx.lineTo(lf + fullLength, bt - 0.5);
            Fletch(ctx, lf + fullLength + 0.5, bt - 0.5, 'E', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - halfLength, bt - 0.5);
            ctx.lineTo(cx + halfLength, bt - 0.5);
            Fletch(ctx, cx - halfLength - 0.5, bt - 0.5, 'W', fletchLength);
            Fletch(ctx, cx + halfLength + 0.5, bt - 0.5, 'E', fletchLength);
            ctx.moveTo(cx + 0.5, bt - zeroLength);
            ctx.lineTo(cx + 0.5, bt - halfLength);
            Fletch(ctx, cx + 0.5, bt - halfLength - 0.5, 'N', fletchLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rt - 0.5, bt - zeroLength);
            ctx.lineTo(rt - 0.5, bt - fullLength);
            Fletch(ctx, rt - 0.5, bt - fullLength - 0.5, 'N', fletchLength);
            ctx.moveTo(rt - zeroLength, bt - 0.5);
            ctx.lineTo(rt - fullLength, bt - 0.5);
            Fletch(ctx, rt - fullLength - 0.5, bt - 0.5, 'W', fletchLength);
            ctx.stroke();
        };
        return Anchor;
    }(Pill));
    Controls.Anchor = Anchor;
    function Fletch(ctx, cx, cy, direction, length) {
        if (direction == 'N') {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - length, cy + length);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + length, cy + length);
        }
        else if (direction == 'E') {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - length, cy - length);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - length, cy + length);
        }
        else if (direction == 'S') {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - length, cy - length);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + length, cy - length);
        }
        else if (direction == 'W') {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + length, cy - length);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + length, cy + length);
        }
        else {
            throw new Error();
        }
    }
    var Color = (function (_super) {
        __extends(Color, _super);
        // this could be a compound control, with text boxes and a swatch canvas
        function Color(obj, fld, afterChange) {
            _super.call(this, obj, fld, afterChange);
        }
        Color.prototype.setHandlers = function () {
        };
        Color.prototype.draw = function () {
        };
        return Color;
    }(Control));
    Controls.Color = Color;
})(Controls || (Controls = {}));
