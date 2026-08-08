"""
Medical abbreviation and term normalization dictionary.

Maps common abbreviations and shorthand found in Indian and international
medical reports to their full standard forms.
"""

MEDICAL_ABBREVIATIONS: dict[str, str] = {
    # Lab & blood
    "hb": "hemoglobin",
    "hgb": "hemoglobin",
    "rbc": "red blood cells",
    "wbc": "white blood cells",
    "plt": "platelets",
    "mcv": "mean corpuscular volume",
    "mch": "mean corpuscular hemoglobin",
    "mchc": "mean corpuscular hemoglobin concentration",
    "esr": "erythrocyte sedimentation rate",
    "crp": "c-reactive protein",
    "hba1c": "glycated hemoglobin",
    "fbs": "fasting blood sugar",
    "ppbs": "post-prandial blood sugar",
    "rbs": "random blood sugar",
    "ldl": "low-density lipoprotein",
    "hdl": "high-density lipoprotein",
    "tg": "triglycerides",
    "tsh": "thyroid stimulating hormone",
    "t3": "triiodothyronine",
    "t4": "thyroxine",
    "sgpt": "serum glutamate pyruvate transaminase",
    "sgot": "serum glutamic oxaloacetic transaminase",
    "alt": "alanine transaminase",
    "ast": "aspartate transaminase",
    "alp": "alkaline phosphatase",
    "bun": "blood urea nitrogen",
    "s.cr": "serum creatinine",
    "gfr": "glomerular filtration rate",
    "egfr": "estimated glomerular filtration rate",
    "inr": "international normalized ratio",
    "pt": "prothrombin time",
    "aptt": "activated partial thromboplastin time",
    "cbc": "complete blood count",
    "lft": "liver function test",
    "kft": "kidney function test",
    "rft": "renal function test",
    "tft": "thyroid function test",
    "lft": "lipid profile",
    "urea": "blood urea",

    # Vitals
    "bp": "blood pressure",
    "hr": "heart rate",
    "rr": "respiratory rate",
    "spo2": "oxygen saturation",
    "bmi": "body mass index",
    "temp": "temperature",

    # Imaging
    "xray": "x-ray",
    "ct": "computed tomography",
    "mri": "magnetic resonance imaging",
    "usg": "ultrasonography",
    "echo": "echocardiography",
    "ecg": "electrocardiogram",
    "ekg": "electrocardiogram",
    "pet": "positron emission tomography",

    # Diagnosis / conditions
    "dm": "diabetes mellitus",
    "t2dm": "type 2 diabetes mellitus",
    "t1dm": "type 1 diabetes mellitus",
    "htn": "hypertension",
    "ihd": "ischemic heart disease",
    "cad": "coronary artery disease",
    "mi": "myocardial infarction",
    "cva": "cerebrovascular accident",
    "tia": "transient ischemic attack",
    "copd": "chronic obstructive pulmonary disease",
    "ckd": "chronic kidney disease",
    "nafld": "non-alcoholic fatty liver disease",
    "gerd": "gastroesophageal reflux disease",
    "uti": "urinary tract infection",
    "urti": "upper respiratory tract infection",
    "lrti": "lower respiratory tract infection",

    # Clinical instructions
    "od": "once daily",
    "bd": "twice daily",
    "tds": "three times a day",
    "qid": "four times a day",
    "sos": "when required",
    "prn": "as needed",
    "hs": "at bedtime",
    "ac": "before meals",
    "pc": "after meals",
    "po": "by mouth",
    "iv": "intravenous",
    "im": "intramuscular",
    "sc": "subcutaneous",
    "sl": "sublingual",
    "stat": "immediately",
    "npo": "nothing by mouth",

    # Units
    "mg": "milligrams",
    "mcg": "micrograms",
    "g": "grams",
    "ml": "millilitres",
    "iu": "international units",
    "meq": "milliequivalents",
    "mmol": "millimoles",
    "mg/dl": "milligrams per decilitre",
    "g/dl": "grams per decilitre",
    "mmhg": "millimetres of mercury",
    "bpm": "beats per minute",
    "rpm": "respirations per minute",
}


def normalize_term(text: str) -> str:
    """Replace known medical abbreviations in text with their full forms."""
    words = text.split()
    normalized = []
    for word in words:
        clean = word.strip(".,;:()/").lower()
        replacement = MEDICAL_ABBREVIATIONS.get(clean)
        if replacement:
            # Preserve original casing style if the word was uppercase
            if word.isupper():
                normalized.append(replacement.upper())
            else:
                normalized.append(replacement)
        else:
            normalized.append(word)
    return " ".join(normalized)
