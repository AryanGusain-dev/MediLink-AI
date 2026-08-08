import type {
  Activity,
  HealthProfile,
  MedicalDocument,
  MedicalRecord,
  Notification,
  QRCodeItem,
  ShareField,
  ShareProfile,
  User,
} from "@/types";

export const currentUser: User = {
  id: "usr_001",
  name: "Ananya Sharma",
  email: "ananya.sharma@medilink.ai",
  phone: "+91 98450 22119",
  plan: "pro",
  createdAt: "2025-11-04T09:12:00Z",
};

export const healthProfile: HealthProfile = {
  userId: "usr_001",
  fullName: "Ananya Sharma",
  age: 32,
  gender: "female",
  bloodGroup: "O+",
  heightCm: 166,
  weightKg: 58,
  address: "12/4 Brigade Road, Bengaluru, Karnataka 560001",
  summary:
    "Generally healthy adult with well-managed hypothyroidism. No surgical history. Annual screening up to date. Non-smoker, moderate activity level.",
  completion: 82,
  emergencyContacts: [
    { id: "ec_1", name: "Rohan Sharma", relation: "Spouse", phone: "+91 98860 44120" },
    { id: "ec_2", name: "Meera Iyer", relation: "Sister", phone: "+91 99000 71234" },
  ],
  conditions: [
    { id: "mc_1", name: "Hypothyroidism", diagnosedAt: "2021-03-18", severity: "mild", status: "managed" },
    { id: "mc_2", name: "Iron deficiency anaemia", diagnosedAt: "2024-08-02", severity: "moderate", status: "active" },
  ],
  allergies: [
    { id: "al_1", allergen: "Penicillin", reaction: "Skin rash, swelling", severity: "severe" },
    { id: "al_2", allergen: "Dust mites", reaction: "Rhinitis", severity: "mild" },
  ],
  medications: [
    { id: "md_1", name: "Levothyroxine", dosage: "50 mcg", frequency: "Once daily, morning", prescribedBy: "Dr. Kapoor" },
    { id: "md_2", name: "Ferrous ascorbate", dosage: "100 mg", frequency: "Once daily, after lunch", prescribedBy: "Dr. Nair" },
  ],
  vaccinations: [
    { id: "vc_1", name: "COVID-19 (Covishield)", doses: 3, lastDoseAt: "2023-01-14", status: "complete" },
    { id: "vc_2", name: "Influenza (annual)", doses: 1, lastDoseAt: "2025-10-09", status: "due" },
    { id: "vc_3", name: "Hepatitis B", doses: 3, lastDoseAt: "2019-06-21", status: "complete" },
  ],
  insurance: {
    provider: "Apex Health Assurance",
    policyNumber: "AHA-4417-90233",
    validUntil: "2027-03-31",
    coverage: "Family floater · ₹15,00,000",
  },
  doctors: [
    { id: "dr_1", name: "Dr. Vivek Kapoor", specialty: "Endocrinology", hospital: "Manipal Hospital", phone: "+91 80 4020 1100" },
    { id: "dr_2", name: "Dr. Sneha Nair", specialty: "Internal Medicine", hospital: "Fortis Clinic", phone: "+91 80 6621 4400" },
  ],
};

export const documents: MedicalDocument[] = [
  { id: "doc_1", name: "Complete Blood Count — Oct 2026.pdf", category: "Blood Test", sizeKb: 412, type: "pdf", uploadedAt: "2026-07-18T10:20:00Z", status: "uploaded" },
  { id: "doc_2", name: "Thyroid Panel TSH T3 T4.pdf", category: "Blood Test", sizeKb: 288, type: "pdf", uploadedAt: "2026-07-11T15:02:00Z", status: "uploaded" },
  { id: "doc_3", name: "Chest X-Ray PA view.jpg", category: "X-Ray", sizeKb: 1840, type: "image", uploadedAt: "2026-06-29T08:44:00Z", status: "uploaded" },
  { id: "doc_4", name: "Brain MRI Report.pdf", category: "MRI", sizeKb: 2960, type: "pdf", uploadedAt: "2026-06-02T12:15:00Z", status: "processing" },
  { id: "doc_5", name: "Prescription — Dr. Kapoor.jpg", category: "Prescription", sizeKb: 690, type: "image", uploadedAt: "2026-05-24T09:30:00Z", status: "uploaded" },
  { id: "doc_6", name: "Apex Health Policy 2026.pdf", category: "Insurance", sizeKb: 1120, type: "pdf", uploadedAt: "2026-04-02T17:05:00Z", status: "uploaded" },
];

