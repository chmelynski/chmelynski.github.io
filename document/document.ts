
/*

Document is an adapter that converts HTML to PDF.  Default Hyperdeck output is HTML - when we run a Document component, we first generate the HTML output, then infer the required layout variables from that HTML, display the controls for those variables, set appropriate layout defaults, and then generate ctx commands that draw the document.  Subsequent changes to the HTML might require a new inferring of the layout variable structure - in this case, existing layout variables must be preserved (unless their corresponding HTML elements were removed).  Indeed, layout variables should work on selectors like in CSS, and could even use similar/shared syntax.  Subsequent changes to layout variables produce a redraw.

<p> - normal text paragraphs, possibly in columns depending parent (<div>, <article>, what?) settings
<table> - table
<ol>, <ul> - list
<img> - image
<div> - text that exists outside of paragraph text flow
<canvas> - drawing
<hr> - horizontal line and section break (which breaks columns)
<br> - break (breaks columns)
<br><br> - section break (we could use something better for this)
  for better performance, we could dynamically split the document into logical sections and only redraw the section on layout change

The Document component also contains sections for specifying styles and loading fonts.



When you first edit the selector of a piece of content and thus bind it to an element, we immediately infer the page index and placement based on the position of the element within the section HTML.  Also prob should scroll to that page so that the user may refine the position.

Merge ImageParams into ContentParams, we can infer type on binding.

selector inputs should have hints, like "html2, md1" or "content ID"

develop this in document.htm - some boilerplate to create a situation immediately on load

create one section immediately on adding a new document component




bold, italic support:
------------------------

What we kind of need to do is do the hyphenation in a first pass, then call measureText on each fragment, taking into account font and size changes, then pass the fragments and the metrics to the linebreaking module.  Thing is that the linebreaking module can't be calling measureText, because it would have to set ctx.font, and we don't want it to have to deal with that stuff.  But we can't call measureText first because we need to hyphenate first.



*/

namespace Doc {

var Xml: any;
var $: any;

type Orientation = 'portrait' | 'landscape';
type HoriAlign = 'left' | 'center' | 'right';
type VertAlign = 'top' | 'center' | 'bottom';
type Align = 'TL' | 'TC' | 'TR' | 'CL' | 'CC' | 'CR' | 'BL' | 'BC' | 'BR';
type Anchor = 'TLSE' | 'TCSW' | 'TCSF' | 'TCSE' | 'TRSW' | 'CLNE' | 'CCNW' | 'CCNF' | 'CCNE' | 'CRNW' | 'CLFE' | 'CCFW' | 'CCFF' | 'CCFE' | 'CRFW' | 'CLSE' | 'CCSW' | 'CCSF' | 'CCSE' | 'CRSW' | 'BLNE' | 'BCNW' | 'BCNF' | 'BCNE' | 'BRNW';

interface Page {
	ctx: CanvasRenderingContext2D;
	boxes: Box[];
	lines: Line[];
	contents: Content[];
}
interface Line {
	page: Page;
	box: Box;
	words: Word[];
}
interface Word {
	text: string;
	box: Box;
	line?: number;
	style?: any; // Style?
	width?: number;
}
interface PlacedWord { // LinebreakJustify returns a PlacedWord[][] (a PlacedWord[] is a line)
	text: string;
	lf: number;
	wd: number;
}

interface Document {
	
	type: string;
	name: string;
	visible: boolean;
	version: number;
	
	div: any; // $div
	
	representationLabel: string; // HTML or JSON
	parentDiv: HTMLDivElement;
	
	dom: any;
	
	unit: string;
	pixelsPerUnit: number;
	cubitsPerUnit: number;
	pageWidth: number;
	pageHeight: number;
	
	doPageNumbering: boolean;
	firstPage: boolean;
	pageNumberHoriAlign: string;
	pageNumberVertAlign: string;
	pageNumberHoriOffset: number;
	pageNumberVertOffset: number;
	pageNumberFont: string;
	pageNumberColor: string;
	
	sections: Section[];
	sectionControlArray: SectionParams[]; // temporary place to hold objects after construction but before add
	contentControlArray: ContentParams[];
	sectionControlList: any; // LinkedList
	contentControlList: any; // LinkedList
	
	/*
	constructor(json, type, name) {
		
		var doc = this;
		
		var defaults = {
			type: type,
			name: name,
			visible: true,
			version: 1,
			params: {
				unit: 'in',
				pixelsPerUnit: 100,
				cubitsPerUnit: 100,
				pageWidth: 850,
				pageHeight: 1100,
				doPageNumbering: true,
				firstPage: false,
				pageNumberHoriAlign: 'center',
				pageNumberVertAlign: 'bottom',
				pageNumberHoriOffset: 0,
				pageNumberVertOffset: 50,
				pageNumberFont: '12pt serif',
				pageNumberColor: 'rgb(0,0,0)'
			},
			sectionParams: [
			
			],
			contentParams: [
			
			]
		};
		
		if (!json) {
			json = defaults;
		} else {
			json = $.extend(true, {}, defaults, json);
		}
		
		this.type = json.type;
		this.name = json.name;
		this.visible = json.visible;
		this.version = json.version;
		
		if (typeof window != 'undefined')
		{
			this.parentDiv = document.getElementById('output') as HTMLDivElement; // magic id, need to parametrize or something
		}
		
		this.unit = json.params.unit;
		this.pixelsPerUnit = json.params.pixelsPerUnit;
		this.cubitsPerUnit = json.params.cubitsPerUnit;
		this.pageWidth = json.params.pageWidth;
		this.pageHeight = json.params.pageHeight;
		
		this.doPageNumbering = json.params.doPageNumbering;
		this.firstPage = json.params.firstPage;
		this.pageNumberHoriAlign = json.params.pageNumberHoriAlign; // left,center,right,alternateLeftRight,alternateRightLeft
		this.pageNumberVertAlign = json.params.pageNumberVertAlign;
		this.pageNumberHoriOffset = json.params.pageNumberHoriOffset;
		this.pageNumberVertOffset = json.params.pageNumberVertOffset;
		this.pageNumberFont = json.params.pageNumberFont;
		this.pageNumberColor = json.params.pageNumberColor;
		
		this.sectionControlArray = [];
		this.contentControlArray = [];
		this.sectionControlList = new LinkedList();
		this.contentControlList = new LinkedList();
		
		for (var i = 0; i < json.sectionParams.length; i++)
		{
			this.sectionControlArray.push(new SectionParams(json.sectionParams[i]));
		}
		
		for (var i = 0; i < json.contentParams.length; i++)
		{
			this.contentControlArray.push(new ContentParams(json.contentParams[i]));
		}
	}
	write(): any {
		
		var doc = this;
		
		return {
			type: this.type,
			name: this.name,
			visible: this.visible,
			version: this.version,
			params: {
				unit: this.unit,
				pixelsPerUnit: this.pixelsPerUnit,
				cubitsPerUnit: this.cubitsPerUnit,
				pageWidth: this.pageWidth,
				pageHeight: this.pageHeight,
				doPageNumbering: this.doPageNumbering,
				firstPage: this.firstPage,
				pageNumberHoriAlign: this.pageNumberHoriAlign,
				pageNumberVertAlign: this.pageNumberVertAlign,
				pageNumberHoriOffset: this.pageNumberHoriOffset,
				pageNumberVertOffset: this.pageNumberVertOffset,
				pageNumberFont: this.pageNumberFont,
				pageNumberColor: this.pageNumberColor
			},
			sectionParams: this.sectionControlList.enumerate.map(function(x) { return x.write(); }),
			contentParams: this.contentControlList.enumerate.map(function(x) { return x.write(); })
		};
	}
	*/
}
interface Section {
	
	text: string;
	paragraphs: string[]; // this is filled by Parse
	
	// these intermediate variables were used for naive linebreaking
	// however, they could also be used for things like <b> and <i> words
	// would be a weird interaction with full typeset hyphenation though
	// also could be used for applications that require hovering over words
	words: string[];
	wordMetrics: any;
	
	nPages: number;
	
