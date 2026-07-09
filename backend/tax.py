"""UK VAT helpers — catalogue prices are always excluding tax."""

UK_VAT_RATE = 0.20
UK_VAT_PERCENT = 20


def tax_breakdown(amount_ex_vat: float) -> dict:
    """Return ex-VAT, VAT, and inc-VAT amounts for a net price."""
    net = round(float(amount_ex_vat), 2)
    vat = round(net * UK_VAT_RATE, 2)
    total = round(net + vat, 2)
    return {
        "amount_ex_vat": net,
        "vat_rate": UK_VAT_RATE,
        "vat_percent": UK_VAT_PERCENT,
        "vat_amount": vat,
        "amount_inc_vat": total,
    }