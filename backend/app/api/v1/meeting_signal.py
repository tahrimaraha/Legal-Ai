"""WebRTC signalling for video meetings.

Media flows peer-to-peer between the two browsers; this module only relays the small messages they
need to find each other (SDP offer/answer, ICE candidates, mic/camera state). A meeting room holds at
most its two participants: the host lawyer and the meeting's citizen.

Protocol (JSON over `/api/v1/meetings/{code}/ws`):
  client → {"type": "auth", "token": "<JWT>"}            first message, within 10 s
  server → {"type": "joined", "role", "peer": {...}|null} you are in; `peer` is who is already here
  server → {"type": "peer-joined", "peer": {...}}         the other side arrived (you send the offer)
  both   → {"type": "offer"|"answer"|"ice"|"state", ...}  relayed verbatim to the other side
  server → {"type": "peer-left"} / {"type": "ended"} / {"type": "error", "message"}

Rooms live in this process's memory, so run the API as a single worker (or move the hub to Redis
pub/sub before scaling out).
"""
from __future__ import annotations

import asyncio
import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.config import settings
from app.core.security import decode_access_token, get_current_user, is_suspended
from app.database import AsyncSessionLocal
from app.models.app_record import AppRecord
from app.models.user import User

router = APIRouter()

RELAYED = {"offer", "answer", "ice", "state"}
MAX_MESSAGE_BYTES = 64 * 1024


class _Peer:
    def __init__(self, ws: WebSocket, user: User, role: str):
        self.ws = ws
        self.user_id = user.id
        self.name = user.full_name
        self.role = role

    def info(self) -> dict:
        return {"name": self.name, "role": self.role}

    async def send(self, msg: dict) -> None:
        try:
            await self.ws.send_text(json.dumps(msg))
        except Exception:  # noqa: BLE001 - peer already gone
            pass


# meeting code -> {user_id: peer}
_rooms: dict[str, dict[uuid.UUID, _Peer]] = {}
_lock = asyncio.Lock()


async def broadcast_ended(code: str) -> None:
    """Called when the host ends the meeting: tell everyone in the room and close their sockets."""
    async with _lock:
        peers = list(_rooms.pop(code, {}).values())
    for p in peers:
        await p.send({"type": "ended"})
        try:
            await p.ws.close(code=4000)
        except Exception:  # noqa: BLE001
            pass


def _ice_servers() -> list[dict]:
    servers: list[dict] = []
    stun = [u.strip() for u in settings.meeting_stun_urls.split(",") if u.strip()]
    if stun:
        servers.append({"urls": stun})
    turn = [u.strip() for u in settings.meeting_turn_urls.split(",") if u.strip()]
    if turn:
        servers.append({"urls": turn, "username": settings.meeting_turn_username,
                        "credential": settings.meeting_turn_credential})
    return servers


@router.get("/meetings/ice-servers")
async def ice_servers(_: User = Depends(get_current_user)) -> dict:
    return {"iceServers": _ice_servers()}


async def _authorise(token: str, code: str) -> tuple[Optional[User], Optional[str], str]:
    """Returns (user, role, error)."""
    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload["sub"])
    except Exception:  # noqa: BLE001
        return None, None, "Your session has expired. Please sign in again."
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
        if user is None or is_suspended(user):
            return None, None, "This account cannot join meetings."
        rec = await db.scalar(
            select(AppRecord).where(AppRecord.kind == "meeting", AppRecord.data["code"].astext == code.strip().lower())
        )
    if rec is None:
        return None, None, "No meeting exists with this code."
    if rec.data.get("status") == "ended":
        return None, None, "This meeting has already ended."
    if user.id == rec.lawyer_id:
        return user, "host", ""
    if user.id == rec.owner_id:
        return user, "participant", ""
    return None, None, "You are not a participant of this meeting."


@router.websocket("/meetings/{code}/ws")
async def meeting_socket(ws: WebSocket, code: str) -> None:
    await ws.accept()
    code = code.strip().lower()
    try:
        first = json.loads(await asyncio.wait_for(ws.receive_text(), timeout=10))
    except Exception:  # noqa: BLE001 - timeout, bad JSON or disconnect
        await ws.close(code=4401)
        return
    user, role, error = await _authorise(str(first.get("token", "")) if first.get("type") == "auth" else "", code)
    if user is None:
        await ws.send_text(json.dumps({"type": "error", "message": error}))
        await ws.close(code=4403)
        return

    me = _Peer(ws, user, role)
    async with _lock:
        room = _rooms.setdefault(code, {})
        replaced = room.get(user.id)  # same account re-joining (new tab / reconnect) replaces the old socket
        room[user.id] = me
        other = next((p for uid, p in room.items() if uid != user.id), None)
    if replaced is not None:
        await replaced.send({"type": "error", "message": "You joined this meeting from another window."})
        try:
            await replaced.ws.close(code=4409)
        except Exception:  # noqa: BLE001
            pass

    await me.send({"type": "joined", "role": role, "peer": other.info() if other else None,
                   "iceServers": _ice_servers()})
    if other is not None:
        await other.send({"type": "peer-joined", "peer": me.info()})

    try:
        while True:
            raw = await ws.receive_text()
            if len(raw) > MAX_MESSAGE_BYTES:
                continue
            try:
                msg = json.loads(raw)
            except ValueError:
                continue
            if not isinstance(msg, dict) or msg.get("type") not in RELAYED:
                continue
            async with _lock:
                target = next((p for uid, p in _rooms.get(code, {}).items() if uid != user.id), None)
            if target is not None:
                await target.send(msg)
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        pass
    finally:
        async with _lock:
            room = _rooms.get(code)
            still_me = room is not None and room.get(user.id) is me
            if still_me:
                del room[user.id]
                if not room:
                    _rooms.pop(code, None)
            remaining = list(room.values()) if (room and still_me) else []
        for p in remaining:
            await p.send({"type": "peer-left"})
