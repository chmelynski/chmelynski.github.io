
(function() {

var File = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		
		if (type == 'binary')
		{
			json.data = 'data:text/plain;base64,';
			//json.filename = json.name;
		}
		else if (type == 'image')
		{
			json.data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAERJREFUOE9j3LJlCwMMeHt7w9lbt24lKM4A1AwH/5EAMeIDqJlUpyKrZxiimomJElxeG8CoosjZQzSqKHI2RQE2NDUDAEVWy5NpqgO1AAAAAElFTkSuQmCC';
			//json.filename = json.name + '.png';
		}
		else if (type == 'zip')
		{
			json.data = 'data:text/plain;base64,UEsDBAoAAAAAAHd+2EgAAAAAAAAAAAAAAAAHAAAAZm9vLnR4dFBLAQI/AAoAAAAAAHd+2EgAAAAAAAAAAAAAAAAHACQAAAAAAAAAIAAAAAAAAABmb28udHh0CgAgAAAAAAABABgAACFS1lHO0QEAIVLWUc7RAdqZSNZRztEBUEsFBgAAAAABAAEAWQAAACUAAAAAAA==';
			//json.filename = json.name + '.zip';
		}
		else
		{
			throw new Error();
		}
	}
	
	this._type = json.type; // image, binary, zip
	this._name = json.name;
	this._visible = json.visible;
	
	this._div = null;
	this._span = null;
	
	this._uint8array = null;
	
	this._img = null; // for image only - the HTMLImageElement
	this._imagetype = null; // for image only - 'png', 'jpg', etc.
	this._files = null; // for zipfile only - { filename  : String , uint8array : Uint8Array , size : String }
	
	DataUrlToUint8Array(this, json.data);
	
	// don't need these after getting rid of dat.gui
	Object.defineProperty(this, 'upload', { get : function() { return this._upload; } });
	Object.defineProperty(this, 'download', { get : function() { return this._download; } });
};
File.prototype._add = function() {
	
	var comp = this;
	
	comp._div.html('');
	
	//var gui = new dat.GUI({autoPlace:false, width:"100%"});
	//gui.add(comp, 'upload');
	//gui.add(comp, 'download');
	//comp._div[0].appendChild(gui.domElement);
	
	var controlsDiv = $('<div class="file-control"></div>').appendTo(comp._div);
	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Download" data-original-title="Download" class="btn btn-default btn-sm"><i class="fa fa-download"></i></button>')
		.appendTo(controlsDiv).on('click', function() { comp._download(); }).tooltip();
	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="Upload" data-original-title="Upload" class="btn btn-default btn-sm"><i class="fa fa-upload"></i></button>')
		.appendTo(controlsDiv).on('click', function() { comp._upload(); }).tooltip();
	
	if (comp._type == 'binary')
	{
		comp._span = $('<span style="margin:1em"></span>');
		comp._span.text(comp._uint8array.length.toString() + ' bytes'); // or we could do a hexdump or something
		comp._div.append(comp._span);
	}
	else if (comp._type == 'image')
	{
		var blob = new Blob([comp._uint8array], {type: 'image/' + comp._imagetype});
		
		var reader = new FileReader();
		
		reader.onloadend = function() {
			
			var b64 = reader.result;
			
			var imgdiv = $('<div style="margin:1em;overflow:auto"></div>');
			var imageElement = $('<img src="' + b64 + '"></img>').appendTo(imgdiv);
			comp._img = imageElement;
			
			var urlDiv = $('<div style="margin:1em"></div>')
			urlDiv.text(URL.createObjectURL(blob));
			
			var dimensionDiv = $('<div style="margin:1em"></div>')
			dimensionDiv.text(imageElement[0].width + ' x ' + imageElement[0].height);
			
			comp._div.append(urlDiv);
			comp._div.append(dimensionDiv);
			comp._div.append(imgdiv);
		};
		
		reader.readAsDataURL(blob);
	}
	else if (comp._type == 'zip')
	{
		var zip = new JSZip(comp._uint8array.buffer);
		
		comp._files = []; // Proxy this
		
		for (var filename in zip.files)
		{
			if (!filename.endsWith('/'))
			{
				var file = zip.files[filename];
				//file.asArrayBuffer() => ArrayBuffer
				//file.asBinary() => String
				//file.asText() => String
				//file.asUint8Array() => Uint8Array
				
				var fileobj = {}; // Proxy this
				fileobj.filename = filename;
				fileobj.size = file._data.uncompressedSize.toString();
				fileobj.file = file;
				fileobj.text = null;
				fileobj.uint8array = null;
				
				fileobj.upload = function() {
					
					var fileChooser = $(document.createElement('input'));
					fileChooser.attr('type', 'file');
					
					fileChooser.on('change', function() {
						
						var fileReader = new FileReader();
						
						fileReader.onload = function(event)
						{
							var uint8array = new Uint8Array(event.target.result);
							fileobj.file = zip.file(fileobj.filename, uint8array); // or just add a uint8array to the fileobj
							fileobj.size = uint8array.length.toString();
							// refresh tablegui, somehow
						};
						
						if (fileChooser[0].files.length > 0)
						{
							var f = fileChooser[0].files[0];
							fileobj.filename = f.name;
							fileReader.readAsArrayBuffer(f);
						}
					});
					
					fileChooser.click();
				};
				fileobj.download = function() {
					
					var filename = null;
					
					if (this.filename.endsWith('.js'))
					{
						filename = this.filename.substring(0, this.filename.length - 3) + '.txt'; // chrome blocks downloading of js files
					}
					else
					{
						filename = this.filename;
					}
					
					var reader = new FileReader();
					reader.readAsDataURL(new Blob([this.file.asUint8Array()], {type:'text/plain'})); 
					reader.onloadend = function() {
						var a = document.createElement('a');
						a.href = reader.result;
						a.download = filename;
						a.click();
					};
				};
				
				comp._files.push(fileobj);
			}
		}
		
		comp._div.append($('<button>Upload File</button>').on('click', function() {
			
			var fileInput = document.createElement('input');
			fileInput.type = 'file';
			
			fileInput.onchange = function() {
				
				if (fileInput.files.length > 0)
				{
					var f = fileInput.files[0];
					
					var fileobj = {}; // Proxy?
					fileobj.filename = f.name;
					
					var fileReader = new FileReader();
					
					fileReader.onload = function(event)
					{
						fileobj.uint8array = new Uint8Array(event.target.result);
						fileobj.size = fileobj.uint8array.length.toString();
						comp._files.push(fileobj); // refresh tablegui, somehow
					};
					
					fileReader.readAsArrayBuffer(f);
				}
			};
			
			fileInput.click();
		}));
		
		var tablegui = new TableGui(comp._files);
		//tablegui.add('upload', 'button', {header:''});
		tablegui.add('download', 'button', {header:''});
		tablegui.add('filename', 'text', {size:30});
		tablegui.add('size', 'label');
		comp._div[0].appendChild(tablegui.table);
	}
	else
	{
		throw new Error();
	}
};
File.prototype._write = function() {
	
	var comp = this;
	
	var json = {};
	json.type = comp._type;
	json.name = comp._name;
	json.visible = comp._visible;
	json.data = Uint8ArrayToDataUrl(comp);
	return json;
};
File.prototype._upload = function() {
	
	var comp = this;
	
	var fileInput = document.createElement('input');
	fileInput.type = 'file';
	
	fileInput.onchange = function() {
		
		var fileReader = new FileReader();
		
		fileReader.onload = function(event)
		{
			comp._uint8array = new Uint8Array(event.target.result);
			comp._add();
		};
		
		if (fileInput.files.length > 0)
		{
			var f = fileInput.files[0];
			
			if (comp._type == 'image')
			{
				comp._imagetype = f.name.substr(f.name.lastIndexOf('.')+1);
			}
			
			comp._markDirty();
			
			fileReader.readAsArrayBuffer(f);
		}
	};
	
	fileInput.click();
};
File.prototype._download = function() {
	
	var comp = this;
	
	var a = document.createElement('a');
	a.href = Uint8ArrayToDataUrl(comp);
	
	var ext = '';
	
	if (comp._type == 'image')
	{
		ext = '.' + comp._imagetype;
	}
	else if (comp._type == 'zip')
	{
		ext = '.zip';
	}
	
	a.download = comp._name + ext;
	a.click();
};

