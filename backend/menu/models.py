from django.db import models

# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=100,
    unique=True)

    class Meta:
        verbose_name_plural="Categories"

    def __str__(self):
        return self.name
    
class Allergen(models.Model):
    key = models.CharField(max_length=50,
    unique=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=250)
    label = models.TextField()


    def __str__(self):
        return self.name

class MenuItem(models.Model):

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='items'
        )
    
    name = models.CharField(max_length=100)
    description = models.TextField()

    price = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )

    allergens = models.ManyToManyField(
        Allergen,
        through='MenuAllergen',
        blank=True
    )

    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.name
    
class MenuAllergen(models.Model):

    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE
    )

    allergen = models.ForeignKey(
        Allergen,
        on_delete=models.CASCADE
    )

    class Meta:
        unique_together = ('menu_item', 'allergen')

class WeeklyMenuItem(models.Model):

    CATEGORY_CHOICES = [
        ('soup', 'Soup'),
        ('main', 'Main Course'),
        ('dessert', 'Dessert'),
    ]

    name = models.CharField(max_length=100)

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES
    )

    is_available = models.BooleanField(
        default=True
    )

    def __str__(self):
        return self.name

class WeeklyMenu(models.Model):

    MENU_TYPE = [
        ('A', 'A menu'),
        ('B', 'B menu'),
    ]

    day = models.DateField()
    menu_type = models.CharField(max_length=1, choices=MENU_TYPE)

    soup = models.ForeignKey(
        WeeklyMenuItem,
        on_delete=models.PROTECT,
        related_name='weekly_soups'
    )

    main_course = models.ForeignKey(
        WeeklyMenuItem,
        on_delete=models.PROTECT,
        related_name='weekly_mains'
    )

    dessert = models.ForeignKey(
        WeeklyMenuItem,
        on_delete=models.PROTECT,
        related_name='weekly_desserts'
    )

    price = models.DecimalField(max_digits=8, decimal_places=2)

    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = ('day', 'menu_type')

    def __str__(self):
        return f"{self.day} - {self.menu_type}"
    
