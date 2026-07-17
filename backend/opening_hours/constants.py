WEEKDAY_KEYS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]

WEEKDAY_LABELS_HU = {
    "monday": "Hétfő",
    "tuesday": "Kedd",
    "wednesday": "Szerda",
    "thursday": "Csütörtök",
    "friday": "Péntek",
    "saturday": "Szombat",
    "sunday": "Vasárnap",
}

DEFAULT_WEEKLY_HOURS = {
    "monday": {"closed": False, "open": "11:00", "close": "22:00"},
    "tuesday": {"closed": False, "open": "11:00", "close": "22:00"},
    "wednesday": {"closed": False, "open": "11:00", "close": "22:00"},
    "thursday": {"closed": False, "open": "11:00", "close": "22:00"},
    "friday": {"closed": False, "open": "11:00", "close": "23:00"},
    "saturday": {"closed": False, "open": "11:00", "close": "23:00"},
    "sunday": {"closed": False, "open": "11:00", "close": "20:00"},
}

# Dashboard SLA — rendelés státuszok (perc) és foglalás figyelmeztetések
DEFAULT_ORDER_STATUS_LIMITS = {
    "Új": 30,
    "Elfogadva": 45,
    "Készül": 60,
    "Kiszállítás alatt": 90,
}

DEFAULT_BOOKING_LIMITS = {
    "warnNew": 60,
    "problemNew": 180,
    "warnConfirmed": 24,
}

ORDER_STATUS_LIMIT_KEYS = list(DEFAULT_ORDER_STATUS_LIMITS.keys())
BOOKING_LIMIT_KEYS = list(DEFAULT_BOOKING_LIMITS.keys())
