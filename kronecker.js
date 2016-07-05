
var Griddl = (Griddl || {});

Griddl.Math = (function () {
	
	function GriddlMath() { }
	
	var varnameDict = {};
	varnameDict['infty'] = '\\infty';
	varnameDict['alpha'] = '\\alpha';
	varnameDict['beta'] = '\\beta';
	varnameDict['chi'] = '\\chi';
	varnameDict['delta'] = '\\delta';
	varnameDict['epsilon'] = '\\epsilon';
	varnameDict['varepsilon'] = '\\varepsilon';
	varnameDict['eta'] = '\\eta';
	varnameDict['gamma'] = '\\gamma';
	varnameDict['iota'] = '\\iota';
	varnameDict['kappa'] = '\\kappa';
	varnameDict['lambda'] = '\\lambda';
	varnameDict['mu'] = '\\mu';
	varnameDict['nu'] = '\\nu';
	varnameDict['omega'] = '\\omega';
	varnameDict['phi'] = '\\phi';
	varnameDict['varphi'] = '\\varphi';
	varnameDict['pi'] = '\\pi';
	varnameDict['psi'] = '\\psi';
	varnameDict['rho'] = '\\rho';
	varnameDict['sigma'] = '\\sigma';
	varnameDict['tau'] = '\\tau';
	varnameDict['theta'] = '\\theta';
	varnameDict['upsilon'] = '\\upsilon';
	varnameDict['xi'] = '\\xi';
	varnameDict['zeta'] = '\\zeta';
	varnameDict['Delta'] = '\\Delta';
	varnameDict['Lambda'] = '\\Lambda';
	varnameDict['Gamma'] = '\\Gamma';
	varnameDict['Omega'] = '\\Omega';
	varnameDict['Phi'] = '\\Phi';
	varnameDict['Pi'] = '\\Pi';
	varnameDict['Psi'] = '\\Psi';
	varnameDict['Sigma'] = '\\Sigma';
	varnameDict['Theta'] = '\\Theta';
	varnameDict['Upsilon'] = '\\Upsilon';
	varnameDict['Xi'] = '\\Xi';
	varnameDict['aleph'] = '\\aleph';
	varnameDict['beth'] = '\\beth';
	varnameDict['daleth'] = '\\daleth';
	varnameDict['gimel'] = '\\gimel';
	
	var fixedCharWidthPx = 14;
	var fixedCharHeightPx = 16;
	var padding = 4;
	
	var InfixBoxtree = function(subs, infixText) {
		
		var width = 0;
		var height = fixedCharHeightPx;
		var subboxes = [];
		
		width += padding;
		
		for (var i = 1; i < subs.length; i++)
		{
			var subbox = subs[i].ToBoxtree();
			subboxes.push(subbox);
			var infixWidth = fixedCharWidthPx * infixText.length; // or measureText(infixText)
			width += subbox.width;
			
			if (i < subs.length - 1)
			{
				width += padding + infixWidth + padding;
				subboxes.push({ width : infixWidth , height : fixedCharHeightPx , subboxes : [] , text : infixText , drawBox : false  });
			}
			
			if (subbox.height > height) { height = subbox.height; }
		}
		
		width += padding;
		height += padding + padding;
		
		return  { width : width , height : height , subboxes : subboxes , drawBox : true  };
	};
	var PrefixBoxtree = function(subs, prefixText) {
		
		var width = 0;
		var height = fixedCharHeightPx;
		var subboxes = [];
		
		var prefixWidth = fixedCharWidthPx * prefixText.length; // or measureText(prefixText)
		
		width += padding + prefixWidth + padding;
		
		subboxes.push({ width : prefixWidth , height : fixedCharHeightPx , subboxes : [] , text : prefixText , drawBox : false });
		
		for (var i = 1; i < subs.length; i++)
		{
			var subbox = subs[i].ToBoxtree();
			
			width += subbox.width + padding;
			
			if (subbox.height > height) { height = subbox.height; }
			
			subboxes.push(subbox);
		}
		
		height += padding + padding;
		
		return  { width : width , height : height , subboxes : subboxes , drawBox : true  };
	};
	var AtomBoxtree = function(text) {
		var width = fixedCharWidthPx * text.length; // or measureText(text)
		var height = fixedCharHeightPx;
		return  { width : width , height : height , subboxes : [] , text : text , drawBox : true };
	};
	
	var CalculateBoxtreeTopLefts = GriddlMath.CalculateBoxtreeTopLefts = function(boxtree) { CalculateBoxtreeTopLeftsRec(boxtree, 0, 0); };
	
	var CalculateBoxtreeTopLeftsRec = function(boxtree, left, top) {
		
		boxtree.left = left;
		boxtree.top = top;
		
		left += padding;
		
		for (var i = 0; i < boxtree.subboxes.length; i++)
		{
			var subbox = boxtree.subboxes[i];
			var subheight = subbox.height;
			var heightgap = (boxtree.height - subbox.height) / 2;
			CalculateBoxtreeTopLeftsRec(subbox, left, top + heightgap);
			left += subbox.width + padding;
		}
	};
	
	var ConvertBoxtreeToSVG = GriddlMath.ConvertBoxtreeToSVG = function(boxtree) {
		
		var eltStrings = [];
		
		BoxtreeToRectRec(boxtree, eltStrings);
		
		var xmlnss = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
		var svg = '<svg ' + xmlnss + ' width="' + (boxtree.width + 2).toString() + '" height="' + (boxtree.height + 2).toString() + '">' + eltStrings.join('') + '</svg>'
		
		return svg;
	};
	var BoxtreeToRectRec = function(boxtree, eltStrings) {
		var x = (Math.floor(boxtree.left, 1) + 0.5).toString();
		var y = (Math.floor(boxtree.top, 1) + 0.5).toString();
		var width = (Math.floor(boxtree.width, 1)).toString();
		var height = (Math.floor(boxtree.height, 1)).toString();
		
		if (boxtree.drawBox)
		{
			var rect = '<rect stroke="black" fill="white" ' + 'x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '"></rect>';
			eltStrings.push(rect);
		}
		
		if (boxtree.text)
		{
			var x = (Math.floor(boxtree.left + 2, 1) + 0.5).toString();
			var y = (Math.floor(boxtree.top + boxtree.height - 3, 1) + 0.5).toString();
			var text = '<text font-family="Courier New" ' + 'x="' + x + '" y="' + y + '">' + boxtree.text + '</text>';
			eltStrings.push(text);
		}
		
		for (var i = 0; i < boxtree.subboxes.length; i++) { BoxtreeToRectRec(boxtree.subboxes[i], eltStrings); }
		
		//if (boxtree.drawBox)
		//{
		//	eltStrings.push('</rect>');
		//}
	};
	
	// sexp : { contents : '()' , children : [] }
	// Exp : { subs : [ Add , Exp , Variable ] }
	// Variable : { name : string , latex : string }
	// Matrix : { value : [[Exp,Exp,Exp],[Exp,Exp,Exp],[Exp,Exp,Exp]] }
	
	// (complex real imag) => Complex
	// (+ Complex Complex) => Complex
	// (- Complex Complex) => Complex
	// (* Complex Complex) => Complex
	
	// (vector a b c) => Vector
	// (+ Vector Vector) => Vector
	// (- Vector Vector) => Vector
	// (dot Vector Vector) => float
	// (cross Vector Vector) => Vector
	// (length Vector) => (sqrt (dot v v)) => float
	
	// (matrix vec vec vec) => Matrix
	// (* Matrix Matrix) => Matrix
	// (determinant Matrix) => float
	// (inverse Matrix) => Matrix
	// (transpose Matrix) => Matrix
	
	// algorithmic transformation: uses built-in functions
	// logical transformation: uses template rules and substitution (theoretically complete, but harder)
	
	// MultiplyPolynomial : (a + b) * (c + d) => ac + bc + ad + bd
	// Factor : ax + bx => (a + b)x
	
	// a + (b + c) => a + b + c
	GriddlMath.Consolidate = function(exp) {
		
		
	};
	// perform arithmetic operations on constants, maybe also reduce x + 0 and x * 1
	GriddlMath.Arithmetic = function(exp) {
		
		
	};
	
	GriddlMath.Factor = function(exp) {
		
		
	};
	
	GriddlMath.MatrixMultiply = function(a, b) {
		
		var matrix = new Exp();
		matrix.subs.push(new Matrix());
		
		for (var i = 1; i < b.subs.length; i++)
		{
			var vector = new Exp();
			vector.subs.push(new Vector());
			
			for (var j = 1; j < a.subs[1].subs.length; j++)
			{
				var add = new Exp();
				add.subs.push(new Add());
				
				for (var k = 1; k < a.subs.length; k++)
				{
					var mul = new Exp();
					mul.subs.push(new Mul());
					
					//console.log(i, j, k, a.subs[k].subs[j].name, b.subs[i].subs[k].name);
					mul.subs.push(a.subs[k].subs[j].Clone());
					mul.subs.push(b.subs[i].subs[k].Clone());
					
					add.subs.push(mul);
				}
				
				vector.subs.push(add);
			}
			
			matrix.subs.push(vector);
		}
		
		return matrix;
	}
	GriddlMath.DotProduct = function(a, b) {
		
		var add = new Exp();
		add.subs.push(new Add());
		
		for (var i = 1; i < a.subs.length; i++)
		{
			var mul = new Exp();
			mul.subs.push(new Mul());
			
			mul.subs.push(a.subs[i].Clone());
			mul.subs.push(b.subs[i].Clone());
			
			add.subs.push(mul);
		}
		
		return add;
	};
	GriddlMath.CrossProduct = function(a, b) {
		
		var vector = new Exp();
		vector.subs.push(new Vector());
		
		var sub = null;
		var mul = null;
		
		sub = new Exp();
		sub.subs.push(new Sub());
		mul = new Exp();
		mul.subs.push(new Mul());
		mul.subs.push(b.subs[3].Clone());
		mul.subs.push(a.subs[2].Clone());
		sub.subs.push(mul);
		mul = new Exp();
		mul.subs.push(new Mul());
		mul.subs.push(a.subs[3].Clone());
		mul.subs.push(b.subs[2].Clone());
		sub.subs.push(mul);
		vector.subs.push(sub);
		
		sub = new Exp();
		sub.subs.push(new Sub());
		mul = new Exp();
		mul.subs.push(new Mul());
		mul.subs.push(b.subs[1].Clone());
		mul.subs.push(a.subs[3].Clone());
		sub.subs.push(mul);
		mul = new Exp();
		mul.subs.push(new Mul());
		mul.subs.push(a.subs[1].Clone());
		mul.subs.push(b.subs[3].Clone());
		sub.subs.push(mul);
		vector.subs.push(sub);
		
		sub = new Exp();
		sub.subs.push(new Sub());
		mul = new Exp();
		mul.subs.push(new Mul());
		mul.subs.push(b.subs[2].Clone());
		mul.subs.push(a.subs[1].Clone());
		sub.subs.push(mul);
		mul = new Exp();
		mul.subs.push(new Mul());
		mul.subs.push(a.subs[2].Clone());
		mul.subs.push(b.subs[1].Clone());
		sub.subs.push(mul);
		vector.subs.push(sub);
		
		return vector;
	};
	GriddlMath.ExpandDiv = function(x) {
		
	};
	GriddlMath.ExpandCurl = function(x) {
		
	};
	
	var Read = GriddlMath.Read = function(strOrSexp) {
		
		var type = typeof(strOrSexp);
		var sexp = null;
		
		if (type == 'string')
		{
			sexp = Griddl.Lang.ReadFrce(strOrSexp).root;
		}
		else
		{
			sexp = strOrSexp;
		}
		
		if (sexp.contents == '()')
		{
			var x = new Exp();
			
			for (var i = 0; i < sexp.children.length; i++)
			{
				x.subs.push(Read(sexp.children[i]));
			}
			
			return x;
		}
		else
		{
			if (GriddlMath[sexp.contents])
			{
				return new GriddlMath[sexp.contents](sexp.contents);
			}
			else
			{
				return new Variable(sexp.contents);
			}
		}
	};
	
	var Exp = (function() {
		
		function Exp() {
			this.subs = [];
		}
		
		Exp.prototype.Clone = function() {
			var clone = new Exp();
			
			for (var i = 0; i < this.subs.length; i++)
			{
				if (this.subs[i].Clone)
				{
					clone.subs.push(this.subs[i].Clone());
				}
				
				else // this sub-branch should be handled in a parent class of function, Number, other leaf nodes
				{
					clone.subs.push(new this.subs[i].constructor());
				}
			}
			
			return clone;
		};
		
		Exp.prototype.Substitute = function(varname, exp) {
			
			if (typeof(exp) == 'string') { exp = Read(exp); }
			var clone = this.Clone();
			SubstituteInPlace(clone, varname, exp);
			return clone;
		};
		var SubstituteInPlace = function(clone, varname, exp) {
			
			for (var i = 0; i < clone.subs.length; i++)
			{
				if (clone.subs[i].constructor.name == 'Variable' && clone.subs[i].name == varname)
				{
					clone.subs[i] = exp.Clone();
				}
				else if (clone.subs[i].Substitute)
				{
					SubstituteInPlace(clone.subs[i], varname, exp);
				}
			}
		};
		
		Exp.prototype.ToLatex = function() {
			return this.subs[0].ToLatex(this.subs);
		};
		
		Exp.prototype.ToBoxtree = function() {
			return this.subs[0].ToBoxtree(this.subs);
		};
		
		Exp.prototype.Type = function() { return 'Exp'; }
		
		Exp.prototype.ExpandPolynomial = function() {
			
			// this should just be part of the resolution of multiplication?
			
			// exp = { subs : [ Mul , { subs : [ Add , Exp , Exp ] } , { subs : [ Add , Exp , Exp ] } ] }
			
			var exp = this;
			
			if (exp.Type() != 'Exp' || exp.subs[0].Type() != 'Mul') { return exp; } // also should check that the 2nd level subs are Adds
			
			var prod = 1;
			var orders = [];
			
			for (var i = 1; i < exp.subs.length; i++)
			{
				var order = exp.subs[i].subs.length - 1;
				orders.push(order);
				prod *= order;
			}
			
			var divisors = [];
			for (var i = 0; i < orders.length; i++)
			{
				divisors.push(orders[i]);
			}
			divisors[divisors.length - 1] = 1;
			for (var i = divisors.length - 2; i >= 0; i--)
			{
				divisors[i] = divisors[i+1] * divisors[i];
			}
			
			var addexp = new Exp();
			addexp.subs.push(new Add());
			
			for (var i = 0; i < prod; i++)
			{
				var mulexp = new Exp();
				mulexp.subs.push(new Mul());
				
				var remainder = i;
				for (var k = 0; k < orders.length; k++)
				{
					//var divisor = ((k < orders.length - 1) ? orders[k] : 1);
					var divisor = divisors[k];
					var index = Math.floor(remainder / divisor, 1);
					remainder = remainder % divisor;
					mulexp.subs.push(exp.subs[k+1].subs[index+1].Clone());
				}
				
				addexp.subs.push(mulexp);
			}
			
			return addexp;
		};
		Exp.prototype.Arithmetic = function() {
			
			var exp = this;
			
			
		};
		
		return Exp;
	})();
	var Variable = (function() {
		
		function Variable(name) {
			this.name = name;
			this.latex = name;
			
			var varname = name;
			var suffix = '';
			var indexOfUnderscore = name.indexOf('_');
			if (indexOfUnderscore > 0)
			{
				varname = name.substr(0, indexOfUnderscore);
				suffix = name.substr(indexOfUnderscore);
			}
			
			if (varnameDict[varname])
			{
				this.latex = varnameDict[varname] + suffix; // change this if we implement _bold
			}
		}
		
		Variable.prototype.Clone = function() {
			return new Variable(this.name);
		};
		
		Variable.prototype.ToLatex = function() {
			return this.latex;
		};
		
		Variable.prototype.ToBoxtree = function() { return AtomBoxtree(this.name); };
		Variable.prototype.Type = function() { return 'Variable'; }
		
		return Variable;
	})();
	var Equals = GriddlMath['='] = (function() {
		
		function Equals() { }
		
		Equals.prototype.ToLatex = function(subs) {
			return subs[1].ToLatex() + ' = ' + subs[2].ToLatex();
		};
		
		Equals.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, '='); };
		Equals.prototype.Type = function() { return 'Equals'; }
		
		return Equals;
	})();
	var Add = GriddlMath['+'] = (function() {
		
		function Add() { }
		
		Add.prototype.ToLatex = function(subs) {
			var s = '';
			
			for (var i = 1; i < subs.length; i++)
			{
				s += subs[i].ToLatex();
				if (i < subs.length - 1) { s += ' + '; }
			}
			
			return s;
		};
		
		Add.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, '+'); };
		Add.prototype.Type = function() { return 'Add'; }
		
		return Add;
	})();
	var Sub = GriddlMath['-'] = (function() {
		
		function Sub() { }
		
		Sub.prototype.ToLatex = function(subs) {
			if (subs.length == 2)
			{
				return '-' + subs[1].ToLatex();
			}
			else
			{
				return subs[1].ToLatex() + ' - ' + subs[2].ToLatex();
			}
		};
		
		Sub.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, '-'); };
		Sub.prototype.Type = function() { return 'Sub'; }
		
		return Sub;
	})();
	var Mul = GriddlMath['*'] = (function() {
		
		function Mul() { }
		
		Mul.prototype.ToLatex = function(subs) {
			var s = '';
			
			for (var i = 1; i < subs.length; i++)
			{
				var preparen = '';
				var postparen = '';
				
				if (subs[i].Type() == 'Exp' && (subs[i].subs[0].Type() == 'Add' || subs[i].subs[0].Type() == 'Sub'))
				{
					preparen = '(';
					postparen = ')';
				}
				
				s += preparen + subs[i].ToLatex() + postparen;
				if (i < subs.length - 1) { s += ' '; } // put multiplication sign here
			}
			
			return s;
		};
		
		Mul.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, '*'); };
		Mul.prototype.Type = function() { return 'Mul'; }
		
		return Mul;
	})();
	var Div = GriddlMath['/'] = (function() {
		
		function Div() { }
		
		Div.prototype.ToLatex = function(subs) {
			return '\\frac{'+subs[1].ToLatex()+'}{'+subs[2].ToLatex()+'}';
		};
		
		Div.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, '/'); };
		Div.prototype.Type = function() { return 'Div'; }
		
		return Div;
	})();
	var Pow = GriddlMath['^'] = (function() {
		
		function Pow() { }
		
		Pow.prototype.ToLatex = function(subs) {
			return subs[1].ToLatex() + '^{' + subs[2].ToLatex() + '}';
		};
		
		Pow.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, '^'); };
		Pow.prototype.Type = function() { return 'Pow'; }
		
		return Pow;
	})();
	
	var Neg = GriddlMath.neg = (function() {
		
		function Neg() { }
		
		Neg.prototype.ToLatex = function(subs) {
			
			var preparen = '';
			var postparen = '';
			
			if (subs[1].Type() == 'Exp' && (subs[1].subs[0].Type() == 'Add' || subs[1].subs[0].Type() == 'Sub'))
			{
				preparen = '(';
				postparen = ')';
			}
		
			return '-' + preparen + subs[1].ToLatex() + postparen;
		};
		
		Neg.prototype.Type = function() { return 'Neg'; }
		
		return Neg;
	})();
	var Inv = GriddlMath.inv = (function() {
		
		function Inv() { }
		
		Inv.prototype.ToLatex = function(subs) {
			return '\\frac{'+'1'+'}{'+subs[1].ToLatex()+'}';
		};
		
		Inv.prototype.Type = function() { return 'Inv'; }
		
		return Inv;
	})();
	
	// sec, csc, cot, arcsin, arccos, arctan, arcsec, arccsc, arccot
	var Trig = GriddlMath.sin = GriddlMath.cos = GriddlMath.tan = (function() {
		
		function Trig(fn) { 
			this.fn = fn;
		}
		
		// \sin, \cos, \tan, \cot, \sec, \csc, \arcsin, \arccos, \arctan
		Trig.prototype.ToLatex = function(subs) {
			return '\\' + this.fn + ' ' + subs[1].ToLatex();
		};
		
		Trig.prototype.Type = function() { return this.fn; }
		
		return Trig;
	})();
	
	var Expn = GriddlMath.exp = (function() {
		
		function Expn() { }
		
		Expn.prototype.ToLatex = function(subs) {
			return 'e^' + subs[1].ToLatex();
		};
		
		Expn.prototype.Type = function() { return 'Expn'; }
		
		return Expn;
	})();
	var Log = GriddlMath.log = (function() {
		
		function Log() { }
		
		Log.prototype.ToLatex = function(subs) {
			return '\\log_{' + subs[1].ToLatex() + '}' + subs[2].ToLatex();
		};
		
		Log.prototype.Type = function() { return 'Log'; }
		
		return Log;
	})();
	var Ln = GriddlMath.ln = (function() {
		
		function Ln() { }
		
		Ln.prototype.ToLatex = function(subs) {
			return '\\ln ' + subs[1].ToLatex();
		};
		
		Ln.prototype.Type = function() { return 'Ln'; }
		
		return Ln;
	})();
	
	
	// what's the point of having a full derivative as a separate concept?  isn't it just a special case of a partial derivative?
	var Derivative = GriddlMath.dd = (function() {
		
		function Derivative() { }
		
		Derivative.prototype.ToLatex = function(subs) {
			return '\\frac{d' + subs[1].ToLatex() + '}{d' + subs[2].ToLatex() + '}'; // df/dx
			//return '\\frac{\\partial' + subs[1].ToLatex() + '}{\\partial' + subs[2].ToLatex() + '}'; // partial
			//return subs[1].ToLatex() + '\''; // prime
		};
		
		Derivative.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, 'dd'); };
		
		return Derivative;
	})();
	var PartialDerivative = GriddlMath.ddp = (function() {
		
		function PartialDerivative() { }
		
		PartialDerivative.prototype.ToLatex = function(subs) {
			//return '\\frac{d' + subs[1].ToLatex() + '}{d' + subs[2].ToLatex() + '}'; // df/dx
			return '\\frac{\\partial ' + subs[1].ToLatex() + '}{\\partial ' + subs[2].ToLatex() + '}'; // partial
			//return subs[1].ToLatex() + '\''; // prime
		};
		
		PartialDerivative.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, 'ddp'); };
		
		return PartialDerivative;
	})();
	var Integral = GriddlMath.int = (function() {
		
		function Integral() { }
		
		Integral.prototype.ToLatex = function(subs) {
			return '\\int ' + subs[2].ToLatex() + ' d' + subs[1].ToLatex(); // single integral, with dx
			//return '\\iint ' + subs[2].ToLatex() + ' d' + subs[1].ToLatex(); // double integral, with dx
			//return '\\iiint ' + subs[2].ToLatex() + ' d' + subs[1].ToLatex(); // triple integral, with dx
		};
		
		Integral.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, 'int'); };
		
		return Integral;
	})();
	
	var Limit = GriddlMath.limit = (function() {
		
		function Limit() { }
		
		Limit.prototype.ToLatex = function(subs) {
			// \lim_{x \to \infty}
			return '\\lim_{' + subs[1].ToLatex() + ' \\to ' + subs[2].ToLatex() + '} ' + subs[3].ToLatex();
		};
		
		Limit.prototype.Type = function() { return 'Limit'; }
		
		return Limit;
	})();
	var Sum = GriddlMath.sum = (function() {
		
		function Sum() { }
		
		Sum.prototype.ToLatex = function(subs) {
			// \sum_{n=1}^{\infty}a_n
			return '\\sum_{' + subs[1].ToLatex() + '=' + subs[2].ToLatex() + '}^{' + subs[3].ToLatex() + '}' + subs[4].ToLatex();
		};
		
		Sum.prototype.Type = function() { return 'Sum'; }
		
		return Sum;
	})();
	var Product = GriddlMath.product = (function() {
		
		function Product() { }
		
		Product.prototype.ToLatex = function(subs) {
			// \prod_{n=1}^{\infty}a_n
			return '\\prod_{' + subs[1].ToLatex() + '=' + subs[2].ToLatex() + '}^{' + subs[3].ToLatex() + '}' + subs[4].ToLatex();
		};
		
		Product.prototype.Type = function() { return 'Product'; }
		
		return Product;
	})();
	
	var Grad = GriddlMath.grad = (function() {
		
		function Grad() { }
		
		Grad.prototype.ToLatex = function(subs) {
			return '\\nabla ' + subs[1].ToLatex();
		};
		
		Grad.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, 'grad'); };
		
		return Grad; 
	})();
	var NablaDotDiv = GriddlMath.div = (function() {
		
		function NablaDotDiv() { }
		
		NablaDotDiv.prototype.ToLatex = function(subs) {
			return '\\nabla \\cdot ' + subs[1].ToLatex();
		};
		
		NablaDotDiv.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, 'div'); };
		
		return NablaDotDiv;
	})();
	var Curl = GriddlMath.curl = (function() {
		
		function Curl() { }
		
		Curl.prototype.ToLatex = function(subs) {
			return '\\nabla \\times ' + subs[1].ToLatex();
		};
		
		Curl.prototype.ToBoxtree = function(subs) { return PrefixBoxtree(subs, 'curl'); };
		
		return Curl;
	})();
	
	var Vector = GriddlMath.vector = (function() {
		
		function Vector() {
			
		};
		
		Vector.prototype.ToLatex = function(subs) {
			
			var lines = [];
			
			for (var i = 1; i < subs.length; i++)
			{
				lines.push(subs[i].ToLatex());
			}
			
			return '\\begin{pmatrix} ' + lines.join(' \\\\ ') + ' \\end{pmatrix}'
		};
		
		Vector.prototype.ToBoxtree = function() { throw new Error(); };
		Vector.prototype.Type = function() { return 'Vector'; }
		
		return Vector;
	})();
	var Matrix = GriddlMath.matrix = (function() {
		
		// (matrix (vector 0 1 2) (vector 3 4 5) (vector 6 7 8))
		// (matrix (row 0 1 2) (row 3 4 5) (row 6 7 8))
		// (matrix (col 0 1 2) (col 3 4 5) (col 6 7 8))
		// matrix:          \begin{matrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{matrix}
		// bracket matrix: \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{bmatrix}
		// paren matrix:   \begin{pmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{pmatrix}
		// determinant: \left| \begin{array}{ccc} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 0 \end{array} \right|
		// determinant: \det(A)
		
		// there is now the question of how to construct the matrix from sexps - it is not quite as straightforward as the others
		function Matrix() {
			
		}
		
		Matrix.prototype.ToLatex = function(subs) {
			
			var rows = [];
			
			for (var j = 1; j < subs[1].subs.length; j++)
			{
				rows.push([]);
			}
			
			for (var i = 1; i < subs.length; i++)
			{
				for (var j = 1; j < subs[i].subs.length; j++)
				{
					rows[j-1].push(subs[i].subs[j].ToLatex());
				}
			}
			
			var lines = []
			
			for (var j = 1; j < subs[1].subs.length; j++)
			{
				lines.push(rows[j-1].join(' & '));
			}
			
			return '\\begin{pmatrix} ' + lines.join(' \\\\ ') + ' \\end{pmatrix}'
		};
		
		Matrix.prototype.ToBoxtree = function() { throw new Error(); };
		Matrix.prototype.Type = function() { return 'Matrix'; }
		
		return Matrix;
	})();
	
	var Dot = GriddlMath.dot = (function() {
		
		function Dot() { }
		
		Dot.prototype.ToLatex = function(subs) {
			return subs[1].ToLatex() + ' \\cdot ' + subs[2].ToLatex();
		};
		
		Dot.prototype.Type = function() { return 'Dot'; }
		
		return Dot;
	})();
	var Cross = GriddlMath.cross = (function() {
		
		function Cross() { }
		
		Cross.prototype.ToLatex = function(subs) {
			return subs[1].ToLatex() + ' \\times ' + subs[2].ToLatex();
		};
		
		Cross.prototype.Type = function() { return 'Cross'; }
		
		return Cross;
	})();
	
	// vector with arrow hat: \vec{v}
	// boldface vector: \mathbf{v}
	// norm: ||\vec{v}||
	// trace: \operatorname{tr}(A)
	// dimension: \dim(A)
	
	// \frac{a}{b} - yields inline fraction in inline mode
	// \dfrac{a}{b} - always yields display fraction?
	
	// to align at a particular place - put an ampersand before the character to align on - break lines with \\ or \cr (carriage return)
	//\eqalign{
	//3x - 4y &= 5 \cr
	//x  +  7 &= -2y
	//}
	
	// Geometry:
	// \angle ABC
	// 90^{\circ}
	// \triangle ABC
	// \overline{AB}
	
	// piecewise function: |x| = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases}
	
	return GriddlMath;
	
})();

