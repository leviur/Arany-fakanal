from rest_framework import serializers

from .models import ContactMessage

MESSAGE_TYPE_CHOICES = [choice[0] for choice in ContactMessage.MESSAGE_TYPE_CHOICES]
STATUS_CHOICES = [choice[0] for choice in ContactMessage.STATUS_CHOICES]


class ContactMessageSerializer(serializers.ModelSerializer):
    """Dashboard lista / részletek — mezőnevek illeszkednek a messages.js-hez."""

    type = serializers.CharField(source="message_type", read_only=True)
    read = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()

    class Meta:
        model = ContactMessage
        fields = [
            "id",
            "name",
            "email",
            "subject",
            "message",
            "type",
            "read",
            "archived",
            "status",
            "date",
            "created_at",
        ]
        read_only_fields = fields

    def get_read(self, obj):
        return obj.status != "new"

    def get_date(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M")


class ContactMessageCreateSerializer(serializers.ModelSerializer):
    """Publikus kapcsolatfelvétel — a űrlap mezőneve: type."""

    type = serializers.ChoiceField(choices=MESSAGE_TYPE_CHOICES, source="message_type")
    # A HTML űrlapon a tárgy opcionális — üres string is elfogadott
    subject = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")

    class Meta:
        model = ContactMessage
        fields = [
            "name",
            "email",
            "subject",
            "message",
            "type",
        ]

    def create(self, validated_data):
        validated_data["status"] = "new"
        validated_data["archived"] = False
        return ContactMessage.objects.create(**validated_data)


class ContactMessageUpdateSerializer(serializers.ModelSerializer):
    """
    Admin PATCH — olvasott / archivált / típus / státusz.
    read: true → status 'read' (ha új volt); false → 'new'
    """

    read = serializers.BooleanField(required=False, write_only=True)
    type = serializers.ChoiceField(
        choices=MESSAGE_TYPE_CHOICES,
        source="message_type",
        required=False,
    )

    class Meta:
        model = ContactMessage
        fields = [
            "read",
            "type",
            "archived",
            "status",
        ]

    def validate_status(self, value):
        if value not in STATUS_CHOICES:
            raise serializers.ValidationError("Érvénytelen státusz.")
        return value

    def update(self, instance, validated_data):
        read = validated_data.pop("read", None)

        if read is True and instance.status == "new":
            instance.status = "read"
        elif read is False:
            instance.status = "new"

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
