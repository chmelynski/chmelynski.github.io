
(function() {

// function is called with fn(ctx, params, assets, projection)

var MapComp = function(json, type, name) {
	
	if (!json)
	{
		json = {
			type: type,
			name: name,
			visible: true,
			text: `
// Click+Drag       - pan
// Wheel            - zoom
// Ctrl+Click+Drag  - rotate map around center
// Shift+Click      - handled by this.onshiftclick = function(x, y, lng, lat)
// the projection is the equirectangular with standard parallel determined by the map center
// TODO: add support for other projections
ctx.strokeStyle = 'black'; // ctx is a CanvasRenderingContext2D
// this.geojson/topojson(geojson/topojson) => GeoAsset
// this.stroke(GeoAsset) -> strokes lines
this.stroke(this.topojson(Hyperdeck.Components.map.defaultGeojson));
`,
			params: {
				width: 600,
				height: 400,
				lat: 40,
				lng: -100,
				metersPerPixel: 10000,
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
	this.onshiftclick = null;
	this.params = json.params;
	//this.width = json.width;
	//this.height = json.height;
	//this.lat = json.lat;
	//this.lng = json.lng;
	//this.metersPerPixel = json.metersPerPixel;
	//this.rotation = json.rotation;
	
	this.packs = []; // [ { pixel: Geopack, coord: Geopack, geo: Geojson|Topojson|Geopack } ]
	
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
	
	//$('<button type="button" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Run Code" class="btn btn-default btn-sm"><i class="fa fa-play" style="color:green"></i></button>').appendTo(comp.controlDiv).on('click', function() { comp.exec(comp); });
	
	//$('<input type="text" placeholder="asset cell"  size="10">').attr('value', comp.assetCell).appendTo(comp.controlDiv).on('change', function() {
	//	comp.assetCell = this.value;
	//	comp.refreshAssets();
	//	comp.exec(comp);
	//});
	//
	//$('<input type="text" title="name of a code cell that defines the body of a function(x, y, lng, lat) that is called on Shift+Click" placeholder="OnShiftClick(x, y, lng, lat) cell" size="20">').attr('value', comp.onShiftClickCell).appendTo(comp.controlDiv).on('change', function() {
	//	comp.onShiftClickCell = this.value;
	//	comp.onShiftClickFn = new Function('x, y, lng, lat', Hyperdeck.Get(this.value));
	//});
	
	//$('<br>').appendTo(comp.controlDiv);
	
	comp.paramsInput = $('<input type="text" title="this object is available as `params` in the body code, and is updated as you pan/zoom/rotate the map" size="80" style="margin:3px">').attr('value', Stringify(comp.params)).appendTo(comp.controlDiv).on('change', function() {
		const newParams = JSON.parse(this.value);
		if (newParams.width !== comp.params.width || newParams.height !== comp.params.height)
		{
			comp.ctx.canvas.width = newParams.width;
			comp.ctx.canvas.height = newParams.height;
		}
		comp.params = newParams;
		comp.setProjections();
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
	
	comp.setProjections();
};
MapComp.prototype.setProjections = function() {
	var comp = this;
	
	function OnChange() {
		comp.paramsInput[0].value = Stringify(comp.params);
		comp.exec(comp);
	}
	function OnFinishChange() {
		comp.paramsInput[0].value = Stringify(comp.params);
		comp.setProjections();
		comp.exec(comp);
	}
	function OnShiftClick(x, y, lng, lat) {
		comp.onshiftclick(x, y, lng, lat);
		comp.exec(comp);
	}
	
	comp.projection = Mapper.Mercator2(comp.params);
	comp.inverseProjection = Mapper.InverseMercator(comp.params);
	Panzoom(comp.ctx, comp.params, comp.inverseProjection, OnChange, OnFinishChange, OnShiftClick);
};
MapComp.prototype.onblur = function() {
	var comp = this;
	comp.exec(comp);
};
MapComp.prototype.afterLoad = function(callback) {
	var comp = this;
	comp.addOutputElements();
	callback(comp);
};
MapComp.prototype.afterAllLoaded = function() {
	var comp = this;
	
	//comp.onShiftClickFn = new Function('x, y, lng, lat', Hyperdeck.Get(comp.onShiftClickCell));
	//comp.refreshAssets();
	comp.exec(comp);
};
MapComp.prototype.exec = function() {
	
	var comp = this;
	
	const enchancedText = `ctx.fillStyle = 'white';\nctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);\nctx.lineJoin = 'center';\n\n` + comp.text;
	
	//var fn = new Function('ctx, params, assets, projection', comp.text);
	//fn.call(comp, comp.ctx, comp.params, comp.assets, comp.projection);
	var fn = new Function('ctx, params', enchancedText);
	fn.call(comp, comp.ctx, comp.params);
};
MapComp.prototype.write = function() {
	
	var comp = this;
	
	var json = {
		type: comp.type,
		name: comp.name,
		visible: comp.visible,
		text: comp.text,
		//assetCell: comp.assetCell,
		//onShiftClickCell: comp.onShiftClickCell,
		params: comp.params
	};
	
	return json;
};
MapComp.prototype.arcpack = function(geo) { return this.asset(geo, 'arcpack'); };
MapComp.prototype.geojson = function(geo) { return this.asset(geo, 'geojson'); };
MapComp.prototype.topojson = function(geo) { return this.asset(geo, 'topojson'); };
MapComp.prototype.asset = function(geo, type) {
	
	const comp = this;
	
	for (const pack of comp.packs)
	{
		if (pack.geo === geo)
		{
			Mapper.ProjectPackToPack(comp.projection, pack.coord, pack.pixel);
			return pack.pixel;
		}
	}
	
	const pack = { geo, coord: null, pixel: null };
	comp.packs.push(pack);
	
	if (type === 'topojson')
	{
		pack.coord = Mapper.ExtractTopojsonToPack(geo);
	}
	else if (type === 'geojson')
	{
		pack.coord = Mapper.ExtractGeojsonToPack(geo); // is ExtractGeojsonToPack implemented?
	}
	else if (type === 'arcpack')
	{
		pack.coord = new DataView(geo);
		
	}
	else
	{
		throw new Error();
	}
	
	pack.pixel = new DataView(new ArrayBuffer(pack.coord.byteLength));
	Mapper.ProjectPackToPack(comp.projection, pack.coord, pack.pixel);
	return pack.pixel;
};
MapComp.prototype.stroke = function(pixelPack) {
	const comp = this;
	const ctx = comp.ctx;
	ctx.beginPath();
	Mapper.DrawMeshPack(ctx, pixelPack);
	ctx.stroke();
};
MapComp.prototype.fill = function(areas, colors) {
	const comp = this;
	const ctx = comp.ctx;
	// pretty unclear what form areas should take - list of lists of arcs?
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

