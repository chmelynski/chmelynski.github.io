
(function() {

var Data = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		json.data = [{A:1,B:2,C:3},{A:4,B:5,C:6},{A:7,B:8,C:9}];
		json.params = {};
		json.params.format = 'json';
		json.params.display = 'tsv';
		json.params.headers = ['A','B','C'];
		json.params.form = 'listOfObjects';
		json.params.afterChange = '';
	}
	
	this._type = json.type;
	this._name = json.name;
	this._visible = json.visible; // can't use ?: here because visible can be set to false
	
	this._div = null;
	this._errorSpan = null;
	this._datguiDiv = null;
	this._contentDiv = null;
	this._codemirror = null;
	
	// the top of the undo stack is the current state - new states get pushed on add and on setting this._data
	this._undo = {};
	this._undo.stack = []; // { data , headers } - entirely possible that we should store display and form as well
	this._undo.index = -1;
	this._undo.size = 0;
	this._undo.sizes = [];
	this._undo.capacity = 50;
	this._undo.pushOnAdd = true;
	
	this._format = json.params.format; // json, headerList
	this._display = json.params.display; // json, yaml, csv, tsv, grid, pre, (tree - to do; matrix, formula - to finish)
	this._form = json.params.form; // object, list, listOfObjects, listOfLists, other
	this._headers = json.params.headers; // this is needed to specify which columns to display and in what order - handsontable gives the user the ability to reorder columns, and we want to save that configuration
	this._afterChange = json.params.afterChange ? json.params.afterChange : '';
	
	this._gridParams = json.grid;
	
	this._data = ParseFormat.apply(this, [json.data]);
	
	Object.defineProperty(this, 'data', {
		get : function() { return this._data; },
		//set : function (value) { this._data = value; }
	});
	
	Object.defineProperty(this, 'headers', {
		get : function() { return this._headers; },
		//set : function (value) { this._headers = value; }
	});
	
	Object.defineProperty(this, 'gridParams', {
		get : function() { return this._gridParams; },
		set : function (value) { this._gridParams = value; }
	});
	
	Object.defineProperty(this, 'display', {
		get : function() { return this._display; },
		set : function (value) { this._display = value; }
	});
	
	Object.defineProperty(this, 'afterChange', {
		get : function() { return this._afterChange; },
		set : function (value) { this._afterChange = value; }
	});
	
	// determining form can be an expensive operation, so we cache the result and remember it as long as we can
	// for example, if the data is modified by the user interacting with a grid, we can be assured the data stays in a certain form
	// the only time the slate gets completely cleared is when the user introduces arbitrary data - via script, upload, or blur
	if (this._form === null) { this._determineDataForm(); }
	if (this._headers === null) { this._introspectHeaders(); }
};
Data.prototype._add = function() {
	
	var comp = this;
	
	comp._div.html('');
	comp._datguiDiv = $('<div class="data-control"></div>').appendTo(comp._div);
	comp._errorSpan = $('<span style="color:red"></span>').appendTo(comp._div);
	comp._contentDiv = $('<div class="data-editor"></div>').appendTo(comp._div);
	
	comp._refreshDatgui();
	
	if (comp._grid && comp._display != 'grid')
	{
		comp._gridParams = comp._grid._write();
		comp._grid = null;
	}
	
	var initText = '';
	
	if (comp._display == 'json' || comp._display == 'yaml' || comp._display == 'csv' || comp._display == 'tsv')
	{
		var textbox = $('<textarea></textarea>').appendTo(comp._contentDiv);
		
		var options = {};
		options.mode = {json:{name:'javascript',json:true},yaml:'yaml',csv:'plain',tsv:'plain'}[comp._display];
		options.smartIndent = false;
		options.lineNumbers = true;
		options.lineWrapping = true;
		comp._codemirror = CodeMirror.fromTextArea(textbox[0], options);
		
		initText = Write.apply(comp, [comp._display]);
		comp._codemirror.getDoc().setValue(initText);
		
		comp._codemirror.on('change', function() { comp._markDirty(); });
		comp._codemirror.on('blur', function() {
			
			var text = comp._codemirror.getValue();
			var success = comp._setText(text);
			
			if (success)
			{
				comp._refreshDatgui();
				var formattedText = Write.apply(comp, [comp._display]);
				comp._codemirror.getDoc().setValue(formattedText);
				comp._runAfterChange();
			}
		});
	}
	else if (comp._display == 'grid')
	{
		comp._grid = new Hyperdeck.Grid(comp, comp._contentDiv);
	}
	else if (comp._display == 'pre' || comp._display == 'readonly')
	{
		if (comp._form == 'listOfObjects' || comp._form == 'listOfLists')
		{
			initText = DisplayAsTable(comp);
		}
		else
		{
			initText = DisplayAsPre(comp);
		}
		
		comp._contentDiv.html(initText);
	}
	else if (comp._display == 'summary')
	{
		var ls = [];
		
		ls.push('<pre>');
		ls.push('form: ' + comp._form);
		if (comp._headers) { ls.push('headers: ' + comp._headers.join(', ')); }
		if (comp._form == 'listOfObjects' || comp._form == 'listOfLists' || comp._form == 'list')
		{
			ls.push('length: ' + comp._data.length);
		}
		ls.push('</pre>');
		
		comp._contentDiv.html(ls.join('\n'));
	}
	else if (comp._display == 'gui')
	{
		comp._contentDiv.append($('<hr />'));
		
		var datagui = new dat.GUI({autoPlace:false, width:"100%"});
		
		for (var key in comp._data)
		{
			var control = datagui.add(comp._data, key);
			var type = Object.prototype.toString.call(comp._data[key]);
			
			if (type == '[object String]')
			{
				// if the string has to be parsed (like in rgb() strings),
				// then intermediate values often make no sense and throw errors
				control.onFinishChange(function(value) { comp._runAfterChange(); });
			}
			else
			{
				control.onChange(function(value) { comp._runAfterChange(); });
			}
		}
		
		comp._contentDiv.append($(datagui.domElement));
	}
	else
	{
		throw new Error();
	}
	
	if (comp._undo.pushOnAdd) { comp._pushUndo(initText.length); }
};
Data.prototype._write = function() {
	
	var comp = this;
	
	var json = {};
	json.type = comp._type;
	json.name = comp._name;
	json.visible = comp._visible;
	json.data = WriteFormat.apply(comp);
	json.params = {};
	json.params.format = comp._format;
	json.params.display = comp._display;
	json.params.form = comp._form;
	json.params.headers = comp._headers;
	json.params.afterChange = comp._afterChange;
	if (comp._grid) { json.grid = comp._grid._write(); }
	return json;
};

