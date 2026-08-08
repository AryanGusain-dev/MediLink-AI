from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


# ── Sub-models ─────────────────────────────────────────────────────────────────

class PatientInfo(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    dob: str | None = None
    blood_group: str | None = None
    patient_id: str | None = None
    address: str | None = None
    phone: str | None = None


class DoctorInfo(BaseModel):
    name: str | None = None
    specialty: str | None = None
    license_number: str | None = None
    phone: str | None = None
    email: str | None = None


class HospitalInfo(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    department: str | None = None


class DocumentMeta(BaseModel):
    report_date: str | None = None
    report_type: str | None = None
    accession_number: str | None = None


class Condition(BaseModel):
    name: str
    icd_code: str | None = None
    status: str | None = None          # active / resolved / chronic
    notes: str | None = None


class Medication(BaseModel):
    name: str
    dosage: str | None = None
    frequency: str | None = None
    route: str | None = None           # oral / IV / topical
    duration: str | None = None
    prescribed_by: str | None = None


class LabResult(BaseModel):
    test_name: str
    value: str | None = None
    unit: str | None = None
    reference_range: str | None = None
    is_abnormal: bool = False
    flag: str | None = None            # H / L / CRITICAL


class TimelineEvent(BaseModel):
    date: str | None = None
    event: str
    category: str | None = None        # diagnosis / medication / procedure / lab


class Finding(BaseModel):
    finding: str
    severity: str | None = None        # low / medium / high / critical
    action_required: bool = False


# ── Root output schema ──────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    """Full structured output from Layer 4 (Gemini LLM reasoning)."""

    patient: PatientInfo | None = None
    doctor: DoctorInfo | None = None
    hospital: HospitalInfo | None = None
    document: DocumentMeta = Field(default_factory=DocumentMeta)
    conditions: list[Condition] = Field(default_factory=list)
    medications: list[Medication] = Field(default_factory=list)
    lab_results: list[LabResult] = Field(default_factory=list)
    timeline_events: list[TimelineEvent] = Field(default_factory=list)
    important_findings: list[Finding] = Field(default_factory=list)
    summary: str = ""
    document_category: str = "Other"
    generated_title: str = "Medical Document"
