// import redis from "../../redis";
// import cacheService from "../../services/cache.service";
// import socketioServer from "../../socketio";
// import { Game } from "./oldgame.service";
// import { MoveType, PlayerInfo } from "./game.types";

// class RoomService {
//   private games: Map<string, Game>;
//   constructor() {
//     this.games = new Map();
//     // this.logger();
//   }
//   public init = async () => {
//     const gameKeys = await redis.keys("game:*");
//     for (const key of gameKeys) {
//       const gameId = key.split(":")[1];
//       const gameInfo = await cacheService.get(key);
//       const game = new Game(gameInfo);
//       this.games.set(gameId, game);
//     }
//   };
//   private gameKey(gameId: string) {
//     return `game:${gameId}`;
//   }
//   private logger() {
//     const interval = setInterval(() => {
//       console.log(this.games.values());
//     }, 5000);
//   }

//   private async cacheUpdate(gameId: string) {
//     const game = this.games.get(gameId);
//     if (!game) {
//       throw new Error("Game not found");
//     }
//     await cacheService.set(this.gameKey(gameId), game.gameInfo);
//   }
//   private emitGameInfo(gameId: string) {
//     const game = this.games.get(gameId);
//     if (!game) {
//       throw new Error("Game not found");
//     }
//     this.emitToRoom(gameId, "game-info", { gameInfo: game.gameInfo });
//     this.cacheUpdate(gameId).catch((err: any) =>
//       console.log(`cacheUpdate: ${err.message}`)
//     );
//   }
//   private searchRoom(username: string) {
//     return [...this.games.values()].find((game: Game) => {
//       return game.players.some((player: PlayerInfo) => {
//         return player.username === username;
//       });
//     });
//   }
//   private emitToRoom(gameId: string, event: string, data: any) {
//     socketioServer.to(gameId).emit(event, data);
//   }
//   private deleteGame(gameId: string) {
//     return this.games.delete(gameId);
//   }
//   private canPlayerJoin(username: string) {
//     //if already in game, throw error
//     // check if player already in game
//     const alreadyInGame = this.searchRoom(username);
//     if (alreadyInGame) {
//       throw new Error("You are already in a game");
//     }
//     return true;
//   }

//   public async joinRoom(gameId: string, socket: Sock) {
//     try {
//       const username = socket.currentUser!.username;
//       // check if game exists
//       const foundRoom = await this.getRoom(gameId);

//       // check if player already in game
//       this.canPlayerJoin(username);

//       // add player to game
//       const game = this.games.get(gameId)!;
//       game.addPlayer(username);

//       // socket joins to gameId room
//       await socket.join(gameId);

//       // emit to room that someone joined
//       this.emitToRoom(gameId, "user-joined", {
//         username,
//       });

//       this.emitGameInfo(game.gameId);
//     } catch (error: any) {
//       socket.emit("err", error.message);
//     }
//   }
//   public async createRoom(socket: Sock) {
//     try {
//       const creator = socket.currentUser!.username;

//       // check if player already in game
//       this.canPlayerJoin(creator);

//       const game = new Game({
//         creator: creator,
//       });
//       this.games.set(game.gameId, game);

//       // socket joins to created gameId room
//       await socket.join(game.gameId);

//       // emit to room that someone joined
//       this.emitToRoom(game.gameId, "user-joined", {
//         gameId: game.gameId,
//         username: socket.currentUser!.username,
//       });

//       this.emitGameInfo(game.gameId);

//       return game;
//     } catch (error: any) {
//       socket.emit("err", error.message);
//     }
//   }
//   public async getRoom(gameId: string) {
//     const result = this.games.get(gameId);

//     if (!result) {
//       const cachedGame = await cacheService.get(this.gameKey(gameId));
//       if (!cachedGame) {
//         throw new Error("Game not found");
//       } else {
//         const restoredGame = new Game(cachedGame);
//         this.games.set(gameId, restoredGame);
//         return restoredGame;
//       }
//     }
//     return result;
//   }
//   public async leaveRoom(gameId: string, socket: Sock) {
//     try {
//       const leaver = socket.currentUser!.username;
//       const game = await this.getRoom(gameId);

//       if (!game) {
//         throw new Error("Game not found");
//       }
//       if (game.creator === leaver) {
//         this.deleteGame(gameId);

//         this.emitToRoom(gameId, "room-deleted", {
//           message: "room owner left or deleted the room",
//         });

//         socketioServer
//           .in(gameId)
//           .fetchSockets()
//           .then((roomMembers) => {
//             roomMembers.forEach((memberSocket) => {
//               memberSocket.leave(gameId);
//             });
//           });
//       } else {
//         game.removePlayer(leaver);
//         // socket leaves gameId room
//         socket.leave(gameId);

//         // emit to room that someone left
//         this.emitToRoom(gameId, "user-left", {
//           username: leaver,
//         });
//       }
//       this.emitGameInfo(gameId);
//     } catch (error: any) {
//       socket.emit("err", error.message);
//     }
//   }
//   public startGame(gameId: string, socket: Sock) {
//     const creator = socket.currentUser!.username;

//     const game = this.games.get(gameId);
//     if (!game) {
//       throw new Error("Game not found");
//     }
//     if (game.creator !== creator) {
//       throw new Error("Only the creator can start the game");
//     }

//     game.startGame(creator);
//     this.emitGameInfo(gameId);
//   }
//   public pauseGame(gameId: string, socket: Sock) {
//     const creator = socket.currentUser!.username;

//     const game = this.games.get(gameId);
//     if (!game) {
//       throw new Error("Game not found");
//     }

//     game.pauseGame(creator);
//     this.emitGameInfo(gameId);
//   }
//   public gameAction(
//     { move, gameId }: { move: MoveType; gameId: string },
//     socket: Sock
//   ) {
//     const game = this.games.get(gameId);
//     if (!game) {
//       throw new Error("Game not found");
//     }
//     game.action(socket.currentUser!.username, move);
//     this.emitGameInfo(gameId);
//   }
//   public async checkRoom(gameId: string, socket: Sock) {
//     try {
//       let foundGame = this.games.get(gameId);

//       if (!foundGame) {
//         const cachedGame = await cacheService.get(gameId);
//         if (!cachedGame) {
//           throw new Error("Game not found");
//         } else {
//           foundGame = new Game(cachedGame);
//           this.games.set(gameId, foundGame);
//         }
//       }
//       socket.emit("check-success");
//     } catch (error: any) {
//       console.log("caught room-check error", error.message);
//       socket.emit("err", error.message);
//     }
//   }
// }

// const roomService = new RoomService();

// export default roomService;
