"""Machine Readable Zone parsing and validation (ICAO Doc 9303).

This is CivicSign's own document verification: no vendor, no model, no
training data. It reads the printed MRZ on a passport, identity card or visa,
checks every check digit and reports what the document says about itself.

What it proves: the MRZ is internally consistent, the document has not expired,
and the name on it. What it does not prove: that the document is genuine. Only
the chip (ICAO 9303 part 11 passive authentication) or a forensic inspection
can establish authenticity, so callers must not present a valid MRZ as proof
the document is real.

Formats: TD1 (3x30, identity cards), TD2 (2x36), TD3 (2x44, passports).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone

FILLER = "<"
_WEIGHTS = (7, 3, 1)
_VALID_CHARS = re.compile(r"^[A-Z0-9<]+$")

TD1, TD2, TD3 = "TD1", "TD2", "TD3"
_LINE_LENGTHS = {TD1: (30, 30, 30), TD2: (36, 36), TD3: (44, 44)}


def char_value(char: str) -> int:
    """Digits are themselves, A-Z are 10-35, filler is zero."""
    if char == FILLER:
        return 0
    if char.isdigit():
        return int(char)
    if "A" <= char <= "Z":
        return ord(char) - ord("A") + 10
    raise ValueError(f"Character {char!r} is not valid in an MRZ")


def check_digit(data: str) -> str:
    """ICAO 9303 7-3-1 weighted modulus 10 check digit."""
    total = sum(char_value(c) * _WEIGHTS[i % 3] for i, c in enumerate(data))
    return str(total % 10)


def _parse_date(value: str, *, century_pivot: int | None = None) -> date | None:
    """YYMMDD with no century. Birth dates look back, expiry dates look forward."""
    if len(value) != 6 or not value.isdigit():
        return None
    yy, mm, dd = int(value[0:2]), int(value[2:4]), int(value[4:6])
    pivot = century_pivot if century_pivot is not None else 30
    year = 2000 + yy if yy <= pivot else 1900 + yy
    try:
        return date(year, mm, dd)
    except ValueError:
        return None


def _names(field_value: str) -> tuple[str, str]:
    """`SURNAME<<GIVEN<NAMES` -> ("Surname", "Given Names")."""
    surname_part, _, given_part = field_value.partition("<<")
    surname = surname_part.replace(FILLER, " ").strip()
    given = given_part.replace(FILLER, " ").strip()
    return surname, " ".join(given.split())


@dataclass
class MrzData:
    document_format: str
    document_type: str
    issuing_state: str
    document_number: str
    nationality: str
    date_of_birth: date | None
    sex: str
    date_of_expiry: date | None
    surname: str
    given_names: str
    errors: list[str] = field(default_factory=list)

    @property
    def valid(self) -> bool:
        return not self.errors

    @property
    def full_name(self) -> str:
        return " ".join(p for p in (self.given_names, self.surname) if p)

    def is_expired(self, *, on: date | None = None) -> bool:
        if self.date_of_expiry is None:
            return True
        return self.date_of_expiry < (on or datetime.now(timezone.utc).date())

    def summary(self) -> dict:
        """What may be stored: never the image, never the raw MRZ."""
        return {
            "document_format": self.document_format,
            "document_type": self.document_type,
            "issuing_state": self.issuing_state,
            "nationality": self.nationality,
            "date_of_expiry": self.date_of_expiry.isoformat() if self.date_of_expiry else None,
            "document_number_last4": self.document_number[-4:] if self.document_number else "",
            "mrz_valid": self.valid,
        }


class MrzError(ValueError):
    """The input could not be read as an MRZ at all."""


def _split_lines(raw: str) -> list[str]:
    lines = [l.strip().upper().replace(" ", "") for l in (raw or "").splitlines()]
    return [l for l in lines if l]


def _detect_format(lines: list[str]) -> str:
    lengths = tuple(len(l) for l in lines)
    for name, expected in _LINE_LENGTHS.items():
        if lengths == expected:
            return name
    raise MrzError(
        f"Unrecognised MRZ shape {lengths} — expected 3x30 (TD1), 2x36 (TD2) or 2x44 (TD3)"
    )


def _verify(errors: list[str], label: str, data: str, found: str) -> None:
    if found == FILLER and not data.strip(FILLER):
        return  # optional field left blank
    expected = check_digit(data)
    if expected != found:
        errors.append(f"{label} check digit does not match")


def parse(raw: str) -> MrzData:
    """Parse and validate an MRZ. Raises MrzError if it is not an MRZ at all."""
    lines = _split_lines(raw)
    if not lines:
        raise MrzError("No MRZ lines provided")
    for line in lines:
        if not _VALID_CHARS.match(line):
            raise MrzError("MRZ contains characters outside A-Z, 0-9 and <")
    fmt = _detect_format(lines)
    return _PARSERS[fmt](lines)


def _parse_td3(lines: list[str]) -> MrzData:
    l1, l2 = lines
    errors: list[str] = []
    surname, given = _names(l1[5:44])
    doc_number, doc_check = l2[0:9], l2[9]
    dob_raw, dob_check = l2[13:19], l2[19]
    exp_raw, exp_check = l2[21:27], l2[27]
    personal, personal_check = l2[28:42], l2[42]
    composite_check = l2[43]

    _verify(errors, "Document number", doc_number, doc_check)
    _verify(errors, "Date of birth", dob_raw, dob_check)
    _verify(errors, "Expiry date", exp_raw, exp_check)
    _verify(errors, "Personal number", personal, personal_check)
    composite = doc_number + doc_check + dob_raw + dob_check + exp_raw + exp_check + personal + personal_check
    _verify(errors, "Composite", composite, composite_check)

    return _build(TD3, l1[0:2], l1[2:5], doc_number, l2[10:13], dob_raw, l2[20],
                  exp_raw, surname, given, errors)


def _parse_td2(lines: list[str]) -> MrzData:
    l1, l2 = lines
    errors: list[str] = []
    surname, given = _names(l1[5:36])
    doc_number, doc_check = l2[0:9], l2[9]
    dob_raw, dob_check = l2[13:19], l2[19]
    exp_raw, exp_check = l2[21:27], l2[27]
    optional = l2[28:35]
    composite_check = l2[35]

    _verify(errors, "Document number", doc_number, doc_check)
    _verify(errors, "Date of birth", dob_raw, dob_check)
    _verify(errors, "Expiry date", exp_raw, exp_check)
    composite = doc_number + doc_check + dob_raw + dob_check + exp_raw + exp_check + optional
    _verify(errors, "Composite", composite, composite_check)

    return _build(TD2, l1[0:2], l1[2:5], doc_number, l2[10:13], dob_raw, l2[20],
                  exp_raw, surname, given, errors)


def _parse_td1(lines: list[str]) -> MrzData:
    l1, l2, l3 = lines
    errors: list[str] = []
    surname, given = _names(l3[0:30])
    doc_number, doc_check = l1[5:14], l1[14]
    optional1 = l1[15:30]
    dob_raw, dob_check = l2[0:6], l2[6]
    exp_raw, exp_check = l2[8:14], l2[14]
    optional2 = l2[18:29]
    composite_check = l2[29]

    _verify(errors, "Document number", doc_number, doc_check)
    _verify(errors, "Date of birth", dob_raw, dob_check)
    _verify(errors, "Expiry date", exp_raw, exp_check)
    composite = (doc_number + doc_check + optional1 + dob_raw + dob_check
                 + exp_raw + exp_check + optional2)
    _verify(errors, "Composite", composite, composite_check)

    return _build(TD1, l1[0:2], l1[2:5], doc_number, l2[15:18], dob_raw, l2[7],
                  exp_raw, surname, given, errors)


def _build(fmt, doc_type, issuing_state, doc_number, nationality, dob_raw, sex,
           exp_raw, surname, given, errors) -> MrzData:
    dob = _parse_date(dob_raw)
    expiry = _parse_date(exp_raw, century_pivot=99)  # expiry dates are never in the 1900s
    if dob is None:
        errors.append("Date of birth is not a valid date")
    if expiry is None:
        errors.append("Expiry date is not a valid date")
    return MrzData(
        document_format=fmt,
        document_type=doc_type.replace(FILLER, "").strip(),
        issuing_state=issuing_state.replace(FILLER, "").strip(),
        document_number=doc_number.replace(FILLER, "").strip(),
        nationality=nationality.replace(FILLER, "").strip(),
        date_of_birth=dob,
        sex={"M": "M", "F": "F"}.get(sex, "X"),
        date_of_expiry=expiry,
        surname=surname,
        given_names=given,
        errors=errors,
    )


_PARSERS = {TD1: _parse_td1, TD2: _parse_td2, TD3: _parse_td3}
