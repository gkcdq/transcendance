import json
import asyncio
import random
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

GAME_ROOMS = {}
MATCHMAKING_QUEUE = []

CANVAS_W = 1200
CANVAS_H = 650
PADDLE_W = 10
PADDLE_H = 80
BALL_R = 8
WIN_SCORE = 5
TICK_RATE = 1 / 60


def initial_state():
    return {
        "ball": {"x": CANVAS_W / 2, "y": CANVAS_H / 2, "vx": 6, "vy": 6},
        "left": {"x": 0, "y": (CANVAS_H - PADDLE_H) / 2, "score": 0, "name": ""},
        "right": {"x": CANVAS_W - PADDLE_W, "y": (CANVAS_H - PADDLE_H) / 2, "score": 0, "name": ""},
        "status": "waiting",
        "winner": None,
    }


class GameConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group = f"game_{self.room_id}"
        self.side = None
        self.username = (
            self.scope["user"].username
            if self.scope["user"].is_authenticated
            else f"Guest_{self.channel_name[-4:]}"
        )

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        if self.room_id not in GAME_ROOMS:
            GAME_ROOMS[self.room_id] = {
                "players": [],
                "spectators": [],
                "usernames": {},
                "state": initial_state(),
                "task": None,
            }

        room = GAME_ROOMS[self.room_id]

        # Reconnexion joueur existant
        # if self.username in room["usernames"].values():
        #     self.side = [s for s, u in room["usernames"].items() if u == self.username][0]
        #     room["players"].append(self.channel_name)
        #     await self.send(json.dumps({"type": "joined", "side": self.side, "room": self.room_id}))
        #     if room["state"]["status"] == "playing":
        #         await self.send(json.dumps({"type": "game_start", "state": room["state"]}))
        #     return

        #sSpectateur - room pleine
        if len(room["players"]) >= 2:
            self.side = "spectator"
            room["spectators"].append(self.channel_name)
            await self.send(json.dumps({"type": "spectator_joined"}))
            if room["state"]["status"] == "playing":
                await self.send(json.dumps({"type": "game_start", "state": room["state"]}))
            return

        # premiere connexion joueur
        if len(room["players"]) == 0:
            self.side = "left"
            room["state"]["left"]["name"] = self.username
            room["usernames"]["left"] = self.username
        elif len(room["players"]) == 1:
            self.side = "right"
            room["state"]["right"]["name"] = self.username
            room["usernames"]["right"] = self.username

        room["players"].append(self.channel_name)
        await self.send(json.dumps({"type": "joined", "side": self.side, "room": self.room_id}))

        if len(room["players"]) == 2:
            room["state"]["status"] = "playing"
            await self.channel_layer.group_send(self.room_group, {
                "type": "game_start",
                "state": room["state"],
            })
            room["task"] = asyncio.ensure_future(self.game_loop(self.room_id))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

        if self.room_id not in GAME_ROOMS:
            return

        room = GAME_ROOMS[self.room_id]

        # Spectateur
        if self.side == "spectator":
            if self.channel_name in room["spectators"]:
                room["spectators"].remove(self.channel_name)
            return

        # Joueur
        if self.channel_name in room["players"]:
            room["players"].remove(self.channel_name)

        if len(room["players"]) == 0:
            if room["task"] and not room["task"].done():
                room["task"].cancel()
            del GAME_ROOMS[self.room_id]

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("type") == "input" and self.room_id in GAME_ROOMS:
            if self.side == "spectator":
                return
            room  = GAME_ROOMS[self.room_id]
            state = room["state"]
            key   = data.get("key")
            speed_v = 7
            speed_h = 4

            if self.side == "left":
                if key == "up" and state["left"]["y"] > 0: state["left"]["y"]  -= speed_v
                if key == "down" and state["left"]["y"] < CANVAS_H - PADDLE_H: state["left"]["y"]  += speed_v
                if key == "left" and state["left"]["x"] > 0: state["left"]["x"]  -= speed_h
                if key == "right" and state["left"]["x"] < CANVAS_W / 2 - PADDLE_W: state["left"]["x"]  += speed_h
            elif self.side == "right":
                if key == "up" and state["right"]["y"] > 0: state["right"]["y"] -= speed_v
                if key == "down" and state["right"]["y"] < CANVAS_H - PADDLE_H: state["right"]["y"] += speed_v
                if key == "left" and state["right"]["x"] > CANVAS_W / 2: state["right"]["x"] -= speed_h
                if key == "right" and state["right"]["x"] < CANVAS_W - PADDLE_W: state["right"]["x"] += speed_h

    async def game_loop(self, room_id):
        start_time = asyncio.get_event_loop().time()
        try:
            while room_id in GAME_ROOMS:
                room = GAME_ROOMS[room_id]
                state = room["state"]

                if state["status"] != "playing":
                    break

                self.update_physics(state)

                # envoie aux joueurs
                try:
                    await self.channel_layer.group_send(f"game_{room_id}", {
                        "type": "game_tick",
                        "state": state,
                    })
                except Exception:
                    pass

                # Envoie aux specta
                for spec_channel in list(room.get("spectators", [])):
                    try:
                        await self.channel_layer.send(spec_channel, {
                            "type": "game_tick",
                            "state": state,
                        })
                    except Exception:
                        pass

                if state["left"]["score"] >= WIN_SCORE or state["right"]["score"] >= WIN_SCORE:
                    winner = state["left"]["name"] if state["left"]["score"] >= WIN_SCORE else state["right"]["name"]
                    state["status"] = "finished"
                    state["winner"] = winner
                    state["duration"] = int(asyncio.get_event_loop().time() - start_time)
                    try:
                        await self.channel_layer.group_send(f"game_{room_id}", {
                            "type": "game_over",
                            "winner": winner,
                            "state": state,
                        })
                    except Exception:
                        pass
                    # Notifie les spectateurs
                    for spec_channel in list(room.get("spectators", [])):
                        try:
                            await self.channel_layer.send(spec_channel, {
                                "type": "game_over",
                                "winner": winner,
                                "state": state,
                            })
                        except Exception:
                            pass
                    await self.save_match_results(room_id, state)
                    break

                await asyncio.sleep(TICK_RATE)
        except asyncio.CancelledError:
            pass

    def update_physics(self, state):
        ball = state["ball"]
        ball["x"] += ball["vx"]
        ball["y"] += ball["vy"]
        max_speed = 15

        if ball["y"] - BALL_R <= 0:
            ball["vy"] = abs(ball["vy"])
            ball["y"]  = BALL_R
        elif ball["y"] + BALL_R >= CANVAS_H:
            ball["vy"] = -abs(ball["vy"])
            ball["y"]  = CANVAS_H - BALL_R

        lx = state["left"]["x"]
        ly = state["left"]["y"]
        rx = state["right"]["x"]
        ry = state["right"]["y"]

        if ball["vx"] < 0:
            if (ball["x"] - BALL_R <= lx + PADDLE_W and
                ball["x"] + BALL_R >= lx and
                ball["y"] + BALL_R >= ly and
                ball["y"] - BALL_R <= ly + PADDLE_H):
                ball["x"]  = lx + PADDLE_W + BALL_R
                ball["vx"] = min(abs(ball["vx"]) * 1.05, max_speed)
            elif ball["x"] + BALL_R < 0:
                state["right"]["score"] += 1
                self.reset_ball(state)
                return
        elif ball["vx"] > 0:
            if (ball["x"] + BALL_R >= rx and
                ball["x"] - BALL_R <= rx + PADDLE_W and
                ball["y"] + BALL_R >= ry and
                ball["y"] - BALL_R <= ry + PADDLE_H):
                ball["x"]  = rx - BALL_R
                ball["vx"] = -min(abs(ball["vx"]) * 1.05, max_speed)
            elif ball["x"] - BALL_R > CANVAS_W:
                state["left"]["score"] += 1
                self.reset_ball(state)
                return

    def reset_ball(self, state):
        state["ball"] = {
            "x": CANVAS_W / 2,
            "y": CANVAS_H / 2,
            "vx": 6 * (1 if random.random() > 0.5 else -1),
            "vy": 6 * (1 if random.random() > 0.5 else -1),
        }
        state["left"]["x"] = 0
        state["left"]["y"] = (CANVAS_H - PADDLE_H) / 2
        state["right"]["x"] = CANVAS_W - PADDLE_W
        state["right"]["y"] = (CANVAS_H - PADDLE_H) / 2

    @database_sync_to_async
    def save_match_results(self, room_id, state):
        from django.contrib.auth.models import User
        try:
            winner = state["winner"]
            for side in ["left", "right"]:
                name = state[side]["name"]
                try:
                    user = User.objects.get(username=name)
                    profile = user.profile
                    if name == winner:
                        profile.wins += 1
                        profile.xp   += 100
                    else:
                        profile.losses += 1
                        profile.xp += 20
                    profile.total_seconds += state.get("duration", 0)
                    profile.save()
                except User.DoesNotExist:
                    pass
        except Exception as e:
            print(f"[GameConsumer] Erreur save_match_results: {e}")

    async def game_start(self, event):
        try:
            await self.send(json.dumps({"type": "game_start", "state": event["state"]}))
        except Exception:
            pass

    async def game_tick(self, event):
        try:
            await self.send(json.dumps({"type": "game_tick", "state": event["state"]}))
        except Exception:
            pass

    async def game_over(self, event):
        try:
            await self.send(json.dumps({"type": "game_over", "winner": event["winner"], "state": event["state"]}))
        except Exception:
            pass

    async def player_left(self, event):
        try:
            await self.send(json.dumps({"type": "player_left", "message": event["message"]}))
        except Exception:
            pass