Data.prototype._refreshDatgui = function() {
	
	var comp = this;
	comp._datguiDiv.html('');
	
	var displayOptionDict = {};
	displayOptionDict.other = ['json','yaml','readonly','summary'];
	displayOptionDict.listOfObjects = ['json','yaml','grid','csv','tsv','readonly','summary'];
	displayOptionDict.listOfLists = ['json','yaml','csv','tsv','readonly','summary'];
	displayOptionDict.list = ['json','yaml','csv','tsv','readonly','summary'];
	displayOptionDict.object = ['json','yaml','gui','readonly','summary'];
	
	var displayOptions = displayOptionDict[comp._form];
	
	if (displayOptions.indexOf(comp._display) == -1) { comp._display = 'json'; }
	
	function Option(str) {
		return '<option' + ((comp._display == str) ? ' selected' : '') + '>' + str + '</option>';
	}
	
	$('<span>View:</span>').appendTo(comp._datguiDiv);
	$('<select>' + displayOptions.map(Option).join('') + '</select>')
		.appendTo(comp._datguiDiv).on('change', function() { comp._display = this.value; comp._markDirty(); comp._add(); });

	$('<span>On change:</span>').appendTo(comp._datguiDiv);
	$('<input type="text" placeholder="Hyperdeck.Run(\'js1\')"></input>').attr('value', comp._afterChange).appendTo(comp._datguiDiv)
		.on('change', function() { comp._afterChange = this.value; comp._markDirty(); });

	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Download" data-original-title="Download" class="btn btn-default btn-sm"><i class="fa fa-download"></i></button>')
		.appendTo(comp._datguiDiv).on('click', function() { comp._download(); }).tooltip();
	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Upload" data-original-title="Upload" class="btn btn-default btn-sm"><i class="fa fa-upload"></i></button>')
		.appendTo(comp._datguiDiv).on('click', function() { comp._upload(); }).tooltip();
	
	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Clear" data-original-title="Clear" class="btn btn-default btn-sm"><i class="fa fa-ban"></i></button>')
		.appendTo(comp._datguiDiv).on('click', function() { comp._set([{A:1,B:2,C:3},{A:4,B:5,C:6},{A:7,B:8,C:9}]); }).tooltip();
};

Data.prototype._showError = function(e) {
	
	var comp = this;
	comp._errorSpan.text(e);
};

function ParseFormat(data) {
	
	var comp = this;
	
	var result = null;
	
	if (comp._format == 'headerList')
	{
		// comp._headers: ["foo","bar"]
		// data: [[1,2],[3,4]]
		// => [{"foo":1,"bar":2},{"foo":3,"bar":4}]
		
		var objs = [];
		
		for (var i = 0; i < data.length; i++)
		{
			var obj = {};
			
			for (var k = 0; k < comp._headers.length; k++)
			{
				obj[comp._headers[k]] = data[i][k];
			}
			
			objs.push(obj);
		}
		
		result = objs;
	}
	else if (comp._format == 'json')
	{
		result = data;
	}
	else
	{
		throw new Error();
	}
	
	return result;
}
function WriteFormat() {
	
	var comp = this;
	
	var result = null;
	
	if (comp._form == 'listOfObjects')
	{
		comp._format = 'headerList';
		
		var matrix = [];
		
		for (var i = 0; i < comp._data.length; i++)
		{
			var row = [];
			
			for (var k = 0; k < comp._headers.length; k++)
			{
				row.push(comp._data[i][comp._headers[k]]);
			}
			
			matrix.push(row);
		}
		
		result = matrix;
	}
	else
	{
		comp._format = 'json';
		result = comp._data;
	}
	
	return result;
}
Data.prototype._introspectHeaders = function() {
	
	var comp = this;
	
	comp._headers = [];
	
	if (comp._form == 'object')
	{
		for (var key in comp._data)
		{
			comp._headers.push(key);
		}
	}
	else if (comp._form == 'listOfObjects')
	{
		for (var i = 0; i < comp._data.length; i++)
		{
			for (var key in comp._data[i])
			{
				if (comp._headers.indexOf(key) == -1)
				{
					comp._headers.push(key);
				}
			}
		}
	}
	else if (comp._form == 'listOfLists')
	{
		var max = 0;
		
		for (var i = 0; i < comp._data.length; i++)
		{
			max = Math.max(max, comp._data[i].length);
		}
		
		for (var k = 0; k < max; k++)
		{
			comp._headers.push(k);
		}
	}
	else
	{
		comp._headers = null;
	}
};
Data.prototype._enforceHeaderOrder = function() {
	
	var comp = this;
	
	// the json, csv, and yaml writers have no way of knowing the proper header order, which means they screw it up if there were insertions/deletions
	// so we recreate all objects here
	
	var newdata = [];
	
	for (var i = 0; i < comp._data.length; i++)
	{
		var obj = {};
		
		for (var k = 0; k < comp._headers.length; k++)
		{
			var header = comp._headers[k];
			obj[header] = comp._data[i][header];
		}
		
		newdata.push(obj);
	}
	
	comp._data = newdata;
};
Data.prototype._determineDataForm = function() {
	
	var comp = this;
	
	comp._form = DetermineDataForm(comp._data);
};
function DetermineDataForm(data) {
	
	// returns:
	// 'object'           { Primitive }        {}
	// 'list'             [ Primitive ]        []
	// 'listOfObjects'    [ { Primitive } ]    [{}]
	// 'listOfLists'      [ [ Primitive ] ]    [[]]
	// 'other'            anything else, including Primitive, {empty}, [empty], {compound}, [heterogenousCompound], [{compound}], [[compound]], [[ragged]]
	
	var form = null;
	var type = Object.prototype.toString.call(data);
	
	if (type == '[object Array]')
	{
		var empty = true;
		var allPrimitives = true;
		var allObjects = true;
		var allLists = true;
		
		for (var i = 0; i < data.length; i++)
		{
			empty = false;
			
			var sub = data[i];
			var subtype = Object.prototype.toString.call(sub);
			
			if (subtype == '[object Array]')
			{
				allPrimitives = false;
				allObjects = false;
			}
			else if (subtype == '[object Object]')
			{
				allPrimitives = false;
				allLists = false;
			}
			else
			{
				allObjects = false;
				allLists = false;
			}
			
			if (!allPrimitives && !allObjects && !allLists)
			{
				form = 'other';
				break;
			}
		}
		
		if (allPrimitives)
		{
			form = 'list';
		}
		else if (allObjects)
		{
			var allSubPrimitives = true;
			
			for (var i = 0; i < data.length; i++)
			{
				for (var key in data[i])
				{
					var sub = data[i][key];
					var subtype = Object.prototype.toString.call(sub);
					
					if (subtype == '[object Array]' || subtype == '[object Object]')
					{
						allSubPrimitives = false;
						break;
					}
				}
				
				if (!allSubPrimitives) { break; }
			}
			
			if (allSubPrimitives)
			{
				form = 'listOfObjects';
			}
			else
			{
				form = 'other';
			}
		}
		else if (allLists)
		{
			var ragged = false;
			
			// first make sure that all subarrays have the same length
			for (var i = 1; i < data.length; i++)
			{
				if (data[i].length != data[i-1].length)
				{
					ragged = true;
					break;
				}
			}
			
			if (ragged)
			{
				form = 'other';
			}
			else
			{
				var allSubPrimitives = true;
				
				for (var i = 0; i < data.length; i++)
				{
					for (var j = 0; j < data[i].length; j++)
					{
						var sub = data[i][j];
						var subtype = Object.prototype.toString.call(sub);
						
						if (subtype == '[object Array]' || subtype == '[object Object]')
						{
							allSubPrimitives = false;
							break;
						}
					}
					
					if (!allSubPrimitives) { break; }
				}
				
				if (allSubPrimitives)
				{
					form = 'listOfLists';
				}
				else
				{
					form = 'other';
				}
			}
		}
	}
	else if (type == '[object Object]')
	{
		var empty = true;
		var allPrimitives = true;
		
		for (var key in data)
		{
			empty = false;
			
			var sub = data[key];
			var subtype = Object.prototype.toString.call(sub);
			
			if (subtype == '[object Array]' || subtype == '[object Object]')
			{
				allPrimitives = false;
				break;
			}
		}
		
		if (empty)
		{
			form = 'other'; // no good way to display an empty obj in a grid
		}
		else if (allPrimitives)
		{
			form = 'object';
		}
		else
		{
			form = 'other';
		}
	}
	else
	{
		form = 'other';
	}
	
	if (form === null) { throw new Error(); }
	
	return form;
}

