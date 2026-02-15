from django.urls import path
from .views import get_user_profile

urlpatterns = [
    path('me/', get_user_profile, name='user-me'),
]