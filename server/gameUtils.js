/**
	Game Utilities
	
	Contains miscellaneous methods that don't belong to any particular class.
**/

//Distance between two points on a line
function pointDistance(args){
	//args -> {x1:val,x2:val,y1:val,y2:val}
	
	return Math.sqrt(Math.pow(args.x2 - args.x1, 2) + Math.pow(args.y2 - args.y1, 2));
}
exports.pointDistance = pointDistance;