
# Rastaman

Rastaman is a rasterizer for the HTML5 Canvas API. It has no dependencies, although you'll need a font rendering library (such as opentype.js) if you want to draw text. Rastaman is intendended to be a drop-in replacement for the CanvasRenderingContext2D object, so that you can take your canvas code from the browser and generate bitmaps under Node with minimal changes to the code.

### Rendering text

I use opentype.js to render text, so this discussion has that library in mind. There are two ways to render text:

1. Pass the Rastaman object to the font renderer in place of the CanvasRenderingContext2D object. You then call the font renderer's API to draw text, and it will in turn call quadraticCurveTo/bezierCurveTo/etc on Rastaman.
2. Set Rastaman.Raster.fontNameToFontObject['fontName'] = fontObject, where fontObject is an opentype.js font object. The you can set rastaman.font = '12pt fontName' like usual.

