var dat;
function BoxDatgui(box) {
    //var gui = gui.addFolder('box');
    //controls.push(gui.add(box, 'x'));
    //controls.push(gui.add(box, 'y'));
    //controls.push(gui.add(box, 'wd', ['left','center','right']));
    //controls.push(gui.add(box, 'hg', ['top','center','bottom']));
    //controls.push(gui.add(box, 'hAlign', ['left','center','right']));
    //controls.push(gui.add(box, 'vAlign', ['top','center','bottom']));
}
function DrawKey(ctx, params, labelColors) {
    for (var i = 0; i < labelColors.length; i++) {
        var x = params.left;
        var y = params.top + i * (params.boxSize + params.vGap);
        ctx.fillStyle = labelColors[i].color;
        ctx.fillRect(x, y, params.boxSize, params.boxSize);
        ctx.font = params.text.font;
        ctx.fillStyle = params.text.fillStyle;
        ctx.textAlign = params.text.hAlign;
        ctx.textBaseline = ((params.text.vAlign == 'center') ? 'middle' : params.text.vAlign);
        ctx.fillText(params.labelColors[i].label, x + params.boxSize + params.labelOffset, y + params.boxSize / 2);
    }
}
function KeyDatgui(params) {
    var gui = new dat.GUI();
    var controls = [];
    //controls.push(gui.add(params.x, 'x'));
    //controls.push(gui.add(params.y, 'y'));
    //controls.push(gui.add(params.hAlign, 'hAlign', ['left','center','right']));
    //controls.push(gui.add(params.vAlign, 'vAlign', ['top','center','bottom']));
    //controls.push(gui.add(params.hAnchor, 'hAnchor', ['left','center','right']));
    //controls.push(gui.add(params.vAnchor, 'vAnchor', ['top','center','bottom']));
    controls.forEach(function (control) {
        control.onChange(function (value) {
        });
    });
    return gui;
}
function DrawAxis(ctx, params) {
    var axisPixel = null;
    var sta = null;
    var end = null;
    var fixed = null;
    if (params.axis == 'x') {
        axisPixel = params.chart.box.bt - params.chart.margin.bt - Math.floor((params.axisValue - params.chart.yMin) * params.chart.yScale);
        sta = params.chart.box.lf + params.chart.margin.lf;
        end = params.chart.box.rt - params.chart.margin.rt;
    }
    else if (params.axis == 'y') {
        axisPixel = params.chart.box.lf + params.chart.margin.lf + Math.floor((params.axisValue - params.chart.xMin) * params.chart.xScale);
        sta = params.chart.box.bt - params.chart.margin.bt;
        end = params.chart.box.tp + params.chart.margin.tp;
    }
    fixed = axisPixel + 0.5;
    ctx.lineWidth = 1;
    ctx.strokeStyle = params.strokeStyle;
    ctx.font = params.tickLabelFont;
    ctx.fillStyle = params.tickLabelColor;
    var x1 = ((params.axis == 'x') ? sta : fixed);
    var y1 = ((params.axis == 'x') ? fixed : sta);
    var x2 = ((params.axis == 'x') ? end : fixed);
    var y2 = ((params.axis == 'x') ? fixed : end);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // this basically rounds axisValue down to the nearest tickInterval
    var tickValueCursor = Math.floor(params.axisValue / params.tickInterval) * params.tickInterval;
    var maxTickmarks = 100;
    var tickmarkIndex = 0;
    while (tickmarkIndex < maxTickmarks) {
        tickValueCursor += params.tickInterval;
        // unwieldy text concat
        var direction = ((params.axis == 'x') ? 1 : -1);
        // here we need the other axis pixel
        var tickPixelCursor = Math.floor(axisPixel + direction * (tickValueCursor - params.axisValue) * params.chart[params.axis + 'Scale']) + 0.5;
        if ((params.axis == 'x') && (tickPixelCursor >= params.chart.box.rt - params.chart.margin.rt)) {
            break;
        }
        if ((params.axis == 'y') && (tickPixelCursor <= params.chart.box.tp + params.chart.margin.tp)) {
            break;
        }
        var sta = axisPixel - params.tickLength;
        var end = axisPixel + params.tickLength + 1;
        var fixed = tickPixelCursor;
        var x1 = ((params.axis == 'y') ? sta : fixed); // (params.axis == 'y') indicates a contra stroke
        var y1 = ((params.axis == 'y') ? fixed : sta);
        var x2 = ((params.axis == 'y') ? end : fixed);
        var y2 = ((params.axis == 'y') ? fixed : end);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        var text = tickValueCursor.toString(); // need number formatting here
        if (params.axis == 'x') {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(text, tickPixelCursor, axisPixel + params.tickLength + 4);
        }
        else if (params.axis == 'y') {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, axisPixel - params.tickLength - 4, tickPixelCursor);
        }
        tickmarkIndex++;
    }
}
function AxisDatgui(params) {
    var gui = new dat.GUI();
    var controls = [];
    //controls.push(gui.add(params.x, 'x'));
    //controls.push(gui.add(params.y, 'y'));
    //controls.push(gui.add(params.hAlign, 'hAlign', ['left','center','right']));
    //controls.push(gui.add(params.vAlign, 'vAlign', ['top','center','bottom']));
    //controls.push(gui.add(params.hAnchor, 'hAnchor', ['left','center','right']));
    //controls.push(gui.add(params.vAnchor, 'vAnchor', ['top','center','bottom']));
    controls.forEach(function (control) {
        control.onChange(function (value) {
        });
    });
    return gui;
}
function BarChartDraw(ctx, columns, params) {
    //this.calculateDimensions(); // this is a separate function because it must be called every time the width, scale, gap, etc. params change
    //params.box.clear();
    var totalWidth = columns.map(function (x) { return x.width + x.gap; }).reduce(function (a, b) { return a + b; });
    var maxHeight = columns.map(function (x) { return x.height; }).reduce(function (a, b) { return Math.max(a, b); });
    var left = -Math.floor(totalWidth / 2);
    var bottom = Math.floor(maxHeight / 2);
    for (var i = 0; i < columns.length; i++) {
        var column = columns[i];
        var heightSum = 0;
        for (var k = 0; k < column.segments.length; k++) {
            var segment = column.segments[k];
            // bar segment
            heightSum += segment.height;
            var top = bottom - heightSum;
            ctx.fillStyle = segment.color;
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
            ctx.fillRect(left, top, column.width, segment.height);
            //ctx.strokeRect(left, top, column.width, segment.height);
            // segment label
            ctx.font = params.textStyle.segmentLabelFont;
            ctx.fillStyle = params.textStyle.segmentLabelColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = params.textStyle.segmentLabelAnchor;
            var text = segment.label;
            var x = left + column.width / 2;
            var y = top + segment.height / 2;
            ctx.fillText(text, x, y);
        }
        // top label
        ctx.font = params.textStyle.topLabelFont;
        ctx.fillStyle = params.textStyle.topLabelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        var text = column.topLabel;
        var x = left + column.width / 2;
        var y = bottom - heightSum - params.textStyle.margin;
        ctx.fillText(text, x, y);
        // bottom label
        ctx.font = params.textStyle.bottomLabelFont;
        ctx.fillStyle = params.textStyle.bottomLabelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var text = column.bottomLabel;
        var x = left + column.width / 2;
        var y = bottom + params.textStyle.margin;
        ctx.fillText(text, x, y);
        left += column.width + column.gap;
    }
}
function BarChartDatgui(params, callback) {
    var controls = [];
    var gui = new dat.GUI();
    controls.push(gui.add(params, 'columnKey'));
    controls.push(gui.add(params, 'valueKeys'));
    controls.push(gui.add(params, 'colors'));
    controls.push(gui.add(params, 'scale'));
    controls.push(gui.add(params, 'barWidth'));
    controls.push(gui.add(params, 'barGap'));
    var textStyle = gui.addFolder('textStyle');
    controls.push(textStyle.add(params.textStyle, 'margin'));
    controls.push(textStyle.add(params.textStyle, 'segmentLabelFont'));
    controls.push(textStyle.addColor(params.textStyle, 'segmentLabelColor'));
    controls.push(textStyle.add(params.textStyle, 'segmentLabelAnchor', ['top', 'middle', 'bottom']));
    controls.push(textStyle.add(params.textStyle, 'topLabelFont'));
    controls.push(textStyle.addColor(params.textStyle, 'topLabelColor'));
    controls.push(textStyle.add(params.textStyle, 'bottomLabelFont'));
    controls.push(textStyle.addColor(params.textStyle, 'bottomLabelColor'));
    controls.forEach(function (control) {
        control.onChange(function (value) {
            callback();
        });
    });
    return gui;
}
function BarChartParamsDefault() {
    return {
        columnKey: null,
        valueKeys: null,
        colors: null,
        scale: 1,
        barWidth: 50,
        barGap: 20,
        textStyle: {
            margin: 10,
            segmentLabelFont: '10pt sans-serif',
            segmentLabelColor: 'rgb(255,255,255)',
            segmentLabelAnchor: 'middle',
            topLabelFont: '10pt sans-serif',
            topLabelColor: 'rgb(0,0,0)',
            bottomLabelFont: '10pt sans-serif',
            bottomLabelColor: 'rgb(0,0,0)',
        }
    };
}
function CalculateDimensions(columns, params) {
    // here we need to calculate an initial width/height so that we can place the chart correctly
    // that means dynamically determining a scale, and possibly a barWidth and widthBetweenBars
    var maxHeight = columns.map(function (column) { return column.sum; }).reduce(function (a, b) { return Math.max(a, b); });
    var totalWidth = columns.map(function (column) { return column.width + column.gap; }).reduce(function (a, b) { return a + b; });
    params.box.wd = params.padding.left + totalWidth + params.padding.right;
    params.box.hg = params.padding.top + maxHeight * params.scale + params.padding.bottom;
    params.box.align();
}
function MakeColumns(data, params) {
    // i think we should separate data grouping from dimension determination
    var valueKeyList = params.valueKeys.split(',').map(function (x) { return x.trim(); });
    var colorList = params.colors.split(',').map(function (x) { return x.trim(); });
    var columns = [];
    for (var i = 0; i < data.length; i++) {
        var obj = data[i];
        var column = {
            topLabel: null,
            bottomLabel: obj[params.columnKey],
            sum: 0,
            width: params.barWidth,
            height: 0,
            gap: ((i == data.length - 1) ? 0 : params.barGap),
            segments: []
        };
        for (var k = 0; k < valueKeyList.length; k++) {
            var valueKey = valueKeyList[k];
            var value = obj[valueKey];
            var segment = {
                value: value,
                label: value.toString(),
                color: colorList[k],
                height: Math.floor(value * params.scale)
            };
            column.segments.push(segment);
            column.sum += segment.value;
            column.height += segment.height;
        }
        column.topLabel = column.sum.toString(); // customize
        columns.push(column);
    }
    return columns;
}
function LineChartDraw(ctx, data, params) {
    /*
    
    var yKeyList = params.yKeys.split(',').map(x => x.trim());
    var colorList = params.colors.split(',').map(x => x.trim());
    
    var xPixelWidth = params.box.wd - params.padding.left - params.padding.right;
    var yPixelWidth = params.box.hg - params.padding.top - params.padding.bottom;
    var xValueWidth = params.xMax - params.xMin;
    var yValueWidth = params.yMax - params.yMin;
    params.xScale = xPixelWidth / xValueWidth;
    params.yScale = yPixelWidth / yValueWidth;
    
    var lf = params.box.lf + params.padding.left;
    var bt = params.box.bt - params.padding.bottom;
    
    for (var k = 0; k < yKeyList.length; k++)
    {
        var key = yKeyList[k];
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = colorList[k];
        
        ctx.beginPath();
        
        for (var i = 0; i < data.length; i++)
        {
            var xNum = data[i][params.xKey];
            var yNum = data[i][key];
            
            if (yNum == null || yNum == '') { continue; } // skip over blank entries
            
            var x = lf+(xNum-params.xMin)*params.xScale;
            var y = bt-(yNum-params.yMin)*params.yScale;
            
            // what if x or y is outside the bounds of the chart?  probably should use a clipping path here
            if (i == 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
        }
        
        ctx.stroke();
    }
    
    */
}
function LineChartDatgui(params, callback) {
    var controls = [];
    var gui = new dat.GUI();
    //gui.add(params, 'xKey');
    //gui.add(params, 'yKeys');
    //
    //gui.add(params, 'radiusKey');
    //gui.add(params, 'colorKey');
    //gui.add(params, 'shapeKey');
    //gui.add(params, 'labelKey');
    //gui.add(params, 'radiusScale');
    //
    //var axes = gui.addFolder('axes');
    //controls.push(axes.add(params, 'xMap', ['linear','logarithmic']));
    //controls.push(axes.add(params, 'xMin'));
    //controls.push(axes.add(params, 'xMax'));
    //controls.push(axes.add(params, 'yMap', ['linear','logarithmic']));
    //controls.push(axes.add(params, 'yMin'));
    //controls.push(axes.add(params, 'yMax'));
    //
    //var colorMap = gui.addFolder('colorMap');
    //for (var key in params.colorMap) { controls.push(colorMap.addColor(params.colorMap, key)); }
    //
    //var supportedShapes = ['circle','square','triangle','cross','star'];
    //var shapeMap = gui.addFolder('shapeMap');
    //for (var key in params.shapeMap) { controls.push(shapeMap.add(params.shapeMap, key, supportedShapes)); }
    //
    //var labelPlacement = gui.addFolder('labelPlacement');
    //controls.push(labelPlacement.add(params.labelPlacement, 'xAnchor', ['left','center','right']));
    //controls.push(labelPlacement.add(params.labelPlacement, 'yAnchor', ['top','center','bottom']));
    //controls.push(labelPlacement.add(params.labelPlacement, 'dx'));
    //controls.push(labelPlacement.add(params.labelPlacement, 'dy'));
    //
    //var textStyle = gui.addFolder('textStyle');
    //controls.push(textStyle.add(params.textStyle, 'margin'));
    controls.forEach(function (control) {
        control.onChange(function (value) {
        });
    });
    return gui.domElement;
}
function ScatterChartDraw(ctx, data, params) {
    // need to parametrize keys
    // x	y	r	color	shape	label	style
    // 10	20	5	'orange'	'circle'	'foo'	'centered'
    /*
    
    var xPixelWidth = params.box.wd - params.margin.lf - params.margin.rt;
    var yPixelWidth = params.box.hg - params.margin.tp - params.margin.bt;
    var xValueWidth = params.xMax - params.xMin;
    var yValueWidth = params.yMax - params.yMin;
    var xScale = xPixelWidth / xValueWidth;
    var yScale = yPixelWidth / yValueWidth;
    
    for (var i = 0; i < data.length; i++)
    {
        var obj = data[i];
        
        var xNum = parseFloat(obj.x);
        var yNum = parseFloat(obj.y);
        var rNum = parseFloat(obj.r);
        
        var x = params.box.lf+params.margin.lf+(xNum-params.xMin)*xScale;
        var y = params.box.bt-params.margin.bt-(yNum-params.yMin)*yScale;
        var r = rNum * params.radiusScale;
        
        var fill = null;
        var stroke = null;
        
        var lineWidth = 2;
        var lineColor = 'black';
        
        // individual overrides for label params
        //if (obj.labelFont) { labelFont = obj.labelFont; }
        //if (obj.labelColor) { labelColor = obj.labelColor; }
        //if (obj.labelYOffset) { labelYOffset = obj.labelYOffset; }
        //if (obj.color) { fill = obj.color; }
        //if (obj.stroke) { stroke = obj.stroke; }
        //if (obj.lineWidth) { lineWidth = obj.lineWidth; }
        //if (obj.lineColor) { lineColor = obj.lineColor; }
        
        
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2, false);
        if (fill)
        {
            ctx.fillStyle = obj.color;
            ctx.fill();
        }
        
        if (stroke)
        {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = lineColor;
            ctx.stroke();
        }
        
        // label
        ctx.font = '10pt sans-serif'; // parametrize
        ctx.fillStyle = 'white'; // parametrize
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.label, x, y);
    }
    
    */
}
function ScatterChartDatgui(params, callback) {
    var gui = new dat.GUI();
    //gui.add(params, 'xMin');
    //gui.add(params, 'xMax');
    //gui.add(params, 'yMin');
    //gui.add(params, 'yMax');
    //gui.add(params, 'radiusScale');
    return gui;
}
function RegularPolygon(ctx, cx, cy, r, n, angle) {
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
        var x = cx + r * Math.cos(angle + i / n * Math.PI * 2);
        var y = cy + r * Math.sin(angle + i / n * Math.PI * 2);
        if (i == 0) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
}
function Star(ctx, cx, cy, r, angle) {
}
function Cross(ctx, cx, cy, r, w) {
    // this is a simple 4-legged cross - r is the distance from center to end, w is half the width of each leg
    ctx.beginPath();
    ctx.moveTo(cx + r, cy - w);
    ctx.lineTo(cx + w, cy - w);
    ctx.lineTo(cx + w, cy - r);
    ctx.lineTo(cx - w, cy - r);
    ctx.lineTo(cx - w, cy - w);
    ctx.lineTo(cx - r, cy - w);
    ctx.lineTo(cx - r, cy + w);
    ctx.lineTo(cx - w, cy + w);
    ctx.lineTo(cx - w, cy + r);
    ctx.lineTo(cx + w, cy + r);
    ctx.lineTo(cx + w, cy + w);
    ctx.lineTo(cx + r, cy + w);
    ctx.closePath();
}
