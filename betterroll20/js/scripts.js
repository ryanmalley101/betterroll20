/*!
* Start Bootstrap - Simple Sidebar v6.0.5 (https://startbootstrap.com/template/simple-sidebar)
* Copyright 2013-2022 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-simple-sidebar/blob/master/LICENSE)
*/
/*global WildRydes _config AmazonCognitoIdentity AWSCognito*/
// 
// Scripts
//


var socket;

var current;
var list = [];
var state = [];
var index = 0;
var index2 = 0;
var action = false;
var refresh = true;

var userFullName = 'unauthenticated_fullname';
var username = 'unauthenticated_username';
var userEmail = 'unauthenticated_email';
var userEmailVerified = 'unauthenticated_emailverified';
var userGender = 'unauthenticated_gender';

var s3;
var sessionToken;

var charSheetButtonEl = $('open-character-sheet'),
  drawingModeEl = $('drawing-mode'),
  drawingOptionsEl = $('drawing-mode-options'),
  drawingColorEl = $('drawing-color'),
  drawingShadowColorEl = $('drawing-shadow-color'),
  drawingLineWidthEl = $('drawing-line-width'),
  drawingShadowWidth = $('drawing-shadow-width'),
  drawingShadowOffset = $('drawing-shadow-offset'),
  clearEl = $('clear-canvas');

var grid = 70;

var $ = function(id){return document.getElementById(id)};

var canvas = this.__canvas = new fabric.Canvas('playcanvas', {
isDrawingMode: true
});


// canvas.counter = 0;
var newleft = 0;
canvas.selection = false;

var backgroundURL = 'https://betterroll20s3.s3.us-west-1.amazonaws.com/img/map_15x14.png';
var srdurl = 'https://www.dnd5eapi.co/api/';
var spellurl = 'https://www.dnd5eapi.co/api/spells/'

fabric.Object.prototype.transparentCorners = false;

var stateHistory;

var editingFOW = false;
var fowgroup;

var rulerMode = false;
var rulerLine;
var rulerText;
var rulerTime = 0;

var charSheetButtonEl = $('open-character-sheet'),
  drawingModeEl = $('drawing-mode'),
  fogofwarMenuEl = $('fowmenu'),
  fogofwarOptionsEl = $('fowoptions'),
  fogofwarEl = $('edit-fow'),
  fogofwarHideEl = $('hidefow'),
  fogofwarHideLbl = $('hidelbl'),
  fogofwarRevealEl = $('revealfow'),
  fogofwarRevealLbl = $('reveallbl'),
  fogofwarRevealAllEl = $('revealall-fow'),
  fogofwarHideAllEl = $('hideall-fow'),
  rulerButtonEl = $('rulerbtn'),

  drawingOptionsEl = $('drawing-mode-options'),
  drawingColorEl = $('drawing-color'),
  drawingShadowColorEl = $('drawing-shadow-color'),
  drawingLineWidthEl = $('drawing-line-width'),
  drawingShadowWidth = $('drawing-shadow-width'),
  drawingShadowOffset = $('drawing-shadow-offset'),
  clearEl = $('clear-canvas');

const UserProfileAttributes = {
    Gender: "gender",
    UserName: "preferred_username",
    Email: "email",
    EmailVerified: "email_verified",
    FullName: "name",
    Group: "usergroup"
}

const ChatCommands = {
    ListUsers: "/list",
    HelpCommands: "/help"
}

/**
 * Initialize app after page is loaded
 */

window.addEventListener('DOMContentLoaded', event => {
    init();
});

/**
 * Initialization function. At the end of init(), the app should have the most 
 * up to date canvas loaded, websocket connected, personal profile data loaded
 * and the page should be in its default state
 * 
 */

function init() {
    action=false;
    console.log("Pull and load user attributes from cognito");
    assignUserAttributes();
    console.log("Initializing websocket connection");
    socket = new WebSocket('wss://5v891qyp15.execute-api.us-west-1.amazonaws.com/Prod');
    socket.addEventListener('open', (event) => {
        console.log("Save the connectionID to Inara");
        saveSocketConnection(socket);
        console.log("Loading current canvas state");
        loadCanvasState();
    });
    console.log("Set receiveSocketMessage as callback for incoming socket messages");
    socket.onmessage = function(evt) {receiveSocketMessage(evt);};
    console.log("Drawing background image");
    drawBackground();
    console.log("Drawing Grid");
    drawGrid();
    console.log("Initializing sidebar/draggable windows/chat input");
    sidebarToggleConfig();
    popUpDragConfig();
    chatInputConfig();
    console.log("Initialize command history object");
    stateHistory = new CommandHistory();
    console.log("Initializing S3 Bucket");
    initS3();
    console.log("Initialize fog of war");
    initFOWEl();
    initFowCanvas(false);
    console.log("Initializing Ruler");
    initRuler();
    fetchSRDSpells();

    // Lazy way of setting the character sheet and drawing mode elements
    document.getElementById("defaultOpen").click();
    document.getElementById("panel1 dragspellcard").style.display = "none";
    drawingModeEl.click();
    charSheetButtonEl.click();
    action=true;
}

/**
 * Saves the connectionID to the Inara user item. Only called after the
 * socket is initialized and open
 * 
 */

function saveSocketConnection() {
    if(socket.readyState == 1) {
        if(AWS.config.credentials !=null) {
            AWS.config.credentials.get(function(err) {
                if (!err) {
                    var id = AWS.config.credentials.identityId;
                    sendSocketMessage(MessageType.InaraConnect, id, username);
                }
                else {
                    console.log("Could not save socket connection, error retrieving cognito credentials");
                }
            });
        }
        else {
            console.log("Not saving connection ID, no AWS credentials");
        }
    }
    else {
        console.log("Tried to save connectionID to Inara, but the socket wasn't open: " + socket.readyState)
    }
}


/**
 * Calls a REST API to get the current canvas state from the database
 * 
 */
