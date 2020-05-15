var users = new Set();
var rooms = new Set();
var roomOwner = {};
var roomUsers = {};
var roomBan = {};
var roomPass = {};
var roomPrivate = {};

// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
		
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	
	// load
	socket.on('message_to_server_load', function(data) {
		socket.emit("message_to_client_load",{message:Array.from(rooms) });
	});
	
	// message.
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data['roomname'];
		var message = data['message'];
		var username = data['username'];
		console.log("message: "+data["message"]); // log it to the Node.JS output
		socket.to(roomname).emit("message_to_client",{
			message:message,
			username:username
		}); // broadcast the message to other users
		socket.emit("message_to_client",{
			message:message,
			username:username
		});
	});
	
	// sign on message.
	socket.on('message_to_server_sign_on', function(data) {
		// This callback runs when the server receives a new message from the client.
		var username = data["message"];
		var addSuccess = true;
		if (users.has(username)) {
			addSuccess = false;
		} else {
			users.add(username);
			addSuccess = true;
		}
		
		socket.emit("message_to_client_sign_on",{
			username:username,
			success:addSuccess
		})
	});
	
	// create room.
	socket.on('message_to_server_create_room', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data["roomname"];
		var username = data["username"];
		var roompassword = data["roompassword"];
		var addSuccess = true;
		if (rooms.has(roomname)) {
			addSuccess = false;
		} else {
			if (roomname == "") {
				addSuccess = false;
			} else {
				rooms.add(roomname);
				roomPass[roomname] = roompassword;
				roomOwner[roomname] = username;
				roomUsers[roomname] = new Set();
				roomBan[roomname] = new Set();
				addSuccess = true;
			}
		}
		io.sockets.emit("message_to_client_create_room",{
			roomname:roomname,
			username:username,
			success:addSuccess
		})
	});
	
	// go in room. 
	socket.on('message_to_server_goin_room', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data["roomname"];
		var roompassword = data["roompassword"];
		var username = data["username"];
		var state = 0;
		if (roomUsers[roomname].has(username)) {
			state = 1;	// The user is in the room already.
		} else {
			if (roomPass[roomname] == roompassword) {
				roomUsers[roomname].add(username);
				console.log(roomUsers[roomname]);
				socket.join(roomname);
				state = 0;
			} else {
				state = 2;	// Password is wrong.
			}
		}
		socket.to(roomname).emit("message_to_client_goin_room",{
			roomname:roomname,
			username:username,
			owner:roomOwner[roomname],
			state:state,
			users:Array.from(roomUsers[roomname])
		}); // broadcast the message to other users
		socket.emit("message_to_client_goin_room",{
			roomname:roomname,
			username:username,
			owner:roomOwner[roomname],
			state:state,
			users:Array.from(roomUsers[roomname])
		})
	});
	
	// exit room.
	socket.on('message_to_server_exit_room', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data["roomname"];
		var username = data["username"];
		var exitSuccess = true;
		if (roomUsers[roomname].has(username)) {
			exitSuccess = true;
			roomUsers[roomname].delete(username);
			socket.leave(roomname);
			console.log(roomUsers[roomname]);
		} else {
			exitSuccess = false;
		}
		console.log(roomOwner[roomname]);
		socket.to(roomname).emit("message_to_client_exit_room",{
			roomname:roomname,
			username:username,
			roomOwner:roomOwner[roomname],
			success:exitSuccess,
			users:Array.from(roomUsers[roomname])
		}); // broadcast the message to other users
		socket.emit("message_to_client_exit_room",{
			roomname:roomname,
			username:username,
			roomOwner:roomOwner[roomname],
			success:exitSuccess,
			users:Array.from(roomUsers[roomname])
		})
	});
	
	// kick user.
	socket.on('message_to_server_kick_user', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data["roomname"];
		var username = data["username"];
		var kickuser = data["kickuser"];
		//roomUsers[roomname].delete(kickuser);
		console.log(roomUsers[roomname]);
		socket.to(roomname).emit("message_to_client_kick_user",{
			roomname:roomname,
			username:username,
			kickuser:kickuser,
			users:Array.from(roomUsers[roomname])
		}); // broadcast the message to other users
		socket.emit("message_to_client_kick_user",{
			roomname:roomname,
			username:username,
			kickuser:kickuser,
			users:Array.from(roomUsers[roomname])
		})
	});
	
	// be kicked
	socket.on('message_to_server_be_kicked', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data["roomname"];
		var username = data["username"];
		var owner = data["roomOwner"];
		var exitSuccess = true;
		console.log(owner);
		if (roomUsers[roomname].has(username)) {
			exitSuccess = true;
			roomUsers[roomname].delete(username);
			socket.leave(roomname);
			console.log(roomUsers[roomname]);
		} else {
			exitSuccess = false;
		}
		socket.to(roomname).emit("message_to_client_be_kicked",{
			roomname:roomname,
			username:username,
			roomOwner:owner,
			success:exitSuccess,
			users:Array.from(roomUsers[roomname])
		}); // broadcast the message to other users
		socket.emit("message_to_client_be_kicked",{
			roomname:roomname,
			username:username,
			roomOwner:owner,
			success:exitSuccess,
			users:Array.from(roomUsers[roomname])
		})
	});
	
	// ban user.
	socket.on('message_to_server_ban_user', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data["roomname"];
		var username = data["username"];
		var banneduser = data["banneduser"];
		console.log(banneduser);
		var state = 0;
		if (users.has(banneduser)) {
			if (roomUsers[roomname].has(banneduser)) {
				state = 1; // the ban user is already in the room.
			} else {
				state = 0; // the ban user is valid.
				roomBan[roomname].add(banneduser);
				console.log(roomBan[roomname]);
			}
		} else {
			state = 2;	// the ban user does not exist.
		}
		io.sockets.emit("message_to_client_ban_user",{
			roomname:roomname,
			banneduser:banneduser,
			username:username,
			state:state
		}); // broadcast the message to other users
	});
	
	// unban user.
	socket.on('message_to_server_unban_user', function(data) {
		// This callback runs when the server receives a new message from the client.
		var roomname = data["roomname"];
		var username = data["username"];
		var unbanuser = data["unbanuser"];
		console.log(unbanuser);
		var state = 0;
		if (roomBan[roomname].has(unbanuser)) {
			roomBan[roomname].delete(unbanuser);
			state = 0;
		} else {
			state = 1;	// the unban user does not exist.
		}
		io.sockets.emit("message_to_client_unban_user",{
			roomname:roomname,
			unbanuser:unbanuser,
			username:username,
			state:state
		}); // broadcast the message to other users
	});
	
	// private chat.
	socket.on('message_to_server_private_chat', function(data) {
		// This callback runs when the server receives a new message from the client.
		var oldroom = data['oldroom'];
		var roomname = data["roomname"];
		var fromUser = data["fromUser"];
		var toUser = data["toUser"];
		var state = 0;
		if (roomPrivate.hasOwnProperty(roomname)) {
			state = 1;	// private room exists already.
		} else {
			state = 0;	// private room can be created.
			roomPrivate[roomname] = new Set();
			roomPrivate[roomname].add(fromUser);
			roomPrivate[roomname].add(toUser);
			socket.leave(oldroom);
			socket.join(roomname);
		}
		socket.to(oldroom).emit("message_to_client_private_chat",{
			roomname:roomname,
			fromUser:fromUser,
			state:state,
			toUser:toUser
		}); // broadcast the message to other users
		socket.emit("message_to_client_private_chat",{
			roomname:roomname,
			fromUser:fromUser,
			state:state,
			toUser:toUser
		})
	});
	
	// join private room.
	socket.on('message_to_server_join_private', function(data) {
		var oldroom = data['oldroom'];
		var roomname = data['roomname'];
		var username = data['username'];
		socket.leave(oldroom);
		socket.join(roomname);
		socket.emit("message_to_client_join_private",{
			roomname:roomname,
			username:username
		});
	});
	
	// private back.
	socket.on('message_to_server_private_back', function(data) {
		var oldroom = data['oldroom'];
		var fromUser = data['fromUser'];
		var toUser = data['toUser'];
		var roomname = "";
		for (var key in roomUsers) {
			if (roomUsers[key].has(fromUser)) {
				roomname = key;
				console.log(key);
			}
		}
		console.log(roomname);
		socket.leave(oldroom);
		socket.join(roomname);
		socket.to(oldroom).emit("message_to_client_private_back",{
			roomname:roomname,
			fromUser:fromUser,
			toUser:toUser
		}); // broadcast the message to other users
		socket.emit("message_to_client_private_back",{
			roomname:roomname,
			fromUser:fromUser,
			toUser:toUser
		})
	});
	
	// toUser back to room.
	socket.on('message_to_server_back_room', function(data) {
		var oldroom = data['oldroom'];
		var roomname = data['roomname'];
		var username = data['username'];
		socket.leave(oldroom);
		socket.join(roomname);
		socket.emit("message_to_client_back_room",{
			roomname:roomname,
			username:username
		});
	});
	
});

