
var Daz = (function () {
	
	function Daz() { }
	
	Daz.ExampleParams = function() {
		
		//var params = {imgWidth:512,bands:null,bandWidth:64};
		//var params = {imgWidth:null,bands:11,bandWidth:100};
		//var params = {imgWidth:1000,bands:25,bandWidth:40,color:'rgb(255,150,50)'};
		var params = {imgWidth:1000,bands:25,bandWidth:40,color:'rgb(40,60,0)'};
		
		var textParams = {};
		//textParams.str = '8230';
		textParams.str = 'INMATE';
		textParams.font = '40pt Impact';
		textParams.textX = params.bandWidth * 17.0; // front
		textParams.textY = params.bandWidth * 12.5; // front
		textParams.textX = params.bandWidth * 7.5; // back
		textParams.textY = params.bandWidth * 10.5; // back
		textParams.textAlign = 'center';
		textParams.textBaseline = 'middle';
		textParams.fillStyle = 'white';
	};
	Daz.TestImage = function(params) {
		
		if (params.bands == null)
		{
			params.bands = params.imgWidth / params.bandWidth;
		}
		
		if (params.bandWidth == null)
		{
			params.bandWidth = params.imgWidth / params.bands;
		}
		
		if (params.imgWidth == null)
		{
			params.imgWidth = params.bands * params.bandWidth;
		}
		
		var bands = params.bands;
		var bandWidth = params.bandWidth;
		var imgWidth = params.imgWidth;
		
		var canvas = document.createElement('canvas');
		canvas.width = imgWidth;
		canvas.height = imgWidth;
		var g = canvas.getContext('2d');
		
		for (var i = 0; i < bands; i++)
		{
			for (var j = 0; j < bands; j++)
			{
				g.fillStyle = ((i+j) % 2 == 0) ? 'gray' : 'white';
				g.fillRect(i*bandWidth, j*bandWidth, bandWidth, bandWidth);
				g.font = '10pt Arial';
				var textX = (i+0.5)*bandWidth;
				var textY = (j+0.5)*bandWidth;
				g.textAlign = 'center';
				g.textBaseline = 'middle';
				g.fillStyle = 'black';
				g.fillText(i+','+j, textX, textY);
			}
		}
		
		return g;
	};
	Daz.StripedCloth = function(params, textParams) {
		
		if (params.bands == null)
		{
			params.bands = params.imgWidth / params.bandWidth;
		}
		
		if (params.bandWidth == null)
		{
			params.bandWidth = params.imgWidth / params.bands;
		}
		
		if (params.imgWidth == null)
		{
			params.imgWidth = params.bands * params.bandWidth;
		}
		
		var bands = params.bands;
		var bandWidth = params.bandWidth;
		var imgWidth = params.imgWidth;
		
		var canvas = document.createElement('canvas');
		canvas.width = imgWidth;
		canvas.height = imgWidth;
		var ctx = canvas.getContext('2d');
		
		for (var i = 0; i < bands; i++)
		{
			ctx.fillStyle = (i % 2 == 0) ? 'black' : 'white';
			ctx.fillRect(0, i * bandWidth, imgWidth, bandWidth);
		}
		
		Daz.ApplyText(ctx, textParams);
		Daz.ApplyCloth(ctx, imgWidth);
		
		return ctx;
	};
	Daz.SolidCloth = function(params, textParams) {
		
		var imgWidth = params.imgWidth;
		
		var canvas = document.createElement('canvas');
		canvas.width = imgWidth;
		canvas.height = imgWidth;
		var ctx = canvas.getContext('2d');
		
		ctx.fillStyle = params.color;
		ctx.fillRect(0, 0, imgWidth, imgWidth);
		
		Daz.ApplyText(ctx, textParams);
		Daz.ApplyCloth(ctx, imgWidth);
		
		return ctx;
	};
	
	Daz.ApplyCloth = function(ctx, imgWidth) {
		
		var imageData = ctx.getImageData(0, 0, imgWidth, imgWidth);
		var array = imageData.data;
		
		for (var y = 0; y < imageData.height; y++)
		{
			for (var x = 0; x < imageData.width; x++)
			{
				var index = (y * imageData.width + x) * 4;
				
				var R = array[index + 0];
				var G = array[index + 1];
				var B = array[index + 2];
				
				var noise = Math.random() * 30;
				var stitch = 2;
				var resultR = 0;
				var resultG = 0;
				var resultB = 0;
				
				noise += (x % 3 == 0) ? +stitch : -stitch;
				noise += (y % 3 == 0) ? +stitch : -stitch;
				
				resultR = R + ((R == 0) ? +noise : -noise);
				resultG = G + ((G == 0) ? +noise : -noise);
				resultB = B + ((B == 0) ? +noise : -noise);
				
				array[index + 0] = resultR;
				array[index + 1] = resultG;
				array[index + 2] = resultB;
			}
		}
		
		ctx.putImageData(imageData, 0, 0);
	};
	Daz.ApplyText = function(ctx, textParams) {
		
		ctx.font = textParams.font;
		ctx.textAlign = textParams.textAlign;
		ctx.textBaseline = textParams.textBaseline;
		ctx.fillStyle = textParams.fillStyle;
		
		ctx.fillText(textParams.str, textParams.textX, textParams.textY);
		//ctx.save();
		//ctx.translate(textParams.textX, textParams.textY);
		//ctx.scale(-1, 1);
		//ctx.fillText(textParams.str, 0, 0);
		//ctx.restore();
	};
	
	
	Daz.AssetLocations = function() {
		
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\Genesis2Female.dsf
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\Morphs\DAZ 3D\Base\(478 files).dsf
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\Morphs\DAZ 3D\Control Rig\(1440 1KB files).dsf
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\Morphs\DAZ 3D\Victoria 6\(a few files).dsf
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\UV Sets\DAZ 3D\Base\Base Female.dsf
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\UV Sets\DAZ 3D\Base\Victoria 5.dsf
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\UV Sets\DAZ 3D\Base\Victoria 6.dsf
		//
		//G2F textures:
		//C:\Users\Public\Documents\My DAZ 3D Library\Runtime\Textures\DAZ\Characters\Genesis2\BaseFemale
		//C:\Users\Public\Documents\My DAZ 3D Library\Runtime\Textures\Freja\G2\Hedvig
		//
		//Morphs:
		//// there are formulas (in a stack-based pseudo lang! - although i only saw simple mults) that change bone center/end points
		//// as well as simple deltas
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\Morphs\Freja\Hedvig
		//C:\Users\Public\Documents\My DAZ 3D Library\data\DAZ 3D\Genesis 2\Female\Morphs\gypsyangel\Parisa
		
		var objs = {};
		objs.g2f = {};
		objs.g2f.geom = 'C:\\Users\\Public\\Documents\\My DAZ 3D Library\\data\\DAZ 3D\\Genesis 2\\Female\\Genesis2Female';
		objs.g2f.uv = '';
	};
	
	// the handcuffs appear to have fewer uv points than vertices, and hence a lot of pvis.  not sure how to deal with this
	
	Daz.Geometry = {};
	
	// Chain() takes 3 parameters:
	// x distance (in cm)
	// y distance (in cm)
	// chain length (in cm)
	// from this, we generate a catenary
	
	Daz.Geometry.Chainlink = function(hr = 1, wr = 1, radius = 0.1, largeSegments = 40, smallSegments = 10) {
		//var cylinder = geometryFunctions.Cylinder(smallSegments);
		// make two copies for top and bottom straight parts
	};
	Daz.Geometry.Torus = function(largeRadius = 1, smallRadius = 0.2, largeSegments = 40, smallSegments = 10) {
		
		// height = y
		// width = x;
		// depth = z
		
		var geometry = new Griddl.Graphics.Mesh(null, largeSegments * smallSegments, largeSegments * smallSegments);
		
		for (var i = 0; i < largeSegments; i++)
		{
			for (var k = 0; k < smallSegments; k++)
			{
				// assume the center of the torus is (0,0,0)
				
				var largeAngleTurns = i / largeSegments;
				var smallAngleTurns = k / smallSegments;
				
				var pointRadius = largeRadius + smallRadius * Math.cos(smallAngleTurns * 2 * Math.PI);
				
				var vertex = new Griddl.Graphics.Vertex();
				var x = pointRadius * Math.cos(largeAngleTurns * 2 * Math.PI);
				var y = pointRadius * Math.sin(largeAngleTurns * 2 * Math.PI);
				var z = smallRadius * Math.sin(smallAngleTurns * 2 * Math.PI);
				vertex.Coordinates = {x:x,y:y,z:z};
				vertex.Normal = new BABYLON.Vector3(0, 0, 0);
				geometry.vertices[i * smallSegments + k] = vertex;
			}
		}
		
		for (var i = 0; i < largeSegments; i++)
		{
			for (var k = 0; k < smallSegments; k++)
			{
				var polygon = new Griddl.Graphics.Polygon();
				polygon.vertices = [];
				
				var ai = (i + 0) % largeSegments;
				var ak = (k + 0) % smallSegments;
				var bi = (i + 0) % largeSegments;
				var bk = (k + 1) % smallSegments;
				var ci = (i + 1) % largeSegments;
				var ck = (k + 0) % smallSegments;
				var di = (i + 1) % largeSegments;
				var dk = (k + 1) % smallSegments;
				
				var a = ai * smallSegments + ak;
				var b = bi * smallSegments + bk;
				var c = ci * smallSegments + ck;
				var d = di * smallSegments + dk;
				
				polygon.vertices.push(geometry.vertices[a]);
				polygon.vertices.push(geometry.vertices[b]);
				polygon.vertices.push(geometry.vertices[d]);
				polygon.vertices.push(geometry.vertices[c]);
				
				geometry.polygons[i * smallSegments + k] = polygon;
			}
		}
		
		return geometry;
	};
	Daz.Geometry.SquareChainlink = function(x = 3, y = 2, z = 1) {
		
		var geometry = new Griddl.Graphics.Mesh();
		geometry.id = 'square-chain-link';
		geometry.uvId = 'square-chain-link-uv';
		
		geometry.vertices = [
			[+x+z,+y+z,+z],
			[+x+z,+y+z,-z],
			[+x+z,-y-z,+z],
			[+x+z,-y-z,-z],
			[-x-z,+y+z,+z],
			[-x-z,+y+z,-z],
			[-x-z,-y-z,+z],
			[-x-z,-y-z,-z],
			[+x-z,+y-z,+z],
			[+x-z,+y-z,-z],
			[+x-z,-y+z,+z],
			[+x-z,-y+z,-z],
			[-x+z,+y-z,+z],
			[-x+z,+y-z,-z],
			[-x+z,-y+z,+z],
			[-x+z,-y+z,-z],
			[+x+z,+y-z,+z],
			[+x+z,+y-z,-z],
			[+x+z,-y+z,+z],
			[+x+z,-y+z,-z],
			[-x-z,+y-z,+z],
			[-x-z,+y-z,-z],
			[-x-z,-y+z,+z],
			[-x-z,-y+z,-z]];
			
		geometry.polygons = [
			[0,2,3,1],
			[4,5,7,6],
			[8,9,11,10],
			[12,14,15,13],
			[0,1,5,4],
			[2,6,7,3],
			[8,12,13,9],
			[10,11,15,14],
			[0,4,20,16],
			[8,10,18,16],
			[20,22,14,12],
			[22,6,2,18],
			[1,17,21,5],
			[17,19,11,9],
			[13,15,23,21],
			[19,3,7,23]];
		
		geometry.uvs = [];
		
		
		geometry.pvi = [];
		
		return geometry;
	};
	Daz.Geometry.Coil = function(length = 5, samplesPerUnitLength = 20) {
		
		var vertices = [];
		var polygons = [];
		
		var barbVertices = [];
		var barbPolygons = [];
		var baseVertices = []
		
		var unitLongitude = 1.0;
		var barbHeight = 0.07;
		var barbPointy = 0.1;
		var longitudinalJitter = 0.6;
		var coilRadius = 1.0;
		var coilRadiusJitter = 0.02;
		var coilRadiusCorrection = 0.01;
		
		var c = 0;
		var longitude = 0;
		var radius = coilRadius;
		
		for (var i = 0; i < length; i++)
		{
			var longitudeOfCurrentCoil = unitLongitude + Math.random() * 2 * longitudinalJitter - longitudinalJitter;
			var longitudinalIncrement = longitudeOfCurrentCoil / samplesPerUnitLength;
			
			// the longitude is now incremental, but the coilradius is not, which means there can be radius kinks between coils
			// somehow we want the coil radius to vary smoothly
			
			for (var j = 0; j < samplesPerUnitLength; j++)
			{
				var turns = i + j / samplesPerUnitLength;
				var radians = turns * Math.PI * 2;
				
				longitude += longitudinalIncrement;
				radius += Math.random() * 2 * coilRadiusJitter - coilRadiusJitter;
				if (radius > coilRadius) { radius -= coilRadiusCorrection; } else { radius += coilRadiusCorrection; }
				
				//var vertex = {};
				//vertex.Coordinates = {x:turns,y:Math.cos(radians),z:Math.sin(radians)};
				//vertex.Normal = new BABYLON.Vector3(0, 0, 0);
				//geometry.vertices[i * samplesPerUnitLength + j] = vertex;
				
				//centerpoints.push({x:turns,y:Math.cos(radians),z:Math.sin(radians)})
				
				var centerpoint = new BABYLON.Vector3(longitude, radius * Math.cos(radians), radius * Math.sin(radians));
				
				// point-by-point random jitter leads to kinky wires - i think jitter should be added the angle/x-coord level
				//var jitter = new BABYLON.Vector3(Math.random() * jitterStrength, Math.random() * jitterStrength, Math.random() * jitterStrength);
				//centerpoint = centerpoint.add(jitter);
				
				var tangent = new BABYLON.Vector3(1, -Math.sin(radians), Math.cos(radians));
				tangent.normalize();
				var normal = new BABYLON.Vector3(0, -Math.cos(radians), -Math.sin(radians));
				normal.normalize();
				var binormal = BABYLON.Vector3.Cross(tangent, normal);
				
				var wireRadius = 0.02;
				
				for (var k = 0; k < 6; k++)
				{
					var phi = k / 6 * Math.PI * 2;
					
					var point = centerpoint.add(normal.scale(Math.cos(phi)).scale(wireRadius)).add(binormal.scale(Math.sin(phi)).scale(wireRadius));
					
					var vertex = {};
					vertex.Coordinates = point;
					vertex.Normal = new BABYLON.Vector3(0, 0, 0);
					vertices.push(vertex);
					
					// double-sided barbs
					//var barbVertex = {};
					//if ((c % 4) == 0)
					//{
					//	barbVertex.Coordinates = point.add(normal.scale(barbHeight)).add(tangent.scale(-barbPointy));
					//}
					//else
					//{
					//	barbVertex.Coordinates = point.add(normal.scale(barbHeight)).add(tangent.scale(barbPointy));
					//}
					//barbVertex.Normal = new BABYLON.Vector3(0, 0, 0);
					//barbVertices.push(barbVertex);
					//baseVertices.push(vertex);
					
					// barbs that alternate sides
					if ((c % 4) == 0 || (c % 4) == 1)
					{
						if (k == 0)
						{
							var barbVertex = {};
							if ((c % 4) == 0)
							{
								barbVertex.Coordinates = point.add(normal.scale(barbHeight)).add(tangent.scale(-barbPointy));
							}
							else
							{
								barbVertex.Coordinates = point.add(normal.scale(barbHeight)).add(tangent.scale(barbPointy));
							}
							barbVertex.Normal = new BABYLON.Vector3(0, 0, 0);
							barbVertices.push(barbVertex);
							baseVertices.push(vertex);
						}
					}
					else
					{
						if (k == 3)
						{
							var barbVertex = {};
							if ((c % 4) == 2)
							{
								barbVertex.Coordinates = point.add(normal.scale(-barbHeight)).add(tangent.scale(-barbPointy));
							}
							else
							{
								barbVertex.Coordinates = point.add(normal.scale(-barbHeight)).add(tangent.scale(barbPointy));
							}
							barbVertex.Normal = new BABYLON.Vector3(0, 0, 0);
							barbVertices.push(barbVertex);
							baseVertices.push(vertex);
						}
					}
				}
				
				c++;
			}
		}
		
		for (var i = 0; i < barbVertices.length; i += 2)
		{
			var barbPolygon = {};
			barbPolygon.vertices = [];
			barbPolygon.vertices.push(barbVertices[i + 0]);
			barbPolygon.vertices.push(baseVertices[i + 0]);
			barbPolygon.vertices.push(baseVertices[i + 1]);
			barbPolygon.vertices.push(barbVertices[i + 1]);
			barbPolygons.push(barbPolygon);
		}
		
		for (var i = 0; i < length * samplesPerUnitLength - 1; i++)
		{
			for (var k = 0; k < 6; k++)
			{
				var polygon = {};
				polygon.vertices = [];
				polygon.vertices.push(vertices[(i + 0) * 6 + ((k + 0) % 6)]);
				polygon.vertices.push(vertices[(i + 0) * 6 + ((k + 1) % 6)]);
				polygon.vertices.push(vertices[(i + 1) * 6 + ((k + 1) % 6)]);
				polygon.vertices.push(vertices[(i + 1) * 6 + ((k + 0) % 6)]);
				polygons.push(polygon);
			}
		}
		
		var geometry = new Griddl.Graphics.Mesh(null, vertices.length, polygons.length);
		geometry.vertices = vertices.concat(barbVertices);
		geometry.polygons = polygons.concat(barbPolygons);
		return geometry;
	};
	
	
	function StraightChain(p1, p2, innerLength) {
		
		var dx = p2.x - p1.x;
		var dy = p2.y - p1.y;
		var dz = p2.z - p1.z;
		var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
		var links = Math.floor(d / innerLength, 1);
		
		var nodes = [];
		
		for (var i = 0; i < links; i++)
		{
			var node = {};
			node.id = 'chain-link-' + i;
			if (i > 0) { node.parent = nodes[i - 1]; } // this is why 'nodes' is needed
			node.geometry = chainlink;
			node.material.push(metal);
			node.transform = {};
			node.transform.rotation = {};
			node.transform.rotation.x = 0;
			node.transform.rotation.y = ((i%2==0)?0:90); // jitter - Math.random() * 40 - 20
			node.transform.rotation.z = 0;
			node.transform.translation = {};
			node.transform.translation.x = p1.x + dx * i / links;
			node.transform.translation.y = p1.y + dy * i / links;
			node.transform.translation.z = p1.z + dz * i / links;
			node.transform.scale = {};
			node.transform.scale.x = 0.1;
			node.transform.scale.y = 0.1;
			node.transform.scale.z = 0.1;
			nodes.push(node);
		}
		
		nodes.forEach(function(x) { dufscene.AddNode(x); });
	}
	function BellyChain() {
		
		// the rotations still need some adjustment based on angle
		
		var nLinks = 65;
		var radius = 16;
		
		for (var i = 0; i < nLinks; i++)
		{
			var angleRad = (i / nLinks) * Math.PI * 2;
			var angleDeg = (i / nLinks) * 360;
			
			// 0 degrees = left, 90 = front, 180 = right side, 270 = back
			// in front and back (where angle is 90/270 and so sin is -1/+1), we pull in the radius (hips are wider than front/back)
			var abssin = Math.abs(Math.sin(angleRad));
			var radiusAdjustment = abssin * abssin * 6; // square the sin to make the curve more square
			var effectiveRadius = radius - radiusAdjustment;
			
			// the links also need to be higher in the back and lower in the front
			var heightAdjustment = -Math.sin(angleRad) * 3;
			
			var node = {};
			node.id = 'chain-link-' + i;
			node.geometry = chainlink;
			node.material.push(metal);
			node.transform = {};
			node.transform.rotation = {};
			node.transform.rotation.x = 90 - angleDeg;
			node.transform.rotation.y = ((i%2==0)?0:90); // jitter - Math.random() * 40 - 20
			node.transform.rotation.z = 90;
			node.transform.translation = {};
			node.transform.translation.x = effectiveRadius * Math.cos(angleRad);
			node.transform.translation.y = 105 + heightAdjustment;
			node.transform.translation.z = effectiveRadius * Math.sin(angleRad) + 1;
			node.transform.scale = {};
			node.transform.scale.x = 0.1;
			node.transform.scale.y = 0.1;
			node.transform.scale.z = 0.1;
			
			dufscene.AddNode(node); // dufscene is a closure
		}
	}
	function HangingChain() {
		
		var chain = new Griddl.Graphics.Node();
		
		for (var i = 0; i < 11; i++)
		{
			var node = {};
			node.id = 'chain-link-' + i;
			node.geometry = chainlink;
			node.material.push(metal);
			node.transform = {};
			node.transform.rotation = {};
			node.transform.rotation.x = 0;
			node.transform.rotation.y = 0;
			node.transform.rotation.z = -Math.cos(i / 10 * Math.PI);
			node.transform.translation = {};
			node.transform.translation.x = i * 1.7;
			node.transform.translation.y = -3 * Math.sin(i / 10 * Math.PI);
			node.transform.translation.z = 0;
			node.transform.scale = {};
			node.transform.scale.x = 0.1;
			node.transform.scale.y = 0.1;
			node.transform.scale.z = 0.1;
		}
	}
	
	function Yard() {
	
		var yardEW = 1000;
		var yardNS = 1000;
		
		var wallLength = 1000; // we'll need two lengths if we want a non-square yard
		var wallHeight = 500;
		var wallThickness = 50;
		
		var wireRadius = wallThickness / 2;
		
		var yard = new Griddl.Graphics.Node();
		
		var wallGeomNS = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(yardNS, wallHeight, wallThickness));
		var wallGeomEW = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(wallThickness, wallHeight, yardEW));
		var wireGeom = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cylinder(12, wallLength, wireRadius));
		
		var wallN = new Griddl.Graphics.Node();
		wallN.label = 'wallN';
		wallN.geometry = wallGeomNS;
		wallN.materials.push(wall);
		wallN.transforms.push(BABYLON.Matrix.Translation(0, 0, yardNS));
		wallN.uv = { hTiles : wallLength / 100 , vTiles : wallHeight / 100 };
		wallN.SetParent(yard);
		
		var wireN = new Griddl.Graphics.Node();
		wireN.label = 'wireN';
		wireN.geometry = wireGeom;
		wireN.materials.push(wire);
		wireN.transforms.push(BABYLON.Matrix.RotationZ(Math.PI / 2));
		wireN.transforms.push(BABYLON.Matrix.Translation(yardEW, wallHeight + wireRadius, 0));
		wireN.uv = { hTiles : 1 , vTiles : 50 };
		wireN.SetParent(wallN);
		
		var wallE = new Griddl.Graphics.Node();
		wallE.label = 'wallE';
		wallE.geometry = wallGeomEW;
		wallE.materials.push(wall);
		wallE.transforms.push(BABYLON.Matrix.Translation(yardEW + wallThickness, 0, 0));
		wallE.uv = { hTiles : wallLength / 100 , vTiles : wallHeight / 100 };
		wallE.SetParent(yard);
		
		var wireE = new Griddl.Graphics.Node();
		wireE.label = 'wireE';
		wireE.geometry = wireGeom;
		wireE.materials.push(wire);
		wireE.transforms.push(BABYLON.Matrix.RotationX(Math.PI / 2));
		wireE.transforms.push(BABYLON.Matrix.Translation(0, wallHeight + wireRadius, wireRadius));
		wireE.uv = { hTiles : 1 , vTiles : 50 };
		wireE.SetParent(wallE);
		
		var wallS = new Griddl.Graphics.Node();
		wallS.label = 'wallS';
		wallS.geometry = wallGeomNS;
		wallS.materials.push(wall);
		wallS.transforms.push(BABYLON.Matrix.Translation(wallThickness, 0, 0));
		wallS.uv = { hTiles : wallLength / 50 , vTiles : wallHeight / 50 };
		wallS.SetParent(yard);
		
		var wireS = new Griddl.Graphics.Node();
		wireS.label = 'wireS';
		wireS.geometry = wireGeom;
		wireS.materials.push(wire);
		wireS.transforms.push(BABYLON.Matrix.RotationZ(Math.PI / 2));
		wireS.transforms.push(BABYLON.Matrix.Translation(yardEW, wallHeight, 0));
		wireS.uv = { hTiles : 1 , vTiles : 50 };
		wireS.SetParent(wallS);
		
		var wallW = new Griddl.Graphics.Node();
		wallW.label = 'wallW';
		wallW.geometry = wallGeomEW;
		wallW.materials.push(wall);
		wallW.transforms.push(BABYLON.Matrix.Translation(0, 0, 0));
		wallW.uv = { hTiles : wallLength / 50 , vTiles : wallHeight / 50 };
		wallW.SetParent(yard);
		
		var wireW = new Griddl.Graphics.Node();
		wireW.label = 'wireW';
		wireW.geometry = wireGeom;
		wireW.materials.push(wire);
		wireW.transforms.push(BABYLON.Matrix.RotationX(Math.PI / 2));
		wireW.transforms.push(BABYLON.Matrix.Translation(0, wallHeight + wireRadius, wireRadius));
		wireW.uv = { hTiles : 1 , vTiles : 50 };
		wireW.SetParent(wallW);
		
		var ground = new Griddl.Graphics.Node();
		ground.label = 'ground';
		ground.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(yardEW, 0, yardNS));
		ground.materials.push(groundMaterial);
		ground.SetParent(yard);
		
		//var sky = new Griddl.Graphics.Node();
		//sky.label = 'sky';
		//sky.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(0, 1000, 1000));
		//sky.materials.push(skyMaterial);
		//sky.transform = {rotation:{x:0,y:135,z:0},translation:{x:-600,y:wallHeight-50,z:600},scale:{x:20,y:10,z:20}};
		//sky.SetParent(yard);
		
		return yard;
	}
	function WallAndWire(x, y, z) {
		
		// this needs to be refactored to work
		
		var wall = new Griddl.Graphics.Node();
		wall.label = 'wall';
		wall.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(x, y, z));
		wall.materials.push(wall);
		wall.transforms.push(BABYLON.Matrix.Translation(0, 0, yardNS));
		wall.uv = { hTiles : wallLength / 100 , vTiles : wallHeight / 100 };
		wall.SetParent(yard);
		
		var wire = new Griddl.Graphics.Node();
		wire.label = 'wireN';
		wire.geometry = wireGeom;
		wire.materials.push(wire);
		wire.transforms.push(BABYLON.Matrix.RotationZ(Math.PI / 2));
		wire.transforms.push(BABYLON.Matrix.Translation(yardEW, wallHeight + wireRadius, 0));
		wire.uv = { hTiles : 1 , vTiles : 50 };
		wire.SetParent(wallN);
		
		return wall;
	}
	
	function Shower() {
		
		var barRadius = 2;
		var spacingBetweenBars = 20;
		var numberOfBarsLengthwise = 30;
		var numberOfBarsWidthwise = 20;
		
		var walkwayWidth = 200;
		
		var cageWidth = numberOfBarsWidthwise * barRadius * 2 + (numberOfBarsWidthwise - 1) * spacingBetweenBars;
		var cageLength = numberOfBarsLengthwise * barRadius * 2 + (numberOfBarsLengthwise - 1) * spacingBetweenBars;
		
		var showerWidth = cageWidth + walkwayWidth; // z
		var showerLength = cageLength + walkwayWidth * 2; // x
		var showerHeight = 400; // y
		
		// North = +z
		// South = -z
		// West = -x;
		// East = +x;
		
		var shower = new Griddl.Graphics.Node();
		
		var wallN = new Griddl.Graphics.Node();
		wallN.label = 'wallN';
		wallN.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(showerLength, showerHeight, 0));
		wallN.materials.push(wall);
		wallN.transforms.push(BABYLON.Matrix.Translation(0, 0, showerWidth));
		wallN.SetParent(shower);
		
		var wallS = new Griddl.Graphics.Node();
		wallS.label = 'wallS';
		wallS.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(showerLength, showerHeight, 0));
		wallS.materials.push(wall);
		wallS.transforms.push(BABYLON.Matrix.Translation(0, 0, 0));
		wallS.SetParent(shower);
		
		var wallE = new Griddl.Graphics.Node();
		wallE.label = 'wallE';
		wallE.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(0, showerHeight, showerWidth));
		wallE.materials.push(wall);
		wallE.transforms.push(BABYLON.Matrix.Translation(showerLength, 0, 0));
		wallE.SetParent(shower);
		
		var wallW = new Griddl.Graphics.Node();
		wallW.label = 'wallW';
		wallW.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(0, showerHeight, showerWidth));
		wallW.materials.push(wall);
		wallW.transforms.push(BABYLON.Matrix.Translation(0, 0, 0));
		wallW.SetParent(shower);
		
		var ceiling = new Griddl.Graphics.Node();
		ceiling.label = 'ceiling';
		ceiling.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(showerLength, 0, showerWidth));
		ceiling.materials.push(wall);
		ceiling.transforms.push(BABYLON.Matrix.Translation(0, showerHeight, 0));
		ceiling.SetParent(shower);
		
		var floor = new Griddl.Graphics.Node();
		floor.label = 'floor';
		floor.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(showerLength, 0, showerWidth));
		floor.materials.push(wall);
		floor.transforms.push(BABYLON.Matrix.Translation(0, 0, 0));
		floor.SetParent(shower);
		
		var bars = new Griddl.Graphics.Node();
		bars.label = 'bars';
		bars.materials.push(metal05);
		bars.SetParent(shower);
		
		var x = walkwayWidth;
		
		for (var i = 0; i < numberOfBarsLengthwise; i++)
		{
			var bar = new Griddl.Graphics.Node();
			bar.label = 'bar';
			bar.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cylinder(8, showerHeight, barRadius));
			bar.transforms.push(BABYLON.Matrix.Translation(x, 0, cageWidth));
			bar.SetParent(bars);
			
			x += spacingBetweenBars + barRadius * 2;
		}
		
		var z = 0;
		for (var i = 0; i < numberOfBarsWidthwise; i++)
		{
			var bar = new Griddl.Graphics.Node();
			bar.label = 'bar';
			bar.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cylinder(8, showerHeight, barRadius));
			bar.transforms.push(BABYLON.Matrix.Translation(walkwayWidth, 0, z));
			bar.SetParent(bars);
			
			z += spacingBetweenBars + barRadius * 2;
		}
		
		var z = 0;
		for (var i = 0; i < numberOfBarsWidthwise; i++)
		{
			var bar = new Griddl.Graphics.Node();
			bar.label = 'bar';
			bar.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cylinder(8, showerHeight, barRadius));
			bar.transforms.push(BABYLON.Matrix.Translation(showerLength - walkwayWidth, 0, z));
			bar.SetParent(bars);
			
			z += spacingBetweenBars + barRadius * 2;
		}
		
		var nCrossbars = 8;
		
		for (var i = 0; i < nCrossbars; i++)
		{
			var crossbar = new Griddl.Graphics.Node();
			crossbar.label = 'crossbar';
			crossbar.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(cageLength, 3, 5));
			crossbar.transforms.push(BABYLON.Matrix.Translation(walkwayWidth, 50 + i * 50, cageWidth));
			crossbar.SetParent(bars);
		}
		
		for (var i = 0; i < nCrossbars; i++)
		{
			var crossbar = new Griddl.Graphics.Node();
			crossbar.label = 'crossbar';
			crossbar.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(5, 3, cageWidth));
			crossbar.transforms.push(BABYLON.Matrix.Translation(walkwayWidth, 50 + i * 50, 0));
			crossbar.SetParent(bars);
		}
		
		for (var i = 0; i < nCrossbars; i++)
		{
			var crossbar = new Griddl.Graphics.Node();
			crossbar.label = 'crossbar';
			crossbar.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(5, 3, cageWidth));
			crossbar.transforms.push(BABYLON.Matrix.Translation(showerLength - walkwayWidth, 50 + i * 50, 0));
			crossbar.SetParent(bars);
		}
		
		return shower;
	}
	
	function Broadway(n) {
		
		var block = new Griddl.Graphics.Node();
		
		var rowR0 = CellRow(n);
		rowR0.label = 'cell-row-right-0';
		rowR0.SetParent(block);
		
		var rowR1 = CellRow(n);
		rowR1.label = 'cell-row-right-1';
		rowR1.transforms.push(BABYLON.Matrix.Translation(0, cellY + 10, 0));
		rowR1.SetParent(block);
		
		var rowL0 = CellRow(n);
		rowL0.label = 'cell-row-left-0';
		rowL0.transforms.push(BABYLON.Matrix.Scaling(1, 1, -1));
		rowL0.transforms.push(BABYLON.Matrix.Translation(0, 0, -400));
		rowL0.SetParent(block);
		
		var rowL1 = CellRow(n);
		rowL1.label = 'cell-row-left-1';
		rowL1.transforms.push(BABYLON.Matrix.Scaling(1, 1, -1));
		rowL1.transforms.push(BABYLON.Matrix.Translation(0, cellY + 10, -400));
		rowL1.SetParent(block);
		
		return block;
	}
	function CellStack(n) {
		
		var block = new Griddl.Graphics.Node();
		
		var catwalkHeight = 10;
		var catwalkWidth = 200;
		var separatorWidth = 10;
		
		var catwalkLength = cellX * n + separatorWidth * (n - 1);
		
		var paddingAboveCells = 200;
		
		var blockLength = catwalkLength;
		var blockHeight = cellY * 2 + catwalkHeight + paddingAboveCells;
		var blockWidth = 600;
		
		var row0 = CellRow(n);
		row0.label = 'cell-row-0';
		row0.SetParent(block);
		
		var row1 = CellRow(n);
		row1.label = 'cell-row-1';
		row1.transforms.push(BABYLON.Matrix.Translation(0, cellY + catwalkHeight, 0));
		row1.SetParent(block);
		
		var nearWall = new Griddl.Graphics.Node();
		nearWall.label = 'nearWall';
		nearWall.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(0, blockHeight, blockWidth));
		nearWall.materials.push(wall);
		nearWall.transforms.push(BABYLON.Matrix.Translation(0, 0, -blockWidth));
		nearWall.SetParent(block);
		
		var farWall = new Griddl.Graphics.Node();
		farWall.label = 'farWall';
		farWall.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(0, blockHeight, blockWidth));
		farWall.materials.push(wall);
		farWall.transforms.push(BABYLON.Matrix.Translation(blockLength, 0, -blockWidth));
		farWall.SetParent(block);
		
		var sideWall = new Griddl.Graphics.Node();
		sideWall.label = 'sideWall';
		sideWall.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(blockLength, blockHeight, 0));
		sideWall.materials.push(wall);
		sideWall.transforms.push(BABYLON.Matrix.Translation(0, 0, -blockWidth));
		sideWall.SetParent(block);
		
		var ceiling = new Griddl.Graphics.Node();
		ceiling.label = 'ceiling';
		ceiling.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(blockLength, 0, blockWidth));
		ceiling.materials.push(wall);
		ceiling.transforms.push(BABYLON.Matrix.Translation(0, blockHeight, -blockWidth));
		ceiling.SetParent(block);
		
		var paddingWallAboveCells = new Griddl.Graphics.Node();
		paddingWallAboveCells.label = 'paddingWallAboveCells';
		paddingWallAboveCells.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(blockLength, paddingAboveCells, 0));
		paddingWallAboveCells.materials.push(wall);
		paddingWallAboveCells.transforms.push(BABYLON.Matrix.Translation(0, blockHeight - paddingAboveCells, 0));
		paddingWallAboveCells.SetParent(block);
		
		var catwalk = new Griddl.Graphics.Node();
		catwalk.label = 'catwalk';
		catwalk.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(catwalkLength, catwalkHeight, catwalkWidth));
		catwalk.materials.push(wall);
		catwalk.transforms.push(BABYLON.Matrix.Translation(0, cellY, -catwalkWidth));
		catwalk.SetParent(block);
		
		for (var i = 0; i <= n; i++)
		{
			var post = new Griddl.Graphics.Node();
			post.label = 'post';
			post.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(5, 100, 5));
			post.materials.push(metal05);
			post.transforms.push(BABYLON.Matrix.Translation((cellX+separatorWidth)*i, 0, 0));
			post.SetParent(catwalk);
		}
		
		for (var i = 0; i < 2; i++)
		{
			var rail = new Griddl.Graphics.Node();
			rail.label = 'rail';
			rail.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(catwalkLength, 5, 5));
			rail.materials.push(metal05);
			rail.transforms.push(BABYLON.Matrix.Translation(0, 50 + i * 50, 0));
			rail.SetParent(catwalk);
		}
		
		return block;
	}
	function CellHall(n) {
		
		var block = new Griddl.Graphics.Node();
		
		var leftrow = CellRow(n);
		leftrow.label = 'cell-row-L';
		//leftrow.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
		leftrow.SetParent(block);
		
		var rightrow = CellRow(n);
		rightrow.label = 'cell-row-R';
		//rightrow.transform = {rotation:{x:0,y:180,z:0},translation:{x:cellX*n,y:0,z:-300},scale:{x:1,y:1,z:1}};
		rightrow.transforms.push(BABYLON.Matrix.RotationYawPitchRoll(180, 0, 0));
		rightrow.transforms.push(BABYLON.Matrix.Translation(cellX*n, 0, -300));
		rightrow.SetParent(block);
		
		var hallfloor = new Griddl.Graphics.Node();
		hallfloor.label = 'hall-floor';
		//hallfloor.geometry = yplane;
		hallfloor.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(n*cellX, 0, 300));
		hallfloor.materials.push(wall);
		//hallfloor.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:-300},scale:{x:n*cellX/100,y:1,z:3}};
		//hallfloor.transforms.push(BABYLON.Matrix.Scaling(n*cellX/100, 1, 3));
		hallfloor.transforms.push(BABYLON.Matrix.Translation(0, 0, -300));
		hallfloor.SetParent(block);
		
		var hallceiling = new Griddl.Graphics.Node();
		hallceiling.label = 'hall-ceiling';
		//hallceiling.geometry = yplane;
		hallceiling.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(n*cellX, 0, 300));
		hallceiling.materials.push(wall);
		//hallceiling.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:300,z:-300},scale:{x:n*cellX/100,y:1,z:3}};
		//hallceiling.transforms.push(BABYLON.Matrix.Scaling(n*cellX/100, 1, 3));
		hallceiling.transforms.push(BABYLON.Matrix.Translation(0, 300, -300));
		hallceiling.SetParent(block);
		
		return block;
	}
	function CellRow(n) {
		
		var row = new Griddl.Graphics.Node();
		
		var separatorWidth = 10;
		var x = 0;
		
		for (var i = 0; i < n; i++)
		{
			var cell = Cell();
			cell.label = 'cell-' + i.toString();
			//cell.transform = {rotation:{x:0,y:0,z:0},translation:{x:cellX*i,y:0,z:0},scale:{x:1,y:1,z:1}};
			cell.transforms.push(BABYLON.Matrix.Translation(x, 0, 0));
			cell.SetParent(row);
			
			x += cellX;
			
			if (i < n - 1)
			{
				var separator = new Griddl.Graphics.Node();
				separator.label = 'separator';
				separator.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(10, cellY, 0));
				separator.materials.push(wall);
				separator.transforms.push(BABYLON.Matrix.Translation(x, 0, 0));
				separator.SetParent(row);
				
				x += separatorWidth;
			}
		}
		
		return row;
	}
	function Cell() {
		
		var cellX = 200;
		var cellY = 250;
		var cellZ = 300;
		
		var cell = new Griddl.Graphics.Node();
		
		var sidewall = new Griddl.Graphics.Node();
		sidewall.label = 'sidewall';
		//sidewall.geometry = xplane;
		sidewall.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(0, cellY, cellZ));
		sidewall.materials.push(wall); // we need to clone the base material and then change the uv tiling
		//sidewall.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:1,y:cellY/100,z:cellZ/100}};
		//sidewall.transforms.push(BABYLON.Matrix.Scaling(1, cellY/100, cellZ/100));
		sidewall.SetParent(cell);
		
		var sidewall2 = new Griddl.Graphics.Node();
		sidewall2.label = 'sidewall2';
		//sidewall2.geometry = xplane;
		sidewall2.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(0, cellY, cellZ));
		sidewall2.materials.push(wall);
		//sidewall2.transform = {rotation:{x:0,y:0,z:0},translation:{x:cellX,y:0,z:0},scale:{x:1,y:cellY/100,z:cellZ/100}};
		//sidewall2.transforms.push(BABYLON.Matrix.Scaling(1, cellY/100, cellZ/100));
		sidewall2.transforms.push(BABYLON.Matrix.Translation(cellX, 0, 0));
		sidewall2.SetParent(cell);
		
		var backwall = new Griddl.Graphics.Node();
		backwall.label = 'backwall';
		//backwall.geometry = zplane;
		backwall.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(cellX, cellY, 0));
		backwall.materials.push(wall);
		//backwall.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:cellZ},scale:{x:cellX/100,y:cellY/100,z:1}};
		//backwall.transforms.push(BABYLON.Matrix.Scaling(cellX/100, cellY/100, 1));
		backwall.transforms.push(BABYLON.Matrix.Translation(0, 0, cellZ));
		backwall.SetParent(cell);
		
		var floor = new Griddl.Graphics.Node();
		floor.label = 'floor';
		//floor.geometry = yplane;
		floor.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(cellX, 0, cellZ));
		floor.materials.push(wall);
		//floor.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:cellX/100,y:1,z:cellZ/100}};
		//floor.transforms.push(BABYLON.Matrix.Scaling(cellX/100, 1, cellZ/100));
		floor.SetParent(cell);
		
		var ceiling = new Griddl.Graphics.Node();
		ceiling.label = 'ceiling';
		//ceiling.geometry = yplane;
		ceiling.geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(cellX, 0, cellZ));
		ceiling.materials.push(wall);
		//ceiling.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:cellY,z:0},scale:{x:cellX/100,y:1,z:cellZ/100}};
		//ceiling.transforms.push(BABYLON.Matrix.Scaling(cellX/100, 1, cellZ/100));
		ceiling.transforms.push(BABYLON.Matrix.Translation(0, cellY, 0));
		ceiling.SetParent(cell);
		
		var bed = new Griddl.Graphics.Node();
		bed.label = 'bed';
		bed.geometry = bedGeom;
		bed.materials.push(metal05);
		//bed.transform = {rotation:{x:0,y:0,z:0},translation:{x:1,y:80,z:20},scale:{x:1,y:1,z:1}};
		bed.transforms.push(BABYLON.Matrix.Translation(1, 80, 20));
		bed.SetParent(cell);
		// pillow
		// mattress
		// blanket
		// chains
		
		var bars = Grill();
		bars.label = 'bars';
		//bars.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
		bars.SetParent(cell);
		
		var door = Grill();
		door.label = 'door';
		//door.transform = {rotation:{x:0,y:0,z:0},translation:{x:cellX/2,y:0,z:0},scale:{x:1,y:1,z:1}};
		door.transforms.push(BABYLON.Matrix.Translation(10, 0, 5)); // cellX/2 to close door fully
		door.SetParent(cell);
		
		return cell;
	}
	function Grill() {
		
		var grill = new Griddl.Graphics.Node();
		
		for (var i = 1; i <= 5; i++)
		{
			var node = new Griddl.Graphics.Node();
			node.label = 'bar-' + i.toString();
			node.geometry = cylinder;
			node.materials.push(metal05);
			//node.transform = {rotation:{x:0,y:0,z:0},translation:{x:i*20,y:0,z:2},scale:{x:1,y:1,z:1}};
			node.transforms.push(BABYLON.Matrix.Translation(i*20, 0, 2));
			node.SetParent(grill);
		}
		
		for (var i = 0; i < 6; i++)
		{
			var node = new Griddl.Graphics.Node();
			node.label = 'crossbar-' + i.toString();
			node.geometry = crossbar;
			node.materials.push(metal05);
			//node.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:i*50,z:0},scale:{x:1,y:1,z:1}};
			node.transforms.push(BABYLON.Matrix.Translation(0, i*50, 0));
			node.SetParent(grill);
		}
		
		var node = new Griddl.Graphics.Node();
		node.label = 'sidebar-L';
		node.geometry = sidebar;
		node.materials.push(metal05);
		//node.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
		node.SetParent(grill);
		
		var node = new Griddl.Graphics.Node();
		node.label = 'sidebar-R';
		node.geometry = sidebar;
		node.materials.push(metal05);
		//node.transform = {rotation:{x:0,y:0,z:0},translation:{x:cellX/2,y:0,z:0},scale:{x:1,y:1,z:1}};
		node.transforms.push(BABYLON.Matrix.Translation(cellX/2, 0, 0));
		node.SetParent(grill);
		
		return grill;
	}
	
	
	// these functions were set up to draw the scene to a bitmap
	function PlaneTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\plane.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane(100, 100, 0));
		
		var material = new Griddl.Graphics.Material();
		material.diffuse = {colorMap:'#wall01'};
		material.bump = {strengthMap:'#bump'};
		
		var node = new Griddl.Graphics.Node(mesh);
		node.materials.push(material);
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		scene.setCameraPosition(300, 50, 300);
		scene.setCameraTarget(50, 50, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function CubeTest() {
		var outfile = 'c:\\users\\adam\\desktop\\cube.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(1, 1, 1));
		var texture = new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync('c:\\users\\adam\\desktop\\texture.bmp')));
		mesh.textures.push(texture);
		var node = new Griddl.Graphics.Node(mesh);
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(node);
		scene.setCameraPosition(4, 4, 5);
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
		//fs.writeFileSync('c:\\users\\adam\\desktop\\download.duf', 'data:text/plain,' + JSON.stringify(scene.Export()));
	}
	function MultiCubeTest() {
		var tex0 = 'c:\\users\\adam\\desktop\\0.bmp';
		var tex1 = 'c:\\users\\adam\\desktop\\1.bmp';
		var tex2 = 'c:\\users\\adam\\desktop\\2.bmp';
		var tex3 = 'c:\\users\\adam\\desktop\\3.bmp';
		var tex4 = 'c:\\users\\adam\\desktop\\4.bmp';
		var tex5 = 'c:\\users\\adam\\desktop\\5.bmp';
		var outfile = 'c:\\users\\adam\\desktop\\scene2.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.MultiCube(1, 1, 1));
		mesh.textures.push(new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(tex0))));
		mesh.textures.push(new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(tex1))));
		mesh.textures.push(new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(tex2))));
		mesh.textures.push(new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(tex3))));
		mesh.textures.push(new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(tex4))));
		mesh.textures.push(new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(tex5))));
		var node = new Griddl.Graphics.Node(mesh);
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(node);
		scene.setCameraPosition(4, 4, 5); // cube
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function TransformedCubeTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\transcube.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		
		var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(1, 1, 1));
		var texture = new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync('c:\\users\\adam\\desktop\\texture.bmp')));
		mesh.textures.push(texture);
		
		var parent = new Griddl.Graphics.Node();
		var node = new Griddl.Graphics.Node(mesh);
		node.transforms.push(BABYLON.Matrix.RotationYawPitchRoll(1, 0, 0));
		//node.transforms.push(BABYLON.Matrix.Translation(0.2, 0, 0));
		node.SetParent(parent);
		
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(parent);
		scene.setCameraPosition(4, 4, 5);
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function CylinderTest() {
		var outfile = 'c:\\users\\adam\\desktop\\cyl.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cylinder(10, 10, 2));
		var texture = new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync('C:\\users\\adam\\desktop\\daz2\\metal02s.bmp')));
		mesh.textures.push(texture);
		var node = new Griddl.Graphics.Node(mesh);
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(node);
		scene.setCameraPosition(50, 50, 10);
		scene.setCameraTarget(0, 5, 0);
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function GrillTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\grill.bmp';
		//Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		//var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cylinder(10, 10, 2));
		//var texture = new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync('C:\\users\\adam\\desktop\\daz2\\metal02s.bmp')));
		//mesh.textures.push(texture);
		
		var node = Models.Grill();
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		scene.setCameraPosition(10, 150, 500);
		scene.setCameraTarget(50, 150, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function CellTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\cell.bmp';
		//Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var node = Models.Cell();
		node.transforms.push(BABYLON.Matrix.Translation(100, 0, 0));
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict; // an image dict is currently incompatible with duf export
		scene.nodes.push(node);
		scene.setCameraPosition(10, 200, -1200);
		scene.setCameraTarget(50, 150, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function CellRowTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\cellrow.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		//Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var node = Models.CellRow(3);
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		scene.setCameraPosition(-100, 300, -1200);
		scene.setCameraTarget(200, 150, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function CellHallTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\cellhall.bmp';
		//Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var node = Models.CellHall(3);
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		scene.setCameraPosition(10, 150, 600);
		scene.setCameraTarget(400, 150, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function CellStackTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\cellstack.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		//Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var n = 10;
		var node = Models.CellStack(n);
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		//scene.setCameraPosition(-300, 150, -800);
		scene.setCameraPosition(-2500, 1000, -1500); // far outside
		scene.setCameraTarget(200 * n, 150, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600 * 3, 400 * 3, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function ShowerTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\shower.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		//Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var node = Models.Shower();
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		//scene.setCameraPosition(-300, 150, -800);
		scene.setCameraPosition(-2500, 1000, -1500); // far outside
		scene.setCameraTarget(200, 150, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600 * 3, 400 * 3, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function YardTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\yard.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		//Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var node = Models.Yard();
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		//scene.setCameraPosition(-300, 150, -800);
		scene.setCameraPosition(-2500, 2000, -3000); // far outside
		scene.setCameraTarget(500, 0, 500);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600 * 3, 400 * 3, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function BroadwayTest() {
		
		var outfile = 'c:\\users\\adam\\desktop\\renders\\broadway.bmp';
		//Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var node = Models.Broadway(3);
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		scene.setCameraPosition(-1000, 150, 200);
		scene.setCameraTarget(1000, 150, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600 * 3, 400 * 3, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function ReadDazFilesTest() {
		
		// see Bree() below for an update on this
		var outfile = 'c:\\users\\adam\\desktop\\scene.svg';
		var g = Griddl.Canvas.NewDocument({type:'svg'});
		g.NewPage({width:600,height:400});
		var geomfile = 'c:\\users\\adam\\desktop\\';
		var uvfile = 'c:\\users\\adam\\desktop\\';
		var mesh = Daz.ReadDazFile(JSON.parse(fs.readFileSync(geomfile,{encoding:'utf-8'})));
		Daz.ReadUvSet(mesh, JSON.parse(fs.readFileSync(uvfile,{encoding:'utf-8'})));
		//mesh.texture = new Griddl.Graphics.Image(ctx);
		var centroid = Griddl.Graphics.Centroid(mesh);
		var scene = new Griddl.Graphics.Scene(new Griddl.Graphics.Node(mesh));
		scene.setCameraPositionVector(centroid.add(new BABYLON.Vector3(1, 1, 150)));
		scene.setCameraTargetVector = centroid;
		g.GenerateDocument();
		fs.writeFileSync(outfile, Griddl.svgOutput);
	}
	function CameraCircleTest() {
		
		var outdir = 'c:\\users\\adam\\desktop\\frames\\';
		
		//Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		//var node = Models.Broadway(2);
		var node = Models.CellStack(10);
		//var node = Models.CellHall(3);
		//var node = Models.Cell();
		
		var scene = new Griddl.Graphics.Scene();
		scene.lights.push(new Griddl.Graphics.Light(new BABYLON.Vector3(0, 0, 0)));
		scene.images = imgdict;
		scene.nodes.push(node);
		
		//var centroid = Griddl.Graphics.Centroid(node);
		//console.log(centroid);
		
		var targetX = 100;
		var targetY = 100; 
		var targetZ = 0;
		var standoff = 2000;
		
		scene.setCameraTarget(targetX, targetY, targetZ);
		
		for (var angleDeg = 0; angleDeg < 370; angleDeg += 10)
		{
			console.log(angleDeg);
			
			var x = targetX + standoff * Math.cos(angleDeg / 360 * Math.PI * 2);
			var y = 500;
			var z = targetZ + standoff * Math.sin(angleDeg / 360 * Math.PI * 2);
			
			scene.setCameraPosition(x, y, z);
			scene.lights[0].position = scene.camera.Position;
			
			var output = new Bmp(600, 400, 4);
			var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
			device.Render(scene);
			fs.writeFileSync(outdir + '0'.repeat(3 - angleDeg.toString().length) + angleDeg.toString() + '.bmp', new Buffer(output.write()));
		}
		
		// how to combine .bmp's into a .gif:
		// C:\Users\adam\Desktop\ImageMagick\convert -delay 10 -loop 0 "C:\Users\adam\Desktop\frames\*.bmp" "C:\Users\adam\Desktop\animated.gif"
	}
	function LightCircleTest() {
		
		var outdir = 'c:\\users\\adam\\desktop\\frames\\';
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane('z'));
		
		var material = new Griddl.Graphics.Material();
		material.diffuse = {colorMap:'#wall01'};
		
		var node = new Griddl.Graphics.Node(mesh);
		node.materials.push(material);
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		scene.setCameraPosition(50, 50, 300);
		scene.setCameraTarget(50, 50, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var radius = 100;
		for (var angleDeg = 0; angleDeg < 370; angleDeg += 10)
		{
			var x = 50 + radius * Math.cos(angleDeg / 360 * Math.PI * 2);
			var y = 50 + radius * Math.sin(angleDeg / 360 * Math.PI * 2);
			var z = 50;
			
			scene.lights[0].position = new BABYLON.Vector3(x, y, z);
			
			var output = new Bmp(600, 400, 4);
			var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
			device.Render(scene);
			fs.writeFileSync(outdir + '0'.repeat(3 - angleDeg.toString().length) + angleDeg.toString() + '.bmp', new Buffer(output.write()));
		}
	}
	
	var breeDir = 'C:\\Users\\Public\\Documents\\My DAZ 3D Library\\Runtime\\Textures\\DAZ\\Characters\\Genesis2\\BaseFemale\\';
	
	function Bree() {
		
		var assetDir = 'c:\\users\\adam\\desktop\\assets\\';
		var g2f = Daz.ReadDazFile(JSON.parse(fs.readFileSync(assetDir + 'g2f.json')));
		Daz.ReadUvSet(g2f, JSON.parse(fs.readFileSync(assetDir + 'uv-g2f.json')));
		Griddl.Graphics.CalculateNormals(g2f);
		
		var outfile = 'c:\\users\\adam\\desktop\\bree.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.POLYGON;
		
		//var mesh = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane('z'));
		
		//var material = new Griddl.Graphics.Material();
		//material.diffuse = {colorMap:'#red'};
		
		// we should actually read the materials in the .duf file
		var node = new Griddl.Graphics.Node(g2f);
		//node.materials.push(material);
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#red'}})); // legs
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#orange'}})); // eyes
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gold'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#lime'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#green'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#sky'}})); // lips
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#blue'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#purple'}}));
		
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#red'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#orange'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gold'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#lime'}})); //head
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#green'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#sky'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#blue'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#purple'}}));
		
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#red'}})); // hands
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#orange'}})); // shoulders
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gold'}})); // neck
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#lime'}})); // waist
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#green'}})); // torso
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#sky'}})); // nipples
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#blue'}})); // forearms
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#purple'}})); // feet
		
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#red'}})); // around eyes
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#orange'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gold'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#lime'}})); // ears
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#green'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#sky'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#blue'}}));
		//node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#purple'}}));
		
		
		var materialGroups = {};
		materialGroups[0] = {part:'legs',map:'bree-limbs'};
		materialGroups[1] = {part:'eyes',map:'bree-eyes'};
		materialGroups[5] = {part:'lips',map:'bree-head'};
		materialGroups[11] = {part:'head',map:'bree-head'};
		materialGroups[16] = {part:'hands',map:'bree-limbs'};
		materialGroups[17] = {part:'shoulders',map:'bree-limbs'};
		materialGroups[18] = {part:'neck',map:'bree-torso'};
		materialGroups[19] = {part:'waist',map:'bree-torso'};
		materialGroups[20] = {part:'torso',map:'bree-torso'};
		materialGroups[21] = {part:'nipples',map:'bree-torso'};
		materialGroups[22] = {part:'forearm',map:'bree-limbs'};
		materialGroups[23] = {part:'feet',map:'bree-limbs'};
		materialGroups[24] = {part:'aroundEyes',map:'bree-head'};
		materialGroups[27] = {part:'ears',map:'bree-torso'};
		for (var i = 0; i < 32; i++)
		{
			if (materialGroups[i])
			{
				node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#' + materialGroups[i].map}}));
			}
			else
			{
				node.materials.push(new Griddl.Graphics.Material({diffuse:{colorMap:'#gray'}}));
			}
		}
		
		
		var imgdir = assetDir;
		var imgdict = {};
		var imgnames = [ 'bree-torso', 'bree-limbs', 'bree-head', 'bree-eyes', 'gray' ];
		//var imgnames = [ 'red', 'orange', 'gold', 'lime', 'green', 'sky', 'blue', 'purple', 'gray' ];
		imgnames.forEach(function(name) { imgdict[name] = new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(imgdir + name + '.bmp'))); });
		
		var scene = new Griddl.Graphics.Scene();
		scene.images = imgdict;
		scene.nodes.push(node);
		scene.setCameraPosition(0, 100, 500);
		scene.setCameraTarget(0, 100, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(400 * 3, 600 * 3, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function Handcuff() {
		
		var assetDir = 'c:\\users\\adam\\desktop\\assets\\';
		var handcuff = Griddl.Graphics.ConvertToBabylon(Daz.ReadObjFile(fs.readFileSync(assetDir + 'handcuffs.obj', {encoding:'utf-8'}).split('\n')));
		//Griddl.Graphics.CalculateNormals(handcuff);
		
		var outfile = 'c:\\users\\adam\\desktop\\handcuff.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.POINT;
		
		var node = new Griddl.Graphics.Node(handcuff);
		
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(node);
		scene.setCameraPosition(0, 1, 1);
		scene.setCameraTarget(0, 0, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function Camisole() {
		
		var assetDir = 'c:\\users\\adam\\desktop\\assets\\';
		var camisole = Daz.ReadDazFile(JSON.parse(fs.readFileSync(assetDir + 'camisole.dsf', {encoding:'utf-8'})));
		var clothing = Daz.ReadDazFile(JSON.parse(fs.readFileSync(assetDir + 'pants.dsf', {encoding:'utf-8'})));
		//Griddl.Graphics.CalculateNormals(clothing);
		
		var outfile = 'c:\\users\\adam\\desktop\\pants.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		
		var node = new Griddl.Graphics.Node(clothing);
		
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(node);
		scene.setCameraPosition(0, 120, 200);
		scene.setCameraTarget(0, 120, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	function Pants() {
		
		var assetDir = 'c:\\users\\adam\\desktop\\assets\\';
		var pants = Daz.ReadDazFile(JSON.parse(fs.readFileSync(assetDir + 'pants.dsf', {encoding:'utf-8'})));
		//Griddl.Graphics.CalculateNormals(clothing);
		
		var outfile = 'c:\\users\\adam\\desktop\\pants.bmp';
		Griddl.Graphics.renderMode = Griddl.Graphics.LINE;
		
		var node = new Griddl.Graphics.Node(pants);
		
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(node);
		scene.setCameraPosition(0, 120, 300);
		scene.setCameraTarget(0, 60, 0);
		scene.lights.push(new Griddl.Graphics.Light({position:scene.camera.Position}));
		
		var output = new Bmp(600, 400, 4);
		var device = new Griddl.Graphics.Device(output, 0, 0, output.width, output.height);
		device.Render(scene);
		fs.writeFileSync(outfile, new Buffer(output.write()));
	}
	
	function CommonObjects() {
		
		//var imgdir = '/C%3A/Users/adam/Desktop/daz2/'; // this is for duf export
		//var imgs = [];
		//imgs.push({id:'sky',url:imgdir+'sky.jpg'});
		//imgs.push({id:'wall01',url:imgdir+'wall01.jpg'});
		//imgs.push({id:'wall02',url:imgdir+'wall02.jpg'});
		//imgs.push({id:'wall03',url:imgdir+'wall03.jpg'});
		//imgs.push({id:'wall04',url:imgdir+'wall04.jpg'});
		//imgs.push({id:'wall05',url:imgdir+'wall05.jpg'});
		//imgs.push({id:'tile-bump', url:imgdir+'tile-bump.png'});
		//imgs.push({id:'tile-displacement', url:imgdir+'tile-displacement.png'});
		//imgs.push({id:'tile-diffuse', url:imgdir+'tile-diffuse.png'});
		//imgs.push({id:'concrete-block-bump', url:imgdir+'concrete-block-bump.png'});
		//imgs.push({id:'concrete-block-displacement', url:imgdir+'concrete-block-displacement.png'});
		//imgs.push({id:'concrete-block-diffuse', url:imgdir+'concrete-block-diffuse.png'});
		//imgs.push({id:'metal01', url:imgdir+'metal01.jpg'});
		//imgs.push({id:'metal02', url:imgdir+'metal02.jpg'});
		//imgs.push({id:'metal03', url:imgdir+'metal03.jpg'});
		//imgs.push({id:'metal04', url:imgdir+'metal04.jpg'});
		//imgs.push({id:'wire-diffuse', url:imgdir+'wire-diffuse-5.png'});
		//imgs.push({id:'wire-transparency', url:imgdir+'wire-transparency-5.png'});
		//imgs.push({id:'ground-bump', url:imgdir+'ground-bump.png'});
		//imgs.push({id:'ground-displacement', url:imgdir+'ground-displacement.png'});
		//imgs.push({id:'ground-diffuse', url:imgdir+'ground-diffuse.png'});
		//imgs.push({id:'sky-ambient', url:imgdir+'sky-ambient.png'});
		
		// this is for reading bitmaps from file
		var imgdir = 'c:\\users\\adam\\desktop\\daz2\\';
		var imgdict = {};
		var imgnames = [ 'wall01', 'metal05', '1', 'gray', 'bump' ];
		imgnames.forEach(function(name) { imgdict[name] = new Griddl.Graphics.Image(Bmp.Read(fs.readFileSync(imgdir + name + '.bmp'))); });
		
		
		
		
		
		var cellX = 200;
		var cellY = 250;
		var cellZ = 300;
		var cylinder = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cylinder(8, cellY, 2)); // 2 could be 1 to make the bars thinner
		var crossbar = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(cellX/2, 3, 5)); // 3 and 5 could be 2 and 4
		var sidebar = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(3, cellY, 5));
		var bedGeom = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Cube(100, 10, 200));
		//var xplane = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane('x'));
		//var yplane = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane('y'));
		//var zplane = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Shapes.Plane('z'));
		//var handcuff = Daz.ReadObjFile(handcuffLH);
		//handcuff.label = 'handcuff';
		//var chainlink = Daz.Geometry.SquareChainlink(5, 10, 1);
		
		// if we use the image library we can refer to images by ids rather than by filenames (file is only read once as well, possibly)
		// in material channels, we use image:'#id', to link to the image library
		// but we can also just put image_file:'foo.png' to just link to the file directly.  the image library is not strictly necessary
		
		// we could just make the id equal to the filename and slurp up the whole folder
		
		var wall = new Griddl.Graphics.Material();
		wall.label = 'wall01';
		wall.diffuse = {colorMap:'#wall01'};
		//concreteBlock.bump = {strength:1,strengthMap:'#concrete-block-bump',min:-0.10,max:0.10};
		//concreteBlock.displacement = {strength:1,strengthMap:'#concrete-block-displacement'};
		
		var wire = new Griddl.Graphics.Material();
		wire.label = 'wire';
		wire.diffuse = {colorMap:'#wire-diffuse'};
		wire.transparency = {strengthMap:'#wire-transparency'};
		
		var groundMaterial = new Griddl.Graphics.Material();
		groundMaterial.label = 'ground';
		groundMaterial.diffuse = {colorMap:'#ground-diffuse'};
		groundMaterial.ambient = {strength:0.2,color:{r:1,g:1,b:1}};
		groundMaterial.bump = {strength:1,strengthMap:'#ground-bump',min:-1,max:1};
		groundMaterial.displacement = {strength:1,strengthMap:'#ground-displacement',min:-20,max:20};
		
		var skyMaterial = new Griddl.Graphics.Material();
		skyMaterial.label = 'sky';
		skyMaterial.diffuse = {colorMap:'#sky-ambient'};
		skyMaterial.ambient = {strength:0.2,color:{r:1,g:1,b:1}};
		//skyMaterial.ambient = {strength:0.2,color:{r:1,g:1,b:1},colorMap:'#sky-ambient'};
		
		var concreteBlock = new Griddl.Graphics.Material();
		concreteBlock.label = 'concrete-block';
		concreteBlock.diffuse = {colorMap:'#concrete-block-diffuse'};
		concreteBlock.bump = {strength:1,strengthMap:'#concrete-block-bump',min:-0.10,max:0.10};
		concreteBlock.displacement = {strength:1,strengthMap:'#concrete-block-displacement'};
		
		var tile = new Griddl.Graphics.Material();
		tile.label = 'tile';
		tile.diffuse = {colorMap:'#tile-diffuse'};
		tile.bump = {strength:1,strengthMap:'#tile-bump'};
		tile.displacement = {strength:1,strengthMap:'#tile-displacement'};
		
		var metal05 = new Griddl.Graphics.Material();
		metal05.label = 'metal05';
		//metal05.diffuse = {strength:1,color:{r:1,g:1,b:1},colorMap:'#metal05'};
		metal05.diffuse = {strength:1,color:{r:1,g:1,b:1},colorMap:'#gray'};
		metal05.specular = {strength:0.5,color:{r:1,g:1,b:1}};
		metal05.ambient = {strength:0.2,color:{r:0.5,g:0.5,b:0.5}};
		metal05.reflection = {strength:0.2,color:{r:1,g:1,b:1}};
		metal05.glossiness = {strength:0.4};
		
		var metal01 = new Griddl.Graphics.Material();
		metal01.label = 'metal01';
		metal01.diffuse = {strength:1,color:{r:1,g:1,b:1},colorMap:'#metal01'};
		metal01.specular = {strength:0.5,color:{r:1,g:1,b:1}};
		metal01.ambient = {strength:0.2,color:{r:0.5,g:0.5,b:0.5}};
		metal01.reflection = {strength:0.2,color:{r:1,g:1,b:1}};
		metal01.glossiness = {strength:0.4};
		
		var node2 = new Griddl.Graphics.Node();
		node2.label = 'shower-wall-back';
		//node2.geometry = zplane;
		node2.material = tile;
		node2.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
		
		//var node3 = new Griddl.Graphics.Node();
		//node3.label = 'chain-link-A';
		//node3.geometry = chainlink;
		//node3.material = metal05;
		//node3.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
		//
		//var node4 = new Griddl.Graphics.Node();
		//node4.label = 'chain-link-B';
		//node4.geometry = chainlink;
		//node4.material = metal05;
		//node4.transform = {rotation:{x:0,y:90,z:0},translation:{x:0,y:8,z:0},scale:{x:1,y:1,z:1}};
		
		var node5 = new Griddl.Graphics.Node();
		node5.label = 'handcuffLH';
		//node5.geometry = handcuff;
		node5.material = metal05;
		node5.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
		
		//dufscene.AddLight({id:'light1',type:'linear_point_light',transform:{translation:{x:0,y:60,z:50}}});
		
	}
	
	// this is the post-April 2016 denovo
	function Plane() {
		
		var geometry = Griddl.Graphics.ConvertToBabylon(Griddl.Graphics.Geometry.Plane(100, 100, 0));
		
		var node = new Griddl.Graphics.Node();
		node.geometries.push(geometry);
		
		var nodeInstance = node.createInstance();
		
		var scene = new Griddl.Graphics.Scene();
		scene.nodes.push(nodeInstance);
		
		var duf = new Griddl.Graphics.Duf();
		duf.node_library.push(node);
		duf.scene = scene;
		
		fs.writeFileSync('c:\\users\\adam\\desktop\\duf.duf', JSON.stringify(duf.exportToJson()));
	}
	function DeNovo() {
		
		var {geometry,uv} = Griddl.Graphics.Geometry.ReadObjFile(handcuffLH);
		
		var duf = new Griddl.Graphics.Duf();
		duf.geometry_library.push(geometry);
		duf.uv_set_library.push(uv);
		
		var node = new Griddl.Graphics.Node();
		node.geometries.push(geometry);
		
		duf.scene = new Griddl.Graphics.Scene();
		//duf.scene.
		
		var json = duf.exportToDaz();
		document.getElementsByTagName('div')[0].innerText = JSON.stringify(json);
		
		// polygon group, polygon material group
	}
	
	return Daz;
})();

if (typeof window === 'undefined') {
	exports.Daz = Daz;
}

// Alt+2

