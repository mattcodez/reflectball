cg.Ball = function Ball(args){
	if (!args) return this;
	
	//this.owningPlayer = args.playerId;
	this.createShape(args.pos);
	//this.move(args.pos); //Why did we do this?
};

cg.Ball.prototype = {};
cg.Ball.prototype.createShape = function createShape(pos){
	this.shape = new fabric.Circle({
		left:	pos[0],
		top:	pos[1],
		fill:	'#FF8600',
		radius:	10,
		opacity:1
	});
	canvas.add(this.shape);
};

cg.Ball.prototype.move = function move(x, y){
	this.shape.set('left', x);
	this.shape.set('top', y);
};

cg.Ball.prototype.destroy = function destroy(){
	canvas.fxRemove(this.shape);
};