"""
Vendégközpont lista lapozás — rendelések és foglalások is ezt használja.

A frontend ?page_size=50-t küld aktív tabnál (egyszerre betölt), lezártnál 10-es lapok.
"""

from rest_framework.pagination import PageNumberPagination


class GuestOrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"  # pl. ?page_size=50 — cart cache is így kéri
    max_page_size = 50
