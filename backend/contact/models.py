from django.db import models


class ContactMessage(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ("Foglalás", "Foglalás"),
        ("Visszajelzés", "Visszajelzés"),
        ("Általános kérdés", "Általános kérdés"),
        ("Egyéb", "Egyéb"),
    ]

    STATUS_CHOICES = [
        ("new", "Új"),
        ("read", "Olvasott"),
        ("answered", "Megválaszolva"),
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()

    message_type = models.CharField(
        max_length=30,
        choices=MESSAGE_TYPE_CHOICES,
        default="Egyéb",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="new",
    )

    archived = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.subject

    @property
    def is_read(self):
        return self.status != "new"
