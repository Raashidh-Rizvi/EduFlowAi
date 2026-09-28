import api from './api';

const AI_MICROSERVICE_URL = 'http://localhost:8888';

// ─────────────────────────────────────────────────────────────────
// AI SERVICE — RAG Chat, Coach Chat, Slide Decks, Review workflows
// All calls include rich console logging to diagnose failures.
// ─────────────────────────────────────────────────────────────────

export const aiService = {
  async getPendingProposals() {
    const response = await api.get('/aireview/pending-proposals');
    return response.data;
  },

  async getWorkflows(status) {
    const response = await api.get('/aireview/workflows', { params: { status } });
    return response.data;
  },

  async getWorkflowById(id) {
    const response = await api.get(`/aireview/workflows/${id}`);
    return response.data;
  },

  async orchestrateStudyPlan(data) {
    const response = await api.post('/aireview/orchestrate', data);
    return response.data;
  },

  async generateQuiz(data) {
    const response = await api.post('/aireview/generate-quiz', data);
    return response.data;
  },

  async getRetentionInsights(data) {
    const response = await api.post('/aireview/retention-insights', data);
    return response.data;
  },

  async getAgentsTopology() {
    const response = await api.get('/aireview/agents-topology');
    return response.data;
  },

  async getToolsRegistry() {
    const response = await api.get('/aireview/tools-registry');
    return response.data;
  },

  async getObservabilityMetrics() {
    const response = await api.get('/aireview/observability-metrics');
    return response.data;
  },

  async submitDecision(proposalId, decision, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/decision`, { decision, comments });
    return response.data;
  },

  async approveProposal(proposalId, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/approve`, { comments });
    return response.data;
  },

  async rejectProposal(proposalId, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/reject`, { comments });
    return response.data;
  },

  async requestRevision(proposalId, comments) {
    const response = await api.post(`/aireview/proposals/${proposalId}/revise`, { comments });
    return response.data;
  },

  async updateProposal(proposalId, data) {
    const response = await api.put(`/aireview/proposals/${proposalId}`, data);
    return response.data;
  },

  // ─────────────────────────────────────────────────────────────────
  // AI COACH CHAT — Production path through .NET → fallback to Python directly
  // ─────────────────────────────────────────────────────────────────
  async chatWithCoach(message, studentId = '33333333-3333-3333-3333-333333333333', courseId = 'it3012-se', sourceFile = null) {
    const payload = {
      student_id: studentId,
      course_id: courseId,
      message: message,
      source_file: sourceFile || null
    };

    console.group('%c[AiService] 💬 AI Coach Chat', 'color: #9c27b0; font-weight: bold;');
    console.log('Message:', message);
    console.log('Student ID:', studentId);
    console.log('Course ID:', courseId);
    console.log('Source File:', sourceFile ?? '(none)');

    let backendResponse = null;

    // 1. Try production path through .NET Backend API Gateway (port 5204)
    console.log('');
    console.log('Step 1: Trying .NET backend path → POST /aireview/coach/chat');
    try {
      const response = await api.post('/aireview/coach/chat', payload);
      if (response && response.data && (response.data.reply || response.data.answer)) {
        if (response.data.source !== 'fallback') {
          console.log('✅ Backend responded with real AI answer');
          console.log('Source:', response.data.source);
          console.groupEnd();
          return response.data;
        }
        backendResponse = response.data;
        console.warn('⚠️ Backend returned fallback response, attempting direct AI microservice connection...');
      }
    } catch (err) {
      console.warn('❌ Backend /aireview/coach/chat unavailable');
      console.warn('  Status:', err.response?.status ?? 'No Response');
      console.warn('  Error:', err.friendlyMessage ?? err.message);
      console.warn('  Falling back to direct Python AI Microservice connection...');
    }

    // 2. Direct fallback bridge to Python AI Microservice (port 8888)
    const directUrl = `${AI_MICROSERVICE_URL}/ai-coach-chat`;
    console.log('');
    console.log('Step 2: Direct Python AI Microservice fallback → POST', directUrl);
    try {
      const directRes = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Direct AI Microservice HTTP Status:', directRes.status);
      if (directRes.ok) {
        const data = await directRes.json();
        console.log('✅ Direct AI Microservice responded successfully');
        console.log('Response:', data);
        console.groupEnd();
        return data;
      } else {
        const errBody = await directRes.text().catch(() => '(could not read body)');
        console.error('❌ Direct AI Microservice returned non-OK status:', directRes.status);
        console.error('Response Body:', errBody);
        console.error('Possible causes:');
        console.error('  - Python service is running but the /ai-coach-chat endpoint returned an error');
        console.error('  - Gemini/Groq API key is invalid or quota exceeded');
        console.error('  - No slides are indexed in ChromaDB (empty vector store)');
      }
    } catch (directErr) {
      console.error('❌ Direct AI Microservice UNREACHABLE at', directUrl);
      console.error('  Error:', directErr.message);
      console.error('  This means the Python FastAPI service is NOT running.');
      console.error('  Start it with: cd ai-agent && python -m uvicorn main:app --reload --port 8888');
    }

    console.groupEnd();
    return backendResponse;
  },

  // ─────────────────────────────────────────────────────────────────
  // GET SLIDE DECKS — Reads indexed lecture slides from ChromaDB
  // ─────────────────────────────────────────────────────────────────
  async getSlideDecks() {
    const url = `${AI_MICROSERVICE_URL}/api/v1/rag/slide-decks`;
    console.group('%c[AiService] 📚 Fetching Indexed Slide Decks', 'color: #607d8b; font-weight: bold;');
    console.log('URL:', url);
    console.log('This reads from ChromaDB vector store — no auth required');
    try {
      const res = await fetch(url);
      console.log('HTTP Status:', res.status);
      if (res.ok) {
        const data = await res.json();
        const decks = data.slide_decks || [];
        console.log(`✅ Found ${decks.length} indexed slide deck(s):`);
        decks.forEach((d, i) => {
          console.log(`  ${i + 1}. ${d.display_title ?? d.source_file} (${d.total_chunks} chunks) — Course: ${d.course_id}`);
        });
        if (decks.length === 0) {
          console.warn('⚠️ No slide decks are indexed! AI quiz generation will fall back to generic questions.');
          console.warn('  To index slides: POST to http://localhost:8888/api/v1/rag/index-pdf');
        }
        console.groupEnd();
        return decks;
      } else {
        const errText = await res.text().catch(() => '(could not read body)');
        console.error('❌ Failed to fetch slide decks — Status:', res.status);
        console.error('Response Body:', errText);
        console.groupEnd();
      }
    } catch (e) {
      console.error('❌ Could not reach Python AI Microservice to fetch slide decks');
      console.error('URL attempted:', url);
      console.error('Error:', e.message);
      console.error('Verify Python service is running: http://localhost:8888/health');
      console.groupEnd();
    }
    return [];
  },

  // ─────────────────────────────────────────────────────────────────
  // RAG CHAT — Direct Python microservice call for slide-grounded Q&A
  // ─────────────────────────────────────────────────────────────────
  async ragChat(question, courseId = 'it3012-se', moduleId = 'lecture-04', sourceFile = null) {
    const url = `${AI_MICROSERVICE_URL}/api/v1/rag/chat`;
    const payload = { question, course_id: courseId, module_id: moduleId, source_file: sourceFile };

    console.group('%c[AiService] 🔍 RAG Chat (Slide-Grounded Q&A)', 'color: #ff9800; font-weight: bold;');
    console.log('URL:', url);
    console.log('Question:', question);
    console.log('Course ID:', courseId);
    console.log('Module ID:', moduleId);
    console.log('Source File (strict mode):', sourceFile ?? '(none — searching all indexed slides)');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('HTTP Status:', res.status);

      if (!res.ok) {
        const errText = await res.text().catch(() => '(unreadable)');
        console.error('❌ RAG Chat returned non-OK status:', res.status);
        console.error('Response Body:', errText);
        console.error('Possible causes:');
        console.error('  - The Python RAG service threw an exception');
        console.error('  - LLM API key (Gemini/Groq) is invalid or missing in ai-agent/.env');
        console.error('  - ChromaDB is empty (no slides indexed)');
        console.groupEnd();
        throw new Error(`RAG Chat HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      console.log('✅ RAG Chat responded');
      console.log('Answer length:', data.answer?.length ?? 0, 'chars');
      console.log('Citations count:', data.citations?.length ?? 0);
      console.log('LLM Source:', data.source ?? 'unknown');
      console.log('Confidence Score:', data.confidence_score ?? 'N/A');
      if (data.citations?.length > 0) {
        console.log('Citations:');
        data.citations.forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.source_file} — Slide ${c.page_number} (relevance: ${c.relevance_score})`);
        });
      } else {
        console.warn('⚠️ No citations returned — answer may not be grounded in course slides');
      }
      console.groupEnd();
      return data;
    } catch (err) {
      if (!err.message.startsWith('RAG Chat HTTP')) {
        console.error('❌ Network error reaching RAG Chat endpoint');
        console.error('URL:', url);
        console.error('Error:', err.message);
        console.error('Verify Python service: http://localhost:8888/health');
      }
      console.groupEnd();
      throw err;
    }
  },
};
