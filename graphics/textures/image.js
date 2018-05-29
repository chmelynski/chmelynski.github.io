
function CutoutTransparency(g) {
	
	function Simple(x, y, color) {
		
		if (color.a == 0)
		{
			return {r:0,g:0,b:0,a:255};
		}
		else if (color.a == 255)
		{
			return {r:255,g:255,b:255,a:255};
		}
		else
		{
			throw new Error();
		}
	}
	
	function Simple2(x, y, color) {
		
		if (color.r == 255 && color.g == 255 && color.b == 255)
		{
			return {r:0,g:0,b:0,a:255};
		}
		else
		{
			return {r:255,g:255,b:255,a:255};
		}
	}
	
	PixelManip(g, Simple2);
}
function FuzzEdges(ctx) {
	
	// a hard boundary between opaque and transparent seems to lead to a gray border around the cutout in the rendered image
	// so let's soften that boundary a bit
	// note that this should happen after the inversion, so that here, opaque=foreground=white and transparent=background=black
	
	var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	for (var y = 1; y < imageData.height - 1; y++) // it's not a huge deal to just cut the edges off the foreground to avoid having to deal with edge cases
	{
		for (var x = 1; x < imageData.width - 1; x++)
		{
			var index = (y * imageData.width + x) * 4;
			
			var r = imageData.data[index + 0];
			var g = imageData.data[index + 1];
			var b = imageData.data[index + 2];
			var a = imageData.data[index + 3];
			
			if (r == 255 && g == 255 && b == 255)
			{
				var transparentNeighbors = 0;
				
				for (var j = -1; j <= 1; j++)
				{
					for (var i = -1; i <= 1; i++)
					{
						var nindex = ((y+j) * imageData.width + (x+i)) * 4;
						
						var nr = imageData.data[nindex + 0];
						var ng = imageData.data[nindex + 1];
						var nb = imageData.data[nindex + 2];
						var na = imageData.data[nindex + 3];
						
						if (nr == 0 && ng == 0 && nb == 0)
						{
							transparentNeighbors++;
						}
					}
				}
				
				if (transparentNeighbors > 0)
				{
					imageData.data[index + 0] = 128;
					imageData.data[index + 1] = 128;
					imageData.data[index + 2] = 128;
				}
			}
		}
	}
	
	ctx.putImageData(imageData, 0, 0);
}

function BlackwhiteDriver(g) {
	
	function Blackwhite(threshold) {
		return function(x, y, color) {
			var sum = color.r + color.g + color.b;
			var c = (sum < threshold) ? 0 : 255;
			return {r:c,g:c,b:c,a:color.a};
		};
	}
	
	function ThreeColor(a, b) {
		return function(x, y, color) {
			var sum = color.r + color.g + color.b;
			var c = (sum < a) ? 0 : (sum < b) ? 128 : 255;
			return {r:c,g:c,b:c,a:color.a};
		};
	}
	
	PixelManip(g, Blackwhite(128 * 3));
	//PixelManip(g, ThreeColor(85 * 3, 170 * 3));
}

function BumpMapDriver(ctx) {
	ctx.fillStyle = 'rgb(128,128,128)';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	PixelManip(ctx, Noise(30));
}



function DisplayRgbaValues(g) {
	
	var imageData = g.getImageData(0, 0, g.canvas.width, g.canvas.height);
	var array = imageData.data;
	
	var lines = [];
	
	for (var y = 0; y < imageData.height; y++)
	{
		var line1 = '';
		var line2 = '';
		var line3 = '';
		var line4 = '';
		
		for (var x = 0; x < imageData.width; x++)
		{
			var index = (y * imageData.width + x) * 4;
			
			var r = array[index + 0].toString();
			var g = array[index + 1].toString();
			var b = array[index + 2].toString();
			var a = array[index + 3].toString();
			
			line1 += '0'.repeat(3 - r.length) + r + ' ';
			line2 += '0'.repeat(3 - g.length) + g + ' ';
			line3 += '0'.repeat(3 - b.length) + b + ' ';
			line4 += '0'.repeat(3 - a.length) + a + ' ';
		}
		
		lines.push(line1);
		lines.push(line2);
		lines.push(line3);
		lines.push(line4);
		lines.push('');
	}
	
	var pre = document.createElement('pre');
	pre.style.position = 'absolute';
	pre.style.top = '100em';
	pre.innerText = lines.join('\r\n');
	document.body.appendChild(pre);
}


