
function LoadAssets(files, callback) {
	
	var toload = files.length;
	var loaded = 0;
	
	var assets = new Map();
	
	for (var i = 0; i < files.length; i++)
	{
		(function(thefile) {
		
			var filename = thefile.name;
			
			var fileReader = new FileReader();
			
			var ext = filename.substr(filename.lastIndexOf('.'));
			
			fileReader.onload = function(event) {
				
				var result = event.target.result;
				
				if (ext == '.jpg' || ext == '.jpeg' || ext == '.bmp' || ext == '.png' || ext == '.gif')
				{
					var img = document.createElement('img')
					img.src = result; // 'data:image/' + ext.substr(1) + ';base64,' + 
					assets.set(filename, img);
				}
				else if (ext == '.otf' || ext == '.ttf')
				{
					var font = opentype.parse(result);
					assets.set(filename, font);
				}
				else if (ext == '.osm')
				{
					var xml = Xml.Parse(result);
					var osm = Osm.MakeOsm(xml);
					// need smarter bounds - tag osm.bounds with like 5% and 95% point extent, plus a buffer?
					//osm.bounds.pseudomaxLat = ??
					assets.set(filename, osm);
				}
				else if (ext == '.topopack' || ext == '.geopack' || ext == '.arcpack')
				{
					assets.set(filename, result);
				}
				else if (ext == '.tsv' || ext == '.csv')
				{
					
				}
				else if (ext == '.json' || ext == '.topojson' || ext == '.geojson')
				{
					assets.set(filename, JSON.parse(result));
				}
				else if (ext == '.txt' || ext == '.js' || ext == '.path')
				{
					assets.set(filename, result);
				}
				else
				{
					throw new Error();
				}
				
				loaded++;
				if (toload == loaded) { callback(assets); }
			};
			
			if (ext == '.jpg' || ext == '.jpeg' || ext == '.bmp' || ext == '.png' || ext == '.gif')
			{
				fileReader.readAsDataURL(thefile);
			}
			else if (ext == '.txt' || ext == '.js' || ext == '.json' || ext == '.tsv' || ext == '.csv' || ext == '.path' || ext == '.osm' || ext == '.topojson' || ext == '.geojson')
			{
				fileReader.readAsText(thefile);
			}
			else
			{
				fileReader.readAsArrayBuffer(thefile);
			}
			
		})(files[i]);
	}
}

