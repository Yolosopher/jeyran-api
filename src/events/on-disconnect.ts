import gameService from "../routes/game/game.service";
import sessionService from "../services/session.service";
import socketioServer from "../socketio";

export const onDisconnect = async (socket: Sock) => {
  // pop session from redis
  const result = await sessionService.popUserSession({
    userId: "",
    socketId: socket.id,
  });
  if (!result.success) {
    // console.log("Failed to pop session, maybe not logged in socket");
  } else {
    // console.log(socket.id + " disconnected from redis");
    const gameId = await gameService.getCurrentGameOfTheUser(result.userId);
    if (gameId) {
      await gameService.removeOnlinePlayerFromGame(gameId, result.userId);
    }
    // leave game too
    // await gameService.leaveGame(result.userId, true);
  }

  // console.log((await socketioServer.fetchSockets()).map((a) => a.id));
};
