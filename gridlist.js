
(function() {

var Gridlist = function(ctx, data, keys) {
	
	// should we have a separate Element class (or Row or what have you) to handle the expand/collapse controls?
	
	this.ctx = ctx;
	this.data = data;
	
	this.fields = null;
	this.childField = 'subs'; // should we make this an argument to the constructor or something?
	
	if (keys)
	{
		this.fields = keys;
	}
	else
	{
		this.fields = [];
		var fieldDict = {};
		for (var i = 0; i < this.data.length; i++)
		{
			for (var key in this.data[i])
			{
				if (!fieldDict[key])
				{
					fieldDict[key] = this.fields.length + 1; // 1-index the dictionary because 0 reads as false
					this.fields.push(key);
				}
			}
		}
	}
	
	this.indent = 20;
	this.height = 25;
	this.widths = [];
	for (var i = 0; i < this.fields.length; i++) { this.widths.push(100); }
	
	this.box = {};
	AddBoxVars(this.box);
};
Gridlist.prototype.draw = function() {
	
	var y = this.box.tp;
	
	this.ctx.textBaseline = 'middle';
	
	var gl = this;
	
	function DrawRec(tier, left) {
		
		for (var i = 0; i < tier.length; i++)
		{
			var dx = 0;
			
			for (var j = 0; j < gl.fields.length; j++)
			{
				gl.ctx.strokeRect(left + dx + 0.5, y + 0.5, gl.widths[j], gl.height);
				gl.ctx.fillText(tier[i][gl.fields[j]].toString(), left + dx + 2, y + gl.height / 2);
				dx += gl.widths[j];
			}
			
			y += gl.height;
			
			if (tier[i][gl.childField]) { DrawRec(tier[i][gl.childField], left + gl.indent); }
		}
		
	}
	
	DrawRec(this.data, this.box.lf);
};

Griddl.Components.gridlist = Gridlist;

})();

