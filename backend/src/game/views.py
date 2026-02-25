from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_POST
import uuid
from .models import MatchmakingQueue


@login_required
@require_http_methods(["POST"])
def create_room(request):
    room_id = str(uuid.uuid4())[:8]
    return JsonResponse({"room_id": room_id})


@login_required
def room_info(request, room_id):
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
    from django.utils import timezone
    from datetime import timedelta
    MatchmakingQueue.objects.filter(
        created_at__lt=timezone.now() - timedelta(seconds=10)
    ).delete()

    me = MatchmakingQueue.objects.filter(username=username).first()
    if me and me.room_id:
        room_id = me.room_id
        me.delete()
        return JsonResponse({'status': 'matched', 'room_id': room_id})

    opponent = MatchmakingQueue.objects.exclude(username=username).filter(room_id='').first()
    if opponent:
        room_id = uuid.uuid4().hex[:8].upper()
        opponent.room_id = room_id
        opponent.save()
        if me:
            me.delete()
        return JsonResponse({'status': 'matched', 'room_id': room_id})
    else:
        if not me:
            MatchmakingQueue.objects.create(username=username, room_id='')
        return JsonResponse({'status': 'waiting', 'room_id': None})


@login_required
@require_POST
def cancel_matchmaking(request):
    MatchmakingQueue.objects.filter(username=request.user.username).delete()
    return JsonResponse({'status': 'cancelled'})


@login_required
def active_rooms(request):
    from .consumers import GAME_ROOMS
    rooms = [
        {
            "room_id": rid,
            "players": list(room["usernames"].values()),
            "spectators": len(room.get("spectators", [])),
        }
        for rid, room in GAME_ROOMS.items()
        if room["state"]["status"] == "playing"
    ]
    return JsonResponse({"rooms": rooms})
