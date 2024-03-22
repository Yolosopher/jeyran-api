import roomService from "../routes/game/room.service";
import sessionService from "../services/session.service";
import socketioServer from "../socketio";

export const onDisconnect = async (socket: Sock) => {
  // pop session from redis
  const result = await sessionService.popUserSession({
    username: socket.currentUser!.username,
    socketId: socket.id,
  });

  console.log((await socketioServer.fetchSockets()).map((a) => a.id));
  if (!result) {
    throw new Error("Failed to pop session");
  } else {
    console.log(socket.id + " disconnected from redis");
  }

  socket.rooms.forEach((room) => {
    console.log("leaving room", room);
    roomService.leaveRoom(room, socket);
  });
};
