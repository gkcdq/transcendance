from django.contrib import admin
from django.urls import path

# variable que Django cherche
urlpatterns = [
    path('admin/', admin.site.urls),
]