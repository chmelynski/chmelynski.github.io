
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
	
	this.type = json.type; // repl,snips
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	this.inputDiv = null;
	
	this.snips = json.snips;
	this.sentinel = null;
};
Repl.prototype.add = function() {
	
	var comp = this;
	
	comp.sentinel = new LinkedList();
	
	comp.div.html('');
	
	if (comp.type == 'repl')
	{
		comp.div.append($('<button style="margin:0.2em" class="btn btn-default">Clear</button>').on('click', function() {
			comp.snips = [''];
			comp.add();
			comp.markDirty();
		}));
	
		comp.div.append($('<br />'));
	}
	
	comp.inputDiv = $('<div style="margin:0.2em"></div>').appendTo(comp.div);
	
	comp.snips.forEach(function(snip) { comp.addInput(snip); });
	
	if (comp.type == 'snips') { comp.div.append($('<button style="margin:0.2em" class="btn btn-default btn-sm"><i class="fa fa-plus"></i></button>').on('click', function() { comp.addInput(''); })); }
};
Repl.prototype.addInput = function(text) {
	
	var comp = this;
	
	comp.markDirty();
	
	var snip = new Snip();
	snip.text = text;
	
	var listElement = comp.sentinel.add(snip);
	
	snip.row = $('<div style="margin:0.2em"></div>').appendTo(comp.inputDiv);
	
	if (comp.type == 'snips')
	{ 
		snip.row.append($('<button class="btn btn-default btn-sm"><i class="fa fa-lg fa-trash-o"></i></button>').on('click', function() { 
			comp.markDirty();
			listElement.remove();
			snip.row.remove();
		}));
	}
	
	snip.input = $('<input type="text" class="input-sm" style="width:80%;margin:0.2em"></input>').attr('value', text).on('keydown', function(keyEvent) {
		
		// up and down arrows move between existing snippets
		if (keyEvent.which == 38 || keyEvent.which == 40)
		{
			var listElementToFocus = null;
			if (keyEvent.which == 38) { listElementToFocus = listElement.prev; }
			if (keyEvent.which == 40) { listElementToFocus = listElement.next; }
			this.value = listElementToFocus.data.text;
			this.selectionStart = this.value.length;
			this.selectionEnd = this.value.length;
			keyEvent.preventDefault();
		}
		
		if (keyEvent.which == 13)
		{
			snip.text = this.value;
			Exec();
			if (comp.type == 'repl') { if (listElement.next == comp.sentinel) { comp.addInput('')[0].focus(); } }
			if (comp.type == 'snips') { this.blur(); }
		}
	}).on('change', function() {
		comp.markDirty();
		snip.text = this.value;
	}).appendTo(snip.row);
	
	function Exec() {
		
		snip.output.text('');
		
		try
		{
			snip.func = new Function('', 'return ' + snip.text);
			var output = snip.func();
			
			if (comp.type == 'repl')
			{
				snip.output.css('color', 'black').text(output);
			}
		}
		catch (e)
		{
			snip.output.css('color', 'red').text(e);
		}
	}
	
	if (comp.type == 'snips')
	{
		$('<button class="btn btn-default btn-sm">Run</button>').on('click', function() { Exec(); }).appendTo(snip.row);
	}
	
	snip.output = $('<div></div>').appendTo(snip.row); // snips need an output div to display errors
	
	return snip.input; // this is needed for the Return keyEvent handling above (add a new row and focus the input)
};
Repl.prototype.displayError = function(e) {
	
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
	comp.errorSpan.text('Error: ' + e.message + ' (at line ' + lineNumber + ', column ' + colNumber + ')');
};
Repl.prototype.write = function() {
	
	var comp = this;
	
	var json = {};
	json.type = comp.type;
	json.name = comp.name;
	json.visible = comp.visible;
	json.snips = ((comp.type == 'snips') ? comp.sentinel.enumerate().map(function(snip) { return snip.text; }) : ['']);
	return json;
};

Repl.prototype.get = function(options) {
	
	var comp = this;
	
	if (comp.type == 'repl') { throw new Error('The "repl" component does not support Get/Set.'); }
	
	var result = null;
	
	if (options && options.format)
	{
		if (options.format == 'text')
		{
			result = comp.snips.join('\n');
		}
		else if (options.format == 'list')
		{
			result = comp.snips;
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
		result = comp.snips;
	}
	
	return result;
};
Repl.prototype.set = function(data, options) {
	
	var comp = this;
	
	if (comp.type == 'repl') { throw new Error('The "repl" component does not support Get/Set.'); }
	
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
	
	comp.snips = thedata;
};

var Snip = function() {
	
	this.text = null; // string
	this.func = null; // Function
	this.row = null; // <div>
	this.input = null; // <input>
	this.output = null; // <div>
};

var LinkedList = function() {
	this.data = null;
	this.prev = this;
	this.next = this;
};
LinkedList.prototype.add = function(data) {
	
	// this must be called on the sentinel
	
	var elt = new LinkedList();
	elt.data = data;
	elt.next = this;
	elt.prev = this.prev;
	
	if (this.next === this) { this.next = elt; } else { this.prev.next = elt; }
	this.prev = elt;
	
	return elt;
};
LinkedList.prototype.remove = function() {
	
	// this cannot be called on the sentinel
	this.prev.next = this.next;
	this.next.prev = this.prev;
};
LinkedList.prototype.enumerate = function() {
	
	// this must be called on the sentinel
	
	var list = [];
	var elt = this.next;
	
	while (elt !== this)
	{
		list.push(elt.data);
		elt = elt.next;
	}
	
	return list;
};

Hyperdeck.Components.repl = Repl;
Hyperdeck.Components.snips = Repl;

})();

