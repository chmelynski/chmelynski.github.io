
(function() {

// function is called with fn(ctx, params, assets, projection)

var MapComp = function(json, type, name) {
	
	if (!json)
	{
		json = {
			type: type,
			name: name,
			visible: true,
			text: '',
			params: {
				width: 500,
				height: 300,
				lat: 40,
				lng: -80,
				metersPerPixel: 1000,
				rotation: 0
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
	this.paramsInput = null;
	
	this.text = json.text;
	this.assetCell = json.assetCell;
	this.onShiftClickCell = json.onShiftClickCell;
	this.params = json.params;
	//this.width = json.width;
	//this.height = json.height;
	//this.lat = json.lat;
	//this.lng = json.lng;
	//this.metersPerPixel = json.metersPerPixel;
	//this.rotation = json.rotation;
	
	this.assets = null;
	
	this.onShiftClickFn = null;
	this.paramsInput = null;
	this.projection = null;
	this.inverseProjection = null;
	
	this.ctx = null;
};
MapComp.prototype.add = function() {
	
	var comp = this;
	
	comp.div.html('');
	comp.controlDiv = $('<div class="code-control">').appendTo(comp.div);
	comp.editorDiv = $('<div class="code-editor">').appendTo(comp.div);
	
	comp.refreshControls();
	
	Hyperdeck.AddCodemirror(comp, $('<textarea>').appendTo(comp.editorDiv), 'javascript');
};
MapComp.prototype.refreshControls = function() {
	
	var comp = this;
	
	comp.controlDiv.html('');
	
	$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Run Code" class="btn btn-default btn-sm"><i class="fa fa-play" style="color:green"></i></button>').appendTo(comp.controlDiv).on('click', function() { comp.exec(comp); });
	
	$('<input type="text" placeholder="asset cell"  size="10">').attr('value', comp.assetCell).appendTo(comp.controlDiv).on('change', function() {
		comp.assetCell = this.value;
		comp.refreshAssets();
		comp.exec(comp);
	});
	
	$('<input type="text" placeholder="OnShiftClick(x, y, lng, lat) cell" size="20">').attr('value', comp.onShiftClickCell).appendTo(comp.controlDiv).on('change', function() {
		comp.onShiftClickCell = this.value;
		comp.onShiftClickFn = new Function('x, y, lng, lat', Hyperdeck.Get(this.value));
	});
	
	$('<br>').appendTo(comp.controlDiv);
	
	comp.paramsInput = $('<input type="text" size="80" style="margin:3px">').attr('value', Stringify(comp.params)).appendTo(comp.controlDiv).on('change', function() {
		comp.params = JSON.parse(this.value);
		comp.exec(comp);
	});
};
MapComp.prototype.addOutputElements = function() {
	
	var comp = this;
	
	var canvas = document.createElement('canvas');
	canvas.width = comp.params.width;
	canvas.height = comp.params.height;
	canvas.style.border = '1px solid gray';
	canvas.tabIndex = 1;
	
	comp.ctx = canvas.getContext('2d');
	
	$('<div>').attr('id', comp.name).append(canvas).appendTo('#output');
	
	function OnChange() {
		comp.paramsInput[0].value = Stringify(comp.params);
		comp.exec(comp);
	}
	function OnFinishChange() {
		comp.paramsInput[0].value = Stringify(comp.params);
		SetProjections();
		comp.exec(comp);
	}
	function SetProjections() {
		comp.projection = Mapper.Mercator2(comp.params);
		comp.inverseProjection = Mapper.InverseMercator(comp.params);
		Panzoom(comp.ctx, comp.params, comp.inverseProjection, OnChange, OnFinishChange, function(x, y, lng, lat) { comp.onShiftClickFn(x, y, lng, lat); comp.exec(comp); });
	}
	
	SetProjections();
};
MapComp.prototype.onblur = function() {
	var comp = this;
	//comp.exec(comp);
};
MapComp.prototype.afterLoad = function(callback) {
	var comp = this;
	comp.addOutputElements();
	callback(comp);
};
MapComp.prototype.afterAllLoaded = function() {
	var comp = this;
	
	comp.onShiftClickFn = new Function('x, y, lng, lat', Hyperdeck.Get(comp.onShiftClickCell));
	comp.refreshAssets();
	comp.exec(comp);
};
MapComp.prototype.exec = function(thisArg) {
	
	var comp = this;
	
	var fn = new Function('ctx, params, assets, projection', comp.text);
	fn.call(thisArg, comp.ctx, comp.params, comp.assets, comp.projection);
};
MapComp.prototype.write = function() {
	
	var comp = this;
	
	var json = {
		type: comp.type,
		name: comp.name,
		visible: comp.visible,
		text: comp.text,
		assetCell: comp.assetCell,
		onShiftClickCell: comp.onShiftClickCell,
		params: comp.params
	};
	
	return json;
};
MapComp.prototype.refreshAssets = function() {
	
	var comp = this;
	
	comp.assets = new Map();
	
	var assetmap = Hyperdeck.Get(comp.assetCell);
	
	assetmap.forEach(function(file, key) {
		
		if (key.endsWith('.topojson'))
		{
			var coordPack = Mapper.ExtractTopojsonToPack(file);
			var pixelPack = new DataView(new ArrayBuffer(coordPack.byteLength));
			comp.assets.set(key, [coordPack, pixelPack, file]);
		}
		else if (key.endsWith('.arcpack'))
		{
			var coordPack = new DataView(file);
			var pixelPack = new DataView(new ArrayBuffer(coordPack.byteLength));
			comp.assets.set(key, [coordPack, pixelPack, file]);
		}
		else
		{
			comp.assets.set(key, file);
		}
	});
};

MapComp.prototype.Run = function() { this.exec(this); };

function Stringify(params) {
	return '{ "width": ' + params.width + ', "height": ' + params.height + ', "lat": ' + params.lat.toFixed(3) + ', "lng": ' + params.lng.toFixed(3) + ', "metersPerPixel": ' + params.metersPerPixel.toFixed(0) + ', "rotation": ' + params.rotation.toFixed(3) + ' }';
}

Hyperdeck.Components.map = MapComp;

})();