function DisplayAsPre(comp) {
	
	var l = [];
	
	if (comp._form == 'listOfObjects')
	{
		l.push('\t' + comp._headers.join('\t'));
		
		for (var i = 0; i < comp._data.length; i++)
		{
			var row = [];
			row.push(i.toString());
			
			for (var k = 0; k < comp._headers.length; k++)
			{
				row.push(comp._data[i][comp._headers[k]]);
			}
			
			l.push(row.join('\t'));
		}
	}
	else if (comp._form == 'listOfLists')
	{
		l.push('\t' + comp._headers.join('\t'));
		
		for (var i = 0; i < comp._data.length; i++)
		{
			var row = [];
			row.push(i.toString());
			
			for (var j = 0; j < comp._data[i].length; j++)
			{
				row.push(comp._data[i][j]);
			}
			
			l.push(row.join('\t'));
		}
	}
	else if (comp._form == 'object')
	{
		for (var k = 0; k < comp._headers.length; k++)
		{
			var key = comp._headers[k];
			l.push(key + ': ' + comp._data[key]);
		}
	}
	else if (comp._form == 'list')
	{
		for (var i = 0; i < comp._data.length; i++)
		{
			l.push(i.toString() + '\t' + comp._data[i]);
		}
	}
	else
	{
		l = [JSON.stringify(comp._data)];
	}
	
	return '<pre>' + l.join('\n') + '</pre>';
}
function DisplayAsTable(comp) {
	
	var l = [];
	
	l.push('<table class="data-component-display">');
	l.push('<tr><th></th><th>');
	l.push(comp._headers.join('</th><th>'));
	l.push('</th></tr>');
	
	if (comp._form == 'listOfObjects')
	{
		for (var i = 0; i < comp._data.length; i++)
		{
			l.push('<tr><td>' + i.toString() + '</td>');
			
			for (var k = 0; k < comp._headers.length; k++)
			{
				l.push('<td>' + comp._data[i][comp._headers[k]] + '</td>');
			}
			
			l.push('</tr>');
		}
	}
	else if (comp._form == 'listOfLists')
	{
		for (var i = 0; i < comp._data.length; i++)
		{
			l.push('<tr><td>' + i.toString() + '</td>');
			
			for (var j = 0; j < comp._data[i].length; j++)
			{
				l.push('<td>' + comp._data[i][j] + '</td>');
			}
			
			l.push('</tr>');
		}
	}
	
	l.push('</table>');
	return l.join('');
}

Data.prototype._pushUndo = function(size) {
	
	var comp = this;
	
	//console.log('----------');
	
	if (size > comp._undo.capacity) { return; }
	
	// ok, so what if index is not at the top of the stack?  that means that we're editing data that is the result of an undo
	// basically comp is a fork in the tree
	// so the correct thing to do is to discard the potential redos in the now-defunct trunk
	for (var i = comp._undo.stack.length - 1; i > comp._undo.index; i--)
	{
		comp._undo.stack.pop();
		comp._undo.size -= comp._undo.sizes.pop();
		//console.log('pop');
	}
	
	comp._undo.stack.push({ data : comp._data , headers : comp._headers });
	comp._undo.index = comp._undo.stack.length - 1;
	comp._undo.sizes.push(size);
	comp._undo.size += size;
	//console.log('push');
	
	while (comp._undo.size > comp._undo.capacity)
	{
		comp._undo.stack.shift();
		comp._undo.size -= comp._undo.sizes.shift();
		comp._undo.index--;
		//console.log('shift');
	}
	
	//console.log('----------');
};
Data.prototype.Undo = function() {
	
	var comp = this;
	
	if (comp._undo.index == 0) { return; }
	comp._undo.index--;
	comp._data = comp._undo.stack[comp._undo.index].data;
	comp._headers = comp._undo.stack[comp._undo.index].headers;
	comp._markDirty();
	comp._undo.pushOnAdd = false;
	comp._add();
	comp._undo.pushOnAdd = true;
};
Data.prototype.Redo = function() {
	
	var comp = this;
	
	if (comp._undo.index == comp._undo.stack.length - 1) { return; }
	comp._undo.index++;
	comp._data = comp._undo.stack[comp._undo.index].data;
	comp._headers = comp._undo.stack[comp._undo.index].headers;
	comp._markDirty();
	comp._undo.pushOnAdd = false;
	comp._add();
	comp._undo.pushOnAdd = true;
};

