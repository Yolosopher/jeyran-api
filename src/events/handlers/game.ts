import { NotAuthorizedError } from "../../errors/not-authorized-error";
import { currentUserForSocket } from "../../middleware/current-user";
import roomService from "../../routes/game/room.service";
import sessionService from "../../services/session.service";

export const onRoomCreate = async (socket: Sock) => {
  roomService.createRoom(socket);
};

export const onRoomJoin = async (socket: Sock, roomId: string) => {
  roomService.joinRoom(roomId, socket);
};

export const onRoomLeave = async (socket: Sock, roomId: string) => {
  roomService.leaveRoom(roomId, socket);
};

export const onStartGame = async (socket: Sock, roomId: string) => {
  roomService.startGame(roomId, socket);
};

export const onPauseGame = async (socket: Sock, roomId: string) => {
  roomService.pauseGame(roomId, socket);
};

export const onGameAction = async (socket: Sock, data: any) => {
  roomService.gameAction(data, socket);
};

export const onGameCheck = async (socket: Sock, gameId: string) => {
  roomService.checkRoom(gameId, socket);
};

export const onPing = async (socket: Sock) => {
  console.log("running ping........");
  socket.emit("pong", Date.now());
  // socket.on("ping", () => {
  // });
};
