import socketioServer from "../socketio";

export const logSessionInfo = async () => {
  const sessions = await socketioServer.fetchSockets();
  const sessionIds = sessions.map((a) => a.id);

  const sessionInfo = { quantity: sessionIds.length, sessionIds };

  return sessionInfo;
};