Data.prototype._runAfterChange = function() {
	var comp = this;
	(new Function('args', comp._afterChange))();
};

Data.prototype._setText = function(text) {
	
	var comp = this;
	var success = false;
	comp._errorSpan.text('');
	
	try
	{
		if (text == '')
		{
			comp._data = [];
			comp._form = 'listOfObjects';
			comp._headers = [];
		}
		else if (comp._display == 'json')
		{
			ReadJson.apply(comp, [text]);
		}
		else if (comp._display == 'yaml')
		{
			ReadYaml.apply(comp, [text]);
		}
		else if (comp._display == 'csv')
		{
			ReadCsv.apply(comp, [text]);
		}
		else if (comp._display == 'tsv')
		{
			ReadTsv.apply(comp, [text]);
		}
		else
		{
			throw new Error('Invalid display type: ' + comp._display);
		}
		
		success = true;
	}
	catch (e)
	{
		comp._showError(e, comp._display);
	}
	
	return success;
};
Data.prototype._setData = function(data) {
	
		var comp = this;
		var success = false;
		comp._errorSpan.text('');
		
		try
		{
			comp._data = JSON.parse(JSON.stringify(data));
			comp._markDirty();
			comp._determineDataForm();
			comp._introspectHeaders();
			success = true;
		}
		catch(e)
		{
			comp._showError(e, comp._display);
		}
		
		return success;
};
Data.prototype._get = function(options) {
	
	var comp = this;
	
	var result = null;
	
	if (options && options.format)
	{
		result = Write.apply(comp, [options.format]);
	}
	else
	{
		result = comp._data;
	}
	
	return result;
};
Data.prototype._set = function(data, options) {
	
	var comp = this;
	var success = false;
	
	if (options && options.format)
	{
		comp._display = options.format;
		success = comp._setText(data);
	}
	else
	{
		success = comp._setData(data);
	}
	
	if (success)
	{
		// pushUndo is called from add - problem is, if we set this.data while hidden, and then trigger an add() by changing to visible, we'll push twice
		//if (this.visible) { this.add(); } else { this.pushUndo(JSON.stringify(this._data).length); }
		comp._markDirty();
		comp._add();
		comp._runAfterChange();
	}
};

Data.prototype.uploadJSON = function() { Upload.apply(this, [ReadJson, 'json']); };
Data.prototype.uploadYAML = function() { Upload.apply(this, [ReadYaml, 'yaml']); };
Data.prototype.uploadTSV = function() { Upload.apply(this, [ReadTsv, 'tsv']); };
Data.prototype.uploadCSV = function() { Upload.apply(this, [ReadCsv, 'csv']); };
Data.prototype.downloadJSON = function() { Download.apply(this, [WriteJson.apply(this), '.json']); };
Data.prototype.downloadYAML = function() { Download.apply(this, [WriteYaml.apply(this), '.yaml']); };
Data.prototype.downloadTSV = function() { Download.apply(this, [WriteTsv.apply(this), '.tsv']); };
Data.prototype.downloadCSV = function() { Download.apply(this, [WriteCsv.apply(this), '.csv']); };
	
Data.prototype._upload = function() {
	
	var comp = this;
	
	var format = null;
	
	var fileChooser = $(document.createElement('input'));
	fileChooser.attr('type', 'file');
	
	fileChooser.on('change', function() {
		
		var fileReader = new FileReader();
		
		fileReader.onload = function(event)
		{
			if (format == 'json')
			{
				ReadJson.call(comp, event.target.result);
			}
			else if (format == 'yaml')
			{
				ReadYaml.call(comp, event.target.result);
			}
			else if (format == 'csv')
			{
				ReadCsv.call(comp, event.target.result);
			}
			else if (format == 'tsv')
			{
				ReadTsv.call(comp, event.target.result);
			}
			else
			{
				throw new Error();
			}
			
			comp._add();
		};
		
		if (fileChooser[0].files.length > 0)
		{
			var f = fileChooser[0].files[0];
			
			var ext = f.name.substr(f.name.lastIndexOf('.')+1);
			
			// if there's an ext, read that format.  otherwise just assume current format
			if (ext == 'json' || ext == 'yaml' || ext == 'csv' || ext == 'tsv')
			{
				format = ext;
			}
			else
			{
				if (comp._display == 'json' || comp._display == 'yaml' || comp._display == 'csv' || comp._display == 'tsv')
				{
					format = comp._display;
				}
				else
				{
					throw new Error('Please upload a file with extension .json, .yaml, .tsv, or .csv');
				}
			}
			
			fileReader.readAsText(f);
		}
	});
	
	fileChooser.click();
};
Data.prototype._download = function() {
	
	var comp = this;
	
	if (comp._display == 'json')
	{
		comp.downloadJSON();
	}
	else if (comp._display == 'yaml')
	{
		comp.downloadYAML();
	}
	else if (comp._display == 'csv' || comp._display == 'grid')
	{
		comp.downloadCSV();
	}
	else if (comp._display == 'tsv')
	{
		comp.downloadTSV();
	}
	else
	{
		comp.downloadJSON();
	}
};


function Upload(fn, display) {
	
	var comp = this;
	
	var fileChooser = $(document.createElement('input'));
	fileChooser.attr('type', 'file');
	
	fileChooser.on('change', function() {
		
		var fileReader = new FileReader();
		
		fileReader.onload = function(event)
		{
			fn.apply(comp, [event.target.result]);
			comp._display = display;
			comp._add();
		};
		
		if (fileChooser[0].files.length > 0)
		{
			var f = fileChooser[0].files[0];
			fileReader.readAsText(f);
		}
	});
	
	fileChooser.click();
}
function Download(text, ext) {
	
	var comp = this;
	
	var filename = comp._name + ext;
	
	var reader = new FileReader();
	reader.readAsDataURL(new Blob([text], {type:'text/plain'})); 
	reader.onloadend = function() {
		var a = document.createElement('a');
		a.href = reader.result;
		a.download = filename;
		a.click();
	};
}


