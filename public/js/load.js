var maxDimension = 240;
var maxNumberOfTriangles = 5000;

function handleImageSelect(e) {
    console.log("handling image selection");
    
    var file = e.target.files[0];
    console.log("name: " + file.name);
    console.log("TODO: ensure file type is for an image (via file.type field)");
    
    var fileReader = new FileReader();
    fileReader.onload = function(data) {
        loadImage(data.target.result);
    };
    fileReader.readAsDataURL(file);
}

function loadImage(src) {
    var image = $("#uploadedImage");
    image.hide();
    image.attr("src", src);
    image.load(function() {
        console.log("image has loaded" + image.height());
        
        var originalWidth = image.width();
        var originalHeight = image.height();
        
        var w = originalWidth;
        var h = originalHeight;
        console.log("original dimensions: " + w + " x " + h);
        if (w > maxDimension || h > maxDimension) {
            // scale
            var ratio = maxDimension / (w > h ? w : h);
            w *= ratio;
            h *= ratio;
        }
        
        // scale the image
        image.width(w); // preserves aspect ratio
        image.show();
        
        // draw on source canvas hidden to the same dimensions as the scaled image
        var sourceCanvas = $("#sourceCanvas")[0];
        sourceCanvas.width = w;
        sourceCanvas.height = h
        var sourceContext = sourceCanvas.getContext("2d");
        console.log("TODO: smooth drawImage (or do it unscaled)");
        sourceContext.drawImage(image[0], 0, 0, w, h);
        var pixels = sourceContext.getImageData(0, 0, w, h).data;
        
        // set up a target canvas the same size (this will probably be an svg later)
        var targetCanvas = $("#targetCanvas")[0];
        targetCanvas.width = w;
        targetCanvas.height = h;
        var targetContext = targetCanvas.getContext("2d");
        
        // set background color (may not be necessary if we have two triangles too)
        targetContext.fillStyle = getAverageColor(pixels);
        targetContext.fillRect(0, 0, w, h);
        
        var triangles = getInitialTriangles(pixels, w, h);
        triangles.forEach(function(triangle) {
            renderTriangle(targetContext, triangle);
        });
        
        var count = triangles.length;
        while (count < maxNumberOfTriangles) {
            console.log("count: " + count);
            var worstTriangle = findWorstTriangle(triangles);
            if (worstTriangle === null) {
                console.log("early exit with " + count + " triangles");
                break;
            }
            //splitTriangle(worstTriangle, targetContext);
        }
    });
}

function findWorstTriangle(triangles) {
    var worstTriangle = null;
    triangles.forEach(function(triangle) {
        
    });
    return null;
}

function renderTriangle(context, triangle) {
    var style = getStyle(triangle);
    var t = triangle;console.log("drawing triangle: " + 
        "(" + t.p0.x + "," + t.p0.y + ")," +
        "(" + t.p1.x + "," + t.p1.y + ")," +
        "(" + t.p2.x + "," + t.p2.y + ") => " +
        style);
    context.beginPath();
    context.fillStyle = style;
    context.moveTo(triangle.p0.x, triangle.p0.y);
    context.lineTo(triangle.p1.x, triangle.p1.y);
    context.lineTo(triangle.p2.x, triangle.p2.y);
    context.fill();
}

function getStyle(triangle) {
    return "rgb(" + triangle.averageColor.red + "," + triangle.averageColor.green + "," + triangle.averageColor.blue + ")";
}

function getInitialTriangles(pixels, w, h) {
    // TODO: initial split in direction which is best
    return [
        getTriangle(pixels, w, h, { x: 0, y: 0 }, { x: 0, y: h }, { x: w, y: h }),
        getTriangle(pixels, w, h, { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }),
    ];
}

