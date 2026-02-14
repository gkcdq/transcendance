from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_index=True, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', default='default.png')
    is_online = models.BooleanField(default=False)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username}'s Profile"