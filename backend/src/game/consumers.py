import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

# Stockage en mémoire des rooms actives
# { room_id: { players: [...], state: {...}, task: asyncio.Task } }
GAME_ROOMS = {}

CANVAS_W  = 800
CANVAS_H  = 400
PADDLE_W  = 10
PADDLE_H  = 80
BALL_SIZE = 8
WIN_SCORE = 5
TICK_RATE = 1 / 60  # 60 fps


def initial_state():
    return {
        "ball":    {"x": CANVAS_W / 2, "y": CANVAS_H / 2, "vx": 6, "vy": 6},
        "left":    {"y": (CANVAS_H - PADDLE_H) / 2, "score": 0, "name": ""},
        "right":   {"y": (CANVAS_H - PADDLE_H) / 2, "score": 0, "name": ""},
        "status":  "waiting",  # waiting | playing | finished
        "winner":  None,
    }


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id    = self.scope['url_route']['kwargs']['room_id']
        self.room_group = f"game_{self.room_id}"
        self.side       = None  # 'left' ou 'right'
        self.username   = self.scope["user"].username if self.scope["user"].is_authenticated else f"Guest_{self.channel_name[-4:]}"

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        # Initialiser la room si elle n'existe pas
        if self.room_id not in GAME_ROOMS:
            GAME_ROOMS[self.room_id] = {
                "players": [],
                "state":   initial_state(),
                "task":    None,
            }

        room = GAME_ROOMS[self.room_id]

        if len(room["players"]) == 0:
            self.side = "left"
            room["state"]["left"]["name"] = self.username
        elif len(room["players"]) == 1:
            self.side = "right"
            room["state"]["right"]["name"] = self.username
        else:
            # Room pleine
            await self.send(json.dumps({"type": "error", "message": "Room pleine"}))
            await self.close()
            return

        room["players"].append(self.channel_name)

        await self.send(json.dumps({
            "type": "joined",
            "side": self.side,
            "room": self.room_id,
        }))

        # Si 2 joueurs → démarrer la partie
        if len(room["players"]) == 2:
            room["state"]["status"] = "playing"
            await self.channel_layer.group_send(self.room_group, {
                "type":  "game_start",
                "state": room["state"],
            })
            # Lancer la boucle de jeu
            room["task"] = asyncio.ensure_future(self.game_loop(self.room_id))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

        if self.room_id in GAME_ROOMS:
            room = GAME_ROOMS[self.room_id]
            if self.channel_name in room["players"]:
                room["players"].remove(self.channel_name)

            if room["task"] and not room["task"].done():
                room["task"].cancel()

            # ← N'envoie player_left que si la partie n'est pas finie
            if room["state"]["status"] != "finished":
                await self.channel_layer.group_send(self.room_group, {
                    "type":    "player_left",
                    "message": f"{self.username} a quitté la partie.",
                })

            if len(room["players"]) == 0:
                del GAME_ROOMS[self.room_id]

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("type") == "input" and self.room_id in GAME_ROOMS:
            room  = GAME_ROOMS[self.room_id]
            state = room["state"]
            key   = data.get("key")  # 'up' ou 'down'
            speed = 7

            if self.side == "left":
                if key == "up"   and state["left"]["y"] > 0:
                    state["left"]["y"] -= speed
                if key == "down" and state["left"]["y"] < CANVAS_H - PADDLE_H:
                    state["left"]["y"] += speed
            elif self.side == "right":
                if key == "up"   and state["right"]["y"] > 0:
                    state["right"]["y"] -= speed
                if key == "down" and state["right"]["y"] < CANVAS_H - PADDLE_H:
                    state["right"]["y"] += speed

    # ─── Boucle de jeu côté serveur ───────────────────────────────────────────
    async def game_loop(self, room_id):
        start_time = asyncio.get_event_loop().time()   # ← AJOUTE cette ligne
        try:
            while room_id in GAME_ROOMS:
                room  = GAME_ROOMS[room_id]
                state = room["state"]

                if state["status"] != "playing":
                    break

                self.update_physics(state)

                await self.channel_layer.group_send(f"game_{room_id}", {
                    "type":  "game_tick",
                    "state": state,
                })

                # Vérifier victoire
                if state["left"]["score"] >= WIN_SCORE or state["right"]["score"] >= WIN_SCORE:
                    winner = state["left"]["name"] if state["left"]["score"] >= WIN_SCORE else state["right"]["name"]
                    state["status"] = "finished"
                    state["winner"] = winner
                    state["duration"] = int(asyncio.get_event_loop().time() - start_time)  # ← AJOUTE cette ligne
                    await self.channel_layer.group_send(f"game_{room_id}", {
                        "type":   "game_over",
                        "winner": winner,
                        "state":  state,
                    })
                    await self.save_match_results(room_id, state)
                    break

                await asyncio.sleep(TICK_RATE)
        except asyncio.CancelledError:
            pass
    def update_physics(self, state):
        ball = state["ball"]
        ball["x"] += ball["vx"]
        ball["y"] += ball["vy"]

        # Rebond haut/bas
        if ball["y"] <= 0 or ball["y"] >= CANVAS_H:
            ball["vy"] = -ball["vy"]
            ball["y"]  = max(0, min(CANVAS_H, ball["y"]))

        max_speed = 15

        # Raquette gauche
        if ball["vx"] < 0 and ball["x"] <= PADDLE_W + BALL_SIZE:
            ly = state["left"]["y"]
            if ly <= ball["y"] <= ly + PADDLE_H:
                ball["x"]  = PADDLE_W + BALL_SIZE
                ball["vx"] = min(abs(ball["vx"]) * 1.05, max_speed)
            elif ball["x"] < 0:
                state["right"]["score"] += 1
                self.reset_ball(state)

        # Raquette droite
        if ball["vx"] > 0 and ball["x"] >= CANVAS_W - PADDLE_W - BALL_SIZE:
            ry = state["right"]["y"]
            if ry <= ball["y"] <= ry + PADDLE_H:
                ball["x"]  = CANVAS_W - PADDLE_W - BALL_SIZE
                ball["vx"] = -min(abs(ball["vx"]) * 1.05, max_speed)
            elif ball["x"] > CANVAS_W:
                state["left"]["score"] += 1
                self.reset_ball(state)

    def reset_ball(self, state):
        import random
        state["ball"] = {
            "x":  CANVAS_W / 2,
            "y":  CANVAS_H / 2,
            "vx": 6 * (1 if random.random() > 0.5 else -1),
            "vy": 6 * (1 if random.random() > 0.5 else -1),
        }

    @database_sync_to_async
    def save_match_results(self, room_id, state):
        from django.contrib.auth.models import User
        try:
            left_name  = state["left"]["name"]
            right_name = state["right"]["name"]
            winner     = state["winner"]

            for name in [left_name, right_name]:
                try:
                    user    = User.objects.get(username=name)
                    profile = user.profile
                    if name == winner:
                        profile.wins += 1
                        profile.xp   += 100
                    else:
                        profile.losses += 1
                        profile.xp     += 20
                    profile.total_seconds += state.get("duration", 0)  # ← ajoute cette ligne
                    profile.save()
                except User.DoesNotExist:
                    pass
        except Exception as e:
            print(f"[GameConsumer] Erreur save_match_results: {e}")

    # ─── Handlers group_send ──────────────────────────────────────────────────
    async def game_start(self, event):
        await self.send(json.dumps({"type": "game_start", "state": event["state"]}))

    async def game_tick(self, event):
        await self.send(json.dumps({"type": "game_tick", "state": event["state"]}))

    async def game_over(self, event):
        await self.send(json.dumps({"type": "game_over", "winner": event["winner"], "state": event["state"]}))

    async def player_left(self, event):
        await self.send(json.dumps({"type": "player_left", "message": event["message"]}))