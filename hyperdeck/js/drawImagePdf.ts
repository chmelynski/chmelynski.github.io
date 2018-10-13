// image is of type Bitmap, HTMLImageElement, HTMLCanvasElement, HTMLVideoElement
			// g.drawImage(image, dx, dy) - natural width and height are used
			// g.drawImage(image, dx, dy, dw, dh) - image is scaled to fit specified width and height
			// g.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) - all parameters specified, image scaled as needed (note that src params come first here)
			if (dw === undefined) { dw = image.width; }
			if (dh === undefined) { dh = image.height; }
			if (sx === undefined) { sx = 0; }
			if (sy === undefined) { sy = 0; }
			if (sw === undefined) { sw = image.width; }
			if (sh === undefined) { sh = image.height; }
			
			if (image.constructor.name == 'Bitmap')
			{
				// build pixelArray: Uint8ClampedArray
				//var color = (image as Bitmap).getPixel(j, i);
				//var R = color.r;
				//var G = color.g;
				//var B = color.b;
			}
			else
			{
				// we draw the image onto an invisible canvas to get access to pixel data
				var savedCanvasWidth = image.width;
				var savedCanvasHeight = image.height;
				//var savedCanvasWidth = dw;
				//var savedCanvasHeight = dh;
				
				this.savedCanvas.width = savedCanvasWidth;
				this.savedCanvas.height = savedCanvasHeight;
				this.savedCanvasContext.clearRect(0, 0, savedCanvasWidth, savedCanvasHeight);
				//this.savedCanvasContext.drawImage(image, 0, 0);
				this.savedCanvasContext.drawImage(image, 0, 0, savedCanvasWidth, savedCanvasHeight);
				
				var imageData = this.savedCanvasContext.getImageData(0, 0, savedCanvasWidth, savedCanvasHeight);
				var pixelData = imageData.data;
				
				this.pdf.drawImageImpl(pixelData, imageData.width, imageData.height, dx, dy, dw, dh);
			}