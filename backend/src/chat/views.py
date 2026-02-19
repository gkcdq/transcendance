from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import Message


@login_required
def chat_history(request):
    messages = Message.objects.select_related('user__profile').order_by('-timestamp')[:50]
    return JsonResponse({
        "messages": [m.to_dict() for m in reversed(list(messages))]
    })