// design notes
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// HiddenList<T> is a doubly linked list that allows for hidden rows/cols to be "pinched off" without being discarded outright
// internal/external cut/copy/paste should respect the filter - it works on visible cells only
// styles are displayed as a style object, e.g. {"font": "10pt Courier New", bold:true}
// style formulas support named styles, as well as anything else that produces a style object
// =Styles['default']
// =Styles['default'].extend('bold', true)
var Hyperdeck;
(function (Hyperdeck) {
    var sprintf;
    /* class Scrollbar {
        
        // the grid takes up the entire canvas - scrollbars are placed on the sides of the canvas
        //
        // we keep track of a visible window onto the grid - cell coordinates and whatnot need not be changed
        // the window sets a ctx.translate (but keep header cells half-fixed)
        // check for each row and cell to make sure it is in bounds before drawing
        
        ctx: CanvasRenderingContext2D;
        parent: Grid;
        orientation: string; // enum
        
        width: number;
        height: number;
        
        box: Box;
        handle: Box;
        
        hovered: boolean;
        
        constructor(ctx, parent, orientation) {
            
            this.ctx = ctx;
            this.parent = parent;
            this.orientation = orientation;
            
            this.width = 10;
            this.height = 20;
            
            this.box = new Box();
            this.handle = new Box();
            
            if (this.orientation == 'v')
            {
                this.box.reconcile({lf:this.ctx.canvas.width-this.width,tp:0,wd:this.width,hg:this.ctx.canvas.height});
                this.handle.reconcile({lf:this.ctx.canvas.width-this.width,tp:0,wd:this.width,hg:this.height});
            }
            else if (this.orientation == 'h')
            {
                
            }
        }
        draw(): void {
            
            var scrollbar = this;
            var ctx = scrollbar.ctx;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.strokeStyle = 'rgb(128,128,128)'; // rgb(158,182,206)
            ctx.fillStyle = (scrollbar.hovered ? 'rgb(100,100,100)' : 'rgb(128,128,128)');
            ctx.strokeRect(scrollbar.box.lf-0.5, scrollbar.box.tp, scrollbar.box.wd, scrollbar.box.hg);
            ctx.fillRect(scrollbar.handle.lf, scrollbar.handle.tp, scrollbar.handle.wd, scrollbar.handle.hg);
            ctx.restore();
        }
        onhover(): void {
            
            var scrollbar: Scrollbar = this;
            var ctx: CanvasRenderingContext2D = scrollbar.ctx;
            
            ctx.canvas.onmousedown = function(downEvent) {
                
                var ay = downEvent.offsetY;
                
                ctx.canvas.onmousemove = function(moveEvent) {
                    
                    var my = moveEvent.offsetY;
                    var dy = my - ay;
                    ay = my;
                    
                    //scrollbar.handle.move(0, dy);
                    //scrollbar.parent.window.move(0, dy);
                    
                    scrollbar.parent.draw();
                };
                ctx.canvas.onmouseup = function(upEvent) {
                    ctx.canvas.onmousemove = null;
                    ctx.canvas.onmouseup = null;
                };
            };
        }
    }
    
    */
    var Row = (function () {
        function Row(index, object) {
            this.index = index;
            this.object = object;
        }
        return Row;
    }());
    var Col = (function () {
        function Col(grid, json, index) {
            var col = this;
            col.grid = grid;
            col.index = index;
            col.header = json.header;
            col.visible = json.visible;
            col.width = json.width;
            col.calculated = true;
            col.visited = false;
            col.srcs = new Set();
            col.dsts = new Set();
            col.setFormula(json.formula);
            col.setFormat(json.format);
            col.setStyle(json.style);
        }
        Col.prototype.calculate = function () {
            var col = this;
            if (col.formulaObject === null) {
                col.calculated = true;
                col.visited = false;
                return;
            }
            if (col.visited) {
                throw new Error('circular reference at column "' + col.header + '"');
            }
            col.visited = true;
            // calculate uncalculated srcs first
            col.srcs.forEach(function (src) { if (!src.calculated) {
                src.calculate();
            } });
            for (var i = 0; i < col.grid.dataComponent.data.length; i++) {
                var result = col.formulaObject.call(col.grid.dataComponent.data, i);
                col.grid.dataComponent.data[i][col.header] = result;
            }
            col.calculated = true;
            col.visited = false;
        };
        Col.prototype.setFormula = function (formula) {
            var col = this;
            formula = formula.trim();
            if (formula[0] == '=') {
                formula = formula.substr(1);
            }
            col.formula = formula;
            if (formula == '') {
                col.formulaObject = null;
                col.srcs.forEach(function (src) { src.dsts.delete(col); });
                col.srcs = new Set();
                col.markUncalculated();
                return;
            }
            try {
                col.formulaObject = new Function('i', 'return ' + formula);
                // for now, we're going to assume the formula stays within the row
                var dependencies = [];
                var referenceRegex = /this\[([^\]]+)\]\.([A-Za-z][A-Za-z0-9]*)/g; // e.g. this[i].foo
                var match = referenceRegex.exec(formula);
                while (match !== null) {
                    dependencies.push(match[2]); // the group that matches the .field
                    match = referenceRegex.exec(formula);
                }
                var cols = col.grid.cols.enumerate();
                for (var i = 0; i < dependencies.length; i++) {
                    for (var k = 0; k < cols.length; k++) {
                        if (dependencies[i] == cols[k].header) {
                            col.srcs.add(cols[k]);
                            cols[k].dsts.add(col);
                        }
                    }
                }
                col.markUncalculated();
            }
            catch (e) {
                col.formulaObject = null;
                col.srcs.forEach(function (src) { src.dsts.delete(col); });
                col.srcs = new Set();
                col.markUncalculated();
            }
            col.grid.dataComponent.markDirty();
        };
        Col.prototype.setFormat = function (format) {
            var col = this;
            col.format = ((format == '') ? null : format);
            col.grid.dataComponent.markDirty();
        };
        Col.prototype.setStyle = function (style) {
            var col = this;
            col.style = style;
            try {
                col.styleObject = new Style(JSON.parse(style));
            }
            catch (e) {
                col.styleObject = new Style();
            }
            col.grid.dataComponent.markDirty();
        };
        Col.prototype.markUncalculated = function () {
            var col = this;
            if (col.calculated) {
                col.calculated = false;
                col.dsts.forEach(function (dst) { dst.markUncalculated(); });
            }
        };
        Col.prototype.write = function () {
            var col = this;
            return {
                header: col.header,
                visible: col.visible,
                width: col.width,
                formula: col.formula,
                format: col.format,
                style: col.style
            };
        };
        return Col;
    }());
    var Style = (function () {
        // border: we need syntax to deal with TLRB, color, lineWidth, type (solid, dotted, dashed, etc)
        // either syntax or more tables, which i'm reluctant to do b/c it would be a lot of tables
        // maybe CSS is the best inspiration for syntax here, since CSS itself uses syntax
        // border-top: 1px solid gray
        function Style(json) {
            var style = this;
            if (json == null) {
                json = {};
            }
            style.font = json.font ? json.font : '11pt Calibri';
            style.textColor = json.textColor ? json.textColor : 'rgb(0,0,0)';
            style.hAlign = json.hAlign ? json.hAlign : 'center';
            style.vAlign = json.vAlign ? json.vAlign : 'center';
            style.backgroundColor = json.backgroundColor ? json.backgroundColor : null;
            style.border = json.border ? json.border : null;
            style.hMargin = json.hMargin ? json.hMargin : 5;
            style.vMargin = json.vMargin ? json.vMargin : 4;
        }
        Style.prototype.write = function () {
            var style = this;
            return {
                font: style.font,
                textColor: style.textColor,
                hAlign: style.hAlign,
                vAlign: style.vAlign,
                backgroundColor: style.backgroundColor,
                border: style.border,
                hMargin: style.hMargin,
                vMargin: style.vMargin
            };
        };
        return Style;
    }());
    var GridLinkedList = (function () {
        function GridLinkedList() {
            this.prev = this;
            this.next = this;
        }
        GridLinkedList.prototype.add = function (data) {
            // this must be called on the sentinel
            var elt = new GridLinkedList();
            elt.data = data;
            elt.next = this;
            elt.prev = this.prev;
            this.prev.next = elt;
            this.prev = elt;
            return elt;
        };
        GridLinkedList.prototype.remove = function () {
            // this cannot be called on the sentinel
            this.prev.next = this.next;
            this.next.prev = this.prev;
        };
        GridLinkedList.prototype.enumerate = function () {
            // this must be called on the sentinel
            var list = [];
            var elt = this.next;
            while (elt !== this) {
                list.push(elt.data);
                elt = elt.next;
            }
            return list;
        };
        return GridLinkedList;
    }());
    var HiddenList = (function () {
        function HiddenList() {
            this.prev = this;
            this.next = this;
            this.visibleNext = this;
            this.visiblePrev = this;
        }
        HiddenList.prototype.add = function (data, visible) {
            var elt = new HiddenList();
            elt.data = data;
            elt.next = this;
            elt.prev = this.prev;
            this.prev.next = elt;
            this.prev = elt;
            if (visible) {
                elt.visibleNext = this;
                elt.visiblePrev = this.visiblePrev;
                this.visiblePrev.visibleNext = elt;
                this.visiblePrev = elt;
            }
            else {
                elt.visibleNext = null;
                elt.visiblePrev = null;
            }
            return elt;
        };
        HiddenList.prototype.remove = function () {
            // this cannot be called on the sentinel
            this.prev.next = this.next;
            this.next.prev = this.prev;
        };
        HiddenList.prototype.enumerate = function () {
            // this must be called on the sentinel
            var list = [];
            var elt = this.next;
            while (elt !== this) {
                list.push(elt.data);
                elt = elt.next;
            }
            return list;
        };
        HiddenList.prototype.hideUntil = function (that) {
            this.visibleNext = that;
            that.visiblePrev = this;
        };
        HiddenList.prototype.showUntil = function (that) {
            this.visibleNext = this.next;
            that.visiblePrev = that.prev;
        };
        return HiddenList;
    }());
    var Range = (function () {
        function Range() {
        }
        return Range;
    }());
    var FormulaRange = (function (_super) {
        __extends(FormulaRange, _super);
        function FormulaRange() {
            _super.apply(this, arguments);
            this.formula = null;
            this.fn = null;
        }
        return FormulaRange;
    }(Range));
    var FormatRange = (function (_super) {
        __extends(FormatRange, _super);
        function FormatRange() {
            _super.apply(this, arguments);
            this.formatString = null;
            this.formatObject = null;
        }
        return FormatRange;
    }(Range));
    var StyleRange = (function (_super) {
        __extends(StyleRange, _super);
        function StyleRange() {
            _super.apply(this, arguments);
            this.styleFormula = null;
            this.style = null;
        }
        return StyleRange;
    }(Range));
    var Cell = (function () {
        function Cell() {
            this.grid = null;
            this.row = null;
            this.col = null;
            this.formula = null;
            this.value = null;
            this.string = null; // the cached result of applying the formatObject to the value
            this.formatString = null;
            this.formatObject = null;
            this.fn = null;
            this.unitType = null; // time, length, mass - force, energy, power, etc. - immutable
            this.unitBase = null; // seconds, meters, feet, pounds, kilograms, joules, watts, etc. - mutable
            this.selected = false;
            this.calculated = false;
            this.visited = false;
            this.srcs = [];
            this.dsts = [];
            this.style = null;
            this.styleFormula = null;
        }
        Cell.prototype.calculate = function () {
            var cell = this;
            //if (cell.visited) { throw new Error('circular reference at cell ' + cell.row + ',' + cell.col); }
            //cell.visited = true;
            //
            //// calculate uncalculated srcs first
            //cell.srcs.forEach(function(src) { if (!src.calculated) { src.calculate(); } });
            //
            //var result = cell.fn.call(cell.grid.dataComponent._data, cell.row-1);
            //cell.value = result;
            //cell.grid.dataComponent._data[cell.row-1][cell.grid.dataComponent._headers[cell.col-1]] = result;
            //cell.string = Format(cell.value, cell.formatObject);
            //
            //cell.calculated = true;
            //cell.visited = false;
        };
        Cell.prototype.markUncalculated = function () {
            var cell = this;
            if (cell.calculated) {
                cell.calculated = false;
                cell.dsts.forEach(function (dst) { dst.markUncalculated(); });
            }
        };
        return Cell;
    }());
    var Grid = (function () {
        function Grid(dataComponent, div, heavy) {
            var grid = this;
            grid.heavy = heavy;
            if (grid.heavy) {
                grid.nRows = dataComponent.rows;
                grid.nCols = dataComponent.cols;
            }
            grid.rowHeight = 20;
            grid.rowHeaderWidth = 64;
            grid.defaultCellStroke = 'rgb(208,215,229)'; // rgb(158,182,206)
            grid.defaultHeaderStroke = 'rgb(158,182,206)';
            grid.selectedCellStroke = 'rgb(242,149,54)';
            grid.selectedHeaderStroke = 'rgb(242,149,54)';
            grid.defaultCellFill = 'rgb(255,255,255)';
            grid.defaultHeaderFill = 'rgb(208,215,229)';
            grid.selectedCellFill = 'rgb(210,210,240)';
            grid.selectedHeaderFill = 'rgb(255,213,141)';
            grid.shift = false;
            grid.ctrl = false;
            grid.alt = false;
            grid.tab = false;
            grid.div = div;
            grid.displayDiv = document.createElement('div');
            grid.displayDiv.className = 'grid-container';
            grid.div.appendChild(grid.displayDiv);
            grid.displayGridUi();
            grid.dataComponent = dataComponent;
            var gridJson = dataComponent.gridParams;
            if (!gridJson) {
                gridJson = {};
            }
            if (!gridJson.columns) {
                if (grid.heavy) {
                    gridJson.columns = [];
                    for (var i = 0; i < dataComponent.cols; i++) {
                        gridJson.columns.push({ header: NumberToLetter(i), visible: true, width: 64, formula: '', format: null, style: null });
                    }
                }
                else {
                    gridJson.columns = dataComponent.headers.map(function (header) {
                        return { header: header, visible: true, width: 64, formula: '', format: null, style: null };
                    });
                }
            }
            if (!gridJson.filter) {
                gridJson.filter = '';
            }
            if (!gridJson.sort) {
                gridJson.sort = '';
            }
            if (!gridJson.multisort) {
                gridJson.multisort = [];
            }
            grid.columnParams = gridJson.columns;
            Object.defineProperty(this, 'data', {
                get: function () {
                    return grid.dataComponent.data;
                },
                set: function (value) {
                    grid.dataComponent.data = value;
                    if (grid.dataComponent.markDirty) {
                        grid.dataComponent.markDirty();
                    }
                    grid.resetData();
                }
            });
            grid.editMode = 'value';
            //grid.hScrollbar = null; // new Scrollbar(this.ctx, this, 'h')
            //grid.vScrollbar = new Scrollbar(this.ctx, this, 'v');
            grid.filter = gridJson.filter;
            grid.sort = gridJson.sort;
            grid.multisort = new GridLinkedList();
            grid.multisortIndicatorDict = {};
            for (var i = 0; i < gridJson.multisort.length; i++) {
                grid.multisort.add(gridJson.multisort[i]);
            }
            grid.styles = [new Style()];
            grid.resetData();
        }
        Grid.prototype.resetData = function () {
            var grid = this;
            grid.rows = new HiddenList();
            grid.cols = new HiddenList();
            if (grid.heavy) {
                grid.dataComponent.data = [];
                grid.dataComponent.headers = [];
                var obj = {};
                for (var i = 0; i < grid.dataComponent.cols; i++) {
                    obj[NumberToLetter(i)] = null;
                }
                for (var i = 0; i < grid.dataComponent.rows; i++) {
                    var clone = Object.assign({}, obj);
                    grid.dataComponent.data.push(clone);
                }
                for (var i = 0; i < grid.dataComponent.cols; i++) {
                    grid.dataComponent.headers.push(NumberToLetter(i));
                }
            }
            for (var i = 0; i < grid.dataComponent.data.length; i++) {
                grid.rows.add(new Row(i, grid.dataComponent.data[i]), true);
            }
            // check columnParams against data.headers - add or delete cols as necessary
            for (var i = 0; i < grid.dataComponent.headers.length; i++) {
                var header = grid.dataComponent.headers[i];
                var colParams = null;
                for (var k = 0; k < grid.columnParams.length; k++) {
                    if (grid.columnParams[k].header == header) {
                        colParams = grid.columnParams[k];
                        break;
                    }
                }
                if (colParams === null) {
                    colParams = { header: header, visible: true, width: 64, formula: '', format: null, style: null };
                }
                grid.cols.add(new Col(grid, colParams, i), colParams.visible);
            }
            if (grid.heavy) {
                grid.cells = [];
                for (var i = 0; i < grid.nRows; i++) {
                    var row = [];
                    for (var j = 0; j < grid.nCols; j++) {
                        var cell = new Cell();
                        cell.grid = grid;
                        cell.row = i;
                        cell.col = j;
                        cell.style = grid.styles[0];
                        row.push(cell);
                    }
                    grid.cells.push(row);
                }
                grid.cells[0][0].string = '';
                for (var i = 1; i < grid.nRows; i++) {
                }
                for (var j = 1; j < grid.nCols; j++) {
                }
            }
            grid.selected = null;
            grid.cursor = { row: null, col: null };
            grid.anchor = { row: null, col: null };
            // volatile scroll variables
            grid.scroll = { minRow: grid.rows.visibleNext, minCol: grid.cols.visibleNext, maxRow: null, maxCol: null };
            grid.xOffset = 0;
            grid.yOffset = 0;
            grid.calcMaxRowFromMinRow();
            grid.calcMaxColFromMinCol();
            grid.calculate();
            if (grid.multisort.next !== grid.multisort) {
                grid.setMultisort();
            }
            if (grid.filter !== null) {
                grid.setFilter(grid.filter);
            }
            grid.setMouseHandles();
            grid.setKeyHandles();
            grid.draw();
        };
        Grid.prototype.write = function () {
            var grid = this;
            return {
                filter: grid.filter,
                sort: grid.sort,
                multisort: grid.multisort.enumerate().map(function (sortParams) { return { header: sortParams.header, ascending: sortParams.ascending }; }),
                columns: grid.cols.enumerate().map(function (col) { return col.write(); })
            };
        };
        Grid.prototype.writeData = function (format) {
            var grid = this;
            var text = null;
            if (format == 'json') {
                text = JSON.stringify(grid.dataComponent.data);
            }
            else if (format == 'tsv') {
                var ls = [];
                ls.push(grid.dataComponent.headers);
                for (var i = 0; i < grid.dataComponent.data.length; i++) {
                    var l = [];
                    for (var k = 0; k < grid.dataComponent.headers.length; k++) {
                        l.push(grid.dataComponent.data[i][grid.dataComponent.headers[k]]);
                    }
                    ls.push(l.join('\t'));
                }
                ls.push('');
                text = ls.join('\n');
            }
            else {
                throw new Error();
            }
            return text;
        };
        Grid.prototype.displayGridUi = function () {
            var grid = this;
            var div = grid.displayDiv;
            div.innerHTML = '';
            var canvas = document.createElement('canvas');
            //canvas.width = div.clientWidth; // perhaps set a onresize handler on grid.div/grid.displayDiv to resize the canvas as well
            //canvas.height = div.clientHeight;
            canvas.width = 1000;
            canvas.height = 525;
            canvas.tabIndex = 0;
            canvas.setAttribute('aria-label', 'eyeshade');
            grid.input = document.createElement('input');
            grid.input.type = 'text';
            grid.input.style.position = 'relative';
            grid.input.style.display = 'none';
            grid.textarea = document.createElement('textarea');
            grid.textarea.style.position = 'relative';
            grid.textarea.style.display = 'none';
            div.appendChild(canvas);
            div.appendChild(grid.input);
            div.appendChild(grid.textarea);
            grid.ctx = canvas.getContext('2d');
            grid.lf = 10;
            grid.tp = 10;
            grid.rt = canvas.width - 10;
            grid.bt = canvas.height - 10;
        };
        Grid.prototype.draw = function () {
            var grid = this;
            var ctx = grid.ctx;
            ctx.clearRect(0, 0, grid.ctx.canvas.width, grid.ctx.canvas.height); // or lf, tp, rt - lf, bt - tp
            grid.xs = [];
            grid.ys = [];
            grid.visibleRows = [];
            grid.visibleCols = [];
            // fill xs, cols
            var colElt = grid.scroll.minCol;
            var x = grid.lf;
            grid.xs.push(x);
            x += grid.rowHeaderWidth;
            grid.visibleCols.push(null);
            grid.xs.push(x);
            x -= grid.xOffset; // a one-time correction
            while (x < grid.rt) {
                grid.visibleCols.push(colElt);
                x += colElt.data.width;
                grid.xs.push(x);
                colElt = colElt.visibleNext;
                if (colElt == grid.cols) {
                    break;
                }
            }
            // fill ys, rows
            var rowElt = grid.scroll.minRow;
            var y = grid.tp;
            grid.ys.push(y);
            y += grid.rowHeight;
            grid.visibleRows.push(null);
            grid.ys.push(y);
            y -= grid.yOffset; // a one-time correction
            while (y < grid.bt) {
                grid.visibleRows.push(rowElt);
                y += grid.rowHeight;
                grid.ys.push(y);
                rowElt = rowElt.visibleNext;
                if (rowElt == grid.rows) {
                    break;
                }
            }
            var sel = grid.selected;
            // fill top left corner cell
            ctx.fillStyle = grid.defaultHeaderFill;
            ctx.fillRect(grid.xs[0], grid.ys[0], grid.xs[1] - grid.xs[0], grid.ys[1] - grid.ys[0]);
            // draw row header fills and text
            for (var i = 1; i < grid.visibleRows.length; i++) {
                var row = grid.visibleRows[i].data;
                var string = row.index.toString();
                var rowIsSelected = ((sel === null || row === null || sel.minRow === null) ? false : (sel.minRow.data.index <= row.index && row.index <= sel.maxRow.data.index));
                var lf = grid.xs[0];
                var rt = grid.xs[1];
                var tp = grid.ys[i + 0];
                var bt = grid.ys[i + 1];
                var wd = rt - lf;
                var hg = bt - tp;
                var cx = (lf + rt) / 2;
                var cy = (tp + bt) / 2;
                // fill
                ctx.fillStyle = (rowIsSelected ? grid.selectedHeaderFill : grid.defaultHeaderFill);
                ctx.fillRect(lf, tp, wd, hg);
                // clipping path to prevent text overflow
                ctx.save();
                ctx.beginPath();
                var clipLf = lf;
                var clipTp = tp;
                var clipWd = wd;
                var clipHg = hg;
                if (i == 1) {
                    clipTp = bt - grid.rowHeight;
                }
                if (i == grid.visibleRows.length - 1) {
                    clipHg = grid.rowHeight;
                }
                ctx.rect(clipLf, clipTp, clipWd, clipHg);
                ctx.clip();
                ctx.fillStyle = 'black';
                ctx.font = '11pt Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(string, cx, cy);
                ctx.restore(); // clear clipping path
            }
            // draw col header fills and text
            for (var j = 1; j < grid.visibleCols.length; j++) {
                var col = grid.visibleCols[j].data;
                var string = col.header;
                var colIsSelected = ((sel === null || col === null || sel.minCol === null) ? false : (sel.minCol.data.index <= col.index && col.index <= sel.maxCol.data.index));
                var lf = grid.xs[j + 0];
                var rt = grid.xs[j + 1];
                var tp = grid.ys[0];
                var bt = grid.ys[1];
                var wd = rt - lf;
                var hg = bt - tp;
                var cx = (lf + rt) / 2;
                var cy = (tp + bt) / 2;
                // fill
                ctx.fillStyle = (colIsSelected ? grid.selectedHeaderFill : grid.defaultHeaderFill);
                ctx.fillRect(lf, tp, wd, hg);
                // clipping path to prevent text overflow
                ctx.save();
                ctx.beginPath();
                var clipLf = lf;
                var clipTp = tp;
                var clipWd = wd;
                var clipHg = hg;
                if (j == 1) {
                    clipLf = rt - col.width;
                }
                if (j == grid.visibleCols.length - 1) {
                    clipWd = col.width;
                }
                ctx.rect(clipLf, clipTp, clipWd, clipHg);
                ctx.clip();
                ctx.fillStyle = 'black';
                ctx.font = '11pt Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(string, cx, cy);
                if (grid.multisortIndicatorDict[string]) {
                    var n = grid.multisortIndicatorDict[string];
                    var str = Math.abs(n).toString();
                    ctx.font = '8pt Calibri';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(str, rt - 9, bt - 4);
                    var rtm = 5.5;
                    var btm = 3;
                    var len = 10;
                    var flt = 2;
                    ctx.beginPath();
                    ctx.moveTo(rt - rtm, bt - btm + 0.5);
                    ctx.lineTo(rt - rtm, bt - btm - len - 0.5);
                    if (n < 0) {
                        ctx.moveTo(rt - rtm, bt - btm - len);
                        ctx.lineTo(rt - rtm + flt, bt - btm - len + flt);
                        ctx.moveTo(rt - rtm, bt - btm - len);
                        ctx.lineTo(rt - rtm - flt, bt - btm - len + flt);
                    }
                    else {
                        ctx.moveTo(rt - rtm, bt - btm);
                        ctx.lineTo(rt - rtm + flt, bt - btm - flt);
                        ctx.moveTo(rt - rtm, bt - btm);
                        ctx.lineTo(rt - rtm - flt, bt - btm - flt);
                    }
                    ctx.stroke();
                }
                ctx.restore(); // clear clipping path
            }
            // draw data cell fills and text - we'll draw strokes and the selection box later on
            for (var j = 1; j < grid.visibleCols.length; j++) {
                var col = grid.visibleCols[j].data;
                var style = col.styleObject;
                for (var i = 1; i < grid.visibleRows.length; i++) {
                    var row = grid.visibleRows[i].data;
                    var value = row.object[col.header];
                    var string = Format(value, col.format);
                    var rowIsSelected = ((sel === null || row === null || sel.minRow === null) ? false : (sel.minRow.data.index <= row.index && row.index <= sel.maxRow.data.index));
                    var colIsSelected = ((sel === null || col === null || sel.minCol === null) ? false : (sel.minCol.data.index <= col.index && col.index <= sel.maxCol.data.index));
                    if (rowIsSelected && colIsSelected && (row != grid.cursor.row.data || col != grid.cursor.col.data)) {
                        ctx.fillStyle = grid.selectedCellFill; // what if there is a set background color?
                    }
                    else {
                        if (style.backgroundColor) {
                            ctx.fillStyle = style.backgroundColor;
                        }
                        else {
                            ctx.fillStyle = grid.defaultCellFill;
                        }
                    }
                    var lf = grid.xs[j + 0];
                    var rt = grid.xs[j + 1];
                    var tp = grid.ys[i + 0];
                    var bt = grid.ys[i + 1];
                    var wd = rt - lf;
                    var hg = bt - tp;
                    var cx = (lf + rt) / 2;
                    var cy = (tp + bt) / 2;
                    // clipping path to prevent text overflow
                    ctx.save();
                    ctx.beginPath();
                    var clipLf = lf;
                    var clipTp = tp;
                    var clipWd = wd;
                    var clipHg = hg;
                    // the first and last data rows/cols have a clipping rect that is different from the visible rect
                    if (i == 1) {
                        clipTp = bt - grid.rowHeight;
                    }
                    if (i == grid.visibleRows.length - 1) {
                        clipHg = grid.rowHeight;
                    }
                    if (j == 1) {
                        clipLf = rt - col.width;
                    }
                    if (j == grid.visibleCols.length - 1) {
                        clipWd = col.width;
                    }
                    ctx.rect(clipLf, clipTp, clipWd, clipHg);
                    ctx.clip();
                    ctx.fillRect(lf, tp, wd, hg);
                    var hAlign = style.hAlign;
                    var vAlign = style.vAlign;
                    var x = null;
                    var y = null;
                    if (hAlign == 'left') {
                        x = lf + style.hMargin;
                    }
                    else if (hAlign == 'center') {
                        x = cx;
                    }
                    else if (hAlign == 'right') {
                        x = rt - style.hMargin;
                    }
                    else {
                        throw new Error();
                    }
                    if (vAlign == 'top') {
                        y = tp + style.vMargin;
                    }
                    else if (vAlign == 'center') {
                        y = cy;
                    }
                    else if (vAlign == 'bottom') {
                        y = bt - style.vMargin;
                    }
                    else {
                        throw new Error();
                    }
                    ctx.fillStyle = style.textColor;
                    ctx.font = style.font;
                    ctx.textAlign = hAlign;
                    ctx.textBaseline = ((vAlign == 'center') ? 'middle' : vAlign);
                    ctx.fillText(string, x, y);
                    ctx.restore(); // clear clipping path
                }
            }
            var labelCellStroke = 'rgb(0,0,0)';
            var normalStroke = 'rgb(0,0,0)';
            var selectedStroke = 'rgb(0,0,0)';
            ctx.lineWidth = 1;
            var x0 = grid.xs[0];
            var x1 = grid.xs[1];
            var y0 = grid.ys[0];
            var y1 = grid.ys[1];
            var xn = grid.xs[grid.xs.length - 1];
            var yn = grid.ys[grid.ys.length - 1];
            // draw normal strokes - horizontal
            for (var i = 0; i < grid.ys.length; i++) {
                var y = grid.ys[i];
                // long strokes
                ctx.strokeStyle = i < 2 ? labelCellStroke : normalStroke;
                ctx.beginPath();
                ctx.moveTo(x0 - 0.5, y - 0.5);
                ctx.lineTo(xn, y - 0.5);
                ctx.stroke();
                // short label cell strokes
                ctx.strokeStyle = labelCellStroke;
                ctx.beginPath();
                ctx.moveTo(x0 - 0.5, y - 0.5);
                ctx.lineTo(x1, y - 0.5);
                ctx.stroke();
            }
            // draw normal strokes - vertical
            for (var i = 0; i < grid.xs.length; i++) {
                var x = grid.xs[i];
                if (i >= 2 && i < grid.xs.length - 1 && grid.visibleCols[i - 1].next != grid.visibleCols[i]) {
                    ctx.lineWidth = 3; // show presence of hidden cols
                }
                else {
                    ctx.lineWidth = 1;
                }
                // long strokes
                ctx.strokeStyle = i < 2 ? labelCellStroke : normalStroke;
                ctx.beginPath();
                ctx.moveTo(x - 0.5, y0 - 0.5);
                ctx.lineTo(x - 0.5, yn);
                ctx.stroke();
                // short label cell strokes
                ctx.strokeStyle = labelCellStroke;
                ctx.beginPath();
                ctx.moveTo(x - 0.5, y0 - 0.5);
                ctx.lineTo(x - 0.5, y1);
                ctx.stroke();
            }
            // thick black selection box
            if (grid.selected) {
                var sel = grid.selected;
                var sx0 = null;
                var sx1 = null;
                var sy0 = null;
                var sy1 = null;
                var xa = null;
                var xb = null;
                var ya = null;
                var yb = null;
                var seltp = true;
                var sellf = true;
                var selbt = true;
                var selrt = true;
                // xs[0]         xs[1]         xs[2]         xs[3]         xs[4]
                //       cols[0]       cols[1]       cols[2]       cols[3] (actually visibleCols, and visibleCols[0] == null)
                if (sel.minRow == null || sel.maxRow == null) {
                    sy0 = grid.ys[0];
                    sy1 = grid.ys[1];
                    ya = sy0;
                    yb = sy1;
                }
                else {
                    for (var i = 1; i < grid.visibleRows.length; i++) {
                        if (grid.visibleRows[i] == sel.minRow) {
                            sy0 = grid.ys[i + 0];
                        }
                        if (grid.visibleRows[i] == sel.maxRow) {
                            sy1 = grid.ys[i + 1];
                            break;
                        }
                    }
                    var selymin = sel.minRow.data.index;
                    var selymax = sel.maxRow.data.index;
                    var winymin = grid.scroll.minRow.data.index;
                    var winymax = grid.scroll.maxRow.data.index;
                    if (selymin >= winymin && selymax <= winymax) {
                        ya = sy0;
                        yb = sy1;
                    }
                    else if (selymax < winymin || selymin > winymax) {
                        seltp = false;
                        selbt = false;
                    }
                    else if (selymin < winymin && selymax >= winymin) {
                        seltp = false;
                        ya = y1;
                        yb = sy1;
                    }
                    else if (selymin <= winymax && selymax > winymax) {
                        selbt = false;
                        ya = sy0;
                        yb = yn;
                    }
                    else {
                        throw new Error();
                    }
                }
                if (sel.minCol == null || sel.maxCol == null) {
                    sx0 = grid.xs[0];
                    sx1 = grid.xs[1];
                    xa = sx0;
                    xb = sx1;
                }
                else {
                    for (var j = 1; j < grid.visibleCols.length; j++) {
                        if (grid.visibleCols[j] == sel.minCol) {
                            sx0 = grid.xs[j + 0];
                        }
                        if (grid.visibleCols[j] == sel.maxCol) {
                            sx1 = grid.xs[j + 1];
                            break;
                        }
                    }
                    var selxmin = sel.minCol.data.index;
                    var selxmax = sel.maxCol.data.index;
                    var winxmin = grid.scroll.minCol.data.index;
                    var winxmax = grid.scroll.maxCol.data.index;
                    if (selxmin >= winxmin && selxmax <= winxmax) {
                        xa = sx0;
                        xb = sx1;
                    }
                    else if (selxmax < winxmin || selxmin > winxmax) {
                        sellf = false;
                        selrt = false;
                    }
                    else if (selxmin < winxmin && selxmax >= winxmin) {
                        sellf = false;
                        xa = x1;
                        xb = sx1;
                    }
                    else if (selxmin <= winxmax && selxmax > winxmax) {
                        selrt = false;
                        xa = sx0;
                        xb = xn;
                    }
                    else {
                        throw new Error();
                    }
                }
                ctx.fillStyle = 'rgb(0,0,0)';
                if (sellf) {
                    ctx.fillRect(sx0 - 2, ya - 2, 3, yb - ya + 1);
                } // lf
                if (selrt) {
                    ctx.fillRect(sx1 - 2, ya - 2, 3, yb - ya - 2);
                } // rt
                if (seltp) {
                    ctx.fillRect(xa - 2, sy0 - 2, xb - xa + 1, 3);
                } // tp
                if (selbt) {
                    ctx.fillRect(xa - 2, sy1 - 2, xb - xa - 2, 3);
                } // bt
                if (selrt && selbt) {
                    ctx.fillRect(sx1 - 3, sy1 - 3, 5, 5);
                } // handle square
            }
            //if (grid.hScrollbar) { grid.hScrollbar.draw(); }
            //if (grid.vScrollbar) { grid.vScrollbar.draw(); }
        };
        Grid.prototype.pointToRowCol = function (x, y) {
            var grid = this;
            // compare the mouse pos against the gridlines to get a row,col pair
            var row = null;
            var col = null;
            // xs[0]         xs[1]         xs[2]         xs[3]         xs[4]
            //       cols[0]       cols[1]       cols[2]       cols[3] (actually visibleCols, and cols[0] == null)
            for (var i = 1; i < grid.ys.length; i++) {
                if (y <= grid.ys[i]) {
                    row = grid.visibleRows[i - 1];
                    break;
                }
            }
            for (var j = 1; j < grid.xs.length; j++) {
                if (x <= grid.xs[j]) {
                    col = grid.visibleCols[j - 1];
                    break;
                }
            }
            // so this returns row == null or col == null if a header is selected
            return { row: row, col: col };
        };
        Grid.prototype.calculate = function () {
            var grid = this;
            grid.cols.enumerate().forEach(function (col) { if (!col.calculated) {
                col.calculate();
            } });
        };
        Grid.prototype.setMouseHandles = function () {
            var grid = this;
            var canvas = grid.ctx.canvas;
            canvas.onwheel = function (wheelEvent) {
                wheelEvent.preventDefault();
                wheelEvent.stopPropagation();
                var clicks = ((wheelEvent.deltaY > 0) ? -1 : +1);
                var cubitsPerRow = 1; // 20
                // Shift+Scroll = 1 cell, Scroll = 10 cells, Ctrl+Scroll = 100 cells, Ctrl+Shift+Scroll = 1000 cells
                // Shift+ above = Scroll horizontal?
                // this requires some calculation
                var multiplier = 1;
                if (grid.tab) {
                    multiplier = grid.ctrl ? 10 : 1;
                }
                else {
                    multiplier = (grid.ctrl && grid.shift && grid.alt) ? 10000 : ((grid.ctrl && grid.shift) ? 1000 : (grid.ctrl ? 100 : (grid.shift ? 1 : 10)));
                }
                var offset = clicks * multiplier * cubitsPerRow;
                grid.scrollBy(offset, !grid.tab);
            };
            canvas.onmousedown = null;
            canvas.onmouseup = null;
            canvas.onmousemove = function (mouseMoveEvent) {
                var m = { x: mouseMoveEvent.offsetX, y: mouseMoveEvent.offsetY };
                //if (grid.vScrollbar)
                //{
                //	if (grid.vScrollbar.handle.contains(m))
                //	{
                //		grid.vScrollbar.hovered = true;
                //		grid.draw();
                //		canvas.onmousedown = function(mouseDownEvent) {
                //			var anchor: Point = { x : mouseDownEvent.offsetX , y : mouseDownEvent.offsetY };
                //			canvas.onmouseup = function(mouseUpEvent) { grid.setMouseHandles(); };
                //			canvas.onmousemove = function(mouseDragEvent) {
                //				var cursor: Point = { x : mouseDragEvent.offsetX , y : mouseDragEvent.offsetY };
                //				// drag it
                //			};
                //		};
                //		
                //		return;
                //	}
                //	
                //	if (grid.vScrollbar.hovered) { grid.vScrollbar.hovered = false; grid.draw(); }
                //}
                var x0 = grid.xs[0];
                var x1 = grid.xs[1];
                var y0 = grid.ys[0];
                var y1 = grid.ys[1];
                var xn = grid.xs[grid.xs.length - 1];
                var yn = grid.ys[grid.ys.length - 1];
                //// move grid - handle is top and left borders of the title cell
                //if ((y0 - 1 <= m.y && m.y <= y0 + 1 && x0 <= m.x && m.x < x1) || (x0 - 1 <= m.x && m.x <= x0 + 1 && y0 <= m.y && m.y < y1))
                //{
                //	canvas.style.cursor = 'move';
                //	return;
                //}
                //
                //// reorder rows/cols - top and left borders of grid, excepting the title cell
                //if ((y0 - 1 <= m.y && m.y <= y0 + 1 && x1 <= m.x && m.x <= xn) || (x0 - 1 <= m.x && m.x <= x0 + 1 && y1 <= m.y && m.y <= yn))
                //{
                //	canvas.style.cursor = 'hand';
                //	return;
                //}
                // row resize
                if (x0 < m.x && m.x < x1) {
                    for (var i = 0; i < grid.ys.length - 1; i++) {
                        var y = grid.ys[i + 1];
                        if (y - 1 <= m.y && m.y <= y + 1) {
                            canvas.style.cursor = 'row-resize';
                            var prevY = grid.ys[i];
                            canvas.onmousedown = function (mouseDownEvent) {
                                var oldRowHeight = grid.rowHeight;
                                canvas.onmouseup = function (mouseUpEvent) {
                                    grid.resizeRow(oldRowHeight, grid.rowHeight);
                                    grid.setMouseHandles();
                                };
                                canvas.onmousemove = function (mouseDragEvent) {
                                    var curr = { x: mouseDragEvent.offsetX, y: mouseDragEvent.offsetY };
                                    var newsize = Math.max(curr.y - prevY, 2);
                                    grid.rowHeight = newsize;
                                    grid.draw();
                                };
                            };
                            return;
                        }
                    }
                }
                // col resize
                if (y0 < m.y && m.y < y1) {
                    for (var j = 1; j < grid.xs.length; j++) {
                        var x = grid.xs[j];
                        if (x - 1 <= m.x && m.x <= x + 1) {
                            canvas.style.cursor = 'col-resize';
                            var prevX = grid.xs[j - 1];
                            var colToResize = j - 1;
                            canvas.onmousedown = function (mouseDownEvent) {
                                var oldColWidth = grid.visibleCols[colToResize].data.width;
                                var newColWidth = 0;
                                canvas.onmouseup = function (mouseUpEvent) {
                                    grid.resizeCol(grid.visibleCols[colToResize].data, oldColWidth, newColWidth);
                                    grid.setMouseHandles();
                                };
                                canvas.onmousemove = function (mouseDragEvent) {
                                    var curr = { x: mouseDragEvent.offsetX, y: mouseDragEvent.offsetY };
                                    newColWidth = Math.max(curr.x - prevX, 2);
                                    if (colToResize == 0) {
                                        grid.rowHeaderWidth = newColWidth;
                                    }
                                    else {
                                        for (var k = 1; k < grid.visibleCols.length; k++) {
                                            if (k == colToResize) {
                                                grid.visibleCols[k].data.width = newColWidth;
                                            }
                                        }
                                    }
                                    grid.draw();
                                };
                            };
                            return;
                        }
                    }
                }
                // cells
                if (x0 < m.x && m.x < xn && y0 < m.y && m.y < yn) {
                    canvas.style.cursor = 'cell';
                    canvas.onmousedown = function (mouseDownEvent) {
                        var a = { x: mouseDownEvent.offsetX, y: mouseDownEvent.offsetY };
                        var target = grid.pointToRowCol(a.x, a.y);
                        if (target.row == null && target.col == null) {
                            return;
                        } // cannot select top-left cell
                        grid.anchor.row = target.row;
                        grid.anchor.col = target.col;
                        grid.cursor.row = target.row;
                        grid.cursor.col = target.col;
                        grid.selected = { minCol: null, maxCol: null, minRow: null, maxRow: null };
                        grid.selectCell();
                        var savedScrollTop = document.getElementById('cells-container').scrollTop;
                        grid.ctx.canvas.focus();
                        document.getElementById('cells-container').scrollTop = savedScrollTop;
                        if (mouseDownEvent.button == 0) {
                            canvas.onmousemove = function (mouseDragEvent) {
                                var d = { x: mouseDragEvent.offsetX, y: mouseDragEvent.offsetY };
                                // scroll and continue selecting if we go into the border zones (headers or scrollbar areas, i guess)
                                if (d.x < x1 || d.x > xn || d.y < y1 || d.y > yn) {
                                    return;
                                }
                                // select range of cells
                                var pointedRowCol = grid.pointToRowCol(d.x, d.y);
                                // in theory the pixel guard above should catch this, but we'll do another check here
                                if (pointedRowCol.row === null || pointedRowCol.col === null) {
                                    return;
                                }
                                if (grid.cursor.row != pointedRowCol.row || grid.cursor.col != pointedRowCol.col) {
                                    grid.cursor = pointedRowCol;
                                    grid.selectRange();
                                }
                            };
                            canvas.onmouseup = function (mouseUpEvent) {
                                grid.setMouseHandles();
                            };
                        }
                        else if (mouseDownEvent.button == 2) {
                            // show context menu (which can be an overlaid div)
                            canvas.oncontextmenu = function (contextMenuEvent) {
                                contextMenuEvent.preventDefault();
                                contextMenuEvent.stopPropagation();
                                contextMenuEvent.stopImmediatePropagation();
                            };
                        }
                        else {
                        }
                    };
                    return;
                }
                canvas.style.cursor = 'default';
                canvas.onmousedown = function (mouseDownEvent) { grid.clearSelection(); };
            };
        };
        Grid.prototype.setKeyHandles = function () {
            var grid = this;
            var canvas = grid.ctx.canvas;
            canvas.onkeyup = function (keyUpEvent) {
                var key = keyUpEvent.keyCode;
                if (key == 16) {
                    grid.shift = false;
                }
                else if (key == 17) {
                    grid.ctrl = false;
                }
                else if (key == 18) {
                    grid.alt = false;
                }
                else if (key == 9) {
                    grid.tab = false;
                }
            };
            canvas.onkeydown = function (e) {
                e.preventDefault();
                e.stopPropagation();
                var key = e.keyCode;
                if (key == 16) {
                    grid.shift = true;
                }
                else if (key == 17) {
                    grid.ctrl = true;
                }
                else if (key == 18) {
                    grid.alt = true;
                }
                else if (key == 9) {
                    grid.tab = true;
                }
                if (grid.selected == null) {
                    return;
                }
                if (key == 46) {
                    grid.setRange(null);
                    grid.draw();
                }
                else if (key == 27) {
                    grid.clearSelection();
                    grid.ctx.canvas.onkeydown = null;
                }
                else if (key == 33 || key == 34) {
                    var n = Math.floor((grid.bt - grid.tp) / grid.rowHeight - 1);
                    if (key == 33) {
                        for (var i = 0; i < n; i++) {
                            grid.cursor.row = grid.cursor.row.visiblePrev;
                            if (grid.cursor.row == grid.rows) {
                                grid.cursor.row = grid.rows.visibleNext;
                                break;
                            }
                        }
                    }
                    else {
                        for (var i = 0; i < n; i++) {
                            grid.cursor.row = grid.cursor.row.visibleNext;
                            if (grid.cursor.row == grid.rows) {
                                grid.cursor.row = grid.rows.visiblePrev;
                                break;
                            }
                        }
                    }
                    if (e.shiftKey) {
                        grid.selectRange();
                    }
                    else {
                        grid.selectCell();
                    }
                }
                else if (key == 32) {
                    // SelectRow, SelectCol, SelectWhole do not go through selectRange()
                    // because selectRange reads from cursor/anchor, but we're not actually changing the cursor/anchor here
                    // so the cursor can end up in the middle of a selected range
                    if (e.ctrlKey || e.shiftKey) {
                        if (e.ctrlKey) {
                            grid.selected.minRow = grid.rows.visibleNext;
                            grid.selected.maxRow = grid.rows.visiblePrev;
                        }
                        if (e.shiftKey) {
                            grid.selected.minCol = grid.cols.visibleNext;
                            grid.selected.maxCol = grid.cols.visiblePrev;
                        }
                        grid.draw();
                    }
                    else {
                        grid.beginEdit(null);
                    }
                }
                else if (key == 37 || key == 38 || key == 39 || key == 40) {
                    if (grid.selected.minRow == null && grid.selected.maxRow == null) {
                        if (e.altKey) {
                            if (key == 37) {
                                grid.moveColsLeft();
                            }
                            else if (key == 38) {
                                grid.hideCols();
                            }
                            else if (key == 39) {
                                grid.moveColsRight();
                            }
                            else if (key == 40) {
                                grid.showCols();
                            }
                        }
                        else if (e.ctrlKey && e.shiftKey) {
                            if (key == 38 || key == 40) {
                                var header = grid.cursor.col.data.header;
                                var ascending = (key == 38);
                                // remove existing SortParams if there is a header collision
                                var elt = grid.multisort.next;
                                while (elt != grid.multisort) {
                                    if (elt.data.header == header) {
                                        elt.remove();
                                    }
                                    elt = elt.next;
                                }
                                grid.multisort.add({ header: header, ascending: ascending });
                                grid.setMultisort();
                            }
                        }
                        else if (e.ctrlKey) {
                            if (key == 37) {
                            }
                            else if (key == 39) {
                            }
                            else if (key == 38 || key == 40) {
                                var header = grid.cursor.col.data.header;
                                var ascending = (key == 38);
                                grid.multisort = new GridLinkedList();
                                grid.multisortIndicatorDict = {};
                                grid.setSort({ header: header, ascending: ascending });
                            }
                        }
                        else {
                            if (key == 37 || key == 39) {
                                if (key == 37) {
                                    if (grid.cursor.col.visiblePrev != grid.cols) {
                                        grid.cursor.col = grid.cursor.col.visiblePrev;
                                    }
                                }
                                else if (key == 39) {
                                    if (grid.cursor.col.visibleNext != grid.cols) {
                                        grid.cursor.col = grid.cursor.col.visibleNext;
                                    }
                                }
                                if (e.shiftKey) {
                                    grid.selectRange();
                                }
                                else {
                                    grid.selectCell();
                                }
                            }
                            else if (key == 38) {
                            }
                            else if (key == 40) {
                                if (e.shiftKey) {
                                }
                                else {
                                    grid.cursor.row = grid.rows.visibleNext;
                                    grid.selectCell();
                                }
                            }
                        }
                    }
                    else if (grid.selected.minCol == null && grid.selected.maxCol == null) {
                        if (e.altKey) {
                            if (key == 37) {
                                grid.hideRows();
                            }
                            else if (key == 38) {
                                grid.moveRowsUp();
                            }
                            else if (key == 39) {
                                grid.showRows();
                            }
                            else if (key == 40) {
                                grid.moveRowsDown();
                            }
                        }
                        else if (e.ctrlKey) {
                            if (key == 37) {
                            }
                            else if (key == 38) {
                            }
                            else if (key == 39) {
                            }
                            else if (key == 40) {
                            }
                        }
                        else {
                            if (key == 38 || key == 40) {
                                if (key == 38) {
                                    if (grid.cursor.row.visiblePrev != grid.rows) {
                                        grid.cursor.row = grid.cursor.row.visiblePrev;
                                    }
                                }
                                else if (key == 40) {
                                    if (grid.cursor.row.visibleNext != grid.rows) {
                                        grid.cursor.row = grid.cursor.row.visibleNext;
                                    }
                                }
                                if (e.shiftKey) {
                                    grid.selectRange();
                                }
                                else {
                                    grid.selectCell();
                                }
                            }
                            else if (key == 37) {
                            }
                            else if (key == 39) {
                                if (e.shiftKey) {
                                }
                                else {
                                    grid.cursor.col = grid.cols.visibleNext;
                                    grid.selectCell();
                                }
                            }
                        }
                    }
                    else {
                        if (e.altKey) {
                            if (e.shiftKey) {
                                if (key == 37 || key == 39) {
                                    grid.deleteCols();
                                }
                                else if (key == 38 || key == 40) {
                                    grid.deleteRows();
                                }
                            }
                            else {
                                if (key == 37) {
                                    grid.insertColsLeft();
                                }
                                else if (key == 38) {
                                    grid.insertRowsAbove();
                                }
                                else if (key == 39) {
                                    grid.insertColsRight();
                                }
                                else if (key == 40) {
                                    grid.insertRowsBelow();
                                }
                            }
                        }
                        else {
                            if (key == 37) {
                                if (e.ctrlKey) {
                                    // Ctrl breaks the wall to the header cells
                                    if (grid.cursor.col == grid.cols.visibleNext) {
                                        grid.cursor.col = null;
                                    }
                                    else {
                                        grid.cursor.col = grid.cols.visibleNext;
                                    }
                                }
                                else {
                                    if (grid.cursor.col.visiblePrev != grid.cols) {
                                        grid.cursor.col = grid.cursor.col.visiblePrev;
                                    }
                                }
                            }
                            else if (key == 38) {
                                if (e.ctrlKey) {
                                    // Ctrl breaks the wall to the header cells
                                    if (grid.cursor.row == grid.rows.visibleNext) {
                                        grid.cursor.row = null;
                                    }
                                    else {
                                        grid.cursor.row = grid.rows.visibleNext;
                                    }
                                }
                                else {
                                    if (grid.cursor.row.visiblePrev != grid.rows) {
                                        grid.cursor.row = grid.cursor.row.visiblePrev;
                                    }
                                }
                            }
                            else if (key == 39) {
                                if (e.ctrlKey) {
                                    grid.cursor.col = grid.cols.visiblePrev;
                                }
                                else {
                                    if (grid.cursor.col.visibleNext != grid.cols) {
                                        grid.cursor.col = grid.cursor.col.visibleNext;
                                    }
                                }
                            }
                            else if (key == 40) {
                                if (e.ctrlKey) {
                                    grid.cursor.row = grid.rows.visiblePrev;
                                }
                                else {
                                    if (grid.cursor.row.visibleNext != grid.rows) {
                                        grid.cursor.row = grid.cursor.row.visibleNext;
                                    }
                                }
                            }
                            if (e.shiftKey) {
                                grid.selectRange();
                            }
                            else {
                                grid.selectCell();
                            }
                        }
                    }
                }
                else if (key == 113) {
                    grid.beginEdit(null);
                }
                else if (key == 114 || key == 115 || key == 116 || key == 117) {
                    grid.beginEditArray(['tsv', 'csv', 'json', 'yaml'][key - 114]);
                }
                else if ((48 <= key && key <= 57) || (65 <= key && key <= 90) || (186 <= key && key <= 192) || (219 <= key && key <= 222)) {
                    if (e.ctrlKey) {
                        if (key == 67 || key == 88) {
                            grid.copied = grid.copy(key == 88);
                        }
                        else if (key == 86) {
                            grid.paste();
                        }
                        else if (key == 70) {
                            grid.editMode = 'formula';
                            grid.beginEdit(null);
                        }
                        else if (key == 82) {
                            grid.editMode = 'format';
                            grid.beginEdit(null);
                        }
                        else if (key == 83) {
                            grid.editMode = 'style';
                            grid.beginEdit(null);
                        }
                        else if (key == 76) {
                            grid.editMode = 'filter';
                            grid.beginEdit(null);
                        }
                    }
                    else {
                        var c = KeyToChar(key, grid.shift);
                        grid.beginEdit(c);
                    }
                }
                else {
                }
            };
        };
        Grid.prototype.copy = function (cut) {
            var grid = this;
            return {
                minRow: grid.selected.minRow,
                maxRow: grid.selected.maxRow,
                minCol: grid.selected.minCol,
                maxCol: grid.selected.maxCol
            };
        };
        Grid.prototype.paste = function () {
            var grid = this;
            if (grid.copied == null) {
                return;
            }
            if (grid.cursor.row == grid.anchor.row && grid.cursor.col == grid.anchor.col) {
                // copy values to cursor - loop over src, guard for row/col length overflows
                // (this is not the time to add new rows/cols - we do that when pasting in external data via textarea)
                var srcRow = grid.copied.minRow;
                var dstRow = grid.cursor.row;
                while (srcRow != grid.copied.maxRow.visibleNext) {
                    var srcCol = grid.copied.minCol;
                    var dstCol = grid.cursor.col;
                    while (srcCol != grid.copied.maxCol.visibleNext) {
                        dstRow.data.object[dstCol.data.header] = srcRow.data.object[srcCol.data.header];
                        srcCol = srcCol.visibleNext;
                        dstCol = dstCol.visibleNext;
                    }
                    srcRow = srcRow.visibleNext;
                    dstRow = dstRow.visibleNext;
                }
            }
            else {
                // copy values to range - loop over dst, modulo the index into the src
                var srcRow = grid.copied.minRow;
                var dstRow = grid.selected.minRow;
                while (dstRow != grid.selected.maxRow.visibleNext) {
                    var srcCol = grid.copied.minCol;
                    var dstCol = grid.selected.minCol;
                    while (dstCol != grid.selected.maxCol.visibleNext) {
                        dstRow.data.object[dstCol.data.header] = srcRow.data.object[srcCol.data.header];
                        srcCol = srcCol.visibleNext;
                        dstCol = dstCol.visibleNext;
                        if (srcCol == grid.copied.maxCol.visibleNext) {
                            srcCol = grid.copied.minCol;
                        } // toroidal wraparound
                    }
                    srcRow = srcRow.visibleNext;
                    dstRow = dstRow.visibleNext;
                    if (srcRow == grid.copied.maxRow.visibleNext) {
                        srcRow = grid.copied.minRow;
                    } // toroidal wraparound
                }
            }
            if (grid.copied.mode == 'cut') {
                grid.setRangeGeneral(null, grid.copied);
                grid.copied = null;
            }
            grid.calculate();
            grid.dataComponent.runAfterChange();
            grid.dataComponent.markDirty();
            grid.draw();
        };
        Grid.prototype.scrollBy = function (offset, rows) {
            var grid = this;
            if (rows) {
                grid.yOffset = 0;
                if (offset < 0) {
                    while (offset < 0) {
                        grid.scroll.minRow = grid.scroll.minRow.visibleNext;
                        grid.scroll.maxRow = grid.scroll.maxRow.visibleNext;
                        if (grid.scroll.maxRow == grid.rows) {
                            grid.scroll.minRow = grid.scroll.minRow.visiblePrev;
                            grid.scroll.maxRow = grid.scroll.maxRow.visiblePrev;
                            grid.calcMinRowFromMaxRow(); // we just need to calculate the new yOffset here
                            break;
                        }
                        offset++;
                    }
                }
                else if (offset > 0) {
                    while (offset > 0) {
                        grid.scroll.minRow = grid.scroll.minRow.visiblePrev;
                        grid.scroll.maxRow = grid.scroll.maxRow.visiblePrev;
                        if (grid.scroll.minRow == grid.rows) {
                            grid.scroll.minRow = grid.scroll.minRow.visibleNext;
                            grid.scroll.maxRow = grid.scroll.maxRow.visibleNext;
                            break;
                        }
                        offset--;
                    }
                }
            }
            else {
                grid.xOffset = 0;
                if (offset < 0) {
                    while (offset < 0) {
                        grid.scroll.minCol = grid.scroll.minCol.visibleNext;
                        grid.scroll.maxCol = grid.scroll.maxCol.visibleNext;
                        if (grid.scroll.maxCol == grid.cols) {
                            grid.scroll.minCol = grid.scroll.minCol.visiblePrev;
                            grid.scroll.maxCol = grid.scroll.maxCol.visiblePrev;
                            grid.calcMinColFromMaxCol(); // we just need to calculate the new xOffset here
                            break;
                        }
                        offset++;
                    }
                }
                else if (offset > 0) {
                    while (offset > 0) {
                        grid.scroll.minCol = grid.scroll.minCol.visiblePrev;
                        grid.scroll.maxCol = grid.scroll.maxCol.visiblePrev;
                        if (grid.scroll.minCol == grid.cols) {
                            grid.scroll.minCol = grid.scroll.minCol.visibleNext;
                            grid.scroll.maxCol = grid.scroll.maxCol.visibleNext;
                            break;
                        }
                        offset--;
                    }
                }
            }
            grid.draw();
        };
        Grid.prototype.resizeRow = function (oldsize, newsize) {
            var grid = this;
            //var event = { type: 'resizeRow', oldsize: oldsize, newsize: newsize };
            grid.dataComponent.markDirty();
        };
        Grid.prototype.resizeCol = function (col, oldsize, newsize) {
            var grid = this;
            //var event = { type: 'resizeCol', header: col.header, oldsize: oldsize, newsize: newsize };
            grid.dataComponent.markDirty();
        };
        Grid.prototype.beginEdit = function (c) {
            var grid = this;
            var current = '';
            var row = grid.cursor.row;
            var col = grid.cursor.col;
            if (grid.editMode == 'value') {
                if (row == null) {
                    current = col.data.header;
                }
                else {
                    var value = grid.dataComponent.data[row.data.index][col.data.header];
                    current = ((value === null) ? '' : value.toString());
                }
            }
            else if (grid.editMode == 'formula') {
                current = col.data.formula;
            }
            else if (grid.editMode == 'format') {
                current = col.data.format;
            }
            else if (grid.editMode == 'style') {
                current = col.data.style;
            }
            else if (grid.editMode == 'filter') {
                current = grid.filter;
            }
            var lf = 0;
            var tp = 0;
            var rt = 0;
            var bt = 0;
            for (var i = 0; i < grid.visibleRows.length; i++) {
                if (grid.visibleRows[i] == grid.cursor.row) {
                    tp = grid.ys[i];
                }
            }
            for (var j = 0; j < grid.visibleCols.length; j++) {
                if (grid.visibleCols[j] == grid.cursor.col) {
                    lf = grid.xs[j];
                }
            }
            grid.input.value = (c ? c : current);
            grid.input.style.display = 'block';
            grid.input.style.top = (tp - grid.ctx.canvas.height - 5).toString() + 'px';
            grid.input.style.left = lf.toString() + 'px';
            grid.input.style.width = (grid.cursor.col.data.width - 1).toString() + 'px';
            grid.input.style.height = (grid.rowHeight - 1).toString() + 'px';
            grid.input.focus();
            grid.setEditHandlers();
        };
        Grid.prototype.beginEditArray = function (format) {
            var grid = this;
            // what if the selection starts off-screen?
            // we should probably scroll to the top-left
            /*
            
            var lf = grid.xs[grid.selected.minCol];
            var rt = grid.xs[grid.selected.maxCol+1];
            var tp = grid.ys[grid.selected.minRow];
            var bt = grid.ys[grid.selected.maxRow+1];
            
            //var savedData = grid.dataComponent.data;
            //grid.dataComponent.data = grid.getSelectionData();
            //var text = grid.dataComponent.get({format:format});
            //grid.dataComponent.data = savedData;
            var data: string[][] = grid.getSelectionData();
            var text: string = data.map(function(row) { return row.join('\t'); }).join('\n');
            
            grid.textarea.value = text;
            grid.textarea.style.display = 'block';
            grid.textarea.style.top = (tp - grid.ctx.canvas.height).toString() + 'px';
            grid.textarea.style.left = lf.toString() + 'px';
            grid.textarea.style.height = (bt - tp).toString() + 'px';
            grid.textarea.style.width = (rt - lf).toString() + 'px';
            grid.textarea.focus();
            grid.textarea.select();
            
            function ClearEdit() {
                grid.textarea.value = '';
                grid.textarea.style.display = 'none';
                var savedScrollTop = document.getElementById('cells-container').scrollTop;
                grid.ctx.canvas.focus();
                document.getElementById('cells-container').scrollTop = savedScrollTop;
            }
            
            grid.textarea.onkeydown = function(e: KeyboardEvent) {
                
                var key: number = e.keyCode;
                
                if (key == 27) // esc
                {
                    ClearEdit();
                }
                else if (key == 13) // return - accepting the edit on return is not great, because people will use return while editing
                {
                    var text = grid.textarea.value;
                    var matrix = text.trim().split('\n').map(function(line) { return line.split('\t'); });
                    
                    // parse format, stretch or shrink grid if appropriate, otherwise reject edit if dimensions are not correct
                    // then set individual cells
                    
                    // we need the Data component to parse format
                    
                    //var newdata: any = ParseFormat(grid.textarea.value, format);
                    
                    for (var i = 0; i < matrix.length; i++)
                    {
                        for (var j = 0; j < matrix[i].length; j++)
                        {
                            var row = grid.selected.minRow + i;
                            var col = grid.selected.minCol + j;
                            
                            if (row >= grid.nRows || col >= grid.nCols) { continue; } // or add rows/cols to fit?
                            
                            // this needs to be merged with the mainstream acceptEdit function
                            
                            var str = matrix[i][j];
                            var cell = grid.cells[row][col];
                            
                            if (str.length > 0 && str[0] == '=')
                            {
                                //cell.formula = str;
                                //
                                //var formula: string = str.substr(1);
                                //var fn = new Function('i', 'return ' + formula);
                                //var result: any = fn.apply(grid.cellArray, [i-1]);
                                //cell.value = result;
                            }
                            else
                            {
                                cell.value = ParseStringToObj(str);
                            }
                            
                            cell.string = Format(cell.value, cell.formatObject);
                            
                            grid.dataComponent.data[row-1][grid.dataComponent.headers[col-1]] = cell.value;
                        }
                    }
                    
                    grid.dataComponent.runAfterChange();
                    
                    grid.draw();
                    
                    ClearEdit();
                }
            };
            
            */
        };
        Grid.prototype.setEditHandlers = function () {
            var grid = this;
            grid.input.onkeydown = function (e) {
                var key = e.keyCode;
                if (key == 27) {
                    grid.rejectEdit();
                }
                else if (key == 13) {
                    grid.acceptEdit();
                }
            };
        };
        Grid.prototype.rejectEdit = function () {
            var grid = this;
            grid.clearEdit();
        };
        Grid.prototype.acceptEdit = function () {
            var grid = this;
            var str = grid.input.value;
            var row = grid.cursor.row;
            var col = grid.cursor.col;
            if (row == null && col == null) {
            }
            else if (col == null) {
            }
            else if (row == null) {
                if (col.data.header == str) {
                    return;
                } // no change, no need to do anything
                var headers = grid.cols.enumerate().map(function (col) { return col.header; });
                if (headers.indexOf(str) > -1) {
                    return;
                } // collision, bail
                var oldfield = col.data.header;
                col.data.header = str;
                for (var i = 0; i < grid.dataComponent.data.length; i++) {
                    var obj = grid.dataComponent.data[i];
                    obj[str] = obj[oldfield];
                    delete obj[oldfield];
                }
                // change headers in the data component
                for (var k = 0; k < grid.dataComponent.headers.length; k++) {
                    if (grid.dataComponent.headers[k] == oldfield) {
                        grid.dataComponent.headers[k] = str;
                    }
                }
                // change multisort headers
                var sortParams = grid.multisort.enumerate();
                for (var k = 0; k < sortParams.length; k++) {
                    if (sortParams[k].header == oldfield) {
                        sortParams[k].header = str;
                    }
                }
                grid.multisortIndicatorDict[str] = grid.multisortIndicatorDict[oldfield];
                delete grid.multisortIndicatorDict[oldfield];
                // change formulas that reference the old field name?
                grid.calculate();
                grid.dataComponent.runAfterChange();
                grid.dataComponent.markDirty();
            }
            else {
                if (grid.editMode == 'value') {
                    // set formula/value on all cells in selection
                    var value = ParseStringToObj(str);
                    grid.setRange(value);
                }
                else if (grid.editMode == 'formula') {
                    col.data.setFormula(str);
                    grid.calculate();
                    grid.dataComponent.runAfterChange();
                    grid.editMode = 'value';
                }
                else if (grid.editMode == 'format') {
                    col.data.setFormat(str);
                    grid.editMode = 'value';
                }
                else if (grid.editMode == 'style') {
                    col.data.setStyle(str);
                    grid.editMode = 'value';
                }
                else if (grid.editMode == 'filter') {
                    grid.setFilter(str);
                    grid.editMode = 'value';
                }
            }
            grid.draw();
            grid.clearEdit();
        };
        Grid.prototype.clearEdit = function () {
            var grid = this;
            grid.input.value = '';
            grid.input.style.display = 'none';
            grid.shift = false;
            grid.ctrl = false;
            grid.alt = false;
            grid.tab = false;
            var savedScrollTop = document.getElementById('cells-container').scrollTop;
            grid.ctx.canvas.focus();
            document.getElementById('cells-container').scrollTop = savedScrollTop;
        };
        Grid.prototype.getSelectionData = function () {
            var grid = this;
            var data = [];
            var selection = grid.selected;
            var row = selection.minRow;
            var col = selection.minCol;
            var datarow = [];
            datarow.push(row.data.object[col.data.header].toString()); // format appropriately
            while (col != selection.maxCol) {
                col = col.visibleNext;
                datarow.push(row.data.object[col.data.header].toString()); // format appropriately
            }
            while (row != selection.maxRow) {
                row = row.visibleNext;
                data.push(datarow);
                datarow = [];
                col = selection.minCol;
                datarow.push(row.data.object[col.data.header].toString()); // format appropriately
                while (col != selection.maxCol) {
                    col = col.visibleNext;
                    datarow.push(row.data.object[col.data.header].toString()); // format appropriately
                }
            }
            return data;
        };
        Grid.prototype.selectCell = function () {
            var grid = this;
            grid.anchor.row = grid.cursor.row;
            grid.anchor.col = grid.cursor.col;
            grid.selected.minRow = grid.cursor.row;
            grid.selected.maxRow = grid.cursor.row;
            grid.selected.minCol = grid.cursor.col;
            grid.selected.maxCol = grid.cursor.col;
            // aria
            var row = grid.cursor.row.data;
            var col = grid.cursor.col.data;
            var addr = col.header + ' ' + row.index.toString();
            var text = Format(row.object[col.header], col.format);
            grid.ctx.canvas.setAttribute('aria-label', addr + ' ' + text);
            grid.adjustScroll();
            grid.draw();
        };
        Grid.prototype.selectRange = function () {
            var grid = this;
            grid.selected.minRow = ((grid.cursor.row === null) ? null : ((grid.cursor.row.data.index < grid.anchor.row.data.index) ? grid.cursor.row : grid.anchor.row));
            grid.selected.maxRow = ((grid.cursor.row === null) ? null : ((grid.cursor.row.data.index > grid.anchor.row.data.index) ? grid.cursor.row : grid.anchor.row));
            grid.selected.minCol = ((grid.cursor.col === null) ? null : ((grid.cursor.col.data.index < grid.anchor.col.data.index) ? grid.cursor.col : grid.anchor.col));
            grid.selected.maxCol = ((grid.cursor.col === null) ? null : ((grid.cursor.col.data.index > grid.anchor.col.data.index) ? grid.cursor.col : grid.anchor.col));
            // aria
            var minrow = grid.selected.minRow.data;
            var mincol = grid.selected.minCol.data;
            var maxrow = grid.selected.maxRow.data;
            var maxcol = grid.selected.maxCol.data;
            var range = mincol.header + minrow.index.toString() + ' to ' + maxcol.header + maxrow.index.toString();
            grid.ctx.canvas.setAttribute('aria-label', range);
            grid.adjustScroll();
            grid.draw();
        };
        Grid.prototype.clearSelection = function () {
            var grid = this;
            grid.input.style.display = 'none';
            grid.selected = null;
            grid.cursor.row = null;
            grid.cursor.col = null;
            grid.anchor.row = null;
            grid.anchor.col = null;
            grid.draw();
        };
        Grid.prototype.adjustScroll = function () {
            var grid = this;
            if (grid.cursor.row != null) {
                if (grid.cursor.row.data.index < grid.scroll.minRow.data.index) {
                    grid.scroll.minRow = grid.cursor.row;
                    grid.calcMaxRowFromMinRow();
                    grid.yOffset = 0;
                }
                if (grid.cursor.row.data.index > grid.scroll.maxRow.data.index) {
                    grid.scroll.maxRow = grid.cursor.row;
                    grid.yOffset = grid.calcMinRowFromMaxRow();
                }
            }
            if (grid.cursor.col != null) {
                if (grid.cursor.col.data.index < grid.scroll.minCol.data.index) {
                    grid.scroll.minCol = grid.cursor.col;
                    grid.calcMaxColFromMinCol();
                    grid.xOffset = 0;
                }
                if (grid.cursor.col.data.index > grid.scroll.maxCol.data.index) {
                    grid.scroll.maxCol = grid.cursor.col;
                    grid.xOffset = grid.calcMinColFromMaxCol();
                }
            }
        };
        Grid.prototype.calcMaxRowFromMinRow = function () {
            var grid = this;
            var rowElt = grid.scroll.minRow;
            var y = grid.tp + grid.rowHeight;
            y += grid.rowHeight;
            //y -= grid.yOffset; // a one-time correction
            while (y < grid.bt) {
                y += grid.rowHeight;
                rowElt = rowElt.visibleNext;
                if (rowElt == grid.rows) {
                    rowElt = rowElt.visiblePrev;
                    break;
                }
            }
            grid.scroll.maxRow = rowElt;
        };
        Grid.prototype.calcMaxColFromMinCol = function () {
            var grid = this;
            var colElt = grid.scroll.minCol;
            var x = grid.lf + grid.rowHeaderWidth;
            x += colElt.data.width;
            //x -= grid.xOffset; // a one-time correction
            while (x < grid.rt) {
                x += colElt.data.width;
                colElt = colElt.visibleNext;
                if (colElt == grid.cols) {
                    colElt = colElt.visiblePrev;
                    break;
                }
            }
            grid.scroll.maxCol = colElt;
        };
        Grid.prototype.calcMinRowFromMaxRow = function () {
            var grid = this;
            var rowElt = grid.scroll.maxRow;
            var y = grid.bt;
            y -= grid.rowHeight;
            //y += grid.yOffset; // a one-time correction
            while (y > (grid.tp + grid.rowHeight)) {
                y -= grid.rowHeight;
                rowElt = rowElt.visiblePrev;
                if (rowElt == grid.rows) {
                    rowElt = rowElt.visibleNext;
                    break;
                }
            }
            grid.scroll.minRow = rowElt;
            var yOffset = (grid.tp + grid.rowHeight) - y;
            grid.yOffset = yOffset;
            return yOffset;
        };
        Grid.prototype.calcMinColFromMaxCol = function () {
            var grid = this;
            var colElt = grid.scroll.maxCol;
            var x = grid.rt;
            x -= colElt.data.width;
            //x += grid.xOffset; // a one-time correction
            while (x > (grid.lf + grid.rowHeaderWidth)) {
                x -= colElt.data.width;
                colElt = colElt.visiblePrev;
                if (colElt == grid.cols) {
                    colElt = colElt.visibleNext;
                    break;
                }
            }
            grid.scroll.minCol = colElt;
            var xOffset = (grid.lf + grid.rowHeaderWidth) - x;
            grid.xOffset = xOffset;
            return xOffset;
        };
        Grid.prototype.setRange = function (value) {
            var grid = this;
            grid.setRangeGeneral(value, grid.selected);
        };
        Grid.prototype.setRangeGeneral = function (value, sel) {
            // this should replace selectRange above
            var grid = this;
            var rowElt = sel.minRow;
            while (rowElt.visiblePrev != sel.maxRow) {
                var colElt = sel.minCol;
                while (colElt.visiblePrev != sel.maxCol) {
                    var index = rowElt.data.index;
                    var field = colElt.data.header;
                    grid.dataComponent.data[index][field] = value;
                    colElt = colElt.visibleNext;
                }
                rowElt = rowElt.visibleNext;
            }
            // mark affected columns as uncalculated, calculate, and trigger afterchange
            EnumerateVisible(sel.minCol, sel.maxCol).map(function (col) { col.markUncalculated(); });
            grid.calculate();
            grid.dataComponent.runAfterChange();
            grid.dataComponent.markDirty();
        };
        Grid.prototype.insertRowsAbove = function () { var grid = this; grid.insertRows(true); };
        Grid.prototype.insertRowsBelow = function () { var grid = this; grid.insertRows(false); };
        Grid.prototype.insertColsLeft = function () { var grid = this; grid.insertCols(true); };
        Grid.prototype.insertColsRight = function () { var grid = this; grid.insertCols(false); };
        Grid.prototype.moveRowsUp = function () { var grid = this; grid.moveRows(-1); };
        Grid.prototype.moveRowsDown = function () { var grid = this; grid.moveRows(1); };
        Grid.prototype.moveColsLeft = function () { var grid = this; grid.moveCols(-1); };
        Grid.prototype.moveColsRight = function () { var grid = this; grid.moveCols(1); };
        Grid.prototype.insertRows = function (bAbove) {
            var grid = this;
            var sel = grid.selected;
            var n = CountVisible(sel.minRow, sel.maxRow);
            var headers = grid.cols.enumerate().map(function (col) { return col.header; });
            if (bAbove) {
                var cursor = sel.minRow;
                var prev = sel.minRow.prev;
                var visiblePrev = sel.minRow.visiblePrev;
                for (var i = 0; i < n; i++) {
                    var obj = {};
                    for (var k = 0; k < headers.length; k++) {
                        obj[headers[k]] = null;
                    }
                    var row = new Row(-1, obj);
                    var elt = new HiddenList();
                    elt.data = row;
                    elt.next = cursor;
                    cursor.prev = elt;
                    elt.visibleNext = cursor;
                    cursor.visiblePrev = elt;
                    cursor = elt;
                }
                cursor.prev = prev;
                prev.next = cursor;
                cursor.visiblePrev = visiblePrev;
                visiblePrev.visibleNext = cursor;
                grid.reIndex(cursor, grid.rows);
                grid.cursor.row = cursor;
                grid.anchor.row = sel.minRow.prev;
            }
            else {
                var cursor = sel.maxRow;
                var next = sel.maxRow.next;
                var visibleNext = sel.maxRow.visibleNext;
                for (var i = 0; i < n; i++) {
                    var obj = {};
                    for (var k = 0; k < headers.length; k++) {
                        obj[headers[k]] = null;
                    }
                    var row = new Row(-1, obj);
                    var elt = new HiddenList();
                    elt.data = row;
                    elt.prev = cursor;
                    cursor.next = elt;
                    elt.visiblePrev = cursor;
                    cursor.visibleNext = elt;
                    cursor = elt;
                }
                cursor.next = next;
                next.prev = cursor;
                cursor.visibleNext = visibleNext;
                visibleNext.visiblePrev = cursor;
                grid.reIndex(sel.maxRow.next, grid.rows);
                grid.anchor.row = sel.maxRow.next;
                grid.cursor.row = cursor;
            }
            grid.calcMaxRowFromMinRow();
            grid.selectRange();
            grid.dataComponent.data = grid.rows.enumerate().map(function (row) { return row.object; });
            grid.cols.enumerate().forEach(function (col) { col.calculated = false; });
            grid.calculate();
            grid.dataComponent.runAfterChange();
            grid.dataComponent.markDirty();
        };
        Grid.prototype.insertCols = function (bLeft) {
            var grid = this;
            var sel = grid.selected;
            var n = CountVisible(sel.minCol, sel.maxCol);
            var headers = grid.cols.enumerate().map(function (col) { return col.header; });
            // generate new field names
            var newheaders = [];
            var suffix = 0;
            for (var j = 0; j < n; j++) {
                var header = 'field' + suffix.toString();
                while (headers.indexOf(header) > -1) {
                    suffix++;
                    header = 'field' + suffix.toString();
                }
                newheaders.push(header);
                suffix++;
            }
            // add the new fields to the objs
            var rowElt = grid.rows.next;
            while (rowElt != grid.rows) {
                for (var k = 0; k < newheaders.length; k++) {
                    rowElt.data.object[newheaders[k]] = null;
                }
                rowElt = rowElt.next;
            }
            if (bLeft) {
                var cursor = sel.minCol;
                var prev = sel.minCol.prev;
                var visiblePrev = sel.minCol.visiblePrev;
                for (var i = 0; i < n; i++) {
                    var col = new Col(grid, { header: newheaders[i], visible: true, width: 64, formula: '', format: null, style: null }, -1);
                    var elt = new HiddenList();
                    elt.data = col;
                    elt.next = cursor;
                    cursor.prev = elt;
                    elt.visibleNext = cursor;
                    cursor.visiblePrev = elt;
                    cursor = elt;
                }
                cursor.prev = prev;
                prev.next = cursor;
                cursor.visiblePrev = visiblePrev;
                visiblePrev.visibleNext = cursor;
                grid.reIndex(cursor, grid.cols);
                grid.cursor.col = cursor;
                grid.anchor.col = sel.minCol.prev;
            }
            else {
                var cursor = sel.maxCol;
                var next = sel.maxCol.next;
                var visibleNext = sel.maxCol.visibleNext;
                for (var i = 0; i < n; i++) {
                    var col = new Col(grid, { header: newheaders[i], visible: true, width: 64, formula: '', format: null, style: null }, -1);
                    var elt = new HiddenList();
                    elt.data = col;
                    elt.prev = cursor;
                    cursor.next = elt;
                    elt.visiblePrev = cursor;
                    cursor.visibleNext = elt;
                    cursor = elt;
                }
                cursor.next = next;
                next.prev = cursor;
                cursor.visibleNext = visibleNext;
                visibleNext.visiblePrev = cursor;
                grid.reIndex(sel.maxCol.next, grid.cols);
                grid.anchor.col = sel.maxCol.next;
                grid.cursor.col = cursor;
            }
            grid.calcMaxColFromMinCol();
            grid.selectRange();
            grid.dataComponent.headers = grid.cols.enumerate().map(function (col) { return col.header; });
            grid.calculate();
            grid.dataComponent.runAfterChange();
            grid.dataComponent.markDirty();
        };
        Grid.prototype.deleteRows = function () {
            var grid = this;
            var sel = grid.selected;
            // disallow deletion of all visible rows
            if (sel.minRow.visiblePrev == grid.rows && sel.maxRow.visibleNext == grid.rows) {
                return;
            }
            // delete data - we're not going to do this now - just re-enumerate the objects on display change or Get
            //var k = sel.minRow.data.index;
            //var n = sel.maxRow.data.index - sel.minRowdata.index + 1;
            //var deleted = grid.dataComponent.data.splice(k-1, n);
            // splice linked list
            sel.minRow.prev.next = sel.maxRow.next;
            sel.maxRow.next.prev = sel.minRow.prev;
            sel.minRow.visiblePrev.visibleNext = sel.maxRow.visibleNext;
            sel.maxRow.visibleNext.visiblePrev = sel.minRow.visiblePrev;
            var remaining = sel.minRow.visiblePrev;
            if (remaining == grid.rows) {
                remaining = remaining.visibleNext;
            }
            grid.reIndex(remaining, grid.rows);
            grid.calcMaxRowFromMinRow();
            // reposition cursor - could be prev or next depending on Shift+Alt+Up vs Shift+Alt+Down
            grid.anchor.row = remaining;
            grid.cursor.row = remaining;
            grid.selectRange();
            grid.dataComponent.data = grid.rows.enumerate().map(function (row) { return row.object; });
            grid.cols.enumerate().forEach(function (col) { col.calculated = false; });
            grid.calculate();
            grid.dataComponent.runAfterChange();
            grid.dataComponent.markDirty();
        };
        Grid.prototype.deleteCols = function () {
            var grid = this;
            var sel = grid.selected;
            // disallow deletion of all visible cols
            if (sel.minCol.visiblePrev == grid.cols && sel.maxCol.visibleNext == grid.cols) {
                return;
            }
            var deletedCols = Enumerate(sel.minCol, sel.maxCol);
            // delete data
            var headers = deletedCols.map(function (col) { return col.header; });
            var elt = grid.rows.next;
            while (elt != grid.rows) {
                for (var k = 0; k < headers.length; k++) {
                    delete elt.data.object[headers[k]];
                }
                elt = elt.next;
            }
            // tear down srcs/dsts
            for (var i = 0; i < deletedCols.length; i++) {
                var col = deletedCols[i];
                col.srcs.forEach(function (src) { src.dsts.delete(col); });
                col.dsts.forEach(function (dst) {
                    // okay, so what happens to a formula col when a dependency is deleted?
                    dst.srcs.delete(col);
                });
            }
            // splice linked list
            sel.minCol.prev.next = sel.maxCol.next;
            sel.maxCol.next.prev = sel.minCol.prev;
            sel.minCol.visiblePrev.visibleNext = sel.maxCol.visibleNext;
            sel.maxCol.visibleNext.visiblePrev = sel.minCol.visiblePrev;
            // determining where cursor will end up
            var remaining = sel.minCol.visiblePrev;
            if (remaining == grid.cols) {
                remaining = remaining.visibleNext;
            }
            grid.reIndex(remaining, grid.cols);
            grid.dataComponent.headers = grid.cols.enumerate().map(function (col) { return col.header; });
            grid.cols.enumerate().forEach(function (col) { col.calculated = false; });
            grid.calcMaxColFromMinCol();
            // reposition cursor - could be prev or next depending on Shift+Alt+Left vs Shift+Alt+Right
            grid.anchor.col = remaining;
            grid.cursor.col = remaining;
            grid.selectRange();
            grid.calculate();
            grid.dataComponent.runAfterChange();
            grid.dataComponent.markDirty();
        };
        Grid.prototype.moveRows = function (k) {
            var grid = this;
            var sel = grid.selected;
            var min = sel.minRow;
            var max = sel.maxRow;
            var sentinel = grid.rows;
            // check for underflow and overflow
            if (k < 0 && min.visiblePrev == sentinel) {
                return;
            }
            if (k > 0 && max.visibleNext == sentinel) {
                return;
            }
            if (k < 0) {
                // move up/left: min = E, max = F
                // hidden:    B   D     G  
                // visible: A   C   E F   H
                // ------------------------
                // hidden:    B       D G  
                // visible: A   E F C     H
                var E = min;
                var F = max;
                var C = E.visiblePrev;
                var D = E.prev;
                var A = C.visiblePrev;
                var B = C.prev;
                var G = F.next;
                var H = F.visibleNext;
                E.prev = B;
                B.next = E;
                E.visiblePrev = A;
                A.visibleNext = E;
                F.next = C;
                C.prev = F;
                F.visibleNext = C;
                C.visiblePrev = F;
                C.visibleNext = H;
                H.visiblePrev = C;
                D.next = G;
                G.prev = D;
                grid.reIndex(B, sentinel);
            }
            else {
                // move down/right: min = E, max = F
                // hidden:    D     G   I  
                // visible: C   E F   H   J
                // ------------------------
                // hidden:    D G       I  
                // visible: C     H E F   J
                var E = min;
                var F = max;
                var C = E.visiblePrev;
                var D = E.prev;
                var G = F.next;
                var H = F.visibleNext;
                var I = H.next;
                var J = H.visibleNext;
                D.next = G;
                G.prev = D;
                C.visibleNext = H;
                H.visiblePrev = C;
                H.next = E;
                E.prev = H;
                H.visibleNext = E;
                E.visiblePrev = H;
                F.next = I;
                I.prev = F;
                F.visibleNext = J;
                J.visiblePrev = F;
                grid.reIndex(D, sentinel);
            }
            grid.dataComponent.data = grid.rows.enumerate().map(function (row) { return row.object; });
            grid.cols.enumerate().forEach(function (col) { col.calculated = false; });
            grid.calculate();
            grid.draw();
            grid.dataComponent.runAfterChange();
            grid.dataComponent.markDirty();
            // cursor and anchor can stay the same
        };
        Grid.prototype.moveCols = function (k) {
            var grid = this;
            var sel = grid.selected;
            var min = sel.minCol;
            var max = sel.maxCol;
            var sentinel = grid.cols;
            // check for underflow and overflow
            if (k < 0 && min.visiblePrev == sentinel) {
                return;
            }
            if (k > 0 && max.visibleNext == sentinel) {
                return;
            }
            if (k < 0) {
                // move up/left: min = E, max = F
                // hidden:    B   D     G  
                // visible: A   C   E F   H
                // ------------------------
                // hidden:    B       D G  
                // visible: A   E F C     H
                var E = min;
                var F = max;
                var C = E.visiblePrev;
                var D = E.prev;
                var A = C.visiblePrev;
                var B = C.prev;
                var G = F.next;
                var H = F.visibleNext;
                E.prev = B;
                B.next = E;
                E.visiblePrev = A;
                A.visibleNext = E;
                F.next = C;
                C.prev = F;
                F.visibleNext = C;
                C.visiblePrev = F;
                C.visibleNext = H;
                H.visiblePrev = C;
                D.next = G;
                G.prev = D;
                grid.reIndex(B, sentinel);
            }
            else {
                // move down/right: min = E, max = F
                // hidden:    D     G   I  
                // visible: C   E F   H   J
                // ------------------------
                // hidden:    D G       I  
                // visible: C     H E F   J
                var E = min;
                var F = max;
                var C = E.visiblePrev;
                var D = E.prev;
                var G = F.next;
                var H = F.visibleNext;
                var I = H.next;
                var J = H.visibleNext;
                D.next = G;
                G.prev = D;
                C.visibleNext = H;
                H.visiblePrev = C;
                H.next = E;
                E.prev = H;
                H.visibleNext = E;
                E.visiblePrev = H;
                F.next = I;
                I.prev = F;
                F.visibleNext = J;
                J.visiblePrev = F;
                grid.reIndex(D, sentinel);
            }
            grid.draw();
            grid.dataComponent.headers = grid.cols.enumerate().map(function (col) { return col.header; });
            grid.dataComponent.markDirty();
            // cursor and anchor can stay the same
        };
        Grid.prototype.hideRows = function () {
            // this is pretty similar to delete
            var grid = this;
            var sel = grid.selected;
            if (sel.minRow.visiblePrev == grid.rows && sel.maxRow.visibleNext == grid.rows) {
                return;
            }
            sel.minRow.visiblePrev.visibleNext = sel.maxRow.visibleNext;
            sel.maxRow.visibleNext.visiblePrev = sel.minRow.visiblePrev;
            var remaining = sel.minRow.visiblePrev;
            if (remaining == grid.rows) {
                remaining = remaining.visibleNext;
            }
            sel.minRow = remaining;
            sel.maxRow = remaining;
            grid.calcMaxRowFromMinRow();
            grid.anchor.row = remaining;
            grid.cursor.row = remaining;
            grid.selectRange();
        };
        Grid.prototype.hideCols = function () {
            // this is pretty similar to delete
            var grid = this;
            var sel = grid.selected;
            if (sel.minCol.visiblePrev == grid.cols && sel.maxCol.visibleNext == grid.cols) {
                return;
            }
            var elt = sel.minCol;
            elt.data.visible = false;
            while (elt != sel.maxCol) {
                elt.data.visible = false;
                elt = elt.next;
            }
            sel.minCol.visiblePrev.visibleNext = sel.maxCol.visibleNext;
            sel.maxCol.visibleNext.visiblePrev = sel.minCol.visiblePrev;
            var remaining = sel.minCol.visiblePrev;
            if (remaining == grid.cols) {
                remaining = remaining.visibleNext;
            }
            sel.minCol = remaining;
            sel.maxCol = remaining;
            grid.calcMaxColFromMinCol();
            grid.anchor.col = remaining;
            grid.cursor.col = remaining;
            grid.selectRange();
        };
        Grid.prototype.showRows = function () {
            var grid = this;
            var sel = grid.selected;
            var min = sel.minRow;
            var max = sel.maxRow;
            // normally we assume some range is selected and show the ranks interior to that range (and not the ranks on the edges)
            // to show ranks at either edge of the grid, make sure only the edge cell is selected
            if (min == max) {
                if (min.visiblePrev == grid.rows) {
                    min = grid.rows.next;
                }
                if (max.visibleNext == grid.rows) {
                    max = grid.rows.prev;
                }
            }
            var elt = min;
            while (elt != max) {
                elt.visibleNext = elt.next;
                elt.next.visiblePrev = elt;
                elt = elt.next;
            }
            // if it was an edge show, extend the selection
            sel.minRow = min;
            sel.maxRow = max;
            grid.calcMaxRowFromMinRow();
            grid.draw();
        };
        Grid.prototype.showCols = function () {
            var grid = this;
            var sel = grid.selected;
            var min = sel.minCol;
            var max = sel.maxCol;
            // normally we assume some range is selected and show the ranks interior to that range (and not the ranks on the edges)
            // to show ranks at either edge of the grid, make sure only the edge cell is selected
            // if there is only one col visible, both edges get selected
            if (min == max) {
                if (min.visiblePrev == grid.cols) {
                    min = grid.cols.next;
                }
                if (max.visibleNext == grid.cols) {
                    max = grid.cols.prev;
                }
            }
            var elt = min;
            while (elt != max) {
                elt.data.visible = true;
                elt.visibleNext = elt.next;
                elt.next.visiblePrev = elt;
                elt = elt.next;
            }
            elt.data.visible = true; // take care of the max
            grid.calcMaxColFromMinCol();
            // if it was an edge show, extend the selection - these lines only have an effect if min/max was on an edge
            sel.minCol = min;
            sel.maxCol = max;
            grid.draw();
        };
        Grid.prototype.reIndex = function (elt, sentinel) {
            var grid = this;
            if (elt == sentinel) {
                elt = elt.next;
            }
            if (elt.prev == sentinel) {
                elt.data.index = 0;
                elt = elt.next;
            }
            while (elt != sentinel) {
                elt.data.index = elt.prev.data.index + 1;
                elt = elt.next;
            }
        };
        Grid.prototype.setMultisort = function () {
            var grid = this;
            var str = '';
            var sortParams = grid.multisort.enumerate();
            grid.multisortIndicatorDict = {};
            for (var i = 0; i < sortParams.length; i++) {
                var sorter = sortParams[i];
                grid.multisortIndicatorDict[sorter.header] = (sorter.ascending ? -1 : 1) * (i + 1);
                var part = (sorter.ascending ? 'a' : 'b') + '.' + sorter.header + ' - ' + (sorter.ascending ? 'b' : 'a') + '.' + sorter.header;
                str += 'if (' + part + ' != 0) { return ' + part + '; } else { ';
            }
            str += 'return 0;';
            for (var i = 0; i < sortParams.length; i++) {
                str += ' }';
            }
            grid.sortFn = new Function('a,b', str);
            grid.applySort();
        };
        Grid.prototype.setSort = function (sorter) {
            var grid = this;
            // this is valid for numbers only, if we want to compare strings it will have to use localeCompare() or something
            var str = (sorter.ascending ? 'a' : 'b') + '.' + sorter.header + ' - ' + (sorter.ascending ? 'b' : 'a') + '.' + sorter.header;
            grid.sortFn = new Function('a,b', 'return ' + str);
            grid.applySort();
        };
        Grid.prototype.applySort = function () {
            var grid = this;
            var rows = grid.rows.enumerate();
            var objects = [];
            for (var i = 0; i < rows.length; i++) {
                objects.push(rows[i].object);
            }
            grid.dataComponent.data = objects.sort(grid.sortFn);
            grid.rows = new HiddenList();
            for (var i = 0; i < grid.dataComponent.data.length; i++) {
                grid.rows.add(new Row(i, grid.dataComponent.data[i]), true);
            }
            grid.applyFilter();
            grid.dataComponent.markDirty();
            grid.draw();
        };
        Grid.prototype.setFilter = function (fnstr) {
            var grid = this;
            grid.filter = fnstr;
            if (fnstr == null || fnstr == '') {
                fnstr = 'true';
            }
            try {
                grid.filterFn = new Function('return ' + fnstr);
            }
            catch (e) {
                grid.filterFn = function () { return true; };
            }
            grid.applyFilter();
            grid.dataComponent.markDirty();
            grid.clearSelection(); // this also calls draw()
        };
        Grid.prototype.applyFilter = function () {
            var grid = this;
            var elt = grid.rows.next;
            var lastVisible = grid.rows;
            while (elt != grid.rows) {
                var include = grid.filterFn.apply(elt.data.object);
                if (include) {
                    elt.visiblePrev = lastVisible;
                    lastVisible.visibleNext = elt;
                    lastVisible = elt;
                }
                else {
                    elt.visiblePrev = null;
                    elt.visibleNext = null;
                }
                elt = elt.next;
            }
            lastVisible.visibleNext = grid.rows;
            grid.rows.visiblePrev = lastVisible;
            // if there are zero visible rows, what do we do?  for now, unhide everything
            if (grid.rows.visibleNext == grid.rows) {
                console.log('Error: filter "' + grid.filter + '" returns zero visible rows');
                var elt = grid.rows.next;
                var lastVisible = grid.rows;
                while (elt != grid.rows) {
                    elt.visiblePrev = lastVisible;
                    lastVisible.visibleNext = elt;
                    lastVisible = elt;
                }
                elt = elt.next;
            }
            grid.scroll.minRow = grid.rows.visibleNext;
            grid.calcMaxRowFromMinRow();
        };
        return Grid;
    }());
    Hyperdeck.Grid = Grid;
    function KeyToChar(key, shift) {
        var from48To57 = [')', '!', '@', '#', '$', '%', '^', '&', '*', '('];
        var from186To192 = [[';', ':'], ['=', '+'], [',', '<'], ['-', '_'], ['.', '>'], ['/', '?'], ['`', '~']];
        var from219To222 = [['[', '{'], ['\\', '|'], [']', '}'], ['\'', '"']];
        var c = null;
        if (48 <= key && key <= 57) {
            c = (shift ? from48To57[key - 48] : String.fromCharCode(key));
        }
        else if (65 <= key && key <= 90) {
            c = (shift ? String.fromCharCode(key) : String.fromCharCode(key + 32));
        }
        else if (186 <= key && key <= 192) {
            c = from186To192[key - 186][shift ? 1 : 0];
        }
        else if (219 <= key && key <= 222) {
            c = from219To222[key - 219][shift ? 1 : 0];
        }
        return c;
    }
    function Count(a, b) {
        var n = 1;
        var elt = a;
        while (elt != b) {
            elt = elt.next;
            n++;
        }
        return n;
    }
    function CountVisible(a, b) {
        var n = 1;
        var elt = a;
        while (elt != b) {
            elt = elt.visibleNext;
            n++;
        }
        return n;
    }
    function Enumerate(a, b) {
        var result = [];
        var elt = a;
        while (true) {
            result.push(elt.data);
            if (elt == b) {
                break;
            }
            elt = elt.next;
        }
        return result;
    }
    function EnumerateVisible(a, b) {
        var result = [];
        var elt = a;
        while (true) {
            result.push(elt.data);
            if (elt == b) {
                break;
            }
            elt = elt.visibleNext;
        }
        return result;
    }
    function Format(value, formatObject) {
        var datatype = typeof (value);
        var string = null;
        if (value == null) {
            string = '';
        }
        else if (datatype == "number") {
            if (formatObject === null) {
                string = value.toString();
            }
            else {
                string = sprintf(formatObject, value);
            }
        }
        else if (datatype == "string") {
            string = value; // apply formatting here - note that when you want to edit, use the raw toString()
        }
        else if (datatype == "boolean") {
            string = value.toString();
        }
        else if (datatype == "object") {
            if (value.forEach) {
                string = "[Array]";
            }
            else {
                //string = cell.slot.formula;
                string = value.toString(); // apply formatting here - note that when you want to edit, use the raw toString()
            }
        }
        else if (datatype == "function") {
            string = value.name;
        }
        else {
            string = '';
        }
        return string;
    }
    var FormatObj = (function () {
        function FormatObj(match) {
            this.plus = match[3];
            this.padChar = match[4];
            this.rightPad = match[5];
            this.padLength = match[6];
            this.places = match[7];
            this.type = match[8];
        }
        return FormatObj;
    }());
    function ParseFormat(fmt) {
        /*
        
        The placeholders in the format string are marked by "%" and are followed by one or more of these elements, in this order:
        
        An optional "+" sign that forces to preceed the result with a plus or minus sign on numeric values.
        By default, only the "-" sign is used on negative numbers.
        
        An optional padding specifier that says what character to use for padding (if specified).
        Possible values are 0 or any other character precedeed by a '. The default is to pad with spaces.
        
        An optional "-" sign, that causes sprintf to left-align the result of this placeholder. The default is to right-align the result.
        
        An optional number, that says how many characters the result should have. If the value to be returned is shorter than this number, the result will be padded.
        
        An optional precision modifier, consisting of a "." (dot) followed by a number, that says how many digits should be displayed for floating point numbers. When used on a string, it causes the result to be truncated.
        
        A type specifier that can be any of:
        
        s — print a string as is
        c — print an integer as the character with that ASCII value
        
        b — print an integer as a binary number
        d — print an integer as a signed decimal number
        u — print an integer as an unsigned decimal number
        o — print an integer as an octal number
        x — print an integer as a hexadecimal number (lower-case)
        X — print an integer as a hexadecimal number (upper-case)
        
        e — print a float as scientific notation
        f — print a float as is
        
        % — print a literal "%" character
        
        ls.push(sprintf('%s', 'a')); // 'a'
        ls.push(sprintf('%c', 65)); // 'A'
        
        ls.push(sprintf('%d', 123)); // '123'
        ls.push(sprintf('%u', 123)); // '123'
        ls.push(sprintf('%b', 123)); // '1111011'
        ls.push(sprintf('%o', 123)); // '173'
        ls.push(sprintf('%x', 123)); // '7b'
        ls.push(sprintf('%X', 123)); // '7B'
        
        ls.push(sprintf('%e', 123.456)); // '1.23456e+2'
        ls.push(sprintf('%f', 123.456)); // '123.456'
        
        ls.push(sprintf('%%')); // '%'
        
        ls.push(sprintf('%.1f', 123.456)); // '123.5'
        ls.push(sprintf('%.3s', 'abcdef')); // 'abc'
        
        ls.push(sprintf('%6d', 123)); // '   123'
        ls.push(sprintf('%-6d', 123)); // '123   '
        ls.push(sprintf('%06d', 123)); // '000123'
        ls.push(sprintf('%0-6d', 123)); // '123000'
        ls.push(sprintf('%\'*6d', 123)); // '***123'
        
        ls.push(sprintf('%+d', +123)); // '+123'
        ls.push(sprintf('%+d', -123)); // '-123'
        ls.push(sprintf('%+d', 0));    // '+0'
        ls.push(sprintf('%d', +123));  // '123'
        ls.push(sprintf('%d', -123));  // '-123'
        ls.push(sprintf('%d', 0));     // '0'
        
        */
        var fmt = fmt;
        var match = [];
        var parsetree = [];
        var argnames = 0;
        while (fmt) {
            if ((match = /^[^\x25]+/.exec(fmt)) !== null) {
                parsetree.push(match[0]);
            }
            else if ((match = /^\x25{2}/.exec(fmt)) !== null) {
                parsetree.push('%');
            }
            else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(fmt)) !== null) {
                if (match[2]) {
                    argnames |= 1;
                    var fieldlist = [];
                    var replacementfield = match[2];
                    var fieldmatch = [];
                    if ((fieldmatch = /^([a-z_][a-z_\d]*)/i.exec(replacementfield)) !== null) {
                        fieldlist.push(fieldmatch[1]);
                        while ((replacementfield = replacementfield.substring(fieldmatch[0].length)) !== '') {
                            if ((fieldmatch = /^\.([a-z_][a-z_\d]*)/i.exec(replacementfield)) !== null) {
                                fieldlist.push(fieldmatch[1]);
                            }
                            else if ((fieldmatch = /^\[(\d+)\]/.exec(replacementfield)) !== null) {
                                fieldlist.push(fieldmatch[1]);
                            }
                            else {
                                throw ('[sprintf] huh?');
                            }
                        }
                    }
                    else {
                        throw ('[sprintf] huh?');
                    }
                    match[2] = fieldlist;
                }
                else {
                    argnames |= 2;
                }
                if (argnames === 3) {
                    throw ('[sprintf] mixing positional and named placeholders is not (yet) supported');
                }
                parsetree.push(match);
            }
            else {
                throw ('[sprintf] huh?');
            }
            fmt = fmt.substring(match[0].length);
        }
        return parsetree;
    }
    function ApplyFormat(tree, argv) {
        function Typeof(x) { return Object.prototype.toString.call(x).slice(8, -1).toLowerCase(); }
        function Repeat(str, n) { var l = []; for (var i = 0; i < n; i++) {
            l.push(str);
        } return l.join(''); }
        var cursor = 1;
        var output = [];
        for (var i = 0; i < tree.length; i++) {
            var match = tree[i]; // convenience purposes only
            var type = Typeof(match);
            if (type === 'string') {
                output.push(match);
            }
            else if (type === 'array') {
                var format = new FormatObj(match);
                var arg = argv[cursor++];
                if (/[^s]/.test(format.type) && (Typeof(arg) != 'number')) {
                    throw (sprintf('[sprintf] expecting number but found %s', Typeof(arg)));
                }
                var str = null;
                switch (format.type) {
                    case 'b':
                        str = arg.toString(2);
                        break;
                    case 'o':
                        str = arg.toString(8);
                        break;
                    case 'x':
                        str = arg.toString(16);
                        break;
                    case 'X':
                        str = arg.toString(16).toUpperCase();
                        break;
                    case 'd':
                        str = parseInt(arg, 10).toString();
                        break;
                    case 'u':
                        str = Math.abs(arg).toString();
                        break;
                    case 'c':
                        str = String.fromCharCode(arg);
                        break;
                    case 'e':
                        str = format.places ? arg.toExponential(format.places) : arg.toExponential();
                        break;
                    case 'f':
                        str = format.places ? parseFloat(arg).toFixed(format.places) : parseFloat(arg).toString();
                        break;
                    case 's':
                        str = ((arg = String(arg)) && format.places ? arg.substring(0, format.places) : arg);
                        break;
                }
                // + sign for positive numbers
                str = (/[def]/.test(format.type) && format.plus && arg >= 0 ? '+' + str : str); // perhaps add a space if arg == 0
                // padding
                var c = format.padChar ? format.padChar == '0' ? '0' : format.padChar.charAt(1) : ' ';
                var n = format.padLength - str.length;
                var pad = format.padLength ? Repeat(c, n) : '';
                // left or right padding
                var result = format.rightPad ? str + pad : pad + str;
                output.push(result);
            }
        }
        return output.join('');
    }
    var numberRegex = new RegExp('^\\s*[+-]?([0-9]{1,3}((,[0-9]{3})*|([0-9]{3})*))?(\\.[0-9]+)?%?\\s*$');
    var digitRegex = new RegExp('[0-9]');
    var trueRegex = new RegExp('^true$', 'i');
    var falseRegex = new RegExp('^false$', 'i');
    // require ISO 8601 dates - this regex reads yyyy-mm-ddThh:mm:ss.fffZ, with each component after yyyy-mm being optional
    // note this means that yyyy alone will be interpreted as an int, not a date
    var dateRegex = new RegExp('[0-9]{4}-[0-9]{2}(-[0-9]{2}(T[0-9]{2}(:[0-9]{2}(:[0-9]{2}(.[0-9]+)?)?)?(Z|([+-][0-9]{1-2}:[0-9]{2})))?)?');
    var WriteObjToString = function (obj) {
        // this is currently called only when writing to json/yaml, which requires that we return 'null'
        // but if we start calling this function from the csv/tsv writer, we'll need to return ''
        if (obj === null) {
            return 'null';
        }
        var type = Object.prototype.toString.call(obj);
        if (type == '[object String]' || type == '[object Date]') {
            return '"' + obj.toString() + '"';
        }
        else {
            return obj.toString();
        }
    };
    var ParseStringToObj = function (str) {
        if (str === null || str === undefined) {
            return null;
        }
        if (str.length == 0) {
            return '';
        } // the numberRegex accepts the empty string because all the parts are optional
        var val = null;
        if (numberRegex.test(str) && digitRegex.test(str)) {
            var divisor = 1;
            str = str.trim();
            if (str.indexOf('%') >= 0) {
                divisor = 100;
                str = str.replace('%', '');
            }
            str = str.replace(',', '');
            if (str.indexOf('.') >= 0) {
                val = parseFloat(str);
            }
            else {
                val = parseInt(str);
            }
            val /= divisor;
        }
        else if (dateRegex.test(str)) {
            val = new Date(str);
            if (val.toJSON() == null) {
                val = str;
            } // revert if the date is invalid
        }
        else if (trueRegex.test(str)) {
            val = true;
        }
        else if (falseRegex.test(str)) {
            val = false;
        }
        else {
            val = str;
        }
        return val;
    };
    function NumberToLetter(n) {
        // 0 => "A"
        // 1 => "B"
        // 25 => "Z"
        // 26 => "AA"
        if (n < 0) {
            return "";
        }
        var k = 1;
        var m = n + 1;
        while (true) {
            var pow = 1;
            for (var i = 0; i < k; i++) {
                pow *= 26;
            }
            if (m <= pow) {
                break;
            }
            m -= pow;
            k++;
        }
        var reversed = "";
        for (var i = 0; i < k; i++) {
            var c = n + 1;
            var shifter = 1;
            for (var j = 0; j < k; j++) {
                c -= shifter;
                shifter *= 26;
            }
            var divisor = 1;
            for (var j = 0; j < i; j++) {
                divisor *= 26;
            }
            c /= divisor;
            c %= 26;
            reversed += String.fromCharCode(65 + c);
        }
        var result = "";
        for (var i = reversed.length - 1; i >= 0; i--) {
            result += reversed[i];
        }
        return result;
    }
    function LetterToNumber(s) {
        // "A" => 0
        // "B" => 1
        // "Z" => 25
        // "AA" => 26
        var result = 0;
        var multiplier = 1;
        for (var i = s.length - 1; i >= 0; i--) {
            var c = s.charCodeAt(i);
            result += multiplier * (c - 64);
            multiplier *= 26;
        }
        return result - 1; // -1 makes it 0-indexed
    }
})(Hyperdeck || (Hyperdeck = {}));
