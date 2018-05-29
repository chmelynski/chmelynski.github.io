
namespace Hyperdeck {

export class Tree {
	
	ctx: CanvasRenderingContext2D;
	data: any;
	
	root: Twig;
	cursor: Twig; // the first visible twig - the cursor and closer are moved simultaneously upon scrolling - that's how we know if we've hit the wall
	closer: Twig; // the last visible twig
	selected: Twig;
	
	twigs: VisibleTwig[]; // caches cx, cy, text
	
	input: HTMLInputElement;
	
	lf: number;
	tp: number;
	indent: number;
	handleRadius: number; // used only to determine if the mouse is hovered over the handle - this requires it to sync with the handle draw function, which is not ideal.  but requiring the user to provide a hit function seems like overkill
	textMargin: number;
	twigHeight: number;
	maxVisible: number;
	font: string;
	drawHandle: (ctx: CanvasRenderingContext2D, tree: Tree, twig: Twig, cx: number, cy: number) => void;
	
	constructor(ctx: CanvasRenderingContext2D, data: any, options: any) {
		
		var tree = this;
		
		this.ctx = ctx;
		this.data = data;
		
		options = options || {};
		this.lf = options.left ? options.left : 50;
		this.tp = options.top ? options.top : 20;
		this.indent = options.indent ? options.indent : 20;
		this.handleRadius = options.handleRadius ? options.handleRadius : 5;
		this.textMargin = options.textMargin ? options.textMargin : 15;
		this.twigHeight = options.twigHeight ? options.twigHeight : 15;
		this.maxVisible = options.maxVisible ? options.maxVisible : Math.floor((ctx.canvas.height - this.tp) / this.twigHeight);
		this.font = options.font ? options.font : '10pt Courier New';
		this.drawHandle = options.drawHandle ? options.drawHandle : DrawHandle2;
		
		this.root = Tree.JsonToTwigRec(data);
		this.cursor = this.root;
		this.closer = null;
		this.determineCloser();
		this.selected = this.root;
		
		this.input = document.createElement('input');
		this.input.type = 'text';
		this.input.style.display = 'none';
		this.input.style.position = 'absolute';
		this.ctx.canvas.parentElement.appendChild(this.input);
		
		this.calcVisible();
		this.draw();
		this.setHandlers();
	}
	draw(): void {
		
		const tree = this;
		const ctx = tree.ctx;
		
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		
		ctx.fillStyle = 'black';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.font = tree.font;
		
		for (var i = 0; i < tree.twigs.length; i++)
		{
			const visibleTwig = tree.twigs[i];
			const cx = visibleTwig.cx;
			const cy = visibleTwig.cy;
			tree.drawHandle(ctx, tree, visibleTwig.twig, cx, cy);
			ctx.fillText(visibleTwig.text, cx + tree.textMargin, cy + 0.5);
		}
	}
	determineCursor(): void {
		
		// calculate cursor by walking backward from closer
		// this only happens on selection overflow, so prev === null should never happen
		
		const tree = this;
		let twig = tree.closer;
		
		for (var i = 0; i < tree.maxVisible - 1; i++)
		{
			twig = twig.prev();
			if (twig === null) { throw new Error(); }
		}
		
		tree.cursor = twig;
	}
	determineCloser(): void {
		
		// calculate closer by walking forward from cursor
		
		const tree = this;
		let twig = tree.cursor;
		
		for (var i = 0; i < tree.maxVisible; i++)
		{
			const next = twig.next();
			if (next === null) { break; }
			twig = next;
		}
		
		tree.closer = twig;
	}
	calcVisible(): void {
		
		const tree = this;
		tree.twigs = [];
		
		let twig = tree.cursor;
		
		for (var i = 0; i < tree.maxVisible; i++)
		{
			const cx = tree.lf + twig.indent() * tree.indent;
			const cy = tree.tp + i * tree.twigHeight;
			
			const len = (twig.type == TwigType.Array) ? ((twig == tree.root) ? tree.data.length : twig.obj[twig.key].length.toString()) : 0;
			const val = (twig.type == TwigType.Object) ? '{}' : ((twig.type == TwigType.Array) ? '[' + len + ']' : JSON.stringify(twig.obj[twig.key]));
			const text = twig.key + ' : ' + val;
			
			tree.twigs[i] = new VisibleTwig(twig, cx, cy, text);
			
			if (twig == tree.closer) { break; }
			
			twig = twig.next();
		}
	}
	setHandlers(): void {
		
		const tree = this;
		const ctx = tree.ctx;
		const canvas = ctx.canvas;
		
		let shift = false;
		let ctrl = false;
		let alt = false;
		
		let mx = null;
		let my = null;
		
		let hovered: Twig = null;
		
		function Toggle(twig: Twig, open: boolean): void {
			
			if (twig.type == TwigType.Primitive) { return; }
			
			const toToggle = shift ? (alt ? twig.grandchildren() : twig.children()) : [twig];
			
			for (var i = 0; i < toToggle.length; i++)
			{
				if (ctrl)
				{
					toToggle[i].toggleDescendants(open);
				}
				else
				{
					toToggle[i].open = open;
				}
			}
			
			tree.determineCloser();
			tree.calcVisible();
			tree.draw();
		}
		function CheckOverflow(): void {
			
			// if selected goes below the closer, make the selected the new closer
			let selectedVisible = false;
			
			for (var i = 0; i < tree.twigs.length; i++)
			{
				if (tree.twigs[i].twig == tree.selected)
				{
					selectedVisible = true;
					break;
				}
			}
			
			if (!selectedVisible)
			{
				tree.closer = tree.selected;
				tree.determineCursor();
			}
			
			tree.calcVisible();
			tree.draw();
		}
		function CheckUnderflow(): void {
			
			// if selected goes above the cursor, make the selected the new cursor
			let selectedVisible = false;
			
			for (var i = 0; i < tree.twigs.length; i++)
			{
				if (tree.twigs[i].twig == tree.selected)
				{
					selectedVisible = true;
					break;
				}
			}
			
			if (!selectedVisible)
			{
				tree.cursor = tree.selected;
				tree.determineCloser();
			}
			
			tree.calcVisible();
			tree.draw();
		}
		
		// we can't do anything on focus or blur because we blur the canvas when we move focus to the edit input
		canvas.onfocus = function(e) { };
		canvas.onblur = function(e) { };
		canvas.onwheel = function(wheelEvent: MouseWheelEvent): void {
			
			wheelEvent.preventDefault();
			wheelEvent.stopPropagation();
			
			//const clicks = -wheelEvent.wheelDelta / 120;
			const clicks = (wheelEvent.deltaY > 0) ? 1 : -1;
			
			// Shift+Scroll = 1, Scroll = 10, Ctrl+Scroll = 100, Ctrl+Shift+Scroll = 1000, Ctrl+Shift+Alt+Scroll = 10000
			const multiplier = (ctrl && shift && alt) ? 10000 : ((ctrl && shift) ? 1000 : (ctrl ? 100 : (shift ? 1 : 10)));
			
			const offset = clicks * multiplier;
			
			tree.scrollBy(offset);
		};
		canvas.onmousemove = function(e) {
			
			mx = e.offsetX;
			my = e.offsetY;
			
			const r = tree.handleRadius;
			
			let hit = false;
			
			for (var i = 0; i < tree.twigs.length; i++)
			{
				const twig = tree.twigs[i];
				
				if (twig.cx - r < mx && mx < twig.cx + r && twig.cy - r < my && my < twig.cy + r)
				{
					hit = true;
					hovered = twig.twig;
					canvas.style.cursor = 'pointer';
					return;
				}
			}
			
			if (!hit && hovered)
			{
				hovered = null;
				canvas.style.cursor = 'default';
			}
		};
		canvas.onmousedown = function(e) {
			
			if (hovered)
			{
				tree.selected = hovered;
				Toggle(hovered, !hovered.open);
			}
		};
		canvas.onkeyup = function(keyUpEvent) {
			
			const key = keyUpEvent.keyCode;
			
			if (key == 16) // shift
			{
				shift = false;
			}
			else if (key == 17) // ctrl
			{
				ctrl = false;
			}
			else if (key == 18) // alt
			{
				alt = false;
			}
		};
		canvas.onkeydown = function(e) {
			
			const key = e.keyCode;
			const letter = e.key;
			
			const selected = tree.selected;
			const sel = tree.selected;
			
			e.preventDefault();
			e.stopPropagation();
			
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
			else if (key == 9) // tab
			{
				
			}
			else if (key == 27) // esc
			{
				
			}
			else if (key == 46) // delete
			{
				if (tree.root == sel) { return; }
				
				var prev = sel.prev();
				
				var parentType = Object.prototype.toString.apply(sel.obj);
				var obj = sel.obj;
				
				if (sel.parent.firstChild == sel) { sel.parent.firstChild = sel.nextSibling; }
				if (sel.parent.lastChild == sel) { sel.parent.lastChild = sel.prevSibling; }
				if (sel.prevSibling !== null) { sel.prevSibling.nextSibling = sel.nextSibling; }
				if (sel.nextSibling !== null) { sel.nextSibling.prevSibling = sel.prevSibling; }
				
				if (parentType == '[object Object]')
				{
					delete obj[sel.key]
				}
				else if (parentType == '[object Array]')
				{
					obj.splice(parseInt(sel.key), 1);
				}
				
				if (parentType == '[object Array]') { sel.parent.rekey(); }
				
				tree.selected = prev;
				
				tree.determineCloser();
				tree.calcVisible();
				tree.draw();
			}
			else if (key == 32) // space
			{
				const editVal = !shift;
				
				if (!editVal && tree.selected == tree.root) { return; } // can't edit the key of the root
				
				let index = -1;
				for (var i = 0; i < tree.twigs.length; i++)
				{
					if (tree.twigs[i].twig == tree.selected)
					{
						index = i;
						break;
					}
				}
				if (index < 0) { return; }
				const visibleTwig = tree.twigs[index];
				
				const lf = ctx.canvas.offsetLeft + visibleTwig.cx + tree.textMargin;
				const tp = ctx.canvas.offsetTop + visibleTwig.cy - 10;
				
				const input = tree.input;
				input.style.display = 'block';
				input.style.left = lf + 'px';
				input.style.top = tp + 'px';
				
				if (editVal)
				{
					input.value = (tree.selected == tree.root) ? JSON.stringify(tree.data) : JSON.stringify(tree.selected.obj[tree.selected.key]);
				}
				else
				{
					input.value = tree.selected.key;
				}
				
				input.focus();
				
				input.onkeydown = function(e) {
					
					const key = e.keyCode;
					
					if (key == 27) // Esc = reject edit
					{
						input.style.display = 'none';
						input.value = '';
						ctx.canvas.focus();
						
						e.preventDefault();
						e.stopPropagation();
					}
					else if (key == 13) // Enter = accept edit
					{
						input.style.display = 'none';
						
						const text = input.value;
						const twig = tree.selected;
						
						if (editVal)
						{
							const val = JSON.parse(text);
							const type = Object.prototype.toString.apply(val);
							
							if (type == '[object Object]' || type == '[object Array]')
							{
								const newtwig = Tree.JsonToTwigRec(val);
								
								if (tree.root == twig)
								{
									tree.root = newtwig;
									tree.cursor = newtwig;
									tree.data = val;
								}
								else
								{
									newtwig.obj = twig.obj;
									newtwig.key = twig.key;
									
									if (twig.parent.firstChild == twig) { twig.parent.firstChild = newtwig; }
									if (twig.parent.lastChild == twig) { twig.parent.lastChild = newtwig; }
									if (twig.prevSibling !== null) { twig.prevSibling.nextSibling = newtwig; }
									if (twig.nextSibling !== null) { twig.nextSibling.prevSibling = newtwig; }
									
									newtwig.parent = twig.parent;
									newtwig.prevSibling = twig.prevSibling;
									newtwig.nextSibling = twig.nextSibling;
									
									newtwig.obj[newtwig.key] = val;
								}
								
								tree.selected = newtwig;
							}
							else
							{
								if (tree.root != twig) { twig.obj[twig.key] = val; } // you can't make the root a primitive value, deal with it
							}
						}
						else
						{
							if (!twig.obj[text]) // check for key collisions
							{
								const val = twig.obj[twig.key]
								delete twig.obj[twig.key];
								twig.obj[text] = val;
								twig.key = text;
							}
						}
						
						ctx.canvas.focus();
						shift = false;
						ctrl = false;
						alt = false;
						
						e.preventDefault();
						e.stopPropagation();
						
						tree.determineCloser();
						tree.calcVisible();
						tree.draw();
					}
				};
			}
			else if (key == 33 || key == 34) // page up/down
			{
				const offset = (ctrl && shift && alt) ? 10000 : ((ctrl && shift) ? 1000 : (ctrl ? 100 : (shift ? 1 : 10)));
				const direction = ((key == 33) ? -1 : 1);
				tree.scrollBy(direction * offset);
			}
			else if (key == 37 || key == 39) // left or right
			{
				if (alt && !shift)
				{
					if (key == 39) // Alt+Right = add first child
					{
						var obj = ((tree.root == sel) ? tree.data : sel.obj[sel.key]);
						var seltype = Object.prototype.toString.apply(obj);
						
						var newchild = new Twig();
						newchild.type = TwigType.Primitive;
						newchild.parent = sel;
						newchild.firstChild = null;
						newchild.lastChild = null;
						newchild.prevSibling = null;
						newchild.nextSibling = sel.firstChild;
						newchild.open = true;
						newchild.obj = obj;
						
						if (seltype == '[object Object]')
						{
							if (obj[''] !== undefined) { return; } // bail if the empty string is already a key
							newchild.key = '';
							obj[''] = null;
						}
						else if (seltype == '[object Array]')
						{
							obj.unshift(null);
						}
						else
						{
							return; // sel must represent an object or array
						}
						
						if (sel.firstChild !== null) { sel.firstChild.prevSibling = newchild; }
						sel.firstChild = newchild;
						if (sel.lastChild === null) { sel.lastChild = newchild; }
						
						if (seltype == '[object Array]') { sel.rekey(); }
					}
					
					tree.determineCloser();
					tree.calcVisible();
					tree.draw();
				}
				else
				{
					const open = (key == 39); // right = open
					
					if (!shift && !alt && !ctrl && !open && (!selected.open || selected.type == TwigType.Primitive))
					{
						if (tree.selected.parent !== null)
						{
							tree.selected = tree.selected.parent;
							CheckUnderflow();
						}
					}
					else if (!shift && !alt && !ctrl && open && selected.open)
					{
						const next = tree.selected.next();
						if (next !== null) { tree.selected = next; CheckOverflow(); }
					}
					else
					{
						Toggle(selected, open);
					}
				}
			}
			else if (key == 38) // up
			{
				if (ctrl && shift)
				{
					tree.selected = tree.root;
				}
				else if (shift && alt) // move prev
				{
					if (tree.root == sel || sel.prevSibling === null) { return; }
					
					var obj = sel.obj;
					var parentType = Object.prototype.toString.apply(obj);
					
					var pre = sel.prevSibling;
					
					if (sel.parent.firstChild == pre) { sel.parent.firstChild = sel; }
					if (sel.parent.lastChild == sel) { sel.parent.lastChild = pre; }
					
					if (pre.prevSibling !== null) { pre.prevSibling.nextSibling = sel; }
					if (sel.nextSibling !== null) { sel.nextSibling.prevSibling = pre; }
					
					pre.nextSibling = sel.nextSibling;
					sel.nextSibling = pre;
					sel.prevSibling = pre.prevSibling;
					pre.prevSibling = sel;
					
					if (parentType == '[object Array]')
					{
						var temp = obj[sel.key];
						obj[sel.key] = obj[pre.key];
						obj[pre.key] = temp;
						var tempKey = sel.key;
						sel.key = pre.key;
						pre.key = tempKey;
					}
					
					tree.determineCloser();
					tree.calcVisible();
					tree.draw();
					
					return; // skip over the CheckUnderflow below
				}
				else if (ctrl)
				{
					if (tree.selected.parent !== null) { tree.selected = tree.selected.parent; }
				}
				else if (shift)
				{
					if (tree.selected.prevSibling) { tree.selected = tree.selected.prevSibling; }
				}
				else if (alt) // add prev sibling
				{
					if (sel == tree.root) { return; }
					
					var parentType = Object.prototype.toString.apply(sel.obj);
					var obj = sel.obj;
					
					var newtwig = new Twig();
					newtwig.type = TwigType.Primitive;
					newtwig.parent = sel.parent;
					newtwig.firstChild = null;
					newtwig.lastChild = null;
					newtwig.prevSibling = sel.prevSibling;
					newtwig.nextSibling = sel;
					newtwig.open = true;
					newtwig.obj = obj;
					
					if (parentType == '[object Object]')
					{
						if (obj[''] !== undefined) { return; } // bail if the empty string is already a key
						newtwig.key = '';
						obj[''] = null;
					}
					else if (parentType == '[object Array]')
					{
						obj.splice(parseInt(sel.key), 0, null);
					}
					else
					{
						return; // sel must represent an object or array
					}
					
					if (sel.parent.firstChild == sel) { sel.parent.firstChild = newtwig; }
					if (sel.prevSibling !== null) { sel.prevSibling.nextSibling = newtwig; }
					sel.prevSibling = newtwig;
					
					if (parentType == '[object Array]') { sel.parent.rekey(); }
					
					tree.determineCloser();
					tree.calcVisible();
					tree.draw();
					
					return; // skip over the CheckUnderflow below
				}
				else
				{
					const prev = tree.selected.prev();
					if (prev !== null) { tree.selected = prev; }
				}
				
				CheckUnderflow();
			}
			else if (key == 40) // down
			{
				if (ctrl && shift)
				{
					// to bookmark?
				}
				else if (shift && alt)
				{
					if (tree.root == sel || sel.nextSibling === null) { return; }
					
					var obj = sel.obj;
					var parentType = Object.prototype.toString.apply(obj);
					
					var nxt = sel.nextSibling;
					
					if (sel.parent.firstChild == sel) { sel.parent.firstChild = nxt; }
					if (sel.parent.lastChild == nxt) { sel.parent.lastChild = sel; }
					
					if (sel.prevSibling !== null) { sel.prevSibling.nextSibling = nxt; }
					if (nxt.nextSibling !== null) { nxt.nextSibling.prevSibling = sel; }
					
					sel.nextSibling = nxt.nextSibling;
					nxt.nextSibling = sel;
					nxt.prevSibling = sel.prevSibling;
					sel.prevSibling = nxt;
					
					if (parentType == '[object Array]')
					{
						var temp = obj[sel.key];
						obj[sel.key] = obj[nxt.key];
						obj[nxt.key] = temp;
						var tempKey = sel.key;
						sel.key = nxt.key;
						nxt.key = tempKey;
					}
					
					tree.determineCloser();
					tree.calcVisible();
					tree.draw();
					
					return; // skip over the CheckOverflow below
				}
				else if (ctrl)
				{
					// ??
				}
				else if (shift)
				{
					if (tree.selected.nextSibling) { tree.selected = tree.selected.nextSibling; }
				}
				else if (alt) // add next sibling
				{
					if (sel == tree.root) { return; }
					
					var parentType = Object.prototype.toString.apply(sel.obj);
					var obj = sel.obj;
					
					var newtwig = new Twig();
					newtwig.type = TwigType.Primitive;
					newtwig.parent = sel.parent;
					newtwig.firstChild = null;
					newtwig.lastChild = null;
					newtwig.prevSibling = sel;
					newtwig.nextSibling = sel.nextSibling;
					newtwig.open = true;
					newtwig.obj = obj;
					
					if (parentType == '[object Object]')
					{
						if (obj[''] !== undefined) { return; } // bail if the empty string is already a key
						newtwig.key = '';
						obj[''] = null;
					}
					else if (parentType == '[object Array]')
					{
						obj.splice(parseInt(sel.key) + 1, 0, null);
					}
					else
					{
						return; // sel must represent an object or array
					}
					
					if (sel.parent.lastChild == sel) { sel.parent.lastChild = newtwig; }
					if (sel.nextSibling !== null) { sel.nextSibling.prevSibling = newtwig; }
					sel.nextSibling = newtwig;
					
					if (parentType == '[object Array]') { sel.parent.rekey(); }
					
					tree.determineCloser();
					tree.calcVisible();
					tree.draw();
					
					return; // skip over the CheckOverflow below
				}
				else
				{
					const next = tree.selected.next();
					if (next !== null) { tree.selected = next; }
				}
				
				CheckOverflow();
			}
			else if (ctrl && key == 80) // Ctrl+P = add object parent, Ctrl+Shift+P = add array parent
			{
				// there are bugs here, not sure what, weird stuff happens
				
				//if (sel == tree.root) { return; } // we could do something with this although i don't know what
				//
				//var newparent = new Twig();
				//newparent.parent = sel.parent;
				//newparent.firstChild = sel;
				//newparent.lastChild = sel;
				//newparent.prevSibling = sel.prevSibling;
				//newparent.nextSibling = sel.nextSibling;
				//newparent.open = true;
				//newparent.obj = sel.obj;
				//newparent.key = sel.key;
				//
				//if (sel.parent.firstChild == sel) { sel.parent.firstChild = newparent; }
				//if (sel.parent.lastChild == sel) { sel.parent.lastChild = newparent; }
				//if (sel.prevSibling !== null) { sel.prevSibling.nextSibling = newparent; }
				//if (sel.nextSibling !== null) { sel.nextSibling.prevSibling = newparent; }
				//
				//if (shift)
				//{
				//	newparent.type = TwigType.Array;
				//	var newarr = [];
				//	var temp = sel.obj[sel.key];
				//	sel.obj[sel.key] = newarr;
				//	newarr[0] = temp;
				//	sel.key = '0';
				//	sel.obj = newarr;
				//}
				//else
				//{
				//	newparent.type = TwigType.Object;
				//	var newobj = {};
				//	var temp = sel.obj[sel.key];
				//	sel.obj[sel.key] = newobj;
				//	newobj[''] = temp;
				//	sel.key = '';
				//	sel.obj = newobj;
				//}
				//
				//sel.parent = newparent;
				//sel.prevSibling = null;
				//sel.nextSibling = null;
			}
		};
	}
	scrollBy(offset: number): void {
		
		const tree = this;
		
		let cursor = tree.cursor;
		let closer = tree.closer;
		
		let n = offset;
		
		if (n > 0)
		{
			while (n > 0)
			{
				const nextCursor = cursor.next();
				const nextCloser = closer.next();
				if (nextCloser === null) { break; }
				cursor = nextCursor;
				closer = nextCloser;
				n--;
			}
		}
		else
		{
			while (n < 0)
			{
				const prevCursor = cursor.prev();
				const prevCloser = closer.prev();
				if (prevCursor === null) { break; }
				cursor = prevCursor;
				closer = prevCloser;
				n++;
			}
		}
		
		tree.cursor = cursor;
		tree.closer = closer;
		tree.calcVisible();
		tree.draw();
	}
	static JsonToTwigRec(json: any, key?: string): Twig {
		
		if (key === undefined) { key = '[root]'; }
		
		const type = Object.prototype.toString.apply(json);
		const twig = new Twig();
		twig.key = key;
		
		if (type == '[object Object]')
		{
			twig.type = TwigType.Object;
			
			let first = true;
			let prevChild = null;
			
			for (var key in json)
			{
				const child = Tree.JsonToTwigRec(json[key], key);
				child.obj = json;
				child.parent = twig;
				
				if (first)
				{
					twig.firstChild = child;
				}
				else
				{
					prevChild.nextSibling = child;
					child.prevSibling = prevChild;
				}
				
				first = false;
				prevChild = child;
			}
			
			twig.lastChild = prevChild;
		}
		else if (type == '[object Array]')
		{
			twig.type = TwigType.Array;
			
			let first = true;
			let prevChild = null;
			
			for (var i = 0; i < json.length; i++)
			{
				const child = Tree.JsonToTwigRec(json[i], i.toString());
				child.obj = json;
				child.parent = twig;
				
				if (first)
				{
					twig.firstChild = child;
				}
				else
				{
					prevChild.nextSibling = child;
					child.prevSibling = prevChild;
				}
				
				first = false;
				prevChild = child;
			}
			
			twig.lastChild = prevChild;
		}
		else
		{
			twig.type = TwigType.Primitive;
		}
		
		return twig;
	}
}
class Twig {
	
