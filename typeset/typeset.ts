
// this was adapted from https://github.com/bramstein/typeset - needs proper licensing/attribution

// every pair of breakpoint nodes represents a line of text

// penalties are given for:
// 1. an explicit hyphen appearing at the end of a line (so that the hyphen is not mistakenly assumed to be implicit)
// 2. an implicit hyphen appearing at the end of a line (minimize implicit hyphens)
// 3. two implicit hyphens in a row are given additional penalties

// the default spacing between words is 1/3em.  this can be shrunk by 1/9em and stretched by 1/6em
// maximum permitted stretching can be set by the tolerance parameter, with 1 point of tolerance equal to 1/6em
// these parameters are used in the calculation of demerits

// for our uses here, T is always a Breakpoint
class ListNode<T> {
	
	data: T;
	prev: ListNode<T> = null;
	next: ListNode<T> = null;
	
	constructor(data: T) {
		this.data = data;
	}
	toString(): string {
		return this.data.toString();
	}
}
class LinkedList<T> {
	
	head: ListNode<T> = null;
	tail: ListNode<T> = null;
	listSize: number = 0;
	
	constructor() { }
	isLinked(node: ListNode<T>): boolean {
		return !((node && node.prev === null && node.next === null && this.tail !== node && this.head !== node) || this.isEmpty());
	}
	size(): number {
		return this.listSize;
	}
	isEmpty(): boolean {
		return this.listSize === 0;
	}
	first(): ListNode<T> {
		return this.head;
	}
	last(): ListNode<T> {
		return this.tail;
	}
	toString(): string {
		return this.toArray().toString();
	}
	toArray(): ListNode<T>[] {
		var node = this.head,
		result = [];
		while (node !== null) {
			result.push(node);
			node = node.next;
		}
		return result;
	}
	forEach(fn: (node: ListNode<T>) => void): void {
		// Note that modifying the list during iteration is not safe.
		var node = this.head;
		while (node !== null) {
			fn(node);
			node = node.next;
		}
	}
	contains(n: ListNode<T>): boolean {
		var node = this.head;
		if (!this.isLinked(n)) {
			return false;
		}
		while (node !== null) {
			if (node === n) {
				return true;
			}
			node = node.next;
		}
		return false;
	}
	at(i: number): ListNode<T> {
		
		var node = this.head
		var index = 0;
		if (i >= this.listSize || i < 0) { return null; }
		
		while (node !== null)
		{
			if (i === index) { return node; }
			node = node.next;
			index += 1;
		}
		
		return null;
	}
	insertAfter(node: ListNode<T>, newNode: ListNode<T>): LinkedList<T> {
		if (!this.isLinked(node)) {
			return this;
		}
		newNode.prev = node;
		newNode.next = node.next;
		if (node.next === null) {
			this.tail = newNode;
		} else {
			node.next.prev = newNode;
		}
		node.next = newNode;
		this.listSize += 1;
		return this;
	}
	insertBefore(node: ListNode<T>, newNode: ListNode<T>): LinkedList<T> {
		if (!this.isLinked(node)) {
			return this;
		}
		newNode.prev = node.prev;
		newNode.next = node;
		if (node.prev === null) {
			this.head = newNode;
		} else {
			node.prev.next = newNode;
		}
		node.prev = newNode;
		this.listSize += 1;
		return this;
	}
	push(node: ListNode<T>): LinkedList<T> {
		if (this.head === null) {
			this.unshift(node);
		} else {
			this.insertAfter(this.tail, node);
		}
		return this;
	}
	unshift(node: ListNode<T>): LinkedList<T> {
		if (this.head === null) {
			this.head = node;
			this.tail = node;
			node.prev = null;
			node.next = null;
			this.listSize += 1;
		} else {
			this.insertBefore(this.head, node);
		}
		return this;
	}
	remove(node: ListNode<T>): LinkedList<T> {
		if (!this.isLinked(node)) {
			return this;
		}
		if (node.prev === null) {
			this.head = node.next;
		} else {
			node.prev.next = node.next;
		}
		if (node.next === null) {
			this.tail = node.prev;
		} else {
			node.next.prev = node.prev;
		}
		this.listSize -= 1;
		return this;
	}
	pop(): ListNode<T> {
		var node = this.tail;
		this.tail.prev.next = null;
		this.tail = this.tail.prev;
		this.listSize -= 1;
		node.prev = null;
		node.next = null;
		return node;
	}
	shift(): ListNode<T> {
		var node = this.head;
		this.head.next.prev = null;
		this.head = this.head.next;
		this.listSize -= 1;
		node.prev = null;
		node.next = null;
		return node;
	}
}

