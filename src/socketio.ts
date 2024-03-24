import { Server, Socket } from "socket.io";
import { currentUserForSocket } from "./middleware/current-user";
import { requireAuthForSocket } from "./middleware/require-auth";
import { onConnect } from "./events/on-connect";
import { CORS_ORIGINS } from "./constants";

const socketioServer = new Server({
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
});

// socketioServer.use(currentUserForSocket);
// socketioServer.use(requireAuthForSocket);

socketioServer.on("connection", async (socket: Sock) => {
  onConnect(socketioServer, socket);
});

export default socketioServer;