function loadCanvasState() {
    console.log('loading canvas state from REST API')
    var idt = getIDToken();
    console.log(idt);
    const loadState = async () => {
        const response = await fetch('https://wrj9st3ceb.execute-api.us-west-1.amazonaws.com/prod',{ 
            method: 'get', 
            headers: new Headers({
                'Authorization': idt
        })});
        const myJson = await response.json(); //extract JSON from the http response
        console.log(myJson);
        canvasData = JSON.parse(myJson.body).contents.S;
        if(canvasData != ''){
            // console.log(canvasData);
            canvas.loadFromJSON(canvasData);
            for (const co of canvas.getObjects()) {
                co.selectable = (co.name != undefined && co.name == username)
            }
            canvas.renderAll();
        }
        else {
            setCanvasState();
        }
      // do something with myJson
    }
    loadState();
}

/**
 * Calls a REST API to upload the current canvas state to the database
 * 
 */
function setCanvasState() {
    console.log('setting canvas state with REST API')
    var idt = getIDToken();

    const setState = async () => {
      const response = await fetch('https://wrj9st3ceb.execute-api.us-west-1.amazonaws.com/prod',{ 
        method: 'post',
        body: JSON.stringify(canvas),
        headers: new Headers({
            'Authorization': idt
        })});
      const myJson = await response.json(); //extract JSON from the http response
      console.log(myJson);
      // do something with myJson
    }
    setState(); 
}


/**
 * Called when the submit or enter button are hit when using the chat window.
 * Gets the value of the message box and brodcasts it to the websocket.
 * 
 */

function sendChatMessage() {
    var text = document.getElementById("message").value;
    switch(text) {
        case ChatCommands.ListUsers:
            var idt = getIDToken();
            const getUsers = async () => {
                const response = await fetch('https://wrj9st3ceb.execute-api.us-west-1.amazonaws.com/prod/inara',{ 
                    method: 'get',
                    headers: new Headers({
                        'Authorization': idt
                })});
                const myJson = await response.json(); //extract JSON from the http response
                console.log(myJson);

                var activeUserString = 'Online Users: \r\n';
                for (const user of myJson.body) {
                    activeUserString += user;
                    activeUserString += '\r\n';
                }
                putChatMessage('Inara', activeUserString);
            }
            getUsers();
            break;

        case ChatCommands.HelpCommands:
            putChatMessage('Inara', '/help : Lists available command \r\n /list : Lists users currently online \r\n /roll (/r) : \
                Rolls dice, ex. 1d20+2 \r\n /w : Whispers a message to a user ex. /w Inara This is a whispered message')
            break;

        default:
            //console.log("Sending a chat message " + MessageType.ChatMessage + " " + document.getElementById("message").value);
            sendSocketMessage(MessageType.ChatMessage, username, text);
            break;
    }
    // Blank the text input element, ready to receive the next line of text from the user.
    document.getElementById("message").value = "";
}

/**
 * Incoming websocket message handler. Disammbiguates the messagetype
 * and takes an action based on it
 * 
 * @param  {String} socketMessage The message arriving directly from the
 *                                websocket.
 */

function receiveSocketMessage(socketMessage) {
    console.log("Receiving a message from the websocket");
    console.log(socketMessage);

    // msg.data is the JSON payload of the websocket message. 
    var msg = JSON.parse(socketMessage['data']);
    console.log(msg);

    msgtype = msg.messageType;
    var msgcontents = msg.data.contents;
    switch(msgtype) {
        //Canvas updates contain the entire canvas as a json payload
        case MessageType.CanvasUpdate:
            action = false;
            console.log("Got a canvas update message");
            var canvasAction;
            var messageAction = msgcontents.command;
            console.log(msgcontents.target);
            var enlivenedTarget;
            fabric.util.enlivenObjects([msgcontents.target], function(objects) {
                objects.forEach(function(o) {
                    if (o !=null && o.owner != username) {
                        switch (messageAction) {
                            case "add":
                                console.log("adding an object");
                                canvasAction = new AddCommand(o);
                                canvasAction.execute(canvas);
                                break;
                            case "transform":
                                console.log("transforming an object");
                                canvasAction = new TransformCommand(o, msgcontents.transform);
                                canvasAction.execute(canvas);
                                break;
                            case "remove":
                                console.log("removing an object")
                                canvasAction = new RemoveCommand(o);
                                canvasAction.execute(canvas);
                                break;
                            default:
                                console.log("Could not identify canvas action: " + messageAction);
                        }
                    }
                    else {
                        console.log("Enlivened Object was null");
                    }
                });
            });
//            updateCanvas(msg.data);
            action=true;
            break;
        //Chat messages are either rolls or whispers
        case MessageType.ChatMessage:
            console.log("Got a chat message");

            msgContents = msg.data;
            var chatMessageList = document.querySelector(".chatlist");

            // Messages with rolls need to be parsed into the rollMessageTemplate
            if(msgContents.diceroll.S != '') {
               var template = document.querySelector('#rollMessageTemplate');
               var clone = template.content.cloneNode(true);
               clone.querySelector('.messageSender').textContent = msgContents.sender.S + ':';
               clone.querySelector('.rollAttribute').textContent = msgContents.rollAttribute.S+ ':';
               clone.querySelector('.diceRoll').textContent = msgContents.contents.S;
               clone.querySelector('.diceResult').textContent = msgContents.diceroll.S;
               chatMessageList.appendChild(clone);
            }
            // Non-roll messages should just be parsed as chat messages
            else {
               var template = document.querySelector('#chatMessageTemplate');
               var clone = template.content.cloneNode(true);
               clone.querySelector('.messageSender').textContent = msgContents.sender.S+ ':';
               clone.querySelector('.messageContents').textContent = msgContents.contents.S;
               chatMessageList.appendChild(clone);
           }
           break;
        // Broadcast actions are currently just pointer animations, expect this to grow
        case MessageType.BroadcastAction:
            console.log('Broadcasting action (either a pointer animation or canvas update: ' + msg.data.contents);
            animatePointer(msg.data.contents);
            break;
        // 
        default:
            console.log("MessageType not found in enumeration: " + msgtype);
    }
}

