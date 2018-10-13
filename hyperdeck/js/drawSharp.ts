// these draw sharp lines on the canvas (while not affecting the PDF render)
// Math.floor(x, 1)+0.5
// of course, none of these do a bit of good if the canvas is scaled, so these only work if we're rolling our own transformations
drawSharpHorizontal(y: number, x1: number, x2: number): void {
	
	if (this.drawCanvas)
	{
		var ty1 = Math.floor(y)+0.5;
		var ty2 = Math.floor(y)+0.5;
		var tx1 = Math.floor(x1);
		var tx2 = Math.floor(x2);
		
		this.g.beginPath();
		this.g.moveTo(tx1, ty1);
		this.g.lineTo(tx2, ty2);
		this.g.stroke();
	}
	
	if (Canvas.drawPdf)
	{
		PushCommand(this, x1.toString() + ' ' + y.toString() + ' m');
		PushCommand(this, x2.toString() + ' ' + y.toString() + ' l');
		PushCommand(this, 'S');
	}
}
drawSharpVertical(x: number, y1: number, y2: number): void {
	
	if (this.drawCanvas)
	{
		var ty1 = Math.floor(y1);
		var ty2 = Math.floor(y2);
		var tx1 = Math.floor(x)+0.5;
		var tx2 = Math.floor(x)+0.5;
		
		this.g.beginPath();
		this.g.moveTo(tx1, ty1);
		this.g.lineTo(tx2, ty2);
		this.g.stroke();
	}
	
	if (Canvas.drawPdf)
	{
		PushCommand(this, x.toString() + ' ' + y1.toString() + ' m');
		PushCommand(this, x.toString() + ' ' + y2.toString() + ' l');
		PushCommand(this, 'S');
	}
}
drawSharpRect(left: number, top: number, width: number, height: number, doFill: boolean, doStroke: boolean): void {
	
	if (this.drawCanvas)
	{
		var lf = Math.floor(left);
		var tp = Math.floor(top);
		var wd = Math.floor(width);
		var hg = Math.floor(height);
		
		this.g.beginPath();
		this.g.rect(lf, tp, wd, hg);
		if (doFill) { this.g.fill(); }
		if (doStroke) { this.g.stroke(); }
	}
	
	if (Canvas.drawPdf)
	{
		PushCommand(this, left.toString() + ' ' + top.toString() + ' ' + width.toString() + ' ' + height.toString() + ' re');
		if (doFill) { PushCommand(this, 'F'); }
		if (doStroke) { PushCommand(this, 'S'); }
	}
}
