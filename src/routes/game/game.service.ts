import { BadRequestError } from "../../errors/bad-request-error";
import { NotAuthorizedError } from "../../errors/not-authorized-error";
import redis from "../../redis";
import sessionService from "../../services/session.service";
import socketioServer from "../../socketio";
import { IUser } from "../auth/types.dto";
import Game from "./game.model";
import { GameModel, GameState, IGame, IGamePopulated } from "./types.dto";

class GameService {
  constructor(private gameModel: GameModel) {}
  public async getPingInfo(socket: SockVerified): Promise<void> {
    const userId = socket.currentUser.id;
    // await socket.join(userId);

    const currentGameId = await this.getCurrentGameOfTheUser(userId);

    if (!currentGameId) {
      return;
    }

    const game = await this.getGameById(currentGameId);
    if (!game) {
      await this.delCurrentGameOfUser(userId);
      throw new Error("Your Current Game not found");
    }

    await this.sendCurrentGameIdToUser(userId);
    await this.sendGameInfoToSocket(socket, game);

    await this.addOnlinePlayerToGame(currentGameId, userId);
  }

  public async setGameToFinished(socket: SockVerified): Promise<true> {
    const { game } = await this.validateCreatorAndGame(socket);

    // set game to finished and clear current round
    await game.updateOne({
      $set: {
        state: GameState.FINISHED,
        currentRound: [],
      },
    });

    //  send users a message that the game has ended
    await this.sendGameInfoToCurrentPlayers(game.gameId);

    // // clear current game of all players
    // for (const player of game.players) {
    //   await this.delCurrentGameOfUser(player.player.id);
    // }

    return true;
  }

  public async createGame(creator: string): Promise<IGamePopulated> {
    // check if user is already in a game
    const currentGame = await this.getCurrentGameOfTheUser(creator);
    if (currentGame) {
      throw new BadRequestError("User is already in a game");
    }

    const game = await this.gameModel.create({
      creator,
      inGamePlayers: [creator],
    });
    // update user's current game
    await this.setCurrentGameOfUser(game.gameId, creator);

    return (await this.getGameById(game.gameId))!;
  }

  public async joinGame(
    gameId: string,
    userId: string
  ): Promise<IGamePopulated> {
    // check if user is already in a game
    const currentGame = await this.getCurrentGameOfTheUser(userId);
    if (currentGame) {
      throw new BadRequestError("User is already in a game");
    }

    const game = await this.getGameById(gameId);
    if (!game) {
      throw new BadRequestError("Game not found");
    }

    // check if player already in players' list of the game
    const playerExists = game.players.find(
      (player) => player.player.id === userId
    );

    if (!playerExists && game.state !== GameState.FINISHED) {
      await game.updateOne({
        $push: { players: { player: userId } },
        $addToSet: { inGamePlayers: userId }, // add user to online players
      });
    } else {
      // add user to online players
      await game.updateOne({
        $addToSet: { inGamePlayers: userId },
      });
    }

    // update user's current game
    await this.setCurrentGameOfUser(gameId, userId);

    return (await this.getGameById(gameId))!;
  }

  public async leaveGame(userId: string): Promise<IGamePopulated> {
    // check if user is in that game
    const currentGameId = await this.getCurrentGameOfTheUser(userId);
    if (!currentGameId) {
      throw new BadRequestError("User is not in a game at all");
    }

    // check if game exists
    const game = await this.getGameById(currentGameId);
    if (!game) {
      throw new BadRequestError("Game doesn't exist");
    }

    // check if user is in current rounds
    const isInCurrentRound = game.currentRound.find(
      (player) => player.player.id === userId
    );

    if (isInCurrentRound) {
      if (game.state === GameState.IN_PROGRESS) {
        // remove player from current round
        await game.updateOne({
          // also stop it
          $set: { state: GameState.STOPPED, currentRound: [] },
        });
      }
    }

    await this.delCurrentGameOfUser(userId);

    // add user to inGame players
    await game.updateOne({
      $pull: { inGamePlayers: userId },
    });

    return (await this.getGameById(currentGameId))!;
  }

  public async getGameById(gameId: string): Promise<IGamePopulated | null> {
    return this.gameModel.findOne({
      gameId,
    });
  }

