"""
Mely foglalás-státuszok számítanak még „élőnek”.

Ugyanaz a lista kell a dupla-foglalás ellenőrzéshez (reservations)
és a vendégközpont Aktív tabjához (guest_portal) — ne legyen két helyen másolva.
"""

# „Élőnek” számítanak: Új (pending) vagy visszaigazolt (confirmed) — még nem lemondott, nem teljesített
ACTIVE_RESERVATION_STATUSES = ("pending", "confirmed")

"""
Ezt használja:
    reservations/conflicts.py - Van-e már aktív foglalás ,
    guest_portal/reservation_filters.py - Aktív tab szűrése 
"""