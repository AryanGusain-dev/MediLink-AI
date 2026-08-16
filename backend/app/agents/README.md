# MediLink AI Autonomous Agent Engine

This directory contains the autonomous multi-agent clinical decision engine and LangGraph RAG workflows integrated into **MediLink AI**.

## 📚 Overview

- **LangGraph Decision State Graph (`agent_decision.py`)**: Routes medical queries across RAG literature search, patient records, PubMed, and medical vision agents.
- **Medical RAG Agent (`rag_agent/`)**: Qdrant vector database similarity retrieval and TinyBERT Cross-Encoder reranking.
- **Human-in-the-Loop Validation**: NodeInterrupt validation for clinical computer vision diagnosis (Chest X-Ray, Skin Lesions, Brain MRI).
- **Safety Guardrails (`guardrails/`)**: Input sanitization and medical advice safety filters.

## 📌 Research Citations & Literature Grounding

1. Saeedi, S., Rezayi, S., Keshavarz, H. et al. MRI-based brain tumor detection using convolutional deep learning methods. BMC Med Inform Decis Mak 23, 16 (2023).
2. Babu Vimala, B., Srinivasan, S., Mathivanan, S.K. et al. Detection and classification of brain tumor using hybrid deep learning models. Sci Rep 13, 23029 (2023).
3. Cleverley J, Piper J, Jones M M. The role of chest radiography in confirming COVID-19 pneumonia. BMJ 2020; 370 :m2426.
