"""Build the Quality Department guide PDF for the inspector survey.

Written for QC staff on the factory floor: short sentences, one instruction per line,
no jargon. The single most important message is that the survey must be filled in
BEFORE the inspector leaves, because there is no reminder.

Regenerate whenever the question set changes (see ../questions.js — a question change also
needs QUESTION_VERSION bumped in worker/worker.js).

    pip3 install reportlab
    python3 inspect/guide/make_guide.py

The QR is generated here from SURVEY_URL, so it can never drift from the live link.
Requires node + npx (for the `qrcode` package).
"""
import os, subprocess, tempfile
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                Image, PageBreak, KeepTogether)

SURVEY_URL = "https://dashboards.saratextiles.com/inspect/s.html"
OUT = os.path.expanduser("~/Downloads/Inspector Survey - Quality Department Guide.pdf")
QR = os.path.join(tempfile.gettempdir(), "stl_guide_qr.png")

subprocess.run(["npx", "--yes", "qrcode", "-t", "png", "-e", "H", "-o", QR, SURVEY_URL], check=True)

NAVY = colors.HexColor("#0f172a")
INDIGO = colors.HexColor("#6366f1")
GREY = colors.HexColor("#64748b")
LIGHT = colors.HexColor("#94a3b8")
LINE = colors.HexColor("#e2e8f0")
AMBER_BG = colors.HexColor("#fffbeb")
AMBER_BD = colors.HexColor("#fde68a")
AMBER_TX = colors.HexColor("#92400e")
PANEL = colors.HexColor("#f8fafc")

def S(name, **kw):
    base = dict(fontName="Helvetica", fontSize=9.5, leading=14, textColor=NAVY, alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(name, **base)

title    = S("title", fontName="Helvetica-Bold", fontSize=20, leading=24, spaceAfter=2)
subtitle = S("subtitle", fontSize=10, textColor=GREY, spaceAfter=14)
h2       = S("h2", fontName="Helvetica-Bold", fontSize=12.5, leading=16, spaceBefore=14, spaceAfter=5)
body     = S("body", spaceAfter=5)
small    = S("small", fontSize=8.5, leading=12, textColor=GREY)
stepno   = S("stepno", fontName="Helvetica-Bold", fontSize=15, textColor=INDIGO)
stephd   = S("stephd", fontName="Helvetica-Bold", fontSize=11.5, leading=15, spaceAfter=3)
warn     = S("warn", fontSize=9.5, leading=14, textColor=AMBER_TX)
cell     = S("cell", fontSize=9, leading=12.5)
cellb    = S("cellb", fontName="Helvetica-Bold", fontSize=9, leading=12.5)

story = []

story.append(Paragraph("Inspector Feedback Survey", title))
story.append(Paragraph("A guide for the Quality Department &nbsp;&bull;&nbsp; Sara Textiles Limited, Nalagarh", subtitle))

story.append(Paragraph(
    "When an external inspector visits our factory, we ask them to rate us. Their feedback goes "
    "straight to management every month. This guide explains what you need to do.", body))
story.append(Paragraph(
    "<b>You do two things:</b> log in, and register the inspector's visit. The inspector fills in the "
    "survey themselves, on their own phone.", body))

# The one rule that matters most.
warn_tbl = Table([[Paragraph(
    "<b>The most important rule:</b> the inspector must fill in the survey <b>before they leave the "
    "factory</b>. No reminder message is sent. Once they walk out of the gate, they will almost "
    "certainly never complete it. Always ask them to do it while they are still standing with you.",
    warn)]], colWidths=[168*mm])
warn_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), AMBER_BG),
    ("BOX", (0,0), (-1,-1), 0.8, AMBER_BD),
    ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
story.append(Spacer(1, 6))
story.append(warn_tbl)

def step(n, head, lines):
    rows = [[Paragraph(str(n), stepno),
             [Paragraph(head, stephd)] + [Paragraph(l, body) for l in lines]]]
    t = Table(rows, colWidths=[11*mm, 157*mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (0,0), 0),
        ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LINEBELOW", (0,0), (-1,-1), 0.5, LINE),
    ]))
    return KeepTogether(t)

story.append(Paragraph("What you do", h2))

story.append(step(1, "Log in", [
    "On any phone or computer, go to: <b>dashboards.saratextiles.com/inspect</b>",
    "Enter your own mobile number and tap <b>Send OTP</b>.",
    "Type the 6-digit code you receive by SMS.",
    "<font color='#64748b'>Only Quality Department numbers can log in here. If it says your number is not "
    "registered, contact Supriya Bhan.</font>",
]))

story.append(step(2, "Register the inspector's visit", [
    "Enter the <b>inspector's mobile number</b> first. If they have visited before, their name and "
    "company fill in by themselves.",
    "Fill in <b>Name</b>, <b>Company</b> (SGS, Intertek, buyer's own QA, etc.) and <b>Buyer</b>. "
    "PO number and email are optional but useful.",
    "Tap <b>Register Visit &amp; Show QR</b>.",
    "<font color='#64748b'>Take the mobile number carefully. If it is wrong, the inspector cannot log in "
    "and the survey is lost.</font>",
]))

