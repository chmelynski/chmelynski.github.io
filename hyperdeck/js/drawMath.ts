
interface Jax {
	section?: Section;
	latex?: string;
	x?: number;
	y?: number;
	style?: Style;
	d?: string;
	inputDivId?: string;
	outputDivId?: string;
}

//jax: Jax[] = [];

//this.jax = [];
//if (typeof window != 'undefined') { $('.mathjaxInput').remove(); }
//if (typeof window != 'undefined') { Array.from(document.querySelectorAll('.mathjaxInput')).forEach(function(elt) { elt.remove(); }); }

// general MathJax notes:
// http://cdn.mathjax.org/mathjax/latest/test/sample-signals.html - this is an interesting page that shows all the signals that get sent
// calls to drawMath don't immediately draw onto the canvas - the typesetting is put into the mathjax queue
// actual drawing to the canvas happens in GenerateDocument(), after all callbacks have returned
drawMath(latex: any, x: number, y: number): void {
	
	// latex is a Kronecker object or a string
	
	if (this.useOwnTransform)
	{
		var p = Matrix.Apply(this.matrix, {x:x,y:y});
		x = p.x;
		y = p.y;
	}
	
	if (typeof(latex) == 'object') { latex = '$$' + latex.ToLatex() + '$$'; }
	
	var jax: Jax = {};
	jax.section = this.currentSection;
	jax.latex = latex;
	jax.x = x;
	jax.y = y;
	jax.style = this.SaveStyle();
	
	this.jax.push(jax);
	
	var n = this.jax.length;
	var id = 'mathjax' + n.toString();
	
	var div = $(document.createElement('div'));
	div.attr('id', id);
	div.attr('class', 'mathjaxInput');
	div.css('display', 'none');
	$('body').append(div);
	
	jax.inputDivId = '#' + id;
	jax.outputDivId = '#MathJax-Element-' + n.toString() + '-Frame';
	
	div.text(latex);
	
	// http://docs.mathjax.org/en/latest/api/callback.html
	//MathJax.Hub.Queue(["Typeset", MathJax.Hub, id], [callback]);
	MathJax.Hub.Queue(["Typeset", MathJax.Hub, id]);
}

GenerateDocument(): void {
	
	var g = this;
	
	var callback = function() {
		
		var glyphs: Dict<string> = {};
		
		$('#MathJax_SVG_glyphs').children().each(function(key, val) {
			var id = $(val).attr('id');
			var d = $(val).attr('d');
			glyphs[id] = d;
		});
		
		for (var i = 0; i < g.jax.length; i++)
		{
			var jax = g.jax[i];
			g.SetActiveSection(jax.section);
			
			var svg = $(jax.inputDivId + ' .MathJax_SVG_Display').children().first().children().first();
			
			// these dimensions are in units of 'ex' - how to reliably convert to px?
			//var width = svg.attr('width');
			//var height = svg.attr('height');
			
			// this doesn't work for <svg> tags?
			//var width = svg.clientWidth;
			//var height = svg.clientHeight;
			
			var width = svg[0].width.baseVal.value;
			var height = svg[0].height.baseVal.value;
			
			var d = AlignText(jax.style, width, height);
			
			g.save();
			g.translate(jax.x + d.dx, jax.y + d.dy);
			
			var scale = g.fontSize / 1024;
			g.scale(scale, -scale);
			
			svg.children().each(function(key, val) {
				
				var DrawTag = function(tag) {
					
					var transform = ParseSvgTransform($(tag).attr('transform'));
					
					g.save();
					
					for (var i = 0; i < transform.length; i++)
					{
						if (transform[i].type == 'translate')
						{
							g.translate(transform[i].x, transform[i].y);
						}
						else if (transform[i].type == 'scale')
						{
							g.scale(transform[i].x, transform[i].y);
						}
						else if (transform[i].type == 'transform')
						{
							var t = transform[i];
							g.transform(t.sx, t.kx, t.ky, t.sy, t.dx, t.dy);
						}
						else if (transform[i].type == 'rotate')
						{
							throw new Error();
							//g.rotate(transform[i].rotate);
						}
						else
						{
							throw new Error();
						}
					}
					
					if (tag.tagName == 'use')
					{
						var href = $(tag).attr('href');
						var x = parseFloat($(tag).attr('x'));
						var y = parseFloat($(tag).attr('y'));
						if (x === undefined) { x = 0; }
						if (y === undefined) { y = 0; }
						
						var d = glyphs[href.substr(1)];
						
						g.translate(x, y);
						g.fillPath(d);
					}
					else if (tag.tagName == 'g')
					{
						$(tag).children().each(function(key, child) {
							DrawTag(child);
						});
					}
					else if (tag.tagName == 'rect')
					{
						var x = parseFloat($(tag).attr('x'));
						var y = parseFloat($(tag).attr('y'));
						var width = parseFloat($(tag).attr('width'));
						var height = parseFloat($(tag).attr('height'));
						
						g.fillRect(x, y, width, height);
					}
					else
					{
						throw new Error();
					}
					
					g.restore();
				};
				
				DrawTag(val);
			});
			
			g.restore();
		}
	};
	
	if (typeof window != 'undefined')
	{
		// all calls to drawMath put a typeset operation in the queue, and then at the end, we put this callback in the queue
		// that guarantees that it will be executed after every typeset operation completes
		if (window.MathJax) { window.MathJax.Hub.Queue(callback); }
		
		// we have to make this part of the callback, so that it executes after all mathjax have been rendered
		if (window.MathJax) { window.MathJax.Hub.Queue(RenderSvg); } else { RenderSvg(); }
	}
	else
	{
		RenderSvg();
	}
}

