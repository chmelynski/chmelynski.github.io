
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

*/

function XmlToDocument(text: string): Document {
	
	var doc = null;
	
	var xml = Xml.Parse(text);
	
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


