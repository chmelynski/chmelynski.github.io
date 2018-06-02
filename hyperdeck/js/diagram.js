
(function() {

var Diag = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		json.text = '';
		json.showPoints = true;
		json.width = 500;
		json.height = 300;
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	this.controlDiv = null;
	this.editorDiv = null;
	this.codemirror = null;
	
	this.text = json.text;
	
	this.showPoints = json.showPoints;
	this.width = json.width;
	this.height = json.height;
	
	this.ctx = null;
	this.diagram = null;
};
Diag.prototype.add = function() {
	
	var comp = this;
	
	comp.div.html('');
	comp.controlDiv = $('<div class="code-control">').appendTo(comp.div);
	comp.editorDiv = $('<div class="code-editor">').appendTo(comp.div);
	
	comp.refreshControls();
	
	var textarea = $('<textarea>').appendTo(comp.editorDiv);
	
	var options = {};
	options.smartIndent = true;
	options.lineNumbers = true;
	options.lineWrapping = true;
	options.foldGutter = true;
	options.tabSize = 2;
	options.indentUnit = 2;
	options.indentWithTabs = true;
	options.gutters = ["CodeMirror-linenumbers","CodeMirror-foldgutter"];
	options.extraKeys = {"Ctrl-Q": function(cm) { cm.foldCode(cm.getCursor()); }};
	
	if (Hyperdeck.Preferences && Hyperdeck.Preferences.CodeMirror)
	{
		for (var key in Hyperdeck.Preferences.CodeMirror) { options[key] = Hyperdeck.Preferences.CodeMirror[key]; }
	}
	
	options.mode = 'javascript';
	
	comp.codemirror = CodeMirror.fromTextArea(textarea[0], options);
	
	comp.codemirror.on('change', function() {
		comp.markDirty();
	});
	
	comp.codemirror.on('blur', function() {
		comp.text = comp.codemirror.getValue();
		comp.onblur();
	});
	
	comp.codemirror.getDoc().setValue(comp.text);
};
Diag.prototype.refreshControls = function() {
	
	var comp = this;
	
	var div = comp.controlDiv[0];
	
	comp.controlDiv.html('');
	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Run Code" class="btn btn-default btn-sm"><i class="fa fa-play" style="color:green"></i></button>').appendTo(comp.controlDiv).on('click', function() { comp.exec(comp); });
	
	$('<span> show points:</span><input type="checkbox" ' + (comp.showPoints ? 'checked' : '') + '></input>').appendTo(comp.controlDiv).eq(1).on('change', function() {
		comp.showPoints = this.checked;
		comp.diagram.showPoints = this.checked;
		comp.exec(comp);
	});
	
	$('<span> width:</span><input type="text" size="5"></input>').appendTo(comp.controlDiv).eq(1).attr('value', comp.width).on('change', function() {
		comp.width = parseInt(this.value);
		comp.ctx.canvas.width = comp.width;
		comp.exec(comp);
	});
	
	$('<span> height:</span><input type="text" size="5"></input>').appendTo(comp.controlDiv).eq(1).attr('value', comp.height).on('change', function() {
		comp.height = parseInt(this.value);
		comp.ctx.canvas.height = comp.height;
		comp.exec(comp);
	});
};
Diag.prototype.addOutputElements = function() {
	
	var comp = this;
	
	var canvas = document.createElement('canvas');
	canvas.width = comp.width;
	canvas.height = comp.height;
	canvas.style.border = '1px solid gray';
	canvas.tabIndex = 1;
	
	comp.ctx = canvas.getContext('2d');
	comp.diagram = new Diagram(comp.ctx, function(text) { comp.set(text); });
	
	$('<div>').attr('id', comp.name).append(canvas).appendTo('#output');
};
Diag.prototype.onblur = function() {
	var comp = this;
	//comp.exec(comp);
};
Diag.prototype.afterLoad = function(callback) {
	var comp = this;
	comp.addOutputElements();
	callback(comp);
};
Diag.prototype.afterAllLoaded = function() {
	var comp = this;
	comp.exec(comp);
};
Diag.prototype.exec = function(thisArg) {
	
	var comp = this;
	
	comp.diagram.receiveText(comp.text, comp.codemirror.lastLine());
	//var fn = new Function('ctx', comp.text);
	//fn.call(thisArg, comp.ctx);
};
Diag.prototype.write = function() {
	
	var comp = this;
	
	return {
		type: comp.type,
		name: comp.name,
		visible: comp.visible,
		text: comp.text,
		showPoints: comp.showPoints,
		width: comp.width,
		height: comp.height
	};
};
Diag.prototype.set = function(text, options) {
	
	var comp = this;
	
	comp.text = text;
	comp.markDirty();
	comp.codemirror.getDoc().setValue(comp.text);
	comp.onblur();
};

Diag.prototype.Run = function() { this.exec(this); };

Hyperdeck.Components.diagram = Diag;

})();

