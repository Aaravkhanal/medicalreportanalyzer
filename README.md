# MedExplain AI ⚕️

I built MedExplain AI to solve a problem many of us face: understanding complex medical reports. It's a full-stack React application that ingests clinical reports (PDFs or images), extracts the text using OCR, and produces a patient-friendly, structured summary using AI. 

I designed this project to work entirely from the browser for guests, but I also integrated Supabase for authenticated users to save their history securely.

## Features I've Implemented ✨

- **Client-Side OCR**: I integrated `pdfjs-dist` for PDFs and `tesseract.js` for images so that text extraction happens right in your browser.
- **AI Summarization**: I built a local summarization engine that connects directly to NVIDIA's advanced LLMs (like Llama 3) to process the extracted text and output a highly structured JSON summary.
- **Guest Mode & Auth**: You can use the app without signing in (your reports are temporarily kept in memory for privacy), or you can sign in to save your history to a PostgreSQL database.
- **Exporting**: I added the ability to download the AI summaries as nicely formatted PDFs or TXT files.

## Tech Stack
I chose the following technologies to build this:
- **Frontend Framework**: TanStack Start (React + TypeScript)
- **Styling**: Tailwind CSS 
- **Backend & Auth**: Supabase (PostgreSQL, Auth, Storage)
- **AI Integration**: Custom fetch client connecting to NVIDIA AI endpoints

## How to Run This Locally

If you'd like to run my project on your own machine, follow these steps:

1. **Prerequisites**: Ensure you have Node.js 18+ installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**: Create a `.env` file in the root directory. You will need your own Supabase project keys and an NVIDIA API key.
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   
   VITE_AI_GATEWAY_URL=https://integrate.api.nvidia.com/v1/chat/completions
   VITE_AI_API_KEY=your_nvidia_api_key
   VITE_AI_MODEL=meta/llama3-70b-instruct
   ```
4. **Start the Dev Server**:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173` in your browser.

## Architecture Decisions
When I was building this, I originally considered using serverless edge functions for the AI summarization. However, I decided to move the AI fetching logic directly to the client side (`src/lib/summarize.ts`) to make it easier to run locally without needing complex deployment setups. This makes the project much more accessible to test!
