
var fs = require('fs');

var fipss = ["01","02","04","05","06","08","09","10","12","13","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","44","45","46","47","48","49","50","51","53","54","55","56","72"]; // "11","60","66","69","74","78"

function CountArcsAndPoints() {
	
	var key = 'prisecroads';
	
	var ls = [];
	ls.push(['fips','arcs','points'].join('\t'));
	
	var Length = function(x) { return x.length; };
	var Add = function(a, b) { return a + b; };
	
	for (var i = 0; i < fipss.length; i++)
	{
		var fips = fipss[i];
		
		var filename = 'C:\\Users\\adam\\Desktop\\mapping\\topojson\\' + key + '\\' + 'tl_2016_' + fips + '_' + key + '.topojson';
		var topo = JSON.parse(fs.readFileSync(filename, {encoding: 'utf-8'}));
		
		ls.push(fips + '\t' + topo.arcs.length + '\t' + topo.arcs.map(Length).reduce(Add));
		
		console.log(filename);
	}
	
	fs.writeFileSync('C:\\Users\\adam\\Desktop\\mapping\\topojson\\stats-' + key + '.tsv', ls.join('\n'));
}
function BreakCountiesByState() {
	
	var topo = JSON.parse(fs.readFileSync('C:\\Users\\adam\\Desktop\\mapping\\topojson\\tl_2016_us_county.topojson', {encoding: 'utf-8'}));
	
	//for (var key in topo.objects) { console.log(key); }
	
	var stateList = [];
	
	for (var i = 0; i < topo.objects.tl_2016_us_county.geometries.length; i++)
	{
		var obj = topo.objects.tl_2016_us_county.geometries[i];
		var props = obj.properties;
		
		for (var key in props) { console.log(key + ': ' + props[key]); }
		
		var statefips = parseInt(props.STATEFP);
		var countyfips = parseInt(props.COUNTYFP);
		
		if (!stateList[statefips]) { stateList[statefips] = []; }
		stateList[statefips][countyfips] = obj;
	}
	
	var newtopo = {};
	newtopo.type = topo.type;
	newtopo.transform = topo.transform;
	newtopo.objects = {};
	newtopo.arcs = topo.arcs;
	
	for (var i = 0; i < stateList.length; i++)
	{
		var countyList = stateList[i];
		if (countyList === undefined) { continue; }
		
		var object = {};
		
		for (var j = 0; j < countyList.length; j++)
		{
			var county = countyList[j];
			if (county === undefined) { continue; }
			
			
		}
		
		newtopo.objects['tl_2016_' + PadLeft(i, 2) + '_county'] = object;
	}
	
	fs.writeFileSync('C:\\Users\\adam\\Desktop\\mapping\\topojson\\tl_2016_us_county_bystate.topojson', JSON.stringify(newtopo));
}
function ExtractProps() {
	
	var type = 'cousub';
	
	var propss = [];
	
	for (var i = 0; i < fipss.length; i++)
	{
		var fips = fipss[i];
		
		var topokey = 'tl_2016_' + fips + '_' + type;
		var filename = 'C:\\Users\\adam\\Desktop\\mapping\\topojson\\cousub\\' + topokey + '.topojson';
		var topojson = JSON.parse(fs.readFileSync(filename, {encoding: 'utf-8'}));
		
		for (var k = 0; k < topojson.objects[topokey].geometries.length; k++)
		{
			var props = topojson.objects[topokey].geometries[k].properties;
			propss.push(props);
		}
		
		console.log(topokey);
	}
	
	WriteObjects(propss, 'C:\\Users\\adam\\Desktop\\cousub-props.txt');
}
function WriteObjects(objs, filename) {
	
	var headers = [];
	
	for (var key in objs[0]) { headers.push(key); }
	
	var ls = [];
	
	ls.push(headers.join('\t'));
	
	for (var i = 0; i < objs.length; i++)
	{
		var l = [];
		
		for (var k = 0; k < headers.length; k++)
		{
			l.push(objs[i][headers[k]]);
		}
		
		ls.push(l.join('\t'));
	}
	
	fs.writeFileSync(filename, ls.join('\n'));
}
function ExtractCenters() {
	
	var key = 'tl_2016_us_state';
	var filename = 'C:\\Users\\adam\\Desktop\\mapping\\topojson\\tl_2016_us_state.topojson';
	var topo = JSON.parse(fs.readFileSync(filename, {encoding: 'utf-8'}));
	
	var objs = [];
	
	for (var i = 0; i < topo.objects[key].geometries.length; i++)
	{
		var props = topo.objects[key].geometries[i].properties;
		objs.push({ fips: props.GEOID, lat: parseFloat(props.INTPTLAT), lng: parseFloat(props.INTPTLON) });
	}
	
	var text = 'var stateCenters = ' + JSON.stringify(objs) + ';';
	fs.writeFileSync('C:\\Users\\adam\\Desktop\\mapping\\js\\state-centers.js', text);
}

