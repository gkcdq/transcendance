from django.http import JsonResponse
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from .models import UserProfile, FriendRequest
import json


def get_leaderboard(request):
    # On utilise .exclude(username='windows') pour retirer cet utilisateur spécifique
    profiles = User.objects.select_related('profile').exclude(username='windows').order_by(
        '-profile__wins', '-profile__xp'
    )[:10]
    
    data = []
    for i, user in enumerate(profiles, 1):
        p = user.profile
        data.append({
            'rank':     i,
            'username': user.username,
            'avatar':   p.avatar or f'https://ui-avatars.com/api/?name={user.username}&background=0D1117&color=00babc',
            'wins':     p.wins,
            'losses':   p.losses,
            'xp':       p.xp,
            'winrate':  round(p.wins / (p.wins + p.losses) * 100) if (p.wins + p.losses) > 0 else 0,
        })
    
    return JsonResponse({'leaderboard': data})

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
        "status": "ok", "created": created,
        "username": user.username, "avatar": profile.avatar or avatar,
        "wins": profile.wins, "losses": profile.losses, "xp": profile.xp,
    })


@login_required
def get_user_profile(request):
    profile = request.user.profile
    return JsonResponse({
        "username": request.user.username, "avatar": profile.avatar or None,
        "wins": profile.wins, "losses": profile.losses, "xp": profile.xp,
        "total_seconds": profile.total_seconds, "paddle_color": profile.paddle_color,
        "ai_difficulty": profile.ai_difficulty, "is_online": profile.is_online,
    })


@login_required
@require_http_methods(["PATCH"])
def update_user_profile(request):
    profile = request.user.profile
    data = json.loads(request.body)
    for field in ['paddle_color', 'ai_difficulty', 'xp', 'total_seconds', 'wins', 'losses']:
        if field in data:
            setattr(profile, field, data[field])
    profile.save()
    return JsonResponse({"status": "ok"})


@login_required
@require_http_methods(["POST"])
def record_match(request):
    profile = request.user.profile
    data = json.loads(request.body)
    if data.get('is_victory'):
        profile.wins += 1; profile.xp += 100
    else:
        profile.losses += 1; profile.xp += 20
    profile.total_seconds += data.get('duration_seconds', 0)
    profile.save()
    return JsonResponse({"status": "ok", "wins": profile.wins, "losses": profile.losses})


@login_required
@require_http_methods(["POST"])
def logout_view(request):
    from django.contrib.auth import logout
    profile = request.user.profile
    profile.is_online = False
    profile.save()
    logout(request)
    return JsonResponse({"status": "ok"})


@login_required
def get_friends(request):
    user = request.user
    accepted = FriendRequest.objects.filter(status='accepted').filter(sender=user).select_related('receiver__profile') | \
               FriendRequest.objects.filter(status='accepted').filter(receiver=user).select_related('sender__profile')
    friends = []
    for req in accepted:
        friend = req.receiver if req.sender == user else req.sender
        friends.append({"username": friend.username, "avatar": friend.profile.avatar or None, "is_online": friend.profile.is_online})
    return JsonResponse({"friends": friends})


@login_required
def get_friend_requests(request):
    pending = FriendRequest.objects.filter(receiver=request.user, status='pending').select_related('sender__profile')
    return JsonResponse({"requests": [{"id": r.id, "username": r.sender.username, "avatar": r.sender.profile.avatar or None} for r in pending]})


@login_required
@require_http_methods(["POST"])
def send_friend_request(request):
    data = json.loads(request.body)
    username = data.get('username')
    if not username:
        return JsonResponse({"error": "username requis"}, status=400)
    if username == request.user.username:
        return JsonResponse({"error": "Tu ne peux pas t'ajouter toi-même"}, status=400)
    try:
        target = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({"error": "Utilisateur introuvable"}, status=404)
    existing = FriendRequest.objects.filter(sender=request.user, receiver=target).first() or \
               FriendRequest.objects.filter(sender=target, receiver=request.user).first()
    if existing:
        return JsonResponse({"error": "Déjà amis ou demande existante"}, status=400)
    FriendRequest.objects.create(sender=request.user, receiver=target)
    return JsonResponse({"status": "ok", "message": f"Demande envoyée à {username}"})


@login_required
@require_http_methods(["POST"])
def respond_friend_request(request, request_id):
    data = json.loads(request.body)
    action = data.get('action')
    try:
        freq = FriendRequest.objects.get(id=request_id, receiver=request.user)
    except FriendRequest.DoesNotExist:
        return JsonResponse({"error": "Demande introuvable"}, status=404)
    if action in ('accept', 'reject'):
        freq.status = 'accepted' if action == 'accept' else 'rejected'
        freq.save()
        return JsonResponse({"status": "ok"})
    return JsonResponse({"error": "Action invalide"}, status=400)


@login_required
@require_http_methods(["DELETE"])
def remove_friend(request, username):
    try:
        target = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({"error": "Utilisateur introuvable"}, status=404)
    FriendRequest.objects.filter(sender=request.user, receiver=target, status='accepted').delete()
    FriendRequest.objects.filter(sender=target, receiver=request.user, status='accepted').delete()
    return JsonResponse({"status": "ok"})


@login_required
def search_users(request):
    query = request.GET.get('q', '').strip()
    if len(query) < 2:
        return JsonResponse({"users": []})
    users = User.objects.filter(username__icontains=query).exclude(username=request.user.username).select_related('profile')[:10]
    return JsonResponse({"users": [{"username": u.username, "avatar": u.profile.avatar or None, "is_online": u.profile.is_online} for u in users]})