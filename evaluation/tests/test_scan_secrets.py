"""scan_secrets 오탐 제외 규칙 (루프백·16진 id·checkpoint 채널 버전) — 실제 PII·키는 계속 잡는다."""

from evaluation.scan_secrets import scan_text


def test_excludes_loopback_hex_ids_and_channel_versions():
    assert scan_text('INFO:     127.0.0.1:8130 - "POST /query HTTP/1.1" 200 OK', []) == []
    assert scan_text("thr_usr_a80678fb2f7a_pet_mocha_9a123c4567890123fd", []) == []
    assert scan_text("1f0bb2c1-3b4e-6c1a-8001-0123456789ab", []) == []
    assert scan_text("400000000000000000000000000000002.0.2433834892318349", []) == []


def test_still_finds_real_pii_and_secrets():
    assert "ip" in scan_text("from 203.0.113.7", [])
    assert {"phone", "rrn", "credit_card"} <= set(scan_text("010-1234-5678 / 900101-1234567 / 4111-1111-1111-1111", []))
    assert "raw_fake_pii" in scan_text("seojun.test@example.com", [])
    # 16진 키 값도 원문으로 찾는다 (16진 id 제외 규칙에 가려지지 않음)
    assert "secret" in scan_text("key=1f0bb2c13b4e6c1a8001abcdef", ["1f0bb2c13b4e6c1a8001abcdef"])
