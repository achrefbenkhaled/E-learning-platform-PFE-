# AI Test Generation Architecture: A Deep Dive

This document provides a comprehensive, step-by-step explanation of exactly how the "Generate Test with AI" feature works in the LearnHub E-Learning platform. 

The process spans across the frontend React interface, the backend Node.js API, third-party libraries for PDF parsing, and Large Language Model (LLM) APIs like Google Gemini or OpenAI.

---

## Phase 1: The Instructor Request (Frontend)

The journey begins in the **Course Editor** (`frontend/src/pages/Courses/EditCourse.jsx`). 

1. **Triggering the Action**: When an instructor clicks the "Generate Test" button next to a session's PDF URL, a modal pops up.
2. **Configuration**: The instructor selects two key parameters:
   * **`numQuestions`**: How many questions to generate (e.g., 5, 10, 20).
   * **`questionType`**: The format of the exam (`multiple-choice`, `short-answer`, or `mixed`).
3. **The API Call**: When the instructor confirms, the React application sends an HTTP POST request to the backend:
   ```javascript
   api.post('/api/tests/generate', { 
     pdfUrl: "https://example.com/lecture.pdf",
     numQuestions: 10,
     questionType: "mixed"
   });
   ```

---

## Phase 2: Processing the File (Backend Controller)

The request hits the backend at `backend/controllers/testController.js` inside the `generateTestAI` function.

1. **Validation**: The backend checks if a `pdfUrl` was actually provided.
2. **PDF Extraction**: The backend calls a utility function `extractTextFromPdfUrl(pdfUrl)`. 
   * This function downloads the PDF file from the provided URL into memory.
   * It uses a library called `pdf-parse` to read the binary PDF data and convert it into raw, readable string text.
3. **Safety Check**: If the PDF is empty, protected by a password, or contains only images (no readable text), the backend stops and returns an error: *"Could not extract enough text from the PDF"*.

---

## Phase 3: Communicating with the AI (`backend/utils/ai.js`)

Once the backend has the raw text, it hands it over to the `generateTestFromText` function. This is the brain of the operation.

1. **Text Truncation**: AI models have "token limits" (a maximum amount of text they can read at once). To prevent crashing, the backend strictly slices the text to a maximum of `30,000` characters. This is usually enough to cover the core concepts of a standard lecture PDF.
2. **Prompt Engineering**: The backend dynamically builds an instruction prompt for the AI based on the `questionType` requested by the instructor:
   * **For Multiple Choice**: The AI is told to generate JSON objects containing a `question`, 4 `options`, an integer `correctAnswer` (0-3), and an `explanation`.
   * **For Short Answer**: The AI is told to generate JSON objects containing a `question`, a `correctAnswerText`, and an `explanation`.
   * **For Mixed**: The AI is told to split the batch, providing half multiple choice and half short answer, using the exact JSON structures mentioned above.
3. **API Request**: The backend sends this prompt, along with the extracted PDF text, to the configured AI provider (Google Gemini or OpenAI).

---

## Phase 4: The AI Response and Parsing

1. **Generation**: The AI model reads the text, comprehends the educational material, and attempts to generate meaningful questions.
2. **JSON Constraint**: Because the prompt explicitly demands "ONLY the raw JSON array", the AI's output is highly structured data, not conversational text.
3. **Sanitization**: Sometimes the AI accidentally includes markdown formatting (like ```json ... ```). The backend code cleans this up using regular expressions.
4. **Parsing**: The cleaned string is converted from plain text into actual JavaScript objects using `JSON.parse()`.

---

## Phase 5: Hydrating the UI (Frontend Rendering)

1. **Return to Sender**: The backend sends the parsed array of question objects back to the frontend as the response to the initial API call.
2. **Navigation**: `EditCourse.jsx` receives the questions and automatically redirects the instructor to the **Create Test** page (`/tests/create`). It passes the generated questions through the router's state.
3. **Mapping the Data**: When `CreateTest.jsx` loads, it detects the incoming AI data and maps it into the form's state:
   ```javascript
   const formatted = location.state.generatedQuestions.map((q) => ({
      type: q.type || 'multiple-choice',
      text: q.question,
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer ?? 0,
      correctAnswerText: q.correctAnswerText || '',
      // ...
   }));
   ```
4. **Final Review**: The instructor now sees a fully populated test creation form. The AI acts as a **copilot**—it does the heavy lifting of drafting the exam, but the instructor retains full control to edit text, change points, or delete irrelevant questions before clicking **"Create Test"** to publish it to the database.
