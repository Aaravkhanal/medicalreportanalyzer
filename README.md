# MedExplain AI ⚕️

**An AI-powered web application that translates complex medical reports into simple, patient-friendly explanations.**

## The Problem I'm Solving

Have you ever received a medical test report filled with intimidating jargon, confusing numbers, and complex scientific terms?

For most patients, reading their own health reports is an anxiety-inducing experience because they simply cannot understand what the data means before their next doctor's appointment. The terminology is inaccessible, the reference ranges are confusing, and the overall implications of the tests are rarely stated in plain English.

## The Solution

I built **MedExplain AI** from scratch to bridge this gap.

It is a full-stack web application that allows anyone to securely upload their clinical reports (as PDFs or images). The application uses Optical Character Recognition (OCR) to extract the raw text, and then leverages advanced AI to analyze the findings.

MedExplain AI instantly generates a highly structured, easy-to-read breakdown that explains:

1. **What test was done and why**
2. **What the results indicate (normal vs. abnormal)**
3. **Potential medical conditions**
4. **Simple definitions for complex medical terms**
5. **Actionable advice and next steps**

## Key Features ✨

- **Client-Side OCR**: Uses `pdfjs-dist` and `tesseract.js` to extract text from PDFs and images locally in the browser.
- **Intelligent Summarization**: Connects directly to NVIDIA's advanced LLMs (Llama 3.1) to process medical data and return a rigorously structured summary.
- **Privacy-First Guest Mode**: Users can analyze reports without signing in. Guest data is kept strictly in local memory and disappears when the tab is closed.
- **Persistent Storage**: Authenticated users can sign in via Supabase to securely save their report history to a PostgreSQL database.
- **Exporting Options**: Summaries can be instantly downloaded as formatted PDFs or TXT files to share with family or healthcare providers.

## Tech Stack

- **Frontend Framework**: TanStack Start (React + TypeScript)
- **Styling**: Tailwind CSS & shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage)
- **AI Processing**: NVIDIA AI Endpoints (meta/llama-3.1-70b-instruct)

## Local Setup

If you want to run this project locally on your machine:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Variables**: Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   VITE_AI_API_KEY=your_nvidia_api_key
   ```
3. **Run the Development Server**:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser.

---

_Disclaimer: MedExplain AI is an informational project built for educational purposes. It does not provide professional medical advice, diagnosis, or treatment._
