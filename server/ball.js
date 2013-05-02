function Ball(args){
	if (!args) return this;
	
	this.id 		= args.id;		//Per instance ID
	this.player 	= args.player;
	this.tickDelay	= args.tickDelay;
	this.stationary = args.stationary;
	this.listId		= args.listId;
	
	this.init(args.x, args.y);
};
exports.Ball = Ball;

var movingEntity = require('./movingEntity.js').movingEntity;
Ball.prototype = new movingEntity();

Ball.prototype.speedTimed = 160; //pixels per second
Ball.prototype.characterRadius = 18; //Distance to edge of character from center (6 * scale of 3 right now), same as Player.radius TODO: these need to be dependent on one value
Ball.prototype.radius = 10; //Set statically client-side right now so have to manually keep in-sync if we change it

Ball.prototype.init = function(x, y){
	if ( !(x >=0 && y >=0) ) return;
	
	this.posX = x;
	this.posY = y;
};

Ball.prototype.fire = function(){
	this.stationary = false;
	this.bouncesRemain = 4;
	this.speed = Math.round(this.speedTimed / (1000 / this.tickDelay));
	
	//Calculate movement vector
	//Add this every time we move the ball on the screen
	var playerShape = this.player.playerShape;
	var radians = playerShape.rotate_rad;
	var yRatio = Math.sin(radians);
	var xRatio = Math.cos(radians);
	this.addY = Math.round(yRatio * this.speed);
	this.addX = Math.round(xRatio * this.speed);
	
	//Setup initial position
	//TODO: maybe do the rounding just when sending the JSON to the client
	this.posY = playerShape.top + this.addY + Math.round(yRatio * (this.radius + this.player.radius));
	this.posX = playerShape.left + this.addX + Math.round(xRatio * (this.radius + this.player.radius));
};

//Designed to run with game tick
Ball.prototype.move = function move(){
	if (this.stationary) return false;
	
	var oldX = this.posX;
	var oldY = this.posY;
	this.posX += this.addX;
	this.posY += this.addY;
	
	//Did the ball move?
	return !!(oldX != this.posX || oldY != this.posY);
};

//Return an array vector for the speed
Ball.prototype.getSpeedVector = function(){
	return [this.addX, this.addY];
};

Ball.prototype.checkWallCollision = function checkWallCollision(){
	if (this.stationary) return false;
	//Check all collisions with walls
	
	//TODO:	Should ball destroy itself or continue to let game do it?
	
	//Vertical wall collision
	if ((this.posX + this.radius) > this.boardXMax ||
		(this.posX - this.radius) < 0)
	{
		this.addX *= -1;
		return --this.bouncesRemain < 1 ? true : false;
	}
	
	//Horizontal wall collision
	if ((this.posY + this.radius) > this.boardYMax ||
		(this.posY - this.radius) < 0)
	{
		this.addY *= -1;
		return --this.bouncesRemain < 1 ? true : false;
	}
	
	//No collision detected
	return false;
};

Ball.prototype.destroy = function destroy(){
};
