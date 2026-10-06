"""
===============================================================================
EduFlow AI - Document & Slide Parser (parser.py)
===============================================================================
WHAT THIS FILE DOES:
1. Opens lecture slide files from the local computer disk (PDF, PPTX, or TXT).
2. Reads every slide or page one by one.
3. Extracts the page number (Slide 1, Slide 2...), the slide title, and the text.
4. Returns a clean list of ParsedPage objects ready for chunking and vector storage.
===============================================================================
"""

import os
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional


class ParsedPage:
    """
    Represents a single page or slide extracted from a course document.
    
    Attributes:
        page_number (int): The 1-indexed slide number (e.g., Slide 1, Slide 2).
        title (str): The main heading or first line of the slide.
        text (str): The complete text body content of the slide.
    """
    def __init__(self, page_number: int, title: str, text: str):
        self.page_number = page_number
        self.title = title
        self.text = text

    def to_dict(self) -> Dict[str, Any]:
        """Converts the parsed page into a standard dictionary."""
        return {
            "page_number": self.page_number,
            "title": self.title,
            "text": self.text
        }


class DocumentParser:
    """
    Main parser class with helper methods to read PDF, PowerPoint (.pptx), and text files.
    """

    @staticmethod
    def parse(file_path: str) -> List[ParsedPage]:
        """
        STEP 1: ENTRY POINT
        Detects the file extension (.pdf, .pptx, or .txt) and calls the correct reader.
        
        Args:
            file_path: Full path on disk (e.g. '.../wwwroot/uploads/pdfs/lecture.pdf')
            
        Returns:
            List[ParsedPage]: List of extracted pages with slide numbers and text.
        """
        # Step 1.1: Verify file actually exists on the hard drive
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found on disk: {file_path}")

        # Step 1.2: Check the file extension
        ext = os.path.splitext(file_path)[1].lower()

        # Step 1.3: Route to the specialized extractor
        if ext == ".pdf":
            return DocumentParser._parse_pdf(file_path)
        elif ext in [".pptx", ".ppt"]:
            return DocumentParser._parse_pptx(file_path)
        else:
            return DocumentParser._parse_text(file_path)

    @staticmethod
    def _parse_pdf(file_path: str) -> List[ParsedPage]:
        """
        STEP 2: PDF EXTRACTOR (Using pypdf)
        Reads Adobe PDF lecture slide decks page-by-page.
        """
        pages: List[ParsedPage] = []
        try:
            from pypdf import PdfReader

            # Step 2.1: Open and decompress the PDF file from disk
            reader = PdfReader(file_path)

            # Step 2.2: Loop through each page in the PDF
            for idx, page in enumerate(reader.pages):
                # Extract raw text from the page stream
                raw_text = page.extract_text() or ""
                clean_text = raw_text.strip()

                # Step 2.3: Determine the slide title from the first non-empty line
                lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
                title = lines[0] if lines else f"Slide {idx + 1}"
                
                # Truncate title if it is excessively long
                if len(title) > 100:
                    title = title[:97] + "..."

                # Step 2.4: Save the slide with its 1-indexed page number
                pages.append(ParsedPage(
                    page_number=idx + 1,
                    title=title,
                    text=clean_text
                ))

        except Exception as e:
            print(f"[DocumentParser] Error reading PDF {file_path}: {e}")

        return pages

    @staticmethod
    def _parse_pptx(file_path: str) -> List[ParsedPage]:
        """
        STEP 3: POWERPOINT PPTX EXTRACTOR (Using native ZIP + XML)
        A .pptx file is internally a zip archive containing XML slide files.
        This parser extracts slide text with zero external dependencies.
        """
        pages: List[ParsedPage] = []
        try:
            # Step 3.1: Open the .pptx file as a ZIP archive
            with zipfile.ZipFile(file_path, "r") as z:
                # Find all slide XML files (e.g., ppt/slides/slide1.xml)
                slide_files = [f for f in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", f)]
                # Sort numerically: slide1.xml, slide2.xml ...
                slide_files.sort(key=lambda x: int(re.search(r"\d+", x).group()))

                # Step 3.2: Parse each slide XML file
                for idx, sfile in enumerate(slide_files):
                    content = z.read(sfile)
                    root = ET.fromstring(content)
                    
                    # Extract text elements (<a:t> tags in PowerPoint XML)
                    text_elements = [
                        elem.text for elem in root.iter()
                        if elem.tag.endswith("}t") and elem.text
                    ]
                    clean_lines = [t.strip() for t in text_elements if t.strip()]
                    title = clean_lines[0] if clean_lines else f"Slide {idx + 1}"
                    if len(title) > 100:
                        title = title[:97] + "..."

                    # Step 3.3: Save as ParsedPage
                    pages.append(ParsedPage(
                        page_number=idx + 1,
                        title=title,
                        text="\n".join(clean_lines)
                    ))

        except Exception as e:
            print(f"[DocumentParser] Error reading PPTX {file_path}: {e}")

        return pages

    @staticmethod
    def _parse_text(file_path: str) -> List[ParsedPage]:
        """
        STEP 4: PLAIN TEXT EXTRACTOR (For .txt and markdown files)
        Splits text by double newlines into logical sections.
        """
        pages: List[ParsedPage] = []
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
            for idx, p in enumerate(paragraphs):
                lines = p.splitlines()
                title = lines[0][:80] if lines else f"Section {idx + 1}"
                pages.append(ParsedPage(
                    page_number=idx + 1,
                    title=title,
                    text=p
                ))

        except Exception as e:
            print(f"[DocumentParser] Error reading text file {file_path}: {e}")

        return pages
