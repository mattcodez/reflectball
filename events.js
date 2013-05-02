//TODO: need to decide what file is gonna be the controller and put that stuff there

cg.userMouseControls = function(e){
	server_mouseMove(e.pageX, e.pageY);
};

function server_mouseMove(x, y){
	socket.emit('mouseMove', x, y);
}

cg.userMouseClick = function(e){
	socket.emit('fire');
};

cg.chatEntry = function(e){
	var key = e.which;
	if (key == 13) { //Enter key
		chatSend();
	}
};

function chatSend(){
	socket.emit('chatMessage', $('#chatEntry').val());
	$('#chatEntry').val(''); //Clear after enter
}

function gamepadInit(){
	if (window.navigator && navigator.webkitGetGamepads){
		setInterval(pollGamePads, 25);//Check 40 times a second
	}
}

function pollGamePads(){
	var gamePads = navigator.webkitGetGamepads();
	for (var i = 0; i < gamePads.length; i++){
		if (gamePads[i]){
			runPadEvents(gamePads[i]);
		}
	}
}

var gamePadPreviousStates = {axes:[0,0], buttons:[0]};
function runPadEvents(gamepad){
	//var deltaX = Math.abs(gamePadPreviousStates[0])
	var playerPos = cg.selfPlayerObj.getPos();
	var deltaX = gamepad.axes[0] * accelLimit;
	var deltaY = gamepad.axes[1] * accelLimit;
	server_mouseMove(playerPos[0] + deltaX, playerPos[1] + deltaY);
}