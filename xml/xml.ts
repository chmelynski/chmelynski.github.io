
interface Attribute {
	key: string;
	val: string;
}
interface Dict<T> {
	[index: string]: T;
}

class Xml {
	
	name: string;
	text: string;
	attrs: Attribute[] = [];
	children: Xml[] = [];
	
	attrDict: Dict<string> = {};
	
	constructor() { }
	static Parse(text: string): Xml {
		
		var regex = /(<\??\/?|\??\/?>|=|[A-Za-z0-9_\-:]+|\s+|"[^"]*"|[^<]+)/g;
		
		var tokens = [];
		
		while (regex.lastIndex < text.length)
		{
			var match = regex.exec(text);
			if (match == null) { break; }
			if (match[0].trim().length > 0) { tokens.push(match[0]); }
		}
		
		var root = null;
		var focus = null;
		var stack: Xml[] = [];
		var k = 0;
		
		while (k < tokens.length)
		{
			var token = tokens[k++];
			
			if (token == '<?')
			{
				while (k < tokens.length && token != '?>') { token = tokens[k++]; }
			}
			else if (token == '<' || token == '</')
			{
				var name = tokens[k++];
				
				if (token == '</')
				{
					k++; // >
					while (stack[stack.length - 1].name != name) { stack.pop(); }
					stack.pop();
					if (stack.length > 0) { focus = stack[stack.length - 1]; }
				}
				else
				{
					var xml = new Xml();
					xml.name = name;
					
					var clopen = false;
					
					token = tokens[k++];
					
					while (k < tokens.length && token != '/>' && token != '>')
					{
						var attr: Attribute = { key: null, val: null };
						attr.key = token;
						var next = tokens[k++];
						if (next == '=') { var val = tokens[k++]; attr.val = ((val[0] == '"') ? val.substr(1, val.length - 2) : val); } else { k--; }
						xml.attrs.push(attr);
						token = tokens[k++];
					}
					
					for (var j = 0; j < xml.attrs.length; j++)
					{
						xml.attrDict[xml.attrs[j].key] = xml.attrs[j].val;
					}
					
					if (token == '/>') { clopen = true; }
					if (token != '>' && token != '/>') { throw new Error(); }
					
					if (focus == null) { root = xml; } else { focus.children.push(xml); }
					if (!clopen) { stack.push(xml); focus = xml; }
				}
			}
			else
			{
				focus.text = token;
			}
		}
		
		return root;
	}
	static Parse2(text: string): string[] {
		
		// this uses a regex that slurps whole tags - but because subsequent key-val matches are dropped, we then need to parse the tags
		
		// < space* backslash? space* name space* (key equals quote space*)* backslash? >
		var regex = /(<\s*\/?\s*(\S+)\s*((\S+)="([^"]+)"\s*)*\/?>|([^<]+))/g;
		
		var tokens = [];
		
		while (regex.lastIndex < text.length)
		{
			var match = regex.exec(text);
			if (match == null) { break; }
			if (match[0].trim().length > 0) { tokens.push(match[0]); }
		}
		
		return tokens;
	}
	attr(key: string): string {
		return this.attrDict[key];
	}
}

exports.Xml = Xml;

