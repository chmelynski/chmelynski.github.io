
(function() {

var Tree = function(json) {
	
	if (!json)
	{
		json = {};
		json.type = 'tree';
		json.name = Griddl.Components.UniqueName('tree', 1);
		json.visible = true;
		json.text = 'a foo=bar\n b\n c';
		//json.text = '<a><b /><c /></a>';
		json.params = {};
		json.params.format = 'tree';
		json.params.display = 'tree';
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	this.errorSpan = null;
	this.codemirror = null;
	
	this._text = json.text;
	this._data = null;
	
	Object.defineProperty(this, 'text', { 
		get : function() {
			return this._text;
		},
		set : function(value) {
			this._text = value;
			if (!Griddl.dirty) { Griddl.Components.MarkDirty(); }
			this.codemirror.getDoc().setValue(this._text);
			this.compile();
		}
	});
	
	Object.defineProperty(this, 'data', { 
		get : function() {
			return this._data;
		},
		set : function(value) {
			this._data = value;
			if (!Griddl.dirty) { Griddl.Components.MarkDirty(); }
			this.textify();
		}
	});
	
	this.format = json.params.format; // tree, json, yaml, xml
	this.display = json.params.display; // tree, json, yaml, xml, graphical
};
Tree.prototype.add = function() {
	
	this.div.html('');
	
	var comp = this;
	
	var gui = new dat.GUI({autoPlace:false});
	var displayControl = gui.add(this, 'display', ['xml','tree']);
	displayControl.onChange(function(value) { comp.textify(); comp.codemirror.getDoc().setValue(comp._text); });
	this.div[0].appendChild(gui.domElement);
	
	var textarea = $(document.createElement('textarea'));
	this.div.append(textarea);
	
	var modeDict = {tree:'plain',json:'javascript',xml:'xml',yaml:'plain'};
	var options = {};
	options.mode = modeDict[this.display];
	options.smartIndent = false;
	options.lineNumbers = true;
	options.lineWrapping = true;
	this.codemirror = CodeMirror.fromTextArea(textarea[0], options);
	
	// on 'change' or 'blur'
	this.codemirror.on('blur', function() {
		if (!Griddl.dirty) { Griddl.Components.MarkDirty(); }
		comp._text = comp.codemirror.getValue(); // we avoid a setter loop by setting this._text, not this.text
		comp.compile();
	});
	
	this.codemirror.getDoc().setValue(this._text);
	
	this.errorSpan = $('<span></span>');
	this.errorSpan.css('color', 'red');
	this.div.append(this.errorSpan);
	
	this.compile(); // we do this here in add rather than in the constructor because the errorSpan has to be in place
};
Tree.prototype.compile = function() {
	
	if (this.display == 'tree')
	{
		this._data = ReadTree(this._text);
	}
	else if (this.display == 'xml')
	{
		this._data = ReadXml(this._text);
	}
	else if (this.display == 'json')
	{
		
	}
	else if (this.display == 'yaml')
	{
		
	}
	else
	{
		throw new Error();
	}
};
Tree.prototype.textify = function() {
	
	if (this.display == 'tree')
	{
		this._text = WriteTree(this._data);
	}
	else if (this.display == 'xml')
	{
		this._text = WriteXml(this._data);
	}
	else if (this.display == 'json')
	{
		
	}
	else if (this.display == 'yaml')
	{
		
	}
	else
	{
		throw new Error();
	}
};
Tree.prototype.write = function() {
	
	var json = {};
	json.type = this.type;
	json.name = this.name;
	json.visible = this.visible;
	json.text = this.text;
	return json;
};

var Element = function() {
	
	this.name = null;
	this.text = null;
	this.attrs = [];
	this.children = [];
	this.parent = null;
};

// tree format:
// tag key="val" key="val"
//  tag
//  tag

var nameRegexStr = '[A-Za-z][A-Za-z0-9]*';
var stringRegexStr = '"(?:[^"]|\\\\")+"';
var tokenizer = new RegExp(nameRegexStr + '|' + '=' + '|' + stringRegexStr, 'g');
var indentCounter = new RegExp('^\\s+');

function ReadTree(text) {
	
	var lines = text.trim().split('\n');
	
	var root = new Element();
	
	var stack = [root];
	
	for (var i = 0; i < lines.length; i++)
	{
		var line = lines[i];
		
		var indentResult = indentCounter.exec(line)
		var indent = ((indentResult == null) ? 0 : indentResult[0].length);
		line = line.substr(indent);
		
		var tokens = [];
		
		tokenizer.lastIndex = 0;
		var match = tokenizer.exec(line);
		
		while (match != null)
		{
			tokens.push(match[0]);
			match = tokenizer.exec(line);
		}
		
		var elt = new Element();
		
		if (tokens[0][0] == '"')
		{
			elt.text = tokens[0].substr(1, tokens[0].length - 2);
		}
		else
		{
			elt.name = tokens[0];
			
			for (var k = 1; k < tokens.length; k += 3)
			{
				elt.attrs.push({ key : tokens[k] , val : tokens[k+2].substr(1, tokens[k+2].length - 2) });
			}
		}
		
		stack[indent].children.push(elt);
		elt.parent = stack[indent];
		stack[indent + 1] = elt;
	}
	
	return root;
}
function WriteTree(root) {
	
	var lines = [];
	
	for (var i = 0; i < root.children.length; i++)
	{
		WriteTreeRec(lines, root.children[i], 0);
	}
	
	return lines.join('\n');
}
function WriteTreeRec(lines, elt, indent) {
	
	if (elt.name)
	{
		var open = ' '.repeat(indent) + elt.name;
		
		for (var i = 0; i < elt.attrs.length; i++)
		{
			open += ' ' + elt.attrs[i].key + '="' + elt.attrs[i].val + '"';
		}
		
		lines.push(open);
		
		for (var i = 0; i < elt.children.length; i++)
		{
			WriteTreeRec(lines, elt.children[i], indent+1);
		}
	}
	else
	{
		lines.push('"' + elt.text + '"');
	}
}

function ReadXml(text) {
	
	function ReadXmlRec(root, node) {
		
		for (var i = 0; i < node.childNodes.length; i++)
		{
			var child = node.childNodes[i];
			
			var type = Object.prototype.toString.call(child);
			
			var elt = new Element();
			elt.parent = root;
			root.children.push(elt);
			
			if (type == '[object Element]')
			{
				elt.name = child.nodeName;
				
				for (var k = 0; k < child.attributes.length; k++)
				{
					var attr = child.attributes[k];
					elt.attrs.push({key:attr.nodeName,val:attr.textContent});
				}
				
				ReadXmlRec(elt, child);
			}
			else if (type == '[object Text]')
			{
				elt.text = child.textContent;
			}
			else
			{
				throw new Error();
			}
		}
	}
	
	var doc = $.parseXML(text);
	var root = new Element();
	ReadXmlRec(root, doc);
	return root;
}
function WriteXml(root, compressed) {
	
	var lines = [];
	
	for (var i = 0; i < root.children.length; i++)
	{
		WriteXmlRec(lines, root.children[i], 0, compressed);
	}
	
	var glue = compressed ? '' : '\n';
	
	return lines.join(glue);
}
function WriteXmlRec(lines, elt, indent, compressed) {
	
	var indentSpaces = compressed ? '' : ' '.repeat(indent);
	
	if (elt.name)
	{
		var open = indentSpaces + '<' + elt.name;
		
		for (var i = 0; i < elt.attrs.length; i++)
		{
			open += ' ' + elt.attrs[i].key + '="' + elt.attrs[i].val + '"';
		}
		
		open += '>';
		lines.push(open);
		
		for (var i = 0; i < elt.children.length; i++)
		{
			WriteXmlRec(lines, elt.children[i], indent+1, compressed);
		}
		
		lines.push(indentSpaces + '</' + elt.name + '>');
	}
	else
	{
		lines.push(elt.text);
	}
}

Griddl.Components.tree = Tree;

Griddl.Components.ReadXml = ReadXml;
Griddl.Components.WriteXml = WriteXml;
Griddl.Components.ReadTree = ReadTree;
Griddl.Components.WriteTree = WriteTree;

})();