/**
 * Kind of useless function that just handles setting the canvas background
 * Change the backgroundURL global variable to change the background.
 * 
 * @todo In the future this should probably be fetched from the database
 * 
 */

function drawBackground() {
    canvas.setBackgroundImage(backgroundURL, canvas.renderAll.bind(canvas));
}

/**
 * Draws the grid over the battlemap
 * 
 * @param  {String} socketMessage The message arriving directly from the
 *                                websocket.
 */

function drawGrid(grid = 70) {
    canvasEl = document.getElementsByClassName("canvas-container")[0];
    bw = canvasEl.width;
    bh = canvasEl.height;
    var x = 0;
    var y = 0;
    var gridGroup = new fabric.Group([], {
      left: 0,
      top: 0,
      angle: 0,
      selectable: false,
      excludeFromExport: true,
      evented: false
    });
    for (x = 0; x <= bw; x+= grid) {
        var newLine = new fabric.Line([x, 0, x, bh], {
          fill: 'black',
          stroke: 'black',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true
        })
        gridGroup.add(newLine);
    }
    for (y = 0; y <= bh; y+= grid) {
        var newLine = new fabric.Line([0, y, bw, y], {
          fill: 'black',
          stroke: 'black',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true
        })
        gridGroup.add(newLine);
    }
    canvas.add(gridGroup);
    canvas.sendToBack(gridGroup);
}

/**
 * Loads the canvas retrieved from the websocket. 
 * 
 * @param  {CanvasJSON} canvasState CanvasState JSON object retrieved after a 
 *                                              canvas update
 */

var updateCanvas = function (canvasState) {
    console.log(canvasState);
    action=false;

    // Check if the canvas update was for the Fog of War canvas
    if (canvasState.messageID.S == 'fogofwar') {
        fabric.util.enlivenObjects(JSON.parse(canvasState.contents.S), function(objects) {
          //Save the current renderonaddremove property to restore it later
          var origRenderOnAddRemove = canvas.renderOnAddRemove;
          canvas.renderOnAddRemove = false;
          console.log("Adjusting FOW canvas");
          console.log(objects);
          //Remove everything 
          for (let i = 0; i < fowgroup.size(); i++) {
            fowgroup.remove(fowgroup.getObjects()[i]);
          }
          objects.forEach(function(o) {
            fowgroup.add(o);
          });
          canvas.renderOnAddRemove = origRenderOnAddRemove;
          canvas.renderAll();
          action = true;
        });
    }
    // If its not for the Fog of War, just load the contents and then draw the background and grid
    else {
        canvas.loadFromJSON(canvasState.contents.S, function() {drawBackground(); drawGrid(); action = true;});
    }
    canvas.renderAll();
}


/**
 * Configures the toggle-able sidebar to the left of the page
 * 
 */

function sidebarToggleConfig() {
    // Toggle the side navigation
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        // Uncomment Below to persist sidebar toggle between refreshes
        // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
        //     document.body.classList.toggle('sb-sidenav-toggled');
        // }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }
}

/**
 * Function that makes allows the user to draw the character sheet window
 * Potentially useful for other things down the line similarly
 * 
 */

function popUpDragConfig() {
    document.onkeyup = KeyPress;
    $('.draggable-handler').mousedown(function(e){
      drag = $(this).closest('.draggable')
      drag.addClass('dragging')
      drag.css('left', e.clientX-$(this).width()/2)
      drag.css('top', e.clientY-$(this).height()/2)
      $(this).on('mousemove', function(e){
        drag.css('left', e.clientX-$(this).width()/2)
        drag.css('top', e.clientY-$(this).height()/2)
        window.getSelection().removeAllRanges()
      })
    })

    $('.draggable-handler').mouseleave(stopDragging)
    $('.draggable-handler').mouseup(stopDragging)

    function stopDragging(){
      drag = $(this).closest('.draggable')
      drag.removeClass('dragging')
      $(this).off('mousemove')
    }

    $(document).on('click', 'a#check-iframe-content-url', function(){
      // blocked by CORS
      alert($("#iframe-source").contents().find('.primary'));
    });
}


/**
 * Configures the chat message elements in the bottom right corner.
 * 
 */

function chatInputConfig() {
    // Get the input field
    var messageinput = document.getElementById("message");

    // Execute a function when the user releases a key on the keyboard
    messageinput.addEventListener("keyup", function(event) {
      // Number 13 is the "Enter" key on the keyboard
      if (event.keyCode === 13) {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        document.getElementById("messagebutton").click();
      }
    });

    putChatMessage('Inara', 'Welcome to Better Roll20');
}


/**
 * Puts a chat message into the chat window. Mostly used for local messages
 * like /help and /list
 * 
 */
function putChatMessage(sender, contents) {
    // Puts a message in the chat on initialization
    var _chatMessageList = document.querySelector(".chatlist");
    var _template = document.querySelector('#chatMessageTemplate');
    var _clone = _template.content.cloneNode(true);
    _clone.querySelector('.messageSender').textContent = sender;
    _clone.querySelector('.messageContents').textContent = contents;
    _chatMessageList.appendChild(_clone);
}


/**
 * Opens the charactersheet when the character sheet button in the top left
 * 
 */

charSheetButtonEl.onclick = function () {
    charSheetEl = document.getElementById("panel1 dragcharsheet");
    if (charSheetEl.style.visibility == 'hidden') {
        charSheetButtonEl.innerHTML = 'Hide Character Sheet';
        charSheetEl.style.visibility = 'visible';
    }
    else {
        charSheetButtonEl.innerHTML = 'Show Character Sheet';
        charSheetEl.style.visibility = 'hidden';
    }
}

/**
 * Gets the user attributes for the logged-in user and assigns them on both
 * the back and frontend. More useful in the profile page.
 * 
 */
