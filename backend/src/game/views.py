from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
import uuid


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