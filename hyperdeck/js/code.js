
(function() {

// the <style> or <div> tag is added in addOutputElements() via add(), so that subsequent calls to exec() just sets the inner html
// GetCtx gets or adds a ctx
// if a js function returns an HTMLElement, it becomes the contents of the output div

var Code = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		json.text = '';
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	this.controlDiv = null;
	this.editorDiv = null;
	this.codemirror = null;
	
	this.display = (json.display === undefined) ? 'codemirror' : json.display; // 'codemirror','readonly','summary'
	
	// javascript options
	//this.mode = (json.mode === undefined) ? 'default' : json.mode; // 'default','canvas','htmlgen'
	this.runOnBlur = (json.runOnBlur === undefined) ? false : json.runOnBlur;
	this.runOnLoad = (json.runOnLoad === undefined) ? false : json.runOnLoad;
	
	if (this.type == 'html' || this.type == 'md' || this.type == 'css')
	{
		this.runOnBlur = true;
		this.runOnLoad = true;
	}
	
	this.text = json.text;
	
	// deprecated
	this.errorSpan = null;
	this.fn = null; // this is the function object for js, and plain text otherwise.  we compile in add() rather than here because the errorSpan needs to be in place to display any compilation errors
};
Code.prototype.add = function() {
	
	var comp = this;
	
	comp.div.html('');
	comp.controlDiv = $('<div class="code-control"></div>').appendTo(comp.div);
	comp.editorDiv = $('<div class="code-editor"></div>').appendTo(comp.div);
	
	comp.refreshDatgui();
	
	if (comp.display == 'codemirror')
	{
		var textarea = $('<textarea></textarea>').appendTo(comp.editorDiv);
		
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
		
		options.mode = {html:'xml',css:'css',md:'markdown',js:'javascript'}[comp.type];
		
		comp.codemirror = CodeMirror.fromTextArea(textarea[0], options);
		
		comp.codemirror.on('change', function() {
			comp.markDirty();
		});
		
		comp.codemirror.on('blur', function() {
			comp.text = comp.codemirror.getValue();
			comp.onblur();
		});
		
		comp.codemirror.getDoc().setValue(comp.text);
		
		//comp.errorSpan = $('<span style="color:red"></span>').appendTo(comp.editorDiv);
	}
	else if (comp.display == 'pre' || comp.display == 'readonly')
	{
		$('<pre class="code-display"></pre>').text(comp.text).appendTo(comp.editorDiv);
	}
	else if (comp.display == 'stats' || comp.display == 'summary')
	{
		$('<pre class="code-summary"></pre>').text(comp.text.length + ' chars').appendTo(comp.editorDiv);
	}
	else
	{
		throw new Error();
	}
};
Code.prototype.refreshDatgui = function() {
	
	var comp = this;
	
	if (comp.type == 'js')
	{
		comp.controlDiv.html('');
		$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Run Code" class="btn btn-default btn-sm"><i class="fa fa-play" style="color:green"></i></button>')
			.appendTo(comp.controlDiv).on('click', function() { comp.exec(comp); });
		
		//$('<span>Mode:</span>').appendTo(comp.controlDiv);
		//$('<select>' + 
		//  '<option' + ((comp.mode == 'default') ? ' selected' : '') + '>default</option>' + 
		//  '<option' + ((comp.mode == 'canvas') ? ' selected' : '') + '>canvas</option>' + 
		//  '<option' + ((comp.mode == 'htmlgen') ? ' selected' : '') + '>htmlgen</option></select>')
		//	.appendTo(comp.controlDiv).on('change', function() { comp.mode = this.value; comp.markDirty(); });
		
		$('<span>View:</span>').appendTo(comp.controlDiv);
		$('<select>' + 
		  '<option' + ((comp.display == 'codemirror') ? ' selected' : '') + '>codemirror</option>' + 
		  '<option' + ((comp.display == 'readonly') ? ' selected' : '') + '>readonly</option>' + 
		  '<option' + ((comp.display == 'summary') ? ' selected' : '') + '>summary</option></select>')
			.appendTo(comp.controlDiv).on('change', function() { comp.display = this.value; comp.markDirty(); comp.add(); });
		
		$('<span>Run on: blur</span>').appendTo(comp.controlDiv);
		$('<input type="checkbox"' + (comp.runOnBlur ? ' checked' : '') + '></input>').appendTo(comp.controlDiv)
			.on('change', function() { comp.runOnBlur = this.checked; comp.markDirty(); });
		
		$('<span>load</span>').appendTo(comp.controlDiv);
		$('<input type="checkbox"' + (comp.runOnLoad ? ' checked' : '') + '></input>').appendTo(comp.controlDiv)
			.on('change', function() { comp.runOnLoad = this.checked; comp.markDirty(); });
		
		$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Download" data-original-title="Download" class="btn btn-default btn-sm"><i class="fa fa-download"></i></button>')
			.appendTo(comp.controlDiv).on('click', function() { comp.Download(); }).tooltip();
		$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Upload" data-original-title="Upload" class="btn btn-default btn-sm"><i class="fa fa-upload"></i></button>')
			.appendTo(comp.controlDiv).on('click', function() { comp.Upload(); }).tooltip();
		
		//var gui = new dat.GUI({autoPlace:false, width:"100%"});
		//gui.add(comp, 'mode', ['default','canvas','htmlgen']).onChange(function(value) { comp.markDirty(); });
		//var displayControl = gui.add(comp, 'display', ['codemirror','readonly','summary']);
		//displayControl.onChange(function(value) { comp.markDirty(); comp.add(); });
		//gui.add(comp, 'runOnBlur').onChange(function(value) { comp.markDirty(); });
		//gui.add(comp, 'runOnLoad').onChange(function(value) { comp.markDirty(); });
		//comp.controlDiv.append($(gui.domElement));
	}
	else
	{
		comp.controlDiv.html('');
		
		$('<span>View:</span>').appendTo(comp.controlDiv);
		$('<select style="margin-right:0.5em">' + 
		  '<option' + ((comp.display == 'codemirror') ? ' selected' : '') + '>codemirror</option>' + 
		  '<option' + ((comp.display == 'readonly') ? ' selected' : '') + '>readonly</option>' + 
		  '<option' + ((comp.display == 'summary') ? ' selected' : '') + '>summary</option></select>')
			.appendTo(comp.controlDiv).on('change', function() { comp.display = this.value; comp.markDirty(); comp.add(); });
		
		$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Download" data-original-title="Download" class="btn btn-default btn-sm"><i class="fa fa-download"></i></button>')
			.appendTo(comp.controlDiv).on('click', function() { comp.Download(); }).tooltip();
		$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Upload" data-original-title="Upload" class="btn btn-default btn-sm"><i class="fa fa-upload"></i></button>')
			.appendTo(comp.controlDiv).on('click', function() { comp.Upload(); }).tooltip();
		
		//comp.controlDiv.html('');
		//var gui = new dat.GUI({autoPlace:false, width:"100%"});
		//var displayControl = gui.add(comp, 'display', ['codemirror','readonly','summary']);
		//displayControl.onChange(function(value) { comp.markDirty(); comp.add(); });
		//gui.add(comp, 'Upload');
		//gui.add(comp, 'Download');
		//comp.controlDiv.append($(gui.domElement));
	}
};
Code.prototype.addOutputElements = function() {
	
	// i think this is called from add() - should it be called from afterLoad() instead?
	
	var comp = this;
	
	var tagname = {html:'div',css:'style',md:'div',js:'div'}[comp.type];
	
	if (tagname)
	{
		var elt = $('<' + tagname + ' id="' + comp.name + '"></' + tagname + '>');
		$('#output').append(elt);
	}
};
Code.prototype.onblur = function() {
	var comp = this;
	if (comp.runOnBlur) { comp.exec(comp); }
};
Code.prototype.afterLoad = function(callback) {
	var comp = this;
	comp.addOutputElements();
	callback(comp);
};
Code.prototype.afterAllLoaded = function() {
	var comp = this;
	if (comp.runOnLoad) { comp.exec(comp); }
};
Code.prototype.exec = function(thisArg) {
	
	var comp = this;
	
	if (comp.type == 'css')
	{
		$('#' + comp.name).html(comp.text);
	}
	else if (comp.type == 'html' || comp.type == 'md')
	{
		var html = (comp.type == 'md') ? markdown.toHTML(comp.text) : comp.text;
		$('#' + comp.name).html(html);
		//if (MathJax) { MathJax.Hub.Typeset(comp.name); }
	}
	else if (comp.type == 'js')
	{
		var fn = new Function(comp.text);
		var result = fn.call(thisArg);
		
		if (result instanceof HTMLElement)
		{
			$('#' + comp.name).html('')[0].appendChild(result);
		}
		
		return result;
		
		//if (comp.mode == 'default')
		//{
		//	var fn = new Function(comp.text);
		//	var result = fn.call(thisArg);
		//	return result;
		//}
		//else if (comp.mode == 'canvas')
		//{
		//	var canvas = document.createElement('canvas');
		//	var ctx = canvas.getContext('2d');
		//	$('#' + comp.name).html('')[0].appendChild(canvas);
		//	var fn = new Function('ctx', comp.text);
		//	fn.call(ctx, ctx); // so that both ctx and this refer to the drawing context
		//}
		//else if (comp.mode == 'htmlgen')
		//{
		//	var fn = new Function(comp.text);
		//	var result = fn.call(thisArg);
		//	$('#' + comp.name).html(result);
		//}
		//else
		//{
		//	throw new Error();
		//}
	}
	else
	{
		throw new Error("'" + comp.name + "' is not an executable object");
	}
};
Code.prototype.displayError = function(e) {
	
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
	
	if (evalLine == null)
	{
		comp.errorSpan.text(e);
	}
	else
	{
		var fnLineCol = evalLine.split(',')[1]; // ' <anonymous>:7:1)'
		var fnLineColArray = fnLineCol.substring(1, fnLineCol.length - 1).split(':'); // [ '<anonymous' , '7' , '1' ]
		var functionName = fnLineColArray[0];
		var lineNumber = fnLineColArray[1] - 2; // not sure why the line number is 2 off
		var colNumber = fnLineColArray[2];
		comp.errorSpan.text('Error: ' + e.message + ' (at line ' + lineNumber + ', column ' + colNumber + ')');
	}
};
Code.prototype.write = function() {
	
	var comp = this;
	
	var json = {};
	json.type = comp.type;
	json.name = comp.name;
	json.visible = comp.visible;
	json.text = comp.text;
	json.display = comp.display;
	json.mode = comp.mode;
	json.runOnBlur = comp.runOnBlur;
	json.runOnLoad = comp.runOnLoad;
	return json;
};

Code.prototype.Run = function() { this.exec(this); };
Code.prototype.Upload = function() {
	
	var comp = this;
	
	$('<input type="file"><input>').on('change', function() {
		
		var fileReader = new FileReader();
		
		fileReader.onload = function(event)
		{
			comp.text = event.target.result;
			comp.add();
		};
		
		if (this.files.length > 0)
		{
			var f = this.files[0];
			fileReader.readAsText(f); // assume utf-8 i guess
		}
	}).click();
};
Code.prototype.Download = function() {
	
	var comp = this;
	
	var filename = comp.name + '.' + comp.type;
	var text = comp.text;
	
	var reader = new FileReader();
	reader.readAsDataURL(new Blob([text], {type:'text/plain'})); 
	reader.onloadend = function() {
		var a = document.createElement('a');
		a.href = reader.result;
		a.download = filename;
		a.click();
	};
};
Code.prototype.GetCtx = function() {
	
	var comp = this;
	
	var canvases = $('#' + comp.name + ' canvas');
	
	if (canvases.length > 0)
	{
		var ctx = canvases[0].getContext('2d');
		return ctx;
	}
	else
	{
		var canvas = document.createElement('canvas');
		$('#' + comp.name).html('')[0].appendChild(canvas);
		var ctx = canvas.getContext('2d');
		return ctx;
	}
};

Code.prototype.get = function(options) {
	
	var comp = this;
	
	return comp.text;
};
Code.prototype.set = function(text, options) {
	
	var comp = this;
	
	comp.text = text;
	comp.markDirty();
	comp.codemirror.getDoc().setValue(comp.text);
	comp.onblur();
};

Hyperdeck.Components.txt = Code;
Hyperdeck.Components.js = Code;
Hyperdeck.Components.html = Code;
Hyperdeck.Components.css = Code;
Hyperdeck.Components.md = Code;

})();

