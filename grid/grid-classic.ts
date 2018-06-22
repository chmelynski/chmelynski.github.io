
class ClassicGrid {
	
	
	acceptEdit(): void {
		
		var grid = this;
		
		var str = grid.input.value;
		
		var i = grid.cursor.row;
		var j = grid.cursor.col;
		
		// under different modes, we could set grid.formats, styles, etc
		
		if (i == null && j == null)
		{
			// do nothing
		}
		else if (j == null)
		{
			// do nothing
		}
		else if (i == null)
		{
			// under different modes, set filter, sort, etc.
			
			var cell: Cell = grid.cells[i][j];
			
			if (grid.dataComponent._headers[j-1] == str) { return; }
			if (grid.dataComponent._headers.indexOf(str) > -1) { return; } // collision, bail
			
			cell.string = str;
			
			// change field
			var oldfield: string = grid.dataComponent._headers[j-1];
			grid.dataComponent._headers[j-1] = str;
			
			for (var k: number = 0; k < grid.dataComponent._data.length; k++)
			{
				var obj = grid.dataComponent._data[k];
				obj[str] = obj[oldfield];
				delete obj[oldfield];
			}
			
			// change formulas that reference the old field name?
		}
		else // data cell
		{
			var fn = null;
			var value = null;
			var formatObject = null;
			
			var dependencies = []; // for now, we're going to assume the formula stays within the row
			var referenceRegex = /this\[([^\]]+)\]\.([A-Za-z][A-Za-z0-9]*)/g; // e.g. this[i].foo
			
			//if (grid.display == 'values' || grid.display == 'formulas')
			//{
			//	if (str.length > 0 && str[0] == '=')
			//	{
			//		var formula = str.substr(1);
			//		fn = new Function('i', 'return ' + formula);
			//		
			//		var match = referenceRegex.exec(formula);
			//		
			//		while (match !== null)
			//		{
			//			dependencies.push(match[2]); // the group that matches the .field
			//			match = referenceRegex.exec(formula);
			//		}
			//	}
			//	else
			//	{
			//		value = ParseStringToObj(str);
			//	}
			//}
			//else if (grid.display == 'formats')
			//{
			//	formatObject = ParseFormatString(str);
			//}
			//else if (grid.display == 'styles')
			//{
			//	
			//}
			//else if (grid.display == 'styleFormulas')
			//{
			//	
			//}
			
			// set formula/value on all cells in selection
			//	var sel = grid.selected;
			//	
			//	for (var i = sel.minRow; i <= sel.maxRow; i++)
			//	{
			//		for (var j = sel.minCol; j <= sel.maxCol; j++)
			//		{
			//			var cell: Cell = grid.cells[i][j];
			//			
			//			// remove links between this cell and its sources
			//			cell.srcs.forEach(function(src) { src.dsts.splice(src.dsts.indexOf(cell), 1); });
			//			cell.srcs = [];
			//			
			//			if (grid.display == 'values' || grid.display == 'formulas')
			//			{
			//				cell.formula = str;
			//				cell.markUncalculated(); // recursively set calculated=false on cell.dsts and their dsts
			//				
			//				if (fn !== null)
			//				{
			//					cell.fn = fn;
			//					
			//					dependencies.forEach(function(dep) {
			//						var src: Cell = grid.cells[i][grid.dataComponent._headers.indexOf(dep)+1];
			//						cell.srcs.push(src);
			//						src.dsts.push(cell);
			//					});
			//				}
			//				else
			//				{
			//					cell.calculated = true;
			//					cell.value = value;
			//					cell.string = Format(cell.value, cell.formatObject);
			//					grid.dataComponent._data[i-1][grid.dataComponent._headers[j-1]] = cell.value; // set the underlying
			//				}
			//			}
			//			else if (grid.display == 'formats')
			//			{
			//				cell.formatString = str;
			//				cell.formatObject = formatObject;
			//				cell.string = str;
			//			}
			//			else if (grid.display == 'styles')
			//			{
			//				
			//			}
			//			else if (grid.display == 'styleFormulas')
			//			{
			//				
			//			}
			//		}
			//	}
			
			grid.calculate();
		}
		
