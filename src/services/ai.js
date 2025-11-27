import { getApiKey } from './db';

export async function getExplanation(question, selectedOptionIndex, correctOptionIndex) {
    const apiKey = await getApiKey();

    if (!apiKey) {
        throw new Error("API Key not found. Please set it in Settings.");
    }

    const selectedOption = question.options[selectedOptionIndex];
    const correctOption = question.options[correctOptionIndex];

    const prompt = `
    You are a helpful statistics tutor.
    The user answered a question about "${question.category}".
    
    Question: "${question.text}"
    
    Options:
    ${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}
    
    The user selected: "${selectedOption}"
    The correct answer is: "${correctOption}"
    
    Please explain why the correct answer is correct and why the user's answer (if different) might be incorrect.
    Keep the explanation concise and easy to understand.
  `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful statistics tutor." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to fetch explanation");
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
}
