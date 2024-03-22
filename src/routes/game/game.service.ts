import { UID } from "../../utils";
import {
  GameInfoReturn,
  GameState,
  HistoryInfo,
  HistoryType,
  MoveType,
  PlayerInfo,
} from "./game.types";

interface Payload {
  creator: string;
  state?: GameState;
  players?: PlayerInfo[];
  history?: HistoryType;
  gameId?: string;
  revealed?: boolean;
}

export class Game {
  public gameId: string;
  public creator: string;
  public state: GameState;
  public players: PlayerInfo[];
  public history: HistoryType;
  public revealed: boolean = false;
  constructor({ creator, gameId, history, players, revealed, state }: Payload) {
    this.creator = creator;

    this.gameId = gameId || UID(3);
    this.state = state || "lobby";
    this.players = players || [
      {
        username: creator,
        move: "none",
        score: 0,
      },
    ];
    this.history = history || {
      gameId: this.gameId,
      info: [],
    };
    this.revealed = revealed || false;
  }
  private getMoveType(move: string) {
    switch (move) {
      case "rock":
        return "rock";
      case "paper":
        return "paper";
      case "scissors":
        return "scissors";
      default:
        return "rock";
    }
  }
  private checkIfAllPlayersRolled() {
    return this.players.every((p) => p.move !== "none");
  }
  private checkIfPlayerRolled(username: string) {
    const player = this.players.find((p) => p.username === username);
    if (!player) {
      throw new Error("Player not found");
    }
    // return player.move !== "none";
    if (player.move !== "none") {
      return player;
    } else {
      throw new Error("Player already rolled");
    }
  }
  private nulifyMoves() {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].move = "none";
    }
  }
  private saveTieInHistory() {
    this.history.info.push({
      plays: this.players.map(({ move, username }) => {
        return { username, move: move as MoveType };
      }),
      result: "tie",
    });
  }
  private saveWinnerInHistory(winner: string[], loser: string[]) {
    this.history.info.push({
      plays: this.players.map(({ move, username }) => {
        return { username, move: move as MoveType };
      }),
      result: {
        winner,
        loser,
      },
    });
    for (let i = 0; i < this.players.length; i++) {
      if (winner.includes(this.players[i].username)) {
        this.players[i].score += 1;
      }
    }
  }
  private getResultInMoreThanTwoPlayers() {
    const movesPlayed = new Set();
    for (let i = 0; i < this.players.length; i++) {
      movesPlayed.add(this.players[i].move);
    }
    if (movesPlayed.size === 3) {
      return "tie";
    } else {
      const result: {
        winner: string[];
        loser: string[];
      } = { winner: [], loser: [] };
      // check if scissors & rock were played
      if (movesPlayed.has("scissors") && movesPlayed.has("rock")) {
        for (const player of this.players) {
          const { move, username } = player;
          if (move === "rock") {
            result.winner.push(username);
          } else {
            result.loser.push(username);
          }
        }
        return result;
      }
      // check if rock & paper were played
      if (movesPlayed.has("rock") && movesPlayed.has("paper")) {
        for (const player of this.players) {
          const { move, username } = player;
          if (move === "paper") {
            result.winner.push(username);
          } else {
            result.loser.push(username);
          }
        }
        return result;
      }
      // check if paper & scissors were played
      if (movesPlayed.has("paper") && movesPlayed.has("scissors")) {
        for (const player of this.players) {
          const { move, username } = player;
          if (move === "scissors") {
            result.winner.push(username);
          } else {
            result.loser.push(username);
          }
        }
        return result;
      }
    }

    return "tie";
    //
  }
  private changeToLobby() {
    this.state = "lobby";
  }
  private calculateScores() {
    const result = this.getResultInMoreThanTwoPlayers();
    if (result === "tie") {
      this.saveTieInHistory();
      this.nulifyMoves();
    } else {
      const { winner, loser } = result;
      this.saveWinnerInHistory(winner, loser);
      this.nulifyMoves();
    }
  }

  public get gameInfoReal() {
    return {
      gameId: this.gameId,
      creator: this.creator,
      state: this.state,
      players: this.players,
      history: this.history,
    };
  }

  public get gameInfo() {
    const info: GameInfoReturn = this.revealed
      ? {
          gameId: this.gameId,
          creator: this.creator,
          state: this.state,
          players: this.players.map((p) => {
            return {
              username: p.username,
              score: p.score,
              move: "hidden",
            };
          }),
          history: this.history,
        }
      : {
          gameId: this.gameId,
          creator: this.creator,
          state: this.state,
          players: this.players,
          history: this.history,
        };

    return info;
  }

  public addPlayer(username: string) {
    this.players.push({ username, move: "none", score: 0 });
  }

  public removePlayer(username: string) {
    const playerIndex = this.players.findIndex((p) => p.username === username);
    if (playerIndex === -1) {
      throw new Error("Player not found");
    }
    if (this.players.length === 2) {
      this.changeToLobby();
    }

    this.players.splice(playerIndex, 1);
  }

  public pauseGame(initiator: string) {
    if (initiator !== this.creator) {
      throw new Error("Only the creator can pause the game");
    }
    this.state = "lobby";
  }

  public startGame(initiator: string) {
    if (initiator !== this.creator) {
      throw new Error("Only the creator can start the game");
    }
    if (this.players.length < 2) {
      throw new Error("At least 2 players are required to start the game");
    }
    this.state = "in-progress";
  }

  public action(initiator: string, move: "rock" | "paper" | "scissors") {
    if (this.state !== "in-progress") {
      throw new Error("Game is not in progress");
    }

    // checks if the player has already rolled and returns player info
    const player = this.checkIfPlayerRolled(initiator);
    player.move = this.getMoveType(move);

    const allRolled = this.checkIfAllPlayersRolled();
    if (allRolled) {
      this.calculateScores();
      this.revealed = true;
    } else {
      this.revealed = false;
    }
  }
}
