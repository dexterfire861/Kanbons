#!/usr/bin/env python3
"""Run Docling OCR on a PO and print everything it found.

    .venv/bin/python PO-ingestion/ocr.py
    .venv/bin/python PO-ingestion/ocr.py "training_data/B084-035 Kanbons PO-1.pdf"
    .venv/bin/python PO-ingestion/ocr.py --all training_data
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, RapidOcrOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT_DIR = ROOT / "data" / "po_eval"


def make_converter() -> DocumentConverter:
    options = PdfPipelineOptions()
    options.do_ocr = True
    options.ocr_options = RapidOcrOptions()
    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
    )


def ocr_document(path: Path, converter: DocumentConverter | None = None):
    converter = converter or make_converter()
    return converter.convert(str(path))


def document_dump(result) -> dict:
    doc = result.document
    tables = []
    for index, table in enumerate(doc.tables, start=1):
        grid = table.export_to_dataframe().to_dict(orient="records")
        tables.append({"index": index, "rows": grid})
    return {
        "status": str(getattr(result, "status", "")),
        "pages": len(getattr(doc, "pages", {}) or []),
        "markdown": doc.export_to_markdown(),
        "text": doc.export_to_text(),
        "tables": tables,
        "json": doc.export_to_dict(),
    }


def show_dump(dump: dict) -> None:
    print(f"status: {dump['status']}  pages: {dump['pages']}")
    print("\n===== MARKDOWN =====\n")
    print(dump["markdown"])
    print("\n===== TABLES =====\n")
    if not dump["tables"]:
        print("(none)")
    for table in dump["tables"]:
        print(f"--- table {table['index']} ---")
        print(json.dumps(table["rows"], indent=2))
        print()
    print("\n===== TEXT =====\n")
    print(dump["text"])


def save_dump(path: Path, dump: dict) -> Path:
    dest = OUT_DIR / path.stem
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "ocr.md").write_text(dump["markdown"] + "\n")
    (dest / "ocr.txt").write_text(dump["text"] + "\n")
    (dest / "ocr.json").write_text(json.dumps(dump["json"], indent=2) + "\n")
    (dest / "tables.json").write_text(json.dumps(dump["tables"], indent=2) + "\n")
    return dest


def run(path: Path, converter: DocumentConverter | None = None) -> dict:
    result = ocr_document(path, converter)
    dump = document_dump(result)
    dest = save_dump(path, dump)
    print(f"\n{path.name}")
    show_dump(dump)
    print(f"\nsaved {dest}")
    return dump


def main(argv: list[str]) -> int:
    converter = make_converter()
    if len(argv) >= 2 and argv[1] == "--all":
        folder = Path(argv[2]) if len(argv) > 2 else ROOT / "training_data"
        pdfs = sorted(folder.glob("*.pdf"))
        if not pdfs:
            sys.stderr.write(f"No PDFs in {folder}\n")
            return 2
        for pdf in pdfs:
            run(pdf, converter)
        return 0
    source = (
        Path(argv[1])
        if len(argv) > 1
        else ROOT / "training_data" / "B084-035 Kanbons PO-1.pdf"
    )
    if not source.is_file():
        sys.stderr.write(f"File not found: {source}\n")
        return 2
    run(source, converter)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
