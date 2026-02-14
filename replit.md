# BrightCare Daycare AI Agent Platform

## Overview
An AI agent application for BrightCare Daycare that serves two stakeholders:
1. **Parents/Guardians** - Chat with BrightBot AI assistant about daycare operations
2. **Technical Operators** - Manage knowledge base documents, prompts, and monitor AI performance

## Architecture
- **Frontend**: React + Vite with Tailwind CSS and shadcn/ui components
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI SDK (gpt-4o-mini) with direct API key - NOT Replit AI integrations
- **Key Requirement**: All OpenAI transactions flow through the user's own API key for tracing on platform.openai.com/traces

## Key Features
- Parent chat interface with AI agent powered by RAG documents
- Guardrail agent for COPPA/FERPA compliance and PII protection
- Evaluator agent for quality scoring
- Document management (knowledge base for RAG)
- Prompt management (system prompts, guardrails, behaviors)
- Monitoring dashboard with trace logs, token usage, and quality metrics

## Project Structure
```
client/src/
  App.tsx           - Main app with sidebar layout and routing
  components/
    app-sidebar.tsx  - Navigation sidebar
    theme-provider.tsx - Dark/light mode
    theme-toggle.tsx  - Theme switch button
  pages/
    chat.tsx         - Parent chat interface
    admin/
      documents.tsx  - Document CRUD management
      prompts.tsx    - Prompt CRUD management  
      monitoring.tsx - Trace logs dashboard

server/
  db.ts            - PostgreSQL connection with Drizzle
  routes.ts        - All API endpoints
  storage.ts       - Database storage layer (IStorage interface)
  openai-agent.ts  - AI agent with guardrails and evaluator
  seed.ts          - Initial seed data

shared/
  schema.ts        - Drizzle schema (documents, prompts, conversations, messages, traceLogs)
```

## Database Tables
- `users` - User accounts
- `documents` - Knowledge base documents for RAG
- `prompts` - System prompts and guardrail instructions
- `conversations` - Chat sessions
- `messages` - Chat messages
- `trace_logs` - OpenAI API trace logs with evaluator scores

## API Endpoints
- `GET/POST /api/documents` - Document CRUD
- `GET/POST /api/prompts` - Prompt CRUD
- `GET/POST /api/conversations` - Conversation CRUD
- `POST /api/conversations/:id/messages` - Send chat message
- `GET /api/trace-logs` - Trace log history
- `GET /api/trace-logs/stats` - Aggregate statistics

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key (user's own key for trace visibility)

## Running
```bash
npm run dev
```
Starts Express + Vite on port 5000.

## Design Tokens
- Font: Open Sans
- Primary color: Blue (205 85% hue)
- Dark mode supported via class-based toggle
