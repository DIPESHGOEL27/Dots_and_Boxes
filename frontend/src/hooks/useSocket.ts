// ============================================================
// useSocket — Manages Socket.io connection lifecycle
// Handles connect, disconnect, reconnection, and cleanup.
// ============================================================

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

interface UseSocketReturn {
  socket: Socket | null;
  socketId: string | null;
  isConnected: boolean;
  connectionError: string | null;
}

export function useSocket(enabled: boolean = true): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
      setConnectionError(null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setSocketId(null);
    });

    socket.on("connect_error", (err) => {
      setConnectionError(`Connection failed: ${err.message}`);
      setIsConnected(false);
      setSocketId(null);
    });

    socket.on("serverShutdown", ({ message }: { message: string }) => {
      setConnectionError(message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return {
    socket: socketRef.current,
    socketId,
    isConnected,
    connectionError,
  };
}
