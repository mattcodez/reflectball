cg.Player = function Player(args){
	if (!args) return this;
	
	this.playerId = args.playerId;
	this.createShape(args.shape);
};

cg.Player.prototype = {};
cg.Player.prototype.createShape = function createShape(shape){
	this.playerShape = new fabric.Polygon(this.baseShape[0], this.baseShape[1]);
	this.playerShape.set('fill',	shape.fill);
	this.playerShape.set('left',	shape.left);
	this.playerShape.set('top',		shape.top);
	this.playerShape.setAngle(shape.rDegrees);
	this.playerShape.scale(3);
	canvas.add(this.playerShape);
};

cg.Player.prototype.move = function move(x, y){
	this.playerShape.set('left', x);
	this.playerShape.set('top', y);
};

cg.Player.prototype.getPos = function(){
	return [this.playerShape.get('left'), this.playerShape.get('top')];
};

cg.Player.prototype.rotate = function rotate(rDegrees){
	this.playerShape.setAngle(rDegrees);
};

cg.Player.prototype.fire = function fire(){
	//TODO: The player/character should probably be the one to fire.
};

cg.Player.prototype.baseShape = [
	[
    {x:  6, y:  0}, //1
    {x:  6, y:  2}, //2
    {x:  4, y:  2}, //3
    {x:  4, y:  6}, //4
    {x: -6, y:  6}, //5
    {x: -6, y:  3}, //6
    {x:  0, y:  3}, //7
    {x:  0, y: -3}, //8
    {x: -6, y: -3}, //9
    {x: -6, y: -6}, //10
    {x:  4, y: -6}, //11
    {x:  4, y: -2}, //12
    {x:  6, y: -2}, //13
    {x:  6, y:  0}  //14
	],
	{ 
        stroke: "#000000", 
        strokeWidth: 1,
        fill: '#000000',  //black for default, set manually per-player
        opacity: 1.0
    }
];