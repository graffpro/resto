from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        if role not in self.active_connections:
            self.active_connections[role] = []
        self.active_connections[role].append(websocket)

    def disconnect(self, websocket: WebSocket, role: str):
        if role in self.active_connections:
            self.active_connections[role] = [
                ws for ws in self.active_connections[role] if ws != websocket
            ]

    async def broadcast_to_role(self, message: dict, role: str):
        if role in self.active_connections:
            for connection in self.active_connections[role][:]:
                try:
                    await connection.send_json(message)
                except:
                    self.active_connections[role].remove(connection)


class VoiceCallManager:
    def __init__(self):
        self.voice_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        self.voice_connections[role] = websocket

    def disconnect(self, role: str):
        self.voice_connections.pop(role, None)

    async def send_to_role(self, role: str, message: dict):
        ws = self.voice_connections.get(role)
        if ws:
            try:
                await ws.send_json(message)
            except:
                self.voice_connections.pop(role, None)

    def is_online(self, role: str) -> bool:
        return role in self.voice_connections


# Singleton instances
manager = ConnectionManager()
voice_manager = VoiceCallManager()
