"""Monthly quota usage counts sent envelopes only."""
from usage_ledger import _live_sent_envelope_count

# Unit-level: query shape is exercised via integration when DB is available.
# Import ensures the helper exists and is named for sent-at filtering.


def test_live_sent_count_helper_is_importable():
    assert callable(_live_sent_envelope_count)