import { Server } from "socket.io";
import {
  onDisconnect,
  onEndGame,
  onGameCreate,
  onGameJoin,
  onGameLeave,
  onGameStop,
  onGameStart,
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
        if (authRequired) {
          await analyzeCurrentUser(socket, accessToken);
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
  socket.on("disconnect", asyncWrapper(onDisconnect, false));
  socket.on("ping", asyncWrapper(onPing));
  socket.on("game-create", asyncWrapper(onGameCreate));
  socket.on("game-join", asyncWrapper(onGameJoin));
  socket.on("game-leave", asyncWrapper(onGameLeave));
  socket.on("game-start", asyncWrapper(onGameStart));
  socket.on("game-stop", asyncWrapper(onGameStop));
  socket.on("game-end", asyncWrapper(onEndGame));
};

export const onConnect = async (socketioServer: Server, socket: Sock) => {
  console.log("running onConnect....");
  console.log((await socketioServer.fetchSockets()).map((a) => a.id));
  listenToAllOtherEvents(socket);
};
