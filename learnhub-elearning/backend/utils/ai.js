import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const getProvider = () => process.env.AI_PROVIDER || 'gemini';

const generateMockQuestions = (text, numQuestions) => {
  const mockQuestions = [];
  for (let i = 1; i <= numQuestions; i++) {
    mockQuestions.push({
      question: `Mock Question ${i}: Based on the text, what is the primary concept?`,
      options: [`Option A`, `Option B`, `Option C`, `Option D`],
      correctAnswer: 0,
      explanation: `Mock explanation.`
    });
  }
  return mockQuestions;
};

export const generateTestFromText = async (text, numQuestions = 5, questionType = 'multiple-choice') => {
  const provider = getProvider();

  if (provider === 'mock') return generateMockQuestions(text, numQuestions);

  // Truncate text to avoid hitting token limits or quota blocks (30k characters is plenty for a test)
  const truncatedText = text.slice(0, 30000);
  
  let promptText = '';
  if (questionType === 'multiple-choice') {
    promptText = `Generate a JSON array of ${numQuestions} multiple choice questions from this text: ${truncatedText}. 
    Each object must have: 'type': 'multiple-choice', 'question', 'options' (array of 4 strings), 'correctAnswer' (integer index 0-3 of the correct option), and 'explanation'.
    Return ONLY the raw JSON array.`;
  } else if (questionType === 'short-answer') {
    promptText = `Generate a JSON array of ${numQuestions} short answer questions from this text: ${truncatedText}. 
    Each object must have: 'type': 'short-answer', 'question', 'correctAnswerText' (a concise correct answer string), and 'explanation'.
    Return ONLY the raw JSON array.`;
  } else if (questionType === 'mixed') {
    promptText = `Generate a JSON array of ${numQuestions} questions from this text: ${truncatedText}. 
    Create a mix of approximately half multiple choice and half short answer questions.
    For multiple choice questions, the object must have: 'type': 'multiple-choice', 'question', 'options' (array of 4 strings), 'correctAnswer' (integer index 0-3 of the correct option), and 'explanation'.
    For short answer questions, the object must have: 'type': 'short-answer', 'question', 'correctAnswerText' (a concise correct answer string), and 'explanation'.
    Return ONLY the raw JSON array.`;
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: promptText }],
      response_format: { type: "json_object" },
    });
    const content = JSON.parse(response.choices[0].message.content);
    return content.questions || content;
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

    // USING gemini-flash-latest AS IT OFTEN HAS BETTER QUOTA THAN 2.0 PREVIEWS
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    
    try {
      console.log("Attempting direct API call to Gemini v1beta (gemini-flash-latest)...");
      const response = await axios.post(url, {
        contents: [{
          parts: [{
            text: promptText
          }]
        }]
      });

      const resultText = response.data.candidates[0].content.parts[0].text.trim();
      let jsonString = resultText;
      if (jsonString.includes('```')) {
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } catch (error) {
      console.error("Direct Gemini Error (v1beta):", error.response?.data || error.message);
      if (error.response?.status === 429) {
        throw new Error("Gemini Quota Exceeded. Please wait 1 minute or switch AI_PROVIDER=mock in .env");
      }
      throw error;
    }
  }
};
export const evaluateShortAnswersAI = async (evalList) => {
  if (!evalList || evalList.length === 0) return [];
  const provider = getProvider();

  if (provider === 'mock') {
    return evalList.map(() => true); // Mock always marks correct
  }

  const promptText = `Evaluate the following list of short answers. 
  For each item, compare the 'userAnswer' to the 'correctAnswerText' based on the 'question'.
  If the userAnswer accurately conveys the meaning of the correctAnswerText (ignoring minor typos or grammatical errors), mark it as true. Otherwise, false.
  Return ONLY a JSON object with a single key "results" mapping to an array of booleans exactly in the same order. Example: {"results": [true, false, true]}.
  
  Input data:
  ${JSON.stringify(evalList, null, 2)}`;

  try {
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptText }],
        response_format: { type: "json_object" },
      });
      const content = JSON.parse(response.choices[0].message.content);
      return content.results || [];
    }

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: promptText }] }]
      });

      const resultText = response.data.candidates[0].content.parts[0].text.trim();
      let jsonString = resultText;
      if (jsonString.includes('```')) {
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      
      const parsed = JSON.parse(jsonString);
      return parsed.results || [];
    }
  } catch (error) {
    console.error("AI Evaluation Error:", error.response?.data || error.message);
    // Fallback: If AI fails, return array of falses or fallback to strict check 
    // We will just return false for all to prevent crash
    return evalList.map(() => false);
  }
};
