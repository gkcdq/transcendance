# from django.db import models
# from django.contrib.auth.models import User

# class Profile(models.Model):
#     user = models.OneToOneField(User, on_delete=models.CASCADE)
    
#     # Pour le module "Gestion Utilisateur"
#     avatar = models.ImageField(upload_to='avatars/', default='default.png')
#     is_online = models.BooleanField(default=False)
    
#     # Pour le module "Jeu / Statistiques"
#     wins = models.IntegerField(default=0)
#     losses = models.IntegerField(default=0)
    
#     # Pour le module "Authentification 42"
#     intra_id = models.CharField(max_length=100, blank=True, null=True)

#     def __str__(self):
#         return f"Profil de {self.user.username}"


from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user           = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar         = models.URLField(blank=True, null=True)
    wins           = models.IntegerField(default=0)
    losses         = models.IntegerField(default=0)
    xp             = models.IntegerField(default=0)
    total_seconds  = models.IntegerField(default=0)
    paddle_color   = models.CharField(max_length=20, default='#00babc')
    ai_difficulty  = models.CharField(max_length=5, default='5')
    is_online      = models.BooleanField(default=False)

    def __str__(self):
        return f"Profil de {self.user.username}"


# Crée automatiquement un UserProfile à chaque nouvel User
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()