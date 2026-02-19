import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name  = "global"
        self.room_group  = "chat_global"

        # Rejoindre le groupe
        await self.channel_layer.group_add(
            self.room_group,
            self.channel_name
        )
        await self.accept()

        # Envoyer les 50 derniers messages à la connexion
        messages = await self.get_last_messages()
        for msg in messages:
            await self.send(text_data=json.dumps({
                "type":      "history",
                "message":   msg,
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group,
            self.channel_name
        )

    async def receive(self, text_data):
        data    = json.loads(text_data)
        content = data.get("content", "").strip()

        if not content or not self.scope["user"].is_authenticated:
            return

        # Sauvegarder en DB
        message = await self.save_message(content)

        # Broadcaster à tous les clients connectés
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type":    "chat_message",
                "message": message,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type":    "message",
            "message": event["message"],
        }))

    @database_sync_to_async
    def get_last_messages(self):
        messages = Message.objects.select_related('user__profile').order_by('-timestamp')[:50]
        return [m.to_dict() for m in reversed(list(messages))]

    @database_sync_to_async
    def save_message(self, content):
        msg = Message.objects.create(
            user    = self.scope["user"],
            content = content,
        )
        return msg.to_dict()