var Hyperdeck;
(function (Hyperdeck) {
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
        Tree.prototype.draw = function () {
            var tree = this;
            var ctx = tree.ctx;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = 'black';
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
            canvas.onwheel = function (wheelEvent) {
                wheelEvent.preventDefault();
                wheelEvent.stopPropagation();
                //const clicks = -wheelEvent.wheelDelta / 120;
                var clicks = (wheelEvent.deltaY > 0) ? 1 : -1;
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
                var sel = tree.selected;
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
                else if (key == 46) {
                    if (tree.root == sel) {
                        return;
                    }
                    var prev = sel.prev();
                    var parentType = Object.prototype.toString.apply(sel.obj);
                    var obj = sel.obj;
                    if (sel.parent.firstChild == sel) {
                        sel.parent.firstChild = sel.nextSibling;
                    }
                    if (sel.parent.lastChild == sel) {
                        sel.parent.lastChild = sel.prevSibling;
                    }
                    if (sel.prevSibling !== null) {
                        sel.prevSibling.nextSibling = sel.nextSibling;
                    }
                    if (sel.nextSibling !== null) {
                        sel.nextSibling.prevSibling = sel.prevSibling;
                    }
                    if (parentType == '[object Object]') {
                        delete obj[sel.key];
                    }
                    else if (parentType == '[object Array]') {
                        obj.splice(parseInt(sel.key), 1);
                    }
                    if (parentType == '[object Array]') {
                        sel.parent.rekey();
                    }
                    tree.selected = prev;
                    tree.determineCloser();
                    tree.calcVisible();
                    tree.draw();
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
                                var val = JSON.parse(text);
                                var type = Object.prototype.toString.apply(val);
                                if (type == '[object Object]' || type == '[object Array]') {
                                    var newtwig_1 = Tree.JsonToTwigRec(val);
                                    if (tree.root == twig) {
                                        tree.root = newtwig_1;
                                        tree.cursor = newtwig_1;
                                        tree.data = val;
                                    }
                                    else {
                                        newtwig_1.obj = twig.obj;
                                        newtwig_1.key = twig.key;
                                        if (twig.parent.firstChild == twig) {
                                            twig.parent.firstChild = newtwig_1;
                                        }
                                        if (twig.parent.lastChild == twig) {
                                            twig.parent.lastChild = newtwig_1;
                                        }
                                        if (twig.prevSibling !== null) {
                                            twig.prevSibling.nextSibling = newtwig_1;
                                        }
                                        if (twig.nextSibling !== null) {
                                            twig.nextSibling.prevSibling = newtwig_1;
                                        }
                                        newtwig_1.parent = twig.parent;
                                        newtwig_1.prevSibling = twig.prevSibling;
                                        newtwig_1.nextSibling = twig.nextSibling;
                                        newtwig_1.obj[newtwig_1.key] = val;
                                    }
                                    tree.selected = newtwig_1;
                                }
                                else {
                                    if (tree.root != twig) {
                                        twig.obj[twig.key] = val;
                                    } // you can't make the root a primitive value, deal with it
                                }
                            }
                            else {
                                if (!twig.obj[text]) {
                                    var val = twig.obj[twig.key];
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
                else if (key == 33 || key == 34) {
                    var offset = (ctrl && shift && alt) ? 10000 : ((ctrl && shift) ? 1000 : (ctrl ? 100 : (shift ? 1 : 10)));
                    var direction = ((key == 33) ? -1 : 1);
                    tree.scrollBy(direction * offset);
                }
                else if (key == 37 || key == 39) {
                    if (alt && !shift) {
                        if (key == 39) {
                            var obj = ((tree.root == sel) ? tree.data : sel.obj[sel.key]);
                            var seltype = Object.prototype.toString.apply(obj);
                            var newchild = new Twig();
                            newchild.type = 2 /* Primitive */;
                            newchild.parent = sel;
                            newchild.firstChild = null;
                            newchild.lastChild = null;
                            newchild.prevSibling = null;
                            newchild.nextSibling = sel.firstChild;
                            newchild.open = true;
                            newchild.obj = obj;
                            if (seltype == '[object Object]') {
                                if (obj[''] !== undefined) {
                                    return;
                                } // bail if the empty string is already a key
                                newchild.key = '';
                                obj[''] = null;
                            }
                            else if (seltype == '[object Array]') {
                                obj.unshift(null);
                            }
                            else {
                                return; // sel must represent an object or array
                            }
                            if (sel.firstChild !== null) {
                                sel.firstChild.prevSibling = newchild;
                            }
                            sel.firstChild = newchild;
                            if (sel.lastChild === null) {
                                sel.lastChild = newchild;
                            }
                            if (seltype == '[object Array]') {
                                sel.rekey();
                            }
                        }
                        tree.determineCloser();
                        tree.calcVisible();
                        tree.draw();
                    }
                    else {
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
                }
                else if (key == 38) {
                    if (ctrl && shift) {
                        tree.selected = tree.root;
                    }
                    else if (shift && alt) {
                        if (tree.root == sel || sel.prevSibling === null) {
                            return;
                        }
                        var obj = sel.obj;
                        var parentType = Object.prototype.toString.apply(obj);
                        var pre = sel.prevSibling;
                        if (sel.parent.firstChild == pre) {
                            sel.parent.firstChild = sel;
                        }
                        if (sel.parent.lastChild == sel) {
                            sel.parent.lastChild = pre;
                        }
                        if (pre.prevSibling !== null) {
                            pre.prevSibling.nextSibling = sel;
                        }
                        if (sel.nextSibling !== null) {
                            sel.nextSibling.prevSibling = pre;
                        }
                        pre.nextSibling = sel.nextSibling;
                        sel.nextSibling = pre;
                        sel.prevSibling = pre.prevSibling;
                        pre.prevSibling = sel;
                        if (parentType == '[object Array]') {
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
                        if (sel == tree.root) {
                            return;
                        }
                        var parentType = Object.prototype.toString.apply(sel.obj);
                        var obj = sel.obj;
                        var newtwig = new Twig();
                        newtwig.type = 2 /* Primitive */;
                        newtwig.parent = sel.parent;
                        newtwig.firstChild = null;
                        newtwig.lastChild = null;
                        newtwig.prevSibling = sel.prevSibling;
                        newtwig.nextSibling = sel;
                        newtwig.open = true;
                        newtwig.obj = obj;
                        if (parentType == '[object Object]') {
                            if (obj[''] !== undefined) {
                                return;
                            } // bail if the empty string is already a key
                            newtwig.key = '';
                            obj[''] = null;
                        }
                        else if (parentType == '[object Array]') {
                            obj.splice(parseInt(sel.key), 0, null);
                        }
                        else {
                            return; // sel must represent an object or array
                        }
                        if (sel.parent.firstChild == sel) {
                            sel.parent.firstChild = newtwig;
                        }
                        if (sel.prevSibling !== null) {
                            sel.prevSibling.nextSibling = newtwig;
                        }
                        sel.prevSibling = newtwig;
                        if (parentType == '[object Array]') {
                            sel.parent.rekey();
                        }
                        tree.determineCloser();
                        tree.calcVisible();
                        tree.draw();
                        return; // skip over the CheckUnderflow below
                    }
                    else {
                        var prev_1 = tree.selected.prev();
                        if (prev_1 !== null) {
                            tree.selected = prev_1;
                        }
                    }
                    CheckUnderflow();
                }
                else if (key == 40) {
                    if (ctrl && shift) {
                    }
                    else if (shift && alt) {
                        if (tree.root == sel || sel.nextSibling === null) {
                            return;
                        }
                        var obj = sel.obj;
                        var parentType = Object.prototype.toString.apply(obj);
                        var nxt = sel.nextSibling;
                        if (sel.parent.firstChild == sel) {
                            sel.parent.firstChild = nxt;
                        }
                        if (sel.parent.lastChild == nxt) {
                            sel.parent.lastChild = sel;
                        }
                        if (sel.prevSibling !== null) {
                            sel.prevSibling.nextSibling = nxt;
                        }
                        if (nxt.nextSibling !== null) {
                            nxt.nextSibling.prevSibling = sel;
                        }
                        sel.nextSibling = nxt.nextSibling;
                        nxt.nextSibling = sel;
                        nxt.prevSibling = sel.prevSibling;
                        sel.prevSibling = nxt;
                        if (parentType == '[object Array]') {
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
                    else if (ctrl) {
                    }
                    else if (shift) {
                        if (tree.selected.nextSibling) {
                            tree.selected = tree.selected.nextSibling;
                        }
                    }
                    else if (alt) {
                        if (sel == tree.root) {
                            return;
                        }
                        var parentType = Object.prototype.toString.apply(sel.obj);
                        var obj = sel.obj;
                        var newtwig = new Twig();
                        newtwig.type = 2 /* Primitive */;
                        newtwig.parent = sel.parent;
                        newtwig.firstChild = null;
                        newtwig.lastChild = null;
                        newtwig.prevSibling = sel;
                        newtwig.nextSibling = sel.nextSibling;
                        newtwig.open = true;
                        newtwig.obj = obj;
                        if (parentType == '[object Object]') {
                            if (obj[''] !== undefined) {
                                return;
                            } // bail if the empty string is already a key
                            newtwig.key = '';
                            obj[''] = null;
                        }
                        else if (parentType == '[object Array]') {
                            obj.splice(parseInt(sel.key) + 1, 0, null);
                        }
                        else {
                            return; // sel must represent an object or array
                        }
                        if (sel.parent.lastChild == sel) {
                            sel.parent.lastChild = newtwig;
                        }
                        if (sel.nextSibling !== null) {
                            sel.nextSibling.prevSibling = newtwig;
                        }
                        sel.nextSibling = newtwig;
                        if (parentType == '[object Array]') {
                            sel.parent.rekey();
                        }
                        tree.determineCloser();
                        tree.calcVisible();
                        tree.draw();
                        return; // skip over the CheckOverflow below
                    }
                    else {
                        var next = tree.selected.next();
                        if (next !== null) {
                            tree.selected = next;
                        }
                    }
                    CheckOverflow();
                }
                else if (ctrl && key == 80) {
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
    Hyperdeck.Tree = Tree;
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
        Twig.prototype.rekey = function () {
            // done to arrays after we prepend/delete a child
            var twig = this;
            var children = twig.children();
            for (var i = 0; i < children.length; i++) {
                children[i].key = i.toString();
            }
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
    function DrawHandle2(ctx, tree, twig, cx, cy) {
        var selected = (twig == tree.selected);
        var plus = (twig.firstChild !== null && !twig.open);
        var minus = (twig.firstChild !== null);
        var imageData = ctx.createImageData(15, 15);
        for (var i = 0; i < 15; i++) {
            for (var j = 0; j < 15; j++) {
                var index = (i * imageData.width + j) * 4;
                var black = (selected && (i == 0 || j == 0 || i == 14 || j == 14) && (((i + j + 1) % 2) == 1)) ||
                    ((j == 2 || j == 12) && i >= 2 && i <= 12) || ((i == 2 || i == 12) && j >= 2 && j <= 12) ||
                    (plus && j == 7 && i >= 5 && i <= 9) ||
                    (minus && i == 7 && j >= 5 && j <= 9); // minus
                var color = (black ? 0 : 255);
                imageData.data[index + 0] = color;
                imageData.data[index + 1] = color;
                imageData.data[index + 2] = color;
                imageData.data[index + 3] = 255;
            }
        }
        ctx.putImageData(imageData, cx - 7, cy - 7);
    }
})(Hyperdeck || (Hyperdeck = {}));