var singleQuotedStringRegexString = "'([^']|\\')*'";
var doubleQuotedStringRegexString = '"([^"]|\\")*"';
var stringRegexString = '(' + singleQuotedStringRegexString + '|' + doubleQuotedStringRegexString + ')';
var newlineRegexString = '(\\r\\n|\\r|\\n)'; // newlines act as object delimiters

var numberRegex = new RegExp('^\\s*[+-]?([0-9]{1,3}((,[0-9]{3})*|([0-9]{3})*))?(\\.[0-9]*)?%?\\s*$');
var digitRegex = new RegExp('[0-9]');
var trueRegex = new RegExp('^true$', 'i');
var falseRegex = new RegExp('^false$', 'i');

// require ISO 8601 dates - this regex reads yyyy-mm-ddThh:mm:ss.fffZ, with each component after yyyy-mm being optional
// note this means that yyyy alone will be interpreted as an int, not a date
var dateRegex = new RegExp('[0-9]{4}-[0-9]{2}(-[0-9]{2}(T[0-9]{2}(:[0-9]{2}(:[0-9]{2}(.[0-9]+)?)?)?(Z|([+-][0-9]{1-2}:[0-9]{2})))?)?');

function Write(format) {
	
	var comp = this;
	
	var text = null;
	
	if (format == 'json')
	{
		text = WriteJson.apply(comp);
	}
	else if (format == 'yaml')
	{
		text = WriteYaml.apply(comp);
	}
	else if (format == 'csv')
	{
		text = WriteCsv.apply(comp);
	}
	else if (format == 'tsv')
	{
		text = WriteTsv.apply(comp);
	}
	else
	{
		throw new Error('Unsupported format: "' + format + '"');
	}
	
	return text;
}
function ReadJson(text) {
	
	var comp = this;
	
	comp._data = JSON.parse(text);
	
	comp._form = DetermineDataForm(comp._data);
	comp._introspectHeaders();
}
function ReadYaml(text) {
	
	var comp = this;
	
	comp._data = jsyaml.load(text);
	
	comp._form = DetermineDataForm(comp._data);
	comp._introspectHeaders();
}
function WriteJson() {
	
	var comp = this;
	
	if (comp._form == 'listOfObjects')
	{
		var ls = [];
		
		ls.push('[');
		
		for (var i = 0; i < comp._data.length; i++)
		{
			ls.push('\t{');
			
			for (var k = 0; k < comp._headers.length; k++)
			{
				ls.push('\t\t"' + comp._headers[k] + '": ' + WriteObjToString(comp._data[i][comp._headers[k]], null) + ((k < comp._headers.length - 1) ? ',' : ''));
			}
			
			ls.push('\t}' + ((i < comp._data.length - 1) ? ',' : ''));
		}
		
		ls.push(']');
		
		return ls.join('\n') + '\n';
	}
	else
	{
		return JSON.stringify(comp._data);
	}
}
function WriteYaml() {
	
	var comp = this;
	
	if (comp._form == 'listOfObjects')
	{
		var ls = [];
		
		for (var i = 0; i < comp._data.length; i++)
		{
			for (var k = 0; k < comp._headers.length; k++)
			{
				ls.push(((k == 0) ? '-' : ' ') + ' ' + comp._headers[k] + ': ' +  WriteObjToString(comp._data[i][comp._headers[k]], null));
			}
		}
		
		return ls.join('\n') + '\n';
	}
	else
	{
		return jsyaml.dump(comp._data);
	}
}

function ReadCsvOld(text) {
	
	var comp = this;
	
	// this csv library interprets bare numbers as strings - we need to look through the objects and parse strings to numbers
	comp._data = $.csv.toObjects(text);
	comp._form = DetermineDataForm(comp._data);
	comp._introspectHeaders();
	comp._parseDatatypes();
}
Data.prototype._parseDatatypes = function() {
	var comp = this;
	ParseDatatypeRec(comp._data);
};
function ParseDatatypeRec(obj) {
	
	// this is scaffolding for autoparsing of certain strings (such as dates)
	// however, ParseStringToObj also parses strings into numbers and bools, and is not currently parsing dates
	// therefore this should not be called on parsed json, because numbers and bools are built into json syntax
	// if we want to use this function for parsed json, we need ParseStringToObj to *only* parse dates and the like
	
	var type = Object.prototype.toString.call(obj);
	
	var keys = [];
	
	if (type == '[object Object]')
	{
		for (var key in obj)
		{
			keys.push(key);
		}
	}
	else if (type == '[object Array]')
	{
		for (var k = 0; k < obj.length; k++)
		{
			keys.push(k);
		}
	}
	else
	{
		return;
	}
	
	for (var k = 0; k < keys.length; k++)
	{
		var key = keys[k];
		var sub = obj[key];
		var subtype = Object.prototype.toString.call(sub);
		
		if (subtype == '[object Object]' || subtype == '[object Array]')
		{
			ParseDatatypeRec(sub);
		}
		else if (subtype == '[object String]')
		{
			obj[key] = ParseStringToObj(sub);
		}
	}
}

function ReadTsv(text) { ReadSeparatedValues.apply(this, [text, '\t']); }
function ReadCsv(text) { ReadSeparatedValues.apply(this, [text, ',']); }
function WriteTsv() { return WriteSeparatedValues.apply(this, ['\t']); }
function WriteCsv() { return WriteSeparatedValues.apply(this, [',']); }

