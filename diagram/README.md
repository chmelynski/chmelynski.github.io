# Diagram

## Goals

The goal of Diagram is to provide lightweight interactivity to canvas-based graphics, while maintaining code as the sole source of truth.

The interactivity is based around moving points, which are flexible and can represent all manner of values - an individual point can reference an absolute location, or a horizontal or vertical guideline, if only the x or y coordinate is taken into account. Two points can represent a length, width, height, gap, etc. With more points you can represent increasingly complex geometric operations.

## Implementation

How these goals are tied together: Diagram scans the code for object literals that represent points, such as `{ x: 0, y: 0 }` (in fact, it scans for object literals containing integer fields - other fields, such as x1,y1,x2,y2,r,g,b could be added to customize the look and feel of the point). These literals are turned into points, which are displayed on the canvas and can be dragged around. As the point is dragged, it writes its new coordinates back to the code (to optimize, this is actually done on end of drag).

## Usage

The Diagram constructor takes two arguments: a CanvasRenderingContext2D, and an afterChange hook that is called with the new code text that is generated after points are dragged.

    diagram = Hyperdeck.Diagram(ctx, afterChange(code))
  
Then the diagram instance must be initialized with the code text:

    diagram.receiveText(initialCode)
  
`diagram.receiveText(code)` should be called to reset the diagram anytime the code is edited in the text editor.

See diagram.htm for the full working example, parts of it reproduced here:

    function SetCodemirrorText(code) { codemirror.getDoc().setValue(code); }
    const ctx = document.getElementById('diagram').getContext('2d');
    const codemirror = InitCodemirror(document.getElementById('codemirror'));
    const diagram = new Hyperdeck.Diagram(ctx, SetCodemirrorText);
    diagram.receiveText(initialCode);

