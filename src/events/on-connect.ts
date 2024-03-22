import { Server } from "socket.io";
import { onDisconnect } from "./on-disconnect";
import {
  onRoomCreate,
  onRoomJoin,
  onRoomLeave,
  onPauseGame,
  onStartGame,
  onGameCheck,
  onPing,
} from "./handlers/game";
import { analyzeCurrentUser, useSocketAuth } from "../middleware/current-user";

const listenToAllOtherEvents = (socket: Sock) => {
  const asyncWrapper =
    (fn: (...args: any) => Promise<void>, authRequired: boolean = true) =>
    async ({ data, accessToken }: any, callback?: (_: any) => void) => {
      // const savedFn = async () => await fn(socket, data);
      try {
        if (authRequired) {
          await analyzeCurrentUser(socket, accessToken);
          await useSocketAuth(socket);
        }
        await fn(socket, data);

        if (callback) callback({ success: true });
      } catch (error: any) {
        console.log("caught error", error.message);
        if (error.message === "token-refresh-required") {
          if (callback)
            callback({ success: false, tokenRefreshRequired: true });
        } else if (error.message === "Not authorized") {
          socket.emit("error", { message: error.message });
          socket.disconnect();
        } else {
          if (callback) callback({ success: false, errorMsg: error.message });
          socket.emit("error", { message: error.message });
        }
      }
    };

  // analyzeCurrentUser(socket);
  // useSocketAuth(socket);
  socket.on("ping", asyncWrapper(onPing));
  socket.on("room-create", asyncWrapper(onRoomCreate));
  socket.on("room-join", asyncWrapper(onRoomJoin));
  socket.on("room-leave", asyncWrapper(onRoomLeave));

  socket.on("game-start", asyncWrapper(onStartGame));
  socket.on("game-pause", asyncWrapper(onPauseGame));
  socket.on("game-check", asyncWrapper(onGameCheck));

  socket.on("disconnect", asyncWrapper(onDisconnect, false));
};

export const onConnect = async (socketioServer: Server, socket: Sock) => {
  console.log("running onConnect....");
  console.log((await socketioServer.fetchSockets()).map((a) => a.id));
  listenToAllOtherEvents(socket);
};
