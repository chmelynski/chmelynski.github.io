var Bitmap = (function () {
    function Bitmap(width, height, bytesPerPixel) {
        this.magic = 'BM';
        this.reserved1 = 0;
        this.reserved2 = 0;
        this.offset = 54;
        this.size2 = 40; // size of the second half of the header chunk
        this.planes = 1;
        this.compression = 0;
        this.sizeImage = 0;
        this.xPelsPerMeter = 0;
        this.yPelsPerMeter = 0;
        this.clrUsed = 0;
        this.clrImportant = 0;
        var headerSize = 54;
        this.width = width;
        this.height = height;
        this.bytesPerPixel = bytesPerPixel;
        this.bitcount = bytesPerPixel * 8;
        this.bytesPerRaster = width * bytesPerPixel;
        //if (this.bytesPerRaster % 2 == 1) { this.bytesPerRaster++; } // each horizontal pixel line must occupy an even number of bytes
        if (this.bytesPerRaster % 4 > 0) {
            this.bytesPerRaster += (4 - this.bytesPerRaster % 4);
        } // each horizontal pixel line must occupy a multiple of 4 bytes
        this.size = headerSize + height * this.bytesPerRaster;
        this.pixels = new Uint8Array(this.size);
        var x = this.pixels;
        var c = 0;
        x[c++] = 'B'.charCodeAt(0);
        x[c++] = 'M'.charCodeAt(0);
        x[c++] = this.size % 256;
        x[c++] = Math.floor(this.size / 256) % 256;
        x[c++] = Math.floor(this.size / 256 / 256) % 256;
        x[c++] = Math.floor(this.size / 256 / 256 / 256) % 256;
        x[c++] = this.reserved1 % 256;
        x[c++] = Math.floor(this.reserved1 / 256) % 256;
        x[c++] = this.reserved2 % 256;
        x[c++] = Math.floor(this.reserved2 / 256) % 256;
        x[c++] = this.offset % 256;
        x[c++] = Math.floor(this.offset / 256) % 256;
        x[c++] = Math.floor(this.offset / 256 / 256) % 256;
        x[c++] = Math.floor(this.offset / 256 / 256 / 256) % 256;
        x[c++] = this.size2 % 256;
        x[c++] = Math.floor(this.size2 / 256) % 256;
        x[c++] = Math.floor(this.size2 / 256 / 256) % 256;
        x[c++] = Math.floor(this.size2 / 256 / 256 / 256) % 256;
        x[c++] = this.width % 256;
        x[c++] = Math.floor(this.width / 256) % 256;
        x[c++] = Math.floor(this.width / 256 / 256) % 256;
        x[c++] = Math.floor(this.width / 256 / 256 / 256) % 256;
        x[c++] = this.height % 256;
        x[c++] = Math.floor(this.height / 256) % 256;
        x[c++] = Math.floor(this.height / 256 / 256) % 256;
        x[c++] = Math.floor(this.height / 256 / 256 / 256) % 256;
        x[c++] = this.planes % 256;
        x[c++] = Math.floor(this.planes / 256) % 256;
        x[c++] = this.bitcount % 256;
        x[c++] = Math.floor(this.bitcount / 256) % 256;
        x[c++] = this.compression % 256;
        x[c++] = Math.floor(this.compression / 256) % 256;
        x[c++] = Math.floor(this.compression / 256 / 256) % 256;
        x[c++] = Math.floor(this.compression / 256 / 256 / 256) % 256;
        x[c++] = this.sizeImage % 256;
        x[c++] = Math.floor(this.sizeImage / 256) % 256;
        x[c++] = Math.floor(this.sizeImage / 256 / 256) % 256;
        x[c++] = Math.floor(this.sizeImage / 256 / 256 / 256) % 256;
        x[c++] = this.xPelsPerMeter % 256;
        x[c++] = Math.floor(this.xPelsPerMeter / 256) % 256;
        x[c++] = Math.floor(this.xPelsPerMeter / 256 / 256) % 256;
        x[c++] = Math.floor(this.xPelsPerMeter / 256 / 256 / 256) % 256;
        x[c++] = this.yPelsPerMeter % 256;
        x[c++] = Math.floor(this.yPelsPerMeter / 256) % 256;
        x[c++] = Math.floor(this.yPelsPerMeter / 256 / 256) % 256;
        x[c++] = Math.floor(this.yPelsPerMeter / 256 / 256 / 256) % 256;
        x[c++] = this.clrUsed % 256;
        x[c++] = Math.floor(this.clrUsed / 256) % 256;
        x[c++] = Math.floor(this.clrUsed / 256 / 256) % 256;
        x[c++] = Math.floor(this.clrUsed / 256 / 256 / 256) % 256;
        x[c++] = this.clrImportant % 256;
        x[c++] = Math.floor(this.clrImportant / 256) % 256;
        x[c++] = Math.floor(this.clrImportant / 256 / 256) % 256;
        x[c++] = Math.floor(this.clrImportant / 256 / 256 / 256) % 256;
        for (var i = headerSize; i < this.pixels.length; i++) {
            this.pixels[i] = 255;
        }
    }
    Bitmap.prototype.write = function () { return this.pixels; };
    Bitmap.Read = function (b) {
        var k = { k: 0 };
        function ReadUi(b, k, n, little) {
            if (b.readUIntLE) {
                var x = little ? b.readUIntLE(k.k, n) : b.readUIntBE(k.k, n);
                k.k += n;
                return x;
            }
            else {
                var x = 0;
                var mult = 1;
                if (little) {
                    for (var i = 0; i < n; i++) {
                        x += mult * b[k.k++];
                        mult *= 256;
                    }
                }
                else {
                    for (var i = 0; i < n - 1; i++) {
                        mult *= 256;
                    }
                    for (var i = 0; i < n; i++) {
                        x += mult * b[k.k++];
                        mult /= 256;
                    }
                }
                return x;
            }
        }
        // 54 byte header
        var magic = ReadUi(b, k, 2, true); // 'BM' = 19778
        var size = ReadUi(b, k, 4, true); // what does this refer to?
        var reserved1 = ReadUi(b, k, 2, true);
        var reserved2 = ReadUi(b, k, 2, true);
        var offset = ReadUi(b, k, 4, true); // u32 - offset into the file where the pixel data begins
        var size2 = ReadUi(b, k, 4, true); // what does this refer to?
        var width = ReadUi(b, k, 4, true); // u32
        var height = ReadUi(b, k, 4, true); // u32
        var planes = ReadUi(b, k, 2, true); // u16?
        var bitcount = ReadUi(b, k, 2, true); // u16 - 8, 16, 24, 32
        var compression = ReadUi(b, k, 4, true);
        var sizeImage = ReadUi(b, k, 4, true);
        var xPelsPerMeter = ReadUi(b, k, 4, true);
        var yPelsPerMeter = ReadUi(b, k, 4, true);
        var clrUsed = ReadUi(b, k, 4, true);
        var clrImportant = ReadUi(b, k, 4, true);
        //console.log(width);
        //console.log(height);
        //console.log(bitcount);
        var bmp = new Bitmap(width, height, bitcount / 8);
        bmp.magic = 'BM';
        bmp.size = size;
        bmp.reserved1 = reserved1;
        bmp.reserved2 = reserved2;
        bmp.offset = offset;
        bmp.size2 = size2;
        bmp.width = width;
        bmp.height = height;
        bmp.planes = planes;
        bmp.bitcount = bitcount;
        bmp.compression = compression;
        bmp.sizeImage = sizeImage;
        bmp.xPelsPerMeter = xPelsPerMeter;
        bmp.yPelsPerMeter = yPelsPerMeter;
        bmp.clrUsed = clrUsed;
        bmp.clrImportant = clrImportant;
        k.k = bmp.offset;
        bmp.bytesPerPixel = bmp.bitcount / 8;
        var c = 0;
        bmp.pixels = new Uint8Array(bmp.height * bmp.width * bmp.bytesPerPixel);
        for (var i = 0; i < bmp.height; i++) {
            for (var j = 0; j < bmp.width; j++) {
                for (var m = 0; m < bmp.bytesPerPixel; m++) {
                    bmp.pixels[c++] = ReadUi(b, k, 1, true);
                }
            }
            if ((bmp.width * bmp.bytesPerPixel) % 2 == 1) {
                k.k++;
            } // disregard null padding
        }
        return bmp;
    };
    Bitmap.BitmapToImageData = function (bmp) {
        var wd = bmp.width;
        var hg = bmp.height;
        var img = new Uint8ClampedArray(wd * hg * 4);
        for (var y = 0; y < hg; y++) {
            for (var x = 0; x < wd; x++) {
                // the ImageData structure and Bitmap have different conventions for pixel order
                // ImageData has the origin in the top left and is RGB order
                // Bitmap has the origin in the bottom left and is BGR order
                var bmpIndex = ((hg - y - 1) * wd + x) * bmp.bytesPerPixel;
                var b = bmp.pixels[bmpIndex + 0];
                var g = bmp.pixels[bmpIndex + 1];
                var r = bmp.pixels[bmpIndex + 2];
                var a = ((bmp.bytesPerPixel == 4) ? bmp.pixels[bmpIndex + 3] : 255);
                var imgIndex = (y * wd + x) * 4;
                img[imgIndex + 0] = r;
                img[imgIndex + 1] = g;
                img[imgIndex + 2] = b;
                img[imgIndex + 3] = a;
            }
        }
        return img;
    };
    Bitmap.ImageDataToBitmap = function (img, wd, hg) {
        var bmp = new Bitmap(wd, hg, 3);
        for (var y = 0; y < hg; y++) {
            for (var x = 0; x < wd; x++) {
                var imgIndex = (y * wd + x) * 4;
                var r = img[imgIndex + 0];
                var g = img[imgIndex + 1];
                var b = img[imgIndex + 2];
                var a = img[imgIndex + 3];
                var bmpIndex = bmp.offset + ((bmp.height - y - 1) * bmp.bytesPerRaster) + x * bmp.bytesPerPixel;
                bmp.pixels[bmpIndex + 0] = b;
                bmp.pixels[bmpIndex + 1] = g;
                bmp.pixels[bmpIndex + 2] = r;
            }
        }
        return bmp;
    };
    Bitmap.RasterToBitmap = function (raster) { return Bitmap.ImageDataToBitmap(raster.pixels, raster.width, raster.height); };
    Bitmap.prototype.getPixel = function (x, y) {
        // the x and y params measure from the top left, but the pixels are stored starting from the bottom left
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
            var index = this.offset + ((this.height - y - 1) * this.bytesPerRaster) + x * this.bytesPerPixel; // note that (0,0) is the bottom left
            var color = {};
            color.b = this.pixels[index + 0]; // also note the order is BGR, not RGB
            color.g = this.pixels[index + 1];
            color.r = this.pixels[index + 2];
            if (this.bitcount == 32) {
                color.a = this.pixels[index + 3];
            }
            return color;
        }
        else {
            throw new Error();
        }
    };
    Bitmap.prototype.setPixel = function (x, y, color) {
        // the interface of this function takes an (x,y) coordinate assuming y=0 is the top of the canvas
        // but in bmp, (0,0) is the bottom left
        // do we deal with globalAlpha here?  do we deal with gradient fills here?
        if (0 <= x && x < this.width && 0 <= y && y < this.height) {
            if (color.a != null) {
                var background = this.getPixel(x, y);
                var blend = {};
                var factor = (color.a ? (color.a / 255) : 1);
                var inverse = 1 - factor;
                color.r = Math.floor(color.r * factor + background.r * inverse);
                color.g = Math.floor(color.g * factor + background.g * inverse);
                color.b = Math.floor(color.b * factor + background.b * inverse);
            }
            var index = this.offset + ((this.height - y - 1) * this.bytesPerRaster) + x * this.bytesPerPixel; // note that (0,0) is the bottom left
            this.pixels[index + 0] = color.b; // also note the order is BGR, not RGB
            this.pixels[index + 1] = color.g;
            this.pixels[index + 2] = color.r;
        }
    };
    return Bitmap;
}());
exports.Bitmap = Bitmap;
