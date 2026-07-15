"""
Rendelés státuszok — megosztva az orders és guest_portal appok között.
Szerep: közös definíció — mi számít „aktív” rendelés-tételnek.

"""

# Még folyamatban lévő tételek (nem kézbesítve / nem sikertelen)
ACTIVE_ITEM_STATUSES = ("new", "confirmed", "preparing", "ready")
