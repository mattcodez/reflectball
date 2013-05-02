var sylvester = require('sylvester');
var $Lseg = sylvester.Line.Segment.create;
var Matrix = sylvester.Matrix;

var Ball = require('./ball.js').Ball;
var Player = require('./player.js').Player;

var gameUtils = require('./gameUtils.js');

var Game = function(roomEmit){
	if (!roomEmit) return this;
	
	this.players = {};
	this.teamRed = {};
	this.teamBlue = {};
	this.balls = {};
	this.ballId = 0;
	this.roomEmit = roomEmit;
	this.teamRedScore = 0;
	this.teamBlueScore = 0;
	this.map = require('../maps/map0.js').map;
};
exports.Game = Game;

Game.prototype = {};
Game.prototype.tickDelay = 25; //Fire an engine tick every X milliseconds

Game.prototype.initLevel = function(){
	this.roomEmit('loadMap', this.map);
	this.placeBalls();
};

Game.prototype.placeBalls = function(){
	for (var i = 0; i < this.map.ballSpawns.length; i++){
		var ball = this.map.ballSpawns[i];
		this.placeStationaryBall(ball.point[0], ball.point[1], i);
	}
};

Game.prototype.startTicks = function startTicks(){
	this.tickID = setInterval(this.tick.bind(this), this.tickDelay);
};

Game.prototype.tick = function tick(){
	//these each have their own broadcasts's, we may want to send them in a single broadcast at some point
	this.runBalls();
	this.runPlayers();
};

/**
	Perform all actions and checks on all balls on the screen.
	Meant to be run once per game clock tick.
	
	Right now, a separate action will be sent to the clients for each ball. I was originally thinking that
	all actions/movements/etc for all balls would be sent in a single action then looped client side.
	This may slightly reduce overhead but because this current methodology is consistent with player
	movement, leaving as is for now.  Performance difference should be trivial anyways.
**/
Game.prototype.runBalls = function runBalls(){
	for (var ballId in this.balls){
		var ball = this.balls[ballId];
		
		//TODO: Eventually this CD will get factored out of here as a collision could just
		//		mean that the ball bounces off a wall or something.
		
		if (ball.collides()){ //Right now ball.checkWallCollision only returns true if ball should be destroyed
			this.destroyBall(ball);
			continue;
		}
		
		/*TODO: Might just send this out once for all the balls to reduce bandwidth consumed by 
			action metadata
		Note: If we ever have the data transmit at a different rate than the engine tick, it may
			be best to let the server queue multiple events itself */
		if (ball.move()){
			this.roomEmit('moveBall', ball.id, ball.posX, ball.posY);
		}
	}
};

Game.prototype.fireBall = function fireBall(playerId){
	var player = this.players[playerId];
	var ball = player.ball;
	player.ball = null;
	
	if (!ball){
		return null;
	}		
	
	ball.fire();
	this.roomEmit('createBall', ball.id, ball.posX, ball.posY);
	//Do we need to have 'create' be separate? Maybe just have client 'create' when its told to move a ball
	//that it doesn't know exists
	
	return ball;
};

Game.prototype.placeStationaryBall = function(x, y, listId){
	//listId -> index specific to ball in list so we know which one to replace when it gets destroyed	
	var ballId = this.ballId++;
	
	var ball = new Ball({
		stationary	: true,
		id			: ballId,
		listId		: listId,
		tickDelay	: this.tickDelay,
		x			: x,
		y			: y
	});
	
	this.balls[ballId] = ball;
	return ball;
	//Just add balls to server knowledge, clients will know when they connect
	//this.roomEmit('createBall', ballId, x, y);
};

Game.prototype.destroyBall = function(ball){
	var player = ball.player;
	if (player){
		//Extra check to eliminate circular refenece potential
		//If ball is still linked to player, unlink when destroyed
		if (player.ball == ball){
			player.ball = null;
		}
	}
	
	delete this.balls[ball.id];
	//Place ball back in the game
	var ballData = this.map.ballSpawns[ball.listId].point;
	var newBall = this.placeStationaryBall(ballData[0], ballData[1], ball.listId);
	this.roomEmit('destroyBall', ball.id);
	this.roomEmit('createBall', newBall.id, ballData[0], ballData[1]);
};