export const shareFields: ShareField[] = [
  { key: "name", label: "Full name", description: "Legal name on the health record" },
  { key: "age", label: "Age", description: "Current age in years" },
  { key: "gender", label: "Gender", description: "Recorded gender" },
  { key: "bloodGroup", label: "Blood group", description: "Critical in emergencies" },
  { key: "emergencyContacts", label: "Emergency contacts", description: "Next of kin phone numbers" },
  { key: "conditions", label: "Medical conditions", description: "Diagnosed and ongoing conditions" },
  { key: "allergies", label: "Allergies", description: "Drug, food and environmental allergies" },
  { key: "medications", label: "Current medications", description: "Active prescriptions and dosage" },
  { key: "vaccinations", label: "Vaccinations", description: "Immunisation history" },
  { key: "insurance", label: "Insurance", description: "Policy provider and number" },
  { key: "documents", label: "Medical documents", description: "Attached files in your vault" },
  { key: "doctors", label: "Doctor information", description: "Treating physicians and clinics" },
  { key: "summary", label: "Health summary", description: "Narrative overview of your health" },
  { key: "reports", label: "Uploaded reports", description: "Lab and imaging report files" },
  { key: "emergencyNotes", label: "Emergency notes", description: "Instructions for first responders" },
  { key: "notes", label: "Personal notes", description: "Free-form notes you added" },
];
export const shareProfiles: ShareProfile[] = [];

export const qrCodes: QRCodeItem[] = [];


export const notifications: Notification[] = [
  { id: "nt_1", title: "New login detected", message: "Chrome on macOS · Bengaluru", type: "warning", createdAt: "2026-07-25T08:12:00Z", read: false },
  { id: "nt_2", title: "Document processed", message: "Thyroid Panel added to your vault.", type: "success", createdAt: "2026-07-24T16:40:00Z", read: false },
  { id: "nt_3", title: "Influenza booster due", message: "Your annual flu shot is due this month.", type: "info", createdAt: "2026-07-22T10:00:00Z", read: true },
  { id: "nt_4", title: "Share link expired", message: "Insurance Claim Pack is no longer reachable.", type: "danger", createdAt: "2026-07-19T12:30:00Z", read: true },
];

export const activities: Activity[] = [
  { id: "ac_1", title: "Uploaded Complete Blood Count", detail: "Blood Test · 412 KB", kind: "upload", createdAt: "2026-07-18T10:20:00Z" },
  { id: "ac_2", title: "Emergency QR scanned", detail: "Scanned near Manipal Hospital", kind: "share", createdAt: "2026-07-16T21:04:00Z" },
  { id: "ac_3", title: "Report scan queued", detail: "Brain MRI Report", kind: "scan", createdAt: "2026-07-14T12:15:00Z" },
  { id: "ac_4", title: "Two-factor authentication enabled", detail: "Authenticator app", kind: "security", createdAt: "2026-07-10T09:00:00Z" },
  { id: "ac_5", title: "Profile updated", detail: "Added medication Ferrous ascorbate", kind: "profile", createdAt: "2026-07-06T18:22:00Z" },
];

export const medicalRecords: MedicalRecord[] = [
  { id: "mr_1", title: "Annual health check", facility: "Manipal Hospital", recordedAt: "2026-07-18", type: "visit", summary: "All vitals within range. Continue current medication." },
  { id: "mr_2", title: "Thyroid panel", facility: "Metropolis Labs", recordedAt: "2026-07-11", type: "lab", summary: "TSH 3.2 mIU/L — within reference range." },
  { id: "mr_3", title: "Chest X-Ray", facility: "Fortis Imaging", recordedAt: "2026-06-29", type: "imaging", summary: "No acute cardiopulmonary abnormality." },
];

export const storage = { usedGb: 3.4, totalGb: 10 };

export const healthStats = [
  { label: "Records secured", value: 128, suffix: "+" },
  { label: "Hospitals connected", value: 340, suffix: "+" },
  { label: "Uptime", value: 99.98, suffix: "%" },
  { label: "Avg. share time", value: 4, suffix: "s" },
];
