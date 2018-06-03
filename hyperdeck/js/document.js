(function() {

var Doc = function(json, type, name) {
	
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
	
	this.text = json.text;
};
Doc.prototype.add = function() {
	
	var comp = this;
	
	comp.div.html('');
	comp.controlDiv = $('<div class="code-control">').appendTo(comp.div);
	comp.editorDiv = $('<div class="code-editor">').appendTo(comp.div);
	
	comp.refreshControls();
	
	var textarea = $('<textarea>').appendTo(comp.editorDiv);
	
	Hyperdeck.AddCodemirror(comp, textarea, 'plain');
};
Doc.prototype.refreshControls = function() {
	
	var comp = this;
	
	var div = comp.controlDiv[0];
	
	comp.controlDiv.html('');
	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Run Code" class="btn btn-default btn-sm"><i class="fa fa-play" style="color:green"></i></button>').appendTo(comp.controlDiv).on('click', function() { comp.exec(comp); });
};
Doc.prototype.addOutputElements = function() {
	
};
Doc.prototype.onblur = function() {

};
Doc.prototype.afterLoad = function(callback) {
	var comp = this;
	comp.addOutputElements();
	callback(comp);
};
Doc.prototype.afterAllLoaded = function() {

};
Doc.prototype.exec = function(thisArg) {
	
	var comp = this;
	
	var width = 8.5 * 72;
	var height = 11 * 72;
	
	var commands = comp.text.split('\n').map(x => x.trim());
	
	var pdf = new PDF(width, height);
	pdf.commands = commands;
	PDF.fontNameToIndex = { "Times-Roman" : 1 , "Helvetica" : 2 }
	PDF.fontNameToUint8Array = {};
	pdf.imageDict = {};
  
  var nextFontIndex = 3;
  
  commands.forEach(function(cmd) {
    
    if (cmd.startsWith('%%'))
    {
      var parts = cmd.split(' ');
      
      if (parts[0] == '%%Font') // %%Font F0 assets1/dir/arial.otf
      {
        var fontName = parts[1];
        var path = parts[2];
        var slashIndex = path.indexOf('/');
        var assetCompName = path.substr(0, slashIndex);
        var key = path.substr(slashIndex+1);
        var asset = Hyperdeck.Get(assetCompName).get(key);
        
        // make font object, font data object
	PDF.fontNameToIndex[fontName] = nextFontIndex++;
	PDF.fontNameToUint8Array[fontName] = new Uint8Array(asset);
      }
      else if (parts[0] == '%%Image') // %%Image Im1 assets1/dir/foo.png
      {
        var imageName = parts[1];
        var path = parts[2];
        var slashIndex = path.indexOf('/');
        var assetCompName = path.substr(0, slashIndex);
        var key = path.substr(slashIndex+1);
        var asset = Hyperdeck.Get(assetCompName).get(key);
        
        pdf.imageDict[imageName] = ConvertImageToPdf(asset); // is asset in the right form?
      }
    }
  });
	
	$('#output').html('').append($('<pre>').text(PDF.Export([pdf])));
};
Doc.prototype.write = function() {
	
	var comp = this;
	
	return {
		type: comp.type,
		name: comp.name,
		visible: comp.visible,
		text: comp.text
	};
};
Doc.prototype.set = function(text, options) {
	
	var comp = this;
	
	comp.text = text;
	comp.markDirty();
	comp.codemirror.getDoc().setValue(comp.text);
	comp.onblur();
};

Doc.prototype.Run = function() { this.exec(this); };

Hyperdeck.Components.document = Doc;

})();
