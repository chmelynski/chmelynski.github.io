
function DisplayArray(data, displaySub)
{
	var array = {};
	AddRectSlots(array);
	array.parentSelect = ParentSelectArrayShape;
	array.parentDeselect = ParentDeselectArrayShape;
	array.displaySub = displaySub;
	array.position = PositionArray;
	array.draw = DrawBox;
	array.click = ClickBox;
	array.contents = new Array(data.contents.length);
	array.data = data;
	
	for (var i = 0; i < data.contents.length; i++)
	{
		var sub = displaySub(data.contents[i]);
		sub.container = array;
		array.contents[i] = sub;
	}
	
	return array;
}

function PositionArray(array)
{
	var top = Get(array.top);
	var left = Get(array.left);
	var gap = Get(array.gap);
	
	var x = left;
	var y = top;
	
	for (var i = 0; i < array.contents.length; i++)
	{
		var sub = array.contents[i];
		
		if (array.ori == "h")
		{
			x += gap;
			
			MoveBox(sub, "top", "height", top + 2);
			MoveBox(sub, "left", "width", x);
			
			x += Get(sub.width);
		}
		else if (array.ori == "v")
		{
			y += gap;
			
			MoveBox(sub, "top", "height", y);
			MoveBox(sub, "left", "width", left + 2);
			
			y += Get(sub.height);
		}
		
		sub.position(sub);
	}
}

function OnFocusArray(array)
{

}

function DeFocusArray(array)
{

}

 
function MakeBoxtree(parent, name)
{
	var tree = MakeObj(parent, name);
	tree.contents = MakeList(tree, "contents");
	tree.twigs = MakeList(tree, "twigs");
	tree.indents = MakeList(tree, "indents");
	tree.root = null;
	tree.obj = null;
	tree.budField = null;
	tree.childrenField = null;
	tree.position = PositionBoxtree;
	tree.draw = DrawBoxtree;
	tree.click = ClickContents;
	tree.onfocus = OnFocusTree;
	tree.defocus = DeFocusTree;
	tree.editActive = EditSelectedSetTreeShape;
	return tree;
}

function MakeBoxtreeTwig(tree, parentTwig, data)
{
	var twig = MakeObj(tree.twigs, tree.twigs.length.toString()); // when children are inserted, the [parent] and [name] fields will be overwritten by a call to GenerateContents(tree)
	//AddRectSlots(twig); // not necessary - we click and interact with the cells, not the twigs
	twig.data = data;
	
	// boxtree-specific
	twig.ori = "h";
	
	// for right now, twig.contents is always a cell - in the future, this need not be so
	
	twig.contents = DisplaySlotAsCell(twig, "contents", data[tree.budField]);

	var cell = twig.contents;
	
	cell.container = tree; // order matters - RedisplayGramCell depends on the container
	
	// grammar-specific
	cell.redisplay = RedisplayGramCell;
	cell.redisplay(cell);
	
	twig.parent = parentTwig;
	twig.children = MakeList(twig, "children");
	
	var objChildren = data[tree.childrenField]; // objChildren must be a list
	
	for (var i = 0; i < objChildren.length; i++)
	{
		var child = MakeBoxtreeTwig(tree, twig, objChildren[i]);
		twig.children.push(child);
	}
	
	return twig;
}

function GenerateBoxtreeTwigs(tree)
{
	tree.root = MakeBoxtreeTwig(tree, null, tree.obj);

	GenerateContents(tree);
}

function PositionBoxtree(tree)
{
	SetTwigDim(tree.root);
	SetTwigPos(tree.root);
	
	for (var i = 0; i < tree.contents.length; i++)
	{
		var contents = tree.contents[i];
		contents.position(contents);
	}
}

function DrawBoxtree(tree)
{
	for (var i = 0; i < tree.contents.length; i++)
	{
		var sub = tree.contents[i];
		
		if (sub.draw)
		{
			sub.draw(sub);
		}
	}
	
	for (var i = 0; i < tree.contents.length; i++)
	{
		var sub = tree.contents[i];
		DrawBorder(sub);
	}
	
	//if (tree.activeContent)
	//{
	//	var sub = tree.activeContent;
	//	DrawActiveBorder(Get(sub.left), Get(sub.top), Get(sub.right), Get(sub.bottom));
	//}
}

function TogglePlaceBoxtreeMode()
{
	if (globals.placeBoxtreeMode)
	{
		globals.canvas.buttons["TogglePlaceBoxtreeModeButton"].version = 0;
		ExitPlaceBoxtreeMode();
		globals.placeBoxtreeMode = false;
	}
	else
	{
		globals.canvas.buttons["TogglePlaceBoxtreeModeButton"].version = 2;
		EnterPlaceBoxtreeMode();
		globals.placeBoxtreeMode = true;
	}
}

function EnterPlaceBoxtreeMode()
{
	PushUnder("LD", PlaceBoxtree);
}

function ExitPlaceBoxtreeMode()
{
	PopUnder("LD");
}

function PlaceBoxtree()
{
	var defaultObjName = "Obj" + globals.id.toString();
	var obj = MakeSlot(globals.canvas, defaultObjName, "");
	globals.canvas[defaultObjName] = obj;
	
	var defaultTreeName = "Tree" + (globals.objcounts.tree++).toString();
	var tree = MakeBoxtree(globals.canvas, defaultTreeName);
	globals.canvas[defaultTreeName] = tree;
	
	// i don't like the idea of a bud.  i think the cell should display the obj - any value should be displayable
	
	obj.bud = MakeSlot(obj, "bud", "foo");
	obj.children = MakeList(obj, "children");
	
	tree.makeTwig = MakeBoxtreeTwig;
	
	tree.obj = obj;
	tree.budField = "bud";
	tree.childrenField = "children";
	GenerateBoxtreeTwigs(tree);
	
	// to maintain sharp edges, the cx and cy of the root must be on a 0.5, and the width and height of leaves must both be odd
	MoveBox(tree.root.contents, "cx", "width", Get(globals.mx) + 0.5);
	MoveBox(tree.root.contents, "cy", "height", Get(globals.my) + 0.5);
	//MoveBox(tree.root, "width", "cx", 200);
	//MoveBox(tree.root, "height", "cy", 200);
	
	tree.position(tree);
	
	//var SaveBoxtree = function()
	//{
	//	SaveObj(obj, "grammar.json");
	//}
	//
	//Push("Ctrl+Q", SaveBoxtree);
	
	globals.redraw = true;
}

function RedisplayGramCell(cell)
{
	var s = Get(cell.slot); // this must return a string
	
	var textInvisible;
	
	// this is a hack way to determine the cell's twig, which we need in order to change the hori/vert orientation to reflect the Rec/Alt/Opt/Seq value
	var boxtree = cell.container;
	var twig = null;
	
	for (var i = 0; i < boxtree.contents.length; i++)
	{
		if (boxtree.contents[i] == cell)
		{
			twig = boxtree.twigs[i];
		}
	}
	
	if (s == "Rec")
	{
		twig.ori = "h";
		cell.stroke = "rgb(255,0,0)";
		textInvisible = true;
	}
	else if (s == "Alt")
	{
		twig.ori = "v";
		cell.stroke = "rgb(255,150,0)";
		textInvisible = true;
	}
	else if (s == "Opt")
	{
		twig.ori = "h";
		cell.stroke = "rgb(0,150,0)";
		textInvisible = true;
	}
	else if (s == "Seq")
	{
		twig.ori = "h";
		cell.stroke = "rgb(0,0,0)";
		textInvisible = true;
	}
	else
	{
		// to maintain sharp edges, the cx and cy of the root must be on a 0.5, and the width and height of leaves must both be odd
		MoveBox(cell, "width", "cx", 63);
		MoveBox(cell, "height", "cy", 19);
		cell.stroke = "rgb(150,150,150)";
		textInvisible = false;
	}
	
	if (textInvisible)
	{
		cell.string = "";
	}
	else
	{
		cell.string = s;
	}
	
	RegenerateChars(cell);
}

function SetTwigDim(twig)
{
	if (twig.children.length == 0)
	{
		// we assume the width and height of twig.contents have already been set
	}
	else
	{
		if (twig.ori == "h")
		{
			var sum = 0;
			var max = 0;
			
			sum += 5;
			
			for (var i = 0; i < twig.children.length; i++)
			{
				var child = twig.children[i];
				SetTwigDim(child);
				sum += Get(child.contents.width) + 5;
				
				var childHeight = Get(child.contents.height);
				
				if (childHeight > max)
				{
					max = childHeight;
				}
			}
			
			var height = 5 + max + 5;
			
			MoveBox(twig.contents, "width", "cx", sum);
			MoveBox(twig.contents, "height", "cy", height);
		}
		else if (twig.ori == "v")
		{
			var sum = 0;
			var max = 0;
			
			sum += 5;
			
			for (var i = 0; i < twig.children.length; i++)
			{
				var child = twig.children[i];
				SetTwigDim(child);
				sum += Get(child.contents.height) + 5;
				
				var childWidth = Get(child.contents.width);
				
				if (childWidth > max)
				{
					max = childWidth;
				}
			}
			
			var width = 5 + max + 5;
			
			MoveBox(twig.contents, "width", "cx", width);
			MoveBox(twig.contents, "height", "cy", sum);
		}
		else
		{
			throw new Error();
		}
	}
}

function SetTwigPos(twig)
{
	if (twig.ori == "h")
	{
		var left = Get(twig.contents.left) + 5;
		
		for (var i = 0; i < twig.children.length; i++)
		{
			var child = twig.children[i];
			
			MoveBox(child.contents, "left", "width", left);
			MoveBox(child.contents, "cy", "height", Get(twig.contents.cy));
			
			left += Get(child.contents.width) + 5;
			
			SetTwigPos(child);
		}
	}
	else if (twig.ori == "v")
	{
		var top = Get(twig.contents.top) + 5;
		
		for (var i = 0; i < twig.children.length; i++)
		{
			var child = twig.children[i];
			
			MoveBox(child.contents, "top", "height", top);
			MoveBox(child.contents, "cx", "width", Get(twig.contents.cx));
			
			top += Get(child.contents.height) + 5;
			
			SetTwigPos(child);
		}
	}
	else
	{
		throw new Error();
	}
}


function MakeBuiltins()
{
	globals["+"] = MakeSlot(globals, "+", function(args) { return args[0] + args[1]; });
	//globals["+"].state = State.Nonblank;
	
	globals["-"] = MakeSlot(globals, "-", function(args) { return args[0] - args[1]; });
	//globals["-"].state = State.Nonblank;
	
	globals["*"] = MakeSlot(globals, "*", function(args) { return args[0] * args[1]; });
	//globals["*"].state = State.Nonblank;
	
	globals["/"] = MakeSlot(globals, "/", function(args) { return args[0] / args[1]; });
	//globals["/"].state = State.Nonblank;
	
	globals[":="] = MakeSlot(globals, ":=", function (args) { return args[0]; });
	//globals[":="].state = State.Nonblank;
	
	globals["DrawBox"] = MakeSlot(globals, "DrawBox", DrawBox);
	//globals["DrawBox"].state = State.Nonblank;
}


function DrawButton(button)
{
	globals.g.drawImage(button.img, button.version * Get(button.width), 0, Get(button.width), Get(button.height), Get(button.left), Get(button.top), Get(button.width), Get(button.height));
}

function OnHoverButton(button)
{
	// versioning, hovering, and modal buttons needs to be thought out more carefully
	
	if (button.version == 0)
	{
		button.version = 1;
	}
	
	Push("LD", button.fn);
	globals.redraw = true;
}

function DeHoverButton(button)
{
	if (button.version == 1)
	{
		button.version = 0;
	}
	
	Pop("LD");
	globals.redraw = true;
}


function DisplayStringAsCell(parent, name, str)
{
	var cell = MakeCell(parent, name);
	var slot = MakeSlot(cell, "slot", str);
	SetCellSlot(cell, slot);
	//cell.formula = str; // so.  the real issue here is that the formula should probably belong to the slot, not the cell
	// because you can't have two cells with two different formulas referencing the same slot - a slot can only have one source
	// which means that if we attach a cell to a slot that already has a formula, the cell should mirror that formula
	// cell.string should alternate between slot.formula and cell.tostring(Get(slot))
	return cell;
}

function DisplaySlotAsCell(parent, name, slot)
{
	var cell = MakeCell(parent, name);
	SetCellSlot(cell, slot);
	return cell;
}

function MakeCell(parent, name)
{
	var cell = MakeObj(parent, name);
	cell["[type]"] = "Cell";
	cell.draw = DrawCell;
	cell.click = ClickBox;
	cell.act = RedisplayCellString; // perhaps this is where we should shim in a generalized display function
	cell.tostring = ToStringDefault;
	cell.redisplay = RedisplayCellString;
	cell.position = PositionChars;
	cell.contents = MakeList(cell, "contents");
	cell.string = "";
	cell.formula = "";
	cell.lineWidth = 1;
	cell.stroke = "rgb(0,0,0)";
	cell.fill = null;
	cell.textFill = "rgb(0,0,0)";
	cell.border = MakeObj(cell, "border");
	AddRectSlots(cell);
	cell.onhover = OnHoverCell;
	cell.dehover = DeHoverCell;
	cell.onselect = OnSelectCell;
	cell.deselect = DeSelectCell;
	cell.numberFormat = MakeSlot(cell, "numberFormat", 0);
	Set(cell.width, 64);
	Set(cell.height, 20);
	
	cell.cursorOn = false;
	cell.cursorTimer = null;
	
	cell.toggleCursor = ToggleCursor; // since switching this from a closure to this, it probably doesn't need to be a field
	
	return cell;
}

function SetCellSlot(cell, slot)
{
	cell.slot = slot;
	AddSlotCellEdge(slot, cell);
	cell.align = typeof(Get(slot)) == "number" ? "right" : "left";
	cell.redisplay(cell);
}

function ResetCursor()
{
	globals.cursorOn = true;
	clearInterval(globals.cursorTimer);
    globals.cursorTimer = setInterval(ToggleCursor, 500);
	DrawCursor();
}

function DeactCursor()
{
	globals.cursorOn = false;
	clearInterval(globals.cursorTimer);
}

function ToggleCursor()
{
	globals.cursorOn = !globals.cursorOn;
	DrawCursor();
}

function DrawCursor()
{
	var cell = globals.beingEdited;
	
	if (cell)
	{
		var x = null;
		var y1 = null;
		var y2 = null;
		
		if (cell.cursorPosInString == -1)
		{
			x = Get(cell.left) + 2;
			y1 = Get(cell.top) + 2;
			y2 = Get(cell.top) + 17; // arbitrary - should depend on font and size
		}
		else
		{
			var c = cell.contents[cell.cursorPosInString];
			
			x = Get(c.right);
			y1 = Get(c.top) + 2;
			y2 = Get(c.bottom) - 2;
		}
		
		x = Math.floor(x) + 0.5;
		
		var g = globals.g;
		g.lineWidth = 1;
			
		if (globals.cursorOn)
		{
			g.strokeStyle = "rgb(0,0,0)";
		}
		else
		{
			if (cell.fill)
			{
				g.strokeStyle = cell.fill;
			}
			else
			{
				g.strokeStyle = "rgb(255,255,255)";
			}
		}
		
		g.beginPath();
		g.moveTo(x, y1);
		g.lineTo(x, y2);
		g.stroke();
	}
}

function DrawCell(cell)
{
	DrawBox(cell);
	
	DrawCursor();

	//if (globals.selectedCellShape == cell)
	//{
	//	DrawActiveBorder(Get(cell.left), Get(cell.top), Get(cell.right), Get(cell.bottom));
	//}
}

function OnHoverCell(cell)
{
	//cell.oldstroke = cell.stroke;
	//cell.stroke = "rgb(255,0,0)";
	
	//document.getElementById("myCanvas").style.cursor = "cell";
	//document.getElementById("myCanvas").style.cursor = "text"; // if cell is currently being edited

	Push("LD", MouseSelectCell); // change to BeginTraceSelection - we select on LU
}

function DeHoverCell(cell)
{
	//cell.stroke = cell.oldstroke;
	
	//document.getElementById("myCanvas").style.cursor = "default";
	
	Pop("LD");
}

function OnSelectCell(cell)
{
	var container = cell.container;
	
	if (container)
	{
		container.onfocus(container);
		//container.editActive(container, cell, true); // true=activate,false=deactivate
	}
	
	//cell.border.type = "Select";
	//cell.border.N = 1;
	//cell.border.E = 1;
	//cell.border.S = 1;
	//cell.border.W = 1;
	//cell.border.NW = 1;
	//cell.border.NE = 1;
	//cell.border.SW = 1;
	//cell.border.SE = 1;
	
	PushAlpha(DeleteAndPrimeTextEditAndAddChar);
	//Push("Backspace", DeleteAndPrimeTextEdit); // this function not yet implemented
	Push("Space", DeleteAndPrimeTextEditAndAddChar);
	Push("F2", PrimeTextEdit);
	Push("Delete", Delete);
	Push("Esc", Deselect);
	
	Push(";:", DeleteAndPrimeTextEditAndAddChar);
    Push("=+", DeleteAndPrimeTextEditAndAddChar);
    Push(",<", DeleteAndPrimeTextEditAndAddChar);
    Push("-_", DeleteAndPrimeTextEditAndAddChar);
    Push(".>", DeleteAndPrimeTextEditAndAddChar);
    Push("/?", DeleteAndPrimeTextEditAndAddChar);
    Push("`~", DeleteAndPrimeTextEditAndAddChar);
    Push("[{", DeleteAndPrimeTextEditAndAddChar);
    Push("\\|", DeleteAndPrimeTextEditAndAddChar);
    Push("]}", DeleteAndPrimeTextEditAndAddChar);
    Push("'\"", DeleteAndPrimeTextEditAndAddChar);
}

function DeSelectCell(cell)
{
	var container = cell.container;
	
	if (container)
	{
		container.defocus(container);
		//container.editActive(container, cell, false); // true=activate,false=deactivate
	}
	
	//cell.border.type = null;
	
	PopAlpha();
	//Pop("Backspace");
	Pop("Space");
	Pop("F2");
	Pop("Delete");
	Pop("Esc");
	
	Pop(";:");
    Pop("=+");
    Pop(",<");
    Pop("-_");
    Pop(".>");
    Pop("/?");
    Pop("`~");
    Pop("[{");
    Pop("\\|");
    Pop("]}");
    Pop("'\"");
}

function RedisplayCellString(cell)
{
	ValueToString(cell);
	RegenerateChars(cell);
}

function ValueToString(cell)
{
	var value = Get(cell.slot);
	cell.valueType = typeof(value);
	
	if (value == null)
	{
		cell.string = "";
	}
	else if (cell.valueType == "number")
	{
		cell.string = value.toFixed(Get(cell.numberFormat));
	}
	else if (cell.valueType == "string" || cell.valueType == "object")
	{
		cell.string = cell.tostring(value); // apply formatting here - note that when you want to edit, use the raw toString()
	}
	else if (cell.valueType == "boolean")
	{
		cell.string = value.toString();
	}
	else if (cell.valueType == "function")
	{
		cell.string = value.name;
	}
	else // undefined, presumably
	{
		cell.string = "";
	}
}

function RegenerateChars(cell)
{
	cell.contents = MakeList(cell, "contents");
	
	for (var i = 0; i < cell.string.length; i++)
	{
		var c = MakeObj(cell.contents, cell.contents.length.toString());
		cell.contents.push(c);
		c.c = cell.string[i];
		c.draw = DrawText;
		c.click = ClickBox;
		c.cell = cell;
		c.type = "text";
		//c.font = "10pt Courier New";
		//c.font = "11pt Consolas";
		c.font = "11pt Calibri"; // this is what Excel uses - needs to be kerned properly though
		c.stroke = null;
		c.fill = cell.textFill;
		c.width = null;
		c.height = null;
		c.left = null;
		c.top = null;
		c.right = null;
		c.bottom = null;
		c.wr = null;
		c.hr = null;
		c.cx = null;
		c.cy = null;
		c.scale = null;
		
		if (cell.valueType == "number" && IsDigit(c.c))
		{
			c.onhover = OnHoverDigit;
			c.dehover = DeHoverDigit;
		}
		else
		{
			c.onhover = OnHoverNonDigit;
			c.dehover = DeHoverNonDigit;
		}
	}
	
	// assign scale
	if (cell.valueType == "number") // and if the cell is not a formula cell
	{
		var decimalPointFound = false;
		
		for (var i = 0; i < cell.contents.length; i++)
		{
			if (cell.contents[i].c == ".") // first find the decimal place
			{
				var scale = 1;
				
				for (var k = i - 1; k >= 0; k--)
				{
					cell.contents[k].scale = scale;
					scale *= 10;
				}
				
				scale = 0.1;
				
				for (var k = i + 1; k < cell.contents.length; k++)
				{
					cell.contents[k].scale = scale;
					scale /= 10;
				}
				
				decimalPointFound = true;
				break;
			}
		}
		
		if (!decimalPointFound)
		{
			var scale = 1;
			
			for (var k = cell.contents.length - 1; k >= 0; k--)
			{
				cell.contents[k].scale = scale;
				scale *= 10;
			}
		}
	}
}

function PositionChars(cell)
{
	var left = Get(cell.left);
	var top = Get(cell.top);
	var right = Get(cell.right);
	var bottom = Get(cell.bottom) + 1; // this is some horrible grid/cell/whatever hack
	
	// the assumption here is normal English text flow - this should be generalized later
	var hpos = left + 2;
	var vpos = top + 1;
	
	var g = globals.g;
	
	// here would be a good time to set invisible/visible flags for overflow situations
	
	// a cell always references the full number of char shapes - the char shapes always exist, they are just sometimes invisible
	
	// which means, cell.contents.length ALWAYS equals cell.string.length
	
	for (var i = 0; i < cell.contents.length; i++)
	{
		var c = cell.contents[i];
		
		if (c.c == '\n')
		{
			hpos = left + 2;
			vpos += 19;
			
			// for cursor placement
			c.right = left + 2;
			c.top = vpos;
			c.bottom = c.top + 19;
			
			c.invisible = true;
		}
		else if (c.c == '\r')
		{
			c.invisible = true; // i'm thinking of banning \r's from our strings - because then cursor movement with arrow keys becomes strange
		}
		else if (c.c == '\t')
		{
			hpos += 30; // 15 is rather arbitrary - also, this completely ignores the concept of tab stops
			
			// for cursor placement
			c.right = hpos;
			c.top = vpos;
			c.bottom = c.top + 19;
			
			c.invisible = true;
		}
		else
		{
			g.font = c.font;
			c.width = g.measureText(c.c).width;
			c.height = 19;
			c.wr = c.width / 2; // remember, we don't use slots for each char - too many
			c.hr = c.height / 2;
			
			c.left = hpos;
			c.right = c.left + c.width;
			
			if (c.right >= right - 1) // overflow
			{
				hpos = left + 2;
				vpos += c.height;
				c.left = hpos;
				c.right = c.left + c.width;
			}
			
			c.top = vpos;
			c.bottom = c.top + c.height;
			
			c.cx = c.left + c.wr;
			c.cy = c.top + c.hr;
			
			if (c.left > left && c.right < right && c.top > top && c.bottom < bottom)
			{
				c.invisible = false;
			}
			else
			{
				c.invisible = true;
			}
			
			hpos += c.width;
		}
	}
}

function ToStringDefault(value) { return value.toString(); }

function DrawBorder(cell)
{
	// this needs to handle all kinds of borders - select, point, highlight, etc

	var border = cell.border;
	
	if (!border)
	{
		return;
	}
	
	var lf = Get(cell.left);
	var rt = Get(cell.right);
	var tp = Get(cell.top);
	var bt = Get(cell.bottom);
	
	if (border.type == "Point")
	{
		globals.g.fillStyle = border.color;
		globals.g.strokeStyle = border.color;
		
		// if highlighted, draw a second outline 1px interior to the first outline
		
		if (border.N == 1)
		{
			DrawLine(lf, tp, rt, tp);
		}
		
		if (border.E == 1)
		{
			DrawLine(rt, tp, rt, bt);
		}
		
		if (border.S == 1)
		{
			DrawLine(lf, bt, rt, bt);
		}
		
		if (border.W == 1)
		{
			DrawLine(lf, tp, lf, bt);
		}
		
		if (border.NW == 1)
		{
			FillRect(lf - 1, tp - 1, lf + 3, tp + 3); // inclusive on both ends
		}
		
		if (border.NE == 1)
		{
			FillRect(rt - 3, tp - 1, rt + 1, tp + 3);
		}
		
		if (border.SE == 1)
		{
			FillRect(rt - 3, bt - 3, rt + 1, bt + 1);
		}
		
		if (border.SW == 1)
		{
			FillRect(lf - 1, bt - 3, lf + 3, bt + 1);
		}
	}
	else if (border.type == "Select")
	{
		if (border.N == 1)
		{
			FillRect(lf - 1, tp - 1, rt + 1, tp + 1);
		}
		
		if (border.E == 1)
		{
			FillRect(rt - 1, tp - 1, rt + 1, bt + 1);
		}
		
		if (border.S == 1)
		{
			FillRect(lf - 1, bt - 1, rt + 1, bt + 1);
		}
		
		if (border.W == 1)
		{
			FillRect(lf - 1, tp - 1, lf + 1, bt + 1);
		}
	}
	else if (border.type == "LabelHighlight")
	{
		globals.g.strokeStyle = border.color;
		
		DrawLine(lf, tp, rt, tp);
		DrawLine(rt, tp, rt, bt);
		DrawLine(lf, bt, rt, bt);
		DrawLine(lf, tp, lf, bt);
	}
	else
	{
	
	}
}

function FillRect(left, top, right, bottom)
{
	// the coordinate model assumed by the arguments is that whole numbers are the centers of pixels, and we pass whole numbers to this function
	// then we draw a rect that is inclusive of the four corners designated by the arguments
	
	globals.g.fillRect(left, top, right - left, bottom - top);
}

function DrawLine(x1, y1, x2, y2)
{
	// the coordinate model assumed by the arguments is that whole numbers are the centers of pixels, and we pass whole numbers to this function
	// then we draw a line that is inclusive of the two pixels designated by the arguments
	
	globals.g.beginPath();
	globals.g.moveTo(x1, y1);
	globals.g.lineTo(x2, y2);
	globals.g.stroke();
}


function AddDecimalPlace()
{
	var cell = globals.selected;
	Set(cell.numberFormat, Get(cell.numberFormat) + 1);
	cell.redisplay(cell);
	cell.position(cell);
	globals.redraw = true;
}

function RemDecimalPlace()
{
	var cell = globals.selected;
	Set(cell.numberFormat, Get(cell.numberFormat) - 1);
	cell.redisplay(cell);
	cell.position(cell);
	globals.redraw = true;
}


function Click()
{
	return ClickCollection(globals.canvas);
}

function ClickRec(obj)
{
	if (obj.click)
	{
		var target = obj.click(obj);
		
		if (target)
		{
			return target;
		}
	}
	
	var keys = [];
	
	for (var key in obj)
	{
		if (key[0] != "[")
		{
			keys.push(key);
		}
	}
	
	keys = keys.reverse();
	
	for (var i = 0; i < keys.length; i++)
	{
		var key = keys[i];
		var val = obj[key];
		var type = typeof(val);
		
		if (type == "object")
		{
			if (val == null)
			{
			
			}
			else
			{
				var parent = val["[parent]"];
				
				if (parent == obj)
				{
					var target = ClickRec(val);
					
					if (target)
					{
						return target;
					}
				}
			}
		}
	}
}

function ClickBox(shape)
{
	if (shape.contents) // this snippet could be put in the true branch of the conditional below, to enfore nested clicking
	{
		var target = ClickContents(shape);
		
		if (target)
		{
			return target;
		}
	}
	
	var mx = Get(globals.mx);
	var my = Get(globals.my);
	
	var lf = Get(shape.left);
	var rt = Get(shape.right);
	var tp = Get(shape.top);
	var bt = Get(shape.bottom);
	
	if (shape.border)
	{
		var r = shape.border.radius;
		
		if (lf - r <= mx && mx <= rt + r && tp - r <= my && my <= bt + r) // is it within the outer box of the border?
		{
			if (lf + r < mx && mx < rt - r && tp + r < my && my < bt - r) // is it within the interior box?  switch the signs and change to < instead of <=
			{
				return shape;
			}
			else
			{
				return shape.border;
			}
		}
	}
	
	if (lf < mx && mx < rt && tp < my && my < bt) // interior only i guess
	{
		return shape;
	}
	else
	{
		return null;
	}
}

function ClickArc(shape)
{
	var mx = Get(globals.mx);
	var my = Get(globals.my);
	var cx = Get(shape.cx);
	var cy = Get(shape.cy);
	var radius = Get(shape.radius);
	
	if ((mx - cx) * (mx - cx) + (my - cy) * (my - cy) < radius * radius)
	{
		return shape;
	}
	else
	{
		return null;
	}
}

function ClickContents(shape)
{
	for (var i = shape.contents.length - 1; i >= 0; i--)
	{
		var sub = shape.contents[i];
		
		if (sub.click)
		{
			var target = sub.click(sub);
			
			if (target)
			{
				return target;
			}
		}
	}
}

function ClickSingletonContents(shape)
{
	// to replace with ClickContent
	
	var sub = shape.contents;
	
	if (sub.click)
	{
		var target = sub.click(sub);
			
		if (target)
		{
			return target;
		}
	}
}

function ClickContent(shape)
{
	var sub = shape.content;
	
	if (sub.click)
	{
		var target = sub.click(sub);
			
		if (target)
		{
			return target;
		}
	}
}

function ClickCollection(coll)
{
	var keys = [];
	
	for (var key in coll)
	{
		if (key[0] != '[')
		{
			keys.push(key);
		}	
	}
	
	for (var i = keys.length - 1; i >= 0; i--)
	{
		var key = keys[i];
		var val = Get(coll[key]);
		
		if (val["[type]"] == "Collection")
		{
			var target = ClickCollection(val);
				
			if (target)
			{
				return target;
			}
		}
		else if (val.click)
		{
			var click = Get(val.click);
			
			var target = click(val);
				
			if (target)
			{
				return target;
			}
		}
	}
}


function Copy()
{
	// definitely copy to internal clipboard for pasting within the program
	// for pasting outside the program, we'll need to follow some variant of this procedure:
	// 1. on Ctrl, convert selection to text and fill a hidden textbox (we can have a brace of 12 or something) with the text, and select it
	// 2. then on C, we can fill the internal clipboard with that same text - the browser/OS will hijack the Ctrl+C combo and copy the text in the hidden textbox
	
	// the downside of this is that we have to convert the selection to text on every Ctrl, on the off chance it may be followed by C
	// this is inefficient, possibly fatally if the selection is large
	
	// yet another issue involves the various structures that can be copied, and how to store them and paste them correctly
	// for instance, we could paste into a different structure and do the structural conversion automatically
	
	var text = "foo\tbar";
	window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
}

function Paste(e)
{
	// here the trickiness is in distinguishing interal clipboards from the system clipboard
	// for instance, if we overwrite the system clipboard from an external program and then switch to the app, we'll need to know the system clipboard is the active one
	
	AddText(e.clipboardData);
}

function Cut()
{
	Copy();
	DeleteGeneral();
}

function DeleteGeneral()
{
	// this needs to be able to delete cells in a grid or selected text or anything
}

function Undo()
{
	// two possibilities for implementation here
	// 1. an action also generates code to undo itself if necessary (very difficult)
	// 2. on undo, we re-generate the environment by re-loading the last .json snapshot and then applying the .js changes except for the last one
	
	// the first requires some intelligence to generate appropriate undo code, the second option is inefficient
}

function Redo()
{

}


function MakeArrayData()
{
	var arrays = {};
	
	var array = null;
	
	var hori = 1;
	var vert = 2;
	
	array = {};
	array.left = 1000;
	array.top = 600;
	array.cellWidth = 64;
	array.cellHeight = 20;
	array.dimensions = [ 10 , 5 ];
	array.oris = [ hori , vert ];
	array.gaps = [ 0 , 0 ];
	array.stroke = "rgb(150,150,150)";
	array.fill = null;
	array.cells = new Array(Product(array.dimensions));
	
	arrays['excel'] = array;
	
	array = {};
	array.left = 100;
	array.top = 550;
	array.cellWidth = 10;
	array.cellHeight = 10;
	array.dimensions = [ 5 , 10 , 10 ];
	array.oris = [ hori , hori , vert ];
	array.gaps = [ 20 , 0 , 0 ];
	array.stroke = "rgb(0,0,0)";
	array.fill = null; // ParserMatrixCellColor to be individually assigned later, once the cells are actually created - this involves an abstraction breaking
	array.cells = new Array(Product(array.dimensions));
	
	arrays['matrices'] = array;
	
	return arrays;
}

function ResolveGrammarSubs(grammar, gramTree)
{
	for (var i = 0; i < gramTree.length; i++)
	{
		var tree = gramTree[i];
		var gram = tree.contents;
		gram.subs = [];
		
		for (var k = 0; k < tree.children.length; k++)
		{
			var childTree = tree.children[k];
			gram.subs.push(childTree.contents);
		}
	}
}

function Product(seq)
{
	var n = 1;
	
	for (var i = 0; i < seq.length; i++)
	{
		n *= seq[i];
	}
	
	return n;
}


function Dimension(indents, w) // returns dxs
{
    width = w;

    maxIndent = 0;

    for (var i = 0; i < indents.length; i++)
    {
        if (indents[i] > maxIndent)
        {
            maxIndent = indents[i];
        }
    }

    // nodes x rows x {L,R}
    // dimension includes all pixels in child boxes
    // so if you have one child of width 11, that means that child row dimension will be (-5,5) - the pixel extend of the child box
    dimension = new Array(indents.length);

    for (var i = 0; i < dimension.length; i++)
    {
        dimension[i] = new Array(maxIndent + 2);

        for (var j = 0; j < dimension[i].length; j++)
        {
            dimension[i][j] = new Array(2);
        }
    }

    // nodes x nodes x {BeforeDistributionOfExcess,After}
    // constraints are measured as the number of pixels between midpoints of siblings, exclusive of those midpoints
    // not the number of whitespace pixels between the boxes
    constraints = new Array(indents.length);

    for (var i = 0; i < constraints.length; i++)
    {
        constraints[i] = new Array(indents.length);

        for (var j = 0; j < constraints[i].length; j++)
        {
            constraints[i][j] = new Array(2);
        }
    }

    nodes = new Array(indents.length);

    for (var i = 0; i < indents.length; i++)
    {
        nodes[i] = new Object();
        nodes[i].id = i;
        nodes[i].indent = indents[i];
		nodes[i].children = [];
	}
	
    for (var i = 0; i < indents.length; i++)
    {
        for (var k = i - 1; k >= 0; k--)
        {
            if (nodes[k].indent == nodes[i].indent - 1)
            {
                nodes[k].children.push(nodes[i]);
                nodes[i].parent = nodes[k];
                break;
            }
        }
    }

    CalculateDimension(0);

    var dxs = new Array(nodes.length);

    for (var i = 0; i < nodes.length; i++)
    {
        dxs[i] = nodes[i].dx;
    }
	
	dxs[0] = 0;

    return dxs;
}

function CalculateDimension(k)
{
    if (nodes[k].children.length == 0)
    {
        return;
    }
    else
    {
        for (var i = 0; i < nodes[k].children.length; i++)
        {
            CalculateDimension(nodes[k].children[i].id);
        }

        ConstraintMatrix(k);

        AssignSpacing(k);

        ComposeDimension(k);
    }
}

function AssignSpacing(k)
{
	var BEFORE = 0;
	var AFTER = 1;

    // constraints[x][y][BEFORE] has already been filled in for the relevant child nodes
    // we just need to fill in constraints[x][y][AFTER]

    var children = nodes[k].children;

    // We're keeping this around just so we can use Sum() on it
    var spacing = new Array(children.length - 1);

    // Fill first with the base level adjecent AB BC CD constraints
    for (var i = 0; i < children.length - 1; i++)
    {
        // Since we have to keep spacing around (see declaration of spacing above), we need to do parallel assignment
        spacing[i] = constraints[children[i].id][children[i + 1].id][BEFORE];
        constraints[children[i].id][children[i + 1].id][AFTER] = constraints[children[i].id][children[i + 1].id][BEFORE];
    }

    // Now we loop through the following triangle of non-adjacent constraints:
    // 0   1   2   3
    //  0-1 1-2 2-3
    // non-adjacent constraints begin here:
    //    0-2 1-3
    //      0-3
    for (var i = 0; i < children.length - 2; i++)
    {
        for (var j = 0; j < children.length - 2 - i; j++)
        {
            var a = j;
            var b = j + i + 2;

            var sum = Sum(spacing, a, b);

            var excess = constraints[children[a].id][children[b].id][BEFORE] - sum;

            if (excess > 0)
            {
                var numberOfGapsToDistributeTo = b - a;
				var amountToAddToEachSpacing = 0;
				
				while (excess > 0)
				{
					amountToAddToEachSpacing++;
					excess -= numberOfGapsToDistributeTo;
				}

                //var amountToAddToEachSpacing = excess / numberOfGapsToDistributeTo + (excess % numberOfGapsToDistributeTo == 0 ? 0 : 1);

                for (var l = a; l < b; l++)
                {
                    // The parallel assignment continues (see above for explanation)
                    spacing[l] += amountToAddToEachSpacing;
                    constraints[children[l].id][children[l + 1].id][AFTER] += amountToAddToEachSpacing;
                }
            }
        }
    }

    // now translate the spacings into dx, the difference in x position from the parent

    var total = Sum(spacing, 0, spacing.length);
	
	if (spacing.length > 1)
	{
		total += spacing.length - 1; // to account for the center lines of all nodes except for the first and last
	}
	
    // imagine total as the top row of pixels of the children (with numbered pixels)
    // 0 1 2 3 4 5 6 7 8 9

    // at this point, total can be odd or even, so there might not be an exact center
    // if there is no exact center, pick the pixel to the left

    var center = 0;

    if (total == 0)
    {
        center = 0;
    }
    else if (total % 2 == 1)
    {
        // 0 1 2 3 4
        // total = 5
        // the center we want = 2
        center = total / 2 - 0.5;
    }
    else
    {
        // 0 1 2 3 4 5
        // total = 6
        // the center we want = 2
        center = total / 2 - 1;
    }
	
    for (var i = 0; i < children.length; i++)
    {
        nodes[children[i].id].dx = Sum(spacing, 0, i) + i - 1 - center;
    }

    // This is a horrible hack to prevent a simple off-by-one issue, where the center child in a set of odd children is put at dx=1, but it looks better at dx=0
    if (children.length % 2 == 1)
    {
        if (children[Math.floor(children.length / 2)].dx == 1)
        {
            children[Math.floor(children.length / 2)].dx = 0;
        }
    }
}

function ComposeDimension(k)
{
	var LEFT = 0;
	var RIGHT = 1;

    var last = nodes[k].children.length - 1;

    dimension[k][nodes[k].indent + 1][LEFT] = nodes[k].children[0].dx - width / 2;
    dimension[k][nodes[k].indent + 1][RIGHT] = nodes[k].children[last].dx + width / 2;

    var children = nodes[k].children;

    for (var row = nodes[k].indent + 2; row <= maxIndent; row++)
    {
        var min = 1000000;
        var max = -1000000;

        // left + dx, right + dx

        for (var i = 0; i < children.length; i++)
        {
            var left = dimension[children[i].id][row][LEFT];
            var right = dimension[children[i].id][row][RIGHT];

            if (left)
            {
                min = Math.min(min, left + children[i].dx);
            }

            if (right)
            {
                max = Math.max(max, right + children[i].dx);
            }
        }

        if (min < 1000000)
        {
            dimension[k][row][LEFT] = min;
        }

        if (max > -1000000)
        {
            dimension[k][row][RIGHT] = max;
        }
    }
}

function ConstraintMatrix(k)
{
    // The constraints matrix is indexed by the nodes in a depth-first order, which means left-to-right among siblings
    // We will set the convention that the left node is indexed along the rows of the matrix, and the right node is indexed along the cols

    // Hence if the siblings are 0 1 2 3, the matrix created is this:

    // -- 01 02 03
    // -- -- 12 13
    // -- -- -- 23
    // -- -- -- --
	
	var BEFORE = 0;
	var AFTER = 1;

    var children = nodes[k].children;

    for (var i = 0; i < children.length - 1; i++)
    {
        for (var j = i + 1; j < children.length; j++)
        {
            constraints[children[i].id][children[j].id][BEFORE] = SingleConstraint(children[i].id, children[j].id);
        }
    }
}

function SingleConstraint(leftNode, rightNode)
{
    // the base spacing between two childless boxes
    // this counts the whitespace pixels between the center lines, excluding both center lines themselves
    // so that is the extent of the left box to the right of its center, which is width / 2
    // then the gap between the boxes, which used to be called siblingSpacing, but I'm fixing it to be the same as the width
    // then the extent of the right box to the left of its center, which is again width / 2
	
	var LEFT = 0;
	var RIGHT = 1;
	
	var siblingSpacing = width / 2;
	
    var n = width / 2 + siblingSpacing + width / 2;

    // of course, the dimensions will not extend across the spectrum of rows, but we will examine all rows anyway
    // excluding rows for which one or the other dimension is zero, because that means the dimension tree does not exist in that row
    for (var row = 0; row < dimension[0].length; row++)
    {
        if (dimension[leftNode][row][RIGHT] != null && dimension[rightNode][row][LEFT] != null)
        {
            n = Math.max(n, dimension[leftNode][row][RIGHT] - dimension[rightNode][row][LEFT] + siblingSpacing);
        }
    }

    return n;
}

function Sum(x, a, b)
{
    var sum = 0;

    for (var i = a; i < b; i++)
    {
        sum += x[i];
    }

    return sum;
}


function PositionContents(obj)
{
	for (var i = 0; i < obj.contents.length; i++)
	{
		var sub = obj.contents[i];
		
		if (sub.position)
		{
			sub.position(sub);
		}
	}
}

function DisplayButton(image, handler)
{
	var button = {};
	button.click = ClickBox;
	button.image = image;
	AddRectSlots(button);
	
	button.draw = function(shape)
	{
		var image = Get(shape.image);
		var left = Get(shape.left);
		var top = Get(shape.top);
		var width = Get(shape.width);
		var height = Get(shape.height);
		
		globals.g.drawImage(image, left, top, width, height);
	}
	
	button.onhover = function()
	{
		PushCursor("pointer");
		Push("LD", handler);
	}
	
	button.dehover = function()
	{
		PopCursor();
		Pop("LD");
		
		if (button.modehandler)
		{
			Push("LD", button.modehandler);
		}
	}
	
	return button;
}

function DisplayGram(parent, name, gram)
{
	throw new Error();
	//var shape = DisplayCell(parent, name, gram.value); // DisplayCell must take a pointer - is gram.value a pointer?
	//shape.data = gram;
	//shape.position = PositionGram;
	//return shape;
}

function PositionParserMatrixCell(box)
{
	var value = box.data;
	
	for (var i = 0; i < box.path.length; i++)
	{
		var key = box.path[i];
		value = value[key];
	}
	
	// the above code can be abstracted into this:
	//var n = ExecuteDatapath(box);
	
	//var n = Get(value); // an possibly useful thing
	
	if (value == -1)
	{
		box.fill = "rgb(128,128,128)";
	}
	else if (value == 0)
	{
		box.fill = "rgb(255,255,255)";
	}
	else if (value == 1)
	{
		box.fill = "rgb(255,128,0)";
	}
	else
	{
		throw new Error();
	}
}

function DisplayLexerNode(node)
{
	throw new Error();
	//var ptr = MakePointer(node.parent.code, node.contents);
	//var shape = DisplayCell(ptr);
	//shape.dx = MakeSlot(shape.code, null).contents;
	//shape.dy = MakeSlot(shape.code, null).contents;
	//return shape;
}

function DisplayLexerLabel(label)
{
	throw new Error();
	//var labelShape = MakeArray();
    //
	//var predicateShape = DisplayCell(labelShape.contents, "0", label.predicate);
	//var actionShape = DisplayCell(labelShape.contents, "1", label.action);
	//
	//labelShape.contents[0] = predicateShape;
	//labelShape.contents[1] = actionShape;
	//
	//return labelShape;
}

function DisplayCog(cog)
{
	var left = {};
	AddRectSlots(left);
	left.draw = DrawBox;
	left.fill = null;
	left.stroke = "rgb(0,0,0)";
	
	var right = {};
	AddRectSlots(right);
	right.draw = DrawBox;
	right.fill = null;
	right.stroke = "rgb(0,0,0)";
	
	var shape = {};
	AddRectSlots(shape);
	shape.position = PositionCog;
	shape.click = ClickBox; // since left and right have no 'click' method, ClickBox will ignore them
	shape.draw = DrawBox;
	shape.data = cog;
	shape.left = left;
	shape.right = right;
	shape.contents = [ left , right ];
	
	return shape;
}

function PositionCog(cogShape)
{
	// we assume top, left, width, height already set by external forces
	Set(cogShape.wr, Get(cogShape.width) / 2);
	Set(cogShape.hr, Get(cogShape.height) / 2);
	Set(cogShape.right, Get(cogShape.left) + Get(cogShape.width));
	Set(cogShape.cx, Get(cogShape.left) + Get(cogShape.wr));
	Set(cogShape.bottom, Get(cogShape.top) + Get(cogShape.height));
	Set(cogShape.cy, Get(cogShape.top) + Get(cogShape.hr));
	
	var left = Get(cogShape.left);
	var top = Get(cogShape.top);
	var width = Get(cogShape.width);
	var height = Get(cogShape.height);
	var cx = Get(cogShape.cx);
	var cy = Get(cogShape.cy);
	var bottom = Get(cogShape.bottom);
	var right = Get(cogShape.right);
	var hr = Get(cogShape.hr);
	var wr = Get(cogShape.wr);
	
	Set(cogShape.left.left, left);
	Set(cogShape.left.width, wr);
	Set(cogShape.left.wr, wr / 2);
	Set(cogShape.left.right, cx);
	Set(cogShape.left.cx, left + wr / 2);
	Set(cogShape.left.top, top);
	Set(cogShape.left.height, height);
	Set(cogShape.left.hr, hr);
	Set(cogShape.left.bottom, bottom);
	Set(cogShape.left.cy, cy);
	Set(cogShape.right.left, cx - 1);
	Set(cogShape.right.width, wr);
	Set(cogShape.right.wr, wr / 2);
	Set(cogShape.right.right, right);
	Set(cogShape.right.cx, cx - 1 + wr / 2);
	Set(cogShape.right.top, top);
	Set(cogShape.right.height, height);
	Set(cogShape.right.hr, hr);
	Set(cogShape.right.bottom, bottom);
	Set(cogShape.right.cy, cy);
	
	var cog = cogShape.data.contents;
	
	if (cog.type == Machine.Slot)
	{
		if (cog.state == State.Inactive)
		{
			cogShape.left.fill = "rgb(70,70,70)";
			cogShape.right.fill = "rgb(70,70,70)";
		}
		else if (cog.state == State.Blank)
		{
			cogShape.left.fill = "rgb(245,228,156)";
			cogShape.right.fill = "rgb(245,228,156)";
		}
		else if (cog.state == State.Setting)
		{
			cogShape.left.fill = "rgb(255,194,14)";
			cogShape.right.fill = "rgb(245,228,156)";
		}
		else if (cog.state == State.Nonblank)
		{
			cogShape.left.fill = "rgb(255,194,14)";
			cogShape.right.fill = "rgb(255,194,14)";
		}
		else if (cog.state == State.Blanking)
		{
			cogShape.left.fill = "rgb(245,228,156)";
			cogShape.right.fill = "rgb(255,194,14)";
		}
	}
	else if (cog.type == Machine.Pointer)
	{
		if (cog.state == State.Inactive)
		{
			cogShape.left.fill = "rgb(70,70,70)";
			cogShape.right.fill = "rgb(70,70,70)";
		}
		else if (cog.state == State.Blank)
		{
			cogShape.left.fill = "rgb(168,230,29)";
			cogShape.right.fill = "rgb(168,230,29)";
		}
		else if (cog.state == State.Setting)
		{
			cogShape.left.fill = "rgb(34,177,76)";
			cogShape.right.fill = "rgb(168,230,29)";
		}
		else if (cog.state == State.Nonblank)
		{
			cogShape.left.fill = "rgb(34,177,76)";
			cogShape.right.fill = "rgb(34,177,76)";
		}
		else if (cog.state == State.Blanking)
		{
			cogShape.left.fill = "rgb(168,230,29)";
			cogShape.right.fill = "rgb(34,177,76)";
		}
		else if (cog.state == State.Unbound)
		{
			cogShape.left.fill = "rgb(157,187,97)";
			cogShape.right.fill = "rgb(157,187,97)";
		}
	}
	else if (cog.type == Machine.Exp)
	{
		if (cog.state == State.Inactive)
		{
			cogShape.left.fill = "rgb(70,70,70)";
			cogShape.right.fill = "rgb(70,70,70)";
		}
		else if (cog.state == State.FirstFire)
		{
			cogShape.left.fill = "rgb(255,126,0)";
			cogShape.right.fill = "rgb(255,126,0)";
		}
		else if (cog.state == State.Waiting)
		{
			cogShape.left.fill = "rgb(255,163,177)";
			cogShape.right.fill = "rgb(255,163,177)";
		}
		else if (cog.state == State.Firing)
		{
		
		}
		else if (cog.state == State.Fired)
		{
			cogShape.left.fill = "rgb(237,28,36)";
			cogShape.right.fill = "rgb(237,28,36)";
		}
	}
	else if (cog.type == Machine.Control)
	{
		if (cog.state == State.Inactive)
		{
			cogShape.left.fill = "rgb(70,70,70)";
			cogShape.right.fill = "rgb(70,70,70)";
		}
		else if (cog.state == State.Activating)
		{
			cogShape.left.fill = "rgb(0,183,239)";
			cogShape.right.fill = "rgb(70,70,70)";
		}
		else if (cog.state == State.Active)
		{
			cogShape.left.fill = "rgb(0,183,239)";
			cogShape.right.fill = "rgb(0,183,239)";
		}
		else if (cog.state == State.Deactivating)
		{
			cogShape.left.fill = "rgb(70,70,70)";
			cogShape.right.fill = "rgb(0,183,239)";
		}
	}
	else if (cog.type == Machine.Equals)
	{
		cogShape.left.fill = "rgb(111,49,152)";
		cogShape.right.fill = "rgb(111,49,152)";
	}
}


// drag is a generalized gesture that is used in numerous contexts, including:
//   creation of grid
//   selection of cells
//   selection of an arbitrary group of objects
//   movement of an object
//   scrubbing
//   scrollbars (kind of a special case of scrubbing)

// a general drag function would have to be very low level though - like it just captures mouse moves and sends (dx,dy) to a callback provided by the client

// the functions below assume that we're just dragging an object though

function PrimeDrag()
{
	Push("LD", BeginDrag);
	Push("LU", EndDrag);
}

function BeginDrag()
{
	var beingDragged = globals.hovered;
	
	var fcx = Get(beingDragged.cx);
	var fcy = Get(beingDragged.cy);
	
	var fmx = Get(globals.mx);
	var fmy = Get(globals.my);
	
	// we could set it up such that any handler bound to MM gets passed the current mouse x,y
	// that way we could eliminate the global mx and my
	
	var Drag = function()
	{
		var diffx = Get(globals.mx) - fmx;
		var diffy = Get(globals.my) - fmy;
		
		Set(beingDragged.cx, fcx + diffx);
		Set(beingDragged.cy, fcy + diffy);
	};
	
	Push("MM", Drag);
}

function EndDrag()
{
	Pop("MM");
	Pop("LD");
	Pop("LU");
	
	Event("MM");
}


function DrawBox(shape)
{
	if (shape.invisible)
	{
		return;
	}
	
	var g = globals.g;
	
	var left = Get(shape.left);
	var top = Get(shape.top);
	var width = Get(shape.width);
	var height = Get(shape.height);
	//var cx = Get(shape.cx);
	//var cy = Get(shape.cy);
	var right = Get(shape.right);
	var bottom = Get(shape.bottom);
	//var wr = Get(shape.wr);
	//var hr = Get(shape.hr);
	
	// these visibilty checks must be replaced by viewport stuff
	
	if (left > window.scrollX + window.innerWidth)
	{
		return;
	}
	
	if (right < window.scrollX)
	{
		return;
	}
	
	if (top > window.scrollY + window.innerHeight)
	{
		return;
	}
	
	if (bottom < window.scrollY)
	{
		return;
	}
	
	var fill = Get(shape.fill);
	var stroke = Get(shape.stroke);
	var lineWidth = Get(shape.lineWidth);
	
	if (fill)
	{
		g.fillStyle = fill;
		g.fillRect(left, top, width, height);
	}
	
	if (stroke)
	{
		if (lineWidth) { g.lineWidth = lineWidth; } else { g.lineWidth = 1; }
		
		g.strokeStyle = stroke;
		//g.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1); // this is the orig
		
		g.strokeRect(left - 0.5, top - 0.5, width, height);
	}
	
	if (shape.contents)
	{
		for (var i = 0; i < shape.contents.length; i++)
		{
			if (shape.contents[i].draw)
			{
				shape.contents[i].draw(shape.contents[i]);
			}
		}
	}
	
	//if (shape.scrollbars)
	//{
	//	for (var i = 0; i < shape.scrollbars.length; i++)
	//	{
	//		if (shape.scrollbars[i].draw)
	//		{
	//			shape.scrollbars[i].draw(shape.scrollbars[i]);
	//		}
	//	}
	//}
}

function DrawText(shape)
{
	if (shape.invisible)
	{
		return;
	}
	
	var g = globals.g;
	
	var left = Get(shape.left);
	var bottom = Get(shape.bottom);
	
	var c = Get(shape.c);

	if (shape.bgFill)
	{
		g.fillStyle = shape.bgFill;
		g.fillRect(left, Get(shape.top), Get(shape.width), Get(shape.height));
	}
	
	if (shape.stroke)
	{
		if (lineWidth) { g.lineWidth = lineWidth; } else { g.lineWidth = 1; }
		
		g.strokeStyle = stroke;
		g.strokeRect(left + 0.5, top + 0.5, Get(shape.width) - 1, Get(shape.height) - 1);
	}
	
	g.font = Get(shape.font);
	g.fillStyle = Get(shape.fill);
	g.fillText(c, left, bottom - 4); // the 4 is a temporary fix
}

function DrawImage(shape)
{
	var g = globals.g;

	// this is how you create a new image from a URL
	//var img = new Image();
	//img.src = 'United States Map.png';
	//img.onload = function() { }

	var srclf = Get(shape.src.left);
	var srctp = Get(shape.src.top);
	var srcwd = Get(shape.src.width);
	var srchg = Get(shape.src.height);
	var dstlf = Get(shape.dst.left);
	var dsttp = Get(shape.dst.top);
	var dstwd = Get(shape.dst.width);
	var dsthg = Get(shape.dst.height);

	//g.drawImage(shape.img, dstlf, dsttp);
	//g.drawImage(shape.img, dstlf, dsttp, dstwd, dsthg);
	g.drawImage(shape.img, srclf, srctp, srcwd, srchg, dstlf, dsttp, dstwd, dsthg);
}

function DrawPath(shape)
{
	var g = globals.g;
	
	g.lineWidth = Get(shape.lineWidth);
	g.strokeStyle = Get(shape.stroke);
	
	var x = Get(shape.points[0].x);
	var y = Get(shape.points[0].y);
	
	g.beginPath();
	g.moveTo(x, y);

	for (var i = 1; i < shape.points.length; i++)
	{
		x = Get(shape.points[i].x);
		y = Get(shape.points[i].y);
		g.lineTo(x, y);
	}
	
	g.stroke();
}

function DrawLinepath(shape)
{
	var g = globals.g;
	
	g.lineWidth = Get(shape.lineWidth);
	g.strokeStyle = Get(shape.stroke);
	
	for (var i = 0; i < shape.points.length - 1; i++)
	{
		// think about how this correction works: our mental model puts (0,0) in the center of the top-left pixel
		// but canvas says that (0,0) is the top-left corner of the top-left pixel, which means that the center of the top-left pixel is (0.5,0.5)
		// we say it's (0,0), canvas says it's (0.5,0.5), therefore we add 0.5 to each coordinate to transform from our mental model to canvas's model
		
		// but this doesn't quite work for umbilicals, and i'm not sure why
		
		var x0 = Get(shape.points[i].x) + 0.5;
		var y0 = Get(shape.points[i].y) + 0.5;
		var x1 = Get(shape.points[i + 1].x) + 0.5;
		var y1 = Get(shape.points[i + 1].y) + 0.5;
	
		g.beginPath();
		g.moveTo(x0, y0);
		g.lineTo(x1, y1);
		g.stroke();
	}
}

function DrawPolygon(shape)
{
	var g = globals.g;
	
	g.lineWidth = Get(shape.lineWidth);
	g.strokeStyle = Get(shape.stroke);
	
	var fill = Get(shape.fill);
	
	if (fill)
	{
		g.fillStyle = fill;
	}
	
	var x = Get(shape.points[0].x);
	var y = Get(shape.points[0].y);
	
	g.beginPath();
	g.moveTo(x, y);

	for (var i = 1; i < shape.points.length; i++)
	{
		x = Get(shape.points[i].x);
		y = Get(shape.points[i].y);
		g.lineTo(x, y);
	}
	
	g.closePath();
	g.stroke();
}

function DrawBezier(shape)
{
	var g = globals.g;
	
	g.lineWidth = Get(shape.lineWidth);
	g.strokeStyle = Get(shape.stroke);
	
	var x0 = Get(shape.points[0].x);
	var y0 = Get(shape.points[0].y);
	var x1 = Get(shape.points[1].x);
	var y1 = Get(shape.points[1].y);
	var x2 = Get(shape.points[2].x);
	var y2 = Get(shape.points[2].y);
	var x3 = Get(shape.points[3].x);
	var y3 = Get(shape.points[3].y);
	
	g.beginPath();
	g.moveTo(x0, y0);
	g.bezierCurveTo(x1, y1, x2, y2, x3, y3);
	g.stroke();
}

function DrawArc(shape)
{
	var g = globals.g;
	
	var lineWidth = Get(shape.lineWidth);
	var stroke = Get(shape.stroke);
	var fill = Get(shape.fill);
	
	if (fill)
	{
		g.fillStyle = fill;
	}
	
	if (stroke)
	{
		if (lineWidth) { g.lineWidth = lineWidth; } else { g.lineWidth = 1; }
		g.strokeStyle = stroke;
	}
	
	var cx = Get(shape.cx);
	var cy = Get(shape.cy);
	var radius = Get(shape.radius);
	var startAngle = Get(shape.startAngle);
	var endAngle = Get(shape.endAngle);
	
	g.beginPath();
	g.arc(cx, cy, radius, startAngle, endAngle, true); // the last arg is 'anticlockwise?'
	g.closePath();
	g.fill();
}

function DrawActiveBorder(color, left, top, right, bottom)
{
	globals.g.fillStyle = color;
	globals.g.fillRect(left - 1, top - 1, right - left, 3); // top horizontal
	globals.g.fillRect(left - 1, bottom - 1, right - left - 2, 3); // bottom horizontal
	globals.g.fillRect(left - 1, top - 1, 3, bottom - top); // left vertical
	globals.g.fillRect(right - 1, top - 1, 3, bottom - top - 2); // right vertical
	globals.g.fillRect(right - 2, bottom - 2, 5, 5); // square
}

function DrawPointBorder(color, lf, tp, rt, bt)
{
	globals.g.strokeStyle = color;
	globals.g.fillStyle = color;
	
	globals.g.strokeRect(lf - 1, tp - 1, rt - lf, bt - tp);
	
	globals.g.fillRect(lf - 1, tp - 1, 3, 3);
	globals.g.fillRect(rt - 1, tp - 1, 3, 3);
	globals.g.fillRect(lf - 1, bt - 1, 3, 3);
	globals.g.fillRect(rt - 1, bt - 1, 3, 3);
}

function DrawContents(shape)
{
	for (var i = 0; i < shape.contents.length; i++)
	{
		var content = shape.contents[i];
		
		if (content.draw)
		{
			content.draw(content);
		}
	}
}

function DrawContent(shape)
{
	if (shape.content)
	{
		if (shape.content.draw)
		{
			shape.content.draw(shape.content);
		}
	}
}

//function DrawFrame(frame)
//{
//	for (var key in frame)
//	{
//		if (key[0] != '[') // this is the difference between a Frame and a Collection - a Collection must be an unpolluted namespace - maybe we should get rid of Frames
//		{
//			var val = frame[key];
//			
//			if (val.draw)
//			{
//				val.draw(val);
//			}
//		}
//	}
//}
//
//function DrawCollection(collection)
//{
//	DrawFrame(collection.contents);
//}


function ReadFrce(str)
{
	frcek = 0;
	
	var tree = {};
	tree.root = ReadExp(str);
	return tree;
}

function ReadSpace(str)
{
	var c = str[frcek];
	
	while (c == ' ' || c == '\t' || c == '\r' || c == '\n')
	{
		frcek++;
		c = str[frcek];
	}
}

function ReadExp(str)
{
	var x = null;
	
	var c = str[frcek];
	
	if (c == '(')
	{
		//ReadSpace(str);
		x = ReadParen(str);
	}
	else if (c == '[')
	{
		frcek += 2;
		x = Leaf('[]');
	}
	else if (c == '{')
	{
		frcek += 2;
		x = Leaf('{}');
	}
	//else if (c == '+' || c == '-' || c == '.' || c == '0' || c == '1' || c == '2' || c == '3' || c == '4' || c == '5' || c == '6' || c == '7' || c == '8' || c == '9')
	//{
	//	x = Leaf(ReadNumber(str));
	//}
	else if (c == '\'' || c == '\"')
	{
		x = Leaf(ReadString(str));
	}
	//else if (c == '_' || c == 'a' || c == 'b' || c == 'c' || c == 'd' || c == 'e' || c == 'f' || c == 'g' || c == 'h' || c == 'i' || c == 'j' || c == 'k' || c == 'l' || c == 'm' || c == 'n' || c == 'o' || c == 'p' || c == 'q' || c == 'r' || c == 's' || c == 't' || c == 'u' || c == 'v' || c == 'w' || c == 'x' || c == 'y' || c == 'z' || c == 'A' || c == 'B' || c == 'C' || c == 'D' || c == 'E' || c == 'F' || c == 'G' || c == 'H' || c == 'I' || c == 'J' || c == 'K' || c == 'L' || c == 'M' || c == 'N' || c == 'O' || c == 'P' || c == 'Q' || c == 'R' || c == 'S' || c == 'T' || c == 'U' || c == 'V' || c == 'W' || c == 'X' || c == 'Y' || c == 'Z')
	//{
	//	x = Leaf(ReadName(str));
	//}
	//else
	//{
	//	ReadSpace(str);
	//}
	else if (c == ' ' || c == '\t' || c == '\r' || c == '\n')
	{
		ReadSpace(str);
	}
	else
	{
		x = Leaf(ReadToken(str));
	}
	
	var post = str[frcek];
	
	while (post == '.' || post == '[')
	{
		var sub = x;
		x = {};
		x.children = [];

		if (post == '.')
		{
			x.contents = '.';
			frcek++;
			x.children[0] = sub;
			
			if (c == '0' || c == '1' || c == '2' || c == '3' || c == '4' || c == '5' || c == '6' || c == '7' || c == '8' || c == '9')
			{
				x.children[1] = Leaf(ReadNumber(str));
			}
			else if (c == '\'' || c == '\"')
			{
				x.children[1] = Leaf(ReadString(str));
			}
			else
			{
				x.children[1] = Leaf(ReadName(str));
			}
		}
		else if (post == '[')
		{
			x.contents = '[]';
			frcek++;
			ReadSpace(str);
			x.children[0] = sub;
			x.children[1] = ReadExp(str);
			ReadSpace(str);
			frcek++;
		}
		
		post = str[frcek];
	}
	
	return x;
}

function ReadParen(str)
{
	var x = {};
	x.contents = '()';
	x.children = [];
	
	frcek++;
	
	ReadSpace(str);
	
	var c = str[frcek];
	
	while (c != ')')
	{
		var sub = ReadExp(str);
		x.children.push(sub);
		ReadSpace(str);
		c = str[frcek];
	}
	
	frcek++;
	
	return x;
}

function ReadToken(str)
{
	var s = '';
	
	var c = str[frcek];
	
	// if we get here, always accept the first token (this is critical for accepting number literals beginning with a '.'
	s += c;
	frcek++;
	c = str[frcek];
	
	while (c != '(' && c != ')' && c != '"' && c != "'" && c != ' ' && c != '\t' && c != '\r' && c != '\n' && c != '[' && c != '{' && c != '.')
	{
		s += c;
		frcek++;
		c = str[frcek];
	}
	
	return s;
}

function ReadName(str)
{
	var s = '';
	
	var c = str[frcek];
	
	while (c == '_' || c == 'a' || c == 'b' || c == 'c' || c == 'd' || c == 'e' || c == 'f' || c == 'g' || c == 'h' || c == 'i' || c == 'j' || c == 'k' || c == 'l' || c == 'm' || c == 'n' || c == 'o' || c == 'p' || c == 'q' || c == 'r' || c == 's' || c == 't' || c == 'u' || c == 'v' || c == 'w' || c == 'x' || c == 'y' || c == 'z' || c == 'A' || c == 'B' || c == 'C' || c == 'D' || c == 'E' || c == 'F' || c == 'G' || c == 'H' || c == 'I' || c == 'J' || c == 'K' || c == 'L' || c == 'M' || c == 'N' || c == 'O' || c == 'P' || c == 'Q' || c == 'R' || c == 'S' || c == 'T' || c == 'U' || c == 'V' || c == 'W' || c == 'X' || c == 'Y' || c == 'Z' || c == '0' || c == '1' || c == '2' || c == '3' || c == '4' || c == '5' || c == '6' || c == '7' || c == '8' || c == '9')
	{
		s += c;
		frcek++;
		c = str[frcek];
	}
	
	return s;
}

function ReadString(str)
{
	var s = '';
	
	var quote = str[frcek];
	
	var c = str[frcek];
	
	s += c;
	
	frcek++;
	c = str[frcek];
	
	while (c != quote)
	{
		if (c == '\\')
		{
			frcek++;
			c = str[frcek];
			s += c;
		}
		else
		{
			s += c;
		}
		
		frcek++;
		c = str[frcek];
	}
	
	s += c;
	frcek++;
	
	return s;
}

function ReadNumber(str)
{
	var s = '';
	
	var c = str[frcek];
	
	if (c == '+' || c == '-')
	{
		s += c;
		frcek++;
		c = str[frcek];
	}
	
	while (c == '0' || c == '1' || c == '2' || c == '3' || c == '4' || c == '5' || c == '6' || c == '7' || c == '8' || c == '9')
	{
		s += c;
		frcek++;
		c = str[frcek];
	}
	
	if (c == '.')
	{
		s += c;
		frcek++;
		c = str[frcek];
	}
	
	while (c == '0' || c == '1' || c == '2' || c == '3' || c == '4' || c == '5' || c == '6' || c == '7' || c == '8' || c == '9')
	{
		s += c;
		frcek++;
		c = str[frcek];
	}
	
	// read exponential notation here
	
	return s;
}

function Leaf(str)
{
	var x = {};
	x.contents = str;
	x.children = [];
	return x;
}


// running the browser in incognito mode (Ctrl+Shift+N) can prevent chrome from loading outdated .js files from the cache

function GlobalsDriver()
{
	window.onscroll = function (e) { globals.redraw = true; };
	document.onkeydown = KeyDown; // .getElementById("myCanvas")?
	document.onkeyup = KeyUp; // .getElementById("myCanvas")
	document.getElementById("myCanvas").onmousedown = MouseDown;
	document.getElementById("myCanvas").onmouseup = MouseUp;
	document.getElementById("myCanvas").onmousemove = MouseMove;
	document.getElementById("myCanvas").onmousewheel = MouseWheel;

	globals = {};
	
	globals.canvasElement = document.getElementById("myCanvas");
	globals.g = globals.canvasElement.getContext("2d");
	globals.canvasLeft = 0;
	globals.canvasTop = 0;
	
	globals.id = 0;
	
	//globals.clearedCanvas = true;
	
	globals.calculate = true;
	globals.redraw = true;
	
	globals.tick = Render;
	
	// we put cogs in these queues for processing - also, each cogNode has an inQueue bool, to prevent duplicates
	globals.queue = [];
	globals.newqueue = [];
	globals.blankingMode = false;
	
	globals.logging = true;
	globals.addToLog = false;
	globals.log = [];
	globals.logStart = 0;
	globals.logDisplayLines = 40;
	
	// for undo.redo
	globals.currstream = null;
	globals.stream = [];
	
	globals.canvas = MakeObj(globals, "canvas");
	//globals.canvas["[draw]"] = "children";
	//globals.canvas.data = globals;
	//globals.canvas.position = PositionFrame;
	globals.canvas["[type]"] = "Collection";
	//globals.canvas.draw = DrawFrame;
	//globals.canvas.click = ClickFrame; // ClickRec is also good
	
	//var img1 = new Image(); // HTML5 Constructor
	//img1.src = 'image1.png';
	//img1.alt = 'alt';
	
	// a collection is a free namespace (except for bracketed fields)
	globals.canvas.buttons = MakeObj(globals.canvas, "buttons");
	globals.canvas.buttons["[type]"] = "Collection";
	//globals.canvas.buttons = MakeObj(globals.canvas.buttons, "contents");
	//globals.canvas.buttons.draw = DrawCollection;
	//globals.canvas.buttons.click = ClickCollection;
	
	// Undo , Redo , TogglePlaceGraphMode , 
	var buttons = [ New , Save , Open , ToggleTraceTextboxMode , ToggleTraceGridMode , TogglePlaceRootreeMode , TogglePlaceBoxtreeMode , TogglePlaceIndentreeMode , Swap , InsertRow , DeleteRow , InsertCol , DeleteCol , AddDecimalPlace , RemDecimalPlace , Login , Signup ];
	
	for (var i = 0; i < buttons.length; i++)
	{
		var name = buttons[i].name + "Button";
		var button = MakeObj(globals.canvas.buttons, name);
		globals.canvas.buttons[name] = button;
		AddRectSlots(button);
		
		button.img = document.getElementById(buttons[i].name);
		//button.img = new Image();
		//button.img.src = buttons[i].name + ".png";
		
		button.fn = buttons[i];
		button.version = 0;
		button.onhover = OnHoverButton;
		button.dehover = DeHoverButton;
		button.draw = DrawButton;
		button.click = ClickBox;
		MoveBox(button, "left", "width", 100 + 70 * i);
		MoveBox(button, "top", "height", 20);
		MoveBox(button, "width", "left", button.img.height);
		MoveBox(button, "height", "top", button.img.height);
	}
	
	var button = null;
	//button = globals.canvas.buttons["LoginButton"];
	//MoveBox(button, "left", "width", 10);
	//MoveBox(button, "top", "height", 20);
	//MoveBox(button, "width", "left", button.img.width / 2);
	//MoveBox(button, "height", "top", button.img.height);
	//button = globals.canvas.buttons["SignupButton"];
	//MoveBox(button, "left", "width", 10);
	//MoveBox(button, "top", "height", 60);
	//MoveBox(button, "width", "left", button.img.width / 2);
	//MoveBox(button, "height", "top", button.img.height);
	button = globals.canvas.buttons["AddDecimalPlaceButton"];
	MoveBox(button, "left", "width", 1010);
	MoveBox(button, "top", "height", 20);
	MoveBox(button, "width", "left", button.img.width / 2);
	MoveBox(button, "height", "top", button.img.height);
	button = globals.canvas.buttons["RemDecimalPlaceButton"];
	MoveBox(button, "left", "width", 1010);
	MoveBox(button, "top", "height", 53);
	MoveBox(button, "width", "left", button.img.width / 2);
	MoveBox(button, "height", "top", button.img.height);
	
	// better thought of as 'active' - in that there can be only one at a time
	globals.selected = null; // this is/these are the selected cell(s)
	globals.focussed = null; // this is the container of the selected cell(s)
	
	globals.hovered = null;
	globals.beingEdited = null;
	
	// this needs to respond to changes to globals.actions
	//var handlerGrid = {};
	//handlerGrid.obj = globals.actions;
	//handlerGrid.objs = [ "MM" ];
	//handlerGrid.fields = [ 0 , 1 , 2 , 3 , 4 ];
	//handlerGrid.cols = handlerGrid.objs;
	//handlerGrid.rows = handlerGrid.fields;
	//var handlerGridShape = DisplayGrid(handlerGrid);
	//MoveBox(handlerGridShape, "top", "height", 50);
	//MoveBox(handlerGridShape, "left", "width", 1200);
	//globals.canvas.contents.push(handlerGridShape);
	
	globals.reader = new FileReader();
	globals.shift = false;
	globals.ctrl = false;
	globals.alt = false;
	globals.capsLockOn = false;
	
	globals.traceTextboxMode = false;
	globals.traceGridMode = false;
	globals.placeBoxtreeMode = false;
	globals.placeRootreeMode = false;
	globals.placeGraphMode = false;
	
	globals.objcounts = {};
	globals.objcounts.textbox = 1;
	globals.objcounts.grid = 1;
	globals.objcounts.tree = 1;
	globals.objcounts.edge = 1;
	
	globals.mx = MakeSlot(globals, "mx", 0);
	globals.my = MakeSlot(globals, "my", 0);
	globals.delta = 0;
	
	globals.charge = 10;
	globals.optimalSpringLength = 50;
	globals.springStiffness = 10;

	globals.cursor = 0;
	globals.cursorOn = false;

	globals.actions = {};
	globals.keyValueToCode = [];
	globals.codeToCharMap = {};
	
	MakeBuiltins();
	
	globals.inverses = {};
	globals.inverses["="] = "=";
	globals.inverses["=+"] = "=-";
	globals.inverses["=-"] = "=+";
	globals.inverses["=*"] = "=/";
	globals.inverses["=/"] = "=*";
	
	globals.actions["Ctrl+B"] = [ PlaceTextbox ];
	globals.actions["Ctrl+G"] = [ ToggleTraceGridMode ];
	globals.actions["Ctrl+R"] = [ PlaceRootree ];
	globals.actions["Ctrl+T"] = [ PlaceBoxtree ];
	globals.actions["Ctrl+A"] = [ Save ];
	globals.actions["Ctrl+C"] = [ Copy ];
	//globals.actions["Ctrl+V"] = [ Paste ];
	globals.canvasElement.onpaste = Paste;
	globals.actions["Ctrl+X"] = [ Cut ];
	globals.actions["Ctrl+Z"] = [ Undo ];
	globals.actions["Ctrl+Y"] = [ Redo ];
	globals.actions["Ctrl+Enter"] = [ Execute ];
	
	globals.actions["TK"] = [ ];
	globals.actions["MM"] = [ CheckHover ];
	globals.actions["MW"] = [ ];
	globals.actions["LD"] = [ ];
	globals.actions["LU"] = [ ];
	globals.actions["RD"] = [ ];
	globals.actions["RU"] = [ ];
	globals.actions["Backspace"] = [ ];
	globals.actions["Tab"] = [ ];
	globals.actions["Enter"] = [ ];
	globals.actions["Shift"] = [ ShiftOn ];
	globals.actions["Ctrl"] = [ CtrlOn ];
	globals.actions["Alt"] = [ AltOn ];
	globals.actions["-Shift"] = [ ShiftOff ];
	globals.actions["-Ctrl"] = [ CtrlOff ];
	globals.actions["-Alt"] = [ AltOff ];
	globals.actions["CapsLock"] = [ ];
	globals.actions["Esc"] = [ ];
	globals.actions["Space"] = [ ];
	globals.actions["PageUp"] = [ ];
	globals.actions["PageDown"] = [ ];
	globals.actions["End"] = [ ];
	globals.actions["Home"] = [ ];
	globals.actions["Left"] = [ ];
	globals.actions["Up"] = [ ];
	globals.actions["Right"] = [ ];
	globals.actions["Down"] = [ ];
	globals.actions["Insert"] = [ ];
	globals.actions["Delete"] = [ ];
	
	// Semicolon
	// Colon
	// Equals
	// Plus
	// Minus
	// Underscore
	// Comma
	// Period
	// Slash
	// Backslash
	// Question
	// Pipe
	// Tilde
	// Backquote
	// SingleQuote
	// DoubleQuote
	// LBracket
	// RBracket
	// LBrace
	// RBrace
	// LAngle
	// RAngle
	
	globals.keyValueToCode[8] = "Backspace";
	globals.keyValueToCode[9] = "Tab";
	globals.keyValueToCode[13] = "Enter";
	globals.keyValueToCode[16] = "Shift";
	globals.keyValueToCode[17] = "Ctrl";
	globals.keyValueToCode[18] = "Alt";
	globals.keyValueToCode[20] = "CapsLock";
	globals.keyValueToCode[27] = "Esc";
	globals.keyValueToCode[32] = "Space";
	globals.keyValueToCode[33] = "PageUp";
	globals.keyValueToCode[34] = "PageDown";
	globals.keyValueToCode[35] = "End";
	globals.keyValueToCode[36] = "Home";
	globals.keyValueToCode[37] = "Left";
	globals.keyValueToCode[38] = "Up";
	globals.keyValueToCode[39] = "Right";
	globals.keyValueToCode[40] = "Down";
	globals.keyValueToCode[45] = "Insert";
	globals.keyValueToCode[46] = "Delete";
	globals.keyValueToCode[186] = ";:";
	globals.keyValueToCode[187] = "=+";
	globals.keyValueToCode[188] = ",<";
	globals.keyValueToCode[189] = "-_";
	globals.keyValueToCode[190] = ".>";
	globals.keyValueToCode[191] = "/?";
	globals.keyValueToCode[192] = "`~";
	globals.keyValueToCode[219] = "[{";
	globals.keyValueToCode[220] = "\\|";
	globals.keyValueToCode[221] = "]}";
	globals.keyValueToCode[222] = "'\"";
	//globals.keyValueToCode[112] = "F1";
	globals.keyValueToCode[113] = "F2";
	//globals.keyValueToCode[114] = "F3";
	//globals.keyValueToCode[115] = "F4";
	//globals.keyValueToCode[116] = "F5";
	//globals.keyValueToCode[117] = "F6";
	//globals.keyValueToCode[118] = "F7";
	//globals.keyValueToCode[119] = "F8";
	globals.keyValueToCode[120] = "F9";
	//globals.keyValueToCode[121] = "F10";
	//globals.keyValueToCode[122] = "F11";
	//globals.keyValueToCode[123] = "F12";
	globals.keyValueToCode[48] = "0";
	globals.keyValueToCode[49] = "1";
	globals.keyValueToCode[50] = "2";
	globals.keyValueToCode[51] = "3";
	globals.keyValueToCode[52] = "4";
	globals.keyValueToCode[53] = "5";
	globals.keyValueToCode[54] = "6";
	globals.keyValueToCode[55] = "7";
	globals.keyValueToCode[56] = "8";
	globals.keyValueToCode[57] = "9";
	globals.keyValueToCode[65] = "A";
	globals.keyValueToCode[66] = "B";
	globals.keyValueToCode[67] = "C";
	globals.keyValueToCode[68] = "D";
	globals.keyValueToCode[69] = "E";
	globals.keyValueToCode[70] = "F";
	globals.keyValueToCode[71] = "G";
	globals.keyValueToCode[72] = "H";
	globals.keyValueToCode[73] = "I";
	globals.keyValueToCode[74] = "J";
	globals.keyValueToCode[75] = "K";
	globals.keyValueToCode[76] = "L";
	globals.keyValueToCode[77] = "M";
	globals.keyValueToCode[78] = "N";
	globals.keyValueToCode[79] = "O";
	globals.keyValueToCode[80] = "P";
	globals.keyValueToCode[81] = "Q";
	globals.keyValueToCode[82] = "R";
	globals.keyValueToCode[83] = "S";
	globals.keyValueToCode[84] = "T";
	globals.keyValueToCode[85] = "U";
	globals.keyValueToCode[86] = "V";
	globals.keyValueToCode[87] = "W";
	globals.keyValueToCode[88] = "X";
	globals.keyValueToCode[89] = "Y";
	globals.keyValueToCode[90] = "Z";
	
	globals.codeToCharMap["A"] = "a";
	globals.codeToCharMap["B"] = "b";
	globals.codeToCharMap["C"] = "c";
	globals.codeToCharMap["D"] = "d";
	globals.codeToCharMap["E"] = "e";
	globals.codeToCharMap["F"] = "f";
	globals.codeToCharMap["G"] = "g";
	globals.codeToCharMap["H"] = "h";
	globals.codeToCharMap["I"] = "i";
	globals.codeToCharMap["J"] = "j";
	globals.codeToCharMap["K"] = "k";
	globals.codeToCharMap["L"] = "l";
	globals.codeToCharMap["M"] = "m";
	globals.codeToCharMap["N"] = "n";
	globals.codeToCharMap["O"] = "o";
	globals.codeToCharMap["P"] = "p";
	globals.codeToCharMap["Q"] = "q";
	globals.codeToCharMap["R"] = "r";
	globals.codeToCharMap["S"] = "s";
	globals.codeToCharMap["T"] = "t";
	globals.codeToCharMap["U"] = "u";
	globals.codeToCharMap["V"] = "v";
	globals.codeToCharMap["W"] = "w";
	globals.codeToCharMap["X"] = "x";
	globals.codeToCharMap["Y"] = "y";
	globals.codeToCharMap["Z"] = "z";
	globals.codeToCharMap["Shift+A"] = "A";
	globals.codeToCharMap["Shift+B"] = "B";
	globals.codeToCharMap["Shift+C"] = "C";
	globals.codeToCharMap["Shift+D"] = "D";
	globals.codeToCharMap["Shift+E"] = "E";
	globals.codeToCharMap["Shift+F"] = "F";
	globals.codeToCharMap["Shift+G"] = "G";
	globals.codeToCharMap["Shift+H"] = "H";
	globals.codeToCharMap["Shift+I"] = "I";
	globals.codeToCharMap["Shift+J"] = "J";
	globals.codeToCharMap["Shift+K"] = "K";
	globals.codeToCharMap["Shift+L"] = "L";
	globals.codeToCharMap["Shift+M"] = "M";
	globals.codeToCharMap["Shift+N"] = "N";
	globals.codeToCharMap["Shift+O"] = "O";
	globals.codeToCharMap["Shift+P"] = "P";
	globals.codeToCharMap["Shift+Q"] = "Q";
	globals.codeToCharMap["Shift+R"] = "R";
	globals.codeToCharMap["Shift+S"] = "S";
	globals.codeToCharMap["Shift+T"] = "T";
	globals.codeToCharMap["Shift+U"] = "U";
	globals.codeToCharMap["Shift+V"] = "V";
	globals.codeToCharMap["Shift+W"] = "W";
	globals.codeToCharMap["Shift+X"] = "X";
	globals.codeToCharMap["Shift+Y"] = "Y";
	globals.codeToCharMap["Shift+Z"] = "Z";
	globals.codeToCharMap["0"] = "0";
	globals.codeToCharMap["1"] = "1";
	globals.codeToCharMap["2"] = "2";
	globals.codeToCharMap["3"] = "3";
	globals.codeToCharMap["4"] = "4";
	globals.codeToCharMap["5"] = "5";
	globals.codeToCharMap["6"] = "6";
	globals.codeToCharMap["7"] = "7";
	globals.codeToCharMap["8"] = "8";
	globals.codeToCharMap["9"] = "9";
	globals.codeToCharMap["Shift+0"] = ")";
	globals.codeToCharMap["Shift+1"] = "!";
	globals.codeToCharMap["Shift+2"] = "@";
	globals.codeToCharMap["Shift+3"] = "#";
	globals.codeToCharMap["Shift+4"] = "$";
	globals.codeToCharMap["Shift+5"] = "%";
	globals.codeToCharMap["Shift+6"] = "^";
	globals.codeToCharMap["Shift+7"] = "&";
	globals.codeToCharMap["Shift+8"] = "*";
	globals.codeToCharMap["Shift+9"] = "(";
	globals.codeToCharMap[";:"] = ";";
	globals.codeToCharMap["=+"] = "=";
	globals.codeToCharMap[",<"] = ",";
	globals.codeToCharMap["-_"] = "-";
	globals.codeToCharMap[".>"] = ".";
	globals.codeToCharMap["/?"] = "/";
	globals.codeToCharMap["`~"] = "`";
	globals.codeToCharMap["[{"] = "[";
	globals.codeToCharMap["\\|"] = "\\";
	globals.codeToCharMap["]}"] = "]";
	globals.codeToCharMap["'\""] = "'";
	globals.codeToCharMap["Shift+;:"] = ":";
	globals.codeToCharMap["Shift+=+"] = "+";
	globals.codeToCharMap["Shift+,<"] = "<";
	globals.codeToCharMap["Shift+-_"] = "_";
	globals.codeToCharMap["Shift+.>"] = ">";
	globals.codeToCharMap["Shift+/?"] = "?";
	globals.codeToCharMap["Shift+`~"] = "~";
	globals.codeToCharMap["Shift+[{"] = "{";
	globals.codeToCharMap["Shift+\\|"] = "|";
	globals.codeToCharMap["Shift+]}"] = "}";
	globals.codeToCharMap["Shift+'\""] = "\"";
	globals.codeToCharMap["Space"] = " ";
	globals.codeToCharMap["Enter"] = "\n";
	globals.codeToCharMap["Tab"] = "\t";
	
	setInterval(Render, 40);
	
	//Load(globals, "DrawnSquare - Orig.json");
	//Load(globals, "BigFunctionBox - fn pasted in.json");
	//AnalysisDriver();
	//StartWithBox();
	
	// for formula testing
	//globals.a = MakeSlot(globals, "a", 2);
	//globals.b = MakeSlot(globals, "b", 3);
	//globals.c = MakeSlot(globals, "c", null);
	//globals.eq = MakeEquals(globals, "eq", "=+", [ globals.c , globals.b , globals.a ]);
	//globals.eq.state = State.Blank;
	//globals.queue.push(globals.eq.node);
	
	//globals.c["[obj]"] = MakeObj(globals.c, "[obj]");
	//globals.c["[obj]"].a = MakeSlot(globals.c["[obj]"], "a", 4);
	//globals.a.state = State.Nonblank;
	//globals.b.state = State.Nonblank;
	//globals.c.state = State.Nonblank;
	//globals.c["[obj]"].a.state = State.Nonblank;
}

function StartWithBox()
{
	globals.canvas.chart = MakeObj(globals.canvas, "chart");
	var chart = globals.canvas.chart;
	chart["[type]"] = "Collection";
	
	chart.boxes = MakeSlot(chart, "boxes", null);
	var boxes = MakeObj(chart.boxes, "[obj]");
	chart.boxes["[obj]"] = boxes;
	boxes["[type]"] = "Collection";
	
	chart.data = MakeSlot(chart, "data", null);
	var data = MakeObj(chart.data, "[obj]");
	chart.data["[obj]"] = data;
	
	for (var i = 0; i < 10; i++)
	{
		var slot = MakeSlot(data, i.toString(), null);
		data[i] = slot;
		var obj = MakeObj(slot, "[obj]");
		slot["[obj]"] = obj
		obj.value = MakeSlot(obj, "value", Math.random() * 20000);
	}
	
	for (var i = 0; i < 10; i++)
	{
		var slot = MakeSlot(boxes, i.toString(), null);
		boxes[i] = slot;
		var box = MakeObj(slot, "[obj]");
		slot["[obj]"] = box;
		AddRectSlots(box);
		box.draw = MakeSlot(box, "draw", DrawBox);
		box.click = MakeSlot(box, "click", ClickBox);
		box.stroke = MakeSlot(box, "stroke", "rgb(0,0,0)");
		box.fill = MakeSlot(box, "fill", "rgb(255,0,0)");
		
		MoveBox(box, "width", "cx", 30);
		MoveBox(box, "height", "cy", 60);
		MoveBox(box, "left", "width", 300 + i * 40);
		MoveBox(box, "bottom", "height", 600);
		
		box.vLocked["[obj]"] = "bottom";
	}
	
	chart.grid = MakeObj(chart, "grid");
	var grid = chart.grid;
	DisplayGrid(grid);
	grid.obj = chart.boxes;
	grid.rowsAre = "objs";
	MoveBox(grid, "left", "width", 100);
	MoveBox(grid, "top", "height", 150);
	RedisplayGrid(grid);
	
	chart.dataGrid = MakeObj(chart, "dataGrid");
	var dataGrid = chart.dataGrid;
	DisplayGrid(dataGrid);
	dataGrid.obj = chart.data;
	dataGrid.rowsAre = "objs";
	MoveBox(dataGrid, "left", "width", 900);
	MoveBox(dataGrid, "top", "height", 400);
	RedisplayGrid(dataGrid);
	
	for (var i = 0; i < dataGrid.cells.length; i++)
	{
		var cell = dataGrid.cells[i];
		cell.redisplay(cell);
		cell.position(cell);
	}
	
	for (var i = 0; i < 10; i++)
	{
		var s = "=(/ data." + i.toString() + ".value 100)";
		grid.cells[56 + i].formula = s;
		CompileCode(grid.cells[56 + i], s);
	}
	
	Calculate();
	
	for (var i = 0; i < grid.cells.length; i++)
	{
		var cell = grid.cells[i];
		cell.redisplay(cell);
		cell.position(cell);
	}
	
	grid.position(grid);
	dataGrid.position(dataGrid);
}

function Execute()
{
	var cell = globals.beingEdited;
	
	if (cell)
	{
		var functor = Get(cell.slot);
		
		if (functor)
		{
			functor.f();
		}
	}
}

function ReadUserDefinedFunction(parent, str)
{
	var brace0 = 0;
	var brace1 = 0;
	
	for (var i = 0; i < str.length; i++)
	{
		if (str[i] == "{")
		{
			brace0 = i;
			break;
		}
	}
	
	for (var i = str.length - 1; i >= 0; i--)
	{
		if (str[i] == "}")
		{
			brace1 = i;
			break;
		}
	}
	
	var signature = str.substring(0, brace0);
	var body = str.substring(brace0 + 1, brace1);
	
	var paren0 = 0;
	var paren1 = 0;
	
	for (var i = 0; i < signature.length; i++)
	{
		if (signature[i] == "(")
		{
			paren0 = i;
			break;
		}
	}
	
	for (var i = signature.length - 1; i >= 0; i--)
	{
		if (signature[i] == ")")
		{
			paren1 = i;
			break;
		}
	}
	
	var name = "";
	
	for (var i = paren0 - 1; i >= 0; i--)
	{
		var c = signature[i];
		var n = signature.charCodeAt(i);
		
		if (65 <= n && n <= 90 || 97 <= n && n <= 122 || n == 36 || n == 95) // $ = 36, _ = 95
		{
			name = c + name;
		}
		else
		{
			if (name.length > 0)
			{
				break;
			}
		}
	}
	
	var arglist = signature.substring(paren0 + 1, paren1);

	var argnames = [];
	var arg = "";
	
	for (var i = 0; i < arglist.length; i++)
	{
		var c = arglist[i];
		var n = arglist.charCodeAt(i);
		
		if (65 <= n && n <= 90 || 97 <= n && n <= 122 || n == 36 || n == 95) // $ = 36, _ = 95
		{
			arg += c;
		}
		else
		{
			if (arg.length > 0)
			{
				argnames.push(arg);
				arg = "";
			}
		}
	}
	
	if (arg.length > 0)
	{
		argnames.push(arg);
	}
	
	var functor = MakeObj(parent, name);
	functor.body = body; // for serialization
	functor.args = MakeList(functor, "args");
	functor.f = Function(body);
	
	for (var i = 0; i < argnames.length; i++)
	{
		functor.args.push(argnames[i]);
	}
	
	return functor;
}

function MakeObj(parent, name)
{
	var obj = {};
	AddBracketFields(obj, parent, name);
	return obj;
}

function MakeList(parent, name)
{
	var obj = []; // we need a special MakeList function because []'s have the .length field, which our code needs
	AddBracketFields(obj, parent, name)
	return obj;
}

function AddBracketFields(obj, parent, name)
{
	//if (globals.id == 5674)
	//{
	//	throw new Error();
	//}
	
	obj["[id]"] = globals.id++;
	obj["[parent]"] = parent;
	obj["[name]"] = name;
	//obj["[reposition]"] = true;
	//obj["[ob]"] = false; // out-of-bounds flag - tells whether the object is visible/invisible solely based on its position within its viewport
	//obj["[visible]"] = false; // this is for user-controlled visibility
	//obj["[draw]"] = "no"; // possible values are "no" and "draw"
}

function MakeGen()
{

}

function MakeNaturalGen()
{

}

function Render()
{
	// draw log
	//globals.g.clearRect(1280, 0, 200, 100);
	//globals.g.fillStyle = "rgb(0,0,0)";
	//globals.logy = 15;
	//globals.logStart = globals.log.length - globals.logDisplayLines;
	//if (globals.logStart < 0) globals.logStart = 0;
	//
	//for (var i = globals.logStart; i < globals.log.length; i++)
	//{
	//	globals.g.fillText(globals.log[i], 1300, globals.logy);
	//	globals.logy += 15;
	//}

	// draw mouse position
	//globals.g.clearRect(1280, 0, 200, 100);
	//globals.g.fillText(Get(globals.mx).toString() + "," + Get(globals.my).toString(), 1300, 50);
	
	if (globals.calculate)
	{
		globals.queue = globals.newqueue;
		globals.newqueue = [];
		Calculate();
		globals.calculate = false;
		globals.redraw = true; // automatically redraw after a calculation?
	}
	
	// need a way to redraw the cursor only - or only animated sections - just clear a small animated rect and redraw the animated stuff every time
	if (globals.redraw)
	{
		globals.g.clearRect(0, 0, globals.canvasElement.width, globals.canvasElement.height);
		
		DrawCollection(globals.canvas);
		
		// draw globals.beingEdited - allow for text overflow
		if (globals.beingEdited)
		{
			var cell = globals.beingEdited;
			
			var width = globals.g.measureText(cell.string).width + 15;
			
			if (width > Get(cell.width))
			{
				MoveBox(cell, "width", "left", width);
			}
			
			globals.g.clearRect(Get(cell.left), Get(cell.top), Get(cell.width), Get(cell.height));
			cell.position(cell);
			cell.draw(cell); // cursor?
		}

		globals.redraw = false;
	}
	
	// draw actionstack
	globals.g.clearRect(1150, 0, 600, 100);
	globals.g.font = "10pt Courier New";
	globals.g.fillStyle = "rgb(0,0,0)";

	for (var i = 0; i < globals.actions["LD"].length; i++)
	{
		globals.g.fillText(globals.actions["LD"][i].name, 1200, 50 + 15 * i);
	}
	
	for (var i = 0; i < globals.actions["MM"].length; i++)
	{
		globals.g.fillText(globals.actions["MM"][i].name, 1400, 50 + 15 * i);
	}
	
	//RenderRec(globals.canvas);
}

function DrawCollection(coll)
{
	for (var key in coll)
	{
		if (key[0] != '[')
		{
			var val = Get(coll[key]); // remember, if slots are part of a collection, they get passed through by this Get
			
			if (val)
			{
				if (val["[type]"] == "Collection")
				{
					DrawCollection(val);
				}
				else if (val.draw)
				{
					var draw = Get(val.draw);
					
					if (draw)
					{
						draw(val);
					}
				}
			}
		}
	}
}

function RenderRec(obj)
{
	var draw = obj["[draw]"];
	
	// let's say we have frames within a canvas - each frame holds a transformation, and is a drawable object in its own right
	// music, asteroids, etc. would be frames
	// every object that wants to be drawn will have a reference to the frame it belongs to
	
	// but if we want an object to appear in multiple frames - then we either have to have th object draw itself in each frame
	
	// basically, for each frame, an object must determine if it or any of its children are visible - the [ob] property
	// now we thought we might have [ob] as an object field - but this doesn't work because [ob] is *relative to a frame*
	// so there is one (theoretic) [ob] variable per object-frame pair - possibly too much to store in variables
	// but on the other hand, we don't want to recalculate [ob] variables unless we scroll a frame or something
	// on the other other hand, perhaps the [redraw] variable can handle everything, including [ob] situations
	
	if (draw == "no")
	{
		return; // short circuit
	}
	
	if (draw == "draw")
	{
		if (obj["[reposition]"])
		{
			if (obj.position)
			{
				obj.position(obj);
			}
			
			obj["[reposition]"] = false;
		}
		
		obj.draw(obj); // with this thin line in RenderRec, we push all responsibilities - like clearing canvas, determining whether to draw, to the object
		obj["[draw]"] = "no"; // so [draw] is a transient variable - [visible] is what we use to toggle more long-term stuff
		return; // we assume that the draw() function of the obj will handle drawing children as necessary
	}
	
	// so the default behavior here seems to be a passthrough
	
	for (var key in obj)
	{
		var val = obj[key];
		var type = typeof(val);
		
		if (type == "object")
		{
			if (val == null)
			{
			
			}
			else
			{
				var parent = val["[parent]"];
				
				if (parent == obj)
				{
					RenderRec(val);
				}
			}
		}
	}
}

function Invalidate(obj)
{
	var draw = obj["[draw]"];
	
	if (draw)
	{
		obj["[draw]"] = "draw";
	}
	else
	{
		var parent = obj["[parent]"];
		
		if (parent)
		{
			Invalidate(parent);
		}
	}
}

function OldGet(obj)
{
	if (!obj)
	{
		return obj;
	}
	
	var type = typeof(obj);
	
	if (type == "object")
	{
		// we changed the name of the underlying from "0" to "[obj]" because "0" would pass down into arrays, which is not what we want
		// bascially we have to avoid name conflicts with all potential underlying objects, which means a bracketed value
		return Get(obj["[obj]"]);
	}
	else // (type == "number" || type == "string" || type == "boolean")
	{
		return obj;
	}
}

function Get(obj)
{
	if (obj)
	{
		if (obj.type == Machine.Slot || obj.type == Machine.Pointer)
		{
			return Get(obj["[obj]"]);
		}
	}
	
	return obj;
}

function GetOneLevelDown(obj)
{
	return Get(obj["[obj]"]);
}

function Set(obj, value)
{
	obj["[obj]"] = value;
	
	if (obj.react)
	{
		obj.react();
	}
	
	obj.state = State.Blanking;
	
	if (!obj.node.inQueue)
	{
		globals.newqueue.push(obj.node);
		obj.node.inQueue = true;
		AddNeighborsToQueue(obj.node, globals.newqueue);
	}
	
	globals.calculate = true;
}

function ChangeName()
{
	var newname = this["[obj]"];
	var slotname = this["[name]"];
	var grid = null;
	
	if (slotname == "nameslot") // so this slot holds the name of the top-level obj
	{
		grid = this["[parent]"];
		var dataSlot = grid.obj;
		var dataSlotParent = dataSlot["[parent]"];
		var dataSlotName = dataSlot["[name]"];
		delete dataSlotParent[dataSlotName];
		dataSlotParent[newname] = dataSlot;
		dataSlot["[name]"] = newname;
	}
	else
	{
		var nameslotList = this["[parent]"];
		grid = nameslotList["[parent]"];
		var data = Get(grid.obj);
		var nameslotListName = nameslotList["[name]"];
		
		if (nameslotListName == "objnameslots")
		{
			var oldobjname = grid.objs[slotname];
			var slotindex = parseInt(slotname);
			grid.objs[slotindex] = newname;
			
			var slot = data[oldobjname];
			delete data[oldobjname];
			data[newname] = slot;
			slot["[name]"] = newname;
		}
		else if (nameslotListName == "fienameslots")
		{
			var oldfiename = grid.fields[slotname];
			var slotindex = parseInt(slotname);
			grid.fields[slotindex] = newname;
			
			for (var i = 0; i < grid.objs.length; i++)
			{
				var obj = Get(data[grid.objs[i]]);
				
				var field = obj[oldfiename];
				delete obj[oldfiename];
				obj[newname] = field;
				field["[name]"] = newname;
			}
		}
		else
		{
			throw new Error();
		}
	}
}

function MoveBox(rect, field, fixedField, newval)
{
	Set(rect.reactive, false);
	
	Set(rect[field], newval);
	
	if (field == "width")
	{
		Set(rect.wr, newval / 2);
		
		if (fixedField == "left")
		{
			Set(rect.cx, Get(rect.left) + Get(rect.wr));
			Set(rect.right, Get(rect.left) + Get(rect.width));
		}
		else if (fixedField == "cx")
		{
			Set(rect.left, Get(rect.cx) - Get(rect.wr));
			Set(rect.right, Get(rect.cx) + Get(rect.wr));
		}
		else if (fixedField == "right")
		{
			Set(rect.left, Get(rect.right) - Get(rect.width));
			Set(rect.cx, Get(rect.right) - Get(rect.wr));
		}
	}
	else if (field == "height")
	{
		Set(rect.hr, newval / 2);
		
		if (fixedField == "top")
		{
			Set(rect.cy, Get(rect.top) + Get(rect.hr));
			Set(rect.bottom, Get(rect.top) + Get(rect.height));
		}
		else if (fixedField == "cy")
		{
			Set(rect.top, Get(rect.cy) - Get(rect.hr));
			Set(rect.bottom, Get(rect.cy) + Get(rect.hr));
		}
		else if (fixedField == "bottom")
		{
			Set(rect.top, Get(rect.bottom) - Get(rect.height));
			Set(rect.cy, Get(rect.bottom) - Get(rect.hr));
		}
	}
	else if (field == "wr")
	{
		Set(rect.width, newval * 2);
		
		if (fixedField == "left")
		{
			Set(rect.cx, Get(rect.left) + Get(rect.wr));
			Set(rect.right, Get(rect.left) + Get(rect.width));
		}
		else if (fixedField == "cx")
		{
			Set(rect.left, Get(rect.cx) - Get(rect.wr));
			Set(rect.right, Get(rect.cx) + Get(rect.wr));
		}
		else if (fixedField == "right")
		{
			Set(rect.left, Get(rect.right) - Get(rect.width));
			Set(rect.cx, Get(rect.right) - Get(rect.wr));
		}
	}
	else if (field == "hr")
	{
		Set(rect.height, newval * 2);
		
		if (fixedField == "top")
		{
			Set(rect.cy, Get(rect.top) + Get(rect.hr));
			Set(rect.bottom, Get(rect.top) + Get(rect.height));
		}
		else if (fixedField == "cy")
		{
			Set(rect.top, Get(rect.cy) - Get(rect.hr));
			Set(rect.bottom, Get(rect.cy) + Get(rect.hr));
		}
		else if (fixedField == "bottom")
		{
			Set(rect.top, Get(rect.bottom) - Get(rect.height));
			Set(rect.cy, Get(rect.bottom) - Get(rect.hr));
		}
	}
	else if (field == "left")
	{
		if (fixedField == "cx")
		{
			Set(rect.wr, Get(rect.cx) - Get(rect.left));
			Set(rect.width, Get(rect.wr) * 2);
			Set(rect.right, Get(rect.left) + Get(rect.width));
		}
		else if (fixedField == "right")
		{
			Set(rect.width, Get(rect.right) - Get(rect.left));
			Set(rect.wr, Get(rect.width) / 2);
			Set(rect.cx, Get(rect.left) + Get(rect.wr));
		}
		else if (fixedField == "width")
		{
			Set(rect.cx, Get(rect.left) + Get(rect.wr));
			Set(rect.right, Get(rect.left) + Get(rect.width));
		}
	}
	else if (field == "cx")
	{
		if (fixedField == "left")
		{
			Set(rect.wr, Get(rect.cx) - Get(rect.left));
			Set(rect.width, Get(rect.wr) * 2);
			Set(rect.right, Get(rect.left) + Get(rect.width));
		}
		else if (fixedField == "right")
		{
			Set(rect.wr, Get(rect.right) - Get(rect.cx));
			Set(rect.width, Get(rect.wr) * 2);
			Set(rect.left, Get(rect.right) - Get(rect.width));
		}
		else if (fixedField == "width")
		{
			Set(rect.left, Get(rect.cx) - Get(rect.wr));
			Set(rect.right, Get(rect.cx) + Get(rect.wr));
		}
	}
	else if (field == "right")
	{
		if (fixedField == "cx")
		{
			Set(rect.wr, Get(rect.right) - Get(rect.cx));
			Set(rect.width, Get(rect.wr) * 2);
			Set(rect.left, Get(rect.right) - Get(rect.width));
		}
		else if (fixedField == "left")
		{
			Set(rect.width, Get(rect.right) - Get(rect.left));
			Set(rect.wr, Get(rect.width) / 2);
			Set(rect.cx, Get(rect.left) + Get(rect.wr));
		}
		else if (fixedField == "width")
		{
			Set(rect.left, Get(rect.right) - Get(rect.width));
			Set(rect.cx, Get(rect.right) - Get(rect.wr));
		}
	}
	else if (field == "top")
	{
		if (fixedField == "cy")
		{
			Set(rect.hr, Get(rect.cy) - Get(rect.top));
			Set(rect.height, Get(rect.hr) * 2);
			Set(rect.bottom, Get(rect.top) + Get(rect.height));
		}
		else if (fixedField == "bottom")
		{
			Set(rect.height, Get(rect.bottom) - Get(rect.top));
			Set(rect.hr, Get(rect.height) / 2);
			Set(rect.cy, Get(rect.top) + Get(rect.hr));
		}
		else if (fixedField == "height")
		{
			Set(rect.cy, Get(rect.top) + Get(rect.hr));
			Set(rect.bottom, Get(rect.top) + Get(rect.height));
		}
	}
	else if (field == "cy")
	{
		if (fixedField == "top")
		{
			Set(rect.hr, Get(rect.cy) - Get(rect.top));
			Set(rect.height, Get(rect.hr) * 2);
			Set(rect.bottom, Get(rect.top) + Get(rect.height));
		}
		else if (fixedField == "bottom")
		{
			Set(rect.hr, Get(rect.bottom) - Get(rect.cy));
			Set(rect.height, Get(rect.hr) * 2);
			Set(rect.top, Get(rect.bottom) - Get(rect.height));
		}
		else if (fixedField == "height")
		{
			Set(rect.top, Get(rect.cy) - Get(rect.hr));
			Set(rect.bottom, Get(rect.cy) + Get(rect.hr));
		}
	}
	else if (field == "bottom")
	{
		if (fixedField == "cy")
		{
			Set(rect.hr, Get(rect.bottom) - Get(rect.cy));
			Set(rect.height, Get(rect.hr) * 2);
			Set(rect.top, Get(rect.bottom) - Get(rect.height));
		}
		else if (fixedField == "top")
		{
			Set(rect.height, Get(rect.bottom) - Get(rect.top));
			Set(rect.hr, Get(rect.height) / 2);
			Set(rect.cy, Get(rect.top) + Get(rect.hr));
		}
		else if (fixedField == "height")
		{
			Set(rect.top, Get(rect.bottom) - Get(rect.height));
			Set(rect.cy, Get(rect.bottom) - Get(rect.hr));
		}
	}
	
	Set(rect.reactive, true);
}

function SetFields(obj, patch)
{
	for (var key in patch)
	{
		obj[key] = patch[key];
	}
}

function AddRectSlots(obj)
{
	obj.lineWidth = MakeSlot(obj, "lineWidth", 1);
	
	obj.left = MakeSlot(obj, "left", null);
	obj.top = MakeSlot(obj, "top", null);
	obj.width = MakeSlot(obj, "width", null);
	obj.height = MakeSlot(obj, "height", null);
	obj.cx = MakeSlot(obj, "cx", null);
	obj.cy = MakeSlot(obj, "cy", null);
	obj.bottom = MakeSlot(obj, "bottom", null);
	obj.right = MakeSlot(obj, "right", null);
	obj.hr = MakeSlot(obj, "hr", null);
	obj.wr = MakeSlot(obj, "wr", null);
	
	obj.left.react = ReactBox;
	obj.top.react = ReactBox;
	obj.width.react = ReactBox;
	obj.height.react = ReactBox;
	obj.cx.react = ReactBox;
	obj.cy.react = ReactBox;
	obj.bottom.react = ReactBox;
	obj.right.react = ReactBox;
	obj.hr.react = ReactBox;
	obj.wr.react = ReactBox;
	
	obj.reactive = MakeSlot(obj, "reactive", true);
	obj.hLocked = MakeSlot(obj, "hLocked", "width");
	obj.vLocked = MakeSlot(obj, "vLocked", "height");
}

function ReactBox()
{
	var slot = this;
	var rect = slot["[parent]"];
	var name = slot["[name]"];
	
	if (Get(rect.reactive))
	{
		if (name == "left" || name == "cx" || name == "right" || name == "width" || name == "wr")
		{
			MoveBox(rect, name, Get(rect.hLocked), Get(slot));
		}
		else if (name == "top" || name == "cy" || name == "bottom" || name == "height" || name == "hr")
		{
			MoveBox(rect, name, Get(rect.vLocked), Get(slot));
		}
		else
		{
			throw new Error();
		}
	}
}

function MakeGenerator(parent, name, list)
{
	var gen = function()
	{
		var l = MakeList(parent, name);
		
		for (var i = 0; i < list.length; i++)
		{
			l.push(list[i]);
		}
		
		return l;
	};
	
	return gen;
}

function MakeNaturalGenerator(parent, name, objsOrFields)
{
	if (objsOrFields == "objs")
	{
		var gen = function()
		{
			var l = MakeList(parent, name);
			
			for (var key in parent.obj)
			{
				if (key[0] == "[")
				{
					
				}
				else
				{
					l.push(key);
				}
			}
			
			return l;
		};
		
		return gen;
	}
	else if (objsOrFields == "fields")
	{
		var gen = function()
		{
			var l = MakeList(parent, name);
			
			for (var key in parent.objs[0])
			{
				if (key[0] == "[")
				{
					
				}
				else
				{
					l.push(key);
				}
			}
			
			return l;
		};
		
		return gen;
	}
	else
	{
		throw new Error();
	}
}

function LoadFile()
{
	if (document.getElementById("fileChooser").files.length === 0)
	{
		return;
	}

	var f = document.getElementById("fileChooser").files[0];

	globals.reader.readAsArrayBuffer(f);
}

function Ajax()
{
	if (window.XMLHttpRequest) // code for IE7+, Firefox, Chrome, Opera, Safari
  	{
  		xmlhttp = new XMLHttpRequest();
  	}
	else // code for IE6, IE5
  	{
  		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  	}

	xmlhttp.onreadystatechange = function()
  	{
  		if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
    	{
    		// document.getElementById("myDiv").innerHTML = xmlhttp.responseText;
    	}
  	}
	
	xmlhttp.open("GET", "ajax", true);
	xmlhttp.send();
}

function ReadFromServer(slot, url) // the storage model is just files - maybe in a git repository - we read and write .json or anything else
{
	if (window.XMLHttpRequest) // code for IE7+, Firefox, Chrome, Opera, Safari
  	{
  		xmlhttp = new XMLHttpRequest();
  	}
	else // code for IE6, IE5
  	{
  		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  	}

	xmlhttp.onreadystatechange = function()
  	{
  		if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
    	{
			Set(slot, xmlhttp.responseText)
    	}
  	}
	
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
}

function ReadJsonFromServer(url) // the storage model is just files - maybe in a git repository - we read and write .json or anything else
{
	if (window.XMLHttpRequest) // code for IE7+, Firefox, Chrome, Opera, Safari
  	{
  		xmlhttp = new XMLHttpRequest();
  	}
	else // code for IE6, IE5
  	{
  		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  	}

	xmlhttp.onreadystatechange = function()
  	{
  		if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
    	{
    		// for now, let's just add the object to the global scope under the url filename
			
			var name = url.substring(url.lastIndexOf("/"));
			name = name.substring(0, name.length - 5); // chop off the trailing ".json"
			globals[name] = JSON.parse(xmlhttp.responseText);
    	}
  	}
	
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
}

function WriteToServer(obj, url) // JSON only
{
	if (window.XMLHttpRequest) // code for IE7+, Firefox, Chrome, Opera, Safari
  	{
  		xmlhttp = new XMLHttpRequest();
  	}
	else // code for IE6, IE5
  	{
  		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  	}
	
	if (url.substring(url.length - 5) != ".json") // only allow uploading of json files
	{
		return;
	}
	
	var s = JSON.stringify(obj);
	
	xmlhttp.open("PUT", url, true);
	xmlhttp.send(s);
}

function WriteBlobToServer(blob, url)
{
	if (window.XMLHttpRequest) // code for IE7+, Firefox, Chrome, Opera, Safari
  	{
  		xmlhttp = new XMLHttpRequest();
  	}
	else // code for IE6, IE5
  	{
  		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  	}
	
	xmlhttp.open("PUT", url, true);
	xmlhttp.send(blob);
}

function WriteLinesToServer(lines, url)
{
	if (window.XMLHttpRequest) // code for IE7+, Firefox, Chrome, Opera, Safari
  	{
  		xmlhttp = new XMLHttpRequest();
  	}
	else // code for IE6, IE5
  	{
  		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  	}
	
	var s = lines.join("\r\n");
	
	xmlhttp.open("PUT", url, true);
	xmlhttp.send(s);
}

function Nop() { }

function InsertAt(obj, list, index)
{
	list.splice(index, 0, obj);
}

function Remove(list, obj)
{
	var i = list.indexOf(obj);
	var newlist = list.slice(0, i).concat(list.slice(i + 1));
	return newlist;
}

function New() // Ctrl+N
{
	//Save();
	//globals.canvas = MakeObj(globals, "canvas");
	
	// all we have to do here is display a textbox that exposes globals.filename - this is the name we use when PUT-ing to the server
}

function SanitizeString(str)
{
	return str.replace("\"", "\\\"");
}


function MakeGraph(parent, name)
{
	var graph = MakeObj(parent, name);
	graph.display = DisplayGraph;
	graph.displayLabel = DisplayCell; // this will frequently be overridden
	graph.displayNode = DisplayCell; // this will frequently be overridden
	graph.displayEdge = DisplayEdge;
	graph.nodes = MakeList(graph, "nodes");
	graph.edges = MakeList(graph, "edges");
	return graph;
}

function MakeNode(parent, name, contents)
{
	var node = MakeObj(parent, name);
	node.ins = MakeList(node, "ins");
	node.ous = MakeList(node, "ous");
	node.contents = contents;
	return node;
}

function AddNode(graph, node)
{
	node.parent = graph;
	graph.nodes.push(node);
}

function AddEdge(graph, src, dst, label)
{
	var edge = MakeObj(graph.edges, graph.edges.length.toString()); // graph.edges is the parent in a graph-full situation
	edge.src = src;
	edge.dst = dst;
	edge.label = label;
	edge.parent = graph;
	
	src.ous.push(edge);
	dst.ins.push(edge);
	
	graph.edges.push(edge);
}

function AddGraphlessEdge(src, dst, label)
{
	var edge = MakeObj(src.ous, src.ous.length.toString()); // node.ous is the parent in a graphless situation
	edge.src = src;
	edge.dst = dst;
	edge.label = label;
	
	src.ous.push(edge);
	dst.ins.push(edge);
}

function AddSlotCellEdge(slot, cell)
{
	// we don't want to pollute the cell obj with ins and ous and everything, so just keep everything on the slot side
	
	var edge = MakeObj(slot.node.ous, slot.node.ous.length.toString()); // node.ous is the parent in a graphless situation
	edge.src = slot;
	edge.dst = cell;
	edge.label = slot.node.ous.length.toString() + " - cell";
	slot.node.ous.push(edge);
}

function GenerateForces(nodes, edges)
{
	// 1. Assign all the forces and sum
	// 2. Draw annotated version
	// 3. Move each node and remove forces
	// 4. Draw unannotated version
	// 5. Repeat
	
	var forces = [];
	var f = null;
	
	for (var i = 0; i < nodes.length; i++)
	{
		for (var j = 0; j < nodes.length; j++)
		{
			var a = nodes[i];
			var b = nodes[j];
			
			if (a != b)
			{
				f = MakeForce(a, b, 1); // repulsion
				forces.push(f);
			}
		}
	}
	
	for (var i = 0; i < edges.length; i++)
	{
		var e = edges[i];
		
		f = MakeForce(e.src, e.dst, -1); // attraction
		forces.push(f);
				
		f = MakeForce(e.dst, e.src, -1); // attraction
		forces.push(f);
	}
	
	return forces;
}

function ApplyForces(forces, nodes)
{
	for (var i = 0; i < forces.length; i++)
	{
		var f = forces[i];
		var node = f.node;
		Set(node.cx, Get(node.cx) + f.vx);
		Set(node.cy, Get(node.cy) + f.vy);
	}
}

function MakeForce(a, b, sign)
{
	// sign = +1 = repulsive
	// sign = -1 = attractive
	
	var dx = Get(b.cx) - Get(a.cx);
	var dy = Get(b.cy) - Get(a.cy);
	
	var distance = Math.sqrt(dx * dx + dy * dy);
	
	var strength = 0.0;
	
	if (sign > 0)
	{
		strength = -1 * globals.charge / (distance * distance);
	}
	else if (sign < 0)
	{
		strength = (distance - globals.optimalSpringLength) / globals.springStiffness;
	}
	
	var force = {};
	force.node = a;
	force.vx = strength * dx / distance; // dx / distance is just the normalized vector to the other node
	force.vy = strength * dy / distance;
	return force;
}

function IsConnectedTo(edges, a, b)
{
    for (var i = 0; i < edges.length; i++)
    {
		var e = edges[i];
		
        if (e.from == a && e.to == b || e.to == a && e.from == b)
        {
            return true;
        }
    }

    return false;
}

function Displace(src, dst, d)
{
    var heading = Math.atan2(dst.y - src.y, dst.x - src.x);

    var x = src.x + d * Math.cos(heading);
    var y = src.y + d * Math.sin(heading);

    var p = {};
    p.x = x;
    p.y = y;

    return p;
}

function Distance(a, b)
{
    return Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
}

function Angle(a, b)
{
    return Math.atan2(-(b.y - a.y), b.x - a.x); // the y axis goes up as you go down on the screen - hence the negative sign
}


function NewNode() // Alt+N
{

}

function NewEdge() // Alt+E
{

}

function HoverControlPoint()
{
	var cp = global.hovered;
	
	cp.lineWidth = 3;
	cp.stroke = "rgb(255,150,0)";
	
	Push("LD", SelectAndBeginDrag);
	Push("LU", EndDrag);
	
	Render();
}


// instead of an edge having a fixed label, an edge can have contents like anything else
// nodes and roots too - anything can have contents - labels are just one possible usage

function TogglePlaceGraphMode()
{
	if (globals.placeGraphMode)
	{
		globals.canvas["TogglePlaceGraphModeButton"].version = 0;
		ExitPlaceGraphMode();
		globals.placeGraphMode = false;
	}
	else
	{
		globals.canvas["TogglePlaceGraphModeButton"].version = 2;
		EnterPlaceGraphMode();
		globals.placeGraphMode = true;
	}
}

function EnterPlaceGraphMode()
{
	PushUnder("LD", PlaceGraph);
}

function ExitPlaceGraphMode()
{
	PopUnder("LD");
}

function PlaceGraph()
{
	var defaultGraphName = "Graph" + (globals.objcounts.graph++).toString();
}

function DisplayGraph(graph, displayNode, displayEdge, displayLabel)
{
	var shape = {};
	AddRectSlots(shape);
	shape.parentSelect = ParentSelectGraphShape;
	shape.parentDeselect = ParentDeselectGraphShape;
	shape.displayNode = displayNode;
	shape.displayEdge = displayEdge;
	shape.displayLabel = displayLabel;
	shape.draw = DrawGraph;
	shape.click = ClickGraph;
	shape.position = PositionGraph;
	shape.data = graph;
	shape.nodeShapes = [];
	shape.edgeShapes = [];

	for (var i = 0; i < graph.nodes.length; i++)
	{
		var node = graph.nodes[i];
		var nodeShape = displayNode(node);
		shape.nodeShapes.push(nodeShape);
		nodeShape.parentShape = shape;
		
		nodeShape.stroke = "rgb(158,182,206)"; // "rgb(208,215,229)";
		
		nodeShape.dx = MakeSlot(nodeShape, "dx", 0);
		nodeShape.dy = MakeSlot(nodeShape, "dy", 0);
	}
	
	for (var i = 0; i < graph.edges.length; i++)
	{
		var edge = graph.edges[i];
		var edgeShape = displayEdge(graph, shape, edge);
		shape.edgeShapes.push(edgeShape);
		edgeShape.parentShape = shape;
	}
	
	return shape;
}

function PositionGraph(graphShape)
{
	for (var i = 0; i < graphShape.nodeShapes.length; i++)
	{
		var nodeShape = graphShape.nodeShapes[i];
		
		// Calculate
		Set(nodeShape.left, Get(graphShape.left) + Get(nodeShape.dx));
		Set(nodeShape.right, Get(nodeShape.left) + Get(nodeShape.width));
		Set(nodeShape.wr, Get(nodeShape.width) / 2);
		Set(nodeShape.cx, Get(nodeShape.left) + Get(nodeShape.wr));
		Set(nodeShape.top, Get(graphShape.top) + Get(nodeShape.dy));
		Set(nodeShape.bottom, Get(nodeShape.top) + Get(nodeShape.height));
		Set(nodeShape.hr, Get(nodeShape.height) / 2);
		Set(nodeShape.cy, Get(nodeShape.top) + Get(nodeShape.hr));
		
		nodeShape.position(nodeShape);
	}
	
	for (var i = 0; i < graphShape.edgeShapes.length; i++)
	{
		var edgeShape = graphShape.edgeShapes[i];
		
		var srcp = { x : Get(edgeShape.src.dx) , y : Get(edgeShape.src.dy) };
		var dstp = { x : Get(edgeShape.dst.dx) , y : Get(edgeShape.dst.dy) };
		var cp1p = { x : Get(edgeShape.cps[1].dx) , y : Get(edgeShape.cps[1].dy) };
		var cp2p = { x : Get(edgeShape.cps[2].dx) , y : Get(edgeShape.cps[2].dy) };
		
		var dp0 = Displace(srcp, cp1p, graphShape.standoff);
		var dp3 = Displace(dstp, cp2p, graphShape.standoff);
		
		Set(edgeShape.cps[0].dx, dp0.x);
		Set(edgeShape.cps[0].dy, dp0.y);
		Set(edgeShape.cps[3].dx, dp3.x);
		Set(edgeShape.cps[3].dy, dp3.y);
		
		// Calculate
		Set(edgeShape.cps[0].cx, Get(graphShape.left) + Get(edgeShape.cps[0].dx));
		Set(edgeShape.cps[0].cy, Get(graphShape.top) + Get(edgeShape.cps[0].dy));
		Set(edgeShape.cps[1].cx, Get(graphShape.left) + Get(edgeShape.cps[1].dx));
		Set(edgeShape.cps[1].cy, Get(graphShape.top) + Get(edgeShape.cps[1].dy));
		Set(edgeShape.cps[2].cx, Get(graphShape.left) + Get(edgeShape.cps[2].dx));
		Set(edgeShape.cps[2].cy, Get(graphShape.top) + Get(edgeShape.cps[2].dy));
		Set(edgeShape.cps[3].cx, Get(graphShape.left) + Get(edgeShape.cps[3].dx));
		Set(edgeShape.cps[3].cy, Get(graphShape.top) + Get(edgeShape.cps[3].dy));
		
		edgeShape.position(edgeShape);
	}
}

function ForceDirectedLayout(graphShape)
{
	RandomLayout(graphShape);
	
	for (var i = 0; i < 50; i++)
	{
		var forces = GenerateForces(graphShape.nodeShapes, graphShape.edgeShapes);
		ApplyForces(forces, graphShape.nodeShapes);
	}
	
	for (var i = 0; i < graphShape.nodeShapes.length; i++)
	{
		var node = graphShape.nodeShapes[i];
		
		// Calculate, since only cx and cy were changed by the forces
		Set(node.left, Get(node.cx) - Get(node.wr));
		Set(node.right, Get(node.cx) + Get(node.wr));
		Set(node.top, Get(node.cy) - Get(node.hr));
		Set(node.bottom, Get(node.cy) + Get(node.hr));
	}
	
	for (var i = 0; i < graphShape.edgeShapes.length; i++)
	{
		var edge = graphShape.edgeShapes[i];
		
		// place control points by linear interpolation
		
	}
}

function RandomLayout(graphShape)
{
	var left = Get(graphShape.left);
	var top = Get(graphShape.top);
	var width = Get(graphShape.width);
	var height = Get(graphShape.height);
	
	for (var i = 0; i < graphShape.nodeShapes.length; i++)
	{
		var node = graphShape.nodeShapes[i];
		
		Set(node.dx, Math.floor(Math.random() * (width - Get(node.width))));
		Set(node.dy, Math.floor(Math.random() * (height - Get(node.height))));
	}
	
	for (var i = 0; i < graphShape.edgeShapes.length; i++)
	{
		var edge = graphShape.edgeShapes[i];
		
		// cps[0] and cps[3] are placed in PositionGraph, at a standoff from their nodes
		Set(edge.cps[1].dx, Math.floor(Math.random() * width));
		Set(edge.cps[1].dy, Math.floor(Math.random() * height));
		Set(edge.cps[2].dx, Math.floor(Math.random() * width));
		Set(edge.cps[2].dy, Math.floor(Math.random() * height));
	}
}

function DisplayEdge(graph, graphShape, edge)
{	
	var bezier = {};
	bezier.draw = DrawBezier;
	bezier.lineWidth = 1;
	bezier.stroke = "rgb(0,0,0)";
	bezier.points = [];
	bezier.points.push({ x : null , y : null });
	bezier.points.push({ x : null , y : null });
	bezier.points.push({ x : null , y : null });
	bezier.points.push({ x : null , y : null });
	
	var rfletch = {};
	rfletch.draw = DrawPath;
	rfletch.lineWidth = 1;
	rfletch.stroke = "rgb(0,0,0)";
	rfletch.points = [];
	rfletch.points.push({ x : null , y : null });
	rfletch.points.push({ x : null , y : null });
	
	var lfletch = {};
	lfletch.draw = DrawPath;
	lfletch.lineWidth = 1;
	lfletch.stroke = "rgb(0,0,0)";
	lfletch.points = [];
	lfletch.points.push({ x : null , y : null });
	lfletch.points.push({ x : null , y : null });
	
	var cps = [];
	
	for (var i = 0; i < 4; i++)
	{
		var cp = {};
		cp.draw = DrawArc;
		cp.click = ClickArc;
		cp.stroke = null;
		cp.fill = "rgb(242,149,54)"; // "rgb(255,213,141)"; // "rgb(255,0,0)";
		cp.radius = 5;
		cp.startAngle = 0;
		cp.endAngle = 2 * Math.PI;
		cp.lineWidth = 1;
		cp.cx = MakeSlot(cp, "cx", null);
		cp.cy = MakeSlot(cp, "cy", null);
		cp.dx = MakeSlot(cp, "dx", null);
		cp.dy = MakeSlot(cp, "dy", null);
		//cp.dThetaDegrees = MakeSlot(cp, "dThetaDegrees", 0);
		//cp.scaledDistance = MakeSlot(cp, "scaledDistance", 0);
		cp.onhover = PrimeDrag;
		cps.push(cp);
	}
	
	var labelShape = null;
	
	if (edge.label.display)
	{
		labelShape = edge.label.display(edge.label);
		labelShape.dx = 10; // MakeSlot(labelShape, "dx", 10); // these are not reasonable defaults
		labelShape.dy = 10; // MakeSlot(labelShape, "dy", 10); // these are not reasonable defaults
		labelShape.referencePoint = edgeShape.cps[1]; // this is a reasonable default
	}
	
	var edgeShape = {};
	edgeShape.draw = DrawEdge;
	edgeShape.click = ClickEdge;
	edgeShape.position = PositionEdge;
	edgeShape.data = edge;
	edgeShape.cps = cps;
	edgeShape.bezier = bezier;
	edgeShape.rfletch = rfletch;
	edgeShape.lfletch = lfletch;
	edgeShape.labelShape = labelShape;
	edgeShape.src = graphShape.nodeShapes[graph.nodes.indexOf(edge.src)]; // good god what a clusterfuck - we're using parallel structure between the graph and graphShape
	edgeShape.dst = graphShape.nodeShapes[graph.nodes.indexOf(edge.dst)]; // good god what a clusterfuck

	return edgeShape;
}

function PositionEdge(edgeShape)
{
	// This is a possible framework for preserving curve characteristics through changes to node locations
	// It is too complex and utterly unnecessary at this stage of the game
	
	//var vectorAngle = null;
	//var vectorDistance = null;
	//
	//if (edgeShape.src == edgeShape.dst)
	//{
	//	// we interpret 'scaledDistance' as being simply the distance from the node
	//	// we interpret 'dThetaDegrees' as being simply the angle from window right
	//	// to implement these interpretations, we set these variables to */+ identities
	//	vectorAngle = 0;
	//	vectorDistance = 1;
	//}
	//else
	//{
	//	// the reference vector is the vector from the src to the dst
	//	// each cp is positioned at a displacement angle from that vector, and at a scaled distance from the src
	//	
	//	vectorAngle = Angle(edgeShape.src, edgeShape.dst);
	//	vectorDistance = Distance(edgeShape.src, edgeShape.dst);
	//}
    //
	//Set(edgeShape.cp0.cx, Get(edgeShape.src.cx) + vectorDistance * Get(edgeShape.cp0.scaledDistance) * Math.cos(vectorAngle + Get(edgeShape.cp0.dThetaDegrees) / 360 * Math.PI * 2));
	//Set(edgeShape.cp0.cy, Get(edgeShape.src.cy) + vectorDistance * Get(edgeShape.cp0.scaledDistance) * Math.sin(vectorAngle + Get(edgeShape.cp0.dThetaDegrees) / 360 * Math.PI * 2));
	//Set(edgeShape.cp1.cx, Get(edgeShape.src.cx) + vectorDistance * Get(edgeShape.cp1.scaledDistance) * Math.cos(vectorAngle + Get(edgeShape.cp1.dThetaDegrees) / 360 * Math.PI * 2));
	//Set(edgeShape.cp1.cy, Get(edgeShape.src.cy) + vectorDistance * Get(edgeShape.cp1.scaledDistance) * Math.sin(vectorAngle + Get(edgeShape.cp1.dThetaDegrees) / 360 * Math.PI * 2));
	
	var p0 = { x : Get(edgeShape.cps[0].cx) , y : Get(edgeShape.cps[0].cy) };
	var p1 = { x : Get(edgeShape.cps[1].cx) , y : Get(edgeShape.cps[1].cy) };
	var p2 = { x : Get(edgeShape.cps[2].cx) , y : Get(edgeShape.cps[2].cy) };
	var p3 = { x : Get(edgeShape.cps[3].cx) , y : Get(edgeShape.cps[3].cy) };
	
	edgeShape.bezier.points[0].x = p0.x;
	edgeShape.bezier.points[0].y = p0.y;
	edgeShape.bezier.points[1].x = p1.x;
	edgeShape.bezier.points[1].y = p1.y;
	edgeShape.bezier.points[2].x = p2.x;
	edgeShape.bezier.points[2].y = p2.y;
	edgeShape.bezier.points[3].x = p3.x;
	edgeShape.bezier.points[3].y = p3.y;
	
	var standoff = 10; // distance from center to start/end of arrow
	var fletchLength = 10;
	var fletchAngleDeg = 30;
	
	var pArrowStart = Displace(p0, p1, standoff);
	var pArrowEnd = Displace(p3, p2, standoff);
	
	var angle = Angle(p2, p3);
	var fletch0angle = angle + fletchAngleDeg / 360 * 2 * Math.PI;
	var fletch1angle = angle - fletchAngleDeg / 360 * 2 * Math.PI;
	
	edgeShape.rfletch.points[0].x = p3.x;
	edgeShape.rfletch.points[0].y = p3.y;
	edgeShape.rfletch.points[1].x = p3.x - (fletchLength * Math.cos(fletch0angle));
	edgeShape.rfletch.points[1].y = p3.y + (fletchLength * Math.sin(fletch0angle));
	
	edgeShape.lfletch.points[0].x = p3.x;
	edgeShape.lfletch.points[0].y = p3.y;
	edgeShape.lfletch.points[1].x = p3.x - (fletchLength * Math.cos(fletch1angle));
	edgeShape.lfletch.points[1].y = p3.y + (fletchLength * Math.sin(fletch1angle));
	
	// we assume the target is left-top
	if (edgeShape.labelShape)
	{
		Set(edgeShape.labelShape.left, Get(edgeShape.labelShape.referencePoint.cx) + Get(edgeShape.labelShape.dx));
		Set(edgeShape.labelShape.top, Get(edgeShape.labelShape.referencePoint.cy) + Get(edgeShape.labelShape.dy));
		
		// Calculate
		Set(edgeShape.labelShape.right, Get(edgeShape.labelShape.left) + Get(edgeShape.labelShape.width));
		Set(edgeShape.labelShape.wr, Get(edgeShape.labelShape.width) / 2);
		Set(edgeShape.labelShape.cx, Get(edgeShape.labelShape.left) + Get(edgeShape.labelShape.wr));
		Set(edgeShape.labelShape.bottom, Get(edgeShape.labelShape.top) + Get(edgeShape.labelShape.height));
		Set(edgeShape.labelShape.hr, Get(edgeShape.labelShape.height) / 2);
		Set(edgeShape.labelShape.cy, Get(edgeShape.labelShape.top) + Get(edgeShape.labelShape.hr));
		
		edgeShape.labelShape.position(edgeShape.labelShape);
	}
}

function OnFocusGraphShape(graphShape)
{
	Push("Alt+N", NewNode);
	Push("Alt+E", NewEdge);
}

function DeFocusGraphShape(graphShape)
{
	Pop("Alt+N");
	Pop("Alt+E");
}

function DrawGraph(shape)
{
	DrawBox(shape);
	
	for (var i = 0; i < shape.nodeShapes.length; i++)
	{
		shape.nodeShapes[i].draw(shape.nodeShapes[i]);
	}
	
	for (var i = 0; i < shape.edgeShapes.length; i++)
	{
		shape.edgeShapes[i].draw(shape.edgeShapes[i]);
	}
}

function DrawEdge(shape)
{
	for (var i = 0; i < shape.cps.length; i++) // later, we'll toggle this based on selection
	{
		shape.cps[i].draw(shape.cps[i]);
	}
	
	shape.bezier.draw(shape.bezier);
	shape.rfletch.draw(shape.rfletch);
	shape.lfletch.draw(shape.lfletch);
	
	if (shape.labelShape)
	{
		shape.labelShape.draw(shape.labelShape);
	}
}

function ClickGraph(shape)
{
	for (var i = shape.edgeShapes.length - 1; i >= 0; i--)
	{
		var sub = shape.edgeShapes[i];
		
		if (sub.click)
		{
			var target = sub.click(sub);
			
			if (target)
			{
				return target;
			}
		}
	}
	
	for (var i = shape.nodeShapes.length - 1; i >= 0; i--)
	{
		var sub = shape.nodeShapes[i];
		
		if (sub.click)
		{
			var target = sub.click(sub);
			
			if (target)
			{
				return target;
			}
		}
	}
	
	var mx = Get(globals.mx);
	var my = Get(globals.my);
	var left = Get(shape.left);
	var width = Get(shape.width);
	var top = Get(shape.top);
	var height = Get(shape.height);
	
	if (left < mx && mx < left + width && top < my && my < top + height)
	{
		return shape;
	}
	else
	{
		return null;
	}
}

function ClickEdge(shape)
{
	// select the edge if we click on either the start or end control points
	// or maybe the label - although probably clicking the label should select the label - but it has to go through edge first, so we need that
	
	// btw's, the control points have to be separated from the nodes so that the edge endpoints can stand off from the node shape
	
	var cps = [ shape.cps[1] , shape.cps[2] ]; // for now, limit draggability to the middle cps, because dragging the endpoints are constrained by the node shape and snapping, etc.
	
	for (var i = cps.length - 1; i >= 0; i--)
	{
		var sub = cps[i];
		
		if (sub.click)
		{
			var target = sub.click(sub);
			
			if (target)
			{
				return target;
			}
		}
	}
	
	if (shape.labelShape)
	{
		if (shape.labelShape.click)
		{
			var target = shape.labelShape.click(shape.labelShape);
			
			if (target)
			{
				return target;
			}
		}
	}
}


function DisplayGrid(grid)
{
	if (globals.logging)
	{
		globals.log.push("DisplayGrid " + grid["[id]"].toString());
	}
	
	AddRectSlots(grid);
	grid.onfocus = OnFocusGrid;
	grid.defocus = DeFocusGrid;
	grid.onedit = OnEditGrid;
	grid.deedit = DeEditGrid;
	grid.draw = DrawGrid;
	grid.click = ClickGrid;
	grid.position = PositionGrid;
	grid.rowStartIndex = 0;
	grid.colStartIndex = 0;
	grid.maxRows = Number.POSITIVE_INFINITY;
	grid.maxCols = Number.POSITIVE_INFINITY;
	grid.scrollbars = MakeList(grid, "scrollbars");
}

function AssignNewWidthsAndHeights(grid)
{
	if (globals.logging)
	{
		globals.log.push("AssignNewWidthsAndHeights " + grid["[id]"].toString());
	}
	
	grid.colWidths = MakeList(grid, "colWidths");
	grid.rowHeights = MakeList(grid, "rowHeights");
	grid.xs = MakeList(grid, "xs");
	grid.ys = MakeList(grid, "ys");
	for (var i = 0; i < grid.nCols; i++) { grid.colWidths.push(64); }
	for (var i = 0; i < grid.nRows; i++) { grid.rowHeights.push(20); }
	
	for (var i = 0; i < grid.nCols + 1; i++)
	{
		grid.xs.push(MakeSlot(grid.xs, i.toString(), 64 * i));
	}
	
	for (var i = 0; i < grid.nRows + 1; i++)
	{
		grid.ys.push(MakeSlot(grid.ys, i.toString(), 20 * i));
	}
}

function ScrollGrid(grid, strRowsOrCols, intNewStart)
{
	if (globals.logging)
	{
		globals.log.push("ScrollGrid " + grid["[id]"].toString());
	}
	
	// none of this works since making cells non-retargetable
	
	// what we should do is change objs or fields and then regenerate all cells
	
	throw new Error();
	
	var data = Get(grid.obj);
	
	for (var j = 0; j < grid.cols.length; j++)
	{
		for (var i = 0; i < grid.rows.length; i++)
		{
			var cell = grid.cells[(j + 1) * grid.nRows + (i + 1)];
			
			if (strRowsOrCols == "rows")
			{
				if (grid.rowsAre == "objs")
				{
					// since getting rid of the concept of retargetable cell pointers, we have to rework this function
					// basically we're just reassigning cell.slot
					// one problem we have here is that we don't have a cached starting index for both rows/cols - we need this
					// then we can just use something like the line below to retarget the cells
					cell.slot = Get(data[grid.objs[intNewStart + i]])[grid.fields[intNewStart + i]];
				}
				else
				{
					cell.slot = grid.fields[intNewStart + i];
				}
			}
			else
			{
				if (grid.rowsAre == "fields")
				{
					cell.slot = data[grid.objs[intNewStart + j]];
				}
				else
				{
					cell.slot = grid.fields[intNewStart + j];
				}
			}
		}
	}
	
	if (strRowsOrCols == "rows")
	{
		for (var i = 0; i < grid.rows.length; i++)
		{
			var cell = grid.cells[i + 1];
			var slot = cell.slot;
			var label = grid.rows[intNewStart + i];
			Set(slot, label);
		}
	}
	else
	{
		for (var j = 0; j < grid.cols.length; j++)
		{
			var cell = grid.cells[(j + 1) * grid.nRows];
			var slot = cell.slot;
			var label = grid.cols[intNewStart + j];
			Set(slot, label);
		}
	}
	
	RedisplayGridCells(grid);
}

function RedisplayGridCells(grid)
{
	if (globals.logging)
	{
		globals.log.push("RedisplayGridCells " + grid["[id]"].toString());
	}
	
	// this happens if we scroll or if the underlying cell data changes
	
	var c = 0;
	
	for (var j = 0; j < grid.nCols; j++)
	{
		for (var i = 0; i < grid.nRows; i++)
		{
			var cell = grid.cells[c++];
			cell.redisplay(cell);
			cell.position(cell);
		}
	}
	
	globals.redraw = true;
}

function GenerateRowAndColLabels(grid)
{
	if (globals.logging)
	{
		globals.log.push("GenerateRowAndColLabels " + grid["[id]"].toString());
	}
	
	grid.rows = MakeList(grid, "rows");
	grid.cols = MakeList(grid, "cols");
	
	if (grid.rowsAre == "objs")
	{
		grid.nRows = Math.min(grid.objs.length, grid.maxRows) + 1;
		grid.nCols = Math.min(grid.fields.length, grid.maxCols) + 1;
		
		for (var i = 0; i < grid.nRows - 1; i++)
		{
			grid.rows.push(grid.objs[grid.rowStartIndex + i]);
		}
		
		for (var j = 0; j < grid.nCols - 1; j++)
		{
			grid.cols.push(grid.fields[grid.colStartIndex + j]);
		}
	}
	else
	{
		grid.nRows = Math.min(grid.fields.length, grid.maxRows) + 1;
		grid.nCols = Math.min(grid.objs.length, grid.maxCols) + 1;
		
		for (var i = 0; i < grid.nRows - 1; i++)
		{
			grid.rows.push(grid.fields[grid.rowStartIndex + i]);
		}
		
		for (var j = 0; j < grid.nCols - 1; j++)
		{
			grid.cols.push(grid.objs[grid.colStartIndex + j]);
		}
	}
}

function GenerateCells(grid)
{
	if (globals.logging)
	{
		globals.log.push("GenerateCells " + grid["[id]"].toString());
	}
	
	// cells = [ Title , Row1 , Row2 , Row3 , Col1, A1 , A2 , A3 , Col2 , B1 , B2 , B3 ] - col first, then row
	grid.cells = new Array(grid.nCols * grid.nRows);
	AddBracketFields(grid.cells, grid, "cells"); // in lieu of MakeObj or MakeList
	
	//var rowscols = "rows"; // "rows" or "cols"
	//var rowcolLabelCells = "rowLabelCells"; // "rowLabelCells" or "colLabelCells"
	//var syn = "row"; // "row" or "col"
	//var ant = "col"; // "row" or "col"
	
	var titleCellFill = "rgb(208,216,217)";
	var objLabelCellFill = "rgb(255,200,200)";
	var fieldLabelCellFill = "rgb(208,246,117)";
	//var titleCellFill = "rgb(208,216,227)";
	//var objLabelCellFill = "rgb(218,226,237)";
	//var fieldLabelCellFill = "rgb(228,236,247)";
	var selectedFill = "rgb(255,213,141)";
	
	//var titleCellFill = "rgb(228,226,217)";
	//var objLabelCellFill = "rgb(248,206,217)";
	//var fieldLabelCellFill = "rgb(208,246,217)";
	
	var dataSlot = grid.obj;
	var data = Get(dataSlot);
	
	// the grid nameslot is unreactive - indeed, perhaps it should be a normal cell rather than a nameslot - one that determines grid.obj
	grid["nameslot"] = MakeSlot(grid, "nameslot", dataSlot["[name]"]);
	grid["nameslot"].react = ChangeName;
	grid["objnameslots"] = MakeList(grid, "objnameslots");
	grid["fienameslots"] = MakeList(grid, "fienameslots");
	
	for (var i = 0; i < grid.objs.length; i++)
	{
		var slot = MakeSlot(grid["objnameslots"], i.toString(), grid.objs[i]);
		slot.react = ChangeName;
		grid["objnameslots"].push(slot);
	}
	
	for (var i = 0; i < grid.fields.length; i++)
	{
		var slot = MakeSlot(grid["fienameslots"], i.toString(), grid.fields[i]);
		slot.react = ChangeName;
		grid["fienameslots"].push(slot);
	}
	
	var c = 0;

	for (var j = 0; j < grid.nCols; j++)
	{
		for (var i = 0; i < grid.nRows; i++)
		{
			var cell = MakeCell(grid.cells, c.toString());
			grid.cells[c++] = cell;
			cell.parentShape = grid; // can we get rid of this, now that we have 'container'?
			cell.container = grid;
			cell.row = i;
			cell.col = j;
			cell.stroke = null;
			
			var slot = null;
			
			// the pointer directs the output of the cell formula to the slot
				
			if (i == 0 && j == 0)
			{
				slot = grid["nameslot"];
				cell.fill = titleCellFill;
			}
			else if (i == 0) // col labels
			{
				if (grid.rowsAre == "objs")
				{
					slot = grid["fienameslots"][j - 1];
					cell.fill = fieldLabelCellFill;
				}
				else
				{
					slot = grid["objnameslots"][j - 1];
					cell.fill = objLabelCellFill;
				}
			}
			else if (j == 0) // row labels
			{
				if (grid.rowsAre == "objs")
				{
					slot = grid["objnameslots"][i - 1];
					cell.fill = objLabelCellFill;
				}
				else
				{
					slot = grid["fienameslots"][i - 1];
					cell.fill = fieldLabelCellFill;
				}
			}
			else
			{
				if (grid.rowsAre == "objs")
				{
					slot = Get(data[grid.objs[i - 1]])[grid.fields[j - 1]];
				}
				else
				{
					slot = Get(data[grid.objs[j - 1]])[grid.fields[i - 1]];
				}

				cell.fill = null;
			}

			SetCellSlot(cell, slot);
		}
	}
}

function RedisplayGrid(grid)
{
	if (globals.logging)
	{
		globals.log.push("RedisplayGrid " + grid["[id]"].toString());
	}
	
	// what are the various conditions that can trigger a redisplay?
	// 1. a complete regeneration of the underlying data, such as when the lexer re-runs - this means that dimensions can change
	// 2. scrolling, which does not change dimensions
	// 3. addition/deletion of rows/cols, or expanding/contracting the table size
	// 4. change of underlying cell data, without a change in dimensions to the grid
	// 5. an incremental change to the underlying data
	
	// 2 is pretty similar to 4
	
	// 1 changes objs and fields
	
	grid.cursor = MakeObj(grid, "cursor");
	grid.cursor.row = null;
	grid.cursor.col = null;
	grid.anchor = MakeObj(grid, "anchor");
	grid.anchor.row = null;
	grid.anchor.col = null;
	grid.selected = MakeList(grid, "selected");
	grid.selected[0] = MakeObj(grid.selected, "0");
	grid.selected[0].mode = "Select";
	grid.selected[0].color = "rgb(0,0,0)";
	grid.selected[0].shimmer = false;
	grid.selected[0].minCol = null;
	grid.selected[0].maxCol = null;
	grid.selected[0].minRow = null;
	grid.selected[0].maxRow = null;

	grid.objs = MakeList(grid, "objs");
	grid.fields = MakeList(grid, "fields");
	
	var data = Get(grid.obj);
	
	for (var key in data)
	{
		if (key[0] != '[')
		{
			grid.objs.push(key);
		}
	}
	
	var obj = Get(data[grid.objs[0]]);
	
	for (var key in obj)
	{
		if (key[0] != '[')
		{
			grid.fields.push(key);
		}
	}
	
	GenerateRowAndColLabels(grid);
	
	// what happens when the grid is regenerated because of a change to the underlying data?
	// we want to keep existing row/col sizes, but what if rows/cols are added/subtracted?
	
	// on grid creation, widths and heights should be determined automatically - use measureText
	// when new rows/cols are added, we copy the width/height of the selected cell
	// when the grid is redisplayed, the widths/heights should not be touched
	
	// which means this line should be somewhere else
	AssignNewWidthsAndHeights(grid);
	
	GenerateCells(grid);
}

function PositionGrid(grid)
{
	if (globals.logging)
	{
		globals.log.push("PositionGrid " + grid["[id]"].toString());
	}
	
	var x = Get(grid.left);
	var y = Get(grid.top);
	
	Set(grid.xs[0], x);
	Set(grid.ys[0], y);
	
	for (var i = 0; i < grid.nRows; i++)
	{
		Set(grid.ys[i + 1], Get(grid.ys[i]) + Get(grid.rowHeights[i]));
	}
	
	for (var j = 0; j < grid.nCols; j++)
	{
		Set(grid.xs[j + 1], Get(grid.xs[j]) + Get(grid.colWidths[j]));
	}
	
	for (var j = 0; j < grid.nCols; j++)
	{
		for (var i = 0; i < grid.nRows; i++)
		{
			var cell = grid.cells[j * grid.nRows + i];
			MoveBox(cell, "width", "left", Get(grid.colWidths[j]));
			MoveBox(cell, "height", "top", Get(grid.rowHeights[i]));
			MoveBox(cell, "left", "width", Get(grid.xs[j]));
			MoveBox(cell, "top", "height", Get(grid.ys[i]));
			cell.position(cell);
		}
	}
	
	MoveBox(grid, "right", "left", Get(grid.xs[grid.nCols]));
	MoveBox(grid, "bottom", "top", Get(grid.ys[grid.nRows]));
}

function DrawGrid(grid)
{
	if (globals.logging)
	{
		globals.log.push("DrawGrid " + grid["[id]"].toString());
	}
	
	// draw cells - the cells draw their fill only - the grid itself handles strokes and the selection box
	for (var i = 0; i < grid.cells.length; i++)
	{
		var cell = grid.cells[i];
		cell.draw(cell);
	}
	
	// draw normal strokes
	
	var labelCellStroke = "rgb(158,182,206)";
	var normalStroke = "rgb(208,215,229)";
	
	var x0 = Get(grid.xs[0]);
	var x1 = Get(grid.xs[1]);
	var y0 = Get(grid.ys[0]);
	var y1 = Get(grid.ys[1]);
	
	var lf = Get(grid.left);
	var rt = Get(grid.right);
	var tp = Get(grid.top);
	var bt = Get(grid.bottom);
	
	var g = globals.g;
	
	// long strokes
	for (var i = 0; i < grid.ys.length; i++)
	{
		var y = Get(grid.ys[i]);
		g.lineWidth = 1;
		g.strokeStyle = i < 2 ? labelCellStroke : normalStroke;
		g.beginPath();
		g.moveTo(lf - 0.5, y - 0.5);
		g.lineTo(rt, y - 0.5);
		g.stroke();
	}
	
	// short label cell strokes
	for (var i = 0; i < grid.ys.length; i++)
	{
		var y = Get(grid.ys[i]);
		g.lineWidth = 1;
		g.strokeStyle = labelCellStroke;
		g.beginPath();
		g.moveTo(x0 - 0.5, y - 0.5);
		g.lineTo(x1, y - 0.5);
		g.stroke();
	}
	
	// long strokes
	for (var i = 0; i < grid.xs.length; i++)
	{
		var x = Get(grid.xs[i]);
		g.lineWidth = 1;
		g.strokeStyle = i < 2 ? labelCellStroke : normalStroke;
		g.beginPath();
		g.moveTo(x - 0.5, tp - 0.5);
		g.lineTo(x - 0.5, bt);
		g.stroke();
	}
	
	// short label cell strokes
	for (var i = 0; i < grid.xs.length; i++)
	{
		var x = Get(grid.xs[i]);
		g.lineWidth = 1;
		g.strokeStyle = labelCellStroke;
		g.beginPath();
		g.moveTo(x - 0.5, y0 - 0.5);
		g.lineTo(x - 0.5, y1);
		g.stroke();
	}
	
	
	// draw selected strokes
	
	var selectedStroke = "rgb(242,149,54)";

	if (grid.selected.minRow > 0) // so that the selection indicator is not drawn on the title cell when a col label is selected
	{
		for (var i = grid.selected.minRow; i <= grid.selected.maxRow + 1; i++)
		{
			var y = Get(grid.ys[i]);
			g.lineWidth = 1;
			g.strokeStyle = selectedStroke;
			g.beginPath();
			g.moveTo(x0 - 0.5, y - 0.5);
			g.lineTo(x1, y - 0.5);
			g.stroke();
		}
		
		var sy0 = Get(grid.ys[grid.selected.minRow]);
		var sy1 = Get(grid.ys[grid.selected.maxRow + 1]);
		
		g.lineWidth = 1;
		g.strokeStyle = selectedStroke;
		
		g.beginPath();
		g.moveTo(x0 - 0.5, sy0 - 0.5);
		g.lineTo(x0 - 0.5, sy1);
		g.stroke();
		
		g.beginPath();
		g.moveTo(x1 - 0.5, sy0 - 0.5);
		g.lineTo(x1 - 0.5, sy1);
		g.stroke();
	}
	
	if (grid.selected.minCol > 0) // so that the selection indicator is not drawn on the title cell when a row label is selected
	{
		for (var i = grid.selected.minCol; i <= grid.selected.maxCol + 1; i++)
		{
			var x = Get(grid.xs[i]);
			g.lineWidth = 1;
			g.strokeStyle = selectedStroke;
			g.beginPath();
			g.moveTo(x - 0.5, y0 - 0.5);
			g.lineTo(x - 0.5, y1);
			g.stroke();
		}
		
		var sx0 = Get(grid.xs[grid.selected.minCol]);
		var sx1 = Get(grid.xs[grid.selected.maxCol + 1]);
		
		g.lineWidth = 1;
		g.strokeStyle = selectedStroke;
		
		g.beginPath();
		g.moveTo(sx0 - 0.5, y0 - 0.5);
		g.lineTo(sx1, y0 - 0.5);
		g.stroke();
		
		g.beginPath();
		g.moveTo(sx0 - 0.5, y1 - 0.5);
		g.lineTo(sx1, y1 - 0.5);
		g.stroke();
	}
	
	//for (var i = 0; i < grid.cells.length; i++)
	//{
	//	var cell = grid.cells[i];
	//	DrawBorder(cell);
	//}
	
	
	// draw scrollbars
	
	for (var i = 0; i < grid.scrollbars.length; i++)
	{
		grid.scrollbars[i].draw(grid.scrollbars[i]);
	}
	
	
	//if (grid.rightScrollbar)
	//{
	//	//DrawScrollbar(grid.rightScrollbar);
	//}
	//
	//if (grid.bottomScrollbar)
	//{
	//	var g = globals.g;
	//	g.strokeStyle = "rgb(158,182,206)";
	//	g.fillStyle = "rgb(128,128,128)";
	//	
	//	var left = Get(grid.cells[0].left) - 0.5;
	//	var top = Get(grid.cells[grid.cells.length - 1].bottom) + 0.5;
	//	var right = Get(grid.cells[grid.cells.length - 1].right) + 0.5;
	//	
	//	g.strokeRect(left + 1, top - 1, right - left - 2, 10);
	//	g.fillRect(left + 20 - 0.5, top - 0.5, 20, 9);
	//}
	
	// now calculate the active border coordinates (we could possible do this incrementally in response to events)

	// any container can have a 'selected' list
	
	// remove grid.hasSelected from everywhere
	
	//grid.selected = [];
	//grid.selected[0] = {};
	//grid.selected[0].mode = "Point"; // as opposed to Select
	//grid.selected[0].shimmer = true; // for Copy, ActivePoint, etc. (Copy and ActivePoint would have flashing borders)
	//grid.selected[0].color = "rgb(0,0,255)";
	//grid.selected[0].minColInclusive = 0;
	//grid.selected[0].maxColInclusive = 2;
	//grid.selected[0].minRowInclusive = 3;
	//grid.selected[0].maxRowInclusive = 3;
	
	for (var i = 0; i < grid.selected.length; i++)
	{
		var mode = grid.selected[i].mode;
		var color = grid.selected[i].color;
		var lf = Get(grid.xs[grid.selected[i].minCol]);
		var rt = Get(grid.xs[grid.selected[i].maxCol + 1]);
		var tp = Get(grid.ys[grid.selected[i].minRow]);
		var bt = Get(grid.ys[grid.selected[i].maxRow + 1]);
		
		if (lf && rt && tp && bt) // this is a legacy of always having a selected and setting it to null - we should just get rid of the selected object on defocus
		{
			if (mode == "Point")
			{
				DrawPointBorder(color, lf, tp, rt, bt);
			}
			else if (mode == "Select")
			{
				DrawActiveBorder(color, lf, tp, rt, bt);
			}
			else
			{
				throw new Error();
			}
		}
		
		if (grid.selected[i].shimmer)
		{
			
		}
	}
}

function ClickGrid(grid)
{
	if (globals.logging)
	{
		globals.log.push("ClickGrid " + grid["[id]"].toString());
	}
	
	var mx = Get(globals.mx);
	var my = Get(globals.my);
	
	if (grid.rowResizeIndex > -1 || grid.colResizeIndex > -1)
	{
		Pop("LD");
		Pop("LU");
		grid.rowResizeIndex = -1;
		grid.colResizeIndex = -1;
		document.getElementById("myCanvas").style.cursor = "default";
	}
	
	var x0 = Get(grid.xs[0]);
	var x1 = Get(grid.xs[1]);
	var y0 = Get(grid.ys[0]);
	var y1 = Get(grid.ys[1]);
	
	for (var i = 0; i < grid.nRows; i++)
	{	
		var y = grid.ys[i + 1];
		
		if (y - 1 <= my && my <= y + 1 && x0 < mx && mx < x1)
		{
			var prevY = y;
			
			document.getElementById("myCanvas").style.cursor = "row-resize";
			grid.rowResizeIndex = i;

			var BeginRowResize = function()
			{
				Push("MM", RowResize);
			};

			var RowResize = function()
			{
				var currY = Get(globals.my);
				grid.rowHeights[grid.rowResizeIndex] = Math.max(currY - prevY, 2); // this has to have subsequent effects on grid.ys (via react)
				grid.position(grid);
			};
			
			var EndRowResize = function()
			{
				Pop("MM");
				Pop("LD");
				Pop("LU");
			};
			
			Push("LD", BeginRowResize);
			Push("LU", EndRowResize);

			return;
		}
	}
	
	for (var j = 0; j < grid.nCols.length; j++)
	{	
		var x = grid.xs[j + 1];
		
		if (x - 1 <= mx && mx <= x + 1 && y0 < my && my < y1)
		{
			var prevX = x;
		
			document.getElementById("myCanvas").style.cursor = "col-resize";
			grid.colResizeIndex = j;
			
			var BeginColResize = function()
			{
				Push("MM", ColResize);
			};

			var ColResize = function()
			{
				var currX = Get(globals.mx);
				grid.colWidths[grid.colResizeIndex] = Math.max(currX - prevX, 2); // this has to have subsequent effects on grid.xs (via react)
				grid.position(grid);
			};
			
			var EndColResize = function()
			{
				Pop("MM");
				Pop("LD");
				Pop("LU");
			};
			
			Push("LD", BeginColResize);
			Push("LU", EndColResize);
			
			return;
		}
	}
		
	for (var i = 0; i < grid.cells.length; i++)
	{
		var cell = grid.cells[i];
		
		var target = cell.click(cell);
			
		if (target)
		{
			return target;
		}
	}
	
	for (var i = 0; i < grid.scrollbars.length; i++)
	{
		var scrollbar = grid.scrollbars[i];
		
		var target = scrollbar.click(scrollbar);
			
		if (target)
		{
			return target;
		}
	}
}

function OnFocusGrid(grid)
{
	if (globals.logging)
	{
		globals.log.push("OnFocusGrid " + grid["[id]"].toString());
	}
	
	globals.focussed = grid;
	
	grid.focusSelected = grid.selected[0]; // does this always work?
	
	//grid.cursor.row = 0;
	//grid.cursor.col = 0;
	//grid.anchor.row = 0;
	//grid.anchor.col = 0;
	//grid.focusSelected.minRow = 0;
	//grid.focusSelected.maxRow = 0;
	//grid.focusSelected.minCol = 0;
	//grid.focusSelected.maxCol = 0;
	
	Push("Up", MoveActiveUp);
	Push("Down", MoveActiveDown);
	Push("Enter", MoveActiveDown);
	Push("Right", MoveActiveRight);
	Push("Left", MoveActiveLeft);
	Push("Shift+Up", ExtendSelectionUp);
	Push("Shift+Down", ExtendSelectionDown);
	Push("Shift+Right", ExtendSelectionRight);
	Push("Shift+Left", ExtendSelectionLeft);
	Push("Ctrl+Up", MoveActiveAllTheWayUp);
	Push("Ctrl+Down", MoveActiveAllTheWayDown);
	Push("Ctrl+Right", MoveActiveAllTheWayRight);
	Push("Ctrl+Left", MoveActiveAllTheWayLeft);
	Push("Shift+Ctrl+Up", ExtendSelectionAllTheWayUp);
	Push("Shift+Ctrl+Down", ExtendSelectionAllTheWayDown);
	Push("Shift+Ctrl+Right", ExtendSelectionAllTheWayRight);
	Push("Shift+Ctrl+Left", ExtendSelectionAllTheWayLeft);
	Push("Ctrl+Space", SelectWholeCol);
	Push("Shift+Space", SelectWholeRow);
	Push("Shift+Ctrl+Space", SelectWholeGrid);
	
	//Push("Alt+H+I+I", InsertCells); // pop-up box with radio buttons for shift direction - r[i]ght, [d]own, [r]ow, [c]ol
	//Push("Alt+H+I+R", InsertRows);
	//Push("Alt+H+I+C", InsertCols);
	//Push("Alt+H+I+S", InsertSheet);
	//Push("Alt+H+D+I", DeleteCells); // pop-up box with radio buttons for shift direction - r[i]ght, [d]own, [r]ow, [c]ol
	//Push("Alt+H+D+R", DeleteRows);
	//Push("Alt+H+D+C", DeleteCols);
	//Push("Alt+H+D+S", DeleteSheet);
	//Push("Alt+H+O+H", ChangeRowHeight); // excel uses a pop-up box here
	//Push("Alt+H+O+A", AutofitRowHeight);
	//Push("Alt+H+O+W", ChangeColWidth); // excel uses a pop-up box here
	//Push("Alt+H+O+I", AutofitColWidth);
	//Push("Alt+H+O+D", DefaultWidth);
	//Push("Alt+H+S+S", SortAZ);
	//Push("Alt+H+S+O", SortZA);
	//Push("Alt+H+S+U", SortCustom);
	//Push("Alt+H+S+F", Filter);
	//Push("Alt+H+S+C", Clear); // never used this
	//Push("Alt+H+S+Y", Reapply); // never used this
	
	//Push("Alt+H+O+R", RenameSheet); // wait, rename can be used for objs and fields too - we could repurpose 'Insert' as the rename button
	//Push("Insert", Rename);
}

function DeFocusGrid(grid)
{
	if (globals.logging)
	{
		globals.log.push("DeFocusGrid " + grid["[id]"].toString());
	}
	
	globals.focussed = null;
	
	grid.focusSelected = null;
	grid.selected[0].minCol = null;
	grid.selected[0].maxCol = null;
	grid.selected[0].minRow = null;
	grid.selected[0].maxRow = null;
	
	Pop("Up");
	Pop("Down");
	Pop("Enter");
	Pop("Right");
	Pop("Left");
	Pop("Shift+Up");
	Pop("Shift+Down");
	Pop("Shift+Right");
	Pop("Shift+Left");
	Pop("Ctrl+Up");
	Pop("Ctrl+Down");
	Pop("Ctrl+Right");
	Pop("Ctrl+Left");
	Pop("Shift+Ctrl+Up");
	Pop("Shift+Ctrl+Down");
	Pop("Shift+Ctrl+Right");
	Pop("Shift+Ctrl+Left");
	Pop("Ctrl+Space");
	Pop("Shift+Space");
	Pop("Shift+Ctrl+Space");
}

function OnEditGrid(grid)
{
    Push("Enter", AcceptEditWithEnter);
	Push("Tab", AcceptEditAndMoveRight);
    Push("Esc", RejectEdit);
}

function DeEditGrid(grid)
{
    Pop("Enter");
	Pop("Tab");
    Pop("Esc");
}

function ToggleTraceGridMode()
{
	if (globals.traceGridMode)
	{
		globals.canvas.buttons["ToggleTraceGridModeButton"].version = 0;
		ExitTraceGridMode();
		globals.traceGridMode = false;
	}
	else
	{
		globals.canvas.buttons["ToggleTraceGridModeButton"].version = 2;
		EnterTraceGridMode();
		globals.traceGridMode = true;
	}
}

function EnterTraceGridMode()
{
	PushUnder("LD", BeginTraceGrid);
}

function ExitTraceGridMode()
{
	Pop("LD");
	Pop("LU");
}

function BeginTraceGrid()
{
	var origX = Get(globals.mx);
	var origY = Get(globals.my);
	
	//globals.log.push(origX.toString() + "  " + origY.toString());
	
	//var defaultName = "Grid" + globals.id.toString(); // not necessarily part of globals.canvas - could be part of a sub-frame
	//var ptr = MakeObj(globals.canvas, defaultName); // not necessarily part of globals.canvas - could be part of a sub-frame
	//globals.canvas[defaultName] = ptr;
	//
	//ptr.draw = DrawContent;
	//ptr.click = ClickContent;
	//ptr.content = null;
	
	var defaultName = "Grid" + (globals.objcounts.grid++).toString(); // not necessarily part of globals.canvas - could be part of a sub-frame
	var grid = MakeObj(globals.canvas, defaultName);
	globals.canvas[defaultName] = grid;
	
	var defaultObjName = "Obj" + globals.id.toString(); // not necessarily part of globals.canvas - could be part of a sub-frame
	var slot = MakeSlot(globals.canvas, defaultObjName, null);
	globals.canvas[defaultObjName] = slot;
	
	var TraceGrid = function()
	{
		var currX = Get(globals.mx);
		var currY = Get(globals.my);
		
		//globals.log.push(currX.toString() + "  " + currY.toString());
		
		var lf = Math.min(origX, currX);
		var rg = Math.max(origX, currX);
		var tp = Math.min(origY, currY);
		var bt = Math.max(origY, currY);
		
		var wd = rg - lf;
		var hg = bt - tp;
		
		var cols = Math.max(2, Math.floor(wd / 64));
		var rows = Math.max(2, Math.floor(hg / 20));
		
		if (grid.obj) // obj is arbitrary - we just want to see if we have added fields to the grid yet
		{
			if (cols == grid.nCols && rows == grid.nRows)
			{
				return; // so that we only regenerate and redraw if we add/subtract a row or col
			}
		}
		
		//if (ptr.content)
		//{
		//	if (cols == ptr.content.nCols && rows == ptr.content.nRows)
		//	{
		//		return; // so that we only regenerate and redraw if we add/subtract a row or col
		//	}
		//}
		
		//globals.log.push("cols: " + cols.toString() + " rows: " + rows.toString());
		
		//var grid = MakeObj(ptr, "content");
		//ptr.content = grid;
		
		slot["[obj]"] = Empties(slot, "[obj]", cols - 1, rows - 1);
		slot["[obj]"]["[type]"] = "Collection";
		
		DisplayGrid(grid);
		grid.obj = slot;
		grid.rowsAre = "objs";
		RedisplayGrid(grid);
		MoveBox(grid, "top", "height", tp);
		MoveBox(grid, "left", "width", lf);
		grid.position(grid);
		globals.redraw = true;
	};
	
	Push("LU", EndTraceGrid);
	Push("Esc", EndTraceGrid); // a safety valve for when a mouseup event is dropped and we're stuck in tracegrid mode
	Push("MM", TraceGrid);
}

function EndTraceGrid()
{
	Pop("LU");
	Pop("Esc");
	Pop("MM");
}

function Empties(parent, name, cols, rows)
{
	var data = MakeList(parent, name);
	
	for (var i = 0; i < rows; i++)
	{
		var objslot = MakeSlot(data, i.toString());
		var obj = MakeObj(objslot, "[obj]");
		objslot["[obj]"] = obj;
		data[i] = objslot;
		
		for (var j = 0; j < cols; j++)
		{
			var fieldname = ToLetter(j);
			var fieldslot = MakeSlot(obj, fieldname, null);
			obj[fieldname] = fieldslot;
		}
	}
	
	return data;
}

function EnumLetters(n)
{
	var l = new Array(n);
	
	for (var i = 0; i < n; i++)
	{
		l[i] = ToLetter(i);
	}
	
	return l;
}

function Enum(n)
{
	var l = new Array(n);
	
	for (var i = 0; i < n; i++)
	{
		l[i] = i.toString();
	}
	
	return l;
}

function ToLetter(n)
{
	return String.fromCharCode(n + 65);
}


function MoveActiveUp() // Up
{
	var grid = globals.focussed;
	
	if (grid.cursor.row > 0)
	{
		grid.cursor.row--;
		SelectNewActive(grid);
	}
}

function MoveActiveDown() // Down
{
	var grid = globals.focussed;
	
	if (grid.cursor.row < grid.nRows - 1)
	{
		grid.cursor.row++;
		SelectNewActive(grid);
	}
}

function MoveActiveRight() // Right
{
	var grid = globals.focussed;
	
	if (grid.cursor.col < grid.nCols - 1)
	{
		grid.cursor.col++;
		SelectNewActive(grid);
	}
}

function MoveActiveLeft() // Left
{
	var grid = globals.focussed;
	
	if (grid.cursor.col > 0)
	{
		grid.cursor.col--;
		SelectNewActive(grid);
	}
}

function MoveActiveAllTheWayUp() // Ctrl+Up
{
	var grid = globals.focussed;
	
	grid.cursor.row = 0;
	SelectNewActive(grid);
}

function MoveActiveAllTheWayDown() // Ctrl+Down
{
	var grid = globals.focussed;
	
	grid.cursor.row = grid.nRows - 1;
	SelectNewActive(grid);
}

function MoveActiveAllTheWayRight() // Ctrl+Right
{
	var grid = globals.focussed;
	
	grid.cursor.col = grid.nCols - 1;
	SelectNewActive(grid);
}

function MoveActiveAllTheWayLeft() // Ctrl+Left
{
	var grid = globals.focussed;
	
	grid.cursor.col = 0;
	SelectNewActive(grid);
}

function ExtendSelectionUp() // Shift+Up
{
	var grid = globals.focussed;
	
	if (grid.cursor.row > 0)
	{
		grid.cursor.row--;
		SelectRange();
	}
}

function ExtendSelectionDown() // Shift+Down
{
	var grid = globals.focussed;
	
	if (grid.cursor.row < grid.nRows - 1)
	{
		grid.cursor.row++;
		SelectRange();
	}
}

function ExtendSelectionRight() // Shift+Right
{
	var grid = globals.focussed;
	
	if (grid.cursor.col < grid.nCols - 1)
	{
		grid.cursor.col++;
		SelectRange();
	}
}

function ExtendSelectionLeft() // Shift+Left
{
	var grid = globals.focussed;
	
	if (grid.cursor.col > 0)
	{
		grid.cursor.col--;
		SelectRange();
	}
}

function ExtendSelectionAllTheWayUp() // Ctrl+Shift+Up
{
	var grid = globals.focussed;
	
	grid.cursor.row = 0;
	SelectRange();
}

function ExtendSelectionAllTheWayDown() // Ctrl+Shift+Down
{
	var grid = globals.focussed;
	
	grid.cursor.row = grid.nRows - 1;
	SelectRange();
}

function ExtendSelectionAllTheWayRight() // Ctrl+Shift+Right
{
	var grid = globals.focussed;
	
	grid.cursor.col = grid.nCols - 1;
	SelectRange();
}

function ExtendSelectionAllTheWayLeft() // Ctrl+Shift+Left
{
	var grid = globals.focussed;
	var selected = grid.focusSelected;
	
	grid.cursor.col = 0;
	SelectRange();
}

function SelectWholeCol() // Ctrl+Spacebar
{
	var grid = globals.focussed;
	var selected = grid.focusSelected;
	
	selected.minRow = 0;
	selected.maxRow = grid.nRows - 1;
	
	globals.redraw = true;
}

function SelectWholeRow() // Shift+Spacebar
{
	var grid = globals.focussed;
	var selected = grid.focusSelected;
	
	selected.minCol = 0;
	selected.maxCol = grid.nCols - 1;
	
	globals.redraw = true;
}

function SelectWholeGrid() // Shift+Ctrl+Spacebar (this is different than Excel)
{
	var grid = globals.focussed;
	var selected = grid.focusSelected;
	
	selected.minRow = 0;
	selected.maxRow = grid.nRows - 1;
	selected.minCol = 0;
	selected.maxCol = grid.nCols - 1;
	
	globals.redraw = true;
}

function SelectNewActive(grid)
{
	grid.anchor.row = grid.cursor.row;
	grid.anchor.col = grid.cursor.col;
	
	SelectThis(grid.cells[grid.cursor.col * grid.nRows + grid.cursor.row]);
	
	grid.selected[0].minCol = grid.cursor.col;
	grid.selected[0].maxCol = grid.cursor.col;
	grid.selected[0].minRow = grid.cursor.row;
	grid.selected[0].maxRow = grid.cursor.row;
	
	globals.redraw = true;
}

function SelectRange()
{
	// notice how fantastically general, available, and yet non-polluting globals.focussed.anchor/cursor are - could be a grid, textbox, anything.  anchor and cursor could be anything.
	
	var selected = globals.focussed.focusSelected;
	
	selected.minCol = Math.min(globals.focussed.anchor.col, globals.focussed.cursor.col);
	selected.maxCol = Math.max(globals.focussed.anchor.col, globals.focussed.cursor.col);
	selected.minRow = Math.min(globals.focussed.anchor.row, globals.focussed.cursor.row);
	selected.maxRow = Math.max(globals.focussed.anchor.row, globals.focussed.cursor.row);
	
	globals.redraw = true;
}

function InsertRow()
{
	// to generalize:
	// activeDim
	// pasiveDim
	// insertBef
	// insertAft
	
	// insertingFie
	// insertingObj
	// insertingRow
	// insertingCol
	
	// things that are fixed:
	// obj->objs->fields
	// cells->col->row
	
	var grid = globals.focussed;
	var row = grid.cursor.row;
	var col = grid.cursor.col;
	
	// we update both the grid objects and the grid in parallel
	
	var data = Get(grid.obj);
	
	if (grid.rowsAre == "objs")
	{
		// add a new object with the same complement of fields
		
		var newname = (row - 1).toString();
		var newslot = MakeSlot(data, newname, null);
		var newobj = MakeObj(newslot, "[obj]");
		newslot["[obj]"] = newobj;
		
		for (var k = 0; k < grid.fields.length; k++)
		{
			newobj[grid.fields[k]] = MakeSlot(newobj, grid.fields[k], null);
		}
		
		var newobjnameslot = MakeSlot(grid.objnameslots, newname, newname);
		
		var focus = row;
		
		while (data[focus.toString()]) // see how far the name conflicts go
		{
			focus++;
		}
		
		var conflict = newname;
		
		for (var k = 0; k < grid.objs.length; k++)
		{
			if (grid.objs[k] == conflict)
			{
				var n = parseInt(grid.objs[k]);
				grid.objs[k] = (n + 1).toString();
				conflict = (n + 1).toString();
			}
		}

		for (var k = focus; k >= row; k--)
		{
			data[k.toString()] = data[(k - 1).toString()]; // are the obj slots being re-[name]-d too?  that maybe should be added here
		}
		
		data[newname] = newslot;
		InsertAt(newobjnameslot, grid.objnameslots, row - 1); // change other objnameslot [name]'s below
		InsertAt(newname, grid.objs, row - 1);
		
		for (var k = grid.fields.length - 1; k >= 0; k--) // reversed so that earlier InsertAt's don't interfere with later ones
		{
			var index = (k + 1) * grid.nRows + row;
			var cell = MakeCell(grid.cells, index.toString());
			SetCellSlot(cell, Get(data[newname])[grid.fields[k]]);
			cell.fill = grid.cells[index].fill;
			cell.stroke = grid.cells[index].stroke;
			cell.container = grid;
			cell.row = row;
			cell.col = (k + 1);
			InsertAt(cell, grid.cells, index); // other cells' [name] changed below
		}
		
		var labelcell = MakeCell(grid.cells, row.toString());
		SetCellSlot(labelcell, newobjnameslot);
		labelcell.fill = grid.cells[row].fill;
		labelcell.stroke = grid.cells[row].stroke;
		labelcell.container = grid;
		labelcell.row = row;
		labelcell.col = 0;
		InsertAt(labelcell, grid.cells, row); // other cells' [name] changed below
	}
	else
	{
		//// add a new field to each object
		//
		//grid.fields = EnumLetter(grid.fields.length + 1); // regenerate the fields as a whole - use EnumLetter if appropriate
		//grid.rows = grid.fields;
		//
		//for (var j = 0; j < grid.objs.length; j++)
		//{
		//	for (var k = grid.fields.length - 1; k > row; k--)
		//	{
		//		data[grid.objs[j]][grid.fields[k]] = data[grid.objs[j]][grid.fields[k - 1]]; // copy the existing fields to a one-greater index
		//	}
		//}
		//
		//for (var k = grid.rowLabelCells.length - 1; k >= row; k--)
		//{
		//	var cell = grid.rowLabelCells[k];
		//	Set(cell.slot, grid.fields[k + 1]);
		//	cell.redisplay(cell);
		//}
		//
		//for (var j = 0; j < grid.objs.length; j++)
		//{
		//	data[grid.objs[j]][grid.fields[row]] = MakeSlot(data[grid.objs[j]], grid.fields[row], null); // and finally add a new field to each object
		//}
		//
		//for (var j = grid.objs.length - 1; j >= 0; j--) // reversed so that earlier InsertAt's don't interfere with later ones
		//{
		//	var index = j * grid.nRows + row;
		//	var cell = MakeCell(grid.cells, index.toString());
		//	InsertAt(cell, grid.cells, index); // other cells' [name] changed below
		//	
		//	cell.slot = data[grid.objs[j]][grid.fields[row]];
		//	
		//	cell.stroke = grid.cells[index].stroke;
		//	cell.container = grid;
		//	cell.row = row;
		//	cell.col = j;
		//}
	}

	InsertAt(grid.rowHeights[row], grid.rowHeights, row);
	
	grid.nRows++;

	var sum = 0;
	
	grid.ys = MakeList(grid, "ys");
	var ySlot = MakeSlot(grid.ys, "0", sum);
	grid.ys.push(ySlot);
	
	for (var i = 0; i < grid.rowHeights.length; i++)
	{
		sum += grid.rowHeights[i];
		ySlot = MakeSlot(grid.ys, (i + 1).toString(), sum);
		grid.ys.push(ySlot);
	}
	
	// rename all objnameslots
	for (var i = 0; i < grid.objnameslots.length; i++)
	{
		grid.objnameslots[i]["[obj]"] = grid.objs[i];
		grid.objnameslots[i]["[name]"] = i.toString();
	}
	
	var c = 0;
	
	// rename and renumber all cells
	for (var j = 0; j < grid.nCols; j++)
	{
		for (var i = 0; i < grid.nRows; i++)
		{
			grid.cells[c].row = i;
			grid.cells[c].col = j;
			grid.cells[c]["[name]"] = c.toString();
			grid.cells[c].redisplay(grid.cells[c]);
			c++;
		}
	}
	
	//SelectThis?
	globals.selected = grid.cells[col * grid.nRows + row];
	
	grid.position(grid);
	
	globals.redraw = true;
}

function DeleteRow()
{

}

function InsertCol()
{

}

function DeleteCol()
{

}

function Swap()
{

}


function Event(code)
{
	if (code == "Shift" || code == "Ctrl" || code == "Alt" || code == "-Shift" || code == "-Ctrl" || code == "-Alt")
	{
	
	}
	else
	{
		if (globals.alt)
		{
			code = "Alt+" + code;
		}
		
		if (globals.ctrl)
		{
			code = "Ctrl+" + code;
		}
		
		if (globals.shift)
		{
			code = "Shift+" + code;
		}
	}
	
	if (code != "MM")
	{
		if (globals.addToLog)
		{
			globals.log.push(code);
		}
	}
	
	globals.event = code; // this is used by AddChar
	
	var actionStack = globals.actions[code];
	
	if (actionStack && actionStack.length > 0)
	{
		var fn = actionStack[actionStack.length - 1];
		fn();
	}
	
	//globals.redraw = true;
}

function KeyDown(e)
{
	var code = globals.keyValueToCode[e.keyCode];
	
	if (code)
	{
		Event(code);
		e.preventDefault();
	}
}

function KeyUp(e)
{
	var code = globals.keyValueToCode[e.keyCode];
	
	if (code)
	{
		Event("-" + code);
		e.preventDefault();
	}
}

function MouseDown(e)
{
	MoveGap(e);
	
	if (e.button == 0)
	{
		Event("LD");
	}
	else if (e.button == 2)
	{
		Event("RD");
	}
	else
	{
		throw new Error();
	}
	
	e.preventDefault(); // this stops the browser from capturing the event
}

function MouseUp(e)
{
	MoveGap(e);
	
	if (e.button == 0)
	{
		Event("LU");
	}
	else if (e.button == 2)
	{
		Event("RU");
	}
	else
	{
		throw new Error();
	}
	
	e.preventDefault();
}

function MouseMove(e)
{
	//Set(globals.mx, e.x + window.scrollX - globals.canvasLeft);
	//Set(globals.my, e.y + window.scrollY - globals.canvasTop);
	
	//globals.mx["[obj]"] = e.x + window.scrollX - globals.canvasLeft;
	//globals.my["[obj]"] = e.y + window.scrollY - globals.canvasTop;
	
	globals.mx["[obj]"] = e.clientX + window.scrollX - globals.canvasLeft;
	globals.my["[obj]"] = e.clientY + window.scrollY - globals.canvasTop;
	
	Event("MM");
	e.preventDefault();
}

function MoveGap(e)
{
    if (e.clientX + window.scrollX - globals.canvasLeft != Get(globals.mx) || e.clientY + window.scrollY - globals.canvasTop != Get(globals.my))
    {
		//Set(globals.mx, e.x + window.scrollX - globals.canvasLeft);
		//Set(globals.my, e.y + window.scrollY - globals.canvasTop);
		
		globals.mx["[obj]"] = e.clientX + window.scrollX - globals.canvasLeft;
		globals.my["[obj]"] = e.clientY + window.scrollY - globals.canvasTop;
	
        Event("MM");
    }
}

function MouseWheel(e)
{
	globals.delta = e.wheelDelta / 120;
	Event("MW");
	e.preventDefault(); // this stops the browser from capturing the event
}


function CheckHover()
{
	var shape = Click();
	
	if (shape)
	{
		if (shape != globals.hovered)
		{
			if (globals.hovered && globals.hovered.dehover)
			{
				globals.hovered.dehover(globals.hovered);
			}
			
			globals.hovered = shape;
			
			if (shape.onhover)
			{
				shape.onhover(shape);
			}
		}
	}
	else
	{
		if (globals.hovered)
		{
			if (globals.hovered.dehover)
			{
				globals.hovered.dehover(globals.hovered);
				globals.hovered = null; // this is duplicated for a good reason - leave it
			}
			
			globals.hovered = null; // this is duplicated for a good reason - leave it
			
			// if we want to implement click-blank-space-to-deselect, we could hover the canvas here, and have canvas.onhover do a Push("LD", Deselect)
		}
	}
}

function Push(eventStr, fn)
{
	if (globals.addToLog)
	{
		globals.log.push("Push " + eventStr + " " + fn.name);
	}
	
	if (!globals.actions[eventStr])
	{
		globals.actions[eventStr] = [];
	}
	
	globals.actions[eventStr].push(fn);
}

function Pop(eventStr)
{
	var fn = globals.actions[eventStr].pop();
	
	if (globals.addToLog)
	{
		globals.log.push("Pop " + eventStr + " " + fn.name);
	}
}

function PushAlpha(fn)
{
	Push("0", fn);
	Push("1", fn);
	Push("2", fn);
	Push("3", fn);
	Push("4", fn);
	Push("5", fn);
	Push("6", fn);
	Push("7", fn);
	Push("8", fn);
	Push("9", fn);
	Push("A", fn);
	Push("B", fn);
	Push("C", fn);
	Push("D", fn);
	Push("E", fn);
	Push("F", fn);
	Push("G", fn);
	Push("H", fn);
	Push("I", fn);
	Push("J", fn);
	Push("K", fn);
	Push("L", fn);
	Push("M", fn);
	Push("N", fn);
	Push("O", fn);
	Push("P", fn);
	Push("Q", fn);
	Push("R", fn);
	Push("S", fn);
	Push("T", fn);
	Push("U", fn);
	Push("V", fn);
	Push("W", fn);
	Push("X", fn);
	Push("Y", fn);
	Push("Z", fn);
	Push("Shift+0", fn);
	Push("Shift+1", fn);
	Push("Shift+2", fn);
	Push("Shift+3", fn);
	Push("Shift+4", fn);
	Push("Shift+5", fn);
	Push("Shift+6", fn);
	Push("Shift+7", fn);
	Push("Shift+8", fn);
	Push("Shift+9", fn);
	Push("Shift+A", fn);
	Push("Shift+B", fn);
	Push("Shift+C", fn);
	Push("Shift+D", fn);
	Push("Shift+E", fn);
	Push("Shift+F", fn);
	Push("Shift+G", fn);
	Push("Shift+H", fn);
	Push("Shift+I", fn);
	Push("Shift+J", fn);
	Push("Shift+K", fn);
	Push("Shift+L", fn);
	Push("Shift+M", fn);
	Push("Shift+N", fn);
	Push("Shift+O", fn);
	Push("Shift+P", fn);
	Push("Shift+Q", fn);
	Push("Shift+R", fn);
	Push("Shift+S", fn);
	Push("Shift+T", fn);
	Push("Shift+U", fn);
	Push("Shift+V", fn);
	Push("Shift+W", fn);
	Push("Shift+X", fn);
	Push("Shift+Y", fn);
	Push("Shift+Z", fn);
	Push(";:", fn);
    Push("=+", fn);
    Push(",<", fn);
    Push("-_", fn);
    Push(".>", fn);
    Push("/?", fn);
    Push("`~", fn);
    Push("[{", fn);
    Push("\\|", fn);
    Push("]}", fn);
    Push("'\"", fn);
	Push("Shift+;:", fn);
    Push("Shift+=+", fn);
    Push("Shift+,<", fn);
    Push("Shift+-_", fn);
    Push("Shift+.>", fn);
    Push("Shift+/?", fn);
    Push("Shift+`~", fn);
    Push("Shift+[{", fn);
    Push("Shift+\\|", fn);
    Push("Shift+]}", fn);
    Push("Shift+'\"", fn);
}

function PopAlpha(fn)
{
	Pop("0");
	Pop("1");
	Pop("2");
	Pop("3");
	Pop("4");
	Pop("5");
	Pop("6");
	Pop("7");
	Pop("8");
	Pop("9");
	Pop("A");
	Pop("B");
	Pop("C");
	Pop("D");
	Pop("E");
	Pop("F");
	Pop("G");
	Pop("H");
	Pop("I");
	Pop("J");
	Pop("K");
	Pop("L");
	Pop("M");
	Pop("N");
	Pop("O");
	Pop("P");
	Pop("Q");
	Pop("R");
	Pop("S");
	Pop("T");
	Pop("U");
	Pop("V");
	Pop("W");
	Pop("X");
	Pop("Y");
	Pop("Z");
	Pop("Shift+0");
	Pop("Shift+1");
	Pop("Shift+2");
	Pop("Shift+3");
	Pop("Shift+4");
	Pop("Shift+5");
	Pop("Shift+6");
	Pop("Shift+7");
	Pop("Shift+8");
	Pop("Shift+9");
	Pop("Shift+A");
	Pop("Shift+B");
	Pop("Shift+C");
	Pop("Shift+D");
	Pop("Shift+E");
	Pop("Shift+F");
	Pop("Shift+G");
	Pop("Shift+H");
	Pop("Shift+I");
	Pop("Shift+J");
	Pop("Shift+K");
	Pop("Shift+L");
	Pop("Shift+M");
	Pop("Shift+N");
	Pop("Shift+O");
	Pop("Shift+P");
	Pop("Shift+Q");
	Pop("Shift+R");
	Pop("Shift+S");
	Pop("Shift+T");
	Pop("Shift+U");
	Pop("Shift+V");
	Pop("Shift+W");
	Pop("Shift+X");
	Pop("Shift+Y");
	Pop("Shift+Z");
	Pop(";:");
    Pop("=+");
    Pop(",<");
    Pop("-_");
    Pop(".>");
    Pop("/?");
    Pop("`~");
    Pop("[{");
    Pop("\\|");
    Pop("]}");
    Pop("'\"");
	Pop("Shift+;:");
    Pop("Shift+=+");
    Pop("Shift+,<");
    Pop("Shift+-_");
    Pop("Shift+.>");
    Pop("Shift+/?");
    Pop("Shift+`~");
    Pop("Shift+[{");
    Pop("Shift+\\|");
    Pop("Shift+]}");
    Pop("Shift+'\"");
}

function PushUnder(eventStr, fn) // does not work for cursor stack any more
{
	var stack = globals.actions[eventStr];
	stack.push(stack[stack.length - 1]);
	stack[stack.length - 2] = fn;
}

function PopUnder(eventStr) // does not work for cursor stack any more
{
	var stack = globals.actions[eventStr];
	stack[stack.length - 2] = stack[stack.length - 1];
	stack.pop();
}

function PushCursor(cursor)
{
	globals.cursorStack.push(cursor);
	document.getElementById("myCanvas").style.cursor = cursor;
}

function PopCursor()
{
	globals.cursorStack.pop();
	document.getElementById("myCanvas").style.cursor = globals.cursorStack[globals.cursorStack.length - 1];
}

function ShiftOn()
{
	globals.shift = true;
}

function ShiftOff()
{
	globals.shift = false;
}

function CtrlOn()
{
	globals.ctrl = true;
}

function CtrlOff()
{
	globals.ctrl = false;
}

function AltOn()
{
	globals.alt = true;
}

function AltOff()
{
	globals.alt = false;
}


function MakeIndentree(parent, name)
{
	var tree = MakeObj(parent, name);
	tree.contents = MakeList(tree, "contents");
	tree.twigs = MakeList(tree, "twigs");
	tree.indents = MakeList(tree, "indents");
	tree.root = null;
	tree.obj = null;
	tree.budField = null;
	tree.childrenField = null;
	tree.position = PositionIndentree;
	tree.draw = DrawIndentree;
	tree.click = ClickContents;
	tree.onfocus = OnFocusTree;
	tree.defocus = DeFocusTree;
	tree.editActive = EditSelectedSetTreeShape;
	
	tree.gap = MakeSlot(tree, "gap", 0);
	tree.indentStep = MakeSlot(tree, "indentStep", 10);
	
	return tree;
}

function MakeIndentreeTwig(tree, parentTwig, data)
{
	var twig = MakeObj(tree.twigs, tree.twigs.length.toString()); // when children are inserted, the [parent] and [name] fields will be overwritten by a call to GenerateContents(tree)

	twig.data = data;
	
	// for right now, twig.contents is always a cell - in the future, this need not be so
	
	// for an indentree, we want the twig to be a namecell/datacell pair
	twig.contents = DisplaySlotAsCell(twig, "contents", data[tree.budField]);
	
	var cell = twig.contents;

	cell.container = tree; // order matters - cell.redisplay(cell) must be after this - RedisplayGramCell depends on the container
	
	cell.redisplay = RedisplayCellString;
	cell.redisplay(cell);
	
	twig.parent = parentTwig;
	twig.children = MakeList(twig, "children");
	
	var objChildren = data[tree.childrenField]; // objChildren must be a list
	
	for (var i = 0; i < objChildren.length; i++)
	{
		var child = MakeIndentreeTwig(tree, twig, objChildren[i]);
		twig.children.push(child);
	}
	
	return twig;
}

function GenerateIndentreeTwigs(tree)
{
	tree.root = MakeIndentreeTwig(tree, null, tree.obj);

	GenerateContents(tree);
}

function PositionIndentree(tree)
{
	var top = Get(tree.root.contents.top);
	var left = Get(tree.root.contents.left);
	
	var indentStep = Get(tree.indentStep);
	var gap = Get(tree.gap);
	
	for (var i = 0; i < tree.contents.length; i++)
	{
		var sub = tree.contents[i];
		var indent = tree.indents[i];

		// we assume height is already set.  and width doesn't really matter here
		MoveBox(sub, "top", "height", top);
		MoveBox(sub, "left", "width", left + indent * indentStep);
		
		top += Get(sub.height);
		top += gap;
		
		sub.position(sub);
	}
}

function DrawIndentree(tree)
{
	for (var i = 0; i < tree.contents.length; i++)
	{
		var sub = tree.contents[i];
		
		if (sub.draw)
		{
			sub.draw(sub);
		}
	}
	
	for (var i = 0; i < tree.contents.length; i++)
	{
		var sub = tree.contents[i];
		DrawBorder(sub);
	}
	
	//if (tree.activeContent)
	//{
	//	var sub = tree.activeContent;
	//	DrawActiveBorder(Get(sub.left), Get(sub.top), Get(sub.right), Get(sub.bottom)); // this assumes just a cell, not a name-data cell pair - so it needs to change
	//}
}

function TogglePlaceIndentreeMode()
{
	if (globals.placeIndentreeMode)
	{
		globals.canvas.buttons["TogglePlaceIndentreeModeButton"].version = 0;
		ExitPlaceIndentreeMode();
		globals.placeIndentreeMode = false;
	}
	else
	{
		globals.canvas.buttons["TogglePlaceIndentreeModeButton"].version = 2;
		EnterPlaceIndentreeMode();
		globals.placeIndentreeMode = true;
	}
}

function EnterPlaceIndentreeMode()
{
	PushUnder("LD", PlaceIndentree);
}

function ExitPlaceIndentreeMode()
{
	PopUnder("LD");
}

function PlaceIndentree()
{
	var defaultObjName = "Obj" + globals.id.toString();
	var obj = MakeSlot(globals.canvas, defaultObjName, "");
	globals.canvas[defaultObjName] = obj;
	
	var defaultTreeName = "Tree" + (globals.objcounts.tree++).toString();
	var tree = MakeIndentree(globals.canvas, defaultTreeName);
	globals.canvas[defaultTreeName] = tree;
	
	// i don't like the idea of a bud.  i think the cell should display the obj - any value should be displayable
	
	obj.bud = MakeSlot(obj, "bud", "foo");
	obj.children = MakeList(obj, "children");
	
	tree.makeTwig = MakeIndentreeTwig;
	
	tree.obj = obj;
	tree.budField = "bud";
	tree.childrenField = "children";
	GenerateIndentreeTwigs(tree);
	
	MoveBox(tree.root.contents, "cx", "width", Get(globals.mx));
	MoveBox(tree.root.contents, "cy", "height", Get(globals.my));
	
	tree.position(tree);
	
	globals.redraw = true;
}


function Calculate()
{
	var round = 0;
	
	while (globals.queue.length > 0)
	{
		if (round == 10)
		{
			throw new Error();
		}
		
		globals.blankingMode = false;
		
		for (var i = 0; i < globals.queue.length; i++)
		{
			if (globals.queue[i].contents.state == State.Blanking)
			{
				globals.blankingMode = true;
			}
		}
		
		for (var i = 0; i < globals.queue.length; i++)
		{
			var cogNode = globals.queue[i];
			
			if (cogNode["[type]"] == "Cell")
			{
				cogNode.redisplay(cogNode);
				cogNode.position(cogNode);
				cogNode.inQueue = false;
			}
			else
			{
				var cog = cogNode.contents;
				cog.newState = null;
				cog.act(cog);
				cogNode.inQueue = false;
			}
		}
		
		for (var i = 0; i < globals.queue.length; i++)
		{
			var cogNode = globals.queue[i];
			var cog = cogNode.contents;
			
			// first limit changes 
			if (cog.newState != null)
			{
				// if the cog changes state, put its neighbors in the queue (if they are not already there)
				if (cog.state != cog.newState)
				{
					// push the cog itself, if its state changed
					if (!cogNode.inQueue)
					{
						cogNode.inQueue = true;
						globals.newqueue.push(cogNode);
					}
						
					AddNeighborsToQueue(cogNode, globals.newqueue);
				}
			
				// we change all states *after* all the cogs have acted, to preserve sync
				cog.state = cog.newState;
				cog.newState = null;
			}
		}
		
		globals.queue = globals.newqueue;
		globals.newqueue = [];
		
		round++;
	}
}

function AddNeighborsToQueue(node, queue)
{
	for (var k = 0; k < node.ins.length; k++)
	{
		var neighbor = node.ins[k].src;
		
		if (!neighbor.inQueue)
		{
			neighbor.inQueue = true;
			queue.push(neighbor);
		}
	}
	
	for (var k = 0; k < node.ous.length; k++)
	{
		var neighbor = node.ous[k].dst;
		
		if (!neighbor.inQueue)
		{
			neighbor.inQueue = true;
			queue.push(neighbor);
		}
	}
}

function MakeSlot(parent, name, value)
{
	var cog = MakeObj(parent, name);
	cog.type = Machine.Slot;
	
	// this used to be cog.state = State.Inactive - does this break anything?
	if (value != null)
	{
		cog.state = State.Nonblank;
	}
	else
	{
		cog.state = State.Blank;
	}
	
	cog.act = ProcessSlot;
	
	cog["[obj]"] = value;
	
	var cogNode = MakeNode(cog, "node", cog);
	cog.node = cogNode;
	
	return cog;
}

function MakePointer(parent, name, slot, ptrname, scope)
{
	var cog = MakeObj(parent, name);
	cog.type = Machine.Pointer;
	cog.state = State.Inactive;
	cog.act = ProcessPointer;
	cog["[obj]"] = null;
	
	cog.ptrname = ptrname;
	cog.scope = scope;
	
	var cogNode = MakeNode(cog, "node", cog);
		
	if (slot)
	{
		cog["[obj]"] = slot;
		AddGraphlessEdge(cogNode, slot.node, "[obj]");
	}
	
	cog.node = cogNode;
	
	return cog;
}

function MakeExp(parent, name)
{
	var cog = MakeObj(parent, name);
	cog.type = Machine.Exp;
	cog.state = State.Inactive;
	cog.act = ProcessExp;
	
	cog.pout = null;
	cog.f = null;
	cog.args = MakeList(cog, "args");
	
	var cogNode = MakeNode(cog, "node", cog);
	cog.node = cogNode;
	
	return cog;
}

function MakeControl(parent, name)
{
	var cog = MakeObj(parent, name);
	cog.type = Machine.Control;
	cog.state = State.Inactive;
	cog.act = ProcessControl;
	
	var cogNode = MakeNode(cog, "node", cog);
	cog.node = cogNode;
	
	return cog;
}

function MakeEquals(parent, name, op, arglist)
{
	var cog = MakeObj(parent, name);
	cog.type = Machine.Equals;
	cog.state = State.Inactive;
	cog.act = ProcessEquals;
	
	// op is a string, arglist is a list of slots
	cog.op = op;
	cog.arglist = arglist;
	
	var cogNode = MakeNode(cog, "node", cog);
	cog.node = cogNode;
	
	for (var i = 0; i < arglist.length; i++)
	{
		AddGraphlessEdge(cogNode, arglist[i].node, i.toString());
	}

	return cog;
}

function ProcessSlot(x)
{
    if (x.control && x.control.state == State.Deactivating)
    {
        x.newState = State.Inactive;
        return;
    }
	
	if (globals.blankingMode && !(x.state == State.Blanking || x.state == State.Nonblank))
	{
		globals.newqueue.push(x.node); // keep it alive
		x.node.inQueue = true;
	}

    if (x.state == State.Inactive)
    {
        if (x.control.state == State.Activating)
        {
            if (x["[obj]"] == null)
            {
                x.newState = State.Blank;
            }
            else
            {
                x.newState = State.Nonblank;
            }
        }
    }
    else if (x.state == State.Nonblank)
    {
		var node = x.node;
		
        for (var i = 0; i < node.ins.length; i++)
        {
			var cog = node.ins[i].src.contents;
			
			if (cog.type == Machine.Pointer)
			{
				if (cog.state == State.Blanking)
				{
					x["[obj]"] = null;
					x.newState = State.Blanking;
				}
			}
			
			if (cog.type == Machine.Equals)
			{
				if (cog.state == State.Blanking)
				{
					if (cog.op == "=" && node.ins[i].label != "0")
					{
						x["[obj]"] = null;
						x.newState = State.Blanking;
					}
					else if (cog.op != "=" && node.ins[i].label == "0")
					{
						x["[obj]"] = null;
						x.newState = State.Blanking;
					}
				}
			}
        }
    }
    else if (x.state == State.Blanking)
    {
        x.newState = State.Blank;
    }
    else if (x.state == State.Blank)
    {
        if (x["[obj]"])
        {
            x.newState = State.Setting;
        }
    }
    else if (x.state == State.Setting)
    {
        x.newState = State.Nonblank;
    }
}

function ProcessPointer(x)
{
    if (x.control && x.control.state == State.Deactivating)
    {
        x.newState = State.Inactive;
        return;
    }
	
	if (globals.blankingMode && !(x.state == State.Blanking || x.state == State.Nonblank))
	{
		globals.newqueue.push(x.node); // keep it alive
		x.node.inQueue = true;
	}

    if (x.state == State.Inactive)
    {
        if (x.control.state == State.Activating)
        {
            x.newState = State.Unbound;
        }
    }
    else if (x.state == State.Unbound)
    {
        if (x["[obj]"] == null)
        {
			var scope = Get(x.scope);
			var name = Get(x.name);
			
			while (scope && name)
			{
				if (scope[name])
				{
					var slot = scope[name];
					x["[obj]"] = slot;
					AddGraphlessEdge(x.node, slot.node, "[obj]");
					break;
				}
				else
				{
					scope = scope["[parent]"];
				}
			}
        }

		if (x["[obj]"])
		{
			// so we assume that it binds to a slot - i'm not quite ready to allow pointers to bind to raw objects
			if (x["[obj]"].state == State.Nonblank)
			{
				x.newState = State.Nonblank;
			}
			else if (x["[obj]"].state == State.Blank)
			{
				x.newState = State.Blank;
			}
			else
			{
				throw new Error();
			}
		}
    }
    else if (x.state == State.Nonblank)
    {
        for (var i = 0; i < x.node.ins.length; i++)
        {
			var edge = x.node.ins[i];
			
            if (edge.label == "pout" && edge.src.contents.state == State.Waiting)
            {
                x.newState = State.Blanking;
            }
        }

        if (x["[obj]"].state == State.Blanking)
        {
            x.newState = State.Blanking;
        }
    }
    else if (x.state == State.Blanking)
    {
        x.newState = State.Blank;
    }
    else if (x.state == State.Blank)
    {
        if (x["[obj]"].state == State.Setting)
        {
            x.newState = State.Setting;
        }
    }
    else if (x.state == State.Setting)
    {
        x.newState = State.Nonblank;
    }
}

function ProcessExp(x)
{
    if (x.control != null && x.control.state == State.Deactivating)
    {
        x.newState = State.Inactive;
        return;
    }
	
	if (globals.blankingMode && !(x.state == State.Fired))
	{
		globals.newqueue.push(x.node); // keep it alive
		x.node.inQueue = true;
	}

    if (x.state == State.Inactive)
    {
        if (x.control.state == State.Activating)
        {
            x.newState = State.FirstFire;
        }
    }
    else if (x.state == State.FirstFire)
    {
        var fire = true;

        for (var i = 0; i < x.args.length; i++)
        {
			var arg = x.args[i];
			
            if (arg.state != State.Nonblank)
            {
                fire = false;
                break;
            }
        }

        if (x.f.state != State.Nonblank)
        {
            fire = false;
        }

        if (fire)
        {
            x.newState = State.Firing;
        }
    }
    else if (x.state == State.Waiting)
    {
        var fire = true;

        for (var i = 0; i < x.args.length; i++)
        {
			var arg = x.args[i];
			
            if (arg.state != State.Nonblank)
            {
                fire = false;
                break;
            }
        }

        if (x.f.state != State.Nonblank)
        {
            fire = false;
        }

        if (x.pout.state != State.Blank)
        {
            fire = false;
        }

        if (fire)
        {
            x.newState = State.Firing;
        }
    }
    else if (x.state == State.Firing)
    {
        Fire(x);

        x.newState = State.Fired;
    }
    else if (x.state == State.Fired)
    {
        for (var i = 0; i < x.args.length; i++)
        {
			var arg = x.args[i];
			
            if (arg.state == State.Blanking)
            {
                x.newState = State.Waiting;
            }
        }

        if (x.f.state == State.Blanking)
        {
            x.newState = State.Waiting;
        }
    }
}

function ProcessControl(x)
{
    if (x.state == State.Inactive)
    {

    }
    else if (x.state == State.Activating)
    {
        x.newState = State.Active;
    }
    else if (x.state == State.Active)
    {

    }
    else if (x.state == State.Deactivating)
    {
        x.newState = State.Inactive;
    }
}

function ProcessEquals(x)
{
    if (x.control != null && x.control.state == State.Deactivating)
    {
        x.newState = State.Inactive;
        return;
    }
	
	if (globals.blankingMode && !(x.state == State.Blanking || x.state == State.Nonblank))
	{
		globals.newqueue.push(x.node); // keep it alive
		x.node.inQueue = true;
		return;
	}

    if (x.state == State.Inactive)
    {
        if (x.control.state == State.Activating)
        {
            x.newState = State.Setting; // this is the Equals equivalent of FirstFire
        }
    }
	else if (x.state == State.Nonblank)
	{
		if (x.op == "=")
		{
			for (var i = 0; i < x.arglist.length; i++)
			{
				if (x.arglist[i].state == State.Blanking)
				{
					// flip 0 and i, so that 0 is the one that will be setting
					var temp = x.arglist[0];
					x.arglist[0] = x.arglist[i];
					x.arglist[i] = temp;
					
					var ou0 = null;
					var oui = null;
					
					for (var k = 0; k < x.node.ous.length; k++)
					{
						if (x.node.ous[k].label == "0")
						{
							ou0 = x.node.ous[k];
						}
						
						if (x.node.ous[k].label == i.toString())
						{
							oui = x.node.ous[k];
						}
					}
					
					ou0.label = i.toString();
					oui.label = "0";
					
					x.newState = State.Blanking;
					break; // hopefully only one arg will be blanked at a time
				}
			}
		}
		else
		{
			if (x.arglist[0].state == State.Blanking)
			{
				// flip arglist 0 and 1, flip the op to inverse
				var temp = x.arglist[0];
				x.arglist[0] = x.arglist[1];
				x.arglist[1] = temp;
				
				var ou0 = null;
				var ou1 = null;
				
				for (var k = 0; k < x.node.ous.length; k++)
				{
					if (x.node.ous[k].label == "0")
					{
						ou0 = x.node.ous[k];
					}
					
					if (x.node.ous[k].label == "1")
					{
						ou1 = x.node.ous[k];
					}
				}
				
				ou0.label = "1";
				ou1.label = "0";
				
				x.op = globals.inverses[x.op];
					
				x.newState = State.Blanking;
			}

			for (var i = 1; i < x.arglist.length; i++)
			{
				if (x.arglist[i].state == State.Blanking)
				{
					x.newState = State.Blanking;
				}
			}
		}
	}
	else if (x.state == State.Blanking)
    {
		// we could push the blanking to the proper subs, rather than having the subs watch the Equals - for now, Slots watch their Equals, but we'll leave this code here as an option
		//if (x.op == "=")
		//{
		//	for (var i = 1; i < x.arglist.length; i++)
		//	{
		//		x.arglist[i].newState = State.Blanking;
		//	}
		//}
		//else
		//{
		//	x.arglist[0].newState = State.Blanking;
		//}
		
        x.newState = State.Blank;
    }
    else if (x.state == State.Blank)
    {
		if (x.op == "=")
		{
			if (x.arglist[0].state == State.Nonblank)
			{
				FireEq(x);
				x.newState = State.Setting;
			}
		}
		else
		{
			for (var i = 1; i < x.arglist.length; i++)
			{
				if (x.arglist[i].state == State.Nonblank)
				{
					FireEq(x);
					x.newState = State.Setting;
				}
			}
		}
    }
    else if (x.state == State.Setting)
    {
        x.newState = State.Nonblank;
    }
}

function FireEq(x)
{
	var total = null;
	
	if (x.op == "=")
	{
		// = is a little different than the rest - here we take changes in one slot and propagate them to all the others
		
		total = Get(x.arglist[0]);
		
		for (var i = 1; i < x.arglist.length; i++)
		{
			Set(x.arglist[i], total);
		}
	}
	else if (x.op == "=+")
	{
		total = 0.0;
		
		for (var i = 1; i < x.arglist.length; i++)
		{
			total += Get(x.arglist[i]);
		}
		
		Set(x.arglist[0], total);
	}
	else if (x.op == "=-")
	{
		total = Get(x.arglist[1]);
		
		for (var i = 2; i < x.arglist.length; i++)
		{
			total -= Get(x.arglist[i]);
		}
		
		Set(x.arglist[0], total);
	}
	else if (x.op == "=*")
	{
		total = 1.0;
		
		for (var i = 1; i < x.arglist.length; i++)
		{
			total *= Get(x.arglist[i]);
		}
		
		Set(x.arglist[0], total);
	}
	else if (x.op == "=/")
	{
		total = Get(x.arglist[1]);
		
		for (var i = 2; i < x.arglist.length; i++)
		{
			total /= Get(x.arglist[i]);
		}
		
		Set(x.arglist[0], total);
	}
}

function Fire(exp)
{
	var f = Get(exp.f);
	
	var args = [];
	
	for (var i = 0; i < exp.args.length; i++)
	{
		args.push(Get(exp.args[i]));
	}
	
	var result = f(args);
	
	// this is invoked for intermediate pointers, and possibly other things
	if (!exp.pout["[obj]"])
	{
		exp.pout["[obj]"] = MakeSlot(exp.pout, "[obj]", null); // so in this case the slot hangs from the pointer
		exp.pout["[obj]"].state = State.Nonblank;
	}
	
	Set(exp.pout["[obj]"], result);
}

function Compile(str)
{
	var tree = ReadFrce(str);
	
	var code = []; // add [parent], [name] later
	//code.displayNode = DisplayCog;
	code.root = DispatchLisp(code, tree.root);
    return code;
}

function DispatchLisp(code, root)
{
	var result = null;
	
	var value = Get(root.contents);
	
	if (value == "()")
	{
		var ptr = MakePointer(code, code.length.toString());
		code.push(ptr);
		var exp = MakeExp(code, code.length.toString());
		code.push(exp);
		
		exp.pout = ptr;
		AddGraphlessEdge(exp.node, ptr.node, "pout");
		
		for (var i = 0; i < root.children.length; i++)
		{
			var arg = DispatchLisp(code, root.children[i]);
			
			if (i == 0)
			{
				exp.f = arg;
				AddGraphlessEdge(exp.node, arg.node, "f");
			}
			else
			{
				exp.args.push(arg);
				AddGraphlessEdge(exp.node, arg.node, (i - 1).toString());
			}
		}
		
		result = ptr;
	}
	else if (value == "." || value == "[]")
	{
		var ptr = MakePointer(code, code.length.toString());
		code.push(ptr);
		
		var scope = DispatchLisp(code, root.children[0]);
		ptr.scope = scope;
		AddGraphlessEdge(ptr.node, scope.node, "scope");
		ptr.name = StripQuotes(root.children[1].contents);

		result = ptr;
	}
	else
	{
        if (IsDigit(value[0]) || (value.length > 1 && value[0] == '.'))
        {
			result = DispatchNumber(code, value);
        }
        else if (value[0] == '"' || value[0] == "'")
        {
			result = DispatchString(code, value)
        }
        else
        {
			result = DispatchName(code, value);
        }
	}
	
	return result;
}

function StripQuotes(str)
{
	if (str[0] == '"' || str[0] == '"')
	{
		return str.substring(1, str.length - 2);
	}
	else
	{
		return str;
	}
}

function DispatchName(code, value)
{
	var ptr = MakePointer(code, code.length.toString());
	code.push(ptr);
	ptr.name = value;
    return ptr;
}

function DispatchNumber(code, value)
{
    var num = MakeSlot(code, code.length.toString(), null);
	code.push(num);
	var ptr = MakePointer(code, code.length.toString(), num);
	code.push(ptr);

    if (value.indexOf(".") != -1)
    {
        Set(num, parseFloat(value));
        num.valueType = "double";
    }
    else
    {
        Set(num, parseInt(value));
        num.valueType = "int";
    }
	
	Lock(num); // cog or node?

	return ptr;
}

function DispatchString(code, value)
{
	var s = value.substring(1, value.length - 2); // we assume the string is enclosed in ""
    var str = MakeSlot(code, code.length.toString(), s);
	code.push(str);
    str.valueType = "string";
    Lock(str);
    var ptr = MakePointer(code, code.length.toString(), num);
	code.push(ptr);
    return ptr;
}

function Lock(slot) { slot.locked = true; }

var State = {};
State.Inactive = 0;
State.Blank = 1;
State.Setting = 2;
State.Nonblank = 3;
State.Blanking = 4;
State.Unbound = 5;
State.Activating = 6;
State.Active = 7;
State.Deactivating = 8;
State.FirstFire = 9
State.Waiting = 10
State.Firing = 11;
State.Fired = 12;

var Machine = {};
Machine.Slot = 0;
Machine.Pointer = 1;
Machine.Exp = 2;
Machine.Control = 3;
Machine.Equals = 4;

function AnalysisDriver()
{
	globals.canvas.music = MakeObj(globals.canvas, "music");
	var music = globals.canvas.music;
	music["[type]"] = "Collection";
	
	music.noteToFreqDict = MakeObj(music, "noteToFreqDict");
	MakeNotes(music.noteToFreqDict);
	
	var NoteToFreq = function(note) { return music.noteToFreqDict[note]; }
	
	music.instrumentDict = MakeObj(music, "instrumentDict");
	music.instrumentDict["Piano"] = Piano;
	music.instrumentDict["Guitar"] = Guitar;
	music.instrumentDict["Drum"] = Drum;
	
	if (window.AudioContext)
	{
		globals.mAudioContext = new AudioContext();
	}
	
    if (globals.mAudioContext == null)
	{
		if (window.webkitAudioContext)
		{
			globals.mAudioContext = new webkitAudioContext();
		}
	}
	
	//globals.reader.onload = WavReader;
	
	// making these global variables is clumsy, but probably necessary - after all, all objects must inherit from globals
	music.piece = MakeObj(music, "piece");
	music.slice = MakeObj(music, "slice");
	music.sliceGrid = MakeObj(music, "sliceGrid");
	music.redSlice = MakeObj(music, "redSlice");
	music.redSliceGrid = MakeObj(music, "redSliceGrid");
	music.views = MakeObj(music, "views");
	music.viewGrid = MakeObj(music, "viewGrid");
	//music.redView = MakeObj(music, "redView");
	music.reds = MakeObj(music, "reds");
	music.redGrid = MakeObj(music, "redGrid");
	music.redHarmonicGrid = MakeObj(music, "redHarmonicGrid");
	
	var piece = music.piece;
	piece.beatsPerMeasure = 4;
	piece.beatsPerMinute = 100;
	piece.samplesPerSecond = 44100;
	
	var reds = music.reds;
	music.reds["0"] = MakeObj(reds, "0");
	var red = music.reds["0"];
	red.duration = MakeSlot(red, "duration", 1000);
	red.freq = MakeSlot(red, "freq", 331);
	red.amp = MakeSlot(red, "amp", 10000);
	
	music.harmonics = MakeList(music, "harmonics");
	var harmonics = music.harmonics;
	harmonics[0] = MakeObj(harmonics, "0");
	harmonics[0].amp = MakeSlot(harmonics[0], "amp", 0.3);
	harmonics[0].frq = MakeSlot(harmonics[0], "amp", 1.0);
	harmonics[1] = MakeObj(harmonics, "1");
	harmonics[1].amp = MakeSlot(harmonics[1], "amp", -0.3);
	harmonics[1].frq = MakeSlot(harmonics[1], "frq", 2.0);
	harmonics[2] = MakeObj(harmonics, "2");
	harmonics[2].amp = MakeSlot(harmonics[2], "amp", 0.1);
	harmonics[2].frq = MakeSlot(harmonics[2], "frq", 4.0);
	harmonics[3] = MakeObj(harmonics, "3");
	harmonics[3].amp = MakeSlot(harmonics[3], "amp", 0.0);
	harmonics[3].frq = MakeSlot(harmonics[3], "frq", 8.0);
	
	var redGrid = music.redGrid;
	DisplayGrid(redGrid);
	redGrid.obj = music.reds;
	redGrid.rowsAre = "fields";
	MoveBox(redGrid, "left", "width", 700);
	MoveBox(redGrid, "top", "height", 500);
	RedisplayGrid(redGrid);
	
	Set(redGrid.cells[0].numberFormat, 0);
	Set(redGrid.cells[1].numberFormat, 0);
	Set(redGrid.cells[2].numberFormat, 0);
	
	for (var i = 0; i < redGrid.cells.length; i++)
	{
		var cell = redGrid.cells[i];
		cell.redisplay(cell);
		cell.position(cell);
	}
	
	var redHarmonicGrid = music.redHarmonicGrid;
	DisplayGrid(redHarmonicGrid);
	redHarmonicGrid.obj = harmonics;
	redHarmonicGrid.rowsAre = "objs";
	MoveBox(redHarmonicGrid, "left", "width", 900);
	MoveBox(redHarmonicGrid, "top", "height", 500);
	RedisplayGrid(redHarmonicGrid);
	
	for (var i = 0; i < redHarmonicGrid.cells.length; i++)
	{
		var cell = redHarmonicGrid.cells[i];
		Set(cell.numberFormat, 2);
		cell.redisplay(cell);
		cell.position(cell);
	}
	
	var slice = music.slice;
	slice.samples = MakeObj(slice, "samples");
	slice.samples.start = MakeSlot(slice.samples, "start", 44100 * 0);
	slice.samples.end = MakeSlot(slice.samples, "end", null);
	slice.samples.length = MakeSlot(slice.samples, "length", 44100 * 1);
	slice.seconds = MakeObj(slice, "seconds");
	slice.seconds.start = MakeSlot(slice.seconds, "start", 0);
	slice.seconds.end = MakeSlot(slice.seconds, "end", null);
	slice.seconds.length = MakeSlot(slice.seconds, "length", 1);
	slice.beats = MakeObj(slice, "beats");
	slice.beats.start = MakeSlot(slice.beats, "start", 0 * piece.beatsPerMinute / 60);
	slice.beats.end = MakeSlot(slice.beats, "end", null);
	slice.beats.length = MakeSlot(slice.beats, "length", 1 * piece.beatsPerMinute / 60);
	
	var sliceEqs = MakeList(music, "sliceEqs");
	music.sliceEqs = sliceEqs;
	var keys = [ "samples" , "seconds" , "beats" ];
	for (var i = 0; i < keys.length; i++)
	{
		var key = keys[i];
		sliceEqs[i] = MakeEquals(sliceEqs, i.toString(), "=+", [ slice[key].end , slice[key].start , slice[key].length ]);
		sliceEqs[i].state = State.Blank;
		globals.newqueue.push(sliceEqs[i].node);
		sliceEqs[i].node.inQueue = true;
	}
	
	//var sliceUnitEqs = MakeList(music, "sliceUnitEqs");
	//var keys2 = [ "start" , "end" , "length" ];
	//for (var i = 0; i < keys.length; i++)
	//{
	//	var key = keys[i];
	//	sliceUnitEqs[i] = MakeEquals(sliceEqs, i.toString(), "=+", [ slice[key].end , slice[key].start , slice[key].length ]);
	//	sliceUnitEqs[i].state = State.Setting;
	//	globals.queue.push(sliceUnitEqs[i].node);
	//}
	
	var redSlice = music.redSlice;
	redSlice.samples = MakeObj(redSlice, "samples");
	redSlice.samples.start = MakeSlot(redSlice.samples, "start", 143);
	redSlice.samples.end = MakeSlot(redSlice.samples, "end", 44100 * 1);
	redSlice.samples.length = MakeSlot(redSlice.samples, "length", 44100 * 1);
	redSlice.seconds = MakeObj(redSlice, "seconds");
	redSlice.seconds.start = MakeSlot(redSlice.seconds, "start", 0);
	redSlice.seconds.end = MakeSlot(redSlice.seconds, "end", 1);
	redSlice.seconds.length = MakeSlot(redSlice.seconds, "length", 1);
	redSlice.beats = MakeObj(redSlice, "beats");
	redSlice.beats.start = MakeSlot(redSlice.beats, "start", 0 * piece.beatsPerMinute / 60);
	redSlice.beats.end = MakeSlot(redSlice.beats, "end", 1 * piece.beatsPerMinute / 60);
	redSlice.beats.length = MakeSlot(redSlice.beats, "length", 1 * piece.beatsPerMinute / 60);
	
	var sliceGrid = music.sliceGrid;
	DisplayGrid(sliceGrid);
	sliceGrid.obj = music.slice;
	sliceGrid.rowsAre = "fields";
	MoveBox(sliceGrid, "left", "width", 50);
	MoveBox(sliceGrid, "top", "height", 250);
	RedisplayGrid(sliceGrid);
	
	Set(sliceGrid.cells[0].numberFormat, 0);
	Set(sliceGrid.cells[1].numberFormat, 0);
	Set(sliceGrid.cells[2].numberFormat, 0);
	Set(sliceGrid.cells[3].numberFormat, 2);
	Set(sliceGrid.cells[4].numberFormat, 2);
	Set(sliceGrid.cells[5].numberFormat, 2);
	Set(sliceGrid.cells[6].numberFormat, 2);
	Set(sliceGrid.cells[7].numberFormat, 2);
	Set(sliceGrid.cells[8].numberFormat, 2);
	
	for (var i = 0; i < sliceGrid.cells.length; i++)
	{
		var cell = sliceGrid.cells[i];
		cell.redisplay(cell);
		cell.position(cell);
	}
	
	var redSliceGrid = music.redSliceGrid;
	DisplayGrid(redSliceGrid);
	redSliceGrid.obj = music.redSlice;
	redSliceGrid.rowsAre = "fields";
	MoveBox(redSliceGrid, "left", "width", 50);
	MoveBox(redSliceGrid, "top", "height", 400);
	RedisplayGrid(redSliceGrid);
	
	Set(redSliceGrid.cells[0].numberFormat, 0);
	Set(redSliceGrid.cells[1].numberFormat, 0);
	Set(redSliceGrid.cells[2].numberFormat, 0);
	Set(redSliceGrid.cells[3].numberFormat, 2);
	Set(redSliceGrid.cells[4].numberFormat, 2);
	Set(redSliceGrid.cells[5].numberFormat, 2);
	Set(redSliceGrid.cells[6].numberFormat, 2);
	Set(redSliceGrid.cells[7].numberFormat, 2);
	Set(redSliceGrid.cells[8].numberFormat, 2);
	
	for (var i = 0; i < redSliceGrid.cells.length; i++)
	{
		var cell = redSliceGrid.cells[i];
		cell.redisplay(cell);
		cell.position(cell);
	}
	
	music.paths = MakeList(music, "paths");
	var paths = music.paths;
	
	music.views["0"] = MakeObj(music.views, "0");
	music.views["[type]"] = "Collection";
	var view = music.views["0"];
	view.xPixelsPerSample = MakeSlot(view, "xPixelsPerSample", 1);
	view.samplesPerXPixel = MakeSlot(view, "samplesPerXPixel", 1);
	view.pcmsPerYPixel = MakeSlot(view, "pcmsPerYPixel", 100);
	view.left = MakeSlot(view, "left", 400);
	view.cy = MakeSlot(view, "cy", 230);
	view.draw = MakeSlot(view, "draw", DrawWave);
	view.x = MakeSlot(view, "x", null);
	view.paths = MakeSlot(view, "paths", paths);

	paths[0] = MakeObj(paths, "0");
	paths[0].stroke = "rgb(0,0,0)";
	paths[0].slice = slice;
	paths[0].pcms = null;
	paths[1] = MakeObj(paths, "1");
	paths[1].stroke = "rgb(255,0,0)";
	paths[1].slice = redSlice;
	paths[1].pcms = Blank(paths[1], "pcms", red, harmonics);
	
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.responseType = "arraybuffer"; // we specify this so that binary data is returned

	xmlhttp.onreadystatechange = function()
  	{
  		if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
    	{
			var arrayBuffer = xmlhttp.response; // note: not 'responseText'
			var byteArray = new Uint8Array(arrayBuffer);
			Set(view.x, byteArray);
			paths[0].pcms = ReadWav(Get(view.x)).xs[0];
			globals.redraw = true;
    	}
  	}
	
	//redSlice.start.samples = 0
	//samplesPerXPixel = 8
	//pcmsPerYPixel = 300
	//freq = 330
	//duration = 8820
	//amp = 14000
	xmlhttp.open("GET", "easeback 3.90-4.10.wav", true);
	xmlhttp.send();

	var viewGrid = music.viewGrid;
	DisplayGrid(viewGrid);
	viewGrid.obj = music.views;
	viewGrid.rowsAre = "fields";
	MoveBox(viewGrid, "left", "width", 50);
	MoveBox(viewGrid, "top", "height", 500);
	RedisplayGrid(viewGrid);
	
	Set(viewGrid.cells[0].numberFormat, 0);
	Set(viewGrid.cells[1].numberFormat, 0);
	Set(viewGrid.cells[2].numberFormat, 0);
	Set(viewGrid.cells[3].numberFormat, 0);
	Set(viewGrid.cells[4].numberFormat, 0);
	
	for (var i = 0; i < viewGrid.cells.length; i++)
	{
		var cell = viewGrid.cells[i];
		cell.redisplay(cell);
		cell.position(cell);
	}
	
	var udf = "function UserDefined(a, b)\n{\n\tvar x = 0;\n}\n";
	
	music.textbox = DisplayStringAsCell(music, "textbox", udf);
	music.textbox.onhover = OnHoverTextbox;
	music.textbox.dehover = DeHoverTextbox;
	music.textbox.onfocus = OnFocusTextbox;
	music.textbox.defocus = DeFocusTextbox;
	music.textbox.container = music.textbox;
	music.textbox.editActive = Nop;
	Set(music.textbox.width, 300);
	Set(music.textbox.height, 200);
	Set(music.textbox.left, 50);
	Set(music.textbox.top, 750);
	music.textbox.redisplay(music.textbox);
	
	music.wavfileTextbox = DisplayStringAsCell(music, "wavfileTextbox", "easeback 3.90-4.10.wav");
	music.wavfileTextbox.onhover = OnHoverTextbox;
	music.wavfileTextbox.dehover = DeHoverTextbox;
	music.wavfileTextbox.onfocus = OnFocusTextbox;
	music.wavfileTextbox.defocus = DeFocusTextbox;
	music.wavfileTextbox.container = music.wavfileTextbox;
	music.wavfileTextbox.editActive = Nop;
	Set(music.wavfileTextbox.width, 300);
	Set(music.wavfileTextbox.height, 30);
	Set(music.wavfileTextbox.left, 700);
	Set(music.wavfileTextbox.top, 650);
	music.wavfileTextbox.redisplay(music.wavfileTextbox);
	
	var functor = ReadUserDefinedFunction(music, udf);
	music.functor = functor;

	var RecalcRed = function()
	{
		paths[1].pcms = Blank(paths[1], "pcms", red, harmonics); // =(Blank red harmonics) in the paths.pcms slot - changes to the constituent slots of red and harmonics must flow upward to the structs
	};
	
	red.duration.react = RecalcRed;
	red.freq.react = RecalcRed;
	red.amp.react = RecalcRed;
	harmonics[0].amp.react = RecalcRed;
	harmonics[0].frq.react = RecalcRed;
	harmonics[1].amp.react = RecalcRed;
	harmonics[1].frq.react = RecalcRed;
	harmonics[2].amp.react = RecalcRed;
	harmonics[2].frq.react = RecalcRed;
	harmonics[3].amp.react = RecalcRed;
	harmonics[3].frq.react = RecalcRed;
		
	var song = MakeObj(music, "song");
	music.song = song;
	
	song.length = MakeSlot(song, "length", 44100 * 10);
	song.beatsPerMeasure = MakeSlot(song, "beatsPerMeasure", 4);
	song.beatsPerMinute = MakeSlot(song, "beatsPerMinute", 100);
	
	song.notes = MakeList(song, "notes");
	song.notes[0] = MakeObj(song.notes, "0");
	song.notes[0].instrument = MakeSlot(song.notes[0], "instrument", "Piano");
	song.notes[0].amp = MakeSlot(song.notes[0], "amp", 3000);
	song.notes[0].note = MakeSlot(song.notes[0], "note", "C4");
	song.notes[0].freq = MakeSlot(song.notes[0], "freq", NoteToFreq(Get(song.notes[0].note)));
	song.notes[0].start = MakeSlot(song.notes[0], "start", 0);
	song.notes[0].length = MakeSlot(song.notes[0], "length", 1/4); // length in measures
	song.notes[1] = MakeObj(song.notes, "1");
	song.notes[1].instrument = MakeSlot(song.notes[1], "instrument", "Piano");
	song.notes[1].amp = MakeSlot(song.notes[1], "amp", 3000);
	song.notes[1].note = MakeSlot(song.notes[1], "note", "E4");
	song.notes[1].freq = MakeSlot(song.notes[1], "freq", NoteToFreq(Get(song.notes[1].note)));
	song.notes[1].start = MakeSlot(song.notes[1], "start", 0);
	song.notes[1].length = MakeSlot(song.notes[1], "length", 1/4);
	song.notes[2] = MakeObj(song.notes, "2");
	song.notes[2].instrument = MakeSlot(song.notes[2], "instrument", "Piano");
	song.notes[2].amp = MakeSlot(song.notes[2], "amp", 3000);
	song.notes[2].note = MakeSlot(song.notes[2], "note", "G4");
	song.notes[2].freq = MakeSlot(song.notes[2], "freq", NoteToFreq(Get(song.notes[2].note)));
	song.notes[2].start = MakeSlot(song.notes[2], "start", 0);
	song.notes[2].length = MakeSlot(song.notes[2], "length", 1/4);
	
	music.notesGrid = MakeObj(music, "notesGrid");
	DisplayGrid(music.notesGrid);
	music.notesGrid.obj = song.notes;
	music.notesGrid.rowsAre = "objs";
	Set(music.notesGrid.left, 800);
	Set(music.notesGrid.top, 700);
	RedisplayGrid(music.notesGrid);
	
	Push("Ctrl+P", function() { PlaySound(ComposeNotes(song)); });
	Push("Ctrl+M", function() { SubtractRed(view); });
	Push("Ctrl+Shift+M", function() { DivideRed(view); });
	
	sliceGrid.position(sliceGrid);
	redSliceGrid.position(redSliceGrid);
	viewGrid.position(viewGrid);
	redGrid.position(redGrid);
	redHarmonicGrid.position(redHarmonicGrid);
	music.textbox.position(music.textbox);
	music.wavfileTextbox.position(music.wavfileTextbox);
	music.notesGrid.position(music.notesGrid);
}

function SubtractRed(view)
{
	var redStart = Get(view.paths[1].slice.samples.start);
	var length = Get(view.paths[1].slice.samples.length);
	
	for (var i = 0; i < length; i++)
	{
		view.paths[0].pcms[redStart + i] -= view.paths[1].pcms[i];
	}
}

function DivideRed(view)
{
	// this is largely for dealing with amplitude modulation
	// the problem is that you want to divide the black wave by very small numbers - e.g., 0.9 at the troughs, 1.1 at the peaks
	// the purpose is to equalize the AM peaks and troughs
	
	// the issue then is how to display this red wave - ideally, you want it to visually match the envelope of the black wave
	// so what we really want is an envelope visualization, which is completely different than a wave visualization
}

function PlaySound(pcms)
{
	var buffer = globals.mAudioContext.createBuffer(1, pcms.length, 44100); // nChannels , sample length , sample rate
	var dbuf = buffer.getChannelData(0);
	
    for (var i = 0; i < pcms.length; i++)
    {
        dbuf[i] = pcms[i] / 1000.0; // in the original SoundToy, they use floats (which I've seen go up to 2.5)
    }
	
	// so before that / 1000.0 was in place, we were making a square wave, which is what the beginning of Pepper by Butthole Surfers is

	var volume = 50;
	
    var node = globals.mAudioContext.createBufferSource();
    node.buffer = buffer;
    node.gain.value = 0.5 * volume / 100.0;
    node.connect(globals.mAudioContext.destination);
    node.noteOn(0);
}

function Blank(parent, name, red, harmonics)
{
	var duration = Get(red.duration);
	var freq = Get(red.freq) * Math.PI * 2;
	var amp = Get(red.amp);
	
	var x = new Array(duration);
	AddBracketFields(x, parent, name);
	
	for (var i = 0; i < duration; i++)
	{
		var t = i / 44100;
		var y = 0;
		
		for (var k = 0; k < harmonics.length; k++)
		{
			var hAmp = Get(harmonics[k].amp);
			var hFrq = Get(harmonics[k].frq);
			y += hAmp * Math.sin(hFrq * freq * t);
		}
		
		y *= amp;
		x[i] = y;
	}
	
	return x;
}

function MakeMusicNode(args)
{
	var node = {};
	node.state = "Uncomposed";
	node.x = null;
	node.children = [];
	
	for (var key in args)
	{
		node[key] = args[key];
	}
	
	return node;
}

function ComposeNotes(song)
{
	// the input to this is just a simple list of notes
	
	var music = song["[parent]"];

	var pcms = new Array(Get(song.length));
	
	var beatsPerMinute = Get(song.beatsPerMinute);
	var beatsPerMeasure = Get(song.beatsPerMeasure);
	
	for (var k = 0; k < pcms.length; k++)
	{
		pcms[k] = 0;
	}
	
	for (var i = 0; i < song.notes.length; i++)
	{
		var note = song.notes[i];
		
		var instrument = music.instrumentDict[Get(note.instrument)];
		var amp = Get(note.amp);
		var freq = Get(note.freq);
		var start = Get(note.start);
		var length = Get(note.length);
		
		// maybe these conversions should be done in the grid
		start = Math.floor(start * beatsPerMeasure / beatsPerMinute * 60 * 44100);
		length = Math.floor(length * beatsPerMeasure / beatsPerMinute * 60 * 44100);
		
		var x = instrument(amp, freq * 2 * Math.PI, length);
		
		for (var k = 0; k < length; k++)
		{
			pcms[start + k] += x[k];
		}
	}
	
	return pcms;
}

function Compose(node, instrument)
{
	// this takes a tree - for structure, see moonlight.js
	
	var instrument = instrument;
	
	if (node.type == "Instrument")
	{
		instrument = node.instrument;
	}
	
	for (var k = 0; k < node.children.length; k++)
	{
		if (node.children[k].state == "Uncomposed") // this is to deal with multiple nonlocal references to one node
		{
			Compose(node.children[k], instrument);
		}
	}
	
	if (node.type == "Instrument")
	{
		node.x = node.children[0].x;
	}
			
	if (node.type == "Sim")
	{
		var maxlength = 0;
		
		for (var k = 0; k < node.children.length; k++)
		{
			if (node.children[k].x.length > maxlength)
			{
				maxlength = node.children[k].x.length;
			}
		}
		
		var jitter = 3000; // the number of samples we offset by, to avoid crackling
		
		node.x = new Array(maxlength);
			
		for (var i = 0; i < node.x.length; i++)
		{
			node.x[i] = 0;
		}
		
		for (var k = 0; k < node.children.length; k++)
		{
			for (var i = 0; i < node.children[k].x.length; i++)
			{
				node.x[i + jitter * k] += node.children[k].x[i]; // added '+ jitter * k'
			}
		}
	}
	
	if (node.type == "Seq")
	{
		var length = 0;
		
		for (var k = 0; k < node.children.length; k++)
		{
			length += node.children[k].x.length;
		}
		
		node.x = new Array(length);
		
		var i = 0;
		
		for (var k = 0; k < node.children.length; k++)
		{
			for (var j = 0; j < node.children[k].x.length; j++)
			{
				node.x[i] = node.children[k].x[j];
				i++;
			}
		}
	}
	
	if (node.type == "Rep")
	{
		node.x = new Array(node.children[0].x.length * node.n);
		
		var i = 0;
		
		for (var k = 0; k < node.n; k++)
		{
			for (var j = 0; j < node.children[0].x.length; j++)
			{
				node.x[i] = node.children[0].x[j];
				i++;
			}
		}
	}
	
	if (node.type == "Grp")
	{
		var start = 999999999;
		var end = 0;
		
		for (var k = 0; k < node.children.length; k++)
		{
			if (node.children[k].start < start)
			{
				start = node.children[k].start;
			}
			
			if (node.children[k].end > end)
			{
				end = node.children[k].end;
			}
		}
		
		node.x = new Array(end - start);
		
		for (var k = 0; k < node.children.length; k++)
		{
			for (var i = 0; i < node.children[k].children[0].x.length; i++)
			{
				node.x[node.children[k].start + i] = node.children[k].children[0].x[i];
			}
		}
	}
	
	if (node.type == "Sta")
	{
		// do nothing (everything will be taken care of by the parent Grp)
	}
	
	if (node.type == "Note")
	{
		// if the node itself does not have an 'instrument' field, it looks to the parent until it finds one
		// obsolete - replaced by passing instrument as an arg
		//var instrument = GetParent(node, "instrument");  
		var amp = GetParent(node, "amp");
		var note = GetParent(node, "note");
		var durationInMeasures = GetParent(node, "duration");
		
		var durationInSamples = Math.ceil(durationInMeasures * music.piece.beatsPerMeasure / music.piece.beatsPerMinute * 60 * 44100);
		
		var freqInCycles = NoteToFreq(note);
		var freqInRadians = freqInCycles * Math.PI * 2;
		
		node.x = instrument(amp, freqInRadians, durationInSamples);
	}
	
	if (node.type == "Chord")
	{
		// node.roman = "I"
		// (also need to know the key)
	}
	
	node.state = "Composed";
}

function GetParent(obj, field)
{
	if (obj[field])
	{
		return obj[field];
	}
	else
	{
		if (obj.parent)
		{
			return GetParent(obj.parent, field);
		}
		else
		{
			throw new Error();
		}
	}
}

function Composite(totalLength, notes)
{
	var x = new Array(totalLength);
	
	for (var i = 0; i < totalLength; i++)
	{
		x[i] = 0;
	}
	
	for (var i = 0; i < notes.length; i++)
	{
		var note = notes[i];
		
		for (var k = 0; k < note.x.length; k++)
		{
			x[note.start + k] = note.x[k];
		}
	}
	
	return x;
}

function Violin(amp, freq, duration)
{
	var x = new Array(duration);
	
	for (var i = 0; i < duration; i++)
	{
		var t = i / 44100;
		var y = 0;
		
		y *= amp;
		x[i] = 0;
	}
	
	return x;
}

function Drum(amp, freq, duration)
{
	var x = new Array(duration);
	
	for (var i = 0; i < duration; i++)
	{
		var t = i / 44100;
		
		var y = 0.5*noise(32000*t)*Math.exp(-32*t);
		y += 2.0*noise(3200*t)*Math.exp(-32*t);
		y += 3.0*Math.cos(400*(1-t)*t)*Math.exp(-4*t);
		y *= amp;
		
		x[i] = y;
	}
	
	return x;
}

function Guitar(amp, freq, duration)
{
	var x = new Array(duration);
	
	// these are the parameters to the sigmoid function, to avoid loud cracks at the beginning of the note
	// the sigmoid function used is x/sqrt(1+x^2)
	// perhaps we can avoid the cracks by means of adding just a smidgen of jitter to the start time
	//var times = 20;
	//var minus = 1;
	
	for (var i = 0; i < duration; i++)
	{
		var t = i / 44100;
		var f = Math.cos(0.251*freq*t);
		var y = 0.5*Math.cos(1.0*freq*t+3.14*f)*Math.exp(-0.0007*freq*t);
		y += 0.2*Math.cos(2.0*freq*t+3.14*f)*Math.exp(-0.0009*freq*t);
		y += 0.2*Math.cos(4.0*freq*t+3.14*f)*Math.exp(-0.0016*freq*t);
		y += 0.1*Math.cos(8.0*freq*t+3.14*f)*Math.exp(-0.0020*freq*t);
		y *= 0.9 + 0.1*Math.cos(70.0*t);
		y = 2.0*y*Math.exp(-22.0*t) + y;
		y *= amp;
		
		//var sigmoidX = t * times - minus;
		//var sigmoidY = sigmoidX / Math.sqrt(1 + Math.pow(sigmoidX, 2));
		//y *= sigmoidY;
		
		x[i] = y;
	}
	
	return x;
}

function Piano(amp, freq, duration)
{
	var x = new Array(duration);
	
	for (var i = 0; i < duration; i++)
	{
		var t = i / 44100;
		var y = 0.6*Math.sin(1.0*freq*t)*Math.exp(-0.0008*freq*t);
		y += 0.3*Math.sin(2.0*freq*t)*Math.exp(-0.0010*freq*t);
		y += 0.1*Math.sin(4.0*freq*t)*Math.exp(-0.0015*freq*t);
		y += 0.2*y*y*y;
		y *= 0.9 + 0.1*Math.cos(70.0*t);
		y = 2.0*y*Math.exp(-22.0*t) + y;
		y *= amp;
		x[i] = y;
	}
	
	return x;
}

function Noise(x)
{
	var grad = function(n, x)
	{
		n = (n << 13) ^ n;
		n = (n * (n * n * 15731 + 789221) + 1376312589);
		var res = x;
		
		if (n & 0x20000000) 
		{
			res = -x;
		}
		
		return res;
	};

    var i = Math.floor(x);
    var f = x - i;
    var w = f*f*f*(f*(f*6.0-15.0)+10.0);
    var a = grad( i+0, f+0.0 );
    var b = grad( i+1, f-1.0 );
    return a + (b-a)*w;
}

function DrawWave(view)
{
	var g = globals.g;
	
	//var clearlf = Get(view.left) - 2;
	//var cleartp = Get(view.cy) - 150;
	//var clearwd = 4000;
	//var clearhg = 300;
	//g.clearRect(clearlf, cleartp, clearwd, clearhg);
	
	var blackPath = Get(view.paths)[0];
	var redPath = Get(view.paths)[1];
	var blackSlice = blackPath.slice;
	var redSlice = redPath.slice;
	
	var xPixelsPerSample = Get(view.xPixelsPerSample);
	var samplesPerXPixel = Get(view.samplesPerXPixel);
	var pcmsPerYPixel = Get(view.pcmsPerYPixel);
	var cy = Get(view.cy);
	
	var start = Get(blackSlice.samples.start);
	var end = Get(blackSlice.samples.end);
	var redStart = Get(redSlice.samples.start);
	
	var i, x, y;

	if (blackPath.pcms)
	{
		g.lineWidth = 1;
		g.strokeStyle = blackPath.stroke;
		
		x = Get(view.left);
		y = cy - blackPath.pcms[0] / pcmsPerYPixel;
		
		g.beginPath();
		g.moveTo(x, y);
	
		i = start;
		while (i < end && i < blackPath.pcms.length)
		{
			x += xPixelsPerSample;
			y = cy - blackPath.pcms[i] / pcmsPerYPixel;
			g.lineTo(x, y);
			
			i += samplesPerXPixel;
		}
		
		g.stroke();
	}
	
	if (redPath.pcms)
	{
		g.lineWidth = 1;
		g.strokeStyle = redPath.stroke;
		
		x = Get(view.left);
		y = cy - redPath.pcms[0] / pcmsPerYPixel;
		
		var started = false;
		
		i = start;
		while (i < end && (i - redStart) < redPath.pcms.length)
		{
			if (!started && i >= redStart)
			{
				started = true;
				g.beginPath();
				g.moveTo(x, y);
			}
			else
			{
				g.lineTo(x, y);
			}
	
			x += xPixelsPerSample;
			y = cy - redPath.pcms[i - redStart] / pcmsPerYPixel;
			i += samplesPerXPixel;
		}
		
		g.stroke();
	}
}

function WavReader(event) 
{
	// globals.reader.onload = ReaderPatch;
	
	var view = new Uint8Array(event.target.result, 0, event.target.result.byteLength);
	var wav = ReadWav(view);
	music.view.pcms = wav.xs[0]; // hardcoded selection of the first channel
	globals.redraw = true;
}

function ReadWav(x)
{
	var wav = {};
		
	var c = 0;
	
	wav.riffChunkId = "";
    wav.riffChunkId += x[c++];
    wav.riffChunkId += x[c++];
    wav.riffChunkId += x[c++];
    wav.riffChunkId += x[c++];
    wav.riffChunkSize = 0;
    wav.riffChunkSize += x[c++];
    wav.riffChunkSize += x[c++] * 256;
    wav.riffChunkSize += x[c++] * 256 * 256;
    wav.riffChunkSize += x[c++] * 256 * 256 * 256;
    wav.wave = "";
    wav.wave += x[c++];
    wav.wave += x[c++];
    wav.wave += x[c++];
    wav.wave += x[c++];
    wav.formatChunkId = "";
    wav.formatChunkId += x[c++];
    wav.formatChunkId += x[c++];
    wav.formatChunkId += x[c++];
    wav.formatChunkId += x[c++];
    wav.formatChunkSize = 0;
    wav.formatChunkSize += x[c++];
    wav.formatChunkSize += x[c++] * 256;
    wav.formatChunkSize += x[c++] * 256 * 256;
    wav.formatChunkSize += x[c++] * 256 * 256 * 256;
    wav.formatTag = 0;
    wav.formatTag += x[c++];
    wav.formatTag += x[c++] * 256;
    wav.nChannels = 0;
    wav.nChannels += x[c++];
    wav.nChannels += x[c++] * 256;
    wav.nSamplesPerSec = 0;
    wav.nSamplesPerSec += x[c++];
    wav.nSamplesPerSec += x[c++] * 256;
    wav.nSamplesPerSec += x[c++] * 256 * 256;
    wav.nSamplesPerSec += x[c++] * 256 * 256 * 256;
    wav.nAvgBytesPerSec = 0;
    wav.nAvgBytesPerSec += x[c++];
    wav.nAvgBytesPerSec += x[c++] * 256;
    wav.nAvgBytesPerSec += x[c++] * 256 * 256;
    wav.nAvgBytesPerSec += x[c++] * 256 * 256 * 256;
    wav.nBlockAlign = 0;
    wav.nBlockAlign += x[c++];
    wav.nBlockAlign += x[c++] * 256;
    wav.nBitsPerSample = 0;
    wav.nBitsPerSample += x[c++];
    wav.nBitsPerSample += x[c++] * 256;
    wav.dataChunkId = "";
    wav.dataChunkId += x[c++];
    wav.dataChunkId += x[c++];
    wav.dataChunkId += x[c++];
    wav.dataChunkId += x[c++];
    wav.dataChunkSize = 0;
    wav.dataChunkSize += x[c++];
    wav.dataChunkSize += x[c++] * 256;
    wav.dataChunkSize += x[c++] * 256 * 256;
    wav.dataChunkSize += x[c++] * 256 * 256 * 256;
	
	var bytesPerSample = wav.nBitsPerSample / 8;
	
	var n = wav.dataChunkSize / bytesPerSample / wav.nChannels;
	
	wav.xs = new Array(wav.nChannels);
	
	for (var j = 0; j < wav.xs.length; j++)
	{
		wav.xs[j] = new Array(n);
	}
	
	var l = 44; // this is not always 44
	
	for (var i = 0; i < n; i++)
	{
		for (var j = 0; j < wav.xs.length; j++)
		{
			var pcm = 0;
			var multiplier = 1;
			
			for (var k = 0; k < bytesPerSample; k++)
			{
				pcm += x[l] * multiplier;
				multiplier *= 256;
				l++;
			}
			
			// (bytesPerSample == 1) => (maskOfTheSignBit == 0b10000000 == 0x80)
			// (bytesPerSample == 2) => (maskOfTheSignBit == 0b1000000000000000 == 0x8000)
			var maskOfTheSignBit = 1;

            for (var k = 0; k < bytesPerSample; k++)
            {
                maskOfTheSignBit <<= 8;
            }

            maskOfTheSignBit >>= 1;

            if ((pcm & maskOfTheSignBit) != 0) // if pcm is negative
            {
                pcm -= maskOfTheSignBit << 1;
            }
			
			wav.xs[j][i] = pcm;
		}
	}
	
	return wav;
}

function MakeWav(x)
{	
	var riffChunkId = "RIFF";
	var riffChunkSize = null;
	var wave = "WAVE";
	var formatChunkId = "fmt ";
	var formatChunkSize = 16;
	var formatTag = 1;
	var nChannels = 1; // can be 2
	var nSamplesPerSec = 44100;
	var nAvgBytesPerSec = null;
	var nBlockAlign = null;
	var nBitsPerSample = 16;
	var dataChunkId = "data";
	var dataChunkSize = null;
	
	var bytesPerSample = nBitsPerSample / 8;
	dataChunkSize = x.length * bytesPerSample * nChannels;
	nAvgBytesPerSec = nSamplesPerSec * bytesPerSample * nChannels;
	riffChunkSize = dataChunkSize + 44 - 8;
	nBlockAlign = bytesPerSample * nChannels; // ? - i think this is what nBlockAlign means
	
	var arrayBuffer = new ArrayBuffer(44 + x.length * bytesPerSample);
	var wav = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
	
	var c = 0;
	
	wav[c++] = 82; // 'RIFF'
	wav[c++] = 73;
	wav[c++] = 70;
	wav[c++] = 70;
	wav[c++] = riffChunkSize % 256;
	wav[c++] = Math.floor(riffChunkSize / 256) % 256;
	wav[c++] = Math.floor(riffChunkSize / 256 / 256) % 256;
	wav[c++] = Math.floor(riffChunkSize / 256 / 256 / 256) % 256;
	wav[c++] = 87; // 'WAVE'
	wav[c++] = 65;
	wav[c++] = 86;
	wav[c++] = 69;
	wav[c++] = 102; // 'fmt '
	wav[c++] = 109;
	wav[c++] = 116;
	wav[c++] = 32;
	wav[c++] = formatChunkSize % 256;
	wav[c++] = Math.floor(formatChunkSize / 256) % 256;
	wav[c++] = Math.floor(formatChunkSize / 256 / 256) % 256;
	wav[c++] = Math.floor(formatChunkSize / 256 / 256 / 256) % 256;
	wav[c++] = formatTag % 256;
	wav[c++] = Math.floor(formatTag / 256) % 256;
	wav[c++] = nChannels % 256;
	wav[c++] = Math.floor(nChannels / 256) % 256;
	wav[c++] = nSamplesPerSec % 256;
	wav[c++] = Math.floor(nSamplesPerSec / 256) % 256;
	wav[c++] = Math.floor(nSamplesPerSec / 256 / 256) % 256;
	wav[c++] = Math.floor(nSamplesPerSec / 256 / 256 / 256) % 256;
	wav[c++] = nAvgBytesPerSec % 256;
	wav[c++] = Math.floor(nAvgBytesPerSec / 256) % 256;
	wav[c++] = Math.floor(nAvgBytesPerSec / 256 / 256) % 256;
	wav[c++] = Math.floor(nAvgBytesPerSec / 256 / 256 / 256) % 256;
	wav[c++] = nBlockAlign % 256;
	wav[c++] = Math.floor(nBlockAlign / 256) % 256;
	wav[c++] = nBitsPerSample % 256;
	wav[c++] = Math.floor(nBitsPerSample / 256) % 256;
	wav[c++] = 100; // 'data'
	wav[c++] = 97;
	wav[c++] = 116;
	wav[c++] = 97;
	wav[c++] = dataChunkSize % 256;
	wav[c++] = Math.floor(dataChunkSize / 256) % 256;
	wav[c++] = Math.floor(dataChunkSize / 256 / 256) % 256;
	wav[c++] = Math.floor(dataChunkSize / 256 / 256 / 256) % 256;
	
	for (var i = 0; i < x.length; i++)
	{
		var b = x[i];
		
		if (b < 0)
        {
			var mult = 1;
			
			for (var k = 0; k < bytesPerSample; k++)
			{
				mult *= 256;
			}
			
            b += mult;
        }

		for (var k = 0; k < bytesPerSample; k++)
		{
			wav[44 + i * bytesPerSample + k] = Math.floor(b % 256);
			b = Math.floor(b / 256);
		}
	}
	
	return wav;
}

function MakeNotes(x)
{
	x['C8'] = 4186.0090;
	x['B7'] = 3951.0664;
	x['A#7'] = 3729.3101;
	x['A7'] = 3520.0000;
	x['G#7'] = 3322.4376;
	x['G7'] = 3135.9635;
	x['F#7'] = 2959.9554;
	x['F7'] = 2793.8259;
	x['E7'] = 2637.0205;
	x['D#7'] = 2489.0159;
	x['D7'] = 2349.3181;
	x['C#7'] = 2217.4610;
	x['C7'] = 2093.0045;
	x['B6'] = 1975.5332;
	x['A#6'] = 1864.6550;
	x['A6'] = 1760.0000;
	x['G#6'] = 1661.2188;
	x['G6'] = 1567.9817;
	x['F#6'] = 1479.9777;
	x['F6'] = 1396.9129;
	x['E6'] = 1318.5102;
	x['D#6'] = 1244.5079;
	x['D6'] = 1174.6591;
	x['C#6'] = 1108.7305;
	x['C6'] = 1046.5023;
	x['B5'] = 987.7666;
	x['A#5'] = 932.3275;
	x['A5'] = 880.0000;
	x['G#5'] = 830.6094;
	x['G5'] = 783.9909;
	x['F#5'] = 739.9888;
	x['F5'] = 698.4565;
	x['E5'] = 659.2551;
	x['D#5'] = 622.2540;
	x['D5'] = 587.3295;
	x['C#5'] = 554.3653;
	x['C5'] = 523.2511;
	x['B4'] = 493.8833;
	x['A#4'] = 466.1638;
	x['A4'] = 440.0000;
	x['G#4'] = 415.3047;
	x['G4'] = 391.9954;
	x['F#4'] = 369.9944;
	x['F4'] = 349.2282;
	x['E4'] = 329.6276;
	x['D#4'] = 311.1270;
	x['D4'] = 293.6648;
	x['C#4'] = 277.1826;
	x['C4'] = 261.6256;
	x['B3'] = 246.9417;
	x['A#3'] = 233.0819;
	x['A3'] = 220.0000;
	x['G#3'] = 207.6523;
	x['G3'] = 195.9977;
	x['F#3'] = 184.9972;
	x['F3'] = 174.6141;
	x['E3'] = 164.8138;
	x['D#3'] = 155.5635;
	x['D3'] = 146.8324;
	x['C#3'] = 138.5913;
	x['C3'] = 130.8128;
	x['B2'] = 123.4708;
	x['A#2'] = 116.5409;
	x['A2'] = 110.0000;
	x['G#2'] = 103.8262;
	x['G2'] = 97.9989;
	x['F#2'] = 92.4986;
	x['F2'] = 87.3071;
	x['E2'] = 82.4069;
	x['D#2'] = 77.7817;
	x['D2'] = 73.4162;
	x['C#2'] = 69.2957;
	x['C2'] = 65.4064;
	x['B1'] = 61.7354;
	x['A#1'] = 58.2705;
	x['A1'] = 55.0000;
	x['G#1'] = 51.9131;
	x['G1'] = 48.9994;
	x['F#1'] = 46.2493;
	x['F1'] = 43.6535;
	x['E1'] = 41.2034;
	x['D#1'] = 38.8909;
	x['D1'] = 36.7081;
	x['C#1'] = 34.6478;
	x['C1'] = 32.7032;
	x['B0'] = 30.8677;
	x['A#0'] = 29.1352;
	x['A0'] = 27.5000;
	
	x['C8'] = 4186.0090;
	x['B7'] = 3951.0664;
	x['Bb7'] = 3729.3101;
	x['A7'] = 3520.0000;
	x['Ab7'] = 3322.4376;
	x['G7'] = 3135.9635;
	x['Gb7'] = 2959.9554;
	x['F7'] = 2793.8259;
	x['E7'] = 2637.0205;
	x['Eb7'] = 2489.0159;
	x['D7'] = 2349.3181;
	x['Db7'] = 2217.4610;
	x['C7'] = 2093.0045;
	x['B6'] = 1975.5332;
	x['Bb6'] = 1864.6550;
	x['A6'] = 1760.0000;
	x['Ab7'] = 1661.2188;
	x['G6'] = 1567.9817;
	x['Gb6'] = 1479.9777;
	x['F6'] = 1396.9129;
	x['E6'] = 1318.5102;
	x['Eb6'] = 1244.5079;
	x['D6'] = 1174.6591;
	x['Db6'] = 1108.7305;
	x['C6'] = 1046.5023;
	x['B5'] = 987.7666;
	x['Bb5'] = 932.3275;
	x['A5'] = 880.0000;
	x['Ab6'] = 830.6094;
	x['G5'] = 783.9909;
	x['Gb5'] = 739.9888;
	x['F5'] = 698.4565;
	x['E5'] = 659.2551;
	x['Eb5'] = 622.2540;
	x['D5'] = 587.3295;
	x['Db5'] = 554.3653;
	x['C5'] = 523.2511;
	x['B4'] = 493.8833;
	x['Bb4'] = 466.1638;
	x['A4'] = 440.0000;
	x['Ab5'] = 415.3047;
	x['G4'] = 391.9954;
	x['Gb4'] = 369.9944;
	x['F4'] = 349.2282;
	x['E4'] = 329.6276;
	x['Eb4'] = 311.1270;
	x['D4'] = 293.6648;
	x['Db4'] = 277.1826;
	x['C4'] = 261.6256;
	x['B3'] = 246.9417;
	x['Bb3'] = 233.0819;
	x['A3'] = 220.0000;
	x['Ab4'] = 207.6523;
	x['G3'] = 195.9977;
	x['Gb3'] = 184.9972;
	x['F3'] = 174.6141;
	x['E3'] = 164.8138;
	x['Eb3'] = 155.5635;
	x['D3'] = 146.8324;
	x['Db3'] = 138.5913;
	x['C3'] = 130.8128;
	x['B2'] = 123.4708;
	x['Bb2'] = 116.5409;
	x['A2'] = 110.0000;
	x['Ab3'] = 103.8262;
	x['G2'] = 97.9989;
	x['Gb2'] = 92.4986;
	x['F2'] = 87.3071;
	x['E2'] = 82.4069;
	x['Eb2'] = 77.7817;
	x['D2'] = 73.4162;
	x['Db2'] = 69.2957;
	x['C2'] = 65.4064;
	x['B1'] = 61.7354;
	x['Bb1'] = 58.2705;
	x['A1'] = 55.0000;
	x['Ab2'] = 51.9131;
	x['G1'] = 48.9994;
	x['Gb1'] = 46.2493;
	x['F1'] = 43.6535;
	x['E1'] = 41.2034;
	x['Eb1'] = 38.8909;
	x['D1'] = 36.7081;
	x['Db1'] = 34.6478;
	x['C1'] = 32.7032;
	x['B0'] = 30.8677;
	x['Bb0'] = 29.1352;
	x['A0'] = 27.5000;
}


//function OnHoverNumberBox()
//{
//    OnHoverCell(); // pseudo-inheritance
//    Push("RD", PrimeScrub);
//    Push("RU", DeactScrub);
//}
//
//function DeHoverNumberBox()
//{
//	DeHoverCell(); // pseudo-inheritance
//    Pop("RD");
//    Pop("RU");
//}

function OnHoverDigit(c)
{
	c.cell.onhover(c.cell);
	c.oldFill = c.fill;
	c.fill = "rgb(255,0,0)";
	globals.redraw = true;
	
	var Scroll = function()
	{
		var cell = c.cell;
		var slot = cell.slot;
		
		Set(slot, Get(slot) + globals.delta * c.scale);
		
		cell.redisplay(cell);
		cell.position(cell);
		
		// synthesize a new mousemove because the underlying hover has changed (the char has regenerated)
		Event("MM");
		
		globals.redraw = true;
	};
	
	Push("MW", Scroll);
}

function DeHoverDigit(c)
{
	c.cell.dehover(c.cell);
	c.fill = c.oldFill;
	globals.redraw = true;
	delete c.oldFill;
	Pop("MW");
}

function OnHoverNonDigit(c)
{
	var cell = c.cell;
	cell.onhover(cell); // if the cell is scrubbable, need to call OnHoverScrubbable
}

function DeHoverNonDigit(c)
{
	var cell = c.cell;
	cell.dehover(cell); // if the cell is scrubbable, need to call DeHoverScrubbable
}

function PrimeScrub()
{
	var Scrub = function()
	{
		Set(globals.fmx, Get(globals.mx));
		
		var cell = null;
		
		if (globals.hovered.type == "char")
		{
			cell = globals.hovered.cell;
		}
		else if (globals.hovered.type == "cell")
		{
			cell = globals.hovered;
		}
		
		globals.scrubOrigValue = Get(cell.slot);
	
		globals.scrubScale = 1;
	
		var scrubValue = globals.scrubOrigValue + globals.scrubScale * (Get(globals.mx) - Get(globals.fmx));
		
		Set(cell.slot, scrubValue);
		
		cell.redisplay(cell);
	};

    Push("MM", Scrub);
}

function DeactScrub()
{
	Pop("MM");
}

function IsDigit(c)
{
	if (c == "0" || c == "1" || c == "2" || c == "3" || c == "4" || c == "5" || c == "6" || c == "7" || c == "8" || c == "9")
	{
		return true;
	}
	else
	{
		return false;
	}
}


function Login()
{
	// all we do here is store the password, and then use it to encrypt messages to the server and generate MACs
	// note that we don't need a response from the server to log in, if we're starting with a blank canvas
	// of course, more usually, the result will be presenting you a menu of colls to choose from - the landing page on login is the file viewer
	
	Popup();
}

function Signup()
{
	// get the server's public key
	// verify it with some certificate authority
	// encrypt your username and password
	// send it to the server
}

function Popup()
{
	var name = NonConflictingName("Popup");
	var popup = MakeObj(globals.canvas, name);
	globals.canvas[name] = popup;
	popup["[type]"] = "Collection";
	
	// semi-transparent gray background on rest over rest of canvas
	popup.screen = MakeObj(popup, "screen");
	AddRectSlots(popup.screen);
	Set(popup.screen.width, 1600); // window.width
	Set(popup.screen.height, 900); // window.height
	Set(popup.screen.top, 0);
	Set(popup.screen.left, 0);
	popup.screen.fill = "rgb(128,128,128)"; // make it transparent - how?
	popup.screen.draw = DrawBox;
	
	// white form
	popup.form = MakeObj(popup, "form");
	AddRectSlots(popup.form);
	Set(popup.form.width, 300);
	Set(popup.form.height, 400);
	Set(popup.form.cx, Get(popup.screen.cx));
	Set(popup.form.cy, Get(popup.screen.cy));
	popup.form.fill = "rgb(255,255,255)";
	popup.form.draw = DrawBox;
	
	var usernameLabel = DisplayStringAsCell(popup, "usernameLabel", "Username:");
	var passwordLabel = DisplayStringAsCell(popup, "passwordLabel", "Password:");
	var usernameCell = DisplayStringAsCell(popup, "usernameCell", "");
	var passwordCell = DisplayStringAsCell(popup, "passwordCell", "");
	
	usernameLabel.click = null;
	passwordLabel.click = null;
	
	popup.usernameLabel = usernameLabel;
	popup.passwordLabel = passwordLabel;
	popup.usernameCell = usernameCell;
	popup.passwordCell = passwordCell;
	
	Set(usernameLabel.width, 100);
	Set(usernameLabel.height, 30);
	Set(usernameLabel.left, Get(popup.form.left) + 30);
	Set(usernameLabel.top, Get(popup.form.top) + 30);
	usernameLabel.stroke = null;
	
	Set(passwordLabel.width, 100);
	Set(passwordLabel.height, 30);
	Set(passwordLabel.left, Get(usernameLabel.left));
	Set(passwordLabel.top, Get(usernameLabel.bottom) + 10);
	passwordLabel.stroke = null;
	
	Set(usernameCell.width, 100);
	Set(usernameCell.height, 30);
	Set(usernameCell.left, Get(usernameLabel.right) + 20);
	Set(usernameCell.top, Get(usernameLabel.top));
	
	Set(passwordCell.width, 100);
	Set(passwordCell.height, 30);
	Set(passwordCell.left, Get(passwordLabel.right) + 20);
	Set(passwordCell.top, Get(passwordLabel.top));
	
	usernameLabel.position(usernameLabel);
	passwordLabel.position(passwordLabel);
	usernameCell.position(usernameCell);
	passwordCell.position(passwordCell);
	
	popup.closeButton = MakeObj(popup, "closeButton");
	AddRectSlots(popup.closeButton);
	popup.closeButton.img = document.getElementById("Close");
	popup.closeButton.fn = Close;
	popup.closeButton.version = 0;
	popup.closeButton.onhover = OnHoverButton;
	popup.closeButton.dehover = DeHoverButton;
	popup.closeButton.draw = DrawButton;
	popup.closeButton.click = ClickBox;
	Set(popup.closeButton.width, popup.closeButton.img.height);
	Set(popup.closeButton.height, popup.closeButton.img.height);
	Set(popup.closeButton.cx, Get(popup.form.right));
	Set(popup.closeButton.cy, Get(popup.form.top));
	
	globals.redraw = true;
}

function Close()
{
	globals.popup = null; // or something
	globals.redraw = true;
}

function NonConflictingName(name)
{
	var c = 0;
	
	while (true)
	{
		var possname = name + c.toString();
		
		if (globals.canvas[possname])
		{
			c++;
		}
		else
		{
			return possname;
		}
	}
}


function MakeRootree(parent, name)
{
	var tree = MakeObj(parent, name);
	AddRectSlots(tree);
	tree.contents = MakeList(tree, "contents");
	tree.twigs = MakeList(tree, "twigs");
	tree.indents = MakeList(tree, "indents");
	tree.root = null;
	tree.obj = null;
	tree.budField = null;
	tree.childrenField = null;
	tree.position = PositionRootree;
	tree.draw = DrawRootree;
	tree.click = ClickContents;
	tree.onfocus = OnFocusTree;
	tree.defocus = DeFocusTree;
	tree.editActive = EditSelectedSetTreeShape;
	
	// in our mental coordinate system, we consider the centers of pixels to be whole numbers, and the pixel edges to be halves
	// unfortunately, canvas sees it the opposite way: pixel edges are whole numbers, and pixel centers are halves
	// there is basically one global correction for this, applied in DrawBox - we subtract 0.5 from both left and top before drawing (width and height are unchanged)
	
	// now, we want umbilicals to come out of the precise centers of rootree boxes
	// that means that cx must be a whole number, which means the width must be even
	
	// this situation is reversed for boxtrees - where we want both cx and cy to be halves and the width and the height to be odd
	// (these conditions preserve sharpness for any configuration of the tree)
	
	// specific to rootrees
	tree.subWidth = MakeSlot(tree, "subWidth", 64);
	tree.subHeight = MakeSlot(tree, "subHeight", 20);
	tree.halfgap = MakeSlot(tree, "halfgap", 10);
	
	return tree;
}

function MakeRootreeTwig(tree, parentTwig, data)
{
	var twig = MakeObj(tree.twigs, tree.twigs.length.toString()); // when children are inserted, the [parent] and [name] fields will be overwritten by a call to GenerateContents(tree)
	//AddRectSlots(twig); // not necessary - we click and interact with the cells, not the twigs
	twig.data = data;

	// why should the rootree have references to all umbilicals, instead of each twig having reference to its own umbilical?
	
	// for right now, twig.contents is always a cell - in the future, this need not be so
	twig.contents = DisplaySlotAsCell(twig, "contents", data[tree.budField]);
	
	var cell = twig.contents;
	
	cell.container = tree; // order matters - redisplay might depend on the container
	
	cell.redisplay = RedisplayCellString;
	cell.redisplay(cell);
	
	twig.parent = parentTwig;
	twig.children = MakeList(twig, "children");
	
	var objChildren = data[tree.childrenField]; // objChildren must be a list
	
	for (var i = 0; i < objChildren.length; i++)
	{
		var child = MakeRootreeTwig(tree, twig, objChildren[i]);
		twig.children.push(child);
	}
	
	twig.umbilical = MakeUmbilical(twig, "umbilical");
	
	return twig;
}

function GenerateRootreeTwigs(tree)
{
	tree.root = MakeRootreeTwig(tree, null, tree.obj);
	
	GenerateContents(tree);
}

function PositionRootree(tree)
{
	var indents = Get(tree.indents);
	
	var subWidth = Get(tree.subWidth);
	var subHeight = Get(tree.subHeight);
	var halfgap = Get(tree.halfgap);
	
	var dxs = Dimension(indents, subWidth);
	
	var rootSub = tree.root.contents;
	
	MoveBox(rootSub, "width", "cx", subWidth);
	MoveBox(rootSub, "height", "cy", subHeight);
	MoveBox(rootSub, "cx", "width", Get(rootSub.cx)); // we assume that cx and cy have been set externally - just re-do the calculation here to make sure
	MoveBox(rootSub, "cy", "height", Get(rootSub.cy));
	
	rootSub.position(rootSub);
	
	for (var i = 1; i < tree.twigs.length; i++)
	{
		var twig = tree.twigs[i];
		var parentTwig = twig.parent;
		
		var sub = twig.contents;
		var parentSub = parentTwig.contents;
		
		var parentcx = Get(parentSub.cx);
		var parentcy = Get(parentSub.cy);
		
		MoveBox(sub, "width", "cx", subWidth);
		MoveBox(sub, "height", "cy", subHeight);
		MoveBox(sub, "cx", "width", parentcx + dxs[i]);
		MoveBox(sub, "cy", "height", parentcy + halfgap * 2 + subHeight);
		
		// this could be handled by automata
		var umbilical = twig.umbilical;
		umbilical.points[0].x = Get(sub.cx);
		umbilical.points[0].y = Get(sub.top);
		umbilical.points[1].x = Get(sub.cx);
		umbilical.points[1].y = Get(sub.top) - halfgap;
		umbilical.points[2].x = parentcx;
		umbilical.points[2].y = Get(sub.top) - halfgap;
		umbilical.points[3].x = parentcx;
		umbilical.points[3].y = Get(parentSub.bottom);
		
		sub.position(sub);
	}
}

function DrawRootree(tree)
{
	for (var i = 0; i < tree.twigs.length; i++)
	{
		var twig = tree.twigs[i];
		
		var sub = twig.contents;
		
		if (sub.draw)
		{
			sub.draw(sub);
		}
		
		twig.umbilical.draw(twig.umbilical);
	}
	
	for (var i = 0; i < tree.contents.length; i++)
	{
		var sub = tree.contents[i];
		DrawBorder(sub);
	}
	
	//if (tree.activeContent)
	//{
	//	var sub = tree.activeContent;
	//	DrawActiveBorder(Get(sub.left), Get(sub.top), Get(sub.right), Get(sub.bottom));
	//}
}

function TogglePlaceRootreeMode()
{
	if (globals.placeRootreeMode)
	{
		globals.canvas.buttons["TogglePlaceRootreeModeButton"].version = 0;
		ExitPlaceRootreeMode();
		globals.placeRootreeMode = false;
	}
	else
	{
		globals.canvas.buttons["TogglePlaceRootreeModeButton"].version = 2;
		EnterPlaceRootreeMode();
		globals.placeRootreeMode = true;
	}
}

function EnterPlaceRootreeMode()
{
	PushUnder("LD", PlaceRootree);
}

function ExitPlaceRootreeMode()
{
	PopUnder("LD");
}

function PlaceRootree()
{
	var defaultObjName = "Obj" + globals.id.toString();
	var obj = MakeSlot(globals.canvas, defaultObjName, "");
	globals.canvas[defaultObjName] = obj;
	
	var defaultTreeName = "Tree" + (globals.objcounts.tree++).toString();
	var tree = MakeRootree(globals.canvas, defaultTreeName);
	globals.canvas[defaultTreeName] = tree;
	
	obj.bud = MakeSlot(obj, "bud", "foo");
	obj.children = MakeList(obj, "children");
	
	tree.makeTwig = MakeRootreeTwig;
	
	tree.obj = obj;
	tree.budField = "bud";
	tree.childrenField = "children";
	GenerateRootreeTwigs(tree);
	
	MoveBox(tree.root.contents, "cx", "width", Get(globals.mx));
	MoveBox(tree.root.contents, "cy", "height", Get(globals.my));
	//MoveBox(tree.root, "width", "cx", 200);
	//MoveBox(tree.root, "height", "cy", 200);
	
	tree.position(tree);
	
	globals.redraw = true;
}

function DisplayRootree(parent, name, tree, displaySub)
{	
	var shape = MakeObj(parent, name);
	
	for (var i = 0; i < tree.contents.length; i++)
	{
		var root = tree.contents[i];
		
		var rootShape = MakeObj(shape.contents, i.toString());
		shape.contents[i] = rootShape;
		
		rootShape.container = shape;
		rootShape.parentSelect = ParentSelectRootShape;
		rootShape.parentDeselect = ParentDeselectRootShape;
		rootShape.click = ClickSingletonContents; // a passthrough
		rootShape.contents = displaySub(root.contents);
		rootShape.contents.stroke = "rgb(158,182,206)"; // "rgb(208,215,229)";
		rootShape.contents.parentShape = rootShape;
		rootShape.data = root;
		
		shape.umbilicals[i] = MakeUmbilical(shape.umbilicals, i.toString());
	}
	
	// replicate the tree structure in the shape tree
	shape.root = shape.contents[0];
	
	for (var i = 0; i < tree.contents.length; i++)
	{
		var rootShape = shape.contents[i];
		var root = tree.contents[i];
		
		rootShape.parent = shape.contents[tree.contents.indexOf(root.parent)];
		rootShape.children = MakeList(rootShape, "children");
		
		for (var j = 0; j < root.children.length; j++)
		{
			rootShape.children.push(shape.contents[tree.contents.indexOf(root.children[j])]);
		}
	}
	
	return shape;
}

function MakeUmbilical(parent, name)
{
	var umbilical = MakeObj(parent, name);
	umbilical.draw = DrawLinepath; // each segment is drawn by canvas as an individual line
	umbilical.lineWidth = 1;
	//umbilical.stroke = "rgb(158,182,206)";
	umbilical.stroke = "rgb(0,0,0)";
	umbilical.points = MakeList(umbilical, "points");
	
	for (var i = 0; i < 4; i++)
	{
		var seg = MakeObj(umbilical.points, i.toString());
		seg.x = null;
		seg.y = null;
		umbilical.points.push(seg);
	}
	
	return umbilical;
}


function Save() // Ctrl+S
{
	// if nothing is selected, save the whole canvas - otherwise save the data underlying the selected object
	
	var obj = null;
	
	if (globals.focussed)
	{
		// for now, we can't do this, because the focussed element is NOT the root of everything we want to save - a grid, for example, has a *parallel* data object
		// ok, so a possible solution is to also nullify the parent of the data object.  but we maybe need to think on that a bit
		throw new Error();
		obj = globals.focussed;
	}
	else
	{
		obj = globals.canvas;
	}
	
	//var parent = obj["[parent]"];
	//obj["[parent]"] = "sentinel";
	
	var lines = SerializeLinear(obj);
	var filename = obj["[name]"] + " - " + Date.now().toString() + ".js";
	
	//obj["[parent]"] = parent;
	
	WriteLinesToServer(lines, filename);

	// this saves in .json format
	//SaveObj(globals.canvas, Date.now().toString() + ".json");
}

function Open() // Ctrl+O
{
	// some sort of pop-up to display the user's files - this could be straight HTML, we don't need to get all fancy
	//var url = PopupGetUrl();
	//Load(globals.canvas, url);
	
	LoadLinear(globals.canvas, "canvas - 1381874033951.js");
}

function LoadLinear(parent, url)
{
	// create a new script tag, set the src and let it load, then call PatchLinks
	
	// a problem here is that we can't change the name of the loaded object, and we can't control where it goes
	// what we need to do is name the parent object some global nonce, and then reference that
	// i mean, instead of the parent object being globals.canvas.Grid1, we just assign it to a global variable

	var script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	
	script.onload = function()
  	{
		PatchLinks(x); // we call the loaded object 'x'
		globals.canvas = x; // again, until we resolve the parallel data obj problem, we only support saving of the full canvas
		x["[parent]"] = globals.canvas;
  	}
	
	script.setAttribute("src", url);
	
	var body = document.getElementsByTagName("body")[0];
	body.appendChild(script);
}

function Load(parent, url)
{
	var xmlhttp = new XMLHttpRequest();
	
	xmlhttp.onreadystatechange = function()
  	{
  		if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
    	{
			var obj = DeserializeObj(parent, xmlhttp.responseText);
			
			//var f = function()
			//{
			//	var s = SerializeObj(obj);
			//	WriteBlobToServer(s, url); // we use the same URL
			//};
			//
			//Push("Ctrl+S", f);
    	}
  	}
	
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
}

function SaveObj(obj, filename)
{
	var s = SerializeObj(obj);
	WriteBlobToServer(s, filename);
}

function SerializeObj(obj)
{
	var parent = obj["[parent]"];
	
	SerializePrep(obj);
	NullifyParents(obj);
	
	var s = JSON.stringify(obj);
	
	// follow the same procedure as in DeserializeObj below
	DeserializeRec(obj); // undo all the link breaking
	obj["[parent]"] = parent;
	
	return s;
}

function SerializeLinear(obj)
{
	var l = [];
	
	var parent = obj["[parent]"];
	//var name = obj["[name]"];
	//
	obj["[parent]"] = "sentinel";
	//obj["[name]"] = null;
	
	SerializeRec(l, obj);
	
	obj["[parent]"] = parent;
	//obj["[name]"] = name;
	
	return l;
}

function SerializeRec(l, obj)
{
	// this produces lines of .js code to be loaded and executed
	// a nice feature is that we don't destructively overwrite links in the original objs during prep - it's read-only
	
	var lhs = LinkString(obj);
	
	var line = lhs + " = ";
	
	if (obj.constructor == Array) // i guess this is as good a test as any
	{
		line += "[];";
	}
	else
	{
		line += "{};";
	}
	
	l.push(line);

	for (var key in obj)
	{
		var val = obj[key];
		var type = typeof(val);
		
		line = lhs + "['" + key + "'] = ";
		
		var addLine = true;
		
		if (type == "object")
		{
			if (val == null)
			{
				// in serialization, null acts the same as a primitive type - but javascript says null is of type "object", so here we are
				line += "null;";
			}
			else if (val.toString() == "[object HTMLImageElement]")
			{
				line += "{ '[img]' : '" + val.src.substring(21) + "' };"; // regenerate full Image object later - the .substring(21) cuts off 'http://localhost:713/'
			}
			else
			{
				if (val["[parent]"] == obj)
				{
					SerializeRec(l, val);
					addLine = false;
				}
				else
				{
					line += "{ '[link]' : \"" + LinkString(val) + "\" };";
				}
			}
		}
		else if (type == "function")
		{
			if (key == "f") // this is the filter we use to capture Function objects
			{
				line += "null;"; // eliminate Function objects - then regenerate them during deserialization by calling Function(body)
			}
			else if (key == "img") // wait, is this necessary now that we have the whole [object HTMLImageElement] above?
			{
				line += "{ '[img]' : '" + val.src.substring(21) + "' };"; // regenerate full Image object later - the .substring(21) cuts off 'http://localhost:713/'
			}
			else
			{
				line += "{ '[link]' : " + val.name + " };"; // assume this is a link to a global function
			}
		}
		else
		{
			if (typeof(val) == "string")
			{
				line += "'" + val.toString() + "';";
			}
			else
			{
				line += val.toString() + ";";
			}
		}
		
		if (addLine)
		{
			l.push(line);
		}
	}
}

function DeserializeObj(parent, str)
{
	var obj = JSON.parse(str);
	
	parent[obj["[name]"]] = obj; // this is so internal links can be resolved correctly
	DeserializeRec(obj);
	obj["[parent]"] = parent; // order matters - this line causes a stack overflow if it occurs before DeserializeRec

	return obj;
}

function PatchLinks(obj)
{
	// this patches a loaded linear .js file
	
	obj["[id]"] = globals.id++;
	
	for (var key in obj)
	{
		var val = obj[key];
		var type = typeof(val);
		
		if (type == "object")
		{
			if (val == null)
			{
			
			}
			else
			{
				if (val["[link]"])
				{
					obj[key] = eval(val["[link]"]);
				}
				else if (val["[img]"])
				{
					obj[key] = new Image();
					obj[key].src = val["[img]"];
				}
				else
				{
					PatchLinks(val);
					
					//val["[parent]"] = obj; // this must come *after* DeserializeRec - it causes a 2-node infinite loop between obj and val if not
					//val["[name]"] = key;
				}
			}
		}
	}
}

function DeserializeRec(obj)
{	
	// this patches a loaded .json file
	
	obj["[id]"] = globals.id++;
	
	for (var key in obj)
	{
		var val = obj[key];
		var type = typeof(val);
		
		if (type == "object")
		{
			if (val == null)
			{
			
			}
			else
			{
				if (val["[link]"])
				{
					obj[key] = eval(val["[link]"]);
				}
				else if (val["[img]"])
				{
					obj[key] = new Image();
					obj[key].src = val["[img]"];
				}
				else
				{
					DeserializeRec(val);
					
					val["[parent]"] = obj; // this must come *after* DeserializeRec - it causes a 2-node infinite loop between obj and val if not
					val["[name]"] = key;
				}
			}
		}
	}
}

function NullifyParents(obj)
{
	if (obj["[parent]"])
	{
		delete obj["[parent]"];
	}
	else
	{
		return;
	}
	
	var keys = [];
	
	for (var key in obj)
	{
		var val = obj[key];
		var type = typeof(val);
		
		if (type == "object")
		{
			if (val == null)
			{
			
			}
			else
			{
				NullifyParents(val);
			}
		}
	}
}

function SerializePrep(obj)
{
	var keys = [];
	
	for (var key in obj)
	{
		if (key == "[parent]") // plus key == "[id]", etc.
		{
			// skip
		}
		else
		{
			keys.push(key); // we do this because we assign to obj[key] below, and we don't want to do this in a 'for (var key in obj)' loop
		}
	}
	
	for (var i = 0; i < keys.length; i++)
	{
		var key = keys[i];
		var val = obj[key];
		var type = typeof(val);
		
		if (type == "object")
		{
			if (val == null)
			{
				// in serialization, null acts the same as a primitive type - but javascript says null is of type "object", so here we are
			}
			else if (val.toString() == "[object HTMLImageElement]")
			{
				obj[key] = { "[img]" : val.src }; // regenerate full Image object later
			}
			else
			{
				if (val["[parent]"] == obj)
				{
					SerializePrep(val);
				}
				else
				{
					obj[key] = { "[link]" : LinkString(val) };
				}
			}
		}
		else if (type == "function")
		{
			if (key == "f") // this is the filter we use to capture Function objects
			{
				obj[key] = null; // eliminate Function objects - then regenerate them during deserialization by calling Function(body)
			}
			else if (key == "img") // wait, is this necessary now that we have the whole [object HTMLImageElement] above?
			{
				obj[key] = { "[img]" : val.src }; // regenerate full Image object later
			}
			else
			{
				obj[key] = { "[link]" : val.name }; // assume this is a link to a global function
			}
		}
		else
		{
			// do nothing to primitive types
		}
	}
}

//function LinkString(obj)
//{
//	var parent = obj["[parent]"];
//	
//	var s = null;
//	
//	if (parent)
//	{
//		var n = obj["[name]"];
//		
//		if (!n)
//		{
//			throw new Error();
//		}
//		
//		s = LinkString(parent) + "['" + obj["[name]"] + "']";
//	}
//	else
//	{
//		if (obj == globals)
//		{
//			s = "globals";
//		}
//		else
//		{
//			throw new Error();
//		}
//	}
//	
//	return s;
//}

function LinkString(obj)
{
	var parent = obj["[parent]"];
	
	var s = null;
	
	if (parent == "sentinel")
	{
		s = "x";
	}	
	else if (parent)
	{
		var n = obj["[name]"];
		
		if (!n)
		{
			throw new Error();
		}
		
		s = LinkString(parent) + "['" + obj["[name]"] + "']";
	}
	else
	{
		throw new Error();
	}
	
	return s;
}

function Serialize()
{
	// no-nos in globals:
	//   HTMLCanvasElement canvasElement (canvas#myCanvas)
	//   CanvasRenderingContext2D g
	//   FileReader reader

	// we also need to not follow the trace into Function objects, but that's about it it seems

	var id = 0;
	var l = [];
	
	var IdRec = function(obj)
	{
		if (obj && typeof(obj) == "object" && !obj.id && !(obj instanceof CanvasRenderingContext2D) && !(obj instanceof FileReader) && !(obj instanceof HTMLCanvasElement))
		{
			obj.id = id++;
			l.push(obj);
			
			for (var key in obj)
			{
				IdRec(obj[key]);
			}
		}
	};
	
	IdRec(globals);
	
	var lines = [];
	lines.push("");
	lines.push("var a = new Array(" + l.length.toString() + ");");
	lines.push("");
	lines.push("for (var i = 0; i < a.length; i++)");
	lines.push("{");
	lines.push("\ta[i] = {};");
	lines.push("}");
	lines.push("");
	
	for (var i = 0; i < l.length; i++)
	{
		var obj = l[i];

		for (var key in obj)
		{
			var s = "a[" + i.toString() + "][\"" + key + "\"] = ";
			
			var val = obj[key];
			var type = typeof(val);
			
			if (type == "string")
			{
				s += '"' + SanitizeString(val) + '"';
			}
			else if (type == "number")
			{
				s += val.toString();
			}
			else if (type == "boolean")
			{
				s += val.toString();
			}
			else if (type == "undefined")
			{
				s += "undefined";
			}
			else if (type == "function")
			{
				s += val.name;
			}
			else if (type == "object")
			{
				if (val == null)
				{
					s += "null";
				}
				else if (val.id)
				{
					s += "a[" + val.id.toString() + "]";
				}
				else if (val instanceof CanvasRenderingContext2D)
				{
					s += "globals.g";
				}
				else if (val instanceof FileReader)
				{
					s += "globals.reader";
				}
				else if (val instanceof HTMLCanvasElement)
				{
					s += "globals.canvasElement";
				}
				else
				{
					throw new Error();
				}
			}
			else
			{
				throw new Error();
			}

			s += ";";
			lines.push(s);
		}
	}
	
	return lines;
}


function AddScrollbar(obj, border)
{
	var scrollbar = MakeObj(obj.scrollbars, obj.scrollbars.length.toString());
	obj.scrollbars.push(scrollbar);
	scrollbar.draw = DrawScrollbar;
	scrollbar.click = ClickScrollbar;
	
	if (border == "top" || border == "bottom")
	{
		scrollbar.ori = "h";
	}
	else if (border == "left" || border == "right")
	{
		scrollbar.ori = "v";
	}
	else
	{
		throw new Error();
	}
	
	scrollbar.bar = MakeObj(scrollbar, "bar");
	AddRectSlots(scrollbar.bar);
	scrollbar.bar.stroke = "rgb(158,182,206)";
	scrollbar.bar.breadth = 10;
	scrollbar.bar.draw = DrawBox;
	scrollbar.bar.click = ClickBox;
	scrollbar.bar.onhover = OnHoverScrollbarBar;
	scrollbar.bar.dehover = DeHoverScrollbarBar;
	
	scrollbar.slider = MakeObj(scrollbar, "slider");
	AddRectSlots(scrollbar.slider);
	scrollbar.slider.fill = "rgb(128,128,128)";
	scrollbar.slider.length = 20;
	scrollbar.slider.draw = DrawBox;
	scrollbar.slider.click = ClickBox;
	scrollbar.slider.onhover = OnHoverScrollbarSlider;
	scrollbar.slider.dehover = DeHoverScrollbarSlider;
	
	if (border == "bottom")
	{
		MoveBox(scrollbar.bar, "height", "cy", scrollbar.bar.breadth);
		
		if (obj.cells)
		{
			// the problem here is that if we change the dimensions of the grid, we destroy and re-create the cells, so their slots are not stable
			// what we need is a grid.cellbox object with stable slots that react to changes to the cell dimensions
			
			MoveBox(scrollbar.bar, "width", "cx", Get(obj.cells[obj.cells.length - 1].right) - Get(obj.cells[0].left));
			MoveBox(scrollbar.bar, "top", "height", Get(obj.cells[obj.cells.length - 1].bottom));
			MoveBox(scrollbar.bar, "left", "width", Get(obj.cells[0].left));
		}
		else
		{
			MoveBox(scrollbar.bar, "width", "cx", obj.width);
			scrollbar.bar.top = obj.bottom;
			MoveBox(scrollbar.bar, "left", "width", obj.left);
		}
	}
	else if (border == "right")
	{
		MoveBox(scrollbar.bar, "width", "cx", scrollbar.bar.breadth);
		
		if (obj.cells)
		{
			MoveBox(scrollbar.bar, "height", "cy", Get(obj.cells[obj.cells.length - 1].bottom) - Get(obj.cells[0].top));
			MoveBox(scrollbar.bar, "top", "height", Get(obj.cells[0].top));
			MoveBox(scrollbar.bar, "left", "width", Get(obj.cells[obj.cells.length - 1].right));
		}
		else
		{
		
		}
	}
}

function BeginSliderDrag()
{
	var scrollbar = globals.hovered;
	
	var d = 0;
	
	if (scrollbar.ori = "h")
	{
		d = Get(scrollbar.cx) - Get(globals.mx);
	}
	else
	{
		d = Get(scrollbar.cy) - Get(globals.my);
	}
	
	var SliderDrag = function()
	{
		if (scrollbar.ori = "h")
		{
			MoveBox(scrollbar.slider, "cx", "width", Get(globals.mx) + d);
			// set underlying to calculated
			
			if (Get(scrollbar.slider.left) < Get(scrollbar.bar.left) + 1)
			{
				MoveBox(scrollbar.slider, "left", "width", Get(scrollbar.bar.left) + 1);
				// set underlying to min
			}
			
			if (Get(scrollbar.slider.right) > Get(scrollbar.bar.right) - 1)
			{
				MoveBox(scrollbar.slider, "right", "width", Get(scrollbar.bar.right) + 1);
				// set underlying to max
			}
		}
		else
		{
			MoveBox(scrollbar.slider, "cy", "height", Get(globals.my) + d);
		}
	};
	
	Push("MM", SliderDrag);
}

function EndSliderDrag()
{
	Pop("MM");
}

function OnHoverScrollbarBar()
{
	Push("LD", ScrollbarClickPageUpOrDown);
}

function DeHoverScrollbarBar()
{
	Pop("LD");
}

function OnHoverScrollbarSlider()
{
	Push("LD", BeginSliderDrag);
	Push("LU", EndSliderDrag);
}

function DeHoverScrollbarSlider()
{
	Pop("LD");
	Pop("LU");
}

function DrawScrollbar(scrollbar)
{
	scrollbar.bar.draw(scrollbar.bar);
	scrollbar.slider.draw(scrollbar.slider);
}

function ClickScrollbar(scrollbar)
{
	var target = scrollbar.slider.click(scrollbar.slider);
	if (target) { return target; }
	var target = scrollbar.bar.click(scrollbar.bar);
	if (target) { return target; }
}

function ScrollbarClickPageUpOrDown()
{
	var scrollbar = globals.hovered;
	
	if (scrollbar.ori == "h")
	{
		if (Get(globals.mx) > Get(scrollbar.slider.cx))
		{
			// PageRight (also accessed via Shift+PageDown)
		}
		else
		{
			// PageLeft (also accessed via Shift+PageUp)
		}
	}
	else
	{
		if (Get(globals.my) > Get(scrollbar.slider.cy))
		{
			// PageDown
		}
		else
		{
			// PageUp
		}
	}
}

function MakeScrollbar(box)
{
	var scrollbar = {};
	scrollbar.box = box;
	scrollbar.side = "right";
	scrollbar.parts = 1;
	scrollbar.breadthPerPart = MakeSlot(scrollbar, "breadthPerPart", 10);
	scrollbar.sliderPos = 0;
	return scrollbar;
}

function DrawScrollbar(scrollbar)
{
	var g = globals.g;
	var box = scrollbar.box;
	
	if (scrollbar.side == "right")
	{
		g.drawRect(Get(box.right), Get(box.top), Get(scrollbar.breadth), Get(box.height));
		g.fillStyle = "rgb(128,128,128)";
	}
	else if (scrollbar.side == "left")
	{
		g.fillRect(Get(box.left), Get(box.bottom), Get(box.width), Get(scrollbar.breadth));
	}
}

function ClickScrollbar(scrollbar)
{

}

function BeginDragScrollbar()
{
	var scrollbar = globals.hovered;

	var DragScrollbar = function(dx, dy)
	{
		
	};
}


function Select()
{
	var obj = globals.hovered;
	
	if (obj.cell) // if obj is a char, select the cell (chars cannot be selected)
	{
		obj = obj.cell;
	}
	
	if (obj.onselect)
	{
		SelectThis(obj);
	}
}

function SelectThis(obj)
{
	if (globals.selected)
	{
		globals.selected.deselect(globals.selected);
	}
	
	obj.onselect(obj);
	globals.selected = obj;
	
	globals.redraw = true;
}

function Deselect()
{
	if (globals.selected)
	{
		globals.selected.deselect(globals.selected);
	}
	
	globals.selected = null;
	
	globals.redraw = true;
}


function PlaceTextbox()
{
	// so i think the goal is to move from putting the new objs in 'globals' to 'whatever context the mouse is in'
	
	var defaultSlotName = "TextboxSlot" + globals.id.toString();
	var slot = MakeSlot(globals.canvas, defaultSlotName, "");
	globals.canvas[defaultSlotName] = slot;
	
	var defaultCellName = "Textbox" + globals.id.toString();
	var cell = DisplaySlotAsCell(globals.canvas, defaultCellName, slot);
	globals.canvas[defaultCellName] = cell;
	
	cell.border = MakeObj(cell, "border");
	cell.border.radius = 1; // this means a 3px border total - 1px radius on either side of the 1px line
	cell.border.onhover = OnHoverTextboxBorder;
	cell.border.dehover = DeHoverTextboxBorder;
	cell.onhover = OnHoverTextbox;
	cell.dehover = DeHoverTextbox;
	cell.onfocus = OnFocusTextbox;
	cell.defocus = DeFocusTextbox;
	cell.container = cell;
	cell.editActive = Nop;
	MoveBox(cell, "cx", "width", Get(globals.mx));
	MoveBox(cell, "cy", "height", Get(globals.my));
	MoveBox(cell, "width", "cx", 200);
	MoveBox(cell, "height", "cy", 200);
	cell.redisplay(cell);
	cell.position(cell);
}

function DrawTextbox(textbox)
{
	DrawCell(textbox);
	DrawBorder(textbox);
}

function OnHoverTextboxBorder()
{
	var border = globals.hovered;
	var cell = border["[parent]"];
	
	var origX = Get(globals.mx);
	var origY = Get(globals.my);
	
	var lf = Get(cell.left);
	var rt = Get(cell.right);
	var tp = Get(cell.top);
	var bt = Get(cell.bottom);
	
	var r = border.radius;
	
	border.resizeLf = false;
	border.resizeRt = false;
	border.resizeTp = false;
	border.resizeBt = false;
	
	var cursors = [ "nwse" , "ew" , "nesw" , "ns" , null , "ns" , "nesw" , "ew" , "nwse" ];
	var cursorIndex = 4;
	
	if (lf - r <= origX && origX <= lf + r)
	{
		border.resizeLf = true;
		cursorIndex -= 3;
	}
	
	if (rt - r <= origX && origX <= rt + r)
	{
		border.resizeRt = true;
		cursorIndex += 3;
	}
	
	if (tp - r <= origY && origY <= tp + r)
	{
		border.resizeTp = true;
		cursorIndex -= 1;
	}
	
	if (bt - r <= origY && origY <= bt + r)
	{
		border.resizeBt = true;
		cursorIndex += 1;
	}

	if (border.resizeLf || border.resizeRt || border.resizeTp || border.resizeBt)
	{
		document.getElementById("myCanvas").style.cursor = cursors[cursorIndex] + "-resize";
		Push("LD", BeginResize);
		globals.redraw = true;
	}
}

function DeHoverTextboxBorder()
{
	document.getElementById("myCanvas").style.cursor = "default";
	Pop("LD");
	globals.redraw = true;
}

function OnHoverTextbox(cell)
{
	//document.getElementById("myCanvas").style.cursor = "text";
	Push("LD", Select);
	//Push("LD", MouseSelectText);
}

function DeHoverTextbox(cell)
{		
	//document.getElementById("myCanvas").style.cursor = "default";
	Pop("LD");
}

function OnFocusTextbox(cell)
{
	globals.focussed = cell;
	
	var switchHover = false;
	
	if (globals.hovered == cell)
	{
		switchHover = true;
		cell.dehover(cell);
	}
	
	cell.onhover = OnHoverSelectedTextbox;
	cell.dehover = DeHoverSelectedTextbox;
	
	if (switchHover)
	{
		cell.onhover(cell);
	}
}

function DeFocusTextbox(cell)
{
	globals.focussed = null;
	
	var switchHover = false;
	
	if (globals.hovered == cell)
	{
		switchHover = true;
		cell.dehover(cell);
	}
	
	cell.onhover = OnHoverTextbox;
	cell.dehover = DeHoverTextbox;
	
	if (switchHover)
	{
		cell.onhover(cell);
	}
}

function OnEditTextbox(cell)
{
    Push("Enter", AddChar);
	Push("Tab", AddChar);
    Push("Esc", AcceptEdit);
}

function DeEditTextbox(cell)
{
    Pop("Enter");
	Pop("Tab");
    Pop("Esc");
}

function OnHoverSelectedTextbox(cell)
{
	document.getElementById("myCanvas").style.cursor = "text";
	Push("LD", MouseSelectText);
}

function DeHoverSelectedTextbox(cell)
{
	document.getElementById("myCanvas").style.cursor = "default";
	Pop("LD");
}

function BeginResize()
{
	Push("LU", EndResize);
	Push("MM", Resize);
}

function EndResize()
{
	Pop("LU");
	Pop("MM");
}

function Resize()
{
	var border = globals.hovered;
	var cell = border["[parent]"];
	
	var currX = Get(globals.mx);
	var currY = Get(globals.my);
	
	if (border.resizeLf)
	{
		MoveBox(cell, "left", "right", currX);
	}
	
	if (border.resizeRt)
	{
		MoveBox(cell, "right", "left", currX);
	}
	
	if (border.resizeTp)
	{
		MoveBox(cell, "top", "bottom", currY);
	}
	
	if (border.resizeBt)
	{
		MoveBox(cell, "bottom", "top", currY);
	}
	
	cell.position(cell);
	
	globals.redraw = true;
}

function ToggleTraceTextboxMode()
{
	if (globals.traceTextboxMode)
	{
		globals.canvas.buttons["ToggleTraceTextboxModeButton"].version = 0;
		ExitTraceTextboxMode();
		globals.traceTextboxMode = false;
	}
	else
	{
		globals.canvas.buttons["ToggleTraceTextboxModeButton"].version = 2;
		EnterTraceTextboxMode();
		globals.traceTextboxMode = true;
	}
}

function EnterTraceTextboxMode()
{
	PushUnder("LD", BeginTraceTextbox);
}

function ExitTraceTextboxMode()
{
	Pop("LD");
	Pop("LU");
}

function BeginTraceTextbox()
{
	var origX = Get(globals.mx);
	var origY = Get(globals.my);
	
	var defaultSlotName = "TextboxSlot" + globals.id.toString();
	var slot = MakeSlot(globals.canvas, defaultSlotName, "");
	globals.canvas[defaultSlotName] = slot;
	
	var defaultCellName = "Textbox" + (globals.objcounts.textbox++).toString();
	var cell = DisplaySlotAsCell(globals.canvas, defaultCellName, slot);
	globals.canvas[defaultCellName] = cell;
	
	cell.draw = DrawTextbox;
	cell.border.radius = 1; // this means a 3px border total - 1px radius on either side of the 1px line
	cell.border.onhover = OnHoverTextboxBorder;
	cell.border.dehover = DeHoverTextboxBorder;
	cell.onhover = OnHoverTextbox;
	cell.dehover = DeHoverTextbox;
	cell.onfocus = OnFocusTextbox;
	cell.defocus = DeFocusTextbox;
	cell.container = cell;
	cell.editActive = Nop;
	cell.redisplay(cell);
		
	var TraceTextbox = function()
	{
		var currX = Get(globals.mx);
		var currY = Get(globals.my);
		
		var lf = Math.min(origX, currX);
		var rg = Math.max(origX, currX);
		var tp = Math.min(origY, currY);
		var bt = Math.max(origY, currY);
		
		MoveBox(cell, "left", "width", lf);
		MoveBox(cell, "top", "height", tp);
		MoveBox(cell, "right", "left", rg);
		MoveBox(cell, "bottom", "top", bt);
		cell.position(cell);
		
		globals.redraw = true;
	};
	
	Push("LU", EndTraceTextbox);
	Push("Esc", EndTraceTextbox); // a safety valve for when a mouseup event is dropped and we're stuck in trace mode
	Push("MM", TraceTextbox);
}

function EndTraceTextbox()
{
	globals.stream.push(globals.currstream);
	
	Pop("LU");
	Pop("Esc");
	Pop("MM");
}


function DeleteAndPrimeTextEditAndAddChar()
{
	PrimeTextEdit();
	
	var cell = globals.beingEdited;
	cell.string = "";
    cell.cursorPosInString = -1;
	
	AddChar();
}

function PrimeTextEdit()
{
	var cell = globals.selected;
	
    globals.beingEdited = cell;
	
	cell.displayedString = "formula";
	cell.oldFormula = cell.formula;
	cell.string = cell.formula;
    cell.cursorPosInString = cell.string.length - 1;
	cell.anchorCursorPos = cell.cursorPosInString;
	
	cell.oldonhover = cell.onhover;
	cell.olddehover = cell.dehover;
	cell.onhover = OnHoverBeingEdited;
	cell.dehover = DeHoverBeingEdited;
	
	cell.oldWidth = Get(cell.width); // this is for the code that allows text to overflow - we switch back on DeactTextEdit
	
	// we can't call ValueToString here (or redisplay), because we just retargeted cell.string to cell.formula, and ValueToString would overwrite cell.string with cell.value.tostring()
	RegenerateChars(cell);
	cell.position(cell);
	
	ResetCursor();

	PushAlpha(AddChar);
	Push("Space", AddChar);
    Push("CapsLock", ToggleCapsLock);
    Push("Backspace", Backspace);
	cell.container.onedit();
	
	globals.redraw = true;
}

function DeactTextEdit()
{
	// possibly some cogs will want to respond to this
	
	var cell = globals.beingEdited;
	
	if (cell.oldWidth)
	{
		MoveBox(cell, "width", "left", cell.oldWidth);
		cell.position(cell);
		delete cell.oldWidth;
	}
	
	cell.onhover = cell.oldonhover;
	cell.dehover = cell.olddehover;
	delete cell.oldonhover;
	delete cell.olddehover;
	
	DeactCursor();
	
	cell.container.deedit();
		
	//cell.displayedString = "value"; // or cell.displayedString = "formula" if globals.showFormulas
	//cell.string = cell.value;
	
	globals.beingEdited = null;

	//globals.log.push("DeactTextEdit");
	
	globals.oldAddToLog = globals.addToLog;
	globals.addToLog = false;

	PopAlpha();
	Pop("Space");
    Pop("CapsLock");
    Pop("Backspace");
	
	globals.addToLog = globals.oldAddToLog;
	
	//RegenerateChars(cell);
	//cell.position(cell);
	
	globals.redraw = true;
}

function EnterEditMode()
{
	globals.mode = "Edit";
	
	PushAlpha(AddChar);
    Push(";:", AddChar);
    Push("=+", AddChar);
    Push(",<", AddChar);
    Push("-_", AddChar);
    Push(".>", AddChar);
    Push("/?", AddChar);
    Push("`~", AddChar);
    Push("[{", AddChar);
    Push("\\|", AddChar);
    Push("]}", AddChar);
    Push("'\"", AddChar);
	Push("Space", AddChar);
    Push("CapsLock", ToggleCapsLock);
    Push("Backspace", Backspace);
	
	Push("Left", MoveCursorLeft);
    Push("Right", MoveCursorRight);
	Push("Up", MoveCursorUp);
    Push("Down", MoveCursorDown);
	
	// inside/outside the cell being edited is an important distinction here
	// if we click inside, it's MouseSelectText
	// if we click outside, we probably should switch back to enter mode
	Push("LD", MouseSelectText);
}

function EnterPointMode()
{
	globals.mode = "Point";
}

function EnterEnterMode()
{
	// all the other cells still have .onhover = Push(Select)
	// we don't need to change that - the selection mechanics are the same
	// what we can do though is change the global mode
	
	// getting rid of this may break some workflows
	// in Excel, i believe, (arrow key => point mode) is only activated in a formula (with = in front)
	// if you're just typing in a string, arrow keys will just AcceptEdit and move
	//Push("Down", AcceptEditWithEnter);
	
	// Excel does the following:
	// ''    => arrows accept edit and move
	// 'a'   => arrows accept edit and move
	// '=a'  => arrows choose a name from the pop-up autocomplete list
	// '=1'  => arrows accept edit and move
	// '='   => arrows trigger point mode
	// '=a ' => arrows trigger point mode
	// '=a+' => arrows trigger point mode
	
	globals.mode = "Point";
	Push("Left", MoveActiveLeft);
	Push("Right", MoveActiveRight);
	Push("Down", MoveActiveDown);
	Push("Up", MoveActiveUp);
	Push("Shift+Left", ExtendSelectionLeft);
	Push("Shift+Right", ExtendSelectionRight);
	Push("Shift+Down", ExtendSelectionDown);
	Push("Shift+Up", ExtendSelectionUp);
	Push("Ctrl+Left", MoveActiveAllTheWayLeft);
	Push("Ctrl+Right", MoveActiveAllTheWayRight);
	Push("Ctrl+Down", MoveActiveAllTheWayDown);
	Push("Ctrl+Up", MoveActiveAllTheWayUp);
	Push("Ctrl+Shift+Left", ExtendSelectionAllTheWayLeft);
	Push("Ctrl+Shift+Right", ExtendSelectionAllTheWayRight);
	Push("Ctrl+Shift+Down", ExtendSelectionAllTheWayDown);
	Push("Ctrl+Shift+Up", ExtendSelectionAllTheWayUp);
	Push("Ctrl+Space", SelectWholeCol);
	Push("Shift+Space", SelectWholeRow);
	Push("Ctrl+Shift+Space", SelectWholeGrid);
}

function OnHoverBeingEdited()
{
	document.getElementById("myCanvas").style.cursor = "text";
	Push("LD", MouseSelectText);
}

function DeHoverBeingEdited()
{
		document.getElementById("myCanvas").style.cursor = "default";
	Pop("LD");
}

function GetCursorPos(cell, x, y)
{
	var cursorPos = -1;
	
	for (var i = cell.contents.length - 1; i >= 0; i--)
	{
		var c = cell.contents[i];
		
		if (c.top && Get(c.top) < y)
		{
			if (c.cx && Get(c.cx) < x)
			{
				return i;
			}
		}
	}
	
	return cursorPos;
}

function SelectText(cell)
{
	// this is called by both TextSelect (via mouse movement) and can be called by Shift+Arrow

	// replace anchorCursorPos and cursorPosInString with just anchor and cursor
	
	var min = Math.min(cell.anchorCursorPos, cell.cursorPosInString);
	var max = Math.max(cell.anchorCursorPos, cell.cursorPosInString);

	// this is inefficient, but first we just loop through all chars and de-select them
	for (var i = 0; i < cell.contents.length; i++)
	{
		var c = cell.contents[i];
		c.bgFill = null;
		
		if (c.oldFill)
		{
			c.fill = c.oldFill;
			c.oldFill = null;
		}
	}
	
	// then we select the chars we want selected
	for (var i = min + 1; i <= max; i++)
	{
		var c = cell.contents[i];
		
		// the default way to display selected text is a blue background and inverted color
		c.bgFill = "rgb(10,36,106)";
		c.oldFill = c.fill;
		c.fill = "rgb(255,255,255)"; // this is specific to black text - we need to change this to invert, but it requires parsing the "rgb(0,0,0)" string
	}
	
	globals.redraw = true;
}

function AddChar()
{
    var code = globals.event;
    var toAdd = globals.codeToCharMap[code];
	AddText(toAdd);
}

function AddText(text)
{
	// this can be called from AddChar or Paste
	
	// cell.cursorPosInString = the index of the char it is after
	var cell = globals.beingEdited;
    var s = cell.string;
	
	if (cell.cursorPosInString != cell.anchorCursorPos)
	{
		// delete selected text
		var minCursorPos = Math.min(cell.anchorCursorPos, cell.cursorPosInString);
		var maxCursorPos = Math.max(cell.anchorCursorPos, cell.cursorPosInString);
		cell.string = s.substr(0, minCursorPos) + s.substr(maxCursorPos + 1);
		cell.cursorPosInString = minCursorPos;
	}
	
	cell.string = s.substr(0, cell.cursorPosInString + 1) + text + s.substr(cell.cursorPosInString + 1);
    cell.cursorPosInString++;
	cell.anchorCursorPos = cell.cursorPosInString;
	
	RegenerateChars(cell);
	cell.position(cell);
	
	ResetCursor(); // this must go after RegenerateChars and cell.position(cell)
	
	globals.redraw = true;
}

function Backspace()
{
	// cell.cursorPosInString = the index of the char it is after
	
	var cell = globals.beingEdited;
	var s = cell.string;
	
	if (cell.cursorPosInString != cell.anchorCursorPos)
	{
		var minCursorPos = Math.min(cell.anchorCursorPos, cell.cursorPosInString);
		var maxCursorPos = Math.max(cell.anchorCursorPos, cell.cursorPosInString);
		cell.string = s.substr(0, minCursorPos) + s.substr(maxCursorPos + 1);
		cell.cursorPosInString = minCursorPos;
		cell.anchorCursorPos = cell.cursorPosInString;
		ResetCursor();

		RegenerateChars(cell);
		cell.position(cell);
	}
	else if (cell.cursorPosInString > -1)
	{
		cell.string = s.substr(0, cell.cursorPosInString) + s.substr(cell.cursorPosInString + 1);
		cell.cursorPosInString--;
		cell.anchorCursorPos = cell.cursorPosInString;
		ResetCursor();

		RegenerateChars(cell);
		cell.position(cell);
	}
	
	globals.redraw = true;
}

function Delete()
{
	// this only works in ready mode - in edit mode when some text is selected, delete and backspace do the same thing

	var cell = globals.selected;
	Set(cell.slot, null);
	
	cell.redisplay(cell);
	cell.position(cell);
	
	globals.redraw = true;
}

function AcceptEditWithEnter()
{
	AcceptEdit();
	MoveActiveDown();
}

function AcceptEditAndMoveRight()
{
	AcceptEdit();
	MoveActiveRight();
}

function AcceptEditAndMouseSelect() // click during edit, where string is '' 'a' '0' '=1' '=a' ('=a ' and '=a+' trigger point mode)
{
	AcceptEdit();
	MouseSelectCell();
}

function MouseSelectCell()
{
	var cell = globals.hovered;
	var container = cell.container;
	
	container.anchor.row = cell.row;
	container.anchor.col = cell.col;
	container.cursor.row = cell.row;
	container.cursor.col = cell.col;
	
	SelectNewActive(container);

	Push("MM", ContinueCellSelect);
	Push("LU", EndCellSelect);
}

function ContinueCellSelect()
{
	var cursor = Click();
	
	if (cursor)
	{
		globals.focussed.cursor.row = cursor.row;
		globals.focussed.cursor.col = cursor.col;
		SelectRange();
	}
}

function EndCellSelect()
{
	Pop("MM");
	Pop("LU");
}

function MouseSelectText()
{
	// here is the place to add cursor move handlers to the arrow keys
	
	if (!globals.beingEdited)
	{
		globals.selected = globals.hovered;
		PrimeTextEdit();
		Pop("Esc");
		Push("Esc", AcceptEdit);
		Pop("Enter");
		Push("Enter", AddChar);
		//Pop("Tab");
		Push("Tab", AddChar);
	}

	var cell = globals.beingEdited;
	
	var startX = Get(globals.mx);
	var startY = Get(globals.my);
	
	cell.anchorCursorPos = GetCursorPos(cell, startX, startY);
	
	cell.cursorPosInString = cell.anchorCursorPos;
	
	ResetCursor();

	Push("MM", ContinueTextSelect);
	Push("LU", EndTextSelect);
}

function ContinueTextSelect()
{
	var currX = Get(globals.mx);
	var currY = Get(globals.my);
	
	var cell = globals.beingEdited;
	
	cell.cursorPosInString = GetCursorPos(cell, currX, currY);
	
	SelectText(cell);
}

function EndTextSelect()
{
	Pop("MM");
	Pop("LU");
}

function AcceptEdit()
{
	var cell = globals.beingEdited;
	cell.formula = cell.string;
	
	var s = cell.formula;
	var newvalue = null;

    if (s == "")
    {
		newvalue = null;
        Set(cell.slot, newvalue);
    }
	else if (s[0] == "=")
	{
		if (s.substring(1, 9) == "function")
		{
			var functor = ReadUserDefinedFunction(globals, s.substring(1)); // to do: put it in the local frame, which is not necessarily 'globals'
			globals[functor["[name]"]] = functor;
			Set(cell.slot, functor);
		}
		else
		{
			CompileCode(cell, s);
		}
	}
    else if (IsDigit(s[0]) || (s.length > 1 && s[0] == '.')) // change this to an IsNumber function - we must allow weird strings
    {
		newvalue = eval(s);
		Set(cell.slot, newvalue);
    }
    else
    {
        newvalue = s;
		Set(cell.slot, newvalue);
    }
	
	delete cell.oldFormula;
	
	cell.redisplay(cell);
	cell.position(cell);

	DeactTextEdit();
}

function RejectEdit()
{
	var cell = globals.beingEdited;
    cell.formula = cell.oldFormula;
	delete cell.oldFormula;
	
	cell.redisplay(cell);
	cell.position(cell);
	
	DeactTextEdit();
}

function CompileCode(cell, str)
{
	//var code = CompileLispFromString(s.substring(1));
	var code = Compile(str.substring(1));
	AddBracketFields(code, cell, "code"); // hang it from the cell - why not?
	cell.code = code;
	
	// retarget the Pointer at code.root to the slot, or through a Ref to the slot
	if (str[1] == '(')
	{
		code.root["[obj]"] = cell.slot;
	}
	else
	{
		// this block deals with simple references (e.g. a[b].c) - basically we synthesize an := exp
		
		var exp = MakeExp(code, code.length.toString());
		code.push(exp);
		
		var fptr = MakePointer(code, code.length.toString());
		code.push(fptr);
		fptr.scope = globals;
		fptr.name = ":=";
		
		exp.f = fptr;
		AddGraphlessEdge(exp.node, fptr.node, "f");
		
		exp.args.push(code.root); 
		AddGraphlessEdge(exp.node, code.root.node, (exp.args.length - 1).toString());
		
		exp.pout = MakePointer(code, code.length.toString(), cell.slot);
		code.push(exp.pout);
		AddGraphlessEdge(exp.node, exp.pout.node, "pout");
	}
	
	var control = MakeControl(code, code.length.toString());
	code.push(control);
	control.state = State.Activating;
	
	for (var i = 0; i < code.length; i++)
	{
		if (code[i] != control) { code[i].control = control };
		
		if (code[i].type == Machine.Pointer)
		{
			if (!code[i].scope) // . and [] expressions produce pointers with already-bound scopes - bare names produce pointers with unbound scopes
			{
				code[i].scope = cell.slot["[parent]"]; // set the scope to the obj - when binding, we search along the [parent] path
			}
		}
		
		// connect the control node to the other nodes too?  need to add to ins and ous
		
		globals.newqueue.push(code[i].node);
		code[i].node.inQueue = true;
	}
	
	globals.calculate = true;
}

function ToggleCapsLock()
{
    // note that this extends the lock to digit and punctuation keys
    // not sure if this is good or bad - but it certainly deviates from the standard implementation of CapsLock

	if (globals.beingEdited)
	{
		var upper = [ "A" , "B" , "C" , "D" , "E" , "F" , "G" , "H" , "I" , "J" , "K" , "L" , "M" , "N" , "O" , "P" , "Q" , "R" , "S" , "T" , "U" , "V" , "W" , "X" , "Y" , "Z" ];
		var lower = [ "a" , "b" , "c" , "d" , "e" , "f" , "g" , "h" , "i" , "j" , "k" , "l" , "m" , "n" , "o" , "p" , "q" , "r" , "s" , "t" , "u" , "v" , "w" , "x" , "y" , "z" ];
		
		if (globals.capsLockOn)
		{
			for (var i = 0; i < 26; i++)
			{
				globals.codeToCharMap[upper[i]] = lower[i];
				globals.codeToCharMap["Shift+" + upper[i]] = upper[i];
			}
		}
		else
		{
			for (var i = 0; i < 26; i++)
			{
				globals.codeToCharMap[upper[i]] = upper[i];
				globals.codeToCharMap["Shift+" + upper[i]] = lower[i];
			}
		}
	}
}


function MoveCursorLeft()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString >= 0)
	{
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		cell.cursorPosInString--;
		cell.anchorCursorPos = cell.cursorPosInString;
	}
	
	ResetCursor();
}

function MoveCursorRight()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString < cell.string.length - 1)
	{
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		cell.cursorPosInString++;
		cell.anchorCursorPos = cell.cursorPosInString;
	}
	
	ResetCursor();
}

function MoveCursorUp()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString >= 0)
	{
		// so here we just move to the end position of the above line of text
		
		var c = cell.string[cell.cursorPosInString];
		
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		while (cell.cursorPosInString >= 0 && c != '\n')
		{
			cell.cursorPosInString--;
			cell.anchorCursorPos = cell.cursorPosInString;
			c = cell.string[cell.cursorPosInString];
		}
		
		if (cell.cursorPosInString > 0)
		{
			cell.cursorPosInString--;
		}
	}
	
	ResetCursor();
}

function MoveCursorDown()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString < cell.string.length - 1)
	{
		var c = cell.string[cell.cursorPosInString];
		
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		while (cell.cursorPosInString < cell.string.length - 1 && c != '\n')
		{
			cell.cursorPosInString++;
			cell.anchorCursorPos = cell.cursorPosInString;
			c = cell.string[cell.cursorPosInString];
		}
	}
	
	ResetCursor();
}

function ExtendTextSelectionLeft()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString >= 0)
	{
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		cell.cursorPosInString--;
		SelectText(cell);
	}
	
	ResetCursor();
}

function ExtendTextSelectionRight()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString < cell.string.length - 1)
	{
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		cell.cursorPosInString++;
		SelectText(cell);
	}
	
	ResetCursor();
}

function ExtendTextSelectionUp()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString >= 0)
	{
		var c = cell.string[cell.cursorPosInString];
		
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		while (cell.cursorPosInString >= 0 && c != '\n')
		{
			cell.cursorPosInString--;
			c = cell.string[cell.cursorPosInString];
		}
		
		if (cell.cursorPosInString > 0)
		{
			cell.cursorPosInString--;
		}
	}
	
	ResetCursor();
}

function ExtendTextSelectionDown()
{
	var cell = globals.beingEdited;
	
	if (cell.cursorPosInString < cell.string.length - 1)
	{
		var c = cell.string[cell.cursorPosInString];
		
		// this is to clear the existing cursor immediately - then the ResetCursor call below will draw the new cursor
		globals.cursorOn = false;
		DrawCursor();
		
		while (cell.cursorPosInString < cell.string.length - 1 && c != '\n')
		{
			cell.cursorPosInString++;
			c = cell.string[cell.cursorPosInString];
		}
	}
	
	ResetCursor();
}


function MakeTree(parent, name)
{
	var tree = MakeObj(parent, name);
	tree.contents = MakeList(tree, "contents");
	tree.twigs = MakeList(tree, "twigs");
	tree.indents = MakeList(tree, "indents");
	tree.root = null;
	return tree;
}

function GenerateTwigs(tree)
{
	var parents = [];

	for (var i = 0; i < tree.indents.length; i++)
	{
		var indent = tree.indents[i];
		
		var twig = MakeObj(tree.twigs, i.toString());
		tree.twigs[i] = twig;
		
		twig.children = MakeList(twig, "children");
		twig.contents = tree.contents[i];
		
		if (i == 0)
		{
			tree.root = twig;
		}
		
		if (indent == 0)
		{
			twig.parent = null;
		}
		else
		{
			twig.parent = parents[indent - 1];
			parents[indent - 1].children.push(twig);
		}
		
		parents[indent] = twig;
	}
}

function GenerateContents(tree)
{
	tree.twigs = MakeList(tree, "twigs");
	tree.contents = MakeList(tree, "contents");
	tree.indents = MakeList(tree, "indents");
	
	DepthFirst(tree.twigs, tree.root);
	
	for (var i = 0; i < tree.twigs.length; i++)
	{
		var twig = tree.twigs[i];
		twig["[parent]"] = tree.twigs;
		twig["[name]"] = i.toString();
		
		tree.contents.push(twig.contents);
		
		var indent = 0;
		
		while (twig.parent) // this isn't as efficient as it could be, but i don't think it's a problem
		{
			twig = twig.parent;
			indent++;
		}
		
		tree.indents.push(indent);
	}
}

function DepthFirst(l, root)
{
	l.push(root);
	
	for (var i = 0; i < root.children.length; i++)
	{
		root.children[i].parent = root;
		
		DepthFirst(l, root.children[i]);
	}
}

function OnFocusTree(tree)
{
	globals.focussed = tree;
	
	Push("Up", SelectParent); 
	Push("Down", SelectFirstChild); 
	Push("Left", SelectPrevSibling); 
	Push("Right", SelectNextSibling); 
	Push("Ctrl+Up", SelectRoot); 
	Push("Ctrl+Left", SelectFirstSibling);
	Push("Ctrl+Right", SelectLastSibling); 
	Push("Ctrl+Down", SelectYoungest); 
	Push("Alt+Up", AddParent); 
	Push("Alt+Down", AddLastChild); 
	Push("Alt+Left", AddPrevSibling); 
	Push("Alt+Right", AddNextSibling); 
	Push("Delete", Delete); 
}

function DeFocusTree(tree)
{
	globals.focussed = null;
	
	Pop("Up"); 
	Pop("Down"); 
	Pop("Left"); 
	Pop("Right"); 
	Pop("Ctrl+Up"); 
	Pop("Ctrl+Left");
	Pop("Ctrl+Right"); 
	Pop("Ctrl+Down"); 
	Pop("Alt+Up"); 
	Pop("Alt+Down"); 
	Pop("Alt+Left"); 
	Pop("Alt+Right"); 
	Pop("Delete"); 
}

function EditSelectedSetTreeShape(treeShape, content, add)
{
	if (add)
	{
		treeShape.activeContent = content;
	}
	else
	{
		treeShape.activeContent = null;
	}
}



// we may want to apply a filter to an obj to determine which fields to display in the indentree

// also, a 1-D array is just a flat version of an indentree

// possible things to toggle:
// display field names

// i envision the fields being right-justified, with an invisible cell border, probably immutable (but not in all cases)

// expand and contract modify the display of the tree, not the underlying structure

function Expand()
{

}

function Contract()
{

}

function SelectParent() // Up
{
	if (globals.selectedRootShape.parent)
	{
		globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
		globals.selectedRootShape = globals.selectedRootShape.parent;
		globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
		globals.selected = globals.selectedRootShape.contents;
		globals.redraw = true;
	}
}

function SelectFirstChild() // Down
{
	// down should just be depth-first traversal - that way it makes sense in the context of an indentree
	// of course, up can't really be reverse traversal, because selecting parent is too strong of a match to the mental model
	
	if (globals.selectedRootShape.children.length > 0)
	{
		globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
		globals.selectedRootShape = globals.selectedRootShape.children[0];
		globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
		globals.selected = globals.selectedRootShape.contents;
		globals.redraw = true;
	}
}

function SelectPrevSibling() // Left
{
	if (globals.selectedRootShape.parent)
	{
		var birth = globals.selectedRootShape.parent.children.indexOf(globals.selectedRootShape);
		
		if (birth > 0)
		{
			globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
			globals.selectedRootShape = globals.selectedRootShape.parent.children[birth - 1];
			globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
			globals.selected = globals.selectedRootShape.contents;
			globals.redraw = true;
		}
	}
}

function SelectNextSibling() // Right
{
	if (globals.selectedRootShape.parent)
	{
		var birth = globals.selectedRootShape.parent.children.indexOf(globals.selectedRootShape);
		
		if (birth < globals.selectedRootShape.parent.children.length - 1)
		{
			globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
			globals.selectedRootShape = globals.selectedRootShape.parent.children[birth + 1];
			globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
			globals.selected = globals.selectedRootShape.contents;
			globals.redraw = true;
		}
	}
}

function SelectRoot() // Ctrl+Up
{
	var focus = globals.selectedRootShape;
	
	while (focus.parent)
	{
		focus = focus.parent;
	}
	
	globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
	globals.selectedRootShape = focus;
	globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
	globals.selected = globals.selectedRootShape.contents;
	globals.redraw = true;
}

function SelectFirstSibling() // Ctrl+Left
{
	if (globals.selectedRootShape.parent)
	{
		globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
		globals.selectedRootShape = globals.selectedRootShape.parent.children[0];
		globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
		globals.selected = globals.selectedRootShape.contents;
		globals.redraw = true;
	}
}

function SelectLastSibling() // Ctrl+Right
{
	if (globals.selectedRootShape.parent)
	{
		globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
		globals.selectedRootShape = globals.selectedRootShape.parent.children[globals.selectedRootShape.parent.children.length - 1];
		globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
		globals.selected = globals.selectedRootShape.contents;
		globals.redraw = true;
	}
}

function SelectYoungest() // Ctrl+Down
{
	var focus = globals.selectedRootShape;
	
	while (focus.children.length > 0)
	{
		focus = focus.children[0];
	}
	
	globals.selectedRootShape.contents.deselect(globals.selectedRootShape.contents);
	globals.selectedRootShape = focus;
	globals.selectedRootShape.contents.onselect(globals.selectedRootShape.contents);
	globals.selected = globals.selectedRootShape.contents;
	globals.redraw = true;
}

function AddParent() // Alt+Up
{

}

function AddLastChild() // Alt+Down
{
	var content = globals.selected; // the cell is what is selected, not the twig
	var twig = content["[parent]"];
	var tree = twig["[parent]"]["[parent]"];
	
	var data = twig.data;
	
	var twigChildren = twig.children;
	var dataChildren = data[tree.childrenField];
	
	var dataChild = MakeObj(dataChildren, dataChildren.length.toString());
	dataChild[tree.budField] = MakeSlot(dataChild, tree.budField, "");
	dataChild[tree.childrenField] = MakeList(dataChild, tree.childrenField);
	
	var twigChild = tree.makeTwig(tree, twig, dataChild);

	twig.children.push(twigChild);
	data.children.push(dataChild);
	
	twigChild.parent = twig;
	dataChild.parent = data; // necessary?
	
	twigChild.data = dataChild;
	twigChild.children = MakeList(twigChild, "children");
	twigChild.contents = DisplaySlotAsCell(twigChild, "contents", dataChild[tree.budField]);
	
	var cell = twigChild.contents;
	
	cell.redisplay = tree.root.contents.redisplay;
	cell.container = content.container; // this is just 'tree', right? - also, order matters - redisplay might depend on the container (as RedisplayGramCell does)
	cell.redisplay(cell);
	
	GenerateContents(tree);
	
	tree.position(tree);
	
	globals.redraw = true;
}

function AddPrevSibling() // Alt+Left
{

}

function AddNextSibling() // Alt+Right
{

}

function DeleteTwig() // Delete
{
	// delete the selected twig and all its descendants
}

function DeleteSingle()
{
	// if the twig has only one child, we can just delete the twig
}

