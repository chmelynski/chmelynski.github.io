# Grid

Hyperdeck.Grid is a fast, canvas-rendered data grid that can handle millions of rows.

Grid attempts to use commonly known spreadsheet mechanics, but has been optimized to accomodate large data sets, at the expense of some flexibility.  For example, formulas, formats, and styles are defined for whole columns, not for individual cells.  Header cells are selectable - row/col operations like sorting, moving, hiding, and showing are managed by arrow commands entered while a header cell is selected.

# Controls

### When value cell is selected

Arrow moves the cursor, Shift extends selection, Ctrl moves to the edge

    Arrow             Move Cursor
    Ctrl+Arrow        Move Cursor To Edge (or jump to header if already at top/left edge)
    Shift+Arrow       Extend Selection
    Ctrl+Shift+Arrow  Extend Selection To Edge

Ctrl/Shift+Space selects whole row/col/grid ranges

    Ctrl+Space        Select Whole Col
    Shift+Space       Select Whole Row
    Ctrl+Shift+Space  Select Whole Grid

Space begins edit, or just start entering a new value

    Space                              Edit Cell / Edit Range as TSV
    A-Z,a-z,0-9,other printable chars  Edit Cell, deleting existing value and beginning entry of new value

Alt+Arrow commands are used for structural changes that add/delete rows/cols

            Alt+Arrow           Alt+Shift+Arrow
    Up      Add New Row Above   Delete Row
    Right   Add New Col Right   Delete Col
    Down    Add New Row Below   Delete Row
    Left    Add New Col Left    Delete Col

To copy and paste data from external sources to and from the grid, edit ranges (coming soon)

    F2   Edit Cell
    F3   Edit Range As TSV (this is how you copy and paste external data)
    F4   Edit Range As CSV
    F5   Edit Range As JSON
    F6   Edit Range As YAML

Standard cut, copy, and paste only work within the grid - these commands don't actually copy data to the system clipboard

    Ctrl+C   Copy (internal only)
    Ctrl+X   Cut (internal only)
    Ctrl+V   Paste (internal only)


### When header cell is selected

When header cells are selected, Arrow and Ctrl/Shift+Arrow act to move the cursor and extend selection just as when value cells are selected.  Column headers may be edited to change the column name.

    Arrow              Move Cursor
    Ctrl+Arrow         Move Cursor To Edge
    Shift+Arrow        Extend Selection
    Ctrl+Shift+Arrow   Extend Selection To Edge
    Space              Edit Cell

                       Col Header                        Row Header
    Left               Move Cursor                       -
    Right              Move Cursor                       Move Cursor back to value cells
    Up                 -                                 Move Cursor
    Down               Move Cursor back to value cells   Move Cursor
    Shift+Left         Extend Selection                  -
    Shift+Right        Extend Selection                  -
    Shift+Up           -                                 Extend Selection
    Shift+Down         -                                 Extend Selection
    Ctrl+Left          Move Cursor to Edge               -
    Ctrl+Right         Move Cursor to Edge               -
    Ctrl+Up            Sort Col Ascending                Move Cursor to Edge
    Ctrl+Down          Sort Col Descending               Move Cursor to Edge
    Ctrl+Shift+Left    Extend Selection to Edge          -
    Ctrl+Shift+Right   Extend Selection to Edge          -
    Ctrl+Shift+Up      Add Multisort Ascending           Extend Selection to Edge
    Ctrl+Shift+Down    Add Multisort Descending          Extend Selection to Edge

When a column header is selected, Ctrl+Up/Down sorts the column, Ctrl+Shift+Up/Down adds a multisort level

    Col Header Selected
    Ctrl+Up          Sort Col Ascending
    Ctrl+Down        Sort Col Descending
    Ctrl+Shift+Up    Add Multisort Ascending
    Ctrl+Shift+Down  Add Multisort Descending

Alt+Arrow makes structural changes - move/hide/show

                 Col Header        Row Header
    Alt+Left     Move Cols Left    Hide Rows
    Alt+Right    Move Cols Right   Show Rows
    Alt+Up       Hide Cols         Move Rows Up
    Alt+Down     Show Cols         Move Rows Down

### Scrolling

Ctrl/Shift/Alt modulates scroll magnitude

    Shift+Scroll                  Scroll rows by 1
    Scroll                        Scroll rows by 10
    Ctrl+Scroll                   Scroll rows by 100
    Ctrl+Shift+Scroll             Scroll rows by 1000
    Ctrl+Shift+Alt+Scroll         Scroll rows by 10000

    Shift+Page Down/Up            Scroll rows by 1
    Page Down/Up                  Scroll rows by 10
    Ctrl+Page Down/Up             Scroll rows by 100
    Ctrl+Shift+Page Down/Up       Scroll rows by 1000
    Ctrl+Shift+Alt+Page Down/Up   Scroll rows by 10000



