exports.map={
	name:			'Map 0',
	maxPlayerBalls:	1,
	border:			[
						800,
						800
					],
	teams:			[
						{name:'Blue', color:'0000FF', id:0},
						{name:'Red',  color:'FF0000', id:1}	
					],
	ballSpawns:		[
						{point:[100,380]},
						{point:[700,420]}
					],
	playerSpawns:	[
						{team:0, point:[100,80]}, {team:1, point:[100,720]},
						{team:0, point:[400,80]}, {team:1, point:[400,720]},
						{team:0, point:[700,80]}, {team:1, point:[800,720]}
					],
	objects:		[
						{type:'poly', vertices:[{x:0,y:400},{x:800,y:400}]},
						{type:'poly', vertices:[{x:10,y:410},{x:35,y:410},{x:35,y:435},{x:10,y:435}]},
						{type:'poly', vertices:[{x:300, y:600}, {x:600, y:500}]},
						// Repeat map borders
						{type:'poly', vertices:[{x:0, y:0}, {x:800, y:0}]},
						{type:'poly', vertices:[{x:0, y:0}, {x:0, y:800}]},
						{type:'poly', vertices:[{x:0, y:800}, {x:800, y:800}]},
						{type:'poly', vertices:[{x:800, y:800}, {x:800, y:0}]},
					]
}
