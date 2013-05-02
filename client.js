var cg = {}; //cg -> namespace for circle game
cg.players = {};
cg.users = {};
cg.selfPlayerObj = null;
cg.balls = {};
var accelLimit = 150; //Keep in sync with server value

var canvas = new fabric.Element('canBox');
//Remove if we need event handling
canvas.dispose();

var hasLocalStorage = 'localStorage' in window && window['localStorage'] !== null;
if (hasLocalStorage){
	var uid = localStorage.getItem('uid');
	if (uid != null){
		var extraQS = 'uid=' + uid;
	}
}
var socket = io.connect(io.util.query(window.location.search, extraQS), {port: 14500});

$(document).ready(function(){gamepadInit();});

socket.on('connect', function(obj){
	//FIXME: I don't think id's are matching
	cg.selfId = socket.socket.sessionid;
});

socket.on('updateInfo', function(info){
	//info could contain any set of key/value pairs so check them all
	
	'name' in info && $('#playerName').html(info.name);
	'gameId' in info && $('#gameLink').html(
		window.location.origin + window.location.pathname + '?gameId=' + info['gameId']
	);
	'uid' in info && hasLocalStorage && localStorage.setItem('uid', info['uid']);
});

$('#nameHolder').bind('click', function(e){
	if ($(this).find('INPUT').length > 0) return;
	
	var txtBox = $('<input/>', {type:'text', length:20, value: cg.selfUser.props.name});
	var playerName = $('#playerName');
	playerName.empty();
	playerName.append(txtBox);
	txtBox.focus();
	var nameHolder = this;
	
	window.setTimeout(function(){
		$(document.body).bind('click', function(e){
			//Must click outside box and label
			if (nameHolder === e.target || $.contains(nameHolder, e.target)) return;
			
			cg.selfUser.props.name = txtBox.val();
			playerName.html(cg.selfUser.props.name);
			$(this).unbind(e);
			
			//Probably make this more generic at some point but right now it gets its own event
			socket.emit('changeName', cg.selfUser.props.name);
		});
	}, 0);
});

socket.on('updateRoomInfo', function(info){
	if (info.users){
		for (var i = 0; i < info.users.length; i++){
			var user = info.users[i];
			if (!cg.users[user.id]){
				cg.selfUser = cg.users[user.id] = {id:user.id, props: user.props};
				continue;
			}
			//Only set what has been provided, just setting entire object would remove previously set values
			for (var prop in user.props){
				cg.users[user.id].props[prop] = user.props[prop];
				//cg.userPropChange(cg.users[user.id], prop);
			}
		}
	}
});

socket.on('chatMessage', function(userId, message){
	$('#chatLog').append(jQuery('<p>' + cg.users[userId].props.name + ': ' + message + '</p>'));
});

socket.on('playerCount', function(count){
	$('#totalPlayers').text(count);
});

socket.on('updateTeamScore', function(score){
	$('#teamScore').text(score);
});
		
socket.on('updatePlayerScore', function(score){
	$('#playerScore').text(score);
});

socket.on('updatePlayerTotalScore', function(score){
	$('#playerTotalScore').text(score);
});

socket.on('loadMap', function(map){	
	// border of map
	canvas.setWidth(map.border[0]);
	canvas.setHeight(map.border[1]);
	
	// objects
	for (var i = 0; i < map.objects.length; i++) {
		object = map.objects[i];
		if (object.type == 'poly') {
			vertices = object.vertices;
			if (vertices.length == 2) {
				canvas.add(new fabric.Line([vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y], {
					stroke: "#000000",
					strokeWidth: 2
				}));
			}
			if (vertices.length > 2) {
				canvas.add(new fabric.Polygon(vertices, { 
					stroke: "#000000", 
					strokeWidth: 2
				}));
			}
		}
	}
});


/******************************************
*	Arbitrary Player actions
*******************************************/

socket.on('addPlayers', function(players){
	var player;
	while (player = players.pop()){
		if (cg.players[player.playerId]){
			continue;  //Trying to add an already existing player
		}
		
		//TODO: users[] will be a higher order collection that will point to players
		//^ Sure? Maybe socket object represents a "user"
		var newPlayer = new cg.Player({playerId: player.playerId, shape: player.shape});
		cg.players[player.playerId] = newPlayer;
		var newUser = cg.users[player.playerId] = {id:player.playerId, player:player, props:{}};
		
		if (player.playerId == cg.selfId){
			cg.selfPlayerObj = newPlayer;
			$('BODY').bind('mousemove', cg.userMouseControls);
			$('#canBox').bind('click', cg.userMouseClick);
			$('#chatEntry').bind('keyup', cg.chatEntry);
			$('#sendChat').bind('click', chatSend);
			cg.selfUser = newUser;
		}
	}
});

socket.on('destroyPlayers', function(players){
	var player;
	while (playerId = players.pop()){
		var player = cg.players[playerId];
		if (!player) return;
	
		canvas.fxRemove(player.playerShape);
		delete cg.players[playerId];
		player = null; //Technically don't need this but adding just in-case a closure ends up here in the future
	}
});

socket.on('playerMove', function(players){
	var player;
	while (player = players.pop()){
		var playerObj = cg.players[player.playerId];
		playerObj.move(player.pos[0], player.pos[1]);
		playerObj.rotate(player.rotate);
	}
	
	canvas.renderAll();
});

/* psuedo data binding, not sure we need it yet
cg.userPropChange = function(user, prop){
	var propVal = cg.users[user.id].props[prop];
	
	switch (prop){
		case 'name':
			
	}
}
*/

/******************************************
*	Arbitrary Ball actions
*******************************************/
socket.on('createBall', function(ballId, x, y){
	//TODO: should we even have a separate create event or just create implicitly
	//when asked to move a ball that doesn't exist?
	cg.balls[ballId] = new cg.Ball({pos:[x,y]});
});

socket.on('destroyBall', function(ballId){
	cg.balls[ballId].destroy();
	delete cg.balls[ballId];
});

socket.on('moveBall', function(ballId, x, y){
	cg.balls[ballId].move(x, y);
	canvas.renderAll();
});