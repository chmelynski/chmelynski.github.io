
(function() {

/* TODO

text pipeline
-------------
GenerateDocument
ParseText
MeasureText
DrawSection
LinebreakKnuth
Typeset
DrawSection

add style array, read style array and set ctx.font, implement ctx.font


we should have an inline class that acts like content but for inline text - footnotes, citations, inline math, etc.




rational asymptotic cutoffs for too-large/too-small fonts/pitch/etc


make AddContent into a type select box - read from Hyperdeck.ContentPlugins
we can no longer infer type on binding - for one, we have Diagram Contents binding to Diagram components, not to HTML elements
and inferring type is generally ambiguous

change some text inputs to select boxes
 style.font - read from Hyperdeck.Fonts
 table.borderStyle.style - solid, dashed, etc.

change text input to multibutton
 table.cellStyle.align
 list.align

implement aspect ratio preservation - diagram, image

move spacing variables to Article, defined in units of em (and make that clear in the interface)
Optimal space width
Minimum space width
Heterogenous letter spacing

pitch and indent should probably also be defined in ems

font size probably should be in points - does the rest of the world use points?

list
----
set height automatically - re-bind on HTML edit


table
-----
implement rowSpan/colSpan
set table width/height automatically when row/colSizes edited - this requires binding though, which may not be tenable
it might be best to keep the table content and HTML separate rather than binding them
it is difficult to maintain a bind - you have to re-bind whenever the HTML is edited, for example
which is possible, just kind of wasteful


graphical editing of common content variables
---------------------------------------------
we can hide the (bulky) common content interface, and replace it with an edit button
this should be done a la maximize/minimize
when editing graphically, draw red guidlines from the origin to the active handle, draw blue active/passive handles, a gray content box whose edges are active for changing width/height, and a green margin box





the text reader should ignore ul and table, but it seems like that's not happening



a caption is just a one-cell table - if you want a caption with a border or background color, just make it a one-cell table
a list is just a one-column table, with different indents




rename table margin to padding

list pitch should be a multiplier on the "natural" line height
list style should not exist - style is specified by classes and spans, like for base text, table, and caption
list align, for whole list, just A2-B2-C2 - vertical align can just be fixed at center (or top, whatever works)
list indent only makes sense when left-aligned
list symbol can be 1a, 1.1., etc. - combinations

components should have a z-index (0 is the level of the base text)





outline
-------

symbol style align margin includeinTOC
needs initial values

should be able to layout HTML with no content at all, just using defaults

base text will have to be typeset paragraph by paragraph, after any header

treat divs with text same as paragraphs

style fields can include size and bold/italic, and can reference either fonts or classes
16pt bold regular
16pt bold Arial
16pt bold - this references (default) by default


*/

/* interfaces

type Unit = 'in' | 'cm' | 'mm' | 'pt';
type Orientation = 'portrait' | 'landscape';
type HoriAlign = 'left' | 'center' | 'right';
type VertAlign = 'top' | 'center' | 'bottom';
type Align = 'A1' | 'B1' | 'C1' |
             'A2' | 'B2' | 'C2' |
             'A3' | 'B3' | 'C3';
type Anchor = 'A1' | 'B1' | 'C1' | 'D1' | 'E1' |
              'A2' | 'B2' | 'C2' | 'D2' | 'E2' |
              'A3' | 'B3' | 'C3' | 'D3' | 'E3' |
              'A4' | 'B4' | 'C4' | 'D4' | 'E4' |
              'A5' | 'B5' | 'C5' | 'D5' | 'E5';

interface Document {
	
	div: HTMLDivElement;
	
	unit: Unit;
	pixelsPerUnit: number;
	cubitsPerUnit: number;
	pageWidth: number;  // in units
	pageHeight: number; // in units
	
	doPageNumbering: boolean;
	firstPage: boolean;
	pageNumberHoriAlign: string; // type Align? it acts as both Anchor and Align though, so inconsistent with other usage
	pageNumberVertAlign: string;
	pageNumberHoriOffset: number; // in cubits?
	pageNumberVertOffset: number; // in cubits?
	pageNumberFont: string;
	pageNumberColor: string;
	
	sections: LinkedList<Section>;
}
interface Section {
	
	//text: string;
	//paragraphs: string[]; // this is filled by Parse
	
	words: string[];
	wordMetrics: number[];
	
	nPages: number;
	
	contents: LinkedList<Content>;
	
	orientation: Orientation;
	
	marginTop: number; // all of these size measurements are in cubits
	marginLeft: number;
	marginRight: number;
	marginBottom: number;
	
	columns: number;
	interColumnMargin: number;
	
	pitch: number;
	indent: number;
	optimalSpaceWidth: number;
	minimumSpaceWidth: number;
	heterogeneousLetterSpacing: number; // this is for things like foo[7] - one word with multiple styles. the drawText command needs to be called twice here - normal kerning doesn't apply, so we need a parameter to determine how far ahead of the last letter to place the second part
}
interface Content {
	
	ctx: CanvasRenderingContext2D;
	box: Box;
	type: string; // image, drawing, caption
	
	pageIndex: number;
	
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
	
	setSize(page: Page): void;
	draw(page: Page): void;
}
interface Page {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
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

interface LinkedList<T> {
	enumerate(): T[];
}

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

*/

class Doc {
	constructor(json, type, name) {
		
		const comp = this;
		
		if (!json)
		{
			json = {
				type: type,
				name: name,
				visible: true,
				article: null
			}
		}
		
		comp.type = json.type;
		comp.name = json.name;
		comp.visible = json.visible;
		
		comp.div = null;
		
		comp.article = new Article(json.article); // jQuery
		
		//if (!json) { json = {}; }
		//json.doc = this; // this is a dumb hack to get a reference to the article instance - we set props.doc.article = this in the article constructor
		//comp.article = React.createElement(Article, json); // React
	}
	add() {
		const comp = this;
		comp.div.html('');
		comp.refreshControls();
	}
	refreshControls() {
		const comp = this;
		comp.article.render(comp.div); // jQuery
		//ReactDOM.render(comp.article, comp.div[0]); // React
	}
	afterLoad(callback) {
		const comp = this;
		callback(comp);
	}
	afterAllLoaded() {
		
	}
	exec(thisArg) {
		
		const comp = this;
		
		const width = 8.5 * 72;
		const height = 11 * 72;
		
		const commands = comp.text.split('\n').map(x => x.trim());
		
		const pdf = new PDF(width, height);
		pdf.commands = commands;
		PDF.fontNameToIndex = { "Times-Roman" : 1 , "Helvetica" : 2 }
		PDF.fontNameToUint8Array = {};
		pdf.imageDict = {};
		
		const nextFontIndex = 3;
		
		commands.forEach(function(cmd) {
			
			if (cmd.startsWith('%%'))
			{
				const parts = cmd.split(' ');
				
				if (parts[0] == '%%Font') // %%Font F0 assets1/dir/arial.otf
				{
					const fontName = parts[1];
					const path = parts[2];
					const slashIndex = path.indexOf('/');
					const assetCompName = path.substr(0, slashIndex);
					const key = path.substr(slashIndex+1);
					const asset = Hyperdeck.Get(assetCompName).get(key);
					
					// make font object, font data object
					PDF.fontNameToIndex[fontName] = nextFontIndex++;
					PDF.fontNameToUint8Array[fontName] = new Uint8Array(asset);
				}
				else if (parts[0] == '%%Image') // %%Image Im1 assets1/dir/foo.png
				{
					const imageName = parts[1];
					const path = parts[2];
					const slashIndex = path.indexOf('/');
					const assetCompName = path.substr(0, slashIndex);
					const key = path.substr(slashIndex+1);
					const asset = Hyperdeck.Get(assetCompName).get(key);
					
					pdf.imageDict[imageName] = ConvertImageToPdf(asset); // is asset in the right form?
				}
			}
		});
		
		$('#output').html('').append($('<pre>').text(PDF.Export([pdf])));
	}
	write() {
		
		const comp = this;
		
		return {
			
			type: comp.type,
			name: comp.name,
			visible: comp.visible,
			
			article: comp.article.write()
		};
	}
	set(text, options) {
		
		const comp = this;
		
		comp.text = text;
		comp.markDirty();
		comp.codemirror.getDoc().setValue(comp.text);
		comp.onblur();
	}
	Run() {
		this.exec(this);
	}
}

class Base {
	
	// this is here so that content plugins can call plugin.content.linebreak()
	
	// function LinebreakNaive(lineWidths: number[], words: string[], wordMetrics: number[], spaceWidth: number): string[]
	// function LinebreakJustify(lineWidths: number[], words: string[], wordMetrics: number[], optimalSpaceWidth: number, minSpaceWidth: number): PlacedWord[][]
	// function LinebreakKnuth(lineWidths: any[], text: string): void
	// interface PlacedWord { text: string, lf: number , wd: number }
	
	// the split between word and wordMetrics is weird - all we need to do the linebreaking is the metrics
	// so why not package words into PlacedWords either before linebreaking or after, rather than during?
	
	constructor() {
		
	}
	linebreakNaive(lineWidths, words, wordMetrics, spaceWidth) {
		
		const lineTexts = [];
		
		let lineText = '';
		let lineIndex = 0;
		let currentLineWidth = lineWidths[lineIndex];
		
		let textWidth = 0;
		
		for (let i = 0; i < words.length; i++)
		{
			const word = words[i];
			const wordWidth = wordMetrics[i];
			
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
	linebreakJustify(lineWidths, overflowLineWidth, words, wordMetrics, optimalSpaceWidth, minSpaceWidth) {
		
		const lineBoxes = [];
		let wordBoxes = [];
		
		let lineIndex = 0;
		let currentLineWidth = lineWidths[lineIndex];
		
		let wordCount = 0;
		let textWidth = 0;
		let oldDeviationFromOptimal = Infinity;
		
		let i = 0;
		while (i < words.length)
		{
			const word = words[i];
			const wordWidth = wordMetrics[i];
			
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
					currentLineWidth = (lineIndex < lineWidths.length) ? lineWidths[lineIndex] : overflowLineWidth;
					continue;
				}
				else
				{
					wordBoxes.push({ text: word, wd: wordWidth, lf: null });
				}
			}
			else
			{
				let remainingSpace = currentLineWidth - textWidth;
				let cubitsPerSpace = remainingSpace / (wordCount - 1);
				const deviationFromOptimal = Math.abs(optimalSpaceWidth - cubitsPerSpace);
				
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
						
						let x = 0;
						for (let k = 0; k < wordBoxes.length; k++)
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
					currentLineWidth = (lineIndex < lineWidths.length) ? lineWidths[lineIndex] : overflowLineWidth;
				}
				else
				{
					oldDeviationFromOptimal = deviationFromOptimal;
					wordBoxes.push({ text: word, wd: wordWidth, lf: null });
				}
			}
			
			i++;
		}
		
		// the last line, which need not be justified
		if (wordBoxes.length > 0)
		{
			let lf = 0;
			
			for (let i = 0; i < wordBoxes.length; i++)
			{
				wordBoxes[i].lf = lf;
				lf += wordBoxes[i].wd + optimalSpaceWidth;
			}
			
			lineBoxes.push(wordBoxes);
		}
		
		return lineBoxes;
	}
	linebreakKnuth(lineWidths, overflowLineWidth, words, wordMetrics, spaceWidth, hyphenWidth) {
		
		lineWidths.push(overflowLineWidth);
		
		const placedWords = Typeset(words, wordMetrics, hyphenWidth, spaceWidth, lineWidths); // [ { text, x, line } ]
		
		// now we need to translate [ { text, x, line } ] to [[ { text, lf , wd } ]]
		// why do we need the wd?
		// obviously this should be harmonized eventually so we don't have to do this translation
		
		const result = [];
		let line = [];
		let lineIndex = 0;
		
		for (let i = 0; i < placedWords.length; i++)
		{
			const word = placedWords[i];
			
			if (word.line != lineIndex)
			{
				result.push(line);
				line = [];
				lineIndex++;
			}
			
			line.push({ text: word.text, lf: word.x });
		}
		
		return result;
	}
}

class Article {
	
	constructor(json) {
		
		const defaults = {
			
			unit: 'in',
			pixelsPerUnit: 50,
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
			pageNumberFill: 'rgb(0,0,0)',
			
			sections: [],
			styles: [ { name: '(default)', font: 'serif', size: 12, color: 'black' } ]
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		this.unit = json.unit;
		this.pixelsPerUnit = json.pixelsPerUnit;
		this.cubitsPerUnit = json.cubitsPerUnit;
		this.pageWidth = json.pageWidth;
		this.pageHeight = json.pageHeight;
		
		this.doPageNumbering = json.doPageNumbering;
		this.firstPage = json.firstPage;
		this.pageNumberHoriAlign = json.pageNumberHoriAlign; // left,center,right,L-R-L,R-L-R
		this.pageNumberVertAlign = json.pageNumberVertAlign;
		this.pageNumberHoriOffset = json.pageNumberHoriOffset;
		this.pageNumberVertOffset = json.pageNumberVertOffset;
		this.pageNumberFont = json.pageNumberFont;
		this.pageNumberFill = json.pageNumberFill;
		
		this.sections = new LinkedList();
		for (let i = 0; i < json.sections.length; i++) { this.sections.add(new Section(json.sections[i])); }
		
		this.styles = new Styles(json.styles);
	}
	write() {
		
		const article = this;
		
		return {
			
			unit: article.unit,
			pixelsPerUnit: article.pixelsPerUnit,
			cubitsPerUnit: article.cubitsPerUnit,
			pageWidth: article.pageWidth,
			pageHeight: article.pageHeight,
			
			doPageNumbering: article.doPageNumbering,
			firstPage: article.firstPage,
			pageNumberHoriAlign: article.pageNumberHoriAlign,
			pageNumberVertAlign: article.pageNumberVertAlign,
			pageNumberHoriOffset: article.pageNumberHoriOffset,
			pageNumberVertOffset: article.pageNumberVertOffset,
			pageNumberFont: article.pageNumberFont,
			pageNumberColor: article.pageNumberColor,
			
			sections: article.sections.enumerate().map(x => x.write()),
			styles: article.styles.write()
		};
	}
	render(parentDiv) {
		
		const doc = this;
		
		const div = $('<div class="doc"></div>').appendTo(parentDiv);
		
		$('<button>Generate</button>').addClass('btn btn-default').css('margin-right', '0.5em').on('click', function() {
			
			const pages = GenerateDocument(doc, false); // bPdf=false
			
			$('#output').css('display', 'none');
			$('#document').css('display', 'block');
			
			$('#document').html('');
			for (let i = 0; i < pages.length; i++) { $('#document').append(pages[i].ctx.canvas); }
			
		}).appendTo(div);
		
		$('<button>Clear</button>').addClass('btn btn-default').css('margin-right', '0.5em').on('click', function() {
			$('#output').css('display', 'block');
			$('#document').css('display', 'none');
		}).appendTo(div);
		
		$('<button>Export</button>').addClass('btn btn-default').on('click', function() { 
			const pages = GenerateDocument(doc, true); // bPdf=true
			// combine pages and download
		}).appendTo(div);
		
		$('<hr>').appendTo(div);
		
		$('<div class="pageSizeHeader">Page size and resolution</div>').appendTo(div);
		
		const articleGrid = $('<div class="articleGrid"></div>').appendTo(div);
		
		$('<div class="unitLabel">Unit</div>').appendTo(articleGrid);
		$('<div class="unitInput"><select>' + ['in','cm','mm','pt'].map(function(option) { return '<option' + ((option == doc.unit) ? ' selected' : '') + '>' + option + '</option>'; }).join('') + '</select></div>').appendTo(articleGrid).children(0).on('change', function() {
			
			const multiplier = UnitSize(this.value) / UnitSize(doc.unit);
			
			doc.pixelsPerUnit = Math.ceil(doc.pixelsPerUnit * multiplier);
			pixelsPerUnit[0].value = doc.pixelsPerUnit;
			doc.cubitsPerUnit = Math.ceil(doc.cubitsPerUnit * multiplier); // probably not necessary, the user will adjust as wanted
			cubitsPerUnit[0].value = doc.cubitsPerUnit;
			
			//pageNumberHoriOffset[0].value = doc.pageNumberHoriOffset *= multiplier;
			//pageNumberVertOffset[0].value = doc.pageNumberVertOffset *= multiplier;
			
			doc.unit = this.value;
			div.find('span.units').text(doc.unit);
		});
		
		$('<div class="pageWidthLabel">Page width</div>').appendTo(articleGrid);
		$('<div class="pageWidthInput"><input type="text" class="cubits"></div>').appendTo(articleGrid).children(0).attr('value', doc.pageWidth).on('change', function() { doc.pageWidth = parseFloat(this.value); });
		$('<div class="pageHeightLabel">Page height</div>').appendTo(articleGrid);
		$('<div class="pageHeightInput"><input type="text" class="cubits"></div>').appendTo(articleGrid).children(0).attr('value', doc.pageHeight).on('change', function() { doc.pageHeight = parseFloat(this.value); });
		
		$('<div class="cubitLabel">User space units per <span class="units">in</span></div>').appendTo(articleGrid);
		const cubitsPerUnit = $('<div class="cubitInput"><input type="text" class="cubits"></div>').appendTo(articleGrid).children(0).attr('value', doc.cubitsPerUnit).on('change', function() { doc.cubitsPerUnit = parseFloat(this.value); });
		$('<div class="pixelLabel">Pixels per <span class="units">in</span></div>').appendTo(articleGrid);
		const pixelsPerUnit = $('<div class="pixelInput"><input type="text" class="cubits"></div>').appendTo(articleGrid).children(0).attr('value', doc.pixelsPerUnit).on('change', function() { doc.pixelsPerUnit = parseFloat(this.value); });
		
		/*const doPageNumbering = $('<input type="checkbox"' + (doc.doPageNumbering ? ' checked' : '') + '>').on('change', function() { doc.doPageNumbering = !doc.doPageNumbering; });
		const firstPage = $('<input type="checkbox"' + (doc.firstPage ? ' checked' : '') + '>').on('change', function() { doc.firstPage = !doc.firstPage; });
		const pageNumberHoriAlign = BuildSelector(['left','center','right','alternateLeftRight','alternateRightLeft'], doc.pageNumberHoriAlign).css('width', '10em').on('change', function() { doc.pageNumberHoriAlign = this.value; });
		const pageNumberVertAlign = BuildSelector(['top','center','bottom'], doc.pageNumberVertAlign).css('width', '10em').on('change', function() { doc.pageNumberVertAlign = this.value; });
		const pageNumberHoriOffset = $('<input type="text" style="text-align:center;width:4em"></input>').attr('value', doc.pageNumberHoriOffset).on('change', function() { doc.pageNumberHoriOffset = parseFloat(this.value); });
		const pageNumberVertOffset = $('<input type="text" style="text-align:center;width:4em"></input>').attr('value', doc.pageNumberVertOffset).on('change', function() { doc.pageNumberVertOffset = parseFloat(this.value); });
		const pageNumberFont = $('<input type="text" style="text-align:center;width:9em"></input>').attr('value', doc.pageNumberFont).on('change', function() { doc.pageNumberFont = this.value; });
		const pageNumberColor = $('<input type="text" style="text-align:center;width:9em"></input>').attr('value', doc.pageNumberColor).on('change', function() { doc.pageNumberColor = this.value; });
		
		$('<hr>').appendTo(div);
		
		$('<div class="header"><label>Page numbering</label></div>').appendTo(div);
		$('<div class="name"><span>Display page numbers? </span></div>').append(doPageNumbering).appendTo(div);
		$('<div class="name"><span>Number first page? </span></div>').append(firstPage).appendTo(div);
		$('<div class="name"><span>Horizontal align: </span></div>').append(pageNumberHoriAlign).appendTo(div);
		$('<div class="name"><span>Vertical align: </span></div>').append(pageNumberVertAlign).appendTo(div);
		$('<div class="name"><span>Horizontal offset: </span></div>').append(pageNumberHoriOffset).appendTo(div);
		$('<div class="name"><span>Vertical offset: </span></div>').append(pageNumberVertOffset).appendTo(div);
		$('<div class="name"><span>Font: </span></div>').append(pageNumberFont).appendTo(div);
		$('<div class="name"><span>Fill: </span></div>').append(pageNumberColor).appendTo(div);*/
		
		$('<hr>').appendTo(div);
		
		const stylesDiv = $('<div class="styles"></div>').appendTo(div);
		doc.styles.render(stylesDiv);
		
		$('<hr>').appendTo(div);
		
		const sectionsDiv = $('<div class="sectionsDiv"></div>').appendTo(div);
		
		let elt = doc.sections.next;
		while (elt != doc.sections)
		{
			const section = elt.data;
			section.render(sectionsDiv);
			
			elt = elt.next;
		}
		
		$('<button style="margin:0.2em" class="btn btn-default btn-sm"><i class="fa fa-plus"></i> Add Section</button>').on('click', function() {
			const section = new Section();
			section.elt = doc.sections.add(section);
			section.render(sectionsDiv);
		}).appendTo(div);
		
		
		$('<hr>').appendTo(div);
	}
}
class Section extends Base {
	
	constructor(json) {
		
		const defaults = {
			
			selector: '',
			orientation: 'portrait',
			
			columns: 1,
			interColumnMargin: 50,
			
			pitch: 25,
			indent: 25,
			optimalSpaceWidth: 4,
			minimumSpaceWidth: 2, // there is no maximum - sometimes lines with big spaces just have to be done
			heterogeneousLetterSpacing: 2, // e.g. in foo<sup>1</sup>, this is the spacing between the o and 1
			
			marginTop: 100,
			marginLeft: 100,
			marginRight: 100,
			marginBottom: 100,
			
			contents: []
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		super();
		
		this.selector = json.selector;
		this.orientation = json.orientation;
		
		this.columns = json.columns;
		this.interColumnMargin = json.interColumnMargin;
		
		this.pitch = json.pitch;
		this.indent = json.indent;
		this.optimalSpaceWidth = json.optimalSpaceWidth;
		this.minimumSpaceWidth = json.minimumSpaceWidth;
		this.heterogeneousLetterSpacing = json.heterogeneousLetterSpacing;
		
		this.marginTop = json.marginTop;
		this.marginLeft = json.marginLeft;
		this.marginRight = json.marginRight;
		this.marginBottom = json.marginBottom;
		
		this.contents = new LinkedList();
		for (let i = 0; i < json.contents.length; i++)
		{
			const content = new Content(json.contents[i]); // select constructor from Hyperdeck.DocumentContentPlugins
			content.elt = this.contents.add(content);
		}
		
		
		// volatile variables
		
		this.words = null;
		this.wordMetrics = null;
		
		this.elt = null; // this is the LinkedList<Section> that is part of doc.sections
		this.div = null; // this is what gets removed on delete
	}
	write() {
		
		const section = this;
		
		return {
			selector: section.selector,
			orientation: section.orientation,
			
			columns: section.columns,
			interColumnMargin: section.interColumnMargin,
			
			pitch: section.pitch,
			indent: section.indent,
			optimalSpaceWidth: section.optimalSpaceWidth,
			minimumSpaceWidth: section.minimumSpaceWidth,
			heterogeneousLetterSpacing: section.heterogeneousLetterSpacing,
			
			marginTop: section.marginTop,
			marginLeft: section.marginLeft,
			marginRight: section.marginRight,
			marginBottom: section.marginBottom,
			
			contents: section.contents.enumerate().map(x => x.write())
		};
	}
	remove() {
		this.div.remove();
	}
	render(parentDiv) {
		
		const section = this;
		
		const div = section.div = $('<div class="section"></div>').appendTo(parentDiv);
		
		$('<div><span class="sectionHeader">Section</span><button style="float:right" class="btn btn-default btn-sm"><i class="fa fa-trash-o"></i> Delete</button></div>').appendTo(div).children(1).on('click', function() {
			section.elt.remove();
			section.div.remove();
		});
		
		const grid = $('<div class="sectionGrid"></div>').appendTo(div);
		
		$('<div class="selectorLabel">Selector</div>').appendTo(grid);
		$('<div class="selectorInput"><input type="text" placeholder="html1, md2"></input></div>').appendTo(grid).children(0).attr('value', section.selector).on('change', function() {
			section.selector = this.value;
		});
		
		$('<div class="orientationLabel">Orientation</div>').appendTo(grid);
		$('<div class="orientationInput"><select>' + ['portrait','landscape'].map(function(option) { return '<option' + ((option == section.orientation) ? ' selected' : '') + '>' + option + '</option>'; }).join('') + '</select></div>').appendTo(grid).children(0).on('change', function() {
			section.orientation = this.value;
		});
		
		$('<div class="columnsLabel">Number of columns</div>').appendTo(grid);
		$('<div class="columnsInput"><select class="columnSelector">' + ['1','2','3','4'].map(function(option) { return '<option' + ((option == section.columns.toString()) ? ' selected' : '') + '>' + option + '</option>'; }).join('') + '</select></div>').appendTo(grid).children(0).on('change', function() {
			section.columns = parseInt(this.value);
		});
		
		$('<div class="interColumnMarginLabel">Inter-column margin</div>').appendTo(grid);
		$('<div class="interColumnMarginInput"><input type="text" class="cubits"></input></div>').appendTo(grid).children(0).attr('value', section.interColumnMargin).on('change', function() {
			section.interColumnMargin = parseFloat(this.value);
		});
		
		$('<div class="indentLabel">Indentation</div>').appendTo(grid);
		$('<div class="indentInput"><input type="text" class="cubits"></input></div>').appendTo(grid).children(0).attr('value', section.indent).on('change', function() {
			section.indent = parseFloat(this.value);
		});
		
		$('<div class="pitchLabel">Line height</div>').appendTo(grid);
		$('<div class="pitchInput"><input type="text" class="cubits"></input></div>').appendTo(grid).children(0).attr('value', section.pitch).on('change', function() {
			section.pitch = parseFloat(this.value);
		});
		
		//$('<div class="spacingLabel">Spacing</div>').appendTo(grid);
		
		$('<div class="optimalSpaceWidthLabel">Optimal space width</div>').appendTo(grid);
		$('<div class="optimalSpaceWidthInput"><input type="text" class="cubits"></input></div>').appendTo(grid).children(0).attr('value', section.optimalSpaceWidth).on('change', function() {
			section.optimalSpaceWidth = parseFloat(this.value);
		});
		
		$('<div class="minimumSpaceWidthLabel">Minimum space width</div>').appendTo(grid);
		$('<div class="minimumSpaceWidthInput"><input type="text" class="cubits"></input></div>').appendTo(grid).children(0).attr('value', section.minimumSpaceWidth).on('change', function() {
			section.minimumSpaceWidth = parseFloat(this.value);
		});
		
		$('<div class="heterogeneousLetterSpacingLabel">Heterogenous letter spacing</div>').appendTo(grid);
		$('<div class="heterogeneousLetterSpacingInput"><input type="text" class="cubits"></input></div>').appendTo(grid).children(0).attr('value', section.heterogeneousLetterSpacing).on('change', function() {
			section.heterogeneousLetterSpacing = parseFloat(this.value);
		});
		
		$('<div class="marginLabel">Page margins</div>').appendTo(grid);
		const marginGrid = $('<div class="sectionMargin"></div>').appendTo(grid);
		$('<div class="margin-T"><input type="text" class="cubits"></input></div>').appendTo(marginGrid).children(0).attr('value', section.marginTop).on('change', function() { section.marginTop = parseFloat(this.value); });
		$('<div class="margin-L"><input type="text" class="cubits"></input></div>').appendTo(marginGrid).children(0).attr('value', section.marginLeft).on('change', function() { section.marginLeft = parseFloat(this.value); });
		$('<div class="margin-R"><input type="text" class="cubits"></input></div>').appendTo(marginGrid).children(0).attr('value', section.marginRight).on('change', function() { section.marginRight = parseFloat(this.value); });
		$('<div class="margin-B"><input type="text" class="cubits"></input></div>').appendTo(marginGrid).children(0).attr('value', section.marginBottom).on('change', function() { section.marginBottom = parseFloat(this.value); });
		
		$('<hr />').appendTo(div);
		
		const contentsDiv = $('<div class="contentsDiv"></div>').appendTo(div);
		
		let elt = section.contents.next;
		while (elt != section.contents)
		{
			const content = elt.data;
			content.render(contentsDiv);
			
			elt = elt.next;
		}
		
		const ul = $('<div class="btn-group"><button class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fa fa-plus"></i> Add Content <span class="caret"></span></button><ul class="dropdown-menu"></ul></div>').appendTo(div).children(1);
		
		for (let type in Hyperdeck.ContentPlugins)
		{
			const clas = Hyperdeck.ContentPlugins[type];
			$('<li><a>' + clas.name + '</a></li>').appendTo(ul).children(0).on('click', function() {
				const content = new Content();
				content.type = type;
				content.elt = section.contents.add(content);
				content.render(contentsDiv);
				
				content.plugin = new Hyperdeck.ContentPlugins[content.type](content, null);
				content.plugin.render(content.pluginDiv);
			});
		}
		
		//$('<button style="margin:0.2em" class="btn btn-default btn-sm"><i class="fa fa-plus"></i> Add Content</button>').on('click', function() {
		//	const content = new Content();
		//	content.elt = section.contents.add(content);
		//	content.render(contentsDiv); }).appendTo(div);
		
		$('<hr />').appendTo(div);
	}
}
class Content extends Base {
	
	constructor(json) {
		
		const defaults = {
			
			type: '',
			
			selector: '',
			pageIndex: 0,
			
			anchor: 'C3',
			x: 0,
			y: 0,
			align: 'B2',
			width: 100,
			height: 100,
			
			marginTop: 20,
			marginLeft: 20,
			marginRight: 20,
			marginBottom: 20,
			
			plugin: null
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		super();
		
		this.ctx = null;
		this.box = null;
		
		this.type = json.type;
		
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
		
		this.plugin = json.plugin ? new Hyperdeck.ContentPlugins[this.type](this, json.plugin) : null;
		
		this.elt = null; // this is the LinkedList<Content> that is part of section.contents
		this.div = null; // <div class="content">
		
		this.underlying = this.selector ? $('#' + this.selector)[0] : null; // this is the HTML element that the Content is bound to
	}
	write() {
		
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
			marginBottom: this.marginBottom,
			
			plugin: this.plugin ? this.plugin.write() : null
		};
	}
	draw(page) {
		
		const content = this;
		const ctx = page.ctx;
		
		content.plugin.draw(ctx);
	}
	remove() {
		const content = this;
		content.elt.remove();
		content.div.remove();
	}
	render(parentDiv) {
		
		const content = this;
		
		const div = content.div = $('<div class="content">').appendTo(parentDiv);
		
		$('<div><span class="contentHeader">' + content.type[0].toUpperCase() + content.type.substr(1) + '</span><button class="btn btn-default btn-sm contentDelete"><i class="fa fa-trash-o"></i> Delete</button></div>').appendTo(div).children(1).on('click', function() {
			content.elt.remove();
			content.div.remove();
		});
		
		const contentGrid1 = $('<div class="contentGrid1">').appendTo(div);
		
		$('<div class="selectorLabel">Selector</div>').appendTo(contentGrid1);
		$('<div class="selectorInput"><input type="text" placeholder="id"></input></div>').appendTo(contentGrid1).children(0).attr('value', content.selector).on('change', function() {
			content.selector = this.value;
		});
		
		$('<div class="pageIndexLabel">Page index</div>').appendTo(contentGrid1);
		$('<div class="pageIndexInput"><input type="text"></div>').appendTo(contentGrid1).children(0).attr('value', content.pageIndex).on('change', function() {
			content.pageIndex = parseInt(this.value);
		});
		
		const contentGrid2 = $('<div class="contentGrid2">').appendTo(div);
		
		//$('<div class="name coordsLabel">Coords</div>').appendTo(contentGrid2);
		const coordsGrid = $('<div class="coordsGrid"></div>').appendTo(contentGrid2);
		
		$('<div class="name">x</div>').appendTo(coordsGrid);
		const x = $('<div><input type="text" class="cubits"></div>').appendTo(coordsGrid).children(0).attr('value', content.x).on('change', function() {
			content.x = parseFloat(this.value);
		});
		$('<div class="name">y</div>').appendTo(coordsGrid);
		const y = $('<div><input type="text" class="cubits"></div>').appendTo(coordsGrid).children(0).attr('value', content.y).on('change', function() {
			content.y = parseFloat(this.value);
		});
		$('<div class="name">width</div>').appendTo(coordsGrid);
		$('<div><input type="text" class="cubits"></div>').appendTo(coordsGrid).children(0).attr('value', content.width).on('change', function() {
			content.width = parseFloat(this.value);
		});
		$('<div class="name">height</div>').appendTo(coordsGrid);
		$('<div><input type="text" class="cubits"></div>').appendTo(coordsGrid).children(0).attr('value', content.height).on('change', function() {
			content.height = parseFloat(this.value);
		});
		
		$('<div class="name anchorLabel">Origin</div>').appendTo(contentGrid2);
		const anchorGrid = $('<div class="anchorGrid"></div>').appendTo(contentGrid2);
		$('<div data="A1" class="anchor norm TL"></div>').appendTo(anchorGrid);
		$('<div data="B1" class="anchor norm TR"></div>').appendTo(anchorGrid);
		$('<div data="C1" class="anchor vert T "></div>').appendTo(anchorGrid);
		$('<div data="D1" class="anchor norm TL"></div>').appendTo(anchorGrid);
		$('<div data="E1" class="anchor norm TR"></div>').appendTo(anchorGrid);
		$('<div data="A2" class="anchor norm BL"></div>').appendTo(anchorGrid);
		$('<div data="B2" class="anchor norm BR"></div>').appendTo(anchorGrid);
		$('<div data="C2" class="anchor vert B "></div>').appendTo(anchorGrid);
		$('<div data="D2" class="anchor norm BL"></div>').appendTo(anchorGrid);
		$('<div data="E2" class="anchor norm BR"></div>').appendTo(anchorGrid);
		$('<div data="A3" class="anchor hori L "></div>').appendTo(anchorGrid);
		$('<div data="B3" class="anchor hori R "></div>').appendTo(anchorGrid);
		$('<div data="C3" class="anchor cent C "></div>').appendTo(anchorGrid);
		$('<div data="D3" class="anchor hori L "></div>').appendTo(anchorGrid);
		$('<div data="E3" class="anchor hori R "></div>').appendTo(anchorGrid);
		$('<div data="A4" class="anchor norm TL"></div>').appendTo(anchorGrid);
		$('<div data="B4" class="anchor norm TR"></div>').appendTo(anchorGrid);
		$('<div data="C4" class="anchor vert T "></div>').appendTo(anchorGrid);
		$('<div data="D4" class="anchor norm TL"></div>').appendTo(anchorGrid);
		$('<div data="E4" class="anchor norm TR"></div>').appendTo(anchorGrid);
		$('<div data="A5" class="anchor norm BL"></div>').appendTo(anchorGrid);
		$('<div data="B5" class="anchor norm BR"></div>').appendTo(anchorGrid);
		$('<div data="C5" class="anchor vert B "></div>').appendTo(anchorGrid);
		$('<div data="D5" class="anchor norm BL"></div>').appendTo(anchorGrid);
		$('<div data="E5" class="anchor norm BR"></div>').appendTo(anchorGrid);
		anchorGrid.find('[data="' + content.anchor + '"]').addClass('selected');
		anchorGrid.find('div.anchor').on('click', function() {
			const anchor = $(this).attr('data');
			anchorGrid.find('.selected').removeClass('selected');
			$(this).addClass('selected');
			content.anchor = anchor;
			
			if (anchor[1] == '3')
			{
				y.attr('disabled', 'disabled');
				y[0].value = '0';
			}
			else
			{
				y.removeAttr('disabled');
			}
			
			if (anchor[0] == 'C')
			{
				x.attr('disabled', 'disabled');
				x[0].value = '0';
			}
			else
			{
				x.removeAttr('disabled');
			}
		});
		
		if (content.anchor[0] == 'C')
		{
			x.attr('disabled', 'disabled');
			x[0].value = '0';
			content.x = 0;
		}
		
		if (content.anchor[1] == '3')
		{
			y.attr('disabled', 'disabled');
			y[0].value = '0';
			content.y = 0;
		}
		
		$('<div class="name alignLabel">Align</div>').appendTo(contentGrid2);
		const alignGrid = $('<div class="alignGrid"></div>').appendTo(contentGrid2);
		$('<div data="A1" class="align norm A1"></div>').appendTo(alignGrid);
		$('<div data="B1" class="align norm B1"></div>').appendTo(alignGrid);
		$('<div data="C1" class="align norm C1"></div>').appendTo(alignGrid);
		$('<div data="A2" class="align norm A2"></div>').appendTo(alignGrid);
		$('<div data="B2" class="align norm B2"></div>').appendTo(alignGrid);
		$('<div data="C2" class="align norm C2"></div>').appendTo(alignGrid);
		$('<div data="A3" class="align norm A3"></div>').appendTo(alignGrid);
		$('<div data="B3" class="align norm B3"></div>').appendTo(alignGrid);
		$('<div data="C3" class="align norm C3"></div>').appendTo(alignGrid);
		alignGrid.find('[data="' + content.align + '"]').addClass('selected');
		alignGrid.find('div.align').on('click', function() {
			alignGrid.find('.selected').removeClass('selected');
			$(this).addClass('selected');
			content.align = $(this).attr('data');
		});
		
		/*const anchorTbody = $('<div class=""><table class="align-grid five-by-five"><tr></tr><tr></tr><tr></tr><tr></tr><tr></tr></table></div>').appendTo(div).find('tbody');
		const tr1 = anchorTbody.children().eq(0);
		const tr2 = anchorTbody.children().eq(1);
		const tr3 = anchorTbody.children().eq(2);
		const tr4 = anchorTbody.children().eq(3);
		const tr5 = anchorTbody.children().eq(4);
		$('<td><div data="A1" class="anchor norm TL"></div></td>').appendTo(tr1);
		$('<td><div data="B1" class="anchor norm TR"></div></td>').appendTo(tr1);
		$('<td><div data="C1" class="anchor vert T "></div></td>').appendTo(tr1);
		$('<td><div data="D1" class="anchor norm TL"></div></td>').appendTo(tr1);
		$('<td><div data="E1" class="anchor norm TR"></div></td>').appendTo(tr1);
		$('<td><div data="A2" class="anchor norm BL"></div></td>').appendTo(tr2);
		$('<td><div data="B2" class="anchor norm BR"></div></td>').appendTo(tr2);
		$('<td><div data="C2" class="anchor vert B "></div></td>').appendTo(tr2);
		$('<td><div data="D2" class="anchor norm BL"></div></td>').appendTo(tr2);
		$('<td><div data="E2" class="anchor norm BR"></div></td>').appendTo(tr2);
		$('<td><div data="A3" class="anchor hori L "></div></td>').appendTo(tr3);
		$('<td><div data="B3" class="anchor hori R "></div></td>').appendTo(tr3);
		$('<td><div data="C3" class="anchor cent C "></div></td>').appendTo(tr3);
		$('<td><div data="D3" class="anchor hori L "></div></td>').appendTo(tr3);
		$('<td><div data="E3" class="anchor hori R "></div></td>').appendTo(tr3);
		$('<td><div data="A4" class="anchor norm TL"></div></td>').appendTo(tr4);
		$('<td><div data="B4" class="anchor norm TR"></div></td>').appendTo(tr4);
		$('<td><div data="C4" class="anchor vert T "></div></td>').appendTo(tr4);
		$('<td><div data="D4" class="anchor norm TL"></div></td>').appendTo(tr4);
		$('<td><div data="E4" class="anchor norm TR"></div></td>').appendTo(tr4);
		$('<td><div data="A5" class="anchor norm BL"></div></td>').appendTo(tr5);
		$('<td><div data="B5" class="anchor norm BR"></div></td>').appendTo(tr5);
		$('<td><div data="C5" class="anchor vert B "></div></td>').appendTo(tr5);
		$('<td><div data="D5" class="anchor norm BL"></div></td>').appendTo(tr5);
		$('<td><div data="E5" class="anchor norm BR"></div></td>').appendTo(tr5);
		anchorTbody.find('[data="' + content.anchor + '"]').addClass('selected');
		anchorTbody.find('div.anchor').on('click', function() {
			anchorTbody.find('.selected').removeClass('selected');
			$(this).addClass('selected');
			content.anchor = $(this).attr('data');
		});
		
		const alignTbody = $('<div class=""><table class="align-grid three-by-three"><tr></tr><tr></tr><tr></tr></table></div>').appendTo(div).find('tbody');
		const tr6 = alignTbody.children().eq(0);
		const tr7 = alignTbody.children().eq(1);
		const tr8 = alignTbody.children().eq(2);
		$('<td><div data="TL" class="align norm TL-45"></div></td>').appendTo(tr6);
		$('<td><div data="TC" class="align norm TC-45"></div></td>').appendTo(tr6);
		$('<td><div data="TR" class="align norm TR-45"></div></td>').appendTo(tr6);
		$('<td><div data="CL" class="align norm CL-45"></div></td>').appendTo(tr7);
		$('<td><div data="CC" class="align norm CC-45"></div></td>').appendTo(tr7);
		$('<td><div data="CR" class="align norm CR-45"></div></td>').appendTo(tr7);
		$('<td><div data="BL" class="align norm BL-45"></div></td>').appendTo(tr8);
		$('<td><div data="BC" class="align norm BC-45"></div></td>').appendTo(tr8);
		$('<td><div data="BR" class="align norm BR-45"></div></td>').appendTo(tr8);
		alignTbody.find('[data="' + content.align + '"]').addClass('selected');
		alignTbody.find('div.align').on('click', function() {
			alignTbody.find('.selected').removeClass('selected');
			$(this).addClass('selected');
			content.align = $(this).attr('data');
		});*/
		
		$('<div class="name contentMarginLabel">Margins</div>').appendTo(contentGrid2);
		const contentMarginDiv = $('<div class="contentMarginDiv"></div>').appendTo(contentGrid2);
		const T = $('<div class="margin-T"><input type="text" class="cubits"></input></div>');
		const L = $('<div class="margin-L"><input type="text" class="cubits"></input></div>');
		const R = $('<div class="margin-R"><input type="text" class="cubits"></input></div>');
		const B = $('<div class="margin-B"><input type="text" class="cubits"></input></div>');
		T.appendTo(contentMarginDiv).children(0).attr('value', content.marginTop).on('change', function() { content.marginTop = parseFloat(this.value); });
		L.appendTo(contentMarginDiv).children(0).attr('value', content.marginLeft).on('change', function() { content.marginLeft = parseFloat(this.value); });
		R.appendTo(contentMarginDiv).children(0).attr('value', content.marginRight).on('change', function() { content.marginRight = parseFloat(this.value); });
		B.appendTo(contentMarginDiv).children(0).attr('value', content.marginBottom).on('change', function() { content.marginBottom = parseFloat(this.value); });
		
		content.pluginDiv = $('<div class="plugin">').appendTo(div);
		if (content.plugin) { content.plugin.render(content.pluginDiv); }
		
		$('<hr />').appendTo(div);
	}
}

class Styles {
	
	// this.rows = LinkedList< { name, font, size, color } >
	
	constructor(json) {
		
		this.rows = new LinkedList();
		for (let i = 0; i < json.length; i++) { this.rows.add(json[i]); }
	}
	write() {
		return this.rows.enumerate();
	}
	get(name) {
		
		let elt = this.rows.next;
		
		while (elt != this.rows)
		{
			if (elt.data.name == name)
			{
				return elt.data;
			}
			
			elt = elt.next;
		}
		
		return null;
	}
	render(div) {
		
		const styles = this;
		
		$('<div class="styleHeader">Styles</div>').appendTo(div);
		
		const grid = $('<div class="styleGrid"></div>').appendTo(div);
		
		$('<div class="columnHeader">Class</div>').appendTo(grid);
		$('<div class="columnHeader">Font</div>').appendTo(grid);
		$('<div class="columnHeader">Size</div>').appendTo(grid);
		$('<div class="columnHeader">Color</div>').appendTo(grid);
		$('<div></div>').appendTo(grid);
		
		let n = 1;
		
		function AddRow(theelt, style) {
			
			//const reorderButton = $('<a class="reorder-handle btn btn-default btn-sm ui-sortable-handle" type="button" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Drag to Reorder" style="cursor: move;"><i class="fa fa-arrows-v"></i></a>').appendTo(grid);
			
			const nameDiv = $('<div class="nameInput"><input type="text"></input></div>').appendTo(grid);
			nameDiv.children(0).attr('value', style.name).on('change', function() {
				style.name = this.value;
			});
			
			// perhaps font select boxes refresh options on focus
			const fontDiv = $('<div class="fontInput"><input type="text"></input></div>').appendTo(grid);
			fontDiv.children(0).attr('value', style.font).on('change', function() {
				style.font = this.value;
			});
			
			const sizeDiv = $('<div class="sizeInput"><input type="text" class="cubits"></input></div>').appendTo(grid);
			sizeDiv.children(0).attr('value', style.size).on('change', function() {
				style.size = parseFloat(this.value);
			});
			
			const colorDiv = $('<div class="colorInput"><input type="text"></input></div>').appendTo(grid);
			colorDiv.children(0).attr('value', style.color).on('change', function() {
				style.color = this.value;
			});
			
			const deleteDiv = $('<div class="deleteButton"><button class="btn btn-default btn-xs"><i class="fa fa-trash"></i> Delete</button></div>').appendTo(grid);
			deleteDiv.children(0).on('click', function() {
				
				nameDiv.remove();
				fontDiv.remove();
				sizeDiv.remove();
				colorDiv.remove();
				deleteDiv.remove();
				
				theelt.remove();
				
				n--;
				grid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
			});
		}
		
		let elt = styles.rows.next;
		while (elt != styles.rows)
		{
			AddRow(elt, elt.data);
			elt = elt.next;
			n++;
		}
		
		grid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		
		$('<button class="btn btn-default btn-xs"><i class="fa fa-plus"></i> Add Style</button>').appendTo(div).on('click', function() {
			const style = {
				name: '',
				font: '',
				size: '',
				color: ''
			};
			const newelt = styles.rows.add(style);
			AddRow(newelt, style);
			n++;
			grid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		});
		
		// have a canvas that draws the name in the style
	}
}
class Style {
	
	// we're not using this right now - it is here in case we want to add some volatile variables like fontObject
	
	constructor(json) {
		
		const defaults = {
			name: '',
			font: '',
			size: '',
			color: ''
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		this.name = json.name;
		this.font = json.font;
		this.size = json.size;
		this.color = json.color;
	}
}

class Caption {
	
	constructor(content, json) {
		
		const defaults = {
			align: 'B2'
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		this.align = json.align;
		
		this.content = content;
	}
	write() {
		
		return {
			align: this.align
		};
	}
	render(div) {
		
		const caption = this;
		
		//$('<div class="subheader">Caption</div>').appendTo(div);
		
		//const grid = $('<div class="captionGrid">').appendTo(div);
		
		$('<div class="name">Text alignment</div>').appendTo(div);
		const alignGrid = $('<div class="textAlignGrid"></div>').appendTo(div);
		$('<div data="A1" class="textAlign A1"></div>').appendTo(alignGrid);
		$('<div data="B1" class="textAlign B1"></div>').appendTo(alignGrid);
		$('<div data="C1" class="textAlign C1"></div>').appendTo(alignGrid);
		$('<div data="A2" class="textAlign A2"></div>').appendTo(alignGrid);
		$('<div data="B2" class="textAlign B2"></div>').appendTo(alignGrid);
		$('<div data="C2" class="textAlign C2"></div>').appendTo(alignGrid);
		$('<div data="A3" class="textAlign A3"></div>').appendTo(alignGrid);
		$('<div data="B3" class="textAlign B3"></div>').appendTo(alignGrid);
		$('<div data="C3" class="textAlign C3"></div>').appendTo(alignGrid);

		alignGrid.find('[data="' + caption.align + '"]').addClass('selected');
		alignGrid.find('.textAlign').on('click', function() {
			alignGrid.find('.selected').removeClass('selected');
			$(this).addClass('selected');
			caption.align = $(this).attr('data');
		});
	}
	draw(ctx) {
		
		const text = document.getElementById(this.content.selector).innerText;
		
		ctx.save();
		
		// wrap text
		
		ctx.font = '12pt Arial';
		ctx.fillStyle = 'black';
		ApplyTextAlign(ctx, this.align);
		const [x, y] = ApplyCoordAlign(this.align, {top:0,left:0,right:0,bottom:0}, this.content.box.lf, this.content.box.tp, this.content.box.wd, this.content.box.hg);
		
		// clip overflow
		ctx.beginPath();
		ctx.rect(this.content.box.lf, this.content.box.tp, this.content.box.wd, this.content.box.hg);
		ctx.clip();
		
		ctx.fillText(text, x, y);
		
		ctx.restore();
	}
}
class Image {
	
	constructor(content, json) {
		
		const defaults = {
			sx: 0,
			sy: 0,
			sw: 0,
			sh: 0,
			preserveAspect: true
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		this.sx = json.sx;
		this.sy = json.sy;
		this.sw = json.sw;
		this.sh = json.sh;
		
		this.preserveAspect = json.preserveAspect;
		
		this.content = content;
	}
	write() {
		
		return {
			sx: this.sx,
			sy: this.sy,
			sw: this.sw,
			sh: this.sh,
			preserveAspect: this.preserveAspect
		};
	}
	render(div) {
		
		const image = this;
		
		$('<div class="subheader">Image</div>').appendTo(div);
		
		const grid = $('<div class="imageGrid">').appendTo(div);
		
		$('<div class="syLabel">Source top</div>').appendTo(grid);
		$('<div class="syInput"><input type="text"></input></div>').appendTo(grid).children(0).attr('value', image.sy).on('change', function() {
			image.sy = parseFloat(this.value);
		});
		
		$('<div class="sxLabel">Source left</div>').appendTo(grid);
		$('<div class="sxInput"><input type="text"></input></div>').appendTo(grid).children(0).attr('value', image.sx).on('change', function() {
			image.sx = parseFloat(this.value);
		});
		
		$('<div class="swLabel">Source width</div>').appendTo(grid);
		$('<div class="swInput"><input type="text"></input></div>').appendTo(grid).children(0).attr('value', image.sw).on('change', function() {
			image.sw = parseFloat(this.value);
		});
		
		$('<div class="shLabel">Source height</div>').appendTo(grid);
		$('<div class="shInput"><input type="text"></input></div>').appendTo(grid).children(0).attr('value', image.sh).on('change', function() {
			image.sh = parseFloat(this.value);
		});
		
		$('<div class="preserveAspectLabel">Preserve aspect ratio</div>').appendTo(grid);
		$('<div class="preserveAspectInput"><input type="checkbox"' + (image.preserveAspect ? ' checked' : '') + '></div>').appendTo(grid).children(0).on('change', function() {
			image.preserveAspect = this.checked;
		});
	}
	draw(ctx) {
		
		const img = document.getElementById(this.content.selector);
		ctx.drawImage(img, this.content.box.lf, this.content.box.tp, this.content.box.wd, this.content.box.hg);
	}
}
class Diagram {
	
	constructor(content, json) {
		
		const defaults = {
			preserveAspect: true
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		this.preserveAspect = json.preserveAspect;
		
		this.content = content;
	}
	write() {
		
		return {
			preserveAspect: this.preserveAspect
		};
	}
	render(div) {
		
		const diagram = this;
		
		$('<div class="subheader">Diagram</div>').appendTo(div);
		
		const grid = $('<div class="diagramGrid">').appendTo(div);
		
		$('<div class="preserveAspectLabel">Preserve aspect ratio</div>').appendTo(grid);
		$('<div class="preserveAspectInput"><input type="checkbox"' + (diagram.preserveAspect ? ' checked' : '') + '></div>').appendTo(grid).children(0).on('change', function() {
			diagram.preserveAspect = this.checked;
		});
	}
	draw(ctx) {
		
		ctx.save();
		ctx.transform(1, 0, 0, 1, this.content.box.lf, this.content.box.tp);
		
		ctx.beginPath();
		ctx.rect(0, 0, this.content.box.wd, this.content.box.hg);
		ctx.clip();
		
		Hyperdeck.Run(this.content.selector, ctx); // we probably should pass this, and use this.ctx in the fn body
		//this.fn.call(ctx, ctx);
		
		ctx.restore();
	}
}
class Table {
	
	constructor(content, json) {
		
		const defaults = {
			rowSizes: '',
			colSizes: '',
			borderStyles: [
				{
					range: ':',
					sides: 'All', // All Top Left Right Bottom Inside Outside (how to allow combinations like Top/Bottom?)
					width: 1,
					style: 'solid',
					color: 'black'
				}
			],
			cellStyles: [
				{
					range: ':',
					margin: '0 0 0 0', // TLRB, TB RL, T RL B, T L R B
					align: 'B2',
					backgroundColor: 'white'
				}
			]
		};
		
		
		// a little syntax goes a long way in reducing the complexity of table controls
		// we use Excel-style range selectors - 1:1 = first row, A:A = first col, C-1:C-1 = last col
		// can use R1C1 style, which allows for use of negative numbers, like in Python slices
		// R-1:R-1 = select whole last row
		// bare colon means the whole table
		
		// rowSizes and colSizes syntax:
		// we use ... and * to define repeating row/col sizes
		// 50 - one number means constant size
		// 50 30 ... 50 - the ellipses means repeat - we can only have one ellipses in the list though - two would be ambiguous
		// 50 30*10 50 - we can use the * operator to repeat values
		
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		this.rowSizes = json.rowSizes;
		this.colSizes = json.colSizes;
		
		this.borderStyles = new LinkedList();
		for (let i = 0; i < json.borderStyles.length; i++) { this.borderStyles.add(json.borderStyles[i]); }
		
		this.cellStyles = new LinkedList();
		for (let i = 0; i < json.cellStyles.length; i++) { this.cellStyles.add(json.cellStyles[i]); }
		
		this.content = content;
	}
	write() {
		
		return {
			rowSizes: this.rowSizes,
			colSizes: this.colSizes,
			borderStyles: this.borderStyles.enumerate(),
			cellStyles: this.cellStyles.enumerate()
		};
	}
	render(div) {
		
		const table = this;
		
		$('<div class="subheader">Table</div>').appendTo(div);
		
		const grid = $('<div class="tableGrid">').appendTo(div);
		
		$('<div class="rowSizesLabel">Row heights</div>').appendTo(grid);
		$('<div class="rowSizesInput"><input type="text" placeholder="50 20 ... 50"></input></div>').appendTo(grid).children(0).attr('value', table.rowSizes).on('change', function() {
			table.rowSizes = this.value;
			try { table.parseSizes(this.value, 0); } catch(e) { alert('Invalid size formula'); }
		});
		
		$('<div class="colSizesLabel">Column widths</div>').appendTo(grid);
		$('<div class="colSizesInput"><input type="text" placeholder="50 20*10 50"></input></div>').appendTo(grid).children(0).attr('value', table.colSizes).on('change', function() {
			table.colSizes = this.value;
			try { table.parseSizes(this.value, 0); } catch(e) { alert('Invalid size formula'); }
		});
		
		$('<div class="borderStyleLabel">Border styles</div>').appendTo(div);
		const borderStyleGrid = $('<div class="borderStyleGrid"></div>').appendTo(div);
		
		$('<div class="columnHeader">Range</div>').appendTo(borderStyleGrid);
		$('<div class="columnHeader">Sides</div>').appendTo(borderStyleGrid);
		$('<div class="columnHeader">Width</div>').appendTo(borderStyleGrid);
		$('<div class="columnHeader">Style</div>').appendTo(borderStyleGrid);
		$('<div class="columnHeader">Color</div>').appendTo(borderStyleGrid);
		$('<div></div>').appendTo(borderStyleGrid);
		
		let n = 1;
		
		function AddBorderStyleRow(theelt, row) {
			
			const rangeDiv = $('<div class="rangeInput"><input type="text" placeholder="A1:B2"></input></div>').appendTo(borderStyleGrid);
			rangeDiv.children(0).attr('value', row.range).on('change', function() {
				row.range = this.value;
			});
			
			const sidesDiv = $('<div class="sidesInput"><input type="text" placeholder="All,Top,Inside"></input></div>').appendTo(borderStyleGrid);
			sidesDiv.children(0).attr('value', row.sides).on('change', function() {
				row.sides = this.value;
			});
			
			const widthDiv = $('<div class="widthInput"><input type="text"></input></div>').appendTo(borderStyleGrid);
			widthDiv.children(0).attr('value', row.width).on('change', function() {
				row.width = parseFloat(this.value);
			});
			
			const styleDiv = $('<div class="styleInput"><input type="text"></input></div>').appendTo(borderStyleGrid);
			styleDiv.children(0).attr('value', row.style).on('change', function() {
				row.style = this.value;
			});
			
			const colorDiv = $('<div class="colorInput"><input type="text"></input></div>').appendTo(borderStyleGrid);
			colorDiv.children(0).attr('value', row.color).on('change', function() {
				row.color = this.value;
			});
			
			const deleteDiv = $('<div class="deleteButton"><button class="btn btn-default btn-xs"><i class="fa fa-trash"></i> Delete</button></div>').appendTo(borderStyleGrid);
			deleteDiv.children(0).on('click', function() {
				
				rangeDiv.remove();
				sidesDiv.remove();
				widthDiv.remove();
				styleDiv.remove();
				colorDiv.remove();
				deleteDiv.remove();
				
				theelt.remove();
				
				n--;
				//borderStyleGrid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
			});
		}
		
		let elt = table.borderStyles.next;
		while (elt != table.borderStyles)
		{
			AddBorderStyleRow(elt, elt.data);
			elt = elt.next;
			n++;
		}
		
		//borderStyleGrid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		
		$('<button class="btn btn-default btn-xs"><i class="fa fa-plus"></i> Add Row</button>').appendTo(div).on('click', function() {
			const row = {
				range: '',
				sides: '',
				style: '',
				color: '',
				width: ''
			};
			const newelt = table.borderStyles.add(row);
			AddBorderStyleRow(newelt, row);
			n++;
			//borderStyleGrid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		});
		
		
		$('<div class="cellStyleLabel">Cell styles</div>').appendTo(div);
		const cellStyleGrid = $('<div class="cellStyleGrid"></div>').appendTo(div);
		
		$('<div class="columnHeader">Range</div>').appendTo(cellStyleGrid);
		$('<div class="columnHeader">Margin</div>').appendTo(cellStyleGrid);
		$('<div class="columnHeader">Align</div>').appendTo(cellStyleGrid);
		$('<div class="columnHeader">Color</div>').appendTo(cellStyleGrid);
		$('<div></div>').appendTo(cellStyleGrid);
		
		n = 1;
		
		function AddCellStyleRow(theelt, row) {
			
			const rangeDiv = $('<div class="rangeInput"><input type="text" placeholder="A1:B2"></input></div>').appendTo(cellStyleGrid);
			rangeDiv.children(0).attr('value', row.range).on('change', function() {
				row.range = this.value;
			});
			
			const marginDiv = $('<div class="marginInput"><input type="text" placeholder="0 0 0 0"></input></div>').appendTo(cellStyleGrid);
			marginDiv.children(0).attr('value', row.margin).on('change', function() {
				row.margin = this.value;
			});
			
			const alignDiv = $('<div class="alignInput"><input type="text" placeholder="B2"></input></div>').appendTo(cellStyleGrid);
			alignDiv.children(0).attr('value', row.align).on('change', function() {
				row.align = this.value;
			});
			
			const backgroundColorDiv = $('<div class="backgroundColorInput"><input type="text" placeholder="white"></input></div>').appendTo(cellStyleGrid);
			backgroundColorDiv.children(0).attr('value', row.backgroundColor).on('change', function() {
				row.backgroundColor = this.value;
			});
			
			const deleteDiv = $('<div class="deleteButton"><button class="btn btn-default btn-xs"><i class="fa fa-trash"></i> Delete</button></div>').appendTo(cellStyleGrid);
			deleteDiv.children(0).on('click', function() {
				
				rangeDiv.remove();
				marginDiv.remove();
				alignDiv.remove();
				backgroundColorDiv.remove();
				deleteDiv.remove();
				
				theelt.remove();
				
				n--;
				//cellStyleGrid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
			});
		}
		
		elt = table.cellStyles.next;
		while (elt != table.cellStyles)
		{
			AddCellStyleRow(elt, elt.data);
			elt = elt.next;
			n++;
		}
		
		//cellStyleGrid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		
		$('<button class="btn btn-default btn-xs"><i class="fa fa-plus"></i> Add Row</button>').appendTo(div).on('click', function() {
			const row = {
				range: '',
				margin: '',
				align: '',
				backgroundColor: ''
			};
			const newelt = table.cellStyles.add(row);
			AddCellStyleRow(newelt, row);
			n++;
			//cellStyleGrid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		});
	}
	parseSizes(text, n) {
		
		// number or * or ...
		
		const regex = /(\d+|\*|\.\.\.)/g;
		
		const parts = [];
		
		let part = regex.exec(text)
		while (part !== null)
		{
			parts.push(part);
			part = regex.exec(text);
		}
		
		let lastValue = null;
		let mult = false;
		let ellipsisValue = null;
		const beforeEllipsis = [];
		const afterEllipsis = [];
		let focus = beforeEllipsis;
		for (let i = 0; i < parts.length; i++)
		{
			part = parts[i];
			
			if (part === '*')
			{
				mult = true;
			}
			else if (part === '...')
			{
				ellipsisValue = lastValue;
				focus = afterEllipsis;
			}
			else
			{
				const value = parseInt(part);
				
				if (mult)
				{
					if (lastValue === null) { throw new Error(); }
					
					for (let k = 0; k < value; k++)
					{
						focus.push(lastValue);
					}
				}
				else
				{
					lastValue = parseInt(part);
					focus.push(lastValue);
				}
				
				mult = false;
			}
		}
		
		const sizes = [];
		
		for (let i = 0; i < beforeEllipsis.length; i++) { sizes.push(beforeEllipsis[i]); }
		
		// n = 0 is used to signal the test parse performed on edit, to display an error (at that point, we don't know what n would be)
		if (ellipsisValue !== null)
		{
			if (n > 0)
			{
				for (let i = 0; i < n - beforeEllipsis.length - afterEllipsis.length; i++) { sizes.push(ellipsisValue); }
			}
		}
		
		for (let i = 0; i < afterEllipsis.length; i++) { sizes.push(afterEllipsis[i]); }
		
		const remainder = n - sizes.length;
		
		for (let i = 0; i < remainder; i++) { sizes.push(lastValue); }
		
		return sizes;
	}
	parseRange(text, nRows, nCols) {
		
		let minRow = null;
		let maxRow = null;
		let minCol = null;
		let maxCol = null;
		
		text = text.trim();
		
		if (text == ':')
		{
			minRow = 0;
			maxRow = nRows - 1;
			minCol = 0;
			maxCol = nCols - 1;
		}
		else if (text.indexOf(':') >= 0)
		{
			const parts = text.split(':').map(x => x.trim());
			
			let [row1,col1] = this.parseCellRef(parts[0], nRows, nCols);
			let [row2,col2] = this.parseCellRef(parts[1], nRows, nCols);
			
			// A:A
			if (row1 === null || row2 === null)
			{
				if (row1 === null && row2 === null)
				{
					row1 = 0;
					row2 = nRows - 1;
				}
				else
				{
					throw new Error('Invalid cell reference: ' + text);
				}
			}
			
			// 1:1
			if (col1 === null || col2 === null)
			{
				if (col1 === null && col2 === null)
				{
					col1 = 0;
					col2 = nCols - 1;
				}
				else
				{
					throw new Error('Invalid cell reference: ' + text);
				}
			}
			
			minRow = Math.min(row1, row2);
			maxRow = Math.max(row1, row2);
			minCol = Math.min(col1, col2);
			maxCol = Math.max(col1, col2);
		}
		else
		{
			const [row,col] = this.parseCellRef(text, nRows, nCols);
			if (row === null || col === null) { throw new Error('Invalid cell reference: ' + text); }
			minRow = row;
			maxRow = row;
			minCol = col;
			maxCol = col;
		}
		
		return {minRow,maxRow,minCol,maxCol};
	}
	parseCellRef(text, nRows, nCols) {
		
		// 0-indexed
		let row = null;
		let col = null;
		
		const colRegex = /-?[A-Za-z]+/g;
		const rowRegex = /-?[0-9]+/g;
		
		const colMatch = colRegex.exec(text);
		const rowMatch = rowRegex.exec(text, colRegex.lastIndex);
		
		if (colMatch !== null)
		{
			if (colMatch[0][0] == '-')
			{
				const n = this.parseColRef(colMatch[0].substr(1));
				col = nCols - n - 1;
			}
			else
			{
				const n = this.parseColRef(colMatch[0]);
				col = n;
			}
		}
		
		if (rowMatch !== null)
		{
			if (rowMatch[0][0] == '-')
			{
				const n = this.parseRowRef(rowMatch[0].substr(1));
				row = nRows - n - 1;
			}
			else
			{
				const n = this.parseRowRef(rowMatch[0]);
				row = n;
			}
		}
		
		return [row,col];
	}
	parseColRef(text) {
		return Table.LetterToNumber(text);
	}
	parseRowRef(text) {
		return parseInt(text) - 1;
	}
	static NumberToLetter(n) {
		
		// 0 => "A"
		// 1 => "B"
		// 25 => "Z"
		// 26 => "AA"
		
		if (n < 0) { return ""; }
		
		var k = 1;
		var m = n+1;
		
		while (true)
		{
			var pow = 1;
			for (var i = 0; i < k; i++) { pow *= 26; }
			if (m <= pow) { break; }
			m -= pow;
			k++;
		}
		
		var reversed = "";
		
		for (var i = 0; i < k; i++)
		{
			var c = n+1;
			var shifter = 1;
			for (var j = 0; j < k; j++) { c -= shifter; shifter *= 26; }
			var divisor = 1;
			for (var j = 0; j < i; j++) { divisor *= 26; }
			c /= divisor;
			c %= 26;
			reversed += String.fromCharCode(65 + c)
		}
		
		var result = "";
		for (var i = reversed.length - 1; i >= 0; i--) { result += reversed[i]; }
		
		return result;
	}
	static LetterToNumber(s) {
		
		// "A" => 0
		// "B" => 1
		// "Z" => 25
		// "AA" => 26
		
		var result = 0;
		var multiplier = 1;
		
		for (var i = s.length - 1; i >= 0; i--)
		{
			var c = s.charCodeAt(i);
			result += multiplier * (c - 64);
			multiplier *= 26;
		}
		
		return result-1; // -1 makes it 0-indexed
	}
	parseBorderStyles(nRows, nCols) {
		
		const defaultStyle = { width: 1, style: [1], color: 'black' };
		
		const rowStyles = Array.from({length: nRows + 1}, (v, i) => Array.from({length: nCols}, (v, i) => defaultStyle));
		const colStyles = Array.from({length: nCols + 1}, (v, i) => Array.from({length: nRows}, (v, i) => defaultStyle));
		
		const dashMap = {
			solid: [1],
			dashed: [3,3], // but what is the reference unit? we have to pick a cubit size that makes sense
			dotted: [1,1]
		};
		
		const borderStyles = this.borderStyles.enumerate();
		
		for (let k = 0; k < borderStyles.length; k++)
		{
			const style = borderStyles[k];
			const range = this.parseRange(style.range, nRows, nCols);
			const sides = style.sides;
			
			const dashStr = style.style.trim();
			let dash = [1];
			if (dashStr[0] == '[')
			{
				dash = dashStr.substr(1, dashStr.length - 2).split(',').map(x => parseFloat(x.trim()))
			}
			else if (dashMap[style.style])
			{
				dash = dashMap[style.style];
			}
			
			const newStyle = {
				width: style.width,
				style: dash,
				color: style.color
			};
			
			if (sides == 'All')
			{
				for (let i = range.minRow; i <= range.maxRow; i++)
				{
					for (let j = range.minCol; j <= range.maxCol; j++)
					{
						rowStyles[i+0][j] = newStyle;
						rowStyles[i+1][j] = newStyle;
						colStyles[j+0][i] = newStyle;
						colStyles[j+1][i] = newStyle;
					}
				}
			}
			
			if (sides == 'Top' || sides == 'Outside')
			{
				for (let j = range.minCol; j <= range.maxCol; j++)
				{
					rowStyles[range.minRow][j] = newStyle;
				}
			}
			
			if (sides == 'Left' || sides == 'Outside')
			{
				for (let i = range.minRow; i <= range.maxRow; i++)
				{
					colStyles[range.minCol][i] = newStyle;
				}
			}
			
			if (sides == 'Right' || sides == 'Outside')
			{
				for (let i = range.minRow; i <= range.maxRow; i++)
				{
					colStyles[range.maxCol+1][i] = newStyle;
				}
			}
			
			if (sides == 'Bottom' || sides == 'Outside')
			{
				for (let j = range.minCol; j <= range.maxCol; j++)
				{
					rowStyles[range.maxRow+1][j] = newStyle;
				}
			}
			
			if (sides == 'Inside')
			{
				for (let i = range.minRow; i <= range.maxRow; i++)
				{
					for (let j = range.minCol; j <= range.maxCol; j++)
					{
						if (i > range.minRow) { rowStyles[i+0][j] = newStyle; }
						if (i < range.maxRow) { rowStyles[i+1][j] = newStyle; }
						if (j > range.minCol) { colStyles[j+0][i] = newStyle; }
						if (j < range.maxCol) { colStyles[j+1][i] = newStyle; }
					}
				}
			}
		}
		
		return [rowStyles, colStyles];
	}
	parseCellStyles(nRows, nCols) {
		
		const defaultStyle = { margins: { top: 0, left: 0, right: 0, bottom: 0 }, align: 'B2', backgroundColor: 'white' };
		
		const matrix = Array.from({length: nRows}, (v, i) => Array.from({length: nCols}, (v, i) => defaultStyle));
		
		const cellStyles = this.cellStyles.enumerate();
		
		for (let k = 0; k < cellStyles.length; k++)
		{
			const style = cellStyles[k];
			const range = this.parseRange(style.range, nRows, nCols);
			
			const parts = style.margin.split(' ').map(x => parseFloat(x));
			
			if (parts.length == 1)
			{
				style.margins = { top: parts[0], left: parts[0], right: parts[0], bottom: parts[0] };
			}
			else if (parts.length == 2)
			{
				style.margins = { top: parts[0], left: parts[1], right: parts[1], bottom: parts[0] };
			}
			else if (parts.length == 3)
			{
				style.margins = { top: parts[0], left: parts[1], right: parts[2], bottom: parts[0] };
			}
			else if (parts.length == 4)
			{
				style.margins = { top: parts[0], left: parts[1], right: parts[2], bottom: parts[3] };
			}
			
			for (let i = range.minRow; i <= range.maxRow; i++)
			{
				for (let j = range.minCol; j <= range.maxCol; j++)
				{
					matrix[i][j] = style;
				}
			}
		}
		
		return matrix;
	}
	draw(ctx) {
		
		ctx.save();
		
		const tableElt = document.getElementById(this.content.selector);
		const obj = { head: null, foot: null, trs: [] };
		ParseTableRec(tableElt, obj, null);
		
		function ParseTableRec(elt, obj, tr) {
			
			const name = elt.tagName.toLowerCase();
			
			if (name == 'table')
			{
				
			}
			else if (name == 'tr')
			{
				tr = [];
				obj.trs.push(tr);
			}
			else if (name == 'td')
			{
				tr.push(elt.innerText); // ParseHtml
			}
			else if (name == 'thead')
			{
				obj.head = elt.innerText; // ParseHtml
			}
			else if (name == 'tbody')
			{
				
			}
			else if (name == 'tfoot')
			{
				obj.foot = elt.innerText; // ParseHtml
			}
			
			for (let i = 0; i < elt.children.length; i++)
			{
				const c = elt.children[i];
				ParseTableRec(c, obj, tr);
			}
		}
		
		const nRows = obj.trs.length;
		const nCols = Math.max(...obj.trs.map(tr => tr.length));
		
		const rowSizes = this.parseSizes(this.rowSizes, nRows);
		const colSizes = this.parseSizes(this.colSizes, nCols);
		
		const width = colSizes.reduce(function(a, b) { return a + b; }, 0);
		const height = rowSizes.reduce(function(a, b) { return a + b; }, 0);
		
		// set box width/height here? we can't do it on edit of sizes input because we don't know n
		
		
		// table header and footer go into the margins - the content area is for the table itself
		
		const textMargin = 4;
		
		if (obj.head)
		{
			ctx.font = '12pt Arial';
			ctx.fillStyle = 'black';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'bottom';
			ctx.fillText(obj.head, this.content.box.lf, this.content.box.tp - textMargin);
		}
		
		if (obj.foot)
		{
			ctx.font = '12pt Arial';
			ctx.fillStyle = 'black';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
			ctx.fillText(obj.foot, this.content.box.lf, this.content.box.tp + this.content.box.hg + textMargin);
		}
		
		// draw table
		const lf = this.content.box.lf;
		const tp = this.content.box.tp;
		const rt = lf + width;
		const bt = tp + height;
		
		let x = null;
		let y = null;
		let x1 = null;
		let x2 = null;
		let y1 = null;
		let y2 = null;
		let style = null;
		
		// draw cells
		const cellStyles = this.parseCellStyles(nRows, nCols);
		
		y = tp;
		for (let i = 0; i < nRows; i++)
		{
			x = lf;
			
			for (let j = 0; j < nCols; j++)
			{
				const tr = obj.trs[i];
				const text = j < tr.length ? tr[j] : '';
				const style = cellStyles[i][j];
				
				ApplyTextAlign(ctx, style.align);
				const [ax, ay] = ApplyCoordAlign(style.align, style.margins, x, y, colSizes[j], rowSizes[i]);
				
				ctx.fillStyle = style.backgroundColor;
				ctx.fillRect(x, y, colSizes[j], rowSizes[i]);
				
				ctx.fillStyle = 'black'; // grab text style
				ctx.fillText(text, ax, ay);
				
				x += colSizes[j];
			}
			
			y += rowSizes[i];
		}
		
		
		// draw borders
		const [rowStyles, colStyles] = this.parseBorderStyles(nRows, nCols);
		
		// this requires tables to have a bit of margin, since the borders will overlap the content box by a little bit
		ctx.lineCap = 'square';
		
		// row (horizontal) borders
		y = tp;
		for (let i = 0; i <= nRows; i++)
		{
			x1 = lf;
			x2 = lf;
			let lastStyle = rowStyles[i][0];
			
			for (let j = 0; j <= nCols; j++)
			{
				style = rowStyles[i][j]; // when j == nCols, style will be undefined and the border will be drawn
				
				// string together streaks of styles and draw one line (to get correct line dash)
				if (style !== lastStyle)
				{
					ctx.lineWidth = lastStyle.width;
					ctx.strokeStyle = lastStyle.color;
					ctx.setLineDash(lastStyle.style);
					
					ctx.beginPath();
					ctx.moveTo(x1, y);
					ctx.lineTo(x2, y);
					ctx.stroke();
					
					x1 = x2;
				}
				
				x2 += colSizes[j];
				lastStyle = style;
			}
			
			y += rowSizes[i];
		}
		
		// col (vertical) borders
		x = lf;
		for (let j = 0; j <= nCols; j++)
		{
			y1 = tp;
			y2 = tp;
			let lastStyle = colStyles[j][0];
			
			for (let i = 0; i <= nRows; i++)
			{
				style = colStyles[j][i]; // when i == nRows, style will be undefined and the border will be drawn
				
				if (style !== lastStyle)
				{
					ctx.lineWidth = lastStyle.width;
					ctx.strokeStyle = lastStyle.color;
					ctx.setLineDash(lastStyle.style);
					
					ctx.beginPath();
					ctx.moveTo(x, y1);
					ctx.lineTo(x, y2);
					ctx.stroke();
					
					y1 = y2;
				}
				
				y2 += rowSizes[i];
				lastStyle = style;
			}
			
			x += colSizes[j];
		}
		
		ctx.restore();
	}
}
class List {
	
	constructor(content, json) {
		
		const defaults = {
			levels: [] // { symbol, style, align, indent }
		};
		
		if (!json) { json = defaults; } else { json = $.extend(true, {}, defaults, json); }
		
		this.levels = new LinkedList();
		for (let i = 0; i < json.levels.length; i++) { this.levels.add(json.levels[i]); }
		
		this.content = content;
	}
	write() {
		
		return {
			levels: this.levels.enumerate()
		};
	}
	render(div) {
		
		const list = this;
		
		$('<div class="subheader">List</div>').appendTo(div);
		
		const grid = $('<div class="listGrid"></div>').appendTo(div);
		
		$('<div class="columnHeader">Symbol</div>').appendTo(grid);
		$('<div class="columnHeader">Style</div>').appendTo(grid);
		$('<div class="columnHeader">Align</div>').appendTo(grid);
		$('<div class="columnHeader">Indent</div>').appendTo(grid);
		$('<div></div>').appendTo(grid);
		
		let n = 1;
		
		function AddRow(theelt, level) {
			
			const symbolDiv = $('<div class="symbolInput"><input type="text"></input></div>').appendTo(grid);
			symbolDiv.children(0).attr('value', level.symbol).on('change', function() {
				level.symbol = this.value;
			});
			
			const styleDiv = $('<div class="styleInput"><input type="text"></input></div>').appendTo(grid);
			styleDiv.children(0).attr('value', level.style).on('change', function() {
				level.style = this.value;
			});
			
			const alignDiv = $('<div class="alignInput"><input type="text"></input></div>').appendTo(grid);
			alignDiv.children(0).attr('value', level.align).on('change', function() {
				level.align = this.value;
			});
			
			const indentDiv = $('<div class="indentInput"><input type="text"></input></div>').appendTo(grid);
			indentDiv.children(0).attr('value', level.indent).on('change', function() {
				level.indent = parseFloat(this.value);
			});
			
			const deleteDiv = $('<div class="deleteButton"><button class="btn btn-default btn-xs"><i class="fa fa-trash"></i> Delete</button></div>').appendTo(grid);
			deleteDiv.children(0).on('click', function() {
				
				symbolDiv.remove();
				styleDiv.remove();
				alignDiv.remove();
				indentDiv.remove();
				deleteDiv.remove();
				
				theelt.remove();
				
				n--;
				//grid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
			});
		}
		
		let elt = list.levels.next;
		while (elt != list.levels)
		{
			AddRow(elt, elt.data);
			elt = elt.next;
			n++;
		}
		
		//grid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		
		$('<button class="btn btn-default btn-xs"><i class="fa fa-plus"></i> Add Level</button>').appendTo(div).on('click', function() {
			const level = {
				symbol: '',
				style: '',
				align: '',
				indent: ''
			};
			const newelt = list.levels.add(level);
			AddRow(newelt, level);
			n++;
			//grid.css('grid-template-rows', 'repeat(' + n + ', 2em)');
		});
	}
	draw(ctx) {
		
		const listElt = document.getElementById(this.content.selector);
		const lines = []; // { name: listElt.tagName.toLowerCase(), indent: 0, text: '' }
		GetListRec(listElt, 0);
		
		// list = { name: "ul", children: [ { name: "li", text: "" } ] }
		function GetListRec(parentElt, indent) {
			
			for (let i = 0; i < parentElt.children.length; i++)
			{
				const child = parentElt.children[i];
				
				if (child.tagName == 'LI')
				{
					lines.push({ name: 'li', text: child.innerText, indent: indent });
				}
				else if (child.tagName == 'OL' || child.tagName == 'UL')
				{
					GetListRec(child, indent + 1);
				}
				else
				{
					// do we include text children of ul's?
				}
			}
		}
		
		for (let i = 0; i < lines.length; i++)
		{
			const indent = lines[i].indent;
			const text = lines[i].text;
			
			ctx.fillText(text, this.content.box.lf + indent * 30, this.content.box.tp + i * 20);
		}
	}
}

class PageNumbers {
	
}
class Outline {
	
	// h1,h2,h3,h4,h5,h6 - if we have a nonblank outline entry, we treat these separately - adding a I/i/a/1 and optionally auto-building a table of contents (which can be a list content)
	// the interface is a lot list List - 6 rows, one for each h-level
	// if we leave a row blank, that h-level is ignored by Outline - it can be used for sub-headers that are not included in the Outline/TOC
}
class Footnotes {
	// foo<note>bar</note> - this is replaced in HTML by foo<sup title="bar">*</sup> and a tooltip or something
	// notes are automatically numbered
	// the problem is, what to do if a footnote reference comes at the bottom of a page, such that adding the footnote text at bottom would displace the reference to the next page?
}

function BuildColorControls() {
	
	function GenerateImageData() {
		
		for (let y = 0; y < hg; y++)
		{
			for (let x = 0; x < wd; x++)
			{
				const index = (y * wd + x) * 4;
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
	
	const div = $('<div class="container textStyle"></div>').appendTo('#containerStack');
	
	$('<div class="header">Color picker</div>').appendTo(div);
	const lCol = $('<div class="column"></div>').appendTo(div);
	const rCol = $('<div class="column"></div>').appendTo(div).css('margin-left', '1em');
	
	const r = 0;
	const g = 0;
	const b = 0;
	
	const picker = $('<canvas width="256" height="256" style="border: 1px solid gray; padding: 10px; cursor: crosshair;"></canvas>').appendTo(lCol);
	const pickerCtx = picker[0].getContext('2d');
	const wd = picker[0].width;
	const hg = picker[0].height;
	const imageData = pickerCtx.getImageData(0, 0, wd, hg);
	const data = imageData.data;
	
	const slider = $('<input type="range" min="0" max="255" step="1"></input>').appendTo(lCol).attr('value', b).css('display', 'block');
	
	slider[0].oninput = function(e) {
		b = parseInt(this.value);
		bInput[0].value = b;
		GenerateImageData();
		Draw();
	};
	
	picker[0].onmousedown = function(downEvent) {
		picker[0].onmousemove = function(moveEvent) {
			
			const x = moveEvent.offsetX;
			const y = moveEvent.offsetY;
			
			x -= 11; // 1px border + 10px padding
			y -= 11;
			
			if (x < 0) { x = 0; }
			if (x > 255) { x = 255; }
			if (y < 0) { y = 0; }
			if (y > 255) { y = 255; }
			
			const index = (y * wd + x) * 4;
			
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
	
	const preview = $('<canvas width="50" height="50" style="border: 1px solid gray"></canvas>').appendTo(rCol);
	const previewCtx = preview[0].getContext('2d');
	
	const table = $('<table></table>').appendTo(rCol);
	const rInput = $('<tr><td>red</td>  <td><input type="text"></input></td></tr>').appendTo(table).find('input').attr('value', r);
	const gInput = $('<tr><td>green</td><td><input type="text"></input></td></tr>').appendTo(table).find('input').attr('value', g);
	const bInput = $('<tr><td>blue</td> <td><input type="text"></input></td></tr>').appendTo(table).find('input').attr('value', b);
	
	rInput[0].onchange = function() { r = this.value; Draw(); };
	gInput[0].onchange = function() { g = this.value; Draw(); };
	bInput[0].onchange = function() { b = this.value; Draw(); };
	
	GenerateImageData();
	Draw();
	
	return div;
}
function BuildSelector(options, selected) {
	return $('<select>' + options.map(function(option) { return '<option' + ((option == selected) ? ' selected' : '') + '>' + option + '</option>'; }).join('') + '</select>');
}

// function DrawDocument(doc: Document, NewPage: (doc: Document, section: Section) => Page): Page[]
// function DrawSection(doc: Document, section: Section, pages: Page[], NewPage: (doc: Document, section: Section) => Page): void
// function DrawPageNumbers(doc: Document, pages: Page[]): void
function DrawDocument(doc, NewPage) {
	
	const pages = [];
	
	const sections = doc.sections.enumerate();
	for (let i = 0; i < sections.length; i++) { DrawSection(doc, sections[i], pages, NewPage); }
	
	//if (doc.doPageNumbering) { DrawPageNumbers(doc, pages); }
	
	return pages;
}
function DrawSection(doc, section, pages, NewPage) {
	
	// This is a long function, and sort of the master drawing function.  What happens here:
	// 1. determine the minimum number of pages needed to accomodate all contents
	// 2. create that number of blank page boxes
	// 3. perform the occlusion
	// 4. determine the width of each line of text - skip over boxes that are not tall enough to accomodate even a single line of text
	// 5. lay out text, adding new pages as necessary (currently linebreaking is done naively, but later will need to use Knuth-Plass)
	// 6. loop through the lines of text and draw them, calling doc.newPage() as necessary
	// 7. draw each content
	
	const debug = false;
	const graphicalDebug = false;
	
	//section.clear();
	
	const contents = section.contents.enumerate();
	
	// determine the minimum number of pages needed to accomodate all contents
	let nPages = 1;
	for (let i = 0; i < contents.length; i++)
	{
		// check content.height for contents that are larger than one page
		// content coordinates can't go negative - in practice, this means that contents can't grow upward to multiple pages - they can only grow downward
		
		if (contents[i].pageIndex >= nPages)
		{
			nPages = contents[i].pageIndex + 1;
		}
	}
	
	// create the Page structs
	for (let i = 0; i < nPages; i++)
	{
		pages.push(NewPage(doc, section));
	}
	
	// fill each page's content list, and setSize (calculate lf, tp, from x,y,width,height,anchor,align)
	for (let i = 0; i < contents.length; i++)
	{
		const content = contents[i];
		const page = pages[content.pageIndex]
		SetContentSize(content, page);
		page.contents.push(content);
	}
	
	if (debug) { console.log(`pages needed by widgets: ${nPages}`); }
	
	let columnWidth = 0; // we need this for the endless line widths at the end of the concrete pages, but we can't (well, shouldn't) calculate it without reference to an instantiated page
	
	// create a blank box for each column, assign to its page
	for (let i = 0; i < nPages; i++)
	{
		const page = pages[i];
		columnWidth = (page.width - section.marginLeft - section.marginRight - section.interColumnMargin * (section.columns - 1)) / section.columns;
		
		for (let k = 0; k < section.columns; k++)
		{
			const lf = section.marginLeft + (columnWidth + section.interColumnMargin) * k;
			const rt = lf + columnWidth;
			const tp = section.marginTop;
			const bt = page.height - section.marginBottom;
			page.boxes.push(Box.Make({ tp, lf, rt, bt }));
		}
	}
	
	// perform the occlusion for each page
	for (let i = 0; i < pages.length; i++)
	{
		const page = pages[i];
		
		for (let k = 0; k < page.contents.length; k++)
		{
			const content = page.contents[k];
			const tp = content.box.tp - content.marginTop;
			const lf = content.box.lf - content.marginLeft;
			const rt = content.box.rt + content.marginRight;
			const bt = content.box.bt + content.marginBottom;
			const boxWithMargin = Box.Make({ tp, lf, rt, bt });
			page.boxes = Box.Occlude(page.boxes, boxWithMargin);
		}
	}
	
	
	
	
	
	// This section is weridly disjointed, and I think it's the legacy of Typeset.linebreak
	// the practice of getting placements and then separately placing words in lines is weird - why not just place the words in the linebreaking function?
	// the answer is that Typeset.linebreak didn't do that
	// also, why are we calling NewPage all tangled up in this code? NewPage returns pages of consistent dimensions, we can do all linebreaking and placement very abstractly and then add all the new pages at once
	
	// break the boxes into line slots - skip over boxes that are not tall enough to accomodate even a single line of text
	const lines = BreakBoxesIntoLines(section, pages);
	
	// gather the widths of each of the line slots for passing into the linebreaking function
	const lineWidths = lines.map(line => line.box.wd);
	
	// returns a PlacedWord[][] = [ [ { text : "string" , lf : 0 , wd : 0 } ] ]
	//const lineTexts = section.linebreakJustify(lineWidths, columnWidth, section.words, section.wordMetrics, section.optimalSpaceWidth, section.minimumSpaceWidth);
	
	
	const defaultStyle = doc.styles.get('(default)');
	const fontObject = Hyperdeck.Fonts[defaultStyle.font].font;
	const fontSizePt = defaultStyle.size; // this may need to be scaled to cubits - i believe MeasureWord should take cubits
	const spaceWidth = MeasureWord(fontObject, fontSizePt, 'x'); // what letter to use for a space width?
	const hyphenWidth = MeasureWord(fontObject, fontSizePt, '-');
	
	// returns a PlacedWord[][] = [ [ { text : "string" , lf : 0 , wd : 0 } ] ]
	const lineTexts = section.linebreakKnuth(lineWidths, columnWidth, section.words, section.wordMetrics, spaceWidth, hyphenWidth);
	
	
	// now we have parallel arrays - one of empty lines and their coordinates (a Line[]), and one of line texts (a PlacedWord[][])
	const matching = Math.min(lines.length, lineTexts.length);
	
	// we loop through the line texts, assigning them to the empty lines
	for (let i = 0; i < matching; i++)
	{
		const line = lines[i];
		const words = lineTexts[i];
		
		for (let k = 0; k < words.length; k++)
		{
			const word = { box: new Box(), text: words[k].text };
			word.box.reconcile({ lf: line.box.lf + words[k].lf, bt: line.box.bt, wd: words[k].wd, hg: line.box.hg });
			line.words.push(word);
		}
	}
	
	// if the list of empty lines runs out, create new empty lines, incrementing maxPages as necessary
	if (lineTexts.length > lines.length)
	{
		const origLinesLength = lines.length;
		const excess = lineTexts.length - lines.length;
		
		// begin duplicate
		let tp = section.marginTop;
		let bt = tp + section.pitch;
		
		let page = NewPage(doc, section);
		pages.push(page);
		
		let pageBottom = page.height - section.marginBottom;
		// end duplicate
		
		let currentColumn = 0;
		
		for (let i = 0; i < excess; i++)
		{
			// why does line have to reference page?
			const line = { words: [], box: new Box(), page: page };
			
			const lf = section.marginLeft + (columnWidth + section.interColumnMargin) * currentColumn;
			const wd = columnWidth;
			const hg = section.pitch;
			line.box.reconcile({lf:lf,bt:bt,wd:wd,hg:hg});
			
			const words = lineTexts[origLinesLength + i];
			
			for (let k = 0; k < words.length; k++)
			{
				const word = { box: new Box(), text: words[k].text };
				word.box.reconcile({ lf : line.box.lf + words[k].lf , bt : line.box.bt , wd : words[k].wd , hg : line.box.hg });
				line.words.push(word);
			}
			
			lines.push(line);
			page.lines.push(line);
			
			bt += section.pitch;
			
			if (bt > pageBottom)
			{
				currentColumn++;
				
				if (currentColumn >= section.columns)
				{
					currentColumn = 0;
					
					// begin duplicate
					tp = section.marginTop;
					bt = tp + section.pitch;
					
					page = NewPage(doc, section);
					pages.push(page);
					
					pageBottom = page.height - section.marginBottom;
					// end duplicate
				}
				else
				{
					bt = tp + section.pitch;
				}
			}
		}
	}
	
	if (debug)
	{
		console.log('blank page boxes:');
		//boxes.forEach(function(b) { console.log('{lf:'+b.lf+',rt:'+b.rt+',tp:'+b.tp+',bt:'+b.bt+'}'); });
		
		console.log('occluded boxes:');
		//boxes.forEach(function(b) { console.log('{lf:'+b.lf+',rt:'+b.rt+',tp:'+b.tp+',bt:'+b.bt+'}'); });
		
		console.log('line slots:');
		for (let i = 0; i < lines.length; i++)
		{
			const l = lines[i];
			console.log('{lf:'+l.box.lf+',bt:'+l.box.bt+',wd:'+l.box.wd+'}');
		}
		
		console.log('words with text:');
		for (let i = 0; i < lines.length; i++)
		{
			for (let j = 0; j < lines[i].words.length; j++)
			{
				const word = lines[i].words[j];
				console.log('{lf:'+word.box.lf.toFixed(0)+',bt:'+word.box.bt.toFixed(0)+',wd:'+word.box.wd.toFixed(0)+',text:"'+word.text+'"}');
			}
		}
	}
	
	// draw the outlines of boxes
	if (graphicalDebug)
	{
		//const ctx = null; // need to assign this somehow
		//
		//for (let i = 0; i < lines.length; i++)
		//{
		//	const line = lines[i];
		//	ctx.strokeRect(line.box.lf, line.box.tp, line.box.wd, line.box.hg);
		//}
		//
		//for (let i = 0; i < contents.length; i++)
		//{
		//	const widget = contents[i];
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
	for (let i = 0; i < pages.length; i++)
	{
		const page = pages[i];
		const ctx = page.ctx;
		
		for (let j = 0; j < page.lines.length; j++)
		{
			const line = page.lines[j];
			
			for (let k = 0; k < line.words.length; k++)
			{
				const word = line.words[k];
				
				// it would be nice to not have to do this for every single word, since the words are pretty independent, we could group by style
				// but that's an optimization, don't need to do it now
				
				// see this is where we need to reference a style that parallels the word list
				
				//ctx.font = null;
				//ctx.fillStyle = section.color;
				ctx.textAlign = 'left';
				ctx.textBaseline = 'bottom'; // this is tied to how we use y in SetType
				
				ctx.fillText(word.text, word.box.lf, word.box.bt);
			}
		}
	}
	
	// draw each content - what if the content spans multiple pages? perhaps we should pass the whole Page[] array and use content.pageIndex as needed
	for (let i = 0; i < pages.length; i++)
	{
		const page = pages[i];
		
		for (let k = 0; k < page.contents.length; k++)
		{
			const content = page.contents[k];
			
			content.draw(page);
		}
	}
}
function BreakBoxesIntoLines(section, pages) {
	
	if (section.pitch < 0.01) { throw new Error('line height too small'); }
	
	const lines = [];
	
	for (let i = 0; i < pages.length; i++)
	{
		let page = pages[i];
		let boxIndex = 0;
		let box = page.boxes[boxIndex];
		let bt = box.tp + section.pitch;
		
		while (true)
		{
			if (bt > box.bt)
			{
				boxIndex++;
				
				// we adjust box borders to avoid excess gap between lines - stretch the boxes directly below the current box up a little
				for (let k = boxIndex; k < page.boxes.length; k++)
				{
					if (page.boxes[k].tp == box.bt)
					{
						page.boxes[k].tp = bt - section.pitch;
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
				const line = {
					page: page,
					box: new Box(),
					words: []
				};
				
				line.box.reconcile({lf : box.lf , bt : bt , wd : box.wd , hg : section.pitch });
				page.lines.push(line);
				lines.push(line);
			}
			
			bt += section.pitch;
		}
	}
	
	return lines;
}
function DrawPageNumbers(doc, pages) {
	
	for (let i = 0; i < pages.length; i++)
	{
		const page = pages[i];
		const n = i + 1;
		
		if (n == 1 && !doc.firstPage) { continue; }
		
		const wd = page.width;
		const hg = page.height;
		
		let hAlign = doc.pageNumberHoriAlign;
		const vAlign = ((doc.pageNumberVertAlign == 'center') ? 'middle' : doc.pageNumberVertAlign);
		
		if (hAlign == 'alternateLeftRight')
		{
			hAlign = ((n % 2 == 0) ? 'right' : 'left');
		}
		else if (hAlign == 'alternateRightLeft')
		{
			hAlign = ((n % 2 == 0) ? 'left' : 'right');
		}
		
		const ctx = page.ctx;
		ctx.font = doc.pageNumberFont;
		ctx.fillStyle = doc.pageNumberColor;
		ctx.textAlign = hAlign;
		ctx.textBaseline = vAlign;
		
		const xs = {left:0,center:wd/2,right:wd};
		const ys = {top:0,center:hg/2,bottom:hg};
		const xPolarity = {left:1,center:1,right:-1};
		const yPolarity = {top:1,center:1,bottom:-1};
		
		const x = xs[hAlign] + xPolarity[hAlign] * doc.pageNumberHoriOffset;
		const y = ys[vAlign] + yPolarity[vAlign] * doc.pageNumberVertOffset;
		
		ctx.fillText(n.toString(), x, y);
	}
}

function CalculateWordMetrics(section) {
	
	//if (section.textStyle.style) { SetStyle(section.ctx, section.textStyle.style); }
	//if (section.textStyle.fontSize) { section.ctx.setFontSize(section.textStyle.fontSize); }
	//if (section.textStyle.fontFamily) { section.ctx.setFont(section.textStyle.fontFamily, section.textStyle.bold, section.textStyle.italic); }
	
	//section.wordMetrics = [];
	//
	//// here is where we would do fancier stuff like inline spans with different fonts, tabs, roll-your-own justification via constiable spacing, etc.
	//for (let i = 0; i < section.words.length; i++)
	//{
	//	const word = section.words[i];
	//	const widthCu = section.ctx.measureText(word).width;
	//	section.wordMetrics.push(widthCu);
	//}
	
	//section.spaceWidth = section.ctx.fontSizeCu * 0.30;
	//section.minSpaceWidth = section.ctx.fontSizeCu * 0.20; // for justified text with stretched spacing
}

function SetContentSize(content, page) {
	
	//const content = this;
	
	let ax = 0;
	let ay = 0;
	
	if (content.anchor[0] == 'A')
	{
		ax = content.x;
	}
	else if (content.anchor[0] == 'B')
	{
		ax = page.width / 2 - content.x;
	}
	else if (content.anchor[0] == 'C')
	{
		ax = page.width / 2;
	}
	else if (content.anchor[0] == 'D')
	{
		ax = page.width / 2 + content.x;
	}
	else if (content.anchor[0] == 'E')
	{
		ax = page.width - content.x;
	}
	
	if (content.anchor[1] == '1')
	{
		ay = content.y;
	}
	else if (content.anchor[1] == '2')
	{
		ay = page.height / 2 - content.y;
	}
	else if (content.anchor[1] == '3')
	{
		ay = page.height / 2;
	}
	else if (content.anchor[1] == '4')
	{
		ay = page.height / 2 + content.y;
	}
	else if (content.anchor[1] == '5')
	{
		ay = page.height - content.y;
	}
	
	let lf = 0;
	let tp = 0;
	
	if (content.align[0] == 'A')
	{
		lf = ax;
	}
	else if (content.align[0] == 'B')
	{
		lf = ax - content.width / 2;
	}
	else if (content.align[0] == 'C')
	{
		lf = ax - content.width;
	}
	
	if (content.align[1] == '1')
	{
		tp = ay;
	}
	else if (content.align[1] == '2')
	{
		tp = ay - content.height / 2;
	}
	else if (content.align[1] == '3')
	{
		tp = ay - content.height;
	}
	
	content.box = Box.Make({ lf: lf, tp: tp, wd: content.width, hg: content.height });
}

function GenerateDocument(article, bPdf) {
	
	const defaultStyle = article.styles.get('(default)');
	
	const sections = article.sections.enumerate();
	
	// why don't we just put this in DrawSection?
	for (let i = 0; i < sections.length; i++)
	{
		const section = sections[i];
		
		const root = document.getElementById(section.selector);
		
		const texts = [];
		const styles = [];
		ParseText(article, section, root, defaultStyle, texts, styles);
		MeasureText(article, section, texts, styles); // for now, MeasureText sets section.words and section.wordMetrics
	}
	
	// in order to re-use pages, we'd need to save 'pages' somewhere, and then send them back to DrawDocument
	// then instead of clearing #document and adding the canvases, we would remove the ones that aren't there anymore and add the new ones
	// it would be a good use case for React, but I don't know how to manage the ctx's under React
	
	const pages = DrawDocument(article, NewPage, bPdf);
	
	return pages;
}
function ParseText(article, section, elt, style, texts, styles) {
	
	for (let i = 0; i < elt.childNodes.length; i++)
	{
		const child = elt.childNodes[i];
		
		if (child.nodeType == child.TEXT_NODE)
		{
			const text = child.textContent;
			texts.push(text);
			styles.push(style);
		}
		else if (child.nodeType == child.ELEMENT_NODE)
		{
			let mergedStyle = { ...style };
			
			for (let j = 0; j < child.classList.length; j++)
			{
				// add partials to the newstyle object
				const clas = child.classList[j];
				const newStyle = article.styles.get(clas);
				
				if (newStyle)
				{
					mergedStyle = { ...mergedStyle, ...newStyle };
				}
			}
			
			// whitelist or blacklist element types
			// whitelist: p, span, b, i, sub, sup
			// blacklist: table, ul, ol, h1, caption
			// ??: div - blacklist if we want to be prescriptive, but this will break lots of reasonable HTML document structures
			// maybe whitelist div but specifically exclude div's that are Content
			
			ParseText(article, section, child, mergedStyle, texts, styles);
		}
		else
		{
			throw new Error();
		}
	}
}
function MeasureText(article, section, texts, styles) {
	
	const hypher = new Hypher('en');
	
	let allHyphenated = [];
	let allWidths = [];
	
	for (let i = 0; i < texts.length; i++)
	{
		const text = texts[i];
		const style = styles[i];
		
		const fontObject = Hyperdeck.Fonts[style.font].font;
		const fontSizePt = style.size; // this may need to be scaled
		
		const words = text.split(/\s/);
		const hyphenated = words.map(word => hypher.hyphenate(word)); // string[][]
		const widths = hyphenated.map(parts => parts.map(part => MeasureWord(fontObject, fontSizePt, part))); // number[][] - could bind fontObject and fontSizePt to MeasureWord for performance
		
		// for now, we'll just do this
		allHyphenated = allHyphenated.concat(hyphenated);
		allWidths = allWidths.concat(widths);
		
		// hyphenated is a list of words, each of which is a list of parts
		// the parts are where the soft hyphen breaks can be put
		
		// the style array might well have to be on character indices on parts, since foo[1] will be one part but two styles
		// [[  "foo"  ,    "bar[1]"   ]]
		// [[ [style] , [style,style] ]]
		// [[ [[0,3]] , [[0,3],[3,6]] ]] - char indexes for the style
		
		// [[ ["foo"] , ["bar","[1]"] ]] - if we have a triple array to hold sub-parts, then we can dispense with char indexes
		// [[ [style] , [style,style] ]]
		// [[   [5]   ,     [5,5]     ]] - still need those measurements though for the sub part placement
		
		// fillText works on subparts, whereas typeset works on parts, is the main issue here
		// now, this could be solved elegantly if we could direct typeset to add a zero-width space between subparts
		// then typeset could treat subparts as parts
		
		
		// crucially now, we need one fillText call per subpart, not per part
		// the placements returned by typeset are for parts, and will work as long as the part width is correct
		// but the fillText call for bar[1] has to include sub-placement placing - to separate bar and [1] correctly
		// which will simply require another MeasureWord call, which we had hoped to be over and done with here in MeasureText
		
		// here's another question: why does typeset need the words and parts?
		// how does it put parts together that it determines don't need a soft hyphen?
		// would that be better done in a separate piece of code?
		// ideally, typeset works on abstract widths alone
		
		// see, now the issue is that we have to concatenate the hyphenated, and concatenate the widths
		// and those boundaries are where you might find a foo[1], where the parts and widths have to be merged into one
		// and you also have to create a map of style indexes (or an array that references the styles, that should just be an array of pointers)
	}
	
	section.words = allHyphenated;
	section.wordMetrics = allWidths;
	
	// const placements = Typeset(hyphenated, widths, hyphenWidth, spaceWidth, lineWidths); // [ { text, x, line } ]
}
function MeasureWord(fontObject, fontSizePt, str) {
	const bbox = fontObject.getPath(str, 0, 0, fontSizePt).getBoundingBox();
	return bbox.x2 - bbox.x1;
}

function NewPage(article, section, bPdf) {
	
	// we don't want client code to deal with pdf - so bPdf will need to be a closure or bind or something
	
	// param should just be doc and bPdf - then we create a ctx of proper width/height and apply scaling
	
	// client code, including drawsection and draw content , works in cubits only
	
	const width = ((section.orientation == 'portrait') ? article.pageWidth : article.pageHeight);
	const height = ((section.orientation == 'portrait') ? article.pageHeight : article.pageWidth);
	
	if (height < 1) { throw new Error('page size too small'); }
	
	let ctx = null;
	
	if (bPdf)
	{
		ctx = new PDF(width, height);
	}
	else
	{
		const scale = article.pixelsPerUnit / article.cubitsPerUnit;
		const pixelWidth = width * scale;
		const pixelHeight = height * scale;
		
		const canvas = document.createElement('canvas');
		canvas.style.margin = '1em';
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
		canvas.style.border = '1px solid gray';
		
		ctx = canvas.getContext('2d');
		
		ctx.scale(scale, scale);
	}
	
	const page = {
		ctx: ctx,
		width: width,
		height: height,
		boxes: [],
		lines: [],
		contents: []
	};
	
	return page;
}

function Base64StringToUint8Array(str) {
	
	function b64ToUint6(n) { return n>64&&n<91?n-65:n>96&&n<123?n-71:n>47&&n<58?n+4:n===43?62:n===47?63:0; }

	const nBlocksSize = 3;
	const sB64Enc = str.replace(/[^A-Za-z0-9\+\/]/g, ""); // remove all non-eligible characters from the string
	const nInLen = sB64Enc.length;
	const nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2;
	const taBytes = new Uint8Array(nOutLen);
	
	for (let nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++)
	{
		nMod4 = nInIdx & 3;
		nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
		
		if (nMod4 === 3 || nInLen - nInIdx === 1)
		{
			for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++)
			{
				taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
			}
			
			nUint24 = 0;
		}
	}
	
	return taBytes;
}
function UnitSize(unit) { return {in:1,cm:1/2.54,mm:1/25.4,pt:1/72}[unit]; }
function Find(array, field, value) {
	
	for (let i = 0; i < array.length; i++)
	{
		if (array[i][field] === value) { return array[i]; }
	}
	
	return null;
}

function ApplyTextAlign(ctx, cellref) {
	
	if (cellref[0] == 'A')
	{
		ctx.textAlign = 'left';
	}
	else if (cellref[0] == 'B')
	{
		ctx.textAlign = 'center';
	}
	else if (cellref[0] == 'C')
	{
		ctx.textAlign = 'right';
	}
	
	if (cellref[1] == '1')
	{
		ctx.textBaseline = 'top';
	}
	else if (cellref[1] == '2')
	{
		ctx.textBaseline = 'middle';
	}
	else if (cellref[1] == '3')
	{
		ctx.textBaseline = 'bottom';
	}
}
function ApplyCoordAlign(cellref, margins, left, top, width, height) {
	
	let ax = null;
	let ay = null;
	
	if (cellref[0] == 'A')
	{
		ax = left + margins.left;
	}
	else if (cellref[0] == 'B')
	{
		ax = left + width / 2;
	}
	else if (cellref[0] == 'C')
	{
		ax = left + width - margins.right;
	}
	
	if (cellref[1] == '1')
	{
		ay = top + margins.top;
	}
	else if (cellref[1] == '2')
	{
		ay = top + height / 2;
	}
	else if (cellref[1] == '3')
	{
		ay = top + height - margin.bottom;
	}
	
	return [ax,ay];
}

class LinkedList {
	constructor() {
		this.data = null;
		this.prev = this;
		this.next = this;
	}
	add(data) {
		
		// this must be called on the sentinel
		
		const elt = new LinkedList();
		elt.data = data;
		elt.next = this;
		elt.prev = this.prev;
		
		if (this.next === this) { this.next = elt; } else { this.prev.next = elt; }
		this.prev = elt;
		
		return elt;
	}
	remove() {
		
		// this cannot be called on the sentinel
		this.prev.next = this.next;
		this.next.prev = this.prev;
	}
	enumerate() {
		
		// this must be called on the sentinel
		
		const list = [];
		let elt = this.next;
		
		while (elt !== this)
		{
			list.push(elt.data);
			elt = elt.next;
		}
		
		return list;
	}
}
class Box {
	
	//lf: number;
	//cx: number;
	//rt: number;
	//wd: number;
	//wr: number;
	//tp: number;
	//cy: number;
	//bt: number;
	//hg: number;
	//hr: number;
	
	// reconcile(params: BoxParams): Box
	// static Make(params: BoxParams): Box
	// static Occlude(boxes: Box[], occ: Box): Box[]
	
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
	reconcile(params) {
		
		const box = this;
		
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
	static Make(params) {
		const box = new Box();
		box.reconcile(params);
		return box;
	}
	static Occlude(boxes, occ) {
		
		const newboxes = [];
		
		const MakeBox = function(params) { return new Box().reconcile(params); };
		
		for (let i = 0; i < boxes.length; i++)
		{
			const box = boxes[i];
			
			if (occ.lf >= box.rt || occ.rt <= box.lf || occ.tp >= box.bt || occ.bt <= box.tp) // no overlap, pass box through
			{
				newboxes.push(box);
			}
			else if (occ.lf > box.lf && occ.rt < box.rt && occ.tp > box.tp && occ.bt < box.bt) // 0 edges blocked - occlusion is inside box
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
				throw new Error();
			}
		}
		
		return newboxes;
	}
}

Hyperdeck.ContentPlugins = {
	caption: Caption,
	image: Image,
	diagram: Diagram,
	table: Table,
	list: List
};

Hyperdeck.Components.document = Doc;

})();

// Alt+3,2


