# MediLink AI Backend

The AI-powered medical document processing pipeline for MediLink AI.

## Overview

This FastAPI-based backend implements a 5-layer pipeline to ingest, extract, and analyze medical documents using Google Gemini 2.0 Flash.

1. **Ingestion:** Receives document uploads (`multipart/form-data`), validates MIME types/sizes, and creates a placeholder in Supabase.
2. **Extraction:** Uses [Kreuzberg](https://github.com/Goldziher/kreuzberg) (with pypdf fallback) to extract plain text, tables, and page layout from raw bytes.
3. **Preprocessing:** Cleans OCR noise, normalizes medical terms, and deduplicates headers/footers.
4. **LLM Reasoning:** Sends the cleaned document to Gemini to extract structured JSON data (conditions, medications, lab results).
5. **Persistence:** Uploads the raw file to Supabase Storage, saves the JSON to `ai_analysis_results`, flattens lab results into `extracted_medical_values`, updates the user's `profile`, and dispatches a notification.

## Setup

1. **Prerequisites:** Python 3.11+
2. **Install dependencies:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   ```
3. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your Supabase and Gemini credentials.
   ```bash
   cp .env.example .env
   ```

## Running the Server

Start the FastAPI development server:
```bash
uvicorn app.main:app --reload --port 8000
```
API Documentation will be available at: http://localhost:8000/docs

## Running Tests

Install development dependencies and run `pytest`:
```bash
pip install -e ".[dev]"
pytest
```
