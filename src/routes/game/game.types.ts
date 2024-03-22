export type GameState = "lobby" | "in-progress" | "finished";

export type MoveType = "rock" | "paper" | "scissors";

export interface PlayerInfo {
  username: string;
  move: MoveType | "none";
  score: number;
}

export interface HistoryInfo {
  plays: {
    username: string;
    move: MoveType;
  }[];
  result:
    | "tie"
    | {
        winner: string[];
        loser: string[];
      };
}

export interface HistoryType {
  gameId: string;
  info: HistoryInfo[];
}

export type GameInfoReturn = {
  gameId: string;
  creator: string;
  state: GameState;
  players: {
    username: string;
    score: number;
    move: MoveType | "none" | "hidden";
  }[];
  history: HistoryType;
};