function assignUserAttributes() {
    console.log("Getting and assigning user attribute values");
    getUserProfile(function(result) {
        var jwt = jwt_decode(getIDToken());
        if (result == null) {
            console.log('Couldnt get user attributes');
            return;
        }
        for (i = 0; i < result.length; i++) {
            switch(result[i].getName()) {
                case UserProfileAttributes.Email:
                    userEmail = result[i].getValue();
                    break;
                case UserProfileAttributes.FullName:
                    userFullName = result[i].getValue();
                    break;
                case UserProfileAttributes.UserName:
                    username = result[i].getValue();
                    break;
                case UserProfileAttributes.Gender:
                    userGender = result[i].getValue();
                    break;
                case UserProfileAttributes.EmailVerified:
                    userEmailVerified = result[i].getValue();
                    break;
            }
        }
        group = jwt['cognito:groups'][0];
        console.log(group);
    });
}

/**
 * Initializes the S3 bucket for storing and retrieving images added to the 
 * canvas (and possibly other).
 * 
 */

function initS3() {
    var bucketName = _config.s3.bucketName;
    var bucketRegion = _config.s3.region;
    s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        params: {Bucket: bucketName}
    });
}

/**
 * Initialize the fog of war canvas
 * 
 * @param  {boolean} hideall Flag to either reveal or hide the map by on init
 *                           (Set false by default)
 */

function initFowCanvas(hideall=false) {
    //Set action to false so it doesnt hit the action queue
    action=false;

    //All fog of war updates should be added through this group
    fowgroup = new fabric.Group([], {
      left: 0,
      top: 0,
      angle: 0,
      selectable: false,
      excludeFromExport: true,
      evented: false
    });

    // If we want to hide everything first, set the hideall flag
    if (hideall) {
        //Black out the entire FOW canvas
        var blackRect = new fabric.Rect({
          left: 0,
          top: 0,
          fill: 'black',
          width: canvas.getWidth(),
          height: canvas.getHeight(),
          selectable: false,
          evented: false
        });

        fowgroup.add(blackRect)
    }

    // Add FOW group to the canvas
    canvas.add(fowgroup);
    // Re-enable action so that future updates get tracked in stateaction
    action=true;
}

/**
 * Hides the FOW button in the sidebar menu when first loaded
 * 
 */
function initFOWEl() {
    fogofwarMenuEl.style.display = 'none';
}

/**
 * Toggles the fog of war menu in the sidebar
 * 
 */
fogofwarEl.onclick = function() {
    editingFOW = !editingFOW;
    if(editingFOW) {
        rulerMode = false;
        fogofwarEl.innerHTML = 'Exit FOW Mode';
        fogofwarOptionsEl.style.display = '';
        clearEl.style.display = 'none';
        drawingModeEl.style.display = 'none';
        rulerButtonEl.style.display = 'none';
    }
    else {
        fogofwarEl.innerHTML = 'Edit FOW';
        fogofwarOptionsEl.style.display = 'none';
        drawingModeEl.style.display = '';
        clearEl.style.display = '';
        rulerButtonEl.style.display = '';
    }
}

/**
 * Menu button event that reinitializes the fog of war, hiding everything
 * 
 */
fogofwarHideAllEl.onclick =function() {
    console.log("Hiding all in fog of war")
    for (let i = 0; i < fowgroup.size(); i++) {
        fowgroup.remove(fowgroup.getObjects()[i]);
    }
    initFowCanvas(true);
}

/**
 * Menu button event that reinitializes the fog of war, revealing everything
 * 
 */
fogofwarRevealAllEl.onclick = function() {
    console.log("Clearing fog of war")
    for (let i = 0; i < fowgroup.size(); i++) {
        console.log(fowgroup.getObjects());
        fowgroup.remove(fowgroup.getObjects()[i]);
    }
    initFowCanvas(false)
}

function initRuler() {
    // action=false;
    rulerLine = new fabric.Line([0,0,0,0],  {stroke: 'green', strokeWidth:3, /*selectable:false, evented:false, visible:true**/ });
    rulerText = new fabric.Text('Initialize', {fontSize: 30, fill: 'green', top: 'top', left: 'top', /*selectable:false, evented:false, visible:true**/ });
    // canvas.add(rulerLine);
    // canvas.add(rulerText);
    // action=true;
}

/**
 * Menu button event that calls the clear canvas function
 * 
 */
clearEl.onclick = function() { clearcan()};

/**
 * Clears the map canvas (doesn't change the fog of war)
 * 
 */
clearcan = function clearcan() {
    console.log('Clearing Canvas');
    action = false;
    canvas.loadFromJSON(state[0], function() {drawBackground(); canvas.renderAll.bind(canvas); action=true;});
    //canvas.renderAll();
}

/**
 * Toggles the drawing mode to freedraw on the canvas
 * 
 */
drawingModeEl.onclick = function() {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    if (canvas.isDrawingMode) {
        editingFOW = false;
        rulerMode = false;
        drawingModeEl.innerHTML = 'Cancel drawing mode';
        drawingOptionsEl.style.display = '';
        fogofwarMenuEl.style.display = 'none';
        fogofwarOptionsEl.style.display = 'none';
        rulerButtonEl.style.display = 'none';

    }
    else {
        drawingModeEl.innerHTML = 'Enter drawing mode';
        drawingOptionsEl.style.display = 'none';
        fogofwarMenuEl.style.display = '';
        fogofwarOptionsEl.style.display = 'none';
        rulerButtonEl.style.display = '';
    }
};

rulerButtonEl.onclick = function() {
    rulerMode = !rulerMode;
    if(rulerMode) {
        canvas.isDrawingMode = false;
        editingFOW = false;
        console.log("Entering ruler mode");
        rulerButtonEl.innerHTML = 'Cancel ruler mode';
        drawingOptionsEl.style.display = 'none';
        fogofwarMenuEl.style.display = 'none';
        drawingModeEl.style.display = 'none';

    }
    else {
        console.log("Exiting ruler mode");
        rulerButtonEl.innerHTML = 'Ruler Mode';
        drawingOptionsEl.style.display = '';
        fogofwarMenuEl.style.display = '';
        drawingModeEl.style.display = '';

    }
}

