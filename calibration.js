var leapMotionWs;
var serverWs;

var data = {
    type: "calibration"
}

var stepNames = ["", "tl", "tr", "bl", "br"];
var currentStep = 0;

var stableThreshold = 10;
var requiredFrames = 200;
var currentCoordinate = {
    x: 0,
    y: 0,
    z: 0
}
var frameCounter = 0;

var interval;

function init() {
    // Create and open the sockets
    leapMotionWs = new WebSocket("ws://localhost:6437/v6.json");
    serverWs = new WebSocket("ws://192.168.1.3:8000");

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
        if(currentStep > 0 && currentStep < 5) {
            var object = JSON.parse(event.data);

            var fingers = object.pointables;
            var fingerDetected = false;

            // Loop through all fingers
            for(var i = 0; i < fingers.length; i++) {
                // Look for the first finger that is extended
                if(fingers[i].extended) {
                    // Print finger data on screen
                    document.getElementById("screen-size-p").innerHTML = "X: " + fingers[i].stabilizedTipPosition[0].toFixed(0) + " Y: " + fingers[i].stabilizedTipPosition[1].toFixed(0) + " Z: " + fingers[i].stabilizedTipPosition[2].toFixed(0) + " FC: " + frameCounter + " / " + requiredFrames;

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
        touchCircle.hidden = true;
        instructionDisplay.innerHTML = "Calibration is complete!";
    }
}