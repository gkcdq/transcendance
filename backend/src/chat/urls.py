from django.urls import path
from . import views

urlpatterns = [
    path('history/', views.chat_history, name='chat-history'),
]