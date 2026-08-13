import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

output_dir = r"c:\Users\Aryan Saini\Documents\Git Projects\MediLink-AI\med_docs"
os.makedirs(output_dir, exist_ok=True)

styles = getSampleStyleSheet()

header_title_style = ParagraphStyle(
    'HeaderTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=14,
    leading=18,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#0f172a')
)

header_sub_style = ParagraphStyle(
    'HeaderSub',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=12,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#475569')
)

doc_type_style = ParagraphStyle(
    'DocType',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=16,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#0284c7')
)

sec_title_style = ParagraphStyle(
    'SecTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=colors.HexColor('#0f172a')
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=colors.HexColor('#334155')
)

bold_body_style = ParagraphStyle(
    'BoldBodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=13,
    textColor=colors.HexColor('#0f172a')
)

table_header_style = ParagraphStyle(
    'TableHeader',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=8.5,
    leading=11,
    textColor=colors.white
)

table_cell_style = ParagraphStyle(
    'TableCell',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor('#1e293b')
)

note_style = ParagraphStyle(
    'NoteText',
    parent=styles['Normal'],
    fontName='Helvetica-Oblique',
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor('#475569')
)

def create_patient_info_table():
    data = [
        [
            Paragraph("<b>Patient Name:</b> Rahul Sharma", body_style),
            Paragraph("<b>UHID:</b> ML-100231", body_style),
        ],
        [
            Paragraph("<b>Age / Gender:</b> 29 Years / Male", body_style),
            Paragraph("<b>Blood Group:</b> B+", body_style),
        ],
        [
            Paragraph("<b>DOB:</b> 18 Mar 1997", body_style),
            Paragraph("<b>Contact:</b> +91 98765 43210", body_style),
        ]
    ]
    t = Table(data, colWidths=[260, 260])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t