	doc: Document;
	contents: Content[];
	params: SectionParams;
}

interface Style {
	selector: string;
	keys: string[];
	vals: string[];
}
interface Layout {
	
}


function GenerateDocument(div: HTMLDivElement, text: string, layout: Layout): void {
	
	var doc = ParseXml(text);
	ApplyLayout(doc, layout);
	DrawDocument(doc);
}

function ParseXml(text: string): Document {
	
	var doc = null;
	
	var xml = Xml.parse(text);
	
	for (var i = 0; i < xml.children.length; i++)
	{
		var child = xml.children[i]; // this is assumed to be a <section>
		
		for (var k = 0; k < child.children.length; k++)
		{
			var gc = child.children[k];
			
			if (gc.name == 'p')
			{
				var ptext = gc.text;
			}
			else if (gc.name == 'img')
			{
				
			}
			else if (gc.name == 'canvas')
			{
				
			}
			else if (gc.name == 'caption')
			{
				
			}
			else if (gc.name == 'hr')
			{
				
			}
			else if (gc.name == 'br')
			{
				// the use case i have in mind is a horizontal break that cuts across columns
				// but it can also work if there's only one column - it just denotes a section break that's not a page break
				// a soft break, whereas each section is by definition a hard break
			}
		}
	}
	
	return doc;
}
function ApplyLayout(doc: Document, layout: Layout): void {
	
	// this looks at selectors and distributes the styles to the document object tree
}
function DrawDocument(doc: Document): void {
	
	for (var i = 0; i < doc.sections.length; i++) { DrawSection(doc.sections[i]); }
	
	if (doc.doPageNumbering) { DrawPageNumbers(doc); }
}
function DrawSection(section: Section): void {
	
	// This is a long function, and sort of the master drawing function.  What happens here:
	// 1. determine the minimum number of pages needed to accomodate all contents
	// 2. create that number of blank page boxes
	// 3. perform the occlusion
	// 4. determine the width of each line of text - skip over boxes that are not tall enough to accomodate even a single line of text
	// 5. lay out text, adding new pages as necessary (currently linebreaking is done naively, but later will need to use Knuth-Plass)
	// 6. loop through the lines of text and draw them, calling doc.newPage() as necessary
	// 8. draw each content
	
	var debug = false;
	var graphicalDebug = false;
	
	//section.clear();
	
	// perhaps check that orientation is either 'portrait' or 'landscape'
	var wd = ((section.params.orientation == 'portrait') ? section.doc.pageWidth : section.doc.pageHeight) * section.doc.cubitsPerUnit;
	var hg = ((section.params.orientation == 'portrait') ? section.doc.pageHeight : section.doc.pageWidth) * section.doc.cubitsPerUnit;
	
	if (hg < 1) { throw new Error('page size too small'); }
	
	var pages: Page[] = [];
	
	// determine the minimum number of pages needed to accomodate all contents
	var nPages = 1;
	for (var i = 0; i < section.contents.length; i++)
	{
		if (section.contents[i].params.pageIndex > nPages)
		{
			nPages = section.contents[i].params.pageIndex;
		}
	}
	
	// create the Page structs
	for (var i = 0; i < nPages; i++)
	{
		pages.push({
			ctx: NewPage(section.doc, wd, hg),
			boxes: [],
			lines: [],
			contents: []
		});
	}
	
	// fill each page's content list
	for (var i = 0; i < section.contents.length; i++)
	{
		pages[section.contents[i].params.pageIndex - 1].contents.push(section.contents[i]);
	}
	
	if (debug) { console.log(`pages needed by widgets: ${nPages}`); }
	
	var columnWidth = (wd - section.params.marginLeft - section.params.marginRight - section.params.interColumnMargin * (section.params.columns - 1)) / section.params.columns;
	
	// create a blank box for each column, assign to its page
	for (var i = 0; i < nPages; i++)
	{
		var page = pages[i];
		
		for (var k = 0; k < section.params.columns; k++)
		{
			var lf = section.params.marginLeft + (columnWidth + section.params.interColumnMargin) * k;
			var rt = lf + columnWidth;
			var tp = i * hg + section.params.marginTop;
			var bt = (i + 1) * hg - section.params.marginBottom;
			page.boxes.push(Box.Make({lf:lf,rt:rt,tp:tp,bt:bt}));
		}
	}
	
	if (debug)
	{
		console.log('blank page boxes:');
		//boxes.forEach(function(b) { console.log('{lf:'+b.lf+',rt:'+b.rt+',tp:'+b.tp+',bt:'+b.bt+'}'); });
	}
	
	// perform the occlusion for each page
	for (var i = 0; i < pages.length; i++)
	{
		var page = pages[i];
		
		for (var k = 0; k < page.contents.length; k++)
		{
			var content = page.contents[k];
			var tp = content.box.tp - content.params.marginTop;
			var lf = content.box.lf - content.params.marginLeft;
			var rt = content.box.rt + content.params.marginRight;
			var bt = content.box.bt + content.params.marginBottom;
			var boxWithMargin = Box.Make({tp:tp,lf:lf,rt:rt,bt:bt});
			page.boxes = Box.Occlude(page.boxes, boxWithMargin);
		}
	}
	
	if (debug)
	{
		console.log('occluded boxes:');
		//boxes.forEach(function(b) { console.log('{lf:'+b.lf+',rt:'+b.rt+',tp:'+b.tp+',bt:'+b.bt+'}'); });
	}
	
	// break the boxes into line slots - skip over boxes that are not tall enough to accomodate even a single line of text
	if (section.params.pitch < 0.01) { throw new Error('line height too small'); }
	
	var lines: Line[] = [];
	
	for (var i = 0; i < pages.length; i++)
	{
		var page = pages[i];
		var boxIndex = 0;
		var box = page.boxes[boxIndex];
		var bt = box.tp + section.params.pitch;
		
		while (true)
		{
			if (bt > box.bt)
			{
				boxIndex++;
				
				// we adjust box borders to avoid excess gap between lines - stretch the boxes directly below the current box up a little
				for (var k = boxIndex; k < page.boxes.length; k++)
				{
					if (page.boxes[k].tp == box.bt)
					{
						page.boxes[k].tp = bt - section.params.pitch;
					}
				}
				
				if (boxIndex >= page.boxes.length)
				{
					break;
				}
				else
				{
					box = page.boxes[boxIndex];
					bt = box.tp;
				}
			}
			else
			{
				var line: Line = {
					page: page,
					box: new Box(),
					words: []
				};
				
				line.box.reconcile({lf : box.lf , bt : bt , wd : box.wd , hg : section.params.pitch });
				page.lines.push(line);
				lines.push(line);
			}
			
			bt += section.params.pitch;
		}
	}
	
	if (debug)
	{
		console.log('line slots:');
		
		for (var i = 0; i < lines.length; i++)
		{
			var l = lines[i];
			console.log('{lf:'+l.box.lf+',bt:'+l.box.bt+',wd:'+l.box.wd+'}');
		}
	}
	
	// gather the widths of each of the line slots for passing into the linebreaking function
	var lineWidths: number[] = [];
	for (var i = 0; i < lines.length; i++) { lineWidths.push(lines[i].box.wd); }
	lineWidths.push(columnWidth); // the endless pages at the end - here be dragons
	
	// note that when we switch to Knuth-Plass, hyphenation will need to be done first and we'll have to calculate metrics on the fragments
	CalculateWordMetrics(section);
	
	
	// lay out text (currently linebreaking is done naively, but later will need to use Knuth-Plass)
	// under naive linebreaking, we call fillText for the whole line
	// under justified linebreaking or typeset, we call fillText for each word
	
	// returns a string[]
	//var lineTexts = LinebreakNaive(lineWidths, section.words, section.wordMetrics, section.spaceWidth);
	
	// returns a PlacedWord[][] = [ [ { text : "string" , lf : 0 , wd : 0 } ] ]
	var lineTexts: PlacedWord[][] = LinebreakJustify(lineWidths, section.words, section.wordMetrics, section.params.spaceWidth, section.params.minSpaceWidth);
	
	var usingPositions = true;
	
	// now we have parallel arrays - one of empty lines and their coordinates (a Line[]), and one of line texts (a PlacedWord[][])
	var matching = Math.min(lines.length, lineTexts.length);
	
	// we loop through the line texts, assigning them to the empty lines
	for (var i = 0; i < matching; i++)
	{
		var line: Line = lines[i];
		
		if (usingPositions)
		{
			var words = lineTexts[i];
			
			for (var k = 0; k < words.length; k++)
			{
				var word: Word = {
					box: new Box(),
					text: words[k].text
				};
				word.box.reconcile({ lf : line.box.lf + words[k].lf , bt : line.box.bt , wd : words[k].wd , hg : line.box.hg });
				line.words.push(word);
			}
		}
		else
		{
			// here we treat the whole line as one "word"
			//var word: Word =
			//{
			//	box: line.box,
			//	text: lineTexts[i]
			//};
			//line.words.push(word);
		}
	}
	
	// if the list of empty lines runs out, create new empty lines, incrementing maxPages as necessary
	if (lineTexts.length > lines.length)
	{
		var origLinesLength = lines.length;
		var excess = lineTexts.length - lines.length;
		
		// duplicated in loop below
		var tp = section.params.marginTop;
		var bt = tp + section.params.pitch;
		var pageBottom = hg - section.params.marginBottom;
		
		page = {
			ctx: NewPage(section.doc, wd, hg),
			boxes: [],
			lines: [],
			contents: []
		};
		pages.push(page);
		
		var currentColumn = 0;
		
		for (var i = 0; i < excess; i++)
		{
			var line: Line = {
				words: [],
				box: new Box(),
				page: page
			};
			
			var lf = section.params.marginLeft + (columnWidth + section.params.interColumnMargin) * currentColumn;
			var wd = columnWidth;
			var hg = section.params.pitch;
			line.box.reconcile({lf:lf,bt:bt,wd:wd,hg:hg});
			
			if (usingPositions)
			{
				var words = lineTexts[origLinesLength + i];
				
				for (var k = 0; k < words.length; k++)
				{
					var word: Word = {
						box: new Box(),
						text: words[k].text
					};
					word.box.reconcile({ lf : line.box.lf + words[k].lf , bt : line.box.bt , wd : words[k].wd , hg : line.box.hg });
					line.words.push(word);
				}
			}
			else
			{
				//var word: Word =
				//{
				//	box: line.box,
				//	text: lineTexts[origLinesLength + i]
				//};
				//line.words.push(word);
			}
			
			lines.push(line);
			page.lines.push(line);
			
			bt += section.params.pitch;
			
			if (bt > pageBottom)
			{
				currentColumn++;
				
				if (currentColumn >= section.params.columns)
				{
					currentColumn = 0;
					tp = section.params.marginTop;
					bt = tp + section.params.pitch;
					pageBottom = hg - section.params.marginBottom;
					
					page = {
						ctx: NewPage(section.doc, wd, hg),
						boxes: [],
						lines: [],
						contents: []
					};
					pages.push(page);
				}
				else
				{
					bt = tp + section.params.pitch;
				}
			}
		}
	}
	
	if (debug)
	{
		console.log('lines with text:');
		
		for (var i = 0; i < lines.length; i++)
		{
			var l = lines[i];
			//if (l.text !== null) { console.log('{lf:'+l.box.lf+',bt:'+l.box.bt+',wd:'+l.box.wd+',text:"'+l.box.text+'"}'); }
		}
	}
	
	// draw the outlines of boxes
	if (graphicalDebug)
	{
		//var ctx = null; // need to assign this somehow
		//
		//for (var i = 0; i < lines.length; i++)
		//{
		//	var line = lines[i];
		//	ctx.strokeRect(line.box.lf, line.box.tp, line.box.wd, line.box.hg);
		//}
		//
		//for (var i = 0; i < section.contents.length; i++)
		//{
		//	var widget = section.contents[i];
		//	//widget.draw();
		//	ctx.strokeRect(widget.box.lf, widget.box.tp, widget.box.wd, widget.box.hg);
		//	ctx.textAlign = 'center';
		//	ctx.textBaseline = 'middle';
		//	ctx.font = '24pt serif';
		//	//ctx.fillText(widget.name, widget.box.cx, widget.box.cy);
		//}
		//
		//return;
	}
	
	// draw lines of text
	for (var i = 0; i < pages.length; i++)
	{
		var page = pages[i];
		var ctx = page.ctx;
		
		for (var j = 0; j < page.lines.length; j++)
		{
			var line = page.lines[j];
			
			for (var k = 0; k < line.words.length; k++)
			{
				var word = line.words[k];
				
				// it would be nice to not have to do this for every single word, since the words are pretty independent, we could group by style
				// but that's an optimization, don't need to do it now
				
				//ctx.font = null;
				//ctx.fillStyle = section.color;
				ctx.textAlign = 'left';
				ctx.textBaseline = 'bottom'; // this is tied to how we use y in SetType
				
				ctx.fillText(word.text, word.box.lf, word.box.bt);
			}
		}
	}
	
	// 7. draw dotted page breaks on screen (screen only, not PDF)
	//for (var i = 1; i < nPages; i++)
	//{
	//	// this is only to be drawn on screen, not on the PDF.  so we instruct Canvas to briefly suspend pdf output
	//	// update: just break the abstraction
	//	//section.ctx.pausePdfOutput();
	//	if (section.ctx.g)
	//	{
	//		section.ctx.g.setLineDash([5, 5]);
	//		section.ctx.g.strokeStyle = 'rgb(128,128,128)';
	//		section.ctx.g.lineWidth = 1;
	//		section.ctx.g.beginPath();
	//		section.ctx.g.moveTo(0, hg * i);
	//		section.ctx.g.lineTo(wd, hg * i);
	//		section.ctx.g.stroke();
	//		section.ctx.g.setLineDash([]);
	//	}
	//	//section.ctx.resumePdfOutput();
	//}
	
	// draw each content
	for (var i = 0; i < pages.length; i++)
	{
		for (var k = 0; k < pages[i].contents.length; k++)
		{
			pages[i].contents[k].draw(pages[i].ctx);
		}
	}
	
	// if the number of pages has changed, we need to call document.numberPages, which is tricky because it has to clear boxes, meaning it must measure text
}
function DrawPageNumbers(doc: Document): void {
	
	var n = 1;
	
	for (var i = 0; i < doc.sections.length; i++)
	{
		var section = doc.sections[i];
		
		var wd = ((section.params.orientation == 'portrait') ? doc.pageWidth : doc.pageWidth) * doc.cubitsPerUnit;
		var hg = ((section.params.orientation == 'portrait') ? doc.pageHeight : doc.pageHeight) * doc.cubitsPerUnit;
		
		for (var k = 0; k < section.nPages; k++)
		{
			var hAlign = doc.pageNumberHoriAlign;
			var vAlign = ((doc.pageNumberVertAlign == 'center') ? 'middle' : doc.pageNumberVertAlign);
			
			if (hAlign == 'alternateLeftRight')
			{
				hAlign = ((n % 2 == 0) ? 'right' : 'left');
			}
			else if (hAlign == 'alternateRightLeft')
			{
				hAlign = ((n % 2 == 0) ? 'left' : 'right');
			}
			
			var ctx = null; // pull this from the page or whatev
			ctx.font = doc.pageNumberFont;
			ctx.fillStyle = doc.pageNumberColor;
			ctx.textAlign = hAlign;
			ctx.textBaseline = vAlign;
			
			var tp = hg * k;
			var xs = {left:0,center:wd/2,right:wd};
			var ys = {top:tp,center:tp+hg/2,bottom:tp+hg};
			var xPolarity = {left:1,center:1,right:-1};
			var yPolarity = {top:1,center:1,bottom:-1};
			
			if (n == 1 && !doc.firstPage) { n++; continue; }
			
			var x = xs[hAlign] + xPolarity[hAlign] * doc.pageNumberHoriOffset;
			var y = ys[vAlign] + yPolarity[vAlign] * doc.pageNumberVertOffset;
			
			ctx.fillText(n.toString(), x, y);
			
			n++;
		}
	}
}

/*

(these are notes from a while ago, they do note some wrinkles, but who knows how much is still relevant)

Parse produces a list of Paragraphs, each of which is a list of Words

(this list of Words might need to be preprocessed into Fragments by Hypher)

every Word must link to a Style

the Style links to a Font
(a prototype chain for styles might make sense, for simple inheritance)

then we use opentype to generate a width for each Word, storing it in the Word
this requires no reference to measureText or a context - we do everything from opentype

the list of Paragraphs is sent to the linebreaker
spaceWidth and minSpaceWidth should probably be on document
still correct to pass those as arguments to the linebreaker

*/
function Parse(htmls: string[]): Section {
	
	var section = {
		text: null,
		paragraphs: [],
		words: null,
		wordMetrics: null,
		nPages: null,
		doc: null,
		contents: null,
		params: null
	};
	
	function CollectRec(node: Node, nodes: Node[]): void {
		
		for (var i = 0; i < node.childNodes.length; i++)
		{
			var c = node.childNodes[i];
			nodes.push(c);
			CollectRec(c, nodes);
		}
	}
	
	for (var i = 0; i < htmls.length; i++)
	{
		var parser = new DOMParser();
		var document = parser.parseFromString(htmls[i], 'text/html');
		var elts = [];
		CollectRec(document, elts);
		
		for (var k = 0; k < elts.length; k++)
		{
			var elt = elts[k];
			
			if (elt.nodeName == 'P')
			{
				// but a p might have span children, which need to be dealt with
				// maybe we should get a flat list of nodes, rather than elements
				
				// p with text only
				section.paragraphs.push(elt.childNodes[0].nodeValue);
			}
			else if (elt.nodeName == 'IMG')
			{
				
			}
			else if (elt.nodeName == 'CANVAS')
			{
				
			}
			else
			{
				
			}
		}
	}
	
	return section;
}

function NewPage(doc: Document, width: number, height: number): CanvasRenderingContext2D {
	
	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.style.border = '1px solid gray';
	
	doc.div.appendChild(canvas);
	
	var ctx = canvas.getContext('2d');
	
	return ctx;
}
function CalculateWordMetrics(section: Section): void {
	
	//if (section.textStyle.style) { SetStyle(section.ctx, section.textStyle.style); }
	//if (section.textStyle.fontSize) { section.ctx.setFontSize(section.textStyle.fontSize); }
	//if (section.textStyle.fontFamily) { section.ctx.setFont(section.textStyle.fontFamily, section.textStyle.bold, section.textStyle.italic); }
	
	//section.wordMetrics = [];
	//
	//// here is where we would do fancier stuff like inline spans with different fonts, tabs, roll-your-own justification via variable spacing, etc.
	//for (var i = 0; i < section.words.length; i++)
	//{
	//	var word = section.words[i];
	//	var widthCu = section.ctx.measureText(word).width;
	//	section.wordMetrics.push(widthCu);
	//}
	
	//section.spaceWidth = section.ctx.fontSizeCu * 0.30;
	//section.minSpaceWidth = section.ctx.fontSizeCu * 0.20; // for justified text with stretched spacing
}

class Content {
	
