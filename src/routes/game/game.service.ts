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
    const currentGameId = await this.getCurrentGameOfTheUser(userId);
    await this.sendCurrentGameIdToUser(userId);

    if (!currentGameId) {
      return;
    }

    const game = await this.getGameById(currentGameId);
    if (!game) {
      throw new Error("Your Current Game not found");
    }

    await this.sendGameInfoToSocket(socket, game);
  }

  public async setGameToFinished(
    userId: string,
    gameId: string
  ): Promise<true> {
    // check if the game exists
    const game = await this.getGameById(gameId);
    if (!game) {
      throw new BadRequestError("Game not found");
    }

    // check if user is the creator
    if (game.creator.id !== userId) {
      throw new NotAuthorizedError("Only creator can end the game");
    }

    // set game to finished and clear current round
    await game.updateOne({
      $set: {
        state: GameState.FINISHED,
      },
    });

    //  send users a message that the game has ended
    await this.sendGameInfoToCurrentPlayers(game.gameId);

    await game.updateOne({
      $set: {
        currentRound: [],
      },
    });

    // clear current game of all players
    for (const player of game.players) {
      await this.delCurrentGameOfUser(player.player.id);
    }

    return true;
  }

  public async createGame(creator: string): Promise<IGamePopulated> {
    // check if user is already in a game
    const currentGame = await this.getCurrentGameOfTheUser(creator);
    if (currentGame) {
      throw new BadRequestError("User is already in a game");
    }

    const game = await this.gameModel.create({ creator });
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

    const game = await this.gameModel.findOne({ gameId });
    if (!game) {
      throw new BadRequestError("Game not found");
    }

    await game.updateOne({
      $push: { players: { player: userId } },
    });

    // update user's current game
    await this.setCurrentGameOfUser(gameId, userId);

    return (await this.getGameById(gameId))!;
  }

  public async leaveGame(userId: string): Promise<true> {
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

    // remove player from current round
    await game.updateOne({
      $pull: { currentRound: { player: userId } },
    });

    await this.delCurrentGameOfUser(userId);

    return true;
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
            console.log("sending game info to player");
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
    return true;
  }
  private async delCurrentGameOfUser(userId: string): Promise<true> {
    const key = this.currentGameKey(userId);
    await redis.del(key);
    await this.sendCurrentGameIdToUser(userId);
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
  private async getCurrentGameOfTheUser(
    userId: string
  ): Promise<string | null> {
    const key = this.currentGameKey(userId);
    return await redis.get(key);
  }

  // gameplay
  public async startGame(socket: SockVerified): Promise<IGamePopulated> {
    const userId = socket.currentUser.id;
    const currentGameId = await this.getCurrentGameOfTheUser(userId);
    if (!currentGameId) {
      throw new BadRequestError("User is not in a game");
    }

    const game = await this.getGameById(currentGameId);
    if (!game) {
      throw new BadRequestError("Game not found");
    }

    // check if user is the creator
    if (game.creator.id !== userId) {
      throw new NotAuthorizedError("Only creator can start the game");
    }

    // check if game is already started
    if (game.state === GameState.IN_PROGRESS) {
      throw new BadRequestError("Game is already started");
    }

    // check if game has enough players
    if (game.players.length < 2) {
      throw new BadRequestError("Game needs at least 2 players");
    }

    // check if game has enough players which has current game set to this game
    let playersInGame = 0;
    for (const player of game.players) {
      const checkIfCurrentGame = await this.getCurrentGameOfTheUser(
        player.player.id
      );

      if (checkIfCurrentGame === game.gameId) {
        playersInGame++;
      }
    }
    if (playersInGame < 2) {
      throw new BadRequestError("Game needs at least 2 players");
    }

    // start the game
    await game.updateOne({
      $set: {
        state: GameState.IN_PROGRESS,
      },
      $push: {
        currentRound: {
          $each: game.players.map((player) => ({
            player: player.player.id,
            move: "none",
          })),
        },
      },
    });

    return (await this.getGameById(game.gameId))!;
  }
}

const gameService = new GameService(Game);
export default gameService;
