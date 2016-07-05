
(function() {

var xAnchorTranslate = {left:'lf',center:'cx',right:'rt'};
var yAnchorTranslate = {top:'tp',center:'cy',bottom:'bt'};
var xAnchorSign = {left:1,center:1,right:-1};
var yAnchorSign = {top:1,center:1,bottom:-1};

// Box is primarily for top-level, movable widgets.  it should probably not be necessary for sub-widgets
// which means that BarChart should govern the onhover and dehover of its Controls, not the Controls themselves
// a Control won't have an associated Box, of course
var Box = function(obj, hasHandles) {
	
	this.ctx = null; // obj.ctx?
	this.obj = obj;
	
	this.guiFolder = null;
	
	// this is for if the box is a subbox of something else - if it can be dragged along with the parent
	// in that case, the coordinate variables are relative to one of the 9 anchor points of the parent, selected by xAnchor and yAnchor
	this.parent = null; // Box
	this.xAnchor = null; // left,center,right
	this.yAnchor = null; // top,center,bottom
	
	this.subs = [];
	
	this.x = 0;
	this.y = 0;
	this.hAlign = 'center';
	this.vAlign = 'center';
	
	this.lf = 0;
	this.cx = 0;
	this.rt = 0;
	this.wd = 0;
	this.wr = 0;
	this.tp = 0;
	this.cy = 0;
	this.bt = 0;
	this.hg = 0;
	this.hr = 0;
	
	// this is not going be used under the current assumption that a Box is only for top-level, moveable widgets
	this.moveable = false;
	
	this.drawHandles = false;
	this.activeHandle = null;
	this.hoveredHandle = null;
	this.handles = [];
	
	if (hasHandles)
	{
		this.handles.push(new Handle(this, 'left', 'top'));
		this.handles.push(new Handle(this, 'left', 'center'));
		this.handles.push(new Handle(this, 'left', 'bottom'));
		this.handles.push(new Handle(this, 'center', 'top'));
		this.handles.push(new Handle(this, 'center', 'center'));
		this.handles.push(new Handle(this, 'center', 'bottom'));
		this.handles.push(new Handle(this, 'right', 'top'));
		this.handles.push(new Handle(this, 'right', 'center'));
		this.handles.push(new Handle(this, 'right', 'bottom'));
	}
};
Box.prototype.clear = function() {
	var {lf,tp} = this.rootCoordinates();
	this.obj.ctx.clearRect(lf, tp, this.wd, this.hg);
}
Box.prototype.draw = function() {
	
	if (this.drawHandles)
	{
		this.handles.forEach(function(handle) { handle.draw(); });
		
		//debugCtx.clearRect(0, 0, debugCtx.canvas.width, debugCtx.canvas.height);
		//debugCtx.fillRect(0, 0, debugCtx.canvas.width, debugCtx.canvas.height);
		//for (var i = 0; i < 3; i++)
		//{
		//	for (var j = 0; j < 3; j++)
		//	{
		//		var side = this.handles[i * 3 + j].r * 2 + 1;
		//		debugCtx.putImageData(this.handles[i * 3 + j].patch.image, i * side, j * side);
		//	}
		//}
	}
};

Box.prototype.onhover = function() {
	
	//console.log('Box.onhover');
	
	// when we arrive here from an arrow being dehovered, the handles are already drawn.  we can't draw them again, because the saved patch will be the already-drawn handle
	if (!this.drawHandles)
	{
		this.drawHandles = true;
		this.draw();
	}
	
	// Box.onmousemove will check for handles and leaving, and then kick the event over to box.obj
	var box = this;
	this.obj.ctx.canvas.onmousemove = function(e) { box.onmousemove(e); };
};
Box.prototype.dehover = function() {
	this.obj.dehover(); // BarChart.dehover() and Image.dehover() is empty. maybe other Widgets will need to put something there?
	this.drawHandles = false;
	this.handles.forEach(function(handle) { handle.clear(); });
	this.obj.section.onhover();
};
Box.prototype.onmousemove = function(e) {
	
	var {x,y} = this.absoluteToRelative(e.offsetX * this.obj.ctx.cubitsPerPixel, e.offsetY * this.obj.ctx.cubitsPerPixel);
	
	// check for handles before checking for leaving, because the handles extend slightly outside the box bounds
	for (var i = 0; i < this.handles.length; i++)
	{
		var cx = this.handles[i].x;
		var cy = this.handles[i].y;
		var rr = this.handles[i].r * this.handles[i].r;
		
		var dd = (x - cx) * (x - cx) + (y - cy) * (y - cy);
		
		if (dd < rr)
		{
			if (this.hoveredHandle && this.hoveredHandle != this.handles[i])
			{
				this.hoveredHandle.dehover(); // we'll also do the handle dehovering here
			}
			
			this.hoveredHandle = this.handles[i];
			this.handles[i].onhover();
			return;
		}
	}
	
	if (this.hoveredHandle)
	{
		this.hoveredHandle.dehover(); // we'll also do the handle dehovering here
		this.hoveredHandle = null;
	}
	
	if (x < this.lf || x > this.rt || y < this.tp || y > this.bt)
	{
		this.dehover();
		return;
	}
	
	this.obj.onmousemove(e);
};

Box.prototype.rootCoordinates = function() {
	
	var {x,y} = this.relativeToAbsolute(this.lf, this.tp);
	return {lf:x,tp:y};
};
Box.prototype.relativeToAbsolute = function(rx, ry) {
	
	if (this.parent)
	{
		var p = this.parent.relativeToAbsolute(this.parent[xAnchorTranslate[this.xAnchor]], this.parent[yAnchorTranslate[this.yAnchor]]);
		var ax = p.x + rx * xAnchorSign[this.xAnchor];
		var ay = p.y + ry * yAnchorSign[this.yAnchor];
		return {x:ax,y:ay};
	}
	else
	{
		return {x:rx,y:ry};
	}
};
Box.prototype.absoluteToRelative = function(ax, ay) {
	
	if (this.parent)
	{
		var p = this.parent.absoluteToRelative(this.parent[xAnchorTranslate[this.xAnchor]], this.parent[yAnchorTranslate[this.yAnchor]]);
		var rx = ax - xAnchorSign[this.xAnchor] * p.x;
		var ry = ay - yAnchorSign[this.yAnchor] * p.y;
		return {x:rx,y:ry};
	}
	else
	{
		return {x:ax,y:ay};
	}
};

Box.prototype.reconcile = function(params) {
	ReconcileBox(this, params);
	this.reconcileHandles();
};
Box.prototype.reconcileHandles = function() {
	
	// change handle x,y
	if (this.handles.length > 0)
	{
		this.handles[0].x = this.lf;
		this.handles[1].x = this.lf;
		this.handles[2].x = this.lf;
		this.handles[3].x = this.cx;
		this.handles[4].x = this.cx;
		this.handles[5].x = this.cx;
		this.handles[6].x = this.rt;
		this.handles[7].x = this.rt;
		this.handles[8].x = this.rt;
		
		this.handles[0].y = this.tp;
		this.handles[1].y = this.cy;
		this.handles[2].y = this.bt;
		this.handles[3].y = this.tp;
		this.handles[4].y = this.cy;
		this.handles[5].y = this.bt;
		this.handles[6].y = this.tp;
		this.handles[7].y = this.cy;
		this.handles[8].y = this.bt;
		
		var activeIndex = ['left','center','right'].indexOf(this.hAlign) * 3 + ['top','center','bottom'].indexOf(this.vAlign);
		this.activeHandle = this.handles[activeIndex];
		this.activeHandle.active = true;
	}
};
Box.prototype.align = function() {
	
	AlignBox(this);
	this.reconcileHandles();
};
Box.prototype.move = function(dx, dy) {
	
	MoveBox(this, dx, dy);
	this.handles.forEach(function(handle) { handle.x += dx; handle.y += dy; });
	for (var key in this.guiFolder.__controllers) { this.guiFolder.__controllers[key].updateDisplay(); }
};
Box.prototype.changeAlignment = function(hAlign, vAlign) {
	
	this.hAlign = hAlign;
	this.vAlign = vAlign;
	this.resetXY();
};

Box.prototype.resetAnchor = function() {
	
};
Box.prototype.resetXY = function() {
	
	if (this.hAlign == 'left')
	{
		this.x = this.lf;
	}
	else if (this.hAlign == 'center')
	{
		this.x = this.cx;
	}
	else if (this.hAlign == 'right')
	{
		this.x = this.rt;
	}
	else
	{
		throw new Error();
	}
	
	if (this.vAlign == 'top')
	{
		this.y = this.tp;
	}
	else if (this.vAlign == 'center')
	{
		this.y = this.cy;
	}
	else if (this.vAlign == 'bottom')
	{
		this.y = this.bt;
	}
	else
	{
		throw new Error();
	}
	
	for (var key in this.guiFolder.__controllers) { this.guiFolder.__controllers[key].updateDisplay(); }
};

Box.prototype.addElements = function(gui, fieldList) {
	
	var box = this;
	
	var folder = gui.addFolder('box');
	this.guiFolder = folder;
	
	for (var i = 0; i < fieldList.length; i++)
	{
		var field = fieldList[i];
		var control = null;
		
		if (field == 'hAlign')
		{
			control = folder.add(this, field, ['left','center','right']);
			
			control.onChange(function(value) {
				box.resetXY();
				box.align();
				//box.obj.section.draw();
			});
		}
		else if (field == 'vAlign')
		{
			control = folder.add(this, field, ['top','center','bottom']);
			
			control.onChange(function(value) {
				box.resetXY();
				box.align();
				//box.obj.section.draw();
			});
		}
		else if (field == 'xAnchor')
		{
			control = folder.add(this, field, ['left','center','right']);
			
			control.onChange(function(value) {
				box.resetAnchor();
				box.align();
				//box.obj.section.draw();
			});
		}
		else if (field == 'yAnchor')
		{
			control = folder.add(this, field, ['top','center','bottom']);
			
			// this could be a setter on xAnchor
			control.onChange(function(value) {
				box.resetAnchor();
				box.align();
				//box.obj.section.draw();
			});
		}
		else
		{
			control = folder.add(this, field);
			
			control.onChange(function(value) {
				box.align();
				box.obj.section.draw();
			});
		}
	}
};


Box.MakeRoot = function(ctx) {
	
	// this replaces the stuff that Section did before
	
	var box = new Box(null, false);
	box.ctx = ctx;
	box.reconcile({lf:0,wd:ctx.canvas.width,tp:0,hg:ctx.canvas.height});
};
Box.prototype.initHandlers = function() {
	
};

Griddl.Components.AddMarginElements = function(gui, obj, margin) {
	
	var controls = [];
	
	var folder = gui.addFolder('margin');
	controls.push(folder.add(margin, 'top'));
	controls.push(folder.add(margin, 'left'));
	controls.push(folder.add(margin, 'right'));
	controls.push(folder.add(margin, 'bottom'));
	
	controls.forEach(function(control) {
		control.onChange(function(value) {
			obj.section.draw();
		});
	});
};

var Occlude = Box.Occlude = function(boxes, occ) {
	
	var newboxes = [];
	
	for (var i = 0; i < boxes.length; i++)
	{
		var box = boxes[i];
		
		if (occ.lf > box.lf && occ.rt < box.rt && occ.tp > box.tp && occ.bt < box.bt) // 0 edges blocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
			newboxes.push(MakeBox({tp:occ.tp,bt:occ.bt,lf:box.lf,rt:occ.lf})); // lf
			newboxes.push(MakeBox({tp:occ.tp,bt:occ.bt,lf:occ.rt,rt:box.rt})); // rt
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf > box.lf && occ.rt < box.rt && occ.tp > box.tp && occ.bt >= box.bt) // bt edge blocked 
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
			newboxes.push(MakeBox({tp:occ.tp,bt:occ.bt,lf:box.lf,rt:occ.lf})); // lf
			newboxes.push(MakeBox({tp:occ.tp,bt:occ.bt,lf:occ.rt,rt:box.rt})); // rt
		}
		else if (occ.lf > box.lf && occ.rt >= box.rt && occ.tp > box.tp && occ.bt < box.bt) // rt edge blocked 
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
			newboxes.push(MakeBox({tp:occ.tp,bt:occ.bt,lf:box.lf,rt:occ.lf})); // lf
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf <= box.lf && occ.rt < box.rt && occ.tp > box.tp && occ.bt < box.bt) // lf edge blocked 
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
			newboxes.push(MakeBox({tp:occ.tp,bt:occ.bt,lf:occ.rt,rt:box.rt})); // rt
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf > box.lf && occ.rt < box.rt && occ.tp <= box.tp && occ.bt < box.bt) // tp edge blocked 
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.bt,lf:box.lf,rt:occ.lf})); // lf
			newboxes.push(MakeBox({tp:box.tp,bt:occ.bt,lf:occ.rt,rt:box.rt})); // rt
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf > box.lf && occ.rt >= box.rt && occ.tp > box.tp && occ.bt >= box.bt) // rt bt edges bocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
			newboxes.push(MakeBox({tp:occ.tp,bt:box.bt,lf:box.lf,rt:occ.lf})); // bt lf
		}
		else if (occ.lf <= box.lf && occ.rt < box.rt && occ.tp > box.tp && occ.bt >= box.bt) // lf bt edges bocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
			newboxes.push(MakeBox({tp:occ.tp,bt:box.bt,lf:occ.rt,rt:box.rt})); // bt rt
		}
		else if (occ.lf > box.lf && occ.rt >= box.rt && occ.tp <= box.tp && occ.bt < box.bt) // rt tp edges bocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.bt,lf:box.lf,rt:occ.lf})); // tp lf
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf <= box.lf && occ.rt < box.rt && occ.tp <= box.tp && occ.bt < box.bt) // lf tp edges bocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.bt,lf:occ.rt,rt:box.rt})); // tp rt
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf > box.lf && occ.rt < box.rt && occ.tp <= box.tp && occ.bt >= box.bt) // tp bt edges bocked (vertical severance)
		{
			newboxes.push(MakeBox({tp:box.tp,bt:box.bt,lf:box.lf,rt:occ.lf})); // lf
			newboxes.push(MakeBox({tp:box.tp,bt:box.bt,lf:occ.rt,rt:box.rt})); // rt
		}
		else if (occ.lf <= box.lf && occ.rt >= box.rt && occ.tp > box.tp && occ.bt < box.bt) // lf rt edges bocked (horizontal severance)
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf <= box.lf && occ.rt >= box.rt && occ.tp > box.tp && occ.bt >= box.bt) // lf rt bt edges blocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:occ.tp,lf:box.lf,rt:box.rt})); // tp
		}
		else if (occ.lf > box.lf && occ.rt >= box.rt && occ.tp <= box.tp && occ.bt >= box.bt) // tp bt rt edges blocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:box.bt,lf:box.lf,rt:occ.lf})); // lf
		}
		else if (occ.lf <= box.lf && occ.rt < box.rt && occ.tp <= box.tp && occ.bt >= box.bt) // tp bt lf edges blocked
		{
			newboxes.push(MakeBox({tp:box.tp,bt:box.bt,lf:occ.rt.lf,rt:box.rt})); // rt
		}
		else if (occ.lf <= box.lf && occ.rt >= box.rt && occ.tp <= box.tp && occ.bt < box.bt) // lf rt tp edges blocked
		{
			newboxes.push(MakeBox({tp:occ.bt,bt:box.bt,lf:box.lf,rt:box.rt})); // bt
		}
		else if (occ.lf <= box.lf && occ.rt >= box.rt && occ.tp <= box.tp && occ.bt >= box.bt)
		{
			// box is entirely occluded, nothing passes through to newbox
		}
		else
		{
			newboxes.push(box);
		}
	}
	
	return newboxes;
};