function SplitLowres() {
	
	var json = JSON.parse(fs.readFileSync('C:\\Users\\adam\\Desktop\\topojson\\states-and-counties.topojson', { encoding: 'utf-8' }));
	
	var keep = new Uint8Array(json.arcs.length);
	var indexMap = new Uint32Array(json.arcs.length);
	
	for (var i = 0; i < json.objects.states.geometries.length; i++)
	{
		for (var j = 0; j < json.objects.states.geometries[i].arcs.length; j++)
		{
			for (var k = 0; k < json.objects.states.geometries[i].arcs[j].length; k++)
			{
				for (var l = 0; l < json.objects.states.geometries[i].arcs[j][k].length; l++)
				{
					var arcIndex = json.objects.states.geometries[i].arcs[j][k][l];
					var rectifiedArcIndex = (arcIndex < 0) ? -arcIndex - 1 : arcIndex;
					keep[rectifiedArcIndex] = 1;
				}
			}
		}
	}
	
	var c = 1; // indexMap is 1-indexed - a map to 0 indicates the arc is not present
	var newArcs = [];
	for (var i = 0; i < json.arcs.length; i++)
	{
		if (keep[i] == 1)
		{
			newArcs.push(json.arcs[i]);
			indexMap[i] = c++;
		}
	}
	
	for (var i = 0; i < json.objects.states.geometries.length; i++)
	{
		for (var j = 0; j < json.objects.states.geometries[i].arcs.length; j++)
		{
			for (var k = 0; k < json.objects.states.geometries[i].arcs[j].length; k++)
			{
				for (var l = 0; l < json.objects.states.geometries[i].arcs[j][k].length; l++)
				{
					var arcIndex = json.objects.states.geometries[i].arcs[j][k][l];
					var rectifiedArcIndex = (arcIndex < 0) ? -arcIndex - 1 : arcIndex;
					var rectifiedNewIndex = indexMap[rectifiedArcIndex] - 1;
					json.objects.states.geometries[i].arcs[j][k][l] = (arcIndex < 0) ? -rectifiedNewIndex - 1 : rectifiedNewIndex;
				}
			}
		}
	}
	
	var states = {
		type: 'Topology',
		objects: { states: json.objects.states },
		arcs: newArcs,
		transform: json.transform
	};
	
	fs.writeFileSync('C:\\Users\\adam\\Desktop\\topojson\\states.topojson', JSON.stringify(states));
	fs.writeFileSync('C:\\Users\\adam\\Desktop\\everything\\work\\mapping\\data\\states.js', 'var states = ' + JSON.stringify(states) + ';');
}

function CombineToposToArcpack() {
	
	var dir = 'c:\\users\\adam\\desktop\\topojson\\roads\\';
	var outdir = 'c:\\users\\adam\\desktop\\topojson\\';
	
	var stateFips = ["01"];
	var countyFips = JSON.parse(fs.readFileSync('data/county-fips.json', {encoding:'utf-8'}));
	
	for (var i = 0; i < stateFips.length; i++)
	{
		var stateFip = stateFips[i];
		
		var nArcs = 0;
		var nPoints = 0;
		
		var topos = [];
		
		for (var j = 0; j < countyFips.length; j++)
		{
			var countyFip = countyFips[j];
			
			if (countyFip.startsWith(stateFip))
			{
				var filename = dir + 'tl_2016_' + countyFip + '_roads.topojson';
				console.log(filename);
				var topo = JSON.parse(fs.readFileSync(filename, {encoding:'utf-8'}));
				topos.push(topo);
				nArcs += topo.arcs.length;
				nPoints += topo.arcs.map(arc => arc.length).reduce((a, b) => a + b);
			}
		}
		
		var n = 4 + nArcs * 2 + nPoints * 16;
		var view = new Buffer(n);
		
		var k = 0;
		
		//view.setUint32(k, nArcs); k += 4;
		view.writeUInt32BE(nArcs, k); k += 4;
		
		for (var j = 0; j < topos.length; j++)
		{
			var topo = topos[j];
			
			for (var l = 0; l < topo.arcs.length; l++)
			{
				var arc = topo.arcs[l];
				
				//view.setUint16(k, arc.length); k += 2;
				view.writeUInt16BE(arc.length, k); k += 2;
				
				var accum = [0, 0];
				
				for (var m = 0; m < arc.length; m++)
				{
					var p = arc[m];
					
					accum[0] += p[0];
					accum[1] += p[1];
					
					var lng = accum[0] * topo.transform.scale[0] + topo.transform.translate[0];
					var lat = accum[1] * topo.transform.scale[1] + topo.transform.translate[1];
					
					//view.setFloat64(k, lng); k += 8;
					//view.setFloat64(k, lat); k += 8;
					view.writeDoubleBE(lng, k); k += 8;
					view.writeDoubleBE(lat, k); k += 8;
				}
			}
		}
		
		fs.writeFileSync(outdir + 'tl_2016_' + stateFip + '_roads.arcpack', view);
	}
}

CombineToposToArcpack();

