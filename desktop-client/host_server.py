import logging
import threading
from typing import Dict, Set

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

logger = logging.getLogger("clipsync-host")

_server_app = FastAPI()
_manager_connections: Dict[str, Set[WebSocket]] = {}


@_server_app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in _manager_connections:
        _manager_connections[room_id] = set()
    _manager_connections[room_id].add(websocket)
    logger.info("[Host] Client joined room. Total: %s", len(_manager_connections[room_id]))

    try:
        while True:
            data = await websocket.receive_text()
            dead = []
            for conn in _manager_connections.get(room_id, set()):
                if conn is websocket:
                    continue
                try:
                    await conn.send_text(data)
                except Exception:
                    dead.append(conn)
            for conn in dead:
                _manager_connections[room_id].discard(conn)
    except WebSocketDisconnect:
        if room_id in _manager_connections:
            _manager_connections[room_id].discard(websocket)
            if not _manager_connections[room_id]:
                del _manager_connections[room_id]


@_server_app.get("/")
def health():
    return {"status": "ClipSync Host Mode is running"}


class HostServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8000):
        self.host = host
        self.port = port
        self.config = uvicorn.Config(
            _server_app,
            host=host,
            port=port,
            log_level="warning",
            access_log=False,
            log_config=None,
            loop="asyncio",
        )
        self.server = uvicorn.Server(self.config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)

    def start(self):
        if not self.thread.is_alive():
            self.thread.start()
            logger.info("[Host] Server started on %s:%s", self.host, self.port)

    def stop(self):
        self.server.should_exit = True
        if self.thread.is_alive():
            self.thread.join(timeout=3)
        logger.info("[Host] Server stopped")

    @property
    def is_alive(self) -> bool:
        return self.thread.is_alive()


def start_host_server(host: str = "127.0.0.1", port: int = 8000) -> HostServer:
    server = HostServer(host=host, port=port)
    server.start()
    return server
