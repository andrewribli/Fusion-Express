"""Generate GraceRun activation-crisis strategy brief as PDF + DOCX."""
from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from reportlab.lib.colors import HexColor, black
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "GraceRun-Strategy-Brief-Activation-Crisis.pdf"
DOCX_PATH = ROOT / "GraceRun-Strategy-Brief-Activation-Crisis.docx"
MD_PATH = ROOT / "docs" / "GraceRun-Strategy-Brief-Activation-Crisis.md"

INK = HexColor("#111111")
MUTED = HexColor("#444444")
RULE = HexColor("#CCCCCC")

MARKDOWN = """# GraceRun Strategy Brief: The Activation Crisis

**To:** Duc  
**From:** Andrew (Founder)

## 1. Company Context

GraceRun is a peer-to-peer delivery marketplace for CUHK students. We deliver Fusion groceries and campus canteen food directly to dorm lobbies. Our runners are fellow CUHK students.

- **Current status:** CUHK only. Web app is live. iOS app is in TestFlight.
- **Pricing:** HK$5–20 delivery fee + small platform fee. Pay after delivery.
- **The Founder:** Andrew (Solo technical founder handling all code, ops, and marketing).

## 2. The Problem

We have a massive activation crisis. We have exactly **31 signups**, and only **1 person** has placed an organic order (and she ordered via WhatsApp, not the app). The other 30 users signed up, looked around, and ghosted.

## 3. Your Assignment

Treat this like a case competition or an exam question. Assume I (the founder) can build whatever tech you need. I want to see how you think about users, incentives, and growth. Review the attached Excel sheet (`master-customers-duc.csv` / `master-customers.xlsx`) to see our user data.

Please answer these 4 questions in a **1-page memo**:

### A. The Customer Audit
Go to https://www.gracerun.fit and try to place an order as if you were a CUHK student. Note down any friction, confusion, or missing features you experience as a customer.

### B. The Diagnosis
Look at the user data in the spreadsheet. Why do you think 30 out of 31 people signed up but didn't order? Give me your top 3 hypotheses based on the data.

### C. The Strategy
If you had full control of GraceRun's business operations for the next 14 days, what is the ONE thing you would do to get these users to place their first order?

### D. The Execution
Give me the exact WhatsApp/Instagram DM script you would send to these users, and what incentive (if any) you would offer them to order.

---

Please write up your thoughts in a 1-page memo and let's discuss on Friday.
"""


def set_run_font(run, *, bold=False, size=11, color=None):
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = "Calibri"
    if color is not None:
        run.font.color.rgb = color


def add_mixed_paragraph(doc, text: str, *, style=None, bold_all=False, size=11, space_after=6):
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(0)
    if bold_all:
        run = p.add_run(text)
        set_run_font(run, bold=True, size=size)
        return p
    parts = text.split("**")
    for i, part in enumerate(parts):
        if not part:
            continue
        run = p.add_run(part)
        set_run_font(run, bold=(i % 2 == 1), size=size)
    return p


def build_docx():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)

    title = doc.add_heading("GraceRun Strategy Brief: The Activation Crisis", level=1)
    for run in title.runs:
        run.font.name = "Calibri"
        run.font.color.rgb = RGBColor(0x11, 0x11, 0x11)
    title.paragraph_format.space_after = Pt(4)

    meta = doc.add_paragraph()
    meta.paragraph_format.space_after = Pt(12)
    r = meta.add_run("To: ")
    set_run_font(r, bold=True)
    r = meta.add_run("Duc")
    set_run_font(r)
    r = meta.add_run("    ")
    set_run_font(r)
    r = meta.add_run("From: ")
    set_run_font(r, bold=True)
    r = meta.add_run("Andrew (Founder)")
    set_run_font(r)

    doc.add_heading("1. Company Context", level=2)
    add_mixed_paragraph(
        doc,
        "GraceRun is a peer-to-peer delivery marketplace for CUHK students. "
        "We deliver Fusion groceries and campus canteen food directly to dorm lobbies. "
        "Our runners are fellow CUHK students.",
    )
    for bullet in [
        "**Current status:** CUHK only. Web app is live. iOS app is in TestFlight.",
        "**Pricing:** HK$5–20 delivery fee + small platform fee. Pay after delivery.",
        "**The Founder:** Andrew (Solo technical founder handling all code, ops, and marketing).",
    ]:
        add_mixed_paragraph(doc, bullet, style="List Bullet", space_after=2)

    doc.add_heading("2. The Problem", level=2)
    add_mixed_paragraph(
        doc,
        "We have a massive activation crisis. We have exactly **31 signups**, and only "
        "**1 person** has placed an organic order (and she ordered via WhatsApp, not the app). "
        "The other 30 users signed up, looked around, and ghosted.",
    )

    doc.add_heading("3. Your Assignment", level=2)
    add_mixed_paragraph(
        doc,
        "Treat this like a case competition or an exam question. Assume I (the founder) can "
        "build whatever tech you need. I want to see how you think about users, incentives, "
        "and growth. Review the attached Excel sheet (**master-customers-duc.csv** / "
        "**master-customers.xlsx**) to see our user data.",
    )
    add_mixed_paragraph(
        doc,
        "Please answer these 4 questions in a **1-page memo**:",
    )

    add_mixed_paragraph(doc, "A. The Customer Audit", bold_all=True, space_after=2)
    add_mixed_paragraph(
        doc,
        "Go to https://www.gracerun.fit and try to place an order as if you were a CUHK student. "
        "Note down any friction, confusion, or missing features you experience as a customer.",
    )

    add_mixed_paragraph(doc, "B. The Diagnosis", bold_all=True, space_after=2)
    add_mixed_paragraph(
        doc,
        "Look at the user data in the spreadsheet. Why do you think 30 out of 31 people signed "
        "up but didn't order? Give me your top 3 hypotheses based on the data.",
    )

    add_mixed_paragraph(doc, "C. The Strategy", bold_all=True, space_after=2)
    add_mixed_paragraph(
        doc,
        "If you had full control of GraceRun's business operations for the next 14 days, what is "
        "the ONE thing you would do to get these users to place their first order?",
    )

    add_mixed_paragraph(doc, "D. The Execution", bold_all=True, space_after=2)
    add_mixed_paragraph(
        doc,
        "Give me the exact WhatsApp/Instagram DM script you would send to these users, and what "
        "incentive (if any) you would offer them to order.",
    )

    add_mixed_paragraph(
        doc,
        "Please write up your thoughts in a 1-page memo and let's discuss on Friday.",
        space_after=0,
    )

    doc.save(DOCX_PATH)
    print(f"Wrote {DOCX_PATH}")