		grid.draw();
		
		grid.clearEdit();
	}
	
	resetData(): void {
		
		var grid: Grid = this;
		
		// duplicate of clearSelection, but avoids redraw
		grid.selected = [];
		grid.focusSelected = null;
		grid.cursor = {row:null,col:null};
		grid.anchor = {row:null,col:null};
		
		grid.nRows = grid.dataComponent._data.length + 1;
		grid.nCols = grid.dataComponent._headers.length + 1;
		//grid.nCols = grid.data.map(x => x.length).reduce(function(a, b) { return Math.max(a, b); });
		grid.rowsWithSelection = InitArray(grid.nRows, false); // this is just for displaying a different color in the headers
		grid.colsWithSelection = InitArray(grid.nCols, false);
		grid.rowsVisible = InitArray(grid.nRows, true);
		grid.colsVisible = InitArray(grid.nCols, true);
		grid.rowSizes = grid.big ? null : (grid.params.rowSizes ? grid.params.rowSizes : InitArray(grid.nRows, grid.fixedRowSize)); // int[], includes headers
		grid.colSizes = grid.params.colSizes ? grid.params.colSizes : InitArray(grid.nCols, 64); // int[], includes headers
		grid.xs = null; // int[], fencepost with colSizes
		grid.ys = null; // int[], fencepost with rowSizes
		
		if (grid.big)
		{
			var y = grid.params.box.y;
			grid.ys = [ y ];
			for (var i = 0; i < grid.nRows; i++) { if (grid.rowsVisible[i]) { y += grid.fixedRowSize; } grid.ys.push(y); }
		}
		
		// the mechanics of row and col resizing work best if the grid's anchor is mandated to be tp/lf, but users might want centering
		grid.box = new Box();
		grid.box.x = grid.params.box.x;
		grid.box.y = grid.params.box.y;
		grid.box.hAlign = grid.params.box.hAlign;
		grid.box.vAlign = grid.params.box.vAlign;
		grid.box.wd = grid.colSizes.reduce(function(a, b) { return a + b; });
		grid.box.hg = grid.big ? (grid.nRows * grid.fixedRowSize) : grid.rowSizes.reduce(function(a, b) { return a + b; });
		
		grid.window = new Box();
		grid.window.reconcile({lf:0,tp:0,wd:grid.ctx.canvas.width,hg:grid.ctx.canvas.height});
		
		if (grid.big)
		{
			grid.columns = [];
			
			for (var j = 1; j < grid.nCols; j++)
			{
				//var column = new Column();
				//column.grid = grid;
				//column.col = j;
				//column.style = grid.styles[0];
				//grid.columns.push(column);
			}
		}
		else
		{

		}
		
		grid.calculate();
		grid.position();
		grid.format();
		grid.draw();
	}
	
	selectRange(): void {
		
		var grid = this;
		
		grid.focusSelected.minRow = Math.min(grid.anchor.row, grid.cursor.row);
		grid.focusSelected.maxRow = Math.max(grid.anchor.row, grid.cursor.row);
		grid.focusSelected.minCol = Math.min(grid.anchor.col, grid.cursor.col);
		grid.focusSelected.maxCol = Math.max(grid.anchor.col, grid.cursor.col);
		
		// SelectRow, SelectCol, SelectWhole do not go through selectRange(), so any changes to the post-select code here must be copied over there
		grid.cacheSelectedCells();
		grid.draw();
	}
	format(): void {
		
		var grid = this;
		
		for (var i = 1; i < grid.nRows; i++)
		{
			for (var j = 1; j < grid.nCols; j++)
			{
				var cell: Cell = grid.cells[i][j];
				cell.formatObject = ParseFormatString(cell.formatString);
				
				if (grid.display == 'values')
				{
					cell.string = Format(cell.value, cell.formatObject);
				}
				else if (grid.display == 'formulas')
				{
					cell.string = cell.formula;
				}
				else if (grid.display == 'formats')
				{
					cell.string = cell.formatString;
				}
				else if (grid.display == 'styles')
				{
					cell.string = cell.style.toString();
				}
				else if (grid.display == 'styleFormulas')
				{
					//cell.string = cell.styleFormula;
				}
			}
		}
	}
	getSelectionData(): string[][] {
		
		var grid = this;
		
		var data: string[][] = [];
		
		var selection = grid.focusSelected;
		
		for (var i = selection.minRow; i <= selection.maxRow; i++)
		{
			var row: string[] = [];
			
			for (var j = selection.minCol; j <= selection.maxCol; j++)
			{
				row.push(grid.cells[i][j].string);
			}
			
			data.push(row);
		}
		
		return data;
	}
	cacheSelectedCells(): void {
		
		var grid = this;
		
		for (var i = 0; i < grid.cells.length; i++)
		{
			for (var j = 0; j < grid.cells[i].length; j++)
			{
				grid.cells[i][j].selected = false;
			}
		}
		
		for (var i = 0; i < grid.rowsWithSelection.length; i++) { grid.rowsWithSelection[i] = false; }
		for (var j = 0; j < grid.colsWithSelection.length; j++) { grid.colsWithSelection[j] = false; }
		
		for (var i = 0; i < grid.selected.length; i++)
		{
			var s = grid.selected[i];
			
			for (var r = s.minRow; r <= s.maxRow; r++)
			{
				grid.rowsWithSelection[r] = true;
				
				for (var c = s.minCol; c <= s.maxCol; c++)
				{
					grid.cells[r][c].selected = true;
					grid.colsWithSelection[c] = true;
				}
			}
		}
	}
	getSelectedCells(): Cell[] {
		
		var grid = this;
		
		var cells: Cell[] = [];
		
		for (var k = 0; k < grid.selected.length; k++)
		{
			if (grid.selected[k].mode == "Select")
			{
				var selection = grid.selected[k];
				
				// the j,i order here is deliberate - so that the returned list is clustered by column
				for (var j = selection.minCol; j <= selection.maxCol; j++)
				{
					for (var i = selection.minRow; i <= selection.maxRow; i++)
					{
						cells.push(grid.cells[i][j]);
					}
				}
			}
		}
		
		return cells;
	}
	actOnSelection(fn: (cell: Cell, i: number, j: number) => void): void {
		
		var grid: Grid = this;
		
		for (var k = 0; k < grid.selected.length; k++)
		{
			var sel = grid.selected[k];
			
			for (var i = sel.minRow; i <= sel.maxRow; i++)
			{
				for (var j = sel.minCol; j <= sel.maxCol; j++)
				{
					var cell = grid.cells[i][j];
					fn(cell, i, j);
				}
			}
		}
		
		grid.draw();
	}
	deleteCellContents(cell: Cell, i: number, j: number): void {
		
		var grid = this;
		cell.formula = null;
		cell.value = null;
		cell.string = '';
		grid.dataComponent._data[i-1][grid.dataComponent._headers[j-1]] = null;
	}
	
	insertRowsAbove(): void { var grid = this; grid.insertRows(true); }
	insertRowsBelow(): void { var grid = this; grid.insertRows(false); }
	insertColsLeft(): void { var grid = this; grid.insertCols(true); }
	insertColsRight(): void { var grid = this; grid.insertCols(false); }
	insertRows(bAbove: boolean): void {
		
		var grid = this;
		
		var k = bAbove ? grid.focusSelected.minRow : (grid.focusSelected.maxRow+1);
		var n = grid.focusSelected.maxRow - grid.focusSelected.minRow + 1;
		
		grid.nRows += n;
		
		for (var i = 0; i < n; i++)
		{
			var newrow: Cell[] = [];
			var newdata: any = {};
			
			for (var j = 0; j < grid.nCols; j++)
			{
				var cell = new Cell();
				cell.style = grid.cells[k][j].style;
				cell.string = '';
				newrow.push(cell);
				
				if (j >= 1)
				{
					newdata[grid.dataComponent._headers[j-1]] = null;
				}
			}
			
			grid.rowsWithSelection.splice(k+i, 0, false);
			grid.rowsVisible.splice(k+i, 0, true);
			grid.rowSizes.splice(k+i, 0, 20);
			grid.cells.splice(k+i, 0, newrow);
			grid.dataComponent._data.splice(k+i-1, 0, newdata);
		}
		
		for (var i = 1; i < grid.cells.length; i++)
		{
			grid.cells[i][0].string = (i-1).toString();
		}
		
		if (bAbove)
		{
			grid.anchor.row += n;
			grid.cursor.row += n;
			grid.selectRange();
		}
		
		grid.position();
		grid.draw();
	}
	insertCols(bLeft: boolean): void {
		
		var grid = this;
		
		var k = bLeft ? grid.focusSelected.minCol : (grid.focusSelected.maxCol+1);
		var n = grid.focusSelected.maxCol - grid.focusSelected.minCol + 1;
		
		grid.nCols += n;
		
		for (var j: number = 0; j < n; j++)
		{
			// if we're in classic-excel mode, we want to remap the A,B,C headers and change formulas
			var suffix = 0;
			var header = 'field' + suffix.toString();
			
			while (grid.dataComponent._headers.indexOf(header) > -1)
			{
				suffix++;
				header = 'field' + suffix.toString();
			}
			
			grid.dataComponent._headers.splice(k+j-1, 0, header);
			
			grid.colsWithSelection.splice(k+j, 0, false);
			grid.colsVisible.splice(k+j, 0, true);
			grid.colSizes.splice(k+j, 0, 64);
			
			for (var i: number = 0; i < grid.nRows; i++)
			{
				var cell = new Cell();
				cell.style = grid.cells[i][k].style;
				
				if (i == 0)
				{
					cell.string = header;
				}
				else
				{
					cell.string = '';
					grid.dataComponent._data[i-1][header] = null;
				}
				
				grid.cells[i].splice(k+j, 0, cell);
			}
		}
		
		if (bLeft)
		{
			grid.anchor.col += n;
			grid.cursor.col += n;
			grid.selectRange();
		}
		
		grid.position();
		grid.draw();
	}
	deleteRows(): void {
		
		var grid = this;
		
		// what happens if we delete all the rows?
		
		var k = grid.focusSelected.minRow;
		var n = grid.focusSelected.maxRow - grid.focusSelected.minRow + 1;
		
		grid.nRows -= n;
		
		grid.rowsWithSelection.splice(k, n);
		grid.rowsVisible.splice(k, n);
		grid.rowSizes.splice(k, n);
		grid.cells.splice(k, n);
		var deleted = grid.dataComponent._data.splice(k-1, n);
		
		for (var i: number = 1; i < grid.cells.length; i++)
		{
			grid.cells[i][0].string = (i-1).toString();
		}
		
		// grid is where Shift+Alt+Up vs Shift+Alt+Down could have varying effect - on where the cursor ends up
		grid.anchor.row = k - 1;
		grid.cursor.row = k - 1;
		grid.selectRange();
		
		grid.position();
		grid.draw();
	}
	deleteCols(): void {
		
		var grid = this;
		
		var k = grid.focusSelected.minCol;
		var n = grid.focusSelected.maxCol - grid.focusSelected.minCol + 1;
		
		grid.nCols -= n;
		
		grid.colsWithSelection.splice(k, n);
		grid.colsVisible.splice(k, n);
		grid.colSizes.splice(k, n);
		
		for (var i = 0; i < grid.nRows; i++)
		{
			if (i > 0)
			{
				for (var j = 0; j < n; j++)
				{
					delete grid.dataComponent._data[i-1][grid.dataComponent._headers[k-1+j]];
				}
			}
			
			grid.cells[i].splice(k, n);
		}
		
		grid.dataComponent._headers.splice(k-1, n);
		
		// this is where Shift+Alt+Left vs Shift+Alt+Right could have varying effect - on where the cursor ends up
		grid.anchor.col = k - 1;
		grid.cursor.col = k - 1;
		grid.selectRange();
		
		grid.position();
		grid.draw();
	}
	moveColsLeft(): void { var grid = this; grid.moveCols(-1); }
	moveColsRight(): void { var grid = this; grid.moveCols(1); }
	moveCols(k): void {
		
		/*
		
		0	1	2	3
		a	b	c	d
		
		minCol = 1
		maxCol = 2
		k = -1
		fromSlot = ((k < 0) ? a + k : b + k) = 0
		toSlot = ((k < 0) ? b : a) = 2
		
		temp = x[fromSlot] = x[0] = a
		
		i = 1
		x[i+k] = x[i]
		x[0] = x[1]
		
		i = 2
		x[i+k] = x[i]
		x[1] = x[2]
		
		x[toSlot] = x[2] = temp = a
		
		0	1	2	3
		b	c	a	d
		
		
		
		
		
		0	1	2	3
		a	b	c	d
		
		minCol = 0
		maxCol = 1
		k = +1
		fromSlot = ((k < 0) ? a + k : b + k) = 2
		toSlot = ((k < 0) ? b : a) = 0
		
		start = ((k < 0) ? a : b) = 1
		end = ((k < 0) ? b : a) = 0
		
		temp = x[fromSlot] = x[2] = c
		
		i = 1
		x[i+k] = x[i]
		x[2] = x[1]
		
		i = 0
		x[i+k] = x[i]
		x[1] = x[0]
		
		x[toSlot] = x[0] = temp = c
		
		0	1	2	3
		c	a	b	d
		
		*/
		
		// account for hidden cols?
		
		var grid: Grid = this;
		
		var a: number = grid.focusSelected.minCol;
		var b: number = grid.focusSelected.maxCol;
		
		var start = ((k < 0) ? a : b);
		var end = ((k < 0) ? b : a);
		
		var fromSlot: number = ((k < 0) ? a + k : b + k);
		var toSlot: number = ((k < 0) ? b : a);
		
		if (fromSlot <= 0 || fromSlot >= grid.nCols) { return; }
		
		var headerTemp = grid.dataComponent._headers[fromSlot-1];
		var colSizeTemp = grid.colSizes[fromSlot];
		
		for (var i = start; i != end-k; i -= k)
		{
			grid.dataComponent._headers[i+k-1] = grid.dataComponent._headers[i-1];
			grid.colSizes[i+k] = grid.colSizes[i];
		}
		
		grid.dataComponent._headers[toSlot-1] = headerTemp;
		grid.colSizes[toSlot] = colSizeTemp;
		
		if (grid.big)
		{
			
		}
		else
		{
			for (var i = 0; i < grid.cells.length; i++)
			{
				var cellTemp = grid.cells[i][fromSlot];
				
				for (var j = start; j != end-k; j -= k)
				{
					grid.cells[i][j+k] = grid.cells[i][j];
				}
				
				grid.cells[i][toSlot] = cellTemp;
			}
		}
		
		grid.anchor.col += k;
		grid.cursor.col += k;
		grid.focusSelected.minCol += k;
		grid.focusSelected.maxCol += k;
		grid.cacheSelectedCells();
		
		grid.draw();
	}
	hideCols(): void {
		
		var grid: Grid = this;
		
		// we have an off by one error where colsWithSelection as an array includes the row header column (which is a dubious choice)
		// but it seems that when its members are set to true, the setter assumes the array does now include the row header column
		
		console.log(grid.colsWithSelection);
		console.log(grid.colsVisible);
		
		for (var i = 0; i < grid.colsWithSelection.length; i++)
		{
			if (grid.colsWithSelection[i])
			{
				grid.colsVisible[i] = false;
			}
		}
		
		console.log(grid.colsWithSelection);
		console.log(grid.colsVisible);
		
		// move cursor to the next visible col header, or to the previous visible col header if we're at the end
		// adjust colsWithSelection due to this cursor change
		
		grid.draw();
	}
	showCols(): void {
		
	}
}

function InitArray<T>(n: number, initValue: T): T[] {
	
	var array: T[] = [];
	
	for (var i = 0; i < n; i++)
	{
		array.push(initValue);
	}
	
	return array;
}