  public async askSelfGameInfo(socket: SockVerified): Promise<void> {
    const userId = socket.currentUser.id;
    const currentGameId = await this.getCurrentGameOfTheUser(userId);
    if (!currentGameId) {
      await this.sendGameInfoToSocket(socket, null);
    } else {
      const game = await this.getGameById(currentGameId);
      if (!game) {
        throw new BadRequestError("Game not found");
      }
      await this.sendGameInfoToSocket(socket, game);
    }
  }

  public async askGameInfoByGameId(
    socket: SockVerified,
    gameId: string
  ): Promise<void> {
    const game = await this.getGameById(gameId);
    if (!game) {
      throw new BadRequestError("Game not found");
    }
    await this.sendNonSelfGameInfoToSocket(socket, game);
  }

  public async sendNonSelfGameInfoToSocket(
    socket: Sock,
    gameInfo: IGamePopulated | null
  ): Promise<void> {
    socket.emit("game-info-not-self", gameInfo);
  }

  public async sendGameInfoToSocket(
    socket: Sock,
    gameInfo: IGamePopulated | null
  ): Promise<void> {
    console.log("sending game info to socket");
    // console.log(gameInfo?.toJSON());
    socket.emit("game-info", gameInfo?.toJSON());
  }

  // send game info to all players who's current game is this game
  public async sendGameInfoToCurrentPlayers(
    gameOrId: string | IGamePopulated
  ): Promise<true> {
    const game =
      typeof gameOrId === "string"
        ? await this.getGameById(gameOrId)
        : gameOrId;

    if (!game) {
      throw new BadRequestError("Game not found");
    }

    // check players who are in this game
    const players = game.players.map((player) => player.player.id as string);
    for (const playerId of players) {
      const currentGame = await this.getCurrentGameOfTheUser(playerId);
      if (currentGame === game.gameId) {
        // get user sessions
        const sessions = await sessionService.getUserSessions(playerId);
        if (sessions) {
          for (const sessionId of sessions) {
            // send game info to player
            socketioServer.to(sessionId).emit("game-info", game);
          }
        }
      }
    }

    return true;
  }

  private currentGameKey(userId: string): string {
    return `${userId}:currentGame`;
  }

  private async sendCurrentGameIdToUser(userId: string): Promise<true> {
    const currentGameId = await this.getCurrentGameOfTheUser(userId);

    // get user sessions
    const sessions = await sessionService.getUserSessions(userId);
    if (sessions) {
      for (const sessionId of sessions) {
        // send game info to player
        socketioServer.to(sessionId).emit("current-game", currentGameId);
      }
    }

    return true;
  }
  private async setCurrentGameOfUser(
    gameId: string,
    userId: string
  ): Promise<true> {
    const key = this.currentGameKey(userId);
    await redis.set(key, gameId);
    await this.sendCurrentGameIdToUser(userId);

    await this.addOnlinePlayerToGame(gameId, userId);

    return true;
  }
  private async delCurrentGameOfUser(userId: string): Promise<true> {
    const gameId = await this.getCurrentGameOfTheUser(userId);
    if (!gameId) {
      return true;
    }
    const key = this.currentGameKey(userId);
    await redis.del(key);
    await this.sendCurrentGameIdToUser(userId);
    await this.removeOnlinePlayerFromGame(gameId, userId);
    return true;
  }
  private async verifyCurrentGameOfUser(
    gameId: string,
    userId: string
  ): Promise<boolean> {
    const currentGame = await this.getCurrentGameOfTheUser(userId);
    if (currentGame !== gameId) {
      return false;
    }
    return true;
  }
  public async getCurrentGameOfTheUser(userId: string): Promise<string | null> {
    const key = this.currentGameKey(userId);
    return await redis.get(key);
  }