def make_doc_flow(doc_id):
    story = []

    # ── Doctor 1: Dr. Ananya Roy (Cardiology & Internal Medicine)
    if doc_id in (1, 3, 4, 9):
        clinic = "CITY CARE HOSPITAL & HEART WELLNESS INSTITUTE"
        sub = "124 Healthcare Boulevard, New Delhi | Ph: +91 11 4982 1000 | Reg. No: MCI-2018-94821"
        doctor = "Dr. Ananya Roy, M.D. (Internal Medicine & Cardiology)"
    # ── Doctor 2: Dr. Vikram Patel (Endocrinology & Diabetology)
    elif doc_id in (5, 6, 10):
        clinic = "LIFECARE DIABETES & ENDOCRINE CENTRE"
        sub = "45 Diabetes Plaza, Green Park, New Delhi | Ph: +91 11 2651 8800 | Reg. No: MCI-2015-48192"
        doctor = "Dr. Vikram Patel, M.D. (Endocrinology & Diabetology)"
    # ── Doctor 3: Dr. Rajesh Malhotra (Orthopedics & Joint Replacement)
    elif doc_id in (7, 8):
        clinic = "METRO ORTHOPEDIC & SPINE CENTRE"
        sub = "88 Spine Enclave, Ring Road, New Delhi | Ph: +91 11 4102 9900 | Reg. No: MCI-2012-33910"
        doctor = "Dr. Rajesh Malhotra, M.S. (Orthopedics & Joint Replacement)"
    # ── Diagnostics Lab: Dr. S. K. Mehta
    else:
        clinic = "PRECISION DIAGNOSTICS & PATHOLOGY LAB"
        sub = "ISO 9001:2015 Accredited | 12 Diagnostic Tower, New Delhi | License: LAB-98214"
        doctor = "Dr. S. K. Mehta, M.D. (Pathology) | Ref: Dr. Ananya Roy, M.D."

    story.append(Paragraph(clinic, header_title_style))
    story.append(Paragraph(sub, header_sub_style))
    story.append(Paragraph(f"<b>Attending Physician:</b> {doctor}", ParagraphStyle('DocHeader', parent=header_sub_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#0284c7'))))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceAfter=8))

    # Document Titles & Content based on doc_id
    if doc_id == 1:
        story.append(Paragraph("ANNUAL HEALTH CHECKUP REPORT", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 15 Jan 2025", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("VITAL SIGNS & ANTHROPOMETRICS", sec_title_style))
        
        vitals_data = [
            [Paragraph("Metric", table_header_style), Paragraph("Observed Value", table_header_style), Paragraph("Reference Status", table_header_style)],
            [Paragraph("Blood Pressure (BP)", table_cell_style), Paragraph("146/92 mmHg", table_cell_style), Paragraph("Borderline High (Stage 1)", table_cell_style)],
            [Paragraph("Heart Rate (HR)", table_cell_style), Paragraph("82 bpm", table_cell_style), Paragraph("Normal Sinus", table_cell_style)],
            [Paragraph("Body Weight", table_cell_style), Paragraph("92 kg", table_cell_style), Paragraph("Overweight", table_cell_style)],
            [Paragraph("Height", table_cell_style), Paragraph("174 cm", table_cell_style), Paragraph("-", table_cell_style)],
            [Paragraph("Body Mass Index (BMI)", table_cell_style), Paragraph("30.4 kg/m²", table_cell_style), Paragraph("Class I Obesity", table_cell_style)],
        ]
        vt = Table(vitals_data, colWidths=[170, 150, 200])
        vt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284c7')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(vt)
        story.append(Spacer(1, 10))
        story.append(Paragraph("CLINICAL ASSESSMENT & FAMILY HISTORY", sec_title_style))
        story.append(Paragraph("• <b>Assessment:</b> Borderline hypertension and elevated BMI. Patient requested screening for cardiovascular risk.", body_style))
        story.append(Paragraph("• <b>Family History:</b> Father diagnosed with Hypertension; Mother diagnosed with Type 2 Diabetes Mellitus.", body_style))
        story.append(Paragraph("• <b>Current Medications:</b> None.", body_style))
        story.append(Paragraph("• <b>Plan:</b> Advised routine CBC, Lipid Profile, Vitamin D levels, and 24-hour BP monitoring.", body_style))

    elif doc_id == 2:
        story.append(Paragraph("HAEMATOLOGY & BIOCHEMISTRY LAB REPORT", doc_type_style))
        story.append(Paragraph("<b>Sample Collected Date:</b> 18 Jan 2025", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("LABORATORY TEST RESULTS", sec_title_style))
        
        lab_data = [
            [Paragraph("Test Parameter", table_header_style), Paragraph("Result", table_header_style), Paragraph("Unit", table_header_style), Paragraph("Reference Range", table_header_style)],
            [Paragraph("Hemoglobin (Hb)", table_cell_style), Paragraph("<b>10.8</b>", table_cell_style), Paragraph("g/dL", table_cell_style), Paragraph("13.5 - 17.5 (Low)", table_cell_style)],
            [Paragraph("Vitamin D (25-OH)", table_cell_style), Paragraph("<b>18.0</b>", table_cell_style), Paragraph("ng/mL", table_cell_style), Paragraph("30.0 - 100.0 (Deficient)", table_cell_style)],
            [Paragraph("LDL Cholesterol", table_cell_style), Paragraph("<b>148.0</b>", table_cell_style), Paragraph("mg/dL", table_cell_style), Paragraph("< 100.0 (Elevated)", table_cell_style)],
            [Paragraph("Total Serum Bilirubin", table_cell_style), Paragraph("0.9", table_cell_style), Paragraph("mg/dL", table_cell_style), Paragraph("0.2 - 1.2", table_cell_style)],
        ]
        lt = Table(lab_data, colWidths=[170, 100, 90, 160])
        lt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284c7')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(lt)
        story.append(Spacer(1, 10))
        story.append(Paragraph("PATHOLOGY IMPRESSION & PRESCRIPTION", sec_title_style))
        story.append(Paragraph("• <b>Impression:</b> Mild iron deficiency anemia, Vitamin D deficiency, and borderline LDL hyperlipidemia.", body_style))
        story.append(Paragraph("• <b>Prescription:</b> Ferrous Sulfate 325 mg OD (1 tablet daily), Vitamin D3 60,000 IU weekly.", body_style))

    elif doc_id == 3:
        story.append(Paragraph("HYPERTENSION FOLLOW-UP CONSULTATION", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 10 Feb 2025", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("CLINICAL EVALUATION & DIAGNOSIS", sec_title_style))
        story.append(Paragraph("• <b>Vitals:</b> Blood Pressure 158/96 mmHg, Heart Rate 84 bpm.", body_style))
        story.append(Paragraph("• <b>Diagnosis:</b> Stage I Essential Hypertension.", body_style))
        story.append(Paragraph("• <b>Active Regimen:</b> Iron + Vitamin D (Ferrous Sulfate 325 mg OD, Vitamin D3 60k weekly).", body_style))
        story.append(Spacer(1, 6))
        story.append(Paragraph("NEW PRESCRIPTION", sec_title_style))
        rx_data = [
            [Paragraph("Medication Name", table_header_style), Paragraph("Dosage", table_header_style), Paragraph("Frequency", table_header_style), Paragraph("Duration", table_header_style)],
            [Paragraph("Amlodipine", table_cell_style), Paragraph("5 mg", table_cell_style), Paragraph("Once Daily (OD in morning)", table_cell_style), Paragraph("30 Days", table_cell_style)],
        ]
        rxt = Table(rx_data, colWidths=[160, 110, 150, 100])
        rxt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284c7')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(rxt)

    elif doc_id == 4:
        story.append(Paragraph("CARDIOLOGY ECG EVALUATION REPORT", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 15 Feb 2025", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("ELECTROCARDIOGRAM FINDINGS", sec_title_style))
        story.append(Paragraph("• <b>Reason for Test:</b> Evaluation of persistent Stage I hypertension.", body_style))
        story.append(Paragraph("• <b>ECG Findings:</b> Normal sinus rhythm at 78 bpm. PR interval 154 ms, QRS duration 92 ms. Voltage criteria indicate mild Left Ventricular Hypertrophy (LVH) changes.", body_style))
        story.append(Paragraph("• <b>Active Medications:</b> Amlodipine 5 mg, Ferrous Sulfate 325 mg, Vitamin D3.", body_style))
        story.append(Paragraph("• <b>Recommendation:</b> Continue Amlodipine 5 mg daily. Follow low-sodium diet and re-check BP in 4 weeks.", body_style))

    elif doc_id == 5:
        story.append(Paragraph("DIABETES SCREENING & ENDOCRINE REPORT", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 20 Feb 2026", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("LABORATORY RESULTS & DIAGNOSIS", sec_title_style))
        
        db_data = [
            [Paragraph("Test Parameter", table_header_style), Paragraph("Observed Value", table_header_style), Paragraph("Reference Range", table_header_style)],
            [Paragraph("HbA1c (Glycated Hb)", table_cell_style), Paragraph("<b>6.9 %</b>", table_cell_style), Paragraph("< 5.7 % (Normal)", table_cell_style)],
            [Paragraph("Fasting Plasma Glucose", table_cell_style), Paragraph("<b>152.0 mg/dL</b>", table_cell_style), Paragraph("70 - 99 mg/dL", table_cell_style)],
        ]
        dbt = Table(db_data, colWidths=[200, 160, 160])
        dbt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284c7')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(dbt)
        story.append(Spacer(1, 10))
        story.append(Paragraph("DIAGNOSIS & NEW PRESCRIPTION", sec_title_style))
        story.append(Paragraph("• <b>Diagnosis:</b> Newly diagnosed Type 2 Diabetes Mellitus.", body_style))
        story.append(Paragraph("• <b>Active Medications:</b> Amlodipine 5 mg OD, Ferrous Sulfate 325 mg OD, Vitamin D3 weekly.", body_style))
        
        rx_db_data = [
            [Paragraph("Medication Name", table_header_style), Paragraph("Dosage", table_header_style), Paragraph("Frequency", table_header_style), Paragraph("Duration", table_header_style)],
            [Paragraph("Metformin", table_cell_style), Paragraph("500 mg", table_cell_style), Paragraph("Twice Daily (BID with meals)", table_cell_style), Paragraph("90 Days", table_cell_style)],
        ]
        rx_dbt = Table(rx_db_data, colWidths=[160, 110, 150, 100])
        rx_dbt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284c7')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(rx_dbt)

    elif doc_id == 6:
        story.append(Paragraph("DIABETES & METABOLIC FOLLOW-UP REPORT", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 20 May 2026", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("CLINICAL PROGRESS & LAB PARAMETERS", sec_title_style))
        story.append(Paragraph("• <b>HbA1c:</b> 6.2 % (Improved from 6.9 %).", body_style))
        story.append(Paragraph("• <b>Weight / BP:</b> 87 kg (Down 5kg), BP 134/84 mmHg.", body_style))
        story.append(Paragraph("• <b>Current Medications:</b> Amlodipine 5 mg OD, Metformin 500 mg BID, Ferrous Sulfate 325 mg OD, Vitamin D3 weekly.", body_style))
        story.append(Paragraph("• <b>Assessment:</b> Excellent response to Metformin and lifestyle modification. Continue current treatment.", body_style))

    elif doc_id == 7:
        story.append(Paragraph("ORTHOPEDIC CONSULTATION REPORT", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 05 Aug 2026", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("CLINICAL EVALUATION", sec_title_style))
        story.append(Paragraph("• <b>Chief Complaint:</b> Acute mechanical lower back pain after lifting heavy luggage.", body_style))
        story.append(Paragraph("• <b>Active Medications:</b> Amlodipine 5 mg, Metformin 500 mg, Ferrous Sulfate 325 mg, Vitamin D3.", body_style))
        story.append(Paragraph("• <b>Plan:</b> Core muscle strengthening exercises, physiotherapy, hot compress, and follow-up in 1 week.", body_style))

    elif doc_id == 8:
        story.append(Paragraph("ORTHOPEDIC FOLLOW-UP & PRESCRIPTION", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 12 Aug 2026", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("CLINICAL HISTORY & PAST MEDICAL RECORD", sec_title_style))
        story.append(Paragraph("• <b>History:</b> Persistent lumbar back pain despite conservative physiotherapy.", body_style))
        story.append(Paragraph("• <b>Past Medical History:</b> Stage I Hypertension, Type 2 Diabetes Mellitus, Iron Deficiency Anemia.", body_style))
        story.append(Paragraph("• <b>Current Active Medications:</b> Amlodipine 5 mg OD, Metformin 500 mg BID, Ferrous Sulfate 325 mg OD, Vitamin D3 weekly.", body_style))
        story.append(Spacer(1, 6))
        story.append(Paragraph("NEW PRESCRIPTION", sec_title_style))
        
        ortho_rx = [
            [Paragraph("Medication Name", table_header_style), Paragraph("Dose", table_header_style), Paragraph("Frequency", table_header_style), Paragraph("Duration", table_header_style)],
            [Paragraph("Ibuprofen", table_cell_style), Paragraph("400 mg", table_cell_style), Paragraph("TID (3 times daily after meals)", table_cell_style), Paragraph("7 Days", table_cell_style)],
            [Paragraph("Pantoprazole", table_cell_style), Paragraph("40 mg", table_cell_style), Paragraph("OD (Once daily before breakfast)", table_cell_style), Paragraph("7 Days", table_cell_style)],
        ]
        ot = Table(ortho_rx, colWidths=[160, 110, 150, 100])
        ot.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284c7')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(ot)
        story.append(Spacer(1, 10))
        story.append(Paragraph("CLINICAL ADVISORY NOTE", sec_title_style))
        story.append(Paragraph("<i>Notice: This prescription contains NSAIDs (Ibuprofen). Monitor for potential interaction alerts as NSAIDs may diminish the antihypertensive efficacy of Amlodipine and increase renal clearance monitoring requirements.</i>", note_style))

    elif doc_id == 9:
        story.append(Paragraph("CARDIOLOGY PAIN RELIEF & SAFE MEDICINE UPDATE", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 15 Aug 2026", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("SAFE MEDICATION PRESCRIPTION (VERIFIED DB SAFETY)", sec_title_style))
        story.append(Paragraph("• <b>Reason for Visit:</b> Patient requested safe alternative analgesic for headache / mild joint pain while on Amlodipine.", body_style))
        story.append(Paragraph("• <b>Active Regimen:</b> Amlodipine 5 mg OD, Metformin 500 mg BID.", body_style))
        story.append(Spacer(1, 6))
        
        safe_rx_1 = [
            [Paragraph("Medication Name", table_header_style), Paragraph("Dose", table_header_style), Paragraph("Frequency", table_header_style), Paragraph("Safety Status", table_header_style)],
            [Paragraph("Paracetamol", table_cell_style), Paragraph("500 mg", table_cell_style), Paragraph("PRN (As needed for pain)", table_cell_style), Paragraph("<b>SAFE (No interaction with Amlodipine)</b>", table_cell_style)],
        ]
        s1t = Table(safe_rx_1, colWidths=[140, 90, 140, 150])
        s1t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#10b981')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(s1t)
        story.append(Spacer(1, 10))
        story.append(Paragraph("PHYSICIAN NOTE", sec_title_style))
        story.append(Paragraph("<i>Paracetamol (Acetaminophen) is confirmed safe for co-administration with Amlodipine, showing zero hypertensive blunting or renal interference.</i>", note_style))

    elif doc_id == 10:
        story.append(Paragraph("ENDOCRINE SUPPLEMENTATION & SAFE THERAPY UPDATE", doc_type_style))
        story.append(Paragraph("<b>Visit Date:</b> 20 Aug 2026", body_style))
        story.append(Spacer(1, 8))
        story.append(create_patient_info_table())
        story.append(Spacer(1, 10))
        story.append(Paragraph("ANTIOXIDANT SUPPLEMENTATION (VERIFIED DB SAFETY)", sec_title_style))
        story.append(Paragraph("• <b>Reason for Visit:</b> Addition of dietary Ascorbic Acid supplement for glycemic support.", body_style))
        story.append(Spacer(1, 6))
        
        safe_rx_2 = [
            [Paragraph("Medication Name", table_header_style), Paragraph("Dose", table_header_style), Paragraph("Frequency", table_header_style), Paragraph("Safety Status", table_header_style)],
            [Paragraph("Vitamin C (Ascorbic Acid)", table_cell_style), Paragraph("500 mg", table_cell_style), Paragraph("Once Daily (OD with meal)", table_cell_style), Paragraph("<b>SAFE (No interaction with Metformin)</b>", table_cell_style)],
        ]
        s2t = Table(safe_rx_2, colWidths=[160, 90, 130, 140])
        s2t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#10b981')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(s2t)
        story.append(Spacer(1, 10))
        story.append(Paragraph("PHYSICIAN NOTE", sec_title_style))
        story.append(Paragraph("<i>Vitamin C is fully compatible with Metformin, supporting cellular antioxidant defense without altering glycemic clearance.</i>", note_style))

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    story.append(Paragraph(f"<b>Physician Signature:</b> {doctor}", ParagraphStyle('Sig', parent=body_style, alignment=TA_RIGHT)))

    return story

# 1. Build Individual PDF Files
file_names = [
    "01_Annual_Health_Checkup.pdf",
    "02_CBC_Routine_Blood_Test.pdf",
    "03_Hypertension_Followup.pdf",
    "04_ECG_Report.pdf",
    "05_Diabetes_Screening.pdf",
    "06_Diabetes_Followup.pdf",
    "07_Orthopedic_Consultation.pdf",
    "08_Orthopedic_Followup_Prescription.pdf",
    "09_Pain_Relief_Safe_Followup.pdf",
    "10_Multivitamin_Safe_Supplement.pdf",
]

for idx, name in enumerate(file_names, start=1):
    doc_path = os.path.join(output_dir, name)
    doc = SimpleDocTemplate(doc_path, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    story = make_doc_flow(idx)
    doc.build(story)
    print(f"Generated: {name}")

# 2. Build Combined Multi-Page PDF Vault File
combined_path = os.path.join(output_dir, "00_Combined_Medical_Record_Vault.pdf")
combined_doc = SimpleDocTemplate(combined_path, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
combined_story = []

for idx in range(1, 11):
    story = make_doc_flow(idx)
    combined_story.extend(story)
    if idx < 10:
        combined_story.append(PageBreak())

combined_doc.build(combined_story)
print("Generated Combined PDF Vault: 00_Combined_Medical_Record_Vault.pdf (10 Pages)")
