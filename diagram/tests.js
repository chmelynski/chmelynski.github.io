
var a0 = p.add(100, 100);
var b0 = p.add(100, 200);
var r0 = p.add(136, 149);
var a1 = p.add(285, 103);
var b1 = p.add(285, 203);
var r1 = p.add(235, 148);
var a2 = p.add(587, 112);
var b2 = p.add(587, 212);
var r2 = p.add(535, 162);
var a3 = p.add(733, 110);
var b3 = p.add(733, 210);
var r3 = p.add(772, 159);

var rad0 = Math.hypot(r0.y - a0.y, r0.x - a0.x);
var rad1 = Math.hypot(r1.y - a1.y, r1.x - a1.x);
var rad2 = Math.hypot(r2.y - a2.y, r2.x - a2.x);
var rad3 = Math.hypot(r3.y - a3.y, r3.x - a3.x);

var p0 = new Path2D(['M',a0.x,a0.y,'A',rad0,rad0,'0','0','0',b0.x,b0.y].join(' '));
var p1 = new Path2D(['M',a1.x,a1.y,'A',rad1,rad1,'0','0','1',b1.x,b1.y].join(' '));
var p2 = new Path2D(['M',a2.x,a2.y,'A',rad2,rad2,'0','1','0',b2.x,b2.y].join(' '));
var p3 = new Path2D(['M',a3.x,a3.y,'A',rad3,rad3,'0','1','1',b3.x,b3.y].join(' '));

ctx.stroke(p0);
ctx.stroke(p1);
ctx.stroke(p2);
ctx.stroke(p3);


ctx.fillStyle = 'black';

p.add(584, 227);
p.add(447, 341);
p.add(162, 301);
p.add(252, 207);

var a = p.get();
var b = p.get();
var c = p.get();
var d = p.get();

var e = H(a, b);
var f = V(c, d);

Dot(ctx, e);
Dot(ctx, f);

Line(ctx, a, e);
Line(ctx, e, b);
Line(ctx, c, f);
Line(ctx, f, d);





var p0 = p.add(147, 230);
var p1 = p.add(399, 232);
var p2 = p.add(678, 198);
var p3 = p.add(753, 241);

var grad1 = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
var grad2 = ctx.createRadialGradient(p2.x, p2.y, 20, p3.x, p3.y, 200);

grad1.addColorStop(0, 'rgb(255,0,0)');
grad1.addColorStop(1, 'rgb(255,255,255)');
grad2.addColorStop(0, 'rgb(255,0,0)');
grad2.addColorStop(1, 'rgb(255,255,255)');

ctx.fillStyle = grad1;
ctx.fillRect(0, 0, ctx.canvas.width / 2, ctx.canvas.height);

ctx.fillStyle = grad2;
ctx.fillRect(ctx.canvas.width / 2, 0, ctx.canvas.width / 2, ctx.canvas.height);




p.add(213, 56);
p.add(257, 187);
p.add(218, 243);

var ps = p.getn(2);
var c = p.get();

var qs = Radial(ps, c, 5);

ctx.fillStyle = 'black';
Dots(ctx, qs);

Segments2(ctx, ps.concat(qs));
Z(ctx);
S(ctx);




ctx.fillStyle = 'black';

p.add(345, 268);
p.add(494, 207);

var a = p.get();
var b = p.get();

var [c, d] = Struts(a, b, [1/3,2/3]);

Line(ctx, a, b);
Dot(ctx, c);
Dot(ctx, d);

B(ctx); Circle(ctx, a, c); S(ctx);
B(ctx); Circle(ctx, a, d); S(ctx);
B(ctx); Circle(ctx, a, b); S(ctx);




ctx.fillStyle = 'black';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = '14pt Arial';

p.add(100, 100);
p.add(200, 100);
p.add(200, 200);

B(ctx);
M(ctx, p.get());
L(ctx, p.get());
L(ctx, p.get());
S(ctx);

p.add(122, 316);
p.add(192, 362);

var a = p.get();

B(ctx);
Circle(ctx, a, p.get());
S(ctx);

T(ctx, a, 'circle');

p.add(396, 196);
p.add(461, 289);

B(ctx);
Rect(ctx, p.get(), p.get());
S(ctx);

p.add(342, 186);
p.add(341, 338);
p.add(434, 393);
p.add(358, 478);

B(ctx);
M(ctx, p.get());
C(ctx, p.get(), p.get(), p.get());
S(ctx);

p.add(283, 53);
p.add(355, 92);

TableWithText(ctx, p.get(), p.get(), [['a','b'],['c','d']]);


var a = p.add(189, 258);
var b = p.add(298, 92);
p.add(512, 334);
p.add(765, 148);

ctx.fillStyle = 'black';

ctx.save();
ctx.translate(a.x, a.y);
ctx.scale(0.1, 0.1);
ctx.fill(new Path2D(assets.get('filename.path')));
ctx.restore();

var q = p.add(389, 258);
ctx.drawImage(assets.get('img.png'), q.x, q.y);