// color, displacement, bump - we need functions for all three
// but BrickDisplacement is geared toward displacement only, with little regard for color or bump
// the thing is, we need to abstract the functionality the tells us whether we're in the brick or the mortar (and how deep into the mortar if so)
// then we use that information to determine displacement, color, and bump values


function TileDisplacementDriver(g) {
	g.canvas.width = 501;
	g.canvas.height = 501;
	g.fillStyle = 'rgb(255,255,255)';
	g.fillRect(0, 0, g.canvas.width, g.canvas.height);
	
	var mortarWidth = 10;
	var brickHeight = 90;
	var brickWidth = 90;
	var bStaggerPattern = false;
	
	//PixelManip(g, BrickMortar(brickWidth, brickHeight, mortarWidth, bStaggerPattern, TileDiffuse));
	PixelManip(g, BrickMortar(brickWidth, brickHeight, mortarWidth, bStaggerPattern, TileBump));
	//PixelManip(g, BrickMortar(brickWidth, brickHeight, mortarWidth, bStaggerPattern, TileDisplacement));
}
function BrickDisplacementDriver(g) {
	
	g.fillStyle = 'rgb(255,255,255)';
	g.fillRect(0, 0, g.canvas.width, g.canvas.height);
	
	var mortarWidth = 20;
	var brickHeight = 80;
	var brickWidth = 180;
	var bStaggerPattern = true;
	
	PixelManip(g, BrickMortar(brickWidth, brickHeight, mortarWidth, bStaggerPattern, BrickDisplacement));
}
function BrickMortar(brickWidth, brickHeight, mortarWidth, bStaggerPattern, colorFn) {
	
	return function(x, y, color) {
		var halfBrickWidth = brickWidth / 2;
		var halfMortarWidth = mortarWidth / 2;
		
		// so that the textures align properly at the seams - the corner starts in the middle of the mortar
		x += halfMortarWidth;
		y += halfMortarWidth;
		
		var turns = 2; // dummy value, if (x,y) falls in a depression, then turns will end up in [-1,+1]
		
		if (y % (brickHeight + mortarWidth) < mortarWidth) // test if the y coordinate falls within the mortarWidth, rather than the brickHeight
		{
			// if mortarWidth == 20, then y will be in the range [0,20].  we want to map this to [-1,1].  so subtract 10 => [-10,10] then divide by 10 => [-1,1]
			var candidateTurns = ((y % (brickHeight + mortarWidth)) - halfMortarWidth) / halfMortarWidth; // [-1,1], where 0 is the deepest
			if (Math.abs(candidateTurns) < Math.abs(turns)) { turns = candidateTurns; } // of the values generated by the x and y coordinate, take the turn value closest to 0
		}
		
		var evenOdd = 0;
		if (bStaggerPattern) { evenOdd = Math.floor((y - halfMortarWidth) / (brickHeight + mortarWidth), 1) % 2; } // this is to do the even-odd bricklaying offset
		
		if ((x + evenOdd * halfBrickWidth) % (brickWidth + mortarWidth) < mortarWidth) // add half a brick width to x if we're on an odd brick row
		{
			var candidateTurns = (((x + evenOdd * halfBrickWidth) % (brickWidth + mortarWidth)) - halfMortarWidth) / halfMortarWidth;
			if (Math.abs(candidateTurns) < Math.abs(turns)) { turns = candidateTurns; }
		}
		
		return colorFn(turns);
	};
}

