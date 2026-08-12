"""
DDI (Drug-Drug Interaction) Pydantic Models.

Structured schema for representing drug interactions, combinations,
knowledge gap advisories, and overall user DDI evaluation reports.
Designed for seamless integration with frontend API contracts and Supabase persistence.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class InteractionEffect(BaseModel):
    """Specific interaction effect label predicted by the DDI model."""
    label_idx: int = Field(..., description="Index of interaction class (0-105)")
    effect_description: str = Field(..., description="Human-readable text describing the interaction effect")
    confidence: float = Field(..., description="Probability confidence score (0.0 to 1.0)")
    severity: str = Field(..., description="Severity level: CRITICAL, HIGH, MODERATE, LOW, INFO")


class DrugCombinationDDI(BaseModel):
    """Evaluation result for a specific pair of drugs."""
    id: str = Field(..., description="Unique key for the drug combination (e.g., 'aspirin__warfarin')")
    drug_a: str = Field(..., description="Name of first drug")
    drug_b: str = Field(..., description="Name of second drug")
    pair_label: str = Field(..., description="Formatted display label (e.g., 'Aspirin + Warfarin')")
    
    has_potential_interaction: bool = Field(
        ..., description="True if interactions detected or unknown risk present"
    )
    matched_in_trained_model: bool = Field(
        ..., description="True if both drugs exist in model similarity matrices"
    )
    drug_a_matched: bool = Field(True, description="Whether drug A was found in dataset")
    drug_b_matched: bool = Field(True, description="Whether drug B was found in dataset")
    
    knowledge_gap_warning: Optional[str] = Field(
        None,
        description=(
            "Advisory warning if one or both drugs are missing from the trained dataset: "
            "'Drug A and Drug B may show reaction, Lack of knowledge in training period "
            "may result in inaccurate result so please consult with an expert'"
        )
    )
    
    interactions: List[InteractionEffect] = Field(
        default_factory=list,
        description="List of predicted interactions from the model"
    )
    
    overall_risk_level: str = Field(
        "NONE",
        description="Categorized risk: HIGH, MODERATE, LOW, NONE, UNKNOWN_RISK"
    )
    
    xai_explanation: Optional[str] = Field(
        None,
        description="Concise textual XAI explanation of the feature contributions driving the interaction prediction"
    )
    
    recommendation: str = Field(
        ...,
        description="Actionable guidance or clinical advice string for this combination"
    )


class UserDDIReport(BaseModel):
    """Top-level DDI analysis report for all medications belonging to a user/profile."""
    profile_id: Optional[str] = Field(None, description="Supabase profile ID or user identifier")
    user_name: Optional[str] = Field(None, description="User name or profile title if available")
    
    status: str = Field(
        ...,
        description="Status code: 'SUCCESS', 'NO_MEDICATIONS_FOUND', 'ERROR'"
    )
    message: str = Field(
        ...,
        description="Human readable summary message (e.g., 'No medication found for user XYZ')"
    )
    
    total_medications: int = Field(0, description="Total unique medications retrieved")
    medications_list: List[str] = Field(default_factory=list, description="List of drug names retrieved")
    
    total_combinations: int = Field(0, description="Total 2-drug combinations evaluated")
    combinations_with_interactions: int = Field(0, description="Number of combinations flagged with interactions")
    high_risk_combinations: int = Field(0, description="Number of high risk combinations detected")
    
    generated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO timestamp when analysis was generated"
    )
    
    combinations: List[DrugCombinationDDI] = Field(
        default_factory=list,
        description="Array of evaluated drug combinations"
    )