//interface Canvas { fillText(text: string, x: number, y: number): void; }

type TypesetNodeType = 'glue' | 'box' | 'penalty';
interface TypesetNode {
	
	type: TypesetNodeType;
	width: number;
	
	// glue only
	stretch?: number;
	shrink?: number;
	
	// box only
	value?: string;
	
	// penalty only
	penalty?: number;
	flagged?: number;
}
interface Breakpoint {
	
	position?: number;
	demerits: number;
	ratio?: number;
	line?: number;
	fitnessClass?: number;
	totals?: Sum;
	previous?: ListNode<Breakpoint>;
	active?: ListNode<Breakpoint>;
}
interface Break {
	position: number;
	ratio: number;
}
interface Placement {
	text: string;
	x: number;
	line: number;
}

interface Sum {
	width: number;
	shrink: number;
	stretch: number;
}

type LinebreakSettings = { tolerance: number, demerits: { line: number, flagged: number, fitness: number } };

var infinity = 10000;

// the node types
var glue = function(width: number, stretch: number, shrink: number): TypesetNode {
	return {
		type: 'glue',
		width: width,
		stretch: stretch,
		shrink: shrink
	};
};
var box = function(width: number, value: string): TypesetNode {
	return {
		type: 'box',
		width: width,
		value: value
	};
};
var penalty = function(width: number, penalty: number, flagged: number): TypesetNode {
	return {
		type: 'penalty',
		width: width,
		penalty: penalty,
		flagged: flagged
	};
};

function breakpoint(position: number, demerits: number, ratio: number, line: number, fitnessClass: number, totals: Sum, previous: ListNode<Breakpoint>): Breakpoint {
	return {
		position: position,
		demerits: demerits,
		ratio: ratio,
		line: line,
		fitnessClass: fitnessClass,
		totals: totals || { width : 0 , stretch : 0 , shrink : 0 },
		previous: previous
	};
}

