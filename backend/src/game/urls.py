from django.urls import path
from .views import create_room, room_info

urlpatterns = [
    path('create/',          create_room, name='game-create'),
    path('<str:room_id>/',   room_info,   name='game-info'),
]