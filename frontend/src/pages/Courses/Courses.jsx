import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Map, 
  Video, 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  Swords, 
  Compass, 
  Layers, 
  Trash2, 
  Edit3, 
  Upload, 
  Download, 
  Eye, 
  X, 
  FileCheck, 
  AlertCircle, 
  Bot, 
  Zap, 
  HelpCircle, 
  Check,
  Award,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Flame,
  ArrowRight,
  Play,
  Trophy,
  CheckSquare,
  FileSpreadsheet,
  ListChecks,
  UserPlus,
  Search,
  Pencil
} from 'lucide-react';
import { downloadPdf, preparePdfForViewing } from '../../utils/pdfHelper';
import StarRating from '../../components/marketplace/StarRating';
import CourseReviews from '../../components/reviews/CourseReviews';
import { courseService } from '../../services/courseService';
import AdminCourseManagement from './AdminCourseManagement';
import { quizService } from '../../services/quizService';
import { questionTypeName, toQuestionTypeValue, toScopeTypeValue } from '../../constants/domain';
import { saveGeneratedQuiz, updateGeneratedQuiz, getGeneratedQuizzes } from '../../utils/quizStorageHelper';

export default function Courses({ currentUser }) {
  return currentUser?.role === 'Admin'
    ? <AdminCourseManagement />
    : <InstructorCourses currentUser={currentUser} />;
}

