import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message
from django.contrib.auth.models import User


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.username = self.scope["user"].username if self.scope["user"].is_authenticated else None
        if not self.username:
            await self.close()
            return

        self.room_group = "chat_global"

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.channel_layer.group_add(f"chat_{self.username}", self.channel_name)
        await self.accept()
        await self.set_online(True)

        # evoi les 50 derniers messages a la connexion
        messages = await self.get_last_messages()
        for msg in messages:
            await self.send(text_data=json.dumps({
                "type": "history",
                "message": msg,
            }))

    async def disconnect(self, close_code):
        if not self.username:
            return
        await self.set_online(False)
        await self.channel_layer.group_discard(self.room_group, self.channel_name)
        await self.channel_layer.group_discard(f"chat_{self.username}", self.channel_name)

    @database_sync_to_async
    def set_online(self, status):
        try:
            profile = User.objects.get(username=self.username).profile
            profile.is_online = status
            profile.save(update_fields=['is_online'])
        except Exception:
            pass

    async def receive(self, text_data):
        data = json.loads(text_data)

        # Invit pour jouer
        if data.get('type') == 'game_invite':
            to      = data.get('to')
            room_id = data.get('room_id')
            await self.channel_layer.group_send(
                f"chat_{to}",
                {
                    'type': 'game_invite',
                    'from': self.username,
                    'room_id': room_id,
                }
            )
            return

        content = data.get("content", "").strip()
        if not content or not self.scope["user"].is_authenticated:
            return

        # Sauvegarder en DB
        message = await self.save_message(content)

        # enovoyer les messages a tous
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "chat_message",
                "message": message,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "message": event["message"],
        }))

    async def game_invite(self, event):
        try:
            await self.send(text_data=json.dumps({
                "type": "game_invite",
                "from": event["from"],
                "room_id": event["room_id"],
            }))
        except Exception:
            pass

    @database_sync_to_async
    def get_last_messages(self):
        messages = Message.objects.select_related('user__profile').order_by('-timestamp')[:50]
        return [m.to_dict() for m in reversed(list(messages))]

    @database_sync_to_async
    def save_message(self, content):
        msg = Message.objects.create(
            user = self.scope["user"],
            content = content,
        )
        return msg.to_dict()