// we still need these functions, because it makes sense for some objects (small, nonmoveable ones like controls) to handle their own box-nature
var MakeBox = function(params) {
	
	var box = {};
	AddBoxVars(box);
	ReconcileBox(box, params);
	return box;
};
var AddBoxVars = function(obj) {
	
	obj.lf = 0;
	obj.cx = 0;
	obj.rt = 0;
	obj.wd = 0;
	obj.wr = 0;
	obj.tp = 0;
	obj.cy = 0;
	obj.bt = 0;
	obj.hg = 0;
	obj.hr = 0;
};
var ReconcileBox = function(box, params) {
	
	if (params.lf)
	{
		box.lf = params.lf;
		
		if (params.cx)
		{
			box.cx = params.cx;
			box.wr = box.cx - box.lf;
			box.wd = box.wr * 2;
			box.rt = box.lf + box.wd;
		}
		else if (params.rt)
		{
			box.rt = params.rt;
			box.wd = box.rt - box.lf;
			box.wr = box.wd / 2;
			box.cx = box.lf + box.wr;
		}
		else if (params.wd)
		{
			box.wd = params.wd;
			box.wr = box.wd / 2;
			box.rt = box.lf + box.wd;
			box.cx = box.lf + box.wr;
		}
		else if (params.wr)
		{
			box.wr = params.wr;
			box.wd = box.wr * 2;
			box.rt = box.lf + box.wd;
			box.cx = box.lf + box.wr;
		}
	}
	else if (params.cx)
	{
		box.cx = params.cx;
		
		if (params.rt)
		{
			box.rt = params.rt;
			box.wr = box.rt - box.cx;
			box.wd = box.wr * 2;
			box.lf = box.rt - box.wd;
		}
		else if (params.wd)
		{
			box.wd = params.wd;
			box.wr = box.wd / 2;
			box.rt = box.cx + box.wr;
			box.lf = box.cx - box.wr;
		}
		else if (params.wr)
		{
			box.wr = params.wr;
			box.wd = box.wr * 2;
			box.rt = box.cx + box.wr;
			box.lf = box.cx - box.wr;
		}
	}
	else if (params.rt)
	{
		box.rt = params.rt;
		
		if (params.wd)
		{
			box.wd = params.wd;
			box.wr = box.wd / 2;
			box.lf = box.rt - box.wd;
			box.cx = box.rt - box.wr;
		}
		else if (params.wr)
		{
			box.wr = params.wr;
			box.wd = box.wr * 2;
			box.lf = box.rt - box.wd;
			box.cx = box.rt - box.wr;
		}
	}
	
	if (params.tp)
	{
		box.tp = params.tp;
		
		if (params.cy)
		{
			box.cy = params.cy;
			box.hr = box.cy - box.tp;
			box.hg = box.hr * 2;
			box.bt = box.tp + box.hg;
		}
		else if (params.bt)
		{
			box.bt = params.bt;
			box.hg = box.bt - box.tp;
			box.hr = box.hg / 2;
			box.cy = box.tp + box.hr;
		}
		else if (params.hg)
		{
			box.hg = params.hg;
			box.hr = box.hg / 2;
			box.bt = box.tp + box.hg;
			box.cy = box.tp + box.hr;
		}
		else if (params.hr)
		{
			box.hr = params.hr;
			box.hg = box.hr * 2;
			box.bt = box.tp + box.hg;
			box.cy = box.tp + box.hr;
		}
	}
	else if (params.cy)
	{
		box.cy = params.cy;
		
		if (params.bt)
		{
			box.bt = params.bt;
			box.hr = box.bt - box.cy;
			box.hg = box.hr * 2;
			box.tp = box.bt - box.hg;
		}
		else if (params.hg)
		{
			box.hg = params.hg;
			box.hr = box.hg / 2;
			box.bt = box.cy + box.hr;
			box.tp = box.cy - box.hr;
		}
		else if (params.hr)
		{
			box.hr = params.hr;
			box.hg = box.hr * 2;
			box.bt = box.cy + box.hr;
			box.tp = box.cy - box.hr;
		}
	}
	else if (params.bt)
	{
		box.bt = params.bt;
		
		if (params.hg)
		{
			box.hg = params.hg;
			box.hr = box.hg / 2;
			box.tp = box.bt - box.hg;
			box.cy = box.bt - box.hr;
		}
		else if (params.hr)
		{
			box.hr = params.hr;
			box.hg = box.hr * 2;
			box.tp = box.bt - box.hg;
			box.cy = box.bt - box.hr;
		}
	}
};
var AlignBox = function(box) {
	
	// this assumes that x, y, hAlign, vAlign, wd, hg are set and calculates the others
	
	box.wr = box.wd / 2;
	box.hr = box.hg / 2;
	
	if (box.hAlign == 'left')
	{
		box.lf = box.x;
		box.cx = box.lf + box.wr;
		box.rt = box.lf + box.wd;
	}
	else if (box.hAlign == 'center')
	{
		box.cx = box.x;
		box.lf = box.cx - box.wr;
		box.rt = box.cx + box.wr;
	}
	else if (box.hAlign == 'right')
	{
		box.rt = box.x;
		box.lf = box.rt - box.wd;
		box.cx = box.rt - box.wr;
	}
	else
	{
		throw new Error();
	}
	
	if (box.vAlign == 'top')
	{
		box.tp = box.y;
		box.cy = box.tp + box.hr;
		box.bt = box.tp + box.hg;
	}
	else if (box.vAlign == 'center')
	{
		box.cy = box.y;
		box.tp = box.cy - box.hr;
		box.bt = box.cy + box.hr;
	}
	else if (box.vAlign == 'bottom')
	{
		box.bt = box.y;
		box.tp = box.bt - box.hg;
		box.cy = box.bt - box.hr;
	}
	else
	{
		throw new Error();
	}
};
var MoveBox = function(box, dx, dy) {
	
	box.x += dx;
	box.y += dy;
	box.lf += dx;
	box.cx += dx;
	box.rt += dx;
	box.tp += dy;
	box.cy += dy;
	box.bt += dy;
};
var Drag = function(obj, ax, ay) {
	
	obj.ctx.canvas.onmousemove = function(e) {
		
		var mx = e.offsetX * obj.ctx.cubitsPerPixel;
		var my = e.offsetY * obj.ctx.cubitsPerPixel;
		
		var dx = mx - ax;
		var dy = my - ay;
		
		obj.lf += dx;
		obj.cx += dx;
		obj.rt += dx;
		obj.tp += dy;
		obj.cy += dy;
		obj.bt += dy;
		
		ax = mx;
		ay = my;
		
		obj.draw();
	};
	obj.ctx.canvas.onmouseup = function(e) {
		obj.ctx.canvas.onmousemove = null;
		obj.ctx.canvas.onmouseup = null;
		obj.draw();
	};
};