	ctx: CanvasRenderingContext2D = null;
	box: Box = null;
	type: string = null; // image, drawing, caption
	params: ContentParams = null;
	
	setSize(): void {
		
	}
	draw(ctx: CanvasRenderingContext2D): void {
		
	}
}
class Image extends Content {
	
	imageElement: HTMLImageElement = null;
	
	draw(ctx: CanvasRenderingContext2D): void {
		// this.params.srcLeft, this.params.srcTop, this.params.srcWidth, this.params.srcHeight, 
		ctx.drawImage(this.imageElement, this.box.lf, this.box.tp, this.box.wd, this.box.hg);
	}
}
class Drawing extends Content {
	
	fn: Function = null;
	
	draw(ctx: CanvasRenderingContext2D): void {
		// scale, translate, clip?
		this.fn.call(ctx, ctx);
	}
}
class Caption extends Content {
	
	text: string = null;
	//textStyle: Style = null;
	
	draw(ctx: CanvasRenderingContext2D): void {
		//ctx.textAlign = null;
		//ctx.font = null;
		//var x = null;
		//var y = null;
		//ctx.fillText(text, x, y);
	}
}

interface SectionParams {
	
	parentDiv: any; // the '.document' div
	div: any; // this is the '.sectionParams' div
	listElement: any; // LinkedList
	
