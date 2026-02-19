from django.urls import path
from .views import get_user_profile, update_user_profile, record_match, logout_view, oauth_login

urlpatterns = [
    path('me/',          get_user_profile,    name='user-me'),
    path('me/update/',   update_user_profile, name='user-update'),
    path('me/match/',    record_match,        name='user-match'),
    path('logout/',      logout_view,         name='user-logout'),
    path('oauth-login/', oauth_login,         name='oauth-login'),
]