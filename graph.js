
(function() {

var Graph = function(json) {
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.text = json.data;
	
	this.ctx = null;
	
	this.section = null;
	
	this.nodes = null;
	this.edges = null;
	
	this.displayControlPoints = false; // toggle this with a control - hopefully this will eliminate the need for node/edge selection
	
	this.box = new Box(this);
	
	//this.read(json.data);
	//this.randomPlacement();
};
Graph.prototype.read = function(text) {
	
	// input should be a text component with lines like a -> b
	
	var lines = text.split('\n');
	
	this.nodes = [];
	this.edges = [];
	
	var nodeDict = {};
	
	for (var i = 0; i < lines.length; i++)
	{
		var parts = lines[i].split(' ');
		var srcName = parts[0];
		var dstName = parts[2];
		
		if (!nodeDict[srcName])
		{
			var src = new Node(this, this.ctx, {label:srcName});
			this.nodes.push(src);
			nodeDict[srcName] = src;
		}
		
		if (!nodeDict[dstName])
		{
			var dst = new Node(this, this.ctx, {label:dstName});
			this.nodes.push(dst);
			nodeDict[dstName] = dst;
		}
		
		this.edges.push(new Edge(this, this.ctx, {src:nodeDict[srcName],dst:nodeDict[dstName]}));
	}
};
Graph.prototype.rankedPlacement = function() {
	
	var squareSideLength = Math.floor(Math.sqrt(this.nodes.length), 1);
	
	var spacing = 50;
	var x = 0;
	var y = 0;
	
	for (var i = 0; i < this.nodes.length; i++)
	{
		this.nodes[i].x = (x+1)*spacing;
		this.nodes[i].y = (y+1)*spacing;
		x++;
		if (x >= squareSideLength) { x = 0; y++; }
	}
};
Graph.prototype.randomPlacement = function() {
	
	var wd = 500;
	var hg = 500;
	
	for (var i = 0; i < this.nodes.length; i++)
	{
		this.nodes[i].x = Math.random() * wd;
		this.nodes[i].y = Math.random() * hg;
	}
};
Graph.prototype.draw = function() {
	
	this.nodes.forEach(function(node) { node.draw(); });
	this.edges.forEach(function(edge) { edge.draw(); });
	
	//for (var i = 0; i < nodes.length; i++)
	//{
	//	var node = nodes[i];
	//	
	//	var x = node.x;
	//	var y = node.y;
	//	var r = 20;
	//	
	//	//g.SetSvgId('node' + i.toString());
	//	g.fillStyle = 'white';
	//	g.strokeStyle = 'black';
	//	g.lineWidth = 2;
	//	g.beginPath();
	//	g.arc(x, y, r, 0, Math.PI * 2, true);
	//	g.fill();
	//	
	//	//g.SetSvgId('label'+i);
	//	g.fillStyle = 'black';
	//	g.strokeStyle = 'black';
	//	g.lineWidth = 0;
	//	g.textAlign = 'center';
	//	g.textBaseline = 'middle';
	//	g.font = '12pt sans-serif';
	//	g.fillText(node.name, x, y);
	//}
};
Graph.prototype.forceDirectedLayout = function(reps) {
	
	// this particular function was for the county population pies - as such, there is a "natural" (x,y) coordinate for each obj
	// this is not implemented yet, but the obj should be attracted to its natural location and repelled by other objects
	// various forms of force-directed layout functions:
	//  1. natural location (no edges) (= attracted to natural coordinates, repulsed from all nearby nodes)
	//   1a. centered (or otherwise clustered) (= attracted to center of graph (or multiple loci of attraction), repulsed from all nearby nodes)
	//  2. graph with edges (= attracted to connected nodes, repulsed from all nearby nodes)
	
	var objs = this.nodes;
	
	for (var rep = 0; rep < reps; rep++)
	{
		var forcess = [];
		
		for (var i = 0; i < objs.length; i++)
		{
			var xA = objs[i].x;
			var yA = objs[i].y;
			var rA = objs[i].r;
			
			var forces = [];
			
			for (var j = 0; j < objs.length; j++)
			{
				if (i == j) { continue; }
				
				var xB = objs[j].x;
				var yB = objs[j].y;
				var rB = objs[j].r;
				
				// quickly discard highly separated nodes, so as to circumvent the heavy sqrt calculation
				if (xA - xB < -100 || xA - xB > 100) { continue; }
				if (yA - yB < -100 || yA - yB > 100) { continue; }
				
				var d = Math.sqrt((xA-xB)*(xA-xB)+(yA-yB)*(yA-yB));
				
				// this culls too much - sometimes nodes that are somewhat widely separated should feel a force, to account for intermediate traffic jams
				//if (d > (rA + rB + 20)) { continue; }
				
				var force = {};
				force.target = objs[i].label;
				force.source = objs[j].label;
				force.angle = -Math.atan2(yB-yA,xB-xA);
				force.readableAngle = force.angle / (Math.PI * 2);
				//force.magnitude = 5;
				force.magnitude = rA + rB - d + 10; // the 10 is the optimum distance between the circles
				forces.push(force);
			}
			
			forcess.push(forces);
		}
		
		for (var i = 0; i < forcess.length; i++)
		{
			var x = objs[i].x;
			var y = objs[i].y;
			
			for (var k = 0; k < forcess[i].length; k++)
			{
				var force = forcess[i][k];
				var dx = force.magnitude * Math.cos(force.angle);
				var dy = force.magnitude * Math.sin(force.angle);
				x -= dx;
				y += dy;
			}
			
			objs[i].x = x;
			objs[i].y = y;
		}
	}
};
Graph.prototype.onhover = function() {
	
	var graph = this;
	graph.ctx.canvas.onmousemove = function(e) {
		
		var x = e.offsetX * this.ctx.cubitsPerPixel;
		var y = e.offsetY * this.ctx.cubitsPerPixel;
		
		for (var i = 0; i < graph.nodes.length; i++)
		{
			if (graph.nodes[i].ishover(x, y)) { graph.nodes[i].onhover(); }
			return;
		}
		
		for (var i = 0; i < graph.edges.length; i++)
		{
			
		}
	};
};
Graph.prototype.dehover = function() {
	
	this.ctx.canvas.onmousemove = null;
};
Graph.prototype.exportToJson = function() {
	
	var json = {};
	json.type = this.type;
	json.name = this.name;
	json.visible = this.visible;
	json.data = this.data;
	json.params = {};
	json.params.x = this.box.x;
	json.params.y = this.box.y;
	json.params.hAlign = this.box.hAlign;
	json.params.vAlign = this.box.vAlign;
	return json;
};
var Node = function(graph, ctx, params) {
	this.graph = graph;
	this.ctx = ctx;
	this.obj = new TextNode(this, ctx, params.label);
};
Node.prototype.draw = function() {
	this.obj.draw();
};
var Edge = function(graph, ctx, params) {
	
	this.graph = graph;
	this.ctx = ctx;
	
	this.src = params.src;
	this.dst = params.dst;
	
	// the reference vector, from which these angles deviate, is the vector from src to dst
	this.cp0 = {distance:0.33,angleDeg:30};
	this.cp1 = {distance:0.66,angleDeg:-30};
	
	// control points and endpoints are Handles
	// endpoints attach (with standoff) to the x,y of a Box, which means that the attach point changes with the box alignment
	
	this.label = '';
	this.labelAnchor = 'cp0-cp1';
	this.labelVector = {distance:5,angleDeg:90};
};
Edge.prototype.draw = function() {
	
	var vector = Geom.Vector(this.src, this.dst);
	Geom.Rotate(vector, this.cp0.angleDeg/360*Math.PI*2);
	Geom.Scale(vector, this.cp0.distance);
	var cp = Geom.Add(this.src, vector);
	this.cp0.x = cp.x;
	this.cp0.y = cp.y;
	
	var vector = Geom.Vector(this.src, this.dst);
	Geom.Rotate(vector, this.cp1.angleDeg/360*Math.PI*2);
	Geom.Scale(vector, this.cp1.distance);
	var cp = Geom.Add(this.src, vector);
	this.cp1.x = cp.x;
	this.cp1.y = cp.y;
	
	var srcStandoffDistance = 25; // this should vary with radius
	var dstStandoffDistance = 25; // this should vary with radius
	var srcStandoffVec = Geom.Vector(this.src, this.cp0);
	var dstStandoffVec = Geom.Vector(this.dst, this.cp1);
	Geom.SetDist(srcStandoffVec, srcStandoffDistance);
	Geom.SetDist(dstStandoffVec, dstStandoffDistance);
	var srcPoint = Geom.Add(this.src, srcStandoffVec);
	var dstPoint = Geom.Add(this.dst, dstStandoffVec);
	
	var ctx = this.ctx;
	
	ctx.strokeStyle = 'black';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(srcPoint.x, srcPoint.y);
	ctx.bezierCurveTo(this.cp0.x, this.cp0.y, this.cp1.x, this.cp1.y, dstPoint.x, dstPoint.y);
	ctx.stroke();
	
	var fletches = CalcFletches([this.src, this.cp0, this.cp1, this.dst]);
	ctx.beginPath();
	ctx.moveTo(dstPoint.x, dstPoint.y);
	ctx.lineTo(dstPoint.x + fletches[2].x, dstPoint.y + fletches[2].y);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(dstPoint.x, dstPoint.y);
	ctx.lineTo(dstPoint.x + fletches[3].x, dstPoint.y + fletches[3].y);
	ctx.stroke();
	
	ctx.fillStyle = 'black';
	ctx.strokeStyle = 'black';
	ctx.lineWidth = 0;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = '10pt sans-serif';
	var labelx = (this.cp0.x + this.cp1.x) / 2;
	var labely = (this.cp0.y + this.cp1.y) / 2;
	ctx.fillText(this.label, labelx, labely);
};
function CalcFletches(pts) {
	
	var fletchLength = 10;
	var fletchDegrees = 30;
	
	var srcFletchVecR = Geom.Vector(pts[0], pts[1]);
	var srcFletchVecL = Geom.Vector(pts[0], pts[1]);
	Geom.RotateDegrees(srcFletchVecR, +fletchDegrees);
	Geom.RotateDegrees(srcFletchVecL, -fletchDegrees);
	Geom.SetDist(srcFletchVecR, fletchLength);
	Geom.SetDist(srcFletchVecL, fletchLength);
	
	var dstFletchVecR = Geom.Vector(pts[3], pts[2]);
	var dstFletchVecL = Geom.Vector(pts[3], pts[2]);
	Geom.RotateDegrees(dstFletchVecR, +fletchDegrees);
	Geom.RotateDegrees(dstFletchVecL, -fletchDegrees);
	Geom.SetDist(dstFletchVecR, fletchLength);
	Geom.SetDist(dstFletchVecL, fletchLength);
	
	return [ srcFletchVecR , srcFletchVecL , dstFletchVecR , dstFletchVecL ];
}
var TextNode = function(node, ctx, text) {
	
	// it would be nice to get rid of this and just use a Text object
	// but we have to give up the backlink to the node
	// so then how does Node keep track of its instantiation?  Object.observe?
	
	this.node = node;
	this.ctx = ctx;
	this.text = text;
};
TextNode.prototype.draw = function() {
	this.ctx.fillText(this.text, this.node.x, this.node.y);
};

Griddl.Components.graph = Graph;

})();