	selector: string;
	
	orientation: Orientation;
	columns: number;
	interColumnMargin: number;
	pitch: number;
	indent: number;
	
	marginTop: number;
	marginLeft: number;
	marginRight: number;
	marginBottom: number;
	
	textStyle: string;
	
	// these could be made user-editable
	spaceWidth: number;
	minSpaceWidth: number;
	
	/*
	constructor(json?: any) {
		
		var defaults = {
			selector: '',
			orientation: 'portrait',
			columns: 1,
			interColumnMargin: 50,
			pitch: 25,
			indent: 25,
			marginTop: 100,
			marginLeft: 100,
			marginRight: 100,
			marginBottom: 100,
			textStyle: 'default'
		};
		
		if (!json) {
			json = defaults;
		} else {
			json = $.extend(true, {}, defaults, json);
		}
		
		this.selector = json.selector;
		this.orientation = json.orientation;
		this.columns = json.columns;
		this.interColumnMargin = json.interColumnMargin;
		this.pitch = json.pitch;
		this.indent = json.indent;
		this.marginTop = json.marginTop;
		this.marginLeft = json.marginLeft;
		this.marginRight = json.marginRight;
		this.marginBottom = json.marginBottom;
		this.textStyle = json.textStyle;
	}
	write(): any {
		
		return {
			selector: this.selector,
			orientation: this.orientation,
			columns: this.columns,
			interColumnMargin: this.interColumnMargin,
			pitch: this.pitch,
			indent: this.indent,
			marginTop: this.marginTop,
			marginLeft: this.marginLeft,
			marginRight: this.marginRight,
			marginBottom: this.marginBottom,
			textStyle: this.textStyle
		};
	}
	*/
}
interface ContentParams {
	
	parentDiv: any; // the '.document' div
	div: any; // this is the '.contentParams' div
	listElement: any; // LinkedList
	
	selector: string;
	pageIndex: number;
	
	type: string;
	
	anchor: Anchor;
	x: number;
	y: number;
	align: Align;
	width: number;
	height: number;
	
	marginTop: number;
	marginLeft: number;
	marginRight: number;
	marginBottom: number;
	
	// image only
	//srcTop: number;
	//srcLeft: number;
	//srcWidth: number;
	//srcHeight: number;
	
	/*
	constructor(json?: any) {
		
		var defaults = {
			selector: '',
			pageIndex: 0,
			anchor: 'CCFF',
			x: 0,
			y: 0,
			align: 'CC',
			width: 200,
			height: 200,
			marginTop: 0,
			marginLeft: 0,
			marginRight: 0,
			marginBottom: 0
		};
		
		if (!json) {
			json = defaults;
		} else {
			json = $.extend(true, {}, defaults, json);
		}
		
		//this.type = json.type;
		this.selector = json.selector;
		this.pageIndex = json.pageIndex;
		this.anchor = json.anchor;
		this.x = json.x;
		this.y = json.y;
		this.align = json.align;
		this.width = json.width;
		this.height = json.height;
		this.marginTop = json.marginTop;
		this.marginLeft = json.marginLeft;
		this.marginRight = json.marginRight;
		this.marginBottom = json.marginBottom;
	}
	write(): any {
		
		return {
			type: this.type,
			selector: this.selector,
			pageIndex: this.pageIndex,
			anchor: this.anchor,
			x: this.x,
			y: this.y,
			align: this.align,
			width: this.width,
			height: this.height,
			marginTop: this.marginTop,
			marginLeft: this.marginLeft,
			marginRight: this.marginRight,
			marginBottom: this.marginBottom
		};
	}
	*/
}

interface TextStyleControls {
	
	selector: string;
	
