import { RoomManager, roomManager } from "./roomManager";
import { PlayerInfo } from "dots-and-boxes-shared";

function createPlayer(id: string, name: string): PlayerInfo {
  return {
    id,
    name,
    color: "#00bcd4",
    avatar: "🎯",
  };
}

describe("RoomManager", () => {
  let manager: RoomManager;

  afterAll(() => {
    roomManager.shutdown();
  });

  beforeEach(() => {
    manager = new RoomManager();
  });

  afterEach(() => {
    manager.shutdown();
  });

  it("allows joining with short room id prefix", () => {
    const creator = createPlayer("player-1", "Host");
    const { roomId } = manager.createRoom(4, 2, creator);

    const joinResult = manager.joinRoom(roomId.slice(0, 8), createPlayer("player-2", "Guest"));

    expect(joinResult.success).toBe(true);
    expect(joinResult.roomId).toBe(roomId);
    expect(joinResult.room?.players).toHaveLength(2);
  });

  it("tracks disconnect and supports reconnect during started game", () => {
    const p1 = createPlayer("player-1", "Host");
    const p2 = createPlayer("player-2", "Guest");

    const { roomId, room } = manager.createRoom(4, 2, p1);
    manager.bindSocket(roomId, p1.id, "socket-1");

    const joined = manager.joinRoom(roomId, p2);
    expect(joined.success).toBe(true);
    manager.bindSocket(roomId, p2.id, "socket-2");

    room.state.started = true;

    const disconnected = manager.handleDisconnect("socket-2");
    expect(disconnected).not.toBeNull();
    expect(disconnected?.removed).toBe(false);
    expect(room.disconnectedPlayers.has(p2.id)).toBe(true);

    const rejoin = manager.rejoinRoom(roomId, p2.id, "socket-2-new");
    expect(rejoin.success).toBe(true);
    expect(rejoin.reconnected).toBe(true);
    expect(room.disconnectedPlayers.has(p2.id)).toBe(false);
    expect(manager.getBindingBySocket("socket-2-new")?.playerId).toBe(p2.id);
  });

  it("removes player before game start and reassigns creator", () => {
    const p1 = createPlayer("player-1", "Host");
    const p2 = createPlayer("player-2", "Guest");

    const { roomId } = manager.createRoom(4, 2, p1);
    manager.bindSocket(roomId, p1.id, "socket-1");

    const joined = manager.joinRoom(roomId, p2);
    expect(joined.success).toBe(true);
    manager.bindSocket(roomId, p2.id, "socket-2");

    const disconnected = manager.handleDisconnect("socket-1");

    expect(disconnected).not.toBeNull();
    expect(disconnected?.removed).toBe(true);

    const room = manager.getRoom(roomId);
    expect(room).toBeDefined();
    expect(room?.players).toHaveLength(1);
    expect(room?.creator).toBe(p2.id);
  });
});