/**
 * If I'm going to be honest, i don't understand 90% of this code, I copied it
 * from an example and whenever I try to fuck with it freedrawing breaks.
 * 
 * Basically it just sets up how the various pattern brushes work in freedraw mode.
 * 
 */
if (fabric.PatternBrush) {
    var vLinePatternBrush = new fabric.PatternBrush(canvas);
    vLinePatternBrush.getPatternSrc = function() {

      var patternCanvas = fabric.document.createElement('playcanvas');
      patternCanvas.width = patternCanvas.height = 10;
      var ctx = patternCanvas.getContext('2d');

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.stroke();

      return patternCanvas;
    };

    var hLinePatternBrush = new fabric.PatternBrush(canvas);
        hLinePatternBrush.getPatternSrc = function() {

        var patternCanvas = fabric.document.createElement('playcanvas');
        patternCanvas.width = patternCanvas.height = 10;
        var ctx = patternCanvas.getContext('2d');

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(5, 10);
        ctx.closePath();
        ctx.stroke();

        return patternCanvas;
    };

    var squarePatternBrush = new fabric.PatternBrush(canvas);
    squarePatternBrush.getPatternSrc = function() {

      var squareWidth = 10, squareDistance = 2;

      var patternCanvas = fabric.document.createElement('playcanvas');
      patternCanvas.width = patternCanvas.height = squareWidth + squareDistance;
      var ctx = patternCanvas.getContext('2d');

      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, squareWidth, squareWidth);

      return patternCanvas;
    };

    var diamondPatternBrush = new fabric.PatternBrush(canvas);
    diamondPatternBrush.getPatternSrc = function() {

        var squareWidth = 10, squareDistance = 5;
        var patternCanvas = fabric.document.createElement('playcanvas');
        var rect = new fabric.Rect({
            width: squareWidth,
            height: squareWidth,
            angle: 45,
            fill: this.color
        });

        var canvasWidth = rect.getBoundingRect().width;

        patternCanvas.width = patternCanvas.height = canvasWidth + squareDistance;
        rect.set({ left: canvasWidth / 2, top: canvasWidth / 2 });

        var ctx = patternCanvas.getContext('2d');
        rect.render(ctx);

        return patternCanvas;
    };

    var img = new Image();
    img.src = 'img/70x70-0000ffff.png';

    var texturePatternBrush = new fabric.PatternBrush(canvas);
    texturePatternBrush.source = img;
}

/**
 * Freedrawing menu option event handlers. Nothing that needs to be touched for the most part.
 * 
 */
$('drawing-mode-selector').onchange = function() {

    if (this.value === 'hline') {
      canvas.freeDrawingBrush = vLinePatternBrush;
    }
    else if (this.value === 'vline') {
      canvas.freeDrawingBrush = hLinePatternBrush;
    }
    else if (this.value === 'square') {
      canvas.freeDrawingBrush = squarePatternBrush;
    }
    else if (this.value === 'diamond') {
      canvas.freeDrawingBrush = diamondPatternBrush;
    }
    else if (this.value === 'texture') {
      canvas.freeDrawingBrush = texturePatternBrush;
    }
    else {
      canvas.freeDrawingBrush = new fabric[this.value + 'Brush'](canvas);
    }

    if (canvas.freeDrawingBrush) {
      var brush = canvas.freeDrawingBrush;
      brush.color = drawingColorEl.value;
      if (brush.getPatternSrc) {
        brush.source = brush.getPatternSrc.call(brush);
      }
      brush.width = parseInt(drawingLineWidthEl.value, 10) || 1;
      brush.shadow = new fabric.Shadow({
        blur: parseInt(drawingShadowWidth.value, 10) || 0,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: drawingShadowColorEl.value,
      });
    }
};

drawingColorEl.onchange = function() {
    var brush = canvas.freeDrawingBrush;
    brush.color = this.value;
    if (brush.getPatternSrc) {
      brush.source = brush.getPatternSrc.call(brush);
    }
};
drawingShadowColorEl.onchange = function() {
    canvas.freeDrawingBrush.shadow.color = this.value;
};
drawingLineWidthEl.onchange = function() {
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;
};
drawingShadowWidth.onchange = function() {
    canvas.freeDrawingBrush.shadow.blur = parseInt(this.value, 10) || 0;
    this.previousSibling.innerHTML = this.value;
};
drawingShadowOffset.onchange = function() {
    canvas.freeDrawingBrush.shadow.offsetX = parseInt(this.value, 10) || 0;
    canvas.freeDrawingBrush.shadow.offsetY = parseInt(this.value, 10) || 0;
    this.previousSibling.innerHTML = this.value;
};

if (canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = drawingColorEl.value;
    //canvas.freeDrawingBrush.source = canvas.freeDrawingBrush.getPatternSrc.call(this);
    canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) || 1;
    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
      blur: parseInt(drawingShadowWidth.value, 10) || 0,
      offsetX: 0,
      offsetY: 0,
      affectStroke: true,
      color: drawingShadowColorEl.value,
    });
}

//Image Drag and Drop Functions

/**
 * Event handler for dragging and dropping objects (mostly images) onto the canvas
 * I copied the drop_handling function from an example, so there are a bunch of 
 * handlers that I'm not using right now.
 * 
 *  @param  {Event} ev  Drag and drop event, passed from drop_handler
 * 
 */
function drop_handler(ev) {
    console.log('Drop');
    console.log(ev);
    ev.preventDefault();
    var data = ev.dataTransfer.items;
    //
    for (var i = 0; i < data.length; i += 1) {
        if ((data[i].kind == 'string') &&
           (data[i].type.match('^text/plain'))) {
            // This item is the target node
            data[i].getAsString(function (s){
            ev.target.appendChild(document.getElementById(s));
         });
    } else if ((data[i].kind == 'string') &&
        (data[i].type.match('^text/html'))) {
         // Drag data item is HTML
         console.log("... Drop: HTML");
    } else if ((data[i].kind == 'string') &&
        (data[i].type.match('^text/uri-list'))) {
        // Drag data item is URI
        console.log("... Drop: URI");
    } else if ((data[i].kind == 'file') &&
        (data[i].type.match('^image/'))) {
            // Drag data item is an image file
            var f = data[i].getAsFile();
            var base_image = new Image();
            let reader = new FileReader();
            s3Upload(f);
            reader.onload = function(event) {
                var img = new Image();
                var truePos = getMousePos(ev);
                placeImage(event.target.result, truePos.x, truePos.y);
            }
            reader.readAsDataURL(f)
            console.log("... Drop: File ");
        }
    }
}

