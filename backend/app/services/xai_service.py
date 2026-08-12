"""
Textual XAI (Explainable AI) Engine.

Optimized for low-end hardware (GTX 1650 / 8 GB RAM).
Calculates feature attributions across 9,582 similarity features and translates
the deep learning predictions into concise, human-understandable text explanations
without generating heavy matplotlib figures, image files, or PDF reports.
"""

from __future__ import annotations

import gc
import sys
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch

class _LoggerWrapper:
    def __init__(self, logger, is_structlog: bool):
        self._logger = logger
        self._is_structlog = is_structlog

    def info(self, msg: str, **kwargs):
        if self._is_structlog:
            self._logger.info(msg, **kwargs)
        else:
            kw_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
            self._logger.info(f"{msg} {kw_str}".strip())

    def warning(self, msg: str, **kwargs):
        if self._is_structlog:
            self._logger.warning(msg, **kwargs)
        else:
            kw_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
            self._logger.warning(f"{msg} {kw_str}".strip())

    def error(self, msg: str, **kwargs):
        if self._is_structlog:
            self._logger.error(msg, **kwargs)
        else:
            kw_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
            self._logger.error(f"{msg} {kw_str}".strip())

try:
    import structlog
    log = _LoggerWrapper(structlog.get_logger(__name__), is_structlog=True)
except ImportError:
    import logging
    logging.basicConfig(level=logging.INFO)
    log = _LoggerWrapper(logging.getLogger("xai_service"), is_structlog=False)


class TextualXAIEngine:
    """
    Lightweight XAI Engine for generating concise textual explanations of DDI predictions.
    """

    def __init__(self, model: torch.nn.Module, device: torch.device):
        self.model = model
        self.device = device

    def explain_pair(
        self,
        drug_a_name: str,
        drug_b_name: str,
        SS_vec: np.ndarray,
        TS_vec: np.ndarray,
        GS_vec: np.ndarray,
        predicted_effects: List[dict],
    ) -> str:
        """
        Generate a concise, human-understandable textual explanation for a drug interaction prediction.
        
        Evaluates attribution across the 3 biological modalities:
        - Structural Similarity (SS)
        - Target Similarity (TS)
        - Gene Ontology Similarity (GS)
        """
        try:
            # 1. Convert vectors to tensors
            SS_tensor = torch.tensor(SS_vec, dtype=torch.float32).unsqueeze(0).to(self.device).requires_grad_(True)
            TS_tensor = torch.tensor(TS_vec, dtype=torch.float32).unsqueeze(0).to(self.device).requires_grad_(True)
            GS_tensor = torch.tensor(GS_vec, dtype=torch.float32).unsqueeze(0).to(self.device).requires_grad_(True)

            self.model.eval()
            _, _, _, logits = self.model(SS_tensor, TS_tensor, GS_tensor)

            # 2. Get top predicted logit for attribution backprop
            top_logit = logits.max()
            top_logit.backward()

            # 3. Calculate integrated gradient / saliency score per modality
            with torch.no_grad():
                ss_grad = SS_tensor.grad.abs().mean().item() if SS_tensor.grad is not None else 0.0
                ts_grad = TS_tensor.grad.abs().mean().item() if TS_tensor.grad is not None else 0.0
                gs_grad = GS_tensor.grad.abs().mean().item() if GS_tensor.grad is not None else 0.0

                # Weight by input magnitude (Saliency * Input)
                ss_score = float(ss_grad * np.mean(np.abs(SS_vec)))
                ts_score = float(ts_grad * np.mean(np.abs(TS_vec)))
                gs_score = float(gs_grad * np.mean(np.abs(GS_vec)))

                total_score = ss_score + ts_score + gs_score
                if total_score > 0:
                    ss_pct = round((ss_score / total_score) * 100, 1)
                    ts_pct = round((ts_score / total_score) * 100, 1)
                    gs_pct = round((gs_score / total_score) * 100, 1)
                else:
                    ss_pct, ts_pct, gs_pct = 33.3, 33.3, 33.4

            # Cleanup CUDA / Memory for low RAM optimization (GTX 1650)
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()

            # 4. Formulate human-readable text explanation
            modalities = [
                ("Target Similarity (protein/receptor binding)", ts_pct),
                ("Gene Ontology pathways (biological cell functions)", gs_pct),
                ("Structural Similarity (chemical molecule similarity)", ss_pct),
            ]
            modalities.sort(key=lambda x: x[1], reverse=True)

            primary_modality = modalities[0]
            secondary_modality = modalities[1]

            explanation = (
                f"Interaction driven primarily by {primary_modality[0]} ({primary_modality[1]}% impact) "
                f"and {secondary_modality[0]} ({secondary_modality[1]}% impact), indicating both {drug_a_name} "
                f"and {drug_b_name} share active biological mechanism pathways."
            )

            return explanation

        except Exception as exc:
            log.warning("xai.explanation_failed", error=str(exc))
            # Fallback concise textual explanation
            return (
                f"Interaction predicted based on shared bio-similarity profiles between {drug_a_name} and {drug_b_name}."
            )
