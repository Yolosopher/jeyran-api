import { Schema, model } from "mongoose";
import {
  GameModel,
  IGame,
  GameState,
  MoveType,
  CurrentRoundType,
} from "./types.dto";
import { UID } from "../../utils";

const GameSchema = new Schema<IGame>(
  {
    gameId: {
      type: String,
      required: true,
      default: () => UID(4),
      unique: true,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    state: {
      type: String,
      enum: [
        GameState.LOBBY,
        GameState.IN_PROGRESS,
        GameState.FINISHED,
        GameState.STOPPED,
      ],
      default: GameState.LOBBY,
    },
    players: [
      new Schema(
        {
          player: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          score: {
            type: Number,
            default: 0,
          },
        },
        {
          _id: false,
        }
      ),
    ],
    currentRound: [
      new Schema(
        {
          player: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          move: {
            type: String,
            enum: [MoveType.PAPER, MoveType.ROCK, MoveType.SCISSORS, "none"],
            default: "none",
          },
        },
        {
          _id: false,
        }
      ),
    ],
    historyRounds: [
      new Schema(
        {
          winners: [
            {
              type: Schema.Types.ObjectId,
              ref: "User",
            },
          ],
          playerMoves: [
            new Schema(
              {
                player: {
                  type: Schema.Types.ObjectId,
                  ref: "User",
                },
                move: {
                  type: String,
                  enum: [MoveType.PAPER, MoveType.ROCK, MoveType.SCISSORS],
                },
              },
              { _id: false }
            ),
          ],
        },
        { _id: false }
      ),
    ],
    revealed: {
      type: Boolean,
      default: false,
    },
    inGamePlayers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = doc._id.toString();
        delete ret._id;

        // if (!doc.revealed) {
        //   ret.currentRound = doc.currentRound.map((player: any) => {
        //     player.move = "hidden";
        //     return player;
        //   });
        // }
      },
    },
  }
);

GameSchema.pre("save", function (done) {
  if (this.isNew) {
    // insert creator as a player
    this.players.push({ player: this.creator, score: 0 });
  }
  done();
});

// if currentRound is updated, check if all players have made a move
// if all players have made a move, set revealed to true
// else set revealed to false
GameSchema.pre("updateOne", { document: false, query: true }, function (done) {
  const players = this.get("currentRound");
  if (!players) return done();
  if (players.length > 1) {
    // check if all players have made a move
    let allPlayersMadeMove = true;
    for (const player of players) {
      if (player.move === "none") {
        allPlayersMadeMove = false;
        break;
      }
    }
    if (allPlayersMadeMove) {
      this.set("revealed", true);
    } else {
      this.set("revealed", false);
    }
  }
  done();
});

GameSchema.pre("findOne", { document: true, query: true }, function (done) {
  this.populate("creator", "id username");
  this.populate("players.player", "id username");
  this.populate("currentRound.player", "id username");
  this.populate("historyRounds.winners", "id username");
  this.populate("historyRounds.playerMoves.player", "id username");
  done();
});

const Game = model<IGame, GameModel>("Game", GameSchema);

export default Game;
