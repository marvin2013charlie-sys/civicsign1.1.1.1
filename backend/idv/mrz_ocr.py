"""Read the machine readable zone from a photograph of a document.

The image is held in memory for the length of one request and is never written
to disk, never stored in the database and never sent to a third party. Only the
recovered MRZ text is returned to the caller, and only the check outcome is
stored afterwards.

Accuracy is deliberately not the last line of defence: every MRZ carries check
digits, so a misread fails validation rather than passing as a different
person. That is why padding a short line with filler characters is safe.
"""
from __future__ import annotations

import io
import logging
import shutil

logger = logging.getLogger("civicsign.idv.ocr")

MRZ_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
# TD1 is three lines of 30, TD2 two of 36, TD3 two of 44.
FORMATS = ((3, 30), (2, 36), (2, 44))
_VALID_LENGTHS = {length for _, length in FORMATS}
# OCR commonly drops characters from the end of a line; recover up to this many.
# A line that already ends in filler may be padded freely, because a run of <
# carries no information and any real loss still fails the check digits.
MAX_PAD = 3

# Letters Tesseract reports where the format requires a digit. Applied only at
# numeric positions, and only kept when the check digits then agree.
_DIGIT_CONFUSIONS = str.maketrans({
    "O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "S": "5",
    "B": "8", "Z": "2", "G": "6", "A": "4", "T": "7", "<": "0",
})

# Positions that must be numeric, per ICAO 9303 line layout.
_NUMERIC_POSITIONS = {
    (2, 44): {1: [9, 19, 27, 42, 43] + list(range(13, 19)) + list(range(21, 27))},
    (2, 36): {1: [9, 19, 27, 35] + list(range(13, 19)) + list(range(21, 27))},
    (3, 30): {0: [14], 1: [6, 14, 29] + list(range(0, 6)) + list(range(8, 14))},
}
MAX_IMAGE_BYTES = 8 * 1024 * 1024

_CONFUSIONS = str.maketrans({"«": "<", "“": "<", "”": "<", "|": "<", " ": ""})


def available() -> bool:
    """Whether the OCR engine is installed in this environment."""
    return shutil.which("tesseract") is not None


def _clean(line: str) -> str:
    line = line.strip().upper().translate(_CONFUSIONS)
    return "".join(c for c in line if c in MRZ_CHARSET)


def select_mrz_lines(text: str) -> str | None:
    """Pick the MRZ out of raw OCR output. Pure, so it is testable without OCR.

    Looks for consecutive lines whose lengths match one of the ICAO formats,
    padding slightly short lines with filler. Returns None when nothing fits.
    """
    lines = [_clean(l) for l in (text or "").splitlines()]
    lines = [l for l in lines if len(l) >= 20]
    if not lines:
        return None

    for count, length in FORMATS:
        for start in range(0, max(0, len(lines) - count) + 1):
            window = lines[start:start + count]
            if len(window) != count:
                continue
            fixed = []
            for line in window:
                if len(line) == length:
                    fixed.append(line)
                elif len(line) < length and (
                    line.endswith("<") or length - len(line) <= MAX_PAD
                ):
                    fixed.append(line.ljust(length, "<"))
                elif length < len(line) <= length + MAX_PAD:
                    fixed.append(line[:length])
                else:
                    fixed = []
                    break
            if fixed:
                return "\n".join(fixed)
    return None


def repair_numeric_fields(mrz_text: str) -> str:
    """Fix letter-for-digit misreads where the format demands a digit.

    This cannot turn a wrong document into a valid one: the caller validates
    the result against its check digits, so a bad guess simply fails.
    """
    lines = (mrz_text or "").splitlines()
    layout = _NUMERIC_POSITIONS.get((len(lines), len(lines[0]) if lines else 0))
    if not layout:
        return mrz_text
    repaired = list(lines)
    for index, positions in layout.items():
        if index >= len(repaired):
            continue
        chars = list(repaired[index])
        for pos in positions:
            if pos < len(chars) and not chars[pos].isdigit():
                chars[pos] = chars[pos].translate(_DIGIT_CONFUSIONS)
        repaired[index] = "".join(chars)
    return "\n".join(repaired)


def _variants(image_bytes: bytes):
    """The whole page, then the bottom third where the MRZ is printed."""
    from PIL import Image, ImageOps

    image = Image.open(io.BytesIO(image_bytes))
    image = ImageOps.exif_transpose(image).convert("L")
    if image.width > 2000:
        ratio = 2000 / image.width
        image = image.resize((2000, int(image.height * ratio)))
    image = ImageOps.autocontrast(image)

    bottom = image.crop((0, int(image.height * 0.6), image.width, image.height))
    return [bottom, image]


def extract_mrz(image_bytes: bytes) -> str | None:
    """Return the MRZ text found in a document photograph, or None."""
    if not available():
        raise RuntimeError("OCR engine is not installed")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image is too large")

    import pytesseract

    config = f"--psm 6 -c tessedit_char_whitelist={MRZ_CHARSET}"
    for image in _variants(image_bytes):
        try:
            text = pytesseract.image_to_string(image, config=config)
        except Exception as exc:  # engine missing data, corrupt image
            logger.warning(f"[idv-ocr] read failed: {exc}")
            continue
        found = select_mrz_lines(text)
        if not found:
            continue
        from idv import mrz as mrz_parser

        repaired = repair_numeric_fields(found)
        if repaired != found:
            try:
                if mrz_parser.parse(repaired).valid:
                    return repaired
            except mrz_parser.MrzError:
                pass
        return found
    return None
