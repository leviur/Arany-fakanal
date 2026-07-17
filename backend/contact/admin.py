from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = (
        "subject",
        "name",
        "message_type",
        "status",
        "archived",
        "created_at",
    )
    list_filter = ("status", "archived", "message_type")
    search_fields = ("name", "email", "subject", "message")
