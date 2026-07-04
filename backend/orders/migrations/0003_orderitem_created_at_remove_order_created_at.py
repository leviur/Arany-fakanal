from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_orderitem_delivery_date_remove_order_delivery_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.RemoveField(
            model_name="order",
            name="created_at",
        ),
    ]
