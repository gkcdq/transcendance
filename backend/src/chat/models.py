from django.db import models
from django.contrib.auth.models import User


class Message(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"

    def to_dict(self):
        profile = self.user.profile
        if profile.avatar:
            avatar = profile.avatar.url
        elif profile.avatar_url:
            avatar = profile.avatar_url
        else:
            avatar = '/Mokoko.webp'

        return {
            "id": self.id,
            "sender": self.user.username,
            "avatar": avatar,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
        }