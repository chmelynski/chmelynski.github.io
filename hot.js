
(function() {

var Hot = function() {
	
};

Hot.Add = function() {
	
	var comp = this;
	
	var options = {};
	options.formulas = false;
	options.contextMenu = true;
	//options.colWidths = 60;
	//options.manualColumnMove = true;
	//options.manualColumnResize = true;
	
	if (this.form == 'listOfObjects')
	{
		// onload, this is a duplication of effort because the data was stored as a list of lists already
		// but if we get here from e.g. pasting in json data, it needs to be converted
		this.htData = ListOfObjectsToListOfLists(this._data, this.headers);
		
		options.rowHeaders = function(index) { return index; };
		options.colHeaders = function(index) { return comp.headers[index]; };
		options.data = this.htData;
		options.afterChange = HandleChange(HandleChangeListOfObjects, this);
		
		options.afterCreateCol = function(indexOfFirstCreatedCol, numberOfCreatedCols) {
			
			//comp.headers = this.getColHeader(); // this doesn't work because this.getColHeader() returns the wrong list
			// for example, if we have two columns "foo" and "bar", and try to insertColLeft from "bar", getColHeader() should return ["foo","B","bar"]
			// and that's what's displayed at in the grid at the end
			// but getColHeader returns ["foo","bar","C"]
			// so we do this instead
			var newheaders = [];
			
			var n = indexOfFirstCreatedCol;
			while (newheaders.length < numberOfCreatedCols)
			{
				var newHeader = null;
				
				// new headers could conflict with existing headers - rename if so
				do
				{
					newHeader = NumberToLetter(n);
					n++;
				}
				while (comp.headers.indexOf(newHeader) >= 0);
				
				newheaders.push(newHeader);
			}
			
			comp.headers = comp.headers.slice(0, indexOfFirstCreatedCol).concat(newheaders).concat(comp.headers.slice(indexOfFirstCreatedCol));
			
			for (var i = 0; i < comp._data.length; i++)
			{
				for (var k = 0; k < numberOfCreatedCols; k++)
				{
					var newHeader = comp.headers[indexOfFirstCreatedCol + k];
					comp._data[i][newHeader] = null;
				}
			}
			
			comp.enforceHeaderOrder();
		};
		options.afterRemoveCol = function(indexOfFirstRemovedCol, numberOfRemovedCols) {
			
			for (var i = 0; i < comp._data.length; i++)
			{
				for (var k = 0; k < numberOfRemovedCols; k++)
				{
					delete comp._data[i][comp.headers[indexOfFirstRemovedCol + k]];
				}
			}
			
			comp.headers.splice(indexOfFirstRemovedCol, numberOfRemovedCols);
			
			//comp.enforceHeaderOrder(); // this does not appear to be needed, but i haven't tested extensively
		};
		options.afterCreateRow = function(indexOfFirstCreatedRow, numberOfCreatedRows) {
			
			var newobjs = [];
			
			for (var i = 0; i < numberOfCreatedRows; i++)
			{
				var obj = {};
				
				for (var k = 0; k < comp.headers.length; k++)
				{
					obj[comp.headers[k]] = null;
				}
				
				newobjs.push(obj);
			}
			
			comp._data = comp._data.slice(0, indexOfFirstCreatedRow).concat(newobjs).concat(comp._data.slice(indexOfFirstCreatedRow));
		};
		options.afterRemoveRow = function(indexOfFirstRemovedRow, numberOfRemovedRows) {
			
			comp._data.splice(indexOfFirstRemovedRow, numberOfRemovedRows);
		};
	}
	else if (this.form == 'listOfLists')
	{
		options.rowHeaders = function(index) { return index; };
		options.colHeaders = function(index) { return index; };
		options.data = this._data;
		options.afterChange = HandleChange(HandleChangeDefault, this);
	}
	else if (this.form == 'object')
	{
		this.htData = ObjectToListOfLists(this._data, this.headers);
		
		options.rowHeaders = function(index) { return comp.headers[index]; };
		options.colHeaders = false;
		options.data = this.htData;
		options.afterChange = HandleChange(HandleChangeObject, this);
		
		options.afterCreateRow = function(indexOfFirstCreatedRow, numberOfCreatedRows) {
			
			var newheaders = [];
			
			var n = indexOfFirstCreatedRow;
			while (newheaders.length < numberOfCreatedRows)
			{
				var newHeader = null;
				
				// new headers could conflict with existing headers - rename if so
				do
				{
					newHeader = NumberToLetter(n);
					n++;
				}
				while (comp.headers.indexOf(newHeader) >= 0);
				
				newheaders.push(newHeader);
			}
			
			comp.headers = comp.headers.slice(0, indexOfFirstCreatedRow).concat(newheaders).concat(comp.headers.slice(indexOfFirstCreatedRow));
			
			var newdata = {};
			
			for (var k = 0; k < comp.headers.length; k++)
			{
				var header = comp.headers[k];
				
				if (indexOfFirstCreatedRow <= k && k < indexOfFirstCreatedRow + numberOfCreatedRows)
				{
					newdata[header] = null;
				}
				else
				{
					newdata[header] = comp._data[header];
				}
			}
			
			comp._data = newdata;
		};
		options.afterRemoveRow = function(indexOfFirstRemovedRow, numberOfRemovedRows) {
			
			for (var i = 0; i < numberOfRemovedRows; i++)
			{
				delete comp._data[comp.headers[indexOfFirstRemovedRow + i]];
			}
			
			comp.headers.splice(indexOfFirstRemovedRow, numberOfRemovedRows);
		};
	}
	else if (this.form == 'list')
	{
		this.htData = ListToListOfLists(this._data);
		
		options.rowHeaders = function(index) { return index; };
		options.colHeaders = false;
		options.data = this.htData;
		options.afterChange = HandleChange(HandleChangeList, this);
		
		options.afterCreateRow = function(indexOfFirstCreatedRow, numberOfCreatedRows) {
			
			var newobjs = [];
			
			for (var i = 0; i < numberOfCreatedRows; i++)
			{
				newobjs.push(null);
			}
			
			comp._data = comp._data.slice(0, indexOfFirstCreatedRow).concat(newobjs).concat(comp._data.slice(indexOfFirstCreatedRow));
		};
		options.afterRemoveRow = function(indexOfFirstRemovedRow, numberOfRemovedRows) {
			
			comp._data.splice(indexOfFirstRemovedRow, numberOfRemovedRows);
		};
	}
	else
	{
		throw new Error();
	}
	
	this.handsontable = new Handsontable(this.tableDiv[0], options);
};

Hot.AddMatrixOrFormulaGrid = function() {
	
	var comp = this;
	
	var options = {};
	options.formulas = (this.display == 'formula');
	options.rowHeaders = (this.display == 'formula');
	options.colHeaders = (this.display == 'formula');
	options.contextMenu = true;
	options.manualColumnResize = true;
	
	// we might want to color the cell backgrounds gray on the pseudo- row and col headers
	
	if (this.form == 'listOfObjects')
	{
		this.htData = ListOfObjectsToListOfLists(this._data);
		options.data = this.htData;
		
		options.afterChange = function(changes, source) {
			
			if (source != 'loadData')
			{
				Griddl.Components.MarkDirty();
				
				// a change to headers in first row requires re-keying all the objects
				// a change to headers in the first col is ignored
				// a change to values propagates
				// for perf, we might want to iterate through the list of changes rather than doing the whole conversion on every change
				//this._data = ListOfListsToListOfObjects(this.htData);
				
				for (var i = 0; i < changes.length; i++)
				{
					var change = changes[i];
					var row = change[0];
					var col = change[1];
					var oldvalue = change[2];
					var newvalue = ParseStringToObj(change[3]);
					
					if (col == 0)
					{
						// revert the change
					}
					else if (row == 0)
					{
						comp.headers[col-1] = newvalue;
						
						for (var i = 0; i < comp._data.length; i++)
						{
							comp._data[i][newvalue] = comp._data[i][oldvalue];
							delete comp._data[i][oldvalue];
						}
					}
					else
					{
						comp._data[row-1][comp.headers[col-1]] = newvalue;
					}
				}
			}
		};
		
		// add hooks for inserting/deleting rows/cols, change comp._data as necessary
	}
	else if (this.form == 'listOfLists')
	{
		options.data = this._data;
		options.afterChange = function(changes, source) { if (source != 'loadData') { Griddl.Components.MarkDirty(); } };
	}
	
	this.handsontable = new Handsontable(this.tableDiv[0], options);
};

function HandleChangeDefault(row, col, oldvalue, newvalue) {
	// we used this back when the backing store was a [{}].  now that we have htData = [[]] and data = [{}], we have to use HandleChangeListOfObjects below
	// col = "foo" for listOfObjects grids
	this._data[row][col] = newvalue;
}
function HandleChangeListOfObjects(row, col, oldvalue, newvalue) {
	// we use this when htData = [[]] and data = [{}]
	// col = "1", so we have to index into headers
	this._data[row][this.headers[col]] = newvalue;
}
function HandleChangeObject(row, col, oldvalue, newvalue) {
	this._data[this.headers[row]] = newvalue;
}
function HandleChangeList(row, col, oldvalue, newvalue) {
	this._data[row] = newvalue;
}

function HandleChange(fn, comp) {
	
	return function(changes, source) {
		
		if (source != 'loadData')
		{
			Griddl.Components.MarkDirty();
			
			for (var i = 0; i < changes.length; i++)
			{
				var change = changes[i];
				var row = change[0];
				var col = change[1];
				var oldvalue = change[2];
				var newvalue = ParseStringToObj(change[3]);
				
				fn.apply(comp, [row, col, oldvalue, newvalue]);
			}
		}
	};
}

function ListOfObjectsToListOfLists(data, headers) {
	
	var matrix = [];
	
	for (var i = 0; i < data.length; i++)
	{
		var row = [];
		
		for (var k = 0; k < headers.length; k++)
		{
			row.push(data[i][headers[k]]);
		}
		
		matrix.push(row);
	}
	
	return matrix;
}
function ObjectToListOfLists(data, headers) {
	
	var matrix = [];
	
	for (var k = 0; k < headers.length; k++)
	{
		var row = [];
		row.push(data[headers[k]]);
		matrix.push(row);
	}
	
	return matrix;
}
function ListToListOfLists(data) {
	
	var matrix = [];
	
	for (var i = 0; i < data.length; i++)
	{
		var row = [];
		row.push(data[i]);
		matrix.push(row);
	}
	
	return matrix;
}

function NumberToLetter(n) {
	
	// 0 => "A"
	// 1 => "B"
	// 25 => "Z"
	// 26 => "AA"
	
	if (n < 0) { return ""; }
	
	var k = 1;
	var m = n+1;
	
	while (true)
	{
		var pow = 1;
		for (var i = 0; i < k; i++) { pow *= 26; }
		if (m <= pow) { break; }
		m -= pow;
		k++;
	}
	
	var reversed = "";
	
	for (var i = 0; i < k; i++)
	{
		var c = n+1;
		var shifter = 1;
		for (var j = 0; j < k; j++) { c -= shifter; shifter *= 26; }
		var divisor = 1;
		for (var j = 0; j < i; j++) { divisor *= 26; }
		c /= divisor;
		c %= 26;
		reversed += String.fromCharCode(65 + c)
	}
	
	var result = "";
	for (var i = reversed.length - 1; i >= 0; i--) { result += reversed[i]; }
	
	return result;
}

var numberRegex = new RegExp('^\\s*[+-]?([0-9]{1,3}((,[0-9]{3})*|([0-9]{3})*))?(\\.[0-9]+)?%?\\s*$');
var digitRegex = new RegExp('[0-9]');

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
	else
	{
		val = str;
	}
	
	return val;
};

Griddl.Components.Hot = Hot;

})();

