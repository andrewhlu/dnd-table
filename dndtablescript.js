// WebSockets
var leapMotionWs;
var serverWs;

// Grid configuration
var currSize = 73.11;

// Initiative tracker configuration
var currInit = 2;

// Calibration configuration
var stableThreshold = 10;
var requiredFrames = 150;
var sendEveryNFrames = 1;
var zAxisThreshold = -200;

var data = {type: "calibration"};
var stepNames = ["", "tl", "tr", "bl", "br"];
var currentStep = 0;
var currentCoordinate = {x: 0, y: 0, z: 0};
var frameCounter = 0;
var interval;

// Load background image
window.addEventListener('load', function () {
    document.querySelector('input[type="file"]').addEventListener('change', function () {
        if (this.files && this.files[0]) {
            var img = document.querySelector('img');  // $('img')[0]
            img.src = URL.createObjectURL(this.files[0]); // set src to blob url
        }
    });
});

function createGrid(size) {
    if(size > 0) {
        var gridStatus = document.getElementById("gridDisplay");

        if(gridStatus) {
            gridStatus.remove();
        }

        currSize = size;

        var ratioW = Math.floor($(window).width() / size),
            ratioH = Math.floor($(window).height() / size);

        var parent = $('<div />', {
            id: 'gridDisplay',
            class: 'grid',
            width: ratioW * size,
            height: ratioH * size
        }).addClass('grid').appendTo('body');

        for (var i = 0; i < ratioH; i++) {
            for (var p = 0; p < ratioW; p++) {
                $('<div />', {
                    width: size - 1,
                    height: size - 1
                }).appendTo(parent);
            }
        }
    }
}

// Add row to initiative table
function addInit() {
    $("#initTable tbody").append(
        "<tr>" +
        "<td>Initiative " +
        currInit +
        ": </td>" +
        "<td><div contenteditable>Name (Editable)</div></td>" +
        "</tr>"
    );
    currInit++;
}

// pls remove everything below this
function remInit() {
    $("tr").remove(":contains('Dead')");
    currInit--;
}

function openCalibrationScreen() {
    document.getElementById("table-div").hidden = true;
    document.getElementById("calibration-div").hidden = false;
}

function closeCalibrationScreen() {
    document.getElementById("table-div").hidden = false;
    document.getElementById("calibration-div").hidden = true;
}

