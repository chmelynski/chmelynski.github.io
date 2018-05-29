/*

quadtree formation options:
1. calculate the midpoint of each street segment and put them into a quadtree
2. put the points into a quadtree and then construct a point->segment mapping
 2a. or, to take advantage of street segment adjacency, construct a point->street mapping, 1 point -> 2-5 streets, generally
     then you search that street for the point (or store the index in the point->street mapping, and expand until you find all segments in the viewbox)
     but then we have to do that for each point found through the quadtree, and mark the ones we get through adjacency
     keep in mind the corner case where the street exits the viewbox and then re-enters - don't count the street out entirely once you finish the adjacency search

*/
/*

geopack file format

v1 - where shared points are common - have an array of points and then lines index into that shared array
nPoints: uint32
points: []
 lat: uint16 - topojson grid of 65536 points
 lng: uint16
nLines: uint32
lines: []
 nPoints: uint8 - limit of 256 segments per line
 points: uint32[] - index into points
labels: deflated array of null-terminated strings, parallel with the lines array - build an index of starts and lengths after inflating

v2 - where shared points are uncommon - points are inlined
minLat: float64
maxLat: float64
minLng: float64
maxLng: float64
xScale: float64
yScale: float64
xTrans: float64
yTrans: float64
nLines: uint32
lines: []
 nPoints: uint8 - limit of 256 segments per line
 points: []
  lat: uint16 - topojson grid of 65536 points
  lng: uint16
labels: deflated array of null-terminated strings, parallel with the lines array - build an index of starts and lengths after inflating

*/
var Geopack;
(function (Geopack) {
    function GeopackOsm(osm, bounds) {
        var quantization = 256 * 256;
        var nLines = 0;
        var nPoints = 0;
        for (var key in osm.ways) {
            nLines++;
            nPoints += osm.ways[key].nodes.length;
        }
        var n = 32 + 32 + 4 + nLines + nPoints * 4;
        var buffer = new ArrayBuffer(n);
        var view = new DataView(buffer);
        // note that this is a frequently a different, more expansive box (all of nyc) than osm.bounds (e.g., just brooklyn)
        var latRange = bounds.maxLat - bounds.minLat;
        var lngRange = bounds.maxLng - bounds.minLng;
        var xScale = lngRange / quantization;
        var yScale = latRange / quantization;
        var xTrans = bounds.minLng;
        var yTrans = bounds.minLat;
        var k = 0;
        view.setFloat64(k, osm.bounds.minLat);
        k += 8;
        view.setFloat64(k, osm.bounds.maxLat);
        k += 8;
        view.setFloat64(k, osm.bounds.minLng);
        k += 8;
        view.setFloat64(k, osm.bounds.maxLng);
        k += 8;
        view.setFloat64(k, xScale);
        k += 8;
        view.setFloat64(k, yScale);
        k += 8;
        view.setFloat64(k, xTrans);
        k += 8;
        view.setFloat64(k, yTrans);
        k += 8;
        view.setUint32(k, nLines);
        k += 4;
        for (var key in osm.ways) {
            var way = osm.ways[key];
            if (way.nodes.length >= 256) {
                continue;
            }
            view.setUint8(k, way.nodes.length);
            k += 1;
            for (var j = 0; j < way.nodes.length; j++) {
                var node = way.nodes[j];
                var x = (node.lng - bounds.minLng) / lngRange * quantization;
                var y = (node.lat - bounds.minLat) / latRange * quantization;
                view.setUint16(k, x);
                k += 2;
                view.setUint16(k, y);
                k += 2;
            }
        }
        return buffer;
    }
    Geopack.GeopackOsm = GeopackOsm;
    function UnpackToOsm(buffer) { return null; }
    function DrawGeopack(ctx, mercator, buffer) {
        var metersPerLat = 111321;
        var metersPerLng = 111321 * Math.cos(mercator.lat / 180 * Math.PI);
        function ProjX(tx) {
            var lng = tx * xScale + xTrans;
            var x = (lng - mercator.lng) * metersPerLng / mercator.metersPerPixel;
            return x;
        }
        function ProjY(ty) {
            var lat = ty * yScale + yTrans;
            var y = (mercator.lat - lat) * metersPerLat / mercator.metersPerPixel;
            return y;
        }
        var view = new DataView(buffer);
        var k = 32; // skip over bounding box
        var xScale = view.getFloat64(k);
        k += 8;
        var yScale = view.getFloat64(k);
        k += 8;
        var xTrans = view.getFloat64(k);
        k += 8;
        var yTrans = view.getFloat64(k);
        k += 8;
        var nLines = view.getUint32(k);
        k += 4;
        for (var i = 0; i < nLines; i++) {
            var nPoints = view.getUint8(k);
            k += 1;
            for (var j = 0; j < nPoints; j++) {
                var x = ProjX(view.getUint16(k));
                k += 2;
                var y = ProjY(view.getUint16(k));
                k += 2;
                if (j == 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, y);
                }
            }
        }
    }
    Geopack.DrawGeopack = DrawGeopack;
})(Geopack || (Geopack = {}));
