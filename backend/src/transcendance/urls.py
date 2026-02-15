from django.contrib import admin
from django.urls import path, include

# variable que Django cherche
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('accounts/', include('allauth.urls')),
]