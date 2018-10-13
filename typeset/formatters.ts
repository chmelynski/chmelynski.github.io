// break out Center, Left formatter functions into standalone functions, as we have already done for Justify
interface Formatter {
	left(text: string): TypesetNode[];
	center(text: string): TypesetNode[];
	justify(text: string): TypesetNode[];
}
function FormatterFactory(measureText: TextMeasurer, options: Options): Formatter {
	
	var lang = options.lang || 'en';
	var width = options.width || 3;
	var shrink = options.shrink || 9;
	var stretch = options.stretch || 6;
	
	var hypher = new Hypher(en); // new Hypher(Typeset[lang])
	
	var hyphenWidth = measureText('-');
	var hyphenPenalty = 100;
	
	var spaceWidth = measureText(' ');
	var spaceShrink = spaceWidth * width / shrink;
	var spaceStretch = spaceWidth * width / stretch;
	
	return {
		center: function (text: string): TypesetNode[] {
			
			var nodes = [];
			var words = text.split(/\s/);
			
			// Although not specified in the Knuth and Plass whitepaper, this box is necessary to keep the glue from disappearing.
			nodes.push(box(0, ''));
			nodes.push(glue(0, 12, 0));
	
			words.forEach(function (word, index, array) {
				var hyphenated = hypher.hyphenate(word);
				if (hyphenated.length > 1 && word.length > 4) {
					hyphenated.forEach(function (part, partIndex, partArray) {
						nodes.push(box(measureText(part), part));
						if (partIndex !== partArray.length - 1) {
							nodes.push(penalty(hyphenWidth, hyphenPenalty, 1));
						}
					});
				} else {
					nodes.push(box(measureText(word), word));
				}
	
				if (index === array.length - 1) {
					nodes.push(glue(0, 12, 0));
					nodes.push(penalty(0, -infinity, 0));
				} else {
					nodes.push(glue(0, 12, 0));
					nodes.push(penalty(0, 0, 0));
					nodes.push(glue(spaceWidth, -24, 0));
					nodes.push(box(0, ''));
					nodes.push(penalty(0, infinity, 0));
					nodes.push(glue(0, 12, 0));
				}
			});
			return nodes;
		},
		justify: function (text: string): TypesetNode[] {
			
			var nodes = [];
			var words = text.split(/\s/);
			
			words.forEach(function (word, index, array) {
				var hyphenated = hypher.hyphenate(word);
				if (hyphenated.length > 1 && word.length > 4) {
					hyphenated.forEach(function (part, partIndex, partArray) {
						nodes.push(box(measureText(part), part));
						if (partIndex !== partArray.length - 1) {
							nodes.push(penalty(hyphenWidth, hyphenPenalty, 1));
						}
					});
				} else {
					nodes.push(box(measureText(word), word));
				}
				if (index === array.length - 1) {
					nodes.push(glue(0, infinity, 0));
					nodes.push(penalty(0, -infinity, 1));
				} else {
					nodes.push(glue(spaceWidth, spaceStretch, spaceShrink));
				}
			});
			return nodes;
		},
		left: function (text: string): TypesetNode[] {
			
			var nodes = [];
			var words = text.split(/\s/);
			
			words.forEach(function (word, index, array) {
				var hyphenated = hypher.hyphenate(word);
				if (hyphenated.length > 1 && word.length > 4) {
					hyphenated.forEach(function (part, partIndex, partArray) {
						nodes.push(box(measureText(part), part));
						if (partIndex !== partArray.length - 1) {
							nodes.push(penalty(hyphenWidth, hyphenPenalty, 1));
						}
					});
				} else {
					nodes.push(box(measureText(word), word));
				}
	
				if (index === array.length - 1) {
					nodes.push(glue(0, infinity, 0));
					nodes.push(penalty(0, -infinity, 1));
				} else {
					nodes.push(glue(0, 12, 0));
					nodes.push(penalty(0, 0, 0));
					nodes.push(glue(spaceWidth, -12, 0));
				}
			});
			
			return nodes;
		}
	};
}
