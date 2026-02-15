from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    # Pour le module "Gestion Utilisateur"
    avatar = models.ImageField(upload_to='avatars/', default='default.png')
    is_online = models.BooleanField(default=False)
    
    # Pour le module "Jeu / Statistiques"
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    
    # Pour le module "Authentification 42"
    intra_id = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"Profil de {self.user.username}"