
(function() {


// note that this could be the basis of a built-in unit system - detect unit notation like "km" or "J" and convert
// calculations could display the correct units by default
// 1 J / 1 s = 1 W
// the unit type of a cell would be detemined by the calculation and thus not settable by the user
// but the reference unit would be settable
// so you could type in 1 J and then convert the cell to calories and it would convert

var numberRegex = new RegExp('^\\s*[+-]?([0-9]{1,3}((,[0-9]{3})*|([0-9]{3})*))?(\\.[0-9]+)?%?\\s*$');
var digitRegex = new RegExp('[0-9]');

var ParseStringToObj = function(str) {
	
	if (str === null || str === undefined) { return null; }
	if (str.length == 0) { return ''; } // the numberRegex accepts the empty string because all the parts are optional
	
	var val = null;
	
	if (numberRegex.test(str) && digitRegex.test(str)) // since all parts of numberRegex are optional, "+.%" is a valid number.  so we test digitRegex too
	{
		var divisor = 1;
		str = str.trim();
		if (str.indexOf('%') >= 0) { divisor = 100; str = str.replace('%', ''); }
		str = str.replace(',', '');
		
		if (str.indexOf('.') >= 0)
		{
			val = parseFloat(str);
		}
		else
		{
			val = parseInt(str);
		}
		
		val /= divisor;
	}
	else
	{
		val = str;
	}
	
	return val;
};

function NumberToLetter(n) {
	
	// 0 => "A"
	// 1 => "B"
	// 25 => "Z"
	// 26 => "AA"
	
	if (n < 0) { return ""; }
	
	var k = 1;
	var m = n+1;
	
	while (true)
	{
		var pow = 1;
		for (var i = 0; i < k; i++) { pow *= 26; }
		if (m <= pow) { break; }
		m -= pow;
		k++;
	}
	
	var reversed = "";
	
	for (var i = 0; i < k; i++)
	{
		var c = n+1;
		var shifter = 1;
		for (var j = 0; j < k; j++) { c -= shifter; shifter *= 26; }
		var divisor = 1;
		for (var j = 0; j < i; j++) { divisor *= 26; }
		c /= divisor;
		c %= 26;
		reversed += String.fromCharCode(65 + c)
	}
	
	var result = "";
	for (var i = reversed.length - 1; i >= 0; i--) { result += reversed[i]; }
	
	return result;
}
function LetterToNumber(s) {
	
	// "A" => 0
	// "B" => 1
	// "Z" => 25
	// "AA" => 26
	
	var result = 0;
	var multiplier = 1;
	
	for (var i = s.length - 1; i >= 0; i--)
	{
		var c = s.charCodeAt(i);
		result += multiplier * (c - 64);
		multiplier *= 26;
	}
	
	return result-1; // -1 makes it 0-indexed
}

Griddl.Components.Grid = Grid;

})();