/**
 * Uploads a file to the S3 bucket, usually after being dragged and dropped onto the canvas
 * 
 *  @param  {File} file  The image file to be uploaded to the bucket
 */

function s3Upload(file) {
    var fileName = file.name;
    var filePath = 'img/' + fileName;
    //var fileUrl = 'https://' + _config.s3.region + '.amazonaws.com/my-    first-bucket/' +  filePath;
    s3.upload({
        Key: filePath,
        Body: file,
        }, function(err, data) {
        if(err) {
            console.log('error uploading file to s3');
        }
        alert('Successfully Uploaded!');
        }).on('httpUploadProgress', function (progress) {
        var uploaded = parseInt((progress.loaded * 100) / progress.total);
        $("progress").attr('value', uploaded);
    });
}

/**
 * Place an image onto the canvas
 * 
 * @param  {String} base_image  URL of the image file to be uploaded onto the canvas (typically an S3 bucket)
 * @param  {int} imageX  The 'left' position of the image relative to the canvas
 * @param  {int} imageY  The 'top' position of the image relative to the canvas
 * 
 * 
 */
function placeImage(base_image, imageX, imageY) {
    fabric.Image.fromURL(base_image, function(oImg) {
        canvas.add(oImg);
        oImg.left = imageX;
        oImg.top = imageY;
        oImg.setCoords();
        canvas.renderAll();
    });
    console.log('image placed');
    // canvas.counter++;
    updateModifications();
}

/**
 * Really just here to prevent the default behavior of dragging something over the screen
 * 
 *  @param  {Event} ev  Drag event, passed from drop_handler
 * 
 */
function dragOverHandler(event) {
    // console.log(event);
    event.preventDefault();
    return;
}

/**
 * Passes a global mouse event and gets the location of the event relative to the canvas
 * 
 *  @param  {Event} evt  Mouse event
 * 
 */
