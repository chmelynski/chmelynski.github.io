/*

Controls:

Space = edit value
Shift+Space = edit key

Ctrl+Space = edit {} or [] subtree (display a large textarea with underlying text representation)
(we could theoretically map Space to edit subtree, since it's unambiguous.  but big subtrees will basically crash a textarea, so we want people to be careful when choosing to edit a subtree) (TODO)

Up = move cursor up (in display order)
Down = move cursor down (in display order)
Shift+Up = move cursor to prev sibling
Shift+Down = move cursor to next sibling
Ctrl+Up = move cursor to parent
Ctrl+Down = ??
Ctrl+Shift+Up = move cursor to root
Ctrl+Shift+Down = ??

Right = open, or move cursor to next
Left = close, or move cursor to parent
Ctrl+Right = open descendants
Ctrl+Left = close descendants
Shift+Right = open children
Shift+Left = close children
Ctrl+Shift+Right = open children and descendants
Ctrl+Shift+Left = close children and descendants
Shift+Alt+Right = open grandchildren
Shift+Alt+Left = close grandchildren
Ctrl+Shift+Alt+Right = open grandchildren and descendants
Ctrl+Shift+Alt+Left = close grandchildren and descendants

Alt+Up = add prev sibling (TODO)
Alt+Down = add next sibling (TODO)
Alt+Left = add parent (TODO)
Alt+Right = add first child (TODO)
Ctrl+Alt+Up = move before prev sibling (and switch array indexes) (TODO)
Ctrl+Alt+Down = move after next sibling (and switch array indexes) (TODO)

Shift+Scroll = 1
Scroll = 10
Ctrl+Scroll = 100
Ctrl+Shift+Scroll = 1000
Ctrl+Shift+Alt+Scroll = 10000
PageUp/PageDown equivalent to Scroll

*/
var Sweetgum;
(function (Sweetgum) {
    var Tree = (function () {
        function Tree(ctx, data, options) {
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
            this.drawHandle = options.drawHandle ? options.drawHandle : DrawHandle;
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
        Tree.prototype.draw = function () {
            var tree = this;
            var ctx = tree.ctx;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = tree.font;
            for (var i = 0; i < tree.twigs.length; i++) {
                var visibleTwig = tree.twigs[i];
                var cx = visibleTwig.cx;
                var cy = visibleTwig.cy;
                tree.drawHandle(ctx, tree, visibleTwig.twig, cx, cy);
                ctx.fillText(visibleTwig.text, cx + tree.textMargin, cy + 0.5);
            }
        };
        Tree.prototype.determineCursor = function () {
            // calculate cursor by walking backward from closer
            // this only happens on selection overflow, so prev === null should never happen
            var tree = this;
            var twig = tree.closer;
            for (var i = 0; i < tree.maxVisible - 1; i++) {
                twig = twig.prev();
                if (twig === null) {
                    throw new Error();
                }
            }
            tree.cursor = twig;
        };
        Tree.prototype.determineCloser = function () {
            // calculate closer by walking forward from cursor
            var tree = this;
            var twig = tree.cursor;
            for (var i = 0; i < tree.maxVisible; i++) {
                var next = twig.next();
                if (next === null) {
                    break;
                }
                twig = next;
            }
            tree.closer = twig;
        };
        Tree.prototype.calcVisible = function () {
            var tree = this;
            tree.twigs = [];
            var twig = tree.cursor;
            for (var i = 0; i < tree.maxVisible; i++) {
                var cx = tree.lf + twig.indent() * tree.indent;
                var cy = tree.tp + i * tree.twigHeight;
                var len = (twig.type == 1 /* Array */) ? ((twig == tree.root) ? tree.data.length : twig.obj[twig.key].length.toString()) : 0;
                var val = (twig.type == 0 /* Object */) ? '{}' : ((twig.type == 1 /* Array */) ? '[' + len + ']' : JSON.stringify(twig.obj[twig.key]));
                var text = twig.key + ' : ' + val;
                tree.twigs[i] = new VisibleTwig(twig, cx, cy, text);
                if (twig == tree.closer) {
                    break;
                }
                twig = twig.next();
            }
        };
        Tree.prototype.setHandlers = function () {
            var tree = this;
            var ctx = tree.ctx;
            var canvas = ctx.canvas;
            var shift = false;
            var ctrl = false;
            var alt = false;
            var mx = null;
            var my = null;
            var hovered = null;
            function Toggle(twig, open) {
                if (twig.type == 2 /* Primitive */) {
                    return;
                }
                var toToggle = shift ? (alt ? twig.grandchildren() : twig.children()) : [twig];
                for (var i = 0; i < toToggle.length; i++) {
                    if (ctrl) {
                        toToggle[i].toggleDescendants(open);
                    }
                    else {
                        toToggle[i].open = open;
                    }
                }
                tree.determineCloser();
                tree.calcVisible();
                tree.draw();
            }
            function CheckOverflow() {
                // if selected goes below the closer, make the selected the new closer
                var selectedVisible = false;
                for (var i = 0; i < tree.twigs.length; i++) {
                    if (tree.twigs[i].twig == tree.selected) {
                        selectedVisible = true;
                        break;
                    }
                }
                if (!selectedVisible) {
                    tree.closer = tree.selected;
                    tree.determineCursor();
                }
                tree.calcVisible();
                tree.draw();
            }
            function CheckUnderflow() {
                // if selected goes above the cursor, make the selected the new cursor
                var selectedVisible = false;
                for (var i = 0; i < tree.twigs.length; i++) {
                    if (tree.twigs[i].twig == tree.selected) {
                        selectedVisible = true;
                        break;
                    }
                }
                if (!selectedVisible) {
                    tree.cursor = tree.selected;
                    tree.determineCloser();
                }
                tree.calcVisible();
                tree.draw();
            }
            // we can't do anything on focus or blur because we blur the canvas when we move focus to the edit input
            canvas.onfocus = function (e) { };
            canvas.onblur = function (e) { };
            canvas.onmousewheel = function (wheelEvent) {
                wheelEvent.preventDefault();
                wheelEvent.stopPropagation();
                var clicks = -wheelEvent.wheelDelta / 120;
                // Shift+Scroll = 1, Scroll = 10, Ctrl+Scroll = 100, Ctrl+Shift+Scroll = 1000, Ctrl+Shift+Alt+Scroll = 10000
                var multiplier = (ctrl && shift && alt) ? 10000 : ((ctrl && shift) ? 1000 : (ctrl ? 100 : (shift ? 1 : 10)));
                var offset = clicks * multiplier;
                tree.scrollBy(offset);
            };
            canvas.onmousemove = function (e) {
                mx = e.offsetX;
                my = e.offsetY;
                var r = tree.handleRadius;
                var hit = false;
                for (var i = 0; i < tree.twigs.length; i++) {
                    var twig = tree.twigs[i];
                    if (twig.cx - r < mx && mx < twig.cx + r && twig.cy - r < my && my < twig.cy + r) {
                        hit = true;
                        hovered = twig.twig;
                        canvas.style.cursor = 'pointer';
                        return;
                    }
                }
                if (!hit && hovered) {
                    hovered = null;
                    canvas.style.cursor = 'default';
                }
            };
            canvas.onmousedown = function (e) {
                if (hovered) {
                    tree.selected = hovered;
                    Toggle(hovered, !hovered.open);
                }
            };
            canvas.onkeyup = function (keyUpEvent) {
                var key = keyUpEvent.keyCode;
                if (key == 16) {
                    shift = false;
                }
                else if (key == 17) {
                    ctrl = false;
                }
                else if (key == 18) {
                    alt = false;
                }
            };
            canvas.onkeydown = function (e) {
                var key = e.keyCode;
                var letter = e.key;
                var selected = tree.selected;
                e.preventDefault();
                e.stopPropagation();
                if (key == 16) {
                    shift = true;
                }
                else if (key == 17) {
                    ctrl = true;
                }
                else if (key == 18) {
                    alt = true;
                }
                else if (key == 9) {
                }
                else if (key == 27) {
                }
                else if (key == 32) {
                    var editVal_1 = !shift;
                    if (!editVal_1 && tree.selected == tree.root) {
                        return;
                    } // can't edit the key of the root
                    var index = -1;
                    for (var i = 0; i < tree.twigs.length; i++) {
                        if (tree.twigs[i].twig == tree.selected) {
                            index = i;
                            break;
                        }
                    }
                    if (index < 0) {
                        return;
                    }
                    var visibleTwig = tree.twigs[index];
                    var lf = ctx.canvas.offsetLeft + visibleTwig.cx + tree.textMargin;
                    var tp = ctx.canvas.offsetTop + visibleTwig.cy - 10;
                    var input_1 = tree.input;
                    input_1.style.display = 'block';
                    input_1.style.left = lf + 'px';
                    input_1.style.top = tp + 'px';
                    if (editVal_1) {
                        input_1.value = (tree.selected == tree.root) ? JSON.stringify(tree.data) : JSON.stringify(tree.selected.obj[tree.selected.key]);
                    }
                    else {
                        input_1.value = tree.selected.key;
                    }
                    input_1.focus();
                    input_1.onkeydown = function (e) {
                        var key = e.keyCode;
                        if (key == 27) {
                            input_1.style.display = 'none';
                            input_1.value = '';
                            ctx.canvas.focus();
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        else if (key == 13) {
                            input_1.style.display = 'none';
                            var text = input_1.value;
                            var twig = tree.selected;
                            if (editVal_1) {
                                twig.obj[twig.key] = JSON.parse(text);
                            }
                            else {
                                if (text != twig.key && !twig.obj[text]) {
                                    var val = twig.obj[twig.key];
                                    delete twig.obj[twig.key];
                                    twig.obj[text] = val;
                                    twig.key = text;
                                }
                            }
                            ctx.canvas.focus();
                            e.preventDefault();
                            e.stopPropagation();
                            tree.calcVisible();
                            tree.draw();
                        }
                    };
                }
                else if (key == 33 || key == 34) {
                    var offset = (ctrl && shift && alt) ? 10000 : ((ctrl && shift) ? 1000 : (ctrl ? 100 : (shift ? 1 : 10)));
                    var direction = ((key == 33) ? -1 : 1);
                    tree.scrollBy(direction * offset);
                }
                else if (key == 37 || key == 39) {
                    var open_1 = (key == 39); // right = open
                    if (!shift && !alt && !ctrl && !open_1 && (!selected.open || selected.type == 2 /* Primitive */)) {
                        if (tree.selected.parent !== null) {
                            tree.selected = tree.selected.parent;
                            CheckUnderflow();
                        }
                    }
                    else if (!shift && !alt && !ctrl && open_1 && selected.open) {
                        var next = tree.selected.next();
                        if (next !== null) {
                            tree.selected = next;
                            CheckOverflow();
                        }
                    }
                    else {
                        Toggle(selected, open_1);
                    }
                }
                else if (key == 38 || key == 40) {
                    // Up = move cursor up (in display order)
                    // Down = move cursor down (in display order)
                    // Shift+Up = move cursor to prev sibling 
                    // Shift+Down = move cursor to next sibling
                    // Ctrl+Up = move cursor to parent
                    // Ctrl+Down = ?? (TODO)
                    // Ctrl+Shift+Up = move cursor to root
                    // Ctrl+Shift+Down = move cursor to bookmark? (TODO)
                    // Alt+Up = add prev sibling (TODO)
                    // Alt+Down = add next sibling (TODO)
                    if (key == 38) {
                        if (ctrl && shift) {
                            tree.selected = tree.root;
                        }
                        else if (ctrl) {
                            if (tree.selected.parent !== null) {
                                tree.selected = tree.selected.parent;
                            }
                        }
                        else if (shift) {
                            if (tree.selected.prevSibling) {
                                tree.selected = tree.selected.prevSibling;
                            }
                        }
                        else if (alt) {
                        }
                        else {
                            var prev = tree.selected.prev();
                            if (prev !== null) {
                                tree.selected = prev;
                            }
                        }
                        CheckUnderflow();
                    }
                    else if (key == 40) {
                        if (ctrl && shift) {
                        }
                        else if (ctrl) {
                        }
                        else if (shift) {
                            if (tree.selected.nextSibling) {
                                tree.selected = tree.selected.nextSibling;
                            }
                        }
                        else if (alt) {
                        }
                        else {
                            var next = tree.selected.next();
                            if (next !== null) {
                                tree.selected = next;
                            }
                        }
                        CheckOverflow();
                    }
                }
            };
        };
        Tree.prototype.scrollBy = function (offset) {
            var tree = this;
            var cursor = tree.cursor;
            var closer = tree.closer;
            var n = offset;
            if (n > 0) {
                while (n > 0) {
                    var nextCursor = cursor.next();
                    var nextCloser = closer.next();
                    if (nextCloser === null) {
                        break;
                    }
                    cursor = nextCursor;
                    closer = nextCloser;
                    n--;
                }
            }
            else {
                while (n < 0) {
                    var prevCursor = cursor.prev();
                    var prevCloser = closer.prev();
                    if (prevCursor === null) {
                        break;
                    }
                    cursor = prevCursor;
                    closer = prevCloser;
                    n++;
                }
            }
            tree.cursor = cursor;
            tree.closer = closer;
            tree.calcVisible();
            tree.draw();
        };
        Tree.JsonToTwigRec = function (json, key) {
            if (key === undefined) {
                key = '[root]';
            }
            var type = Object.prototype.toString.apply(json);
            var twig = new Twig();
            twig.key = key;
            if (type == '[object Object]') {
                twig.type = 0 /* Object */;
                var first = true;
                var prevChild = null;
                for (var key in json) {
                    var child = Tree.JsonToTwigRec(json[key], key);
                    child.obj = json;
                    child.parent = twig;
                    if (first) {
                        twig.firstChild = child;
                    }
                    else {
                        prevChild.nextSibling = child;
                        child.prevSibling = prevChild;
                    }
                    first = false;
                    prevChild = child;
                }
                twig.lastChild = prevChild;
            }
            else if (type == '[object Array]') {
                twig.type = 1 /* Array */;
                var first = true;
                var prevChild = null;
                for (var i = 0; i < json.length; i++) {
                    var child = Tree.JsonToTwigRec(json[i], i.toString());
                    child.obj = json;
                    child.parent = twig;
                    if (first) {
                        twig.firstChild = child;
                    }
                    else {
                        prevChild.nextSibling = child;
                        child.prevSibling = prevChild;
                    }
                    first = false;
                    prevChild = child;
                }
                twig.lastChild = prevChild;
            }
            else {
                twig.type = 2 /* Primitive */;
            }
            return twig;
        };
        return Tree;
    }());
    Sweetgum.Tree = Tree;
    var Twig = (function () {
        function Twig() {
            this.type = 2 /* Primitive */;
            this.parent = null;
            this.firstChild = null;
            this.lastChild = null;
            this.nextSibling = null;
            this.prevSibling = null;
            this.open = true;
            this.obj = null;
            this.key = null;
        }
        Twig.prototype.descendants = function () {
            var l = [];
            function DescendantsRec(twig) {
                l.push(twig);
                var children = twig.children();
                for (var i = 0; i < children.length; i++) {
                    DescendantsRec(children[i]);
                }
            }
            DescendantsRec(this);
            return l;
        };
        Twig.prototype.indent = function () {
            var twig = this;
            if (twig.parent) {
                return twig.parent.indent() + 1;
            }
            else {
                return 0;
            }
        };
        Twig.prototype.prev = function () {
            var twig = this;
            function Last(t) {
                if (t.open && t.lastChild !== null) {
                    return Last(t.lastChild);
                }
                else {
                    return t;
                }
            }
            if (twig.parent === null) {
                return null;
            }
            else if (twig == twig.parent.firstChild) {
                return twig.parent;
            }
            else {
                return Last(twig.prevSibling);
            }
        };
        Twig.prototype.next = function () {
            var twig = this;
            function NextHelper(t) {
                if (t.nextSibling) {
                    return t.nextSibling;
                }
                else {
                    if (t.parent) {
                        return NextHelper(t.parent);
                    }
                    else {
                        return null;
                    }
                }
            }
            if (twig.type == 0 /* Object */ || twig.type == 1 /* Array */) {
                if (twig.open && twig.firstChild) {
                    return twig.firstChild;
                }
                else {
                    return NextHelper(twig);
                }
            }
            else {
                return NextHelper(twig);
            }
        };
        Twig.prototype.toggleDescendants = function (open) {
            var twig = this;
            twig.open = open;
            var children = twig.children();
            for (var i = 0; i < children.length; i++) {
                children[i].toggleDescendants(open);
            }
        };
        Twig.prototype.children = function () {
            var twig = this;
            var children = [];
            if (twig.firstChild === null) {
                return children;
            }
            var child = twig.firstChild;
            children.push(child);
            while (child.nextSibling !== null) {
                child = child.nextSibling;
                children.push(child);
            }
            return children;
        };
        Twig.prototype.grandchildren = function () {
            var twig = this;
            var children = twig.children();
            var grandchildren = [];
            for (var i = 0; i < children.length; i++) {
                grandchildren = grandchildren.concat(children[i].children());
            }
            return grandchildren;
        };
        return Twig;
    }());
    var VisibleTwig = (function () {
        function VisibleTwig(twig, cx, cy, text) {
            this.twig = twig;
            this.cx = cx;
            this.cy = cy;
            this.text = text;
        }
        return VisibleTwig;
    }());
    function DrawHandle(ctx, tree, twig, cx, cy) {
        var handleRadius = 5;
        // selected dots
        if (twig == tree.selected) {
            var lf = cx - handleRadius - 2;
            var tp = cy - handleRadius - 2;
            var wd = handleRadius * 2 + 5;
            ctx.setLineDash([1, 1]);
            ctx.beginPath();
            ctx.moveTo(lf, tp + 0.5);
            ctx.lineTo(lf + wd, tp + 0.5);
            ctx.moveTo(lf + wd - 0.5, tp);
            ctx.lineTo(lf + wd - 0.5, tp + wd);
            ctx.moveTo(lf + wd, tp + wd - 0.5);
            ctx.lineTo(lf, tp + wd - 0.5);
            ctx.moveTo(lf + 0.5, tp + wd);
            ctx.lineTo(lf + 0.5, tp);
            ctx.stroke();
            ctx.setLineDash([1, 0]);
        }
        // box
        ctx.strokeRect(cx - handleRadius + 0.5, cy - handleRadius + 0.5, handleRadius * 2, handleRadius * 2);
        // +/-
        if (twig.firstChild !== null) {
            ctx.beginPath();
            ctx.moveTo(cx - 1, cy + 0.5);
            ctx.lineTo(cx + 3, cy + 0.5);
            ctx.stroke();
            if (!twig.open) {
                ctx.beginPath();
                ctx.moveTo(cx + 0.5, cy - 2);
                ctx.lineTo(cx + 0.5, cy + 2);
                ctx.stroke();
            }
        }
    }
})(Sweetgum || (Sweetgum = {}));
