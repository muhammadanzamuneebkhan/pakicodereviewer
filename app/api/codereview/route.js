/** @format */

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY, // 🔑 Always keep server-side
});

export async function POST(req) {
  try {
    const { code, systemInstruction } = await req.json();

    // ✅ Use the recommended models API (new style)
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemInstruction}\n\nHere is the code to review:\n${code}`,
            },
          ],
        },
      ],
    });

    // ✅ Handle response safely
    const textOutput = response.text;

    return new Response(JSON.stringify({ text: textOutput }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Gemini API error:', err);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
