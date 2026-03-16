from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings

# variable que django cherche
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('accounts/', include('allauth.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/game/', include('game.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)