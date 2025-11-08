# LocalCloud Python Service

Python microservice for advanced file processing and analysis.

## Features

- **Image Processing**: Thumbnail generation, metadata extraction, dimension detection
- **Document Analysis**: Text extraction from PDFs and DOCX files
- **Duplicate Detection**: Perceptual image hashing for finding duplicate images
- **File Metadata**: MIME type detection, EXIF data extraction
- **Comprehensive Analysis**: Combined analysis of files with intelligent processing

## Tech Stack

- FastAPI for REST API
- Pillow for image processing
- PyPDF2 for PDF text extraction
- python-docx for Word document processing
- python-magic for file type detection
- imagehash for duplicate image detection

## API Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `POST /api/thumbnail` - Generate image thumbnails
- `POST /api/metadata` - Extract file metadata
- `POST /api/extract-text/pdf` - Extract text from PDF
- `POST /api/extract-text/docx` - Extract text from DOCX
- `POST /api/image-hash` - Calculate perceptual hash for images
- `POST /api/analyze-file` - Comprehensive file analysis

## Setup

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Run the service:

```bash
python main.py
```

The service will start on `http://localhost:8000`

## Integration

This service is optional and enhances the Node.js backend with advanced file processing capabilities. The main application works perfectly fine without it, but when running, it provides additional features for file analysis and processing.

