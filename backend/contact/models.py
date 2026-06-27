from django.db import models

# Create your models here.
class ContactMessage(models.Model):

    STATUS_CHOICES = [
        ('new', 'New'),
        ('read', 'Read'),
        ('answered', 'Answered'),
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField()

    subject = models.CharField(max_length=200)
    message = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject
    