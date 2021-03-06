var Mapper;
(function (Mapper) {
    var abbrs = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    var fipss = ['01', '02', '04', '05', '06', '08', '09', '10', '12', '13', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '53', '54', '55', '56']; // '11','60','66','69','72','74','78'
    function Mercator(center, metersPerPixel) {
        // earth as sphere:
        // 1 degree of latitude = 69.172 miles = 111.321 km
        // 1 degree of longitude = cos(lat) * 69.172 miles
        // earth as ellipsoid:
        // 1 degree of latitude = 68.703 miles (110.567 km) at the equator 
        // 1 degree of latitude = 69.407 miles (111.699 km) at the poles
        var metersPerLat = 111321;
        var metersPerLng = 111321 * Math.cos(center.lat / 180 * Math.PI);
        return function (coord) {
            var x = (coord[0] - center.lng) * metersPerLng / metersPerPixel;
            var y = (center.lat - coord[1]) * metersPerLat / metersPerPixel;
            return [x, y];
        };
    }
    Mapper.Mercator = Mercator;
    function Mercator2(params) {
        // earth as sphere:
        // 1 degree of latitude = 69.172 miles = 111.321 km
        // 1 degree of longitude = cos(lat) * 69.172 miles
        // earth as ellipsoid:
        // 1 degree of latitude = 68.703 miles (110.567 km) at the equator 
        // 1 degree of latitude = 69.407 miles (111.699 km) at the poles
        var metersPerLat = 111321;
        var metersPerLng = 111321 * Math.cos(params.lat / 180 * Math.PI);
        return function (coord) {
            var x = (coord[0] - params.lng) * metersPerLng / params.metersPerPixel;
            var y = (params.lat - coord[1]) * metersPerLat / params.metersPerPixel;
            if (params.rotation == 0) {
                return [params.width / 2 + x, params.height / 2 + y];
            }
            else {
                var dist = Math.hypot(y, x);
                var angle = Math.atan2(y, x);
                var newangle = angle + params.rotation;
                var newx = dist * Math.cos(newangle);
                var newy = dist * Math.sin(newangle);
                return [params.width / 2 + newx, params.height / 2 + newy];
            }
        };
    }
    Mapper.Mercator2 = Mercator2;
    function InverseMercator(params) {
        var metersPerLat = 111321;
        var metersPerLng = 111321 * Math.cos(params.lat / 180 * Math.PI);
        return function (pixel) {
            var x = pixel[0];
            var y = pixel[1];
            if (params.rotation == 0) {
                var lng = (x - params.width / 2) * params.metersPerPixel / metersPerLng + params.lng;
                var lat = params.lat - (y - params.height / 2) * params.metersPerPixel / metersPerLat;
                return [lng, lat];
            }
            else {
                x = x - params.width / 2;
                y = y - params.height / 2;
                var dist = Math.hypot(y, x);
                var angle = Math.atan2(y, x);
                var newangle = angle - params.rotation;
                var newx = dist * Math.cos(newangle);
                var newy = dist * Math.sin(newangle);
                var lng = params.lng + newx * params.metersPerPixel / metersPerLng;
                var lat = params.lat - newy * params.metersPerPixel / metersPerLat;
                return [lng, lat];
            }
        };
    }
    Mapper.InverseMercator = InverseMercator;
    function ReadTsv(text, formats) {
        var matrix = text.trim().split('\n').map(function (line) { return line.split('\t'); });
        var data = [];
        for (var i = 1; i < matrix.length; i++) {
            var obj = {};
            for (var k = 0; k < matrix[i].length; k++) {
                var key = matrix[0][k];
                var val = matrix[i][k];
                if (val.length == 0) {
                    obj[key] = null;
                }
                else if (formats[k] == 'f') {
                    obj[key] = parseFloat(val);
                }
                else {
                    obj[key] = val;
                }
            }
            data.push(obj);
        }
        return data;
    }
    Mapper.ReadTsv = ReadTsv;
    // these modify the Topology in place, which is not great
    function ExtractTopojson(topo) {
        for (var i = 0; i < topo.arcs.length; i++) {
            var arc = topo.arcs[i];
            var accum = [0, 0];
            for (var k = 0; k < arc.length; k++) {
                var p = arc[k];
                accum[0] += p[0];
                accum[1] += p[1];
                p[0] = accum[0] * topo.transform.scale[0] + topo.transform.translate[0];
                p[1] = accum[1] * topo.transform.scale[1] + topo.transform.translate[1];
            }
        }
    }
    Mapper.ExtractTopojson = ExtractTopojson;
    function ProjectTopojson(projection, topo) {
        for (var i = 0; i < topo.arcs.length; i++) {
            var arc = topo.arcs[i];
            for (var k = 0; k < arc.length; k++) {
                arc[k] = projection(arc[k]);
            }
        }
        return topo;
    }
    Mapper.ProjectTopojson = ProjectTopojson;
    // these use ArrayBuffers - supports arcs only - no support for polygons
    function ProjectPointPack(projection, a, b) {
        // these packs are just an array of points - [lng,lat][]
        var n = a.byteLength / 16;
        var k = 0;
        for (var i = 0; i < n; i++) {
            var lng = a.getFloat64(k + 0);
            var lat = a.getFloat64(k + 8);
            var _a = projection([lng, lat]), x = _a[0], y = _a[1];
            b.setFloat64(k + 0, x);
            b.setFloat64(k + 8, y);
            k += 16;
        }
    }
    Mapper.ProjectPointPack = ProjectPointPack;
    function ProjectPackToPack(projection, a, b) {
        // nArcs: uint32
        //  nPoints: uint16 - repeat nArcs times
        //   lng: float64 - repeat lng,lat nPoints times
        //   lat: float64
        var k = 0;
        var nArcs = a.getUint32(k);
        b.setUint32(k, nArcs);
        k += 4;
        for (var i = 0; i < nArcs; i++) {
            var nPoints = a.getUint16(k);
            b.setUint16(k, nPoints);
            k += 2;
            for (var j = 0; j < nPoints; j++) {
                var lng = a.getFloat64(k + 0);
                var lat = a.getFloat64(k + 8);
                var _a = projection([lng, lat]), x = _a[0], y = _a[1];
                b.setFloat64(k + 0, x);
                b.setFloat64(k + 8, y);
                k += 16;
            }
        }
    }
    Mapper.ProjectPackToPack = ProjectPackToPack;
    function ExtractTopojsonToPack(topo) {
        var nArcs = topo.arcs.length;
        var nPoints = topo.arcs.map(function (x) { return x.length; }).reduce(function (a, b) { return a + b; });
        var n = 4 + nArcs * 2 + nPoints * 16;
        var buffer = new ArrayBuffer(n);
        var view = new DataView(buffer);
        var k = 0;
        view.setUint32(k, nArcs);
        k += 4;
        for (var i = 0; i < topo.arcs.length; i++) {
            var arc = topo.arcs[i];
            view.setUint16(k, arc.length);
            k += 2;
            var accum = [0, 0];
            for (var j = 0; j < arc.length; j++) {
                var p = arc[j];
                accum[0] += p[0];
                accum[1] += p[1];
                var lng = accum[0] * topo.transform.scale[0] + topo.transform.translate[0];
                var lat = accum[1] * topo.transform.scale[1] + topo.transform.translate[1];
                view.setFloat64(k, lng);
                k += 8;
                view.setFloat64(k, lat);
                k += 8;
            }
        }
        return view;
    }
    Mapper.ExtractTopojsonToPack = ExtractTopojsonToPack;
    function GetArcIndexesOfObject(topo, key) {
        if (key === undefined) {
            for (var k in topo.objects) {
                key = k;
            }
        } // take the last key by default
        var object = topo.objects[key];
        var arcIndexes = new Uint8Array(topo.arcs.length);
        function GetArcIndexesOfGeometry(geom) {
            // MultiPolygon -> Polygon -> Edge -> Arc -> Point
            if (geom.type == 'MultiPolygon') {
                for (var i = 0; i < geom.arcs.length; i++) {
                    var polygon = geom.arcs[i];
                    GetArcIndexesOfPolygon(polygon);
                }
            }
            else if (geom.type == 'Polygon') {
                var polygon = geom.arcs;
                GetArcIndexesOfPolygon(polygon);
            }
            else if (geom.type == 'LineString') {
                GetArcIndexesOfEdge(geom.arcs);
            }
            else {
                throw new Error(geom.type);
            }
        }
        function GetArcIndexesOfPolygon(polygon) {
            for (var i = 0; i < polygon.length; i++) {
                var edge = polygon[i];
                GetArcIndexesOfEdge(edge);
            }
        }
        function GetArcIndexesOfEdge(edge) {
            for (var i = 0; i < edge.length; i++) {
                var arcIndex = edge[i];
                if (arcIndex < 0) {
                    arcIndex = -arcIndex - 1;
                }
                arcIndexes[arcIndex] = 1;
            }
        }
        if (object.type == 'GeometryCollection') {
            for (var i = 0; i < object.geometries.length; i++) {
                var geom = object.geometries[i];
                GetArcIndexesOfGeometry(geom);
            }
        }
        else if (object.type == 'Geometry') {
            GetArcIndexesOfGeometry(geom);
        }
        else {
            throw new Error();
        }
        return arcIndexes;
    }
    function AutoProjectTopo(topo) {
        return null;
    }
    Mapper.AutoProjectTopo = AutoProjectTopo;
    function DrawMesh(ctx, topo) {
        for (var i = 0; i < topo.arcs.length; i++) {
            var arc = topo.arcs[i];
            for (var j = 0; j < arc.length; j++) {
                var point = arc[j];
                if (point === null) {
                    continue;
                } // geoAlbersUsa returns null for some coordinates
                if (j == 0) {
                    ctx.moveTo(point[0], point[1]);
                }
                else {
                    ctx.lineTo(point[0], point[1]);
                }
            }
        }
    }
    Mapper.DrawMesh = DrawMesh;
    function DrawMeshPack(ctx, view) {
        var k = 0;
        var nArcs = view.getUint32(k);
        k += 4;
        for (var i = 0; i < nArcs; i++) {
            var nPoints = view.getUint16(k);
            k += 2;
            for (var j = 0; j < nPoints; j++) {
                var x = view.getFloat64(k);
                k += 8;
                var y = view.getFloat64(k);
                k += 8;
                if (j == 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, y);
                }
            }
        }
    }
    Mapper.DrawMeshPack = DrawMeshPack;
    function DrawTopojson(ctx, topo, key) {
        if (key === undefined) {
            for (var k in topo.objects) {
                key = k;
            }
        } // take the last key by default
        var object = topo.objects[key];
        if (object.type == 'GeometryCollection') {
            for (var i = 0; i < object.geometries.length; i++) {
                var geom = object.geometries[i];
                DrawGeometry(ctx, topo, geom);
            }
        }
        else {
            DrawGeometry(ctx, topo, geom);
        }
    }
    Mapper.DrawTopojson = DrawTopojson;
    function DrawGeometry(ctx, topo, geom) {
        // MultiPolygon -> Polygon -> Edge -> Arc -> Point
        if (geom.type == 'MultiPolygon') {
            for (var i = 0; i < geom.arcs.length; i++) {
                var polygon = geom.arcs[i];
                DrawPolygon(ctx, topo, polygon);
            }
        }
        else if (geom.type == 'Polygon') {
            var polygon = geom.arcs;
            DrawPolygon(ctx, topo, polygon);
        }
        else if (geom.type == 'LineString') {
            DrawEdge(ctx, topo, geom.arcs);
        }
        else {
            throw new Error(geom.type);
        }
    }
    function DrawPolygon(ctx, topo, polygon) {
        for (var i = 0; i < polygon.length; i++) {
            var edge = polygon[i];
            DrawEdge(ctx, topo, edge);
        }
    }
    function DrawEdge(ctx, topo, edge) {
        var start = null;
        for (var i = 0; i < edge.length; i++) {
            var arcIndex = edge[i];
            var reversed = false;
            if (arcIndex < 0) {
                reversed = true;
                arcIndex = -arcIndex - 1;
            }
            var arc = topo.arcs[arcIndex];
            for (var j = 0; j < arc.length; j++) {
                var point = (reversed ? arc[arc.length - j - 1] : arc[j]);
                //if (j == 0 || j == arc.length - 1) { console.log(arcIndex + ' - ' + JSON.stringify(point)); }
                if (i == 0 && j == 0) {
                    start = point;
                    ctx.moveTo(point[0], point[1]);
                }
                else {
                    ctx.lineTo(point[0], point[1]);
                }
            }
        }
        ctx.lineTo(start[0], start[1]);
    }
    function LabelArcs(ctx, topo) {
        for (var i = 0; i < topo.arcs.length; i++) {
            var x = 0;
            var y = 0;
            var arc = topo.arcs[i];
            for (var j = 0; j < arc.length; j++) {
                var point = arc[j];
                x += point[0];
                y += point[1];
            }
            ctx.fillText(i.toString(), x / arc.length, y / arc.length);
        }
    }
    function LabelGeoms(ctx, topo, key) {
        if (key === undefined) {
            for (var k in topo.objects) {
                key = k;
            }
        } // take the last key by default
        var object = topo.objects[key];
        if (object.type == 'GeometryCollection') {
            for (var i = 0; i < object.geometries.length; i++) {
                var geom = object.geometries[i];
                if (geom.type == 'MultiPolygon') {
                    for (var j = 0; j < geom.arcs.length; j++) {
                        var polygon = geom.arcs[j];
                        LabelPolygon(ctx, topo, polygon, i.toString());
                    }
                }
                else if (geom.type == 'Polygon') {
                    var polygon = geom.arcs;
                    LabelPolygon(ctx, topo, polygon, i.toString());
                }
                else {
                    throw new Error();
                }
            }
        }
        else {
            throw new Error();
        }
    }
    function LabelPolygon(ctx, topo, polygon, label) {
        var x = 0;
        var y = 0;
        var n = 0;
        for (var i = 0; i < polygon.length; i++) {
            var edge = polygon[i];
            for (var j = 0; j < edge.length; j++) {
                var arcIndex = edge[j];
                if (arcIndex < 0) {
                    arcIndex = -arcIndex - 1;
                }
                var arc = topo.arcs[arcIndex];
                for (var k = 0; k < arc.length; k++) {
                    var point = arc[k];
                    x += point[0];
                    y += point[1];
                }
                n += arc.length;
            }
        }
        //console.log(label + ' ' + x / n + ' ' + y / n);
        ctx.fillText(label, x / n, y / n);
    }
    function ExtractPathstring(topo, projection) {
        ProjectTopojson(projection, topo);
        var stateArcMask = GetArcIndexesOfObject(topo, 'states');
        var ls = [];
        for (var i = 0; i < topo.arcs.length; i++) {
            if (stateArcMask[i] == 0) {
                continue;
            }
            var arc = topo.arcs[i];
            for (var j = 0; j < arc.length; j++) {
                //var point = (reversed ? arc[arc.length - j - 1] : arc[j]);
                var point = arc[j];
                if (point == null) {
                    continue;
                }
                if (j == 0) {
                    ls.push('M');
                    ls.push(point[0].toFixed(1));
                    ls.push(point[1].toFixed(1));
                }
                else {
                    ls.push('L');
                    ls.push(point[0].toFixed(1));
                    ls.push(point[1].toFixed(1));
                }
            }
        }
        var path = ls.join(' ');
        return path;
    }
})(Mapper || (Mapper = {}));
exports.Mapper = Mapper;
