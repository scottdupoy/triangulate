var ns = "http://www.w3.org/2000/svg";
var maxDimension = 1024;
var maxNumberOfTriangles = 10000;
var progressIncrement = Math.floor(maxNumberOfTriangles / 50);
var minLongestEdgeLength = 12;
var minLongestEdgeSquaredLength = minLongestEdgeLength * minLongestEdgeLength;
var testPath = "/images/aitutaki.jpg";
var svgTriangles = [];
var previousTriangleCount = 0;
var maxTriangleCount = 0;

function handleImageSelect(e) {
    console.log("handling image selection");
    
    var file = e.target.files[0];
    console.log("name: " + file.name);
    console.log("TODO: ensure file type is for an image (via file.type field)");
    
    var fileReader = new FileReader();
    fileReader.onload = function(data) {
        setImage(data.target.result);
    };
    fileReader.readAsDataURL(file);
}

function setImage(src) {
    $("#uploadedImage").attr("src", src);
};

function imageLoaded() {
    console.log("image has loaded");
    
    var image = $("#uploadedImage");
    var originalWidth = image.width();
    var originalHeight = image.height();
    
    var w = originalWidth;
    var h = originalHeight;
    console.log("original dimensions: " + w + " x " + h);
    if (w > maxDimension || h > maxDimension) {
        // scale
        var ratio = maxDimension / (w > h ? w : h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
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
    
    // clear out any existing svg + cached triangle list
    var svgContainer = $("#svgContainer");
    svgContainer.empty();
    svgTriangles = [];
    previousTriangleCount = 0;
    maxTriangleCount = 0;
    
    // svg setup and background
    console.log("TODO: set svg size to match original picture but set viewport (?) to be match the screen");
    var svg = document.createElementNS(ns, "svg");
    svg.setAttributeNS(null, "width", w);
    svg.setAttributeNS(null, "height", h);
    var background = document.createElementNS(ns, "rect");
    background.setAttributeNS(null, "width", w);
    background.setAttributeNS(null, "height", h);
    var backgroundColor = getAverageColor(pixels);
    background.setAttributeNS(null, "fill", backgroundColor);
    svg.appendChild(background);
    
    // set up a target canvas the same size (this will probably be an svg later)
    //var targetCanvas = $("#targetCanvas")[0];
    //targetCanvas.width = w;
    //targetCanvas.height = h;
    //var targetContext = targetCanvas.getContext("2d");
    
    // set background color (may not be necessary if we have two triangles too)
    //targetContext.fillStyle = backgroundColor;
    //targetContext.fillRect(0, 0, w, h);
    
    // add the svg to the dom
    svgContainer[0].appendChild(svg);
    
    var count = 0;
    var triangles = getInitialTriangles(pixels, w, h);
    triangles.forEach(function(triangle) {
        //renderTriangle(targetContext, triangle);
        count++;
        addTriangle(svg, triangle, count);
    });
    
    while (count < maxNumberOfTriangles) {
        // progress => some kind of progress bar?
        if (count % progressIncrement == 0) {
            //console.log("count: " + count + " => " + triangles.length + " triangles");
        }
        
        var worstTriangle = findWorstTriangle(triangles);
        if (worstTriangle === null) {
            console.log("early exit with " + count + " triangles");
            break;
        }
        
        count++;
        splitTriangle(worstTriangle, pixels, w, h).forEach(function (newTriangle) {
            triangles.push(newTriangle);
            //renderTriangle(targetContext, newTriangle);
            addTriangle(svg, newTriangle, count);
        });
        
        worstTriangle.split = true;
    }
    
    previousTriangleCount = count;
    maxTriangleCount = count;
    console.log("count: " + count + " => " + triangles.length + " triangles");
}

function setTriangleCount(count) {
    // normalise input
    if (count < 0) {
        count = 0;
    }
    else if (count > maxNumberOfTriangles) {
        count = maxNumberOfTriangles;
    }
    
    // which direction?
    if (count > previousTriangleCount) {
        // show more triangles (previousTriangleCount + 1 => count)
        var start = getFirstTriangleIndex(previousTriangleCount + 1);
        var end = getSecondTriangleIndex(count);
        console.log("showing more triangles from #" + (previousTriangleCount + 1) + " (index: " + start + ") to #" + count + " (index: " + end + ")");
        for (var i = start; i <= end; i++) {
            svgTriangles[i].show();
        }
        previousTriangleCount = count;
    }
    else if (count < previousTriangleCount) {
        // hide some triangles (count + 1 => previousTriangleCount)
        var start = getFirstTriangleIndex(count + 1);
        var end = getSecondTriangleIndex(previousTriangleCount);
        console.log("hiding triangles from #" + (count + 1) + " (index: " + start + ") to #" + previousTriangleCount + " (index: " + end + ")");
        for (var i = end; i >= start; i--) {
            svgTriangles[i].hide();
        }
        previousTriangleCount = count;
    }
}

function getFirstTriangleIndex(n) {
    if (n <= 0) {
        return 0; // shouldn't happen
    }
    if (n <= 2) {
        return n - 1; // only 1 per triangle for these ones
    }
    return (2 * (n - 1)) - 2;
}

function getSecondTriangleIndex(n) {
    if (n <= 0) {
        return 0; // shouldn't happen
    }
    if (n <= 2) {
        return n - 1; // only 1 per triangle for these ones
    }
    return (2 * (n - 1)) - 1;
}

function splitTriangle(triangle, pixels, w, h) {
    // place holders for new coordinates for each new triangle once split
    var split0p0 = {};
    var split0p1 = {};
    var split0p2 = {};
    var split1p0 = {};
    var split1p1 = {};
    var split1p2 = {};
    
    // split along the longest edge
    if (triangle.len0to1Squared > triangle.len0to2Squared && triangle.len0to1Squared > triangle.len1to2Squared) {
        // p0 to p1 is longest edge. one end for each new triangle
        split0p0 = triangle.p0;
        split1p0 = triangle.p1;
        
        // shared point is p2 so both new triangles get it
        split0p1 = triangle.p2;
        split1p1 = triangle.p2;
        
        // each new triangle gets the midpoint of the longest edge
        var midPoint = {
            x: getMidPoint(triangle.p0.x, triangle.p1.x),
            y: getMidPoint(triangle.p0.y, triangle.p1.y)
        };
        split0p2 = midPoint;
        split1p2 = midPoint;
    }
    else if (triangle.len0to2Squared > triangle.len0to1Squared && triangle.len0to2Squared > triangle.len1to2Squared) {
        // p0 to p2 is longest edge. one end for each new triangle
        split0p0 = triangle.p0;
        split1p0 = triangle.p2;
        
        // shared point is p1 so both new triangles get it
        split0p1 = triangle.p1;
        split1p1 = triangle.p1;
        
        // each new triangle gets the midpoint of the longest edge
        var midPoint = {
            x: getMidPoint(triangle.p0.x, triangle.p2.x),
            y: getMidPoint(triangle.p0.y, triangle.p2.y)
        };
        split0p2 = midPoint;
        split1p2 = midPoint;
    }
    else {
        // p1 to p2 is longest edge. one end for each new triangle
        split0p0 = triangle.p1;
        split1p0 = triangle.p2;
        
        // shared point is p0 so both new triangles get it
        split0p1 = triangle.p0;
        split1p1 = triangle.p0;
        
        // each new triangle gets the midpoint of the longest edge
        var midPoint = {
            x: getMidPoint(triangle.p1.x, triangle.p2.x),
            y: getMidPoint(triangle.p1.y, triangle.p2.y)
        };
        split0p2 = midPoint;
        split1p2 = midPoint;
    }
    
    return [
        getTriangle(pixels, w, h, split0p0, split0p1, split0p2),
        getTriangle(pixels, w, h, split1p0, split1p1, split1p2)
    ];
}

function findWorstTriangle(triangles) {
    var worstTriangle = null;
    triangles.forEach(function(triangle) {
        if (triangle.split || !triangle.splittable) {
            return;
        }
        if (worstTriangle === null || triangle.difference > worstTriangle.difference) {
            
            worstTriangle = triangle;
        }
    });
    return worstTriangle;
}

function renderTriangle(context, triangle) {
    var style = getStyle(triangle);
    // var t = triangle;console.log("drawing triangle: " + 
    //     "(" + t.p0.x + "," + t.p0.y + ")," +
    //     "(" + t.p1.x + "," + t.p1.y + ")," +
    //     "(" + t.p2.x + "," + t.p2.y + ") => " +
    //     style);
    context.beginPath();
    context.fillStyle = style;
    context.moveTo(triangle.p0.x, triangle.p0.y);
    context.lineTo(triangle.p1.x, triangle.p1.y);
    context.lineTo(triangle.p2.x, triangle.p2.y);
    context.fill();
}

function addTriangle(svg, triangle, count) {
    var color = getStyle(triangle);
    var svgTriangle = document.createElementNS(ns, "polygon");
    var points =
        triangle.p0.x + "," + triangle.p0.y + " " +
        triangle.p1.x + "," + triangle.p1.y + " " +
        triangle.p2.x + "," + triangle.p2.y;
    svgTriangle.setAttributeNS(null, "points", points);
    svgTriangle.setAttributeNS(null, "fill", color);
    svgTriangle.setAttributeNS(null, "stroke", color);
    svgTriangles.push($(svgTriangle)); // wrap it in a jquery object
    svg.appendChild(svgTriangle);
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
    var len0to1Squared = getEdgeSquaredLength(p0, p1);
    var len0to2Squared = getEdgeSquaredLength(p0, p2);
    var len1to2Squared = getEdgeSquaredLength(p1, p2);
    var splittable = len0to1Squared > minLongestEdgeSquaredLength
                        || len0to2Squared > minLongestEdgeSquaredLength
                        || len1to2Squared > minLongestEdgeSquaredLength;
    
    // construct the triangle (could put the points in an array...)
    return {
        p0: p0,
        p1: p1,
        p2: p2,
        averageColor: averageColor,
        numberOfPixels: numberOfPixels,
        difference: difference,
        len0to1Squared: len0to1Squared,
        len0to2Squared: len0to2Squared,
        len1to2Squared: len1to2Squared,
        splittable: splittable,
        split: false,
    };
}

function getEdgeSquaredLength(p0, p1) {
    var w = p1.x - p0.x;
    var h = p1.y - p0.y;
    return w * w + h * h;
}

function getMidPoint(x0, x1) {
    return x0 + Math.round((x1 - x0) / 2);
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
    setImage(testPath);
}

$(function() {
    $("#imageSelector").change(handleImageSelect);
    $("#uploadedImage").hide().load(imageLoaded);
    preLoadTestImage();
});
