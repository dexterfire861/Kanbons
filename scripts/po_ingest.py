from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, RapidOcrOptions, TesseractOcrOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = True

# Option A: RapidOCR with ONNX runtime (Great for CJK & multilingual)
pipeline_options.ocr_options = RapidOcrOptions()

converter = DocumentConverter(
    format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)}
)

source = "training_data/B084-035 Kanbons PO-1.pdf" # Local path or URL
result = converter.convert(source)

# Export to Markdown
markdown_output = result.document.export_to_markdown()
print(markdown_output[:500])