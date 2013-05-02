var gameUtils = require('./gameUtils.js');

function Player(args){
	if (!args) return this;
	
	this.playerId	= args.playerId;
	this.team		= args.team;
	this.tickDelay	= args.tickDelay;
	this.score		= 0;
	this.ball		= null;

	this.init();
};
exports.Player = Player;

var movingEntity = require('./movingEntity.js').movingEntity;
Player.prototype = new movingEntity();

Player.prototype.movementThreshold = 30; //Distance mouse pointer must be from character before movement will occur
Player.prototype.maxSpeedTimed = 200; //Maxed out character movement speed per second
Player.prototype.accelLimit = 150; //Distance from character to mouse pointer at which maxSpeed is reached
Player.prototype.radius = 18; //(6 * scale of 3, must be manually kept in sync with client)

Player.prototype.init = function init(){
	this.ball = false;
	
	this.createShape();
	
	//Need default values for mouse coordinates or math won't work before mouse move
	this.mouseX = this.playerShape.left;
	this.mouseY = this.playerShape.top;
	
	//Used in calculating speed
	this.accelGap = this.accelLimit - this.movementThreshold;

	//Maxed out character movement speed per engine tick
	this.maxSpeed = Math.round(this.maxSpeedTimed / (1000 / this.tickDelay));	
};

Player.prototype.setScore = function updateScore(){
	this.score += 1;
}

Player.prototype.createShape = function createShape(){	
	this.playerShape = {
		left: //Find random x axis spot within margin on each side equal to player radius (so he's not off screen)
			this.radius + 
			Math.floor(
				Math.random() * 
				(this.boardXMax - (2*this.radius))
			),
		top:
			this.team == 'blue' ? //TODO: this is kinda tacky, move outside literal definition maybe
				Math.floor(this.boardYMax / 2) - (2 * this.radius): //blue on top
				Math.floor(this.boardYMax / 2) + (2 * this.radius), //red below
		fill: this.team == 'blue' ? '#0000FF' : '#FF0000',
		rotate: -90
	};
	
	this.lastXPos = this.playerShape.left;
	this.lastYPos = this.playerShape.top;
};

Player.prototype.setPos = function setPos(x, y){
	this.lastXPos = this.playerShape.left;
	this.lastYPos = this.playerShape.top;
	
	//Don't set if null, which here means that it shouldn't be changed
	//TODO: Probably best to check for undefined as well in case parameter is not passed
	if (x != null){
		this.playerShape.left = Math.round(x);
	}
	
	if (y != null){
		this.playerShape.top = Math.round(y);
	}
	
	return !!(this.lastXPos != x || this.lastYPos != y);
};

Player.prototype.getPos = function getPos(){
	return {x: this.playerShape.left, y: this.playerShape.top};
};

Player.prototype.getPrevPos = function getPrevPos(){
	return {x: this.lastXPos, y: this.lastYPos};
};

//Do whatever is needed to position character based on user's mouse position
Player.prototype.positionCharacter = function positionCharacter(){
	//Return true if either rotation or position were updated
	var rotated = this.rotate();
	var moved = this.moveToPointer();
	//var collided = this.collides();
	
	return rotated || moved;// || collided;
};

Player.prototype.moveToPointer = function moveToPointer(){
	
	//How far in, is the pointer inside the acceleration gap
	var accelDist = this.distanceToCharacter() - this.movementThreshold;
	if (accelDist <= 0){ 
		return false; //Player must be within the no-move zone (beneath movementThreshold)
	}
	
	
	/*	
		The character's instantaneous speed (the speed at any given function run) is the 
		percentage the mouse pointer is to the edge of the accelLimit times the maxSpeed.
		Ex, 80% to the accelLimit, 80% maxSpeed.
	*/
	var instSpeed = Math.min(1, (accelDist / this.accelGap)) * this.maxSpeed;
	
	
	/*
		Figure out how much to add to x and y to determine the next point on the line 
		between cursor and character that the character should be moved to.
		
		I would think a solution using just points and ratios instead of trig to 
		determine this would use the least resources but I couldn't figure it out 
		so doing it the "hard" way for now.
	*/
	var addX = Math.round(Math.cos(this.playerShape.rotate_rad) * instSpeed);
	var addY = Math.round(Math.sin(this.playerShape.rotate_rad) * instSpeed);
	return this.setPos(this.playerShape.left + addX, this.playerShape.top + addY);
};

Player.prototype.rotate = function rotate(){
	var dx = this.mouseX - this.playerShape.left;
	var dy = this.mouseY - this.playerShape.top;
	
	var radians = Math.atan2(dy, dx);
	var degrees = Math.round(radians * (180/Math.PI));
	
	if (this.playerShape.rotate == degrees){
		//TODO: how can we do this check first so that we're not running all this math every tick 
		//		if we don't have to?  Maybe create accessor method for setting mouseX and mouseY
		//		and there set _oldMouseX and _oldMouseY.  Or maybe just a 'changed' flag.
		return false;
	}
	else {
		this.playerShape.rotate = degrees;
		this.playerShape.rotate_rad = Math.round(radians); //keep this around for internal use
		return true;
	}
};

//Calculate distrance from mouse pointer to character
Player.prototype.distanceToCharacter = function distanceToCharacter(){
	return gameUtils.pointDistance({
		x2: this.playerShape.left, 
		x1: this.mouseX,
		y2: this.playerShape.top,
		y1: this.mouseY
	});
};

/*TODO: Will have to data-drive this at some point, probably when we add
a concept of levels, even the boarders of the playing field will be considered an object
in which to perform standard collision detection.*/
Player.prototype.checkWallCollision = function checkWallCollision(){
	
	var characterCollided = false;
	
	//Collision with right vertical wall
	if ((this.playerShape.left + this.radius) > this.boardXMax) {
		this.setPos(this.boardXMax - this.radius, null);
		characterCollided = true;
	}
	
	//collision with left vertical wall
	if ((this.playerShape.left - this.radius) < 0) {
		this.setPos(this.radius, null);
		characterCollided = true;
	}
	
	//Collision with bottom horizontal wall
	if ((this.playerShape.top + this.radius) > this.boardYMax){
		this.setPos(null, this.boardYMax - this.radius);
		characterCollided = true;
	}
	
	//Collision with top horizontal wall
	if ((this.playerShape.top - this.radius) < 0){
		this.setPos(null, this.radius);
		characterCollided = true;
	}
	
	//I don't care that these numbers are staticly set here, we need to data drive this
	//eventually anyways.
	if (this.team == 'red' && (this.playerShape.top - this.radius) < 400){
		this.setPos(null, 400 + this.radius);
		characterCollided = true;
	}
	if (this.team == 'blue' && (this.playerShape.top + this.radius) > 400){
		this.setPos(null, 400 - this.radius);
		characterCollided = true;
	}
	
	return characterCollided;
};

//TODO: This exists at client and server right now (r80), should eventually 
//		just send from server to client.
//Note also the 3x scale has been manually applied
Player.prototype.baseShape = [
    [ 18,  0], //1
    [ 18,  6], //2
    [ 12,  6], //3
    [ 12, 18], //4
    [-18, 18], //5
    [-18,  9], //6
    [  0,  9], //7
    [  0, -9], //8
    [-18, -9], //9
    [-18,-18], //10
    [ 12,-18], //11
    [ 12, -6], //12
    [ 18, -6], //13
    [ 18,  0]  //14
];
