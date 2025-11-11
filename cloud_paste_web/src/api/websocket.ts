import { io, type Socket } from "socket.io-client";

class WebSocketClient {
  private socket: Socket | null = null;

  connect(url: string) {
    this.socket = io(url, {
      auth: {
        token: localStorage.getItem("token"),
      },
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      // console.log("WebSocket 连接成功");
    });

    this.socket.on("disconnect", () => {
      // console.log("WebSocket 断开连接");
    });

    return this.socket;
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const wsClient = new WebSocketClient();
