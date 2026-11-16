"""Export strategy brief MD -> DOCX and master-customers CSV -> XLSX."""
from __future__ import annotations

import csv
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.shared import Inches, Pt
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "master-customers.csv"
DOCX_PATH = ROOT / "GraceRun-Strategy-Brief-Activation-Crisis.docx"
XLSX_PATH = ROOT / "master-customers.xlsx"


def set_run_font(run, *, bold=False, size=11):
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = "Calibri"


def add_mixed_paragraph(doc, text: str, *, style=None, bold_all=False):
    """Add a paragraph supporting **bold** segments."""
    p = doc.add_paragraph(style=style)
    if bold_all:
        run = p.add_run(text)
        set_run_font(run, bold=True)
        return p

    parts = text.split("**")
    for i, part in enumerate(parts):
        if not part:
            continue
        run = p.add_run(part)
        set_run_font(run, bold=(i % 2 == 1))
    return p


def set_cell_shading(cell, fill: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def build_docx():
    doc = Document()

    section = doc.sections[0]
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    intro = doc.add_paragraph()
    run = intro.add_run(
        "Hi Duc — strategy brief for Friday. Read this and bring a 1-page memo."
    )
    set_run_font(run)

    title = doc.add_heading("GraceRun Strategy Brief: The Activation Crisis", level=1)
    for run in title.runs:
        run.font.name = "Calibri"

    # --- 1 ---
    doc.add_heading("1. Company Context", level=2)
    add_mixed_paragraph(
        doc,
        "**GraceRun** is a peer-to-peer delivery marketplace for CUHK students. "
        "We deliver Fusion groceries and campus canteen food (Paper & Coffee, SoraZen, etc.) "
        "directly to dorm lobbies. Our runners are fellow CUHK students.",
    )
    for bullet in [
        "**Current status:** CUHK only. Web app is live. iOS app is in TestFlight.",
        "**The Founder:** Andrew (Solo technical founder handling all code, ops, and marketing).",
        "**Pricing:** HK$5–20 delivery fee + small platform fee. Pay after delivery.",
    ]:
        add_mixed_paragraph(doc, bullet, style="List Bullet")

    # --- 2 ---
    doc.add_heading("2. The Problem", level=2)
    add_mixed_paragraph(doc, "We have a massive activation crisis.")
    add_mixed_paragraph(
        doc,
        "We have exactly **31 signups**. Out of those 31, only **1 person** has placed an organic order. "
        "(I basically forced a second person to order just to test the system). "
        "The other 29 users signed up, looked around, and ghosted.",
    )

    # --- 3 ---
    doc.add_heading("3. The Data", level=2)
    add_mixed_paragraph(
        doc,
        "I have attached our raw user data below. It shows their names, signup dates, and order counts.",
    )

    # --- 4 ---
    doc.add_heading("4. Your Assignment", level=2)
    add_mixed_paragraph(
        doc,
        "Treat this like a case competition or an exam question. Assume I (the founder) can build whatever "
        "tech you need. I want to see how you think about users, incentives, and growth.",
    )
    add_mixed_paragraph(doc, "Please answer these 4 questions:")

    add_mixed_paragraph(doc, "A. The Customer Audit:", bold_all=True)
    add_mixed_paragraph(
        doc,
        "Go to https://www.gracerun.fit and try to place an order as if you were a CUHK student. "
        "Note down any friction, confusion, or missing features you experience as a customer.",
    )

    add_mixed_paragraph(doc, "B. The Diagnosis:", bold_all=True)
    add_mixed_paragraph(
        doc,
        "Look at the user data below. Why do you think 30 out of 31 people signed up but didn't order? "
        "Give me your top 3 hypotheses.",
    )

    add_mixed_paragraph(doc, "C. The Strategy:", bold_all=True)
    add_mixed_paragraph(
        doc,
        "If you had full control of GraceRun's business operations for the next 14 days, what is the ONE thing "
        "you would do to get these 31 people to place their first order?",
    )

    add_mixed_paragraph(doc, "D. The Execution:", bold_all=True)
    add_mixed_paragraph(
        doc,
        "Give me the exact WhatsApp/Instagram DM script you would send to these users, and what incentive "
        "(if any) you would offer them to order.",
    )

    add_mixed_paragraph(
        doc,
        "Please write up your thoughts in a 1-page memo and let's discuss on Friday.",
    )

    # --- 5 ---
    doc.add_heading("5. The User Data", level=2)

    headers = ["Name", "Email", "Signup Date", "Total Orders", "Last Order Date"]
    rows = [
        ["App Review Team", "reviewer@gracerun.fit", "2026-10-05", "3", "2026-09-30"],
        ["a", "1155229677@link.cuhk.edu.hk", "2026-09-05", "1", "2026-09-05"],
        ["Andrew Ribli", "1155233599@link.cuhk.edu.hk", "2026-09-30", "1", "2026-10-03"],
        ["Kailamae Sands", "1155284119@link.cuhk.edu.hk", "2026-09-14", "1", "2026-09-14"],
        ["", "1155217885@link.cuhk.edu.hk", "", "0", ""],
        ["", "1155275506@link.cuhk.edu.hk", "", "0", ""],
        ["Abdullah Al Fahad", "1155197848@link.cuhk.edu.hk", "2026-08-28", "0", ""],
        ["Alice Xu", "1155233276@link.cuhk.edu.hk", "2026-10-02", "0", ""],
        ["Andrew Demo", "andrew.demo@gracerun.fit", "2026-10-03", "0", ""],
        ["Carissa Bella Alfiani", "1155272740@link.cuhk.edu.hk", "2026-09-30", "0", ""],
        ["Carla Edlyn", "1155243788@link.cuhk.edu.hk", "2026-09-15", "0", ""],
        ["Demo Student", "demo@gracerun.fit", "2026-10-01", "0", ""],
        ["Do Tri Duc", "1155273889@link.cuhk.edu.hk", "2026-09-17", "0", ""],
        ["Ela", "1155259344@link.cuhk.edu.hk", "2026-10-01", "0", ""],
        ["Evelyn Yu", "1155285210@link.cuhk.edu.hk", "2026-10-25", "0", ""],
        ["Felix Halley Thamin", "1155281023@link.cuhk.edu.hk", "2026-09-13", "0", ""],
        ["Gwenn Qiu", "1155270894@link.cuhk.edu.hk", "2026-09-30", "0", ""],
        ["James Wijaya", "1155199298@link.cuhk.edu.hk", "2026-10-01", "0", ""],
        ["Jennifer Kurniawan", "1155250491@link.cuhk.edu.hk", "2026-09-15", "0", ""],
        ["Josephine Viane Wijaya", "1155251153@link.cuhk.edu.hk", "2026-10-08", "0", ""],
        ["Katerina Ge", "1155275685@link.cuhk.edu.hk", "2026-10-25", "0", ""],
        ["Maywa", "1155270243@link.cuhk.edu.hk", "2026-10-21", "0", ""],
        ["Michael R", "1155228559@link.cuhk.edu.hk", "2026-09-13", "0", ""],
        ["NGUYEN Binh Minh", "1155277035@link.cuhk.edu.hk", "2026-09-18", "0", ""],
        ["Nour Alabdullah", "1155279566@link.cuhk.edu.hk", "2026-10-01", "0", ""],
        ["Swarnima Pandey", "1155282938@link.cuhk.edu.hk", "2026-09-08", "0", ""],
        ["Teddy Tang", "1155284879@link.cuhk.edu.hk", "2026-10-11", "0", ""],
        ["Varo", "1155279416@link.cuhk.edu.hk", "2026-10-01", "0", ""],
    ]

    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"

    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                set_run_font(run, bold=True, size=9)
        set_cell_shading(cell, "E8E8E8")

    for r_idx, row in enumerate(rows, start=1):
        for c_idx, val in enumerate(row):
            cell = table.rows[r_idx].cells[c_idx]
            cell.text = val
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    set_run_font(run, size=9)

    footnote = doc.add_paragraph()
    run = footnote.add_run(
        "Footnote: Section 2 keeps Andrew’s stated 31 / 1 organic narrative. "
        "Export from Firestore (campus === cuhk) currently returns 28 user rows above "
        "(CityU users excluded)."
    )
    set_run_font(run, size=9)
    run.italic = True

    doc.save(DOCX_PATH)
    return DOCX_PATH


def build_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Customers"

    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    for r_idx, row in enumerate(rows, start=1):
        for c_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=value)
            if r_idx == 1:
                cell.font = Font(bold=True)
            elif c_idx == 4 and value != "":
                try:
                    cell.value = int(value)
                except ValueError:
                    pass

    ws.freeze_panes = "A2"

    for col in range(1, len(rows[0]) + 1):
        letter = get_column_letter(col)
        max_len = max(len(str(ws.cell(row=r, column=col).value or "")) for r in range(1, len(rows) + 1))
        ws.column_dimensions[letter].width = min(max(max_len + 2, 12), 40)

    wb.save(XLSX_PATH)
    data_rows = len(rows) - 1
    preview = rows[:4]  # header + first 3 data
    return XLSX_PATH, data_rows, len(rows), preview


if __name__ == "__main__":
    docx_path = build_docx()
    xlsx_path, data_rows, total_rows, preview = build_xlsx()
    print(f"DOCX: {docx_path}")
    print(f"XLSX: {xlsx_path}")
    print(f"XLSX data rows (excl header): {data_rows}")
    print(f"XLSX total rows (incl header): {total_rows}")
    print("First 3 data rows:")
    for row in preview[1:4]:
        print(row)