function SeparatedValuesToMatrix(text, delimiter) {
	
	var matrix = [];
	var row = [];
	var start = 0;
	var end = 0;
	var entry = null;
	
	var START = 0;
	var ENTRY = 1;
	var QUOTE = 2;
	var AFTERQUOTE = 3;
	var ESCAPE = 4;
	var AFTER_CR = 5;
	
	if (text == '') { return []; }
	if (text[text.length - 1] != '\n') { text += '\n'; }
	
	var state = START;
	
	for (var k = 0; k < text.length; k++)
	{
		var c = text[k];
		
		if (state == START)
		{
			if (c == delimiter)
			{
				row.push(null);
				state = START;
			}
			else if (c == '\r' || c == '\n')
			{
				row.push(null);
				matrix.push(row);
				row = [];
				state = ((c == '\r') ? AFTER_CR : START);
			}
			else if (c == '"')
			{
				start = k;
				state = QUOTE
			}
			else
			{
				start = k;
				state = ENTRY
			}
		}
		else if (state == AFTER_CR)
		{
			if (c == delimiter)
			{
				row.push(null);
				state = START;
			}
			else if (c == '\r')
			{
				row.push(null);
				matrix.push(row);
				row = [];
				state = AFTER_CR;
			}
			else if (c == '\n')
			{
				state = START;
			}
			else if (c == '"')
			{
				start = k;
				state = QUOTE;
			}
			else
			{
				start = k;
				state = ENTRY;
			}
		}
		else if (state == ENTRY)
		{
			if (c == delimiter)
			{
				entry = text.substring(start, k);
				row.push(entry);
				state = START;
			}
			else if (c == '\r' || c == '\n')
			{
				entry = text.substring(start, k);
				row.push(entry);
				matrix.push(row);
				row = [];
				state = ((c == '\r') ? AFTER_CR : START);
			}
			else
			{
				state = ENTRY;
			}
		}
		else if (state == QUOTE)
		{
			if (c == '"')
			{
				entry = text.substring(start, k + 1);
				row.push(entry);
				state = AFTERQUOTE;
			}
			else if (c == '\\')
			{
				state = ESCAPE;
			}
			else
			{
				state = QUOTE;
			}
		}
		else if (state == AFTERQUOTE)
		{
			if (c == delimiter)
			{
				state = START;
			}
			else if (c == '\r' || c == '\n')
			{
				matrix.push(row);
				row = [];
				state = ((c == '\r') ? AFTER_CR : START);
			}
			else
			{
				throw new Error('Endquotes must be followed by a delimiter: at row ' + matrix.length + ', col ' + row.length);
			}
		}
		else if (state == ESCAPE)
		{
			state = QUOTE;
		}
		else
		{
			throw new Error();
		}
	}
	
	if (state == QUOTE || state == ESCAPE)
	{
		throw new Error('Unclosed quote: quote starts at row ' + matrix.length + ', col ' + start);
	}
	else if (state == AFTERQUOTE)
	{
		// entry was already added
	}
	else if (state == ENTRY)
	{
		entry = text.substring(start, k);
		row.push(entry);
	}
	
	if (row.length > 0) { matrix.push(row); }
	
	return matrix;
}
function ReadSeparatedValues(text, delimiter) {
	
	var comp = this;
	
	var matrix = SeparatedValuesToMatrix(text, delimiter);
	var data = null;
	var headers = null;
	
	var rowLengths = matrix.map(function(row) { return row.length; });
	var areAllRowLengthsUnity = rowLengths.every(function(n) { return n == 1; });
	
	if (areAllRowLengthsUnity)
	{
		comp._form = 'list';
		data = matrix.map(function(row) { return ParseStringToObj(row[0]); }); // interpret text as a list
	}
	else
	{
		var isListOfLists = true;
		var headerIndexes = [];
		
		for (var j = 0; j < matrix[0].length; j++)
		{
			var header = matrix[0][j];
			var index = parseInt(header);
			if (isNaN(index)) { isListOfLists = false; break; }
			headerIndexes.push(index);
		}
		
		// now pad the matrix rows so that each row is at least the length of the header row
		for (var i = 1; i < matrix.length; i++)
		{
			var shortfall = matrix[0].length - matrix[i].length;
			for (var j = 0; j < shortfall; j++) { matrix[i].push(null); }
		}
		
		data = [];
		
		if (isListOfLists)
		{
			comp._form = 'listOfLists';
			
			headers = [];
			for (var j = 0; j < headerIndexes.length; j++) { headers.push(j); }
			
			for (var i = 1; i < matrix.length; i++)
			{
				var row = [];
				
				for (var j = 0; j < headerIndexes.length; j++)
				{
					// the column reordering/deleting magic happens here
					// [[0,2],[a,b,c]] -> [[0,1],[a,c]]
					// row[j] = matrix[i][headerIndexes[j]]
					// will expand to
					// row[0] = matrix[i][0]
					// row[1] = matrix[i][2]
					row[j] = ParseStringToObj(matrix[i][headerIndexes[j]]);
				}
				
				data.push(row);
			}
		}
		else
		{
			comp._form = 'listOfObjects';
			
			headers = matrix[0];
			
			for (var i = 1; i < matrix.length; i++)
			{
				var obj = {};
				
				for (var j = 0; j < headers.length; j++) // stopping at headers.length means that excess entries will simply get dropped
				{
					obj[headers[j]] = ParseStringToObj(matrix[i][j]);
				}
				
				data.push(obj);
			}
		}
	}
	
	comp._data = data;
	comp._headers = headers;
}
function WriteSeparatedValues(delimiter) {
	
	var comp = this;
	
	var ls = [];
	
	if (comp._form == 'list')
	{
		ls = comp._data.map(function(val) { return WriteObjToString(val, delimiter); });
	}
	else
	{
		ls.push(comp._headers.join(delimiter));
		
		for (var i = 0; i < comp._data.length; i++)
		{
			var entries = [];
			
			for (var k = 0; k < comp._headers.length; k++)
			{
				var val = comp._data[i][comp._headers[k]];
				var str = WriteObjToString(val, delimiter)
				entries.push(str);
			}
			
			ls.push(entries.join(delimiter));
		}
	}
	
	return ls.join('\n') + '\n';
}

