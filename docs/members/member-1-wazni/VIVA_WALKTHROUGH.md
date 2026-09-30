# Member 1 — Practical Viva Walkthrough

[Contribution evidence](CONTRIBUTION_SUMMARY.md) · [Learning implementation](ai/LEARNING_AGENT.md) · [Test evidence](ai/LEARNING_AGENT_TEST_EVIDENCE.md)

## My role

I am Wazni, IT24103352. My software responsibility is Admin-side User Management and Admin/platform Course Management. Instructor academic authoring is a coordinated boundary with Raashidh. My AI responsibility is the Learning Agent. I reused the shared RAG foundation primarily implemented by Atheek.

User Management: **Detailed implementation verification pending software audit.**

Course Management: **Detailed implementation verification pending software audit.**

Do not demonstrate unverified software features as completed work. Explain current scope and the next audit honestly.

## Explain the Learning Agent in simple terms

The student chooses an indexed lecture. My agent routes their learning request to one of three tools:

1. **Breakdown:** groups actual slides into logical sections with titles, page ranges and topics.
2. **Planner:** turns the complete lecture or selected section into manageable study sessions.
3. **Explainer:** retrieves relevant material from the selected topic and explains it simply with slide citations.

RAG is the shared evidence pipeline: PDF → parsing/chunking → embeddings → Chroma → retrieved excerpts → model answer/citations. The agent coordinates tasks; it does not replace that pipeline.

Browser requests go **React → ASP.NET Core → Python**. ASP.NET authenticates the user and forwards to LearningAgent. Python validates requests and calls the appropriate tool. Responses return through the same gateway to the existing StudentPortal UI.

STM keeps the latest three completed user/assistant pairs. The next answer receives up to six historical messages plus the new question. The key isolates user, session and lecture/course scope. Oldest pairs are dropped; restart clears the memory. This is not long-term storage.

## Demonstration sequence

1. Ensure the three services run and the real lecture is already indexed.
2. Log in with an existing authorized student account; open AI Assistant.
3. Show global Q&A, then select IT3091 Machine Learning Lecture 1.
4. Ask a lecture question; inspect slide citations and ask a follow-up.
5. Click Break Into Topics; show section titles, slide ranges and key topics.
6. Select a section and click Study This Topic; show its sessions and section identity.
7. Select a concrete subtopic, such as the generated Data Mining definition entry, and click Explain This Topic.
8. Compare explanation citations with that section's slides; demonstrate Deep Dive if useful.
9. Request Complete Lecture Study Plan.
10. Explain the focused tests: 32 Python, 12 gateway, four mocked frontend regressions and two real frontend tests passed in the recorded run.

The demo uses actual indexed material, not fixed topic arrays or fake fallback learning plans. A missing service/index should produce a visible error, not claimed success.

## Likely questions and short answers

| Question | Answer |
|---|---|
| Why an agent rather than one chat prompt? | It routes distinct learning operations to typed tools with validation and scope control. |
| What did you build versus reuse? | I built Learning orchestration/tools/STM and required integration/tests; I reused shared RAG, authentication, gateway infrastructure and existing UI. |
| How does a topic remain scoped? | A returned section ID resolves to the selected source and page range; planning restricts context and explanation filters retrieval. |
| What prevents invented topic lists? | Generation uses indexed text and validates slide coverage/schema; failure is reported. Semantic grounding still needs evaluation. |
| Why citations? | They identify the source slides used so learners can inspect evidence. They are not a blanket guarantee of model correctness. |
| What happens after the fourth chat pair? | Only the most recent three completed pairs remain. |
| Can another student read this memory? | Different student/session/scope keys do not share history; missing identity/session stays stateless. |
| What if the model fails? | Chat can show identified extractive RAG; structured learning tools return a retryable error rather than fake plans. |
| Is Quiz Generator your responsibility? | No. Raashidh owns it; distinct-agent completion is not claimed here. |
| Is RAG a third agent? | No, it is shared infrastructure. Member 3's final assessed AI allocation needs confirmation. |

## Known limits and evaluation honesty

STM resets on Python restart. Broad follow-up retrieval can select introductory slides. The old breakdown timeout was not reproduced and no production timeout changed. Indexing is required before discovery. Software audit, full-project completion and lecturer approval remain separate/unverified matters.

Follow the official assessment rules: prepare using this walkthrough, but do not use external AI assistance to answer or modify work during an evaluation where it is prohibited. The application's own Learning Agent is the feature being demonstrated.
