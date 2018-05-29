

"use strict";

function assert(condition, message) {
	
	message = message || "Assertion failed";
	
	if (!condition)
	{
		alert(message);
		throw message;
	}
}

function BinaryReader(arrayBuffer) {
	//assert(arrayBuffer instanceof ArrayBuffer);
	this.pos = 0;
	
	if (arrayBuffer instanceof ArrayBuffer)
	{
		this.data = new Uint8Array(arrayBuffer);
	}
	else if (arrayBuffer instanceof Uint8Array)
	{
		this.data = arrayBuffer;
	}
	else
	{
		throw new Error();
	}
}
BinaryReader.prototype = {
	seek: function(pos) {
		assert(pos >=0 && pos <= this.data.length);
		var oldPos = this.pos;
		this.pos = pos;
		return oldPos;
	},
	tell: function() {
		return this.pos;
	},
	getUint8: function() {
		assert(this.pos < this.data.length);
		return this.data[this.pos++];
	},
	getUint16: function() {
		return ((this.getUint8() << 8) | this.getUint8()) >>> 0;
	},
	getUint32: function() {
		return this.getInt32() >>> 0;
	},
	getInt16: function() {
		var result = this.getUint16();
		if (result & 0x8000) {
			result -= (1 << 16);
		}
		return result;
	}, 
	getInt32: function() {
		return ((this.getUint8() << 24) | 
				(this.getUint8() << 16) |
				(this.getUint8() <<  8) |
				(this.getUint8()      ));
	}, 
	getFword: function() {
		return this.getInt16();
	},
	get2Dot14: function() {
		return this.getInt16() / (1 << 14);
	},
	getFixed: function() {
		return this.getInt32() / (1 << 16);
	},
	getString: function(length) {
		var result = "";
		for(var i = 0; i < length; i++) {
			result += String.fromCharCode(this.getUint8());
		}
		return result;
	},
	getDate: function() {
		var macTime = this.getUint32() * 0x100000000 + this.getUint32();
		var utcTime = macTime * 1000 + Date.UTC(1904, 1, 1);
		return new Date(utcTime);
	}
};

function TrueTypeFont(arrayBuffer) {
	this.file = new BinaryReader(arrayBuffer);
	this.tables = this.readOffsetTables(this.file);
	this.readHeadTable(this.file);
	this.length = this.glyphCount();
	this.glyphs = this.readGlyphs(this.file);
	this.hhea = this.readHhea(this.file);
	this.hmtx = this.readHmtx(this.file, this.glyphs.length, this.hhea.numOfLongHorMetrics);
}