def build_pdf():
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BriefTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=INK,
        spaceAfter=6,
        spaceBefore=0,
    )
    meta_style = ParagraphStyle(
        "BriefMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=MUTED,
        spaceAfter=14,
    )
    h2 = ParagraphStyle(
        "BriefH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=INK,
        spaceBefore=12,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "BriefBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=INK,
        spaceAfter=6,
        alignment=TA_LEFT,
    )
    bullet_style = ParagraphStyle(
        "BriefBullet",
        parent=body,
        leftIndent=0,
        spaceAfter=2,
    )
    q_title = ParagraphStyle(
        "QTitle",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        spaceBefore=8,
        spaceAfter=2,
    )
    closing = ParagraphStyle(
        "Closing",
        parent=body,
        spaceBefore=14,
        fontName="Helvetica-Oblique",
        textColor=MUTED,
    )

    story = []
    story.append(Paragraph("GraceRun Strategy Brief: The Activation Crisis", title_style))
    story.append(
        Paragraph(
            "<b>To:</b> Duc &nbsp;&nbsp;&nbsp; <b>From:</b> Andrew (Founder)",
            meta_style,
        )
    )

    story.append(Paragraph("1. Company Context", h2))
    story.append(
        Paragraph(
            "GraceRun is a peer-to-peer delivery marketplace for CUHK students. "
            "We deliver Fusion groceries and campus canteen food directly to dorm lobbies. "
            "Our runners are fellow CUHK students.",
            body,
        )
    )
    bullets = [
        "<b>Current status:</b> CUHK only. Web app is live. iOS app is in TestFlight.",
        "<b>Pricing:</b> HK$5–20 delivery fee + small platform fee. Pay after delivery.",
        "<b>The Founder:</b> Andrew (Solo technical founder handling all code, ops, and marketing).",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(b, bullet_style), leftIndent=12, bulletColor=INK) for b in bullets],
            bulletType="bullet",
            start="•",
            leftIndent=18,
            bulletFontName="Helvetica",
            bulletFontSize=10,
            spaceBefore=2,
            spaceAfter=4,
        )
    )

    story.append(Paragraph("2. The Problem", h2))
    story.append(
        Paragraph(
            "We have a massive activation crisis. We have exactly <b>31 signups</b>, and only "
            "<b>1 person</b> has placed an organic order (and she ordered via WhatsApp, not the app). "
            "The other 30 users signed up, looked around, and ghosted.",
            body,
        )
    )

    story.append(Paragraph("3. Your Assignment", h2))
    story.append(
        Paragraph(
            "Treat this like a case competition or an exam question. Assume I (the founder) can "
            "build whatever tech you need. I want to see how you think about users, incentives, "
            "and growth. Review the attached Excel sheet "
            "(<b>master-customers-duc.csv</b> / <b>master-customers.xlsx</b>) to see our user data.",
            body,
        )
    )
    story.append(
        Paragraph(
            "Please answer these 4 questions in a <b>1-page memo</b>:",
            body,
        )
    )

    story.append(Paragraph("A. The Customer Audit", q_title))
    story.append(
        Paragraph(
            "Go to <link href='https://www.gracerun.fit' color='#111111'>"
            "https://www.gracerun.fit</link> and try to place an order as if you were a CUHK "
            "student. Note down any friction, confusion, or missing features you experience "
            "as a customer.",
            body,
        )
    )

    story.append(Paragraph("B. The Diagnosis", q_title))
    story.append(
        Paragraph(
            "Look at the user data in the spreadsheet. Why do you think 30 out of 31 people "
            "signed up but didn't order? Give me your top 3 hypotheses based on the data.",
            body,
        )
    )

    story.append(Paragraph("C. The Strategy", q_title))
    story.append(
        Paragraph(
            "If you had full control of GraceRun's business operations for the next 14 days, "
            "what is the ONE thing you would do to get these users to place their first order?",
            body,
        )
    )

    story.append(Paragraph("D. The Execution", q_title))
    story.append(
        Paragraph(
            "Give me the exact WhatsApp/Instagram DM script you would send to these users, "
            "and what incentive (if any) you would offer them to order.",
            body,
        )
    )

    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "Please write up your thoughts in a 1-page memo and let's discuss on Friday.",
            closing,
        )
    )

    doc.build(story)
    print(f"Wrote {PDF_PATH}")


def write_markdown():
    MD_PATH.parent.mkdir(parents=True, exist_ok=True)
    MD_PATH.write_text(MARKDOWN.strip() + "\n", encoding="utf-8")
    print(f"Wrote {MD_PATH}")


if __name__ == "__main__":
    write_markdown()
    build_docx()
    build_pdf()
