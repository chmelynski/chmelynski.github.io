
var wireframe = false;

var textures = {};
var textureLoader = new THREE.TextureLoader();

function AddDatGui(mesh, renderFn) {
	
	var obj = {};
	obj.positionX = mesh.position.x;
	obj.positionY = mesh.position.y;
	obj.positionZ = mesh.position.z;
	obj.rotationX = mesh.rotation.x;
	obj.rotationY = mesh.rotation.y;
	obj.rotationZ = mesh.rotation.z;
	
	var positionControls = [];
	var rotationControls = [];
	
	var gui = new dat.GUI();
	positionControls.push(gui.add(obj, 'positionX'));
	positionControls.push(gui.add(obj, 'positionY'));
	positionControls.push(gui.add(obj, 'positionZ'));
	rotationControls.push(gui.add(obj, 'rotationX').min(0).max(2*Math.PI).step(0.01));
	rotationControls.push(gui.add(obj, 'rotationY').min(0).max(2*Math.PI).step(0.01));
	rotationControls.push(gui.add(obj, 'rotationZ').min(0).max(2*Math.PI).step(0.01));
	
	positionControls.forEach(function(control) { control.onChange(function(value) { mesh.position.set(obj.positionX, obj.positionY, obj.positionZ); renderFn(); }); });
	rotationControls.forEach(function(control) { control.onChange(function(value) { mesh.rotation.set(obj.rotationX, obj.rotationY, obj.rotationZ); renderFn(); }); });
}

function LoadTextures(urls, callback) {
	// this uses a reference counting scheme to delay callback firing until all textures have been loaded
	var k = 0;
	urls.forEach(function(url) {
		textureLoader.load(url, function(texture) {
			k++;
			textures[url] = texture;
			if (k == urls.length) { callback(); }
		});
	});
}

function OrbitControls(camera, domElement, renderFn) {
	// unfortunately, placing the orbit controls disables right click, and thus save as png
	var controls = new THREE.OrbitControls(camera, domElement);
	controls.addEventListener('change', renderFn);
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.enableZoom = true;
}

function WallDiffuseTexture(wd, hg, initialSize, base, multiplier) {
	
	// initialSize = how large the color blotches are - larger = more smooth, gradual color change, e.g. 64
	// base = the base color, in grayscale, e.g. 128
	// multiplier = how sharp the color changes are, e.g. 4
	
	var canvas = document.createElement('canvas');
	canvas.width = wd;
	canvas.height = hg;
	
	var ctx = canvas.getContext('2d');
	ctx.fillStyle = 'rgb(128,128,128)';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	PerlinNoise(ctx, initialSize, base, multiplier);
	
	return new THREE.CanvasTexture(canvas);
}
function BumpTexture(wd, hg, noise) {
	
	var bumpCanvas = document.createElement('canvas');
	bumpCanvas.width = wd;
	bumpCanvas.height = hg;
	
	var ctx = bumpCanvas.getContext('2d');
	ctx.fillStyle = 'rgb(128,128,128)';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	PerlinNoise(ctx, 4, 128, 4);
	//PixelManip(ctx, Noise(noise));
	
	return new THREE.CanvasTexture(bumpCanvas);
}
function DisplacementTexture(wd, hg) {
	// in threejs, the displacement map displaces vertices, not the space between vertices - this makes it less useful for us
	var displacementCanvas = document.createElement('canvas');
	displacementCanvas.width = wd;
	displacementCanvas.height = hg;
	var ctx = displacementCanvas.getContext('2d');
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = 'rgb(255,255,255)';
	ctx.fillRect(2, 200, 512, 100);
	//BrickDisplacementDriver(ctx);
	return new THREE.CanvasTexture(displacementCanvas);
}

function WallMaterial(wd, hg) {
	
	var diffuseTexture = WallDiffuseTexture(wd, hg, 64, 128, 16);
	var bumpTexture = BumpTexture(wd, hg, 5);
	
	var options = {};
	options.map = diffuseTexture;
	options.bumpMap = bumpTexture;
	//options.alphaMap = null;
	options.reflectivity = 0; // MeshPhongMaterial
	options.specular = 0x000000; // MeshPhongMaterial
	options.shininess = 0; // MeshPhongMaterial
	
	var material = new THREE.MeshPhongMaterial(options);
	material.wireframe = wireframe;
	material.transparent = true;
	material.side = THREE.DoubleSide;
	return material;
}

var cellX = 200;
var cellY = 250;
var cellZ = 300;
var cylinder = new THREE.CylinderGeometry(2, 2, cellY, 8, 1, true); // 2 could be 1 to make the bars thinner
var crossbar = new THREE.BoxGeometry(cellX/2, 3, 5); // 3 and 5 could be 2 and 4
var sidebar = new THREE.BoxGeometry(3, cellY, 5);
var bedGeom = new THREE.BoxGeometry(100, 10, 200);

