# MediLink AI

MediLink AI is a secure health record platform for storing, scanning, and sharing medical documents with consent-first QR access.

## Development Setup

### 1. Frontend Setup

You will need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```bash
git clone <this-repository-url>
cd MediLink-AI
npm install
npm run dev
```

### 2. Backend Setup (FastAPI)

Requires Python 3.11+.

#### Windows (PowerShell):
```powershell
# Navigate to the backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
# Note: If script execution is disabled on PowerShell, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Install requirements
pip install -r requirements.txt

# Run the backend server with Uvicorn
uvicorn app.main:app --reload --port 8000
```

#### macOS / Linux (Bash / Zsh):
```bash
# Navigate to the backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run the backend server with Uvicorn
uvicorn app.main:app --reload --port 8000
```

Once running, the backend API and interactive documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- FastAPI & Uvicorn (Backend)
- Google Gemini 2.0 & PyTorch GNN XAI Engine

---

## 📚 Technical Architecture & Medical Knowledge

For a complete breakdown of features added, ML & XAI deep learning modules, mathematical algorithms, database schema, system architecture, and required medical domain knowledge, refer to:
👉 **[Technical Architecture & Medical Knowledge Guide](./TECHNICAL_ARCHITECTURE_AND_KNOWLEDGE.md)**

---


## 🧪 Synthetic Medical Test Suite (`med_docs/`)

The repository includes a realistic **10-document synthetic medical record suite** in `med_docs/` to test OCR extraction, Patient Passport auto-population, and Drug-Drug Interaction (DDI) safety checks without using real patient data.

### Master Combined Vault File
- **`med_docs/00_Combined_Medical_Record_Vault.pdf`**: A single 10-page PDF containing the entire patient history across 3 specialist doctors and a pathology laboratory.

### Individual Test Documents
1. **`01_Annual_Health_Checkup.pdf`** — *Dr. Ananya Roy, M.D. (Cardiology)* — Vitals & BP 146/92 mmHg.
2. **`02_CBC_Routine_Blood_Test.pdf`** — *Dr. S. K. Mehta, M.D. (Pathology)* — Hemoglobin 10.8 g/dL, Vitamin D 18 ng/mL.
3. **`03_Hypertension_Followup.pdf`** — *Dr. Ananya Roy, M.D. (Cardiology)* — Prescription: **Amlodipine 5mg**.
4. **`04_ECG_Report.pdf`** — *Dr. Ananya Roy, M.D. (Cardiology)* — ECG Sinus Rhythm & LVH findings.
5. **`05_Diabetes_Screening.pdf`** — *Dr. Vikram Patel, M.D. (Endocrinology)* — HbA1c 6.9%, Prescription: **Metformin 500mg**.
6. **`06_Diabetes_Followup.pdf`** — *Dr. Vikram Patel, M.D. (Endocrinology)* — HbA1c 6.2% improvement.
7. **`07_Orthopedic_Consultation.pdf`** — *Dr. Rajesh Malhotra, M.S. (Orthopedics)* — Lumbar back pain.
8. **`08_Orthopedic_Followup_Prescription.pdf`** — *Dr. Rajesh Malhotra, M.S. (Orthopedics)* — Prescription: **Ibuprofen 400mg**, **Pantoprazole 40mg**.
9. **`09_Pain_Relief_Safe_Followup.pdf`** — *Dr. Ananya Roy, M.D. (Cardiology)* — Prescription: **Paracetamol 500mg** *(Verified Safe Analgesic)*.
10. **`10_Multivitamin_Safe_Supplement.pdf`** — *Dr. Vikram Patel, M.D. (Endocrinology)* — Prescription: **Vitamin C 500mg** *(Verified Safe Antioxidant)*.

---

## 🏷️ Expected Safety Tagging Matrix

When uploading these documents to the **AI Intelligence** page, the system will tag drug combinations as follows:

| Drug Combination | Expected Tag | Color Code | Source Engine |
| :--- | :--- | :--- | :--- |
| **Amlodipine + Paracetamol** | `NO INTERACTION` / `SAFE` | 🟢 Green | DDI Database Hit |
| **Metformin + Vitamin C** | `NO INTERACTION` / `SAFE` | 🟢 Green | DDI Database Hit |
| **Pantoprazole + Vitamin D3** | `NO INTERACTION` / `SAFE` | 🟢 Green | DDI Database Hit |
| **Amlodipine + Ibuprofen** | `HIGH RISK` | 🔴 Red | `DDI DB Library Hit` (Blue Tag) |
| **Ferrous Sulfate + Calcium** | `HIGH RISK` | 🔴 Red | `DDI DB Library Hit` (Blue Tag) |
| **Metformin + Iron** | `MODERATE RISK` / `INTERACTION` | 🟡 Amber | `DDI Model Prediction` (Purple Tag) |
| **Unlisted Regimen Drug** | `KNOWLEDGE GAP ADVISORY` | 🟠 Warning | `Unlisted in Model Dataset` |