function TileDiffuse(turns) {
	var hemicircle = Math.PI / 2; // use pi/2 to make the depression a full half circle.  use lesser values for shallower depressions
	var sin = Math.sin(Math.PI/2 + turns*hemicircle) - Math.sin(Math.PI/2 - hemicircle); // {-1,0,+1} in turns corresponds to {0,pi/2,pi} in radians (assuming full hemicirle)
	var rgbval = (sin > 0) ? 255 : 128;
	return {r:rgbval,g:rgbval,b:rgbval,a:255};
}
function TileBump(turns) {
	var hemicircle = Math.PI / 2; // use pi/2 to make the depression a full half circle.  use lesser values for shallower depressions
	var sin = Math.sin(Math.PI/2 + turns*hemicircle) - Math.sin(Math.PI/2 - hemicircle); // {-1,0,+1} in turns corresponds to {0,pi/2,pi} in radians (assuming full hemicirle)
	var noise = 30;
	var gray = 128;
	var rgbval = (sin > 0) ? (gray - noise / 2 + Math.floor(Math.random() * noise, 1)) : gray;
	return {r:rgbval,g:rgbval,b:rgbval,a:255};
}
function TileDisplacement(turns) {
	var hemicircle = Math.PI / 4; // use pi/2 to make the depression a full half circle.  use lesser values for shallower depressions
	var sin = Math.sin(Math.PI/2 + turns*hemicircle) - Math.sin(Math.PI/2 - hemicircle); // {-1,0,+1} in turns corresponds to {0,pi/2,pi} in radians (assuming full hemicirle)
	var rgbval = 255 - Math.floor(255 * sin, 1); // at deepest, sin is 1 and rgbval is 0 (black).  at the edges, sin is 0 and rgbval is 255 (white)
	return {r:rgbval,g:rgbval,b:rgbval,a:255};
}
function BrickDisplacement(turns) {
	var hemicircle = Math.PI / 3; // use pi/2 to make the depression a full half circle.  use lesser values for shallower depressions
	var sin = Math.sin(Math.PI/2 + turns*hemicircle) - Math.sin(Math.PI/2 - hemicircle); // {-1,0,+1} in turns corresponds to {0,pi/2,pi} in radians (assuming full hemicirle)
	if (turns > 1) { sin = 0; } // if we make the depression shallower than a hemicircle, we need this
	var rgbval = 255 - Math.floor(255 * sin, 1); // at deepest, sin is 1 and rgbval is 0 (black).  at the edges, sin is 0 and rgbval is 255 (white)
	return {r:rgbval,g:rgbval,b:rgbval,a:255};
}
function RedBrickDiffuse(turns) {
	var hemicircle = Math.PI / 2; // use pi/2 to make the depression a full half circle.  use lesser values for shallower depressions
	var sin = Math.sin(Math.PI/2 + turns*hemicircle) - Math.sin(Math.PI/2 - hemicircle); // {-1,0,+1} in turns corresponds to {0,pi/2,pi} in radians (assuming full hemicirle)
	
	var rbase = 160;
	var gbase = 20;
	var bbase = 20;
	
	var noise = 20; // ah, but this is per-pixel noise and what we want is per-brick noise, which requires knowing which brick this pixel is part of
	
	var r = rbase - noise / 2 + Math.floor(Math.random() * noise, 1);
	var g = gbase - noise / 2 + Math.floor(Math.random() * noise, 1);
	var b = bbase - noise / 2 + Math.floor(Math.random() * noise, 1);
	
	var color = (sin > 0) ? {r:255,g:255,b:255,a:255} : {r:r,g:g,b:b,a:255};
	return color;
}


function Clamp(value, min, max) { if (value < min) { return min; } if (value > max) { return max; } return value; }
// this adds the same value to each RGB component, meaning it varies only along the lightness scale
function Noise(n) {
	
	return function(x, y, color) {
		
		var noise = Math.floor(n * Math.random() - n / 2, 1);
		
		var result = {};
		
		result.r = Clamp(color.r + noise, 0, 255);
		result.g = Clamp(color.g + noise, 0, 255);
		result.b = Clamp(color.b + noise, 0, 255);
		result.a = color.a;
		
		return result;
	};
}
function StitchAndNoise(x, y, color) {
	
	var noise = Math.random() * 30;
	var stitch = 2;
	
	noise += (x % 3 == 0) ? +stitch : -stitch;
	noise += (y % 3 == 0) ? +stitch : -stitch;
	
	var result = {};
	
	result.r = color.r + ((color.r == 0) ? +noise : -noise);
	result.g = color.g + ((color.g == 0) ? +noise : -noise);
	result.b = color.b + ((color.b == 0) ? +noise : -noise);
	result.a = color.a;
	
	return result;
}
function PixelManip(ctx, fn) {
	
	var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	var array = imageData.data;
	
	for (var y = 0; y < imageData.height; y++)
	{
		for (var x = 0; x < imageData.width; x++)
		{
			var index = (y * imageData.width + x) * 4;
			
			var color = {}
			color.r = array[index + 0];
			color.g = array[index + 1];
			color.b = array[index + 2];
			color.a = array[index + 3];
			
			var newcolor = fn(x, y, color);
			
			array[index + 0] = newcolor.r;
			array[index + 1] = newcolor.g;
			array[index + 2] = newcolor.b;
			array[index + 3] = newcolor.a;
		}
	}
	
	ctx.putImageData(imageData, 0, 0);
}

