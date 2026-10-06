# EduFlow AI — React Frontend

React/Vite web application with Admin, Instructor and Student views. The existing StudentPortal AI Assistant provides lecture selection, chat/citations, topic breakdown, study plans and explanation through the ASP.NET gateway.

From `frontend/`:

```powershell
npm ci
npm run dev
npm run build
```

Default UI port: 2174. `VITE_API_BASE_URL` configures the ASP.NET API, normally `http://localhost:5204/api`; Learning requests do not go directly to Python. The root dev runner also starts the frontend, so use one launch method.

[Application](src/App.jsx) · [API client](src/services/api.js) · [Learning API service](src/services/aiService.js) · [Focused test evidence](../docs/members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md)

Learning tests do not certify every page or every role's functionality. [Authority](../docs/00_SOURCE_OF_TRUTH.md) · [Catalog](../docs/INDEX.md) · [Setup](../docs/current/LOCAL_SETUP_GUIDE.md)
