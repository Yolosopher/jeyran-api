import { TIME_TO_START_NEW_ROUND_IN_MS } from "../../constants";
import gameService from "../../routes/game/game.service";
import { MoveType } from "../../routes/game/types.dto";

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

export const onKickPlayer = async (
  socket: SockVerified,
  userIdToKick: string
) => {
  const game = await gameService.kickPlayer({
    socket,
    userIdToKick,
  });
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onUnBanPlayer = async (
  socket: SockVerified,
  userIdToUnban: string
) => {
  const game = await gameService.unBanPlayer({
    socket,
    userIdToUnban,
  });
  await gameService.sendGameInfoToCurrentPlayers(game);
};

export const onBanPlayer = async (
  socket: SockVerified,
  userIdToBan: string
) => {
  const game = await gameService.banPlayer({
    socket,
    userIdToBan,
  });
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

  // start new after some time if all players have moved
  const updatedGameResult = await gameService.calculateScores(game);

  if (updatedGameResult) {
    const updatedGame = updatedGameResult.game;
    const roundResult = updatedGameResult.result;

    // send game result to all players
    await gameService.sendRoundResultToPlayers(updatedGame, roundResult);

    // start new round after some time
    setTimeout(async () => {
      await gameService.sendGameInfoToCurrentPlayers(updatedGame);
    }, TIME_TO_START_NEW_ROUND_IN_MS);
  }
};

export const onPing = async (socket: SockVerified) => {
  await gameService.getPingInfo(socket);
};
