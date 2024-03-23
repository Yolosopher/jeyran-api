import gameService from "../../routes/game/game.service";
import sessionService from "../../services/session.service";
import socketioServer from "../../socketio";

export const onGameCreate = async (socket: SockVerified) => {
  const userId = socket.currentUser.id;
  const game = await gameService.createGame(userId);
  await gameService.sendGameInfoToSocket(socket, game);
};

export const onGameJoin = async (socket: SockVerified, gameId: string) => {
  const userId = socket.currentUser.id;
  const game = await gameService.joinGame(gameId, userId);
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onGameLeave = async (socket: SockVerified) => {
  const userId = socket.currentUser.id;
  await gameService.leaveGame(userId);
};

export const onGameStart = async (socket: SockVerified) => {
  const game = await gameService.startGame(socket);
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onEndGame = async (socket: SockVerified, gameId: string) => {
  const userId = socket.currentUser.id;
  await gameService.setGameToFinished(userId, gameId);
};

// export const onPauseGame = async (socket: Sock, roomId: string) => {
//   roomService.pauseGame(roomId, socket);
// };

// export const onGameAction = async (socket: Sock, data: any) => {
//   roomService.gameAction(data, socket);
// };

export const onAskGameInfo = async (socket: SockVerified, gameId?: string) => {
  if (gameId) {
    await gameService.askGameInfoByGameId(socket, gameId);
  } else {
    await gameService.askSelfGameInfo(socket);
  }
};

export const onPing = async (socket: SockVerified) => {
  socket.emit("pong", Date.now());
  await gameService.getPingInfo(socket);
};
export const onDisconnect = async (socket: Sock) => {
  // if current user is not set, then no need to pop session
  const userId = socket?.currentUser?.id;

  if (userId) {
    await gameService.leaveGame(userId);

    // pop session from redis
    // FIXME: popUserSession doesn't work
    const result = await sessionService.popUserSession({
      userId,
      socketId: socket.id,
    });
    if (!result) {
      throw new Error("Failed to pop session");
    } else {
      console.log(socket.id + " disconnected from redis");
    }
  }

  console.log((await socketioServer.fetchSockets()).map((a) => a.id));
};
