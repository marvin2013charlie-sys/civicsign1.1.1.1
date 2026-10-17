"""ICAO 9303 MRZ parsing — CivicSign's own document verification."""
import os
import sys
from datetime import date

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from idv.mrz import MrzError, char_value, check_digit, parse  # noqa: E402

# ICAO Doc 9303 specimen documents for the fictitious state "Utopia".
TD3 = ("P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n"
       "L898902C36UTO7408122F1204159ZE184226B<<<<<10")
TD2 = ("I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<\n"
       "D231458907UTO7408122F1204159<<<<<<<6")
TD1 = ("I<UTOD231458907<<<<<<<<<<<<<<<\n"
       "7408122F1204159UTO<<<<<<<<<<<6\n"
       "ERIKSSON<<ANNA<MARIA<<<<<<<<<<")


@pytest.mark.parametrize("raw,fmt", [(TD3, "TD3"), (TD2, "TD2"), (TD1, "TD1")])
def test_specimen_documents_are_valid(raw, fmt):
    d = parse(raw)
    assert d.valid, d.errors
    assert d.document_format == fmt
    assert d.surname == "ERIKSSON"
    assert d.given_names == "ANNA MARIA"
    assert d.full_name == "ANNA MARIA ERIKSSON"
    assert d.nationality == "UTO"
    assert d.date_of_birth == date(1974, 8, 12)
    assert d.date_of_expiry == date(2012, 4, 15)


def test_passport_document_number_and_type():
    d = parse(TD3)
    assert d.document_type == "P"
    assert d.document_number == "L898902C3"
    assert d.issuing_state == "UTO"


@pytest.mark.parametrize("position,label", [
    (0, "Document number"),   # first digit of the document number
    (13, "Date of birth"),
    (21, "Expiry date"),
])
def test_altering_a_field_is_caught_by_its_check_digit(position, label):
    line1, line2 = TD3.split("\n")
    original = line2[position]
    swapped = "8" if original != "8" else "7"
    tampered = line2[:position] + swapped + line2[position + 1:]
    d = parse(f"{line1}\n{tampered}")
    assert not d.valid
    assert any(label in e for e in d.errors)


def test_altering_a_check_digit_alone_is_also_caught():
    line1, line2 = TD3.split("\n")
    tampered = line2[:9] + ("0" if line2[9] != "0" else "1") + line2[10:]
    d = parse(f"{line1}\n{tampered}")
    assert not d.valid


def test_expiry_is_evaluated_against_a_given_date():
    d = parse(TD3)
    assert d.is_expired(on=date(2026, 1, 1)) is True
    assert d.is_expired(on=date(2010, 1, 1)) is False


def test_expiry_dates_never_resolve_to_the_1900s():
    # A 2049 expiry must not be read as 1949.
    line1, line2 = TD3.split("\n")
    exp = "490415"
    rebuilt = line2[:21] + exp + check_digit(exp) + line2[28:]
    composite = rebuilt[0:10] + rebuilt[13:20] + rebuilt[21:28] + rebuilt[28:43]
    rebuilt = rebuilt[:43] + check_digit(composite)
    d = parse(f"{line1}\n{rebuilt}")
    assert d.date_of_expiry == date(2049, 4, 15)


def test_summary_excludes_identifying_document_details():
    summary = parse(TD3).summary()
    assert summary["document_number_last4"] == "02C3"
    assert "L898902C3" not in str(summary)
    assert "date_of_birth" not in summary
    assert summary["mrz_valid"] is True


@pytest.mark.parametrize("raw", [
    "",
    "TOO SHORT",
    "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",            # one line only
    "P<UTOERIKSSON!!<<ANNA<<<<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10",
])
def test_unreadable_input_is_rejected(raw):
    with pytest.raises(MrzError):
        parse(raw)


@pytest.mark.parametrize("char,value", [("0", 0), ("9", 9), ("A", 10), ("Z", 35), ("<", 0)])
def test_character_values(char, value):
    assert char_value(char) == value


@pytest.mark.parametrize("data,expected", [
    ("D23145890", "7"),   # TD2 specimen document number
    ("L898902C3", "6"),   # TD3 specimen document number
    ("740812", "2"),      # specimen date of birth
    ("120415", "9"),      # specimen expiry date
])
def test_check_digits_match_the_specimen_documents(data, expected):
    assert check_digit(data) == expected


def test_lowercase_and_spacing_are_tolerated():
    messy = "\n".join(l.lower() for l in TD3.split("\n")) + "\n"
    assert parse(messy).valid
