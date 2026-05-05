import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import threading
import logging

logger = logging.getLogger("clipsync-host")

_server_app = FastAPI()
_manager_connections: Dict[str, Set[WebSocket]] = {}


@_server_app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in _manager_connections:
        _manager_connections[room_id] = set()
    _manager_connections[room_id].add(websocket)
    logger.info(f"[Host] Client joined room. Total: {len(_manager_connections[room_id])}")

    try:
        while True:
            data = await websocket.receive_text()
            dead = []
            for conn in _manager_connections.get(room_id, set()):
                if conn is not websocket:
                    try:
                        await conn.send_text(data)
                    except Exception:
                        dead.append(conn)
            for d in dead:
                _manager_connections[room_id].discard(d)
    except WebSocketDisconnect:
        if room_id in _manager_connections:
            _manager_connections[room_id].discard(websocket)
            if not _manager_connections[room_id]:
                del _manager_connections[room_id]


@_server_app.get("/")
def health():
    return {"status": "ClipSync Host Mode is running"}


def start_host_server(port: int = 8000):
    """Start the built-in relay server in a background daemon thread."""
    def _run():
        uvicorn.run(_server_app, host="0.0.0.0", port=port, log_level="warning")

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    logger.info(f"[Host] Server started on port {port}")
    return t
