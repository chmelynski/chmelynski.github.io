
// require returns the 'exports' object
// so we just manually put exports.Foo = Foo into each ts file
// tsc will complain, but it will still output the line - we can just use "tsc --target es5", no module flag necessary
// but now the browser will complain that 'exports' is not defined (it should still work, though)
// we can add a <script>var exports = {};</script> to suppress that warning

var fs = require('fs');

var Raster = require('../raster/raster.js').Raster;
var opentype = require('../otf/opentype-0.6.9.js');
var Map = require('./mapping.js').Mapper;
var buffer = fs.readFileSync('../fonts/otf/SourceSansPro-Regular.otf');
var font = opentype.parse(buffer.buffer);
//PDF.fontNameToUint8Array['sans'] = buffer;
Raster.fontNameToFontObject['sans'] = font;

//require('data/county-centers.js');
//var latlnggrid = require('data/latlnggrid.geojson').default;

//var counties = ReadTsv(fs.readFileSync('../counties.tsv', {encoding:'utf-8'}), 'sssff');

var countyFips = JSON.parse(fs.readFileSync('data/county-fips.json', {encoding:'utf-8'}));

var abbrs = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
var fipss = ['01','02','04','05','06','08','09','10','12','13','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','44','45','46','47','48','49','50','51','53','54','55','56'];
var subdivisions = {'AL':'','AK':'','AZ':'','AR':'','CA':'','CO':'place','CT':'','DE':'','FL':'','GA':'','HI':'','ID':'','IL':'','IN':'','IA':'','KS':'','KY':'','LA':'','ME':'','MD':'','MA':'','MI':'','MN':'','MS':'','MO':'','MT':'','NE':'','NV':'','NH':'','NJ':'','NM':'','NY':'','NC':'','ND':'','OH':'','OK':'','OR':'','PA':'cousub','RI':'','SC':'','SD':'','TN':'','TX':'','UT':'','VT':'','VA':'','WA':'','WV':'','WI':'','WY':''};

var memoized = {};

function ReadTopojson(filename) {
	
	//if (memoized[filename]) { return memoized[filename]; }
	
	var topo = JSON.parse(fs.readFileSync(filename, {encoding:'utf-8'}));
	//Map.ExtractTopojson(topo);
	//memoized[filename] = topo;
	console.log(filename);
	return topo;
}
function ReadTopoFips(dir, projection, stateFips, countyFips) {
	
	var topos = {};
	
	topos['tl_2016_us_primaryroads'] = ProjectTopojson(projection, ReadTopojson(dir + 'tl_2016_us_primaryroads.topojson'));
	
	for (var i = 0; i < stateFips.length; i++)
	{
		var stateFip = stateFips[i];
		topos['tl_2016_' + stateFip + '_prisecroads'] = ProjectTopojson(projection, ReadTopojson(dir + 'prisecroads\\tl_2016_' + stateFip + '_prisecroads.topojson'));
		//topos['tl_2016_' + stateFip + '_cousub'] = ProjectTopojson(projection, ReadTopojson(dir + 'cousub\\tl_2016_' + stateFip + '_cousub.topojson'));
		topos['tl_2016_' + stateFip + '_place'] = ProjectTopojson(projection, ReadTopojson(dir + 'place\\tl_2016_' + stateFip + '_place.topojson'));
	}
	
	for (var i = 0; i < countyFips.length; i++)
	{
		var countyFip = countyFips[i];
		topos['tl_2016_' + countyFip + '_roads'] = ProjectTopojson(projection, ReadTopojson(dir + 'roads\\tl_2016_' + countyFip + '_roads.topojson'));
		topos['tl_2016_' + countyFip + '_areawater'] = ProjectTopojson(projection, ReadTopojson(dir + 'areawater\\tl_2016_' + countyFip + '_areawater.topojson'));
		topos['tl_2016_' + countyFip + '_linearwater'] = ProjectTopojson(projection, ReadTopojson(dir + 'linearwater\\tl_2016_' + countyFip + '_linearwater.topojson'));
	}
	
	return topos;
}
function ReadTopos(dir, projection, keys) {
	
	var topos = {};
	
	for (var i = 0; i < keys.length; i++)
	{
		topos[keys[i]] = Map.ProjectTopojson(projection, ReadTopojson(dir + keys[i] + '.topojson'));
	}
	
	return topos;
}

var countyFile = 'F:\\tl_2016_us_county.topojson';
var countyTopo = ReadTopojson(countyFile);
var countyPack = Map.ExtractTopojsonToPack(countyTopo);
var countyProjected = new DataView(new ArrayBuffer(countyPack.byteLength));
var primaryRoadsFile = 'F:\\tl_2016_us_primaryroads.topojson';
var primaryRoadsTopo = ReadTopojson(primaryRoadsFile);
var primaryRoadsPack = Map.ExtractTopojsonToPack(primaryRoadsTopo);
var primaryRoadsProjected = new DataView(new ArrayBuffer(primaryRoadsPack.byteLength));

