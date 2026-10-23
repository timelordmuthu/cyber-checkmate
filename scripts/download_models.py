"""Model downloader for offline capabilities (EasyOCR and future translation models)."""

import sys

# Ensure UTF-8 output encoding for progress bars on Windows (e.g. EasyOCR '\u2588' block)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def download_ocr() -> None:
    """Download and initialize EasyOCR models for English and Hindi."""
    try:
        import easyocr
    except ImportError:
        print("easyocr is not installed. Install it first (pip install easyocr).")
        sys.exit(1)

    print("Downloading / initializing EasyOCR models (['en', 'hi'], gpu=False)...")
    easyocr.Reader(["en", "hi"], gpu=False)
    print("OCR models ready")


def main() -> None:
    download_ocr()


if __name__ == "__main__":
    main()
