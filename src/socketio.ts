import { Server } from "socket.io";
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