function DrawLatLngGrid() {
	
	const dir = 'C:\\Users\\adam\\Desktop\\everything\\work\\mapping\\topojson\\';
	
	const width = 6000;
	const height = 4000;
	
	const projection = d3.geoAlbersUsa().translate([width/2, height/2]).scale(6000);
	
	const topos = ReadTopos(dir, projection, ['tl_2016_us_county','tl_2016_us_state']);
	
	const ctx = new Raster(width, height);
	
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'gray';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	Map.DrawMesh(ctx, topos['tl_2016_us_county']);
	ctx.stroke();
	
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'black';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	Map.DrawMesh(ctx, topos['tl_2016_us_state']);
	ctx.stroke();
	
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'red';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	for (var lat = 50; lat >= 26; lat--)
	{
		for (var lng = -125; lng <= -71; lng++)
		{
			var NW = projection([lng+0.0, lat-0.0]);
			var NE = projection([lng+1.0, lat-0.0]);
			var SE = projection([lng+1.0, lat-1.0]);
			var SW = projection([lng+0.0, lat-1.0]);
			
			if (NW === null) { console.log(lat+','+lng); continue; }
			if (NE === null) { console.log(lat+','+lng); continue; }
			if (SE === null) { console.log(lat+','+lng); continue; }
			if (SW === null) { console.log(lat+','+lng); continue; }
			
			ctx.moveTo(NW[0], NW[1]);
			ctx.lineTo(NE[0], NE[1]);
			ctx.lineTo(SE[0], SE[1]);
			ctx.lineTo(SW[0], SW[1]);
			ctx.lineTo(NW[0], NW[1]);
		}
	}
	ctx.stroke();
	
	// labels
	ctx.font = '10pt sans';
	ctx.fillStyle = 'red';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	for (var lat = 50; lat >= 26; lat--)
	{
		for (var lng = -125; lng <= -71; lng++)
		{
			var cxcy = projection([lng+0.5, lat-0.5]);
			
			if (cxcy === null) { console.log(lat+','+lng); continue; }
			
			var cx = cxcy[0];
			var cy = cxcy[1];
			
			ctx.fillText('n' + lat.toString() + 'w' + (-lng).toString(), cx, cy);
		}
	}
	
	fs.writeFileSync('c:\\users\\adam\\desktop\\latlnggrid.bmp', new Buffer(ctx.bitmap.pixels));
}
function DrawCountyMaps(filename, subdivision) {
	
	var params = paramss[filename];
	
	var dir = 'C:\\Users\\adam\\Desktop\\topojson\\';
	
	var projection = Map.Mercator2(params);
	//var projection = d3.geoMercator().scale(params.scale).center([params.lng, params.lat]).translate([params.width/2, params.height/2]);
	
	//params.stateFips = [ fipss[abbrs.indexOf(filename)] ];
	//params.countyFips = countyFips.filter(x => x.startsWith(params.stateFips[0]));
	
	var ctx = new Raster(params.width, params.height);
	
	ctx.fillStyle = 'rgb(100,175,0)';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	for (var i = 0; i < params.countyFips.length; i++)
	{
		var countyFip = params.countyFips[i];
		
		var areawaterTopo = ReadTopojson(dir + 'areawater\\tl_2016_' + countyFip + '_areawater.topojson');
		Map.ExtractTopojson(areawaterTopo);
		Map.ProjectTopojson(projection, areawaterTopo);
		
		var linearwaterTopo = ReadTopojson(dir + 'linearwater\\tl_2016_' + countyFip + '_linearwater.topojson')
		Map.ExtractTopojson(linearwaterTopo);
		Map.ProjectTopojson(projection, linearwaterTopo);
		
		var roadsTopo = ReadTopojson(dir + 'roads\\tl_2016_' + countyFip + '_roads.topojson')
		Map.ExtractTopojson(roadsTopo);
		Map.ProjectTopojson(projection, roadsTopo);
		
		ctx.fillStyle = 'blue';
		ctx.beginPath();
		Map.DrawTopojson(ctx, areawaterTopo);
		ctx.fill();
		
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'blue';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		Map.DrawMesh(ctx, linearwaterTopo);
		ctx.stroke();
		
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'white';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		Map.DrawMesh(ctx, roadsTopo);
		ctx.stroke();
	}
	
	for (var i = 0; i < params.stateFips.length; i++)
	{
		var stateFip = params.stateFips[i];
		
		//var roadsPack = new DataView(fs.readFileSync(dir + 'tl_2016_' + stateFip + '_roads.arcpack').buffer);
		//var roadsProjected = new DataView(new ArrayBuffer(roadsPack.byteLength));
		//Map.ProjectPackToPack(projection, roadsPack, roadsProjected);
		//
		//ctx.lineWidth = 1;
		//ctx.strokeStyle = 'white';
		//ctx.lineJoin = 'round';
		//ctx.beginPath();
		//Map.DrawMeshPack(ctx, roadsProjected);
		//ctx.stroke();
		
		var prisecroadsFilename = dir + 'prisecroads\\tl_2016_' + stateFip + '_prisecroads.topojson';
		var prisecroadsTopo = ReadTopojson(prisecroadsFilename);
		Map.ExtractTopojson(prisecroadsTopo);
		Map.ProjectTopojson(projection, prisecroadsTopo);
		
		ctx.lineWidth = 2;
		ctx.strokeStyle = 'yellow';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		Map.DrawMesh(ctx, prisecroadsTopo);
		ctx.stroke();
	}
	
	Map.ProjectPackToPack(projection, primaryRoadsPack, primaryRoadsProjected);
	
	ctx.lineWidth = 3;
	ctx.strokeStyle = 'orange';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	Map.DrawMeshPack(ctx, primaryRoadsProjected);
	ctx.stroke();
	
	for (var i = 0; i < params.stateFips.length; i++)
	{
		var stateFip = params.stateFips[i];
		
		var subdivisionTopo = ReadTopojson(dir + subdivision + '\\tl_2016_' + stateFip + '_' + subdivision + '.topojson');
		Map.ExtractTopojson(subdivisionTopo);
		Map.ProjectTopojson(projection, subdivisionTopo);
		
		ctx.lineWidth = 2;
		ctx.strokeStyle = 'black';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		Map.DrawMesh(ctx, subdivisionTopo);
		ctx.stroke();
		
		ctx.font = '12pt sans';
		ctx.textAlign = 'center';
		ctx.fillStyle = 'black';
		var obj = subdivisionTopo.objects['tl_2016_' + stateFip + '_' + subdivision];
		if (!obj) { continue; } // e.g., tl_2016_11_place (DC) doesn't have any objects
		for (var k = 0; k < obj.geometries.length; k++)
		{
			var props = obj.geometries[k].properties;
			var lng = props.INTPTLON;
			var lat = props.INTPTLAT;
			var name = props.NAME;
			
			var p = projection([lng, lat]);
			ctx.fillText(name, p[0], p[1]);
		}
	}
	
	Map.ProjectPackToPack(projection, countyPack, countyProjected);
	
	ctx.lineWidth = 5;
	ctx.strokeStyle = 'black';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	Map.DrawMeshPack(ctx, countyProjected);
	ctx.stroke();
	
	ctx.font = '20pt sans';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'black';
	var obj = countyTopo.objects['tl_2016_us_county'];
	for (var k = 0; k < obj.geometries.length; k++)
	{
		var props = obj.geometries[k].properties;
		
		if (params.stateFips.indexOf(props.STATEFP) >= 0)
		{
			var lng = props.INTPTLON;
			var lat = props.INTPTLAT;
			var name = props.NAME;
			
			var p = projection([lng, lat]);
			ctx.fillText(name, p[0], p[1]);
		}
	}
	
	fs.writeFileSync('c:\\users\\adam\\desktop\\maps\\' + filename + '.bmp', new Buffer(ctx.bitmap.pixels));
}
function DrawCountyNames() {
	
	var outfile = 'county-names';
	var params = { scale: 13000, lng: -100, lat: 37, width: 15000, height: 10000 };
	
	var projection = d3.geoMercator().scale(params.scale).center([params.lng, params.lat]).translate([params.width/2, params.height/2]);
	
	var countyFile = 'F:\\tl_2016_us_county.topojson';
	var counties = ReadTopojson(countyFile);
	
	var ctx = new Raster(params.width, params.height);
	
	ctx.fillStyle = 'rgb(255,255,255)';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	ctx.font = '12pt sans';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'rgb(255,0,0)';
	for (var k = 0; k < counties.objects.tl_2016_us_county.geometries.length; k++)
	{
		var props = counties.objects.tl_2016_us_county.geometries[k].properties;
		var lng = props.INTPTLON;
		var lat = props.INTPTLAT;
		var name = props.NAME;
		var fips = props.GEOID;
		var p = projection([lng, lat]);
		ctx.fillText(name, p[0], p[1]);
		ctx.fillText(fips, p[0], p[1] + 18);
	}
	
	ctx.lineWidth = 2;
	ctx.strokeStyle = 'black';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	DrawMesh(ctx, ProjectTopojson(projection, counties));
	ctx.stroke();
	
	fs.writeFileSync('c:\\users\\adam\\desktop\\' + outfile + '.bmp', new Buffer(ctx.bitmap.pixels));
}

