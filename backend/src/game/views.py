from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_POST
import uuid
from .models import MatchmakingQueue


@login_required
@require_http_methods(["POST"])
def create_room(request):
    """Crée une room de jeu et retourne son ID"""
    room_id = str(uuid.uuid4())[:8]
    return JsonResponse({"room_id": room_id})


@login_required
def room_info(request, room_id):
    """Retourne l'état d'une room"""
    from .consumers import GAME_ROOMS
    if room_id not in GAME_ROOMS:
        return JsonResponse({"status": "not_found"}, status=404)
    room = GAME_ROOMS[room_id]
    return JsonResponse({
        "status":  room["state"]["status"],
        "players": len(room["players"]),
    })

@login_required
@require_POST
def matchmaking(request):
    username = request.user.username

    # Nettoie les vieilles entrées (> 30s)
    from django.utils import timezone
    from datetime import timedelta
    MatchmakingQueue.objects.filter(
        created_at__lt=timezone.now() - timedelta(seconds=10)
    ).delete()

    # Déjà dans la queue avec une room ?
    me = MatchmakingQueue.objects.filter(username=username).first()
    if me and me.room_id:
        room_id = me.room_id
        me.delete()
        return JsonResponse({'status': 'matched', 'room_id': room_id})

    # Cherche un adversaire qui attend sans room
    opponent = MatchmakingQueue.objects.exclude(username=username).filter(room_id='').first()

    if opponent:
        # On crée la room et on notifie les deux
        room_id = uuid.uuid4().hex[:8].upper()
        opponent.room_id = room_id
        opponent.save()
        # On retourne matched directement au 2ème joueur
        if me:
            me.delete()
        return JsonResponse({'status': 'matched', 'room_id': room_id})
    else:
        # On attend
        if not me:
            MatchmakingQueue.objects.create(username=username, room_id='')
        return JsonResponse({'status': 'waiting', 'room_id': None})

@login_required
@require_POST
def cancel_matchmaking(request):
    MatchmakingQueue.objects.filter(username=request.user.username).delete()
    return JsonResponse({'status': 'cancelled'})
