
namespace Osm {

interface Dict<T> {
	[index: string]: T;
}

interface Xml {
	name: string;
	text: string;
	children: Xml[];
	attr(key: string): string;
}

interface Osm {
	bounds: Box;
	nodes: Dict<Node>;
	ways: Dict<Way>;
}
interface Node {
	lat: number;
	lng: number;
	x?: number;
	y?: number;
	attrs?: Dict<string>;
}
interface Way {
	nodes: Node[];
	attrs: Dict<string>;
	centroid?: { lat: number, lng: number, x: number, y: number };
}
interface Box {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
}

export function MakeOsm(xml: Xml): Osm {
	
	var osm: Osm = { bounds: { minLat: null, maxLat: null, minLng: null, maxLng: null }, nodes: {}, ways: {} };
	
	for (var i = 0; i < xml.children.length; i++)
	{
		var elt = xml.children[i];
		
		if (elt.name == 'node')
		{
			osm.nodes[elt.attr('id')] = { lat: parseFloat(elt.attr('lat')), lng: parseFloat(elt.attr('lon')) };
		}
		else if (elt.name == 'bounds')
		{
			osm.bounds.minLat = parseFloat(elt.attr('minlat'));
			osm.bounds.minLng = parseFloat(elt.attr('minlon'));
			osm.bounds.maxLat = parseFloat(elt.attr('maxlat'));
			osm.bounds.maxLng = parseFloat(elt.attr('maxlon'));
		}
	}
	
	for (var i = 0; i < xml.children.length; i++)
	{
		var elt = xml.children[i];
		
		if (elt.name == 'way')
		{
			var way: Way = { nodes: [], attrs: {} };
			
			for (var k = 0; k < elt.children.length; k++)
			{
				var child = elt.children[k];
				
				if (child.name == 'nd')
				{
					var node = osm.nodes[child.attr('ref')];
					if (node) { way.nodes.push(node); } else { throw new Error(); }
				}
				else if (child.name == 'tag')
				{
					way.attrs[child.attr('k')] = child.attr('v');
				}
			}
			
			osm.ways[elt.attr('id')] = way;
		}
	}
	
	for (var key in osm.ways)
	{
		var way = osm.ways[key];
		
		var lat = 0;
		var lng = 0;
		
		for (var k = 0; k < way.nodes.length; k++)
		{
			lat += way.nodes[k].lat;
			lng += way.nodes[k].lng;
		}
		
		way.centroid = { lat: lat / way.nodes.length, lng: lng / way.nodes.length, x: null, y: null };
	}
	
	
	//<relation id="7340018" visible="true" version="5" changeset="49634068" timestamp="2017-06-18T12:25:36Z" user="FreedSky" uid="1236135">
	//  <member type="node" ref="4922123353" role="admin_centre"/>
	//  <member type="way" ref="501376563" role="outer"/>
	//  <tag>
	
	return osm;
}
export function Combine(osms: Osm[]): Osm {
	
	var big: Osm = { bounds: { minLat: +Infinity, maxLat: -Infinity, minLng: +Infinity, maxLng: -Infinity }, nodes: {}, ways: {} };
	
	for (var i = 0; i < osms.length; i++)
	{
		var osm = osms[i];
		
		big.bounds.minLat = Math.min(big.bounds.minLat, osm.bounds.minLat);
		big.bounds.maxLat = Math.max(big.bounds.maxLat, osm.bounds.maxLat);
		big.bounds.minLng = Math.min(big.bounds.minLng, osm.bounds.minLng);
		big.bounds.maxLng = Math.max(big.bounds.maxLng, osm.bounds.maxLng);
		
		for (var key in osm.nodes)
		{
			big.nodes[key] = osm.nodes[key];
		}
		
		for (var key in osm.ways)
		{
			big.ways[key] = osm.ways[key];
		}
	}
	
	return big;
}
export function DrawOsm(ctx: CanvasRenderingContext2D, osm: Osm): void {
	
	for (var key in osm.ways)
	{
		var way = osm.ways[key];
		
		ctx.moveTo(way.nodes[0].x, way.nodes[0].y);
		
		for (var k = 1; k < way.nodes.length; k++)
		{
			var node = way.nodes[k];
			ctx.lineTo(node.x, node.y);
		}
	}
}
export function DrawLabels(ctx: CanvasRenderingContext2D, osm: Osm): void {
	
	// addr:housenumber
	// addr:street
	// height
	
	for (var key in osm.ways)
	{
		var way = osm.ways[key];
		
		if (way.attrs['addr:housenumber'])
		{
			ctx.fillText(way.attrs['addr:housenumber'], way.centroid.x, way.centroid.y);
		}
	}
}

function CollectNodes(xmls: Xml[]): Dict<Node> {
	
	// this code is the same as what's in MakeOsm, except that it assumes multiple Xml's and duplicate nodes
	// if we did it one at a time, then we'd have to merge the dictionaries
	
	var nodes: Dict<Node> = {};
	
	for (var i = 0; i < xmls.length; i++)
	{
		var osm = xmls[i];
		
		for (var k = 0; k < osm.children.length; k++)
		{
			var child = osm.children[k];
			
			if (child.name == 'node')
			{
				nodes[child.attr('id')] = { lat: parseFloat(child.attr('lat')), lng: parseFloat(child.attr('lon')) };
			}
		}
	}
	
	return nodes;
}
function MakeGeojson(osms: Xml[], nodes: Dict<Node>): any {
	
	var geojson = { type : 'GeometryCollection' , geometries : [] };
	
	var ways = [];
	
	for (var i = 0; i < osms.length; i++)
	{
		var osm = osms[i];
		
		for (var j = 0; j < osm.children.length; j++)
		{
			var way = osm.children[j];
			
			if (way.name == 'way')
			{
				var w = [];
				
				for (var k = 0; k < way.children.length; k++)
				{
					var nd = way.children[k];
					
					if (nd.name == 'nd')
					{
						var node = nodes[nd.attr('ref')];
						if (node) { w.push([node.lng, node.lat]); }
					}
				}
				
				geojson.geometries.push({ type : 'LineString' , coordinates : w });
				
				//ways.push(w);
			}
		}
	}
	
	return geojson;
}

export function Stats(xml: Xml): Dict<number> {
	
	var d = {};
	
	for (var i = 0; i < xml.children.length; i++)
	{
		var c = xml.children[i];
		
		if (!d[c.name]) { d[c.name] = 0; }
		d[c.name]++;
	}
	
	return d;
}
export function Attrs(osm: Osm): Dict<number> {
	
	var d = {};
	
	for (var id in osm.ways)
	{
		var way = osm.ways[id];
		
		for (var key in way.attrs)
		{
			var val = way.attrs[key];
			
			if (!d[key]) { d[key] = 0; }
			d[key]++;
		}
	}
	
	return d;
}

}

