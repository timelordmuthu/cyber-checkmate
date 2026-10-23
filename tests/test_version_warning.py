"""tests/test_version_warning.py

Verify that loading a text model with a mismatched scikit-learn version
logs a warning as required by Fix F6.
"""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path

import pytest
import sklearn

from backend.config import TEXT_MODELS_DIR
from backend.pipeline.text_model import TextModel
import backend.pipeline.text_model as tm_module


def test_version_warning_on_mismatch(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    fake_version = "test_fake_v0"
    version_dir = tmp_path / fake_version
    version_dir.mkdir(parents=True, exist_ok=True)

    src_model = TEXT_MODELS_DIR / "v1" / "model.joblib"
    assert src_model.exists(), f"Source model {src_model} must exist"
    shutil.copyfile(src_model, version_dir / "model.joblib")

    fake_meta = {
        "version": fake_version,
        "sklearn_version": "0.0.1",
    }
    (version_dir / "meta.json").write_text(json.dumps(fake_meta), encoding="utf-8")

    monkeypatch.setattr(tm_module, "TEXT_MODELS_DIR", tmp_path)

    with caplog.at_level(logging.WARNING):
        model = TextModel.load(fake_version)

    assert model is not None
    assert model.version == fake_version
    expected_msg = (
        f"Model was trained with scikit-learn 0.0.1, running {sklearn.__version__}. "
        "Retrain if results look wrong."
    )
    assert expected_msg in caplog.text


def test_no_warning_when_versions_match(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    fake_version = "test_matching_v0"
    version_dir = tmp_path / fake_version
    version_dir.mkdir(parents=True, exist_ok=True)

    src_model = TEXT_MODELS_DIR / "v1" / "model.joblib"
    shutil.copyfile(src_model, version_dir / "model.joblib")

    matching_meta = {
        "version": fake_version,
        "sklearn_version": sklearn.__version__,
    }
    (version_dir / "meta.json").write_text(json.dumps(matching_meta), encoding="utf-8")

    monkeypatch.setattr(tm_module, "TEXT_MODELS_DIR", tmp_path)

    caplog.clear()
    with caplog.at_level(logging.WARNING):
        model = TextModel.load(fake_version)

    assert model is not None
    assert "Model was trained with scikit-learn" not in caplog.text
