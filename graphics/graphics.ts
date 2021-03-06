
// graphics-es5.htm loads graphics.js
// graphics.htm loads graphics.mjs

// there is a whole lot of convention involved here, including:
// 1. object-oriented vertices/polygons or arrays of floats/integers?
// 2. how do we represent the scene graph and transformations - i use Bones, but Daz works differently
// 3. the device can be a Uint8Array bitmap, a CanvasRenderingContext2D, a Canvas, a native SVG, etc. etc.

//var exports = {}; // when compiled with tsc --target es5 --module none graphics.ts - this creates exports.Foo = Foo lines, which works in node, but fails in browser because exports is not defined.  so we need to add a var exports = {} line for it to work in the browser, but that line breaks it for node

namespace Graphics { // keep this when compiling to a normal .js (tsc --target es5 --module none graphics.ts), remove when compiling to a module (tsc --target es6)

interface ScanLineData {
    normala?: Vector3;
    normalb?: Vector3;
    normalc?: Vector3;
    normald?: Vector3;
    ua?: number;
    ub?: number;
    uc?: number;
    ud?: number;
    va?: number;
    vb?: number;
    vc?: number;
    vd?: number;
    currentY?: number;
}
interface Box {
    lf: number;
    rt: number;
    tp: number;
    bt: number;
    wd: number;
    hg: number;
    wr: number;
    hr: number;
    cx: number;
    cy: number;
}

function DefaultBox(ctx: CanvasRenderingContext2D): Box {
    return MakeBox(0, 0, ctx.canvas.width, ctx.canvas.height);
}
function MakeBox(left: number, top: number, width: number, height: number): Box {
    return {
        lf: left,
        tp: top,
        wd: width,
        hg: height,
        wr: width / 2,
        hr: height / 2,
        rt: left + width,
        bt: top + height,
        cx: left + width / 2,
        cy: top + height / 2
    };
}

function ParseCoordinates(str: string): Vector3 {
    var c = str.substr(1, str.length - 2).split(',');
    return new Vector3(parseFloat(c[0]), parseFloat(c[1]), parseFloat(c[2]));
}
function CoordinatesToString(v: Vector3): string {
    return '(' + v.x.toString() + ',' + v.y.toString() + ',' + v.z.toString() + ')';
}
function MakeVector3(list: number[]): Vector3 {
    return new Vector3(list[0], list[1], list[2]);
}
function InterpolateVector(v1: Vector3, v2: Vector3, gradient: number): Vector3 {
    return v1.add(v2.subtract(v1).multiplyScalar(gradient));
}

function Interpolate(min: number, max: number, gradient: number): number {
    return min + (max - min) * Clamp(gradient, 0, 1);
}
function Clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

/*
const polyfaces = { 3 : [[0,1,2]] , 4 : [[0,1,2],[0,2,3]] , 5 : [] };
// backBuffer: ImageData; // (or Uint8ClampedArray?)
// depthBuffer: Float32Array; // new Float32Array(this.wd * this.hg)
function Render(ctx: CanvasRenderingContext2D, box: Box, options: RenderOptions): void {
    
    ctx.clearRect(box.lf, box.tp, box.wd, box.hg);
    
    if (this.backBuffer == null)
    {
        this.backBuffer = this.ctx.getImageData(box.lf, box.tp, box.wd, box.hg); // canvas
    }
    
    for (var i = 0; i < this.depthBuffer.length; i++) { this.depthBuffer[i] = 10000000; }
    
    const viewMatrix = this.camera.viewMatrix();
    const projectionMatrix = this.camera.projectionMatrix();
    
    // DAZ stores the nodes in topological sort order and just looks at the parent urls
    // and DAZ doesn't chain node-level transformations
    // so our forest of bones will have to be converted on import/export
    
    for (const root of this.scene.nodes)
    {
        //this.scene.root = root; // unclear if we need scene.root to be an instance variable
        //this.scene.root.Multiply(Matrix.Identity());
        
        root.Multiply(Matrix.Identity());
        const bones = root.Leaves();
        
        for (const bone of bones)
        {
            var geos = [ bone.geometry ]; // var geos = bone.geometries;
            
            for (const mesh of geos)
            {
                var worldMatrix = bone.matrix;
                bone.worldView = worldMatrix.multiply(viewMatrix);
                bone.transformMatrix = bone.worldView.multiply(projectionMatrix);
                
                for (const vertex of mesh.vertices)
                {
                    vertex.projection = Vector3.TransformCoordinates(vertex.coordinates, bone.transformMatrix);
                    //vertex.projectedWorldCoordinates = Vector3.TransformCoordinates(vertex.coordinates, bone.matrix);
                    //vertex.projectedNormal = Vector3.TransformCoordinates(vertex.normal, bone.matrix);
                }
                
                // the world matrix is passed to Project because we need to know world coordinates (and world normal) for lighting
                
                for (const vertex of mesh.vertices)
                {
                    vertex.cameraVector = this.camera.position.subtract(vertex.worldCoordinates);
                    
                    for (const light of this.scene.lights)
                    {
                        vertex.lightVectors.push(light.position.subtract(vertex.worldCoordinates));
                    }
                }
                
                mesh.polygons.forEach((poly, j) => { this.DrawShadedPolygon(bone, poly, j); });
                
                if (options.labelVertexes) { this.LabelVertexes(mesh); }
            }
        }
    }
    
    this.ctx.putImageData(this.backBuffer, this.lf, this.tp);
}
function DrawShadedPolygon(node: Bone, poly: Polygon, polyIndex: number): void {
    
    var mesh = node.geometry;
    var material = node.materials[poly.materialGroup];
    
    var relevantPolyfaces = polyfaces[poly.vertices.length];
    
    for (var k = 0; k < relevantPolyfaces.length; k++)
    {
        var a = relevantPolyfaces[k][0];
        var b = relevantPolyfaces[k][1];
        var c = relevantPolyfaces[k][2];
        
        // if a polygon references vertex objects
        var vertexA = poly.vertices[a];
        var vertexB = poly.vertices[b];
        var vertexC = poly.vertices[c];
        
        //// if a polygon is just a list of vertex indices
        //var vertexIndexA = poly[a+2];
        //var vertexIndexB = poly[b+2];
        //var vertexIndexC = poly[c+2];
        
        var normals = [];
        
        if (mesh.polyNormals) // flat meshes, like planes and cubes
        {
            var transformedNormal = Vector3.TransformNormal(mesh.polyNormals[polyIndex], node.matrix);
            normals.push(transformedNormal);
            normals.push(transformedNormal);
            normals.push(transformedNormal);
            // if (transformedNormal.z >= 0) { continue; }
        }
        else if (mesh.vertexNormals) // curved meshes, like cylinders and spheres
        {
            normals.push(vertexA.projectedNormal);
            normals.push(vertexB.projectedNormal);
            normals.push(vertexC.projectedNormal);
        }
        
        var ToXY = function(l) { return new Vector2(l[0], l[1]); };
        vertexA.textureCoordinates = ToXY(mesh.uvSet.uvs[vertexA.index]);
        vertexB.textureCoordinates = ToXY(mesh.uvSet.uvs[vertexB.index]);
        vertexC.textureCoordinates = ToXY(mesh.uvSet.uvs[vertexC.index]);
        
        if (mesh.uvSet.pviDict[polyIndex])
        {
            for (var l = 0; l < mesh.uvSet.pviDict[polyIndex].length; l++)
            {
                var vi = mesh.uvSet.pviDict[polyIndex][l];
                if (vertexA.index == vi[0]) { vertexA.textureCoordinates = ToXY(mesh.uvSet.uvs[vi[1]]); }
                if (vertexB.index == vi[0]) { vertexB.textureCoordinates = ToXY(mesh.uvSet.uvs[vi[1]]); }
                if (vertexC.index == vi[0]) { vertexC.textureCoordinates = ToXY(mesh.uvSet.uvs[vi[1]]); }
            }
        }
        
        var color = 1.0;
        this.DrawTriangle(vertexA, vertexB, vertexC, new Color4(color, color, color, 1), material, normals);
    }
}
function DrawTriangle(v1: Vertex, v2: Vertex, v3: Vertex, color: Color4, material, normals): void {
    
    // sort the vertices by y coordinate, ascending
    if (v1.coordinates.y > v2.coordinates.y) { var temp = v2; v2 = v1; v1 = temp; }
    if (v2.coordinates.y > v3.coordinates.y) { var temp = v2; v2 = v3; v3 = temp; }
    if (v1.coordinates.y > v2.coordinates.y) { var temp = v2; v2 = v1; v1 = temp; }
    
    var p1 = v1.coordinates;
    var p2 = v2.coordinates;
    var p3 = v3.coordinates;
    
    //var lightPos = new Vector3(0, 10, 10);
    //var lightPos = this.scene.lights[0].position;
    
    // for flat meshes, like planes or cubes, we want to use the polygon normal for all vertices
    // for curved meshes, like cylinders or spheres, we want to use the vertex normal
    
    var ComputeNDotL = function(vertex, normal, lightPosition) {
        var lightDirection = lightPosition.subtract(vertex);
        normal.normalize();
        lightDirection.normalize();
        
        var finalVector = Math.abs(Vector3.Dot(normal, lightDirection)); // both sides - mostly for planes
        //var finalVector = Math.max(0, Vector3.Dot(normal, lightDirection)); // one side - for meshes with an interior and exterior
        
        return finalVector;
    };
    
    // why isn't this computed in DrawShadedPolygon?
    //var nl1 = ComputeNDotL(v1.worldCoordinates, normals[0], lightPos);
    //var nl2 = ComputeNDotL(v2.worldCoordinates, normals[1], lightPos);
    //var nl3 = ComputeNDotL(v3.worldCoordinates, normals[2], lightPos);
    var normal1 = normals[0];
    var normal2 = normals[1];
    var normal3 = normals[2];
    
    var data: any = {};
    
    var dP1P2;
    var dP1P3;
    
    // what happens if P1/P2 or P1/P3 are the same point?  then the slope is undefined
    // also, what happens if P1, P2, and P3 are collinear?
    // in both of these degenerate cases, the polygon collapses to a line
    // and if P1, P2, and P3 are all the same point, the polygon collapses to a point
    
    // calculate the inverse slope of P1/P2 and P1/P3
    if (p2.y - p1.y > 0) { dP1P2 = (p2.x - p1.x) / (p2.y - p1.y); } else if (p2.x < p1.x) { dP1P2 = -Infinity; } else if (p2.x > p1.x) { dP1P2 = +Infinity; } else { dP1P2 = 0; }
    if (p3.y - p1.y > 0) { dP1P3 = (p3.x - p1.x) / (p3.y - p1.y); } else { dP1P3 = 0; }
    
    if (dP1P2 > dP1P3)
    {
        for (var y = p1.y >> 0; y <= p3.y >> 0; y++)
        {
            data.currentY = y;
            
            if (y < p2.y)
            {
                //data.ndotla = nl1;
                //data.ndotlb = nl3;
                //data.ndotlc = nl1;
                //data.ndotld = nl2;
                data.normala = normal1;
                data.normalb = normal3;
                data.normalc = normal1;
                data.normald = normal2;
                
                data.ua = v1.textureCoordinates.x;
                data.ub = v3.textureCoordinates.x;
                data.uc = v1.textureCoordinates.x;
                data.ud = v2.textureCoordinates.x;
                
                data.va = v1.textureCoordinates.y;
                data.vb = v3.textureCoordinates.y;
                data.vc = v1.textureCoordinates.y;
                data.vd = v2.textureCoordinates.y;
                
                this.ProcessScanLine(data, v1, v3, v1, v2, color, material);
            }
            else
            {
                //data.ndotla = nl1;
                //data.ndotlb = nl3;
                //data.ndotlc = nl2;
                //data.ndotld = nl3;
                data.normala = normal1;
                data.normalb = normal3;
                data.normalc = normal2;
                data.normald = normal3;
                
                data.ua = v1.textureCoordinates.x;
                data.ub = v3.textureCoordinates.x;
                data.uc = v2.textureCoordinates.x;
                data.ud = v3.textureCoordinates.x;
                
                data.va = v1.textureCoordinates.y;
                data.vb = v3.textureCoordinates.y;
                data.vc = v2.textureCoordinates.y;
                data.vd = v3.textureCoordinates.y;
                
                this.ProcessScanLine(data, v1, v3, v2, v3, color, material);
            }
        }
    }
    else
    {
        for (var y = p1.y >> 0; y <= p3.y >> 0; y++)
        {
            data.currentY = y;
            
            if (y < p2.y)
            {
                //data.ndotla = nl1;
                //data.ndotlb = nl2;
                //data.ndotlc = nl1;
                //data.ndotld = nl3;
                data.normala = normal1;
                data.normalb = normal2;
                data.normalc = normal1;
                data.normald = normal3;
                
                data.ua = v1.textureCoordinates.x;
                data.ub = v2.textureCoordinates.x;
                data.uc = v1.textureCoordinates.x;
                data.ud = v3.textureCoordinates.x;
                
                data.va = v1.textureCoordinates.y;
                data.vb = v2.textureCoordinates.y;
                data.vc = v1.textureCoordinates.y;
                data.vd = v3.textureCoordinates.y;
                
                this.ProcessScanLine(data, v1, v2, v1, v3, color, material);
            }
            else
            {
                //data.ndotla = nl2;
                //data.ndotlb = nl3;
                //data.ndotlc = nl1;
                //data.ndotld = nl3;
                data.normala = normal2;
                data.normalb = normal3;
                data.normalc = normal1;
                data.normald = normal3;
                
                data.ua = v2.textureCoordinates.x;
                data.ub = v3.textureCoordinates.x;
                data.uc = v1.textureCoordinates.x;
                data.ud = v3.textureCoordinates.x;
                
                data.va = v2.textureCoordinates.y;
                data.vb = v3.textureCoordinates.y;
                data.vc = v1.textureCoordinates.y;
                data.vd = v3.textureCoordinates.y;
                
                this.ProcessScanLine(data, v2, v3, v1, v3, color, material);
            }
        }
    }
}
function ProcessScanLine(data: ScanLineData, va: Vertex, vb: Vertex, vc: Vertex, vd: Vertex, color: Color4, material): void {
    
    var pa = va.coordinates;
    var pb = vb.coordinates;
    var pc = vc.coordinates;
    var pd = vd.coordinates;
    
    //console.log(data.currentY + ' ' + pa.x + ' ' + pb.x + ' ' + pc.x + ' ' + pd.x);
    
    var gradient1 = pa.y != pb.y ? (data.currentY - pa.y) / (pb.y - pa.y) : 1;
    var gradient2 = pc.y != pd.y ? (data.currentY - pc.y) / (pd.y - pc.y) : 1;
    
    var sx = Interpolate(pa.x, pb.x, gradient1) >> 0;
    var ex = Interpolate(pc.x, pd.x, gradient2) >> 0;
    var z1 = Interpolate(pa.z, pb.z, gradient1);
    var z2 = Interpolate(pc.z, pd.z, gradient2);
    //var snl = Interpolate(data.ndotla, data.ndotlb, gradient1);
    //var enl = Interpolate(data.ndotlc, data.ndotld, gradient2);
    var snl = InterpolateVector(data.normala, data.normalb, gradient1);
    var enl = InterpolateVector(data.normalc, data.normald, gradient2);
    var su = Interpolate(data.ua, data.ub, gradient1);
    var eu = Interpolate(data.uc, data.ud, gradient2);
    var sv = Interpolate(data.va, data.vb, gradient1);
    var ev = Interpolate(data.vc, data.vd, gradient2);
    
    //console.log(data.currentY + ' ' + sx + ' ' + ex);
    
    //if (ex < sx) { var temp = ex; ex = sx; sx = temp; }
    
    for (var x = sx; x < ex; x++)
    {
        var y = data.currentY;
        
        if (x >= 0 && y >= 0 && x < this.wd && y < this.hg)
        {
            var gradient = (x - sx) / (ex - sx);
            
            var u = Interpolate(su, eu, gradient);
            var v = Interpolate(sv, ev, gradient);
            
            var z = Interpolate(z1, z2, gradient);
            
            //var ndotl = Interpolate(snl, enl, gradient);
            var normal = InterpolateVector(snl, enl, gradient);
            
            this.ShadePoint(x, y, z, u, v, normal, material);
        }
    }
}
function ShadePoint(x: number, y: number, z: number, u: number, v: number, normal: Vector3, material: Material): void {
    
    var index = ((x >> 0) + (y >> 0) * this.wd);
    var index4 = index * 4;
    if (this.depthBuffer[index] < z) { return; }
    
    var diffuseColor;
    
    if (material)
    {
        //this.diffuse    = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
        //this.specular   = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
        //this.ambient    = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
        
        //this.reflection = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null };
        //this.refraction = { color : {r:0,g:0,b:0} , colorMap : null , strength : 1 , strengthMap : null , index : 0 };
        
        //this.glossiness   = { strength : 1 , strengthMap : null };
        //this.transparency = { strength : 1 , strengthMap : null };
        
        //this.bump         = { strength : 0 , strengthMap : null , min : -0.01 , max : +0.01 };
        //this.displacement = { strength : 0 , strengthMap : null , min : -0.10 , max : +0.10 };
        //this.normalMap = null;
        
        //this.uv = { uvset : '#default' , hOffset : 0 , vOffset : 0 , hTiles : 1 , vTiles : 1 };
        
        // this need only be done once per Bone and should not be in the ShadePoint function
        //var diffuseColor = material.diffuse.color;
        
        
        var diffuseMap = this.scene.textures[material.diffuse.colorMap.substr(1)];
        if (!diffuseMap) { console.log(material.diffuse.colorMap.substr(1)); }
        
        if (material.bump)
        {
            var bumpMap = this.scene.textures[material.bump.strengthMap.substr(1)];
            var uDiff = bumpMap.map(u+1, v).r - bumpMap.map(u-1, v).r;
            var vDiff = bumpMap.map(u, v+1).r - bumpMap.map(u, v-1).r;
            normal = normal; // calculate the new normal
        }
        
        //var specularColor = material.specular.color;
        //var specularStrength = material.specular.strength;
        //var ambientStrength = material.ambient.strength;
        //var transparencyMap = this.scene.textures[material.diffuse.strengthMap.substr(1)];
        
        diffuseColor = diffuseMap.map(u, v);
        
        //if (transparencyMap)
        //{
        //  // this interacts with the depthbuffer - it's not as easy as setting or not these days
        //  var transparencyColor = transparencyMap.map(u, v);
        //}
    }
    else
    {
        diffuseColor = new Color4(1, 1, 1, 1);
    }
    
    var ComputeNDotL = function(vertex, normal, lightPosition) {
        var lightDirection = lightPosition.subtract(vertex);
        normal.normalize();
        lightDirection.normalize();
        
        var finalVector = Math.abs(Vector3.Dot(normal, lightDirection)); // both sides - mostly for planes
        //var finalVector = Math.max(0, Vector3.Dot(normal, lightDirection)); // one side - for meshes with an interior and exterior
        
        return finalVector;
    };
    
    var ndotls = [];
    
    // lightVector[], normalVector, and cameraVector all need to be determined for each vertex and then interpolated
    // where do we get these from?
    var cameraVector: Vector3 = null;
    var lightVectors: Vector3[] = null;
    
    cameraVector.normalize();
    for (var i = 0; i < lightVectors.length; i++)
    {
        var lightVector = lightVectors[i];
        var light = this.scene.lights[i];
        
        lightVector.normalize();
        
        var lightReflectionVector = null; // how does one reflect a vector over another vector?
        
        var cameraReflectionAngle = Math.acos(Vector3.Dot(cameraVector, lightReflectionVector));
        
        if (cameraReflectionAngle < material.glossiness.strength)
        {
            // specular highlight
        }
        
        // deal with color and intensity and distance
        
        var normalDotLight = Vector3.Dot(normal, lightVector);
    }
    
    var vertex: Vertex; // where does this come from?
    
    this.scene.lights.forEach(function(light) {
        ndotls.push(ComputeNDotL(vertex, normal, light.position));
    });
    
    var ndotl = ndotls[0]; // need to figure out how to combine light colors
    
    var lightColor = new Color4(1, 1, 1, 1);
    var finalColor = new Color4(lightColor.r * ndotl * diffuseColor.r, lightColor.g * ndotl * diffuseColor.g, lightColor.b * ndotl * diffuseColor.b, 1); // light
    //var finalColor = new Color4(diffuseColor.r, diffuseColor.g, diffuseColor.b, 1); // no light
    
    finalColor.r = Math.floor(finalColor.r * 255);
    finalColor.g = Math.floor(finalColor.g * 255);
    finalColor.b = Math.floor(finalColor.b * 255);
    finalColor.a = Math.floor(finalColor.a * 255);
    
    //console.log(x + '\t' + y + '\t' + z + '\t' + u + '\t' + v + '\t' + ndotl + '\t' + finalColor);
    //if (x % 10 == 0 && y % 10 == 0) { console.log(x + '\t' + y + '\t' + finalColor); }
    
    this.depthBuffer[index] = z;
    
    //this.ctx.setPixel(x, y, finalColor); // setPixel only exists on Bitmap
    //this.backBuffer[index4 + 0] = finalColor.r * 255;
    //this.backBuffer[index4 + 1] = finalColor.g * 255;
    //this.backBuffer[index4 + 2] = finalColor.b * 255;
    //this.backBuffer[index4 + 3] = finalColor.a * 255;
}
*/

class Color4 {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r: number, g: number, b: number, a?: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    toString(): string {
        return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
    }
}
class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    toString(): string {
        return "{X: " + this.x + " Y:" + this.y + "}";
    }
    add(that: Vector2): Vector2 {
        return new Vector2(this.x + that.x, this.y + that.y);
    }
    subtract(that: Vector2): Vector2 {
        return new Vector2(this.x - that.x, this.y - that.y);
    }
    negate(): Vector2 {
        return new Vector2(-this.x, -this.y);
    }
    scale(scale: number): Vector2 {
        return new Vector2(this.x * scale, this.y * scale);
    }
    equals(that: Vector2): boolean {
        return this.x === that.x && this.y === that.y;
    }
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    lengthSquared(): number {
        return (this.x * this.x + this.y * this.y);
    }
    normalize(): number {
        var len = this.length();
        if (len === 0) { return; }
        var num = 1.0 / len;
        this.x *= num;
        this.y *= num;
    }
    static Zero(): Vector2 {
        return new Vector2(0, 0);
    }
    static Copy(source: Vector2): Vector2 {
        return new Vector2(source.x, source.y);
    }
    static Normalize(vector: Vector2): Vector2 {
        var newVector = Vector2.Copy(vector);
        newVector.normalize();
        return newVector;
    }
    static Minimize(left: Vector2, right: Vector2): Vector2 {
        var x = (left.x < right.x) ? left.x : right.x;
        var y = (left.y < right.y) ? left.y : right.y;
        return new Vector2(x, y);
    }
    static Maximize(left: Vector2, right: Vector2): Vector2 {
        var x = (left.x > right.x) ? left.x : right.x;
        var y = (left.y > right.y) ? left.y : right.y;
        return new Vector2(x, y);
    }
    static Transform(vector: Vector2, transformation: Matrix): Vector2 {
        var x = (vector.x * transformation.m[0]) + (vector.y * transformation.m[4]);
        var y = (vector.x * transformation.m[1]) + (vector.y * transformation.m[5]);
        return new Vector2(x, y);
    }
    static Distance(value1: Vector2, value2: Vector2): number {
        return Math.sqrt(Vector2.DistanceSquared(value1, value2));
    }
    static DistanceSquared(value1: Vector2, value2: Vector2): number {
        var x = value1.x - value2.x;
        var y = value1.y - value2.y;
        return (x * x) + (y * y);
    }
}
class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    toString(): string {
        return "{X: " + this.x + " Y:" + this.y + " Z:" + this.z + "}";
    }
    add(that: Vector3): Vector3 {
        return new Vector3(this.x + that.x, this.y + that.y, this.z + that.z);
    }
    subtract(that: Vector3): Vector3 {
        return new Vector3(this.x - that.x, this.y - that.y, this.z - that.z);
    }
    negate(): Vector3 {
        return new Vector3(-this.x, -this.y, -this.z);
    }
    scale(scale: number): Vector3 {
        return new Vector3(this.x * scale, this.y * scale, this.z * scale);
    }
    equals(that: Vector3): boolean {
        return this.x === that.x && this.y === that.y && this.z === that.z;
    }
    multiplyScalar(that: number): Vector3 {
        return new Vector3(this.x * that, this.y * that, this.z * that);
    }
    multiply(that: Vector3): Vector3 {
        return new Vector3(this.x * that.x, this.y * that.y, this.z * that.z);
    }
    divide(that: Vector3): Vector3 {
        return new Vector3(this.x / that.x, this.y / that.y, this.z / that.z);
    }
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    lengthSquared(): number {
        return (this.x * this.x + this.y * this.y + this.z * this.z);
    }
    normalize(): Vector3 {
        var len = this.length();
        if (len === 0) { return this; }
        var num = 1.0 / len;
        this.x *= num;
        this.y *= num;
        this.z *= num;
        return this;
    }
    static FromArray(array: number[], offset: number): Vector3 {
        if (!offset) { offset = 0; }
        return new Vector3(array[offset], array[offset + 1], array[offset + 2]);
    }
    static Zero(): Vector3 {
        return new Vector3(0, 0, 0);
    }
    static Copy(source: Vector3): Vector3 {
        return new Vector3(source.x, source.y, source.z);
    }
    static TransformCoordinates(vector: Vector3, transformation: Matrix) {
        var x = (vector.x * transformation.m[0]) + (vector.y * transformation.m[4]) + (vector.z * transformation.m[8]) + transformation.m[12];
        var y = (vector.x * transformation.m[1]) + (vector.y * transformation.m[5]) + (vector.z * transformation.m[9]) + transformation.m[13];
        var z = (vector.x * transformation.m[2]) + (vector.y * transformation.m[6]) + (vector.z * transformation.m[10]) + transformation.m[14];
        var w = (vector.x * transformation.m[3]) + (vector.y * transformation.m[7]) + (vector.z * transformation.m[11]) + transformation.m[15];
        return new Vector3(x / w, y / w, z / w);
    }
    static TransformNormal(vector: Vector3, transformation: Matrix) {
        var x = (vector.x * transformation.m[0]) + (vector.y * transformation.m[4]) + (vector.z * transformation.m[8]);
        var y = (vector.x * transformation.m[1]) + (vector.y * transformation.m[5]) + (vector.z * transformation.m[9]);
        var z = (vector.x * transformation.m[2]) + (vector.y * transformation.m[6]) + (vector.z * transformation.m[10]);
        return new Vector3(x, y, z);
    }
    static Dot(left: Vector3, right: Vector3): number {
        return (left.x * right.x + left.y * right.y + left.z * right.z);
    }
    static Cross(left: Vector3, right: Vector3): Vector3 {
        var x = left.y * right.z - left.z * right.y;
        var y = left.z * right.x - left.x * right.z;
        var z = left.x * right.y - left.y * right.x;
        return new Vector3(x, y, z);
    }
    static Normalize(vector: Vector3): Vector3 {
        var newVector = Vector3.Copy(vector);
        newVector.normalize();
        return newVector;
    }
    static Distance(value1: Vector3, value2: Vector3): number {
        return Math.sqrt(Vector3.DistanceSquared(value1, value2));
    }
    static DistanceSquared(value1: Vector3, value2: Vector3): number {
        var x = value1.x - value2.x;
        var y = value1.y - value2.y;
        var z = value1.z - value2.z;
        return (x * x) + (y * y) + (z * z);
    }
}
class Matrix {
    m: number[];
    constructor(m?: number[]) {
        this.m = m ? m : [];
    }
    isIdentity(): boolean {
        if(this.m[0] != 1.0 || this.m[5] != 1.0 || this.m[10] != 1.0 || this.m[15] != 1.0) {
            return false;
        }
        if(this.m[12] != 0.0 || this.m[13] != 0.0 || this.m[14] != 0.0 || this.m[4] != 0.0 || this.m[6] != 0.0 || this.m[7] != 0.0 || this.m[8] != 0.0 || this.m[9] != 0.0 || this.m[11] != 0.0 || this.m[12] != 0.0 || this.m[13] != 0.0 || this.m[14] != 0.0) {
            return false;
        }
        return true;
    }
    determinant(): number {
        var temp1 = (this.m[10] * this.m[15]) - (this.m[11] * this.m[14]);
        var temp2 = (this.m[9] * this.m[15]) - (this.m[11] * this.m[13]);
        var temp3 = (this.m[9] * this.m[14]) - (this.m[10] * this.m[13]);
        var temp4 = (this.m[8] * this.m[15]) - (this.m[11] * this.m[12]);
        var temp5 = (this.m[8] * this.m[14]) - (this.m[10] * this.m[12]);
        var temp6 = (this.m[8] * this.m[13]) - (this.m[9] * this.m[12]);
        return ((((this.m[0] * (((this.m[5] * temp1) - (this.m[6] * temp2)) + (this.m[7] * temp3))) - (this.m[1] * (((this.m[4] * temp1) - (this.m[6] * temp4)) + (this.m[7] * temp5)))) + (this.m[2] * (((this.m[4] * temp2) - (this.m[5] * temp4)) + (this.m[7] * temp6)))) - (this.m[3] * (((this.m[4] * temp3) - (this.m[5] * temp5)) + (this.m[6] * temp6))));
    }
    toArray(): number[] {
        return this.m;
    }
    invert(): void {
        var l1 = this.m[0];
        var l2 = this.m[1];
        var l3 = this.m[2];
        var l4 = this.m[3];
        var l5 = this.m[4];
        var l6 = this.m[5];
        var l7 = this.m[6];
        var l8 = this.m[7];
        var l9 = this.m[8];
        var l10 = this.m[9];
        var l11 = this.m[10];
        var l12 = this.m[11];
        var l13 = this.m[12];
        var l14 = this.m[13];
        var l15 = this.m[14];
        var l16 = this.m[15];
        var l17 = (l11 * l16) - (l12 * l15);
        var l18 = (l10 * l16) - (l12 * l14);
        var l19 = (l10 * l15) - (l11 * l14);
        var l20 = (l9 * l16) - (l12 * l13);
        var l21 = (l9 * l15) - (l11 * l13);
        var l22 = (l9 * l14) - (l10 * l13);
        var l23 = ((l6 * l17) - (l7 * l18)) + (l8 * l19);
        var l24 = -(((l5 * l17) - (l7 * l20)) + (l8 * l21));
        var l25 = ((l5 * l18) - (l6 * l20)) + (l8 * l22);
        var l26 = -(((l5 * l19) - (l6 * l21)) + (l7 * l22));
        var l27 = 1.0 / ((((l1 * l23) + (l2 * l24)) + (l3 * l25)) + (l4 * l26));
        var l28 = (l7 * l16) - (l8 * l15);
        var l29 = (l6 * l16) - (l8 * l14);
        var l30 = (l6 * l15) - (l7 * l14);
        var l31 = (l5 * l16) - (l8 * l13);
        var l32 = (l5 * l15) - (l7 * l13);
        var l33 = (l5 * l14) - (l6 * l13);
        var l34 = (l7 * l12) - (l8 * l11);
        var l35 = (l6 * l12) - (l8 * l10);
        var l36 = (l6 * l11) - (l7 * l10);
        var l37 = (l5 * l12) - (l8 * l9);
        var l38 = (l5 * l11) - (l7 * l9);
        var l39 = (l5 * l10) - (l6 * l9);
        this.m[0] = l23 * l27;
        this.m[4] = l24 * l27;
        this.m[8] = l25 * l27;
        this.m[12] = l26 * l27;
        this.m[1] = -(((l2 * l17) - (l3 * l18)) + (l4 * l19)) * l27;
        this.m[5] = (((l1 * l17) - (l3 * l20)) + (l4 * l21)) * l27;
        this.m[9] = -(((l1 * l18) - (l2 * l20)) + (l4 * l22)) * l27;
        this.m[13] = (((l1 * l19) - (l2 * l21)) + (l3 * l22)) * l27;
        this.m[2] = (((l2 * l28) - (l3 * l29)) + (l4 * l30)) * l27;
        this.m[6] = -(((l1 * l28) - (l3 * l31)) + (l4 * l32)) * l27;
        this.m[10] = (((l1 * l29) - (l2 * l31)) + (l4 * l33)) * l27;
        this.m[14] = -(((l1 * l30) - (l2 * l32)) + (l3 * l33)) * l27;
        this.m[3] = -(((l2 * l34) - (l3 * l35)) + (l4 * l36)) * l27;
        this.m[7] = (((l1 * l34) - (l3 * l37)) + (l4 * l38)) * l27;
        this.m[11] = -(((l1 * l35) - (l2 * l37)) + (l4 * l39)) * l27;
        this.m[15] = (((l1 * l36) - (l2 * l38)) + (l3 * l39)) * l27;
    }
    multiply(other: Matrix): Matrix {
        return new Matrix([
            this.m[ 0] * other.m[0] + this.m[ 1] * other.m[4] + this.m[ 2] * other.m[ 8] + this.m[ 3] * other.m[12],
            this.m[ 0] * other.m[1] + this.m[ 1] * other.m[5] + this.m[ 2] * other.m[ 9] + this.m[ 3] * other.m[13],
            this.m[ 0] * other.m[2] + this.m[ 1] * other.m[6] + this.m[ 2] * other.m[10] + this.m[ 3] * other.m[14],
            this.m[ 0] * other.m[3] + this.m[ 1] * other.m[7] + this.m[ 2] * other.m[11] + this.m[ 3] * other.m[15],
            this.m[ 4] * other.m[0] + this.m[ 5] * other.m[4] + this.m[ 6] * other.m[ 8] + this.m[ 7] * other.m[12],
            this.m[ 4] * other.m[1] + this.m[ 5] * other.m[5] + this.m[ 6] * other.m[ 9] + this.m[ 7] * other.m[13],
            this.m[ 4] * other.m[2] + this.m[ 5] * other.m[6] + this.m[ 6] * other.m[10] + this.m[ 7] * other.m[14],
            this.m[ 4] * other.m[3] + this.m[ 5] * other.m[7] + this.m[ 6] * other.m[11] + this.m[ 7] * other.m[15],
            this.m[ 8] * other.m[0] + this.m[ 9] * other.m[4] + this.m[10] * other.m[ 8] + this.m[11] * other.m[12],
            this.m[ 8] * other.m[1] + this.m[ 9] * other.m[5] + this.m[10] * other.m[ 9] + this.m[11] * other.m[13],
            this.m[ 8] * other.m[2] + this.m[ 9] * other.m[6] + this.m[10] * other.m[10] + this.m[11] * other.m[14],
            this.m[ 8] * other.m[3] + this.m[ 9] * other.m[7] + this.m[10] * other.m[11] + this.m[11] * other.m[15],
            this.m[12] * other.m[0] + this.m[13] * other.m[4] + this.m[14] * other.m[ 8] + this.m[15] * other.m[12],
            this.m[12] * other.m[1] + this.m[13] * other.m[5] + this.m[14] * other.m[ 9] + this.m[15] * other.m[13],
            this.m[12] * other.m[2] + this.m[13] * other.m[6] + this.m[14] * other.m[10] + this.m[15] * other.m[14],
            this.m[12] * other.m[3] + this.m[13] * other.m[7] + this.m[14] * other.m[11] + this.m[15] * other.m[15],
        ]);
    }
    equals(value: Matrix): boolean {
        return (this.m[0] === value.m[0] && this.m[1] === value.m[1] && this.m[2] === value.m[2] && this.m[3] === value.m[3] && this.m[4] === value.m[4] && this.m[5] === value.m[5] && this.m[6] === value.m[6] && this.m[7] === value.m[7] && this.m[8] === value.m[8] && this.m[9] === value.m[9] && this.m[10] === value.m[10] && this.m[11] === value.m[11] && this.m[12] === value.m[12] && this.m[13] === value.m[13] && this.m[14] === value.m[14] && this.m[15] === value.m[15]);
    }
    static Identity(): Matrix {
        return new Matrix([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
    static Zero(): Matrix {
        return new Matrix([
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        ]);
    }
    static Copy(m: Matrix): Matrix {
        return new Matrix([
            m.m[ 0], m.m[ 1], m.m[ 2], m.m[ 3],
            m.m[ 4], m.m[ 5], m.m[ 6], m.m[ 7],
            m.m[ 8], m.m[ 9], m.m[10], m.m[11],
            m.m[12], m.m[13], m.m[14], m.m[15]
        ]);
    }
    static Transpose(m: Matrix): Matrix {
        return new Matrix([
            m.m[ 0], m.m[ 4], m.m[ 8], m.m[12],
            m.m[ 1], m.m[ 5], m.m[ 9], m.m[13],
            m.m[ 2], m.m[ 6], m.m[10], m.m[14],
            m.m[ 3], m.m[ 7], m.m[11], m.m[15]
        ]);
    }
    static RotationX(angle: number): Matrix {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        return new Matrix([
            1,  0,  0,  0,
            0,  c,  s,  0,
            0, -s,  c,  0,
            0,  0,  0,  1
        ]);
    }
    static RotationY(angle: number): Matrix {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        return new Matrix([
            c,  0, -s,  0,
            0,  1,  0,  0,
            s,  0,  c,  0,
            0,  0,  0,  1
        ]);
    }
    static RotationZ(angle: number): Matrix {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        return new Matrix([
            c,  s,  0,  0,
           -s,  c,  0,  0,
            0,  0,  1,  0,
            0,  0,  0,  1
        ]);
    }
    static RotationAxis(axis: Vector3, angle: number): Matrix {
        var s = Math.sin(-angle);
        var c = Math.cos(-angle);
        var c1 = 1 - c;
        axis.normalize();
        var result = Matrix.Zero();
        result.m[0] = (axis.x * axis.x) * c1 + c;
        result.m[1] = (axis.x * axis.y) * c1 - (axis.z * s);
        result.m[2] = (axis.x * axis.z) * c1 + (axis.y * s);
        result.m[3] = 0.0;
        result.m[4] = (axis.y * axis.x) * c1 + (axis.z * s);
        result.m[5] = (axis.y * axis.y) * c1 + c;
        result.m[6] = (axis.y * axis.z) * c1 - (axis.x * s);
        result.m[7] = 0.0;
        result.m[8] = (axis.z * axis.x) * c1 - (axis.y * s);
        result.m[9] = (axis.z * axis.y) * c1 + (axis.x * s);
        result.m[10] = (axis.z * axis.z) * c1 + c;
        result.m[11] = 0.0;
        result.m[15] = 1.0;
        return result;
    }
    static RotationYawPitchRoll(yaw: number, pitch: number, roll: number): Matrix {
        return Matrix.RotationZ(roll).multiply(Matrix.RotationX(pitch)).multiply(Matrix.RotationY(yaw));
    }
    static Scaling(x: number, y: number, z: number): Matrix {
        return new Matrix([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ]);
    }
    static Translation(x: number, y: number, z: number): Matrix {
        return new Matrix([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ]);
    }
    static MultiplyInPlace(dst: Matrix, a: Matrix, b: Matrix): void {
        dst.m[ 0] = a.m[ 0] * b.m[0] + a.m[ 1] * b.m[4] + a.m[ 2] * b.m[ 8] + a.m[ 3] * b.m[12];
        dst.m[ 1] = a.m[ 0] * b.m[1] + a.m[ 1] * b.m[5] + a.m[ 2] * b.m[ 9] + a.m[ 3] * b.m[13];
        dst.m[ 2] = a.m[ 0] * b.m[2] + a.m[ 1] * b.m[6] + a.m[ 2] * b.m[10] + a.m[ 3] * b.m[14];
        dst.m[ 3] = a.m[ 0] * b.m[3] + a.m[ 1] * b.m[7] + a.m[ 2] * b.m[11] + a.m[ 3] * b.m[15];
        dst.m[ 4] = a.m[ 4] * b.m[0] + a.m[ 5] * b.m[4] + a.m[ 6] * b.m[ 8] + a.m[ 7] * b.m[12];
        dst.m[ 5] = a.m[ 4] * b.m[1] + a.m[ 5] * b.m[5] + a.m[ 6] * b.m[ 9] + a.m[ 7] * b.m[13];
        dst.m[ 6] = a.m[ 4] * b.m[2] + a.m[ 5] * b.m[6] + a.m[ 6] * b.m[10] + a.m[ 7] * b.m[14];
        dst.m[ 7] = a.m[ 4] * b.m[3] + a.m[ 5] * b.m[7] + a.m[ 6] * b.m[11] + a.m[ 7] * b.m[15];
        dst.m[ 8] = a.m[ 8] * b.m[0] + a.m[ 9] * b.m[4] + a.m[10] * b.m[ 8] + a.m[11] * b.m[12];
        dst.m[ 9] = a.m[ 8] * b.m[1] + a.m[ 9] * b.m[5] + a.m[10] * b.m[ 9] + a.m[11] * b.m[13];
        dst.m[10] = a.m[ 8] * b.m[2] + a.m[ 9] * b.m[6] + a.m[10] * b.m[10] + a.m[11] * b.m[14];
        dst.m[11] = a.m[ 8] * b.m[3] + a.m[ 9] * b.m[7] + a.m[10] * b.m[11] + a.m[11] * b.m[15];
        dst.m[12] = a.m[12] * b.m[0] + a.m[13] * b.m[4] + a.m[14] * b.m[ 8] + a.m[15] * b.m[12];
        dst.m[13] = a.m[12] * b.m[1] + a.m[13] * b.m[5] + a.m[14] * b.m[ 9] + a.m[15] * b.m[13];
        dst.m[14] = a.m[12] * b.m[2] + a.m[13] * b.m[6] + a.m[14] * b.m[10] + a.m[15] * b.m[14];
        dst.m[15] = a.m[12] * b.m[3] + a.m[13] * b.m[7] + a.m[14] * b.m[11] + a.m[15] * b.m[15];
    }
    static TransformInPlace(dst: Float64Array, m: Matrix, src: Float64Array): void {
        for (let i = 0; i < dst.length; i += 3)
        {
            const x = (src[i+0] * m.m[0]) + (src[i+1] * m.m[4]) + (src[i+2] * m.m[ 8]) + m.m[12];
            const y = (src[i+0] * m.m[1]) + (src[i+1] * m.m[5]) + (src[i+2] * m.m[ 9]) + m.m[13];
            const z = (src[i+0] * m.m[2]) + (src[i+1] * m.m[6]) + (src[i+2] * m.m[10]) + m.m[14];
            const w = (src[i+0] * m.m[3]) + (src[i+1] * m.m[7]) + (src[i+2] * m.m[11]) + m.m[15];
            dst[i+0] = x / w;
            dst[i+1] = y / w;
            dst[i+2] = z / w;
        }
    }
}

interface DrawParams {
    ctx: CanvasRenderingContext2D;
    box: Box;
    bone: Bone;
}
function DrawLineMesh({ ctx, box, bone }: DrawParams): void {
    
    ctx.save();
    if (bone.color) { ctx.strokeStyle = bone.color; }
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    
    for (let i = 0; i < bone.geometry.polygons.length; i += 4)
    {
        let x0 = null;
        let y0 = null;
        let isLineSegment = false;
        
        for (let j = 0; j < 4; j++)
        {
            const k = bone.geometry.polygons[i + j];
            
            if (k === Geometry.blank)
            {
                if (j === 2) { isLineSegment = true; }
                continue;
            }
            else
            {
                // we can't use ctx.transforms, because the scaling also affects the lineWidth and makes it way too thick
                // all projectedCoords are in [-1,+1], which means they need to be scaled by wr/hr
                const x = box.cx + box.wr * bone.projectedCoords[k * 3 + 0];
                const y = box.cy - box.hr * bone.projectedCoords[k * 3 + 1];
                const z = bone.projectedCoords[k * 3 + 2];
                
                if (j === 0)
                {
                    x0 = x;
                    y0 = y;
                    ctx.moveTo(x, y);
                }
                else
                {
                    ctx.lineTo(x, y);
                }
            }
        }
        
        if (!isLineSegment)
        {
            ctx.lineTo(x0, y0);
        }
    }
    
    ctx.stroke();
    ctx.restore();
}
function DrawPoints({ ctx, box, bone }: DrawParams): void {
    
    ctx.save();
    
    const radius = 2;
    
    for (let i = 0; i < bone.projectedCoords.length; i += 3)
    {
        const x = box.cx + bone.projectedCoords[i + 0] * box.wd;
        const y = box.cy - bone.projectedCoords[i + 1] * box.hg;
        
        if (x <= box.lf || y <= box.tp || x >= box.rt || y >= box.bt) { continue; } 
        
        //ctx.fillStyle = p.color.toString();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
        ctx.fill();
    }
    
    ctx.restore();
}
function LabelVertexes({ ctx, box, bone }: DrawParams): void {
    
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.font = '8pt monospace';
    
    let k = 0;
    
    for (let i = 0; i < bone.projectedCoords.length; i += 3)
    {
        const x = box.cx + bone.projectedCoords[i + 0] * box.wd;
        const y = box.cy - bone.projectedCoords[i + 1] * box.hg;
        
        if (x <= box.lf || y <= box.tp || x >= box.rt || y >= box.bt) { continue; } 
        
        const label = (k++).toString(); // change as needed
        ctx.fillText(label, x + 3, y);
    }
    
    ctx.restore();
}

function Axes(length: number): Bone {
    
    const b = Geometry.blank;
    
    const x = new Geometry({ vertices: [0, 0, 0, length, 0, 0], polygons: [0, 1, b, b] });
    const y = new Geometry({ vertices: [0, 0, 0, 0, length, 0], polygons: [0, 1, b, b] });
    const z = new Geometry({ vertices: [0, 0, 0, 0, 0, length], polygons: [0, 1, b, b] });
    
    const axes = new Bone({});
    const xbone = new Bone({ parent: axes, geometry: x, color: 'red' });
    const ybone = new Bone({ parent: axes, geometry: y, color: 'green' });
    const zbone = new Bone({ parent: axes, geometry: z, color: 'blue' });
    
    return axes;
}
function OrbitControls(elt: HTMLElement, camera: Camera, onchange?: () => void, onstart?: () => void, onend?: () => void): void {
    
    //onstart example:
    //    savedRenderMode = device.renderMode;
    //    device.renderMode = 'point';
    //onend example:
    //    device.renderMode = savedRenderMode;
    //    device.Render();
    
    elt.onmousedown = function(downEvent) {
        
        if (onstart) { onstart(); }
        
        let prevX = downEvent.offsetX;
        let prevY = downEvent.offsetY;
        
        const zenith = Math.PI / 2;
        
        elt.onmousemove = function(moveEvent) {
            
            const currX = moveEvent.offsetX;
            const currY = moveEvent.offsetY;
            
            const dx = currX - prevX;
            const dy = currY - prevY;
            
            prevX = currX;
            prevY = currY;
            
            if (moveEvent.shiftKey) // move camera target forward/backward/left/right
            {
                const forwardMagnitude = -dy / 1000 * camera.standoff;
                const sideMagnitude = dx / 1000 * camera.standoff;
                
                // this was just a guess and isn't really right, although it does sort of work
                camera.target.x += forwardMagnitude * Math.cos(camera.azimuth) + sideMagnitude * Math.sin(camera.azimuth);
                camera.target.z += forwardMagnitude * Math.sin(camera.azimuth) + sideMagnitude * Math.cos(camera.azimuth);
            }
            else if (moveEvent.ctrlKey) // move camera target up/down
            {
                camera.target.y += dy / 1000 * camera.standoff;
            }
            else // change azimuth/altitude
            {
                let newAzimuth = camera.azimuth - dx / 100;
                let newAltitude = camera.altitude + dy / 100;
                
                if (newAzimuth < 0) { newAzimuth += Math.PI * 2; }
                if (newAzimuth > Math.PI * 2) { newAzimuth -= Math.PI * 2; }
                
                if (newAltitude >= +zenith) { newAltitude = +zenith - 0.01; }
                if (newAltitude <= -zenith) { newAltitude = -zenith + 0.01; }
                
                camera.setPolar(newAzimuth, newAltitude, camera.standoff);
            }
            
            if (onchange) { onchange(); }
        };
        
        elt.onmouseup = function() {
            elt.onmousemove = null;
            elt.onmouseup = null;
            if (onend) { onend(); }
        };
    };
    
    elt.onwheel = function(wheelEvent) {
        const newStandoff = camera.standoff * ((wheelEvent.deltaY > 0) ? 1.1 : 0.9);
        camera.setPolar(camera.azimuth, camera.altitude, newStandoff);
        if (onchange) { onchange(); }
    };
}

export class Scene {
    
    ctx: CanvasRenderingContext2D;
    box: Box;
    root: Bone;
    camera: Camera;
    
    mode: string = 'line'; // 'point', 'line', 'polygon'
    showAxes: boolean = true;
    axisLength: number = 10;
    labelVertexes: boolean = false;
    orbitControls: boolean = true;
    
    onorbit: () => void;
    onorbitstart: () => void;
    onorbitend: () => void;
    
    constructor(options: any) {
        this.root = new Bone({});
        this.camera = new Camera();
        this.onorbit = () => { this.render() };
        Object.assign(this, options);
        if (!this.box) { this.box = DefaultBox(this.ctx); }
        this.camera.aspectRatio = this.box.wd / this.box.hg;
        OrbitControls(this.ctx.canvas, this.camera, this.onorbit, this.onorbitstart, this.onorbitend);
    }
    render(): void {
        
        this.ctx.clearRect(this.box.lf, this.box.tp, this.box.wd, this.box.hg);
        
        const bones = this.root.leaves();
        
        for (const bone of bones)
        {
            bone.project(this.camera);
            
            if (this.mode == 'point')
            {
                DrawPoints({ ctx: this.ctx, box: this.box, bone });
            }
            else if (this.mode == 'line')
            {
                DrawLineMesh({ ctx: this.ctx, box: this.box, bone });
            }
            
            if (this.labelVertexes) { LabelVertexes({ ctx: this.ctx, box: this.box, bone }); }
            if (this.showAxes) {  }
        }
    }
}
export class Geometry {
    
    static blank = 0xFFFF; // for checking blanks, must match Uint16Array/Uint32Array
    
    vertices: Float64Array; // 3 coords per vertex * 8 bytes per coord = 24 bytes per vertex
    polygons: Uint16Array; // 4 vertex indices per face - index = -1 if unused. could be Uint16Array/Uint32Array/<T>
    
    polyNormals: Float64Array; // 3 * polygons
    vertexNormals: Float64Array; // 3 * vertices
    uvSet: UvSet;
    
    constructor({ vertices, polygons, nVertices, nPolygons }: { vertices?: number[], polygons?: number[], nVertices?: number, nPolygons?: number }) {
        if (nVertices) { this.vertices = new Float64Array(nVertices * 3); }
        if (nPolygons) { this.polygons = new Uint16Array(nPolygons * 4); }
        if (vertices) { this.vertices = new Float64Array(vertices); }
        if (polygons) { this.polygons = new Uint16Array(polygons); }
    }
    computeFacesNormals(): void {
        
        // this calculates polygon normals from vertex normals
        
        // for (var i = 0; i < this.polygons.length; i++)
        // {
            // var poly = this.polygons[i];
            
            // // assumption of triangle
            // var va = poly.vertices[0];
            // var vb = poly.vertices[1];
            // var vc = poly.vertices[2];
            
            // poly.normal = (va.normal.add(vb.normal.add(vc.normal))).scale(1 / 3).normalize();
        // }
    }
    calculateNormals(): void {
        
        // this calculates polygon normals denovo using a cross product of polygon edges
        
        // this.polyNormals = [];
        
        // for (var i = 0; i < this.polygons.length; i++)
        // {
            // var poly = this.polygons[i];
            
            // if (!poly.normal)
            // {
                // var vertices = [];
                
                // for (var k = 2; k < poly.vertices.length; k++)
                // {
                    // vertices.push(poly.vertices[k]);
                // }
                
                // var a = vertices[0];
                // var b = vertices[1];
                // var c = vertices[2];
                // var ab = new Vector3(b.coordinates.x - a.coordinates.x, b.coordinates.y - a.coordinates.y, b.coordinates.z - a.coordinates.z);
                // var ac = new Vector3(c.coordinates.x - a.coordinates.x, c.coordinates.y - a.coordinates.y, c.coordinates.z - a.coordinates.z);
                
                ////it appears that the vertices are ordered such that this cross product vector points outward from the mesh, like we want
                // var cross = Vector3.Cross(ab, ac);
                // cross.normalize();
                
                // poly.normal = cross;
                // this.polyNormals.push(cross);
            // }
        // }
    }
    centroid(): Vector3 {
        
        // this requires that this.worldMatrix be set
        // also this assumes that the transform of the centroid (which is what we calculate) is equal to the centroid of the transform (which is what we want)
        
        return null;
        // var xsum = 0;
        // var ysum = 0;
        // var zsum = 0;
        
        // var n = this.vertices.length;
        
        // for (var i = 0; i < n; i++)
        // {
            // xsum += this.vertices[i].coordinates.x;
            // ysum += this.vertices[i].coordinates.y;
            // zsum += this.vertices[i].coordinates.z;
        // }
        
        // var p = new Vector3(xsum / n, ysum / n, zsum / n);
        // var q = this.matrix ? Vector3.TransformCoordinates(p, this.matrix) : p;
        
        // return q;
    }
    setVertices(scene: Scene, fn: () => void): void {
        // replace vertex coords with new ones
        // the fn would have copy-pasted code from Cube
        // then bone worldCoords and projectedCoords must be recalculated
        // so we pass in the scene, get root.leaves(), check for identity with this geom, and recalculate if so
        // then render
    }
    static Line(p: Vector3, q: Vector3): Geometry {
        
        const vertices = [
            p.x, p.y, p.z,
            q.x, q.y, q.z,
        ];
        
        const polygons = [0, 1, Geometry.blank, Geometry.blank];
        
        const geometry = new Geometry({ vertices, polygons });
        
        return geometry;
    }
    static Plane(x: number, y: number, z: number): Geometry {
        
        let vertices = null;
        
        // using the right hand rule, the normal faces the +/+/+ octant
        if (x == 0)
        {
            vertices = [
                0, 0, 0,
                0, 0, z,
                0, y, z,
                0, y, 0,
            ];
        }
        else if (y == 0)
        {
            vertices = [
                0, 0, 0,
                x, 0, 0,
                x, 0, z,
                0, 0, z,
            ];
        }
        else if (z == 0)
        {
            vertices = [
                0, 0, 0,
                0, y, 0,
                x, y, 0,
                x, 0, 0,
            ];
        }
        else
        {
            throw new Error('one of x, y, or z needs to be 0');
        }
        
        const polygons = [0, 1, 2, 3];
        
        const geometry = new Geometry({ vertices, polygons });
        
        //plane.normal = new Vector3(x == 0 ? 1 : 0, y == 0 ? 1 : 0, z == 0 ? 1 : 0);
        //
        //geometry.polygons.push(plane);
        //geometry.polyNormals.push(plane.normal);
        //
        //geometry.uvSet.uvs = [ [ 0 , 0 ] , [ 1 , 0 ] , [ 1 , 1 ] , [ 0 , 1 ] ];
        
        return geometry;
    }
    static Cube(x: number, y: number, z: number): Geometry {
        
        const vertices = [
            0, 0, 0,
            0, y, 0,
            0, 0, z,
            0, y, z,
            x, 0, 0,
            x, y, 0,
            x, 0, z,
            x, y, z,
        ];
        
        const polygons = [
            0, 1, 3, 2,
            4, 5, 7, 6,
            0, 1, 5, 4,
            2, 3, 7, 6,
            0, 2, 6, 4,
            1, 3, 7, 5,
        ];
        
        const geometry = new Geometry({ vertices, polygons });
        
        //var textureWidth = x + y + x + y;
        //var textureHeight = y + z + y;
        //
        //var points: [number, number][] = [
        //    [0,0], // in the diagram we made, we used 1-indexing for these coordinates, so this first element is just padding
        //    [0,0],
        //    [0,y],
        //    [0,y+z],
        //    [x,0],
        //    [x,y],
        //    [x,y+z],
        //    [x+y,y],
        //    [x+y,y+z],
        //    [x+y,y+z+y],
        //    [x+y+x,y],
        //    [x+y+x,y+z],
        //    [x+y+x,y+z+y],
        //    [y,x+y+x+y],
        //    [y+z,x+y+x+y]
        //].map(function(uv: [number, number]): [number, number] { return [ uv[0] / textureWidth , uv[1] / textureHeight ]; }); // normalize
        //
        //geometry.uvSet.uvs = [
        //    points[5], // the first 8 uvs match up with the vertex list
        //    points[7],
        //    points[6],
        //    points[8],
        //    points[2],
        //    points[10],
        //    points[3],
        //    points[11], 
        //    points[4], // pvis start here - these are the red numbers in the pvi diagram
        //    points[9], // the 3rd number in the pvi lists below is just 8-13 consecutively, referring to this list
        //    points[13],
        //    points[1],
        //    points[12],
        //    points[14]
        //];
        //
        //geometry.uvSet.pvi = [
        //    [2,1,8],
        //    [3,2,9],
        //    [1,4,10],
        //    [2,5,11],
        //    [3,6,12],
        //    [1,6,13]
        //];
        //
        //geometry.polyNormals.push(new Vector3(-1,  0,  0));
        //geometry.polyNormals.push(new Vector3(+1,  0,  0));
        //geometry.polyNormals.push(new Vector3( 0,  0, -1));
        //geometry.polyNormals.push(new Vector3( 0,  0, +1));
        //geometry.polyNormals.push(new Vector3( 0, -1,  0));
        //geometry.polyNormals.push(new Vector3( 0, +1,  0));
        //
        //geometry.uvSet.makePviDict();
        
        return geometry;
    }
    static Surface({ imin, imax, jmin, jmax, ixfn, jzfn, fn }: { imin: number, imax: number, jmin: number, jmax: number, ixfn: (i: number) => number, jzfn: (j: number) => number, fn: (i: number, j: number, x: number, z: number) => number }): Geometry {
        
        const xPoints = imax - imin + 1;
        const zPoints = jmax - jmin + 1;
        
        const nVertices = xPoints * zPoints;
        const nPolygons = (xPoints - 1) * (zPoints - 1);
        
        const geometry = new Geometry({ nVertices, nPolygons });
        
        let k = 0;
        for (let i = imin; i <= imax; i++)
        {
            for (let j = jmin; j <= jmax; j++)
            {
                const x = ixfn(i);
                const z = jzfn(j);
                geometry.vertices[k++] = x;
                geometry.vertices[k++] = fn(i, j, x, z);
                geometry.vertices[k++] = z;
            }
        }
        
        k = 0;
        for (let i = 1; i < xPoints; i++)
        {
            for (let j = 1; j < zPoints; j++)
            {
                geometry.polygons[k++] = (i-1) * zPoints + (j-1);
                geometry.polygons[k++] = (i-0) * zPoints + (j-1);
                geometry.polygons[k++] = (i-0) * zPoints + (j-0);
                geometry.polygons[k++] = (i-1) * zPoints + (j-0);
            }
        }
        
        return geometry;
    }
    /*static MultiCube(x: number, y: number, z: number): Geometry {
        
        // each face has its own Material
        
        var geometry = new Geometry();
        geometry.label = 'cube';
        
        geometry.vertices.push(new Vertex(0, 0, 0));
        geometry.vertices.push(new Vertex(0, y, 0));
        geometry.vertices.push(new Vertex(0, 0, z));
        geometry.vertices.push(new Vertex(0, y, z));
        geometry.vertices.push(new Vertex(x, 0, 0));
        geometry.vertices.push(new Vertex(x, y, 0));
        geometry.vertices.push(new Vertex(x, 0, z));
        geometry.vertices.push(new Vertex(x, y, z));
        
        // the polygon group index has been changed from 0,0,0,0,0,0 to 0,1,2,3,4,5
        geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, 0, 1, 3, 2));
        geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 1, 4, 5, 7, 6));
        geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 2, 0, 1, 5, 4));
        geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 3, 2, 3, 7, 6));
        geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 4, 0, 2, 6, 4));
        geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 5, 1, 3, 7, 5));
        
        geometry.uvSet.uvs = [
            [0,0], // lower left
            [1,0], // lower right
            [1,1], // upper right
            [0,1], // upper left
            [0,0], // these uvs 4-7 are not strictly necessary but are here so that the initial assignment of uvs by vertex goes smoothly
            [1,0],
            [1,1],
            [0,1]
        ];
        
        // the first index is 000011112222333344445555
        // the third index is 012301230123012301230123
        // thus the second index is the significant one - see the cube geometry diagram
        // each side face of the cube (polygons 0,1,2,3) has a natural viewpoint - look at it so that the bottom is on the bottom and the top is on the top
        // the top (polygon 5) and bottom (polygon 4) faces don't really have a natural viewpoint, so the uv orientation there is ad hoc
        geometry.uvSet.pvi = [
            [0,2,0],
            [0,0,1],
            [0,1,2],
            [0,3,3],
            [1,4,0],
            [1,6,1],
            [1,7,2],
            [1,5,3],
            [2,4,0],
            [2,0,1],
            [2,1,2],
            [2,5,3],
            [3,6,0],
            [3,2,1],
            [3,3,2],
            [3,7,3],
            [4,4,0],
            [4,0,1],
            [4,2,2],
            [4,6,3],
            [5,1,0],
            [5,5,1],
            [5,7,2],
            [5,3,3],
        ];
        
        geometry.polyNormals.push(new Vector3(-1,  0,  0));
        geometry.polyNormals.push(new Vector3(+1,  0,  0));
        geometry.polyNormals.push(new Vector3( 0,  0, -1));
        geometry.polyNormals.push(new Vector3( 0,  0, +1));
        geometry.polyNormals.push(new Vector3( 0, -1,  0));
        geometry.polyNormals.push(new Vector3( 0, +1,  0));
        
        geometry.uvSet.makePviDict();
        
        return geometry;
    }
    static Cylinder(segments: number, length: number, radius: number): Geometry {
        
        // the length of the cylinder is along the y axis, and the circular part is x-z
        
        // obsolete: the cylinder goes from y=0 to y=1, and the radius is 1
        // obsolete: nVertices = segments * 2 + 2
        // obsolete: nPolygons = segments * 3
        
        var geometry = new Geometry();
        geometry.label = 'cylinder';
        
        // for our purposes, a hollow cylinder is okay
        // the cylinder goes from y=0 to y=length
        // nVertices = segments * 2
        // nPolygons = segments
        
        // the two center points at top and bottom
        //geometry.vertices.push({ coordinates : {x:0,y:0,z:0} , Normal : new Vector3(0, 0, 0) });
        //geometry.vertices.push({ coordinates : {x:0,y:1,z:0} , Normal : new Vector3(0, 0, 0) });
        
        geometry.vertices = [];
        geometry.vertexNormals = [];
        
        for (var y = 0; y < 2; y++)
        {
            for (var i = 0; i < segments; i++)
            {
                var angleRad = i / segments * 2 * Math.PI;
                
                var vx = radius * Math.cos(angleRad);
                var vy = y * length; // meaning, either 0 or length
                var vz = radius * Math.sin(angleRad);
                geometry.vertices.push(new Vertex(vx, vy, vz));
                geometry.vertexNormals.push(new Vector3(vx, 0, vz).normalize());
            }
        }
        
        // the triangles around the top and bottom - spokes radiating out from the center
        //for (var y = 0; y < 2; y++)
        //{
        //  for (var i = 0; i < segments; i++)
        //  {
        //      var a = (i + 0) % segments;
        //      var b = (i + 1) % segments;
        //      
        //      var va = y;
        //      var vb = 2 + y * segments + a;
        //      var vc = 2 + y * segments + b;
        //      geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, va, vb, vc));
        //  }
        //}
        
        var capPoints = 0; // this is 2 if we have caps on the cylinders, and 0 if the cylinder is hollow
        
        // the rectangles along the sides
        for (var i = 0; i < segments; i++)
        {
            var a = (i + 0) % segments;
            var b = (i + 1) % segments;
            
            var va = capPoints + 0 * segments + a;
            var vb = capPoints + 0 * segments + b;
            var vc = capPoints + 1 * segments + b;
            var vd = capPoints + 1 * segments + a;
            geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, va, vb, vc, vd));
        }
        
        for (var y = 0; y < 2; y++)
        {
            for (var i = 0; i < segments; i++)
            {
                geometry.uvSet.uvs.push([i/segments,y]);
            }
        }
        
        geometry.uvSet.uvs.push([1,0]);
        geometry.uvSet.uvs.push([1,1]);
        
        geometry.uvSet.pvi.push([segments - 1, 0 * segments, 2 * segments + 0]);
        geometry.uvSet.pvi.push([segments - 1, 1 * segments, 2 * segments + 1]);
        
        geometry.uvSet.makePviDict();
        
        return geometry;
    }
    static Sphere(nHemiLatitudeLines: number, nHemiLongitudeLines: number): Geometry {
        //
        //var lats = nHemiLatitudeLines * 2 + 1;
        //var longs = nHemiLongitudeLines * 2;
        //
        //var vertices = 2 + lats * longs;
        //
        //var radius = 1;
        //
        //var polygons = [];
        //var points = [];
        //var northPole = {coordinates:{x:0,z:0,y:+radius},Normal:new Vector3(0, 0, 0)};
        //var southPole = {coordinates:{x:0,z:0,y:-radius},Normal:new Vector3(0, 0, 0)};
        //points.push(northPole);
        //points.push(southPole);
        //
        //var pointMatrix = {};
        //for (var i = -nHemiLatitudeLines; i <= nHemiLatitudeLines; i++) { pointMatrix[i] = []; }
        //
        //// points on the equator
        //for (var j = 0; j < longs; j++)
        //{
        //  var theta = j / longs * Math.PI * 2;
        //  var x = Math.cos(theta);
        //  var y = 0;
        //  var z = Math.sin(theta);
        //  var vertex = new Vertex(x, y, z);
        //  vertex.normal = new Vector3(x, y, z).normalized();
        //  points.push(vertex);
        //  pointMatrix[0].push(vertex);
        //}
        //
        //for (var i = 1; i <= nHemiLatitudeLines; i++)
        //{
        //  for (var k = -1; k <= 1; k += 2) // north or south latitude
        //  {
        //      for (var j = 0; j < longs; j++)
        //      {
        //          var theta = j / longs * Math.PI * 2;
        //          var phi = i / (nHemiLatitudeLines + 1) * k * Math.PI / 2; // 1/2 or 1/3,2/3 or 1/4,2/4,3/4, etc.
        //          
        //          var x = radius * Math.cos(theta) * Math.cos(phi);
        //          var z = radius * Math.sin(theta) * Math.cos(phi);
        //          var y = radius * Math.sin(phi);
        //          var vertex = new Vertex(x, y, z);
        //          vertex.normal = new Vector3(x, y, z).normalized();
        //          points.push(vertex);
        //          pointMatrix[i * k].push(vertex);
        //      }
        //  }
        //}
        //
        //for (var i = -nHemiLatitudeLines; i <= nHemiLatitudeLines; i++)
        //{
        //  for (var j = 0; j < pointMatrix[i].length; j++)
        //  {
        //      // latitude segments
        //      var polygon = new Polygon();
        //      polygon.vertices.push(pointMatrix[i][j]);
        //      polygon.vertices.push(pointMatrix[i][(j+1) % pointMatrix[i].length]);
        //      polygons.push(polygon);
        //      
        //      // longitude segments - a point connects with the point to its north
        //      var polygon = new Polygon();
        //      polygon.vertices.push(pointMatrix[i][j]);
        //      
        //      if (!pointMatrix[i + 1])
        //      {
        //          polygon.vertices.push(northPole);
        //      }
        //      else
        //      {
        //          polygon.vertices.push(pointMatrix[i+1][j]);
        //      }
        //      
        //      polygons.push(polygon);
        //  }
        //}
        //
        //// now connect the south pole to the lowest points
        //for (var j = 0; j < longs; j++)
        //{
        //  var polygon = new Polygon();
        //  polygon.vertices.push(southPole);
        //  polygon.vertices.push(pointMatrix[-nHemiLatitudeLines][j]);
        //  polygons.push(polygon);
        //}
        //
        //var geometry = new Geometry();
        //
        //geometry.vertices = points;
        //geometry.polygons = polygons;
        //
        //return geometry;
        return null;
    }*/
}
export class Bone {
    
    geometry: Geometry;
    
    parent: Bone;
    children: Bone[];
    
    worldCoords: Float64Array; // apply worldMatrix to geometry.vertices
    projectedCoords: Float64Array; // apply camera.matrix to worldCoordinates
    
    localMatrix: Matrix; // this one you can manipulate
    worldMatrix: Matrix; // the result of multiplication
    
    color: string;
    
    constructor({ parent, geometry, color }: { parent?: Bone, geometry?: Geometry, color?: string}) {
        
        this.color = color;
        this.children = [];
        this.localMatrix = Matrix.Identity();
        this.worldMatrix = Matrix.Identity();
        
        if (parent)
        {
            this.parent = parent;
            this.parent.children.push(this);
        }
        
        this.calcWorldMatrix();
        
        if (geometry)
        {
            this.geometry = geometry;
            this.worldCoords = new Float64Array(geometry.vertices.length);
            this.projectedCoords = new Float64Array(geometry.vertices.length);
            this.calcWorldCoords();
        }
    }
    addChild(geometry: Geometry): void {
        new Bone({ parent: this, geometry });
    }
    SetParent(parent: Bone): void {
        this.parent = parent;
        parent.children.push(this);
    }
    leaves(): Bone[] {
        let list = [];
        if (this.geometry) { list.push(this); }
        for (const c of this.children) { list = list.concat(c.leaves()); }
        return list;
    }
    Descendants(): Bone[] {
        
        // Descendants() collects Bone objects, whereas Leaves() collects Mesh objects
        
        var list = [];
        list.push(this);
        
        if (this.children)
        {
            for (var i = 0; i < this.children.length; i++)
            {
                list = list.concat(this.children[i].Descendants());
            }
        }
        
        return list;
    }
    calcWorldMatrix(): void {
        const parentMatrix = this.parent ? this.parent.worldMatrix : Matrix.Identity();
        Matrix.MultiplyInPlace(this.worldMatrix, parentMatrix, this.localMatrix); 
        for (const c of this.children) { c.calcWorldMatrix(); }
    }
    calcWorldCoords(): void {
        Matrix.TransformInPlace(this.worldCoords, this.worldMatrix, this.geometry.vertices);
    }
    project(camera: Camera): void {
        Matrix.TransformInPlace(this.projectedCoords, camera.matrix, this.worldCoords);
    }
}
export class Camera {
    
    position: Vector3 = new Vector3(0, 0, 1);
    target: Vector3 = Vector3.Zero();
    up: Vector3 = new Vector3(0, 1, 0);
    
    // an alternative way of specifying a position with respect to a target
    azimuth: number;   // [0,360) - 0 = +X, 90 = +Z, 180 = -X, 270 = -Z
    altitude: number;  // (-90,+90)
    standoff: number;
    rotation: number;  // [-180,+180]   TODO: used to calculate up vector
    
    aspectRatio: number = 4/3;
    focalLength: number = 0; // what is this?
    fieldOfView: number = 0.5; // field of view in the y direction, in radians
    // fieldOfViewX can be calculated from fieldOfViewY and aspectRatio?
    
    znear: number = 0.01;
    zfar: number = 1;
    
    viewMatrix: Matrix;
    projectionMatrix: Matrix;
    matrix: Matrix;
    //fmatrix: Float64Array;
    
    constructor(params?: any) {
        Object.assign(this, params);
        this.viewMatrix = Matrix.Zero();
        this.projectionMatrix = Matrix.Zero();
        this.matrix = Matrix.Zero();
    }
    calcMatrix(): void {
        
        // the view matrix points the camera at the target and orients it according to this.up
        // it could be decomposed into three separate transformations
        // 1. translate eye to origin
        // 2. azimuth rotation about z axis to bring target to x=0
        // 3. altitude rotation about x axis to bring target to y=0
        // of course, the calculation below is nothing like that, and i'm not sure why it works
        
        const zAxis = this.target.subtract(this.position).normalize(); // eye at origin, z axis pointing at target
        // is the xAxis calc correct? using the right hand rule, it would appear that xAxis would point left
        const xAxis = Vector3.Cross(this.up, zAxis).normalize(); // xAxis is at right angle to this.up (by default, the y axis) and the zAxis
        const yAxis = Vector3.Cross(zAxis, xAxis).normalize(); // we could probably just use this.up.normalize() here
        const ex = -Vector3.Dot(xAxis, this.position);
        const ey = -Vector3.Dot(yAxis, this.position);
        const ez = -Vector3.Dot(zAxis, this.position);
        
        this.viewMatrix = new Matrix([
            xAxis.x, yAxis.x, zAxis.x, 0,
            xAxis.y, yAxis.y, zAxis.y, 0,
            xAxis.z, yAxis.z, zAxis.z, 0,
                 ex,      ey,      ez, 1
        ]);
        
        // the view matrix performs the foreshortening
        // the tan terms scale down the x and y
        // i'm not sure what the operations on z do, or how the final z term is to be interpreted
        
        // this is some alternative formulation where you specify width/height instead of fieldOfView/aspectRatio
        //matrix.m[0] = (2.0 * this.znear) / this.width;
        //matrix.m[5] = (2.0 * this.znear) / this.height;
        
        // fieldOfView is the vertical angle, and aspect ratio is width/height, so the combo specifies the same information as width/height
        
        const tan = 1.0 / (Math.tan(this.fieldOfView * 0.5));
        this.projectionMatrix = new Matrix([
            tan / this.aspectRatio,    0,                                                    0, 0,
                                  0, tan,                                                    0, 0,
                                  0,   0,                -this.zfar / (this.znear - this.zfar), 1, // this 1 at the end adds a +1 to the final z term
                                  0,   0,  (this.znear * this.zfar) / (this.znear - this.zfar), 0  // the 4th term divides the others, like (x/w,y/w,z/w)
        ]);
        
        this.matrix = this.viewMatrix.multiply(this.projectionMatrix);
    }
    setPosition(x: number, y: number, z: number): void {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        this.calcPolar();
        this.calcMatrix();
    }
    setPolar(azimuth: number, altitude: number, standoff: number): void {
        this.azimuth = azimuth;
        this.altitude = altitude;
        this.standoff = standoff;
        this.calcXYZ();
        this.calcMatrix();
    }
    calcXYZ(): void {
        const x = this.standoff * Math.cos(this.azimuth) * Math.cos(this.altitude);
        const z = this.standoff * Math.sin(this.azimuth) * Math.cos(this.altitude);
        const y = this.standoff * Math.sin(this.altitude);
        this.position = this.target.add(new Vector3(x, y, z));
    }
    calcPolar(): void {
        const zenith = Math.PI / 2;
        const dx = this.position.x - this.target.x;
        const dy = this.position.y - this.target.y;
        const dz = this.position.z - this.target.z;
        this.standoff = Math.sqrt(dx*dx+dy*dy+dz*dz);
        this.azimuth = Math.atan2(dz, dx);
        this.altitude = zenith - Math.acos(dy/this.standoff); // acos returns a value in [0,pi], so zenith-acos is in [-pi/2,pi/2]
    }
}

function DrawUvMap(ctx: CanvasRenderingContext2D, mesh: Geometry): void {
    
    //for (var i = 0; i < mesh.polygons.length; i++)
    //{
    //    var poly = mesh.polygons[i];
    //    var uvs = [];
    //    
    //    // what does this loop do and do we / should we do it elsewhere as part of a general normalization of the uv set?
    //    for (var k = 0; k < poly.vertices.length; k++)
    //    {
    //        var vertex = poly.vertices[k];
    //        
    //        if (mesh.uvSet.pviDict[i] && mesh.uvSet.pviDict[i][vertex.index])
    //        {
    //            uvs.push(mesh.uvSet.uvs[mesh.uvSet.pviDict[i][vertex.index]]);
    //        }
    //        else
    //        {
    //            uvs.push(mesh.uvSet.uvs[vertex.index]);
    //        }
    //    }
    //    
    //    ctx.beginPath();
    //    
    //    for (var k = 0; k < uvs.length; k++)
    //    {
    //        var a = uvs[k];
    //        var b = uvs[(k+1)%uvs.length];
    //        
    //        if (a && b) // hack to just get something drawn
    //        {
    //            var x1 = a[0] * ctx.canvas.width;
    //            var y1 = a[1] * ctx.canvas.height;
    //            var x2 = b[0] * ctx.canvas.width;
    //            var y2 = b[1] * ctx.canvas.height;
    //            
    //            ctx.moveTo(x1, y1);
    //            ctx.lineTo(x2, y2);
    //        }
    //    }
    //    
    //    ctx.stroke();
    //}
}
export class UvSet {
    
    uvs: [number, number][] = [];
    pvi: [number, number, number][] = [];
    
    pviDict: any = null;
    
    constructor() {
        
    }
    makePviDict(): void {
        
        var d = {};
        
        for (var i = 0; i < this.pvi.length; i++)
        {
            var polygonIndex = this.pvi[i][0];
            var vertexIndex = this.pvi[i][1];
            var uvIndex = this.pvi[i][2];
            
            // why are we pushing a 2-list rather than a dict like below?
            if (!d[polygonIndex]) { d[polygonIndex] = []; }
            d[polygonIndex].push([vertexIndex, uvIndex]);
            
            //if (!d[polygonIndex]) { d[polygonIndex] = {}; }
            //d[polygonIndex][vertexIndex] = uvIndex;
        }
        
        this.pviDict = d;
    }
}
export class Texture {
    
    id: string;
    name: string = 'image';
    label: string = 'image';
    
    url: string = null; // link to image library
    
    filename: string = null;
    
    width: number = null;
    height: number = null;
    internalBuffer: Uint8ClampedArray = null; // ImageData.data (Uint8ClampedArray) or Bitmap.pixels (Uint8Array)
    bytesPerPixel: number = null;
    
    constructor() {
        
    }
    load(img: any): void {
        
        if (img.constructor.name == 'CanvasRenderingContext2D')
        {
            this.width = img.canvas.width;
            this.height = img.canvas.height;
            
            var internalContext: CanvasRenderingContext2D = img;
            
            this.internalBuffer = internalContext.getImageData(0, 0, this.width, this.height).data;
        }
        else if (img.constructor.name == 'HTMLImageElement')
        {
            this.width = img.width;
            this.height = img.height;
            
            var internalCanvas = document.createElement('canvas');
            internalCanvas.width = img.width;
            internalCanvas.height = img.height;
            
            var internalContext: CanvasRenderingContext2D = internalCanvas.getContext('2d');
            internalContext.drawImage(img, 0, 0);
            
            this.internalBuffer = internalContext.getImageData(0, 0, this.width, this.height).data;
        }
        else if (img.magic && img.magic == 19778) // a Bitmap - 19778 = 'BM'
        {
            this.width = img.width;
            this.height = img.height;
            this.internalBuffer = img.pixels;
            this.bytesPerPixel = img.bytesPerPixel;
        }
        else
        {
            throw new Error();
        }
    }
    map(tu: number, tv: number): Color4 {
        
        if (this.internalBuffer)
        {
            var u = Math.abs(((tu * this.width) % this.width)) >> 0;
            var v = Math.abs(((tv * this.height) % this.height)) >> 0;
            
            var index = (u + v * this.width) * this.bytesPerPixel;
            
            var r = null;
            var g = null;
            var b = null;
            var a = 255;
            
            // normal canvas/image is RGBA
            //var r = this.internalBuffer[index + 0];
            //var g = this.internalBuffer[index + 1];
            //var b = this.internalBuffer[index + 2];
            //var a = this.internalBuffer[index + 3];
            
            // BMP file format defines ABGR, not RGBA
            
            if (this.bytesPerPixel == 3)
            {
                b = this.internalBuffer[index + 0];
                g = this.internalBuffer[index + 1];
                r = this.internalBuffer[index + 2];
            }
            else if (this.bytesPerPixel == 4)
            {
                a = this.internalBuffer[index + 0];
                b = this.internalBuffer[index + 1];
                g = this.internalBuffer[index + 2];
                r = this.internalBuffer[index + 3];
            }
            else
            {
                throw new Error();
            }
            
            return new Color4(r / 255.0, g / 255.0, b / 255.0, a / 255.0);
        }
        else
        {
            return new Color4(1, 1, 1, 1);
        }
    }
}

function ReadObjFile(ls: string[]): Geometry {
    
    return null;
    // Wavefront OBJ format
    // http://www.martinreddy.net/gfx/3d/OBJ.spec
    // http://en.wikipedia.org/wiki/Wavefront_.obj_file
    // http://meshlab.sourceforge.net/ - software for editing meshes
    
    // var geometry = new Geometry();
    // var uv = geometry.uvSet;
    
    // var vertexNormalIndex = 0;
    
    // for (var i = 0; i < ls.length; i++)
    // {
        // var l = ls[i].trim();
        
        // if (l.length <= 1) { continue; }
    
        // if (l.substr(0, 2) == "v ")
        // {
            // var vs = l.substring(2).split(' ').map(function(x) { return parseFloat(x); });;
            // geometry.vertices.push(new Vertex(vs[0], vs[1], vs[2]));
        // }
        // else if (l.substr(0, 3) == "vt ")
        // {
            // var vts = l.substring(3).split(' ').map(function(x) { return parseFloat(x); });;
            // uv.uvs.push([vts[0], vts[1]]);
        // }
        // else if (l.substr(0, 3) == "vn ")
        // {
            // // note that this code requires the vn line to come after the v line - probably going to be the case, but could fail
            // var vns = l.substring(3).split(' ').map(function(x) { return parseFloat(x); });
            // geometry.vertexNormals.push(new Vector3(vns[0], vns[1], vns[2]));
        // }
        // else if (l.substr(0, 2) == "f ")
        // {
            // // do nothing here - we do another pass below to read the faces
        // }
        // else if (l.substr(0, 7) == "usemtl ")
        // {
            // // use material
            // // EX: usemtl PCBbar01
            // //geometry.textureFile = l.Split()[1];
        // }
        // else if (l.substr(0, 2) == "s ")
        // {
            // // scale?
            // // EX: s 0
            // //geometry.s = l;
        // }
        // else if (l.substr(0, 2) == "o ")
        // {
            // // EX: o racketRH
        // }
        // else if (l.substr(0, 2) == "g\t")
        // {
            // // group?
            // // EX: g\t\tFigure\t\t1
            // //geometry.g = l;
        // }
        // else if (l.substr(0, 2) == "g ")
        // {
    
        // }
        // else if (l.substr(0, 1) == "#")
        // {
            // // comment
        // }
        // else
        // {
            // throw new Error();
        // }
    // }
    
    // for (var i = 0; i < ls.length; i++)
    // {
        // var l = ls[i].trim();
    
        // if (l.substr(0, 2) == "f ")
        // {
            // // EX: f 2370/4 2369/1 965/2
            // // these are 1-indexed
            // // 3 vertices, first half (before the slash) is the index into the vertices
            // // second half is the index into the vts (which i assume are uvs, but they're not in [0,1], so not sure
            
            // // sometimes there are 3 parts of the slashes?
            // // 123/456/789
            // // index into vertex normals?
            
            // // t = [ [ 2370 , 4] , [ 2369 , 1 ] , [ 965 , 2 ] ]
            // var t = l.substr(2).split(' ').map(function(x) { return x.split('/').map(function(s) { return parseInt(s); }); });
            // geometry.polygons.push(Polygon.Make(geometry.vertices, 0, 0, ...t.map(function(x) { return x[0]; })));
            
            // for (var k = 0; k < t.length; k++)
            // {
                // if (t[k][0] != t[k][1])
                // {
                    // uv.pvi.push([geometry.polygons.length-1, t[k][0], t[k][1]]);
                // }
            // }
        // }
    // }
    
    // return geometry;
}
function WriteGeometryToThreeJS(): any {
    
    return null;
    // this is old and needs to be brought up to speed
    
    //var geometry = new THREE.Geometry();
    //
    //for (var i = 0; i < this.vertices.length; i++)
    //{
    //  geometry.vertices.push(new THREE.Vector3(this.vertices[i][0], this.vertices[i][1], this.vertices[i][2]));
    //}
    //
    //for (var i = 0; i < this.polygons.length; i++)
    //{
    //  if (this.polygons[i].vertices.length == 3)
    //  {
    //      geometry.faces.push(new THREE.Face3(this.polygons[i][2], this.polygons[i][3], this.polygons[i][4]));
    //  }
    //  else if (this.polygons[i].length == 4)
    //  {
    //      // Face3( a, b, c, normal, color, materialIndex )
    //      
    //      geometry.faces.push(new THREE.Face3(this.polygons[i][2], this.polygons[i][3], this.polygons[i][4]));
    //      geometry.faces.push(new THREE.Face3(this.polygons[i][2], this.polygons[i][4], this.polygons[i][5]));
    //      
    //      //geometry.faces.push(new THREE.Face4(this.polygons[i][2], this.polygons[i][3], this.polygons[i][4], this.polygons[i][5]));
    //  }
    //  else
    //  {
    //      throw new Error();
    //  }
    //}
    //
    //return geometry;
}

} // keep this when compiling to a normal .js, remove when compiling to a module

// Alt+2,1

