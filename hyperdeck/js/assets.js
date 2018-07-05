
(function() {

// Hyperdeck.Get('assets1') => Map{'/img/foo.png' => <img>}
// Hyperdeck.Set('assets1', [{url:'/img/foo.png',type:'image'}])

var Assets = function(json, type, name) {
	
	if (!json)
	{
		json = {};
		json.type = type;
		json.name = name;
		json.visible = true;
		json.assets = [ { url: '', type: '' } ];
	}
	
	this.type = json.type;
	this.name = json.name;
	this.visible = json.visible;
	
	this.div = null;
	
	this.assets = json.assets;
	
	this.map = null; // holds assets: { '/img/foo.png' => <img> }
	
	this.sentinel = null;
};
Assets.prototype.add = function() {
	// everything is in afterLoad, because afterLoad is asynchronous, and we're loading assets asynchronously
};
Assets.prototype.afterLoad = function(callback) {
	
	var comp = this;
	
	comp.map = new Map();
	comp.sentinel = new LinkedList(); // holds row objects: { div, url, type, icon }
	
	comp.div.html('');
	
	var rows = $('<div></div>').appendTo(comp.div);
	
	var first = true;
	var toload = comp.assets.length;
	var loaded = 0;
	
	function Fetch(row) {
		
		if (row.url == '' || row.type == '') { return; }
		
		fetch(row.url).then(function(response) {
			
			if (row.type == 'json')
			{
				return response.json();
			}
			else if (row.type == 'text')
			{
				return response.text();
			}
			else if (row.type == 'image')
			{
				return response.blob();
			}
			else if (row.type == 'font')
			{
				return response.arrayBuffer();
			}
			else if (row.type == 'binary')
			{
				return response.arrayBuffer();
			}
			
		}).then(function(result) {
			
			if (row.type == 'font')
			{
				var font = opentype.parse(result);
				comp.map.set(row.url, font);
			}
			else if (row.type == 'image')
			{
				var img = document.createElement('img');
				img.src = URL.createObjectURL(result);
				comp.map.set(row.url, img);
			}
			else
			{
				comp.map.set(row.url, result);
			}
			
			row.icon.removeClass('fa-hourglass').addClass('fa-check').css('color', 'green');
			
		}).catch(function() {
			
			row.icon.removeClass('fa-hourglass').addClass('fa-times').css('color', 'red');
			
		}).finally(function() {
			
			if (first)
			{
				loaded++;
				if (loaded == toload) { first = false; callback(comp); }
			}
		});
	}

	function AppendRow(asset) {
		
		comp.markDirty();
		
		var row = { div: null, url: asset.url, type: asset.type, icon: null };
		var rowElt = comp.sentinel.add(row);
		
		var rowDiv = $('<div style="margin:0.2em"></div>').appendTo(rows);
		
		$('<button class="btn btn-default btn-sm"><i class="fa fa-lg fa-trash-o"></i></button>').appendTo(rowDiv).on('click', function() {
			comp.markDirty();
			rowElt.remove();
			rowDiv.remove();
		});
		
		$('<input class="input-sm" style="width:70%;margin:0.2em" placeholder="http://localhost:1234/foo.jpg" value="' + row.url + '"></input>').appendTo(rowDiv).on('change', function() {
			comp.markDirty();
			icon.removeClass('fa-check').removeClass('fa-times').addClass('fa-hourglass').css('color', 'orange');
			row.url = this.value;
			Fetch(row);
		});
		
		$('<select style="margin:0em 1em">' + Options(['','image','json','text','font','binary'], asset.type) + '</select>').appendTo(rowDiv).on('change', function() {
			comp.markDirty();
			icon.removeClass('fa-check').removeClass('fa-times').addClass('fa-hourglass').css('color', 'orange');
			row.type = this.value;
			Fetch(row);
		});
		
		var icon = $('<span class="fa fa-hourglass" style="color:orange"></span>').appendTo(rowDiv);
		
		row.div = rowDiv;
		row.icon = icon;
	}
	
	comp.assets.forEach(AppendRow);
	
	var plusButtonDiv = $('<div style="margin:0.2em"></div>').appendTo(comp.div);
	$('<button class="btn btn-default btn-sm"><i class="fa fa-plus"></i></button>').appendTo(plusButtonDiv)
		.on('click', function() { AppendRow({ url: '', type: '' }); });
	
	comp.sentinel.enumerate().forEach(Fetch);
};
Assets.prototype.write = function() {
	
	var comp = this;
	
	var json = {};
	json.type = comp.type;
	json.name = comp.name;
	json.visible = comp.visible;
	json.assets = comp.sentinel.enumerate().map(function(row) { return { url: row.url, type: row.type }; });
	return json;
};
Assets.prototype.get = function() {
	return this.map;
};
Assets.prototype.set = function(assets) {
	var comp = this;
	comp.assets = assets;
	comp.afterLoad(function(comp) { });
};

function Options(list, selected) {
	
	var l = [];
	
	for (var i = 0; i < list.length; i++)
	{
		if (selected == list[i])
		{
			l.push('<option selected>');
		}
		else
		{
			l.push('<option>');
		}
		
		l.push(list[i]);
		l.push('</option>');
	}
	
	return l.join('');
}

var LinkedList = function() {
	this.data = null;
	this.prev = this;
	this.next = this;
};
LinkedList.prototype.add = function(data) {
	
	// this must be called on the sentinel
	
	var elt = new LinkedList();
	elt.data = data;
	elt.next = this;
	elt.prev = this.prev;
	
	if (this.next === this) { this.next = elt; } else { this.prev.next = elt; }
	this.prev = elt;
	
	return elt;
};
LinkedList.prototype.remove = function() {
	
	// this cannot be called on the sentinel
	this.prev.next = this.next;
	this.next.prev = this.prev;
};
LinkedList.prototype.enumerate = function() {
	
	// this must be called on the sentinel
	
	var list = [];
	var elt = this.next;
	
	while (elt !== this)
	{
		list.push(elt.data);
		elt = elt.next;
	}
	
	return list;
};

Hyperdeck.Components.assets = Assets;

})();