function Justify(hyphenated: string[][], widths: number[][], hyphenWidth: number, spaceWidth: number): TypesetNode[] {
	
	// these could be controlled by parameters
	var hyphenPenalty = 100;
	var spaceShrink = spaceWidth * 1/3;
	var spaceStretch = spaceWidth * 1/2;
	
	var nodes = [];
	
	for (var i = 0; i < hyphenated.length; i++)
	{
		for (let j = 0; j < hyphenated[i].length; j++)
		{
			nodes.push(box(widths[i][j], hyphenated[i][j]));
			if (j < hyphenated[i].length - 1) { nodes.push(penalty(hyphenWidth, hyphenPenalty, 1)); }
		}
		
		if (i === hyphenated.length - 1)
		{
			nodes.push(glue(0, infinity, 0));
			nodes.push(penalty(0, -infinity, 1));
		}
		else
		{
			nodes.push(glue(spaceWidth, spaceStretch, spaceShrink));
		}
	}
	
	return nodes;
}
function Linebreak(nodes: TypesetNode[], lines: number[], settings?: LinebreakSettings): Break[] {
	
	var options = {
		demerits: {
			line: settings && settings.demerits && settings.demerits.line || 10,
			flagged: settings && settings.demerits && settings.demerits.flagged || 100,
			fitness: settings && settings.demerits && settings.demerits.fitness || 3000
		},
		tolerance: settings && settings.tolerance || 2
	};
	
	var activeNodes = new LinkedList<Breakpoint>();
	var sum = { width : 0 , stretch : 0 , shrink : 0 };
	var lineLengths = lines;
	
	// Add an active node for the start of the paragraph.
	activeNodes.push(new ListNode<Breakpoint>(breakpoint(0, 0, 0, 0, 0, undefined, null)));
	
	nodes.forEach(function(node, index, nodes) {
		
		if (node.type === 'box')
		{
			sum.width += node.width;
		}
		else if (node.type === 'glue')
		{
			if (index > 0 && nodes[index - 1].type === 'box') { MainLoop(node, index, nodes, activeNodes, sum, lineLengths, options); }
			sum.width += node.width;
			sum.stretch += node.stretch;
			sum.shrink += node.shrink;
		}
		else if (node.type === 'penalty' && node.penalty !== infinity)
		{
			MainLoop(node, index, nodes, activeNodes, sum, lineLengths, options);
		}
		
		//DrawNodes(g, activeNodes, nodes);
	});
	
	//DrawNodes(g, activeNodes, nodes);
	
	if (activeNodes.size() == 0) { throw new Error(); }
	var breaks = DetermineBreaks(activeNodes.toArray());
	return breaks;
}

function MainLoop(node: TypesetNode, index: number, nodes: TypesetNode[], activeNodes: LinkedList<Breakpoint>, sum: Sum, lineLengths: number[], options: LinebreakSettings): void {
	
	var active = activeNodes.first();
	
	// The inner loop iterates through all the active nodes with line < currentLine and then breaks out
	// to insert the new active node candidates before looking at the next active nodes for the next lines.
	// The result of this is that the active node list is always sorted by line number.
	while (active !== null)
	{
		//DrawActiveNodes(g, activeNodes, nodes);
		
		// one element for each fitness class 0,1,2,3 (this has to do with the ratio (= how tightly-packed the line is?)
		var candidates: [Breakpoint, Breakpoint, Breakpoint, Breakpoint] = [ { demerits : Infinity } , { demerits : Infinity } , { demerits : Infinity } , { demerits : Infinity } ];
		
		// Iterate through the linked list of active nodes to find new potential active nodes and deactivate current active nodes.
		while (active !== null)
		{
			var next = active.next;
			var currentLine = active.data.line + 1;
			var ratio = ComputeCost(sum, lineLengths, nodes, active.data.position, index, active.data, currentLine);
			
			// Deactive nodes when the the distance between the current active node and the
			// current node becomes too large (i.e. it exceeds the stretch limit and the stretch
			// ratio becomes negative) or when the current node is a forced break (i.e. the end
			// of the paragraph when we want to remove all active nodes, but possibly have a final
			// candidate active node---if the paragraph can be set using the given tolerance value.)
			if (ratio < -1 || (node.type === 'penalty' && node.penalty === -infinity)) { activeNodes.remove(active); }
			
			// If the ratio is within the valid range of -1 <= ratio <= tolerance calculate the
			// total demerits and record a candidate active node.
			if (-1 <= ratio && ratio <= options.tolerance)
			{
				var badness = 100 * Math.pow(Math.abs(ratio), 3);
				
				var demerits = 0;
				// Positive penalty
				if (node.type === 'penalty' && node.penalty >= 0) {
					demerits = Math.pow(options.demerits.line + badness + node.penalty, 2);
				// Negative penalty but not a forced break
				} else if (node.type === 'penalty' && node.penalty !== -infinity) {
					demerits = Math.pow(options.demerits.line + badness - node.penalty, 2);
				// All other cases
				} else {
					demerits = Math.pow(options.demerits.line + badness, 2);
				}
				
				if (node.type === 'penalty' && nodes[active.data.position].type === 'penalty') {
					demerits += options.demerits.flagged * node.flagged * nodes[active.data.position].flagged;
				}
				
				var currentClass = 0;
				// Calculate the fitness class for this candidate active node.
				if (ratio < -0.5) { currentClass = 0; } else if (ratio <= 0.5) { currentClass = 1; } else if (ratio <= 1) { currentClass = 2; } else { currentClass = 3; }
				
				// Add a fitness penalty to the demerits if the fitness classes of two adjacent lines differ too much.
				if (Math.abs(currentClass - active.data.fitnessClass) > 1) { demerits += options.demerits.fitness; }
				
				// Add the total demerits of the active node to get the total demerits of this candidate node.
				demerits += active.data.demerits;
				
				// Only store the best candidate for each fitness class
				if (demerits < candidates[currentClass].demerits) { candidates[currentClass] = { active : active , demerits : demerits , ratio : ratio }; }
			}
			
			active = next;
			
			// Stop iterating through active nodes to insert new candidate active nodes in the active list 
			// before moving on to the active nodes for the next line.
			// TODO: The Knuth and Plass paper suggests a conditional for currentLine < j0. This means paragraphs
			// with identical line lengths will not be sorted by line number. Find out if that is a desirable outcome.
			// For now I left this out, as it only adds minimal overhead to the algorithm and keeping the active node
			// list sorted has a higher priority.
			if (active !== null && active.data.line >= currentLine) { break; }
		}
		
		var tmpSum = ComputeSum(sum, nodes, index);
		
		for (var fitnessClass = 0; fitnessClass < candidates.length; fitnessClass += 1)
		{
			var candidate = candidates[fitnessClass];
			
			if (candidate.demerits < Infinity)
			{
				var bp = breakpoint(index, candidate.demerits, candidate.ratio, candidate.active.data.line + 1, fitnessClass, tmpSum, candidate.active);
				var newNode = new ListNode<Breakpoint>(bp);
				if (active !== null) { activeNodes.insertBefore(active, newNode); } else { activeNodes.push(newNode); }
			}
		}
	}
}

