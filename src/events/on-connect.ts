import { Server } from "socket.io";
import {
  onAskGameInfo,
  onDisconnect,
  onEndGame,
  onGameCreate,
  onGameJoin,
  onGameLeave,
  onGameStart,
  // onRoomCreate,
  // onRoomJoin,
  // onRoomLeave,
  // onPauseGame,
  // onStartGame,
  // onGameCheck,
  onPing,
} from "./handlers/game";
import { analyzeCurrentUser, useSocketAuth } from "../middleware/current-user";
import { NotAuthorizedError } from "../errors/not-authorized-error";

const listenToAllOtherEvents = (socket: Sock) => {
  const asyncWrapper =
    (fn: (...args: any) => Promise<void>, authRequired: boolean = true) =>
    async (params: any, callback?: (_: any) => void) => {
      // const savedFn = async () => await fn(socket, data);
      let parameters: any = null;
      if (typeof params === "string") {
        try {
          parameters = JSON.parse(params);
        } catch (error: any) {
          parameters = { data: null, accessToken: null };
        }
      } else {
        parameters = params;
      }
      const { data, accessToken } = parameters;
      try {
        await analyzeCurrentUser(socket, accessToken);
        if (authRequired) {
          if (!socket.currentUser) {
            throw new NotAuthorizedError("Not authorized");
          } else {
            await useSocketAuth(socket);
          }
        }
        await fn(socket, data);

        if (callback) callback({ success: true });
      } catch (error: any) {
        console.log("caught error", error.message);
        let response: any = { success: false };
        if (error.message === "token-refresh-required") {
          response.tokenRefreshRequired = true;
        } else {
          response.message = error.message;
        }
        if (callback) {
          callback(response);
        } else {
          socket.emit("error", response);
        }
      }
    };

  // analyzeCurrentUser(socket);
  // useSocketAuth(socket);
  socket.on("ping", asyncWrapper(onPing));
  socket.on("game-create", asyncWrapper(onGameCreate));
  socket.on("game-join", asyncWrapper(onGameJoin));
  socket.on("game-leave", asyncWrapper(onGameLeave));
  socket.on("game-start", asyncWrapper(onGameStart));
  // socket.on("game-ask-info", asyncWrapper(onAskGameInfo));
  socket.on("game-end", asyncWrapper(onEndGame));

  socket.on("disconnect", asyncWrapper(onDisconnect));
  // socket.on("game-pause", asyncWrapper(onPauseGame));
  // socket.on("game-check", asyncWrapper(onGameCheck));
};

export const onConnect = async (socketioServer: Server, socket: Sock) => {
  console.log("running onConnect....");
  console.log((await socketioServer.fetchSockets()).map((a) => a.id));
  listenToAllOtherEvents(socket);
};
