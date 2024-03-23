import { Schema, model } from "mongoose";
import { GameModel, IGame, GameState, MoveType } from "./types.dto";
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
        GameState.PAUSED,
      ],
      default: GameState.LOBBY,
    },
    players: [
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
    ],
    currentRound: [
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
    ],
    history_rounds: [
      {
        winners: [
          {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        player_moves: [
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
        ],
      },
    ],
    revealed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        if (!doc.revealed) {
          ret.currentRound = doc.currentRound.map((player: any) => {
            player.move = "hidden";
            return player;
          });
        }
      },
    },
  }
);

GameSchema.virtual("id").get(function () {
  return this._id.toString();
});

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
GameSchema.pre("updateOne", { document: true, query: false }, function (done) {
  if (this.isModified("currentRound")) {
    // check if all players have made a move
    let allPlayersMadeMove = true;
    const players = this.get("currentRound");
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
  this.populate("history_rounds.winners", "id username");
  this.populate("history_rounds.player_moves.player", "id username");
  done();
});

// GameSchema.post("findOne", { document: true, query: true }, function (done) {
//   if (!this.get("revealed")) {
//     this.transform((ret) => {
//       ret.currentRound = ret.currentRound.map((player: any) => {
//         player.move = "none";
//         return player;
//       });
//     });
//   }
//   done();
// });

const Game = model<IGame, GameModel>("Game", GameSchema);

export default Game;
