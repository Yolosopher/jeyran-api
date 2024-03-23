import { Document, Model } from "mongoose";
import { IUser, UserPopulatedType } from "../auth/types.dto";

export enum GameState {
  LOBBY = "lobby",
  IN_PROGRESS = "in-progress",
  FINISHED = "finished",
  PAUSED = "paused",
}

export enum MoveType {
  ROCK = "rock",
  PAPER = "paper",
  SCISSORS = "scissors",
}

type PlayerMoveType = {
  player: tID | IUser;
  move: MoveType;
};
type RoundType = {
  winners: IUser[] | tID[];
  player_moves: PlayerMoveType[];
};

type PlayerMovePopulatedType = {
  player: UserPopulatedType;
  move: MoveType;
};
type RoundPopulatedType = {
  winners: UserPopulatedType[];
  player_moves: PlayerMovePopulatedType[];
};

export interface IGame extends Document {
  _id?: tID;
  id?: tID;
  gameId: string;
  creator: tID | IUser;
  state: GameState;
  players: {
    player: tID | IUser;
    score: number;
  }[];
  currentRound: {
    player: tID | IUser;
    move: MoveType | "none" | "hidden";
  }[];
  history_rounds: RoundType[];
  revealed: boolean;
}

export interface IGamePopulated extends Document {
  _id?: tID;
  id?: tID;
  gameId: string;
  creator: UserPopulatedType;
  state: GameState;
  players: {
    player: UserPopulatedType;
    score: number;
  }[];
  currentRound: {
    player: UserPopulatedType;
    move: MoveType | "none" | "hidden";
  }[];
  history_rounds: RoundPopulatedType[];
  revealed: boolean;
}

export interface GameModel extends Model<IGame> {}
