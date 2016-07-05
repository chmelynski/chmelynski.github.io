
// HTML helper functions

var DataToTable = function(componentName) {
	
	var obj = get(componentName);
	
	// check form, check to make sure that obj is a table, etc.
	
	var id = null;
	
	var ls = [];
	ls.push('table#' + id + ' { border-collapse : true }');
	ls.push('#' + id + ' td { border : 1px solid black }');
	ls.push('<table id="' + id + '">');
	
	for (var i = 0; i < data.length; i++)
	{
		ls.push('<tr>');
		
		for (var k in data[i])
		{
			ls.push('<td>');
			ls.push(data[i][k].toString());
			ls.push('</td>');
		}
		
		/*for (var j = 0; j < data[i].length; j++)
		{
			ls.push('<td>');
			ls.push(data[i][j].toString());
			ls.push('</td>');
		}*/
		
		ls.push('</tr>');
	}
	
	ls.push('</table>');
	
	return ls.join('');
};