var Handle = function(box, hAlign, vAlign) {
	
	this.box = box;
	
	this.active = false;
	this.hovered = false;
	
	this.hAlign = hAlign;
	this.vAlign = vAlign;
	
	this.x = null;
	this.y = null;
	this.r = 5;
	
	// used for easy clearing on dehover when the handles don't move - Arrow and other controls should do the same
	// if a handle is selected or moved, then the whole section is probably being redrawn anyway, so we don't have to use patches
	this.patch = null; 
};
Handle.prototype.draw = function() {
	
	//console.log('Handle.draw');
	
	var bx = (this.box.parent ? this.box.parent[this.box.anchorX] : 0);
	var by = (this.box.parent ? this.box.parent[this.box.anchorY] : 0);
	
	var x = bx + this.x;
	var y = by + this.y;
	var r = this.r * this.box.obj.ctx.cubitsPerPixel; // we want the handle radius to be a fixed number of pixels, regardless of scale (although this runs into the problem of screen resolution).  but all the drawing functions expect cubits, so we have to convert to cubits here
	
	// we punch through the Canvas abstraction here - also getImageData and putImageData do not get transformed - they deal with raster pixels
	this.patch = {};
	this.patch.lf = Math.floor((x - r - 1) * this.box.obj.ctx.pixelsPerCubit, 1);
	this.patch.tp = Math.floor((y - r - 1) * this.box.obj.ctx.pixelsPerCubit, 1);
	this.patch.wd = Math.floor((r * 2 + 3) * this.box.obj.ctx.pixelsPerCubit, 1);
	this.patch.hg = Math.floor((r * 2 + 3) * this.box.obj.ctx.pixelsPerCubit, 1);
	this.patch.image = this.box.obj.ctx.g.getImageData(this.patch.lf, this.patch.tp, this.patch.wd, this.patch.hg);
	
	this.box.obj.ctx.g.fillStyle = this.active ? 'rgb(0,128,255)' : (this.hovered ? 'rgb(100,200,255)' : 'rgb(200,200,200)');
	this.box.obj.ctx.g.fillCircle(x + 0.5, y + 0.5, r);
};
Handle.prototype.clear = function() {
	//console.log('Handle.clear');
	this.box.obj.ctx.g.putImageData(this.patch.image, this.patch.lf, this.patch.tp);
};
Handle.prototype.onhover = function() {
	
	// if inactive handle, change color, and change to active handle onmousedown, AND begin drag
	
	
	// during the drag there are basically 4 elements to worry about:
	// Section -> Widget -> Box -> Handle
	// the Section needs facilities for drawing gridlines, and then clearing gridlines (which necessitates a redraw of the entire page)
	// also, this move function needs to be able to access the Section variables that control the gridline spacing, in order to snap correctly
	
	//Debug('Handle.onhover');
	var bx = (this.box.parent ? this.box.parent[xAnchorTranslate[this.box.xAnchor]] : 0);
	var by = (this.box.parent ? this.box.parent[yAnchorTranslate[this.box.yAnchor]] : 0);
	var xSign = xAnchorSign[this.box.xAnchor];
	var ySign = yAnchorSign[this.box.yAnchor];
	
	this.box.obj.ctx.canvas.style.cursor = 'move';
	
	var handle = this;
	
	this.hovered = true;
	this.box.hoveredHandle = this;
	
	this.clear();
	this.draw();
	
	var ctx = this.box.obj.ctx;
	
	this.box.obj.ctx.canvas.onmousedown = function(e) {
		
		// set this handle to active
		handle.box.activeHandle.active = false;
		handle.box.activeHandle.clear();
		handle.box.activeHandle.draw();
		handle.active = true;
		handle.clear();
		handle.draw();
		
		handle.box.activeHandle = handle;
		handle.box.changeAlignment(handle.hAlign, handle.vAlign);
		
		var ax = bx + xSign * handle.x;
		var ay = by + ySign * handle.y;
		
		handle.box.obj.section.drawGridlines();
		
		var gridlineSpacing = handle.box.obj.section.document.snapGrid.gridlineSpacing * handle.box.obj.section.document.pixelsPerUnit;
		
		handle.box.obj.ctx.canvas.onmousemove = function(e) {
			
			var mx = e.offsetX * ctx.cubitsPerPixel;
			var my = e.offsetY * ctx.cubitsPerPixel;
			
			var snapx = Math.floor((mx + gridlineSpacing / 2) / gridlineSpacing, 1) * gridlineSpacing;
			var snapy = Math.floor((my + gridlineSpacing / 2) / gridlineSpacing, 1) * gridlineSpacing;
			
			if (snapx == ax && snapy == ay) { return; }
			
			var dx = snapx - ax;
			var dy = snapy - ay;
			
			ax = snapx;
			ay = snapy;
			
			handle.box.move(dx, dy);
			handle.box.obj.section.draw();
			handle.box.obj.section.drawGridlines();
			handle.box.draw();
		};
		handle.box.obj.ctx.canvas.onmouseup = function(e) {
			
			handle.box.obj.ctx.canvas.onmousemove = function(e) { handle.box.onmousemove(e); };
			handle.box.obj.ctx.canvas.onmouseup = null;
			
			// unclear how this interacts with the page draw below.  should it come before or after?
			handle.box.onmousemove(e);
			
			handle.box.obj.section.draw();
		};
	};
};
Handle.prototype.dehover = function() {
	//Debug('Handle.dehover');
	this.box.obj.ctx.canvas.style.cursor = 'default';
	this.box.hoveredHandle = null;
	this.hovered = false;
	this.clear();
	this.draw();
	this.box.obj.ctx.canvas.onmousedown = null;
};

Griddl.Components.Box = Box;

Griddl.Components.MakeBox = MakeBox;
//Griddl.Components.AddBoxVars = AddBoxVars;
//Griddl.Components.ReconcileBox = ReconcileBox;
//Griddl.Components.AlignBox = AlignBox;
//Griddl.Components.MoveBox = MoveBox;
//Griddl.Components.Drag = Drag;

})();

