
(function() {

var Office = function(json) {
	
	if (!json)
	{
		json = {};
		json.type = 'office';
		json.name = Griddl.Components.UniqueName('office', 1);
		json.visible = true;
		json.filename = 'office.docx';
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	
	this.files = [];
	this.codemirrors = [];
	
	this.filenameControl = null;
	this._filename = json.filename;
	
	Object.defineProperty(this, 'filename', { 
		get : function() {
			return this._filename;
		},
		set : function(value) {
			this._filename = value;
			this.filenameControl.updateDisplay();
			if (!Griddl.dirty) { Griddl.Components.MarkDirty(); }
		}
	});
};
Office.prototype.add = function() {
	
	this.div.html('');
	
	var gui = new dat.GUI({autoPlace:false});
	this.filenameControl = gui.add(this, 'filename');
	gui.add(this, 'download');
	gui.add(this, 'upload');
	this.div[0].appendChild(gui.domElement);
	
	for (var i = 0; i < this.files.length; i++)
	{
		// really, we should just add Tree components
		
		this.div.append('<span>' + this.files[i].filename + '</span>');
		
		if (this.files[i].elt)
		{
			var textarea = $(document.createElement('textarea'));
			this.div.append(textarea);
			
			var options = {};
			options.mode = 'xml';
			options.smartIndent = false;
			options.lineNumbers = true;
			options.lineWrapping = true;
			
			var codemirror = CodeMirror.fromTextArea(textarea[0], options);
			this.codemirrors.push(codemirror);
			
			codemirror.getDoc().setValue(Griddl.Components.WriteTree(this.files[i].elt));
		}
	}
};
Office.prototype.write = function() {
	
	var json = {};
	json.type = this.type;
	json.name = this.name;
	json.visible = this.visible;
	json.filename = this.filename;
	return json;
};
Office.prototype.upload = function() {
	
	var comp = this;
	
	var fileChooser = $(document.createElement('input'));
	fileChooser.attr('type', 'file');
	
	fileChooser.on('change', function() {
		
		var fileReader = new FileReader();
		
		fileReader.onload = function(event)
		{
			// JSZip.loadAsync(f).then(function(zip) { }); // jszip v3.0
			
			var zip = new JSZip(event.target.result);
			
			for (var filename in zip.files)
			{
				if (!filename.endsWith('/'))
				{
					var file = zip.files[filename];
					var elt = Griddl.Components.ReadXml(file.asText());
					comp.files.push({filename:filename,elt:elt});
				}
			}
			
			comp.add();
		};
		
		if (fileChooser[0].files.length > 0)
		{
			var f = fileChooser[0].files[0];
			comp.filename = f.name;
			fileReader.readAsArrayBuffer(f);
		}
	});
	
	fileChooser.click();
};
Office.prototype.download = function() {
	
	var comp = this;
	
	var a = document.createElement('a');
	
	var zip = new JSZip();
	
	for (var i = 0; i < this.files.length; i++)
	{
		zip.file(this.files[i].filename, Griddl.Components.WriteXml(this.files[i].elt, true));
	}
	
	a.href = 'data:application/zip;base64,' + zip.generate();
	a.download = this.filename;
	a.click();
	
	// version 3.0
	//zip.generateAsync({type:'base64'}).then(function(base64)
	//{
	//	a.href = 'data:application/zip;base64,' + base64;
	//	a.download = comp.filename;
	//	a.click();
	//});
};


var DOCXjs = function() {
	
	var parts = {};

	// Content store
	var textElements = [];

	/* This is the file that sits in the root of the DOCX file, and specifies the mimetypes of the included files */
	var contentTypes = function() {
		var output = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>';
		output += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
		
		// Add defaults
		output += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"> </Default>';
		output += '<Default Extension="xml" ContentType="application/xml"> </Default>'
		
		// Overrides
		var overrides = {
			'/word/numbering.xml': 'wordprocessingml.numbering',
			'/word/styles.xml': 'wordprocessingml.styles',
			'/docProps/app.xml': 'extended-properties',
			'/word/settings.xml': 'wordprocessingml.settings',
			'/word/theme/theme1.xml': 'theme',
			'/word/fontTable.xml': 'fontTable',
			'/word/webSettings.xml': 'webSettings',
			'/docProps/core.xml': 'core-properties',
			'/word/document.xml': 'document.main'
		}
		
		for (var override in overrides) {
			output += '<Override PartName="' + override + '" ContentType="application/vnd.openxmlformats-officedocument.' + overrides[override] + '+xml"></Override>';
		}
		
		output += '</Types>';
		
		return output;
	}
	
	var documentGen = function() {
		
		// Headers 
		var output = '<w:document xmlns:ve="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"><w:body>';
		
		
		// Paragraphs
		
		for (var textElement in textElements) {
			output += '<w:p w:rsidR="001A6335" w:rsidRDefault="00EA68DC" w:rsidP="00EA68DC">';
			output += '<w:r w:rsidRPr="00C703AC">';
			output += '<w:rPr>';
			output += '<w:lang w:val="en-GB_tradnl"/>';
			output += '</w:rPr>';
			output += '<w:t xml:space="preserve">';
			output += textElements[textElement];
			output += '</w:t>';
			output += '</w:r>';
			output += '</w:p>';
			
		}
		
		
		
		// Bottom section
		output += '<w:sectPr w:rsidR="001A6335" w:rsidSect="001A6335">';
		output += '<w:headerReference w:type="even" r:id="rId6"/>';
		output += '<w:headerReference w:type="default" r:id="rId7"/>';
		output += '<w:footerReference w:type="even" r:id="rId8"/>';
		output += '<w:footerReference w:type="default" r:id="rId9"/>';
		output += '<w:headerReference w:type="first" r:id="rId10"/>';
		output += '<w:footerReference w:type="first" r:id="rId11"/>';
		output += '<w:pgSz w:w="12240" w:h="15840"/>';
		output += '<w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/>';
		output += '<w:cols w:space="720"/>';
		output += '<w:docGrid w:linePitch="360"/>';
		output += '</w:sectPr>';
		
		// Close 
		output += '</w:body></w:document>';
		
		return output;
	}
	
	
	var generate = function() {
		// Content types
		
		var files = [
			'[Content_Types].xml',
			'_rels/.rels',
			'docProps/app.xml',
			'docProps/core.xml',
			'word/_rels/document.xml.rels',
			'word/document.xml',
			'word/endnotes.xml',
			'word/fontTable.xml',
			'word/footer1.xml',
			'word/footer2.xml',
			'word/footer3.xml',
			'word/footnotes.xml',
			'word/header1.xml',
			'word/header2.xml',
			'word/header3.xml',
			'word/settings.xml',
			'word/styles.xml',
			'word/webSettings.xml',
			'word/theme/theme1.xml'
		];
		
		var file_data = {};
		
		var file_count = files.length;
		var file_count_current = 0;
		var zip = new JSZip("STORE");
				
		var doOutput = function() {
			outputFile = zip.generate();
			document.location.href = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + outputFile;
		}
		
		for(var file in files) {
			console.log(file);
			if (files[file] == 'word/document.xml') {
				zip.add('word/document.xml', documentGen());
				file_count_current ++;

				if (file_count == file_count_current) {							
					doOutput();
				}
			} else {
				$.ajax({
					url: 'blank/' + files[file],
					complete: function(r) {
						//file_data[this.url.replace(/blank_/, '')] = r.responseText;

						zip.add(this.url.replace('blank/', ''), r.responseText);
						file_count_current ++;

						if (file_count == file_count_current) {							
							doOutput();
						}
					}
				});
			}

		}		
		
		return parts;
		
	}
	
	
	// Add content methods
	
	var addText = function(string) {
		textElements.push(string);
	}
	
	var finalFile = function(parts) {
		var zip = new JSZip();
		for (var part in parts) {
			zip.add(part, parts[part]);
		}
		return zip.generate();
	}
	
	return {
		output: function(type, options) {
			
			var buffer = generate();
			return;
			if(type == undefined) {
				
				return buffer;
			}
			if(type == 'datauri') {
				var outputFile = finalFile(buffer);
				document.location.href = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + outputFile;
			}
		// @TODO: Add different output options
		},
		text: function(string) {
			addText(string);
		}
	};
	
};


var Docx = function(files) {
	
};
Docx.prototype.write = function() {
	
	// [ { filename : null , text : null } ]
};
var Pptx = function(files) {
	
};
Pptx.prototype.write = function() {
	
	
};
var Xlsx = function(files) {
	
};
Xlsx.prototype.write = function() {
	
	
};





// [Content_Types].xml - this is shared between all 3, so we break it out
var ContentTypes = function() {
	
	this.override = []; // { PartName , ContentType }
	this.default = []; // { Extension , ContentType }
};
ContentTypes.prototype.write = function() {
	
};

// the .rels file
var Relationships = function() {
	
	this.relationship = []; // { Id , Type , Target , TargetMode }
};
Relationships.prototype.write = function() {
	
};

Griddl.Components.office = Office;

})();

