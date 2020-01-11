var leapMotionWs;
var serverWs;
var run = false;

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
        if(run) {
            var object = JSON.parse(event.data);

            var fingers = object.pointables;
            var fingerDetected = false;

            var date = new Date();
            for(var i = 0; i < fingers.length; i++) {
                if(fingers[i].extended) {
                    var data = {
                        type: "finger-down",
                        time: date.getTime(),
                        position: {
                            x: fingers[i].btipPosition[0],
                            y: fingers[i].btipPosition[1],
                            z: fingers[i].btipPosition[2]
                        }
                    };

                    serverWs.send(JSON.stringify(data));
                    fingerDetected = true;
                    break;
                }
            }

            if(!fingerDetected) {
                var data = {
                    type: "finger-up",
                    time: date.getTime()
                };

                serverWs.send(JSON.stringify(data));
            }
        }
    };

    // Generate grid
    createGrid(50);
}

function createGrid(size) {
    var ratioW = Math.floor($(window).width()/size),
        ratioH = Math.floor($(window).height()/size);
    
    var parent = $('<div />', {
        class: 'grid', 
        width: ratioW  * size, 
        height: ratioH  * size
    }).addClass('grid').appendTo('body');

    for (var i = 0; i < ratioH; i++) {
        for(var p = 0; p < ratioW; p++){
            $('<div />', {
                width: size - 1, 
                height: size - 1
            }).appendTo(parent);
        }
    }
}