function Crack(imagedata, point, length, dirangle, spreadangle, width, branching) {
	
	// point : { x : 0 , y : 0 }
	// length : 100 (in pixels)
	// vector : { x : 0 , y : 0 }
	// spreadangle : 30 (the possible positions of the next pixel, in degrees)
	// width : 2 (in pixels)
	// branching : 0.10 (% per pixel of a branch)
	
	// the branch goes in a random direction with some randomized multiple of length
	
	var ex = 0;
	var ey = 0;
	
	for (var i = 0; i < length; i++)
	{
		console.log(point.x + ',' + point.y);
		
		for (var sx = -width; sx <= width; sx++)
		{
			for (var sy = -width; sy <= width; sy++)
			{
				var index = ((point.y + sy) * imagedata.width + (point.x + sx)) * 4;
				
				if (index >= 0 && index < imagedata.data.length)
				{
					//var grayscale = Math.floor(Math.random() * (10 + 50 * (Math.abs(sx) * Math.abs(sy))), 1);
					//imagedata.data[index + 0] = grayscale;
					//imagedata.data[index + 1] = grayscale;
					//imagedata.data[index + 2] = grayscale;
					//imagedata.data[index + 3] = 255;
					
					var centerlinex = width - Math.abs(sx);
					var centerliney = width - Math.abs(sy);
					var darkmax = 10 + centerlinex * 20 + centerliney * 20;
					var darkening = Math.floor(Math.random() * darkmax, 1);
					imagedata.data[index + 0] = Math.max(imagedata.data[index + 0] - darkening, 0);
					imagedata.data[index + 1] = Math.max(imagedata.data[index + 1] - darkening, 0);
					imagedata.data[index + 2] = Math.max(imagedata.data[index + 2] - darkening, 0);
					imagedata.data[index + 3] = 255;
				}
			}
		}
		
		var dangle = 2 * Math.random() * spreadangle - spreadangle;
		dirangle += dangle;
		var dx = Math.cos(dirangle / 360 * Math.PI * 2);
		var dy = Math.sin(dirangle / 360 * Math.PI * 2);
		
		if (point.x + ex + dx > point.x + 1)
		{
			point.x++;
			ex += dx - 1;
		}
		else if (point.x + ex + dx < point.x - 1)
		{
			point.x--;
			ex += dx + 1;
		}
		else
		{
			ex += dx;
		}
		
		if (point.y + ey + dy > point.y + 1)
		{
			point.y++;
			ey += dy - 1;
		}
		else if (point.y + ey + dy < point.y - 1)
		{
			point.y--;
			ey += dy + 1;
		}
		else
		{
			ey += dy;
		}
		
		if (width > 0)
		{
			if (Math.random() < branching)
			{
				Crack(imagedata, {x:point.x,y:point.y}, Math.floor((length - i) * Math.random(), 1), Math.random() * 360, spreadangle, width - 1, branching);
			}
		}
	}
	
}

