from app.domain.finance.mi_calculator import compute_mi_financials


def compute_ma_financials(site, project_id, db):
    raise NotImplementedError("MA calculator not implemented")


def compute_mc_financials(site, project_id, db):
    raise NotImplementedError("MC calculator not implemented")


def compute_md_financials(site, project_id, db):
    raise NotImplementedError("MD calculator not implemented")


CALCULATORS = {
    "mi": compute_mi_financials,
    "ma": compute_ma_financials,
    "mc": compute_mc_financials,
    "md": compute_md_financials,
}