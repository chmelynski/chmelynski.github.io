(function() {
	
var THREE;

var Graphics = function(json, type, name) {
	
	if (!json)
	{
		json = {
			type: type,
			name: name,
			visible: true,
			text: '',
			params: {
				width: 500,
				height: 300
			}
		};
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	this.controlDiv = null;
	this.editorDiv = null;
	this.codemirror = null;
	
	this.text = json.text;
	this.params = json.params;
	
	this.ctx = null;
};
Graphics.prototype.add = function() {
	
	var comp = this;
	
	comp.div.html('');
	comp.controlDiv = $('<div class="code-control">').appendTo(comp.div);
	comp.editorDiv = $('<div class="code-editor">').appendTo(comp.div);
	
	comp.refreshControls();
	
	Hyperdeck.AddCodemirror(comp, $('<textarea>').appendTo(comp.editorDiv), 'javascript');
};
Graphics.prototype.refreshControls = function() {
	
	var comp = this;
	
	comp.controlDiv.html('');
};
Graphics.prototype.addOutputElements = function() {
	
	var comp = this;
	
	var ctx = new THREE.WebGLRenderer();
	ctx.setSize(comp.width, comp.height);
	ctx.setClearColor(0xffffff);
	ctx.domElement.style.border = '1px solid gray';
	comp.ctx = ctx;
	$('<div>').attr('id', comp.name).append(ctx.domElement).appendTo('#output');
};
Graphics.prototype.onblur = function() {
	var comp = this;
	//comp.exec(comp);
};
Graphics.prototype.afterLoad = function(callback) {
	var comp = this;
	
	if (!THREE)
	{
		var script = document.createElement('script');
		document.body.appendChild(script);
		script.onload = function() {
			
			var toload = ['CanvasRenderer.js','Projector.js','OrbitControls.js'];
			var loaded = 0;
				      
			for (var i = 0; i < toload.length; i++)
			{
				var script2 = document.createElement('script');
				document.body.appendChild(script2);
				script2.onload = function() {
					loaded++;
					if (loaded == toload.length) { comp.addOutputElements(); callback(comp); }
				};
				script2.src = '../graphics/threejs/' + toload[i];
			}
		};
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/93/three.min.js';
	}
	else
	{
		callback(comp);
	}
	
};
Graphics.prototype.afterAllLoaded = function() {
	var comp = this;
	comp.exec(comp);
};
Graphics.prototype.exec = function(thisArg) {
	
	var comp = this;
	
	var fn = new Function('ctx', comp.text);
	fn.call(thisArg, comp.ctx);
};
Graphics.prototype.write = function() {
	
	var comp = this;
	
	var json = {
		type: comp.type,
		name: comp.name,
		visible: comp.visible,
		text: comp.text,
		params: comp.params
	};
	
	return json;
};

Graphics.prototype.Run = function() { this.exec(this); };

Hyperdeck.Components.graphics = Graphics;

})();