function SmoothBilinear(noise, x, y, wd, hg) {
	
	// top left corner
	var ix = Math.floor(x, 1);
	var iy = Math.floor(y, 1);
	
	// fractional parts
	var fractX = x - ix;
	var fractY = y - iy;
	
	// wrap around
	var x1 = (ix + wd - 0) % wd;
	var x2 = (x1 + wd - 1) % wd;
	var y1 = (iy + hg - 0) % hg;
	var y2 = (y1 + hg - 1) % hg;
	
	//smooth the noise with bilinear interpolation
	var value = 0.0;
	value += fractX       * fractY       * noise[y1 * wd + x1];
	value += (1 - fractX) * fractY       * noise[y1 * wd + x2];
	value += fractX       * (1 - fractY) * noise[y2 * wd + x1];
	value += (1 - fractX) * (1 - fractY) * noise[y2 * wd + x2];
	return value;
}
function SmoothBicubic(noise, x, y, wd, hg) {
	
	// top left corner
	var ix = Math.floor(x);
	var iy = Math.floor(y);
	
	// fractional parts
	var fractX = x - ix;
	var fractY = y - iy;
	
	// wrap around
	var xs = [];
	xs[0] = (ix + wd - 0) % wd;
	xs[1] = (ix + wd - 1) % wd;
	xs[2] = (ix + wd - 2) % wd;
	xs[3] = (ix + wd - 3) % wd;
	var ys = [];
	ys[0] = (iy + hg - 0) % hg;
	ys[1] = (iy + hg - 1) % hg;
	ys[2] = (iy + hg - 2) % hg;
	ys[3] = (iy + hg - 3) % hg;
	
	var values = [];
	
	for (var i = 0; i < 4; i++)
	{
		var l = [];
		
		for (var j = 0; j < 4; j++)
		{
			l.push(noise[ys[j] * wd + xs[i]]);
		}
		
		values.push(l);
	}
	
	function TERP(t, a, b, c, d) { return 0.5 * (c - a + (2.0*a - 5.0*b + 4.0*c - d + (3.0*(b - c) + d - a)*t)*t)*t + b; }
	
	var i0 = TERP(x, values[0][0], values[1][0], values[2][0], values[3][0]);
	var i1 = TERP(x, values[0][1], values[1][1], values[2][1], values[3][1]);
	var i2 = TERP(x, values[0][2], values[1][2], values[2][2], values[3][2]);
	var i3 = TERP(x, values[0][3], values[1][3], values[2][3], values[3][3]);
	var result = TERP(y, i0, i1, i2, i3);
	
	return result;
}
function PerlinNoise(ctx, initialSize, base, multiplier) {
	
	// this is a weird copypasted implementation that i would not have chosen myself
	
	// basically, we generate noise once - noise for each pixel
	// but then some pixels have a greater effect on their quadrants
	// SmoothBilinear and SmoothBicubic are tied to this implementation
	
	var wd = ctx.canvas.width;
	var hg = ctx.canvas.height;
	
	var noise = new Float64Array(wd * hg);
	for (var i = 0; i < noise.length; i++) { noise[i] = Math.random(); }
	
	var imageData = ctx.getImageData(0, 0, wd, hg);
	
	for (var y = 0; y < imageData.height; y++)
	{
		for (var x = 0; x < imageData.width; x++)
		{
			var index = (y * imageData.width + x) * 4;
			
			var value = 0.0;
			var size = initialSize;
			
			while (size >= 1)
			{
				value += SmoothBilinear(noise, x / size, y / size, wd, hg) * size;
				//value += SmoothBicubic(noise, x / size, y / size, wd, hg) * size;
				size /= 2;
			}
			
			var grayscale = Math.floor(base - multiplier / 2 + multiplier * value / initialSize, 1);
			
			imageData.data[index + 0] = grayscale;
			imageData.data[index + 1] = grayscale;
			imageData.data[index + 2] = grayscale;
			imageData.data[index + 3] = 255;
		}
	}
	
	ctx.putImageData(imageData, 0, 0);
}

function NearestInterpolation(samples, wd, hg, buf) {
	
	var k = 0;
	
	for (var i = 0; i < hg; i++)
	{
		for (var j = 0; j < wd; j++)
		{
			var tx = j / wd;
			var ty = i / hg;
			
			buf[k++] = samples[(tx < 0.5 ? 0 : 1) + (ty < 0.5 ? 0 : 2)];
		}
	}
}
function BilinearInterpolation(samples, wd, hg, buf) {
	
}
function BicubicInterpolation(samples, wd, hg, buf) {
	
	// the wd and hg refer to the center square only
	
	// we first interpolate the 4 horizontal rows, then we vertically interpolate the 4 intermediate points
	// 00 01 02 03 -> 0x
	// 10 11 12 13 -> 1x
	// 20 21 22 23 -> 2x
	// 30 31 32 33 -> 3x
	//                |
	//                yx
	
	// to do: pass in an existing Float64Array along with left, top, width, height, and add the results to the existing values - better for perlin noise
	
	function TERP(t, a, b, c, d) { return 0.5 * (c - a + (2.0*a - 5.0*b + 4.0*c - d + (3.0*(b - c) + d - a)*t)*t)*t + b; }
	
	var k = 0;
	
	for (var i = 0; i < hg; i++)
	{
		for (var j = 0; j < wd; j++)
		{
			var tx = j / wd;
			var ty = i / hg;
			
			var x0 = TERP(tx, samples[ 0], samples[ 1], samples[ 2], samples[ 3]);
			var x1 = TERP(tx, samples[ 4], samples[ 5], samples[ 6], samples[ 7]);
			var x2 = TERP(tx, samples[ 8], samples[ 9], samples[10], samples[11]);
			var x3 = TERP(tx, samples[12], samples[13], samples[14], samples[15]);
			
			var xy = TERP(ty, x0, x1, x2, x3);
			
			buf[k++] = xy;
		}
	}
}


