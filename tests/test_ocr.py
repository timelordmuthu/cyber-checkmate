"""Tests for screenshot OCR service (PRD FR5, 16.6)."""

import io
from pathlib import Path
from unittest.mock import MagicMock
import pytest
from PIL import Image, ImageDraw

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

from backend.pipeline.ocr import NoTextFound, OCRService, get_ocr, read_image


def ocr_models_downloaded() -> bool:
    """Check whether EasyOCR model weights exist locally."""
    if not EASYOCR_AVAILABLE:
        return False
    easyocr_dir = Path.home() / ".EasyOCR" / "model"
    if not easyocr_dir.is_dir():
        return False
    pth_files = list(easyocr_dir.glob("*.pth"))
    return len(pth_files) >= 2


def create_blank_image(width: int = 300, height: int = 150, color: str = "white") -> bytes:
    """Create raw PNG bytes for a solid colored image."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_text_image(text: str = "SBI KYC UPDATE", width: int = 400, height: int = 120) -> bytes:
    """Create raw PNG bytes with rendered text."""
    img = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((20, 40), text, fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.skipif(not EASYOCR_AVAILABLE, reason="easyocr is not installed")
def test_white_image_raises_no_text_found():
    """A white image with no text raises NoTextFound."""
    white_img_bytes = create_blank_image(300, 150, "white")
    ocr = get_ocr()
    if not ocr.ready or not ocr_models_downloaded():
        # If models are not downloaded, mock the reader to return empty results
        # while still exercising the full image preprocessing pipeline
        ocr_test = OCRService(auto_load=False)
        ocr_test.ready = True
        mock_reader = MagicMock()
        mock_reader.readtext.return_value = []
        ocr_test.reader = mock_reader
        with pytest.raises(NoTextFound, match="We couldn't read any text in this screenshot."):
            ocr_test.read_image(white_img_bytes)
    else:
        with pytest.raises(NoTextFound, match="We couldn't read any text in this screenshot."):
            ocr.read_image(white_img_bytes)


@pytest.mark.skipif(not EASYOCR_AVAILABLE, reason="easyocr is not installed")
def test_image_with_kyc_text_returns_kyc():
    """An image containing 'SBI KYC UPDATE' returns text containing 'KYC' (case-insensitive)."""
    if not ocr_models_downloaded():
        pytest.skip("EasyOCR models are not downloaded")

    img_bytes = create_text_image("SBI KYC UPDATE", 500, 150)
    ocr = get_ocr()
    assert ocr.ready, f"OCRService failed to load: {ocr.error}"
    
    extracted_text = ocr.read_image(img_bytes)
    assert "kyc" in extracted_text.lower(), f"Expected 'KYC' in extracted text, got: {extracted_text}"


@pytest.mark.skipif(not EASYOCR_AVAILABLE, reason="easyocr is not installed")
def test_corrupt_image_raises_value_error():
    """Corrupt or non-image bytes raise ValueError('unreadable image')."""
    ocr_test = OCRService(auto_load=False)
    ocr_test.ready = True
    ocr_test.reader = MagicMock()
    with pytest.raises(ValueError, match="unreadable image"):
        ocr_test.read_image(b"not_an_image_random_bytes")