function getMousePos(evt) {
  var rect = document.getElementById("playcanvas").getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

/**
 * Finds an object on the canvas with by its ID.
 * @param {String} id  The ID of the object to be found
 */
function findObjectById(id) {
    for (const co of canvas.getObjects()) {
        if (co.id == id){
            return co;
        }
    }
}

//History State functions

/**
 * Canvas object added event handler. Saves the action to StateHistory and calls updateModifications()
 * 
 */
canvas.on('object:added', function (e) {
    if (e.target.selectable) {
        console.log("Object is selectable");
        if (e.target.owner == null) {
            let target;
            for (const co of canvas.getObjects()) {
                if (co.id == e.target.id){
                    co.toObject = (function(toObject) {
                      return function() {
                        return fabric.util.object.extend(toObject.call(this), {
                          owner: this.owner
                        });
                      };
                    })(co.toObject);
                    co.owner = username;
                    co.toObject = (function(toObject) {
                      return function() {
                        return fabric.util.object.extend(toObject.call(this), {
                          id: this.id
                        });
                      };
                    })(co.toObject);
                    co.id = genID();
                    console.log(co.id);
                    target = co;
//                    action=true;
//                    canvas.add(co);
                    break;
                }
            }
            console.log('Object added');
            console.log(stateHistory);
            console.log(target);
            sendSocketMessage(MessageType.BroadcastAction, "canvasupdate", {"command":"add", "target": target});
            var acommand = new AddCommand(target);
            stateHistory.add(acommand);
            updateModifications();
        }
        else if (e.target.owner != username) {
            let target = findObjectById(e.target.id);
            target.selectable = false;
        }
    }
});

/**
 * Canvas object modification event handler. Calls updateModifications()
 *
 */
canvas.on(
    'object:modified', function (e) {
        if (e.target.selectable && e.target.owner == username) {
            console.log('Object Modified');
            console.log(e);
            var tcommand = new TransformCommand(e.target, e.transform.original);
            sendSocketMessage(MessageType.BroadcastAction, "canvasupdate", {"command":"transform", "target": e.target, "transform":e.transform.original});
            stateHistory.add(tcommand);
            updateModifications();
        }
});

/**
 * Canvas object removed event handler. Saves the action to StateHistory and calls updateModifications()
 * 
 */
canvas.on(
    'object:removed', function (e) {
        if (e.target.selectable && e.target.owner == username) {
            console.log('Object removed: ' + e.toString());
            var rcommand = new RemoveCommand(e.target);
            sendSocketMessage(MessageType.BroadcastAction, "canvasupdate", {"command":"remove", "target": e.target});
            stateHistory.add(rcommand);
            updateModifications();
        }
});

/**
 * Checks if the global action flag is set, and if it is, send the canvas state out to the socket
 * to update the database item and others connected to the websocket.
 * 
 */
function updateModifications() {
    if (action) {
        console.log("updateModifications() called")
        // setCanvasState();
//        sendSocketMessage(MessageType.CanvasUpdate, username, myjson);
    }
}

/**
 * KeyPress event handler monitoring ctrl+z and ctrl+y for undo and redo events respectively.
 * 
 */
function KeyPress(e) {
    var evtobj = window.event? event : e
    if (evtobj.keyCode == 90 && (evtobj.ctrlKey || evtobj.metaKey)) undo();

    if (evtobj.keyCode == 89 && (evtobj.ctrlKey || evtobj.metaKey)) redo();
}

/**
 * Handles undoing the last action in StateHistory
 * 
 */
undo = function undo() {
    console.log('undo');
    console.log(this.stateHistory);
    action = false;
    this.stateHistory.back(canvas);
    canvas.renderAll();
    action = true;
}

/**
 * Handles redoing the last action in StateHistory
 * 
 */
redo = function redo() {
    console.log('redo');
    console.log(this.stateHistory);
    action = false;
    this.stateHistory.forward(canvas);
    canvas.renderAll();
    action = true;
}

/**
 * Maps scrolling the mousewheel to zooming the canvas
 * 
 * @todo A manual slider would be helpful for this, probably pretty easy to do
 * 
 */
canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

// Need to make these global because both the mouse:down and mouse:move events reference them?
var fowrect, isDown, origX, origY;

/**
 * The mouse down event is pulling a lot of work here. Currently handles:
 *   panning the canvas when the alt key is held, 
 *   hiding or revealing portions of the fog of war canvas when it is in FOW mode
 *   fires a pointer animation action to the websocket
 * 
 */
canvas.on('mouse:down', function(opt) {
  isDown = true;
  var evt = opt.e;
  var pointer = canvas.getPointer(opt.e);
  origX = pointer.x;
  origY = pointer.y;

  if (evt.altKey === true) {
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  }
  else if (editingFOW) {
    action = false;
    // var pointer = canvas.getPointer(opt.e);
    // origX = pointer.x;
    // origY = pointer.y;
    var pointer = canvas.getPointer(opt.e);
    fowrect = new fabric.Rect({
        left: origX,
        top: origY,
        originX: 'left',
        originY: 'top',
        width: pointer.x-origX,
        height: pointer.y-origY,
        angle: 0,
        fill: 'rgba(0,0,0,1)',
        selectable: false,
        transparentCorners: false,
        evented: false
    });
    if(fogofwarRevealEl.checked) {
        fowrect.globalCompositeOperation = 'destination-out';
        fowrect.fill = 'rgba(0,0,0, 1)';
    }
    else {
        fowrect.fill = 'rgba(0, 0, 0, 1)';
    }

    canvas.add(fowrect);
    action = true;
  }
  else if (rulerMode) {
    console.log("Beginning to draw ruler");
    canvas.selection = false;
    var pointer = canvas.getPointer(opt.e);
    origX = pointer.x;
    origY = pointer.y;
    rulerLine = new fabric.Line([origX, origY, origX, origY], {
      top: origY,
      left: origX,
      fill: 'green',
      stroke: 'green',
      strokeWidth: 5
    });

    rulerLine.owner = null;
    rulerText.set({ 'left': origX, 'top': origY-30, 'text': '0', 'visible':true, 'owner' : null});

    rulerTimer = Date.now();
    canvas.add(rulerLine);
    canvas.add(rulerText);
    canvas.renderAll();
    console.log(rulerLine);
  }
  else if (!canvas.isDrawingMode) {
    setTimeout(function() {
        if(isDown) {
          console.log("Mouse held down, animating point");
          sendSocketMessage(MessageType.BroadcastAction, username, {x: origX, y: origY});
        }
    }, 500);
  }
});

/**
 * The mouse move handler also handles panning the canvas and editing FOW
 * 
 */
canvas.on('mouse:move', function(opt) {
  var pointer = canvas.getPointer(opt.e);

  if (this.isDragging) {
    var e = opt.e;
    var vpt = this.viewportTransform;
    vpt[4] += e.clientX - this.lastPosX;
    vpt[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }
  else if (editingFOW) {
    if (!isDown) return;
    var pointer = canvas.getPointer(opt.e);

    if(origX>pointer.x){
        fowrect.set({ left: Math.abs(pointer.x) });
    }
    if(origY>pointer.y){
        fowrect.set({ top: Math.abs(pointer.y) });
    }

    fowrect.set({ width: Math.abs(origX - pointer.x) });
    fowrect.set({ height: Math.abs(origY - pointer.y) });


    canvas.renderAll();
  }
  else if (rulerMode && isDown) {
    // console.log("Moving cursor end of ruler");
    // console.log(rulerLine.x2 + " " + rulerLine.y2);
    originalLine = {'x1': rulerLine.x1, 'y1': rulerLine.y1, 'x2':rulerLine.x2, 'y2': rulerLine.y2, 'top': rulerLine.top, 'left': rulerLine.left};
    originalText = {'left': rulerText.left, 'top':rulerText.top, 'text':rulerText.text}
    rulerLine.set({ 'x2': pointer.x, 'y2': pointer.y});
    rulerText.set({ 'left': pointer.x, 'top': pointer.y-30, 'text': (getLineLengthFeet(rulerLine)).toString()});
    canvas.renderAll();

    if(Date.now() - rulerTimer > 200){
        rulerTimer = Date.now();
        canvas.fire('object:modified', {'target': rulerLine, 'transform':{'original':originalLine}});
        canvas.fire('object:modified', {'target': rulerText, 'transform':{'original':originalText}});
//            sendSocketMessage(MessageType.BroadcastAction, "canvasupdate", {"command":"transform", "target": e.target, "transform":e.transform.original});
    }
  }
});

function getLineLengthFeet(line) {
    var length = (Math.sqrt(Math.pow(line.width,2)+Math.pow(line.height, 2)));
    return Math.round(length*10/grid*5)/10;
}

/**
 * Mouse up handlers finish canvas panning and updates the fog of war group 
 * and sends it out to the socket
 * 
 */
canvas.on('mouse:up', function(opt) {
  // on mouse up we want to recalculate new interaction
  // for all objects, so we call setViewportTransform
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;
  isDown = false;
  if(editingFOW) {
    fowrect.clone(function(cloned) {fowgroup.addWithUpdate(cloned)});
    canvas.remove(fowrect);
    console.log(JSON.stringify(fowgroup));
    sendSocketMessage(MessageType.CanvasUpdate, "fogofwar", JSON.stringify(fowgroup.getObjects()));
    action = true;
  }
  else if (rulerMode) {
    console.log("Make ruler invisble");
    canvas.selection = true;
    canvas.remove(rulerLine);
    canvas.remove(rulerText);

//    rulerLine.visible = false;
//    rulerText.visible = false;
    canvas.renderAll();    
  }
});


/**
 * Loads the character sheet from Inara, loading the credentials from Cognito and
 * fetching it using their userID. Loads the contents into the charactersheet iframe.
 * 
 */
function loadCharFromDB() {
    AWS.config.credentials.get(function(err) {
    if (!err) {
      var id = AWS.config.credentials.identityId;
      console.log('Cognito Identity ID '+ id);

      // Instantiate aws sdk service objects now that the credentials have been updated
      var docClient = new AWS.DynamoDB.DocumentClient({ region: AWS.config.region });
      var params = {
        TableName: 'Inara',
        Key:{'userID': id}
      };
    docClient.get(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success");
            console.log(data.Item);
            document.getElementById('serviceFrameSend').contentWindow.load_character_json(data.Item.character);
        }
    });
    }
  });
}

