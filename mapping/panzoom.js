
function Panzoom(ctx, params, inverseProjection, onChange, onFinishChange, onShiftClick) {
	
	var shift = false;
	var ctrl = false;
	var alt = false;
	
	var canvas = ctx.canvas;
	
	canvas.style.cursor = 'move';
	
	canvas.onmousedown = function(mouseDownEvent) {
		
		var ax = mouseDownEvent.offsetX;
		var ay = mouseDownEvent.offsetY;
		
		const anchor = inverseProjection([ax, ay]);
		const anchorAngle = Math.atan2(ay - params.height / 2, ax - params.width / 2);
		const fixedRotation = params.rotation;
		
		if (shift) { onShiftClick(ax, ay, anchor[0], anchor[1]); return; }
		
		canvas.onmousemove = function(mouseMoveEvent) {
			
			var mx = mouseMoveEvent.offsetX;
			var my = mouseMoveEvent.offsetY;
			
			if (ctrl)
			{
				const moverAngle = Math.atan2(my - params.height / 2, mx - params.width / 2);
				params.rotation = fixedRotation + moverAngle - anchorAngle;
			}
			else
			{
				// the below code works because the coordinates of the mover stays almost constant, because the map center is changing along with x,y - so the lng,lat coords returned by invert stays almost constant - which is what we want!  we want the mouse pointer to be fixed to a given coordinate as it moves
				const mover = inverseProjection([mx, my]);
				params.lng += anchor[0] - mover[0];
				params.lat += anchor[1] - mover[1];
			}
			
			onChange();
			
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(ctx.canvas.width / 2 + 0.5, ctx.canvas.height / 2 - 10);
			ctx.lineTo(ctx.canvas.width / 2 + 0.5, ctx.canvas.height / 2 + 10);
			ctx.moveTo(ctx.canvas.width / 2 - 10, ctx.canvas.height / 2 + 0.5);
			ctx.lineTo(ctx.canvas.width / 2 + 10, ctx.canvas.height / 2 + 0.5);
			ctx.stroke();
		};
		canvas.onmouseup = function(mouseUpEvent) {
			
			var ux = mouseUpEvent.offsetX;
			var uy = mouseUpEvent.offsetY;
			
			const cursor = inverseProjection([ux, uy]);
			params.lng += anchor[0] - cursor[0];
			params.lat += anchor[1] - cursor[1];
			
			canvas.onmousemove = null;
			canvas.onmouseup = null;
			
			onFinishChange();
		};
	};
	canvas.onwheel = function(wheelEvent) {
		
		var clicks = -wheelEvent.deltaY / 120;
		
		var log = Math.log10(params.metersPerPixel);
		log += clicks * (shift ? 0.01 : 0.1);
		
		params.metersPerPixel = Math.pow(10, log);
		
		onFinishChange();
	};
	canvas.onkeyup = function(keyUpEvent) {
		
		var key = keyUpEvent.keyCode;
		
		if (key == 16)
		{
			shift = false;
		}
		else if (key == 17)
		{
			ctrl = false;
		}
		else if (key == 18)
		{
			alt = false;
		}
	};
	canvas.onkeydown = function(keyDownEvent) {
		
		var key = keyDownEvent.keyCode;
		
		keyDownEvent.preventDefault();
		keyDownEvent.stopPropagation();
		
		if (key == 16)
		{
			shift = true;
		}
		else if (key == 17)
		{
			ctrl = true;
		}
		else if (key == 18)
		{
			alt = true;
		}
	};
}