// Start Calibration Script
function init() {
    // Create and open the sockets
    leapMotionWs = new WebSocket("ws://localhost:6437/v6.json");
    serverWs = new WebSocket("ws://localhost:8000");

    // On successful connection
    leapMotionWs.onopen = (event) => {
        leapMotionWs.send(JSON.stringify({enableGestures: true}));
        leapMotionWs.send(JSON.stringify({focused: true}));

        focusListener = window.addEventListener('focus', (e) => {
            leapMotionWs.send(JSON.stringify({focused: true})); // claim focus
        });

        blurListener = window.addEventListener('blur', (e) => {
            leapMotionWs.send(JSON.stringify({focused: false})); // relinquish focus
        });

        console.log("Leap Motion WebSocket connection open!");
    };

    serverWs.onopen = (event) => {
        console.log("Python Server WebSocket connection open!");
    }

    leapMotionWs.onmessage = (event) => {
        // Parse finger data only if calibration has been started
        if(currentStep > 0) {
            var object = JSON.parse(event.data);

            var fingers = object.pointables;
            var fingerDetected = false;

            // Loop through all fingers
            for(var i = 0; i < fingers.length; i++) {
                // Look for the first finger that is extended
                if(fingers[i].extended) {
                    // Print finger data on screen
                    document.getElementById("screen-size-p").innerHTML = "X: " + fingers[i].stabilizedTipPosition[0].toFixed(0) + " Y: " + fingers[i].stabilizedTipPosition[1].toFixed(0) + " Z: " + fingers[i].stabilizedTipPosition[2].toFixed(0) + " FC: " + frameCounter + " / " + requiredFrames;

                    if(currentStep < 5) {
                        // Check if the finger is still within range of the saved coordinates
                        if(Math.abs(fingers[i].stabilizedTipPosition[0] - currentCoordinate.x) < stableThreshold &&
                           Math.abs(fingers[i].stabilizedTipPosition[1] - currentCoordinate.y) < stableThreshold &&
                           Math.abs(fingers[i].stabilizedTipPosition[2] - currentCoordinate.z) < stableThreshold) 
                        {
                            // Finger is in range of saved coordinates
                            frameCounter++;

                            if(frameCounter >= requiredFrames) {
                                // This step is complete! Save data and move on to the next step
                                data[stepNames[currentStep]] = currentCoordinate;
                                currentStep++;

                                if(currentStep > 4) {
                                    // Calibration is complete! Send the data to the server
                                    console.log(data);
                                    serverWs.send(JSON.stringify(data));
                                }
                                nextStepCalibration();

                                // Reset saved coordinates
                                frameCounter = 0;
                                currentCoordinate = {
                                    x: 0,
                                    y: 0,
                                    z: 0
                                };
                            }
                        }
                        else {
                            // Finger is not in range of saved coordinates
                            frameCounter = 0;
                            currentCoordinate = {
                                x: fingers[i].stabilizedTipPosition[0],
                                y: fingers[i].stabilizedTipPosition[1],
                                z: fingers[i].stabilizedTipPosition[2]
                            };
                        }
                    }
                    else if(object.id % sendEveryNFrames == 0 && fingers[i].stabilizedTipPosition[2] < zAxisThreshold) {
                        // Calibration is done, display coordinates on screen
                        var topMargin = (window.innerWidth - desiredWidth.value) / 2;
                        var leftMargin = (window.innerHeight - desiredHeight.value) / 2;
                        var srcCorners = [data.tl.x, data.tl.y, data.tr.x, data.tr.y, data.br.x, data.br.y, data.bl.x, data.bl.y];
                        var dstCorners = [0, 0, data.frame.width, 0, data.frame.width, data.frame.height, 0, data.frame.height];
                        var perspT = PerspT(srcCorners, dstCorners);
                        var dstPt = perspT.transform(fingers[i].stabilizedTipPosition[0], fingers[i].stabilizedTipPosition[1]);

                        var touchCircle = document.getElementById("touch-circle");
                        touchCircle.style.left = (dstPt[0] + leftMargin * 1.5 - 15) + "px";
                        touchCircle.style.top = (dstPt[1] + topMargin * 0.5 - 15) + "px";

                        var instructionDisplay = document.getElementById("instruction-p");
                        instructionDisplay.innerHTML = dstPt[1].toFixed() + " x " + dstPt[0].toFixed() + " px, " + touchCircle.style.left + " x " + touchCircle.style.top;

                        var date = new Date();
                        var pointsToSend = {
                            type: "finger-down",
                            time: date.getTime(),
                            position: {
                                x: dstPt[0] + leftMargin * 1.5 - 15,
                                y: dstPt[1] + topMargin * 0.5 - 15
                            }
                        };

                        serverWs.send(JSON.stringify(pointsToSend));
                    }
                    else {
                        // Finger is above Z-Axis threshold, return finger up
                        frameCounter = 0;
                        currentCoordinate = {
                            x: 0,
                            y: 0,
                            z: 0
                        };

                        if(currentStep >= 5 && object.id % sendEveryNFrames == 0) {
                            var date = new Date();
                            var pointsToSend = {
                                type: "finger-up",
                                time: date.getTime()
                            };

                            serverWs.send(JSON.stringify(pointsToSend));
                        }
                    }

                    fingerDetected = true;
                    break;
                }
            }

            if(!fingerDetected) {
                // No finger was detected, reset saved coordinates
                frameCounter = 0;
                currentCoordinate = {
                    x: 0,
                    y: 0,
                    z: 0
                };

                if(currentStep >= 5 && object.id % sendEveryNFrames == 0) {
                    var date = new Date();
                    var pointsToSend = {
                        type: "finger-up",
                        time: date.getTime()
                    };

                    serverWs.send(JSON.stringify(pointsToSend));
                }
            }
        }
    };

    serverWs.onmessage = (event) => {
        console.log(JSON.parse(event.data));
    }

    var screenSizeDisplay = document.getElementById("screen-size-p");
    var rectangle = document.getElementById("calibration-rect");
    var desiredWidth = document.getElementById("rect-width");
    var desiredHeight = document.getElementById("rect-height");

    interval = setInterval(() => {
        // Display window size
        screenSizeDisplay.innerHTML = "This window has a size of " + window.innerWidth + " x " + window.innerHeight + " pixels.";

        // Change rectangle dimensions
        rectangle.style.width = desiredWidth.value + "px";
        rectangle.style.height = desiredHeight.value + "px";

        // Fix margins for box
        rectangle.style.left = ((window.innerWidth - desiredWidth.value) / 2) + "px";
        rectangle.style.top = ((window.innerHeight - desiredHeight.value) / 2) + "px";
    }, 1000);
}

function startCalibration() {
    var desiredWidth = document.getElementById("rect-width");
    var desiredHeight = document.getElementById("rect-height");
    var inputDiv = document.getElementById("input-div");

    inputDiv.hidden = true;

    data["frame"] = {
        width: parseInt(desiredWidth.value),
        height: parseInt(desiredHeight.value)
    };

    data["window"] = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    console.log(data);

    clearInterval(interval);

    currentStep++;
    nextStepCalibration();
}

function nextStepCalibration() {
    console.log(currentStep);
    var instructionDisplay = document.getElementById("instruction-p");
    var touchCircle = document.getElementById("touch-circle");

    touchCircle.hidden = false;

    instructionDisplay.innerHTML = "Touch and hold your index finger to the grey circle.";

    if(currentStep == 1) {
        // Top left
        touchCircle.style.top = ((data.window.height - data.frame.height) / 2 - 15) + "px";
        touchCircle.style.left = ((data.window.width - data.frame.width) / 2 - 15) + "px";
    }
    else if(currentStep == 2) {
        // Top right
        touchCircle.style.top = ((data.window.height - data.frame.height) / 2 - 15) + "px";
        touchCircle.style.left = ((data.window.width - data.frame.width) / 2 + data.frame.width - 15) + "px";
    }
    
    else if(currentStep == 3) {
        // Bottom left
        touchCircle.style.top = ((data.window.height - data.frame.height) / 2 + data.frame.height - 15) + "px";
        touchCircle.style.left = ((data.window.width - data.frame.width) / 2 - 15) + "px";
    }

    else if(currentStep == 4) {
        // Bottom right
        touchCircle.style.top = ((data.window.height - data.frame.height) / 2 + data.frame.height - 15) + "px";
        touchCircle.style.left = ((data.window.width - data.frame.width) / 2 + data.frame.width - 15) + "px";
    }
    else if(currentStep == 5) {
        // Completed
        instructionDisplay.innerHTML = "Calibration is complete!";
    }
}