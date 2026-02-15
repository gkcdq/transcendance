from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

@login_required
def get_user_profile(request):
    profile = request.user.profile
    return JsonResponse({
        "username": request.user.username,
        "avatar": profile.avatar.url if profile.avatar else None,
        "wins": profile.wins,
        "losses": profile.losses,
        "is_online": profile.is_online,
    })