File.prototype._get = function(options) {
	
	var comp = this;
	
	var result = null;
	
	if (options && options.format)
	{
		if (options.format == 'base64')
		{
			result = Uint8ArrayToDataUrl(comp);
		}
		else if (options.format == 'uint8array')
		{
			result = comp._uint8array;
		}
		else
		{
			throw new Error('Unsupported format: "' + options.format + '".  Supported formats are "base64" or "uint8array".');
		}
	}
	else
	{
		if (comp._type == 'image')
		{
			result = comp._img;
		}
		else
		{
			result = comp._uint8array;
		}
	}
	
	return result;
};
File.prototype._set = function(data, options) {
	
	var comp = this;
	
	if (options && options.format)
	{
		if (options.format == 'base64')
		{
			DataUrlToUint8Array(comp);
		}
		else if (options.format == 'uint8array')
		{
			comp._uint8array = data; // but then how do we infer imagetype?
		}
		else
		{
			throw new Error('Unsupported format: "' + options.format + '".  Supported formats are "base64" or "uint8array".');
		}
	}
	else
	{
		comp._uint8array = data; // but then how do we infer imagetype?
	}
	
	comp._add();
	comp._markDirty();
};

function Uint8ArrayToDataUrl(comp) {
	
	var prefix = null;
	
	if (comp._type == 'image')
	{
		prefix = 'data:image/' + comp._imagetype + ';base64,';
	}
	else if (comp._type == 'binary' || comp._type == 'zip')
	{
		prefix = 'data:application/' + comp._type + ';base64,';
	}
	else
	{
		throw new Error();
	}
	
	var base64 = null;
	
	if (comp._type == 'zip')
	{
		var zip = new JSZip();
		
		for (var i = 0; i < comp._files.length; i++)
		{
			var fileobj = comp._files[i];
			var uint8array = fileobj.uint8array ? fileobj.uint8array : fileobj.file.asUint8Array();
			zip.file(fileobj.filename, uint8array);
		}
		
		base64 = zip.generate();
	}
	else
	{
		base64 = Uint8ArrayToBase64String(comp._uint8array); // we can't use a FileReader here because the return must be synchronous
	}
	
	return prefix + base64;
}
function DataUrlToUint8Array(comp, dataUrl) {
	
	var comma = dataUrl.indexOf(','); // data:text/plain;base64,
	var prefix = dataUrl.substr(0, comma+1);
	var base64 = dataUrl.substr(comma+1);
	comp._uint8array = Base64StringToUint8Array(base64);
	
	if (comp._type == 'image')
	{
		var slash = prefix.indexOf('/');
		var semicolon = prefix.indexOf(';');
		comp._imagetype = prefix.substring(slash+1, semicolon);
	}
}

