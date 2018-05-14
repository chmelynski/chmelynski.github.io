
(function() {

var Repl = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		json.snips = [ '' ];
	}
	
	this._type = json.type; // repl,snips
	this._name = json.name;
	this._visible = json.visible;
	
	this._div = null;
	this._inputDiv = null;
	
	this._snips = json.snips;
	this._sentinel = null;
};
Repl.prototype._add = function() {
	
	var comp = this;
	
	comp._sentinel = new LinkedList();
	
	comp._div.html('');
	
	if (comp._type == 'repl')
	{
		comp._div.append($('<button style="margin:0.2em" class="btn btn-default">Clear</button>').on('click', function() {
			comp._snips = [''];
			comp._add();
			comp._markDirty();
		}));
	
		comp._div.append($('<br />'));
	}
	
	comp._inputDiv = $('<div style="margin:0.2em"></div>').appendTo(comp._div);
	
	comp._snips.forEach(function(snip) { comp._addInput(snip); });
	
	if (comp._type == 'snips') { comp._div.append($('<button style="margin:0.2em" class="btn btn-default btn-sm"><i class="fa fa-plus"></i></button>').on('click', function() { comp._addInput(''); })); }
};
Repl.prototype._addInput = function(text) {
	
	var comp = this;
	
	comp._markDirty();
	
	var snip = new Snip();
	snip._text = text;
	
	var listElement = comp._sentinel._add(snip);
	
	snip._row = $('<div style="margin:0.2em"></div>').appendTo(comp._inputDiv);
	
	if (comp._type == 'snips')
	{ 
		snip._row.append($('<button class="btn btn-default btn-sm"><i class="fa fa-lg fa-trash-o"></i></button>').on('click', function() { 
			comp._markDirty();
			listElement._remove();
			snip._row.remove();
		}));
	}
	
	snip._input = $('<input type="text" class="input-sm" style="width:80%;margin:0.2em"></input>').attr('value', text).on('keydown', function(keyEvent) {
		
		// up and down arrows move between existing snippets
		if (keyEvent.which == 38 || keyEvent.which == 40)
		{
			var listElementToFocus = null;
			if (keyEvent.which == 38) { listElementToFocus = listElement._prev; }
			if (keyEvent.which == 40) { listElementToFocus = listElement._next; }
			this.value = listElementToFocus._data._text;
			this.selectionStart = this.value.length;
			this.selectionEnd = this.value.length;
			keyEvent.preventDefault();
		}
		
		if (keyEvent.which == 13)
		{
			snip._text = this.value;
			Exec();
			if (comp._type == 'repl') { if (listElement._next == comp._sentinel) { comp._addInput('')[0].focus(); } }
			if (comp._type == 'snips') { this.blur(); }
		}
	}).on('change', function() {
		comp._markDirty();
		snip._text = this.value;
	}).appendTo(snip._row);
	
	function Exec() {
		
		snip._output.text('');
		
		try
		{
			snip._func = new Function('', 'return ' + snip._text);
			var output = snip._func();
			
			if (comp._type == 'repl')
			{
				snip._output.css('color', 'black').text(output);
			}
		}
		catch (e)
		{
			snip._output.css('color', 'red').text(e);
		}
	}
	
	if (comp._type == 'snips')
	{
		$('<button class="btn btn-default btn-sm">Run</button>').on('click', function() { Exec(); }).appendTo(snip._row);
	}
	
	snip._output = $('<div></div>').appendTo(snip._row); // snips need an output div to display errors
	
	return snip._input; // this is needed for the Return keyEvent handling above (add a new row and focus the input)
};
Repl.prototype._displayError = function(e) {
	
	var comp = this;
	
	var lines = e.stack.split('\n');
	var evalLine = null;
	for (var i = 0; i < lines.length; i++)
	{
		if (lines[i].trim().substr(0, 7) == 'at eval')
		{
			evalLine = lines[i];
		}
	}
	var fnLineCol = evalLine.split(',')[1]; // ' <anonymous>:7:1)'
	var fnLineColArray = fnLineCol.substring(1, fnLineCol.length - 1).split(':'); // [ '<anonymous' , '7' , '1' ]
	var functionName = fnLineColArray[0];
	var lineNumber = fnLineColArray[1] - 2; // not sure why the line number is 2 off
	var colNumber = fnLineColArray[2];
	comp._errorSpan.text('Error: ' + e.message + ' (at line ' + lineNumber + ', column ' + colNumber + ')');
};
Repl.prototype._write = function() {
	
	var comp = this;
	
	var json = {};
	json.type = comp._type;
	json.name = comp._name;
	json.visible = comp._visible;
	json.snips = ((comp._type == 'snips') ? comp._sentinel._enumerate().map(function(snip) { return snip._text; }) : ['']);
	return json;
};

Repl.prototype._get = function(options) {
	
	var comp = this;
	
	if (comp._type == 'repl') { throw new Error('The "repl" component does not support Get/Set.'); }
	
	var result = null;
	
	if (options && options.format)
	{
		if (options.format == 'text')
		{
			result = comp._snips.join('\n');
		}
		else if (options.format == 'list')
		{
			result = comp._snips;
		}
		else
		{
			var ls = [];
			ls.push('Unsupported format: "' + options.format + '".');
			ls.push('The "snips" component supports formats "text" and "list".')
			throw new Error(ls.join(' '));
		}
	}
	else
	{
		result = comp._snips;
	}
	
	return result;
};
Repl.prototype._set = function(data, options) {
	
	var comp = this;
	
	if (comp._type == 'repl') { throw new Error('The "repl" component does not support Get/Set.'); }
	
	var thedata = null;
	
	if (options && options.format)
	{
		if (options.format == 'text')
		{
			thedata = data.split('\n');
		}
		else if (options.format == 'list')
		{
			thedata = data
		}
		else
		{
			var ls = [];
			ls.push('Unsupported format: "' + options.format + '".');
			ls.push('The "snips" component supports formats "text" and "list".')
			throw new Error(ls.join(' '));
		}
	}
	else
	{
		throw new Error('Must specify { format : "text" or "list" }.');
	}
	
	comp._snips = thedata;
};

var Snip = function() {
	
	this._text = null; // string
	this._func = null; // Function
	this._row = null; // <div>
	this._input = null; // <input>
	this._output = null; // <div>
};

var LinkedList = function() {
	this._data = null;
	this._prev = this;
	this._next = this;
};
LinkedList.prototype._add = function(data) {
	
	// this must be called on the sentinel
	
	var elt = new LinkedList();
	elt._data = data;
	elt._next = this;
	elt._prev = this._prev;
	
	if (this._next === this) { this._next = elt; } else { this._prev._next = elt; }
	this._prev = elt;
	
	return elt;
};
LinkedList.prototype._remove = function() {
	
	// this cannot be called on the sentinel
	this._prev._next = this._next;
	this._next._prev = this._prev;
};
LinkedList.prototype._enumerate = function() {
	
	// this must be called on the sentinel
	
	var list = [];
	var elt = this._next;
	
	while (elt !== this)
	{
		list.push(elt._data);
		elt = elt._next;
	}
	
	return list;
};

Hyperdeck.Components.repl = Repl;
Hyperdeck.Components.snips = Repl;

})();