	fontFamily: string;
	fontSize: string;
	color: string;
	hAlign: HoriAlign;
	vAlign: VertAlign;
}

function BuildDocumentControls(doc: Document): void {
	
	var div = $('<div class="docParams"></div>').appendTo(doc.div);
	
	var unit = $(BuildSelector(['in','cm','mm','pt'], doc.unit)).on('change', function() {
		
		var multiplier = UnitSize(this.value) / UnitSize(doc.unit);
		
		pixelsPerUnit[0].value = doc.pixelsPerUnit *= multiplier;
		//cubitsPerUnit[0].value = doc.cubitsPerUnit *= multiplier; // probably not necessary, the user will adjust as wanted
		pageNumberHoriOffset[0].value = doc.pageNumberHoriOffset *= multiplier;
		pageNumberVertOffset[0].value = doc.pageNumberVertOffset *= multiplier;
		
		doc.unit = this.value;
		div.find('span.units').text(doc.unit);
	});
	
	var pageWidth = $('<input type="text">').attr('value', doc.pageWidth).on('change', function() { doc.pageWidth = parseFloat(this.value); });
	var pageHeight = $('<input type="text">').attr('value', doc.pageHeight).on('change', function() { doc.pageHeight = parseFloat(this.value); });
	var cubitsPerUnit = $('<input type="text">').attr('value', doc.cubitsPerUnit).on('change', function() { doc.cubitsPerUnit = parseFloat(this.value); });
	var pixelsPerUnit = $('<input type="text">').attr('value', doc.pixelsPerUnit).on('change', function() { doc.pixelsPerUnit = parseFloat(this.value); });
	
	var doPageNumbering = $('<input type="checkbox"' + (doc.doPageNumbering ? ' checked' : '') + '>').on('change', function() { doc.doPageNumbering = !doc.doPageNumbering; });
	var firstPage = $('<input type="checkbox"' + (doc.firstPage ? ' checked' : '') + '>').on('change', function() { doc.firstPage = !doc.firstPage; });
	var pageNumberHoriAlign = BuildSelector(['left','center','right','alternateLeftRight','alternateRightLeft'], doc.pageNumberHoriAlign).css('width', '10em').on('change', function() { doc.pageNumberHoriAlign = this.value; });
	var pageNumberVertAlign = BuildSelector(['top','center','bottom'], doc.pageNumberVertAlign).css('width', '10em').on('change', function() { doc.pageNumberVertAlign = this.value; });
	var pageNumberHoriOffset = $('<input type="text" style="text-align:center;width:4em"></input>').attr('value', doc.pageNumberHoriOffset).on('change', function() { doc.pageNumberHoriOffset = parseFloat(this.value); });
	var pageNumberVertOffset = $('<input type="text" style="text-align:center;width:4em"></input>').attr('value', doc.pageNumberVertOffset).on('change', function() { doc.pageNumberVertOffset = parseFloat(this.value); });
	var pageNumberFont = $('<input type="text" style="text-align:center;width:9em"></input>').attr('value', doc.pageNumberFont).on('change', function() { doc.pageNumberFont = this.value; });
	var pageNumberColor = $('<input type="text" style="text-align:center;width:9em"></input>').attr('value', doc.pageNumberColor).on('change', function() { doc.pageNumberColor = this.value; });
	
	$('<div class="header">Document</div>').appendTo(div);
	
	$('<button>Generate</button>').addClass('btn btn-default').css('margin-right', '0.5em').on('click', function() {  }).appendTo(div); // doc.generate();
	$('<button>Export</button>').addClass('btn btn-default').on('click', function() {  }).appendTo(div); // doc.exportToPdf();
	
	$('<hr>').appendTo(div);
	
	$('<div class="row"><label>Page size and resolution</label></div>').appendTo(div);
	$('<div class="row"><span>Unit: </span></div>').append(unit).appendTo(div);
	$('<div class="row"><span>Page width: </span></div>').append(pageWidth).appendTo(div);
	$('<div class="row"><span>Page height: </span></div>').append(pageHeight).appendTo(div);
	$('<div class="row"><span>User space units per </span><span class="units">in</span>: </div>').append(cubitsPerUnit).appendTo(div);
	$('<div class="row"><span>Pixels per </span><span class="units">in</span>: </div>').append(pixelsPerUnit).appendTo(div);
	
	$('<hr>').appendTo(div);
	
	$('<div class="row"><label>Page numbering</label></div>').appendTo(div);
	$('<div class="row"><span>Display page numbers? </span></div>').append(doPageNumbering).appendTo(div);
	$('<div class="row"><span>Number first page? </span></div>').append(firstPage).appendTo(div);
	$('<div class="row"><span>Horizontal align: </span></div>').append(pageNumberHoriAlign).appendTo(div);
	$('<div class="row"><span>Vertical align: </span></div>').append(pageNumberVertAlign).appendTo(div);
	$('<div class="row"><span>Horizontal offset: </span></div>').append(pageNumberHoriOffset).appendTo(div);
	$('<div class="row"><span>Vertical offset: </span></div>').append(pageNumberVertOffset).appendTo(div);
	$('<div class="row"><span>Font: </span></div>').append(pageNumberFont).appendTo(div);
	$('<div class="row"><span>Fill: </span></div>').append(pageNumberColor).appendTo(div);
	
	$('<hr>').appendTo(doc.div);
	
	var sectionsDiv = $('<div class="sectionsDiv"></div>').appendTo(doc.div);
	
	for (var i = 0; i < this.sectionControlArray.length; i++)
	{
		var sectionControl = this.sectionControlArray[i];
		sectionControl.parentDiv = sectionsDiv;
		sectionControl.listElement = this.sectionControlList.add(sectionControl);
		sectionControl.add();
	}
	
	$('<button style="margin:0.2em" class="btn btn-default btn-sm"><i class="fa fa-plus"></i> Add Section</button>').on('click', function() {
		//var sectionControl = new SectionParams();
		//sectionControl.parentDiv = sectionsDiv;
		//sectionControl.listElement = this.sectionControlList.add(sectionControl);
		//sectionControl.add();
	}).appendTo(doc.div);
	
	$('<hr>').appendTo(doc.div);
	
	var contentsDiv = $('<div class="contentsDiv"></div>').appendTo(doc.div);
	
	for (var i = 0; i < this.contentControlArray.length; i++)
	{
		var contentControl = this.contentControlArray[i];
		contentControl.parentDiv = contentsDiv;
		contentControl.listElement = this.contentControlList.add(contentControl);
		contentControl.add();
	}
	
	$('<button style="margin:0.2em" class="btn btn-default btn-sm"><i class="fa fa-plus"></i> Add Content</button>').on('click', function() {
		//var contentControl = new ContentParams();
		//contentControl.parentDiv = contentsDiv;
		//contentControl.listElement = this.contentControlList.add(contentControl);
		//contentControl.add();
	}).appendTo(doc.div);
}
function BuildSectionControls(params: SectionParams): void {
	
	var div = params.div = $('<div class="sectionParams"></div>').appendTo(params.parentDiv);
	
	$('<button style="float:right" class="btn btn-default btn-sm"><i class="fa fa-trash-o"></i> Delete</button>').on('click', function() {
		params.listElement.remove();
		params.div.remove();
	}).appendTo(div);
	
	$('<div class="header">Section</div>').appendTo(div);
	
	var selector = $('<input type="text" placeholder="html1, md2"></input>').attr('value', params.selector).on('change', function() {
		params.selector = this.value;
		// bind
	});
	
	var orientation = $(BuildSelector(['portrait', 'landscape'], params.orientation)).on('change', function() {
		params.orientation = this.value;
	});
	
	var columns = $(BuildSelector(['1', '2', '3', '4'], params.columns.toString())).on('change', function() {
		params.columns = this.value;
	});
	
	var interColumnMargin = $('<input type="text" class="cubits"></input>').attr('value', params.interColumnMargin).on('change', function() {
		params.interColumnMargin = this.value;
	});
	
	var indent = $('<input type="text" class="cubits"></input>').attr('value', params.indent).on('change', function() {
		params.indent = this.value;
	});
	
	var lineHeight = $('<input type="text" class="cubits"></input>').attr('value', params.pitch).on('change', function() {
		params.pitch = this.value;
	});
	
	$('<div class="row"><span>Selector: </span></div>').append(selector).appendTo(div);
	$('<div class="row"><span>Orientation: </span></div>').append(orientation).appendTo(div);
	$('<div class="row"><span>Number of columns: </span></div>').append(columns).appendTo(div);
	$('<div class="row"><span>Inter-column margin: </span></div>').append(interColumnMargin).appendTo(div);
	$('<div class="row"><span>Indentation: </span></div>').append(indent).appendTo(div);
	$('<div class="row"><span>Line height: </span></div>').append(lineHeight).appendTo(div);
	
	
	$('<div class="row"><span>Page margins: </span></div>').appendTo(div);
	
	var marginDiv = $('<div></div>').appendTo(div);
	
	var topDiv = $('<div></div>').appendTo(marginDiv).css('width', '15em');
	var midDiv = $('<div></div>').appendTo(marginDiv).css('width', '15em');
	var botDiv = $('<div></div>').appendTo(marginDiv).css('width', '15em');
	
	var T = $('<input type="text" class="cubits"></input>').appendTo(topDiv).attr('value', params.marginTop).css('margin-left', '4em');
	var L = $('<input type="text" class="cubits"></input>').appendTo(midDiv).attr('value', params.marginLeft).css('margin', '1em');
	var R = $('<input type="text" class="cubits"></input>').appendTo(midDiv).attr('value', params.marginRight);
	var B = $('<input type="text" class="cubits"></input>').appendTo(botDiv).attr('value', params.marginBottom).css('margin-left', '4em');
	
	$('<hr />').appendTo(div);
}
function BuildContentControls(params: ContentParams): void {
	
	var div = params.div = $('<div class="contentParams boxStyle">').appendTo(params.parentDiv);
	
	$('<button style="float:right" class="btn btn-default btn-sm"><i class="fa fa-trash-o"></i> Delete</button>').on('click', function() {
		params.listElement.remove();
		params.div.remove();
	}).appendTo(div);
	
	$('<div class="header">Content</div>').appendTo(div);
	
	var selector = $('<input type="text" placeholder="id"></input>').on('change', function() {
		params.selector = this.value;
		// bind
	});
	
	$('<div class="row"><span>Selector: </span></div>').append(selector).appendTo(div);
	
	var pageIndex = $('<input type="text">').attr('value', params.pageIndex).on('change', function() { params.pageIndex = this.value; });
	$('<div class="row"><span>Page index: </span></div>').append(pageIndex).appendTo(div);
	
	var anchorTbody = $('<div class="column"><table class="align-grid five-by-five"><tr></tr><tr></tr><tr></tr><tr></tr><tr></tr></table></div>').appendTo(div).find('tbody');
	var tr1 = anchorTbody.children().eq(0);
	var tr2 = anchorTbody.children().eq(1);
	var tr3 = anchorTbody.children().eq(2);
	var tr4 = anchorTbody.children().eq(3);
	var tr5 = anchorTbody.children().eq(4);
	$('<td><div data="TLSE" class="anchor norm TL"></div></td>').appendTo(tr1);
	$('<td><div data="TCSW" class="anchor norm TR"></div></td>').appendTo(tr1);
	$('<td><div data="TCSF" class="anchor vert T "></div></td>').appendTo(tr1);
	$('<td><div data="TCSE" class="anchor norm TL"></div></td>').appendTo(tr1);
	$('<td><div data="TRSW" class="anchor norm TR"></div></td>').appendTo(tr1);
	$('<td><div data="CLNE" class="anchor norm BL"></div></td>').appendTo(tr2);
	$('<td><div data="CCNW" class="anchor norm BR"></div></td>').appendTo(tr2);
	$('<td><div data="CCNF" class="anchor vert B "></div></td>').appendTo(tr2);
	$('<td><div data="CCNE" class="anchor norm BL"></div></td>').appendTo(tr2);
	$('<td><div data="CRNW" class="anchor norm BR"></div></td>').appendTo(tr2);
	$('<td><div data="CLFE" class="anchor hori L "></div></td>').appendTo(tr3);
	$('<td><div data="CCFW" class="anchor hori R "></div></td>').appendTo(tr3);
	$('<td><div data="CCFF" class="anchor cent C "></div></td>').appendTo(tr3);
	$('<td><div data="CCFE" class="anchor hori L "></div></td>').appendTo(tr3);
	$('<td><div data="CRFW" class="anchor hori R "></div></td>').appendTo(tr3);
	$('<td><div data="CLSE" class="anchor norm TL"></div></td>').appendTo(tr4);
	$('<td><div data="CCSW" class="anchor norm TR"></div></td>').appendTo(tr4);
	$('<td><div data="CCSF" class="anchor vert T "></div></td>').appendTo(tr4);
	$('<td><div data="CCSE" class="anchor norm TL"></div></td>').appendTo(tr4);
	$('<td><div data="CRSW" class="anchor norm TR"></div></td>').appendTo(tr4);
	$('<td><div data="BLNE" class="anchor norm BL"></div></td>').appendTo(tr5);
	$('<td><div data="BCNW" class="anchor norm BR"></div></td>').appendTo(tr5);
	$('<td><div data="BCNF" class="anchor vert B "></div></td>').appendTo(tr5);
	$('<td><div data="BCNE" class="anchor norm BL"></div></td>').appendTo(tr5);
	$('<td><div data="BRNW" class="anchor norm BR"></div></td>').appendTo(tr5);
	anchorTbody.find('[data="' + params.anchor + '"]').addClass('selected');
	anchorTbody.find('div.anchor').on('click', function() {
		anchorTbody.find('.selected').removeClass('selected');
		$(this).addClass('selected');
		params.anchor = $(this).attr('data');
	});
	
	var alignTbody = $('<div class="column"><table class="align-grid three-by-three"><tr></tr><tr></tr><tr></tr></table></div>').appendTo(div).find('tbody');
	var tr1 = alignTbody.children().eq(0);
	var tr2 = alignTbody.children().eq(1);
	var tr3 = alignTbody.children().eq(2);
	$('<td><div data="TL" class="align norm TL"></div></td>').appendTo(tr1);
	$('<td><div data="TC" class="align norm TC"></div></td>').appendTo(tr1);
	$('<td><div data="TR" class="align norm TR"></div></td>').appendTo(tr1);
	$('<td><div data="CL" class="align norm CL"></div></td>').appendTo(tr2);
	$('<td><div data="CC" class="align norm CC"></div></td>').appendTo(tr2);
	$('<td><div data="CR" class="align norm CR"></div></td>').appendTo(tr2);
	$('<td><div data="BL" class="align norm BL"></div></td>').appendTo(tr3);
	$('<td><div data="BC" class="align norm BC"></div></td>').appendTo(tr3);
	$('<td><div data="BR" class="align norm BR"></div></td>').appendTo(tr3);
	alignTbody.find('[data="' + params.align + '"]').addClass('selected');
	alignTbody.find('div.align').on('click', function() {
		alignTbody.find('.selected').removeClass('selected');
		$(this).addClass('selected');
		params.align = $(this).attr('data');
	});
	
	var xInput = $('<input type="text">').attr('value', params.x).on('change', function() { params.x = this.value; });
	var yInput = $('<input type="text">').attr('value', params.y).on('change', function() { params.y = this.value; });
	var wInput = $('<input type="text">').attr('value', params.width).on('change', function() { params.width = this.value; });
	var hInput = $('<input type="text">').attr('value', params.height).on('change', function() { params.height = this.value; });
	
	$('<div class="row"><span>x: </span></div>').append(xInput).appendTo(div);
	$('<div class="row"><span>y: </span></div>').append(yInput).appendTo(div);
	$('<div class="row"><span>width: </span></div>').append(wInput).appendTo(div);
	$('<div class="row"><span>height: </span></div>').append(hInput).appendTo(div);
	
	$('<span>margins:</span>').appendTo(div);
	
	var marginDiv = $('<div class="margin-inputs"></div>').appendTo(div);
	
	var topDiv = $('<div class="margin-row"></div>').appendTo(marginDiv);
	var midDiv = $('<div class="margin-row"></div>').appendTo(marginDiv);
	var botDiv = $('<div class="margin-row"></div>').appendTo(marginDiv);
	
	var T = $('<input type="text" class="margin-T cubits">').appendTo(topDiv).attr('value', params.marginTop);
	var L = $('<input type="text" class="margin-L cubits">').appendTo(midDiv).attr('value', params.marginLeft);
	var R = $('<input type="text" class="margin-R cubits">').appendTo(midDiv).attr('value', params.marginRight);
	var B = $('<input type="text" class="margin-B cubits">').appendTo(botDiv).attr('value', params.marginBottom);
	
	T.on('change', function() { params.marginTop = this.value; });
	L.on('change', function() { params.marginLeft = this.value; });
	R.on('change', function() { params.marginRight = this.value; });
	B.on('change', function() { params.marginBottom = this.value; });
	
	$('<hr />').appendTo(div);
}
function BuildColorControls(): any {
	
	function GenerateImageData() {
		
		for (var y = 0; y < hg; y++)
		{
			for (var x = 0; x < wd; x++)
			{
				var index = (y * wd + x) * 4;
				data[index + 0] = y;
				data[index + 1] = x;
				data[index + 2] = b;
				data[index + 3] = 255;
			}
		}
	}
	function Draw() {
		
		pickerCtx.putImageData(imageData, 0, 0);
		
		previewCtx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
		previewCtx.fillRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
		
		pickerCtx.beginPath();
		pickerCtx.arc(g, r, 3, 0, Math.PI * 2, false);
		pickerCtx.stroke();
	}
	
	var div = $('<div class="container textStyle"></div>').appendTo('#containerStack');
	
	$('<div class="header">Color picker</div>').appendTo(div);
	var lCol = $('<div class="column"></div>').appendTo(div);
	var rCol = $('<div class="column"></div>').appendTo(div).css('margin-left', '1em');
	
	var r = 0;
	var g = 0;
	var b = 0;
	
	var picker = $('<canvas width="256" height="256" style="border: 1px solid gray; padding: 10px; cursor: crosshair;"></canvas>').appendTo(lCol);
	var pickerCtx = picker[0].getContext('2d');
	var wd = picker[0].width;
	var hg = picker[0].height;
	var imageData = pickerCtx.getImageData(0, 0, wd, hg);
	var data = imageData.data;
	
	var slider = $('<input type="range" min="0" max="255" step="1"></input>').appendTo(lCol).attr('value', b).css('display', 'block');
	
	slider[0].oninput = function(e) {
		b = parseInt(this.value);
		bInput[0].value = b;
		GenerateImageData();
		Draw();
	};
	
	picker[0].onmousedown = function(downEvent) {
		picker[0].onmousemove = function(moveEvent) {
			
			var x = moveEvent.offsetX;
			var y = moveEvent.offsetY;
			
			x -= 11; // 1px border + 10px padding
			y -= 11;
			
			if (x < 0) { x = 0; }
			if (x > 255) { x = 255; }
			if (y < 0) { y = 0; }
			if (y > 255) { y = 255; }
			
			var index = (y * wd + x) * 4;
			
			r = data[index + 0];
			g = data[index + 1];
			b = data[index + 2];
			
			rInput[0].value = r;
			gInput[0].value = g;
			bInput[0].value = b;
			
			Draw()
		};
	};
	picker[0].onmouseup = function(upEvent) {
		picker[0].onmousemove = null;
	};
	
	var preview = $('<canvas width="50" height="50" style="border: 1px solid gray"></canvas>').appendTo(rCol);
	var previewCtx = preview[0].getContext('2d');
	
	var table = $('<table></table>').appendTo(rCol);
	var rInput = $('<tr><td>red</td>  <td><input type="text"></input></td></tr>').appendTo(table).find('input').attr('value', r);
	var gInput = $('<tr><td>green</td><td><input type="text"></input></td></tr>').appendTo(table).find('input').attr('value', g);
	var bInput = $('<tr><td>blue</td> <td><input type="text"></input></td></tr>').appendTo(table).find('input').attr('value', b);
	
	rInput[0].onchange = function() { r = this.value; Draw(); };
	gInput[0].onchange = function() { g = this.value; Draw(); };
	bInput[0].onchange = function() { b = this.value; Draw(); };
	
	GenerateImageData();
	Draw();
	
	return div;
}
function BuildSelector(options: string[], selected: string): any {
	return $('<select>' + options.map(function(option) { return '<option' + ((option == selected) ? ' selected' : '') + '>' + option + '</option>'; }).join('') + '</select>');
}

function UnitSize(unit: string): number { return {in:1,cm:1/2.54,mm:1/25.4,pt:1/72}[unit]; }

interface BoxParams {
	lf?: number;
	cx?: number;
	rt?: number;
	wd?: number;
	wr?: number;
	tp?: number;
	cy?: number;
	bt?: number;
	hg?: number;
	hr?: number;
}
class Box {
	