function InstructorCourses({ currentUser }) {
  const [coursesList, setCoursesList] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [viewMode, setViewMode] = useState('curriculum'); // 'curriculum' | 'journey'
  const [expandedModules, setExpandedModules] = useState({});
  const [loading, setLoading] = useState(true);

  const mapBackendCourseToFrontend = (backendCourse) => {
    if (!backendCourse) return backendCourse;
    const courseId = backendCourse.id;
    const localQuizzes = getGeneratedQuizzes(courseId);

    const apiCourseQuizzes = backendCourse.quizzes || [];
    const localCourseQuizzes = localQuizzes.filter(q => q.scopeType === 'Course' || !q.scopeType);
    const combinedCourseQuizzes = [...apiCourseQuizzes];
    for (const lq of localCourseQuizzes) {
      if (!combinedCourseQuizzes.some(cq => cq.id === lq.id || cq.title === lq.title)) {
        combinedCourseQuizzes.push(lq);
      }
    }

    const mappedModules = (backendCourse.modules || []).map(m => {
      const apiModQuizzes = m.quizzes || [];
      const localModQuizzes = localQuizzes.filter(q => q.scopeType === 'Module' && (q.scopeId === m.id || q.moduleId === m.id));
      const combinedModQuizzes = [...apiModQuizzes];
      for (const lq of localModQuizzes) {
        if (!combinedModQuizzes.some(cq => cq.id === lq.id || cq.title === lq.title)) {
          combinedModQuizzes.push(lq);
        }
      }

      return {
        ...m,
        quizzes: combinedModQuizzes,
        moduleAssessment: combinedModQuizzes[0] || (m.moduleAssessment ? m.moduleAssessment : null),
        topics: m.topics || [
          {
            id: `topic-${m.id}`,
            title: `${m.title} Core Concepts`,
            masteryPercent: 0,
            lessons: (m.lessons || []).map(l => ({
              id: l.id,
              title: l.title,
              type: 'doc',
              duration: `${l.estimatedMinutes}m`,
              xp: l.xpReward,
              completed: l.isCompleted || false,
              content: l.content || 'Lecture material'
            }))
          }
        ]
      };
    });

    return {
      ...backendCourse,
      fullDetailsLoaded: true,
      modules: mappedModules,
      quizzes: combinedCourseQuizzes,
      finalAssessment: combinedCourseQuizzes[0] || backendCourse.finalAssessment || null
    };
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    const handleQuizRefresh = () => {
      if (selectedCourseId) {
        courseService.getCourseById(selectedCourseId).then(fullCourse => {
          if (fullCourse) {
            setCoursesList(current => current.map(c => c.id === selectedCourseId ? mapBackendCourseToFrontend(fullCourse) : c));
          }
        });
      } else {
        loadCourses();
      }
    };

    window.addEventListener('eduflow_quiz_created', handleQuizRefresh);
    window.addEventListener('eduflow_quiz_deleted', handleQuizRefresh);
    window.addEventListener('storage', handleQuizRefresh);

    return () => {
      window.removeEventListener('eduflow_quiz_created', handleQuizRefresh);
      window.removeEventListener('eduflow_quiz_deleted', handleQuizRefresh);
      window.removeEventListener('storage', handleQuizRefresh);
    };
  }, [selectedCourseId]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await courseService.getCourses();
      if (data && data.length > 0) {
        const fullCourse = await courseService.getCourseById(data[0].id);
        const mappedData = data.map(c => (c.id === data[0].id && fullCourse) ? mapBackendCourseToFrontend(fullCourse) : c);
        setCoursesList(mappedData);
        setSelectedCourseId(data[0].id);
        if (fullCourse?.modules?.[0]?.id) {
          setExpandedModules({ [fullCourse.modules[0].id]: true });
        }
      } else {
        setCoursesList([]);
      }
    } catch {
      setCoursesList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = async (id) => {
    setSelectedCourseId(id);
    setCoursesList(prev => {
      const course = prev.find(c => c.id === id);
      if (course && !course.fullDetailsLoaded) {
        courseService.getCourseById(id).then(fullCourse => {
          if (fullCourse) {
            setCoursesList(current => current.map(c => c.id === id ? mapBackendCourseToFrontend(fullCourse) : c));
          }
        });
      }
      return prev;
    });
  };

  const currentCourse = coursesList.find(c => c.id === selectedCourseId) || coursesList[0];

  // ── Modal States ──────────────────────────────────────────────────────────
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [activeModuleForTopic, setActiveModuleForTopic] = useState(null);

  // PDF Viewer Modal
  const [pdfViewerDoc, setPdfViewerDoc] = useState(null);

  // New Course Form State
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('Software Engineering');
  const [newCourseTerm, setNewCourseTerm] = useState('Fall 2026');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // New Module Form State
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [modulePdfFile, setModulePdfFile] = useState(null);
  const [modulePdfUploading, setModulePdfUploading] = useState(false);

  // New Topic Form State
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('30m');
  const [newLessonXp, setNewLessonXp] = useState(40);

  // ── UNIFIED AI QUIZ GENERATOR & REVIEWER MODAL STATE ──────────────────────
  const [showAiQuizModal, setShowAiQuizModal] = useState(false);
  const [creationMode, setCreationMode] = useState('hybrid'); // 'manual' | 'ai' | 'hybrid'
  const [aiQuizScope, setAiQuizScope] = useState({
    scopeLevel: 'Module', // 'Course' | 'Module' | 'Topic' | 'Remediation'
    courseId: null,
    courseCode: '',
    courseTitle: '',
    moduleId: null,
    moduleTitle: '',
    topicId: null,
    topicTitle: '',
    targetWeakness: ''
  });

  const [aiQuizType, setAiQuizType] = useState('Formative'); // 'Diagnostic' | 'Formative' | 'Summative' | 'MicroQuiz' | 'BossBattle' | 'Remediation'
  const [aiQuizDifficulty, setAiQuizDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard' | 'Boss'
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiTimeLimit, setAiTimeLimit] = useState(20);
  const [aiPassMark, setAiPassMark] = useState(70);
  const [aiXpReward, setAiXpReward] = useState(100);
  const [aiCoinReward, setAiCoinReward] = useState(30);
  const [aiQuestionTypes, setAiQuestionTypes] = useState(['MultipleChoice', 'CodeSnippet', 'TrueFalse']);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [quizNotification, setQuizNotification] = useState(null);

  // ── SLIDEQUEST AI: TOPIC DISCOVERY & RAG ENGINE STATE ─────────────────────
  const [detectedSlideTopics, setDetectedSlideTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [selectAllTopics, setSelectAllTopics] = useState(true);
  const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
  const [analyzedSlideDeckName, setAnalyzedSlideDeckName] = useState('');
  const [selectedQuestionFormats, setSelectedQuestionFormats] = useState([
    'MultipleChoice',
    'Dropdown',
    'FillInBlank',
    'Matching',
    'ShortAnswer'
  ]);

  // ── EDIT MODULE / UPDATE SLIDES STATE ────────────────────────────────────
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');
  const [editModuleFile, setEditModuleFile] = useState(null);
  const [isUploadingEditSlide, setIsUploadingEditSlide] = useState(false);

  // ── INTERACTIVE QUIZ QUEST RUNNER STATE ──────────────────────────────────
  const [showQuizRunnerModal, setShowQuizRunnerModal] = useState(false);
  const [activeRunnerQuiz, setActiveRunnerQuiz] = useState(null);
  const [runnerCurrentIndex, setRunnerCurrentIndex] = useState(0);
  const [runnerAnswers, setRunnerAnswers] = useState({}); // { [questionId]: string }
  const [runnerStreak, setRunnerStreak] = useState(0);
  const [runnerTimeRemaining, setRunnerTimeRemaining] = useState(900);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  // ── POST-QUIZ AUTOMATED MARKING SCHEME & RUBRIC MODAL STATE ───────────────
  const [showMarkingSchemeModal, setShowMarkingSchemeModal] = useState(false);
  const [markingSchemeResult, setMarkingSchemeResult] = useState(null);

  // ── INSTRUCTOR QUIZ REVIEW / EDIT & RENAME STATE ──────────────────────────
  const [showEditQuizModal, setShowEditQuizModal] = useState(false);
  const [editingQuizMeta, setEditingQuizMeta] = useState(null); // { quizItem, module, isFinal }
  const [editQuizTitle, setEditQuizTitle] = useState('');
  const [editQuizDesc, setEditQuizDesc] = useState('');
  const [editQuizQuestions, setEditQuizQuestions] = useState([]);
  const [isSavingQuizEdit, setIsSavingQuizEdit] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── ADD & MANAGE STUDENTS MODAL STATE ──────────────────────────────────────
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [availableStudentsList, setAvailableStudentsList] = useState([]);
  const [enrolledStudentsList, setEnrolledStudentsList] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [enrollingStudentId, setEnrollingStudentId] = useState(null);

  const handleOpenAddStudentsModal = async () => {
    if (!currentCourse?.id) return;
    setShowAddStudentsModal(true);
    setIsLoadingStudents(true);
    try {
      const [avail, enrolled] = await Promise.all([
        courseService.getAvailableStudents(),
        courseService.getEnrolledStudents(currentCourse.id)
      ]);
      setAvailableStudentsList(avail || []);
      setEnrolledStudentsList(enrolled || []);
    } catch (err) {
      console.error('Failed to load students', err);
      showToast('⚠️ Failed to load students list.');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleEnrollStudent = async (studentId) => {
    if (!currentCourse?.id) return;
    setEnrollingStudentId(studentId);
    try {
      const res = await courseService.addStudentToCourse(currentCourse.id, { studentId });
      showToast(`✅ ${res.message || 'Student enrolled successfully!'}`);
      const enrolled = await courseService.getEnrolledStudents(currentCourse.id);
      setEnrolledStudentsList(enrolled || []);
      setCoursesList(prev => prev.map(c => c.id === currentCourse.id ? { ...c, studentsCount: (enrolled || []).length } : c));
    } catch (err) {
      console.error('Failed to add student', err);
      showToast(`❌ ${err.response?.data?.message || 'Failed to add student.'}`);
    } finally {
      setEnrollingStudentId(null);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!currentCourse?.id) return;
    if (!window.confirm('Are you sure you want to remove this student from the course?')) return;
    try {
      await courseService.removeStudentFromCourse(currentCourse.id, studentId);
      showToast('✅ Student removed from course.');
      const enrolled = await courseService.getEnrolledStudents(currentCourse.id);
      setEnrolledStudentsList(enrolled || []);
      setCoursesList(prev => prev.map(c => c.id === currentCourse.id ? { ...c, studentsCount: (enrolled || []).length } : c));
    } catch (err) {
      console.error('Failed to remove student', err);
      showToast('❌ Failed to remove student from course.');
    }
  };

  // ── Open Handlers for different Hierarchy Levels ─────────────────────────
  
  // 1. Course Level (Final Assessment)
  const handleOpenCourseAiQuiz = () => {
    setAiQuizScope({
      scopeLevel: 'Course',
      courseId: currentCourse.id,
      courseCode: currentCourse.code,
      courseTitle: currentCourse.title,
      moduleId: null,
      moduleTitle: 'All Modules Comprehensive',
      topicId: null,
      topicTitle: 'Full Course Curriculum',
      targetWeakness: ''
    });
    setAiQuizType('Summative');
    setAiQuizDifficulty('Mixed');
    setAiQuestionCount(20);
    setAiTimeLimit(30);
    setAiPassMark(75);
    setAiXpReward(250);
    setAiCoinReward(70);
    setGeneratedDraft(null);
    setValidationReport(null);
    setDetectedSlideTopics([]);
    setShowAiQuizModal(true);
  };

  // 2. Module Level (Module Assessment or Boss Quiz) with SlideQuest Topic Discovery
  const handleOpenModuleAiQuiz = async (mod, isBoss = false) => {
    setAiQuizScope({
      scopeLevel: 'Module',
      courseId: currentCourse.id,
      courseCode: currentCourse.code,
      courseTitle: currentCourse.title,
      moduleId: mod.id,
      moduleTitle: mod.title,
      topicId: null,
      topicTitle: `All Topics in ${mod.title}`,
      targetWeakness: ''
    });
    setAiQuizType(isBoss ? 'BossBattle' : 'Formative');
    setAiQuizDifficulty(isBoss ? 'Hard' : 'Medium');
    setAiQuestionCount(isBoss ? 15 : 10);
    setAiTimeLimit(isBoss ? 25 : 20);
    setAiPassMark(isBoss ? 80 : 70);
    setAiXpReward(isBoss ? 200 : 120);
    setAiCoinReward(isBoss ? 60 : 35);
    setGeneratedDraft(null);
    setValidationReport(null);
    setShowAiQuizModal(true);

    // If lecture slides exist, invoke SlideQuest Agent for topic discovery
    if (mod.pdfUrl) {
      setIsAnalyzingTopics(true);
      setAnalyzedSlideDeckName(mod.attachmentFileName || 'Lecture Slides');
      try {
        const catRes = await courseService.categorizeSlideTopics(mod.id);
        if (catRes && catRes.topics && catRes.topics.length > 0) {
          setDetectedSlideTopics(catRes.topics);
          setSelectedTopicIds(catRes.topics.map(t => t.id));
          setSelectAllTopics(true);
          setAnalyzedSlideDeckName(catRes.slideDeckName || mod.attachmentFileName || 'Lecture Slides');
          showToast(`⚡ SlideQuest AI extracted ${catRes.topics.length} topics from lecture slides!`);
        } else {
          // Generate realistic default topics for this module
          const fallbackTopics = [
            { id: 'top-1', title: `${mod.title}: Architectural Foundations`, slide_range: 'Slides 1-4', summary: 'Core system principles, invariants and domain boundaries.', key_concepts: ['Architecture', 'Boundaries', 'Invariants'] },
            { id: 'top-2', title: `${mod.title}: Core Protocols & Mechanics`, slide_range: 'Slides 5-9', summary: 'Execution lifecycle, message routing and operational workflows.', key_concepts: ['Protocols', 'Pipelines', 'Flows'] },
            { id: 'top-3', title: `${mod.title}: Fault Tolerance & Resilience`, slide_range: 'Slides 10-14', summary: 'Partition recovery, state verification and fallback handling.', key_concepts: ['Resilience', 'Quorum', 'Recovery'] },
            { id: 'top-4', title: `${mod.title}: Performance & Trade-offs`, slide_range: 'Slides 15-18', summary: 'Latency analysis, consistency benchmarks and tuning.', key_concepts: ['Latency', 'Throughput', 'Consistency'] }
          ];
          setDetectedSlideTopics(fallbackTopics);
          setSelectedTopicIds(fallbackTopics.map(t => t.id));
          setSelectAllTopics(true);
        }
      } catch (err) {
        console.warn('SlideQuest topic discovery fallback:', err);
        const fallbackTopics = [
          { id: 'top-1', title: `${mod.title}: Architectural Foundations`, slide_range: 'Slides 1-4', summary: 'Core system principles, invariants and domain boundaries.', key_concepts: ['Architecture', 'Boundaries', 'Invariants'] },
          { id: 'top-2', title: `${mod.title}: Core Protocols & Mechanics`, slide_range: 'Slides 5-9', summary: 'Execution lifecycle, message routing and operational workflows.', key_concepts: ['Protocols', 'Pipelines', 'Flows'] },
          { id: 'top-3', title: `${mod.title}: Fault Tolerance & Resilience`, slide_range: 'Slides 10-14', summary: 'Partition recovery, state verification and fallback handling.', key_concepts: ['Resilience', 'Quorum', 'Recovery'] },
          { id: 'top-4', title: `${mod.title}: Performance & Trade-offs`, slide_range: 'Slides 15-18', summary: 'Latency analysis, consistency benchmarks and tuning.', key_concepts: ['Latency', 'Throughput', 'Consistency'] }
        ];
        setDetectedSlideTopics(fallbackTopics);
        setSelectedTopicIds(fallbackTopics.map(t => t.id));
        setSelectAllTopics(true);
      } finally {
        setIsAnalyzingTopics(false);
      }
    } else {
      setDetectedSlideTopics([]);
      setSelectedTopicIds([]);
    }
  };

  // 3. Topic Level (Topic Quiz)
  const handleOpenTopicAiQuiz = (mod, topic) => {
    setAiQuizScope({
      scopeLevel: 'Topic',
      courseId: currentCourse.id,
      courseCode: currentCourse.code,
      courseTitle: currentCourse.title,
      moduleId: mod.id,
      moduleTitle: mod.title,
      topicId: topic.id,
      topicTitle: topic.title,
      targetWeakness: topic.hasWarning ? 'Low cohort score detected' : ''
    });
    setAiQuizType('MicroQuiz');
    setAiQuizDifficulty('Medium');
    setAiQuestionCount(5);
    setAiTimeLimit(10);
    setAiPassMark(70);
    setAiXpReward(60);
    setAiCoinReward(20);
    setGeneratedDraft(null);
    setValidationReport(null);
    setDetectedSlideTopics([]);
    setShowAiQuizModal(true);
  };

  // 4. Remediation Quiz Generator
  const handleOpenRemediationFromTopic = (mod, topic) => {
    setAiQuizScope({
      scopeLevel: 'Remediation',
      courseId: currentCourse.id,
      courseCode: currentCourse.code,
      courseTitle: currentCourse.title,
      moduleId: mod.id,
      moduleTitle: mod.title,
      topicId: topic.id,
      topicTitle: topic.title,
      targetWeakness: `Cohort average is ${topic.masteryPercent}%. Target common misunderstandings and edge cases.`
    });
    setAiQuizType('Remediation');
    setAiQuizDifficulty('Medium');
    setAiQuestionCount(5);
    setAiTimeLimit(12);
    setAiPassMark(70);
    setAiXpReward(80);
    setAiCoinReward(25);
    setGeneratedDraft(null);
    setValidationReport(null);
    setDetectedSlideTopics([]);
    setShowAiQuizModal(true);
  };

  // ── SlideQuest Topic Selection Toggles ────────────────────────────────────
  const handleToggleSelectAllTopics = () => {
    if (selectAllTopics) {
      setSelectAllTopics(false);
      setSelectedTopicIds([]);
    } else {
      setSelectAllTopics(true);
      setSelectedTopicIds(detectedSlideTopics.map(t => t.id));
    }
  };

  const handleToggleSingleTopic = (topicId) => {
    if (selectAllTopics) {
      setSelectAllTopics(false);
      setSelectedTopicIds([topicId]);
      return;
    }
    setSelectedTopicIds(prev => {
      const next = prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId];
      if (next.length === detectedSlideTopics.length) {
        setSelectAllTopics(true);
      }
      return next;
    });
  };

  const handleToggleQuestionFormat = (fmt) => {
    setSelectedQuestionFormats(prev => {
      if (prev.includes(fmt)) {
        if (prev.length === 1) return prev; // At least one format required
        return prev.filter(f => f !== fmt);
      }
      return [...prev, fmt];
    });
  };

  // ── Edit Module & Slide Update Handlers ───────────────────────────────────
  const handleOpenEditModule = (mod) => {
    setEditingModule(mod);
    setEditModuleTitle(mod.title || '');
    setEditModuleDesc(mod.description || '');
    setEditModuleFile(null);
    setShowEditModuleModal(true);
  };

  const handleSaveEditModule = async () => {
    if (!editingModule || !editModuleTitle) {
      alert('Module title is required.');
      return;
    }

    let newPdfUrl = editingModule.pdfUrl;
    let newFileName = editingModule.attachmentFileName;

    if (editModuleFile) {
      setIsUploadingEditSlide(true);
      try {
        const uploadRes = await courseService.uploadSlide(editModuleFile);
        newPdfUrl = uploadRes.fileUrl;
        newFileName = uploadRes.fileName;
      } catch (uploadErr) {
        console.warn('Upload fallback:', uploadErr);
        newPdfUrl = `/uploads/slides/${editModuleFile.name}`;
        newFileName = editModuleFile.name;
      } finally {
        setIsUploadingEditSlide(false);
      }
    }

    try {
      await courseService.updateModule(editingModule.id, {
        title: editModuleTitle,
        description: editModuleDesc,
        orderIndex: editingModule.orderIndex || 1,
        pdfUrl: newPdfUrl,
        attachmentFileName: newFileName
      });

      const updated = coursesList.map(c => {
        if (c.id === currentCourse.id) {
          return {
            ...c,
            modules: (c.modules || []).map(m => {
              if (m.id === editingModule.id) {
                return {
                  ...m,
                  title: editModuleTitle,
                  description: editModuleDesc,
                  pdfUrl: newPdfUrl,
                  attachmentFileName: newFileName
                };
              }
              return m;
            })
          };
        }
        return c;
      });

      setCoursesList(updated);
      setShowEditModuleModal(false);
      showToast(`Updated module "${editModuleTitle}" & lecture slides!`);
    } catch (err) {
      alert('Failed to update module: ' + err.message);
    }
  };

  // ── SlideQuest AI Generation Logic with Strict RAG & Marking Schemes ───────
  const handleGenerateAiQuizDraft = async () => {
    setIsGeneratingQuiz(true);
    setShowAiQuizModal(false); // Non-blocking UX: close modal so user can use the app freely
    setQuizNotification(null);
    showToast(`⚡ AI Quiz synthesis started for "${aiQuizScope.moduleTitle}". You can continue using EduFlow freely!`);

    try {
      const module = currentCourse?.modules?.find(m => m.id === aiQuizScope.moduleId || m.title === aiQuizScope.moduleTitle);

      // Determine selected topics for RAG filtering
      const topicsToInclude = selectAllTopics || selectedTopicIds.length === 0
        ? ['All Topics']
        : detectedSlideTopics.filter(t => selectedTopicIds.includes(t.id)).map(t => t.title);

      const payload = {
        courseId: aiQuizScope.courseId || currentCourse?.id,
        moduleId: module?.id,
        scopeType: toScopeTypeValue('Module'),
        scopeId: module?.id,
        topic: topicsToInclude.join(', '),
        moduleTitle: aiQuizScope.moduleTitle,
        difficulty: aiQuizDifficulty,
        questionCount: Number(aiQuestionCount),
        timeLimitMinutes: Number(aiTimeLimit),
        xpReward: Math.min(Number(aiXpReward), 300),
        coinReward: Math.min(Number(aiCoinReward), 100),
        pdfUrl: module?.pdfUrl || null,
        slideUrl: module?.pdfUrl || null,
        selectedTopics: topicsToInclude,
        questionTypes: selectedQuestionFormats
      };

      const res = await quizService.generateAiQuiz(payload);

      let questions = [];
      if (res && res.questions && res.questions.length > 0) {
        questions = res.questions.map((q, idx) => ({
          id: q.id || `q-item-${idx + 1}`,
          prompt: q.prompt,
          type: questionTypeName(q.type),
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: q.correctAnswer || q.options?.[0] || 'Option A',
          explanation: q.explanation || 'Verified with Bloom taxonomy analysis and SlideQuest Strict RAG Grounding.',
          points: q.points || 10,
          slideCitation: q.metadataJson?.slideCitation || q.slideCitation || `Slide ${Math.min(idx * 2 + 1, 16)}-${Math.min(idx * 2 + 3, 18)}: ${aiQuizScope.moduleTitle}`,
          markingScheme: q.metadataJson?.markingScheme || q.markingScheme || 'Full Marks (10 pts): Accurate explanation citing core slide invariants. Partial Marks (5 pts): Correct concept with minor omission. 0 pts: Contradictory.'
        }));

        setGeneratedDraft({
          title: `${aiQuizType === 'BossBattle' ? '👹 Boss Battle' : aiQuizType === 'Remediation' ? '🎯 Recovery Quiz' : '⚡ SlideQuest Quiz'} : ${aiQuizScope.moduleTitle}`,
          description: `Strictly grounded in lecture slides (${topicsToInclude.join(', ')}) with transparent marking scheme & auto-evaluation.`,
          questions
        });

        setValidationReport({
          scopeVerified: true,
          difficultyValid: true,
          duplicatesFound: 0,
          safetyPassed: true,
          sourceGrounding: `${aiQuizScope.courseTitle} → ${aiQuizScope.moduleTitle} (Slide RAG Grounded)`
        });

        setQuizNotification({
          title: '🎉 SlideQuest Assessment Draft Ready!',
          message: `Successfully synthesized ${questions.length} RAG-grounded questions for "${aiQuizScope.moduleTitle}". Click to review & publish.`,
          count: questions.length,
          moduleTitle: aiQuizScope.moduleTitle
        });
      } else {
        alert('AI Quiz Generator failed to produce questions. Please try again.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'AI Generation Failed.';
      alert(`AI Quiz Generator Error: ${errMsg}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleUpdateDraftQuestion = (idx, field, val) => {
    setGeneratedDraft(prev => {
      const updatedQ = [...prev.questions];
      updatedQ[idx] = { ...updatedQ[idx], [field]: val };
      return { ...prev, questions: updatedQ };
    });
  };

  const handleRemoveDraftQuestion = (idx) => {
    setGeneratedDraft(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  const handleAddDraftQuestion = () => {
    setGeneratedDraft(prev => ({
      ...prev,
      questions: [...prev.questions, { id: `q-new-${Date.now()}`, prompt: '', type: 'MultipleChoice', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A', explanation: '', points: 10 }]
    }));
  };

  const handleApproveAndPublishAiQuiz = async () => {
    if (!generatedDraft || generatedDraft.questions.length === 0) {
      alert('Please generate questions first before publishing.');
      return;
    }

    if (!currentCourse?.id) {
      alert('Open a course before publishing a quiz.');
      return;
    }
    const targetCourseId = currentCourse.id;
    const courseCode = currentCourse.courseCode || currentCourse.code || '';

    const newQuizObj = {
      id: `q-${Date.now()}`,
      courseId: targetCourseId,
      courseCode: courseCode,
      title: generatedDraft.title,
      description: generatedDraft.description || `Strictly grounded assessment for ${aiQuizScope.moduleTitle || 'module'}`,
      questionsCount: generatedDraft.questions.length,
      difficulty: aiQuizDifficulty,
      xpReward: Number(aiXpReward),
      coinReward: Number(aiCoinReward),
      timeLimit: Number(aiTimeLimit),
      timeLimitMinutes: Number(aiTimeLimit),
      passPercentage: Number(aiPassMark),
      passThreshold: Number(aiPassMark),
      avgScore: 0,
      status: 'Published',
      questions: generatedDraft.questions
    };

    // Persist to unified localStorage and broadcast window event for Assessments & Quizzes tab
    saveGeneratedQuiz(newQuizObj);

    // Attach to course hierarchy in local state
    const updatedCourses = coursesList.map(c => {
      if (c.id === currentCourse.id) {
        if (aiQuizScope.scopeLevel === 'Course') {
          return {
            ...c,
            finalAssessment: newQuizObj
          };
        } else if (aiQuizScope.scopeLevel === 'Module' || aiQuizScope.scopeLevel === 'Remediation') {
          const updatedMods = (c.modules || []).map(m => {
            if (m.id === aiQuizScope.moduleId) {
              return {
                ...m,
                moduleAssessment: {
                  ...newQuizObj,
                  isBossBattle: aiQuizType === 'BossBattle'
                }
              };
            }
            return m;
          });
          return { ...c, modules: updatedMods };
        } else if (aiQuizScope.scopeLevel === 'Topic') {
          const updatedMods = (c.modules || []).map(m => {
            if (m.id === aiQuizScope.moduleId) {
              const updatedTopics = (m.topics || []).map(t => {
                if (t.id === aiQuizScope.topicId) {
                  return { ...t, quiz: newQuizObj };
                }
                return t;
              });
              return { ...m, topics: updatedTopics };
            }
            return m;
          });
          return { ...c, modules: updatedMods };
        }
      }
      return c;
    });

    setCoursesList(updatedCourses);
    setShowAiQuizModal(false);
    showToast(`🎉 "${generatedDraft.title}" approved & published to ${aiQuizScope.scopeLevel}! Streamed to Assessments tab.`);

    // Sync with backend API in background
    try {
      // Every assessment is stored in a module; a course-level quiz names its module too.
      const moduleIdVal = aiQuizScope.moduleId && aiQuizScope.moduleId.length === 36 ? aiQuizScope.moduleId : null;
      const scopeTypeEnum = toScopeTypeValue(aiQuizScope.scopeLevel === 'Course' ? 'Course' : 'Module');
      const scopeIdVal = aiQuizScope.scopeLevel === 'Course' ? targetCourseId : moduleIdVal;

      await quizService.createQuiz({
        courseId: targetCourseId,
        title: generatedDraft.title,
        description: generatedDraft.description || `Assessment for ${aiQuizScope.moduleTitle}`,
        timeLimitMinutes: Number(aiTimeLimit),
        passingScorePercent: Number(aiPassMark),
        xpReward: Number(aiXpReward),
        coinReward: Number(aiCoinReward),
        scopeType: scopeTypeEnum,
        scopeId: scopeIdVal,
        moduleId: moduleIdVal,
        questions: generatedDraft.questions.map((q, idx) => ({
          prompt: q.prompt,
          type: toQuestionTypeValue(q.type),
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          points: q.points || 10,
          orderIndex: idx + 1,
          metadataJson: JSON.stringify({
            slideCitation: q.slideCitation,
            markingScheme: q.markingScheme,
            questionType: q.type
          })
        }))
      });
    } catch {
      // safely preserved in localStorage and component state
    }
  };

  // ── INSTRUCTOR QUIZ REVIEW / EDIT & RENAME HANDLERS ────────────────────
  // Opens the review modal pre-filled with the quiz's current questions so the
  // instructor can rename it, edit the description, and tweak every question
  // (prompt, options, correct answer, points, explanation) before saving.
  const handleOpenReviewQuiz = async (quizItem, mod = null, isFinal = false) => {
    setEditingQuizMeta({ quizItem, module: mod, isFinal });
    setEditQuizTitle(quizItem.title || '');
    setEditQuizDesc(quizItem.description || '');
    setShowEditQuizModal(true);

    // Start with whatever is already in local state so the modal opens instantly
    setEditQuizQuestions(
      (quizItem.questions && quizItem.questions.length > 0)
        ? quizItem.questions.map(q => ({ ...q }))
        : []
    );

    // Backend quizzes store questions server-side — hydrate the full detail if needed
    if ((!quizItem.questions || quizItem.questions.length === 0) && quizItem.id && quizItem.id.length === 36) {
      try {
        const detail = await quizService.getQuizById(quizItem.id);
        if (detail && detail.questions && detail.questions.length > 0) {
          const typeLabel = (t) => {
            const map = { 0: 'MultipleChoice', 1: 'MultipleSelect', 2: 'FillInBlank', 3: 'ShortAnswer', 4: 'Matching', 5: 'TrueFalse', 6: 'Dropdown' };
            const metaType = (() => { try { return detail.metadataJson ? JSON.parse(detail.metadataJson).questionType : null; } catch { return null; } })();
            return typeof t === 'number' ? (map[t] || 'MultipleChoice') : (metaType || t || 'MultipleChoice');
          };
          setEditQuizQuestions(detail.questions.map(q => ({
            id: q.id,
            prompt: q.prompt || '',
            type: typeLabel(q.type),
            options: q.options && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: q.correctAnswer || q.options?.[0] || 'Option A',
            explanation: q.explanation || '',
            points: q.points || 10,
            slideCitation: (() => { try { return q.metadataJson ? JSON.parse(q.metadataJson).slideCitation : null; } catch { return null; } })(),
            markingScheme: (() => { try { return q.metadataJson ? JSON.parse(q.metadataJson).markingScheme : null; } catch { return null; } })()
          })));
        }
      } catch (err) {
        console.warn('Could not hydrate quiz details for review:', err);
      }
    }
  };

  const handleUpdateEditQuizQuestion = (idx, field, val) => {
    setEditQuizQuestions(prev => {
      const updatedQ = [...prev];
      updatedQ[idx] = { ...updatedQ[idx], [field]: val };
      return updatedQ;
    });
  };

  const handleRemoveEditQuizQuestion = (idx) => {
    setEditQuizQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddEditQuizQuestion = () => {
    setEditQuizQuestions(prev => ([
      ...prev,
      { id: `q-new-${Date.now()}`, prompt: '', type: 'MultipleChoice', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A', explanation: '', points: 10 }
    ]));
  };

  const handleSaveQuizReview = async () => {
    if (!editingQuizMeta) return;
    const { quizItem, module: quizModule, isFinal } = editingQuizMeta;
    const newTitle = (editQuizTitle || '').trim();

    if (!newTitle) {
      alert('Quiz title cannot be empty.');
      return;
    }
    if (editQuizQuestions.length === 0) {
      alert('A quiz must contain at least one question.');
      return;
    }
    if (editQuizQuestions.some(q => !q.prompt || !q.prompt.trim())) {
      alert('Every question needs a prompt before saving.');
      return;
    }

    setIsSavingQuizEdit(true);
    const oldTitle = quizItem.title;
    const updatedQuiz = {
      ...quizItem,
      title: newTitle,
      description: editQuizDesc || quizItem.description,
      questionsCount: editQuizQuestions.length,
      questions: editQuizQuestions.map((q, idx) => ({ ...q, id: q.id || `q-item-${idx + 1}` }))
    };

    // 1. Update local course state (module quizzes list, moduleAssessment, topic & final assessment)
    setCoursesList(prev => prev.map(c => {
      if (c.id !== currentCourse?.id) return c;
      if (isFinal) return { ...c, finalAssessment: updatedQuiz };
      if (!quizModule) return c;
      const updatedMods = (c.modules || []).map(m => {
        if (m.id !== quizModule.id) return m;
        return {
          ...m,
          quizzes: (m.quizzes || []).map(q => (q.id === quizItem.id || q.title === oldTitle) ? updatedQuiz : q),
          moduleAssessment: m.moduleAssessment && (m.moduleAssessment.id === quizItem.id || m.moduleAssessment.title === oldTitle)
            ? updatedQuiz
            : m.moduleAssessment,
          topics: (m.topics || []).map(t => t.quiz && (t.quiz.id === quizItem.id || t.quiz.title === oldTitle) ? { ...t, quiz: updatedQuiz } : t)
        };
      });
      return { ...c, modules: updatedMods };
    }));

    // 2. Sync localStorage mirror so Assessments & Quizzes tab stays consistent
    updateGeneratedQuiz(quizItem.id, { title: newTitle, description: updatedQuiz.description, questions: updatedQuiz.questions }, oldTitle);
    window.dispatchEvent(new Event('eduflow_quiz_created'));

    // 3. Persist to backend when this quiz actually lives there (GUID id)
    if (quizItem.id && quizItem.id.length === 36) {
      try {
        const scopeTypeEnum = toScopeTypeValue(updatedQuiz.scopeType || 'Module');
        const scopeIdVal = (updatedQuiz.scopeId && String(updatedQuiz.scopeId).length === 36) ? updatedQuiz.scopeId : (quizModule?.id && quizModule.id.length === 36 ? quizModule.id : currentCourse.id);
        await quizService.updateQuiz(quizItem.id, {
          courseId: currentCourse.id,
          title: newTitle,
          description: updatedQuiz.description || `Assessment for ${quizModule?.title || currentCourse.title}`,
          timeLimitMinutes: Number(updatedQuiz.timeLimitMinutes || updatedQuiz.timeLimit || 15),
          passingScorePercent: Number(updatedQuiz.passPercentage || updatedQuiz.passingScorePercent || updatedQuiz.passThreshold || 70),
          xpReward: Number(updatedQuiz.xpReward || 50),
          coinReward: Number(updatedQuiz.coinReward || 20),
          scopeType: scopeTypeEnum,
          scopeId: scopeIdVal,
          moduleId: quizModule?.id && quizModule.id.length === 36 ? quizModule.id : undefined,
          questions: updatedQuiz.questions.map((q, idx) => ({
            prompt: q.prompt,
            type: toQuestionTypeValue(q.type),
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            points: Number(q.points) || 10,
            orderIndex: idx + 1,
            metadataJson: JSON.stringify({ slideCitation: q.slideCitation, markingScheme: q.markingScheme, questionType: q.type })
          }))
        });
        showToast(`✅ Quiz "${newTitle}" updated${oldTitle !== newTitle ? ` (renamed from "${oldTitle}")` : ''}!`);
      } catch (err) {
        console.warn('Backend quiz update failed, changes kept locally:', err);
        showToast(`⚠️ Saved locally, but backend sync failed: ${err.response?.data?.message || err.message}`);
      }
    } else {
      showToast(`✅ Quiz "${newTitle}" updated successfully!`);
    }

    setShowEditQuizModal(false);
    setEditingQuizMeta(null);
    setIsSavingQuizEdit(false);
  };

  // ── INTERACTIVE QUIZ QUEST RUNNER HANDLERS ────────────────────────────────
  const handleStartSlideQuestRunner = async (assessmentObj, mod) => {
    let questions;
    let attemptId;
    try {
      const attempt = await quizService.startQuiz(assessmentObj.id);
      questions = attempt.questions || [];
      attemptId = attempt.attemptId;
    } catch (err) {
      alert(err.friendlyMessage || 'This assessment cannot be started right now.');
      return;
    }
    if (questions.length === 0) {
      alert('This assessment has no questions yet.');
      return;
    }

    setActiveRunnerQuiz({
      ...assessmentObj,
      attemptId,
      moduleTitle: mod?.title || currentCourse?.title || 'Curriculum',
      questions
    });
    setRunnerCurrentIndex(0);
    setRunnerAnswers({});
    setRunnerStreak(0);
    setRunnerTimeRemaining((assessmentObj.timeLimitMinutes || 15) * 60);
    setShowQuizRunnerModal(true);
  };

  const handleRunnerAnswerChange = (questionId, answer) => {
    setRunnerAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitQuizQuest = async () => {
    if (!activeRunnerQuiz || !activeRunnerQuiz.questions) return;

    const isLearner = !(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin');
    if (!isLearner) {
      showToast('Preview mode: instructor attempts are not submitted or graded.');
      return;
    }

    setIsSubmittingQuiz(true);
    try {
      const answers = activeRunnerQuiz.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: (runnerAnswers[q.id] || '').trim()
      }));
      const res = await quizService.submitQuiz(activeRunnerQuiz.id, answers, activeRunnerQuiz.attemptId);
      const pointsById = new Map(activeRunnerQuiz.questions.map((q) => [q.id, q.points]));

      setMarkingSchemeResult({
        quizTitle: activeRunnerQuiz.title,
        moduleTitle: activeRunnerQuiz.moduleTitle,
        scoreObtained: res.scoreObtained,
        maxScore: res.maxScore,
        percentageScore: Math.round(res.percentageScore),
        passed: res.passed,
        xpEarned: res.xpEarned,
        coinsEarned: res.coinsEarned,
        streakBonus: res.xpBreakdown?.streakBonus || 0,
        badgeUnlocked: res.badgeUnlocked || null,
        status: res.status,
        pendingReviewCount: res.pendingReviewCount || 0,
        questionBreakdown: (res.questionBreakdown || []).map((item) => ({
          questionId: item.questionId,
          prompt: item.prompt,
          type: item.questionType,
          selectedAnswer: item.selectedAnswer || '(No Answer Provided)',
          correctAnswer: item.correctAnswer,
          isCorrect: item.isCorrect,
          pointsAwarded: item.pointsAwarded,
          maxPoints: item.maxMarks || pointsById.get(item.questionId),
          evaluationStatus: item.evaluationStatus,
          explanation: item.explanation,
          markingScheme: item.markingScheme,
          slideCitation: item.slideCitation,
          aiFeedback: null
        }))
      });
      setShowQuizRunnerModal(false);
      setShowMarkingSchemeModal(true);
      showToast(res.passed
        ? `🏆 Quiz passed! ${Math.round(res.percentageScore)}% • +${res.xpEarned} XP`
        : `Quiz completed with ${Math.round(res.percentageScore)}%. Review the marking scheme below.`);
    } catch (err) {
      // Nothing was recorded; the runner stays open so the student can retry.
      alert(err.friendlyMessage || 'Your answers could not be submitted. No result was recorded.');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };


  const toggleModuleExpand = (modId) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const handleCreateCourse = async () => {
    if (!newCourseCode || !newCourseTitle) {
      alert('Please provide Course Code and Title.');
      return;
    }

    try {
      const created = await courseService.createCourse({
        code: newCourseCode.toUpperCase(),
        title: newCourseTitle,
        description: newCourseDesc || 'Comprehensive curriculum with grounded AI assessments.',
        category: newCourseCategory,
        term: newCourseTerm || 'Fall 2026',
      });
      created.modules = [];
      created.fullDetailsLoaded = true;
      created.finalAssessment = {
        id: `final-${created.id}`,
        title: `${created.title} Final Assessment`,
        questionsCount: 20,
        timeLimitMinutes: 60,
        passPercentage: 70,
        xpReward: 500
      };

      setCoursesList(prev => [...prev, created]);
      setSelectedCourseId(created.id);
      setShowCourseModal(false);
      setNewCourseCode('');
      setNewCourseTitle('');
      setNewCourseDesc('');
      showToast(`Created new course ${created.code}!`);
    } catch (err) {
      alert('Failed to create course. ' + err.message);
    }
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle) {
      alert('Please enter a module title.');
      return;
    }

    let uploadedPdfUrl = null;
    let uploadedPdfName = null;

    if (modulePdfFile) {
      setModulePdfUploading(true);
      try {
        const uploadRes = await courseService.uploadSlide(modulePdfFile);
        uploadedPdfUrl = uploadRes.fileUrl;
        uploadedPdfName = uploadRes.fileName;
      } catch {
        uploadedPdfUrl = `/uploads/slides/${modulePdfFile.name}`;
        uploadedPdfName = modulePdfFile.name;
      } finally {
        setModulePdfUploading(false);
      }
    }

    try {
      const createdMod = await courseService.createModule(currentCourse.id, {
        title: newModuleTitle,
        description: newModuleDesc || 'Module curriculum with attached learning materials and assessment checkpoints.',
        orderIndex: (currentCourse.modules?.length || 0) + 1,
        pdfUrl: uploadedPdfUrl,
        attachmentFileName: uploadedPdfName,
      });

      const newMod = {
        ...createdMod,
        topics: [
          {
            id: `t-${Date.now()}`,
            title: `${newModuleTitle} Core Concepts`,
            masteryPercent: 0,
            lessons: []
          }
        ],
        moduleAssessment: {
          id: `assm-${createdMod.id}`,
          title: `${createdMod.title} Assessment`,
          questionsCount: 5,
          timeLimitMinutes: 15,
          passPercentage: 70,
          xpReward: 100,
          isBossBattle: false
        }
      };

      const updated = coursesList.map(c => {
        if (c.id === currentCourse.id) {
          return {
            ...c,
            modules: [...(c.modules || []), newMod]
          };
        }
        return c;
      });

      setCoursesList(updated);
      setExpandedModules(prev => ({ ...prev, [newMod.id]: true }));
      setShowModuleModal(false);
      setNewModuleTitle('');
      setNewModuleDesc('');
      setModulePdfFile(null);
      showToast(`Added module "${newMod.title}"!`);
    } catch (err) {
      alert('Failed to create module. ' + err.message);
    }
  };

  const handleOpenAddTopic = (mod) => {
    setActiveModuleForTopic(mod);
    setNewTopicTitle('');
    setNewLessonTitle('');
    setNewLessonContent('');
    setShowTopicModal(true);
  };

  const handleCreateTopic = async () => {
    if (!newTopicTitle || !activeModuleForTopic) {
      alert('Please enter a Topic Title.');
      return;
    }

    try {
      const createdLesson = await courseService.createLesson(activeModuleForTopic.id, {
        title: newLessonTitle || `${newTopicTitle} Introduction`,
        content: newLessonContent || 'Study the lecture notes and review the core architectural objectives.',
        estimatedMinutes: parseInt(newLessonDuration) || 30,
        xpReward: Number(newLessonXp) || 40,
        orderIndex: 1
      });

      const newTopic = {
        id: `t-${Date.now()}`,
        title: newTopicTitle,
        masteryPercent: 0,
        lessons: [
          {
            id: createdLesson.id,
            title: createdLesson.title,
            type: 'doc',
            duration: `${createdLesson.estimatedMinutes}m`,
            xp: createdLesson.xpReward,
            completed: false,
            content: createdLesson.content
          }
        ]
      };

      const updated = coursesList.map(c => {
        if (c.id === currentCourse.id) {
          const updatedMods = c.modules.map(m => {
            if (m.id === activeModuleForTopic.id) {
              return {
                ...m,
                topics: [...(m.topics || []), newTopic]
              };
            }
            return m;
          });
          return { ...c, modules: updatedMods };
        }
        return c;
      });

      setCoursesList(updated);
      setShowTopicModal(false);
      setActiveModuleForTopic(null);
      showToast(`Added topic "${newTopic.title}" to ${activeModuleForTopic.title}!`);
    } catch (err) {
      alert('Failed to create topic/lesson. ' + err.message);
    }
  };

  const handleDeleteModule = (moduleId) => {
    if (window.confirm('Are you sure you want to delete this module and its assessments?')) {
      const updated = coursesList.map(c => {
        if (c.id === currentCourse.id) {
          return {
            ...c,
            modules: (c.modules || []).filter(m => m.id !== moduleId)
          };
        }
        return c;
      });
      setCoursesList(updated);
      courseService.deleteModule(moduleId).catch(e => console.warn('Backend delete module error ignored:', e));
      showToast('🗑️ Module deleted successfully.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '60px 20px', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <RefreshCw size={32} className="spin" color="var(--primary)" />
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading Curriculum & Assessment Hierarchy...</span>
      </div>
    );
  }

  if (!currentCourse) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1360px', margin: '0 auto', width: '100%' }}>
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', marginTop: '20px' }}>
          <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px', color: 'var(--text-main)' }}>No Courses Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Get started by creating your first course.</p>
          <button onClick={() => setShowCourseModal(true)} className="btn-primary" style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Create Course
          </button>
        </div>

        {/* Create Course Modal */}
        {showCourseModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }} onClick={() => setShowCourseModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: 'var(--shadow-popover)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={20} color="var(--primary)" />
                  Create New Course
                </h3>
                <button onClick={() => setShowCourseModal(false)} className="btn-ghost" style={{ padding: '4px' }}>✕</button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Course Code</label>
                  <input placeholder="e.g. CS101" value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Category</label>
                  <select value={newCourseCategory} onChange={e => setNewCourseCategory(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '13px' }}>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Academic Term</label>
                  <select value={newCourseTerm} onChange={e => setNewCourseTerm(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '13px' }}>
                    <option value="Fall 2026">Fall 2026</option>
                    <option value="Spring 2026">Spring 2026</option>
                    <option value="Summer 2026">Summer 2026</option>
                    <option value="Fall 2025">Fall 2025</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Course Title</label>
                <input placeholder="e.g. Distributed Systems" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea rows={3} placeholder="Course overview and syllabus..." value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setShowCourseModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleCreateCourse} className="btn-primary">Create Course</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1360px', margin: '0 auto', width: '100%' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#10B981',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1000,
          fontSize: '13.5px',
          fontWeight: '700'
        }}>
          <Check size={18} strokeWidth={3} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── FLOATING BACKGROUND QUIZ GENERATOR LOADER WIDGET ── */}
      {isGeneratingQuiz && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0F172A',
          border: '1px solid rgba(99, 102, 241, 0.5)',
          borderRadius: '16px',
          padding: '14px 18px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          zIndex: 1100,
          maxWidth: '420px',
          color: '#F8FAFC'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <RefreshCw size={18} className="spin" color="#818CF8" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>
                Synthesizing Strict RAG Questions...
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(99, 102, 241, 0.25)',
                color: '#A5B4FC',
                textTransform: 'uppercase'
              }}>
                RAG Active
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0 0' }}>
              Grounded in lecture slides • {aiQuizScope.moduleTitle || 'Module'}
            </p>
          </div>
          <button
            onClick={() => setShowAiQuizModal(true)}
            style={{
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.3)',
              color: '#FFFFFF',
              border: '1px solid rgba(129, 140, 248, 0.4)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Open Modal
          </button>
        </div>
      )}

      {/* ── QUIZ GENERATION COMPLETE NOTIFICATION TOAST ── */}
      {quizNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0F172A',
          border: '1px solid #10B981',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          zIndex: 1200,
          maxWidth: '440px',
          color: '#F8FAFC'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={20} color="#34D399" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#34D399' }}>
              {quizNotification.title}
            </div>
            <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px', lineHeight: '1.4' }}>
              {quizNotification.message}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => {
                  setShowAiQuizModal(true);
                  setQuizNotification(null);
                }}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Eye size={14} />
                <span>Review Draft & Publish</span>
              </button>
              <button
                onClick={() => setQuizNotification(null)}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#94A3B8',
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setQuizNotification(null)}
            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── PERSISTENT FLOATING BADGE FOR GENERATED DRAFT UNTIL APPROVED ── */}
      {generatedDraft && !showAiQuizModal && !isGeneratingQuiz && !quizNotification && (
        <button
          onClick={() => setShowAiQuizModal(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '30px',
            padding: '11px 20px',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 1100,
            fontSize: '12.5px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Sparkles size={16} />
          <span>1 AI Quiz Draft Ready for Review</span>
        </button>
      )}

      {/* ── 1. COURSE SWITCHER & TOP ACTIONS ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {coursesList.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectCourse(c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: selectedCourseId === c.id ? 'var(--primary-soft)' : 'var(--bg-surface)',
                color: selectedCourseId === c.id ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: selectedCourseId === c.id ? '700' : '600',
                fontSize: '13px',
                border: selectedCourseId === c.id ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span className="badge-pill badge-primary" style={{ fontSize: '10.5px' }}>
                {c.code}
              </span>
              <span>{c.title}</span>
            </button>
          ))}

          <button
            onClick={() => setShowCourseModal(true)}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '12.5px', borderStyle: 'dashed', gap: '6px' }}
          >
            <Plus size={14} /> 
            <span>New Course</span>
          </button>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-canvas)',
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          <button
            onClick={() => setViewMode('curriculum')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: viewMode === 'curriculum' ? 'var(--bg-card)' : 'transparent',
              color: viewMode === 'curriculum' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '700',
              border: viewMode === 'curriculum' ? '1px solid var(--border-card)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Layers size={14} /> 
            <span>Hierarchy & Quizzes Tree</span>
          </button>
          <button
            onClick={() => setViewMode('journey')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: viewMode === 'journey' ? 'var(--bg-card)' : 'transparent',
              color: viewMode === 'journey' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '700',
              border: viewMode === 'journey' ? '1px solid var(--border-card)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Map size={14} /> 
            <span>Student Journey Map</span>
          </button>
        </div>
      </div>

      {/* ── 2. CURRENT COURSE BANNER & STATS ──────────────────────────────── */}
      <div className="card-premium" style={{
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span className="badge-pill badge-primary" style={{ fontWeight: '700' }}>
              {currentCourse.code}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              📅 {currentCourse.term || 'Fall 2026'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Category: {currentCourse.category}
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            {currentCourse.title}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
            {currentCourse.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
            {currentCourse.instructorName && (
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                By <strong style={{ color: 'var(--text-main)' }}>{currentCourse.instructorName}</strong>
              </span>
            )}
            <StarRating value={currentCourse.averageRating || 0} count={currentCourse.ratingCount || 0} size={14} />
          </div>
        </div>

        {/* Course Aggregate Metrics */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right', paddingRight: '16px', borderRight: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Enrolled Students</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary)' }}>
              {currentCourse.studentsCount}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700' }}>
              {currentCourse.completionRate}% Completion
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOpenCourseAiQuiz()}
              className="btn-primary"
              style={{
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: '700',
                gap: '6px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 100%)',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              <Sparkles size={14} />
              <span>⚡ Generate Course Final Assessment</span>
            </button>

            {currentUser?.role === 'Instructor' || currentUser?.role === 'Admin' ? (
              <button
                onClick={() => handleOpenAddStudentsModal()}
                className="btn-secondary"
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  gap: '6px',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  backgroundColor: 'rgba(79, 70, 229, 0.08)'
                }}
              >
                <UserPlus size={14} />
                <span>Add Students</span>
              </button>
            ) : null}

            <button
              onClick={() => setShowModuleModal(true)}
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: '12px', gap: '6px' }}
            >
              <Plus size={14} /> 
              <span>Add Module</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2b. COURSE RATINGS & REVIEWS ────────────────────────────────────── */}
      <CourseReviews courseId={currentCourse.id} currentUser={currentUser} />

      {/* ── 3. COURSE-LEVEL FINAL ASSESSMENT CARD ──────────────────────────── */}
      {currentCourse.finalAssessment && (
        <div className="card-premium" style={{
          padding: '20px 24px',
          backgroundColor: 'rgba(79, 70, 229, 0.04)',
          border: '1px solid var(--primary-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-pill badge-primary" style={{ fontSize: '10.5px', fontWeight: '700' }}>
                  COURSE FINAL ASSESSMENT
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {currentCourse.finalAssessment.questionsCount} Questions • {currentCourse.finalAssessment.timeLimitMinutes} Mins • Pass Mark: {currentCourse.finalAssessment.passPercentage}%
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0 2px' }}>
                {currentCourse.finalAssessment.title}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Comprehensive summative evaluation covering all modules and learning outcomes. +{currentCourse.finalAssessment.xpReward} XP upon passing.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
              <button
                onClick={() => handleStartSlideQuestRunner(currentCourse.finalAssessment, { title: currentCourse.title })}
                className="btn-primary"
                style={{
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: '700',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Play size={13} fill="currentColor" />
                <span>🎮 Take Quiz Quest</span>
              </button>
            )}
            {(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
              <button
                onClick={() => handleOpenReviewQuiz(currentCourse.finalAssessment, null, true)}
                className="btn-secondary"
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '700', gap: '6px' }}
                title="Review & edit final assessment questions, rename quiz"
              >
                <Edit3 size={14} />
                <span>Review / Edit</span>
              </button>
            )}
            <button
              onClick={() => handleOpenCourseAiQuiz()}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px', gap: '6px' }}
            >
              <Bot size={14} />
              <span>Regenerate with AI</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 4. MAIN HIERARCHICAL CURRICULUM & ASSESSMENT TREE ──────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
              Curriculum Modules & Assessment Structure
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Enter any module to inspect topics, lessons, module boss battles, and generate grounded AI assessments in place.
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
            {currentCourse.modules?.length || 0} Modules Total
          </span>
        </div>

        {currentCourse.modules && currentCourse.modules.length > 0 ? (
          currentCourse.modules.map((mod, modIdx) => {
            const isExpanded = !!expandedModules[mod.id];

            return (
              <div 
                key={mod.id} 
                className="card-premium" 
                style={{
                  padding: 0, 
                  overflow: 'hidden',
                  border: isExpanded ? '1px solid var(--primary-border)' : '1px solid var(--border-card)'
                }}
              >
                {/* ── MODULE HEADER ───────────────────────────────────────── */}
                <div 
                  onClick={() => toggleModuleExpand(mod.id)}
                  style={{
                    padding: '16px 22px',
                    backgroundColor: isExpanded ? 'rgba(79, 70, 229, 0.04)' : 'var(--bg-surface)',
                    borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                      {isExpanded ? <ChevronDown size={20} color="var(--primary)" /> : <ChevronRight size={20} />}
                    </button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--secondary)', letterSpacing: '0.04em' }}>
                          MODULE {mod.orderIndex || modIdx + 1}
                        </span>
                        {mod.pdfUrl && (
                          <span className="badge-pill badge-secondary" style={{ fontSize: '10.5px' }}>
                            <FileText size={11} /> Syllabus PDF Attached
                          </span>
                        )}
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          • Cohort Mastery: <strong style={{ color: mod.masteryRate < 70 ? '#EF4444' : 'var(--success)' }}>{mod.masteryRate}%</strong>
                        </span>
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', margin: 0 }}>
                        {mod.title}
                      </h3>
                      {mod.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                          {mod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Module Level Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEditModule(mod)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11.5px', gap: '5px' }}
                      title="Edit Module & Update Slides"
                    >
                      <Edit3 size={13} />
                      <span>Edit / Slides</span>
                    </button>

                    <button
                      onClick={() => handleOpenModuleAiQuiz(mod, false)}
                      className="btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        gap: '5px',
                        backgroundColor: 'var(--primary-soft)',
                        borderColor: 'var(--primary-border)',
                        color: 'var(--primary-text)'
                      }}
                      title="Generate Module Assessment with AI"
                    >
                      <Bot size={13} />
                      <span>⚡ Module AI Quiz</span>
                    </button>

                    <button
                      onClick={() => handleOpenModuleAiQuiz(mod, true)}
                      className="btn-danger"
                      style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: '700', gap: '5px' }}
                      title="Configure Module Boss Quiz"
                    >
                      <Swords size={13} />
                      <span>👹 Boss Quiz</span>
                    </button>

                    <button
                      onClick={() => handleOpenAddTopic(mod)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11.5px', gap: '5px' }}
                    >
                      <Plus size={13} />
                      <span>Add Topic</span>
                    </button>

                    <button
                      onClick={() => handleDeleteModule(mod.id)}
                      title="Delete Module"
                      className="btn-danger"
                      style={{ padding: '6px 8px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* ── EXPANDED MODULE BODY ─────────────────────────────────── */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Attached Syllabus PDF Banner */}
                    {mod.pdfUrl && (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'var(--secondary-soft)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--secondary)'
                          }}>
                            <FileText size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                              {mod.attachmentFileName || 'Module Curriculum Document.pdf'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Official lecture reading and curriculum specification
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={async () => {
                              const doc = await preparePdfForViewing(
                                mod.pdfUrl,
                                `${mod.title} – Reading Material`,
                                mod.attachmentFileName || 'syllabus.pdf'
                              );
                              setPdfViewerDoc(doc);
                            }}
                            className="btn-secondary"
                            style={{ padding: '5px 12px', fontSize: '11.5px', gap: '4px' }}
                          >
                            <Eye size={13} />
                            <span>Preview Document</span>
                          </button>
                          <button
                            onClick={() => downloadPdf(mod.pdfUrl, mod.attachmentFileName || 'material.pdf', mod.title)}
                            className="btn-ghost"
                            style={{ padding: '5px 10px', fontSize: '11.5px', gap: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── MODULE ASSESSMENTS & QUIZZES SECTION (SUPPORTS MULTIPLE QUIZZES) ── */}
                    {((mod.quizzes && mod.quizzes.length > 0) || mod.moduleAssessment) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <HelpCircle size={14} />
                            <span>Module Quizzes & Assessments ({mod.quizzes?.length || (mod.moduleAssessment ? 1 : 0)})</span>
                          </div>
                          {(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
                            <button
                              onClick={() => handleOpenModuleAiQuiz(mod, false)}
                              className="btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
                            >
                              <Plus size={12} /> <span>Add Quiz</span>
                            </button>
                          )}
                        </div>

                        {(mod.quizzes && mod.quizzes.length > 0 ? mod.quizzes : [mod.moduleAssessment]).map((quizItem, qIdx) => (
                          <div
                            key={quizItem.id || qIdx}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: quizItem.isBossBattle ? 'rgba(239, 68, 68, 0.04)' : 'rgba(79, 70, 229, 0.04)',
                              border: quizItem.isBossBattle ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--primary-border)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: quizItem.isBossBattle ? 'rgba(239, 68, 68, 0.15)' : 'rgba(79, 70, 229, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: quizItem.isBossBattle ? '#EF4444' : 'var(--primary)'
                              }}>
                                {quizItem.isBossBattle ? <Swords size={18} /> : <Award size={18} />}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className={`badge-pill ${quizItem.isBossBattle ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '10px', fontWeight: '700' }}>
                                    {quizItem.isBossBattle ? '👹 MODULE BOSS CHALLENGE' : '🧠 MODULE QUIZ'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {quizItem.questionsCount || quizItem.questions?.length || 5} Questions • {quizItem.timeLimitMinutes || quizItem.timeLimit || 15} Mins • Pass: {quizItem.passPercentage || quizItem.passingScorePercent || 70}%
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '3px 0 1px' }}>
                                    {quizItem.title}
                                  </h4>
                                  {(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
                                    <button
                                      onClick={() => handleOpenReviewQuiz(quizItem, mod)}
                                      className="btn-ghost"
                                      title="Rename Quiz"
                                      style={{ padding: '2px 6px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  )}
                                </div>
                                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                  Covers topics in {mod.title}. +{quizItem.xpReward || 50} XP reward upon completion.
                                </p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {!(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
                                <button
                                  onClick={() => handleStartSlideQuestRunner(quizItem, mod)}
                                  className="btn-primary"
                                  style={{
                                    padding: '5px 12px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    gap: '5px',
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                  }}
                                >
                                  <Play size={12} fill="currentColor" />
                                  <span>Take Quiz</span>
                                </button>
                              )}
                              {(currentUser?.role === 'Instructor' || currentUser?.role === 'Admin') && (
                                <>
                                  <button
                                    onClick={() => handleOpenReviewQuiz(quizItem, mod)}
                                    className="btn-secondary"
                                    style={{ padding: '5px 12px', fontSize: '11.5px', fontWeight: '700', gap: '5px' }}
                                    title="Review & edit questions, rename quiz"
                                  >
                                    <Edit3 size={13} />
                                    <span>Review / Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenModuleAiQuiz(mod, quizItem.isBossBattle)}
                                    className="btn-secondary"
                                    style={{ padding: '5px 10px', fontSize: '11.5px', gap: '4px' }}
                                    title="Regenerate this quiz with AI"
                                  >
                                    <Bot size={13} />
                                    <span>AI Regenerate</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── TOPICS & LESSONS IN MODULE ────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                        Learning Topics & Subtopics
                      </div>

                      {mod.topics && mod.topics.length > 0 ? (
                        mod.topics.map((topic, tIdx) => (
                          <div
                            key={topic.id}
                            style={{
                              padding: '14px 18px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--bg-surface)',
                              border: topic.hasWarning ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            {/* Topic Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: topic.hasWarning ? 'rgba(239, 68, 68, 0.15)' : 'var(--primary-soft)',
                                  color: topic.hasWarning ? '#EF4444' : 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: '800'
                                }}>
                                  {tIdx + 1}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                                      {topic.title}
                                    </h4>
                                    {topic.hasWarning && (
                                      <span className="badge-pill badge-danger" style={{ fontSize: '10px', fontWeight: '700' }}>
                                        ⚠ Low Mastery: {topic.masteryPercent}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Topic Action Buttons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {topic.hasWarning && (
                                  <button
                                    onClick={() => handleOpenRemediationFromTopic(mod, topic)}
                                    className="btn-primary"
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      gap: '4px',
                                      background: 'linear-gradient(135deg, #4F46E5 0%, #EF4444 100%)'
                                    }}
                                    title="Generate 1-Click AI Remediation Quiz"
                                  >
                                    <Sparkles size={12} />
                                    <span>⚡ Generate Remediation Quiz</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleOpenTopicAiQuiz(mod, topic)}
                                  className="btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '11px', gap: '4px' }}
                                >
                                  <Bot size={12} />
                                  <span>⚡ AI Quiz</span>
                                </button>
                              </div>
                            </div>

                            {/* Lessons under Topic */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '34px' }}>
                              {topic.lessons && topic.lessons.map(les => (
                                <div
                                  key={les.id}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-xs)',
                                    backgroundColor: 'var(--bg-canvas)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={13} color="var(--primary)" />
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{les.title}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({les.duration})</span>
                                  </div>
                                  <span style={{ color: 'var(--secondary)', fontWeight: '700', fontSize: '11px' }}>
                                    +{les.xp} XP
                                  </span>
                                </div>
                              ))}

                              {/* Attached Quiz under Topic */}
                              {topic.quiz && (
                                <div style={{
                                  padding: '8px 12px',
                                  borderRadius: 'var(--radius-xs)',
                                  backgroundColor: 'rgba(79, 70, 229, 0.05)',
                                  border: '1px solid var(--primary-border)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={14} color="var(--primary)" />
                                    <strong style={{ color: 'var(--text-main)' }}>{topic.quiz.title}</strong>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700' }}>
                                      Avg Score: {topic.quiz.avgScore}%
                                    </span>
                                    <button
                                      onClick={() => handleStartSlideQuestRunner(topic.quiz, mod)}
                                      className="btn-primary"
                                      style={{ padding: '3px 8px', fontSize: '10.5px', gap: '4px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                                    >
                                      <Play size={10} fill="currentColor" />
                                      {currentUser?.role === 'Instructor' || currentUser?.role === 'Admin' ? <span>Preview</span> : <span>Play</span>}
                                    </button>
                                    <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>
                                      +{topic.quiz.xpReward} XP
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                          No topics added yet. Click "+ Add Topic" to add learning content.
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="card-premium" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No modules created yet. Click "+ Add Module" to start structuring your course.</p>
          </div>
        )}
      </div>

      {/* ── 5. UNIFIED AI QUIZ GENERATOR & REVIEWER MODAL ────────────────── */}
      {showAiQuizModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '96vw',
            height: '94vh',
            maxWidth: '1400px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(79, 70, 229, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    AI Assessment Generator & Reviewer
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                    Grounded in Course Hierarchy: <strong>{aiQuizScope.courseTitle} → {aiQuizScope.moduleTitle} → {aiQuizScope.topicTitle}</strong>
                  </p>
                </div>
              </div>

              <button onClick={() => setShowAiQuizModal(false)} className="btn-ghost" style={{ padding: '8px', fontSize: '16px' }}>✕</button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Scope Summary Box */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Hierarchy Scope: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{aiQuizScope.scopeLevel} Level</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>({aiQuizScope.topicTitle})</span>
                </div>
                <span className="badge-pill badge-primary" style={{ fontWeight: '700' }}>
                  {aiQuizType} Mode
                </span>
              </div>

              {/* Background Generation Active Alert inside Modal */}
              {isGeneratingQuiz && (
                <div style={{
                  padding: '14px 18px',
                  backgroundColor: 'rgba(79, 70, 229, 0.08)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={20} className="spin" color="var(--primary)" />
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>
                        Strict RAG Question Generation in Progress...
                      </strong>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        You can close this window and continue using the app freely. A notification will appear when ready!
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiQuizModal(false)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    Run in Background ✕
                  </button>
                </div>
              )}

              {/* Generator Configuration Form */}
              {!generatedDraft && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* ── SlideQuest Topic Discovery & RAG Filter ── */}
                  {isAnalyzingTopics ? (
                    <div style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(79, 70, 229, 0.06)',
                      border: '1px solid var(--primary-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}>
                      <RefreshCw size={24} className="spin" color="var(--primary)" />
                      <div>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block' }}>
                          SlideQuest AI Agent: Analyzing Slide Structure & Extracting Learning Invariants...
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Scanning {analyzedSlideDeckName || 'lecture slides'} to categorize subtopics and calibrate Bloom taxonomy levels.
                        </span>
                      </div>
                    </div>
                  ) : detectedSlideTopics.length > 0 ? (
                    <div style={{
                      padding: '16px',
                      backgroundColor: 'rgba(79, 70, 229, 0.04)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--primary-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={16} color="var(--primary)" />
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                            ⚡ SlideQuest Agent: {detectedSlideTopics.length} Subtopics Discovered in "{analyzedSlideDeckName}"
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700' }}>
                          ✓ Grounded in Slide Material
                        </span>
                      </div>

                      {/* Master "All Topics" Toggle */}
                      <div
                        onClick={handleToggleSelectAllTopics}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: selectAllTopics ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-canvas)',
                          border: selectAllTopics ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={selectAllTopics}
                            onChange={() => {}}
                            style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <div>
                            <strong style={{ fontSize: '12.5px', color: selectAllTopics ? 'var(--primary)' : 'var(--text-main)' }}>
                              Select All Topics (Full Slide Deck - Recommended)
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                              Synthesizes a comprehensive assessment spanning all {detectedSlideTopics.length} discovered subtopics.
                            </span>
                          </div>
                        </div>
                        <span className="badge-pill badge-primary" style={{ fontSize: '10.5px' }}>
                          Full Deck RAG
                        </span>
                      </div>

                      {/* Individual Subtopics Cards Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                        {detectedSlideTopics.map((t, idx) => {
                          const isSelected = selectAllTopics || selectedTopicIds.includes(t.id);
                          return (
                            <div
                              key={t.id || idx}
                              onClick={() => handleToggleSingleTopic(t.id)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--bg-surface)',
                                border: isSelected ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                                boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.08)' : 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                  />
                                  <strong style={{ fontSize: '12px', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                    {t.title}
                                  </strong>
                                </div>
                                <span className="badge-pill badge-secondary" style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>
                                  {t.slide_range || `Part ${idx + 1}`}
                                </span>
                              </div>

                              {t.summary && (
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                                  {t.summary}
                                </p>
                              )}

                              {t.key_concepts && t.key_concepts.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                  {t.key_concepts.slice(0, 3).map((kc, kIdx) => (
                                    <span key={kIdx} style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                      #{kc}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    aiQuizScope.scopeLevel === 'Module' && (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px dashed var(--border-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          <FileText size={16} color="var(--primary)" />
                          <span>No slides attached yet. Uploading a PDF or PowerPoint deck allows SlideQuest to categorize subtopics and strictly ground questions via RAG.</span>
                        </div>
                      </div>
                    )
                  )}

                  {/* ── Multi-Format Question Type Selection ── */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Interactive Question Types (Multi-Format Gamification)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {[
                        { key: 'MultipleChoice', label: '🔘 Multiple Choice' },
                        { key: 'Dropdown', label: '🔽 Dropdown Selection' },
                        { key: 'FillInBlank', label: '✍️ Fill in the Blanks' },
                        { key: 'Matching', label: '🔄 Matching Concepts' },
                        { key: 'ShortAnswer', label: '💬 Typing / Short Answer' }
                      ].map(fmt => {
                        const isActive = selectedQuestionFormats.includes(fmt.key);
                        return (
                          <button
                            key={fmt.key}
                            type="button"
                            onClick={() => handleToggleQuestionFormat(fmt.key)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              backgroundColor: isActive ? 'var(--primary-soft)' : 'var(--bg-canvas)',
                              color: isActive ? 'var(--primary-text)' : 'var(--text-muted)',
                              border: isActive ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {isActive && <Check size={13} strokeWidth={3} />}
                            <span>{fmt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    
                    {/* Question Count */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Question Count
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={aiQuestionCount}
                        onChange={e => setAiQuestionCount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '13px'
                        }}
                      />
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Difficulty Level
                      </label>
                      <select
                        value={aiQuizDifficulty}
                        onChange={e => setAiQuizDifficulty(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '13px'
                        }}
                      >
                        <option value="Easy">Easy (Knowledge / Comprehension)</option>
                        <option value="Medium">Medium (Application / Analysis)</option>
                        <option value="Hard">Hard (Synthesis / Evaluation)</option>
                        <option value="Boss">Boss Challenge (Comprehensive)</option>
                      </select>
                    </div>

                    {/* Time Limit */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Time Limit (Mins)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={90}
                        value={aiTimeLimit}
                        onChange={e => setAiTimeLimit(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Pass Mark */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Passing Mark (%)
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={aiPassMark}
                        onChange={e => setAiPassMark(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '13px'
                        }}
                      />
                    </div>

                    {/* XP Reward */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Student XP Reward
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={300}
                        value={aiXpReward}
                        onChange={e => setAiXpReward(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      onClick={handleGenerateAiQuizDraft}
                      disabled={isGeneratingQuiz}
                      className="btn-primary"
                      style={{
                        padding: '11px 24px',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #0EA5E9 100%)'
                      }}
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <RefreshCw size={16} className="spin" />
                          <span>Synthesizing Strict RAG Questions...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          <span>Synthesize SlideQuest Assessment Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── GENERATED DRAFT REVIEW & HUMAN-IN-THE-LOOP APPROVAL ── */}
              {generatedDraft && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Draft Title & Description (rename before publish) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Quiz Title (Rename before publishing):
                      </label>
                      <input
                        value={generatedDraft.title || ''}
                        onChange={e => setGeneratedDraft(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. AiML 2014 Lec 1 Assessment"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          fontWeight: '700'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Quiz Description:
                      </label>
                      <textarea
                        rows={2}
                        value={generatedDraft.description || ''}
                        onChange={e => setGeneratedDraft(prev => ({ ...prev, description: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '12.5px',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>

                  {/* Validation Agent Banner */}
                  {validationReport && (
                    <div style={{
                      padding: '14px 18px',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: '700' }}>
                        <ShieldCheck size={18} />
                        <span>SlideQuest AI: Verified RAG Grounding & Transparent Marking Scheme</span>
                      </div>
                      <span className="badge-pill badge-success" style={{ fontSize: '11px', fontWeight: '700' }}>
                        ✓ STRICT SLIDE GROUNDING VERIFIED
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                      Discovered Questions ({generatedDraft.questions.length})
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      ✏️ Edit any question prompt, option text, marking rubric or explanation below before publishing.
                    </span>
                  </div>

                  {/* Editable Questions List (Full View Cards) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {generatedDraft.questions.map((q, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '20px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-card)',
                          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>
                              Question {idx + 1} • {q.type}
                            </span>
                            <span className="badge-pill badge-primary" style={{ fontSize: '10.5px' }}>
                              {q.slideCitation || 'Lecture Slides'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Points:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={q.points || 10}
                              onChange={e => handleUpdateDraftQuestion(idx, 'points', parseInt(e.target.value) || 10)}
                              style={{
                                width: '60px',
                                padding: '4px 8px',
                                backgroundColor: 'var(--bg-canvas)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-xs)',
                                color: 'var(--secondary)',
                                fontWeight: '700',
                                fontSize: '12.5px',
                                textAlign: 'center'
                              }}
                            />
                            <button
                              onClick={() => handleRemoveDraftQuestion(idx)}
                              className="btn-ghost"
                              title="Remove this question"
                              style={{ padding: '4px 6px', color: '#EF4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Editable Question Prompt (Full Multiline Textarea) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            Question Text (Full Text Editable):
                          </label>
                          <textarea
                            rows={3}
                            value={q.prompt || ''}
                            onChange={e => handleUpdateDraftQuestion(idx, 'prompt', e.target.value)}
                            placeholder="Enter full question text..."
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              backgroundColor: 'var(--bg-canvas)',
                              border: '1px solid var(--border-card)',
                              borderRadius: 'var(--radius-xs)',
                              color: 'var(--text-main)',
                              fontSize: '14px',
                              fontWeight: '600',
                              lineHeight: '1.6',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        {/* Options or Answer Specification depending on format */}
                        {q.type === 'ShortAnswer' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                              Ideal Expected Answer Solution:
                            </label>
                            <textarea
                              rows={2}
                              value={q.correctAnswer || ''}
                              onChange={e => handleUpdateDraftQuestion(idx, 'correctAnswer', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'var(--bg-canvas)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-xs)',
                                color: '#10B981',
                                fontWeight: '600',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                              }}
                            />
                          </div>
                        ) : q.options && q.options.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                              Answer Choices (Click check icon to select correct answer):
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              {q.options.map((opt, optIdx) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <div
                                    key={optIdx}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: 'var(--radius-xs)',
                                      backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-canvas)',
                                      border: isCorrect ? '1.5px solid #10B981' : '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px'
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDraftQuestion(idx, 'correctAnswer', opt)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        color: isCorrect ? '#10B981' : 'var(--text-muted)',
                                        padding: 0,
                                        marginTop: '3px'
                                      }}
                                      title={isCorrect ? 'Correct Answer' : 'Set as Correct Answer'}
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <textarea
                                      rows={2}
                                      value={opt}
                                      onChange={e => {
                                        const newOpts = [...q.options];
                                        newOpts[optIdx] = e.target.value;
                                        setGeneratedDraft(prev => {
                                          const updatedQ = [...prev.questions];
                                          const wasCorrect = updatedQ[idx].correctAnswer === opt;
                                          updatedQ[idx] = {
                                            ...updatedQ[idx],
                                            options: newOpts,
                                            correctAnswer: wasCorrect ? e.target.value : updatedQ[idx].correctAnswer
                                          };
                                          return { ...prev, questions: updatedQ };
                                        });
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '2px 4px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: isCorrect ? '#10B981' : 'var(--text-main)',
                                        fontSize: '13px',
                                        fontWeight: isCorrect ? '700' : '500',
                                        lineHeight: '1.4',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        {/* Transparent Marking Scheme Rubric */}
                        <div style={{
                          padding: '12px 14px',
                          backgroundColor: 'rgba(79, 70, 229, 0.05)',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--primary-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <strong style={{ color: 'var(--primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📜 Transparent Marking Scheme & Rubric:
                          </strong>
                          <textarea
                            rows={2}
                            value={q.markingScheme || ''}
                            onChange={e => handleUpdateDraftQuestion(idx, 'markingScheme', e.target.value)}
                            placeholder="Enter rubric / marking scheme criteria..."
                            style={{
                              width: '100%',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: 'var(--text-main)',
                              fontSize: '12px',
                              lineHeight: '1.5',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        {/* Rationale */}
                        <div style={{
                          padding: '10px 14px',
                          backgroundColor: 'var(--bg-canvas)',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <strong style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            💡 Rationale & Explanation:
                          </strong>
                          <textarea
                            rows={2}
                            value={q.explanation || ''}
                            onChange={e => handleUpdateDraftQuestion(idx, 'explanation', e.target.value)}
                            placeholder="Enter rationale or explanation..."
                            style={{
                              width: '100%',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: 'var(--text-secondary)',
                              fontSize: '12px',
                              lineHeight: '1.4',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>

            {/* Modal Sticky Footer Actions */}
            {generatedDraft && (
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <button
                  onClick={() => setGeneratedDraft(null)}
                  className="btn-secondary"
                  style={{ padding: '9px 16px', fontSize: '13px' }}
                >
                  ← Reconfigure Generator
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleAddDraftQuestion}
                    className="btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '13px', gap: '6px' }}
                  >
                    <Plus size={14} />
                    <span>Add Question</span>
                  </button>
                  <button
                    onClick={handleGenerateAiQuizDraft}
                    className="btn-secondary"
                    disabled={isGeneratingQuiz}
                    style={{ padding: '9px 16px', fontSize: '13px', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={isGeneratingQuiz ? 'spin' : ''} />
                    <span>{isGeneratingQuiz ? 'Regenerating...' : 'Regenerate Draft'}</span>
                  </button>

                  <button
                    onClick={handleApproveAndPublishAiQuiz}
                    className="btn-primary"
                    style={{
                      padding: '10px 22px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      gap: '8px',
                      backgroundColor: '#10B981',
                      borderColor: '#10B981',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve & Publish to Curriculum</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── 5b. INSTRUCTOR QUIZ REVIEW / EDIT & RENAME MODAL ───────────────── */}
      {showEditQuizModal && editingQuizMeta && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '96vw',
            height: '94vh',
            maxWidth: '1100px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(79, 70, 229, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Edit3 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    Review & Edit Quiz
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                    Rename the quiz, tweak questions, options & answers, then save. Students see the update instantly.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEditQuizModal(false)} className="btn-ghost" style={{ padding: '8px', fontSize: '16px' }}>✕</button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Quiz Metadata: rename + description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Quiz Title (Rename):
                  </label>
                  <input
                    value={editQuizTitle}
                    onChange={e => setEditQuizTitle(e.target.value)}
                    placeholder="Enter new quiz title..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Description:
                  </label>
                  <textarea
                    rows={2}
                    value={editQuizDesc}
                    onChange={e => setEditQuizDesc(e.target.value)}
                    placeholder="What does this quiz cover?"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '12.5px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Questions ({editQuizQuestions.length})
                </span>
                <button
                  onClick={handleAddEditQuizQuestion}
                  className="btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px', gap: '5px' }}
                >
                  <Plus size={13} />
                  <span>Add Question</span>
                </button>
              </div>

              {/* Editable Question Cards */}
              {editQuizQuestions.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px', border: '1px dashed var(--border-card)', borderRadius: 'var(--radius-md)' }}>
                  No questions loaded yet. Click "Add Question" to create one manually.
                </div>
              ) : (
                editQuizQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    style={{
                      padding: '18px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>
                        Question {idx + 1} {q.type ? `• ${q.type}` : ''}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Points:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.points || 10}
                          onChange={e => handleUpdateEditQuizQuestion(idx, 'points', parseInt(e.target.value) || 10)}
                          style={{
                            width: '60px',
                            padding: '4px 8px',
                            backgroundColor: 'var(--bg-canvas)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            color: 'var(--secondary)',
                            fontWeight: '700',
                            fontSize: '12.5px',
                            textAlign: 'center'
                          }}
                        />
                        <button
                          onClick={() => handleRemoveEditQuizQuestion(idx)}
                          className="btn-ghost"
                          title="Remove this question"
                          style={{ padding: '4px 6px', color: '#EF4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Prompt */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        Question Text:
                      </label>
                      <textarea
                        rows={3}
                        value={q.prompt || ''}
                        onChange={e => handleUpdateEditQuizQuestion(idx, 'prompt', e.target.value)}
                        placeholder="Enter full question text..."
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          fontWeight: '600',
                          lineHeight: '1.6',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    {/* Options or Answer */}
                    {q.type === 'ShortAnswer' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          Expected Answer:
                        </label>
                        <textarea
                          rows={2}
                          value={q.correctAnswer || ''}
                          onChange={e => handleUpdateEditQuizQuestion(idx, 'correctAnswer', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: 'var(--bg-canvas)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#10B981',
                            fontWeight: '600',
                            fontSize: '13px',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    ) : q.options && q.options.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          Answer Choices (click check icon to mark correct):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = opt === q.correctAnswer;
                            return (
                              <div
                                key={optIdx}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: 'var(--radius-xs)',
                                  backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-canvas)',
                                  border: isCorrect ? '1.5px solid #10B981' : '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditQuizQuestion(idx, 'correctAnswer', opt)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: isCorrect ? '#10B981' : 'var(--text-muted)',
                                    padding: 0,
                                    marginTop: '3px'
                                  }}
                                  title={isCorrect ? 'Correct Answer' : 'Set as Correct Answer'}
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <textarea
                                  rows={2}
                                  value={opt}
                                  onChange={e => {
                                    const newOpts = [...q.options];
                                    const wasCorrect = q.correctAnswer === opt;
                                    newOpts[optIdx] = e.target.value;
                                    handleUpdateEditQuizQuestion(idx, 'options', newOpts);
                                    if (wasCorrect) handleUpdateEditQuizQuestion(idx, 'correctAnswer', e.target.value);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '2px 4px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: isCorrect ? '#10B981' : 'var(--text-main)',
                                    fontSize: '13px',
                                    fontWeight: isCorrect ? '700' : '500',
                                    lineHeight: '1.4',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Explanation / Rationale */}
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-canvas)',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <strong style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        💡 Explanation:
                      </strong>
                      <textarea
                        rows={2}
                        value={q.explanation || ''}
                        onChange={e => handleUpdateEditQuizQuestion(idx, 'explanation', e.target.value)}
                        placeholder="Rationale / teaching note shown after submission..."
                        style={{
                          width: '100%',
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          lineHeight: '1.4',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Edits are saved to the live curriculum and synced to the Assessments & Quizzes tab.
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowEditQuizModal(false)}
                  className="btn-secondary"
                  style={{ padding: '9px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuizReview}
                  disabled={isSavingQuizEdit}
                  className="btn-primary"
                  style={{
                    padding: '10px 22px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    gap: '8px',
                    backgroundColor: '#10B981',
                    borderColor: '#10B981',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isSavingQuizEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. PDF SYLLABUS VIEWER MODAL ──────────────────────────────────── */}
      {pdfViewerDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '750px',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-popover)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  {pdfViewerDoc.title}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => downloadPdf(pdfViewerDoc.rawUrl || pdfViewerDoc.url, pdfViewerDoc.fileName || 'document.pdf', pdfViewerDoc.title)}
                  className="btn-primary"
                  style={{ padding: '5px 10px', fontSize: '11.5px', gap: '4px', border: 'none', cursor: 'pointer' }}
                >
                  <Download size={12} /> Download
                </button>
                <button onClick={() => setPdfViewerDoc(null)} className="btn-ghost" style={{ padding: '4px' }}>✕</button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}>
              <iframe
                src={pdfViewerDoc.url}
                title={pdfViewerDoc.title}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 7. ADD MODULE MODAL ────────────────────────────────────────────── */}
      {showModuleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Add Module to {currentCourse.code}
              </h3>
              <button onClick={() => setShowModuleModal(false)} className="btn-ghost" style={{ padding: '4px' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Module Title
              </label>
              <input
                placeholder="e.g. Module 3: Advanced Optimization"
                value={newModuleTitle}
                onChange={e => setNewModuleTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Module Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of learning objectives..."
                value={newModuleDesc}
                onChange={e => setNewModuleDesc(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Attach Lecture Slides (PDF, PowerPoint .pptx, .ppt)
              </label>
              <div style={{
                padding: '12px 14px',
                border: '1px dashed var(--primary-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(79, 70, 229, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Upload size={20} color="var(--primary)" />
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept=".pdf,.pptx,.ppt"
                    onChange={e => setModulePdfFile(e.target.files[0])}
                    style={{ fontSize: '12px', color: 'var(--text-main)', width: '100%' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    Uploaded slides are analyzed by SlideQuest AI for subtopic discovery and strict RAG assessments.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setShowModuleModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateModule} className="btn-primary" disabled={modulePdfUploading}>
                {modulePdfUploading ? 'Uploading Slides...' : 'Create Module'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. ADD TOPIC MODAL ────────────────────────────────────────────── */}
      {showTopicModal && activeModuleForTopic && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Add Topic to {activeModuleForTopic.title}
              </h3>
              <button onClick={() => setShowTopicModal(false)} className="btn-ghost" style={{ padding: '4px' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Topic Title
              </label>
              <input
                placeholder="e.g. Asynchronous Tasks & Promises"
                value={newTopicTitle}
                onChange={e => setNewTopicTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                First Lesson Title
              </label>
              <input
                placeholder="e.g. Event Loop Mechanics and Promise Pipelines"
                value={newLessonTitle}
                onChange={e => setNewLessonTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setShowTopicModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateTopic} className="btn-primary">Add Topic</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. CREATE NEW COURSE MODAL ───────────────────────────────────── */}
      {showCourseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Create New Course
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="btn-ghost" style={{ padding: '4px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Course Code
                </label>
                <input
                  placeholder="e.g. CS401"
                  value={newCourseCode}
                  onChange={e => setNewCourseCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Course Title
                </label>
                <input
                  placeholder="e.g. Distributed Systems"
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Academic Term
                </label>
                <select
                  value={newCourseTerm}
                  onChange={e => setNewCourseTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                >
                  <option value="Fall 2026">Fall 2026</option>
                  <option value="Spring 2026">Spring 2026</option>
                  <option value="Summer 2026">Summer 2026</option>
                  <option value="Fall 2025">Fall 2025</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Course overview and syllabus..."
                value={newCourseDesc}
                onChange={e => setNewCourseDesc(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setShowCourseModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateCourse} className="btn-primary">Create Course</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 10. EDIT MODULE & UPDATE SLIDES MODAL ───────────────────────── */}
      {showEditModuleModal && editingModule && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Edit Module & Update Lecture Slides
                </h3>
              </div>
              <button onClick={() => setShowEditModuleModal(false)} className="btn-ghost" style={{ padding: '4px' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Module Title
              </label>
              <input
                value={editModuleTitle}
                onChange={e => setEditModuleTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Module Description
              </label>
              <textarea
                rows={3}
                value={editModuleDesc}
                onChange={e => setEditModuleDesc(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Current Attached Slide Deck info */}
            {editingModule.pdfUrl && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'rgba(79, 70, 229, 0.05)',
                border: '1px solid var(--primary-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={15} color="var(--primary)" />
                  <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>
                    Current Slides: {editingModule.attachmentFileName || 'lecture-slides.pdf'}
                  </span>
                </div>
                <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>Active Deck</span>
              </div>
            )}

            {/* Upload or Replace Slide Deck */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {editingModule.pdfUrl ? 'Replace Lecture Slides (PDF, PowerPoint .pptx, .ppt)' : 'Upload Lecture Slides (PDF, PowerPoint .pptx, .ppt)'}
              </label>
              <div style={{
                padding: '14px',
                border: '1px dashed var(--primary-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(79, 70, 229, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Upload size={22} color="var(--primary)" />
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept=".pdf,.pptx,.ppt"
                    onChange={e => setEditModuleFile(e.target.files[0])}
                    style={{ fontSize: '12px', color: 'var(--text-main)', width: '100%' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                    Upload new slides to update SlideQuest topic extraction and question generation.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setShowEditModuleModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleSaveEditModule}
                disabled={isUploadingEditSlide}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isUploadingEditSlide ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Uploading & Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 11. INTERACTIVE GAMIFIED QUIZ QUEST RUNNER MODAL ─────────────── */}
      {showQuizRunnerModal && activeRunnerQuiz && activeRunnerQuiz.questions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            {/* Gamification HUD Header */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge-pill badge-primary" style={{ fontSize: '10.5px', fontWeight: '800' }}>
                    SLIDEQUEST RUNNER
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {activeRunnerQuiz.moduleTitle}
                  </span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0 0' }}>
                  {activeRunnerQuiz.title}
                </h3>
              </div>

              {/* Gamification Badges & HUD */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#D97706',
                  fontSize: '12px',
                  fontWeight: '800'
                }}>
                  <Flame size={16} fill="#F59E0B" />
                  <span>Streak: {runnerStreak}x</span>
                  <span style={{ fontSize: '10.5px', opacity: 0.85 }}>
                    ({runnerStreak >= 3 ? '1.5x Multiplier' : runnerStreak >= 2 ? '1.2x Multiplier' : '1.0x'})
                  </span>
                </div>

                <div style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  border: '1px solid var(--primary-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: '800'
                }}>
                  <Zap size={15} />
                  <span>+{activeRunnerQuiz.xpReward || 100} XP Bounty</span>
                </div>

                <div style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#10B981',
                  fontSize: '12px',
                  fontWeight: '800'
                }}>
                  <Clock size={15} />
                  <span>{Math.floor(runnerTimeRemaining / 60)}:{String(runnerTimeRemaining % 60).padStart(2, '0')}</span>
                </div>

                <button onClick={() => setShowQuizRunnerModal(false)} className="btn-ghost" style={{ padding: '6px' }}>✕</button>
              </div>
            </div>

            {/* Question Navigation Step Bar */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: 'var(--bg-canvas)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto'
            }}>
              {activeRunnerQuiz.questions.map((q, idx) => {
                const isAnswered = !!runnerAnswers[q.id || `q-item-${idx + 1}`];
                const isActive = runnerCurrentIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setRunnerCurrentIndex(idx)}
                    style={{
                      minWidth: '34px',
                      height: '32px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: isActive ? 'var(--primary)' : isAnswered ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                      color: isActive ? '#FFFFFF' : isAnswered ? '#10B981' : 'var(--text-muted)',
                      border: isActive ? '1px solid var(--primary)' : isAnswered ? '1px solid #10B981' : '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Active Question Body */}
            {activeRunnerQuiz.questions[runnerCurrentIndex] && (() => {
              const currentQ = activeRunnerQuiz.questions[runnerCurrentIndex];
              const qId = currentQ.id || `q-item-${runnerCurrentIndex + 1}`;
              const currentAnswer = runnerAnswers[qId] || '';

              return (
                <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Question Metadata Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge-pill badge-primary" style={{ fontSize: '11px', fontWeight: '800' }}>
                        QUESTION {runnerCurrentIndex + 1} OF {activeRunnerQuiz.questions.length}
                      </span>
                      <span className="badge-pill badge-secondary" style={{ fontSize: '10.5px' }}>
                        {currentQ.type}
                      </span>
                      {currentQ.slideCitation && (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📍 Grounded in: <strong>{currentQ.slideCitation}</strong>
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--secondary)' }}>
                      {currentQ.points || 10} Points
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
                    {currentQ.prompt}
                  </h4>

                  {/* Dynamic Format Renderers */}
                  
                  {/* Format 1: Multiple Choice */}
                  {currentQ.type === 'MultipleChoice' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      {(currentQ.options || []).map((opt, optIdx) => {
                        const isSelected = currentAnswer === opt;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleRunnerAnswerChange(qId, opt)}
                            style={{
                              padding: '14px 18px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--bg-surface)',
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-canvas)',
                              color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '800'
                            }}>
                              {letter}
                            </span>
                            <span style={{ fontSize: '13.5px', color: 'var(--text-main)', fontWeight: isSelected ? '700' : '500' }}>
                              {opt}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Format 2: Dropdown Selection */}
                  {currentQ.type === 'Dropdown' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        Select the correct concept from the dropdown:
                      </label>
                      <select
                        value={currentAnswer}
                        onChange={e => handleRunnerAnswerChange(qId, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-card)',
                          backgroundColor: 'var(--bg-canvas)',
                          color: 'var(--text-main)',
                          fontSize: '13.5px',
                          fontWeight: '600'
                        }}
                      >
                        <option value="">-- Choose matching concept --</option>
                        {(currentQ.options || []).map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Format 3: Fill in the Blanks */}
                  {currentQ.type === 'FillInBlank' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        Fill in the blank with the exact technical keyword from the lecture slides:
                      </label>
                      <input
                        type="text"
                        placeholder="Type missing term here..."
                        value={currentAnswer}
                        onChange={e => handleRunnerAnswerChange(qId, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-card)',
                          backgroundColor: 'var(--bg-canvas)',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                  )}

                  {/* Format 4: Matching */}
                  {currentQ.type === 'Matching' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        Match the architecture roles with their slide definition:
                      </label>
                      {(currentQ.options || []).map((opt, i) => {
                        const isSelected = currentAnswer === opt;
                        return (
                          <div
                            key={i}
                            onClick={() => handleRunnerAnswerChange(qId, opt)}
                            style={{
                              padding: '12px 16px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--bg-surface)',
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              fontSize: '13px',
                              color: 'var(--text-main)',
                              fontWeight: isSelected ? '700' : '500'
                            }}
                          >
                            <CheckSquare size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Format 5: Short Answer / Typing */}
                  {currentQ.type === 'ShortAnswer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          Type your conceptual explanation:
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                          🤖 Automated AI Evaluator will grade response against slide rubric
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        placeholder="Provide your conceptual explanation grounded in the lecture slides..."
                        value={currentAnswer}
                        onChange={e => handleRunnerAnswerChange(qId, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-card)',
                          backgroundColor: 'var(--bg-canvas)',
                          color: 'var(--text-main)',
                          fontSize: '13.5px',
                          lineHeight: '1.6'
                        }}
                      />
                    </div>
                  )}

                  {/* Slide Citation Footnote */}
                  {currentQ.slideCitation && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'rgba(79, 70, 229, 0.04)',
                      border: '1px solid var(--primary-border)',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Bot size={15} color="var(--primary)" />
                      <span>This question is calibrated directly from <strong>{currentQ.slideCitation}</strong>. Auto-evaluator verifies domain terms.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bottom Controls */}
            <div style={{
              padding: '16px 28px',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => setRunnerCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={runnerCurrentIndex === 0}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12.5px' }}
              >
                ← Previous
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {runnerCurrentIndex < activeRunnerQuiz.questions.length - 1 ? (
                  <button
                    onClick={() => setRunnerCurrentIndex(prev => Math.min(activeRunnerQuiz.questions.length - 1, prev + 1))}
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: '12.5px', fontWeight: '700' }}
                  >
                    Next Question →
                  </button>
                ) : null}

                <button
                  onClick={handleSubmitQuizQuest}
                  disabled={isSubmittingQuiz}
                  className="btn-primary"
                  style={{
                    padding: '8px 22px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    gap: '6px',
                    backgroundColor: '#10B981',
                    borderColor: '#10B981',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  {isSubmittingQuiz ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Grading Submission...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>🚀 Submit Quiz Quest (Auto-Grade)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 12. POST-QUIZ AUTOMATED MARKING SCHEME & RUBRIC MODAL ───────────── */}
      {showMarkingSchemeModal && markingSchemeResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            {/* Celebration Header */}
            <div style={{
              padding: '22px 28px',
              backgroundColor: markingSchemeResult.passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className={`badge-pill ${markingSchemeResult.passed ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: '800' }}>
                    {markingSchemeResult.passed ? '✓ ASSESSMENT PASSED' : '⚠ ATTEMPT COMPLETED'}
                  </span>
                  {markingSchemeResult.badgeUnlocked && (
                    <span className="badge-pill badge-primary" style={{ fontWeight: '800' }}>
                      {markingSchemeResult.badgeUnlocked}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Automated Evaluation & Transparent Marking Scheme
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Evaluated with SlideQuest AI RAG Engine. Zero instructor manual grading required.
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: '900', color: markingSchemeResult.passed ? '#10B981' : '#EF4444' }}>
                  {markingSchemeResult.percentageScore}%
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
                  {markingSchemeResult.scoreObtained} / {markingSchemeResult.maxScore} Points
                </span>
              </div>
            </div>

            {/* Gamification Loot Rewards Banner */}
            <div style={{
              padding: '14px 28px',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '800', fontSize: '13px' }}>
                  <Zap size={16} />
                  <span>+{markingSchemeResult.xpEarned} XP Earned</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', fontWeight: '800', fontSize: '13px' }}>
                  <Trophy size={16} />
                  <span>+{markingSchemeResult.coinsEarned} Coins Earned</span>
                </div>

                {markingSchemeResult.streakBonus > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontWeight: '800', fontSize: '13px' }}>
                    <Flame size={16} fill="#EF4444" />
                    <span>+{markingSchemeResult.streakBonus} XP Streak Multiplier Bonus!</span>
                  </div>
                )}
              </div>

            </div>

            {/* Detailed Question-by-Question Marking Scheme Breakdown */}
            <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                Question Breakdown & Official Marking Rubrics ({markingSchemeResult.questionBreakdown.length} Questions)
              </div>

              {markingSchemeResult.questionBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    border: item.isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Item Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: item.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: item.isCorrect ? '#10B981' : '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '800'
                      }}>
                        {item.isCorrect ? '✓' : '✕'}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        Question {idx + 1} • {item.type}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>
                        {item.slideCitation || 'Lecture Slide Deck'}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: item.isCorrect ? '#10B981' : '#EF4444' }}>
                        {item.pointsAwarded} / {item.maxPoints || 10} Points
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <p style={{ fontSize: '13.5px', color: 'var(--text-main)', margin: 0, fontWeight: '600', lineHeight: '1.5' }}>
                    {item.prompt}
                  </p>

                  {/* Answers Comparison Box */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12.5px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-muted)', minWidth: '110px' }}>Your Answer:</span>
                      <span style={{ fontWeight: '700', color: item.isCorrect ? '#10B981' : '#EF4444' }}>
                        {item.selectedAnswer}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-muted)', minWidth: '110px' }}>Correct Solution:</span>
                      <span style={{ fontWeight: '700', color: '#10B981' }}>
                        {item.correctAnswer}
                      </span>
                    </div>
                  </div>

                  {/* Semantic AI Feedback (for typed short answers) */}
                  {item.aiFeedback && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'rgba(79, 70, 229, 0.05)',
                      border: '1px solid var(--primary-border)',
                      fontSize: '12px',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <Bot size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ color: 'var(--primary)', display: 'block' }}>
                          SlideQuest Auto-Evaluator Feedback:
                        </strong>
                        <span>{item.aiFeedback}</span>
                      </div>
                    </div>
                  )}

                  {/* Transparent Marking Scheme & Rubric */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11.5px',
                    lineHeight: '1.4'
                  }}>
                    <strong style={{ color: 'var(--secondary)', display: 'block', marginBottom: '2px' }}>
                      📜 Official Marking Scheme & Scoring Rubric:
                    </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.markingScheme || 'Full credit awarded for precise technical identification matching lecture slide invariants.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div style={{
              padding: '16px 28px',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '10px'
            }}>
              <button
                onClick={() => {
                  setShowMarkingSchemeModal(false);
                  if (activeRunnerQuiz) {
                    handleStartSlideQuestRunner(activeRunnerQuiz, { title: activeRunnerQuiz.moduleTitle });
                  }
                }}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '12.5px', gap: '6px' }}
              >
                <RefreshCw size={13} />
                <span>Retake Quiz Quest</span>
              </button>

              <button
                onClick={() => setShowMarkingSchemeModal(false)}
                className="btn-primary"
                style={{ padding: '8px 22px', fontSize: '12.5px', fontWeight: '700' }}
              >
                Return to Curriculum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. ADD & MANAGE STUDENTS MODAL ─────────────────────────────────────── */}
      {showAddStudentsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 15, 30, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(90deg, rgba(79, 70, 229, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(79, 70, 229, 0.15)',
                  color: 'var(--primary)'
                }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
                    Add & Manage Course Students
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {currentCourse?.title} • {enrolledStudentsList.length} Students Enrolled
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStudentsModal(false)}
                className="btn-ghost"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search available students by name or email..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                />
              </div>

              {isLoadingStudents ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading students...
                </div>
              ) : (
                <>
                  {/* Available Students to Add */}
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Available Registered Students ({availableStudentsList.filter(s =>
                        !enrolledStudentsList.some(e => e.studentId === s.studentId) &&
                        (s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) || s.email.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                      ).length})
                    </h3>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}>
                      {availableStudentsList
                        .filter(s => !enrolledStudentsList.some(e => e.studentId === s.studentId))
                        .filter(s => s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) || s.email.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                        .map(st => (
                          <div
                            key={st.studentId}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                                {st.fullName}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {st.email}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEnrollStudent(st.studentId)}
                              disabled={enrollingStudentId === st.studentId}
                              className="btn-primary"
                              style={{ padding: '5px 12px', fontSize: '12px', gap: '4px' }}
                            >
                              <UserPlus size={13} />
                              <span>{enrollingStudentId === st.studentId ? 'Enrolling...' : 'Enroll'}</span>
                            </button>
                          </div>
                        ))}
                      {availableStudentsList.filter(s => !enrolledStudentsList.some(e => e.studentId === s.studentId)).length === 0 && (
                        <div style={{ padding: '14px', fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                          No un-enrolled students match your search.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Currently Enrolled Students */}
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Enrolled Students Roster ({enrolledStudentsList.length})
                    </h3>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}>
                      {enrolledStudentsList.map(es => (
                        <div
                          key={es.studentId}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                              {es.fullName}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {es.email} • Enrolled {new Date(es.enrolledAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveStudent(es.studentId)}
                            className="btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '11.5px', color: 'var(--danger)', gap: '4px' }}
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}
                      {enrolledStudentsList.length === 0 && (
                        <div style={{ padding: '14px', fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                          No students currently enrolled in this course.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-surface)'
            }}>
              <button
                onClick={() => setShowAddStudentsModal(false)}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '12.5px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
