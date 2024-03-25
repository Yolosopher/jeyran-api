import { Document, Model } from "mongoose";
import { IUser, UserPopulatedType } from "../auth/types.dto";

export enum GameState {
  LOBBY = "lobby",
  IN_PROGRESS = "in-progress",
  FINISHED = "finished",
  STOPPED = "stopped",
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
export type RoundType = {
  winners: IUser[] | tID[];
  playerMoves: PlayerMoveType[];
};

type PlayerMovePopulatedType = {
  player: UserPopulatedType;
  move: MoveType;
};
type RoundPopulatedType = {
  winners: UserPopulatedType[];
  playerMoves: PlayerMovePopulatedType[];
};

export type CurrentRoundType = {
  player: tID | IUser;
  move: MoveType | "none" | "hidden";
};

export type CurrentRoundPopulatedType = {
  player: UserPopulatedType;
  move: MoveType | "none" | "hidden";
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
  currentRound: CurrentRoundType[];
  historyRounds: RoundType[];
  inGamePlayers: tID[];
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
  currentRound: CurrentRoundPopulatedType[];
  historyRounds: RoundPopulatedType[];
  inGamePlayers: string[];
  revealed: boolean;
}

export interface GameModel extends Model<IGame> {}

export interface ParseGameInfoForPlayerType {
  socketOrUserId: SockVerified | string; // socket or user id
  game: IGamePopulated;
}