var WriteObjToString = function(obj, delimiter) {
	
	if (obj === null || obj === undefined) { return ((delimiter == null) ? 'null' : ''); }
	
	var type = Object.prototype.toString.call(obj);
	
	var str = null;
	
	if (type == '[object String]')
	{
		// delimiter == null indicates we're writing to json/yaml, which means strings must be quoted
		if (delimiter == null || obj.length == 0 || obj[0] === ' ' || obj[obj.length-1] === ' ' || obj.indexOf(delimiter) >= 0 || obj.indexOf('"') >= 0 || obj.indexOf("'") >= 0 || obj.indexOf('\t') >= 0 || obj.indexOf('\n') >= 0 || obj.indexOf('\r') >= 0 || (numberRegex.test(obj) && digitRegex.test(obj)) || trueRegex.test(obj) || falseRegex.test(obj))
		{
			str = '"' + obj.replace(/\\/g, '\\\\').replace(/\"/g, '\\"').replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
		}
		else
		{
			str = obj;
		}
	}
	else if (type == '[object Number]' || type == '[object Boolean]')
	{
		str = obj.toString();
	}
	else
	{
		// we only get here if we're setting with an object
		// if we're writing an object that we ourselves parsed, we're fine
		//throw new Error('Unsupported type: "' + type + '".  Please convert to string.');
		
		// we should not actually get here
		str = JSON.stringify(obj);
	}
	
	return str;
};
var ParseStringToObj = function(str) {
	
	if (str === null || str === undefined) { return null; }
	
	// the numberRegex accepts the empty string because all the parts are optional
	// parse the empty string as null
	if (str.length == 0) { return null; }
	
	var val = null;
	
	if (str == '"\\0"')
	{
		val = null; // this is how you get a row with a single null
	}
	else if (str[0] == '"')
	{
		// if we start with a quote, strip quotes and unescape
		var input = str.substr(1, str.length - 2);
		
		val = '';
		var escaped = false;
		
		for (var k = 0; k < input.length; k++)
		{
			var c = input[k];
			
			if (escaped)
			{
				if (c == '\\')
				{
					val += '\\';
				}
				else if (c == '"')
				{
					val += '"';
				}
				else if (c == 'r')
				{
					val += '\r';
				}
				else if (c == 'n')
				{
					val += '\n';
				}
				else if (c == 't')
				{
					val += '\t';
				}
				else if (c == 's')
				{
					val += ' ';
				}
				else
				{
					val += '\\';
					val += c;
				}
				
				escaped = false;
			}
			else
			{
				if (c == '\\')
				{
					escaped = true;
				}
				else
				{
					val += c;
					escaped = false;
				}
			}
		}
	}
	else if (numberRegex.test(str) && digitRegex.test(str)) // since all parts of numberRegex are optional, "+.%" is a valid number.  so we test digitRegex too, which checks for the presence of a digit anywhere in the string
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
	else if (trueRegex.test(str))
	{
		val = true;
	}
	else if (falseRegex.test(str))
	{
		val = false;
	}
	else
	{
		val = str;
	}
	
	return val;
};

function RunMatrixTests() {
	
	var tests = [];
	
	// basic usage and quotes
	tests.push({input:'a	b	c',output:[['a','b','c']]});
	tests.push({input:'a	"b	b"	c',output:[['a','b\tb','c']]}); // tab in the middle of bar is part of the payload, not a delimiter
	tests.push({input:'a	 "b" 	c',output:[['a',' "b" ','c']]}); // spaces are not stripped - this payload is ' "b" '
	//tests.push({input:'a	 "b	b" 	c',output:null}); // the question is what to do with this.  do we demand that quotes be at the beginning, or do we allow leading and trailing whitespace?
	tests.push({input:'a	"b	c',output:'ERROR: unclosed quote'}); // ERROR, unclosed quote
	tests.push({input:'a	"b"b	c',output:'ERROR: delimiter must follow closing quote'}); // ERROR, character after closing quote is not a delimiter
	tests.push({input:'a	"b	"c"',output:'ERROR: delimiter must follow closing quote'}); // ERROR, character after closing quote is not a delimiter (same msg, but different situation)
	tests.push({input:'"a\rb"',output:[['a\rb']]}); // maybe show a warning for a raw newline within a quote
	tests.push({input:'"a\n"b"',output:'ERROR: delimiter must follow closing quote'}); // ERROR missing closing quote around a - means the newline gets swallowed, and the error will say a delimiter must follow a closing quote
	
	
	tests.push({input:'"a"\n"\\"a\\""',output:[['a'],['"a"']]}); // actual displayed output is "a\"\n\"\"a\"", not sure why
	// do the quoteRegexStrings need a quadrupled \?
	
	// how do we distinguish between rows that are [] and rows that are [null]?  they are both represented by an empty row
	// this is where we could use a null literal, like NULL - but that would require 'NULL' to be inputted as '"NULL"'
	// 'NULL' => null => 'NULL' if singleton row, '' otherwise
	// or better, which would not break the system for Mr. NULL, is to have a special null escape that can only be used in single-char strings
	// so we define \0 as the null literal
	tests.push({input:'"\\0"',output:[[null]]});
	tests.push({input:'"a\\0"',output:[['a\\0']]}); // the null escape only works if it is the only thing in the string
	tests.push({input:'\\0',output:[['\\0']]}); // null literals are only accepted if within quotes
	tests.push({input:'"\\\\0"',output:[['\\0']]}); // this is how you specify this output string in a quoted input
	
	// a \n is added to the end if the last character is not already a \n
	tests.push({input:'',output:[]}); // special case, checked at start of parsing function
	tests.push({input:'\n',output:[[null]]});
	tests.push({input:'\t',output:[[null,null]]});
	tests.push({input:'\n\n',output:[[null],[null]]});
	tests.push({input:'a\n',output:[['a']]});
	tests.push({input:'\na',output:[[null],['a']]});
	tests.push({input:'a\nb',output:[['a'],['b']]});
	tests.push({input:'a\n\nb',output:[['a'],[null],['b']]});
	tests.push({input:'""',output:[['']]});
	
	// CRLF stuff
	tests.push({input:'a\rb',output:[['a'],['b']]});
	tests.push({input:'a\r\nb',output:[['a'],['b']]}); // CRLF is be treated as one newline
	tests.push({input:'a\r\rb',output:[['a'],[null],['b']]});
	tests.push({input:'a\n\nb',output:[['a'],[null],['b']]});
	tests.push({input:'a\n\rb',output:[['a'],[null],['b']]});
	
	function SingleTest(t) {
		
		var input = t.input;
		
		var matrix = null;
		
		try
		{
			matrix = SeparatedValuesToMatrix(input, '\t');
		}
		catch (e)
		{
			if (typeof(t.output) == 'string')
			{
				return 'passed'; // we could check to make sure the message matches, but nah
			}
			else
			{
				return 'failed - unexpected error: ' + e.message;
			}
		}
		
		if (typeof(t.output) == 'string')
		{
			return 'failed - should have thrown an error';
		}
		
		for (var i = 0; i < matrix.length; i++)
		{
			for (var k = 0; k < matrix[i].length; k++)
			{
				matrix[i][k] = ParseStringToObj(matrix[i][k]);
			}
		}
		
		if (t.output.length != matrix.length) { return 'failed - wrong length'; }
		
		for (var i = 0; i < matrix.length; i++)
		{
			if (t.output[i].length != matrix[i].length) { return 'failed - row ' + i + ' is the wrong length'; }
			
			for (var k = 0; k < matrix[i].length; k++)
			{
				var object = matrix[i][k];
				var expected = t.output[i][k];
				
				if (object === null)
				{
					if (expected !== null)
					{
						return 'failed - entry ' + i + ',' + k + ' = null';
					}
				}
				
				if (typeof(object) != typeof(expected)) { return 'failed - entry ' + i + ',' + k + ' = ' + object.toString(); }
				
				if (typeof(object) == 'string')
				{
					if (object.length != expected.length) { return 'failed - entry ' + i + ',' + k + ' = ' + object.toString(); }
					
					for (var j = 0; j < object.length; j++)
					{
						if (object[j] != expected[j])
						{
							return 'failed - entry ' + i + ',' + k + ' = ' + object.toString();
						}
					}
				}
				else
				{
					if (object != expected) { return 'failed - entry ' + i + ',' + k + ' = ' + object.toString(); }
				}
			}
		}
		
		return 'passed';
	}
	
	console.log('----------');
	for (var i = 0; i < tests.length; i++)
	{
		var msg = SingleTest(tests[i]);
		console.log(tests[i].input + ' - ' + msg);
		console.log('----------');
	}
}
function RunTests() {
	
	var testData = [
		{input:'1',internal:1,output:'1'},
		{input:' 1 ',internal:1,output:'1'}, // numbers can have leading and trailing whitespace, which is stripped
		{input:'1.5',internal:1.5,output:'1.5'},
		{input:'.1',internal:0.1,output:'0.1'},
		{input:'1.',internal:1,output:'1'},
		{input:'-1.5',internal:-1.5,output:'-1.5'},
		{input:'+1.5',internal:1.5,output:'1.5'},
		{input:'1.5%',internal:0.015,output:'0.015'}, // percentages are valid input but are dropped in the output
		{input:'.',internal:'.',output:'.'}, // not a number
		{input:'+.%',internal:'+.%',output:'+.%'}, // not a number
		{input:'1.5.',internal:'1.5.',output:'1.5.'}, // not a number
		{input:'00',internal:0,output:'0'}, // numbers with leading zeroes are still numbers
		{input:'0x00',internal:'0x00',output:'0x00'}, // no support for hexadecimal
		{input:'2016-01-01',internal:'2016-01-01',output:'2016-01-01'}, // dates are not parsed automatically
		{input:'true',internal:true,output:'true'},
		{input:'True',internal:true,output:'true'}, // boolean parsing is case-insensitive, but output is all lower case
		{input:'TRUE',internal:true,output:'true'},
		{input:'"true"',internal:'true',output:'"true"'}, // strings that would parse as bools must be quoted
		{input:'',internal:null,output:''}, // blank values parse to null
		{input:'null',internal:'null',output:'null'}, // "null" remains a literal string, is not parsed to null
		{input:'"1"',internal:'1',output:'"1"'}, // strings that would parse as numbers must be quoted
		{input:'"1.5"',internal:'1.5',output:'"1.5"'}, // strings that would parse as numbers must be quoted
		{input:'"1.5%"',internal:'1.5%',output:'"1.5%"'}, // strings that would parse as numbers must be quoted
		{input:'a',internal:'a',output:'a'},
		{input:'"a"',internal:'a',output:'a'}, // quotes get dropped if not needed
		{input:'\'a\'',internal:'\'a\'',output:'"\'a\'"'}, // single quotes are not quotes (largely because they can be apostrophes) but output gets quoted
		{input:'"a\tb"',internal:'a\tb',output:'"a\\tb"'}, // raw tabs get converted to escaped form, value gets quoted
		{input:'"\\"a\\""',internal:'"a"',output:'"\\"a\\""'}, // here, the quotes are part of the payload
		{input:' "a" ',internal:' "a" ',output:'" \\"a\\" "'}, // this will not be interpreted as a quote, because the quote is not directly after the delimiter - spaces at beginning or end mean the value gets quoted
		//input:'""a""',internal:null,output:null, // ERROR, endquote not immediately followed by a delimiter
		{input:'\\t\\n\\r\\\\',internal:'\\t\\n\\r\\\\',output:'\\t\\n\\r\\\\'}, // this is literal - escapes happen only within quoted strings
		{input:'"\\t"',internal:'\t',output:'"\\t"'}, // escaped char within string
		{input:' ',internal:' ',output:'" "'}, // space at the beginning or end is outputted in quotes, to highlight them for the user
		{input:'a b',internal:'a b',output:'a b'}, // interior spaces do not cause output to be quoted
		{input:'" "',internal:' ',output:'" "'},
		{input:'"\\s"',internal:' ',output:'" "'}, // sometimes escaped spaces are useful, but we can't have it as the canonical output
		{input:'"\\g"',internal:'\\g',output:'\\g'}, // \g is not a recognized escape, so the slash becomes part of the payload - we can strip quotes in this instance, which might indicate the anomaly to the user (unless the string gets quoted for other reasons
		{input:'"\\\\t"',internal:'\\t',output:'\\t'}, // an escaped backslash, quotes can be stripped
	];
	
	function SingleTest(t) {
		
		var input = t.input;
		var object = ParseStringToObj(input);
		
		if (object === null)
		{
			if (t.internal === null)
			{
				return 'passed';
			}
			else
			{
				return 'failed - object=null';
			}
		}
		
		if (typeof(object) != typeof(t.internal)) { return 'failed - object=' + object.toString(); }
		
		if (typeof(object) == 'string')
		{
			if (object.length != t.internal.length) { return 'failed - object=' + object.toString(); }
			
			for (var k = 0; k < object.length; k++)
			{
				if (object[k] != t.internal[k])
				{
					return 'failed - object=' + object.toString();
				}
			}
		}
		else
		{
			if (object != t.internal) { return 'failed - object=' + object.toString(); }
		}
		
		var actualOutput = WriteObjToString(object, '\t');
		
		if (actualOutput != t.output) { return 'failed - output=' + actualOutput; }
		
		return 'passed';
	}
	
	for (var i = 0; i < testData.length; i++)
	{
		var msg = SingleTest(testData[i]);
		console.log(testData[i].input + ' - ' + msg);
	}
}
//RunMatrixTests();
//RunTests();

Hyperdeck.Components.data = Data;

})();