function getTriangle(pixels, w, h, p0, p1, p2) {    
    var box = getBoundingBox(w, h, p0, p1, p2);
    
    var targetPixels = []; // pre-allocate + keep track of how many used?
    
    var red = 0;
    var green = 0;
    var blue = 0;
    
    for (var x = box.minX; x <= box.maxX; x++) {
        for (var y = box.minY; y <= box.maxY; y++) {
            // check if pixel is in triangle
            if (!isPointInTriangle({ x: x, y: y }, p0, p1, p2)) {
                continue;
            }
            
            var index = 4 * (x + y * w);
            var r = pixels[index++];
            var g = pixels[index++];
            var b = pixels[index];
            
            red += r;
            green += g;
            blue += b;
            
            targetPixels.push({ red: r, green: g, blue: b });
        }
    }
    
    var numberOfPixels = targetPixels.length;
    var averageColor = { red: 255, green: 255, blue: 255 }; // default to white
    if (numberOfPixels > 0) {
        averageColor = {
            red: Math.round(red / numberOfPixels),
            green: Math.round(green / numberOfPixels),
            blue: Math.round(blue / numberOfPixels)
        };
    }
    
    var difference = quantifyColorDifferences(targetPixels, averageColor);
    
    // construct a triangle (could put the points in an array...)
    return {
        p0: p0,
        p1: p1,
        p2: p2,
        averageColor: averageColor,
        numberOfPixels: numberOfPixels,
        difference: difference,
        split: false,
    };
}

function quantifyColorDifferences(pixels, averageColor) {
    // using root-mean-square difference but since we only care about whether or not
    // the difference is reducing there's no need to do the computationally complex
    // square root.
    var difference = 0;
    pixels.forEach(function(pixel) {
        var redDiff = pixel.red - averageColor.red;
        var greenDiff = pixel.green - averageColor.green;
        var blueDiff = pixel.blue - averageColor.blue;
        difference += (redDiff * redDiff) + (greenDiff * greenDiff) + (blueDiff * blueDiff);
    });
    return difference;
}

function getBoundingBox(w, h, tp0, tp1, tp2) {
    var box = {
        minX: tp0.x,
        maxX: tp0.x,
        minY: tp0.y,
        maxY: tp0.y
    };
    
    box.minX = box.minX < tp1.x ? box.minX : tp1.x;
    box.minX = box.minX < tp2.x ? box.minX : tp2.x;
    box.maxX = box.maxX > tp1.x ? box.maxX : tp1.x;
    box.maxX = box.maxX > tp2.x ? box.maxX : tp2.x;
    
    box.minY = box.minY < tp1.y ? box.minY : tp1.y;
    box.minY = box.minY < tp2.y ? box.minY : tp2.y;
    box.maxY = box.maxY > tp1.y ? box.maxY : tp1.y;
    box.maxY = box.maxY > tp2.y ? box.maxY : tp2.y;
    
    box.minX = box.minX < 0 ? 0 : box.minX;
    box.maxX = box.maxX >= w ? w - 1 : box.maxX;
    box.minY = box.minY < 0 ? 0 : box.minY;
    box.maxY = box.maxY >= h ? h - 1 : box.maxY;
    
    return box;
}

function getAverageColor(pixels) {
    var red = 0;
    var green = 0;
    var blue = 0;
    for (var i = 0; i < pixels.length; i += 4) {
        red += pixels[i];
        green += pixels[i + 1];
        blue += pixels[i + 2];
        // ignore alpha
    }
    var count = pixels.length / 4;
    red /= count;
    green /= count;
    blue /= count;
    return "rgb(" + Math.round(red) + "," + Math.round(green) + "," + Math.round(blue) + ")"
}

function isPointInTriangle(p, tp0, tp1, tp2) {
    // http://stackoverflow.com/questions/2049582/how-to-determine-if-a-point-is-in-a-2d-triangle
    // http://jsfiddle.net/PerroAZUL/zdaY8/1/
    var A = 1/2 * (-tp1.y * tp2.x + tp0.y * (-tp1.x + tp2.x) + tp0.x * (tp1.y - tp2.y) + tp1.x * tp2.y);
    var sign = A < 0 ? -1 : 1;
    var s = (tp0.y * tp2.x - tp0.x * tp2.y + (tp2.y - tp0.y) * p.x + (tp0.x - tp2.x) * p.y) * sign;
    var t = (tp0.x * tp1.y - tp0.y * tp1.x + (tp0.y - tp1.y) * p.x + (tp1.x - tp0.x) * p.y) * sign;
    return s > 0 && t > 0 && (s + t) < 2 * A * sign;
}

function preLoadTestImage() {
    loadImage("/images/test.jpg");
}

$(function() {
    $("#imageSelector").change(handleImageSelect);
    preLoadTestImage();
});
