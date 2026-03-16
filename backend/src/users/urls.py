from django.urls import path
from . import views
from .views import (
    get_user_profile, update_user_profile, record_match,
    logout_view, oauth_login,
    get_friends, get_friend_requests, send_friend_request,
    respond_friend_request, remove_friend, search_users,
    upload_avatar, update_password
)

urlpatterns = [
    path('me/', get_user_profile, name='user-me'),
    path('me/update/', update_user_profile, name='user-update'),
    path('me/match/', record_match, name='user-match'),
    path('logout/', logout_view, name='user-logout'),
    path('oauth-login/', oauth_login, name='oauth-login'),
    path('friends/', get_friends, name='friends'),
    path('friends/requests/', get_friend_requests, name='friend-requests'),
    path('friends/send/', send_friend_request, name='friend-send'),
    path('friends/respond/<int:request_id>/', respond_friend_request, name='friend-respond'),
    path('friends/remove/<str:username>/', remove_friend, name='friend-remove'),
    path('search/', search_users, name='user-search'),
    path('leaderboard/', views.get_leaderboard, name='user-leaderboard'),
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('delete/', views.delete_account, name='delete-account'),
    path('upload-avatar/', upload_avatar),
    path('me/password/', update_password, name='update-password'),
]