function Base64StringToUint8Array(str) {
	
	function b64ToUint6(n) { return n>64&&n<91?n-65:n>96&&n<123?n-71:n>47&&n<58?n+4:n===43?62:n===47?63:0;}
	
	var nBlocksSize = 3;
	var sB64Enc = str.replace(/[^A-Za-z0-9\+\/]/g, ""); // remove all non-eligible characters from the string
	var nInLen = sB64Enc.length;
	var nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2;
	var taBytes = new Uint8Array(nOutLen);
	
	for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++)
	{
		nMod4 = nInIdx & 3;
		nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
		
		if (nMod4 === 3 || nInLen - nInIdx === 1)
		{
			for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++)
			{
				taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
			}
			
			nUint24 = 0;
		}
	}
	
	return taBytes;
}
function Uint8ArrayToBase64String(uint8array) {
	var nMod3 = '';
	var sB64Enc = '';
	
	function uint6ToB64(n) { return n<26?n+65:n<52?n+71:n<62?n-4:n===62?43:n===63?47:65;}
	
	for (var nLen = uint8array.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++)
	{
		nMod3 = nIdx % 3;
		//if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
		nUint24 |= uint8array[nIdx] << (16 >>> nMod3 & 24);
		
		if (nMod3 === 2 || uint8array.length - nIdx === 1)
		{
			var a = uint6ToB64(nUint24 >>> 18 & 63);
			var b = uint6ToB64(nUint24 >>> 12 & 63);
			var c = uint6ToB64(nUint24 >>>  6 & 63);
			var d = uint6ToB64(nUint24 >>>  0 & 63);
			sB64Enc += String.fromCharCode(a, b, c, d);
			nUint24 = 0;
		}
	}
	
	return sB64Enc.replace(/A(?=A$|$)/g, "=");
}

function dataURItoBlob(dataURI) {
	
	// this is an alternate conversion that uses bytestrings
	var byteString = atob(dataURI.split(',')[1]);
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
	var buffer = new ArrayBuffer(byteString.length);
	var uint8array = new Uint8Array(buffer);
	for (var i = 0; i < byteString.length; i++) { uint8array[i] = byteString.charCodeAt(i); }
	var blob = new Blob([buffer], {type: mimeString});
	return blob;
}

Hyperdeck.Components.binary = File;
Hyperdeck.Components.image = File;
Hyperdeck.Components.zip = File;

})();