Game.prototype.ballCollision = function(ball, player){
	if (ball.stationary){
		if (player.ball){
			//Not allowing player to carry more than one ball right now
			return;
		}
		//Ick, potential circular reference?
		//Player picks up the ball
		player.ball = ball;
		ball.player = player;
		this.roomEmit('destroyBall', ball.id); //Tell client to destroy ball, but we still hang on to it
	}
	else{
		//Don't let player catch their own moving ball
		//Player.ball should be null so can't check that right now
		if (ball.player != player){ //We hit someone else!
			this.destroyBall(ball);
			if (ball.player.team != player.team){
				this.setTeamScore(ball.player.team);
				ball.player.setScore();
				
				this.roomEmit('updateTeamScore', this.getTeamScore(ball.player.team)); //Tell client to update team score.
				ball.player.playerEmit('updatePlayerScore', ball.player.score); //Tell client to update player score.
			}
		}
	}	
};

/**
	Perform all actions and checks on all players.
	
	Was originally thinking we would send player updates immediately as mouse movement is received from
	the client.  However, due to the mouse follow and speed variation, we may need movement even when
	the mouse hasn't moved.
**/
Game.prototype.runPlayers = function runPlayers(){
	var players = []; //List of players that have updates
	
	for (var playerId in this.players){
		var player = this.players[playerId]; 
		var playerUpdates = null;
		this.checkBallCollisions(player);
		
		if (!player.positionCharacter()) continue; //Player position has not changed so don't update on the client
		
		//Something changed for this player, add their info to the list (playerUpdates)
		var playerInfo = player.getPos();
		playerInfo.r = player.radius;
		
		//Check player against all map boundaries
		for (var i = 0; i < this.map.objects.length; i++){
			var obj = this.map.objects[i];
			
			//Check each adacent pair of vertices as a line segment
			for (var v = 0; v < obj.vertices.length; v++){
				var vert1 = obj.vertices[v];
				var vert2 = obj.vertices[v + 1] || obj.vertices[0];//wrap to beginning if at the end
				
				var lineRefPoint = this.circleTouchesLine([vert1, vert2], playerInfo);
				if (!lineRefPoint) continue;
				
				//Adjust player location so that they don't go through barrier
				var prevPlayerPos = player.getPrevPos();
				var vXYRatio = ($V(
					[lineRefPoint.x - prevPlayerPos.x, 
					lineRefPoint.y - prevPlayerPos.y])
				).toUnitVector();
				
				var xRatio = vXYRatio.elements[0];
				var yRatio = vXYRatio.elements[1];
				
				//x and y ratio's will be negative when we need to add
				var newX = lineRefPoint.x - (player.radius * xRatio);
				var newY = lineRefPoint.y - (player.radius * yRatio);
				
				player.setPos(newX, newY);
			}
		}
		
		playerUpdates = {
			playerId:	player.playerId, 
			rotate:		player.playerShape.rotate,
			pos:		[player.playerShape.left, player.playerShape.top]
		};
	
		
		if (playerUpdates){
			players.push(playerUpdates);
		}
	}
	
	if (players.length > 0){
		this.roomEmit('playerMove', players);
	}
};

/**
	This sounds like it should belong to the Player class, but I'm not convinced since it has
	to loop through the ball collection.
**/
Game.prototype.checkBallCollisions = function(player){
	if (Object.keys(this.balls).length < 1) return;
	
	var playerBase_matrix = $M(player.baseShape);
	var playerPos = player.getPos();
	
	var rotateMatrix = Matrix.Rotation(player.playerShape.rotate_rad);
	var playerBase_matrixRotated = playerBase_matrix.multiply(rotateMatrix);
	
	//Add x and y character center coordiantes to each point
	//Effectively translates the points to where they actually exist relative to character
	//Should be simpler than Matrix.add() which requires identical sized matrices
	var playerFinal_matrix = playerBase_matrixRotated.map(
		function(elm, i, j){
			return j == 1 ? elm + playerPos.x : elm + playerPos.y;
		}
	);
	
	var characterPoints = playerFinal_matrix.elements;
	for (var ballId in this.balls){
		var ball = this.balls[ballId];
		if (ball.player && ball.player.ball === ball){
			//This ball is not in motion, a player is in posession of it
			continue;
		}
		
		//We don't need to wrap end of array to front because we repeat the start point
		for (var i = 0; i < (characterPoints.length - 1); i++){
			//TODO: Sylvester switch got rid of x and y labels so just switch to numeric array for coordinates
			var ballHitPlayer = this.circleTouchesLine([
					{x:characterPoints[i][0], y:characterPoints[i][1]}, 
					{x:characterPoints[i + 1][0], y:characterPoints[i + 1][1]}
				], 
				{x:ball.posX, y:ball.posY, r:ball.radius}
			);
			
			if (ballHitPlayer){
				//We should not return here in case we have multiple balls on screen
				this.ballCollision(ball, player);
			}
		}
	}
};

