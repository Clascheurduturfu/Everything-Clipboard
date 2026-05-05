import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clipsync-server")

app = FastAPI()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)
        count = len(self.active_connections[room_id])
        logger.info(f"Client connected to room {room_id[:8]}... Total: {count}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                logger.info(f"Room {room_id[:8]}... is now empty, removed.")
            else:
                count = len(self.active_connections[room_id])
                logger.info(f"Client disconnected from room {room_id[:8]}... Total: {count}")

    async def broadcast(self, message: str, room_id: str, sender: WebSocket):
        if room_id not in self.active_connections:
            return
        dead_connections = []
        for connection in self.active_connections[room_id]:
            if connection is sender:
                continue
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.append(connection)
        # Clean up dead connections
        for dead in dead_connections:
            self.active_connections[room_id].discard(dead)


manager = ConnectionManager()


@app.get("/")
def health_check():
    rooms = len(manager.active_connections)
    clients = sum(len(v) for v in manager.active_connections.values())
    return {"status": "ClipSync Server is running", "rooms": rooms, "clients": clients}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, room_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        manager.disconnect(websocket, room_id)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
