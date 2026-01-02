# Ariadne: Follow the thread of thought

**Ariadne** is an AI-powered canvas for non-linear thinking. It transforms the traditional chat interface into a visual thought map where ideas branch, connect, and evolve naturally.

> ✨ **No registration required** — Just open and start exploring. When you're done, if you want, download your entire thought map as a ZIP file containing both an interactive HTML and a Markdown summary.
> 
> 📝 **Currently only Gemini supported** — This is because the site is hosted on GitHub Pages (static hosting), and Google is the only major AI provider that allows direct browser-to-API calls without CORS restrictions. 

## The Problem

Human thinking rarely follows a straight line—it branches, backtracks, and leaps. Yet conventional AI chat interfaces enforce a rigid linear structure that:

- Flattens the natural branching paths of exploration
- Makes it difficult to maintain focus when reviewing past conversations  
- Forces users to repeatedly re-explain context for follow-up questions
- Causes **context drift** as language models struggle with redundant background information

## The Solution: Selection-to-Question

Ariadne introduces a simple but powerful interaction: **select any text in an AI response to ask a follow-up question**.

This design is built on a practical insight: in any coherent inquiry, the starting point for each new question always lies somewhere within a previous answer.

### How It Works

1. **Card-based conversations** — Each Q&A exchange is displayed as a visual card
2. **Anchor selection** — Highlight any text within a response to create a precise context anchor
3. **Automatic context** — The selected text becomes part of your next prompt, giving the AI clean, focused context
4. **Visual connections** — Each selection creates a link between cards, organically weaving your linear chat into a **Global Thought Map**

### The Result

- 🎯 **Precise context** — No more re-explaining what you meant
- 🔄 **Zero drift** — The AI always knows exactly what you're building on
- 🗺️ **Visual overview** — See your entire exploration at a glance
- 🔀 **Natural branching** — Return to any node to start a new line of inquiry

---

*Built with Next.js, React Flow, and modern AI APIs.*