var wallMaterial = WallMaterial(512, 512);
//var wallMaterial = new THREE.MeshPhongMaterial(options);

function Broadway(n) {
	
	var broadway = new THREE.Object3D();
	broadway.name = 'broadway';
	
	var rowR0 = CellRow(n);
	rowR0.name = 'rowR0';
	rowR0.position.set(0, 0, 0);
	broadway.add(rowR0);
	
	var rowR1 = CellRow(n);
	rowR1.name = 'rowR1';
	rowR1.position.set(0, cellY + 10, 0);
	broadway.add(rowR1);
	
	var rowL0 = CellRow(n);
	rowL0.name = 'rowL0';
	rowL0.position.set(0, 0, -400);
	broadway.add(rowL0);
	
	var rowL1 = CellRow(n);
	rowL1.name = 'rowL1';
	rowL1.position.set(0, cellY + 10, -400);
	broadway.add(rowL1);
	
	return broadway;
}
function CellStack(n) {
	
	var stack = new THREE.Object3D();
	
	var catwalkHeight = 10;
	var catwalkWidth = 200;
	var separatorWidth = 10;
	
	var catwalkLength = cellX * n + separatorWidth * (n - 1);
	
	var paddingAboveCells = 200;
	
	var blockLength = catwalkLength;
	var blockHeight = cellY * 2 + catwalkHeight + paddingAboveCells;
	var blockWidth = 600;
	
	var row0 = CellRow(n);
	row0.name = 'row0';
	row0.position.set(0, 0, 0);
	stack.add(row0);
	
	var row1 = CellRow(n);
	row1.name = 'row1';
	row1.position.set(0, cellY + catwalkHeight, 0);
	stack.add(row1);
	
	var geometry = new THREE.PlaneGeometry(blockHeight, blockWidth);
	var material = wallMaterial;
	var nearWall = new THREE.Mesh(geometry, material);
	nearWall.name = 'nearWall';
	nearWall.position.set(0, 0, 0);
	stack.add(nearWall);
	
	var geometry = new THREE.PlaneGeometry(blockHeight, blockWidth);
	var material = wallMaterial;
	var farWall = new THREE.Mesh(geometry, material);
	farWall.name = 'farWall';
	farWall.position.set(blockLength, 0, 0);
	stack.add(farWall);
	
	var geometry = new THREE.PlaneGeometry(blockLength, blockHeight);
	var material = wallMaterial;
	var sideWall = new THREE.Mesh(geometry, material);
	sideWall.name = 'sideWall';
	sideWall.position.set(0, 0, 0);
	stack.add(sideWall);
	
	var geometry = new THREE.PlaneGeometry(blockLength, blockWidth);
	var material = wallMaterial;
	var ceiling = new THREE.Mesh(geometry, material);
	ceiling.name = 'ceiling';
	ceiling.position.set(0, blockHeight, 0);
	stack.add(ceiling);
	
	var geometry = new THREE.PlaneGeometry(blockLength, paddingAboveCells);
	var material = wallMaterial;
	var paddingWallAboveCells = new THREE.Mesh(geometry, material);
	paddingWallAboveCells.name = 'paddingWallAboveCells';
	paddingWallAboveCells.position.set(0, blockHeight - paddingAboveCells, 0);
	stack.add(paddingWallAboveCells);
	
	var catwalk = new THREE.Object3D();
	catwalk.name = 'catwalk';
	stack.add(catwalk);
	
	var geometry = new THREE.CubeGeometry(catwalkLength, catwalkHeight, catwalkWidth);
	var material = wallMaterial;
	var catwalkFloor = new THREE.Mesh(geometry, material);
	catwalkFloor.name = 'catwalkFloor';
	catwalkFloor.position.set(0, cellY, -catwalkWidth);
	catwalk.add(catwalkFloor);
	
	var catwalkFence = new THREE.Object3D();
	catwalkFence.name = 'catwalkFence';
	
	for (var i = 0; i <= n; i++)
	{
		var geometry = new THREE.CubeGeometry(5, 100, 5);
		var material = wallMaterial;
		var post = new THREE.Mesh(geometry, material);
		post.name = 'post';
		post.position.set((cellX+separatorWidth)*i, 0, 0);
		catwalkFence.add(post);
	}
	
	for (var i = 0; i < 2; i++)
	{
		var geometry = new THREE.CubeGeometry(catwalkLength, 5, 5);
		var material = wallMaterial;
		var rail = new THREE.Mesh(geometry, material);
		rail.name = 'rail';
		rail.position.set(0, 50 + i * 50, 0);
		catwalkFence.add(rail);
	}
	
	return stack;
}
function CellHall(n) {
	
	var block = new THREE.Object3D();
	
	var leftrow = CellRow(n);
	leftrow.position.set(0, 0, 0);
	block.add(leftrow);
	
	var rightrow = CellRow(n);
	rightrow.position.set(0, cellY, 0);
	block.add(rightrow);
	
	//var geometry = new THREE.PlaneGeometry(cellZ, cellY);
	////var material = new THREE.MeshPhongMaterial({map:null,alphaMap:null});
	//var hallfloor = new THREE.Mesh(geometry, wallMaterial);
	//hallfloor.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:0,z:-300},scale:{x:n*cellX/100,y:1,z:3}};
	//block.add(hallfloor);
	//
	//var geometry = new THREE.PlaneGeometry(cellZ, cellY);
	////var material = new THREE.MeshPhongMaterial({map:null,alphaMap:null});
	//var hallceiling = new THREE.Mesh(geometry, wallMaterial);
	//hallceiling.transform = {rotation:{x:0,y:0,z:0},translation:{x:0,y:300,z:-300},scale:{x:n*cellX/100,y:1,z:3}};
	//block.add(hallceiling);
	
	return block;
};
function CellRow(n) {
	
	var row = new THREE.Object3D();
	
	for (var i = 0; i < n; i++)
	{
		var cell = Cell();
		cell.position.set(cellX*i, 0, 0);
		row.add(cell);
	}
	
	return row;
}
function Cell() {
	
	var cell = new THREE.Object3D();
	
	//PlaneGeometry takes widthSegments, heightSegments params, could be useful for introducing a displacement map
	
	// planes are centered at the origin and extend in the X-Y direction
	
	var geometry = new THREE.PlaneGeometry(cellZ, cellY);
	var material = wallMaterial;
	var sidewall = new THREE.Mesh(geometry, material);
	sidewall.rotateY(Math.PI/2);
	sidewall.position.set(0, cellY/2, -cellZ/2);
	cell.add(sidewall);
	
	var geometry = new THREE.PlaneGeometry(cellZ, cellY);
	var material = wallMaterial;
	var sidewall2 = new THREE.Mesh(geometry, material);
	sidewall2.rotateY(Math.PI/2);
	sidewall2.position.set(cellX, cellY/2, -cellZ/2);
	cell.add(sidewall2);
	
	var geometry = new THREE.PlaneGeometry(cellX, cellY);
	var material = wallMaterial;
	var backwall = new THREE.Mesh(geometry, material);
	backwall.position.set(cellX/2, cellY/2, -cellZ);
	cell.add(backwall);
	
	var geometry = new THREE.PlaneGeometry(cellX, cellZ);
	var material = wallMaterial;
	var floor = new THREE.Mesh(geometry, material);
	floor.rotateX(Math.PI/2);
	floor.position.set(cellX/2, 0, -cellZ/2);
	cell.add(floor);
	
	var geometry = new THREE.PlaneGeometry(cellX, cellZ);
	var material = wallMaterial;
	var ceiling = new THREE.Mesh(geometry, material);
	ceiling.rotateX(Math.PI/2);
	ceiling.position.set(cellX/2, cellY, -cellZ/2);
	cell.add(ceiling);
	
	var geometry = bedGeom;
	var material = new THREE.MeshPhongMaterial({color:0x888888});
	var bed = new THREE.Mesh(geometry, material);
	bed.position.set(150, 80, -150);
	cell.add(bed);
	// pillow
	// mattress
	// blanket
	// chains
	
	var bars = Grill();
	bars.position.set(0, 0, 0);
	cell.add(bars);
	
	var door = Grill();
	door.position.set(cellX/4, 0, 0);
	cell.add(door);
	
	var light = new THREE.PointLight(0xffffff, 1, 250);
	light.position.set(cellX/2, cellY-20, -cellZ/2);
	cell.add(light);
	
	return cell;
}
function Grill() {
	
	var grill = new THREE.Object3D();
	
	var material = new THREE.MeshPhongMaterial({color:0xCCCCCC});
	
	for (var i = 1; i <= 5; i++)
	{
		var bar = new THREE.Mesh(cylinder, material);
		bar.position.set(i*20, cellY/2, 0);
		grill.add(bar);
	}
	
	for (var i = 0; i < 6; i++)
	{
		var cross = new THREE.Mesh(crossbar, material);
		cross.position.set(cellX/4, i*50, 0);
		grill.add(cross);
	}
	
	var sidebarL = new THREE.Mesh(sidebar, material);
	sidebarL.position.set(0, cellY/2, 0);
	grill.add(sidebarL);
	
	var sidebarR = new THREE.Mesh(sidebar, material);
	sidebarR.position.set(cellX/2, cellY/2, 0);
	grill.add(sidebarR);
	
	return grill;
}

function MakeCutout(wd, hg, diffuse, transparency) {
	var geometry = new THREE.PlaneGeometry(wd, hg);
	var material = new THREE.MeshLambertMaterial({map:textureDict[diffuse],alphaMap:textureDict[transparency]});
	material.transparent = true;
	var plane = new THREE.Mesh(geometry, material);
	return plane;
}

