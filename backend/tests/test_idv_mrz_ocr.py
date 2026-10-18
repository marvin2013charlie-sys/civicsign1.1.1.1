"""Recovering the MRZ from OCR output — the part that needs no OCR engine."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from idv.mrz import parse  # noqa: E402
from idv.mrz_ocr import MAX_PAD, repair_numeric_fields, select_mrz_lines  # noqa: E402

TD3_L1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
TD3_L2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10"
TD1 = ["I<UTOD231458907<<<<<<<<<<<<<<<",
       "7408122F1204159UTO<<<<<<<<<<<6",
       "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"]


def test_clean_two_line_passport_is_found():
    assert select_mrz_lines(f"{TD3_L1}\n{TD3_L2}") == f"{TD3_L1}\n{TD3_L2}"


def test_surrounding_page_text_is_ignored():
    noisy = f"PASSPORT\nUNITED KINGDOM\nSURNAME ERIKSSON\n{TD3_L1}\n{TD3_L2}\n"
    assert select_mrz_lines(noisy) == f"{TD3_L1}\n{TD3_L2}"


def test_three_line_identity_card_is_found():
    assert select_mrz_lines("\n".join(TD1)) == "\n".join(TD1)


def test_spaces_the_scanner_invents_are_removed():
    spaced = f"{TD3_L1}\nL898902C3 6UTO 7408122F120 4159ZE184226B<<<<<10"
    assert select_mrz_lines(spaced) == f"{TD3_L1}\n{TD3_L2}"


@pytest.mark.parametrize("symbol", ["«", "|"])
def test_characters_misread_as_filler_are_corrected(symbol):
    swapped = TD3_L1.replace("<", symbol, 1)
    assert select_mrz_lines(f"{swapped}\n{TD3_L2}") == f"{TD3_L1}\n{TD3_L2}"


def test_dropped_trailing_filler_is_restored():
    # Scanners often lose the run of < at the end of a line.
    short = TD3_L1[:-MAX_PAD]
    assert select_mrz_lines(f"{short}\n{TD3_L2}") == f"{TD3_L1}\n{TD3_L2}"


def test_a_name_line_cut_inside_its_filler_is_rebuilt_exactly():
    # Everything past the name is filler, so padding restores the original.
    assert select_mrz_lines(f"{TD3_L1[:30]}\n{TD3_L2}") == f"{TD3_L1}\n{TD3_L2}"


@pytest.mark.parametrize("text", ["", "no machine readable zone here", "SHORT\nLINES"])
def test_nothing_usable_returns_none(text):
    assert select_mrz_lines(text) is None


def test_a_recovered_mrz_still_has_to_pass_its_check_digits():
    # Padding cannot turn a misread into a pass: a wrong character fails here.
    misread = TD3_L2.replace("L898902C36", "L898902C37", 1)
    recovered = select_mrz_lines(f"{TD3_L1}\n{misread}")
    assert recovered is not None
    assert parse(recovered).valid is False


def test_a_long_filler_run_may_be_rebuilt():
    # Tesseract collapses runs of <, so the name line arrives far too short.
    collapsed = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<"
    recovered = select_mrz_lines(f"{collapsed}\n{TD3_L2}")
    assert recovered == f"{TD3_L1}\n{TD3_L2}"


def test_a_line_truncated_outside_its_filler_is_rejected():
    # Real characters lost, and the shortfall is too large to be filler.
    truncated = TD3_L2[:29]
    assert select_mrz_lines(f"{TD3_L1}\n{truncated}") is None


def test_padding_a_data_line_is_caught_by_its_check_digits():
    # The check digits are the safety net: padding can never fake a pass.
    truncated = TD3_L2[:38]            # ends inside the filler, so it is padded
    recovered = select_mrz_lines(f"{TD3_L1}\n{truncated}")
    assert recovered is not None
    assert parse(recovered).valid is False


def test_letters_misread_for_digits_are_repaired():
    misread = TD3_L2[:-1] + "Q"          # final check digit 0 read as Q
    repaired = repair_numeric_fields(f"{TD3_L1}\n{misread}")
    assert repaired.endswith("0")
    assert parse(repaired).valid


def test_repair_leaves_alphabetic_fields_untouched():
    # The name line holds no numeric positions, so nothing may change there.
    repaired = repair_numeric_fields(f"{TD3_L1}\n{TD3_L2}")
    assert repaired.split("\n")[0] == TD3_L1


def test_repair_cannot_rescue_a_genuinely_wrong_document():
    wrong = TD3_L2.replace("7408122", "7508122", 1)   # a different birth date
    repaired = repair_numeric_fields(f"{TD3_L1}\n{wrong}")
    assert parse(repaired).valid is False


def test_repair_ignores_text_that_is_not_an_mrz():
    assert repair_numeric_fields("hello") == "hello"