	open: boolean; // {} or [] only
	
	type: TwigType;
	
	obj: any; // null if root, otherwise references the parent {} or [] of the json
	key: string;
	
	parent: Twig; // null if root
	firstChild: Twig;
	lastChild: Twig;
	nextSibling: Twig;
	prevSibling: Twig;
	
	constructor() {
		
		this.type = TwigType.Primitive;
		
		this.parent = null;
		this.firstChild = null;
		this.lastChild = null;
		this.nextSibling = null;
		this.prevSibling = null;
		
		this.open = true;
		
		this.obj = null;
		this.key = null;
	}
	descendants(): Twig[] {
		
		const l = [];
		
		function DescendantsRec(twig: Twig): void {
			
			l.push(twig);
			
			const children = twig.children();
			
			for (var i = 0; i < children.length; i++)
			{
				DescendantsRec(children[i]);
			}
		}
		
		DescendantsRec(this);
		
		return l;
	}
	indent(): number {
		
		const twig = this;
		
		if (twig.parent)
		{
			return twig.parent.indent() + 1; 
		}
		else
		{
			return 0;
		}
	}
	prev(): Twig {
		
		const twig = this;
		
		function Last(t) {
			
			if (t.open && t.lastChild !== null)
			{
				return Last(t.lastChild);
			}
			else
			{
				return t;
			}
		}
		
		if (twig.parent === null)
		{
			return null;
		}
		else if (twig == twig.parent.firstChild)
		{
			return twig.parent;
		}
		else
		{
			return Last(twig.prevSibling);
		}
	}
	next(): Twig {
		
		const twig = this;
		
		function NextHelper(t) {
			
			if (t.nextSibling)
			{
				return t.nextSibling;
			}
			else
			{
				if (t.parent)
				{
					return NextHelper(t.parent);
				}
				else
				{
					return null;
				}
			}
		}
		
		if (twig.type == TwigType.Object || twig.type == TwigType.Array)
		{
			if (twig.open && twig.firstChild)
			{
				return twig.firstChild;
			}
			else
			{
				return NextHelper(twig);
			}
		}
		else
		{
			return NextHelper(twig);
		}
	}
	toggleDescendants(open: boolean): void {
		
		const twig = this;
		
		twig.open = open;
		
		const children = twig.children();
		
		for (var i = 0; i < children.length; i++)
		{
			children[i].toggleDescendants(open);
		}
	}
	children(): Twig[] {
		
		const twig = this;
		
		const children = [];
		
		if (twig.firstChild === null) { return children; }
		
		let child = twig.firstChild;
		
		children.push(child);
		
		while (child.nextSibling !== null)
		{
			child = child.nextSibling;
			children.push(child);
		}
		
		return children;
	}
	grandchildren(): Twig[] {
		
		const twig = this;
		
		const children = twig.children();
		
		let grandchildren = [];
		
		for (var i = 0; i < children.length; i++)
		{
			grandchildren = grandchildren.concat(children[i].children());
		}
		
		return grandchildren;
	}
	rekey(): void {
		
		// done to arrays after we prepend/delete a child
		
		const twig = this;
		
		const children = twig.children();
		
		for (var i = 0; i < children.length; i++)
		{
			children[i].key = i.toString();
		}
	}
}
class VisibleTwig {
	
