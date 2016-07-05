
(function() {

var Controls = {};



function Poll() { this.value = this.obj[this.fld]; }

var Text = Controls.Text = function() {
	
	this.ctx = null;
	
	this.obj = null;
	this.fld = null;
	
	this.value = null;
	
	this.input = document.createElement('input');
	
	this.font = '11pt Calibri';
	this.textColor = 'rgb(0,0,0)';
	this.backColor = 'rgb(255,255,255)';
	
	this.borderColor = 'rgb(128,128,128)';
	this.borderWidth = 1;
	
	this.textAlign = 'left';
	this.textMargin = 4;
	
	this.box = new Griddl.Components.Box(this, false);
};
Text.prototype.draw = function() {
	
	this.ctx.fillStyle = this.backColor;
	this.ctx.fillRect(this.box.lf, this.box.tp, this.box.wd, this.box.hg);
	
	this.ctx.strokeStyle = this.borderColor;
	this.ctx.lineWidth = this.borderWidth;
	this.ctx.strokeRect(Math.floor(this.box.lf, 1)+0.5, Math.floor(this.box.tp, 1)+0.5, this.box.wd, this.box.hg);
	
	this.ctx.font = this.font;
	this.ctx.textAlign = 'left';
	this.ctx.textBaseline = 'middle';
	this.ctx.fillStyle = this.textColor;
	this.ctx.fillText(this.value, this.box.lf + this.textMargin, this.box.cy);
};
Text.prototype.poll = Poll;

var Slider = Controls.Slider = function() {

};

var Select = Controls.Select = function() {

};

var Color = Controls.Color = function() {

};

var Font = Controls.Font = function() {

};

var Button = Controls.Button = function() {

};

var AnchorButton = Controls.AnchorButton = function() {
	
};
var AlignButton = Controls.AlignButton = function() {
	
};

Griddl.Controls = Controls;

})();