// add width, stretch and shrink values from the current break point up to the next box or forced penalty
function ComputeSum(sum: Sum, nodes: TypesetNode[], breakPointIndex: number): Sum {
	
	var result = { width : sum.width , stretch : sum.stretch , shrink : sum.shrink };
	
	for (var i = breakPointIndex; i < nodes.length; i++)
	{
		if (nodes[i].type === 'glue')
		{
			result.width += nodes[i].width;
			result.stretch += nodes[i].stretch;
			result.shrink += nodes[i].shrink;
		}
		else if (nodes[i].type === 'box' || (nodes[i].type === 'penalty' && nodes[i].penalty === -infinity && i > breakPointIndex))
		{
			break;
		}
	}
	
	return result;
}
function ComputeCost(sum: Sum, lineLengths: number[], nodes: TypesetNode[], start: number, end: number, active: Breakpoint, currentLine: number): number {
	
	var width = sum.width - active.totals.width;
	var stretch = 0;
	var shrink = 0;
	
	// If the current line index is within the list of linelengths, use it, otherwise use the last line length of the list.
	var lineLength = currentLine < lineLengths.length ? lineLengths[currentLine - 1] : lineLengths[lineLengths.length - 1];
	
	if (nodes[end].type === 'penalty') { width += nodes[end].width; }
	
	if (width < lineLength)
	{
		// calculate the stretch ratio
		stretch = sum.stretch - active.totals.stretch;
		return (stretch > 0) ? (lineLength - width) / stretch : infinity
	}
	else if (width > lineLength)
	{
		// calculate the shrink ratio
		shrink = sum.shrink - active.totals.shrink;
		return (shrink > 0) ? (lineLength - width) / shrink : infinity;
	}
	else
	{
		// perfect match
		return 0;
	}
}
function DetermineBreaks(activeNodes: ListNode<Breakpoint>[]): Break[] {
	
	var minDemerits = Infinity;
	var best = null;
	
	var breaks = [];
	
	// Find the best active node (the one with the least total demerits).  At this point, the set of active nodes should be rather small.
	for (var i = 0; i < activeNodes.length; i++)
	{
		var node = activeNodes[i];
		
		if (node.data.demerits < minDemerits)
		{
			minDemerits = node.data.demerits;
			best = node;
		}
	}
	
	// traverse up the chain of nodes to construct the list of breaks
	while (best !== null)
	{
		breaks.push({ position : best.data.position , ratio : best.data.ratio });
		best = best.data.previous;
	}
	
	return breaks.reverse();
}
function PlaceWords(nodes: TypesetNode[], breaks: Break[], lineWidths: number[]): Placement[] {
	
	var lines = [];
	var lineStart = 0;
	
	// Iterate through the line breaks, and split the nodes at the correct point.
	for (var i = 1; i < breaks.length; i++)
	{
		var point = breaks[i].position;
		var r = breaks[i].ratio;
		
		for (var j = lineStart; j < nodes.length; j++)
		{
			var node: TypesetNode = nodes[j];
			
			// After a line break, we skip any nodes unless they are boxes or forced breaks.
			if (node.type === 'box' || (node.type === 'penalty' && node.penalty === -infinity))
			{
				lineStart = j;
				break;
			}
		}
		
		lines.push({ ratio : r , nodes : nodes.slice(lineStart, point + 1) , position : point });
		lineStart = point;
	}
	
	var maxLength = Math.max.apply(null, lineWidths);
	
	var placements = [];
	
	for (var i = 0; i < lines.length; i++)
	{
		var line = lines[i];
		var lineLength = i < lineWidths.length ? lineWidths[i] : lineWidths[lineWidths.length - 1];
		
		var x = 0;
		
		for (var k = 0; k < line.nodes.length; k++)
		{
			var node: TypesetNode = line.nodes[k];
			
			if (node.type === 'box')
			{
				placements.push({ text : node.value , x : x , line : i });
				x += node.width;
			}
			else if (node.type === 'glue')
			{
				x += node.width + line.ratio * (line.ratio < 0 ? node.shrink : node.stretch);
			}
			else if (node.type === 'penalty' && node.penalty === 100 && k === line.nodes.length - 1)
			{
				placements.push({ text : '-' , x : x , line : i });
			}
		}
	}
	
	return placements;
}

export function Typeset(hyphenated: string[][], widths: number[][], hyphenWidth: number, spaceWidth: number, lineWidths: number[]): Placement[] {
	const nodes = Justify(hyphenated, widths, hyphenWidth, spaceWidth);
	const breaks = Linebreak(nodes, lineWidths);
	const placements = PlaceWords(nodes, breaks, lineWidths);
	return placements;
}

function DrawNodes(ctx: CanvasRenderingContext2D, activeNodes: LinkedList<Breakpoint>, nodes: TypesetNode[]): void {
	
	
	// start with the set of active nodes at the end
	// get the set of all nodes that were once active by backtracing on previous
	// order the nodes horizontally by position and vertically by line (center each row of nodes)
	// draw boxes, draw lines between boxes, draw demerits text in the middle of that line (which is the middle of the boxes)
	
	// or rather, we should draw all nodes, not just the active-at-one-point nodes at the end of each line
	// this means basically laying out the boxed words just like a paragraph
	
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	var tp = 10;
	var lf = 10;
	var linePitch = 50;
	var wd = 30;
	
	var active = activeNodes.first();
	
	while (active != null)
	{
		ctx.strokeRect(lf + active.data.position, tp + linePitch * active.data.line, wd, wd);
		active = active.next;
	}
}