	lf: number;
	cx: number;
	rt: number;
	wd: number;
	wr: number;
	tp: number;
	cy: number;
	bt: number;
	hg: number;
	hr: number;
	
	constructor() {
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
	}
	reconcile(params: BoxParams): Box {
		
		var box = this;
		
		if (params.lf !== undefined)
		{
			box.lf = params.lf;
			
			if (params.cx !== undefined)
			{
				box.cx = params.cx;
				box.wr = box.cx - box.lf;
				box.wd = box.wr * 2;
				box.rt = box.lf + box.wd;
			}
			else if (params.rt !== undefined)
			{
				box.rt = params.rt;
				box.wd = box.rt - box.lf;
				box.wr = box.wd / 2;
				box.cx = box.lf + box.wr;
			}
			else if (params.wd !== undefined)
			{
				box.wd = params.wd;
				box.wr = box.wd / 2;
				box.rt = box.lf + box.wd;
				box.cx = box.lf + box.wr;
			}
			else if (params.wr !== undefined)
			{
				box.wr = params.wr;
				box.wd = box.wr * 2;
				box.rt = box.lf + box.wd;
				box.cx = box.lf + box.wr;
			}
		}
		else if (params.cx !== undefined)
		{
			box.cx = params.cx;
			
			if (params.rt !== undefined)
			{
				box.rt = params.rt;
				box.wr = box.rt - box.cx;
				box.wd = box.wr * 2;
				box.lf = box.rt - box.wd;
			}
			else if (params.wd !== undefined)
			{
				box.wd = params.wd;
				box.wr = box.wd / 2;
				box.rt = box.cx + box.wr;
				box.lf = box.cx - box.wr;
			}
			else if (params.wr !== undefined)
			{
				box.wr = params.wr;
				box.wd = box.wr * 2;
				box.rt = box.cx + box.wr;
				box.lf = box.cx - box.wr;
			}
		}
		else if (params.rt !== undefined)
		{
			box.rt = params.rt;
			
			if (params.wd !== undefined)
			{
				box.wd = params.wd;
				box.wr = box.wd / 2;
				box.lf = box.rt - box.wd;
				box.cx = box.rt - box.wr;
			}
			else if (params.wr !== undefined)
			{
				box.wr = params.wr;
				box.wd = box.wr * 2;
				box.lf = box.rt - box.wd;
				box.cx = box.rt - box.wr;
			}
		}
		
		if (params.tp !== undefined)
		{
			box.tp = params.tp;
			
			if (params.cy !== undefined)
			{
				box.cy = params.cy;
				box.hr = box.cy - box.tp;
				box.hg = box.hr * 2;
				box.bt = box.tp + box.hg;
			}
			else if (params.bt !== undefined)
			{
				box.bt = params.bt;
				box.hg = box.bt - box.tp;
				box.hr = box.hg / 2;
				box.cy = box.tp + box.hr;
			}
			else if (params.hg !== undefined)
			{
				box.hg = params.hg;
				box.hr = box.hg / 2;
				box.bt = box.tp + box.hg;
				box.cy = box.tp + box.hr;
			}
			else if (params.hr !== undefined)
			{
				box.hr = params.hr;
				box.hg = box.hr * 2;
				box.bt = box.tp + box.hg;
				box.cy = box.tp + box.hr;
			}
		}
		else if (params.cy !== undefined)
		{
			box.cy = params.cy;
			
			if (params.bt !== undefined)
			{
				box.bt = params.bt;
				box.hr = box.bt - box.cy;
				box.hg = box.hr * 2;
				box.tp = box.bt - box.hg;
			}
			else if (params.hg !== undefined)
			{
				box.hg = params.hg;
				box.hr = box.hg / 2;
				box.bt = box.cy + box.hr;
				box.tp = box.cy - box.hr;
			}
			else if (params.hr !== undefined)
			{
				box.hr = params.hr;
				box.hg = box.hr * 2;
				box.bt = box.cy + box.hr;
				box.tp = box.cy - box.hr;
			}
		}
		else if (params.bt !== undefined)
		{
			box.bt = params.bt;
			
			if (params.hg !== undefined)
			{
				box.hg = params.hg;
				box.hr = box.hg / 2;
				box.tp = box.bt - box.hg;
				box.cy = box.bt - box.hr;
			}
			else if (params.hr !== undefined)
			{
				box.hr = params.hr;
				box.hg = box.hr * 2;
				box.tp = box.bt - box.hg;
				box.cy = box.bt - box.hr;
			}
		}
		
		return box;
	}
	static Make(params: BoxParams): Box {
		var box = new Box();
		box.reconcile(params);
		return box;
	}
	static Occlude(boxes: Box[], occ: Box): Box[] {
		
		var newboxes: Box[] = [];
		
		var MakeBox = function(params: BoxParams): Box { return new Box().reconcile(params); };
		
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
				newboxes.push(MakeBox({tp:box.tp,bt:box.bt,lf:occ.rt,rt:box.rt})); // rt
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
	}
}

var LinkedList = function() {
	this.data = null;
	this.prev = this;
	this.next = this;
};
LinkedList.prototype.add = function(data) {
	
	// this must be called on the sentinel
	
	var elt = new LinkedList();
	elt.data = data;
	elt.next = this;
	elt.prev = this.prev;
	
	if (this.next === this) { this.next = elt; } else { this.prev.next = elt; }
	this.prev = elt;
	
	return elt;
};
LinkedList.prototype.remove = function() {
	
	// this cannot be called on the sentinel
	this.prev.next = this.next;
	this.next.prev = this.prev;
};
LinkedList.prototype.enumerate = function() {
	
	// this must be called on the sentinel
	
	var list = [];
	var elt = this.next;
	
	while (elt !== this)
	{
		list.push(elt.data);
		elt = elt.next;
	}
	
	return list;
};

var Typeset: any;
function LinebreakNaive(lineWidths: number[], words: string[], wordMetrics: number[], spaceWidth: number): string[] {
	
	var lineTexts = [];
	
	var lineText = '';
	var lineIndex = 0;
	var currentLineWidth = lineWidths[lineIndex];
	
	var textWidth = 0;
	
	for (var i = 0; i < words.length; i++)
	{
		var word = words[i];
		var wordWidth = wordMetrics[i];
		
		if (textWidth > 0) { textWidth += spaceWidth; }
		textWidth += wordWidth;
		
		if (textWidth > currentLineWidth)
		{
			lineTexts.push(lineText);
			lineText = '';
			lineIndex++;
			textWidth = 0;
			i--;
			
			if (lineIndex >= lineWidths.length)
			{
				currentLineWidth = lineWidths[lineWidths.length - 1];
			}
			else
			{
				currentLineWidth = lineWidths[lineIndex];
			}
		}
		else
		{
			if (lineText.length > 0) { lineText += ' '; }
			lineText += word;
		}
	}
	
	if (lineText.length > 0) { lineTexts.push(lineText); }
	
	return lineTexts;
}
function LinebreakJustify(lineWidths: number[], words: string[], wordMetrics: number[], optimalSpaceWidth: number, minSpaceWidth: number): PlacedWord[][] {
	
	// returns [ [ { text : "string" , lf : 0 , wd : 0 } ] ]
	
	var lineBoxes = [];
	var wordBoxes = [];
	
	var lineIndex = 0;
	var currentLineWidth = lineWidths[lineIndex];
	
	var wordCount = 0;
	var textWidth = 0;
	var oldDeviationFromOptimal = Infinity;
	
	var i = 0;
	while (i < words.length)
	{
		var word = words[i];
		var wordWidth = wordMetrics[i];
		
		wordCount++;
		textWidth += wordWidth;
		
		// cases to deal with:
		// one word is too big for the line - push a 0-word line
		// two words are too big for the line - push a 1-word line
		// three+ words are too big for the line - push a 2+-word line
		// (this is incomplete, there are lots of branches below
		
		if (wordCount == 1)
		{
			if (textWidth > currentLineWidth)
			{
				lineBoxes.push(wordBoxes);
				wordBoxes = [];
				wordCount = 0;
				textWidth = 0;
				oldDeviationFromOptimal = Infinity;
				lineIndex++;
				currentLineWidth = ((lineIndex >= lineWidths.length) ? lineWidths[lineWidths.length - 1] : lineWidths[lineIndex]);
				continue;
			}
			else
			{
				wordBoxes.push({ text : word , wd : wordWidth , lf : null });
			}
		}
		else
		{
			var remainingSpace = currentLineWidth - textWidth;
			var cubitsPerSpace = remainingSpace / (wordCount - 1);
			var deviationFromOptimal = Math.abs(optimalSpaceWidth - cubitsPerSpace);
			
			if (cubitsPerSpace < minSpaceWidth || oldDeviationFromOptimal < deviationFromOptimal)
			{
				// rewind one word, calculate wordBoxes and reset
				
				textWidth -= wordWidth;
				wordCount--;
				i--;
				
				if (wordCount == 1)
				{
					wordBoxes[0].lf = currentLineWidth / 2 - wordBoxes[0].wd / 2; // center the single word in the line.  not much can be done
				}
				else
				{
					remainingSpace = currentLineWidth - textWidth;
					cubitsPerSpace = remainingSpace / (wordCount - 1);
					
					var x = 0;
					for (var k = 0; k < wordBoxes.length; k++)
					{
						wordBoxes[k].lf = x;
						x += wordBoxes[k].wd + cubitsPerSpace;
					}
				}
				
				lineBoxes.push(wordBoxes);
				wordBoxes = [];
				wordCount = 0;
				textWidth = 0;
				oldDeviationFromOptimal = Infinity;
				lineIndex++;
				currentLineWidth = ((lineIndex >= lineWidths.length) ? lineWidths[lineWidths.length - 1] : lineWidths[lineIndex]);
			}
			else
			{
				oldDeviationFromOptimal = deviationFromOptimal;
				wordBoxes.push({ text : word , wd : wordWidth , lf : null });
			}
		}
		
		i++;
	}
	
	return lineBoxes;
}
function LinebreakKnuth(lineWidths: any[], text: string): void {
	
	var params = this.params;
	
	this.SetStyle(params.style);
	
	var text = params.text as string;
	
	var lineWidths = [];
	var linePoints = [];
	
	var type = 'justify';
	var tolerance = 3;
	var center = false;
	var verticalSpacing = params.pitch;
	
	for (var i = 0; i < params.boxes.length; i++)
	{
		var box = params.boxes[i];
		var sumHeight = 0;
		
		while (sumHeight < box.height)
		{
			lineWidths.push(box.width);
			linePoints.push({page:box.page,left:box.left,top:box.top+sumHeight});
			sumHeight += verticalSpacing;
		}
	}
	
	var g = this;
	var format = null;
	
	if (g.savedCanvasContext)
	{
		//format = Typeset.formatter(function(str) { return g.savedCanvasContext.measureText(str).width; });
		format = Typeset.formatter(function(str) { return g.measureText(str); });
	}
	else
	{
		format = Typeset.formatter(function(str) { return g.measureText(str); });
	}
	
	var nodes = format[type](text);
	var breaks = Typeset.linebreak(nodes, lineWidths, { tolerance : tolerance });
	if (breaks.length == 0) { throw new Error('Paragraph can not be set with the given tolerance'); }
	
	var lines = [];
	var lineStart = 0;
	
	// Iterate through the line breaks, and split the nodes at the correct point.
	for (var i = 1; i < breaks.length; i++)
	{
		var point = breaks[i].position;
		var r = breaks[i].ratio;
		
		for (var j = lineStart; j < nodes.length; j++)
		{
			// After a line break, we skip any nodes unless they are boxes or forced breaks.
			if (nodes[j].type === 'box' || (nodes[j].type === 'penalty' && nodes[j].penalty === -Typeset.linebreak.infinity))
			{
				lineStart = j;
				break;
			}
		}
		
		lines.push({ ratio : r , nodes : nodes.slice(lineStart, point + 1) , position : point });
		lineStart = point;
	}
	
	var maxLength = Math.max.apply(null, lineWidths);
	
	for (var i = 0; i < lines.length; i++)
	{
		var line = lines[i];
		var lineLength = i < lineWidths.length ? lineWidths[i] : lineWidths[lineWidths.length - 1];
		
		var x = linePoints[i].left;
		var y = linePoints[i].top;
		this.SetActivePage(linePoints[i].page);
		
		if (center) { x += (maxLength - lineLength) / 2; }
		
		for (var k = 0; k < line.nodes.length; k++)
		{
			var node = line.nodes[k];
			
			if (node.type === 'box')
			{
				this.fillText(node.value, x, y);
				x += node.width;
			}
			else if (node.type === 'glue')
			{
				x += node.width + line.ratio * (line.ratio < 0 ? node.shrink : node.stretch);
			}
			else if (node.type === 'penalty' && node.penalty === 100 && k === line.nodes.length - 1)
			{
				this.fillText('-', x, y);
			}
		}
	}
}

}

