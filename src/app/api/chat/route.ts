import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// 允许流式响应最长 30 秒
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 兼容两种调用方式：{ prompt } 或 { messages }
        const prompt = body.prompt || (body.messages?.[0]?.content) || '';
        const context = body.context;
        const anchor = body.anchor;
        const apiKey = body.apiKey;
        const modelName = body.model || 'gemini-1.5-flash';

        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Initialize Google AI with dynamic key or env var fallback
        const google = createGoogleGenerativeAI({
            apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });

        // Build System Prompt
        let systemPrompt = `You are a knowledgeable AI assistant who inspires curiosity.

Your response style:
1. Clear and accurate, using Markdown format (LaTeX for math supported)
2. Moderately detailed, but not too long
3. Naturally introduce 1-2 advanced concepts or terms that the user might not be familiar with, to spark curiosity
4. Use appropriate headings, lists, and code blocks to organize content

IMPORTANT: Respond in the SAME LANGUAGE as the user's question. If they ask in Chinese, respond in Chinese. If they ask in English, respond in English. Match the user's language exactly.`;

        // If there's context (follow-up scenario)
        if (context && anchor) {
            systemPrompt += `

The user is reading a response about a topic. They selected the text "${anchor}" and based on this, asked a new question.

Focus on answering the user's NEW question directly. The selected text is just context/starting point. Do not simply explain the selected text itself.

Previous context (for reference):
${context}`;
        }

        const result = streamText({
            // Use specific model from request or default
            model: google(modelName),
            system: systemPrompt,
            prompt: prompt,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(
            JSON.stringify({
                error: error.message || 'An error occurred',
                details: error.data || null
            }),
            {
                status: error.status || 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
