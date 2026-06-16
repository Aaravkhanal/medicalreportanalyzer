import { createWorker } from 'tesseract.js';
import fs from 'fs';

async function run() {
  try {
    const worker = await createWorker('eng', 1, {
      logger: m => console.log(m)
    });
    console.log("Worker initialized");
    const buffer = fs.readFileSync('test_report.jpg');
    const { data } = await worker.recognize(buffer);
    console.log("Recognized:", data.text);
    await worker.terminate();
  } catch (e) {
    console.error("ERROR", e);
  }
}
run();
