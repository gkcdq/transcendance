from django.http import JsonResponse
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json


@csrf_exempt
@require_http_methods(["POST"])
def oauth_login(request):
    data     = json.loads(request.body)
    username = data.get('username')
    avatar   = data.get('avatar', '')

    if not username:
        return JsonResponse({"error": "username requis"}, status=400)

    user, created = User.objects.get_or_create(username=username)

    profile = user.profile
    if avatar:
        profile.avatar = avatar
    profile.is_online = True
    profile.save()

    user.backend = 'django.contrib.auth.backends.ModelBackend'
    login(request, user)

    return JsonResponse({
        "status":   "ok",
        "created":  created,
        "username": user.username,
        "avatar":   profile.avatar or avatar,
        "wins":     profile.wins,
        "losses":   profile.losses,
        "xp":       profile.xp,
    })


@login_required
def get_user_profile(request):
    profile = request.user.profile
    return JsonResponse({
        "username":      request.user.username,
        "avatar":        profile.avatar or None,
        "wins":          profile.wins,
        "losses":        profile.losses,
        "xp":            profile.xp,
        "total_seconds": profile.total_seconds,
        "paddle_color":  profile.paddle_color,
        "ai_difficulty": profile.ai_difficulty,
        "is_online":     profile.is_online,
    })


@login_required
@require_http_methods(["PATCH"])
def update_user_profile(request):
    profile = request.user.profile
    data    = json.loads(request.body)
    allowed = ['paddle_color', 'ai_difficulty', 'xp', 'total_seconds', 'wins', 'losses']
    for field in allowed:
        if field in data:
            setattr(profile, field, data[field])
    profile.save()
    return JsonResponse({"status": "ok"})


@login_required
@require_http_methods(["POST"])
def record_match(request):
    profile = request.user.profile
    data    = json.loads(request.body)

    if data.get('is_victory'):
        profile.wins += 1
        profile.xp   += 100
    else:
        profile.losses += 1
        profile.xp     += 20

    profile.total_seconds += data.get('duration_seconds', 0)
    profile.save()

    return JsonResponse({
        "status": "ok",
        "wins":   profile.wins,
        "losses": profile.losses,
    })


@login_required
@require_http_methods(["POST"])
def logout_view(request):
    from django.contrib.auth import logout
    profile           = request.user.profile
    profile.is_online = False
    profile.save()
    logout(request)
    return JsonResponse({"status": "ok"})