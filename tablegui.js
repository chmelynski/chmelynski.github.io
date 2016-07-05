
// var tablegui = new TableGui(data);
// tablegui.add('color', 'color', {default:'000000'});
// tablegui.add('alpha', 'number', {default:0.5,min:0,max:1,step:0.01});
// tablegui.add('path', 'text', {default:'M 150 150 l 100 0 l 0 100 l -100 0 z',size:30});
// tablegui.addAfterChangeFn(function() { Draw(ctx, data); });
// document.getElementById('ui').appendChild(tablegui.table);

var TableGui = function(objs) {
	
	this.objs = objs;
	this.cols = [];
	this.table = document.createElement('table');
	
	this.headerRow = document.createElement('tr');
	this.headerRow.appendChild(document.createElement('td'));
	this.table.appendChild(this.headerRow);
	
	this.rows = [];
	this.cols = [];
	
	this.afterChangeFns = [];
	
	var tablegui = this;
	
	for (var i = 0; i < this.objs.length; i++)
	{
		var tr = document.createElement('tr');
		
		var td = document.createElement('td');
		var button = document.createElement('button');
		button.innerText = '-';
		td.appendChild(button);
		tr.appendChild(td);
		button.onclick = (function(k) { return function() { tablegui.deleteRow(k); }; })(i);
		
		this.rows.push(tr);
		this.table.appendChild(tr);
	}
	
	var tr = document.createElement('tr');
	this.table.appendChild(tr);
	var td = document.createElement('td');
	tr.appendChild(td);
	var button = document.createElement('button');
	td.appendChild(button);
	button.innerText = '+';
	button.onclick = function() { tablegui.addRow(); };
	
	this.addRowTr = tr;
};
TableGui.prototype.addAfterChangeFn = function(fn) {
	this.afterChangeFns.push(fn);
};
TableGui.prototype.afterChange = function() {
	
	this.afterChangeFns.forEach(fn => fn());
};
TableGui.prototype.add = function(key, type, options) {
	
	if (!options) { options = {}; }
	
	this.cols.push({key:key,type:type,options:options});
	
	var th = document.createElement('th');
	th.innerText = (options.header ? options.header : ((options.header == '') ? '' : key));
	this.headerRow.appendChild(th);
	
	for (var i = 0; i < this.objs.length; i++)
	{
		var obj = this.objs[i];
		var tr = this.rows[i];
		this.addTd(tr, obj, key, type, options);
	}
};
TableGui.prototype.addTd = function(tr, obj, key, type, options) {
	
	// options:
	//  default
	//  header
	//  size
	//  max, min, step
	//  options = ['foo','bar','baz']
	
	// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
	
	var tablegui = this;
	
	var td = document.createElement('td');
	tr.appendChild(td);
	
	var input = null;
	
	if (type == 'label')
	{
		input = document.createElement('span');
	}
	else if (type == 'select')
	{
		input = document.createElement('select');
	}
	else
	{
		input = document.createElement('input');
	}
	
	td.appendChild(input);
	
	if (type == 'text')
	{
		input.type = 'text';
		input.size = options.size ? options.size : 50;
		input.value = obj[key];
	}
	else if (type == 'color')
	{
		// input.type = 'color'; // will HTML ever provide a default color picker?
		input.className = 'jscolor';
		input.size = options.size ? options.size : 10;
		input.value = obj[key];
	}
	else if (type == 'number')
	{
		input.type = 'range';
		input.min = options.min ? options.min : 0;
		input.max = options.max ? options.max : 100;
		input.step = options.step ? options.step : 1;
		input.value = obj[key];
	}
	else if (type == 'button')
	{
		input.type = 'button';
		input.value = key;
		
		(function(theobj) {
			input.onclick = function() {
				theobj[key]();
				tablegui.afterChange();
			};
		})(obj);
	}
	else if (type == 'checkbox')
	{
		// A check box. You must use the value attribute to define the value submitted by this item. Use the checked attribute to indicate whether this item is selected. You can also use the indeterminate attribute (which can only be set programmatically) to indicate that the checkbox is in an indeterminate state (on most platforms, this draws a horizontal line across the checkbox).
		input.type = 'checkbox';
		input.value = obj[key];
	}
	else if (type == 'select')
	{
		for (var i = 0; i < options.options.length; i++)
		{
			var option = document.createElement('option');
			option.innerText = options.options[i];
			input.appendChild(option);
		}
		
		input.value = obj[key];
	}
	else if (type == 'label')
	{
		input.innerText = obj[key];
	}
	else
	{
		throw new Error();
	}
	
	(function(theobj) {
		input.onchange = function(e) {
			theobj[key] = this.value;
			tablegui.afterChange();
		};
	})(obj);
};
TableGui.prototype.addRow = function(obj) {
	
	var tablegui = this;
	
	var newObjCreated = false;
	if (!obj) { obj = {}; newObjCreated = true; }
	
	var tr = document.createElement('tr');
	var indexOfNewRow = this.rows.length;
	
	var td = document.createElement('td');
	var button = document.createElement('button');
	button.innerText = '-';
	td.appendChild(button);
	tr.appendChild(td);
	button.onclick = (function(k) { return function() { tablegui.deleteRow(k); }; })(indexOfNewRow);
	
	for (var j = 0; j < this.cols.length; j++)
	{
		var key = this.cols[j].key;
		var type = this.cols[j].type;
		var options = this.cols[j].options;
		
		if (newObjCreated)
		{
			if (options.default)
			{
				obj[key] = options.default;
			}
			else
			{
				if (type == 'text' || type == 'label')
				{
					obj[key] = '';
				}
				else if (type == 'color')
				{
					obj[key] = '000000';
				}
				else if (type == 'number')
				{
					obj[key] = 0;
				}
				else if (type == 'button')
				{
					obj[key] = function() { };
				}
				else if (type == 'select')
				{
					obj[key] = '';
				}
				else if (type == 'checkbox')
				{
					obj[key] = false;
				}
				else
				{
					throw new Error();
				}
			}
		}
		
		this.addTd(tr, obj, key, type, options);
	}
	
	this.objs.push(obj);
	this.rows.push(tr);
	this.table.insertBefore(tr, this.addRowTr);
	
	if (typeof(jscolor) !== 'undefined') { jscolor.installByClassName('jscolor'); }
	
	this.afterChange();
};
TableGui.prototype.deleteRow = function(k) {
	
	this.objs.splice(k, 1);
	this.rows.splice(k, 1);
	this.table.deleteRow(k);
	this.afterChange();
};