TrueTypeFont.prototype = {
	readOffsetTables: function(file) {
		var tables = {};
		this.scalarType = file.getUint32();
		var numTables = file.getUint16();
		this.searchRange = file.getUint16();
		this.entrySelector = file.getUint16();
		this.rangeShift = file.getUint16();
		
		for( var i = 0 ; i < numTables; i++ )
		{
			var tag = file.getString(4);
			
			tables[tag] = { checksum: file.getUint32(), offset: file.getUint32(), length: file.getUint32() };
			
			if (tag !== 'head')
			{
				assert(this.calculateTableChecksum(file, tables[tag].offset, tables[tag].length) === tables[tag].checksum);
			}
		}
		
		return tables;
	},
	calculateTableChecksum: function(file, offset, length) {
		
		var old = file.seek(offset);
		var sum = 0;
		var nlongs = ((length + 3) / 4) | 0;
		
		while (nlongs--)
		{
			sum = (sum + file.getUint32() & 0xffffffff) >>> 0;
		}
		
		file.seek(old);
		return sum;
	},
	readHeadTable: function(file) {
		assert("head" in this.tables);
		file.seek(this.tables["head"].offset);
		
		this.version = file.getFixed();
		this.fontRevision = file.getFixed();
		this.checksumAdjustment = file.getUint32();
		this.magicNumber = file.getUint32();
		assert(this.magicNumber === 0x5f0f3cf5);
		this.flags = file.getUint16();
		this.unitsPerEm = file.getUint16();
		this.created = file.getDate();
		this.modified = file.getDate();
		this.xMin = file.getFword();
		this.yMin = file.getFword();
		this.xMax = file.getFword();
		this.yMax = file.getFword();
		this.macStyle = file.getUint16();
		this.lowestRecPPEM = file.getUint16();
		this.fontDirectionHint = file.getInt16();
		this.indexToLocFormat = file.getInt16();
		this.glyphDataFormat = file.getInt16();
	},
	glyphCount: function() {
		assert("maxp" in this.tables);
		var old = this.file.seek(this.tables["maxp"].offset + 4);
		var count = this.file.getUint16();
		this.file.seek(old);
		return count;
	},
	getGlyphOffset: function(index) {
		
		assert("loca" in this.tables);
		var table = this.tables["loca"];
		var file = this.file;
		var offset, old;
		
		if (this.indexToLocFormat === 1)
		{
			old = file.seek(table.offset + index * 4);
			offset = file.getUint32();
		}
		else
		{
			old = file.seek(table.offset + index * 2);
			offset = file.getUint16() * 2;
		}
		
		file.seek(old);
		
		return offset + this.tables["glyf"].offset;
	},
	readGlyphs: function(file) {
		
		var glyphTable = this.tables["glyf"];
		
		file.seek(glyphTable.offset);
		
		var glyphs = [];
		
		var c = 0;
		while (file.tell() < glyphTable.offset + glyphTable.length)
		{
			glyphs.push(this.readGlyph(c++));
			while (file.tell() & 1) { file.getUint8(); } // this advances to a 2-byte boundary
		}
		
		return glyphs;
	},
	readGlyph: function(index) {
		
		var offset = this.getGlyphOffset(index);
		var file = this.file;
		
		if (offset >= this.tables["glyf"].offset + this.tables["glyf"].length)
		{
			return null;
		}
		
		assert(offset >= this.tables["glyf"].offset);
		assert(offset < this.tables["glyf"].offset + this.tables["glyf"].length);
		
		file.seek(offset);
		
		var glyph = {
			numberOfContours: file.getInt16(),
			xMin: file.getFword(),
			yMin: file.getFword(),
			xMax: file.getFword(),
			yMax: file.getFword()
		};
		
		assert(glyph.numberOfContours >= -1);
		
		if (glyph.numberOfContours === -1)
		{
			this.readCompoundGlyph(file, glyph);
		}
		else
		{
			this.readSimpleGlyph(file, glyph);
		}
		
		return glyph;
	},
	getGlyph: function(index) {
		return this.glyphs[index];
	},
	getGlyphWidth: function(index) {
		var glyph = this.getGlyph(index);
		return glyph.yMax; // or glyph.yMax - glyph.yMin
	},
	readSimpleGlyph: function(file, glyph) {
		
		var ON_CURVE        =  1,
			X_IS_BYTE       =  2,
			Y_IS_BYTE       =  4,
			REPEAT          =  8,
			X_DELTA         = 16,
			Y_DELTA         = 32;
		
		glyph.type = "simple";
		glyph.contourEnds = [];
		var points = glyph.points = [];
		
		for (var i = 0; i < glyph.numberOfContours; i++)
		{
			glyph.contourEnds.push(file.getUint16());
		}
		
		// skip over intructions
		var instructionLength = file.getUint16();
		var currentFilePos = file.tell();
		file.seek(instructionLength + currentFilePos);
		
		if (glyph.numberOfContours === 0) { return; }
		
		var numPoints = Math.max.apply(null, glyph.contourEnds) + 1;
		
		var flags = [];
		
		for (var i = 0; i < numPoints; i++)
		{
			var flag = file.getUint8();
			flags.push(flag);
			points.push({ onCurve : (flag & ON_CURVE) > 0 });
			
			if (flag & REPEAT)
			{
				var repeatCount = file.getUint8();
				assert(repeatCount > 0);
				i += repeatCount;
				
				while (repeatCount--)
				{
					flags.push(flag);
					points.push({ onCurve : (flag & ON_CURVE) > 0 });
				}
			}
		}
		
		function readCoords(name, byteFlag, deltaFlag, min, max) {
			
			var value = 0;
			
			for (var i = 0; i < numPoints; i++)
			{
				var flag = flags[i];
				
				if (flag & byteFlag)
				{
					if (flag & deltaFlag)
					{
						value += file.getUint8();
					}
					else
					{
						value -= file.getUint8();
					}
				}
				else if (~flag & deltaFlag)
				{
					value += file.getInt16();
				}
				else
				{
					// value is unchanged.
				}
				
				points[i][name] = value;
			}
		}
		
		readCoords("x", X_IS_BYTE, X_DELTA, glyph.xMin, glyph.xMax);
		readCoords("y", Y_IS_BYTE, Y_DELTA, glyph.yMin, glyph.yMax);
	},
	readCompoundGlyph: function(file, glyph) {
		var ARG_1_AND_2_ARE_WORDS    = 1,
			ARGS_ARE_XY_VALUES       = 2,
			ROUND_XY_TO_GRID         = 4,
			WE_HAVE_A_SCALE          = 8,
			// RESERVED              = 16
			MORE_COMPONENTS          = 32,
			WE_HAVE_AN_X_AND_Y_SCALE = 64,
			WE_HAVE_A_TWO_BY_TWO     = 128,
			WE_HAVE_INSTRUCTIONS     = 256,
			USE_MY_METRICS           = 512,
			OVERLAP_COMPONENT        = 1024;
		
		glyph.type = "compound";
		glyph.components = [];
		
		var flags = MORE_COMPONENTS;
		
		while (flags & MORE_COMPONENTS)
		{
			var arg1, arg2;
			
			flags = file.getUint16();
			
			var component = {
				glyphIndex: file.getUint16(),
				matrix: {
					a: 1, b: 0, c: 0, d: 1, e: 0, f: 0
				}
			};
			
			if (flags & ARG_1_AND_2_ARE_WORDS)
			{
				arg1 = file.getInt16();
				arg2 = file.getInt16();
			}
			else
			{
				arg1 = file.getUint8();
				arg2 = file.getUint8();
			}
			
			if (flags & ARGS_ARE_XY_VALUES)
			{
				component.matrix.e = arg1;
				component.matrix.f = arg2;
			}
			else
			{
				component.destPointIndex = arg1;
				component.srcPointIndex = arg2;
			}
			
			if (flags & WE_HAVE_A_SCALE)
			{
				component.matrix.a = file.get2Dot14();
				component.matrix.d = component.matrix.a;
			}
			else if (flags & WE_HAVE_AN_X_AND_Y_SCALE)
			{
				component.matrix.a = file.get2Dot14();
				component.matrix.d = file.get2Dot14();
			}
			else if (flags & WE_HAVE_A_TWO_BY_TWO)
			{
				component.matrix.a = file.get2Dot14();
				component.matrix.b = file.get2Dot14();
				component.matrix.c = file.get2Dot14();
				component.matrix.d = file.get2Dot14();
			}
			
			glyph.components.push(component);
		}
		
		if (flags & WE_HAVE_INSTRUCTIONS)
		{
			file.seek(file.getUint16() + file.tell());
		}
	},
	readHhea: function(file) {
		
		if (this.tables["hhea"])
		{
			file.seek(this.tables["hhea"].offset);
			var x = {};
			x.version = file.getUint32();
			x.ascent = file.getInt16();
			x.descent = file.getInt16();
			x.lineGap = file.getInt16();
			x.advanceWidthMax = file.getUint16();
			x.minLeftSideBearing = file.getInt16();
			x.minRightSideBearing = file.getInt16();
			x.xMaxExtent = file.getInt16();
			x.caretSlopeRise = file.getInt16();
			x.caretSlopeRun = file.getInt16();
			x.caretOffset = file.getInt16();
			x.reserved1 = file.getInt16();
			x.reserved2 = file.getInt16();
			x.reserved3 = file.getInt16();
			x.reserved4 = file.getInt16();
			x.metricDataFormat = file.getInt16();
			x.numOfLongHorMetrics = file.getUint16();
			this.hhea = x;
		}
	},
	readHmtx: function(file, nGlyphs, numOfLongHorMetrics) {
		
		if (this.tables["hmtx"])
		{
			file.seek(this.tables["hmtx"].offset);
			
			var x = {};
			
			x.hMetrics = [];
			x.leftSideBearing = [];
			
			for (var i = 0; i < numOfLongHorMetrics; i++)
			{
				var m = {};
				m.advanceWidth = file.getUint16();
				m.leftSideBearing = file.getInt16();
				x.hMetrics.push(m);
			}
			
			for (var i = 0; i < nGlyphs - numOfLongHorMetrics; i++)
			{
				x.leftSideBearing.push(file.getInt16());
			}
			
			this.hmtx = x;
		}
	},
};