  // gameplay
  private async checkIfStartable(game: IGamePopulated): Promise<string[]> {
    // check if game has enough players
    if (game.players.length < 2) {
      throw new BadRequestError("Game needs at least 2 players");
    }
    // check if game has enough players which has current game set to this game
    let playersAbleToPlay: string[] = [];
    for (const player of game.players) {
      const checkIfCurrentGame = await this.verifyCurrentGameOfUser(
        game.gameId,
        player.player.id
      );

      if (checkIfCurrentGame) {
        playersAbleToPlay.push(player.player.id);
      }
    }
    if (playersAbleToPlay.length < 2) {
      throw new BadRequestError("Game needs at least 2 online players");
    }
    return playersAbleToPlay;
  }
  private async validateCreatorAndGame(socket: SockVerified): Promise<{
    userId: string;
    game: IGamePopulated;
  }> {
    const creator = socket.currentUser.id;
    const currentGameId = await this.getCurrentGameOfTheUser(creator);
    if (!currentGameId) {
      throw new BadRequestError("User is not in a game");
    }

    const game = await this.getGameById(currentGameId);
    if (!game) {
      throw new BadRequestError("Game not found");
    }

    // check if user is the creator
    if (game.creator.id !== creator) {
      throw new NotAuthorizedError("Only creator is allowed to do this action");
    }
    return { userId: creator, game };
  }
  public async startGame(socket: SockVerified): Promise<IGamePopulated> {
    const { game } = await this.validateCreatorAndGame(socket);
    // check if game is already started
    if (game.state === GameState.IN_PROGRESS) {
      throw new BadRequestError("Game is already started");
    }

    if (game.state === GameState.FINISHED) {
      throw new BadRequestError("Game is already finished");
    }

    // check if playable
    const playersAbleToPlay = await this.checkIfStartable(game);

    // start the game
    await game.updateOne({
      $set: {
        state: GameState.IN_PROGRESS,
        currentRound: playersAbleToPlay.map((playerId) => ({
          player: playerId,
          move: "none",
        })),
      },
    });

    return (await this.getGameById(game.gameId))!;
  }
  public async restartGame(socket: SockVerified) {
    const { game } = await this.validateCreatorAndGame(socket);

    // check if game is finished
    if (game.state === GameState.FINISHED) {
      throw new BadRequestError(
        "Game is finished, create a new game and play there"
      );
    }

    // check if game is in lobby
    if (game.state === GameState.LOBBY) {
      throw new BadRequestError("Game is not started yet");
    }

    // check if playable
    const playersAbleToPlay = await this.checkIfStartable(game);

    // restart the game
    await game.updateOne({
      $set: {
        state: GameState.IN_PROGRESS,
        currentRound: playersAbleToPlay.map((playerId) => ({
          player: playerId,
          move: "none",
        })),
      },
    });

    return (await this.getGameById(game.gameId))!;
  }

  public async stopGame(socket: SockVerified): Promise<IGamePopulated> {
    const { game } = await this.validateCreatorAndGame(socket);

    // check if game is already stopped
    if (game.state === GameState.STOPPED) {
      return game;
    }

    if (game.state !== GameState.IN_PROGRESS) {
      throw new BadRequestError("Game is not in progress");
    }

    // stop the game
    await game.updateOne({
      $set: {
        state: GameState.STOPPED,
        currentRound: [],
      },
    });

    return (await this.getGameById(game.gameId))!;
  }

  // online players info
  private getOnlinePlayersKey(gameId: string): string {
    return `${gameId}:onlinePlayers`;
  }
  private async addOnlinePlayerToGame(
    gameId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const key = this.getOnlinePlayersKey(gameId);
      await redis.SADD(key, userId);

      // calling sendInfoToOnlinePlayers
      await this.sendInfoToOnlinePlayers(gameId);
      return true;
    } catch (error) {
      return false;
    }
  }
  public async removeOnlinePlayerFromGame(
    gameId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const key = this.getOnlinePlayersKey(gameId);
      await redis.SREM(key, userId);

      await this.sendInfoToOnlinePlayers(gameId);

      return true;
    } catch (error) {
      return false;
    }
  }
  private async getOnlinePlayersOfGame(
    gameId: string
  ): Promise<string[] | null> {
    try {
      const key = this.getOnlinePlayersKey(gameId);
      const playersOnline = await redis.SMEMBERS(key);
      if (playersOnline.length === 0) {
        return null;
      }
      return playersOnline;
    } catch (error) {
      return null;
    }
  }
  private async sendInfoToOnlinePlayers(gameId: string): Promise<void> {
    try {
      const playersOnline = await this.getOnlinePlayersOfGame(gameId);
      if (!playersOnline) {
        return;
      }
      const game = await this.getGameById(gameId);
      if (!game) {
        throw new Error("Game not found");
      }
      for (const player of playersOnline) {
        const sessions = await sessionService.getUserSessions(player);
        if (sessions) {
          for (const socketId of sessions) {
            await this.sendInfoToSocket(socketId, playersOnline);
          }
        }
      }
    } catch (error: any) {
      console.log(error.message);
    }
  }
  private async sendInfoToSocket(
    socketId: string,
    info: string[]
  ): Promise<void> {
    socketioServer.to(socketId).emit("game-online-players", info);
  }
}

const gameService = new GameService(Game);
export default gameService;