story.append(step(3, "Give the inspector the QR card", [
    "Hand them the printed QR card. They scan it with their phone camera.",
    "They log in with <b>the same mobile number you registered</b> and get their own OTP.",
    "Ask them to complete it <b>now</b>, before they leave. It takes about one minute.",
    "<font color='#64748b'>The survey stays open for 72 hours, but in practice they will not do it once "
    "they have left.</font>",
]))

story.append(step(4, "Check it was submitted", [
    "On the same screen, look at <b>Today's visits</b>.",
    "<b>Awaiting</b> means they have not filled it in yet - go and ask them.",
    "<b>Submitted</b> means it is done. Nothing more to do.",
]))

story.append(PageBreak())

# ---------- Page 2 ----------
story.append(Paragraph("What the inspector is asked", h2))
story.append(Paragraph("They rate five things from 1 (very poor) to 5 (excellent):", body))

rate_rows = [
    [Paragraph("<b>About your visit</b>", cellb), Paragraph("", cell)],
    [Paragraph("Hospitality", cell), Paragraph("Reception, facilities and courtesy during the visit", cell)],
    [Paragraph("Co-ordination", cell), Paragraph("How well our team organised and supported the inspection", cell)],
    [Paragraph("<b>About the goods</b>", cellb), Paragraph("", cell)],
    [Paragraph("CTN Stacking", cell), Paragraph("How cartons were stacked and presented", cell)],
    [Paragraph("Packaging", cell), Paragraph("Condition and quality of the packing", cell)],
    [Paragraph("Workmanship", cell), Paragraph("Quality of make-up and finishing of the goods", cell)],
]
rt = Table(rate_rows, colWidths=[42*mm, 126*mm])
rt.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("BACKGROUND", (0,0), (-1,0), PANEL),
    ("BACKGROUND", (0,3), (-1,3), PANEL),
    ("LINEBELOW", (0,0), (-1,-1), 0.4, LINE),
    ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
]))
story.append(rt)
story.append(Spacer(1, 8))
story.append(Paragraph(
    "They also write a comment, and record whether the inspection <b>Passed</b> or <b>Failed</b>. "
    "If they rate anything 3 or below, they must explain why - the system will not let them submit "
    "without a comment.", body))

story.append(Paragraph("If something goes wrong", h2))
tr_rows = [
    [Paragraph("<b>What you see</b>", cellb), Paragraph("<b>What to do</b>", cellb)],
    [Paragraph("Inspector says \"No inspection visit is registered for this number\"", cell),
     Paragraph("You registered a different number. Check it, and register the visit again with the correct one.", cell)],
    [Paragraph("\"A survey is already open for this inspector\"", cell),
     Paragraph("You already registered them today. No need to do it again - just ask them to fill it in.", cell)],
    [Paragraph("Inspector did not get the OTP", cell),
     Paragraph("Wait 30 seconds and tap Resend. Check the number is correct.", cell)],
    [Paragraph("\"Please wait a few seconds before requesting another OTP\"", cell),
     Paragraph("Normal. Wait about half a minute and try again.", cell)],
    [Paragraph("\"Survey expired\"", cell),
     Paragraph("More than 72 hours have passed. Register the visit again if they are still on site.", cell)],
    [Paragraph("Your number is not registered", cell),
     Paragraph("Contact Supriya Bhan to be added to the Quality role.", cell)],
]
tt = Table(tr_rows, colWidths=[74*mm, 94*mm])
tt.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("BACKGROUND", (0,0), (-1,0), PANEL),
    ("LINEBELOW", (0,0), (-1,-1), 0.4, LINE),
    ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
]))
story.append(tt)

story.append(Paragraph("Remember", h2))
for b in [
    "Register <b>every</b> inspector who visits - even if you think they will not fill it in. "
    "We measure how many respond, so a visit you never registered is a visit we cannot count.",
    "Never fill the survey in on the inspector's behalf. The feedback is only worth having if it is theirs.",
    "Ask them to do it before they leave. This is the whole job.",
]:
    story.append(Paragraph("&bull;&nbsp;&nbsp;" + b, body))

# QR block — end of page 2. Sized to fit the space left after "Remember"; if you add
# content above, re-check that this does not orphan onto a third page.
story.append(Spacer(1, 10))
qr_inner = [
    [Image(QR, width=26*mm, height=26*mm),
     [Paragraph("<b>The inspector's link</b>", stephd),
      Paragraph("Inspectors scan this, or type it in:", cell),
      Paragraph("<font name='Courier' size='8.5'><b>dashboards.saratextiles.com/inspect/s.html</b></font>", cell),
      Paragraph("Printed cards come from the <b>QR card</b> button after you log in. Keep a few at the QC desk.", small)]]
]
qt = Table(qr_inner, colWidths=[32*mm, 136*mm])
qt.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("BACKGROUND", (0,0), (-1,-1), PANEL),
    ("BOX", (0,0), (-1,-1), 0.6, LINE),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story.append(qt)

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.5)
    canvas.line(21*mm, 15*mm, 189*mm, 15*mm)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(LIGHT)
    canvas.drawString(21*mm, 10.5*mm, "Sara Textiles Limited  -  Inspector Feedback Survey  -  Quality Department guide")
    canvas.drawRightString(189*mm, 10.5*mm, "Page %d" % doc.page)
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=21*mm, rightMargin=21*mm, topMargin=18*mm, bottomMargin=20*mm,
                        title="Inspector Feedback Survey - Quality Department Guide",
                        author="Sara Textiles Limited")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("written:", OUT)
