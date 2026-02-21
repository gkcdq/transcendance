from django.urls import path
from . import views
from .views import create_room, room_info

urlpatterns = [
    path('create/',      create_room,       name='game-create'),
    path('matchmaking/', views.matchmaking, name='game-matchmaking'),
    path('<str:room_id>/', room_info,       name='game-info'),
]