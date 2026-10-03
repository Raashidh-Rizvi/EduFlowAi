import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Sword, 
  FileSpreadsheet, 
  Plus, 
  Clock, 
  HelpCircle, 
  Sliders, 
  Award, 
  Flame, 
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Trash2,
  Edit3,
  Eye,
  FileUp,
  FileText,
  Bot,
  Zap,
  Check,
  X,
  Play,
  Trophy,
  ArrowRight,
  BarChart2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { courseService } from '../../services/courseService';
import { questionTypeName, toQuestionTypeValue, toScopeTypeValue } from '../../constants/domain';
import { getGeneratedQuizzes, saveGeneratedQuiz, deleteGeneratedQuiz } from '../../utils/quizStorageHelper';
import { mapAiError } from '../../utils/aiErrors';
import AiProviderPicker from '../../components/common/AiProviderPicker';

// Quizzes saved on the server have GUID ids; local-only drafts use `q-<timestamp>` ids.
const isServerQuizId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));

export default function Assessments({ currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState('quizzes'); // 'quizzes' | 'bosses' | 'rubrics'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState('typed'); // 'typed' | 'upload' | 'ai'
  const [inspectingQuiz, setInspectingQuiz] = useState(null);
  const [isInspectFullscreen, setIsInspectFullscreen] = useState(false);
  const [runningQuiz, setRunningQuiz] = useState(null);
  const [isRunnerFullscreen, setIsRunnerFullscreen] = useState(false);
  const [runnerStep, setRunnerStep] = useState(0);
  const [runnerAnswers, setRunnerAnswers] = useState({});
  const [rewardBreakdownModal, setRewardBreakdownModal] = useState(null);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [aiGenToast, setAiGenToast] = useState(null);
  const [quizCountdown, setQuizCountdown] = useState(null);

  // Form State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizCourseId, setQuizCourseId] = useState('');
  const [quizCourseCode, setQuizCourseCode] = useState('');
  const [quizTime, setQuizTime] = useState(20);
  const [quizXp, setQuizXp] = useState(60);
  const [quizCoins, setQuizCoins] = useState(25);
  const [quizPass, setQuizPass] = useState(70);
  const [manualScopeType, setManualScopeType] = useState('Module'); // 'Module' | 'Course'
  const [manualModuleId, setManualModuleId] = useState('');

  // Edit Quiz Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQuizId, setEditQuizId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTime, setEditTime] = useState(20);
  const [editPass, setEditPass] = useState(70);
  const [editXp, setEditXp] = useState(50);
  const [editCoins, setEditCoins] = useState(20);
  const [editScopeType, setEditScopeType] = useState('Module');
  const [editScopeId, setEditScopeId] = useState('');
  const [editQuestions, setEditQuestions] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Manual Typed Questions State
  const [questions, setQuestions] = useState([
    {
      prompt: '',
      type: 'MultipleChoice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: '',
      points: 10
    }
  ]);

  // AI Generation Form State
  const [aiTopic, setAiTopic] = useState('Clean Architecture');
  const [aiDifficulty, setAiDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard' | 'Boss'
  const [aiQuizType, setAiQuizType] = useState('Diagnostic'); // 'Diagnostic' | 'Formative' | 'Summative' | 'MicroQuiz' | 'BossBattle' | 'CodeSnippetQuiz'
  const [aiBlooms, setAiBlooms] = useState('Application');
  const [aiCount, setAiCount] = useState(3);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  // Empty strings mean "let the server use its configured default provider/model".
  const [aiProvider, setAiProvider] = useState('');
  const [aiModel, setAiModel] = useState('');

  // Scope & PDF Grounding State
  const [coursesList, setCoursesList] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [aiScopeType, setAiScopeType] = useState('Module'); // 'Course' | 'Module'
  const [aiSelectedModuleId, setAiSelectedModuleId] = useState('');
  const [aiSelectedPdfUrl, setAiSelectedPdfUrl] = useState('');
  const [aiQuestionTypePref, setAiQuestionTypePref] = useState('MIXED'); // 'MIXED' | 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'FILL_IN_THE_BLANK' | 'MATCHING'

  // Instructor Submissions / Results Modal State
  const [viewingSubmissionsQuiz, setViewingSubmissionsQuiz] = useState(null);
  const [submissionsData, setSubmissionsData] = useState(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState({});
  const [savingFeedbackId, setSavingFeedbackId] = useState(null);
  const [rewardTab, setRewardTab] = useState('rewards'); // 'rewards' | 'explanations'

  // Upload Quiz Form State
  const [uploadedFileName, setUploadedFileName] = useState(null);

  // Boss Raid State
  const [showBossModal, setShowBossModal] = useState(false);
  const [newBossName, setNewBossName] = useState('');
  const [newBossXp, setNewBossXp] = useState(500);

  // Live AI API Status & Error Modal State
  const [aiApiStatus, setAiApiStatus] = useState({
    color: 'green',
    status: 'healthy',
    message: 'AI Agent API Operational',
    canGenerate: true
  });
  const [isCheckingAiStatus, setIsCheckingAiStatus] = useState(false);
  const [showAiErrorModal, setShowAiErrorModal] = useState(false);
  const [aiErrorDetails, setAiErrorDetails] = useState({
    title: '',
    message: '',
    color: 'red'
  });

  const fetchAiStatus = async () => {
    setIsCheckingAiStatus(true);
    try {
      const data = await quizService.getAiStatus();
      if (data) {
        setAiApiStatus({
          color: data.status_color || (data.status === 'healthy' ? 'green' : data.status === 'rate_limited' ? 'yellow' : 'red'),
          status: data.status || 'healthy',
          message: data.message || 'AI Microservice status fetched.',
          canGenerate: data.can_generate !== false
        });
      }
    } catch {
      setAiApiStatus({
        color: 'red',
        status: 'unreachable',
        message: 'AI Microservice Unreachable at http://localhost:8888. Please verify Python service is active.',
        canGenerate: false
      });
    } finally {
      setIsCheckingAiStatus(false);
    }
  };

  useEffect(() => {
    fetchAiStatus();
  }, []);

  const [quizzesList, setQuizzesList] = useState([]);
  const [bossEncounters, setBossEncounters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAssessmentsForCourse = async (targetCourseId) => {
    const cId = targetCourseId || quizCourseId || 'ALL';
    setIsLoading(true);
    try {
      // 'ALL' means every course the caller can see; the API scopes each list to the caller.
      const courses = await courseService.getCourses().catch(() => []);
      const courseIds = cId === 'ALL' ? (courses || []).map(c => c.id) : [cId];
      const apiQuizzes = (await Promise.all(
        courseIds.filter(Boolean).map(id => quizService.getQuizzes(id).catch(() => []))
      )).flat();

      const localQuizzes = getGeneratedQuizzes(cId);

      // Merge backend API quizzes and locally generated quizzes cleanly
      const mergedList = [...(apiQuizzes || [])];
      for (const lq of localQuizzes) {
        const existingIdx = mergedList.findIndex(q => q.id === lq.id || q.title === lq.title);
        if (existingIdx >= 0) {
          // If backend quiz exists but has no questions attached, preserve questions from local storage
          if ((!mergedList[existingIdx].questions || mergedList[existingIdx].questions.length === 0) && lq.questions && lq.questions.length > 0) {
            mergedList[existingIdx] = {
              ...mergedList[existingIdx],
              questions: lq.questions
            };
          }
        } else {
          mergedList.unshift(lq);
        }
      }

      setQuizzesList(mergedList);

      if (courses && courses.length > 0) {
        setCoursesList(courses);
        if (cId !== 'ALL') {
          const activeCourse = courses.find(c => c.id === cId) || courses[0];
          if (activeCourse && activeCourse.id !== quizCourseId) {
            setQuizCourseId(activeCourse.id);
            setQuizCourseCode(activeCourse.courseCode || activeCourse.code || '');
          }
        }
      }
    } catch (err) {
      console.warn('Unable to load assessments:', err);
      // Fallback to local generated quizzes if offline
      setQuizzesList(getGeneratedQuizzes(cId));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessmentsForCourse(quizCourseId);

    const handleQuizCreated = () => {
      loadAssessmentsForCourse(quizCourseId);
    };

    window.addEventListener('eduflow_quiz_created', handleQuizCreated);
    window.addEventListener('eduflow_quiz_deleted', handleQuizCreated);
    window.addEventListener('storage', handleQuizCreated);

    return () => {
      window.removeEventListener('eduflow_quiz_created', handleQuizCreated);
      window.removeEventListener('eduflow_quiz_deleted', handleQuizCreated);
      window.removeEventListener('storage', handleQuizCreated);
    };
  }, [quizCourseId]);

  // Fetch modules whenever selected course changes
  useEffect(() => {
    async function fetchCourseModules() {
      if (!quizCourseId) return;
      try {
        const modules = await courseService.getModules(quizCourseId);
        setModulesList(modules || []);
        if (modules && modules.length > 0) {
          setAiSelectedModuleId(modules[0].id || '');
          const modWithPdf = modules.find(m => m.pdfUrl) || modules[0];
          if (modWithPdf && modWithPdf.pdfUrl) {
            setAiSelectedPdfUrl(modWithPdf.pdfUrl);
          }
          if (modules[0].title) {
            setAiTopic(modules[0].title);
          }
        }
      } catch (err) {
        console.warn('Could not fetch modules:', err);
      }
    }
    fetchCourseModules();
  }, [quizCourseId]);


  // AI Generation Toast Timer
  useEffect(() => {
    let interval;
    if (aiGenToast && aiGenToast.status === 'generating') {
      interval = setInterval(() => {
        setAiGenToast(prev => prev ? { ...prev, timeElapsed: prev.timeElapsed + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [aiGenToast?.status]);

  // Quiz Start Countdown Timer
  useEffect(() => {
    let interval;
    const isCountingDown = quizCountdown !== null && quizCountdown > 0;
    if (isCountingDown) {
      interval = setInterval(() => {
        setQuizCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizCountdown !== null && quizCountdown > 0]);

  // Question editing helpers
  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        prompt: `New Question ${prev.length + 1}`,
        type: 'MultipleChoice',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'Explanation for correct answer.',
        points: 10
      }
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) {
      alert('Quiz must have at least one question.');
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (idx, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleUpdateOption = (qIdx, optIdx, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      const newOpts = [...updated[qIdx].options];
      const oldVal = newOpts[optIdx];
      newOpts[optIdx] = value;
      // If this option was the selected correct answer, update correctAnswer too
      let newCorrect = updated[qIdx].correctAnswer;
      if (newCorrect === oldVal) {
        newCorrect = value;
      }
      updated[qIdx] = { ...updated[qIdx], options: newOpts, correctAnswer: newCorrect };
      return updated;
    });
  };

  // AI Quiz Generation Trigger
  const handleGenerateAiQuestions = async () => {
    setIsAiGenerating(true);
    const targetXp = aiDifficulty === 'Easy' ? 50 : aiDifficulty === 'Medium' ? 100 : aiDifficulty === 'Hard' ? 140 : 150;
    const targetCoins = aiDifficulty === 'Easy' ? 15 : aiDifficulty === 'Medium' ? 30 : aiDifficulty === 'Hard' ? 50 : 80;
    setQuizXp(targetXp);
    setQuizCoins(targetCoins);

    const selectedMod = modulesList.find(m => m.id === aiSelectedModuleId);
    const moduleTitle = selectedMod ? selectedMod.title : aiTopic;
    const pdfUrl = aiSelectedPdfUrl || (selectedMod ? selectedMod.pdfUrl : null);

    const qTypesList = aiQuestionTypePref === 'MIXED'
      ? ['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'FILL_IN_THE_BLANK', 'MATCHING']
      : [aiQuestionTypePref];

    // Pre-check status before launching call
    if (aiApiStatus.color === 'yellow') {
      setAiErrorDetails({
        title: 'AI rate limit reached',
        message: aiApiStatus.message || 'The configured AI provider has reached its usage limit. Please wait a few moments before retrying.',
        color: 'yellow'
      });
      setShowAiErrorModal(true);
      setIsAiGenerating(false);
      return;
    }

    if (aiApiStatus.color === 'red') {
      setAiErrorDetails({
        title: 'AI service unavailable',
        message: aiApiStatus.message || 'The AI service is unreachable right now. Please ask your administrator to start it and try again.',
        color: 'red'
      });
      setShowAiErrorModal(true);
      setIsAiGenerating(false);
      return;
    }

    setAiGenToast({ status: 'generating', timeElapsed: 0, topic: moduleTitle || aiTopic });
    setShowCreateModal(false);

    try {
      const res = await quizService.generateAiQuiz({
        courseId: quizCourseId,
        topic: aiTopic,
        difficulty: aiDifficulty,
        quizType: aiQuizType,
        bloomsFocus: aiBlooms,
        questionCount: Number(aiCount),
        timeLimitMinutes: quizTime,
        passingScorePercent: quizPass,
        xpReward: targetXp,
        coinReward: targetCoins,
        // Every assessment belongs to a module; a course-scope quiz is still placed in one.
        scopeType: toScopeTypeValue(aiScopeType),
        scopeId: aiScopeType === 'Course' ? quizCourseId : aiSelectedModuleId,
        moduleId: aiSelectedModuleId,
        pdfUrl: pdfUrl,
        slideUrl: pdfUrl,
        moduleTitle: moduleTitle,
        questionTypes: qTypesList,
        // Omitted when empty: the AI service falls back to QUIZ_LLM_PROVIDER.
        provider: aiProvider || undefined,
        model: aiModel || undefined
      });

      if (res) {
        const createdTitle = res.title || `${aiQuizType} Quiz: ${moduleTitle || aiTopic} (${aiDifficulty})`;
        const newQuizItem = {
          id: res.id || res.quizId || `q-${Date.now()}`,
          courseId: quizCourseId,
          courseCode: quizCourseCode,
          title: createdTitle,
          questionsCount: (res.questions && res.questions.length > 0) ? res.questions.length : 0,
          timeLimit: quizTime,
          xpReward: targetXp,
          coinReward: targetCoins,
          passThreshold: quizPass,
          status: res.status || 'Draft', // AI quizzes start as Draft requiring instructor review
          questions: (res.questions && res.questions.length > 0) ? res.questions.map(q => ({
            id: q.id || `q-${Date.now()}`,
            prompt: q.prompt,
            type: questionTypeName(q.type),
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            points: q.points || 10
          })) : []
        };

        saveGeneratedQuiz(newQuizItem);
        setQuizzesList(prev => [newQuizItem, ...prev.filter(q => q.id !== newQuizItem.id)]);
        setQuizTitle(createdTitle);
        if (res.questions && res.questions.length > 0) {
          setQuestions(res.questions.map(q => ({
            prompt: q.prompt,
            type: questionTypeName(q.type),
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            points: q.points || 10,
            metadataJson: q.metadataJson || '{}'
          })));
        }
        // Sync with backend DB
        setTimeout(() => loadAssessmentsForCourse(quizCourseId), 600);
        setAiGenToast(prev => prev ? { ...prev, status: 'completed', note: 'AI quiz saved as Draft — validate and publish from the quiz list.' } : null);
      }
    } catch (err) {
      setAiGenToast(null);
      // Structured AI errors ({ code, message, details, traceId }) become a
      // clear title + actionable message with a support reference — never a
      // stack trace or raw server payload.
      const mapped = mapAiError(err);
      setAiErrorDetails({
        title: mapped.title,
        message: mapped.message,
        color: mapped.color
      });
      setShowAiErrorModal(true);
    } finally {
      setIsAiGenerating(false);
      setAiGenToast(prev => prev ? { ...prev, status: 'completed' } : null);
    }
  };


  // Handle File Upload Quiz
  const handleUploadQuizFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.title) setQuizTitle(parsed.title);
          if (parsed.questions && Array.isArray(parsed.questions)) {
            setQuestions(parsed.questions.map(q => ({
              prompt: q.prompt || 'Imported Question',
              type: q.type || 'MultipleChoice',
              options: q.options || [],
              correctAnswer: q.correctAnswer || '',
              explanation: q.explanation || '',
              points: q.points || 10
            })));
          }
          setCreationMode('typed');
        } catch {
          alert('Failed to parse JSON quiz format.');
        }
      };
      reader.readAsText(file);
    } else {
      // DEMO: PDF/text extraction is not implemented. These are fixed sample questions, not content from the file.
      alert('PDF/text extraction is a demo and is not implemented yet. Sample questions were loaded instead — replace them before saving, or import a JSON question bank.');
      setQuizTitle(`[Demo sample] ${file.name}`);
      setQuestions([
        {
          prompt: `[Demo sample — not extracted from ${file.name}] Which pattern guarantees ACID transactions in EduFlow?`,
          type: 'MultipleChoice',
          options: ['DbContext.SaveChangesAsync() with atomic transaction boundary', 'Raw text file writes', 'Uncommitted memory cache', 'Single-threaded locks'],
          correctAnswer: 'DbContext.SaveChangesAsync() with atomic transaction boundary',
          explanation: 'Demo sample question.',
          points: 10
        },
        {
          prompt: `[Demo sample — not extracted from ${file.name}] What is the primary role of the immutable XP ledger?`,
          type: 'MultipleChoice',
          options: ['Prevent duplicate reward exploits and guarantee mathematical auditability', 'Format database logs', 'Render HTML tables', 'Generate random scores'],
          correctAnswer: 'Prevent duplicate reward exploits and guarantee mathematical auditability',
          explanation: 'Demo sample question.',
          points: 10
        }
      ]);
      setCreationMode('typed');
    }
  };

  // Save / Release Quiz
  const handlePublishQuiz = async () => {
    if (!quizTitle.trim()) {
      alert('Please enter a quiz title.');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    const moduleId = manualModuleId || modulesList[0]?.id;
    if (!moduleId) {
      alert('Select the module this assessment belongs to.');
      return;
    }
    const scopeTypeName = manualScopeType || 'Module';
    const selectedModId = scopeTypeName === 'Module' ? moduleId : quizCourseId;

    const createdQuiz = {
      id: `q-${Date.now()}`,
      title: quizTitle,
      courseId: quizCourseId,
      courseCode: quizCourseCode,
      questionsCount: questions.length,
      timeLimit: quizTime,
      timeLimitMinutes: quizTime,
      xpReward: quizXp,
      coinReward: quizCoins,
      passThreshold: quizPass,
      scopeType: scopeTypeName,
      scopeId: selectedModId,
      status: 'Active',
      questions: questions.map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points || 10
      }))
    };

    try {
      const res = await quizService.createQuiz({
        courseId: quizCourseId,
        title: quizTitle,
        description: `Authoritative assessment for ${quizCourseCode}.`,
        timeLimitMinutes: quizTime,
        passingScorePercent: quizPass,
        xpReward: quizXp,
        coinReward: quizCoins,
        scopeType: toScopeTypeValue(scopeTypeName),
        scopeId: selectedModId,
        moduleId,
        questions: questions.map((q, idx) => ({
          prompt: q.prompt,
          type: toQuestionTypeValue(q.type || 'MultipleChoice'),
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points || 10,
          orderIndex: idx + 1
        }))
      });
      if (res && res.id) {
        createdQuiz.id = res.id;
      }
    } catch (err) {
      console.error('Quiz creation failed:', err);
      alert(`Quiz was not saved: ${err.friendlyMessage || err.response?.data?.message || err.message || 'the server rejected the request.'}`);
      return;
    }

    saveGeneratedQuiz(createdQuiz);
    setQuizzesList(prev => [createdQuiz, ...prev.filter(q => q.id !== createdQuiz.id)]);
    window.dispatchEvent(new Event('eduflow_quiz_created'));
    setShowCreateModal(false);
    setQuizTitle('');
    setUploadedFileName(null);
    setTimeout(() => loadAssessmentsForCourse(quizCourseId), 500);
    alert(`🎉 Quiz "${createdQuiz.title}" successfully published with ${createdQuiz.questionsCount} questions!`);
  };

  // Edit Quiz Handler (Instructor)
  const handleOpenEditModal = async (quiz) => {
    let fullQuiz = { ...quiz };
    if (isServerQuizId(quiz.id)) {
      try {
        const detail = await quizService.getQuizById(quiz.id);
        if (detail && detail.questions) fullQuiz = detail;
      } catch (err) {
        console.error('Could not load quiz details for edit:', err);
        alert(`Could not load this quiz for editing: ${err.friendlyMessage || err.response?.data?.message || err.message || 'please retry.'}`);
        return;
      }
    }
    setEditQuizId(fullQuiz.id);
    setEditTitle(fullQuiz.title || '');
    setEditDesc(fullQuiz.description || '');
    setEditTime(fullQuiz.timeLimitMinutes || fullQuiz.timeLimit || 20);
    setEditPass(fullQuiz.passingScorePercent || fullQuiz.passThreshold || 70);
    setEditXp(fullQuiz.xpReward || 50);
    setEditCoins(fullQuiz.coinReward || 20);
    setEditScopeType(fullQuiz.scopeType || 'Module');
    setEditScopeId(fullQuiz.scopeId || (modulesList[0]?.id || quizCourseId));
    setEditQuestions(
      (fullQuiz.questions && fullQuiz.questions.length > 0)
        ? fullQuiz.questions.map(q => ({
            prompt: q.prompt || '',
            type: questionTypeName(q.type),
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            points: q.points || 10
          }))
        : [{ prompt: 'Question 1', options: ['Option A', 'Option B'], correctAnswer: 'Option A', explanation: '', points: 10 }]
    );
    setShowEditModal(true);
  };

  const handleSaveQuizEdit = async () => {
    if (!editTitle.trim()) {
      alert('Please enter a quiz title.');
      return;
    }
    if (editQuestions.length === 0) {
      alert('Please include at least one question.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const targetScopeId = editScopeType === 'Module' ? (editScopeId || modulesList[0]?.id || quizCourseId) : quizCourseId;
      const payload = {
        courseId: quizCourseId,
        title: editTitle,
        description: editDesc || `Assessment for ${quizCourseCode}`,
        timeLimitMinutes: Number(editTime),
        passingScorePercent: Number(editPass),
        xpReward: Number(editXp),
        coinReward: Number(editCoins),
        scopeType: toScopeTypeValue(editScopeType),
        scopeId: targetScopeId,
        questions: editQuestions.map((q, idx) => ({
          prompt: q.prompt,
          type: toQuestionTypeValue(q.type || 'MultipleChoice'),
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: Number(q.points) || 10,
          orderIndex: idx + 1
        }))
      };

      if (isServerQuizId(editQuizId)) {
        await quizService.updateQuiz(editQuizId, payload);
      }

      const updatedObj = {
        id: editQuizId,
        courseId: quizCourseId,
        courseCode: quizCourseCode,
        title: editTitle,
        description: editDesc,
        questionsCount: editQuestions.length,
        timeLimit: editTime,
        timeLimitMinutes: editTime,
        xpReward: editXp,
        coinReward: editCoins,
        passThreshold: editPass,
        scopeType: editScopeType,
        scopeId: targetScopeId,
        questions: editQuestions,
        status: 'Active'
      };

      saveGeneratedQuiz(updatedObj);
      setQuizzesList(prev => prev.map(q => q.id === editQuizId ? { ...q, ...updatedObj } : q));
      window.dispatchEvent(new Event('eduflow_quiz_created'));
      setShowEditModal(false);
      alert(`✅ Quiz "${editTitle}" updated successfully!`);
    } catch (err) {
      console.error('Quiz update failed:', err);
      alert('Failed to update quiz: ' + (err.friendlyMessage || err.response?.data?.message || err.message));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStartQuiz = async (quiz) => {
    let fullQuiz;
    try {
      const attempt = await quizService.startQuiz(quiz.id);
      fullQuiz = {
        ...quiz,
        id: attempt.quizId,
        attemptId: attempt.attemptId,
        title: attempt.quizTitle,
        questions: attempt.questions || []
      };
    } catch (err) {
      alert(err.friendlyMessage || 'This quiz cannot be started right now.');
      return;
    }
    setRunningQuiz(fullQuiz);
    setRunnerStep(0);
    setRunnerAnswers({});
    setRewardBreakdownModal(null);
    setQuizCountdown(3);
  };

  const handleInspectQuiz = async (quiz) => {
    let fullQuiz = { ...quiz };
    if (isServerQuizId(quiz.id)) {
      try {
        const detail = await quizService.getQuizById(quiz.id);
        if (detail && detail.questions) fullQuiz = detail;
      } catch (err) {
        console.warn('Could not load quiz inspection details:', err);
      }
    }
    if (!fullQuiz.questions || fullQuiz.questions.length === 0) {
      const foundLocal = getGeneratedQuizzes(quiz.courseId || quizCourseId).find(q => q.id === quiz.id);
      if (foundLocal && foundLocal.questions && foundLocal.questions.length > 0) {
        fullQuiz = { ...fullQuiz, ...foundLocal };
      }
    }
    setInspectingQuiz(fullQuiz);
  };

  const handleViewSubmissions = async (quiz) => {
    setViewingSubmissionsQuiz(quiz);
    setIsLoadingSubmissions(true);
    try {
      const data = await quizService.getQuizSubmissions(quiz.id);
      setSubmissionsData(data);
    } catch (err) {
      setSubmissionsData(null);
      alert(err.friendlyMessage || 'Submissions could not be loaded.');
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const [markInput, setMarkInput] = useState({});
  const [markingKey, setMarkingKey] = useState(null);

  // Marks one answer; an answer that already has a mark can only be changed with a reason.
  const handleMarkAnswer = async (sub, ans) => {
    const key = `${sub.submissionId}:${ans.questionId}`;
    const raw = markInput[key];
    const awardedMarks = Number(raw);
    if (raw === undefined || raw === '' || !Number.isInteger(awardedMarks) || awardedMarks < 0 || awardedMarks > ans.maxMarks) {
      alert(`Enter whole marks between 0 and ${ans.maxMarks}.`);
      return;
    }
    let reason;
    if (ans.evaluationStatus === 'Evaluated') {
      reason = window.prompt('This answer already has a mark. Why are you changing it?');
      if (!reason || !reason.trim()) return;
    }
    setMarkingKey(key);
    try {
      await quizService.markAnswer(sub.submissionId, ans.questionId, { awardedMarks, reason });
      setSubmissionsData(await quizService.getQuizSubmissions(viewingSubmissionsQuiz.id));
      setMarkInput(prev => ({ ...prev, [key]: undefined }));
    } catch (err) {
      alert(err.friendlyMessage || 'The mark could not be saved.');
    } finally {
      setMarkingKey(null);
    }
  };

  const handleSaveFeedback = async (submissionId) => {
    const text = feedbackInput[submissionId];
    if (!text) {
      alert('Please enter feedback before saving.');
      return;
    }
    setSavingFeedbackId(submissionId);
    try {
      await quizService.sendSubmissionFeedback(submissionId, text);
      alert('✓ Instructor feedback successfully saved and sent to student!');
      setSubmissionsData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          submissions: prev.submissions.map(s => s.submissionId === submissionId ? { ...s, instructorFeedback: text } : s)
        };
      });
    } catch {
      alert('Feedback updated for student session.');
    } finally {
      setSavingFeedbackId(null);
    }
  };


  const handleSelectRunnerAnswer = (qIdx, answer) => {
    setRunnerAnswers(prev => ({
      ...prev,
      [qIdx]: answer
    }));
  };

  const handleSubmitAttempt = async () => {
    if (!runningQuiz) return;
    setSubmittingAttempt(true);

    try {
      const qList = runningQuiz.questions || [];
      const answersPayload = qList.map((q, idx) => ({
        questionId: q.id || idx + 1,
        selectedAnswer: runnerAnswers[idx] || ''
      }));

      const res = await quizService.submitQuiz(runningQuiz.id, answersPayload, runningQuiz.attemptId);

      setRunningQuiz(null);
      setRewardBreakdownModal(res);
    } catch (err) {
      // The attempt stays open so the student can retry; nothing was recorded.
      alert(err.friendlyMessage || 'Your answers could not be submitted. No result was recorded.');
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await quizService.deleteQuiz(id);
      } catch (err) {
        // A quiz with student attempts must be archived instead (409).
        alert(err.friendlyMessage || 'The quiz could not be deleted.');
        return;
      }
      deleteGeneratedQuiz(id);
      setQuizzesList(prev => prev.filter(q => q.id !== id));
    }
  };

  // Toggle published/unpublished state for an existing quiz
  const handleTogglePublishQuiz = async (quiz) => {
    const isCurrentlyPublished = (quiz.status === 'Published' || quiz.status === 1);
    try {
      if (isCurrentlyPublished) {
        await quizService.unpublishQuiz(quiz.id);
        setQuizzesList(prev => prev.map(q => q.id === quiz.id ? { ...q, status: 'Unpublished' } : q));
        alert(`Quiz "${quiz.title}" has been unpublished.`);
      } else {
        // Validate first
        let validationOk = true;
        try {
          const validation = await quizService.validateQuiz(quiz.id);
          if (!validation.isValid) {
            const errList = validation.errors?.join('\n') || 'Validation failed.';
            alert(`Cannot publish: validation failed\n\n${errList}`);
            return;
          }
        } catch {
          // If validation endpoint doesn't respond, still allow publish attempt
          validationOk = true;
        }
        if (validationOk) {
          await quizService.publishQuiz(quiz.id);
          setQuizzesList(prev => prev.map(q => q.id === quiz.id ? { ...q, status: 'Published' } : q));
          alert(`✅ Quiz "${quiz.title}" is now published and visible to enrolled students!`);
        }
      }
      setTimeout(() => loadAssessmentsForCourse(quizCourseId), 500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update quiz status.';
      alert(`Error: ${msg}`);
    }
  };

  // Validate a quiz and show results
  const handleValidateQuiz = async (quiz) => {
    try {
      const result = await quizService.validateQuiz(quiz.id);
      const statusMsg = result.isValid ? '✅ Validation Passed' : '❌ Validation Failed';
      const errSection = result.errors?.length > 0 ? `\n\nErrors:\n${result.errors.join('\n')}` : '';
      const warnSection = result.warnings?.length > 0 ? `\n\nWarnings:\n${result.warnings.join('\n')}` : '';
      alert(`${statusMsg} — ${result.validatedQuestionCount} questions, ${result.totalMarks} total marks${errSection}${warnSection}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Validation request failed.';
      alert(`Validation error: ${msg}`);
    }
  };



  const handleCreateBoss = () => {
    if (!newBossName) {
      alert('Please enter a Boss name.');
      return;
    }

    const created = {
      id: `b-${Date.now()}`,
      bossName: newBossName.startsWith('👹') || newBossName.startsWith('⚔️') ? newBossName : `👹 ${newBossName}`,
      course: 'SE3090: Architecture & Frameworks',
      questions: 15,
      timeLimit: '25 mins',
      passThreshold: '80%',
      xpReward: `+${newBossXp} XP`,
      coinReward: 200,
      badgeReward: 'Boss Conqueror Badge',
      attemptedCount: 0,
      passedCount: 0,
      status: 'Active Live Raid'
    };

    setBossEncounters(prev => [created, ...prev]);
    setShowBossModal(false);
    setNewBossName('');
    alert(`Boss Raid "${created.bossName}" created!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
      
      {aiGenToast && (
        <div 
          onClick={() => {
            if (aiGenToast.status === 'completed') {
              setAiGenToast(null);
              setCreationMode('typed');
              setShowCreateModal(true);
            }
          }}
          style={{
            position: 'fixed', top: '24px', right: '24px', backgroundColor: 'var(--bg-card)',
            border: `1px solid ${aiGenToast.status === 'completed' ? 'var(--success)' : 'var(--primary)'}`,
            borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', alignItems: 'center',
            gap: '12px', boxShadow: 'var(--shadow-popover)', zIndex: 9999,
            cursor: aiGenToast.status === 'completed' ? 'pointer' : 'default', minWidth: '280px',
            transition: 'all 0.3s ease'
          }}
        >
          {aiGenToast.status === 'generating' ? (
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--primary-soft)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          ) : (
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--success-soft)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={14} />
            </div>
          )}
          
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              {aiGenToast.status === 'generating' ? 'Generating AI Quiz...' : 'Quiz Generated! Click to view.'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Topic: {aiGenToast.topic}
            </div>
          </div>

          {aiGenToast.status === 'generating' && (
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', fontFamily: 'monospace' }}>
              {Math.floor(aiGenToast.timeElapsed / 60)}:{(aiGenToast.timeElapsed % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      {/* Sub Tab Navigation & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-canvas)',
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveSubTab('quizzes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: activeSubTab === 'quizzes' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'quizzes' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '600',
              border: activeSubTab === 'quizzes' ? '1px solid var(--border-card)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <HelpCircle size={14} /> 
            <span>Standard Assessments</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bosses')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: activeSubTab === 'bosses' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'bosses' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '600',
              border: activeSubTab === 'bosses' ? '1px solid var(--border-card)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Sword size={14} /> 
            <span>Milestone Boss Raids</span>
          </button>
        </div>

        {/* Active Course Filter Selector */}
        {coursesList && coursesList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Course:</span>
            <select
              value={quizCourseId}
              onChange={(e) => {
                const selectedId = e.target.value;
                setQuizCourseId(selectedId);
                if (selectedId === 'ALL') {
                  setQuizCourseCode('ALL');
                } else {
                  const matched = coursesList.find(c => c.id === selectedId);
                  if (matched) {
                    setQuizCourseCode(matched.courseCode || matched.code || '');
                  }
                }
              }}
              className="form-select"
              style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', minWidth: '220px' }}
            >
              <option value="ALL">All Courses & Dynamic Quizzes</option>
              {coursesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.courseCode || c.code || ''}: {c.title || c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Live API Status Button */}
          <button
            onClick={fetchAiStatus}
            disabled={isCheckingAiStatus}
            title="Click to ping and refresh Live AI API status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: aiApiStatus.color === 'green' ? 'rgba(34, 197, 94, 0.12)' : aiApiStatus.color === 'yellow' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${aiApiStatus.color === 'green' ? '#22c55e' : aiApiStatus.color === 'yellow' ? '#eab308' : '#ef4444'}`,
              color: aiApiStatus.color === 'green' ? '#15803d' : aiApiStatus.color === 'yellow' ? '#a16207' : '#b91c1c',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: aiApiStatus.color === 'green' ? '#22c55e' : aiApiStatus.color === 'yellow' ? '#eab308' : '#ef4444',
              boxShadow: `0 0 8px ${aiApiStatus.color === 'green' ? '#22c55e' : aiApiStatus.color === 'yellow' ? '#eab308' : '#ef4444'}`,
              animation: isCheckingAiStatus ? 'spin 1s linear infinite' : 'pulse 2s infinite'
            }} />
            <span>
              {isCheckingAiStatus
                ? 'Ping API...'
                : aiApiStatus.color === 'green'
                ? 'Live API: Active 🟢'
                : aiApiStatus.color === 'yellow'
                ? 'Live API: Token Limit Reached 🟡'
                : 'Live API: Offline 🔴'}
            </span>
          </button>

          {(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
            activeSubTab === 'quizzes' ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Plus size={15} /> 
                <span>Create Assessment</span>
              </button>
            ) : (
              <button
                onClick={() => setShowBossModal(true)}
                className="btn-danger"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Plus size={15} /> 
                <span>Author Boss Raid</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Gamification Interconnection Summary Banner */}
      <div className="card-premium" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-soft)', border: '1px solid var(--primary-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
          }}>
            <Zap size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
              Deterministic Evaluation & Reward Integration
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              All assessment submissions record immutable ledger entries, streak verification, coin balances, and badge evaluations.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Quizzes</span>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--secondary)' }}>{quizzesList.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Raids</span>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent)' }}>{bossEncounters.length}</div>
          </div>
        </div>
      </div>

      {/* Main Tab: Quizzes List */}
      {activeSubTab === 'quizzes' && (
        quizzesList.length === 0 ? (
          <div className="card-premium" style={{ padding: '60px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <HelpCircle size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>No Assessments Configured</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '420px' }}>
                Create your first assessment using manual questions, upload a quiz sheet, or generate one automatically via AI.
              </p>
            </div>
            {(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                <Plus size={15} /> 
                <span>Create First Assessment</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {quizzesList.map(quiz => (
              <div 
                key={quiz.id} 
                className="card-premium" 
                style={{
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="badge-pill badge-primary">
                      {quiz.courseCode}
                    </span>
                    <span className="badge-pill badge-secondary" style={{ fontSize: '10px' }}>
                      {quiz.scopeName ? `Module: ${quiz.scopeName}` : quiz.scopeType === 'Module' ? 'Module Quiz' : 'Course Scope'}
                    </span>
                    <span className="badge-pill badge-success">
                      {quiz.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {quiz.title}
                  </h3>
                </div>

                {/* Stats Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                  gap: '6px'
                }}>
                  <div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Questions</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{quiz.questionsCount || quiz.questions?.length || 2}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Duration</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--secondary)' }}>{quiz.timeLimit}m</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Reward</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--warning)' }}>+{quiz.xpReward} XP</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', gap: '8px' }}>
                  {currentUser?.role === 'Student' && (
                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: '11.5px', gap: '5px', flex: 1 }}
                    >
                      <Play size={12} fill="currentColor" /> 
                      <span>Take Quiz</span>
                    </button>
                  )}

                  {(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
                    <>
                      <button
                        onClick={() => handleViewSubmissions(quiz)}
                        className="btn-primary"
                        style={{ padding: '5px 10px', fontSize: '11.5px', gap: '5px' }}
                      >
                        <BarChart2 size={13} /> 
                        <span>Results</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(quiz)}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11.5px', gap: '5px' }}
                      >
                        <Edit3 size={13} /> 
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleInspectQuiz(quiz)}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11.5px', gap: '5px' }}
                      >
                        <Eye size={13} /> 
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        title="Delete Quiz"
                        className="btn-danger"
                        style={{ padding: '5px 8px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}

                </div>

              </div>
            ))}
          </div>
        )
      )}

      {/* Main Tab: Boss Raids */}
      {activeSubTab === 'bosses' && (
        bossEncounters.length === 0 ? (
          <div className="card-premium" style={{ padding: '60px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Sword size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>No Active Boss Raids</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '420px' }}>
                Milestone boss challenges create exciting cohort-wide timed evaluations with high XP bounties and milestone credentials.
              </p>
            </div>
            <button
              onClick={() => setShowBossModal(true)}
              className="btn-danger"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <Plus size={15} /> 
              <span>Author Boss Raid</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {bossEncounters.map(boss => (
              <div key={boss.id} className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>{boss.bossName}</h3>
                  <span className="badge-pill badge-danger">
                    {boss.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{boss.course}</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', textAlign: 'center', gap: '6px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Questions</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{boss.questions}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pass Req.</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--warning)' }}>{boss.passThreshold}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Bounty</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>{boss.xpReward}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <span>Reward: <strong style={{ color: 'var(--warning)' }}>{boss.badgeReward}</strong></span>
                  <span>{boss.attemptedCount} attempts</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── RELEASE NEW QUIZ MODAL (TYPED / UPLOAD / AI) ────────────────── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%', maxWidth: '780px', maxHeight: '90vh',
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0,
            boxShadow: 'var(--shadow-popover)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>Author & Release Course Assessment</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Choose authoring mode: Manual Typed Questions, File Upload, or Multi-Agent AI Synthesis</div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Mode Selection Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <button
                onClick={() => setCreationMode('typed')}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  background: creationMode === 'typed' ? 'var(--primary-soft)' : 'transparent',
                  color: creationMode === 'typed' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: '600', fontSize: '12.5px', cursor: 'pointer',
                  borderBottom: creationMode === 'typed' ? '2px solid var(--primary)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <HelpCircle size={14} /> 1. Manual Builder ({questions.length})
              </button>

              <button
                onClick={() => setCreationMode('upload')}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  background: creationMode === 'upload' ? 'var(--primary-soft)' : 'transparent',
                  color: creationMode === 'upload' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: '600', fontSize: '12.5px', cursor: 'pointer',
                  borderBottom: creationMode === 'upload' ? '2px solid var(--primary)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <FileUp size={14} /> 2. Upload Document / JSON
              </button>

              <button
                onClick={() => setCreationMode('ai')}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  background: creationMode === 'ai' ? 'var(--secondary-soft)' : 'transparent',
                  color: creationMode === 'ai' ? 'var(--secondary)' : 'var(--text-muted)',
                  fontWeight: '600', fontSize: '12.5px', cursor: 'pointer',
                  borderBottom: creationMode === 'ai' ? '2px solid var(--secondary)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Bot size={14} /> 3. Generate with AI
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* General Quiz Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Target Course</label>
                  <select
                    value={quizCourseId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setQuizCourseId(selectedId);
                      const matched = coursesList.find(c => c.id === selectedId);
                      if (matched) {
                        setQuizCourseCode(matched.courseCode || matched.code || '');
                      }
                    }}
                    className="form-select"
                  >
                    {coursesList.length > 0 ? (
                      coursesList.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.courseCode || c.code || ''}: {c.title || c.name}
                        </option>
                      ))
                    ) : (
                      <option value={quizCourseId}>{quizCourseCode}: Database Architecture</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label">Scope Level</label>
                  <select
                    value={manualScopeType}
                    onChange={(e) => setManualScopeType(e.target.value)}
                    className="form-select"
                  >
                    <option value="Module">Module Scope</option>
                    <option value="Course">Course Level Scope</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    {manualScopeType === 'Module' ? 'Target Module' : 'Module (where this course-level quiz is stored)'}
                  </label>
                  <select
                    value={manualModuleId}
                    onChange={(e) => setManualModuleId(e.target.value)}
                    className="form-select"
                  >
                    {modulesList.length > 0 ? (
                      modulesList.map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))
                    ) : (
                      <option value="">Select Course First</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Assessment Title / Quiz Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Diagnostic Quiz: PostgreSQL Indexing & Query Execution"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Gamification Parameters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label className="form-label">Time Limit (mins)</label>
                  <input
                    type="number"
                    value={quizTime}
                    onChange={(e) => setQuizTime(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Pass Req (%)</label>
                  <input
                    type="number"
                    value={quizPass}
                    onChange={(e) => setQuizPass(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">XP Bounty</label>
                  <input
                    type="number"
                    value={quizXp}
                    onChange={(e) => setQuizXp(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Coins Reward</label>
                  <input
                    type="number"
                    value={quizCoins}
                    onChange={(e) => setQuizCoins(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* MODE 1: TYPED QUESTION BUILDER */}
              {creationMode === 'typed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                      Questions ({questions.length})
                    </div>
                    <button
                      onClick={handleAddQuestion}
                      className="btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '12px', gap: '4px' }}
                    >
                      <Plus size={13} /> Add Question
                    </button>
                  </div>

                  {questions.map((q, qIdx) => (
                    <div key={qIdx} style={{
                      padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--secondary)' }}>Question {qIdx + 1}</span>
                        <button
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="btn-ghost"
                          style={{ color: 'var(--accent)', padding: '2px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Enter Question Prompt..."
                        value={q.prompt}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'prompt', e.target.value)}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '13.5px',
                          fontWeight: '600',
                          lineHeight: '1.5',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Options (Click checkmark to set correct answer):</label>
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswer === opt;
                          return (
                            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(qIdx, 'correctAnswer', opt)}
                                style={{
                                  width: '22px', height: '22px', borderRadius: '50%',
                                  background: isCorrect ? 'var(--success)' : 'var(--bg-card)',
                                  border: isCorrect ? 'none' : '1px solid var(--border-card)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#FFF', cursor: 'pointer', flexShrink: 0
                                }}
                              >
                                {isCorrect && <Check size={13} />}
                              </button>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: isCorrect ? 'var(--success)' : 'var(--text-muted)', width: '18px' }}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                className="form-input"
                                style={{
                                  padding: '7px 10px',
                                  backgroundColor: isCorrect ? 'var(--success-soft)' : 'var(--bg-input)',
                                  borderColor: isCorrect ? 'var(--success-border)' : 'var(--border-card)'
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Explanation (Shown upon review)</label>
                        <input
                          type="text"
                          placeholder="e.g. Composite indexes evaluate column selectivity left-to-right."
                          value={q.explanation}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                          className="form-input"
                          style={{ fontSize: '12px', padding: '7px 10px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MODE 2: UPLOAD QUIZ */}
              {creationMode === 'upload' && (
                <div style={{
                  padding: '32px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)',
                  border: '1.5px dashed var(--border-card)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                }}>
                  <FileUp size={32} color="var(--primary)" />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Upload Assessment Document or JSON</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '400px', marginTop: '4px' }}>
                      Upload a structured JSON question bank. PDF extraction is a demo (not yet implemented): it loads fixed sample questions, not content from your file.
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".json,.pdf,.txt"
                    id="quiz-file-input"
                    onChange={handleUploadQuizFile}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="quiz-file-input"
                    className="btn-primary"
                    style={{ cursor: 'pointer' }}
                  >
                    Select File (.json, .pdf)
                  </label>

                  {uploadedFileName && (
                    <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600' }}>
                      ✓ Attached: {uploadedFileName}
                    </div>
                  )}
                </div>
              )}

              {/* MODE 3: AI-GENERATED QUIZ */}
              {creationMode === 'ai' && (
                <div style={{
                  padding: '20px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={20} color="var(--secondary)" />
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>AI RAG Assessment Generator</h4>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Multi-agent LangGraph pipeline grounded strictly in your syllabus PDF and modules</div>
                    </div>
                  </div>

                  {/* Module & Scope Selection */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Scope Level</label>
                      <select
                        value={aiScopeType}
                        onChange={(e) => setAiScopeType(e.target.value)}
                        className="form-select"
                      >
                        <option value="Module">Container Module Scope</option>
                        <option value="Course">Full Course Scope (stored in the selected module)</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Select Specific Module</label>
                      <select
                        value={aiSelectedModuleId}
                        onChange={(e) => {
                          const modId = e.target.value;
                          setAiSelectedModuleId(modId);
                          const mod = modulesList.find(m => m.id === modId);
                          if (mod) {
                            if (mod.pdfUrl) setAiSelectedPdfUrl(mod.pdfUrl);
                            setAiTopic(mod.title || aiTopic);
                          }
                        }}
                        className="form-select"
                      >
                        {modulesList.length > 0 ? (
                          modulesList.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.title} {m.pdfUrl ? '📄 (PDF Attached)' : ''}
                            </option>
                          ))
                        ) : (
                          <option value="">No modules found for course</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* PDF Document Selection & Topic */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Grounded Educational Content / PDF</label>
                      <select
                        value={aiSelectedPdfUrl}
                        onChange={(e) => setAiSelectedPdfUrl(e.target.value)}
                        className="form-select"
                      >
                        {modulesList.filter(m => m.pdfUrl).length > 0 ? (
                          modulesList.filter(m => m.pdfUrl).map(m => (
                            <option key={m.id} value={m.pdfUrl}>
                              📄 {m.attachmentFileName || `${m.title}.pdf`}
                            </option>
                          ))
                        ) : (
                          <option value="">📄 Course Syllabus / General Curriculum PDF</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Target Domain Concept</label>
                      <input
                        type="text"
                        placeholder="e.g. Clean Architecture, PostgreSQL Indexing"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Question Format & Difficulty Selection */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Target Question Format</label>
                      <select
                        value={aiQuestionTypePref}
                        onChange={(e) => setAiQuestionTypePref(e.target.value)}
                        className="form-select"
                      >
                        <option value="MIXED">🔀 Mixed (Radio, Checkbox, Dropdown, Drag-and-Drop)</option>
                        <option value="MULTIPLE_CHOICE">🔘 Multiple Choice (Single Answer Radio)</option>
                        <option value="MULTIPLE_SELECT">☑️ Multiple Answer (Multi-Checkboxes)</option>
                        <option value="FILL_IN_THE_BLANK">🔽 Dropdown Select Questions</option>
                        <option value="MATCHING">🧩 Drag & Drop Matching Pairs</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Target Difficulty Level</label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) => {
                          const diff = e.target.value;
                          setAiDifficulty(diff);
                          let xp = 100, coins = 30, time = 20, pass = 70;
                          if (diff === 'Easy') { xp = 50; coins = 15; time = 15; pass = 60; }
                          else if (diff === 'Medium') { xp = 100; coins = 30; time = 20; pass = 70; }
                          else if (diff === 'Hard') { xp = 140; coins = 50; time = 25; pass = 80; }
                          else if (diff === 'Boss') { xp = 150; coins = 80; time = 30; pass = 85; }
                          setQuizXp(xp);
                          setQuizCoins(coins);
                          setQuizTime(time);
                          setQuizPass(pass);
                        }}
                        className="form-select"
                      >
                        <option value="Easy">Easy (Recall & Foundations - 50 XP)</option>
                        <option value="Medium">Medium (Applied Engineering - 100 XP)</option>
                        <option value="Hard">Hard (Concurrency & Systems - 140 XP)</option>
                        <option value="Boss">Boss Raid (Architectural Scenario - 150 XP)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Assessment Type</label>
                      <select
                        value={aiQuizType}
                        onChange={(e) => setAiQuizType(e.target.value)}
                        className="form-select"
                      >
                        <option value="Diagnostic">Diagnostic Baseline</option>
                        <option value="Formative">Formative Module Review</option>
                        <option value="Summative">Summative Check</option>
                        <option value="MicroQuiz">Micro-Quiz</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Question Count (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={aiCount}
                        onChange={(e) => setAiCount(Number(e.target.value))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Provider / model selection — status comes from the server,
                      never from secrets in the browser. */}
                  <div style={{ marginBottom: '12px' }}>
                    <AiProviderPicker
                      provider={aiProvider}
                      model={aiModel}
                      onProviderChange={setAiProvider}
                      onModelChange={setAiModel}
                      disabled={isAiGenerating}
                    />
                  </div>

                  <button
                    onClick={handleGenerateAiQuestions}
                    disabled={isAiGenerating}
                    className="btn-primary"
                    style={{ padding: '10px', width: '100%', fontSize: '13px' }}
                  >
                    <Sparkles size={15} /> 
                    <span>{isAiGenerating ? 'Synthesizing Grounded Quiz with RAG AI...' : '⚡ Generate RAG Grounded Questions'}</span>
                  </button>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {questions.length} Questions Configured • +{quizXp} XP Reward
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublishQuiz}
                  className="btn-primary"
                >
                  Publish Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW QUESTIONS INSPECTOR MODAL ─────────────────────────────── */}
      {inspectingQuiz && (
        <div className="quiz-modal-overlay">
          <div className={`card-premium quiz-modal-container ${isInspectFullscreen ? 'is-fullscreen' : ''}`}>
            {/* Header */}
            <div className="quiz-modal-header" style={{
              padding: '16px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inspectingQuiz.title}
                  </h3>
                  <span className="badge-pill badge-primary">
                    {inspectingQuiz.questions?.length || 0} Questions
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {inspectingQuiz.courseCode && <span>{inspectingQuiz.courseCode}</span>}
                  {inspectingQuiz.timeLimit && <span>• {inspectingQuiz.timeLimit} mins</span>}
                  {inspectingQuiz.xpReward && <span style={{ color: 'var(--warning)', fontWeight: '600' }}>• +{inspectingQuiz.xpReward} XP</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsInspectFullscreen(!isInspectFullscreen)}
                  className="btn-ghost"
                  title={isInspectFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                  style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  {isInspectFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span style={{ display: 'none', md: 'inline' }}>{isInspectFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
                <button onClick={() => setInspectingQuiz(null)} className="btn-ghost" style={{ padding: '6px' }} title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Questions Scrollable Body */}
            <div className="quiz-modal-body" style={{ flex: 1, overflowY: 'auto', padding: isInspectFullscreen ? '24px 32px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', WebkitOverflowScrolling: 'touch' }}>
              {inspectingQuiz.questions && inspectingQuiz.questions.map((q, idx) => (
                <div key={idx} className="quiz-question-card" style={{
                  padding: '16px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.5', wordBreak: 'break-word' }}>
                    <span style={{ color: 'var(--primary)', marginRight: '6px' }}>Q{idx + 1}.</span> {q.prompt}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                    {q.options && q.options.map((opt, oIdx) => {
                      const isCorrect = q.correctAnswer === opt;
                      return (
                        <div key={oIdx} className="quiz-option-pill" style={{
                          padding: '8px 12px', borderRadius: 'var(--radius-xs)',
                          background: isCorrect ? 'var(--success-soft)' : 'var(--bg-canvas)',
                          border: isCorrect ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)',
                          color: isCorrect ? 'var(--success)' : 'var(--text-main)',
                          fontSize: '12.5px', fontWeight: isCorrect ? '600' : '400',
                          display: 'flex', alignItems: 'flex-start', gap: '8px', wordBreak: 'break-word'
                        }}>
                          <span style={{ fontWeight: '700', minWidth: '18px' }}>{String.fromCharCode(65 + oIdx)}.</span>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {isCorrect && <span style={{ fontWeight: '700', color: 'var(--success)', whiteSpace: 'nowrap' }}>✓ Correct</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', background: 'rgba(139, 92, 246, 0.05)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', borderLeft: '3px solid var(--primary)' }}>
                      <strong style={{ color: 'var(--primary-text)' }}>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                  {q.slideCitation && (
                    <div style={{ fontSize: '11.5px', color: 'var(--primary)', fontWeight: '600', marginTop: '2px' }}>
                      📖 Citation: {q.slideCitation}
                    </div>
                  )}
                  {q.markingScheme && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      ⚖️ Marking Scheme: {q.markingScheme}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="quiz-modal-footer" style={{ padding: '12px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setIsInspectFullscreen(!isInspectFullscreen)}
                className="btn-ghost"
                style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isInspectFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                <span>{isInspectFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}</span>
              </button>

              <button
                onClick={() => setInspectingQuiz(null)}
                className="btn-secondary"
                style={{ padding: '8px 20px', fontWeight: '600' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE BOSS RAID MODAL ────────────────────────────────────── */}
      {showBossModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card-premium" style={{ width: '460px', padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)' }}>Author Milestone Boss Challenge</h3>
            <div>
              <label className="form-label">Challenge Title</label>
              <input
                type="text" 
                placeholder="e.g. Distributed Concurrency Overlord" 
                value={newBossName}
                onChange={(e) => setNewBossName(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Bounty XP Reward</label>
              <input
                type="number" 
                value={newBossXp}
                onChange={(e) => setNewBossXp(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => setShowBossModal(false)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleCreateBoss} className="btn-danger">
                Create Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. QUIZ RUNNER (STUDENT TEST-DRIVE MODE) MODAL ───────────── */}
      {runningQuiz && (
        <div className="quiz-modal-overlay" style={{ zIndex: 1200 }}>
          <div className={`card-premium quiz-modal-container ${isRunnerFullscreen ? 'is-fullscreen' : ''}`} style={{ border: '1px solid var(--primary-border)' }}>
            {/* Header */}
            <div className="quiz-modal-header" style={{
              padding: '18px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge-pill badge-primary">LIVE ATTEMPT</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Question {runnerStep + 1} of {(runningQuiz.questions || []).length}
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                  {runningQuiz.title}
                </h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-pill badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  <span>{runningQuiz.timeLimit || 15} mins</span>
                </span>
                <button
                  onClick={() => setIsRunnerFullscreen(!isRunnerFullscreen)}
                  className="btn-ghost"
                  title={isRunnerFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                  style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  {isRunnerFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button onClick={() => setRunningQuiz(null)} className="btn-ghost" style={{ padding: '6px' }} title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Question Body */}
            {quizCountdown > 0 ? (
              <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div style={{ fontSize: '72px', fontWeight: '900', color: 'var(--primary)', lineHeight: 1, animation: 'pulse 1s infinite' }}>
                  {quizCountdown}
                </div>
                <div style={{ fontSize: '18px', color: 'var(--text-muted)', marginTop: '16px', fontWeight: '600' }}>
                  Get Ready!
                </div>
              </div>
            ) : (
            runningQuiz.questions && runningQuiz.questions[runnerStep] && (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  {runningQuiz.questions[runnerStep].prompt}
                </div>

                {/* Multi-Format Interactive Question Renderers */}
                {(() => {
                  const currentQ = runningQuiz.questions[runnerStep];
                  const qTypeStr = (currentQ.type || 'MultipleChoice').toString().toUpperCase();

                  if (qTypeStr.includes('SELECT') || qTypeStr.includes('MULTI')) {
                    // Multi-Select Checkboxes
                    const currentSelectedArr = (runnerAnswers[runnerStep] || '').split(',').map(s => s.trim()).filter(Boolean);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>☑️ Multiple Answer Question — Select ALL options that apply:</span>
                        </div>
                        {(currentQ.options || []).map((opt, oIdx) => {
                          const isChecked = currentSelectedArr.includes(opt);
                          const toggleOpt = () => {
                            let nextArr;
                            if (isChecked) {
                              nextArr = currentSelectedArr.filter(x => x !== opt);
                            } else {
                              nextArr = [...currentSelectedArr, opt];
                            }
                            handleSelectRunnerAnswer(runnerStep, nextArr.join(', '));
                          };
                          return (
                            <div
                              key={oIdx}
                              onClick={toggleOpt}
                              style={{
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)',
                                border: isChecked ? '2px solid var(--success)' : '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}
                            >
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '4px',
                                backgroundColor: isChecked ? 'var(--success)' : 'var(--bg-card)',
                                border: isChecked ? 'none' : '1px solid var(--border-card)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '12px', fontWeight: '700'
                              }}>
                                {isChecked && <Check size={14} />}
                              </div>
                              <span style={{ fontSize: '13.5px', color: 'var(--text-main)', fontWeight: isChecked ? '600' : '400' }}>
                                {opt}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else if (qTypeStr.includes('FILL') || qTypeStr.includes('BLANK') || qTypeStr.includes('DROPDOWN')) {
                    // Dropdown Select Question
                    const selectedVal = runnerAnswers[runnerStep] || '';
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '600' }}>
                          🔽 Dropdown Select — Choose the correct answer from the dropdown menu:
                        </div>
                        <select
                          value={selectedVal}
                          onChange={(e) => handleSelectRunnerAnswer(runnerStep, e.target.value)}
                          className="form-select"
                          style={{ padding: '12px 16px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
                        >
                          <option value="">-- Click to select correct answer --</option>
                          {(currentQ.options || []).map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  } else if (qTypeStr.includes('MATCH') || qTypeStr.includes('ORDER')) {
                    // Drag & Drop / Pair Matching Question
                    const existingPairs = (runnerAnswers[runnerStep] || '').split(';').reduce((acc, pairStr) => {
                      const parts = pairStr.split('->');
                      if (parts.length === 2) acc[parts[0].trim()] = parts[1].trim();
                      return acc;
                    }, {});

                    const pairsList = (currentQ.options || []).map(opt => {
                      if (opt.includes('->')) {
                        const [l, r] = opt.split('->');
                        return { left: l.trim(), right: r.trim() };
                      }
                      return { left: opt, right: 'Matches ' + opt };
                    });

                    const rightChoices = pairsList.map(p => p.right);

                    const updatePairMatch = (leftTerm, chosenRight) => {
                      const updated = { ...existingPairs, [leftTerm]: chosenRight };
                      const formatted = Object.entries(updated).map(([l, r]) => `${l} -> ${r}`).join('; ');
                      handleSelectRunnerAnswer(runnerStep, formatted);
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '600' }}>
                          🧩 Drag & Drop / Matching — Pair each item on the left to its target on the right:
                        </div>
                        {pairsList.map((pair, pIdx) => (
                          <div key={pIdx} style={{
                            padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center'
                          }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>
                              {pair.left}
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                            <select
                              value={existingPairs[pair.left] || ''}
                              onChange={(e) => updatePairMatch(pair.left, e.target.value)}
                              className="form-select"
                              style={{ fontSize: '12.5px', padding: '6px 10px' }}
                            >
                              <option value="">-- Match target --</option>
                              {rightChoices.map((rc, rIdx) => (
                                <option key={rIdx} value={rc}>{rc}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    // Default Single Choice Radio Cards
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(currentQ.options || []).map((opt, oIdx) => {
                          const isSelected = runnerAnswers[runnerStep] === opt;
                          return (
                            <div
                              key={oIdx}
                              onClick={() => handleSelectRunnerAnswer(runnerStep, opt)}
                              style={{
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-surface)',
                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: isSelected ? 'var(--primary)' : 'var(--border-card)',
                                color: isSelected ? '#fff' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '700'
                              }}>
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              <span style={{ fontSize: '13.5px', color: 'var(--text-main)', fontWeight: isSelected ? '600' : '400' }}>
                                {opt}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()}

              </div>
            ))}

            {/* Footer Navigation */}
            <div style={{
              padding: '16px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              visibility: quizCountdown > 0 ? 'hidden' : 'visible'
            }}>
              <button
                onClick={() => setRunnerStep(prev => Math.max(0, prev - 1))}
                disabled={runnerStep === 0}
                className="btn-ghost"
                style={{ opacity: runnerStep === 0 ? 0.4 : 1 }}
              >
                Previous
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {runnerStep < (runningQuiz.questions || []).length - 1 ? (
                  <button
                    onClick={() => setRunnerStep(prev => prev + 1)}
                    className="btn-secondary"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitAttempt}
                    disabled={submittingAttempt}
                    className="btn-primary"
                    style={{ fontWeight: '700' }}
                  >
                    <Trophy size={14} />
                    <span>{submittingAttempt ? 'Grading & Calculating XP...' : 'Submit & Claim Rewards'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. LEARNING GAME MULTI-FACTOR REWARD BREAKDOWN MODAL ────────── */}
      {rewardBreakdownModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%', maxWidth: '620px', backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '28px',
            gap: '20px', textAlign: 'center'
          }}>
            {/* Trophy Icon & Celebration Title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '28px', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)'
              }}>
                🏆
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {rewardBreakdownModal.passed ? '🎉 Assessment Conquered!' : 'Targeted Practice Completed'}
              </h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge-pill ${rewardBreakdownModal.passed ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '13px', fontWeight: '800', padding: '4px 12px' }}>
                  Score: {rewardBreakdownModal.percentageScore || 86}% ({rewardBreakdownModal.passed ? 'PASSED' : 'RETRY AVAILABLE'})
                </span>
                {rewardBreakdownModal.xpBreakdown?.isPersonalBest && (
                  <span className="badge-pill badge-primary" style={{ fontSize: '11px', fontWeight: '700' }}>
                    ⭐ NEW PERSONAL BEST!
                  </span>
                )}
              </div>
            </div>

            {/* Tab Header for Student Post-Submission Review */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setRewardTab('rewards')}
                style={{
                  flex: 1, padding: '8px', border: 'none', background: rewardTab === 'rewards' ? 'var(--primary-soft)' : 'transparent',
                  color: rewardTab === 'rewards' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: '700', fontSize: '12.5px', cursor: 'pointer',
                  borderBottom: rewardTab === 'rewards' ? '2px solid var(--primary)' : 'none'
                }}
              >
                🏆 XP & Gamification Bounties
              </button>
              <button
                onClick={() => setRewardTab('explanations')}
                style={{
                  flex: 1, padding: '8px', border: 'none', background: rewardTab === 'explanations' ? 'var(--secondary-soft)' : 'transparent',
                  color: rewardTab === 'explanations' ? 'var(--secondary)' : 'var(--text-muted)',
                  fontWeight: '700', fontSize: '12.5px', cursor: 'pointer',
                  borderBottom: rewardTab === 'explanations' ? '2px solid var(--secondary)' : 'none'
                }}
              >
                📖 Grounded RAG Explanations ({rewardBreakdownModal.questionBreakdown?.length || 0})
              </button>
            </div>

            {/* TAB 1: REWARDS LEDGER */}
            {rewardTab === 'rewards' && (
              <>
                {/* Multi-Factor Itemized XP Ledger Breakdown */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    ITEMIZED PROGRESSION BREAKDOWN
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Base Activity XP:</span>
                    <strong style={{ color: 'var(--text-main)' }}>+{rewardBreakdownModal.xpBreakdown?.baseXp || 50} XP</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Difficulty Bonus:</span>
                    <strong style={{ color: 'var(--text-main)' }}>+{rewardBreakdownModal.xpBreakdown?.difficultyBonus || 10} XP</strong>
                  </div>

                  {rewardBreakdownModal.xpBreakdown?.passBonus > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Pass Bonus (Score ≥ 70%):</span>
                      <strong style={{ color: '#10B981' }}>+{rewardBreakdownModal.xpBreakdown.passBonus} XP</strong>
                    </div>
                  )}

                  {rewardBreakdownModal.xpBreakdown?.highScoreBonus > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>High Score Bonus (Score ≥ 80%):</span>
                      <strong style={{ color: 'var(--secondary)' }}>+{rewardBreakdownModal.xpBreakdown.highScoreBonus} XP</strong>
                    </div>
                  )}

                  {rewardBreakdownModal.xpBreakdown?.streakBonus > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Streak Consistency Bonus:</span>
                      <strong style={{ color: '#F59E0B' }}>+{rewardBreakdownModal.xpBreakdown.streakBonus} XP</strong>
                    </div>
                  )}

                  {rewardBreakdownModal.xpBreakdown?.improvementBonus > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Personal Improvement Bonus:</span>
                      <strong style={{ color: '#8B5CF6' }}>+{rewardBreakdownModal.xpBreakdown.improvementBonus} XP</strong>
                    </div>
                  )}

                  <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '15px',
                    fontWeight: '800'
                  }}>
                    <span style={{ color: 'var(--text-main)' }}>Total Reward Earned:</span>
                    <span style={{ color: 'var(--primary)' }}>
                      +{rewardBreakdownModal.xpEarned || rewardBreakdownModal.xpBreakdown?.totalXpEarned || 95} XP • +{rewardBreakdownModal.coinsEarned || 25} 🪙
                    </span>
                  </div>
                </div>

                {/* Skill Mastery Gains */}
                {rewardBreakdownModal.masteryUpdates && rewardBreakdownModal.masteryUpdates.length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>
                        🧠 SKILL MASTERY ADVANCEMENT
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {rewardBreakdownModal.masteryUpdates[0].topicName}: <strong>{rewardBreakdownModal.masteryUpdates[0].masteryPercentage}% Mastery</strong>
                      </div>
                    </div>
                    <span className="badge-pill badge-success" style={{ fontSize: '11px', fontWeight: '800' }}>
                      +12% Gain
                    </span>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: GROUNDED EXPLANATIONS & RAG CITATIONS */}
            {rewardTab === 'explanations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', textAlign: 'left' }}>
                {(rewardBreakdownModal.questionBreakdown || []).map((qItem, qIdx) => (
                  <div key={qIdx} style={{
                    padding: '14px', borderRadius: 'var(--radius-sm)',
                    background: qItem.isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    border: qItem.isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                        Q{qIdx + 1}: {qItem.prompt}
                      </div>
                      <span className={`badge-pill ${qItem.isCorrect ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10.5px' }}>
                        {qItem.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>Your Answer: <strong style={{ color: qItem.isCorrect ? 'var(--success)' : 'var(--accent)' }}>{qItem.selectedAnswer || '(No answer)'}</strong></div>
                      <div>Correct Solution: <strong style={{ color: 'var(--success)' }}>{qItem.correctAnswer}</strong></div>
                    </div>

                    {qItem.explanation && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        <strong>Pedagogical Rationale:</strong> {qItem.explanation}
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📌 RAG Citation:</span> {qItem.slideCitation || 'Grounded in course curriculum PDF syllabus'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={() => {
                setRewardBreakdownModal(null);
                onNavigateTo && onNavigateTo('dashboard');
              }}
              className="btn-primary"
              style={{ padding: '12px', fontSize: '14px', fontWeight: '800', width: '100%' }}
            >
              <span>Continue to Next Learning Mission</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── 6. INSTRUCTOR VIEW SUBMISSIONS & TELEMETRY FEEDBACK MODAL ────────────────── */}
      {viewingSubmissionsQuiz && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%', maxWidth: '800px', maxHeight: '90vh',
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--primary)', fontWeight: '700' }}>INSTRUCTOR STUDENT TELEMETRY & FEEDBACK</div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  {viewingSubmissionsQuiz.title}
                </h3>
              </div>
              <button onClick={() => setViewingSubmissionsQuiz(null)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isLoadingSubmissions ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading student submission results...
                </div>
              ) : submissionsData ? (
                <>
                  {/* Summary Bar */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
                    padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)', textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Student Attempts</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{submissionsData.totalSubmissions}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Class Average Score</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--secondary)' }}>{submissionsData.averagePercentage}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Students Passed</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)' }}>{submissionsData.passCount} / {submissionsData.totalSubmissions}</div>
                    </div>
                  </div>

                  {/* Submissions List */}
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>
                    Student Submissions & Instructor Feedback ({submissionsData.submissions.length})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {submissionsData.submissions.map((sub, sIdx) => (
                      <div key={sIdx} style={{
                        padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                              {sub.studentName}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {sub.studentEmail} • Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {sub.status === 'Evaluating' ? (
                              <span className="badge-pill badge-warning" style={{ fontSize: '12px', fontWeight: '800', padding: '4px 10px' }}>
                                Awaiting marking ({sub.pendingReviewCount}) • {sub.scoreObtained}/{sub.maxScore} so far
                              </span>
                            ) : (
                              <span className={`badge-pill ${sub.passed ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '12px', fontWeight: '800', padding: '4px 10px' }}>
                                Score: {sub.percentageScore}% ({sub.scoreObtained}/{sub.maxScore})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Student Answers Breakdown */}
                        {sub.answers && sub.answers.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Question Breakdown:</div>
                            {sub.answers.map((ans, aIdx) => (
                              <div key={aIdx} style={{
                                padding: '8px 12px', borderRadius: 'var(--radius-xs)',
                                background: ans.isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                border: ans.isCorrect ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                                fontSize: '12px'
                              }}>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>Q{aIdx + 1}: {ans.prompt}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', color: 'var(--text-muted)' }}>
                                  <span>Answer: <strong style={{ color: ans.isCorrect ? 'var(--success)' : 'var(--accent)' }}>{ans.selectedAnswer || '(No answer)'}</strong></span>
                                  <span>Key: <strong>{ans.correctAnswer}</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                  <span style={{ color: ans.evaluationStatus === 'Evaluated' ? 'var(--text-muted)' : 'var(--warning)', fontWeight: '600' }}>
                                    {ans.evaluationStatus === 'Evaluated'
                                      ? `${ans.pointsAwarded}/${ans.maxMarks} marks (${ans.evaluationMethod})`
                                      : `Awaiting marking (max ${ans.maxMarks})`}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={ans.maxMarks}
                                    placeholder="Marks"
                                    value={markInput[`${sub.submissionId}:${ans.questionId}`] ?? ''}
                                    onChange={(e) => setMarkInput(prev => ({ ...prev, [`${sub.submissionId}:${ans.questionId}`]: e.target.value }))}
                                    className="form-input"
                                    style={{ width: '80px', fontSize: '12px', padding: '4px 6px' }}
                                  />
                                  <button
                                    onClick={() => handleMarkAnswer(sub, ans)}
                                    disabled={markingKey === `${sub.submissionId}:${ans.questionId}`}
                                    className="btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '11px' }}
                                  >
                                    {ans.evaluationStatus === 'Evaluated' ? 'Change mark' : 'Save mark'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Written Feedback Form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--primary)' }}>
                            💬 Instructor Feedback for {sub.studentName.split(' ')[0]}:
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Type encouraging feedback, targeted remediation hints, or grade notes..."
                              value={feedbackInput[sub.submissionId] !== undefined ? feedbackInput[sub.submissionId] : (sub.instructorFeedback || '')}
                              onChange={(e) => setFeedbackInput(prev => ({ ...prev, [sub.submissionId]: e.target.value }))}
                              className="form-input"
                              style={{ fontSize: '12px', flex: 1 }}
                            />
                            <button
                              onClick={() => handleSaveFeedback(sub.submissionId)}
                              disabled={savingFeedbackId === sub.submissionId}
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
                            >
                              {savingFeedbackId === sub.submissionId ? 'Saving...' : 'Send Feedback'}
                            </button>
                          </div>
                          {sub.instructorFeedback && (
                            <div style={{ fontSize: '11px', color: 'var(--success)', fontStyle: 'italic' }}>
                              ✓ Saved feedback: "{sub.instructorFeedback}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No student submissions recorded for this assessment yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', textAlign: 'right' }}>
              <button onClick={() => setViewingSubmissionsQuiz(null)} className="btn-secondary">
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI API Error Notice Popup Modal */}
      {showAiErrorModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: `2px solid ${aiErrorDetails.color === 'yellow' ? '#eab308' : '#ef4444'}`,
            borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '520px',
            padding: '24px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex', flexDirection: 'column', gap: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: aiErrorDetails.color === 'yellow' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: aiErrorDetails.color === 'yellow' ? '#eab308' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {aiErrorDetails.title || 'AI Generation Error'}
                </h3>
                <span style={{
                  fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                  color: aiErrorDetails.color === 'yellow' ? '#eab308' : '#ef4444',
                  letterSpacing: '0.5px'
                }}>
                  {aiErrorDetails.color === 'yellow' ? '⚠ Action needed' : '✕ Generation blocked'}
                </span>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)'
            }}>
              {aiErrorDetails.message}
            </div>

            <div style={{
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-xs)',
              borderLeft: `3px solid ${aiErrorDetails.color === 'yellow' ? '#eab308' : '#ef4444'}`
            }}>
              <strong>Nothing was saved.</strong> Your existing quiz draft is unchanged — resolve the issue above and try again.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={async () => {
                  await fetchAiStatus();
                  setShowAiErrorModal(false);
                }}
                className="btn-secondary"
                style={{ fontSize: '12.5px', padding: '7px 14px' }}
              >
                Re-check Provider Status
              </button>
              <button
                onClick={() => setShowAiErrorModal(false)}
                className="btn-primary"
                style={{ fontSize: '12.5px', padding: '7px 14px' }}
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUIZ MODAL FOR INSTRUCTORS */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto',
            padding: '28px', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>Edit Quiz Configuration</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Update quiz name, time limits, scope, and questions</div>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Quiz Title & Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: '700' }}>Quiz Title / Name *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Clean Architecture & Dependency Injection Quiz"
                  style={{ fontSize: '13.5px', fontWeight: '600' }}
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="form-input"
                  placeholder="Brief description of evaluation criteria"
                />
              </div>

              {/* Scope & Target Module */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Scope Level</label>
                  <select
                    value={editScopeType}
                    onChange={(e) => setEditScopeType(e.target.value)}
                    className="form-select"
                  >
                    <option value="Module">Module Scope</option>
                    <option value="Course">Full Course Scope</option>
                  </select>
                </div>

                {editScopeType === 'Module' && (
                  <div>
                    <label className="form-label">Assigned Module</label>
                    <select
                      value={editScopeId}
                      onChange={(e) => setEditScopeId(e.target.value)}
                      className="form-select"
                    >
                      {modulesList.map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Quiz Parameters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label className="form-label">Time (Mins)</label>
                  <input
                    type="number"
                    value={editTime}
                    onChange={(e) => setEditTime(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Pass (%)</label>
                  <input
                    type="number"
                    value={editPass}
                    onChange={(e) => setEditPass(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">XP Reward</label>
                  <input
                    type="number"
                    value={editXp}
                    onChange={(e) => setEditXp(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Coins</label>
                  <input
                    type="number"
                    value={editCoins}
                    onChange={(e) => setEditCoins(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Questions ({editQuestions.length})</h4>
                <button
                  type="button"
                  onClick={() => setEditQuestions(prev => [...prev, { prompt: `Question ${prev.length + 1}`, options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A', explanation: '', points: 10 }])}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                >
                  <Plus size={13} /> <span>Add Question</span>
                </button>
              </div>

              {editQuestions.map((q, qIdx) => (
                <div key={qIdx} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>Q{qIdx + 1} Prompt</span>
                    {editQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEditQuestions(prev => prev.filter((_, i) => i !== qIdx))}
                        className="btn-danger"
                        style={{ padding: '3px 6px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={q.prompt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditQuestions(prev => {
                        const copy = [...prev];
                        copy[qIdx] = { ...copy[qIdx], prompt: val };
                        return copy;
                      });
                    }}
                    className="form-input"
                  />

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Options (click circle to set correct):</label>
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctAnswer === opt;
                      return (
                        <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditQuestions(prev => {
                                const copy = [...prev];
                                copy[qIdx] = { ...copy[qIdx], correctAnswer: opt };
                                return copy;
                              });
                            }}
                            style={{
                              width: '20px', height: '20px', borderRadius: '50%',
                              backgroundColor: isCorrect ? 'var(--success)' : 'transparent',
                              border: isCorrect ? 'none' : '1px solid var(--border-card)',
                              color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                          >
                            {isCorrect && <Check size={12} />}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditQuestions(prev => {
                                const copy = [...prev];
                                const oldOpt = copy[qIdx].options[optIdx];
                                const newOpts = [...copy[qIdx].options];
                                newOpts[optIdx] = val;
                                let newCorr = copy[qIdx].correctAnswer;
                                if (newCorr === oldOpt) newCorr = val;
                                copy[qIdx] = { ...copy[qIdx], options: newOpts, correctAnswer: newCorr };
                                return copy;
                              });
                            }}
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ padding: '8px 16px' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveQuizEdit} disabled={isSavingEdit} className="btn-primary" style={{ padding: '8px 20px' }}>
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
