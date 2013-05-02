"use strict";

var http = require('http')
  , io = require('socket.io');
  
var Game = require('./game.js').Game;

io = io.listen(14500);
//Handler set by Socket.io prevents CORS header from being written to reponse, so get rid of it
//Sometimes needed, haven't narrowed down causes to specific node.js or socket.io versions
//io.server.removeListener('request', io.server.listeners('request')[0]);
io.set('log level', process.argv[2] || 1); //If no parameter, set to low

io.sockets.on('connection', function(socket){
	var query = socket.handshake.query;
	var joinReturn 		= joinGame(socket.id, query.gameId, socket);
	if (joinReturn.error){
		//Something to report error
		return false;
	}
	
	var game 			= joinReturn.game;
	var currentPlayer 	= joinReturn.currentPlayer;
	var uid				= query.uid || String(Math.random());
	
	socket.emit('updateInfo', {
		uid:	uid,
		gameId:	game.id
	});
		
	socket.on('disconnect', function(){
		game.removePlayer(socket.id);
		
		//Remove the whole game if it's empty now
		if (Object.keys(game.players).length < 1){
			games.splice(games.indexOf(game), 1);
			gamesNotFull.splice(gamesNotFull.indexOf(game), 1);
		}
	});
	
	//This might belong better in the Game class
	io.sockets.in(game.id).emit('playerCount', Object.keys(game.players).length);
	
	/********Player actions********/
	socket.on('mouseMove', function(x, y){
		game.setPlayerPosition(socket.id, x, y);
	});
	
	socket.on('fire', function(){
		game.fireBall(socket.id);
	});
	
	socket.on('chatMessage', function(message){
		io.sockets.in(game.id).emit('chatMessage', socket.id, message);
	});
	
	socket.on('changeName', function(newName){
		socket.set('name', newName);
		io.sockets.in(game.id).emit('updateRoomInfo', {users:[{id: socket.id, props:{name:newName}}]});
	});
	
	
	if (assignDBHandlers(socket, uid)){
		DB_UserInfo(uid, function(err, user){
			socket.set('name', user.name);
			socket.emit('updateInfo', {name: user.name});
		});
	}
	else {
		var name =  'Player' + Object.keys(game.players).length + 1;
		socket.set('name', name);
		socket.emit('updateInfo', {name: name});
	}
});

var playerLimit = 6;
var games = [];
var newGameId = 0;
//Making a second list so we don't have to loop through games all the time looking for empty ones
var gamesNotFull = []; //This might be a good place to use a Harmony weak map
function joinGame(playerId, gameId, socket){
	//Are we specifying a game to join?
	if (gameId !== null && gameId !== undefined){
		var game = games[gameId];
		if (game){
			if (Object.keys(game.players).length < playerLimit){
				var currentPlayer = game.addPlayer(playerId, function(){socket.emit.apply(socket, arguments);});
				return {game: game, currentPlayer: currentPlayer};
			}
			else {
				return {error: 'Game is full'};
			}
		}
		else {
			return {error: 'Game not found'};
		}
	}
	
	//Return arbitrary game
	if (gamesNotFull.length > 0){
		var game = gamesNotFull.pop();
	}
	else {
		game = new Game(function(){io.sockets.in(game.id).emit.apply(io.sockets, arguments);});
		games.push(game);
		game.id = newGameId++;
		socket.join(game.id);
		game.initLevel();
		game.startTicks();  //Start running the game engine
	}
	
	var currentPlayer = game.addPlayer(playerId, function(){socket.emit.apply(socket, arguments);});
	if (Object.keys(game.players).length < playerLimit){
		gamesNotFull.push(game);
	}
	
	return {game: game, currentPlayer: currentPlayer};
};


/**********************************************************************
	Assign event handlers for recording data to database 
**********************************************************************/

var mongodb = require('mongodb');
var DB_Server = new mongodb.Server("127.0.0.1", 27017, {});
var DB_connector = new mongodb.Db('users', DB_Server, {});
var DB_Users = null;
DB_connector.open(function (error, client){
	if (error){ //Assume no connection was made
		console.log(error);
		return;
	}
	else {
		DB_Users = new mongodb.Collection(client, 'users');
	}
});

function assignDBHandlers(socket, uid){
	if (!DB_Users) return false;
	
	socket.on('updatePlayerScore', function(score){
		//score is only per game, we're storing total score for now, so just increment
		DB_Users.findAndModify(
			{_id:uid}, 
			['name'], 
			{$inc: {totalScore: 1}}, 
			{safe:true},
			function(err, user){
				socket.emit('updatePlayerTotalScore', user.totalScore);
			}
		);
	});
	
	socket.on('changeName', function(name){
		DB_Users.update(
			{_id:uid},
			{$set: {name:name}}
		);
	});
	
	return true;
}

function DB_UserInfo(uid, callback){
	if (!uid) return false;
	
	DB_Users.findAndModify({_id:uid}, ['name'], {$set:{lastLogin:Date.now()}}, {upsert:true, safe:true}, callback);
}
