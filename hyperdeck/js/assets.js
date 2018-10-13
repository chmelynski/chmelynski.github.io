
(function() {

// Hyperdeck.Get('assets1') => Map{'/img/foo.png' => <img>}
// Hyperdeck.Set('assets1', [{url:'/img/foo.png',type:'image'}])

class Assets {
	constructor(json, type, name) {
		
		if (!json)
		{
			json = {
				type: type,
				name: name,
				visible: true,
				assets: [ { url: '', type: '' } ]
			};
		}
		
		this.type = json.type;
		this.name = json.name;
		this.visible = json.visible;
		
		this.div = null;
		
		this.assets = json.assets;
		
		this.map = null; // holds assets: { '/img/foo.png' => <img> }
		
		this.sentinel = null;
	}
	add() {
		// everything is in afterLoad, because afterLoad is asynchronous, and we're loading assets asynchronously
	}
	afterLoad(callback) {
		
		const comp = this;
		
		comp.map = new Map();
		comp.sentinel = new LinkedList(); // holds row objects: { div, url, type, icon }
		
		comp.div.html('');
		
		const rows = $('<div></div>').appendTo(comp.div);
		
		let first = true;
		const toload = comp.assets.length;
		let loaded = 0;
		
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
					const font = opentype.parse(result);
					const uint8 = new Uint8Array(result);
					comp.map.set(row.url, font);
					
					const name = row.url.substring(row.url.lastIndexOf('/') + 1, row.url.lastIndexOf('.'));
					Hyperdeck.Fonts[name] = { font, uint8 };
				}
				else if (row.type == 'image')
				{
					const img = document.createElement('img');
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
			
			const row = { div: null, url: asset.url, type: asset.type, icon: null };
			const rowElt = comp.sentinel.add(row);
			
			const rowDiv = $('<div style="margin:0.2em"></div>').appendTo(rows);
			
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
			
			const icon = $('<span class="fa fa-hourglass" style="color:orange"></span>').appendTo(rowDiv);
			
			row.div = rowDiv;
			row.icon = icon;
		}
		
		comp.assets.forEach(AppendRow);
		
		$('<div style="margin:0.2em"><button class="btn btn-default btn-sm"><i class="fa fa-plus"></i></button></div>').appendTo(comp.div)
			.children(0).on('click', function() { AppendRow({ url: '', type: '' }); });
		
		comp.sentinel.enumerate().forEach(Fetch);
	}
	write() {
		
		const comp = this;
		
		return {
			type: comp.type,
			name: comp.name,
			visible: comp.visible,
			assets: comp.sentinel.enumerate().map(row => ({ url: row.url, type: row.type }))
		};
	}
	get() {
		return this.map;
	}
	set(assets) {
		const comp = this;
		comp.assets = assets;
		comp.afterLoad(function(comp) { });
	}
}

function Options(list, selected) {
	
	const l = [];
	
	for (let i = 0; i < list.length; i++)
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

class LinkedList {
	constructor() {
		this.data = null;
		this.prev = this;
		this.next = this;
	}
	add(data) {
		
		// this must be called on the sentinel
		
		const elt = new LinkedList();
		elt.data = data;
		elt.next = this;
		elt.prev = this.prev;
		
		if (this.next === this) { this.next = elt; } else { this.prev.next = elt; }
		this.prev = elt;
		
		return elt;
	}
	remove() {
		
		// this cannot be called on the sentinel
		this.prev.next = this.next;
		this.next.prev = this.prev;
	}
	enumerate() {
		
		// this must be called on the sentinel
		
		const list = [];
		let elt = this.next;
		
		while (elt !== this)
		{
			list.push(elt.data);
			elt = elt.next;
		}
		
		return list;
	}
}

Hyperdeck.Components.assets = Assets;

})();

