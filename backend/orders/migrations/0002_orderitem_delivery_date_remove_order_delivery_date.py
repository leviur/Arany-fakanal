from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="delivery_date",
            field=models.DateField(default="2026-01-01"),
            preserve_default=False,
        ),
        migrations.RemoveField(
            model_name="order",
            name="delivery_date",
        ),
    ]
