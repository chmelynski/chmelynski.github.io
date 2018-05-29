
(function() {

var Libraries = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		json.data = {};
		json.data.urls = [''];
		//json.data.files = []; // { filename : string , text : string }
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	this.outputDiv = null;
	
	this.data = json.data;
	
	this.sentinel = null;
	
	// https://cdnjs.cloudflare.com/ajax/libs/three.js/r77/three.min.js
	// https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js
	// https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.1.4/Chart.min.js
	// https://cdnjs.cloudflare.com/ajax/libs/numeric/1.2.6/numeric.min.js
};
Libraries.prototype.add = function() { };
Libraries.prototype.afterLoad = function(callback) {
	
	var comp = this;
	
	comp.outputDiv = $('<div id="' + comp.name + '"></div>').appendTo($('#output'));
	
	comp.sentinel = new LinkedList(); // holds row objects: { div, url, icon }
	
	var rows = $('<div></div>').appendTo(comp.div);

	function AppendRow(url) {
		
		comp.markDirty();
		
		var row = { div: null, url: url, icon: null };
		var rowElt = comp.sentinel.add(row);
		
		var rowDiv = $('<div style="margin:0.2em"></div>').appendTo(rows);
		
		$('<button class="btn btn-default btn-sm"><i class="fa fa-lg fa-trash-o"></i></button>').appendTo(rowDiv).on('click', function() {
			comp.markDirty();
			rowElt.remove();
			rowDiv.remove();
		});
		
		$('<input class="input-sm" style="width:80%;margin:0.2em" value="'+url+'"></input>').appendTo(rowDiv).on('change', function() {
			comp.markDirty();
			icon.removeClass('fa-check').removeClass('fa-times').addClass('fa-hourglass').css('color', 'orange');
			//script.attr('src', url); // this triggers on load
			row.url = this.value;

			$.getScript(url).done(function(script, textStatus) {
				icon.removeClass('fa-hourglass').addClass('fa-check').css('color', 'green');
			}).fail(function(jqxhr, settings, exception) {
				icon.removeClass('fa-hourglass').addClass('fa-times').css('color', 'red');
				console.log('Error: "' + url + '" failed to load');
			})
		});
		
		var icon = $('<span class="fa fa-hourglass" style="color:orange"></span>').appendTo(rowDiv);
		
		row.div = rowDiv;
		row.icon = icon;
	}
	
	function LoadScript(rowElt) {
		
		if (rowElt == comp.sentinel) { callback(comp); return; }
		
		var row = rowElt.data;
		var url = row.url;
		var icon = row.icon;
		
		if (url.length == 0)
		{
			LoadScript(rowElt.next);
		}
		else
		{
			$.getScript(url).done(function(script, textStatus) {
				icon.removeClass('fa-hourglass').addClass('fa-check').css('color', 'green');
			}).fail(function(jqxhr, settings, exception) {
				icon.removeClass('fa-hourglass').addClass('fa-times').css('color', 'red');
				console.log('Error: "' + url + '" failed to load');
			}).always(function() {
				LoadScript(rowElt.next);
			});
		}
	}
	
	for (var i = 0; i < comp.data.urls.length; i++)
	{
		AppendRow(comp.data.urls[i]);
	}
	
	var plusButtonDiv = $('<div style="margin:0.2em"></div>').appendTo(comp.div);
	$('<button class="btn btn-default btn-sm"><i class="fa fa-plus"></i></button>').appendTo(plusButtonDiv)
		.on('click', function() { AppendRow(''); });
	
	LoadScript(comp.sentinel.next);
	
	//for (var key in comp.data.files) { comp.doAddFile(comp.data.files[key], key); }
	//for (var key in comp.data.files) { comp.outputDiv.append($('<script></script>').text(comp.data.files[key])); }
};
Libraries.prototype.write = function() {
	
	var comp = this;
	
	var json = {};
	json.type = comp.type;
	json.name = comp.name;
	json.visible = comp.visible;
	json.data = {};
	json.data.urls = comp.sentinel.enumerate().map(function(row) { return row.url; });
	return json;
};

// this stuff to be put on ice until urls work
Libraries.prototype.addFile = function() {
	
	var comp = this;
	
	var filename = null;
	
	var fileChooser = $('<input type="file"><input>').on('change', function() {
		
		var fileReader = new FileReader();
		
		fileReader.onload = function(event)
		{
			var text = event.target.result;
			//var id = Hyperdeck.Components.UniqueElementId();
			//comp.doAddFile(text, filename, id);
			comp.outputDiv.append($('<script></script>').text(text));
		};
		
		if (this.files.length > 0)
		{
			var f = this.files[0];
			filename = f.name; // scrub filename of non-alphanum characters?
			fileReader.readAsText(f);
		}
	}).click();
};
Libraries.prototype.doAddFile = function(text, filename, id) {
	
	var comp = this;
	
	comp.data.files[filename] = text;
	
	var folder = comp.fileFolder.addFolder(filename);
	
	var fnobj = {};
	fnobj.download = function() { 
		var a = document.createElement('a');
		a.href = window.URL.createObjectURL(new Blob([text], {type : 'text/plain'}));
		a.download = filename;
		a.click();
	};
	fnobj.delete = function() {
		delete comp.data.files[filename];
		$('#' + id).remove();
		
		comp.add(); // this destroys id info which was generated when the script tag was created and is stored here as a closure
		// but for now, just remove the buttons
		//this.downloadButton.remove();
		//this.deleteButton.remove();
	};
	
	fnobj.downloadButton = folder.add(fnobj, 'download');
	fnobj.deleteButton = folder.add(fnobj, 'delete');
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

Hyperdeck.Components.libraries = Libraries;

})();