var paramss = {
	"the-south": { "stateFips": ["01","13","28","37","45","47"], "countyFips": [], "width": 20000, "height": 10000, "lat": 33.364, "lng": -83.659, "metersPerPixel": 75, "rotation": 0.000 },
	"MA-CT-RI-LI": { "stateFips": ["25","09","44","36"], "countyFips": [], "width": 650, "height": 500, "lat": 41.729, "lng": -71.907, "metersPerPixel": 600, "rotation": 0.000 },
	"PR": { "stateFips": ["72"], "countyFips": [], "width": 5000, "height": 2000, "lat": 18.212, "lng": -66.435, "metersPerPixel": 40, "rotation": 0.000 },
	"VT-NH": { "stateFips": ["50","33"], "countyFips": [], "width": 500, "height": 500, "lat": 44.009, "lng": -71.966, "metersPerPixel": 600, "rotation": 0.000 },
	"albuquerque": { "stateFips": ["35"], "countyFips": ["35043", "35001"], "width": 5000, "height": 5000, "lat": 35.164, "lng": -106.637, "metersPerPixel": 15.8, "rotation": 0.000 },
	"anchorage": { "stateFips": ["02"], "countyFips": ["02020"], "width": 2500, "height": 2500, "lat": 61.172, "lng": -149.704, "metersPerPixel": 20, "rotation": 0.000 },
	"atlanta": { "stateFips": ["13"], "countyFips": ["13121", "13089", "13063", "13067", "13135", "13151", "13247", "13097", "13113"], "width": 5000, "height": 5000, "lat": 33.795, "lng": -84.400, "metersPerPixel": 15, "rotation": 0.000 }, // could be expanded
	"austin": { "stateFips": ["48"], "countyFips": ["48453", "48209", "48055", "48021", "48491", "48053"], "width": 4000, "height": 5000, "lat": 30.303, "lng": -97.754, "metersPerPixel": 20, "rotation": 0.000 },
	"baltimore": { "stateFips": ["24"], "countyFips": ["24027", "24005", "24510", "24003"], "width": 5000, "height": 5000, "lat": 39.295, "lng": -76.618, "metersPerPixel": 10, "rotation": 0.000 },
	"bay-area": { "stateFips": ["06"], "countyFips": ["06075", "06081", "06085", "06013", "06041", "06001","06095"], "width": 3500, "height": 5000, "lat": 37.627, "lng": -122.168, "metersPerPixel": 23.8, "rotation": 0.335 },
	"boston": { "stateFips": ["25","44","33"], "countyFips": ["25009", "25017", "25025", "25021", "25023", "33015", "33011", "25027", "44007", "25005"], "width": 5000, "height": 5000, "lat": 42.291, "lng": -71.110, "metersPerPixel": 20, "rotation": 0.000 },
	"charlotte": { "stateFips": ["37", "45"], "countyFips": ["37071", "37109", "37025", "37119", "37179", "45091", "37097", "37159"], "width": 5000, "height": 5000, "lat": 35.213, "lng": -80.791, "metersPerPixel": 15, "rotation": 0.000 },
	"chicago": { "stateFips": ["18", "17", "55"], "countyFips": ["18089", "18127", "17197", "17043", "17031", "17097", "17111", "17089", "17093", "17063", "17091", "55059"], "width": 10000, "height": 10000, "lat": 41.901, "lng": -87.693, "metersPerPixel": 15, "rotation": 0.000 },
	"cincinnati": { "stateFips": ["39", "21", "18"], "countyFips": ["39061", "21015", "21117", "21037", "39025", "39165", "39017", "18047", "18029", "18115"], "width": 5000, "height": 5000, "lat": 39.208, "lng": -84.553, "metersPerPixel": 20, "rotation": 0.000 },
	"cleveland": { "stateFips": ["39"], "countyFips": ["39085", "39035", "39093", "39103", "39153", "39055", "39133"], "width": 10000, "height": 5000, "lat": 41.428, "lng": -81.623, "metersPerPixel": 12.6, "rotation": 0.427 },
	"columbus": { "stateFips": ["39"], "countyFips": ["39045", "39089", "39049", "39041", "39159", "39097", "39129"], "width": 5000, "height": 5000, "lat": 39.988, "lng": -82.972, "metersPerPixel": 12.6, "rotation": 0.000 },
	"dallas": { "stateFips": ["48"], "countyFips": ["48497", "48121", "48085", "48231", "48397", "48113", "48439", "48367", "48221", "48251", "48139", "48257"], "width": 9000, "height": 7500, "lat": 32.775, "lng": -96.974, "metersPerPixel": 20, "rotation": 0.000 },
	"denver": { "stateFips": ["08"], "countyFips": ["08031", "08001", "08005", "08035", "08059", "08014", "08039", "08013", "08123"], "width": 5000, "height": 5000, "lat": 39.735, "lng": -104.866, "metersPerPixel": 20, "rotation": 0.000 }, // could be contracted
	"detroit": { "stateFips": ["26"], "countyFips": ["26163", "26099", "26125", "26161", "26115"], "width": 5000, "height": 5000, "lat": 42.379, "lng": -83.147, "metersPerPixel": 15, "rotation": 0.000 },
	"el-paso": { "stateFips": ["48", "35"], "countyFips": ["48141", "35013", "35035", "48229"], "width": 5000, "height": 5000, "lat": 31.769, "lng": -106.434, "metersPerPixel": 20, "rotation": 0.000 },
	"honolulu": { "stateFips": ["15"], "countyFips": ["15003"], "width": 5000, "height": 3000, "lat": 21.377, "lng": -157.917, "metersPerPixel": 12.6, "rotation": 0.028 },
	"houston": { "stateFips": ["48"], "countyFips": ["48201", "48339", "48473", "48157", "48039", "48071", "48291","48167"], "width": 5000, "height": 5000, "lat": 29.669, "lng": -95.385, "metersPerPixel": 35, "rotation": 0.000 },
	"indianapolis": { "stateFips": ["18"], "countyFips": ["18011", "18057", "18095", "18059", "18097", "18063", "18109", "18081", "18145"], "width": 5000, "height": 5000, "lat": 39.812, "lng": -86.116, "metersPerPixel": 20, "rotation": 0.000 },
	"jacksonville": { "stateFips": ["12"], "countyFips": ["12089", "12031", "12019", "12109"], "width": 5000, "height": 5000, "lat": 30.346, "lng": -81.666, "metersPerPixel": 15.8, "rotation": 0.000 },
	"kansas-city": { "stateFips": ["20", "29"], "countyFips": ["20103", "20209", "20091", "29165", "29047", "29095", "29037"], "width": 5000, "height": 5000, "lat": 39.054, "lng": -94.573, "metersPerPixel": 19.8, "rotation": 0.000 },
	"las-vegas": { "stateFips": ["32"], "countyFips": ["32003"], "width": 5000, "height": 5000, "lat": 36.141, "lng": -115.162, "metersPerPixel": 12, "rotation": 0.000 },
	"long-island": { "stateFips": ["36"], "countyFips": ["36059","36103"], "width": 13000, "height": 4000, "lat": 40.872, "lng": -72.944, "metersPerPixel": 12.6, "rotation": 0.224 },
	"louisville": { "stateFips": ["18", "21"], "countyFips": ["18043", "21111", "21211", "21185", "18019", "21029", "18061", "21215"], "width": 5000, "height": 5000, "lat": 38.212, "lng": -85.640, "metersPerPixel": 12.6, "rotation": 0.000 },
	"memphis": { "stateFips": ["05", "28", "47"], "countyFips": ["05035", "28033", "47157", "47167", "47047", "28093"], "width": 5000, "height": 5000, "lat": 35.247, "lng": -89.820, "metersPerPixel": 19.9, "rotation": 0.000 },
	"milwaukee": { "stateFips": ["55"], "countyFips": ["55101", "55079", "55089", "55131", "55133"], "width": 4000, "height": 5000, "lat": 43.008, "lng": -88.009, "metersPerPixel": 12.6, "rotation": 0.000 },
	"minneapolis": { "stateFips": ["27"], "countyFips": ["27053", "27139", "27037", "27123", "27003", "27163"], "width": 5000, "height": 5000, "lat": 44.932, "lng": -93.269, "metersPerPixel": 15.8, "rotation": 0.000 },
	"nashville": { "stateFips": ["47"], "countyFips": ["47037", "47187", "47149", "47189", "47165", "47147", "47021", "47043", "47169", "47119", "47081", "47125"], "width": 5000, "height": 5000, "lat": 36.162, "lng": -86.773, "metersPerPixel": 25.1, "rotation": 0.000 },
	"new-orleans": { "stateFips": ["22"], "countyFips": ["22087", "22071", "22089", "22103", "22051", "22075"], "width": 8000, "height": 5000, "lat": 29.922, "lng": -90.104, "metersPerPixel": 6.3, "rotation": 0.000 },
	"new-york": { "stateFips": ["36", "34", "09"], "countyFips": ["36085", "34017", "34003", "36087", "36119", "09001", "36005", "36061", "36047", "36081", "36059", "34031", "34027", "34013", "34039", "34023", "34035", "34025","36103"], "width": 5000, "height": 5000, "lat": 40.818, "lng": -73.917, "metersPerPixel": 30, "rotation": 0.000 },
	"new-york-city": { "stateFips": ["36"], "countyFips": ["36061", "36047", "36081", "36005"], "width": 4000, "height": 5000, "lat": 40.731, "lng": -73.870, "metersPerPixel": 7.5, "rotation": -0.387 },
	"norfolk": { "stateFips": ["51"], "countyFips": ["51800", "51550", "51810", "51710", "51740", "51093", "51700", "51199", "51735", "51650", "51115", "51131"], "width": 5000, "height": 5000, "lat": 36.904, "lng": -76.318, "metersPerPixel": 15.9, "rotation": 0.000 },
	"oklahoma-city": { "stateFips": ["40"], "countyFips": ["40109", "40027", "40087", "40051", "40017", "40073", "40083", "40081", "40125"], "width": 5000, "height": 5000, "lat": 35.417, "lng": -97.422, "metersPerPixel": 25.1, "rotation": 0.000 },
	"omaha": { "stateFips": ["31", "19"], "countyFips": ["31055", "31153", "19155", "19129", "31177", "31025"], "width": 5000, "height": 5000, "lat": 41.244, "lng": -96.018, "metersPerPixel": 12.6, "rotation": 0.000 },
	"orlando": { "stateFips": ["12"], "countyFips": ["12117", "12069", "12095", "12097", "12105"], "width": 5000, "height": 5000, "lat": 28.561, "lng": -81.427, "metersPerPixel": 15.8, "rotation": 0.000 },
	"philadelphia": { "stateFips": ["42","34","10"], "countyFips": ["42101", "42091", "42045", "42017", "34005", "34007", "34015", "42029", "34021","34033","10003"], "width": 5000, "height": 5000, "lat": 40.009, "lng": -75.126, "metersPerPixel": 20, "rotation": 0.000 },
	"phoenix": { "stateFips": ["04"], "countyFips": ["04013", "04021"], "width": 7000, "height": 5000, "lat": 33.496, "lng": -111.972, "metersPerPixel": 15, "rotation": 0.000 },
	"piedmont": { "stateFips": ["37"], "countyFips": ["37001", "37081", "37067", "37057", "37151", "37157", "37169", "37171", "37197", "37059", "37033", "37037", "37135"], "width": 8000, "height": 5000, "lat": 36.079, "lng": -79.830, "metersPerPixel": 15, "rotation": 0.000 },
	"pittsburgh": { "stateFips": ["42"], "countyFips": ["42007", "42019", "42005", "42129", "42125", "42003", "42051"], "width": 5000, "height": 5000, "lat": 40.474, "lng": -79.932, "metersPerPixel": 25, "rotation": 0.000 },
	"portland": { "stateFips": ["41", "53"], "countyFips": ["41051", "41067", "41005", "53011"], "width": 6000, "height": 5000, "lat": 45.516, "lng": -122.654, "metersPerPixel": 10, "rotation": 0.000 },
	"providence": { "stateFips": ["44", "25"], "countyFips": ["44007", "44003", "44001", "25005"], "width": 3000, "height": 3000, "lat": 41.807, "lng": -71.449, "metersPerPixel": 15, "rotation": 0.000 },
	"raleigh": { "stateFips": ["37"], "countyFips": ["37183", "37085", "37101", "37069", "37077", "37063", "37135", "37037", "37105"], "width": 5000, "height": 5000, "lat": 35.821, "lng": -78.691, "metersPerPixel": 15, "rotation": 0.000 },
	"richmond": { "stateFips": ["51"], "countyFips": ["51760", "51041", "51087", "51730", "51570", "51670", "51036", "51149", "51053", "51007", "51145", "51075", "51085", "51127", "51183", "51181", "51101"], "width": 4000, "height": 5000, "lat": 37.397, "lng": -77.450, "metersPerPixel": 15.9, "rotation": 0.000 },
	"sacramento": { "stateFips": ["06"], "countyFips": ["06067", "06061", "06101", "06113", "06017"], "width": 5000, "height": 5000, "lat": 38.603, "lng": -121.265, "metersPerPixel": 15.8, "rotation": 0.000 },
	"salt-lake-city": { "stateFips": ["49"], "countyFips": ["49029", "49057", "49005", "49035", "49049", "49051", "49043", "49045", "49011", "49003", "49033"], "width": 3000, "height": 5000, "lat": 40.891, "lng": -111.836, "metersPerPixel": 50, "rotation": 0.000 },
	"san-antonio": { "stateFips": ["48"], "countyFips": ["48029", "48091", "48187", "48493", "48013", "48325", "48019", "48259"], "width": 5000, "height": 5000, "lat": 29.479, "lng": -98.429, "metersPerPixel": 20, "rotation": 0.000 },
	"seattle": { "stateFips": ["53"], "countyFips": ["53061", "53053", "53033", "53067", "53045", "53035", "53029", "53057", "53055"], "width": 6000, "height": 10000, "lat": 47.736, "lng": -122.369, "metersPerPixel": 25, "rotation": 0.000 }, // has some weird stuff going on with areawater
	"south-florida": { "stateFips": ["12"], "countyFips": ["12099", "12011", "12086"], "width": 4000, "height": 12000, "lat": 25.988, "lng": -80.303, "metersPerPixel": 20, "rotation": -0.227 },
	"southern-california": { "stateFips": ["06"], "countyFips": ["06037","06059","06071","06065","06073","06111"], "width": 10000, "height": 5000, "lat": 33.851, "lng": -117.679, "metersPerPixel": 40, "rotation": -0.694 },
	"st-louis": { "stateFips": ["29", "17"], "countyFips": ["29510", "29189", "29183", "29099", "17083", "17119", "17163", "17133"], "width": 6000, "height": 5000, "lat": 38.645, "lng": -90.301, "metersPerPixel": 15.7, "rotation": 0.000 },
	"tampa": { "stateFips": ["12"], "countyFips": ["12081", "12057", "12103", "12101"], "width": 5000, "height": 5000, "lat": 27.963, "lng": -82.508, "metersPerPixel": 19.9, "rotation": 0.000 },
	"tucson": { "stateFips": ["04"], "countyFips": ["04019", "04021"], "width": 5000, "height": 5000, "lat": 32.232, "lng": -110.988, "metersPerPixel": 15.9, "rotation": 0.000 },
	"tulsa": { "stateFips": ["40"], "countyFips": ["40143", "40037", "40145", "40131", "40111", "40101", "40113", "40147", "40117"], "width": 5000, "height": 5000, "lat": 36.134, "lng": -95.964, "metersPerPixel": 19.9, "rotation": 0.000 },
	"washington": { "stateFips": ["11","24","51"], "countyFips": ["11001", "24031", "24027", "24003", "24033", "24017", "51510", "51013", "51610", "51059", "51600", "51685", "51683", "51153", "51107"], "width": 5000, "height": 5000, "lat": 38.873, "lng": -77.066, "metersPerPixel": 20, "rotation": 0.000 },
	"AL": { "stateFips": ["01"], "countyFips": [], "width":  3500, "height": 5000, "lat": 32.642, "lng": -86.732, "metersPerPixel":  120, "rotation": 0.000 },
	"AK": { "stateFips": ["02"], "countyFips": [], "width":  5000, "height": 5000, "lat": 61.938, "lng": -154.396, "metersPerPixel": 550, "rotation": 0.000 },
	"AZ": { "stateFips": ["04"], "countyFips": [], "width":  5000, "height": 5000, "lat": 34.190, "lng": -111.756, "metersPerPixel": 140, "rotation": 0.000 },
	"AR": { "stateFips": ["05"], "countyFips": [], "width":  5000, "height": 5000, "lat": 34.846, "lng": -92.099, "metersPerPixel":  105, "rotation": 0.000 },
	"CA": { "stateFips": ["06"], "countyFips": [], "width":  4000, "height": 5000, "lat": 37.285, "lng": -119.407, "metersPerPixel": 240, "rotation": 0.000 },
	"CO": { "stateFips": ["08"], "countyFips": [], "width":  7000, "height": 5000, "lat": 38.997, "lng": -105.507, "metersPerPixel": 100, "rotation": 0.000 },
	"CT": { "stateFips": ["09"], "countyFips": [], "width":  7000, "height": 5000, "lat": 41.518, "lng": -72.710, "metersPerPixel":   25, "rotation": 0.000 },
	"DE": { "stateFips": ["10"], "countyFips": [], "width":  3000, "height": 5000, "lat": 39.124, "lng": -75.453, "metersPerPixel":   35, "rotation": 0.000 },
	"FL": { "stateFips": ["12"], "countyFips": [], "width":  5000, "height": 5000, "lat": 28.108, "lng": -83.963, "metersPerPixel":  170, "rotation": 0.000 },
	"GA": { "stateFips": ["13"], "countyFips": [], "width":  4500, "height": 5000, "lat": 32.722, "lng": -83.266, "metersPerPixel":  110, "rotation": 0.000 },
	"HI": { "stateFips": ["15"], "countyFips": [], "width":  5000, "height": 5000, "lat": 20.718, "lng": -157.547, "metersPerPixel": 130, "rotation": 0.000 },
	"ID": { "stateFips": ["16"], "countyFips": [], "width":  3000, "height": 5000, "lat": 45.485, "lng": -114.152, "metersPerPixel": 180, "rotation": 0.000 },
	"IL": { "stateFips": ["17"], "countyFips": [], "width":  3000, "height": 5000, "lat": 39.914, "lng": -89.385, "metersPerPixel":  140, "rotation": 0.000 },
	"IN": { "stateFips": ["18"], "countyFips": [], "width":  3000, "height": 5000, "lat": 39.820, "lng": -86.336, "metersPerPixel":  110, "rotation": 0.000 },
	"IA": { "stateFips": ["19"], "countyFips": [], "width":  6000, "height": 5000, "lat": 42.078, "lng": -93.381, "metersPerPixel":  100, "rotation": 0.000 },
	"KS": { "stateFips": [], "countyFips": [], "width":  9000, "height": 5000, "lat": 38.516, "lng": -98.336, "metersPerPixel":   75, "rotation": 0.000 },
	"KY": { "stateFips": [], "countyFips": [], "width": 10000, "height": 5000, "lat": 37.747, "lng": -85.665, "metersPerPixel":   70, "rotation": 0.000 },
	"LA": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 31.055, "lng": -91.629, "metersPerPixel":  110, "rotation": 0.000 },
	"MA": { "stateFips": [], "countyFips": [], "width":  8000, "height": 5000, "lat": 42.075, "lng": -71.682, "metersPerPixel":   40, "rotation": 0.000 },
	"MD": { "stateFips": [], "countyFips": [], "width":  8000, "height": 5000, "lat": 38.847, "lng": -77.273, "metersPerPixel":   50, "rotation": 0.000 },
	"ME": { "stateFips": [], "countyFips": [], "width":  4000, "height": 5000, "lat": 45.243, "lng": -69.114, "metersPerPixel":  100, "rotation": 0.000 },
	"MI": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 44.524, "lng": -86.210, "metersPerPixel":  150, "rotation": 0.000 },
	"MN": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 46.395, "lng": -92.801, "metersPerPixel":  140, "rotation": 0.000 },
	"MO": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 38.410, "lng": -92.307, "metersPerPixel":  130, "rotation": 0.000 },
	"MS": { "stateFips": [], "countyFips": [], "width":  3500, "height": 5000, "lat": 32.573, "lng": -89.830, "metersPerPixel":  120, "rotation": 0.000 },
	"MT": { "stateFips": [], "countyFips": [], "width":  9000, "height": 5000, "lat": 46.770, "lng": -109.875, "metersPerPixel": 110, "rotation": 0.000 },
	"NC": { "stateFips": [], "countyFips": [], "width":  9000, "height": 5000, "lat": 35.429, "lng": -79.863, "metersPerPixel":  100, "rotation": 0.000 },
	"ND": { "stateFips": [], "countyFips": [], "width":  8000, "height": 5000, "lat": 47.473, "lng": -100.339, "metersPerPixel":  75, "rotation": 0.000 },
	"NE": { "stateFips": [], "countyFips": [], "width": 10000, "height": 5000, "lat": 41.515, "lng": -99.760, "metersPerPixel":   75, "rotation": 0.000 },
	"NH": { "stateFips": [], "countyFips": [], "width":  3000, "height": 5000, "lat": 43.994, "lng": -71.613, "metersPerPixel":   60, "rotation": 0.000 },
	"NJ": { "stateFips": [], "countyFips": [], "width":  3000, "height": 5000, "lat": 40.151, "lng": -74.679, "metersPerPixel":   55, "rotation": 0.000 },
	"NM": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 34.205, "lng": -106.066, "metersPerPixel": 140, "rotation": 0.000 },
	"NV": { "stateFips": [], "countyFips": [], "width":  4000, "height": 5000, "lat": 38.553, "lng": -116.813, "metersPerPixel": 170, "rotation": 0.000 },
	"NY": { "stateFips": [], "countyFips": [], "width":  7000, "height": 5000, "lat": 42.795, "lng": -75.482, "metersPerPixel":  110, "rotation": 0.000 },
	"OH": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 40.232, "lng": -82.607, "metersPerPixel":   85, "rotation": 0.000 },
	"OK": { "stateFips": [], "countyFips": [], "width": 10000, "height": 5000, "lat": 35.397, "lng": -98.619, "metersPerPixel":   85, "rotation": 0.000 },
	"OR": { "stateFips": [], "countyFips": [], "width":  6000, "height": 5000, "lat": 44.114, "lng": -120.482, "metersPerPixel": 110, "rotation": 0.000 },
	"PA": { "stateFips": [], "countyFips": [], "width":  8000, "height": 5000, "lat": 40.993, "lng": -77.648, "metersPerPixel":   65, "rotation": 0.000 },
	"RI": { "stateFips": [], "countyFips": [], "width":  4000, "height": 5000, "lat": 41.655, "lng": -71.470, "metersPerPixel":   18, "rotation": 0.000 },
	"SC": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 33.688, "lng": -80.933, "metersPerPixel":  100, "rotation": 0.000 },
	"SD": { "stateFips": [], "countyFips": [], "width":  8000, "height": 5000, "lat": 44.327, "lng": -100.133, "metersPerPixel":  90, "rotation": 0.000 },
	"TN": { "stateFips": [], "countyFips": [], "width": 12000, "height": 5000, "lat": 35.982, "lng": -85.944, "metersPerPixel":   70, "rotation": 0.000 },
	"TX": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 31.501, "lng": -99.786, "metersPerPixel":  270, "rotation": 0.000 },
	"UT": { "stateFips": [], "countyFips": [], "width":  4000, "height": 5000, "lat": 39.504, "lng": -111.585, "metersPerPixel": 120, "rotation": 0.000 },
	"VA": { "stateFips": [], "countyFips": [], "width":  8000, "height": 5000, "lat": 37.882, "lng": -79.547, "metersPerPixel":  100, "rotation": 0.000 },
	"VT": { "stateFips": [], "countyFips": [], "width":  3000, "height": 5000, "lat": 43.903, "lng": -72.447, "metersPerPixel":   60, "rotation": 0.000 },
	"WA": { "stateFips": [], "countyFips": [], "width":  7000, "height": 5000, "lat": 47.382, "lng": -120.709, "metersPerPixel":  90, "rotation": 0.000 },
	"WI": { "stateFips": [], "countyFips": [], "width":  5000, "height": 5000, "lat": 44.670, "lng": -89.906, "metersPerPixel":  110, "rotation": 0.000 },
	"WV": { "stateFips": [], "countyFips": [], "width":  6000, "height": 5000, "lat": 38.948, "lng": -80.154, "metersPerPixel":   80, "rotation": 0.000 },
	"WY": { "stateFips": [], "countyFips": [], "width":  6000, "height": 5000, "lat": 43.025, "lng": -107.523, "metersPerPixel": 110, "rotation": 0.000 },
};

