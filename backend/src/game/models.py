from django.db import models

class MatchmakingQueue(models.Model):
    username = models.CharField(max_length=150, unique=True)
    room_id = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']