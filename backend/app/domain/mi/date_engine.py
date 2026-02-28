from datetime import timedelta, datetime


def parse_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return value


def apply_edd_logic(site):
    if site.permission_date and site.height_m:
        if float(site.height_m) <= 15:
            site.edd = site.permission_date + timedelta(days=15)
        else:
            site.edd = site.permission_date + timedelta(days=21)
