/**
	The movingEntity class is for common methods and members of Ball and Player.
	
	It is an abstract class, that is, it's not meant to be instantiated on it's own.
	Only used for inheritence.
**/

function movingEntity(){};

exports.movingEntity = movingEntity;

movingEntity.prototype = {};
movingEntity.prototype.boardXMax = 800;
movingEntity.prototype.boardYMax = 800;

movingEntity.prototype.collides = function collides(){
	//Check all collisions
	//eventually
	
	return this.checkWallCollision();
};