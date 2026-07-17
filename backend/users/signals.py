# Korábban itt volt egy post_save signal, ami minden új User-hez
# automatikusan létrehozott egy üres UserProfile-t.
#
# Probléma: a UserProfile-nak kötelező a phone_number és address mező,
# ezért a signal hibát okozott volna.
#
# Megoldás: a UserProfile-t most a regisztrációs API hozza létre
# a megfelelő adatokkal (lásd: users/serializers.py → RegisterSerializer.create).
