
(function() {

var Diag = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		json.text = '\n// Click and drag the green points in the diagram\n// After the drag, the object literals below will update with the new coordinates.\n// You can also draw a selection box and then drag the selection box.\n// A draggable point will be drawn for each object literal of the form { x: <int>, y: <int> }.\nconst p = { x: 100, y: 100 };\nconst q = { x: 200, y: 200 };\n\nctx.beginPath();\nctx.moveTo(p.x, p.y);\nctx.lineTo(q.x, q.y);\nctx.stroke();\n';
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
	
	Hyperdeck.AddCodemirror(comp, textarea, 'javascript');
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
	comp.diagram = new Hyperdeck.Diagram(comp.ctx, function(text) { comp.set(text); });
	
	$('<div>').attr('id', comp.name).append(canvas).appendTo('#output');
};
Diag.prototype.onblur = function() {
	var comp = this;
	comp.diagram.receiveText(comp.text);
};
Diag.prototype.afterLoad = function(callback) {
	var comp = this;
	comp.addOutputElements();
	callback(comp);
};
Diag.prototype.afterAllLoaded = function() {
	var comp = this;
	comp.diagram.receiveText(comp.text, comp.codemirror.lastLine());
};
Diag.prototype.exec = function(thisArg) {
	var comp = this;
	comp.diagram.draw(thisArg);
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

