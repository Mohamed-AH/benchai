# Solari Sandbox Agent Evaluation Harness

> An isolated agent evaluation framework built with **Solari MicroVM Sandboxes** and **Gemini 2.0 Flash**.

## Features

- **Sub-Second MicroVM Provisioning:** Fast spin-up via `solari-sandbox` SDK.
- **Deterministic Assertions:** Verifies outcomes directly against sandbox filesystem state.
- **Zero Compute Cost:** Powered by Gemini 2.0 Flash ($0 free tier) and Solari free monthly VM credits.

## Quickstart

```bash
export SOLARI_API_KEY="slr_live_your_key"
export GEMINI_API_KEY="your_gemini_key"

pip install solari-sandbox google-genai
python3 solari_eval_harness.py
```
