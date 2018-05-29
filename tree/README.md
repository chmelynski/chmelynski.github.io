
# Tree

Hyperdeck.Tree is a fast, canvas-rendered json tree viewer.

### Usage

    // <canvas id="canvas" width="1000" height="500" tabIndex="1">
    
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.canvas.focus();
    
    const data = {a:'foo',b:[{a:'foo'},'baz'],c:['bar','baz']};
    
    const options = {
        top: 20,
        left: 50,
        indent: 20,
        handleRadius: 5,
        textMargin: 15,
        twigHeight: 15,
        maxVisible: 30,
        font: '10pt Courier New',
        drawHandle: null
    };
    
    const tree = new Hyperdeck.Tree(ctx, data, options);

### Controls

Controls:

    Space                   edit value
    Shift+Space             edit key
    Ctrl+Space              edit {} or [] subtree (display a large textarea with underlying text representation) (TODO)

    Ctrl+C                  copy value to input bar (TODO)
    Ctrl+Shift+C            copy path to input bar (TODO)

    Up                      Move cursor up (in display order)
    Down                    Move cursor down (in display order)
    Shift+Up                Move cursor to prev sibling
    Shift+Down              Move cursor to next sibling
    Ctrl+Up                 Move cursor to parent
    Ctrl+Shift+Up           Move cursor to root

    Right                   Open, or move cursor to next
    Left                    Close, or move cursor to parent
    Ctrl+Right              Open descendants
    Ctrl+Left               Close descendants
    Shift+Right             Open children
    Shift+Left              Close children
    Shift+Ctrl+Right        Open children and descendants
    Shift+Ctrl+Left         Close children and descendants
    Alt+Shift+Right         Open grandchildren
    Alt+Shift+Left          Close grandchildren
    Alt+Shift+Ctrl+Right    Open grandchildren and descendants
    Alt+Shift+Ctrl+Left     Close grandchildren and descendants

    Alt+Up                  Add prev sibling
    Alt+Down                Add next sibling
    Ctrl+P                  Add object parent (TODO)
    Ctrl+Shift+P            Add array parent (TODO)
    Alt+Right               Add first child
    Shift+Alt+Up            Switch with prev sibling
    Shift+Alt+Down          Switch with next sibling
    Delete                  Delete selected

    Shift+Scroll            Scroll by 1
    Scroll                  Scroll by 10
    Ctrl+Scroll             Scroll by 100
    Ctrl+Shift+Scroll       Scroll by 1000
    Ctrl+Shift+Alt+Scroll   Scroll by 10000
    PageUp/PageDown is equivalent to Scroll

Note that Ctrl+Alt+Arrow changes screen orientation on some machines, so we can't use that combo

