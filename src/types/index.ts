/** Core domain types for MediLink AI. Backend-integration ready. */

export type ID = string;

export interface User {
  id: ID;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  plan: "free" | "pro" | "clinic";
  createdAt: string;
}

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface EmergencyContact {
  id: ID;
  name: string;
  relation: string;
  phone: string;
}

export interface MedicalCondition {
  id: ID;
  name: string;
  diagnosedAt: string;
  severity: "mild" | "moderate" | "severe";
  status: "active" | "managed" | "resolved";
}

export interface Allergy {
  id: ID;
  allergen: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
}

export interface Medication {
  id: ID;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
}

export interface Vaccination {
  id: ID;
  name: string;
  doses: number;
  lastDoseAt: string;
  status: "complete" | "due" | "overdue";
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  validUntil: string;
  coverage: string;
}

export interface DoctorInfo {
  id: ID;
  name: string;
  specialty: string;
  hospital: string;
  phone: string;
}

export interface HealthProfile {
  userId: ID;
  fullName: string;
  age: number;
  gender: "male" | "female" | "other";
  bloodGroup: BloodGroup;
  heightCm: number;
  weightKg: number;
  address: string;
  emergencyContacts: EmergencyContact[];
  conditions: MedicalCondition[];
  allergies: Allergy[];
  medications: Medication[];
  vaccinations: Vaccination[];
  insurance: InsuranceInfo;
  doctors: DoctorInfo[];
  summary: string;
  completion: number;
}

export type DocumentCategory =
  | "Blood Test"
  | "Prescription"
  | "MRI"
  | "CT Scan"
  | "X-Ray"
  | "Insurance"
  | "Other";

export type DocumentStatus = "uploaded" | "processing" | "failed";

export interface MedicalDocument {
  id: ID;
  name: string;
  category: DocumentCategory;
  sizeKb: number;
  type: "pdf" | "image";
  uploadedAt: string;
  status: DocumentStatus;
}

export type ShareFieldKey =
  | "name"
  | "age"
  | "gender"
  | "bloodGroup"
  | "emergencyContacts"
  | "conditions"
  | "allergies"
  | "medications"
  | "vaccinations"
  | "insurance"
  | "documents"
  | "doctors"
  | "summary"
  | "reports"
  | "emergencyNotes"
  | "notes";

export interface ShareField {
  key: ShareFieldKey;
  label: string;
  description: string;
}

export interface ShareProfile {
  id: ID;
  name: string;
  preset: "Emergency" | "Doctor Visit" | "Insurance" | "Hospital" | "Family" | "Custom";
  description: string;
  fields: ShareFieldKey[];
  createdAt: string;
  expiresAt: string | null;
  visibility: "public-link" | "pin-protected" | "private";
  status: "active" | "expired" | "disabled";
  views: number;
  token: string;
}

export interface QRCodeItem {
  id: ID;
  shareProfileId: ID;
  label: string;
  createdAt: string;
  scans: number;
  status: "active" | "inactive";
}

export interface Notification {
  id: ID;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "danger";
  createdAt: string;
  read: boolean;
}

export interface Activity {
  id: ID;
  title: string;
  detail: string;
  kind: "upload" | "share" | "scan" | "security" | "profile";
  createdAt: string;
}

export interface MedicalRecord {
  id: ID;
  title: string;
  facility: string;
  recordedAt: string;
  type: "lab" | "imaging" | "visit" | "vaccination";
  summary: string;
}
