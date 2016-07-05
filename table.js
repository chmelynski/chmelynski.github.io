
(function() {

// we need to get Table to support [].  and then it returns a CellRow which also supports []

// we need a BigTable for big data - where we don't create Cells, we work mostly with Columns (and optional SummaryRows)


// wait, we create a separate CellArray object to serve as this in the function application

// foo should resolve within the row - this is possible because CellRow is part of the prototype chain

// prototype chain of the this that the cell formula executes on:
// CellInstance -> CellRow -> CellArray -> Environment
// the entire purpose of this series of objects is to provide namespaces in which to execute formula functions
// therefore, we can't just pollute it with names

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects

var Environment = function() {
	
	// this 
};
var CellArray = function(grid) {
	
	for (var i = 0; i < grid.data.length; i++)
	{
		this[i] = new CellRow(grid, i);
		//Object.defineProperty(this, i, {
		//	get : function() {
		//		
		//	},
		//});
	}
	//this.grid = null;
};
var CellRow = function(grid, i) {
	
	var cellrow = this;
	
	grid.headers.forEach(function(header, j) {
		Object.defineProperty(cellrow, header, {
			get : function() {
				return grid.getValue(i, j);
			}
		});
	});
};
var CellInstance = function() {
	
	
};

var CellColumn = function() {
	
};

// cell.fn.apply(cell.grid, [cell.row, cell.col]);
// we pass in the grid as 'this', so that we can use expressions like "this[0].foo" in the formulas
// the formula should be parsed into a function(i, j) - it takes row and col indices
// then we can write "this[i].foo" in the formulas

// you can add special purpose rows
// sum, average

// sortFormula, filterFormula - might make more sense for these to be done in a more traditional interface - order is important


var Table = function(json) {
	
	if (!json)
	{
		json = {};
		json.type = 'table';
		json.name = Griddl.Components.UniqueName('table', 1);
		json.visible = true;
		json.values = [['','A','B','C'],['1','','',''],['2','','',''],['3','','','']];
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.defaultCellStroke = 'rgb(208,215,229)'; // rgb(158,182,206)
	this.defaultHeaderStroke = 'rgb(158,182,206)';
	this.selectedCellStroke = 'rgb(242,149,54)';
	this.selectedHeaderStroke = 'rgb(242,149,54)';
	this.defaultCellFill = 'rgb(255,255,255)';
	this.defaultHeaderFill = 'rgb(208,215,229)';
	this.selectedCellFill = 'rgb(210,210,240)';
	this.selectedHeaderFill = 'rgb(255,213,141)';
	
	this.display = json.params.display; // values, formulas, formatStrings, style, font, fill, hAlign, vAlign, backgroundColor, border
	
	this.headers = json.params.headers;
	this._data = ParseHeaderList(json.data, this.headers); // proxy both the list and the individual objects
	
	Object.defineProperty(this, 'data', { 
		get : function() {
			return this._data;
		},
		set : function(value) {
			this._data = value;
			//if (!Griddl.dirty) { Griddl.Components.MarkDirty(); }
			// redo everything
		}
	});
	
	this.nRows = this._data.length + 1;
	this.nCols = this.headers.length + 1;
	//this.nCols = this.data.map(x => x.length).reduce(function(a, b) { return Math.max(a, b); });
	this.rowsWithSelection = InitArray(this.nRows, false); // this is just for displaying a different color in the headers
	this.colsWithSelection = InitArray(this.nCols, false);
	this.rowSizes = json.params.rowSizes ? json.params.rowSizes : InitArray(this.nRows, 20); // int[], includes headers
	this.colSizes = json.params.colSizes ? json.params.colSizes : InitArray(this.nCols, 64); // int[], includes headers
	this.xs = null; // int[], fencepost with colSizes
	this.ys = null; // int[], fencepost with rowSizes
	this.xOffset = json.params.xOffset; // controlled by scrollbars
	this.yOffset = json.params.yOffset;
	
	this.cells = InitCells(this.nRows, this.nCols);
	this.cellArray = new CellArray(this);
	
	this.cells[0][0].string = '';
	
	for (var i = 1; i < this.nRows; i++)
	{
		this.cells[i][0].string = (i - 1).toString();
	}
	
	for (var j = 1; j < this.nCols; j++)
	{
		this.cells[0][j].string = this.headers[j-1];
	}
	
	for (var i = 1; i < this.nRows; i++)
	{
		for (var j = 1; j < this.nCols; j++)
		{
			var data = this._data[i-1][this.headers[j-1]];
			
			if (typeof(data) == 'string' && data.length > 0 && data[0] == '=')
			{
				this.cells[i][j].formula = data;
			}
			else
			{
				this.cells[i][j].value = data;
			}
		}
	}
	
	this.div = null;
	this.ctx = null;
	this.section = null; // set by Canvas.GenerateDocument
	
	// the mechanics of row and col resizing work best if the grid's anchor is mandated to be tp/lf, but users might want centering
	this.box = new Griddl.Components.Box(this, false);
	this.box.x = json.params.box.x;
	this.box.y = json.params.box.y;
	this.box.hAlign = json.params.box.hAlign;
	this.box.vAlign = json.params.box.vAlign;
	this.box.hg = this.rowSizes.reduce(function(a, b) { return a + b; });
	this.box.wd = this.colSizes.reduce(function(a, b) { return a + b; });
	
	this.margin = {};
	this.margin.top = json.params.margin.top;
	this.margin.left = json.params.margin.left;
	this.margin.right = json.params.margin.right;
	this.margin.bottom = json.params.margin.bottom;
	
	this.focusSelected = null; // Selection : {mode:'Select',color:'rgb(0,0,0)',shimmer:false,minCol:null,maxCol:null,minRow:null,maxRow:null}
	this.selected = null; // [ Selection ]
	this.cursor = {row:null,col:null}; // { row : int , col : int }
	this.anchor = {row:null,col:null}; // { row : int , col : int }
	
	this.input = $('<input type="text" style="position:relative;display:none"></input>');
	
	this.menu = null;
	this.hScrollbar = null;
	this.vScrollbar = null;
	
	this.position();
	this.format();
};
Table.prototype.add = function() {
	
	this.addElements();
	this.refresh();
};
Table.prototype.addElements = function() {
	
	var table = this;
	
	var options = {}
	options.data = this.values;
	options.formulas = true;
	options.rowHeaders = true;
	options.colHeaders = true;
	options.contextMenu = false;
	options.manualColumnResize = true;
	options.afterChange = function(changes, source) {
		
		if (source != 'loadData')
		{
			// calculate if changed underlying is this.formulas
			table.format(); // only if the changed underlying is this.values, this.formatStrings
			table.box.clear();
			table.draw();
		}
	};
	
	this.tableDiv = $('<div></div>');
	this.div.append(this.tableDiv);
	
	this.handsontable = new Handsontable(this.tableDiv[0], options);
	
	this.div.append($('<hr />'));
	
	var controls = [];
	
	var gui = new dat.GUI({autoPlace:false});
	
	var display = gui.add(this, 'display', ['values', 'formulas', 'formatStrings', 'style', 'font', 'fill', 'hAlign', 'vAlign', 'backgroundColor', 'border']);
	display.onFinishChange(function(value) { table.handsontable.loadData(table[value]); });
	
	controls.push(gui.add(this, 'hMargin'));
	controls.push(gui.add(this, 'vMargin'));
	
	var sizeControls = [];
	var rowSizesFolder = gui.addFolder('rowSizes');
	for (var i = 0; i < this.rowSizes.length; i++) { sizeControls.push(rowSizesFolder.add(this.rowSizes, i).min(0)); }
	var colSizesFolder = gui.addFolder('colSizes');
	for (var i = 0; i < this.colSizes.length; i++) { sizeControls.push(colSizesFolder.add(this.colSizes, i).min(0)); }
	
	this.box.addElements(gui, ['x','y','hAlign','vAlign']);
	
	//sizeControls.forEach(function(control) { control.onFinishChange(function(value) { table.position(); table.section.draw(); }); });
	sizeControls.forEach(function(control) { control.onChange(function(value) { table.position(); table.section.draw(); }); });
	
	Griddl.Components.AddMarginElements(gui, this, this.margin);
	
	// hMargin and vMargin could just re-draw the table, not the whole section
	controls.forEach(function(control) { control.onChange(function(value) { table.section.draw(); }); });
	
	this.div[0].appendChild(gui.domElement);
};
Table.prototype.refresh = function() {
	
};
Table.prototype.position = function() {
	
	// this should be called after a change to rowSizes or colSizes
	this.box.wd = this.colSizes.reduce(function(a, b) { return a + b; });
	this.box.hg = this.rowSizes.reduce(function(a, b) { return a + b; });
	this.box.align();
};
Table.prototype.format = function() {
	
	for (var i = 1; i < this.nRows; i++)
	{
		for (var j = 1; j < this.nCols; j++)
		{
			var cell = this.cells[i][j];
			cell.formatObject = ParseFormatString(cell.formatString);
			cell.string = Format(cell.value, cell.formatObject);
		}
	}
};
Table.prototype.draw = function() {
	
	var table = this;
	var ctx = this.ctx;
	
	// starting with the left, top, rowSizes, and colSizes, recalculate xs, ys, and the other box vars
	var x = this.box.lf;
	var y = this.box.tp;
	this.xs = [ x ];
	this.ys = [ y ];
	for (var j = 0; j < this.nCols; j++) { x += this.colSizes[j]; this.xs.push(x); }
	for (var i = 0; i < this.nRows; i++) { y += this.rowSizes[i]; this.ys.push(y); }
	
	// draw cell fills and text - we'll draw strokes and the selection box later on
	for (var i = 0; i < this.nRows; i++)
	{
		for (var j = 0; j < this.nCols; j++)
		{
			var cell = this.cells[i][j];
			
			var lf = this.xs[j + 0];
			var rt = this.xs[j + 1];
			var tp = this.ys[i + 0];
			var bt = this.ys[i + 1];
			var wd = rt - lf;
			var hg = bt - tp;
			var cx = (lf + rt) / 2;
			var cy = (tp + bt) / 2;
			
			if (i == 0 && j == 0)
			{
				this.ctx.fillStyle = this.defaultHeaderFill;
			}
			else if (i == 0)
			{
				if (this.colsWithSelection[j-1])
				{
					this.ctx.fillStyle = this.selectedHeaderFill;
				}
				else
				{
					this.ctx.fillStyle = this.defaultHeaderFill;
				}
			}
			else if (j == 0)
			{
				if (this.rowsWithSelection[i-1])
				{
					this.ctx.fillStyle = this.selectedHeaderFill;
				}
				else
				{
					this.ctx.fillStyle = this.defaultHeaderFill;
				}
			}
			else
			{
				if (cell.selected && (i != this.cursor.row || j != this.cursor.col))
				{
					this.ctx.fillStyle = this.selectedCellFill; // what if there is a set background color?
				}
				else
				{
					if (cell.backgroundColor)
					{
						this.ctx.fillStyle = cell.backgroundColor;
					}
					else
					{
						this.ctx.fillStyle = this.defaultCellFill;
					}
				}
			}
			
			this.ctx.fillRect(lf, tp, wd, hg);
			
			
			var hAlign = cell.hAlign;
			var vAlign = cell.vAlign;
			
			var x = null;
			var y = null;
			
			if (hAlign == 'left')
			{
				x = lf + cell.hMargin;
			}
			else if (hAlign == 'center')
			{
				x = cx;
			}
			else if (hAlign == 'right')
			{
				x = rt - cell.hMargin;
			}
			else
			{
				throw new Error();
			}
			
			if (vAlign == 'top')
			{
				y = tp + cell.vMargin;
			}
			else if (vAlign == 'center')
			{
				y = cy;
			}
			else if (vAlign == 'bottom')
			{
				y = bt - cell.vMargin;
			}
			else
			{
				throw new Error();
			}
			
			this.ctx.fillStyle = cell.textColor;
			this.ctx.font = cell.font;
			this.ctx.textAlign = hAlign;
			this.ctx.textBaseline = ((vAlign == 'center') ? 'middle' : vAlign);
			var text = cell.string;
			this.ctx.fillText(text, x, y);
			
			// heck, maybe cells *should* draw their own borders
		}
	}
	
	var labelCellStroke = 'rgb(0,0,0)';
	var normalStroke = 'rgb(0,0,0)';
	var selectedStroke = 'rgb(0,0,0)';
	
	var x0 = this.xs[0];
	var x1 = this.xs[1];
	var y0 = this.ys[0];
	var y1 = this.ys[1];
	var lf = this.box.lf;
	var rt = this.box.rt;
	var tp = this.box.tp;
	var bt = this.box.bt;
	
	ctx.lineWidth = 1;
	
	// first draw normal strokes
	
	for (var i = 0; i < this.ys.length; i++)
	{
		var y = this.ys[i];
		
		// long strokes
		ctx.strokeStyle = i < 2 ? labelCellStroke : normalStroke;
		ctx.drawLine(lf - 0.5, y - 0.5, rt, y - 0.5);
		
		// short label cell strokes
		ctx.strokeStyle = labelCellStroke;
		ctx.drawLine(x0 - 0.5, y - 0.5, x1, y - 0.5);
	}
	
	for (var i = 0; i < this.xs.length; i++)
	{
		var x = this.xs[i];
		
		// long strokes
		ctx.strokeStyle = i < 2 ? labelCellStroke : normalStroke;
		ctx.drawLine(x - 0.5, tp - 0.5, x - 0.5, bt);
		
		// short label cell strokes
		ctx.strokeStyle = labelCellStroke;
		ctx.drawLine(x - 0.5, y0 - 0.5, x - 0.5, y1);
	}
	
	// then draw selected strokes
	if (this.selected)
	{
		// first draw the short orange strokes on the row and col header cells, 
		if (this.selected.minRow > 0) // so that the selection indicator is not drawn on the title cell when a col label is selected
		{
			ctx.strokeStyle = selectedStroke;
			
			for (var i = this.selected.minRow; i <= this.selected.maxRow + 1; i++)
			{
				var y = this.ys[i];
				ctx.drawLine(x0 - 0.5, y - 0.5, x1, y - 0.5); // short horizontal strokes
			}
			
			var sy0 = this.ys[this.selected.minRow];
			var sy1 = this.ys[this.selected.maxRow + 1];
			
			ctx.drawLine(x0 - 0.5, sy0 - 0.5, x0 - 0.5, sy1); // long vertical strokes
			ctx.drawLine(x1 - 0.5, sy0 - 0.5, x1 - 0.5, sy1);
		}
		
		if (this.selected.minCol > 0) // so that the selection indicator is not drawn on the title cell when a row label is selected
		{
			ctx.strokeStyle = selectedStroke;
			
			for (var i = this.selected.minCol; i <= this.selected.maxCol + 1; i++)
			{
				var x = this.xs[i];
				ctx.drawLine(x - 0.5, y0 - 0.5, x - 0.5, y1); // short vertical strokes
			}
			
			var sx0 = this.xs[this.selected.minCol];
			var sx1 = this.xs[this.selected.maxCol + 1];
			
			ctx.drawLine(sx0 - 0.5, y0 - 0.5, sx1, y0 - 0.5); // long horizontal strokes
			ctx.drawLine(sx0 - 0.5, y1 - 0.5, sx1, y1 - 0.5);
		}
		
		// now draw the thick black selection box
		for (var i = 0; i < this.selected.length; i++)
		{
			var mode = this.selected[i].mode;
			
			var lf = this.xs[this.selected[i].minCol];
			var rt = this.xs[this.selected[i].maxCol + 1];
			var tp = this.ys[this.selected[i].minRow];
			var bt = this.ys[this.selected[i].maxRow + 1];
			var wd = rt - lf;
			var hg = bt - tp;
			
			if (mode == 'Select')
			{
				ctx.fillStyle = 'rgb(0,0,0)';
				ctx.fillRect(lf - 2, tp - 2, wd + 1, 3); // tp
				ctx.fillRect(rt - 2, tp - 2, 3, hg - 2); // rt
				ctx.fillRect(lf - 2, bt - 2, wd - 2, 3); // bt
				ctx.fillRect(lf - 2, tp - 2, 3, hg + 1); // lf
				ctx.fillRect(rt - 3, bt - 3, 5, 5); // handle square
			}
			else if (mode == 'Point')
			{
				// Point - if highlighted, draw a second outline 1px interior to the first outline
				
				ctx.strokeStyle = this.selected[i].color;
				ctx.drawLine(lf, tp, rt, tp);
				ctx.drawLine(rt, tp, rt, bt);
				ctx.drawLine(lf, bt, rt, bt);
				ctx.drawLine(lf, tp, lf, bt);
				
				ctx.fillStyle = this.selected[i].color;
				//ctx.fillRect(rt - 3, bt - 3, 5, 5); // handle square
			}
			else
			{
				throw new Error();
			}
		}
	}
};
Table.prototype.pointToRowCol = function(x, y) {
	
	// compare the mouse pos against the gridlines to get a row,col pair
	
	var row = null;
	var col = null;
	
	// binary search could be used for large grids
	for (var i = 0; i < this.ys.length - 1; i++) { if (this.ys[i] <= y && y <= this.ys[i + 1]) { row = i; } }
	for (var j = 0; j < this.xs.length - 1; j++) { if (this.xs[j] <= x && x <= this.xs[j + 1]) { col = j; } }
	
	if (row === null || col === null) { throw new Error(); }
	
	return { row : row , col : col };
};
Table.prototype.onhover = function() {
	
	this.box.onhover();
	
	//var grid = this;
	//this.ctx.canvas.onmousemove = function(e) { grid.onmousemove(e); }
};
Table.prototype.dehover = function() {
	this.ctx.canvas.style.cursor = 'default';
	this.ctx.canvas.onmousedown = null;
	this.ctx.canvas.onmousemove = null;
	
	var table = this;
	this.ctx.canvas.onmousemove = function(e) { table.onmousemove(e); };
	this.ctx.canvas.onmousedown = function(e) { table.clearSelection(); };
	//this.section.onhover(); // until superseded by this line in box.dehover or whatever, somewhere in box
};
Table.prototype.onmousemove = function(e) {
	
	var m = this.getCoords(e);
	
	var grid = this;
	
	var xMin = this.xs[0];
	var xMax = this.xs[this.xs.length - 1];
	var yMin = this.ys[0];
	var yMax = this.ys[this.ys.length - 1];
	
	if (m.x < xMin || m.x > xMax || m.y < yMin || m.y > yMax) { this.dehover(); return; } // to be superseded by box
	
	var x0 = this.xs[0];
	var x1 = this.xs[1];
	var y0 = this.ys[0];
	var y1 = this.ys[1];
	
	// move grid - handle is top and left borders of the title cell
	if ((y0 - 1 <= m.y && m.y <= y0 + 1 && x0 <= m.x && m.x < x1) || (x0 - 1 <= m.x && m.x <= x0 + 1 && y0 <= m.y && m.y < y1))
	{
		this.ctx.canvas.style.cursor = 'move';
		return;
	}
	
	// reorder rows/cols - top and left borders of grid, excepting the title cell
	if ((y0 - 1 <= m.y && m.y <= y0 + 1 && x1 <= m.x && m.x <= xMax) || (x0 - 1 <= m.x && m.x <= x0 + 1 && y1 <= m.y && m.y <= yMax))
	{
		this.ctx.canvas.style.cursor = 'hand';
		return;
	}
	
	// row resize
	if (x0 < m.x && m.x < x1)
	{
		for (var i = 0; i < this.nRows; i++)
		{
			var y = this.ys[i + 1];
			
			if (y - 1 <= m.y && m.y <= y + 1)
			{
				this.ctx.canvas.style.cursor = 'row-resize';
				var prevY = this.ys[i];
				var rowResizeIndex = i;
				
				this.ctx.canvas.onmousedown = function(e) {
					
					grid.ctx.canvas.onmousemove = function(e) {
						var curr = grid.getCoords(e);
						grid.rowSizes[rowResizeIndex] = Math.max(curr.y - prevY, 2);
						grid.position();
						grid.section.draw();
					};
					grid.ctx.canvas.onmouseup = function(e) {
						
						grid.ctx.canvas.onmousemove = function(e) { grid.onmousemove(e); };
						grid.ctx.canvas.onmousedown = null;
						grid.ctx.canvas.onmouseup = null;
					};
				};
				
				return;
			}
		}
	}
	
	// col resize
	if (y0 < m.y && m.y < y1)
	{
		for (var j = 0; j < this.nCols; j++)
		{
			var x = this.xs[j + 1];
			
			if (x - 1 <= m.x && m.x <= x + 1)
			{
				this.ctx.canvas.style.cursor = 'col-resize';
				var prevX = this.xs[j];
				var colResizeIndex = j;
				
				this.ctx.canvas.onmousedown = function(e) {
					
					grid.ctx.canvas.onmousemove = function(e) {
						var curr = grid.getCoords(e);
						grid.colSizes[colResizeIndex] = Math.max(curr.x - prevX, 2);
						grid.position();
						grid.section.draw();
					};
					grid.ctx.canvas.onmouseup = function(e) {
						
						grid.ctx.canvas.onmousemove = function(e) { grid.onmousemove(e); };
						grid.ctx.canvas.onmousedown = null;
						grid.ctx.canvas.onmouseup = null;
					};
				};
				
				return;
			}
		}
	}
	
	var hovered = grid.pointToRowCol(m.x, m.y);
	
	this.ctx.canvas.style.cursor = 'cell';
	
	this.ctx.canvas.onmousedown = function(mouseDownEvent) {
		
		var a = grid.getCoords(mouseDownEvent);
		
		var target = grid.pointToRowCol(a.x, a.y);
		
		if (target.row == 0 && target.col == 0) { return; } // cannot select top-left cell
		
		grid.anchor.row = target.row;
		grid.anchor.col = target.col;
		grid.cursor.row = target.row;
		grid.cursor.col = target.col;
		
		grid.selected = []; // don't clear existing selections if Ctrl is down
		var selected = {};
		selected.mode = 'Select';
		selected.color = 'rgb(0,0,0)';
		selected.shimmer = false;
		grid.focusSelected = selected;
		grid.selected.push(selected);
		
		grid.selectCell();
		
		if (mouseDownEvent.button == 0)
		{
			grid.ctx.canvas.onmousemove = function(mouseMoveEvent) {
				
				var m = grid.getCoords(mouseMoveEvent);
				
				if (m.x < grid.xs[1] || m.x > grid.xs[grid.xs.length - 1]|| m.y < grid.ys[1] || m.y > grid.ys[grid.ys.length - 1]) { return; }
				
				// select range of cells
				var pointedRowCol = grid.pointToRowCol(m.x, m.y);
				if (grid.cursor.row != pointedRowCol.row || grid.cursor.col != pointedRowCol.col)
				{
					grid.cursor = pointedRowCol;
					grid.selectRange();
				}
			};
			grid.ctx.canvas.onmouseup = function(mouseUpEvent) {
				grid.setKeyHandles();
				grid.ctx.canvas.onmousemove = function(mouseMoveEvent) { grid.onmousemove(mouseMoveEvent); };
				grid.ctx.canvas.onmouseup = null;
			};
		}
		else if (mouseDownEvent.button == 2)
		{
			//mouseDownEvent.preventDefault();
			//mouseDownEvent.stopPropagation();
			//mouseDownEvent.stopImmediatePropagation();
			
			grid.menu = new Menu();
			grid.menu.parent = grid;
			grid.menu.box.lf = a.x;
			grid.menu.box.tp = a.y;
			grid.menu.fns.push(grid.insertRowAbove);
			grid.menu.fns.push(grid.insertRowBelow);
			grid.menu.fns.push(grid.insertColLeft);
			grid.menu.fns.push(grid.insertColRight);
			grid.menu.fns.push(grid.deleteRow);
			grid.menu.fns.push(grid.deleteCol);
			grid.menu.labels.push('insertRowAbove');
			grid.menu.labels.push('insertRowBelow');
			grid.menu.labels.push('insertColLeft');
			grid.menu.labels.push('insertColRight');
			grid.menu.labels.push('deleteRow');
			grid.menu.labels.push('deleteCol');
			grid.menu.setDimensions();
			grid.menu.draw();
			grid.menu.onhover();
			
			grid.ctx.canvas.oncontextmenu = function(contextMenuEvent) {
				contextMenuEvent.preventDefault();
				contextMenuEvent.stopPropagation();
				contextMenuEvent.stopImmediatePropagation();
			};
		}
		else
		{
			
		}
	};
	
	// i added these handlers in an attempt to stop the context menu from appearing, but it required oncontextmenu instead
	//this.ctx.canvas.onmouseup = function(e)
	//{
	//	e.preventDefault();
	//	e.stopPropagation();
	//	e.stopImmediatePropagation();
	//};
	//
	//this.ctx.canvas.onmouseclick = function(e)
	//{
	//	e.preventDefault();
	//	e.stopPropagation();
	//	e.stopImmediatePropagation();
	//};
};
Table.prototype.write = function() {
	
	var json = {};
	json.type = this.type;
	json.name = this.name;
	json.visible = this.visible;
	json.data = this.cells.map(row => row.map(cell => cell.write()));
	json.params = {};
	json.params.x = this.box.x;
	json.params.y = this.box.y;
	json.params.hAlign = this.box.hAlign;
	json.params.vAlign = this.box.vAlign;
	json.params.rowSizes = this.rowSizes;
	json.params.colSizes = this.colSizes;
	json.params.margin = {};
	json.params.margin.top = this.margin.top;
	json.params.margin.left = this.margin.left;
	json.params.margin.right = this.margin.right;
	json.params.margin.bottom = this.margin.bottom;
	return json;
};
Table.prototype.setKeyHandles = function() {
	
	var grid = this;
	
	grid.ctx.canvas.focus();
	grid.ctx.canvas.onkeydown = function(e) {
		
		e.preventDefault();
		e.stopPropagation();
		
		var key = e.keyCode;
		//console.log(key);
		
		var min = 1; // set this to 0 to allow selection of row/col headers
		
		if (key == 16) // shift
		{
			
		}
		else if (key == 17) // ctrl
		{
			
		}
		else if (key == 18) // alt
		{
			
		}
		else if (key == 27) // esc
		{
			grid.selected = [];
			grid.focusSelected = null;
			grid.cursor.row = null;
			grid.cursor.col = null;
			grid.anchor.row = null;
			grid.anchor.col = null;
			grid.section.draw();
			grid.ctx.canvas.onkeydown = null;
		}
		else if (key == 32) // space
		{
			if (e.ctrlKey && e.shiftKey) // this is different from Excel
			{
				grid.focusSelected.minRow = min;
				grid.focusSelected.maxRow = grid.nRows - 1;
				grid.focusSelected.minCol = min;
				grid.focusSelected.maxCol = grid.nCols - 1;
				grid.section.draw(); // note that this does not go through selectRange(), which is unaesthetic
				// although it's because we don't know what actually happens to the anchor or cursor here - the cursor can end up in the middle of a selected range
			}
			else if (e.shiftKey)
			{
				grid.focusSelected.minCol = min;
				grid.focusSelected.maxCol = grid.nCols - 1;
				grid.section.draw();
			}
			else if (e.ctrlKey)
			{
				grid.focusSelected.minRow = min;
				grid.focusSelected.maxRow = grid.nRows - 1;
				grid.section.draw();
			}
			else
			{
				// edit cell
				grid.input[0].value = grid.cells[grid.cursor.row][grid.cursor.col].formula; // formulas, or whatever is displayed
				grid.input.css('display', 'block');
				grid.input.css('top', (grid.ys[grid.cursor.row] - grid.ctx.canvas.height - 1).toString() + 'px');
				grid.input.css('left', (grid.xs[grid.cursor.col] + 1).toString() + 'px');
				grid.input.css('height', (grid.rowSizes[grid.cursor.row] - 1).toString() + 'px');
				grid.input.css('width', (grid.colSizes[grid.cursor.col] - 1).toString() + 'px');
				grid.input.focus();
				
				grid.setEditHandlers();
			}
		}
		else if (key == 37 || key == 38 || key == 39 || key == 40) // arrow
		{
			if (key == 37) // left
			{
				if (e.ctrlKey)
				{
					grid.cursor.col = min;
				}
				else
				{
					if (grid.cursor.col > min) { grid.cursor.col--; }
				}
			}
			else if (key == 38) // up
			{
				if (e.ctrlKey)
				{
					grid.cursor.row = min;
				}
				else
				{
					if (grid.cursor.row > min) { grid.cursor.row--; }
				}
			}
			else if (key == 39) // right
			{
				if (e.ctrlKey)
				{
					grid.cursor.col = grid.nCols - 1;
				}
				else
				{
					if (grid.cursor.col < grid.nCols - 1) { grid.cursor.col++; }
				}
			}
			else if (key == 40) // down
			{
				if (e.ctrlKey)
				{
					grid.cursor.row = grid.nRows - 1;
				}
				else
				{
					if (grid.cursor.row < grid.nRows - 1) { grid.cursor.row++; }
				}
			}
			
			if (e.shiftKey)
			{
				grid.selectRange();
			}
			else
			{
				grid.selectCell();
			}
		}
		else if (key >= 65 && key <= 90) // A-Z
		{
			
		}
		else if (key >= 48 && key <= 57) // 0-9
		{
			
		}
		else
		{
			//debugger;
		}
	};
};

Table.prototype.setEditHandlers = function() {
	
	var grid = this;
	
	this.input[0].onkeydown = function(e) {
		
		var key = e.keyCode;
		
		if (key == 27) // esc
		{
			grid.rejectEdit();
		}
		else if (key == 13) // return
		{
			grid.acceptEdit();
		}
	};
};
Table.prototype.rejectEdit = function() {
	this.clearEdit();
};
Table.prototype.acceptEdit = function() {
	
	var i = this.cursor.row;
	var j = this.cursor.col;
	var cell = this.cells[i][j];
	
	var str = this.input[0].value;
	
	// under different modes, we couldset this.formats, styles, etc
	
	if (i == 0 && j == 0)
	{
		// do nothing
	}
	else if (i == 0)
	{
		cell.string = str;
		// change field, change formula references
	}
	else if (j == 0)
	{
		// do nothing
	}
	else
	{
		if (str.length > 0 && str[0] == '=')
		{
			cell.formula = str;
			
			var formula = str.substr(1);
			var fn = new Function('i', 'return ' + formula);
			var result = fn.apply(this.cellArray, [i-1]);
			cell.value = result;
		}
		else
		{
			cell.value = ParseStringToObj(str);
		}
		
		cell.string = Format(cell.value, cell.formatObject);
	}
	
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	this.draw();
	
	this.clearEdit();
};
Table.prototype.clearEdit = function() {
	
	this.input[0].value = '';
	this.input.css('display', 'none');
	this.setKeyHandles();
};

Table.prototype.getValue = function(dataRow, dataCol) {
	
	// inspect calculation flag, calculate if necessary, etc.
	
	return this.cells[dataRow+1][dataCol+1].value;
};

Table.prototype.selectCell = function() {
	
	this.anchor.row = this.cursor.row;
	this.anchor.col = this.cursor.col;
	
	this.focusSelected.minRow = this.cursor.row;
	this.focusSelected.maxRow = this.cursor.row;
	this.focusSelected.minCol = this.cursor.col;
	this.focusSelected.maxCol = this.cursor.col;
	
	this.cacheSelectedCells();
	this.section.draw();
};
Table.prototype.selectRange = function() {
	
	this.focusSelected.minRow = Math.min(this.anchor.row, this.cursor.row);
	this.focusSelected.maxRow = Math.max(this.anchor.row, this.cursor.row);
	this.focusSelected.minCol = Math.min(this.anchor.col, this.cursor.col);
	this.focusSelected.maxCol = Math.max(this.anchor.col, this.cursor.col);
	
	this.cacheSelectedCells();
	this.section.draw();
};
Table.prototype.clearSelection = function() {
	
	this.input.css('display', 'none');
	
	this.selected = [];
	this.cursor = {row:null,col:null};
	this.anchor = {row:null,col:null};
	
	this.cacheSelectedCells();
	this.section.draw();
};
Table.prototype.cacheSelectedCells = function() {
	
	for (var i = 0; i < this.cells.length; i++)
	{
		for (var j = 0; j < this.cells[i].length; j++)
		{
			this.cells[i][j].selected = false;
		}
	}
	
	for (var i = 0; i < this.rowsWithSelection.length; i++) { this.rowsWithSelection[i] = false; }
	for (var j = 0; j < this.colsWithSelection.length; j++) { this.colsWithSelection[j] = false; }
	
	for (var i = 0; i < this.selected.length; i++)
	{
		var s = this.selected[i];
		
		for (var r = s.minRow; r <= s.maxRow; r++)
		{
			this.rowsWithSelection[r-1] = true;
			
			for (var c = s.minCol; c <= s.maxCol; c++)
			{
				this.cells[r][c].selected = true;
				this.colsWithSelection[c-1] = true;
			}
		}
	}
};
Table.prototype.getSelectedCells = function() {
	
	var cells = [];
	
	for (var k = 0; k < this.selected.length; k++)
	{
		if (this.selected[k].mode == "Select")
		{
			var selection = this.selected[k];
			
			// the j,i order here is deliberate - so that the returned list is clustered by column
			for (var j = selection.minCol; j <= selection.maxCol; j++)
			{
				for (var i = selection.minRow; i <= selection.maxRow; i++)
				{
					cells.push(this.cells[i][j]);
				}
			}
		}
	}
	
	return cells;
};

Table.prototype.insertRowAbove = function() {
	
};
Table.prototype.insertRowBelow = function() {
	
};
Table.prototype.insertColLeft = function() {
	
};
Table.prototype.insertColRight = function() {
	
};
Table.prototype.deleteRow = function() {
	
};
Table.prototype.deleteCol = function() {
	
};

Table.prototype.getCoords = function(e) {
	
	var mult = this.ctx.cubitsPerPixel ? this.ctx.cubitsPerPixel : 1;
	var x = e.offsetX * mult;
	var y = e.offsetY * mult;
	return {x:x,y:y};
};

function InitCells(nRows, nCols) {
	
	var matrix = [];
	
	for (var i = 0; i < nRows; i++)
	{
		var row = [];
		
		for (var j = 0; j < nCols; j++)
		{
			var cell = new Cell();
			row.push(cell);
		}
		
		matrix.push(row);
	}
	
	return matrix;
};
function InitMatrix(nRows, nCols, initValue) {
	
	var matrix = [];
	
	for (var i = 0; i < nRows; i++)
	{
		var row = [];
		
		for (var j = 0; j < nCols; j++)
		{
			row.push(initValue);
		}
		
		matrix.push(row);
	}
	
	return matrix;
}
function InitArray(n, initValue) {
	
	var array = [];
	
	for (var i = 0; i < n; i++)
	{
		array.push(initValue);
	}
	
	return array;
}

function ParseHeaderList(matrix, headers) {
	
	var data = [];
	
	for (var i = 0; i < matrix.length; i++)
	{
		var obj = {};
		
		for (var k = 0; k < headers.length; k++)
		{
			obj[headers[k]] = matrix[i][k];
		}
		
		data.push(obj);
	}
	
	return data;
}

function ParseFormatString(formatString) {
	
	var formatObject = null;
	
	formatObject = formatString; // for the moment
	
	return formatObject;
}
function Format(value, formatObject) {
	
	var datatype = typeof(value);
	var string = null;
	
	if (value == null)
	{
		string = "";
	}
	else if (datatype == "number")
	{
		//var n = formatString;
		//if (n < 0) { n = 0; }
		//if (n > 20) { n = 20; }
		//string = value.toFixed(n);
		string = value.toString();
	}
	else if (datatype == "string")
	{
		string = value; // apply formatting here - note that when you want to edit, use the raw toString()
	}
	else if (datatype == "boolean")
	{
		string = value.toString();
	}
	else if (datatype == "object")
	{
		if (value.forEach)
		{
			string = "[Array]";
		}
		else
		{
			//string = cell.slot.formula;
			string = value.toString(); // apply formatting here - note that when you want to edit, use the raw toString()
		}
	}
	else if (datatype == "function")
	{
		string = value.name;
	}
	else // undefined, presumably
	{
		string = "";
	}
	
	return string;
}

var Menu = function() {
	
	this.parent = null;
	this.fns = [];
	this.labels = [];
	
	this.width = 100;
	this.rowHeight = 30;
	this.textMargin = 4;
	this.font = '11pt Calibri';
	
	this.box = new Griddl.Components.Box(this, false);
	
	this.basicFillColor = 'rgb(255,255,255)';
	this.basicTextColor = 'rgb(0,0,0)';
	this.hoverFillColor = 'rgb(0,0,255)';
	this.hoverTextColor = 'rgb(255,255,255)';
	this.hoverIndex = null;
};
Menu.prototype.setDimensions = function() {
	
	var wd = this.width;
	var hg = this.rowHeight * this.fns.length;
	this.box.reconcile({lf:this.box.lf,tp:this.box.tp,wd:wd,hg:hg});
};
Menu.prototype.draw = function() {
	
	var ctx = this.parent.ctx;
	
	ctx.fillStyle = this.basicFillColor;
	ctx.fillRect(this.box.lf, this.box.tp, this.box.wd, this.box.hg);
	
	ctx.font = this.font;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	
	for (var i = 0; i < this.fns.length; i++)
	{
		if (this.hoverIndex == i)
		{
			ctx.fillStyle = this.hoverFillColor;
			ctx.fillRect(this.box.lf, this.box.tp + this.rowHeight * i, this.box.wd, this.rowHeight);
			ctx.fillStyle = this.hoverTextColor;
		}
		else
		{
			ctx.fillStyle = this.basicTextColor;
		}
		
		ctx.fillText(this.labels[i], this.box.lf + this.textMargin, this.box.tp + this.rowHeight * (i + 0.5));
		
		ctx.strokeStyle = 'rgb(200,200,200)';
		ctx.drawLine(this.box.lf, this.box.tp + this.rowHeight * (i + 1)+0.5, this.box.lf + this.box.wd, this.box.tp + this.rowHeight * (i + 1)+0.5);
	}
	
	ctx.strokeStyle = 'rgb(0,0,0)';
	ctx.strokeRect(this.box.lf-0.5, this.box.tp-0.5, this.box.wd+1, this.rowHeight * this.fns.length+1);
};
Menu.prototype.clear = function() {
	this.parent.section.draw();
};
Menu.prototype.onhover = function() {
	var menu = this;
	this.parent.ctx.canvas.style.cursor = 'default';
	this.parent.ctx.canvas.onmousemove = function(mouseMoveEvent) { menu.onmousemove(mouseMoveEvent); };
};
Menu.prototype.dehover = function() {
	
	// 'dehover' is actually caused by a click outside the menu, not just a mousemove outside of the box - Menu.clear() can be called by the parent, in fact
	
	this.parent.ctx.canvas.onmousemove = null;
	this.parent.ctx.canvas.onmousedown = null;
	this.parent.ctx.canvas.onmouseup = null;
	this.parent.onhover();
};
Menu.prototype.onmousemove = function(e) {
	
	var menu = this;
	
	var mult = this.parent.ctx.cubitsPerPixel ? this.parent.ctx.cubitsPerPixel : 1;
	var x = e.offsetX * mult;
	var y = e.offsetY * mult;
	var m = {x:x,y:y};
	
	this.hoverIndex = null;
	
	for (var i = 0; i < this.fns.length; i++)
	{
		var tp = this.box.tp + this.rowHeight * (i + 0);
		var bt = this.box.tp + this.rowHeight * (i + 1);
		
		if (this.box.lf <= m.x && m.x <= this.box.rt && tp <= m.y && m.y <= bt)
		{
			this.hoverIndex = i;
			this.draw();
			
			this.parent.ctx.canvas.onmousedown = function() {
				menu.fns[menu.hoverIndex].apply(menu.parent);
			};
			
			return;
		}
	}
	
	this.draw();
	
	this.parent.ctx.canvas.onmousedown = function(e) { menu.dehover(); };
};

var Scrollbar = function() {
	
	this.ctx = null;
	this.parent = null;
	this.orientation = null;
	
	this.box = new Griddl.Components.Box();
	this.handle = new Griddl.Components.Box();
};
Scrollbar.prototype.draw = function() {
	
	this.ctx.strokeStyle = 'rgb(158,182,206)';
	this.ctx.fillStyle = 'rgb(128,128,128)';
	this.ctx.strokeRect(this.box.lf, this.box.tp, this.box.wd, this.box.hg);
	this.ctx.fillRect(this.handle.lf, this.handle.tp, this.handle.wd, this.handle.hg);
};
Scrollbar.prototype.onhover = function() {
	
};

var Cell = function() {
	
	this.grid = null;
	this.row = null; // int
	this.col = null; // int
	
	this.formula = null
	this.value = null
	this.string = null; // the cached result of applying the formatObject to the value
	
	this.formatString = null; // we need a format string parser - use Excel syntax?
	this.formatObject = null; // the cached result of parsing the formatString
	
	this.fn = null; // the Function object that is the result of parsing the formula
	
	this.unitType = null; // time, length, mass - force, energy, power, etc.
	this.unitBase = null; // seconds, meters, feet, pounds, kilograms, joules, watts, etc.
	
	this.selected = false;
	this.calculated = false;
	
	// cached dependencies
	this.srcs = null;
	this.dsts = null;
	
	this.style = null;
	this.font = '11pt Calibri';
	this.textColor = 'rgb(0,0,0)';
	this.hAlign = 'center';
	this.vAlign = 'center';
	this.backgroundColor = null;
	this.border = null;
	
	this.hMargin = 5; // this is the margin between cell border and cell text
	this.vMargin = 4;
	
	// border: we need syntax to deal with TLRB, color, lineWidth, type (solid, dotted, dashed, etc)
	// either syntax or more tables, which i'm reluctant to do b/c it would be a lot of tables
	// maybe CSS is the best inspiration for syntax here, since CSS itself uses syntax
	// border-top: 1px solid gray
	
	// this.dataObj = null;
	// this.dataField = null;
	// this.dataType = null;
};
Cell.prototype.getValue = function() {
	
	if (!this.calculated) { this.calculate(); }
	return this.value;
};
Cell.prototype.calculate = function() {
	
	this.fn.apply(this.grid, [this.row, this.col]);
};


// this is copied from data.js, which is not ideal
var numberRegex = new RegExp('^\\s*[+-]?([0-9]{1,3}((,[0-9]{3})*|([0-9]{3})*))?(\\.[0-9]+)?%?\\s*$');
var digitRegex = new RegExp('[0-9]');
var trueRegex = new RegExp('^true$', 'i');
var falseRegex = new RegExp('^false$', 'i');

// require ISO 8601 dates - this regex reads yyyy-mm-ddThh:mm:ss.fffZ, with each component after yyyy-mm being optional
// note this means that yyyy alone will be interpreted as an int, not a date
var dateRegex = new RegExp('[0-9]{4}-[0-9]{2}(-[0-9]{2}(T[0-9]{2}(:[0-9]{2}(:[0-9]{2}(.[0-9]+)?)?)?(Z|([+-][0-9]{1-2}:[0-9]{2})))?)?');

var WriteObjToString = function(obj) {
	
	// this is currently called only when writing to json/yaml, which requires that we return 'null'
	// but if we start calling this function from the csv/tsv writer, we'll need to return ''
	if (obj === null) { return 'null'; }
	
	var type = Object.prototype.toString.call(obj);
	
	if (type == '[object String]' || type == '[object Date]')
	{
		return '"' + obj.toString() + '"';
	}
	//else if (type == '[object Function]')
	//{
	//	return WriteFunction(obj);
	//}
	else
	{
		return obj.toString();
	}
};
var ParseStringToObj = function(str) {
	
	if (str === null || str === undefined) { return null; }
	if (str.length == 0) { return ''; } // the numberRegex accepts the empty string because all the parts are optional
	
	var val = null;
	
	if (numberRegex.test(str) && digitRegex.test(str)) // since all parts of numberRegex are optional, "+.%" is a valid number.  so we test digitRegex too
	{
		var divisor = 1;
		str = str.trim();
		if (str.indexOf('%') >= 0) { divisor = 100; str = str.replace('%', ''); }
		str = str.replace(',', '');
		
		if (str.indexOf('.') >= 0)
		{
			val = parseFloat(str);
		}
		else
		{
			val = parseInt(str);
		}
		
		val /= divisor;
	}
	else if (dateRegex.test(str))
	{
		val = new Date(str);
		if (val.toJSON() == null) { val = str; } // revert if the date is invalid
	}
	else if (trueRegex.test(str))
	{
		val = true;
	}
	else if (falseRegex.test(str))
	{
		val = false;
	}
	//else if (str.startsWith('function'))
	//{
	//	val = ParseFunction(str);
	//}
	else
	{
		val = str;
	}
	
	return val;
};



Griddl.Components.table = Table;

})();