	twig: Twig;
	cx: number;
	cy: number;
	text: string;
	
	constructor(twig: Twig, cx: number, cy: number, text: string) {
		
		this.twig = twig;
		this.cx = cx;
		this.cy = cy;
		this.text = text;
	}
}
function DrawHandle(ctx: CanvasRenderingContext2D, tree: Tree, twig: Twig, cx: number, cy: number): void {
	
	const handleRadius = 5;
	
	// selected dots
	if (twig == tree.selected)
	{
		const lf = cx - handleRadius - 2;
		const tp = cy - handleRadius - 2;
		const wd = handleRadius * 2 + 5;
		
		ctx.setLineDash([1,1]);
		ctx.beginPath();
		ctx.moveTo(lf, tp+0.5);
		ctx.lineTo(lf+wd, tp+0.5);
		ctx.moveTo(lf+wd-0.5, tp);
		ctx.lineTo(lf+wd-0.5, tp+wd);
		ctx.moveTo(lf+wd, tp+wd-0.5);
		ctx.lineTo(lf, tp+wd-0.5);
		ctx.moveTo(lf+0.5, tp+wd);
		ctx.lineTo(lf+0.5, tp);
		ctx.stroke();
		ctx.setLineDash([1,0]);
	}
	
	// box
	ctx.strokeRect(cx - handleRadius + 0.5, cy - handleRadius + 0.5, handleRadius * 2, handleRadius * 2);
	
	// +/-
	if (twig.firstChild !== null)
	{
		ctx.beginPath();
		ctx.moveTo(cx - 1, cy+0.5);
		ctx.lineTo(cx + 3, cy+0.5);
		ctx.stroke();
		
		if (!twig.open)
		{
			ctx.beginPath();
			ctx.moveTo(cx+0.5, cy - 2);
			ctx.lineTo(cx+0.5, cy + 2);
			ctx.stroke();
		}
	}
}
function DrawHandle2(ctx: CanvasRenderingContext2D, tree: Tree, twig: Twig, cx: number, cy: number): void {
	
	var selected = (twig == tree.selected);
	var plus = (twig.firstChild !== null && !twig.open);
	var minus = (twig.firstChild !== null);
	
	var imageData = ctx.createImageData(15, 15);
	
	for (var i = 0; i < 15; i++)
	{
		for (var j = 0; j < 15; j++)
		{
			var index = (i * imageData.width + j) * 4;
			
			var black = (selected && (i==0 || j==0 || i==14 || j==14) && (((i+j+1) % 2) == 1)) || // dotted square
						((j==2 || j==12) && i>=2 && i<=12) || ((i==2 || i==12) && j>=2 && j<=12) || // box
						(plus && j==7 && i>=5 && i<=9) || // plus
						(minus && i==7 && j>=5 && j<=9); // minus
						
			var color = (black ? 0 : 255);
			
			imageData.data[index + 0] = color;
			imageData.data[index + 1] = color;
			imageData.data[index + 2] = color;
			imageData.data[index + 3] = 255;
		}
	}
	
	ctx.putImageData(imageData, cx - 7, cy - 7);
}
const enum TwigType { Object, Array, Primitive }

}

