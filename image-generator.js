var ImageGenerator = (function () {
	function ImageGenerator(randomSource, depth) {
		randomSource = randomSource || new RandomSource();
		depth = depth || 10;
		var startIndex = randomSource.int(ImageGenerator.START_FUNCTIONS.length);
		var modFunctions = [ImageGenerator.START_FUNCTIONS[startIndex](randomSource)];
		while (modFunctions.length < depth) {
			var modIndex = randomSource.int(ImageGenerator.MOD_FUNCTIONS.length);
			modFunctions.push(ImageGenerator.MOD_FUNCTIONS[modIndex](randomSource));
		}
		this.rgbForPosition = function (x, y) {
			var modPos = modFunctions.length - 1;
			var nextFunction = function (x, y) {
				if (modPos >= 0) {
					return modFunctions[modPos--].call(null, x, y, nextFunction);
				}
				return values;
			};
			return nextFunction(x, y);
		};
	}
	ImageGenerator.prototype = {
		to256Range: function (value, brightnessPower) {
			// Sigmoid logistic function
			value = 1/(1 + Math.exp(value));
			value = Math.pow(value, brightnessPower); // Make brighter
			return Math.floor(255.999*Math.max(0, Math.min(1, value)));
		},
		fillCanvas: function (canvas, contrast, brightness) {
			brightness = brightness || 0;
			var brightnessPower = Math.pow(2, -brightness);
			contrast = contrast || 1;
			var width = canvas.width;
			var height = canvas.height;
			var context = canvas.getContext('2d');
			var imageData = context.getImageData(0, 0, width, height);
			var pixels = imageData.data;
			var sumSquare = 0;
			var pixelValues = [];
			for (var x = 0; x < width; x++) {
				for (var y = 0; y < height; y++) {
					var values = this.rgbForPosition(x/(width - 1), y/(height - 1));
					pixelValues.push(values);
					sumSquare += values[0]*values[0] + values[1]*values[1] + values[2]*values[2];
				}
			}
			var rms = Math.sqrt(sumSquare/pixelValues.length/3);
			var normFactor = contrast/Math.max(0.00001, rms);
			for (var x = 0; x < width; x++) {
				for (var y = 0; y < height; y++) {
					var pixelPos = (x + y*width)*4;
					var values = pixelValues[y + x*height];
					pixels[pixelPos] = this.to256Range(values[0]*normFactor, brightnessPower);
					pixels[pixelPos + 1] = this.to256Range(values[1]*normFactor, brightnessPower);
					pixels[pixelPos + 2] = this.to256Range(values[2]*normFactor, brightnessPower);
					pixels[pixelPos + 3] = 256;
				}
			}
			context.putImageData(imageData, 0, 0);
		}
	};
	ImageGenerator.START_FUNCTIONS = [
		// Four-corner fade
		function (randomSource) {
			var topLeft = [randomSource.unitRange(), randomSource.unitRange(), randomSource.unitRange()];
			var topRight = [randomSource.unitRange(), randomSource.unitRange(), randomSource.unitRange()];
			var bottomLeft = [randomSource.unitRange(), randomSource.unitRange(), randomSource.unitRange()];
			var bottomRight = [randomSource.unitRange(), randomSource.unitRange(), randomSource.unitRange()];
			return function (x, y) {
				var rgb = [0, 0, 0];
				var topFactor = 1 - y;
				var bottomFactor = y;
				var leftFactor = 1 - x;
				var rightFactor = x;
				var modifyPixel = function (index, value) {
					return value
						+ topFactor*leftFactor*topLeft[index] + topFactor*rightFactor*topRight[index]
						+ bottomFactor*leftFactor*bottomLeft[index] + bottomFactor*rightFactor*bottomRight[index]
				}
				rgb[0]  = modifyPixel(0, rgb[0]);
				rgb[1]  = modifyPixel(1, rgb[1]);
				rgb[2]  = modifyPixel(2, rgb[2]);
				return rgb;
			}
		},
		// Two-tone grid
		function (randomSource) {
			var gridSize = 3 + randomSource.int(10);
			var evenColour = [randomSource.unitRange(), randomSource.unitRange(), randomSource.unitRange()];
			var oddColour = [randomSource.unitRange(), randomSource.unitRange(), randomSource.unitRange()];
			var inverted = randomSource.prob(0.5) ? 1 : 0;
			var xSkew = randomSource.range(-0.5, 0.5);
			var ySkew = randomSource.range(-0.5, 0.5);
			return function (x, y) {
				var rgb = [0, 0, 0];
				var xIndex = Math.floor((x + y*ySkew)*gridSize);
				var yIndex = Math.floor((y + x*xSkew)*gridSize);
				if ((xIndex + yIndex)%2 == inverted) {
					rgb[0] += evenColour[0];
					rgb[1] += evenColour[1];
					rgb[2] += evenColour[2];
				} else {
					rgb[0] += oddColour[0];
					rgb[1] += oddColour[1];
					rgb[2] += oddColour[2];
				}
				return rgb;
			}
		}
	];
	ImageGenerator.MOD_FUNCTIONS = [
		// Centre lens
		function (randomSource) {
			var radius = randomSource.range(0.25, 0.75);
			var radius2 = radius*radius;
			var centreX = randomSource.range(0.25, 0.75);
			var centreY = randomSource.range(0.25, 0.75);
			var lensFactor = Math.pow(2, randomSource.range(-2, 2));
			var invert = randomSource.prob(0.5) ? 1 : -1;
			return function (x, y, next) {
				var diffX = x - centreX;
				var diffY = y - centreY;
				var r2 = diffX*diffX + diffY*diffY;
				if (r2 < radius2) {
					var factor = invert*Math.pow(r2/radius2, 0.5*(lensFactor - 1));
					x = centreX + diffX*factor;
					y = centreY + diffY*factor;
				} else {
					var factor = invert*Math.pow(radius2/r2, 0.5*(lensFactor - 1));
					x = centreX + diffX*factor;
					y = centreY + diffY*factor;
				}
				return next(x, y);
			}
		},
		// Two-tone grid
		function (randomSource) {
			var gridSize = 3 + randomSource.int(10);
			var evenColour = [randomSource.range(0.25, 0.5), randomSource.range(-0.25, 0.5), randomSource.range(-0.25, 0.5)];
			var oddColour = [randomSource.range(-0.5, 0.25), randomSource.range(-0.5, 0.25), randomSource.range(-0.5, 0.25)];
			var inverted = randomSource.prob(0.5) ? 1 : 0;
			var xSkew = randomSource.range(-0.5, 0.5);
			var ySkew = randomSource.range(-0.5, 0.5);
			return function (x, y, next) {
				var rgb = next(x, y);
				var xIndex = Math.floor((x + y*ySkew)*gridSize);
				var yIndex = Math.floor((y + x*xSkew)*gridSize);
				if ((xIndex + yIndex)%2 == inverted) {
					rgb[0] += evenColour[0];
					rgb[1] += evenColour[1];
					rgb[2] += evenColour[2];
				} else {
					rgb[0] += oddColour[0];
					rgb[1] += oddColour[1];
					rgb[2] += oddColour[2];
				}
				return rgb;
			}
		},
		// Non-linear colours
		function (randomSource) {
			var freq = randomSource.range(Math.PI*0.5, Math.PI*3);
			return function (x, y, next) {
				var rgb = next(x, y);
				rgb[0] = Math.sin(rgb[0]*freq);
				rgb[1] = Math.sin(rgb[0]*freq);
				rgb[2] = Math.sin(rgb[0]*freq);
				return rgb;
			}
		},
		// Multi-point fade
		function (randomSource) {
			var pointCount = 2 + randomSource.int(5);
			var pointX = [], pointY = [], pointColour = [], pointWeight = [], pointOpacity = [];
			while (pointX.length < pointCount) {
				pointWeight.push(randomSource.range(0.1, 1));
				pointX.push(randomSource.unit());
				pointY.push(randomSource.unit());
				pointColour.push([randomSource.unitRange(), randomSource.unitRange(), randomSource.unitRange()]);
				pointOpacity.push(randomSource.range(0, 0.5));
			}
			return function (x, y, next) {
				var rgb = next(x, y);
				var weights = [];
				var totalWeight = 0;
				var opacity = 0;
				var colours = [0, 0, 0];
				for (var i = 0; i < pointCount; i++) {
					var diffX = x - pointX[i];
					var diffY = y - pointY[i];
					var r2 = diffX*diffX + diffY*diffY;
					var weight = pointWeight[i]/Math.max(0.00001, r2);
					totalWeight += weight;
					opacity += weight*pointOpacity[i];
					colours[0] += weight*pointColour[i][0];
					colours[1] += weight*pointColour[i][1];
					colours[2] += weight*pointColour[i][2];
				}
				opacity /= totalWeight;
				rgb[0] = colours[0]/totalWeight + (1 - opacity)*rgb[0];
				rgb[1] = colours[1]/totalWeight + (1 - opacity)*rgb[1];
				rgb[2] = colours[2]/totalWeight + (1 - opacity)*rgb[2];
				return rgb;
			}
		}
	];

	function RandomSource() {
		this.int = function (range) {
			return Math.floor(Math.random()*range);
		};
		this.unitRange = function () {
			return 2*Math.random() - 1;
		};
		this.unit = function () {
			return Math.random();
		};
		this.range = function (a, b) {
			return a + Math.random()*(b - a);
		};
		this.prob = function (threshold) {
			return Math.random() < threshold;
		}
	}

	var publicApi = ImageGenerator;
	publicApi.RandomSource = RandomSource;
	return publicApi;
})();

if (typeof module !== 'undefined') {
	module.exports = ImageGenerator;
}