//Check for collision between a circle and a line segment
/* http://gamedev.stackexchange.com/questions/7735/how-to-find-if-circle-and-concave-polygon-intersect
  First (intersection / polygon inside circle):
  Find closest point on every edge of the polygon to the circle's center. 
  If any distance between closest point to the center is less than radius, 
  you got intersection or overlap.
*/
Game.prototype.circleTouchesLine = function(segment, circle){
	//segment: 	[{x:x,y:y}, {x:x,y:y}]
	//circle:	{x:x, y:y, r:r}
	
	var lSegment = $Lseg([segment[0].x, segment[0].y], [segment[1].x, segment[1].y]);
	//distanceFrom could do this but we want to return the closestPoint
	var closestPoint = lSegment.pointClosestTo([circle.x, circle.y]);
	//need the Z component or distanceFrom will return null
	var segmentToCircleDistance = closestPoint.distanceFrom([circle.x, circle.y, 0]);
	
	//We can't return reflection information here as we don't know the ball's direction
	return segmentToCircleDistance <= circle.r ? {x: closestPoint.elements[0], y: closestPoint.elements[1]} : null;
};


/******************************************
*	Arbitrary Player actions
*******************************************/
//TODO maybe we can just tie Player to the socket via closure and do this stuff directly on the Plyaer class

//We just set the mouse position here, don't actually call any actions
Game.prototype.setPlayerPosition = function setPlayerPosition(playerId, mouseX, mouseY){
	var player = this.players[playerId];
	player.mouseX = mouseX;
	player.mouseY = mouseY;
};

//TODO: should these really be seprate or just place up top in Switch?
Game.prototype.rotatePlayer = function rotatePlayer(playerId, angle){
	var player = this.players[playerId];
	if (!player){
		console.log('Player: ' + playerId + ' not found for rotate: ' + angle);
		return 0;
	}
	return this.players[playerId].rotate(angle);
};

Game.prototype.addPlayer = function addPlayer(playerId, playerEmit){
	var newPlayer;
	var charArgs = {
		playerId:	playerId,
		tickDelay:	this.tickDelay
	};
	
	if (Object.keys(this.teamRed).length > Object.keys(this.teamBlue).length)
	{
		//Add to team blue
		charArgs.team = 'blue';
		newPlayer = new Player(charArgs);
		this.teamBlue[playerId] = newPlayer;
	}
	else
	{
		//Add to team red
		charArgs.team = 'red';
		newPlayer = new Player(charArgs);
		this.teamRed[playerId] = newPlayer;
	}

	this.players[playerId] = newPlayer;
	
	playerEmit('loadMap', this.map);
	
	//send all players info to new client excluding themself as they will get that 
	//from emit below
	var allPlayerBasicInfo = [];
	for (var pId in this.players){
		if (playerId == pId)
			continue;
		allPlayerBasicInfo.push({playerId: pId, shape: this.players[pId].playerShape});
	}
	if (allPlayerBasicInfo.length > 0){
		playerEmit('addPlayers', allPlayerBasicInfo);
	}
	
	//Send all current ball info to new player
	for (var ballId in this.balls){
		var ball = this.balls[ballId];
		playerEmit('createBall', ballId, ball.posX, ball.posY);
	}
	
	//send new player to all clients
	this.roomEmit('addPlayers', [{playerId: playerId, shape: newPlayer.playerShape}]);
	
	//Don't want the Player class to call this directly so not sending in constructor
	newPlayer.playerEmit = playerEmit;
	
	return newPlayer;
};

Game.prototype.removePlayer = function removePlayer(playerId){
	var player = this.players[playerId];
	if (!player) return;
	
	if (player.team == 'red')
		delete this.teamRed[playerId];
	else
		delete this.teamBlue[playerId];
	
	delete this.players[playerId];
	player = null; //Technically don't need this but adding just in-case a closure ends up here in the future
	
	this.roomEmit('destroyPlayers', [playerId]);
};

Game.prototype.setTeamScore = function setTeamScore(team){
	if (team == 'red'){
		this.teamRedScore++;
	}
	else{
		this.teamBlueScore++;
	}
};

Game.prototype.getTeamScore = function getTeamScore(team){
	if (team == 'red'){
		return this.teamRedScore;
	}
	else {
		return this.teamBlueScore;
	}
};