import gameService from "../../routes/game/game.service";
import { MoveType } from "../../routes/game/types.dto";
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
  const game = await gameService.leaveGame(userId);
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onGameStart = async (socket: SockVerified) => {
  const game = await gameService.startGame(socket);
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onGameRestart = async (socket: SockVerified) => {
  const game = await gameService.restartGame(socket);
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onEndGame = async (socket: SockVerified) => {
  const userId = socket.currentUser.id;
  await gameService.setGameToFinished(socket);
};

export const onGameStop = async (socket: SockVerified) => {
  const game = await gameService.stopGame(socket);
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onGameMove = async (socket: SockVerified, move: MoveType) => {
  const game = await gameService.moveInGame(socket, move);
  await gameService.sendGameInfoToCurrentPlayers(game);
  const updatedGame = await gameService.calculateScores(game);
  if (updatedGame) {
    setTimeout(async () => {
      await gameService.sendGameInfoToCurrentPlayers(updatedGame);
    }, 3000);
  }
};

export const onPing = async (socket: SockVerified) => {
  await gameService.getPingInfo(socket);
};
export const onDisconnect = async (socket: Sock) => {
  // pop session from redis
  const result = await sessionService.popUserSession({
    userId: "",
    socketId: socket.id,
  });
  if (!result.success) {
    // console.log("Failed to pop session, maybe not logged in socket");
  } else {
    console.log(socket.id + " disconnected from redis");
    const gameId = await gameService.getCurrentGameOfTheUser(result.userId);
    if (gameId) {
      await gameService.removeOnlinePlayerFromGame(gameId, result.userId);
    }
    // leave game too
    // await gameService.leaveGame(result.userId, true);
  }

  console.log((await socketioServer.fetchSockets()).map((a) => a.id));
};