/**
 * Saves a JSON-ified character sheet into Inara under the userID.
 *  @param  {JSON CharacterSheet} charToSave  The JSON representation of the player's character sheet.
 *
 */
function saveCharToDB(charToSave) {
  AWS.config.credentials.get(function(err) {
    if (!err) {
      var id = AWS.config.credentials.identityId;
      console.log('Cognito Identity ID '+ id);

      // Instantiate aws sdk service objects now that the credentials have been updated
      var docClient = new AWS.DynamoDB.DocumentClient({ region: AWS.config.region });
      var params = {
        TableName: 'Inara',
        Item:{userID:id, character:charToSave}
      };
      docClient.put(params, function(err, data) {
        if (err)
          console.error(err);
        else
          console.log(data);
      });
    }
  });
}

/**
 * Add event handles for charactersheet iframe messages to the onCharSheet function
 * No, I do not know why they are phrased as if/else statements, and I don't want to break things by changing it.
 *
 */
if (window.addEventListener) {
    window.addEventListener("message", onCharSheetMessage, false);
}
else if (window.attachEvent) {
    window.attachEvent("onmessage", onCharSheetMessage, false);
}

/**
 * Calls the function that the iframe requested.
 *  @param  {Event} event  The message that the character sheet iframe sent
 *
 */

function onCharSheetMessage(event) {
    var data = event.data;

    if (typeof(window[data.func]) == "function") {
        window[data.func].call(null, data.message);
    }
}

/**
 * Creates a pointer animation at the point referenced. Draws four red rectangles
 * in a collapsing crosshair around the point. Only called after receiving the 
 * broadcastaction from animatepointer.
 * 
 *  @param  {Point} animatePoint A point object with x and y coordinates relative to the canvas to draw attention to
 *
 */
function animatePointer(animatePoint) {
    action = false;
    pointX = animatePoint.x;
    pointY = animatePoint.y;

    console.log(pointX + " " + pointY);

    rect1 = new fabric.Rect({
        left: pointX-130,
        top: pointY-5,
        fill: 'red',
        selectable: false,
        width: 30,
        height: 10,
        evented: false
    });
    rect2 = new fabric.Rect({
        left: pointX-5,
        top: pointY-130,
        fill: 'red',
        selectable: false,
        width: 10,
        height: 30,
        evented: false
    });
    rect3 = new fabric.Rect({
        left: pointX+100,
        top: pointY-5,
        fill: 'red',
        selectable: false,
        width: 30,
        height: 10,
        evented: false
    });
    rect4 = new fabric.Rect({
        left: pointX-5,
        top: pointY+100,
        fill: 'red',
        selectable: false,
        width: 10,
        height: 30,
        evented: false
    });

    canvas.add(rect1);
    canvas.add(rect2);
    canvas.add(rect3);
    canvas.add(rect4);


    rect1.animate('left', '+=100');
    rect2.animate('top', '+=100');
    rect3.animate('left', '-=100');
    rect4.animate('top', '-=100', {onChange: canvas.renderAll.bind(canvas), onComplete: function() {canvas.remove(rect1);canvas.remove(rect2);canvas.remove(rect3);canvas.remove(rect4); action = true}});

}

/**
  * Generates an string id using Math.Random
  */
function genID() {
    return  Math.floor(Math.random() * 1000000000000).toString()
}


/**
 * Function that switches the tabs in the left sidebar
 * 
 */

function openTab(evt, tabName) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

/**
 * Fetch spells from SRD API, https://www.dnd5eapi.co/api
 * 
 */

function fetchSRDSpells() {
    const loadSpells = async () => {
        const response = await fetch('https://www.dnd5eapi.co/api/spells/');
        const spellsJson = await response.json(); //extract JSON from the http response
        console.log(spellsJson);

        for (const item of spellsJson.results) {
            addSRDItem(item.name);
            // console.log(item);
        }
      // do something with myJson
    }
    loadSpells();
}

/**
 * Adds item to SRD Sidebar
 * @param {String} item  The item string to use for the SRD Item
 */
function addSRDItem(item) {
    if (item == null || item == '') {
        console.log('Item to be added to SRD list was empty or null');
        return;
    }
    var srdList = document.getElementById('tab-srd');
    // Messages with rolls need to be parsed into the rollMessageTemplate
    var template = document.querySelector('#srdItemTemplate');
    var clone = template.content.cloneNode(true);
    clone.querySelector('.list-group-item').textContent = item;
    clone.querySelector('.list-group-item').onclick = function() { console.log('Spell clicked'); displaySpell(item); };
    srdList.appendChild(clone);
}

/**
 * Displays the spellcard iframe, pulling the data from the SRD API
 * @param {String} spellName  The unformatted spell name fetched from the button pressed
 */

function displaySpell(spellName) {
    console.log('Displaying spell: ' + spellName);
    var formattedName = spellName.replace(/\s/g, '-');
    formattedName = formattedName.toLowerCase();
    var spellCardEl = document.getElementById("panel1 dragspellcard");
    var spelliFrame = document.getElementById("spellcard-iframe");
    spellCardEl.style.display = 'block';
    spelliFrame.contentWindow.postMessage(formattedName, '*');

}
