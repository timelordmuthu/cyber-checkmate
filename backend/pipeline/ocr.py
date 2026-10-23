"""OCR service for extracting text from screenshot images (PRD FR5, 16.6).

Privacy constraint (NFR4):
- Never save uploaded images or screenshot bytes to disk.
- Never log extracted text or screenshot contents.
"""

from __future__ import annotations

import io
from typing import Any

import numpy as np
from PIL import Image, ImageOps


class NoTextFound(ValueError):
    """Raised when an image contains no readable text or fewer than 3 letters."""
    pass


class OCRService:
    """Manages EasyOCR Reader and image preprocessing for OCR."""

    def __init__(self, auto_load: bool = True) -> None:
        self.reader: Any = None
        self.ready: bool = False
        self.error: Exception | None = None
        if auto_load:
            self.load()

    def load(self) -> None:
        """Initialize EasyOCR reader for ['en', 'hi'] on CPU once. Never crashes."""
        if self.ready and self.reader is not None:
            return
        try:
            import easyocr
            self.reader = easyocr.Reader(["en", "hi"], gpu=False)
            self.ready = True
            self.error = None
        except Exception as e:
            self.reader = None
            self.ready = False
            self.error = e

    def read_image(self, data: bytes) -> str:
        """Extract text from screenshot image bytes.
        
        Args:
            data: Raw bytes of the image file.
            
        Returns:
            Extracted text joined by newlines.
            
        Raises:
            ValueError: If the image cannot be decoded ("unreadable image").
            NoTextFound: If fewer than 3 letters are detected.
            RuntimeError: If the OCR engine is not ready.
        """
        if not self.ready:
            if self.reader is None and self.error is None:
                self.load()
            if not self.ready:
                if self.error is not None:
                    raise RuntimeError(f"OCR service is not ready: {self.error}")
                raise RuntimeError("OCR service is not ready")

        # 1. Open with PIL; raise ValueError("unreadable image") if it fails
        try:
            img = Image.open(io.BytesIO(data))
            img.load()
        except Exception as exc:
            raise ValueError("unreadable image") from exc

        # 2. Convert to RGB; if max(width, height) > 1600, resize keeping aspect ratio
        img = img.convert("RGB")
        w, h = img.size
        max_dim = max(w, h)
        if max_dim > 1600:
            scale = 1600.0 / max_dim
            if w >= h:
                new_w = 1600
                new_h = max(1, int(round(h * scale)))
            else:
                new_h = 1600
                new_w = max(1, int(round(w * scale)))
            resample = getattr(Image, "Resampling", Image).LANCZOS
            img = img.resize((new_w, new_h), resample=resample)

        # 3. Convert to grayscale ("L"); if mean pixel value < 100, invert (dark mode)
        img = img.convert("L")
        arr = np.array(img)
        if float(arr.mean()) < 100.0:
            img = ImageOps.invert(img)
            arr = np.array(img)

        # 4. Run reader.readtext; join results with "\n"
        results = self.reader.readtext(arr, detail=0, paragraph=True)
        joined_text = "\n".join(str(r) for r in results).strip()

        # 5. Check if joined text has fewer than 3 letters
        letter_count = sum(1 for c in joined_text if c.isalpha())
        if letter_count < 3:
            raise NoTextFound("We couldn't read any text in this screenshot.")

        return joined_text


_OCR_SERVICE: OCRService | None = None


def get_ocr() -> OCRService:
    """Return the shared module-level OCRService singleton."""
    global _OCR_SERVICE
    if _OCR_SERVICE is None:
        _OCR_SERVICE = OCRService(auto_load=True)
    return _OCR_SERVICE


def read_image(data: bytes) -> str:
    """Extract text from screenshot image bytes using the shared OCRService."""
    return get_ocr().read_image(data)
