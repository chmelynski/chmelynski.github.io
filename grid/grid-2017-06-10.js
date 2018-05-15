// design notes
// HiddenList<T> is a doubly linked list that allows for hidden rows/cols to be "pinched off" without being discarded outright
// internal/external cut/copy/paste should respect the filter - it works on visible cells only
// styles are displayed as a style object, e.g. {"font": "10pt Courier New", bold:true}
// style formulas support named styles, as well as anything else that produces a style object
// =Styles['default']
// =Styles['default'].extend('bold', true)
var Eyeshade;
(function (Eyeshade) {
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
            this._index = index;
            this._object = object;
        }
        return Row;
    }());
    var Col = (function () {
        function Col(grid, json, index) {
            var col = this;
            col._grid = grid;
            col._index = index;
            col._header = json.header;
            col._visible = json.visible;
            col._width = json.width;
            col._calculated = true;
            col._visited = false;
            col._srcs = new Set();
            col._dsts = new Set();
            col._setFormula(json.formula);
            col._setFormat(json.format);
            col._setStyle(json.style);
        }
        Col.prototype._calculate = function () {
            var col = this;
            if (col._formulaObject === null) {
                col._calculated = true;
                col._visited = false;
                return;
            }
            if (col._visited) {
                throw new Error('circular reference at column "' + col._header + '"');
            }
            col._visited = true;
            // calculate uncalculated srcs first
            col._srcs.forEach(function (src) { if (!src._calculated) {
                src._calculate();
            } });
            for (var i = 0; i < col._grid._dataComponent._data.length; i++) {
                var result = col._formulaObject.call(col._grid._dataComponent._data, i);
                col._grid._dataComponent._data[i][col._header] = result;
            }
            col._calculated = true;
            col._visited = false;
        };
        Col.prototype._setFormula = function (formula) {
            var col = this;
            formula = formula.trim();
            if (formula[0] == '=') {
                formula = formula.substr(1);
            }
            col._formula = formula;
            if (formula == '') {
                col._formulaObject = null;
                col._srcs.forEach(function (src) { src._dsts.delete(col); });
                col._srcs = new Set();
                col._markUncalculated();
                return;
            }
            try {
                col._formulaObject = new Function('i', 'return ' + formula);
                // for now, we're going to assume the formula stays within the row
                var dependencies = [];
                var referenceRegex = /this\[([^\]]+)\]\.([A-Za-z][A-Za-z0-9]*)/g; // e.g. this[i].foo
                var match = referenceRegex.exec(formula);
                while (match !== null) {
                    dependencies.push(match[2]); // the group that matches the .field
                    match = referenceRegex.exec(formula);
                }
                var cols = col._grid._cols._enumerate();
                for (var i = 0; i < dependencies.length; i++) {
                    for (var k = 0; k < cols.length; k++) {
                        if (dependencies[i] == cols[k]._header) {
                            col._srcs.add(cols[k]);
                            cols[k]._dsts.add(col);
                        }
                    }
                }
                col._markUncalculated();
            }
            catch (e) {
                col._formulaObject = null;
                col._srcs.forEach(function (src) { src._dsts.delete(col); });
                col._srcs = new Set();
                col._markUncalculated();
            }
            col._grid._dataComponent._markDirty();
        };
        Col.prototype._setFormat = function (format) {
            var col = this;
            col._format = ((format == '') ? null : format);
            col._grid._dataComponent._markDirty();
        };
        Col.prototype._setStyle = function (style) {
            var col = this;
            col._style = style;
            try {
                col._styleObject = new Style(JSON.parse(style));
            }
            catch (e) {
                col._styleObject = new Style();
            }
            col._grid._dataComponent._markDirty();
        };
        Col.prototype._markUncalculated = function () {
            var col = this;
            if (col._calculated) {
                col._calculated = false;
                col._dsts.forEach(function (dst) { dst._markUncalculated(); });
            }
        };
        Col.prototype._write = function () {
            var col = this;
            return {
                header: col._header,
                visible: col._visible,
                width: col._width,
                formula: col._formula,
                format: col._format,
                style: col._style
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
            style._font = json.font ? json.font : '11pt Calibri';
            style._textColor = json.textColor ? json.textColor : 'rgb(0,0,0)';
            style._hAlign = json.hAlign ? json.hAlign : 'center';
            style._vAlign = json.vAlign ? json.vAlign : 'center';
            style._backgroundColor = json.backgroundColor ? json.backgroundColor : null;
            style._border = json.border ? json.border : null;
            style._hMargin = json.hMargin ? json.hMargin : 5;
            style._vMargin = json.vMargin ? json.vMargin : 4;
        }
        Style.prototype.write = function () {
            var style = this;
            return {
                font: style._font,
                textColor: style._textColor,
                hAlign: style._hAlign,
                vAlign: style._vAlign,
                backgroundColor: style._backgroundColor,
                border: style._border,
                hMargin: style._hMargin,
                vMargin: style._vMargin
            };
        };
        return Style;
    }());
    var GridLinkedList = (function () {
        function GridLinkedList() {
            this._prev = this;
            this._next = this;
        }
        GridLinkedList.prototype._add = function (data) {
            // this must be called on the sentinel
            var elt = new GridLinkedList();
            elt._data = data;
            elt._next = this;
            elt._prev = this._prev;
            this._prev._next = elt;
            this._prev = elt;
            return elt;
        };
        GridLinkedList.prototype._remove = function () {
            // this cannot be called on the sentinel
            this._prev._next = this._next;
            this._next._prev = this._prev;
        };
        GridLinkedList.prototype._enumerate = function () {
            // this must be called on the sentinel
            var list = [];
            var elt = this._next;
            while (elt !== this) {
                list.push(elt._data);
                elt = elt._next;
            }
            return list;
        };
        return GridLinkedList;
    }());
    var HiddenList = (function () {
        function HiddenList() {
            this._prev = this;
            this._next = this;
            this._visibleNext = this;
            this._visiblePrev = this;
        }
        HiddenList.prototype._add = function (data, visible) {
            var elt = new HiddenList();
            elt._data = data;
            elt._next = this;
            elt._prev = this._prev;
            this._prev._next = elt;
            this._prev = elt;
            if (visible) {
                elt._visibleNext = this;
                elt._visiblePrev = this._visiblePrev;
                this._visiblePrev._visibleNext = elt;
                this._visiblePrev = elt;
            }
            else {
                elt._visibleNext = null;
                elt._visiblePrev = null;
            }
            return elt;
        };
        HiddenList.prototype._remove = function () {
            // this cannot be called on the sentinel
            this._prev._next = this._next;
            this._next._prev = this._prev;
        };
        HiddenList.prototype._enumerate = function () {
            // this must be called on the sentinel
            var list = [];
            var elt = this._next;
            while (elt !== this) {
                list.push(elt._data);
                elt = elt._next;
            }
            return list;
        };
        HiddenList.prototype._hideUntil = function (that) {
            this._visibleNext = that;
            that._visiblePrev = this;
        };
        HiddenList.prototype._showUntil = function (that) {
            this._visibleNext = this._next;
            that._visiblePrev = that._prev;
        };
        return HiddenList;
    }());
    var Grid = (function () {
        function Grid(dataComponent, div) {
            var grid = this;
            grid._rowHeight = 20;
            grid._rowHeaderWidth = 64;
            grid._defaultCellStroke = 'rgb(208,215,229)'; // rgb(158,182,206)
            grid._defaultHeaderStroke = 'rgb(158,182,206)';
            grid._selectedCellStroke = 'rgb(242,149,54)';
            grid._selectedHeaderStroke = 'rgb(242,149,54)';
            grid._defaultCellFill = 'rgb(255,255,255)';
            grid._defaultHeaderFill = 'rgb(208,215,229)';
            grid._selectedCellFill = 'rgb(210,210,240)';
            grid._selectedHeaderFill = 'rgb(255,213,141)';
            grid._shift = false;
            grid._ctrl = false;
            grid._alt = false;
            grid._tab = false;
            grid._div = div;
            grid._displayDiv = document.createElement('div');
            grid._displayDiv.className = 'grid-container';
            grid._div.appendChild(grid._displayDiv);
            grid._displayGridUi();
            grid._dataComponent = dataComponent;
            var gridJson = dataComponent.gridParams;
            if (!gridJson) {
                gridJson = {};
            }
            if (!gridJson.columns) {
                gridJson.columns = dataComponent._headers.map(function (header) { return { header: header, visible: true, width: 64, formula: '', format: null, style: null }; });
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
            grid._columnParams = gridJson.columns;
            Object.defineProperty(this, 'data', {
                get: function () {
                    return grid._dataComponent._data;
                },
                set: function (value) {
                    grid._dataComponent._data = value;
                    if (grid._dataComponent._markDirty) {
                        grid._dataComponent._markDirty();
                    }
                    grid._resetData();
                }
            });
            grid._editMode = 'value';
            //grid._hScrollbar = null; // new Scrollbar(this.ctx, this, 'h')
            //grid._vScrollbar = new Scrollbar(this.ctx, this, 'v');
            grid._filter = gridJson.filter;
            grid._sort = gridJson.sort;
            grid._multisort = new GridLinkedList();
            grid._multisortIndicatorDict = {};
            for (var i = 0; i < gridJson.multisort.length; i++) {
                grid._multisort._add(gridJson.multisort[i]);
            }
            grid._styles = [new Style()];
            grid._resetData();
        }
        Grid.prototype._resetData = function () {
            var grid = this;
            grid._rows = new HiddenList();
            grid._cols = new HiddenList();
            for (var i = 0; i < grid._dataComponent._data.length; i++) {
                grid._rows._add(new Row(i, grid._dataComponent._data[i]), true);
            }
            // check columnParams against data._headers - add or delete cols as necessary
            for (var i = 0; i < grid._dataComponent._headers.length; i++) {
                var header = grid._dataComponent._headers[i];
                var colParams = null;
                for (var k = 0; k < grid._columnParams.length; k++) {
                    if (grid._columnParams[k].header == header) {
                        colParams = grid._columnParams[k];
                        break;
                    }
                }
                if (colParams === null) {
                    colParams = { header: header, visible: true, width: 64, formula: '', format: null, style: null };
                }
                grid._cols._add(new Col(grid, colParams, i), colParams.visible);
            }
            grid._selected = null;
            grid._cursor = { _row: null, _col: null };
            grid._anchor = { _row: null, _col: null };
            // volatile scroll variables
            grid._scroll = { _minRow: grid._rows._visibleNext, _minCol: grid._cols._visibleNext, _maxRow: null, _maxCol: null };
            grid._xOffset = 0;
            grid._yOffset = 0;
            grid._calcMaxRowFromMinRow();
            grid._calcMaxColFromMinCol();
            grid._calculate();
            if (grid._multisort._next !== grid._multisort) {
                grid._setMultisort();
            }
            if (grid._filter !== null) {
                grid._setFilter(grid._filter);
            }
            grid._setMouseHandles();
            grid._draw();
        };
        Grid.prototype._write = function () {
            var grid = this;
            return {
                filter: grid._filter,
                sort: grid._sort,
                multisort: grid._multisort._enumerate().map(function (sortParams) { return { header: sortParams._header, ascending: sortParams._ascending }; }),
                columns: grid._cols._enumerate().map(function (col) { return col._write(); })
            };
        };
        Grid.prototype._writeData = function (format) {
            var grid = this;
            var text = null;
            if (format == 'json') {
                text = JSON.stringify(grid._dataComponent._data);
            }
            else if (format == 'tsv') {
                var ls = [];
                ls.push(grid._dataComponent._headers);
                for (var i = 0; i < grid._dataComponent._data.length; i++) {
                    var l = [];
                    for (var k = 0; k < grid._dataComponent._headers.length; k++) {
                        l.push(grid._dataComponent._data[i][grid._dataComponent._headers[k]]);
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
        Grid.prototype._displayGridUi = function () {
            var grid = this;
            var div = grid._displayDiv;
            div.innerHTML = '';
            var canvas = document.createElement('canvas');
            //canvas.width = div.clientWidth; // perhaps set a onresize handler on grid._div/grid._displayDiv to resize the canvas as well
            //canvas.height = div.clientHeight;
            canvas.width = 1000;
            canvas.height = 525;
            canvas.tabIndex = 0;
            canvas.setAttribute('aria-label', 'eyeshade');
            grid._input = document.createElement('input');
            grid._input.type = 'text';
            grid._input.style.position = 'relative';
            grid._input.style.display = 'none';
            grid._textarea = document.createElement('textarea');
            grid._textarea.style.position = 'relative';
            grid._textarea.style.display = 'none';
            div.appendChild(canvas);
            div.appendChild(grid._input);
            div.appendChild(grid._textarea);
            grid._ctx = canvas.getContext('2d');
            grid._lf = 10;
            grid._tp = 10;
            grid._rt = canvas.width - 10;
            grid._bt = canvas.height - 10;
        };
        Grid.prototype._draw = function () {
            var grid = this;
            var ctx = grid._ctx;
            ctx.clearRect(0, 0, grid._ctx.canvas.width, grid._ctx.canvas.height); // or lf, tp, rt - lf, bt - tp
            grid._xs = [];
            grid._ys = [];
            grid._visibleRows = [];
            grid._visibleCols = [];
            // fill xs, cols
            var colElt = grid._scroll._minCol;
            var x = grid._lf;
            grid._xs.push(x);
            x += grid._rowHeaderWidth;
            grid._visibleCols.push(null);
            grid._xs.push(x);
            x -= grid._xOffset; // a one-time correction
            while (x < grid._rt) {
                grid._visibleCols.push(colElt);
                x += colElt._data._width;
                grid._xs.push(x);
                colElt = colElt._visibleNext;
                if (colElt == grid._cols) {
                    break;
                }
            }
            // fill ys, rows
            var rowElt = grid._scroll._minRow;
            var y = grid._tp;
            grid._ys.push(y);
            y += grid._rowHeight;
            grid._visibleRows.push(null);
            grid._ys.push(y);
            y -= grid._yOffset; // a one-time correction
            while (y < grid._bt) {
                grid._visibleRows.push(rowElt);
                y += grid._rowHeight;
                grid._ys.push(y);
                rowElt = rowElt._visibleNext;
                if (rowElt == grid._rows) {
                    break;
                }
            }
            var sel = grid._selected;
            // fill top left corner cell
            ctx.fillStyle = grid._defaultHeaderFill;
            ctx.fillRect(grid._xs[0], grid._ys[0], grid._xs[1] - grid._xs[0], grid._ys[1] - grid._ys[0]);
            // draw row header fills and text
            for (var i = 1; i < grid._visibleRows.length; i++) {
                var row = grid._visibleRows[i]._data;
                var string = row._index.toString();
                var rowIsSelected = ((sel === null || row === null || sel._minRow === null) ? false : (sel._minRow._data._index <= row._index && row._index <= sel._maxRow._data._index));
                var lf = grid._xs[0];
                var rt = grid._xs[1];
                var tp = grid._ys[i + 0];
                var bt = grid._ys[i + 1];
                var wd = rt - lf;
                var hg = bt - tp;
                var cx = (lf + rt) / 2;
                var cy = (tp + bt) / 2;
                // fill
                ctx.fillStyle = (rowIsSelected ? grid._selectedHeaderFill : grid._defaultHeaderFill);
                ctx.fillRect(lf, tp, wd, hg);
                // clipping path to prevent text overflow
                ctx.save();
                ctx.beginPath();
                var clipLf = lf;
                var clipTp = tp;
                var clipWd = wd;
                var clipHg = hg;
                if (i == 1) {
                    clipTp = bt - grid._rowHeight;
                }
                if (i == grid._visibleRows.length - 1) {
                    clipHg = grid._rowHeight;
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
            for (var j = 1; j < grid._visibleCols.length; j++) {
                var col = grid._visibleCols[j]._data;
                var string = col._header;
                var colIsSelected = ((sel === null || col === null || sel._minCol === null) ? false : (sel._minCol._data._index <= col._index && col._index <= sel._maxCol._data._index));
                var lf = grid._xs[j + 0];
                var rt = grid._xs[j + 1];
                var tp = grid._ys[0];
                var bt = grid._ys[1];
                var wd = rt - lf;
                var hg = bt - tp;
                var cx = (lf + rt) / 2;
                var cy = (tp + bt) / 2;
                // fill
                ctx.fillStyle = (colIsSelected ? grid._selectedHeaderFill : grid._defaultHeaderFill);
                ctx.fillRect(lf, tp, wd, hg);
                // clipping path to prevent text overflow
                ctx.save();
                ctx.beginPath();
                var clipLf = lf;
                var clipTp = tp;
                var clipWd = wd;
                var clipHg = hg;
                if (j == 1) {
                    clipLf = rt - col._width;
                }
                if (j == grid._visibleCols.length - 1) {
                    clipWd = col._width;
                }
                ctx.rect(clipLf, clipTp, clipWd, clipHg);
                ctx.clip();
                ctx.fillStyle = 'black';
                ctx.font = '11pt Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(string, cx, cy);
                if (grid._multisortIndicatorDict[string]) {
                    var n = grid._multisortIndicatorDict[string];
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
            for (var j = 1; j < grid._visibleCols.length; j++) {
                var col = grid._visibleCols[j]._data;
                var style = col._styleObject;
                for (var i = 1; i < grid._visibleRows.length; i++) {
                    var row = grid._visibleRows[i]._data;
                    var value = row._object[col._header];
                    var string = Format(value, col._format);
                    var rowIsSelected = ((sel === null || row === null || sel._minRow === null) ? false : (sel._minRow._data._index <= row._index && row._index <= sel._maxRow._data._index));
                    var colIsSelected = ((sel === null || col === null || sel._minCol === null) ? false : (sel._minCol._data._index <= col._index && col._index <= sel._maxCol._data._index));
                    if (rowIsSelected && colIsSelected && (row != grid._cursor._row._data || col != grid._cursor._col._data)) {
                        ctx.fillStyle = grid._selectedCellFill; // what if there is a set background color?
                    }
                    else {
                        if (style._backgroundColor) {
                            ctx.fillStyle = style._backgroundColor;
                        }
                        else {
                            ctx.fillStyle = grid._defaultCellFill;
                        }
                    }
                    var lf = grid._xs[j + 0];
                    var rt = grid._xs[j + 1];
                    var tp = grid._ys[i + 0];
                    var bt = grid._ys[i + 1];
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
                        clipTp = bt - grid._rowHeight;
                    }
                    if (i == grid._visibleRows.length - 1) {
                        clipHg = grid._rowHeight;
                    }
                    if (j == 1) {
                        clipLf = rt - col._width;
                    }
                    if (j == grid._visibleCols.length - 1) {
                        clipWd = col._width;
                    }
                    ctx.rect(clipLf, clipTp, clipWd, clipHg);
                    ctx.clip();
                    ctx.fillRect(lf, tp, wd, hg);
                    var hAlign = style._hAlign;
                    var vAlign = style._vAlign;
                    var x = null;
                    var y = null;
                    if (hAlign == 'left') {
                        x = lf + style._hMargin;
                    }
                    else if (hAlign == 'center') {
                        x = cx;
                    }
                    else if (hAlign == 'right') {
                        x = rt - style._hMargin;
                    }
                    else {
                        throw new Error();
                    }
                    if (vAlign == 'top') {
                        y = tp + style._vMargin;
                    }
                    else if (vAlign == 'center') {
                        y = cy;
                    }
                    else if (vAlign == 'bottom') {
                        y = bt - style._vMargin;
                    }
                    else {
                        throw new Error();
                    }
                    ctx.fillStyle = style._textColor;
                    ctx.font = style._font;
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
            var x0 = grid._xs[0];
            var x1 = grid._xs[1];
            var y0 = grid._ys[0];
            var y1 = grid._ys[1];
            var xn = grid._xs[grid._xs.length - 1];
            var yn = grid._ys[grid._ys.length - 1];
            // draw normal strokes - horizontal
            for (var i = 0; i < grid._ys.length; i++) {
                var y = grid._ys[i];
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
            for (var i = 0; i < grid._xs.length; i++) {
                var x = grid._xs[i];
                if (i >= 2 && i < grid._xs.length - 1 && grid._visibleCols[i - 1]._next != grid._visibleCols[i]) {
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
            if (grid._selected) {
                var sel = grid._selected;
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
                if (sel._minRow == null || sel._maxRow == null) {
                    sy0 = grid._ys[0];
                    sy1 = grid._ys[1];
                    ya = sy0;
                    yb = sy1;
                }
                else {
                    for (var i = 1; i < grid._visibleRows.length; i++) {
                        if (grid._visibleRows[i] == sel._minRow) {
                            sy0 = grid._ys[i + 0];
                        }
                        if (grid._visibleRows[i] == sel._maxRow) {
                            sy1 = grid._ys[i + 1];
                            break;
                        }
                    }
                    var selymin = sel._minRow._data._index;
                    var selymax = sel._maxRow._data._index;
                    var winymin = grid._scroll._minRow._data._index;
                    var winymax = grid._scroll._maxRow._data._index;
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
                if (sel._minCol == null || sel._maxCol == null) {
                    sx0 = grid._xs[0];
                    sx1 = grid._xs[1];
                    xa = sx0;
                    xb = sx1;
                }
                else {
                    for (var j = 1; j < grid._visibleCols.length; j++) {
                        if (grid._visibleCols[j] == sel._minCol) {
                            sx0 = grid._xs[j + 0];
                        }
                        if (grid._visibleCols[j] == sel._maxCol) {
                            sx1 = grid._xs[j + 1];
                            break;
                        }
                    }
                    var selxmin = sel._minCol._data._index;
                    var selxmax = sel._maxCol._data._index;
                    var winxmin = grid._scroll._minCol._data._index;
                    var winxmax = grid._scroll._maxCol._data._index;
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
            //if (grid._hScrollbar) { grid._hScrollbar.draw(); }
            //if (grid._vScrollbar) { grid._vScrollbar.draw(); }
        };
        Grid.prototype._pointToRowCol = function (x, y) {
            var grid = this;
            // compare the mouse pos against the gridlines to get a row,col pair
            var row = null;
            var col = null;
            // xs[0]         xs[1]         xs[2]         xs[3]         xs[4]
            //       cols[0]       cols[1]       cols[2]       cols[3] (actually visibleCols, and cols[0] == null)
            for (var i = 1; i < grid._ys.length; i++) {
                if (y <= grid._ys[i]) {
                    row = grid._visibleRows[i - 1];
                    break;
                }
            }
            for (var j = 1; j < grid._xs.length; j++) {
                if (x <= grid._xs[j]) {
                    col = grid._visibleCols[j - 1];
                    break;
                }
            }
            // so this returns row == null or col == null if a header is selected
            return { _row: row, _col: col };
        };
        Grid.prototype._calculate = function () {
            var grid = this;
            grid._cols._enumerate().forEach(function (col) { if (!col._calculated) {
                col._calculate();
            } });
        };
        Grid.prototype._setMouseHandles = function () {
            var grid = this;
            var canvas = grid._ctx.canvas;
            canvas.onmousewheel = function (wheelEvent) {
                wheelEvent.preventDefault();
                wheelEvent.stopPropagation();
                var clicks = wheelEvent.wheelDelta / 120;
                var cubitsPerRow = 1; // 20
                // Shift+Scroll = 1 cell, Scroll = 10 cells, Ctrl+Scroll = 100 cells, Ctrl+Shift+Scroll = 1000 cells
                // Shift+ above = Scroll horizontal?
                // this requires some calculation
                var multiplier = 1;
                if (grid._tab) {
                    multiplier = grid._ctrl ? 10 : 1;
                }
                else {
                    multiplier = (grid._ctrl && grid._shift && grid._alt) ? 10000 : ((grid._ctrl && grid._shift) ? 1000 : (grid._ctrl ? 100 : (grid._shift ? 1 : 10)));
                }
                var offset = clicks * multiplier * cubitsPerRow;
                grid._scrollBy(offset, !grid._tab);
            };
            canvas.onmousedown = null;
            canvas.onmouseup = null;
            canvas.onmousemove = function (mouseMoveEvent) {
                var m = { x: mouseMoveEvent.offsetX, y: mouseMoveEvent.offsetY };
                //if (grid._vScrollbar)
                //{
                //	if (grid._vScrollbar.handle.contains(m))
                //	{
                //		grid._vScrollbar.hovered = true;
                //		grid._draw();
                //		canvas.onmousedown = function(mouseDownEvent) {
                //			var anchor: Point = { x : mouseDownEvent.offsetX , y : mouseDownEvent.offsetY };
                //			canvas.onmouseup = function(mouseUpEvent) { grid._setMouseHandles(); };
                //			canvas.onmousemove = function(mouseDragEvent) {
                //				var cursor: Point = { x : mouseDragEvent.offsetX , y : mouseDragEvent.offsetY };
                //				// drag it
                //			};
                //		};
                //		
                //		return;
                //	}
                //	
                //	if (grid._vScrollbar.hovered) { grid._vScrollbar.hovered = false; grid._draw(); }
                //}
                var x0 = grid._xs[0];
                var x1 = grid._xs[1];
                var y0 = grid._ys[0];
                var y1 = grid._ys[1];
                var xn = grid._xs[grid._xs.length - 1];
                var yn = grid._ys[grid._ys.length - 1];
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
                    for (var i = 0; i < grid._ys.length - 1; i++) {
                        var y = grid._ys[i + 1];
                        if (y - 1 <= m.y && m.y <= y + 1) {
                            canvas.style.cursor = 'row-resize';
                            var prevY = grid._ys[i];
                            canvas.onmousedown = function (mouseDownEvent) {
                                var oldRowHeight = grid._rowHeight;
                                canvas.onmouseup = function (mouseUpEvent) {
                                    grid._resizeRow(oldRowHeight, grid._rowHeight);
                                    grid._setMouseHandles();
                                };
                                canvas.onmousemove = function (mouseDragEvent) {
                                    var curr = { x: mouseDragEvent.offsetX, y: mouseDragEvent.offsetY };
                                    var newsize = Math.max(curr.y - prevY, 2);
                                    grid._rowHeight = newsize;
                                    grid._draw();
                                };
                            };
                            return;
                        }
                    }
                }
                // col resize
                if (y0 < m.y && m.y < y1) {
                    for (var j = 1; j < grid._xs.length; j++) {
                        var x = grid._xs[j];
                        if (x - 1 <= m.x && m.x <= x + 1) {
                            canvas.style.cursor = 'col-resize';
                            var prevX = grid._xs[j - 1];
                            var colToResize = j - 1;
                            canvas.onmousedown = function (mouseDownEvent) {
                                var oldColWidth = grid._visibleCols[colToResize]._data._width;
                                var newColWidth = 0;
                                canvas.onmouseup = function (mouseUpEvent) {
                                    grid._resizeCol(grid._visibleCols[colToResize]._data, oldColWidth, newColWidth);
                                    grid._setMouseHandles();
                                };
                                canvas.onmousemove = function (mouseDragEvent) {
                                    var curr = { x: mouseDragEvent.offsetX, y: mouseDragEvent.offsetY };
                                    newColWidth = Math.max(curr.x - prevX, 2);
                                    if (colToResize == 0) {
                                        grid._rowHeaderWidth = newColWidth;
                                    }
                                    else {
                                        for (var k = 1; k < grid._visibleCols.length; k++) {
                                            if (k == colToResize) {
                                                grid._visibleCols[k]._data._width = newColWidth;
                                            }
                                        }
                                    }
                                    grid._draw();
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
                        var target = grid._pointToRowCol(a.x, a.y);
                        if (target._row == null && target._col == null) {
                            return;
                        } // cannot select top-left cell
                        grid._anchor._row = target._row;
                        grid._anchor._col = target._col;
                        grid._cursor._row = target._row;
                        grid._cursor._col = target._col;
                        grid._selected = { _minCol: null, _maxCol: null, _minRow: null, _maxRow: null };
                        grid._selectCell();
                        grid._setKeyHandles();
                        var savedScrollTop = document.getElementById('cells-container').scrollTop;
                        grid._ctx.canvas.focus();
                        document.getElementById('cells-container').scrollTop = savedScrollTop;
                        if (mouseDownEvent.button == 0) {
                            canvas.onmousemove = function (mouseDragEvent) {
                                var d = { x: mouseDragEvent.offsetX, y: mouseDragEvent.offsetY };
                                // scroll and continue selecting if we go into the border zones (headers or scrollbar areas, i guess)
                                if (d.x < x1 || d.x > xn || d.y < y1 || d.y > yn) {
                                    return;
                                }
                                // select range of cells
                                var pointedRowCol = grid._pointToRowCol(d.x, d.y);
                                // in theory the pixel guard above should catch this, but we'll do another check here
                                if (pointedRowCol._row === null || pointedRowCol._col === null) {
                                    return;
                                }
                                if (grid._cursor._row != pointedRowCol._row || grid._cursor._col != pointedRowCol._col) {
                                    grid._cursor = pointedRowCol;
                                    grid._selectRange();
                                }
                            };
                            canvas.onmouseup = function (mouseUpEvent) {
                                grid._setMouseHandles();
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
                canvas.onmousedown = function (mouseDownEvent) { grid._clearSelection(); };
            };
        };
        Grid.prototype._setKeyHandles = function () {
            var grid = this;
            var canvas = grid._ctx.canvas;
            canvas.onkeyup = function (keyUpEvent) {
                var key = keyUpEvent.keyCode;
                if (key == 16) {
                    grid._shift = false;
                }
                else if (key == 17) {
                    grid._ctrl = false;
                }
                else if (key == 18) {
                    grid._alt = false;
                }
                else if (key == 9) {
                    grid._tab = false;
                }
            };
            canvas.onkeydown = function (e) {
                e.preventDefault();
                e.stopPropagation();
                var key = e.keyCode;
                if (key == 16) {
                    grid._shift = true;
                }
                else if (key == 17) {
                    grid._ctrl = true;
                }
                else if (key == 18) {
                    grid._alt = true;
                }
                else if (key == 9) {
                    grid._tab = true;
                }
                if (grid._selected == null) {
                    return;
                }
                if (key == 46) {
                    grid._setRange(null);
                    grid._draw();
                }
                else if (key == 27) {
                    grid._clearSelection();
                    grid._ctx.canvas.onkeydown = null;
                }
                else if (key == 33 || key == 34) {
                    var n = Math.floor((grid._bt - grid._tp) / grid._rowHeight - 1);
                    if (key == 33) {
                        for (var i = 0; i < n; i++) {
                            grid._cursor._row = grid._cursor._row._visiblePrev;
                            if (grid._cursor._row == grid._rows) {
                                grid._cursor._row = grid._rows._visibleNext;
                                break;
                            }
                        }
                    }
                    else {
                        for (var i = 0; i < n; i++) {
                            grid._cursor._row = grid._cursor._row._visibleNext;
                            if (grid._cursor._row == grid._rows) {
                                grid._cursor._row = grid._rows._visiblePrev;
                                break;
                            }
                        }
                    }
                    if (e.shiftKey) {
                        grid._selectRange();
                    }
                    else {
                        grid._selectCell();
                    }
                }
                else if (key == 32) {
                    // SelectRow, SelectCol, SelectWhole do not go through selectRange()
                    // because selectRange reads from cursor/anchor, but we're not actually changing the cursor/anchor here
                    // so the cursor can end up in the middle of a selected range
                    if (e.ctrlKey || e.shiftKey) {
                        if (e.ctrlKey) {
                            grid._selected._minRow = grid._rows._visibleNext;
                            grid._selected._maxRow = grid._rows._visiblePrev;
                        }
                        if (e.shiftKey) {
                            grid._selected._minCol = grid._cols._visibleNext;
                            grid._selected._maxCol = grid._cols._visiblePrev;
                        }
                        grid._draw();
                    }
                    else {
                        grid._beginEdit(null);
                    }
                }
                else if (key == 37 || key == 38 || key == 39 || key == 40) {
                    if (grid._selected._minRow == null && grid._selected._maxRow == null) {
                        if (e.altKey) {
                            if (key == 37) {
                                grid._moveColsLeft();
                            }
                            else if (key == 38) {
                                grid._hideCols();
                            }
                            else if (key == 39) {
                                grid._moveColsRight();
                            }
                            else if (key == 40) {
                                grid._showCols();
                            }
                        }
                        else if (e.ctrlKey && e.shiftKey) {
                            if (key == 38 || key == 40) {
                                var header = grid._cursor._col._data._header;
                                var ascending = (key == 38);
                                // remove existing SortParams if there is a header collision
                                var elt = grid._multisort._next;
                                while (elt != grid._multisort) {
                                    if (elt._data._header == header) {
                                        elt._remove();
                                    }
                                    elt = elt._next;
                                }
                                grid._multisort._add({ _header: header, _ascending: ascending });
                                grid._setMultisort();
                            }
                        }
                        else if (e.ctrlKey) {
                            if (key == 37) {
                            }
                            else if (key == 39) {
                            }
                            else if (key == 38 || key == 40) {
                                var header = grid._cursor._col._data._header;
                                var ascending = (key == 38);
                                grid._multisort = new GridLinkedList();
                                grid._multisortIndicatorDict = {};
                                grid._setSort({ _header: header, _ascending: ascending });
                            }
                        }
                        else {
                            if (key == 37 || key == 39) {
                                if (key == 37) {
                                    if (grid._cursor._col._visiblePrev != grid._cols) {
                                        grid._cursor._col = grid._cursor._col._visiblePrev;
                                    }
                                }
                                else if (key == 39) {
                                    if (grid._cursor._col._visibleNext != grid._cols) {
                                        grid._cursor._col = grid._cursor._col._visibleNext;
                                    }
                                }
                                if (e.shiftKey) {
                                    grid._selectRange();
                                }
                                else {
                                    grid._selectCell();
                                }
                            }
                            else if (key == 38) {
                            }
                            else if (key == 40) {
                                if (e.shiftKey) {
                                }
                                else {
                                    grid._cursor._row = grid._rows._visibleNext;
                                    grid._selectCell();
                                }
                            }
                        }
                    }
                    else if (grid._selected._minCol == null && grid._selected._maxCol == null) {
                        if (e.altKey) {
                            if (key == 37) {
                                grid._hideRows();
                            }
                            else if (key == 38) {
                                grid._moveRowsUp();
                            }
                            else if (key == 39) {
                                grid._showRows();
                            }
                            else if (key == 40) {
                                grid._moveRowsDown();
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
                                    if (grid._cursor._row._visiblePrev != grid._rows) {
                                        grid._cursor._row = grid._cursor._row._visiblePrev;
                                    }
                                }
                                else if (key == 40) {
                                    if (grid._cursor._row._visibleNext != grid._rows) {
                                        grid._cursor._row = grid._cursor._row._visibleNext;
                                    }
                                }
                                if (e.shiftKey) {
                                    grid._selectRange();
                                }
                                else {
                                    grid._selectCell();
                                }
                            }
                            else if (key == 37) {
                            }
                            else if (key == 39) {
                                if (e.shiftKey) {
                                }
                                else {
                                    grid._cursor._col = grid._cols._visibleNext;
                                    grid._selectCell();
                                }
                            }
                        }
                    }
                    else {
                        if (e.altKey) {
                            if (e.shiftKey) {
                                if (key == 37 || key == 39) {
                                    grid._deleteCols();
                                }
                                else if (key == 38 || key == 40) {
                                    grid._deleteRows();
                                }
                            }
                            else {
                                if (key == 37) {
                                    grid._insertColsLeft();
                                }
                                else if (key == 38) {
                                    grid._insertRowsAbove();
                                }
                                else if (key == 39) {
                                    grid._insertColsRight();
                                }
                                else if (key == 40) {
                                    grid._insertRowsBelow();
                                }
                            }
                        }
                        else {
                            if (key == 37) {
                                if (e.ctrlKey) {
                                    // Ctrl breaks the wall to the header cells
                                    if (grid._cursor._col == grid._cols._visibleNext) {
                                        grid._cursor._col = null;
                                    }
                                    else {
                                        grid._cursor._col = grid._cols._visibleNext;
                                    }
                                }
                                else {
                                    if (grid._cursor._col._visiblePrev != grid._cols) {
                                        grid._cursor._col = grid._cursor._col._visiblePrev;
                                    }
                                }
                            }
                            else if (key == 38) {
                                if (e.ctrlKey) {
                                    // Ctrl breaks the wall to the header cells
                                    if (grid._cursor._row == grid._rows._visibleNext) {
                                        grid._cursor._row = null;
                                    }
                                    else {
                                        grid._cursor._row = grid._rows._visibleNext;
                                    }
                                }
                                else {
                                    if (grid._cursor._row._visiblePrev != grid._rows) {
                                        grid._cursor._row = grid._cursor._row._visiblePrev;
                                    }
                                }
                            }
                            else if (key == 39) {
                                if (e.ctrlKey) {
                                    grid._cursor._col = grid._cols._visiblePrev;
                                }
                                else {
                                    if (grid._cursor._col._visibleNext != grid._cols) {
                                        grid._cursor._col = grid._cursor._col._visibleNext;
                                    }
                                }
                            }
                            else if (key == 40) {
                                if (e.ctrlKey) {
                                    grid._cursor._row = grid._rows._visiblePrev;
                                }
                                else {
                                    if (grid._cursor._row._visibleNext != grid._rows) {
                                        grid._cursor._row = grid._cursor._row._visibleNext;
                                    }
                                }
                            }
                            if (e.shiftKey) {
                                grid._selectRange();
                            }
                            else {
                                grid._selectCell();
                            }
                        }
                    }
                }
                else if (key == 113) {
                    grid._beginEdit(null);
                }
                else if (key == 114 || key == 115 || key == 116 || key == 117) {
                    grid._beginEditArray(['tsv', 'csv', 'json', 'yaml'][key - 114]);
                }
                else if ((48 <= key && key <= 57) || (65 <= key && key <= 90) || (186 <= key && key <= 192) || (219 <= key && key <= 222)) {
                    if (e.ctrlKey) {
                        if (key == 67 || key == 88) {
                            grid._copied = grid._copy(key == 88);
                        }
                        else if (key == 86) {
                            grid._paste();
                        }
                        else if (key == 70) {
                            grid._editMode = 'formula';
                            grid._beginEdit(null);
                        }
                        else if (key == 82) {
                            grid._editMode = 'format';
                            grid._beginEdit(null);
                        }
                        else if (key == 83) {
                            grid._editMode = 'style';
                            grid._beginEdit(null);
                        }
                        else if (key == 76) {
                            grid._editMode = 'filter';
                            grid._beginEdit(null);
                        }
                    }
                    else {
                        var c = KeyToChar(key, grid._shift);
                        grid._beginEdit(c);
                    }
                }
                else {
                }
            };
        };
        Grid.prototype._copy = function (cut) {
            var grid = this;
            return {
                _minRow: grid._selected._minRow,
                _maxRow: grid._selected._maxRow,
                _minCol: grid._selected._minCol,
                _maxCol: grid._selected._maxCol
            };
        };
        Grid.prototype._paste = function () {
            var grid = this;
            if (grid._copied == null) {
                return;
            }
            if (grid._cursor._row == grid._anchor._row && grid._cursor._col == grid._anchor._col) {
                // copy values to cursor - loop over src, guard for row/col length overflows
                // (this is not the time to add new rows/cols - we do that when pasting in external data via textarea)
                var srcRow = grid._copied._minRow;
                var dstRow = grid._cursor._row;
                while (srcRow != grid._copied._maxRow._visibleNext) {
                    var srcCol = grid._copied._minCol;
                    var dstCol = grid._cursor._col;
                    while (srcCol != grid._copied._maxCol._visibleNext) {
                        dstRow._data._object[dstCol._data._header] = srcRow._data._object[srcCol._data._header];
                        srcCol = srcCol._visibleNext;
                        dstCol = dstCol._visibleNext;
                    }
                    srcRow = srcRow._visibleNext;
                    dstRow = dstRow._visibleNext;
                }
            }
            else {
                // copy values to range - loop over dst, modulo the index into the src
                var srcRow = grid._copied._minRow;
                var dstRow = grid._selected._minRow;
                while (dstRow != grid._selected._maxRow._visibleNext) {
                    var srcCol = grid._copied._minCol;
                    var dstCol = grid._selected._minCol;
                    while (dstCol != grid._selected._maxCol._visibleNext) {
                        dstRow._data._object[dstCol._data._header] = srcRow._data._object[srcCol._data._header];
                        srcCol = srcCol._visibleNext;
                        dstCol = dstCol._visibleNext;
                        if (srcCol == grid._copied._maxCol._visibleNext) {
                            srcCol = grid._copied._minCol;
                        } // toroidal wraparound
                    }
                    srcRow = srcRow._visibleNext;
                    dstRow = dstRow._visibleNext;
                    if (srcRow == grid._copied._maxRow._visibleNext) {
                        srcRow = grid._copied._minRow;
                    } // toroidal wraparound
                }
            }
            if (grid._copied._mode == 'cut') {
                grid._setRangeGeneral(null, grid._copied);
                grid._copied = null;
            }
            grid._calculate();
            grid._dataComponent._runAfterChange();
            grid._dataComponent._markDirty();
            grid._draw();
        };
        Grid.prototype._scrollBy = function (offset, rows) {
            var grid = this;
            if (rows) {
                grid._yOffset = 0;
                if (offset < 0) {
                    while (offset < 0) {
                        grid._scroll._minRow = grid._scroll._minRow._visibleNext;
                        grid._scroll._maxRow = grid._scroll._maxRow._visibleNext;
                        if (grid._scroll._maxRow == grid._rows) {
                            grid._scroll._minRow = grid._scroll._minRow._visiblePrev;
                            grid._scroll._maxRow = grid._scroll._maxRow._visiblePrev;
                            grid._calcMinRowFromMaxRow(); // we just need to calculate the new yOffset here
                            break;
                        }
                        offset++;
                    }
                }
                else if (offset > 0) {
                    while (offset > 0) {
                        grid._scroll._minRow = grid._scroll._minRow._visiblePrev;
                        grid._scroll._maxRow = grid._scroll._maxRow._visiblePrev;
                        if (grid._scroll._minRow == grid._rows) {
                            grid._scroll._minRow = grid._scroll._minRow._visibleNext;
                            grid._scroll._maxRow = grid._scroll._maxRow._visibleNext;
                            break;
                        }
                        offset--;
                    }
                }
            }
            else {
                grid._xOffset = 0;
                if (offset < 0) {
                    while (offset < 0) {
                        grid._scroll._minCol = grid._scroll._minCol._visibleNext;
                        grid._scroll._maxCol = grid._scroll._maxCol._visibleNext;
                        if (grid._scroll._maxCol == grid._cols) {
                            grid._scroll._minCol = grid._scroll._minCol._visiblePrev;
                            grid._scroll._maxCol = grid._scroll._maxCol._visiblePrev;
                            grid._calcMinColFromMaxCol(); // we just need to calculate the new xOffset here
                            break;
                        }
                        offset++;
                    }
                }
                else if (offset > 0) {
                    while (offset > 0) {
                        grid._scroll._minCol = grid._scroll._minCol._visiblePrev;
                        grid._scroll._maxCol = grid._scroll._maxCol._visiblePrev;
                        if (grid._scroll._minCol == grid._cols) {
                            grid._scroll._minCol = grid._scroll._minCol._visibleNext;
                            grid._scroll._maxCol = grid._scroll._maxCol._visibleNext;
                            break;
                        }
                        offset--;
                    }
                }
            }
            grid._draw();
        };
        Grid.prototype._resizeRow = function (oldsize, newsize) {
            var grid = this;
            //var event = { type: 'resizeRow', oldsize: oldsize, newsize: newsize };
            grid._dataComponent._markDirty();
        };
        Grid.prototype._resizeCol = function (col, oldsize, newsize) {
            var grid = this;
            //var event = { type: 'resizeCol', header: col._header, oldsize: oldsize, newsize: newsize };
            grid._dataComponent._markDirty();
        };
        Grid.prototype._beginEdit = function (c) {
            var grid = this;
            var current = '';
            var row = grid._cursor._row;
            var col = grid._cursor._col;
            if (grid._editMode == 'value') {
                if (row == null) {
                    current = col._data._header;
                }
                else {
                    var value = grid._dataComponent._data[row._data._index][col._data._header];
                    current = ((value === null) ? '' : value.toString());
                }
            }
            else if (grid._editMode == 'formula') {
                current = col._data._formula;
            }
            else if (grid._editMode == 'format') {
                current = col._data._format;
            }
            else if (grid._editMode == 'style') {
                current = col._data._style;
            }
            else if (grid._editMode == 'filter') {
                current = grid._filter;
            }
            var lf = 0;
            var tp = 0;
            var rt = 0;
            var bt = 0;
            for (var i = 0; i < grid._visibleRows.length; i++) {
                if (grid._visibleRows[i] == grid._cursor._row) {
                    tp = grid._ys[i];
                }
            }
            for (var j = 0; j < grid._visibleCols.length; j++) {
                if (grid._visibleCols[j] == grid._cursor._col) {
                    lf = grid._xs[j];
                }
            }
            grid._input.value = (c ? c : current);
            grid._input.style.display = 'block';
            grid._input.style.top = (tp - grid._ctx.canvas.height - 5).toString() + 'px';
            grid._input.style.left = lf.toString() + 'px';
            grid._input.style.width = (grid._cursor._col._data._width - 1).toString() + 'px';
            grid._input.style.height = (grid._rowHeight - 1).toString() + 'px';
            grid._input.focus();
            grid._setEditHandlers();
        };
        Grid.prototype._beginEditArray = function (format) {
            var grid = this;
            // what if the selection starts off-screen?
            // we should probably scroll to the top-left
            /*
            
            var lf = grid._xs[grid._selected._minCol];
            var rt = grid._xs[grid._selected._maxCol+1];
            var tp = grid._ys[grid._selected._minRow];
            var bt = grid._ys[grid._selected._maxRow+1];
            
            //var savedData = grid._dataComponent._data;
            //grid._dataComponent._data = grid._getSelectionData();
            //var text = grid._dataComponent._get({format:format});
            //grid._dataComponent._data = savedData;
            var data: string[][] = grid._getSelectionData();
            var text: string = data.map(function(row) { return row.join('\t'); }).join('\n');
            
            grid._textarea.value = text;
            grid._textarea.style.display = 'block';
            grid._textarea.style.top = (tp - grid._ctx.canvas.height).toString() + 'px';
            grid._textarea.style.left = lf.toString() + 'px';
            grid._textarea.style.height = (bt - tp).toString() + 'px';
            grid._textarea.style.width = (rt - lf).toString() + 'px';
            grid._textarea.focus();
            grid._textarea.select();
            
            function ClearEdit() {
                grid._textarea.value = '';
                grid._textarea.style.display = 'none';
                var savedScrollTop = document.getElementById('cells-container').scrollTop;
                grid._ctx.canvas.focus();
                document.getElementById('cells-container').scrollTop = savedScrollTop;
            }
            
            grid._textarea.onkeydown = function(e: KeyboardEvent) {
                
                var key: number = e.keyCode;
                
                if (key == 27) // esc
                {
                    ClearEdit();
                }
                else if (key == 13) // return - accepting the edit on return is not great, because people will use return while editing
                {
                    var text = grid._textarea.value;
                    var matrix = text.trim().split('\n').map(function(line) { return line.split('\t'); });
                    
                    // parse format, stretch or shrink grid if appropriate, otherwise reject edit if dimensions are not correct
                    // then set individual cells
                    
                    // we need the Data component to parse format
                    
                    //var newdata: any = ParseFormat(grid._textarea.value, format);
                    
                    for (var i = 0; i < matrix.length; i++)
                    {
                        for (var j = 0; j < matrix[i].length; j++)
                        {
                            var row = grid._selected._minRow + i;
                            var col = grid._selected._minCol + j;
                            
                            if (row >= grid._nRows || col >= grid._nCols) { continue; } // or add rows/cols to fit?
                            
                            // this needs to be merged with the mainstream acceptEdit function
                            
                            var str = matrix[i][j];
                            var cell = grid._cells[row][col];
                            
                            if (str.length > 0 && str[0] == '=')
                            {
                                //cell.formula = str;
                                //
                                //var formula: string = str.substr(1);
                                //var fn = new Function('i', 'return ' + formula);
                                //var result: any = fn.apply(grid._cellArray, [i-1]);
                                //cell.value = result;
                            }
                            else
                            {
                                cell.value = ParseStringToObj(str);
                            }
                            
                            cell.string = Format(cell.value, cell.formatObject);
                            
                            grid._dataComponent._data[row-1][grid._dataComponent._headers[col-1]] = cell.value;
                        }
                    }
                    
                    grid._dataComponent._runAfterChange();
                    
                    grid._draw();
                    
                    ClearEdit();
                }
            };
            
            */
        };
        Grid.prototype._setEditHandlers = function () {
            var grid = this;
            grid._input.onkeydown = function (e) {
                var key = e.keyCode;
                if (key == 27) {
                    grid._rejectEdit();
                }
                else if (key == 13) {
                    grid._acceptEdit();
                }
            };
        };
        Grid.prototype._rejectEdit = function () {
            var grid = this;
            grid._clearEdit();
        };
        Grid.prototype._acceptEdit = function () {
            var grid = this;
            var str = grid._input.value;
            var row = grid._cursor._row;
            var col = grid._cursor._col;
            if (row == null && col == null) {
            }
            else if (col == null) {
            }
            else if (row == null) {
                if (col._data._header == str) {
                    return;
                } // no change, no need to do anything
                var headers = grid._cols._enumerate().map(function (col) { return col._header; });
                if (headers.indexOf(str) > -1) {
                    return;
                } // collision, bail
                var oldfield = col._data._header;
                col._data._header = str;
                for (var i = 0; i < grid._dataComponent._data.length; i++) {
                    var obj = grid._dataComponent._data[i];
                    obj[str] = obj[oldfield];
                    delete obj[oldfield];
                }
                // change headers in the data component
                for (var k = 0; k < grid._dataComponent._headers.length; k++) {
                    if (grid._dataComponent._headers[k] == oldfield) {
                        grid._dataComponent._headers[k] = str;
                    }
                }
                // change multisort headers
                var sortParams = grid._multisort._enumerate();
                for (var k = 0; k < sortParams.length; k++) {
                    if (sortParams[k]._header == oldfield) {
                        sortParams[k]._header = str;
                    }
                }
                grid._multisortIndicatorDict[str] = grid._multisortIndicatorDict[oldfield];
                delete grid._multisortIndicatorDict[oldfield];
                // change formulas that reference the old field name?
                grid._calculate();
                grid._dataComponent._runAfterChange();
                grid._dataComponent._markDirty();
            }
            else {
                if (grid._editMode == 'value') {
                    // set formula/value on all cells in selection
                    var value = ParseStringToObj(str);
                    grid._setRange(value);
                }
                else if (grid._editMode == 'formula') {
                    col._data._setFormula(str);
                    grid._calculate();
                    grid._dataComponent._runAfterChange();
                    grid._editMode = 'value';
                }
                else if (grid._editMode == 'format') {
                    col._data._setFormat(str);
                    grid._editMode = 'value';
                }
                else if (grid._editMode == 'style') {
                    col._data._setStyle(str);
                    grid._editMode = 'value';
                }
                else if (grid._editMode == 'filter') {
                    grid._setFilter(str);
                    grid._editMode = 'value';
                }
            }
            grid._draw();
            grid._clearEdit();
        };
        Grid.prototype._clearEdit = function () {
            var grid = this;
            grid._input.value = '';
            grid._input.style.display = 'none';
            grid._shift = false;
            grid._ctrl = false;
            grid._alt = false;
            grid._tab = false;
            var savedScrollTop = document.getElementById('cells-container').scrollTop;
            grid._ctx.canvas.focus();
            document.getElementById('cells-container').scrollTop = savedScrollTop;
        };
        Grid.prototype._getSelectionData = function () {
            var grid = this;
            var data = [];
            var selection = grid._selected;
            var row = selection._minRow;
            var col = selection._minCol;
            var datarow = [];
            datarow.push(row._data._object[col._data._header].toString()); // format appropriately
            while (col != selection._maxCol) {
                col = col._visibleNext;
                datarow.push(row._data._object[col._data._header].toString()); // format appropriately
            }
            while (row != selection._maxRow) {
                row = row._visibleNext;
                data.push(datarow);
                datarow = [];
                col = selection._minCol;
                datarow.push(row._data._object[col._data._header].toString()); // format appropriately
                while (col != selection._maxCol) {
                    col = col._visibleNext;
                    datarow.push(row._data._object[col._data._header].toString()); // format appropriately
                }
            }
            return data;
        };
        Grid.prototype._selectCell = function () {
            var grid = this;
            grid._anchor._row = grid._cursor._row;
            grid._anchor._col = grid._cursor._col;
            grid._selected._minRow = grid._cursor._row;
            grid._selected._maxRow = grid._cursor._row;
            grid._selected._minCol = grid._cursor._col;
            grid._selected._maxCol = grid._cursor._col;
            var addr = grid._cursor._col._data._header + ' ' + grid._cursor._row._data._index.toString();
            var text = Format(grid._cursor._row._data._object[grid._cursor._col._data._header], grid._cursor._col._data._format);
            grid._ctx.canvas.setAttribute('aria-label', addr + ' ' + text);
            grid._adjustScroll();
            grid._draw();
        };
        Grid.prototype._selectRange = function () {
            var grid = this;
            grid._selected._minRow = ((grid._cursor._row === null) ? null : ((grid._cursor._row._data._index < grid._anchor._row._data._index) ? grid._cursor._row : grid._anchor._row));
            grid._selected._maxRow = ((grid._cursor._row === null) ? null : ((grid._cursor._row._data._index > grid._anchor._row._data._index) ? grid._cursor._row : grid._anchor._row));
            grid._selected._minCol = ((grid._cursor._col === null) ? null : ((grid._cursor._col._data._index < grid._anchor._col._data._index) ? grid._cursor._col : grid._anchor._col));
            grid._selected._maxCol = ((grid._cursor._col === null) ? null : ((grid._cursor._col._data._index > grid._anchor._col._data._index) ? grid._cursor._col : grid._anchor._col));
            grid._adjustScroll();
            grid._draw();
        };
        Grid.prototype._clearSelection = function () {
            var grid = this;
            grid._input.style.display = 'none';
            grid._selected = null;
            grid._cursor._row = null;
            grid._cursor._col = null;
            grid._anchor._row = null;
            grid._anchor._col = null;
            grid._draw();
        };
        Grid.prototype._adjustScroll = function () {
            var grid = this;
            if (grid._cursor._row != null) {
                if (grid._cursor._row._data._index < grid._scroll._minRow._data._index) {
                    grid._scroll._minRow = grid._cursor._row;
                    grid._calcMaxRowFromMinRow();
                    grid._yOffset = 0;
                }
                if (grid._cursor._row._data._index > grid._scroll._maxRow._data._index) {
                    grid._scroll._maxRow = grid._cursor._row;
                    grid._yOffset = grid._calcMinRowFromMaxRow();
                }
            }
            if (grid._cursor._col != null) {
                if (grid._cursor._col._data._index < grid._scroll._minCol._data._index) {
                    grid._scroll._minCol = grid._cursor._col;
                    grid._calcMaxColFromMinCol();
                    grid._xOffset = 0;
                }
                if (grid._cursor._col._data._index > grid._scroll._maxCol._data._index) {
                    grid._scroll._maxCol = grid._cursor._col;
                    grid._xOffset = grid._calcMinColFromMaxCol();
                }
            }
        };
        Grid.prototype._calcMaxRowFromMinRow = function () {
            var grid = this;
            var rowElt = grid._scroll._minRow;
            var y = grid._tp + grid._rowHeight;
            y += grid._rowHeight;
            //y -= grid._yOffset; // a one-time correction
            while (y < grid._bt) {
                y += grid._rowHeight;
                rowElt = rowElt._visibleNext;
                if (rowElt == grid._rows) {
                    rowElt = rowElt._visiblePrev;
                    break;
                }
            }
            grid._scroll._maxRow = rowElt;
        };
        Grid.prototype._calcMaxColFromMinCol = function () {
            var grid = this;
            var colElt = grid._scroll._minCol;
            var x = grid._lf + grid._rowHeaderWidth;
            x += colElt._data._width;
            //x -= grid._xOffset; // a one-time correction
            while (x < grid._rt) {
                x += colElt._data._width;
                colElt = colElt._visibleNext;
                if (colElt == grid._cols) {
                    colElt = colElt._visiblePrev;
                    break;
                }
            }
            grid._scroll._maxCol = colElt;
        };
        Grid.prototype._calcMinRowFromMaxRow = function () {
            var grid = this;
            var rowElt = grid._scroll._maxRow;
            var y = grid._bt;
            y -= grid._rowHeight;
            //y += grid._yOffset; // a one-time correction
            while (y > (grid._tp + grid._rowHeight)) {
                y -= grid._rowHeight;
                rowElt = rowElt._visiblePrev;
                if (rowElt == grid._rows) {
                    rowElt = rowElt._visibleNext;
                    break;
                }
            }
            grid._scroll._minRow = rowElt;
            var yOffset = (grid._tp + grid._rowHeight) - y;
            grid._yOffset = yOffset;
            return yOffset;
        };
        Grid.prototype._calcMinColFromMaxCol = function () {
            var grid = this;
            var colElt = grid._scroll._maxCol;
            var x = grid._rt;
            x -= colElt._data._width;
            //x += grid._xOffset; // a one-time correction
            while (x > (grid._lf + grid._rowHeaderWidth)) {
                x -= colElt._data._width;
                colElt = colElt._visiblePrev;
                if (colElt == grid._cols) {
                    colElt = colElt._visibleNext;
                    break;
                }
            }
            grid._scroll._minCol = colElt;
            var xOffset = (grid._lf + grid._rowHeaderWidth) - x;
            grid._xOffset = xOffset;
            return xOffset;
        };
        Grid.prototype._setRange = function (value) {
            var grid = this;
            grid._setRangeGeneral(value, grid._selected);
        };
        Grid.prototype._setRangeGeneral = function (value, sel) {
            // this should replace selectRange above
            var grid = this;
            var rowElt = sel._minRow;
            while (rowElt._visiblePrev != sel._maxRow) {
                var colElt = sel._minCol;
                while (colElt._visiblePrev != sel._maxCol) {
                    var index = rowElt._data._index;
                    var field = colElt._data._header;
                    grid._dataComponent._data[index][field] = value;
                    colElt = colElt._visibleNext;
                }
                rowElt = rowElt._visibleNext;
            }
            // mark affected columns as uncalculated, calculate, and trigger afterchange
            EnumerateVisible(sel._minCol, sel._maxCol).map(function (col) { col._markUncalculated(); });
            grid._calculate();
            grid._dataComponent._runAfterChange();
            grid._dataComponent._markDirty();
        };
        Grid.prototype._insertRowsAbove = function () { var grid = this; grid._insertRows(true); };
        Grid.prototype._insertRowsBelow = function () { var grid = this; grid._insertRows(false); };
        Grid.prototype._insertColsLeft = function () { var grid = this; grid._insertCols(true); };
        Grid.prototype._insertColsRight = function () { var grid = this; grid._insertCols(false); };
        Grid.prototype._moveRowsUp = function () { var grid = this; grid._moveRows(-1); };
        Grid.prototype._moveRowsDown = function () { var grid = this; grid._moveRows(1); };
        Grid.prototype._moveColsLeft = function () { var grid = this; grid._moveCols(-1); };
        Grid.prototype._moveColsRight = function () { var grid = this; grid._moveCols(1); };
        Grid.prototype._insertRows = function (bAbove) {
            var grid = this;
            var sel = grid._selected;
            var n = CountVisible(sel._minRow, sel._maxRow);
            var headers = grid._cols._enumerate().map(function (col) { return col._header; });
            if (bAbove) {
                var cursor = sel._minRow;
                var prev = sel._minRow._prev;
                var visiblePrev = sel._minRow._visiblePrev;
                for (var i = 0; i < n; i++) {
                    var obj = {};
                    for (var k = 0; k < headers.length; k++) {
                        obj[headers[k]] = null;
                    }
                    var row = new Row(-1, obj);
                    var elt = new HiddenList();
                    elt._data = row;
                    elt._next = cursor;
                    cursor._prev = elt;
                    elt._visibleNext = cursor;
                    cursor._visiblePrev = elt;
                    cursor = elt;
                }
                cursor._prev = prev;
                prev._next = cursor;
                cursor._visiblePrev = visiblePrev;
                visiblePrev._visibleNext = cursor;
                grid._reIndex(cursor, grid._rows);
                grid._cursor._row = cursor;
                grid._anchor._row = sel._minRow._prev;
            }
            else {
                var cursor = sel._maxRow;
                var next = sel._maxRow._next;
                var visibleNext = sel._maxRow._visibleNext;
                for (var i = 0; i < n; i++) {
                    var obj = {};
                    for (var k = 0; k < headers.length; k++) {
                        obj[headers[k]] = null;
                    }
                    var row = new Row(-1, obj);
                    var elt = new HiddenList();
                    elt._data = row;
                    elt._prev = cursor;
                    cursor._next = elt;
                    elt._visiblePrev = cursor;
                    cursor._visibleNext = elt;
                    cursor = elt;
                }
                cursor._next = next;
                next._prev = cursor;
                cursor._visibleNext = visibleNext;
                visibleNext._visiblePrev = cursor;
                grid._reIndex(sel._maxRow._next, grid._rows);
                grid._anchor._row = sel._maxRow._next;
                grid._cursor._row = cursor;
            }
            grid._calcMaxRowFromMinRow();
            grid._selectRange();
            grid._dataComponent._data = grid._rows._enumerate().map(function (row) { return row._object; });
            grid._cols._enumerate().forEach(function (col) { col._calculated = false; });
            grid._calculate();
            grid._dataComponent._runAfterChange();
            grid._dataComponent._markDirty();
        };
        Grid.prototype._insertCols = function (bLeft) {
            var grid = this;
            var sel = grid._selected;
            var n = CountVisible(sel._minCol, sel._maxCol);
            var headers = grid._cols._enumerate().map(function (col) { return col._header; });
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
            var rowElt = grid._rows._next;
            while (rowElt != grid._rows) {
                for (var k = 0; k < newheaders.length; k++) {
                    rowElt._data._object[newheaders[k]] = null;
                }
                rowElt = rowElt._next;
            }
            if (bLeft) {
                var cursor = sel._minCol;
                var prev = sel._minCol._prev;
                var visiblePrev = sel._minCol._visiblePrev;
                for (var i = 0; i < n; i++) {
                    var col = new Col(grid, { header: newheaders[i], visible: true, width: 64, formula: '', format: null, style: null }, -1);
                    var elt = new HiddenList();
                    elt._data = col;
                    elt._next = cursor;
                    cursor._prev = elt;
                    elt._visibleNext = cursor;
                    cursor._visiblePrev = elt;
                    cursor = elt;
                }
                cursor._prev = prev;
                prev._next = cursor;
                cursor._visiblePrev = visiblePrev;
                visiblePrev._visibleNext = cursor;
                grid._reIndex(cursor, grid._cols);
                grid._cursor._col = cursor;
                grid._anchor._col = sel._minCol._prev;
            }
            else {
                var cursor = sel._maxCol;
                var next = sel._maxCol._next;
                var visibleNext = sel._maxCol._visibleNext;
                for (var i = 0; i < n; i++) {
                    var col = new Col(grid, { header: newheaders[i], visible: true, width: 64, formula: '', format: null, style: null }, -1);
                    var elt = new HiddenList();
                    elt._data = col;
                    elt._prev = cursor;
                    cursor._next = elt;
                    elt._visiblePrev = cursor;
                    cursor._visibleNext = elt;
                    cursor = elt;
                }
                cursor._next = next;
                next._prev = cursor;
                cursor._visibleNext = visibleNext;
                visibleNext._visiblePrev = cursor;
                grid._reIndex(sel._maxCol._next, grid._cols);
                grid._anchor._col = sel._maxCol._next;
                grid._cursor._col = cursor;
            }
            grid._calcMaxColFromMinCol();
            grid._selectRange();
            grid._dataComponent._headers = grid._cols._enumerate().map(function (col) { return col._header; });
            grid._calculate();
            grid._dataComponent._runAfterChange();
            grid._dataComponent._markDirty();
        };
        Grid.prototype._deleteRows = function () {
            var grid = this;
            var sel = grid._selected;
            // disallow deletion of all visible rows
            if (sel._minRow._visiblePrev == grid._rows && sel._maxRow._visibleNext == grid._rows) {
                return;
            }
            // delete data - we're not going to do this now - just re-enumerate the objects on display change or Get
            //var k = sel._minRow._data._index;
            //var n = sel._maxRow._data._index - sel._minRow_data._index + 1;
            //var deleted = grid._dataComponent._data._splice(k-1, n);
            // splice linked list
            sel._minRow._prev._next = sel._maxRow._next;
            sel._maxRow._next._prev = sel._minRow._prev;
            sel._minRow._visiblePrev._visibleNext = sel._maxRow._visibleNext;
            sel._maxRow._visibleNext._visiblePrev = sel._minRow._visiblePrev;
            var remaining = sel._minRow._visiblePrev;
            if (remaining == grid._rows) {
                remaining = remaining._visibleNext;
            }
            grid._reIndex(remaining, grid._rows);
            grid._calcMaxRowFromMinRow();
            // reposition cursor - could be prev or next depending on Shift+Alt+Up vs Shift+Alt+Down
            grid._anchor._row = remaining;
            grid._cursor._row = remaining;
            grid._selectRange();
            grid._dataComponent._data = grid._rows._enumerate().map(function (row) { return row._object; });
            grid._cols._enumerate().forEach(function (col) { col._calculated = false; });
            grid._calculate();
            grid._dataComponent._runAfterChange();
            grid._dataComponent._markDirty();
        };
        Grid.prototype._deleteCols = function () {
            var grid = this;
            var sel = grid._selected;
            // disallow deletion of all visible cols
            if (sel._minCol._visiblePrev == grid._cols && sel._maxCol._visibleNext == grid._cols) {
                return;
            }
            var deletedCols = Enumerate(sel._minCol, sel._maxCol);
            // delete data
            var headers = deletedCols.map(function (col) { return col._header; });
            var elt = grid._rows._next;
            while (elt != grid._rows) {
                for (var k = 0; k < headers.length; k++) {
                    delete elt._data._object[headers[k]];
                }
                elt = elt._next;
            }
            // tear down srcs/dsts
            for (var i = 0; i < deletedCols.length; i++) {
                var col = deletedCols[i];
                col._srcs.forEach(function (src) { src._dsts.delete(col); });
                col._dsts.forEach(function (dst) {
                    // okay, so what happens to a formula col when a dependency is deleted?
                    dst._srcs.delete(col);
                });
            }
            // splice linked list
            sel._minCol._prev._next = sel._maxCol._next;
            sel._maxCol._next._prev = sel._minCol._prev;
            sel._minCol._visiblePrev._visibleNext = sel._maxCol._visibleNext;
            sel._maxCol._visibleNext._visiblePrev = sel._minCol._visiblePrev;
            // determining where cursor will end up
            var remaining = sel._minCol._visiblePrev;
            if (remaining == grid._cols) {
                remaining = remaining._visibleNext;
            }
            grid._reIndex(remaining, grid._cols);
            grid._dataComponent._headers = grid._cols._enumerate().map(function (col) { return col._header; });
            grid._cols._enumerate().forEach(function (col) { col._calculated = false; });
            grid._calcMaxColFromMinCol();
            // reposition cursor - could be prev or next depending on Shift+Alt+Left vs Shift+Alt+Right
            grid._anchor._col = remaining;
            grid._cursor._col = remaining;
            grid._selectRange();
            grid._calculate();
            grid._dataComponent._runAfterChange();
            grid._dataComponent._markDirty();
        };
        Grid.prototype._moveRows = function (k) {
            var grid = this;
            var sel = grid._selected;
            var min = sel._minRow;
            var max = sel._maxRow;
            var sentinel = grid._rows;
            // check for underflow and overflow
            if (k < 0 && min._visiblePrev == sentinel) {
                return;
            }
            if (k > 0 && max._visibleNext == sentinel) {
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
                var C = E._visiblePrev;
                var D = E._prev;
                var A = C._visiblePrev;
                var B = C._prev;
                var G = F._next;
                var H = F._visibleNext;
                E._prev = B;
                B._next = E;
                E._visiblePrev = A;
                A._visibleNext = E;
                F._next = C;
                C._prev = F;
                F._visibleNext = C;
                C._visiblePrev = F;
                C._visibleNext = H;
                H._visiblePrev = C;
                D._next = G;
                G._prev = D;
                grid._reIndex(B, sentinel);
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
                var C = E._visiblePrev;
                var D = E._prev;
                var G = F._next;
                var H = F._visibleNext;
                var I = H._next;
                var J = H._visibleNext;
                D._next = G;
                G._prev = D;
                C._visibleNext = H;
                H._visiblePrev = C;
                H._next = E;
                E._prev = H;
                H._visibleNext = E;
                E._visiblePrev = H;
                F._next = I;
                I._prev = F;
                F._visibleNext = J;
                J._visiblePrev = F;
                grid._reIndex(D, sentinel);
            }
            grid._dataComponent._data = grid._rows._enumerate().map(function (row) { return row._object; });
            grid._cols._enumerate().forEach(function (col) { col._calculated = false; });
            grid._calculate();
            grid._draw();
            grid._dataComponent._runAfterChange();
            grid._dataComponent._markDirty();
            // cursor and anchor can stay the same
        };
        Grid.prototype._moveCols = function (k) {
            var grid = this;
            var sel = grid._selected;
            var min = sel._minCol;
            var max = sel._maxCol;
            var sentinel = grid._cols;
            // check for underflow and overflow
            if (k < 0 && min._visiblePrev == sentinel) {
                return;
            }
            if (k > 0 && max._visibleNext == sentinel) {
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
                var C = E._visiblePrev;
                var D = E._prev;
                var A = C._visiblePrev;
                var B = C._prev;
                var G = F._next;
                var H = F._visibleNext;
                E._prev = B;
                B._next = E;
                E._visiblePrev = A;
                A._visibleNext = E;
                F._next = C;
                C._prev = F;
                F._visibleNext = C;
                C._visiblePrev = F;
                C._visibleNext = H;
                H._visiblePrev = C;
                D._next = G;
                G._prev = D;
                grid._reIndex(B, sentinel);
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
                var C = E._visiblePrev;
                var D = E._prev;
                var G = F._next;
                var H = F._visibleNext;
                var I = H._next;
                var J = H._visibleNext;
                D._next = G;
                G._prev = D;
                C._visibleNext = H;
                H._visiblePrev = C;
                H._next = E;
                E._prev = H;
                H._visibleNext = E;
                E._visiblePrev = H;
                F._next = I;
                I._prev = F;
                F._visibleNext = J;
                J._visiblePrev = F;
                grid._reIndex(D, sentinel);
            }
            grid._draw();
            grid._dataComponent._headers = grid._cols._enumerate().map(function (col) { return col._header; });
            grid._dataComponent._markDirty();
            // cursor and anchor can stay the same
        };
        Grid.prototype._hideRows = function () {
            // this is pretty similar to delete
            var grid = this;
            var sel = grid._selected;
            if (sel._minRow._visiblePrev == grid._rows && sel._maxRow._visibleNext == grid._rows) {
                return;
            }
            sel._minRow._visiblePrev._visibleNext = sel._maxRow._visibleNext;
            sel._maxRow._visibleNext._visiblePrev = sel._minRow._visiblePrev;
            var remaining = sel._minRow._visiblePrev;
            if (remaining == grid._rows) {
                remaining = remaining._visibleNext;
            }
            sel._minRow = remaining;
            sel._maxRow = remaining;
            grid._calcMaxRowFromMinRow();
            grid._anchor._row = remaining;
            grid._cursor._row = remaining;
            grid._selectRange();
        };
        Grid.prototype._hideCols = function () {
            // this is pretty similar to delete
            var grid = this;
            var sel = grid._selected;
            if (sel._minCol._visiblePrev == grid._cols && sel._maxCol._visibleNext == grid._cols) {
                return;
            }
            var elt = sel._minCol;
            elt._data._visible = false;
            while (elt != sel._maxCol) {
                elt._data._visible = false;
                elt = elt._next;
            }
            sel._minCol._visiblePrev._visibleNext = sel._maxCol._visibleNext;
            sel._maxCol._visibleNext._visiblePrev = sel._minCol._visiblePrev;
            var remaining = sel._minCol._visiblePrev;
            if (remaining == grid._cols) {
                remaining = remaining._visibleNext;
            }
            sel._minCol = remaining;
            sel._maxCol = remaining;
            grid._calcMaxColFromMinCol();
            grid._anchor._col = remaining;
            grid._cursor._col = remaining;
            grid._selectRange();
        };
        Grid.prototype._showRows = function () {
            var grid = this;
            var sel = grid._selected;
            var min = sel._minRow;
            var max = sel._maxRow;
            // normally we assume some range is selected and show the ranks interior to that range (and not the ranks on the edges)
            // to show ranks at either edge of the grid, make sure only the edge cell is selected
            if (min == max) {
                if (min._visiblePrev == grid._rows) {
                    min = grid._rows._next;
                }
                if (max._visibleNext == grid._rows) {
                    max = grid._rows._prev;
                }
            }
            var elt = min;
            while (elt != max) {
                elt._visibleNext = elt._next;
                elt._next._visiblePrev = elt;
                elt = elt._next;
            }
            // if it was an edge show, extend the selection
            sel._minRow = min;
            sel._maxRow = max;
            grid._calcMaxRowFromMinRow();
            grid._draw();
        };
        Grid.prototype._showCols = function () {
            var grid = this;
            var sel = grid._selected;
            var min = sel._minCol;
            var max = sel._maxCol;
            // normally we assume some range is selected and show the ranks interior to that range (and not the ranks on the edges)
            // to show ranks at either edge of the grid, make sure only the edge cell is selected
            // if there is only one col visible, both edges get selected
            if (min == max) {
                if (min._visiblePrev == grid._cols) {
                    min = grid._cols._next;
                }
                if (max._visibleNext == grid._cols) {
                    max = grid._cols._prev;
                }
            }
            var elt = min;
            while (elt != max) {
                elt._data._visible = true;
                elt._visibleNext = elt._next;
                elt._next._visiblePrev = elt;
                elt = elt._next;
            }
            elt._data._visible = true; // take care of the max
            grid._calcMaxColFromMinCol();
            // if it was an edge show, extend the selection - these lines only have an effect if min/max was on an edge
            sel._minCol = min;
            sel._maxCol = max;
            grid._draw();
        };
        Grid.prototype._reIndex = function (elt, sentinel) {
            var grid = this;
            if (elt == sentinel) {
                elt = elt._next;
            }
            if (elt._prev == sentinel) {
                elt._data._index = 0;
                elt = elt._next;
            }
            while (elt != sentinel) {
                elt._data._index = elt._prev._data._index + 1;
                elt = elt._next;
            }
        };
        Grid.prototype._setMultisort = function () {
            var grid = this;
            var str = '';
            var sortParams = grid._multisort._enumerate();
            grid._multisortIndicatorDict = {};
            for (var i = 0; i < sortParams.length; i++) {
                var sorter = sortParams[i];
                grid._multisortIndicatorDict[sorter._header] = (sorter._ascending ? -1 : 1) * (i + 1);
                var part = (sorter._ascending ? 'a' : 'b') + '.' + sorter._header + ' - ' + (sorter._ascending ? 'b' : 'a') + '.' + sorter._header;
                str += 'if (' + part + ' != 0) { return ' + part + '; } else { ';
            }
            str += 'return 0;';
            for (var i = 0; i < sortParams.length; i++) {
                str += ' }';
            }
            grid._sortFn = new Function('a,b', str);
            grid._applySort();
        };
        Grid.prototype._setSort = function (sorter) {
            var grid = this;
            // this is valid for numbers only, if we want to compare strings it will have to use localeCompare() or something
            var str = (sorter._ascending ? 'a' : 'b') + '.' + sorter._header + ' - ' + (sorter._ascending ? 'b' : 'a') + '.' + sorter._header;
            grid._sortFn = new Function('a,b', 'return ' + str);
            grid._applySort();
        };
        Grid.prototype._applySort = function () {
            var grid = this;
            var rows = grid._rows._enumerate();
            var objects = [];
            for (var i = 0; i < rows.length; i++) {
                objects.push(rows[i]._object);
            }
            grid._dataComponent._data = objects.sort(grid._sortFn);
            grid._rows = new HiddenList();
            for (var i = 0; i < grid._dataComponent._data.length; i++) {
                grid._rows._add(new Row(i, grid._dataComponent._data[i]), true);
            }
            grid._applyFilter();
            grid._dataComponent._markDirty();
            grid._draw();
        };
        Grid.prototype._setFilter = function (fnstr) {
            var grid = this;
            grid._filter = fnstr;
            if (fnstr == null || fnstr == '') {
                fnstr = 'true';
            }
            try {
                grid._filterFn = new Function('return ' + fnstr);
            }
            catch (e) {
                grid._filterFn = function () { return true; };
            }
            grid._applyFilter();
            grid._dataComponent._markDirty();
            grid._clearSelection(); // this also calls draw()
        };
        Grid.prototype._applyFilter = function () {
            var grid = this;
            var elt = grid._rows._next;
            var lastVisible = grid._rows;
            while (elt != grid._rows) {
                var include = grid._filterFn.apply(elt._data._object);
                if (include) {
                    elt._visiblePrev = lastVisible;
                    lastVisible._visibleNext = elt;
                    lastVisible = elt;
                }
                else {
                    elt._visiblePrev = null;
                    elt._visibleNext = null;
                }
                elt = elt._next;
            }
            lastVisible._visibleNext = grid._rows;
            grid._rows._visiblePrev = lastVisible;
            // if there are zero visible rows, what do we do?  for now, unhide everything
            if (grid._rows._visibleNext == grid._rows) {
                console.log('Error: filter "' + grid._filter + '" returns zero visible rows');
                var elt = grid._rows._next;
                var lastVisible = grid._rows;
                while (elt != grid._rows) {
                    elt._visiblePrev = lastVisible;
                    lastVisible._visibleNext = elt;
                    lastVisible = elt;
                }
                elt = elt._next;
            }
            grid._scroll._minRow = grid._rows._visibleNext;
            grid._calcMaxRowFromMinRow();
        };
        return Grid;
    }());
    Eyeshade.Grid = Grid;
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
            elt = elt._next;
            n++;
        }
        return n;
    }
    function CountVisible(a, b) {
        var n = 1;
        var elt = a;
        while (elt != b) {
            elt = elt._visibleNext;
            n++;
        }
        return n;
    }
    function Enumerate(a, b) {
        var result = [];
        var elt = a;
        while (true) {
            result.push(elt._data);
            if (elt == b) {
                break;
            }
            elt = elt._next;
        }
        return result;
    }
    function EnumerateVisible(a, b) {
        var result = [];
        var elt = a;
        while (true) {
            result.push(elt._data);
            if (elt == b) {
                break;
            }
            elt = elt._visibleNext;
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
        var _fmt = fmt;
        var match = [];
        var parse_tree = [];
        var arg_names = 0;
        while (_fmt) {
            if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
                parse_tree.push(match[0]);
            }
            else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
                parse_tree.push('%');
            }
            else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
                if (match[2]) {
                    arg_names |= 1;
                    var field_list = [];
                    var replacement_field = match[2];
                    var field_match = [];
                    if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                        field_list.push(field_match[1]);
                        while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                            if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                                field_list.push(field_match[1]);
                            }
                            else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                                field_list.push(field_match[1]);
                            }
                            else {
                                throw ('[sprintf] huh?');
                            }
                        }
                    }
                    else {
                        throw ('[sprintf] huh?');
                    }
                    match[2] = field_list;
                }
                else {
                    arg_names |= 2;
                }
                if (arg_names === 3) {
                    throw ('[sprintf] mixing positional and named placeholders is not (yet) supported');
                }
                parse_tree.push(match);
            }
            else {
                throw ('[sprintf] huh?');
            }
            _fmt = _fmt.substring(match[0].length);
        }
        return parse_tree;
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
})(Eyeshade || (Eyeshade = {}));
