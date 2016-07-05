
(function() {

// save column widths - wait, manualColumnResize doesn't seem to work

// to do:
// add csv,tsv,json? representation toggles


var Spreadsheet = function(json) {
	
	if (!json)
	{
		json = {};
		json.type = 'spreadsheet';
		json.name = Griddl.Components.UniqueName('spreadsheet', 1);
		json.visible = true;
		json.data = [{A:1,B:2,C:3},{A:4,B:5,C:6},{A:7,B:8,C:9}];
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible; // can't use ?: here because visible can be set to false
	
	this.div = null;
	this.tableDiv = null; // for unknown reasons we pass a sub div to Handsontable / add the <table> or <pre> to the sub div
	this.handsontable = null;
	
	this._data = json.data;
	//this.headers = null;
	
	//this.display = json.display;
	
	//this.introspectHeaders();
	
	Object.defineProperty(this, 'data', { 
		get : function() {
			return this._data;
		},
		set : function(value) {
			this._data = value;
			if (!Griddl.dirty) { Griddl.Components.MarkDirty(); }
			this.add();
		}
	});
};
Spreadsheet.prototype.add = function() {
	
	this.div.html('');
	
	//var gui = new dat.GUI({autoPlace:false});
	//var displayControl = gui.add(this, 'display', ['grid','formulas','json','yaml','csv','tsv','pre']); // restrict based on form, add handler for immediate change
	
	var comp = this;
	//displayControl.onChange(function(value) { comp.add(); });
	
	// upload and download folders?  also, restrict based on form
	//gui.add(this, 'uploadJSON');
	//gui.add(this, 'uploadTSV');
	//gui.add(this, 'uploadCSV');
	//gui.add(this, 'uploadXLSX');
	//gui.add(this, 'downloadAsJSON');
	//gui.add(this, 'downloadAsTSV');
	//gui.add(this, 'downloadAsCSV');
	//gui.add(this, 'downloadAsXLSX');
	
	//this.div[0].appendChild(gui.domElement);
	
	this.tableDiv = $(document.createElement('div'));
	this.div.append(this.tableDiv);
	
	function HandleChangeDefault(row, col, oldvalue, newvalue) {
		// col = "foo" for listOfObjects grids
		comp._data[row][col] = newvalue;
	}
	
	function HandleChange(fn) {
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
					
					fn(row, col, oldvalue, newvalue);
				}
			}
		};
	}
	
	var options = {};
	options.formulas = true;
	options.contextMenu = true;
	options.manualColumnResize = true;
	
	options.rowHeaders = true;
	options.colHeaders = true;
	options.data = this._data;
	options.afterChange = HandleChange(HandleChangeDefault);
	
	this.handsontable = new Handsontable(this.tableDiv[0], options);
};
Spreadsheet.prototype.write = function() {
	
	var json = {};
	json.type = this.type;
	json.name = this.name;
	json.visible = this.visible;
	json.data = this.data;
	return json;
};

Spreadsheet.prototype.getText = function() { return JSON.stringify(this.data); };
Spreadsheet.prototype.setText = function(text) { }; // unclear how to specify the form of the text
Spreadsheet.prototype.getData = function() {
	// the formula string is stored in the backing data object, so we have to convert here
	
	var values = [];
	
	for (var i = 0; i < this._data.length; i++)
	{
		var row = [];
		
		for (var j = 0; j < this._data[i].length; j++)
		{
			row.push(ParseStringToObj(this.handsontable.getCell(i, j).innerText));
		}
		
		values.push(row);
	}
	
	return values;
};
Spreadsheet.prototype.setData = function(data) { this.data = data; };

var ParseStringToObj = function(str) {
	
	var val = null;
	
	var c = str[0];
	
	// could be replaced by a regex
	if (c == '0' || c == '1' || c == '2' || c == '3' || c == '4' || c == '5' || c == '6' || c == '7' || c == '8' || c == '9' || c == '.' || c == '-' || c == '+')
	{
		val = parseFloat(str);
	}
	else
	{
		val = str;
	}
	
	return val;
};

Griddl.Components.spreadsheet = Spreadsheet;

})();

