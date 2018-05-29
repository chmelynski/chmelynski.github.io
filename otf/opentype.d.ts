
interface opentype {
	parse(buffer: ArrayBuffer): Font;
	load(url: string, callback: (err: any, font: Font) => void): void;
	loadSync(url: string): Font;
}

interface Font {
	
	unitsPerEm: number;
	ascender: number;
	descender: number;
	glyphs: Glyph[];
	familyName: string;
	styleName: string;
	supported: boolean;
	
	getPath(text: string, x: number, y: number, fontSize: number, options: { kerning: boolean }): Path;
	getPaths(text: string, x: number, y: number, fontSize: number, options: { kerning: boolean }): Path[];
	draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, options: { kerning: boolean }): void;
	drawPoints(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, options: { kerning: boolean }): void;
	drawMetrics(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, options: { kerning: boolean }): void;
	stringToGlyphs(str: string): Glyph[];
	charToGlyph(char: string): Glyph;
	getKerningValue(leftGlyph: Glyph, rightGlyph: Glyph): number;
	getKerningValue(leftGlyphIndex: number, rightGlyphIndex: number): number;
	toTables(): any;
	toArrayBuffer(): ArrayBuffer;
}

interface Glyph {
	font: Font;
	name: string;
	unicode: number;
	unicodes: number[];
	index: number;
	advanceWidth: number;
	xMin: number;
	yMin: number;
	xMax: number;
	yMax: number;
	path: Path;
	
	getPath(x: number, y: number, fontSize: number): Path;
	draw(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number): void;
	drawPoints(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number): void;
	drawMetrics(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number): void;
}

interface Path {
	commands: PathCommand[];
	fill: string;
	stroke: string;
	strokeWidth: string;
	
	draw(ctx: CanvasRenderingContext2D): void;
	getBoundingBox(): BoundingBox;
	toPathData(decimalPlaces: number): string;
	toSVG(decimalPlaces: number): string;
}

interface PathCommand {
	type: PathCommandType;
	x?: number;
	y?: number;
	x1?: number;
	y1?: number;
	x2?: number;
	y2?: number;
}

type PathCommandType = 'M' | 'L' | 'C' | 'Q' | 'Z';

interface BoundingBox {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