var abbrs2 = ['AZ','AR','CA','CO','CT','DE','FL','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MO','MT','NE','NV','NH','NJ','NM','NY','ND','OH','OK','OR','PA','SD','TX','UT','VT','VA','WA','WV','WI','WY'];

//for (var i = 0; i < abbrs2.length; i++)
//{
//	DrawCountyMaps(abbrs2[i], 'place');
//}

//DrawCountyMaps('AL', 'place');
//DrawCountyMaps('MS', 'place');
//DrawCountyMaps('GA', 'place');
//DrawCountyMaps('SC', 'place');
//DrawCountyMaps('NC', 'place');
//DrawCountyMaps('TN', 'place');

//DrawCountyMaps('the-south-water', 'place');

//DrawCountyMaps('new-orleans', 'place');
//DrawCountyMaps('st-louis', 'place');
//DrawCountyMaps('kansas-city', 'place');
//DrawCountyMaps('houston', 'place');
//DrawCountyMaps('bay-area', 'place');
//DrawCountyMaps('boston', 'place');
//DrawCountyMaps('philadelphia', 'place');
//DrawCountyMaps('washington', 'place');
//DrawCountyMaps('dallas', 'place');
//DrawCountyMaps('detroit', 'place');
//DrawCountyMaps('chicago', 'place');
//DrawCountyMaps('new-york', 'place');
//DrawCountyMaps('new-york-city', 'place');
//DrawCountyMaps('pittsburgh', 'cousub');
//DrawCountyMaps('indianapolis', 'place');
//DrawCountyMaps('columbus', 'place');
//DrawCountyMaps('cincinnati', 'place');
//DrawCountyMaps('louisville', 'place');
//DrawCountyMaps('portland', 'place');
//DrawCountyMaps('seattle', 'place');
//DrawCountyMaps('atlanta', 'place');
//DrawCountyMaps('phoenix', 'place');
//DrawCountyMaps('denver', 'place');
//DrawCountyMaps('salt-lake-city', 'place');
//DrawCountyMaps('las-vegas', 'place');
//DrawCountyMaps('san-antonio', 'place');
//DrawCountyMaps('austin', 'place');
//DrawCountyMaps('raleigh', 'place');
//DrawCountyMaps('charlotte', 'place');
//DrawCountyMaps('piedmont', 'place');
//DrawCountyMaps('oklahoma-city', 'place');
//DrawCountyMaps('tulsa', 'place');
//DrawCountyMaps('omaha', 'place');
//DrawCountyMaps('nashville', 'place');
//DrawCountyMaps('memphis', 'place');
//DrawCountyMaps('jacksonville', 'place');
//DrawCountyMaps('orlando', 'place');
//DrawCountyMaps('tampa', 'place');
//DrawCountyMaps('milwaukee', 'place');
//DrawCountyMaps('minneapolis', 'place');
//DrawCountyMaps('baltimore', 'place');
//DrawCountyMaps('albuquerque', 'place');
//DrawCountyMaps('el-paso', 'place');
//DrawCountyMaps('tucson', 'place');
//DrawCountyMaps('sacramento', 'place');
//DrawCountyMaps('providence', 'place');
//DrawCountyMaps('PR', 'place');
//DrawCountyMaps('anchorage', 'place');
//DrawCountyMaps('honolulu', 'place');
//DrawCountyMaps('richmond', 'place');

