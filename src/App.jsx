// src/App.jsx
import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  auth, db, appId, secondaryAuth, collection, onSnapshot, doc, setDoc, getDocs,
  deleteDoc, addDoc, updateDoc, getDoc, query, orderBy, limit,
  signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword,
  signOut,
} from './firebase/config.js'
import {
  CHAT_GRADIENTS, CHAT_PATTERNS, COMMENT_EMOJIS, FALLBACK_MAP, SLIDE_GRADIENTS,
  TEACHER_NAME, compressImage, containsBadWords, formatChatDate, formatTime,
  uploadImageToStorage, uploadRawFileToStorage,
} from './utils/helpers.js'
import {
  glassCard, glassInput, outlineButton, redButton,
} from './utils/styles.js'
import {
  AlertTriangle, AnimatedEyesIcon, AnimatedWritingIcon, ArrowLeftIcon, ArrowRightIcon,
  BookOpen, CalendarEmoji, CheckCheck, CheckCircle2, CheckLine, ChevronLeft,
  ChevronRight, Clock, CuteBotIcon, DoubleTick, Edit3, Eye, EyeOff, FileDocIcon,
  FileText, ImageIcon, Loader2, LogOutIcon, Mail, MessageCircle, Moon, NavCalendar,
  NavFile, NavNotebook, NavSlides, Palette, PaperclipIcon, Plus, ReplyIcon, SearchIcon,
  Send, SingleTick, SmileIcon, Sparkles, Sun, TeacherIcon, Trash2, UserIcon,
  UsersGroupIcon, UsersIcon, Wand2, X, XLine,
} from './components/Icons.jsx'
import GifPickerModal from './components/GifPickerModal.jsx'
import TasksTab from './components/TasksTab.jsx'

function App() {
          const [hasEntered, setHasEntered] = useState(false); 
          const [loginType, setLoginType] = useState(null);
          const [showUserMenu, setShowUserMenu] = useState(false);
            const [viewingProfileId, setViewingProfileId] = useState(null);
          const [profileCommentInputs, setProfileCommentInputs] = useState({});
            const [userPosts, setUserPosts] = useState([]);
            const [profilePostText, setProfilePostText] = useState("");
            const [profilePostImage, setProfilePostImage] = useState("");
            const [isPublishingProfile, setIsPublishingProfile] = useState(false);
            const [profilePostTitle, setProfilePostTitle] = useState("");
const [editingProfilePostId, setEditingProfilePostId] = useState(null);
const [editProfilePostData, setEditProfilePostData] = useState({ title: "", text: "" });
const [showAvatarUploadModal, setShowAvatarUploadModal] = useState(false);
const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
            const [cropZoom, setCropZoom] = useState(1);
const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
const [isDraggingCrop, setIsDraggingCrop] = useState(false);
const cropDragStart = useRef({ x: 0, y: 0 });
const cropImageRef = useRef(null);
const cropContainerRef = useRef(null);
            // BOT DE GINA
const [isTeacherBotOpen, setIsTeacherBotOpen] = useState(false);
const [teacherBotHistory, setTeacherBotHistory] = useState([]);
const [teacherBotInput, setTeacherBotInput] = useState("");
const [teacherBotInfoList, setTeacherBotInfoList] = useState([]);
const [isTeacherBotLoading, setIsTeacherBotLoading] = useState(false);
const [showIAKnowledgeModal, setShowIAKnowledgeModal] = useState(false);
const [newIAKnowledge, setNewIAKnowledge] = useState("");
const [editingIAId, setEditingIAId] = useState(null);
const [editIAText, setEditIAText] = useState("");
            const teacherBotEndRef = useRef(null);
useEffect(() => {
    if (isTeacherBotOpen) {
        setTimeout(() => teacherBotEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
}, [isTeacherBotOpen, teacherBotHistory]);
// 👆 HASTA AQUÍ ES EL BOT DE GINA 👆
          const [loggedInUser, setLoggedInUser] = useState(""); 
          const [loggedInName, setLoggedInName] = useState(""); 
          const [userMappings, setUserMappings] = useState({}); 
          const [showPassword, setShowPassword] = useState(false);
          const [prefillUsername, setPrefillUsername] = useState("");
          const [savedAccounts, setSavedAccounts] = useState([]);
          const [editingUserLabelId, setEditingUserLabelId] = useState(null);
          const [editUserLabelValue, setEditUserLabelValue] = useState("");
          
          const [user, setUser] = useState(null);
          const [role, setRole] = useState('student');
          
          // --- INICIALIZACIÓN DE PESTAÑA CON HASH ---
          const initialHash = window.location.hash ? window.location.hash.replace('#', '') : 'tasks';
          const [activeTab, setActiveTab] = useState(['tasks', 'reviews', 'syllabus', 'evaluations', 'directory', 'inbox'].includes(initialHash) ? initialHash : 'tasks');
          
          const [loginError, setLoginError] = useState("");
          
          const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('englishTech_theme');
    if (saved !== null) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
});
          const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: "", onConfirm: null });
          const [globalGifCallback, setGlobalGifCallback] = useState(null);
                window.openGifPicker = (cb) => setGlobalGifCallback(() => cb);
            // Cierre global de modales con tecla Escape
            useEffect(() => {
                const onKey = (e) => {
                    if (e.key === 'Escape') {
                        setGlobalGifCallback(null);
                        setShowChatSettings(false);
                        setShowGroupInfo(false);
                        setShowChatAppEmojiPicker(false);
                        setShowChatAppAttachmentMenu(false);
                    }
                };
                window.addEventListener('keydown', onKey);
                return () => window.removeEventListener('keydown', onKey);
            }, []);
            useEffect(() => {
                localStorage.setItem('englishTech_theme', isDarkMode ? 'dark' : 'light');
                if (isDarkMode) {
                    document.documentElement.classList.add('dark');
                    document.body.classList.add('bg-gray-900');
                    document.body.classList.remove('bg-gray-100');
                    document.documentElement.style.colorScheme = 'dark';
                } else {
                    document.documentElement.classList.remove('dark');
                    document.body.classList.add('bg-gray-100');
                    document.body.classList.remove('bg-gray-900');
                    document.documentElement.style.colorScheme = 'light';
                }
            }, [isDarkMode]);

          // --- DETECTOR DE NAVEGACIÓN (HISTORIAL) ---
          useEffect(() => {
              const handleHashChange = () => {
                  const hash = window.location.hash.replace('#', '');
                  if (hash === 'chat') {
                      setIsChatAppOpen(true);
                  } else {
                      setIsChatAppOpen(false);
                      if (hash && ['tasks', 'reviews', 'syllabus', 'evaluations', 'directory', 'inbox'].includes(hash)) {
                          setActiveTab(hash);
                      } else if (!hash) {
                          setActiveTab('tasks');
                      }
                  }
              };
              window.addEventListener('hashchange', handleHashChange);
              return () => window.removeEventListener('hashchange', handleHashChange);
          }, []);
// --- FUNCIÓN PARA CAMBIAR DE PESTAÑA ---
          const changeTab = (tab) => {
              window.location.hash = tab;
              setActiveTab(tab);
          };

          useEffect(() => {
            const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
            if (!mediaQuery) return;
            const handleChange = (e) => setIsDarkMode(e.matches);
            
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handleChange);
                return () => mediaQuery.removeEventListener('change', handleChange);
            } else if (mediaQuery.addListener) {
                mediaQuery.addListener(handleChange);
                return () => mediaQuery.removeListener(handleChange);
            }
          }, []);

          const [showSugModal, setShowSugModal] = useState(false);
          const [sugText, setSugText] = useState("");
          const [isSugLoading, setIsSugLoading] = useState(false);
          const [revealedItems, setRevealedItems] = useState({}); 
          
          const [toastMessage, setToastMessage] = useState("");
          const showMessage = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(""), 5000); };
          const [profileReplyingTo, setProfileReplyingTo] = useState({});

const handleOpenProfileByName = (name) => {
    if (!name) return;
    if (name === TEACHER_NAME || name === 'Profesora' || name === 'La profe') {
        setViewingProfileId('teacher');
    } else {
        const foundUser = allChatUsers.find(u => u.name === name);
        if (foundUser) setViewingProfileId(foundUser.id);
    }
    changeTab('profile');
};
            
          const getToday = () => {
              const now = new Date();
              const y = now.getFullYear();
              const m = String(now.getMonth() + 1).padStart(2, '0');
              const d = String(now.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
          };
          
          const [postType, setPostType] = useState('task'); 
          const [taskTitle, setTaskTitle] = useState("");
          const [taskDesc, setTaskDesc] = useState("");
          const [postImageUrl, setPostImageUrl] = useState(""); 
          const [showImageInput, setShowImageInput] = useState(false);
          const [postFileUrl, setPostFileUrl] = useState("");
          const [postFileName, setPostFileName] = useState("");
          const [showPostAttachmentMenu, setShowPostAttachmentMenu] = useState(false);
          const [taskDate, setTaskDate] = useState(getToday());
          const [taskTime, setTaskTime] = useState("23:59");
          const [allowLate, setAllowLate] = useState(false);
          
          const [isAiLoading, setIsAiLoading] = useState(false);
          const [prevTaskTitle, setPrevTaskTitle] = useState("");
          const [prevTaskDesc, setPrevTaskDesc] = useState("");
          const [hasAiModified, setHasAiModified] = useState(false);

          // --- ESTADOS DE EVALUACIONES ---
          const [isCreatingEval, setIsCreatingEval] = useState(false);
          const [evalFormData, setEvalFormData] = useState({ title: "", description: "", dueDate: getToday(), dueTime: "23:59", timeLimit: 30, questions: [] });
          const [activeTakingEval, setActiveTakingEval] = useState(null);
          const [studentAnswers, setStudentAnswers] = useState({});
          const [timeRemaining, setTimeRemaining] = useState(0);
          const [viewingResultsFor, setViewingResultsFor] = useState(null);
          const [editingGrade, setEditingGrade] = useState({ id: null, score: '' });

          const [reviewTopic, setReviewTopic] = useState("");
          const [reviewCount, setReviewCount] = useState(3);
          const [isReviewLoading, setIsReviewLoading] = useState(false);
          const [activeReview, setActiveReview] = useState(null);
          const [currentSlide, setCurrentSlide] = useState(0);
          
          const [studentQuizAnswer, setStudentQuizAnswer] = useState("");
          const [quizAttempts, setQuizAttempts] = useState(0);
          const [quizFeedback, setQuizFeedback] = useState("");
          const [showQuizAnswer, setShowQuizAnswer] = useState(false);
          const [isEvaluatingQuiz, setIsEvaluatingQuiz] = useState(false);

          const [draftReview, setDraftReview] = useState(null); 
          const [slideInstructions, setSlideInstructions] = useState({}); 
          const [loadingSlides, setLoadingSlides] = useState({}); 

          const [isChatOpen, setIsChatOpen] = useState(false); 
          const [botTrainingInfo, setBotTrainingInfo] = useState("");
          const [botInfoList, setBotInfoList] = useState([]); 
          const [chatHistory, setChatHistory] = useState([]);
          const [chatInput, setChatInput] = useState("");
          const [isChatLoading, setIsChatLoading] = useState(false);

          // --- ESTADOS DE MENSAJERÍA DIRECTA Y GRUPOS ---
          const [isChatAppOpen, setIsChatAppOpen] = useState(initialHash === 'chat');
          const [hasUnreadChat, setHasUnreadChat] = useState(false);
          const [unreadChats, setUnreadChats] = useState({});
          const [lastMessages, setLastMessages] = useState({});
          const [activeChat, setActiveChat] = useState(null); 
          const [chatMessages, setChatMessages] = useState([]);
          const [chatGroups, setChatGroups] = useState([]);
          const [isCreatingGroup, setIsCreatingGroup] = useState(false);
          const [academicGroups, setAcademicGroups] = useState([]);
            const [isCreatingAcadGroup, setIsCreatingAcadGroup] = useState(false);
            const [isSavingMateria, setIsSavingMateria] = useState(false);
            const [newAcadGroupName, setNewAcadGroupName] = useState("");
            const [selectedAcadMembers, setSelectedAcadMembers] = useState([]);
          const [newGroupName, setNewGroupName] = useState("");
          const [newGroupMembers, setNewGroupMembers] = useState([]);
          
          const [chatAppInput, setChatAppInput] = useState("");

// --- SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA SILENCIOSA ---
          useEffect(() => {
              let idleMinutes = 0;
              
              const resetIdleTime = () => { idleMinutes = 0; };
              const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
              events.forEach(e => window.addEventListener(e, resetIdleTime));

              const checkUpdateInterval = setInterval(() => {
                  idleMinutes += 1;
                  
                  // Si lleva 30 minutos inactivo Y es seguro recargar (campos vacíos, sin exámenes)
                  if (idleMinutes >= 30) {
                      const isSafeToReload = !taskTitle && !taskDesc && !activeTakingEval && !isCreatingEval && !chatAppInput && !chatInput && !sugText && !reviewTopic && !isCreatingGroup;
                      if (isSafeToReload) {
                          window.location.reload(true); // El 'true' fuerza limpiar la caché del navegador
                      }
                  }
              }, 60000); // Revisa cada 1 minuto

              // También comprobar cuando el usuario regresa a la pestaña tras minimizarla
              let lastVisibleTime = Date.now();
              const handleVisibility = () => {
                  if (document.visibilityState === 'visible') {
                      const hoursAway = (Date.now() - lastVisibleTime) / (1000 * 60 * 60);
                      const isSafeToReload = !taskTitle && !taskDesc && !activeTakingEval && !isCreatingEval && !chatAppInput && !chatInput && !sugText && !reviewTopic && !isCreatingGroup;
                      
                      // Si estuvo fuera de la pestaña más de 1 hora y no hay riesgo de perder datos
                      if (hoursAway >= 1 && isSafeToReload) {
                          window.location.reload(true);
                      }
                      lastVisibleTime = Date.now();
                  }
              };
              document.addEventListener('visibilitychange', handleVisibility);

              return () => {
                  clearInterval(checkUpdateInterval);
                  events.forEach(e => window.removeEventListener(e, resetIdleTime));
                  document.removeEventListener('visibilitychange', handleVisibility);
              };
          }, [taskTitle, taskDesc, activeTakingEval, isCreatingEval, chatAppInput, chatInput, sugText, reviewTopic, isCreatingGroup]);
            const [replyingTo, setReplyingTo] = useState(null);
          const [chatAppImageUrl, setChatAppImageUrl] = useState("");
          const [chatAppFileUrl, setChatAppFileUrl] = useState("");
          const [chatAppFileName, setChatAppFileName] = useState("");
          const [showChatAppAttachmentMenu, setShowChatAppAttachmentMenu] = useState(false);
          const [showChatAppImageInput, setShowChatAppImageInput] = useState(false);
          const [showChatAppEmojiPicker, setShowChatAppEmojiPicker] = useState(false);
          const [chatSearchTerm, setChatSearchTerm] = useState("");
          const chatMessagesEndRef = useRef(null);

          const [fullScreenImage, setFullScreenImage] = useState(null);
          const [editingAppMessageId, setEditingAppMessageId] = useState(null);
          const [editAppMessageText, setEditAppMessageText] = useState("");

          const [chatPreferences, setChatPreferences] = useState({});
            const [userPresence, setUserPresence] = useState({});
            const [typingStatus, setTypingStatus] = useState({});
            const typingTimeout = useRef(null);
          const [showChatSettings, setShowChatSettings] = useState(false);
            const [showGroupInfo, setShowGroupInfo] = useState(false);

          const notificationSound = useRef(typeof Audio !== "undefined" ? new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') : null);

          const myChatId = role === 'teacher' ? 'teacher' : (loggedInUser ? loggedInUser.replace('@', '') : '');

          const [tasks, setTasks] = useState([]);
          const [syllabus, setSyllabus] = useState([]);
          const [evaluations, setEvaluations] = useState([]);
          const [grades, setGrades] = useState([]);
          const [suggestions, setSuggestions] = useState([]);
          const [alerts, setAlerts] = useState([]);
          const [reviews, setReviews] = useState([]); 

          const confirmAction = (msg, action) => {
              setConfirmDialog({ isOpen: true, message: msg, onConfirm: action });
          };

          const getTabClass = (tabName) => {
              return activeTab === tabName ? 'nav-active-tab' : 'hover:bg-white/40 font-medium text-gray-800';
          };

          const getMobileTabClass = (tabName) => {
              if (activeTab === tabName) {
                  return isDarkMode
                      ? 'bg-gray-800 text-gray-50 scale-110 shadow-sm border border-gray-700'
                      : 'bg-gray-100 text-gray-900 scale-110 shadow-sm border border-gray-200';
              }
              return isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100';
          };

          useEffect(() => {
              const accs = JSON.parse(localStorage.getItem('englishTech_savedAccounts') || '[]');
              // Seguridad: limpiar cualquier contraseña que hubiera quedado guardada antes
              const cleaned = accs.map(({ password, ...rest }) => rest);
              if (cleaned.length !== accs.length) {
                  localStorage.setItem('englishTech_savedAccounts', JSON.stringify(cleaned));
              }
              setSavedAccounts(cleaned);
          }, []);
            const formatBotText = (text) => {
              if (!text) return "";
              return text.split(/(\*\*.*?\*\*)/g).map((part, index) => 
                  part.startsWith('**') && part.endsWith('**') 
                      ? <strong key={index} className="font-black">{part.slice(2, -2)}</strong> 
                      : <span key={index}>{part}</span>
              );
          };
          const callGemini = async (promptText) => {
            try {
              const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptText: promptText }) });
              if (!res.ok) { showMessage(`❌ Error de conexión.`); return ""; }
              const data = await res.json();
              return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } catch (error) { return ""; }
          };

          // Temporizador para Evaluaciones
          useEffect(() => {
              let interval;
              if (activeTakingEval && timeRemaining > 0) {
                  interval = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
              } else if (activeTakingEval && timeRemaining === 0) {
                  submitEvaluation(true);
              }
              return () => clearInterval(interval);
          }, [activeTakingEval, timeRemaining]);

          const handleGenerateReview = async (e) => {
            e.preventDefault();
            if (!reviewTopic) return;
            setIsReviewLoading(true);
            const prompt = `Actúa como un profesor de inglés. Crea una presentación de repaso sobre: "${reviewTopic}". Genera exactamente ${reviewCount} diapositivas. Usa EMOJIS. Devuelve ÚNICAMENTE un JSON válido: [ { "type": "info", "title": "Título con emoji", "content": "Texto del párrafo." }, { "type": "quiz", "title": "Pregunta rápida 🤔", "question": "¿Qué verbo falta aquí?", "answer": "Falta el verbo 'is'." } ]`;
            try {
              const result = await callGemini(prompt);
              if (!result) { setIsReviewLoading(false); return; }
              const cleanedJson = result.replace(/```json/gi, '').replace(/```/gi, '').trim();
              const generatedSlides = JSON.parse(cleanedJson);
              generatedSlides.forEach((s, idx) => { s.gradient = SLIDE_GRADIENTS[idx % SLIDE_GRADIENTS.length]; });
              setDraftReview({ topic: generatedSlides[0]?.title || "Repaso", slides: generatedSlides });
              setReviewTopic("");
            } catch (err) { showMessage("Error en IA."); }
            setIsReviewLoading(false);
          };

          const handleRegenerateSingleSlide = async (index) => {
            const instruction = slideInstructions[index];
            if (!instruction) return showMessage("Escribe instrucción.");
            setLoadingSlides(prev => ({ ...prev, [index]: true }));
            const prompt = `Modifica la diapositiva basándote en: "${instruction}". Diapositiva: ${JSON.stringify(draftReview.slides[index])} Devuelve ÚNICAMENTE un JSON válido (info o quiz).`;
            try {
              const result = await callGemini(prompt);
              if (!result) { setLoadingSlides(prev => ({ ...prev, [index]: false })); return; }
              const regeneratedSlide = JSON.parse(result.replace(/```json/gi, '').replace(/```/gi, '').trim());
              regeneratedSlide.gradient = draftReview.slides[index].gradient;
              const newSlides = [...draftReview.slides]; newSlides[index] = regeneratedSlide;
              setDraftReview({ ...draftReview, slides: newSlides });
              setSlideInstructions({...slideInstructions, [index]: ""});
            } catch (err) { showMessage("Error."); }
            setLoadingSlides(prev => ({ ...prev, [index]: false }));
          };

          const handlePublishDraft = async () => {
            if (!draftReview) return;
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), { topic: draftReview.topic, slides: draftReview.slides, createdAt: Date.now() });
            setDraftReview(null); showMessage("✅ Repaso publicado.");
          };

          const handleQuizSubmit = async (e) => {
            e.preventDefault();
            if (!studentQuizAnswer.trim()) return;
            setIsEvaluatingQuiz(true);
            const currentAttempt = quizAttempts + 1; setQuizAttempts(currentAttempt);
            const activeSlide = activeReview.slides[currentSlide];

            if (currentAttempt >= 3) {
              setQuizFeedback("¡Buen esfuerzo! 🌟 Aquí tienes la respuesta.");
              setShowQuizAnswer(true); setIsEvaluatingQuiz(false); return;
            }
            const prompt = `Un estudiante responde un quiz de inglés. Pregunta: "${activeSlide.question}". Esperada: "${activeSlide.answer}". Respuesta estudiante: "${studentQuizAnswer}". Evalúa si es correcta. Responde ÚNICAMENTE con JSON: {"isCorrect": true/false, "feedback": "Mensaje animando o felicitando"}`;
            try {
              const res = await callGemini(prompt);
              if (!res) { setIsEvaluatingQuiz(false); return; }
              const json = JSON.parse(res.replace(/```json/gi, '').replace(/```/gi, '').trim());
              setQuizFeedback(json.feedback); if(json.isCorrect) setShowQuizAnswer(true);
            } catch(err) { setQuizFeedback("Error al revisar ✨"); }
            setIsEvaluatingQuiz(false);
          };

          const handleSubmitSuggestion = async (e) => {
            e.preventDefault();
            if (!sugText) return;
            setIsSugLoading(true);

            if (containsBadWords(sugText)) {
              showMessage("Contenido inapropiado, se le será notificado a la profesora.");
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'alerts'), { studentName: loggedInName, originalText: sugText, createdAt: Date.now() });
              setShowSugModal(false); 
              setSugText("");
            } else {
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suggestions'), { studentName: loggedInName, text: sugText.trim(), createdAt: Date.now() });
              showMessage("✅ Sugerencia enviada."); 
              setShowSugModal(false); 
              setSugText("");
            }
            setIsSugLoading(false);
          };

          const handleLogin = async (e) => {
            e.preventDefault();
            // Pedimos permiso ANTES de cualquier proceso 'await' para que Safari no lo bloquee
            if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
            const rawUser = e.target.username.value.trim(); 
            const password = e.target.password.value;
            const cleanUser = rawUser.toLowerCase().replace('@', '');
            
            let targetEmail = "";
            let expectedRole = "";
            let targetName = "";

            if (userMappings[cleanUser]) {
                targetEmail = userMappings[cleanUser].email;
                expectedRole = userMappings[cleanUser].role;
                targetName = userMappings[cleanUser].fullName;
            } else if (FALLBACK_MAP[cleanUser]) {
                targetEmail = FALLBACK_MAP[cleanUser].email;
                expectedRole = FALLBACK_MAP[cleanUser].role;
                targetName = FALLBACK_MAP[cleanUser].name;
            } else {
                setLoginError("Ese usuario no está registrado en el directorio.");
                return;
            }

            if (expectedRole !== loginType) {
                setLoginError(`Ese usuario no es ${loginType === 'teacher' ? 'docente' : 'estudiante'}.`);
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, targetEmail, password);
                
                const newAcc = { username: cleanUser, name: targetName, role: expectedRole, email: targetEmail };
                const accs = JSON.parse(localStorage.getItem('englishTech_savedAccounts') || '[]');
                const filtered = accs.filter(a => a.username !== cleanUser); 
                const updatedAccs = [newAcc, ...filtered];
                localStorage.setItem('englishTech_savedAccounts', JSON.stringify(updatedAccs));
                setSavedAccounts(updatedAccs);

                setLoginError("");
                // Pedir permiso para notificaciones
                if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
                changeTab('tasks');
            } catch (error) {
                setLoginError("Contraseña incorrecta.");
            }
          };

         const handleQuickLogin = (acc) => {
              // No se guardan contraseñas en el navegador: solo se pre-rellena el usuario.
              setLoginType(acc.role);
              setLoginError("");
              setPrefillUsername(acc.username);
          };

          const removeSavedAccount = (username) => {
              const filtered = savedAccounts.filter(a => a.username !== username);
              localStorage.setItem('englishTech_savedAccounts', JSON.stringify(filtered));
              setSavedAccounts(filtered);
          };

          const handleAiTranslate = async (lang) => {
            if (!taskDesc && !taskTitle) return showMessage("Escribe algo para traducir primero.");
            setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
            
            const prompt = `Traduce el siguiente título y descripción al ${lang}. Devuelve ÚNICAMENTE un objeto JSON válido con este formato exacto: {"title": "título traducido", "description": "descripción traducida"}\n\nTítulo original: "${taskTitle}"\nDescripción original: "${taskDesc}"`;
            
            const result = await callGemini(prompt);
            if (!result) { setIsAiLoading(false); return; }
            
            try {
                const jsonStr = result.replace(/```json/gi, '').replace(/```/gi, '').trim();
                const parsed = JSON.parse(jsonStr);
                if (parsed.title) setTaskTitle(parsed.title);
                if (parsed.description) setTaskDesc(parsed.description);
                setHasAiModified(true);
            } catch(e) {
                showMessage("Hubo un error al procesar la traducción. Intenta de nuevo.");
            }
            setIsAiLoading(false);
          };

          const handleLogout = async () => {
            // APAGAR EL FOQUITO VERDE ANTES DE SALIR
            if (myChatId) {
                const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId), { isOnline: false, status: 'offline', lastSeen: Date.now() }, { merge: true }).catch(()=>{});
            }
            
            if (role === 'student' && user) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatbot', 'history'));
                } catch(e) { console.error(e); }
            }
            await signOut(auth);
            setHasEntered(false);
            setRole('student');
            setLoggedInUser("");
            setLoggedInName("");
          };

          const sendChatMessage = async (e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              const userMsg = chatInput.trim();
              setChatInput("");
              setIsChatLoading(true);

              const newHistory = [...chatHistory, { role: 'user', text: userMsg }];
              setChatHistory(newHistory);

              const prompt = `Rol: Eres el asistente virtual de la Profesora Gina (English TECH).
              Reglas: Eres muy amigable y puedes conversar de forma natural con los estudiantes si te saludan o hablan. SIN EMBARGO, mantén tus respuestas SIEMPRE BREVES (1 a 3 oraciones como máximo) para ser ágil. Usa emojis.
              Información clave dada por la profesora:
              ${botInfoList.map(i => "- " + i.text).join('\n')}
              
              Historial:
              ${newHistory.map(m => `${m.role === 'user' ? 'Estudiante' : 'Tú'}: ${m.text}`).join('\n')}
              Estudiante: ${userMsg}
              Tú (Responde directo y amigable):`;

              const reply = await callGemini(prompt);
              const finalHistory = [...newHistory, { role: 'bot', text: reply || "Lo siento, no me pude conectar con la profesora en este momento." }];
              
              await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'chatbot', 'history'), { messages: finalHistory });
              setIsChatLoading(false);
          };

          useEffect(() => {
            const uMappings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userMappings'), s => {
                const maps = {};
                s.docs.forEach(d => { maps[d.id] = d.data(); });
                setUserMappings(maps);
            });
            return () => uMappings();
          }, []);

          useEffect(() => {
            const unsubscribe = onAuthStateChanged(auth, (u) => {
                setUser(u);
                if (u && u.email) {
                    let foundKey = Object.keys(userMappings).find(k => userMappings[k]?.email === u.email);
                    if (!foundKey) foundKey = Object.keys(FALLBACK_MAP).find(k => FALLBACK_MAP[k].email === u.email);

                    if (foundKey) {
                        const dbData = userMappings[foundKey] || {};
                        const fallbackData = FALLBACK_MAP[foundKey] || {};
                        const finalRole = dbData.role || fallbackData.role || 'student';
                        const finalName = dbData.fullName || fallbackData.name || foundKey;
                        
                        setRole(finalRole);
                        setLoggedInUser(finalRole === 'teacher' ? 'GinaDocente' : `@${foundKey}`);
                        setLoggedInName(finalRole === 'teacher' ? TEACHER_NAME : finalName);
                        setHasEntered(true);
                        setLoginType(null);
                    }
                }
            });
            return () => unsubscribe();
          }, [userMappings]);

          // 1. COSAS GLOBALES (Se necesitan siempre para notificaciones y chats)
useEffect(() => {
    if (!user || !myChatId) return;
    const base = ['artifacts', appId, 'public', 'data'];
    
    const uBotSettings = onSnapshot(doc(db, ...base, 'settings', 'bot'), d => setBotInfoList(d.data()?.infoList || []));
    const uChat = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'chatbot', 'history'), d => setChatHistory(d.data()?.messages || []));
    const uGroups = onSnapshot(collection(db, ...base, 'chatGroups'), s => setChatGroups(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const uAcad = onSnapshot(collection(db, ...base, 'academicGroups'), s => setAcademicGroups(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const uUnread = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'chatAlerts', myChatId), d => {
        if (d.exists()) {
            const data = d.data();
            const lastTimestamp = window.lastNotifTime || 0;
            if (data.hasUnread && data.timestamp > lastTimestamp) {
                window.lastNotifTime = data.timestamp;
                const isCurrentlyReading = window.currentChatViewId && data.chats && data.chats[window.currentChatViewId];
                if (!isCurrentlyReading) {
                    notificationSound.current?.play().catch(e => console.log('Auto-play evitado'));
                    if ('Notification' in window && Notification.permission === 'granted') {
                        if (document.hidden) {
                            const sender = data.previewSender || 'Alguien';
                            const text = data.previewText || 'Te envió un mensaje';
                            new Notification('Mensaje de ' + sender, { body: text, icon: 'favicon.ico' });
                        }
                    }
                }
            }
            setHasUnreadChat(!!data.hasUnread);
            setUnreadChats(data.chats || {});
        }
    });

    const uLastMsgs = onSnapshot(collection(db, ...base, 'lastMessages'), s => {
        const msgs = {};
        s.docs.forEach(d => msgs[d.id] = d.data());
        setLastMessages(msgs);
    });

    const uChatPrefs = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'preferences', 'chat'), d => {
        if (d.exists()) setChatPreferences(d.data().prefs || {});
        else setChatPreferences({});
    });

    const uPresence = onSnapshot(collection(db, ...base, 'presence'), s => {
        const p = {}; s.docs.forEach(d => p[d.id] = d.data()); setUserPresence(p);
    });

    // 👇 NUEVO: Cazafantasmas (Revisa los latidos cada 30 seg) 👇
    const ghostInterval = setInterval(() => {
        setUserPresence(prev => {
            const now = Date.now();
            let changed = false;
            const newP = { ...prev };
            Object.keys(newP).forEach(k => {
                // Si pasaron más de 90 seg sin latido, lo marca desconectado a la fuerza
                if (newP[k].status !== 'offline' && newP[k].lastPing && (now - newP[k].lastPing > 90000)) {
                    newP[k] = { ...newP[k], status: 'offline', isOnline: false };
                    changed = true;
                }
            });
            return changed ? newP : prev;
        });
    }, 30000);

    const uTyping = onSnapshot(collection(db, ...base, 'typing'), s => {
        const t = {}; s.docs.forEach(d => t[d.id] = d.data()); setTypingStatus(t);
    });

    // Listener para el conocimiento del bot de la profe
    const uTeacherBot = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'teacherBot'), d => setTeacherBotInfoList(d.data()?.infoList || []));

   return () => { uBotSettings(); uChat(); uGroups(); uUnread(); uLastMsgs(); uChatPrefs(); uPresence(); uTyping(); uAcad(); uTeacherBot(); clearInterval(ghostInterval); };
}, [user, myChatId]);

// 2. PESTAÑA: ASIGNACIONES (Muro de clase)
useEffect(() => {
    if (!user || !myChatId || activeTab !== 'tasks') return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('createdAt', 'desc'), limit(20));
    const uTasks = onSnapshot(q, s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => uTasks();
}, [user, myChatId, activeTab]);

// 3. PESTAÑA: PERFIL (Muro de Pinterest)
useEffect(() => {
    if (!user || !myChatId || activeTab !== 'profile') return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'userPosts'), orderBy('createdAt', 'desc'), limit(20));
    const uUserPosts = onSnapshot(q, s => setUserPosts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => uUserPosts();
}, [user, myChatId, activeTab]);

// 4. PESTAÑA: REPASOS (Diapositivas)
useEffect(() => {
    if (!user || !myChatId || activeTab !== 'reviews') return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), orderBy('createdAt', 'desc'), limit(15));
    const uReviews = onSnapshot(q, s => setReviews(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => uReviews();
}, [user, myChatId, activeTab]);

// 5. PESTAÑA: SYLLABUS
useEffect(() => {
    if (!user || !myChatId || activeTab !== 'syllabus') return;
    const uSyllabus = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'syllabus'), limit(100)), s => setSyllabus(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.week - b.week)));
    return () => uSyllabus();
}, [user, myChatId, activeTab]);

// 6. PESTAÑA: EVALUACIONES Y NOTAS
useEffect(() => {
    if (!user || !myChatId || activeTab !== 'evaluations') return;
    const uEvals = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'evaluations'), limit(50)), s => setEvaluations(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)));
    const uGrades = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'grades'), limit(100)), s => setGrades(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)));
    return () => { uEvals(); uGrades(); };
}, [user, myChatId, activeTab]);

// 7. PESTAÑA: BUZÓN (Solo para la profesora)
useEffect(() => {
    if (!user || !myChatId || activeTab !== 'inbox' || role !== 'teacher') return;
    const uSug = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suggestions'), s => setSuggestions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)));
    const uAlerts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'alerts'), s => setAlerts(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)));
    return () => { uSug(); uAlerts(); };
}, [user, myChatId, activeTab, role]);
            useEffect(() => {
              if (myChatId) {
                  const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
                  const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId);
                  
                  let awayTimer;
                  let busyTimer;
                  let pingInterval; 
                  let forceOfflineTimer; // 👈 NUEVO: El contador de 24 horas
                  let currentStatus = 'offline';

                  const setOnline = () => {
                      if (currentStatus !== 'online') {
                          currentStatus = 'online';
                          setDoc(presenceRef, { isOnline: true, status: 'online', lastPing: Date.now() }, { merge: true }).catch(()=>{});
                      }
                      
                      clearTimeout(awayTimer);
                      clearTimeout(busyTimer);
                      clearTimeout(forceOfflineTimer); // Reiniciamos las 24h si hay actividad
                      
                      // 1 MINUTO sin hacer nada -> Ausente
                      awayTimer = setTimeout(() => {
                          currentStatus = 'away';
                          setDoc(presenceRef, { isOnline: true, status: 'away', lastPing: Date.now() }, { merge: true }).catch(()=>{});
                      }, 60 * 1000); 

                      // 3 MINUTOS sin hacer nada -> Ocupado
                      busyTimer = setTimeout(() => {
                          currentStatus = 'busy';
                          setDoc(presenceRef, { isOnline: true, status: 'busy', lastPing: Date.now() }, { merge: true }).catch(()=>{});
                      }, 3 * 60 * 1000); 

                      // 24 HORAS sin interactuar -> Desconectado a la fuerza
                      forceOfflineTimer = setTimeout(() => {
                          handleOffline();
                      }, 24 * 60 * 60 * 1000); 
                  };

                  setOnline();

                  pingInterval = setInterval(() => {
                      if (currentStatus !== 'offline') {
                          setDoc(presenceRef, { lastPing: Date.now() }, { merge: true }).catch(()=>{});
                      }
                  }, 45000);

                  const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
                  let throttleTimer;
                  
                  const handleActivity = () => {
                      if (throttleTimer) return;
                      throttleTimer = setTimeout(() => {
                          setOnline();
                          throttleTimer = null;
                      }, 1000);
                  };

                  events.forEach(e => window.addEventListener(e, handleActivity));

                  const handleOffline = () => {
                      if (currentStatus === 'offline') return;
                      currentStatus = 'offline';
                      clearTimeout(awayTimer);
                      clearTimeout(busyTimer);
                      clearTimeout(forceOfflineTimer); // Apagamos el contador
                      clearInterval(pingInterval);
                      setDoc(presenceRef, { isOnline: false, status: 'offline', lastSeen: Date.now() }, { merge: true }).catch(()=>{});
                      
                      if (window.currentChatViewId) {
                          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'typing', window.currentChatViewId), { [myChatId]: false }, { merge: true }).catch(()=>{});
                      }
                  };

                  const handleVisibilityForPresence = () => {
                      if (document.visibilityState === 'hidden') handleOffline();
                      else setOnline();
                  };

                  window.addEventListener('focus', setOnline);
                  window.addEventListener('blur', handleOffline);
                  window.addEventListener('beforeunload', handleOffline);
                  window.addEventListener('pagehide', handleOffline);
                  document.addEventListener('visibilitychange', handleVisibilityForPresence);

                  return () => { 
                      clearTimeout(awayTimer);
                      clearTimeout(busyTimer);
                      clearTimeout(throttleTimer);
                      clearTimeout(forceOfflineTimer);
                      clearInterval(pingInterval);
                      events.forEach(e => window.removeEventListener(e, handleActivity));
                      handleOffline(); 
                      window.removeEventListener('focus', setOnline);
                      window.removeEventListener('blur', handleOffline);
                      window.removeEventListener('beforeunload', handleOffline); 
                      window.removeEventListener('pagehide', handleOffline);
                      document.removeEventListener('visibilitychange', handleVisibilityForPresence);
                  };
              }
          }, [myChatId, role]);
          useEffect(() => {
              if (isChatAppOpen && myChatId) {
                  setHasUnreadChat(false);
                  setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatAlerts', myChatId), { hasUnread: false }, { merge: true });
              }
          }, [isChatAppOpen, myChatId, appId]);

          useEffect(() => {
              if (!activeChat || !user) return;
              const base = ['artifacts', appId, 'public', 'data'];
              const unsubscribe = onSnapshot(collection(db, ...base, 'chats', activeChat.id, 'messages'), s => {
                  setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.createdAt - b.createdAt));
              });
              return () => unsubscribe();
          }, [activeChat, user]);
            // NUEVO: Efecto para marcar los mensajes como leídos cuando entras al chat
          useEffect(() => {
              if (!activeChat || !user || chatMessages.length === 0) return;

              const markAsRead = async () => {
                  const unreadMessages = chatMessages.filter(m => m.authorId !== myChatId && m.status !== 'read');
                  
                  for (const msg of unreadMessages) {
                      const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages', msg.id);
                      await updateDoc(msgRef, { status: 'read', readAt: Date.now() });
                  }
              };

              markAsRead();
          }, [chatMessages, activeChat, user, myChatId, db, appId]);
          useEffect(() => {
              if (activeChat && isChatAppOpen) {
                  chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }
          }, [chatMessages, isChatAppOpen, activeChat]);
            
// NUEVO: Efecto para compartir en qué chat estamos actualmente
useEffect(() => {
    if (!myChatId) return;
    const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId);

    const updateChatPresence = () => {
        // Detectamos si la ventana está visible
        const isVisible = document.visibilityState === 'visible';
        const currentView = (isChatAppOpen && activeChat && isVisible) ? activeChat.id : null;
        window.currentChatViewId = currentView;
        setDoc(presenceRef, { currentChatId: currentView }, { merge: true }).catch(() => {});
    };

    // Lo ejecutamos al instante
    updateChatPresence();

    // Escuchamos si el usuario minimiza el navegador o cambia de pestaña
    document.addEventListener('visibilitychange', updateChatPresence);

    return () => {
        document.removeEventListener('visibilitychange', updateChatPresence);
        setDoc(presenceRef, { currentChatId: null }, { merge: true }).catch(() => {});
    };
}, [activeChat, isChatAppOpen, myChatId, role, db, appId]);
            
          const allChatUsers = [
              { id: 'teacher', name: TEACHER_NAME, role: 'teacher' },
              ...Object.entries(userMappings || {}).filter(([id, data]) => data?.email).map(([id, data]) => ({ 
                  id, 
                  name: data?.fullName || FALLBACK_MAP[id]?.name || id, 
                  role: data?.role || 'student', 
                  customLabel: data?.customLabel || "" 
              })),
              ...Object.entries(FALLBACK_MAP).filter(([id, data]) => data.role !== 'teacher' && !userMappings[id]).map(([id, data]) => ({ 
                  id, 
                  name: data.name, 
                  role: data.role, 
                  customLabel: data.customLabel || "" 
              }))
          ].filter(u => u.id !== myChatId); 

          const myGroups = chatGroups.filter(g => g.members?.includes(myChatId));

          // FILTRAR POR BUSCADOR (BLINDADO CONTRA TEXTOS VACÍOS)
          const filteredUsers = allChatUsers.filter(u => (u.name || "").toLowerCase().includes((chatSearchTerm || "").toLowerCase()));
          const filteredGroups = myGroups.filter(g => (g.name || "").toLowerCase().includes((chatSearchTerm || "").toLowerCase()));
            const activeChatsUsers = filteredUsers.filter(u => lastMessages[`dm_${[myChatId, u.id].sort().join('_')}`]);
          const otherContactsUsers = filteredUsers.filter(u => !lastMessages[`dm_${[myChatId, u.id].sort().join('_')}`]);

          const handleOpenChat = (chat) => {
              setActiveChat(chat);
              setShowChatSettings(false);
              setShowGroupInfo(false);
              setReplyingTo(null); // <--- PEGA ESTA LÍNEA AQUÍ
              if (unreadChats[chat.id]) {
                  const alertRef = doc(db, 'artifacts', appId, 'public', 'data', 'chatAlerts', myChatId);
                  updateDoc(alertRef, { [`chats.${chat.id}`]: false }).then(() => {
                      const stillUnread = Object.entries(unreadChats).some(([id, isUnread]) => isUnread && id !== chat.id);
                      if (!stillUnread) updateDoc(alertRef, { hasUnread: false }).catch(()=>{});
                  }).catch(()=>{});
              }
          };

          const openChatApp = () => {
              window.location.hash = 'chat';
              setChatSearchTerm(""); 
              if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
          };

          const handleDeleteAppMessage = async (msgId) => {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages', msgId));

              // Actualizar o eliminar la vista previa del último mensaje
              const msgsSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages'));
              if (msgsSnapshot.empty) {
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lastMessages', activeChat.id));
              } else {
                  const remaining = msgsSnapshot.docs.map(d => d.data()).sort((a, b) => b.createdAt - a.createdAt);
                  const last = remaining[0];
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lastMessages', activeChat.id), {
                      text: last.text || (last.imageUrl ? '📷 Imagen' : ''),
                      author: last.author.split(' ')[0],
                      createdAt: last.createdAt
                  });
              }
          };

          const handleEditAppMessage = async () => {
    if (!editAppMessageText.trim()) return;
    
    // 🛑 FILTRO NUEVO: Comparar los dos textos
    const originalMsg = chatMessages.find(m => m.id === editingAppMessageId);
    if (originalMsg && originalMsg.text === editAppMessageText.trim()) {
        setEditingAppMessageId(null); // Cierra la cajita de edición
        return; // Detiene el proceso y no guarda nada en la base de datos
    }

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages', editingAppMessageId), { text: editAppMessageText.trim(), isEdited: true }, { merge: true });
    setEditingAppMessageId(null);
};
const [activeChatReactionMsgId, setActiveChatReactionMsgId] = useState(null);
          const toggleChatAppReaction = async (msgId, emoji) => {
              if (!activeChat) return;
              const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages', msgId);
              const msgObj = chatMessages.find(m => m.id === msgId);
              if (!msgObj) return;

              const currentReactions = msgObj.reactions || {};
              const userReaction = currentReactions[myChatId];
              let newReactions = { ...currentReactions };

              if (userReaction === emoji) delete newReactions[myChatId]; // Quita la reacción si toca el mismo emoji
              else newReactions[myChatId] = emoji; // Agrega o cambia la reacción

              await updateDoc(msgRef, { reactions: newReactions });
              setActiveChatReactionMsgId(null);
          };
            
          const handleUpdateChatPreference = async (chatId, key, value) => {
              const newPrefs = { ...chatPreferences };
              if (!newPrefs[chatId]) newPrefs[chatId] = { gradient: '', pattern: 'none' };
              newPrefs[chatId][key] = value;
              setChatPreferences(newPrefs);
              await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'preferences', 'chat'), { prefs: newPrefs }, { merge: true });
          };

          const handleLeaveGroup = async () => {
              const group = chatGroups.find(g => `group_${g.id}` === activeChat.id);
              if (!group) return;
              const newMembers = group.members.filter(id => id !== myChatId);
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', group.id), { members: newMembers }, { merge: true });
              setActiveChat(null);
              showMessage("✅ Abandonaste el grupo.");
          };

          const handleDeleteGroup = async () => {
              const group = chatGroups.find(g => `group_${g.id}` === activeChat.id);
              if (!group) return;
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', group.id));
              setActiveChat(null);
              showMessage("🗑️ Grupo eliminado.");
          };

            const handleDeleteEntireChat = async () => {
              if (!activeChat) return;
              const msgsSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages'));

              // Esperar a que todos los mensajes se borren correctamente
              const deletePromises = msgsSnapshot.docs.map(d => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages', d.id)));
              await Promise.all(deletePromises);

              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lastMessages', activeChat.id));
              setActiveChat(null);
              showMessage("🗑️ Historial de chat eliminado.");
          };
            
          const handleSendAppMessage = async (e) => {
              e.preventDefault();
              if (!chatAppInput.trim() && !chatAppImageUrl.trim() && !chatAppFileUrl) return;

              if (containsBadWords(chatAppInput)) {
                  showMessage("⚠️ Mensaje bloqueado: Lenguaje inapropiado.");
                  return;
              }

              const authorName = role === 'teacher' ? TEACHER_NAME : loggedInName;
              const msgPreviewText = chatAppInput.trim() || (chatAppImageUrl ? '📷 Imagen' : (chatAppFileUrl ? '📄 Documento' : ''));
              const previewName = role === 'teacher' ? 'Profesora' : loggedInName.split(' ')[0];

              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages'), {
                  text: chatAppInput.trim(),
                  imageUrl: chatAppImageUrl.trim(),
                  fileUrl: chatAppFileUrl,
                  fileName: chatAppFileName,
                  author: authorName,
                  authorId: myChatId,
                  uid: user.uid,
                  status: 'sent',
                  replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text || '', author: replyingTo.author || '', imageUrl: replyingTo.imageUrl || '' } : null,
                  createdAt: Date.now()
              });

              // ACTUALIZAR ÚLTIMO MENSAJE
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lastMessages', activeChat.id), {
                  text: msgPreviewText,
                  author: previewName,
                  createdAt: Date.now()
              });

              let targetIds = [];
              if (activeChat.type === 'group') {
                  const group = chatGroups.find(g => `group_${g.id}` === activeChat.id);
                  if (group) targetIds = group.members.filter(id => id !== myChatId);
              } else {
                  targetIds = [activeChat.id.replace('dm_', '').replace(myChatId, '').replace('_', '')];
              }
              targetIds.forEach(async tId => {
                  if(tId) {
                      const alertRef = doc(db, 'artifacts', appId, 'public', 'data', 'chatAlerts', tId);
                      const alertSnap = await getDoc(alertRef);
                      if (alertSnap.exists()) {
                          await updateDoc(alertRef, { hasUnread: true, timestamp: Date.now(), [`chats.${activeChat.id}`]: true, previewSender: previewName, previewText: msgPreviewText });
                      } else {
                          await setDoc(alertRef, { hasUnread: true, timestamp: Date.now(), chats: { [activeChat.id]: true }, previewSender: previewName, previewText: msgPreviewText });
                      }
                  }
              });

              setChatAppInput("");
              setChatAppImageUrl("");
              setChatAppFileUrl("");
              setChatAppFileName("");
              setShowChatAppAttachmentMenu(false);
              setShowChatAppImageInput(false);
              setShowChatAppEmojiPicker(false);
              setReplyingTo(null);
              
              // FIX BUG "Escribiendo...": Apagar inmediatamente al darle al botón Enviar
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'typing', activeChat.id), { [myChatId]: false }, { merge: true }).catch(()=>{});
              clearTimeout(typingTimeout.current);
          };

          const handleCreateGroup = async (e) => {
              e.preventDefault();
              if (!newGroupName.trim() || newGroupMembers.length === 0) {
                  showMessage("⚠️ Ingresa un nombre y selecciona al menos 1 miembro.");
                  return;
              }
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chatGroups'), {
                  name: newGroupName.trim(),
                  members: [myChatId, ...newGroupMembers],
                  createdBy: myChatId,
                  createdAt: Date.now()
              });
              setIsCreatingGroup(false);
              setNewGroupName("");
              setNewGroupMembers([]);
              showMessage("✅ Grupo creado.");
          };

          const handleChatAppLocalFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        showMessage("⏳ Subiendo archivo...");
        if (file.type.startsWith('image/') && file.type !== 'image/gif') {
            const compressed = await compressImage(file, 800, 800, 0.6);
            const firebaseURL = await uploadImageToStorage(compressed, 'chats');
            setChatAppImageUrl(firebaseURL);
        } else {
            const firebaseURL = await uploadRawFileToStorage(file, 'chats');
            if (file.type.startsWith('image/')) {
                setChatAppImageUrl(firebaseURL);
            } else {
                setChatAppFileUrl(firebaseURL);
                setChatAppFileName(file.name);
            }
        }
        showMessage("✅ Archivo listo");
    } catch (error) {
        showMessage("Hubo un error al procesar tu archivo.");
    }
};
          const handlePostLocalFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        setIsAiLoading(true);
        // Si es imagen (pero no GIF), se comprime. Si es GIF o Documento, sube original.
        if (file.type.startsWith('image/') && file.type !== 'image/gif') {
            const compressed = await compressImage(file, 800, 800, 0.6);
            const firebaseURL = await uploadImageToStorage(compressed, 'posts');
            setPostImageUrl(firebaseURL);
        } else {
            const firebaseURL = await uploadRawFileToStorage(file, 'posts');
            if (file.type.startsWith('image/')) {
                setPostImageUrl(firebaseURL); // GIFs
            } else {
                setPostFileUrl(firebaseURL);
                setPostFileName(file.name);
            }
        }
        setIsAiLoading(false);
    } catch (error) {
        showMessage("Hubo un error al subir el archivo.");
        setIsAiLoading(false);
    }
};

          const handleSaveEval = async (e) => {
              e.preventDefault();
              if(evalFormData.questions.length === 0) return showMessage("Añade al menos 1 pregunta.");
              
              let valid = true;
              evalFormData.questions.forEach((q, i) => {
                  if(q.type === 'multiple') {
                      if(q.options.length < 2) { showMessage(`Pregunta ${i+1}: Mínimo 2 opciones.`); valid = false; }
                      if(q.options.filter(o=>o.isCorrect).length === 0) { showMessage(`Pregunta ${i+1}: Marca al menos 1 opción correcta.`); valid = false; }
                  } else {
                      if(!q.correctAnswer.trim()) { showMessage(`Pregunta ${i+1}: Escribe la respuesta esperada.`); valid = false; }
                  }
              });
              if(!valid) return;

              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'evaluations'), {
                  ...evalFormData,
                  createdAt: Date.now(),
                  createdBy: myChatId
              });
              setIsCreatingEval(false);
              setEvalFormData({ title: "", description: "", dueDate: getToday(), dueTime: "23:59", timeLimit: 30, questions: [] });
              showMessage("✅ Evaluación creada exitosamente.");
          };

          const calculateScore = (evalData, answers) => {
              let correct = 0;
              evalData.questions.forEach((q, i) => {
                  const ans = answers[i];
                  if (q.type === 'multiple') {
                      const correctIndices = q.options.map((opt, idx) => opt.isCorrect ? idx : -1).filter(idx => idx !== -1);
                      const selectedIndices = ans || [];
                      if (correctIndices.length === selectedIndices.length && correctIndices.every(idx => selectedIndices.includes(idx))) {
                          correct++;
                      }
                  } else {
                      if (ans && ans.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase()) correct++;
                  }
              });
              return (correct / evalData.questions.length) * 5.0;
          };

          const submitEvaluation = async (autoSubmit = false) => {
              if(!activeTakingEval) return;
              const score = calculateScore(activeTakingEval, studentAnswers);
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'grades'), {
                  evaluationId: activeTakingEval.id,
                  studentId: user.uid,
                  studentName: loggedInName,
                  score: parseFloat(score.toFixed(1)),
                  answers: studentAnswers,
                  submittedAt: Date.now()
              });
              setActiveTakingEval(null);
              setStudentAnswers({});
              showMessage(autoSubmit ? "⏳ Tiempo agotado. Evaluación enviada automáticamente." : "✅ Evaluación completada y enviada.");
          };

          const saveEditedGrade = async (gradeId) => {
              const newScore = parseFloat(editingGrade.score);
              if(isNaN(newScore) || newScore < 0 || newScore > 5) return showMessage("Nota inválida (debe ser entre 0.0 y 5.0)");
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grades', gradeId), { score: newScore });
              setEditingGrade({id: null, score: ''});
              showMessage("✅ Nota actualizada.");
          };

           // --- LÓGICA DE FOTO DE PERFIL ---
    const handleAvatarSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setAvatarPreviewUrl(event.target.result);
            setCropZoom(1); setCropOffset({ x: 0, y: 0 });
            setShowAvatarUploadModal(true);
        };
        reader.readAsDataURL(file);
    };

    const saveAvatar = async () => {
        if (!avatarPreviewUrl || !cropImageRef.current) {
            setShowAvatarUploadModal(false);
            return;
        }
        
        setIsUploadingAvatar(true);
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 400; canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "#ffffff"; 
            ctx.fillRect(0, 0, 400, 400);

            const img = cropImageRef.current;
            
            // Matemática exacta del recorte interactivo
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                const scale = Math.max(400 / img.naturalWidth, 400 / img.naturalHeight);
                const w = img.naturalWidth * scale * cropZoom;
                const h = img.naturalHeight * scale * cropZoom;
                
                const dx = (400 - w) / 2 + (cropOffset.x * 2.08); 
                const dy = (400 - h) / 2 + (cropOffset.y * 2.08);

                ctx.drawImage(img, dx, dy, w, h);
            }

            const compressed = (img.naturalWidth > 0) ? canvas.toDataURL('image/jpeg', 0.8) : avatarPreviewUrl;
            
            // 🛑 CERRAR EL MODAL INMEDIATAMENTE para evitar congelamientos
            setShowAvatarUploadModal(false); 
            
            const url = await uploadImageToStorage(compressed, 'avatars');
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', myChatId), { profilePicUrl: url }, { merge: true });
            
            setAvatarPreviewUrl("");
            showMessage("✅ Foto de perfil actualizada correctamente.");
            
        } catch(err) { 
            console.error("Error al guardar foto:", err);
            setShowAvatarUploadModal(false); 
            setAvatarPreviewUrl("");
            showMessage("❌ Error al guardar. Revisa Firebase Storage."); 
        }
        setIsUploadingAvatar(false);
    };

    // --- LÓGICA DE PUBLICACIONES DE PERFIL ---
    const handleProfileImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsPublishingProfile(true);
        try {
            const compressed = await compressImage(file, 800, 800, 0.7);
            const url = await uploadImageToStorage(compressed, 'userPosts');
            setProfilePostImage(url);
        } catch(err) { showMessage("Error al subir foto."); }
        setIsPublishingProfile(false);
    };

    const publishProfilePost = async (e) => {
        e.preventDefault();
        if(!profilePostTitle.trim() && !profilePostText.trim() && !profilePostImage) return;
        setIsPublishingProfile(true);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'userPosts'), {
            authorId: user.uid, authorUsername: myChatId, authorName: loggedInName,
            title: profilePostTitle.trim(), text: profilePostText.trim(), imageUrl: profilePostImage,
            comments: [], reactions: {}, createdAt: Date.now()
        });
        setProfilePostTitle(""); setProfilePostText(""); setProfilePostImage(""); setIsPublishingProfile(false);
        showMessage("✅ Publicado en tu perfil.");
    };

    const saveEditedProfilePost = async (postId) => {
        if (!editProfilePostData.title.trim() && !editProfilePostData.text.trim()) return;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userPosts', postId), {
            title: editProfilePostData.title.trim(), text: editProfilePostData.text.trim(), isEdited: true
        });
        setEditingProfilePostId(null); showMessage("✅ Publicación actualizada.");
    };

    const toggleProfilePostReaction = async (postId, emoji) => {
        const post = userPosts.find(p => p.id === postId);
        if (!post) return;
        const currentReactions = post.reactions || {};
        let newReactions = { ...currentReactions };
        if (newReactions[myChatId] === emoji) delete newReactions[myChatId]; 
        else newReactions[myChatId] = emoji; 
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userPosts', postId), { reactions: newReactions });
    };

    const handleAddProfileComment = async (postId, e) => {
        e.preventDefault();
        const text = profileCommentInputs[postId];
        if (!text || !text.trim()) return;
        const post = userPosts.find(p => p.id === postId);
        const rep = profileReplyingTo[post.id];
        const newComment = { id: Date.now().toString(), author: loggedInName, text: text.trim(), createdAt: Date.now(), replyTo: rep ? { id: rep.id, author: rep.author, text: rep.text } : null };
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userPosts', postId), { comments: [...(post.comments || []), newComment] });
        setProfileCommentInputs({ ...profileCommentInputs, [postId]: "" });
        setProfileReplyingTo({ ...profileReplyingTo, [post.id]: null });
    };

    const renderProfile = () => {
        const isMyProfile = !viewingProfileId || viewingProfileId === myChatId;
        let profileName = loggedInName;
        let profileRole = userMappings[myChatId]?.customLabel || (role === 'teacher' ? 'Docente' : 'Estudiante');
        let targetFilterId = myChatId;
        let targetProfilePic = userMappings[myChatId]?.profilePicUrl;

        if (!isMyProfile) {
            const targetUser = allChatUsers.find(u => u.id === viewingProfileId);
            if (targetUser) {
                profileName = targetUser.name;
                profileRole = targetUser.customLabel || (targetUser.role === 'teacher' ? 'Docente' : 'Estudiante');
                targetFilterId = viewingProfileId;
                targetProfilePic = userMappings[viewingProfileId]?.profilePicUrl || FALLBACK_MAP[viewingProfileId]?.profilePicUrl;
            }
        }

        const myPosts = userPosts.filter(p => p.authorUsername === targetFilterId || (isMyProfile && p.authorId === user.uid));
        
        return (
            <div className="space-y-6 pb-20 md:pb-0 max-w-5xl mx-auto">
                
                {/* Cabecera del Perfil (Fondo Sólido Adaptable) */}
                <div className={`flex flex-col md:flex-row items-center gap-6 p-8 relative rounded-[2rem] shadow-sm border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} ${!isMyProfile ? 'pt-16 md:pt-8 md:pl-16' : ''}`}>
                    {!isMyProfile && (
                        <button onClick={() => {setViewingProfileId(null); changeTab('chat');}} className={`absolute top-4 left-4 z-20 p-2 rounded-full transition shadow-sm ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} title="Volver al chat">
                            <ArrowLeftIcon size={20}/>
                        </button>
                    )}
                    
                    {/* Avatar Interactuable */}
                    <div className="relative group shrink-0">
                        {targetProfilePic ? (
                            <img src={targetProfilePic} className={`w-28 h-28 rounded-full object-cover shadow-lg border-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-50'}`} />
                        ) : (
                            <div className={`w-28 h-28 rounded-full flex items-center justify-center text-blue-600 shadow-lg border-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-white'}`}>
                                <UserIcon size={50} />
                            </div>
                        )}
                        {isMyProfile && (
                            <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                                <Edit3 className="text-white" size={28} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                            </label>
                        )}
                    </div>
                    
                    <div className="text-center md:text-left z-10 flex-1">
                        <h2 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{profileName}</h2>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">{profileRole}</p>
                    </div>
                </div>

                {/* Modal Recortador de Avatar */}
                {showAvatarUploadModal && ReactDOM.createPortal(
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
                         onMouseMove={(e) => {
                             if(!isDraggingCrop) return;
                             setCropOffset({ x: e.clientX - cropDragStart.current.x, y: e.clientY - cropDragStart.current.y });
                         }}
                         onMouseUp={() => setIsDraggingCrop(false)}
                         onMouseLeave={() => setIsDraggingCrop(false)}
                         onTouchMove={(e) => {
                             if(!isDraggingCrop) return;
                             setCropOffset({ x: e.touches[0].clientX - cropDragStart.current.x, y: e.touches[0].clientY - cropDragStart.current.y });
                         }}
                         onTouchEnd={() => setIsDraggingCrop(false)}
                    >
                        <div className={`w-full max-w-sm flex flex-col p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
                            <h3 className={`text-xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Ajustar Foto</h3>
                            
                            <div className="flex flex-col items-center mb-6">
                                <div 
                                    ref={cropContainerRef}
                                    className="w-48 h-48 shrink-0 rounded-full border-4 border-blue-500 shadow-lg overflow-hidden relative cursor-move bg-gray-200"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsDraggingCrop(true);
                                        cropDragStart.current = { x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y };
                                    }}
                                    onTouchStart={(e) => {
                                        setIsDraggingCrop(true);
                                        cropDragStart.current = { x: e.touches[0].clientX - cropOffset.x, y: e.touches[0].clientY - cropOffset.y };
                                    }}
                                >
                                    <img 
                                        ref={cropImageRef}
                                        src={avatarPreviewUrl} 
                                        draggable="false"
                                        className="absolute pointer-events-none"
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'cover', // ESTO EVITA EL MEGA ZOOM
                                            transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`
                                        }} 
                                    />
                                </div>
                                
                                <div className="w-full mt-6 flex items-center gap-3 px-4">
                                    <span className="text-gray-500"><ImageIcon size={16}/></span>
                                    <input 
                                        type="range" min="1" max="3" step="0.05" 
                                        value={cropZoom} 
                                        onChange={e => setCropZoom(parseFloat(e.target.value))} 
                                        className="flex-1 accent-blue-500 cursor-pointer"
                                    />
                                    <span className="text-gray-500"><ImageIcon size={24}/></span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowAvatarUploadModal(false)} disabled={isUploadingAvatar} className={`flex-1 py-3 rounded-xl font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                                <button onClick={saveAvatar} disabled={isUploadingAvatar} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2">
                                    {isUploadingAvatar ? <Loader2 className="animate-spin" size={20}/> : <CheckLine size={20}/>} Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                , document.body)}

                {/* Crear Publicación */}
                {isMyProfile && (
                    <form onSubmit={publishProfilePost} className={`${glassCard} flex flex-col gap-3 mb-8`}>
                        <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Crear nueva publicación</h3>
                        <input value={profilePostTitle} onChange={e => setProfilePostTitle(e.target.value)} placeholder="Título (Opcional)" className={`${glassInput} font-bold`} />
                        <textarea value={profilePostText} onChange={e => setProfilePostText(e.target.value)} placeholder="¿Qué quieres compartir en tu perfil hoy?" className={`${glassInput} h-20 resize-none`} />
                        {profilePostImage && (
                            <div className="relative w-fit">
                                <img src={profilePostImage} alt="Preview" className="h-32 rounded-xl object-cover border border-white/50 shadow-sm" />
                                <button type="button" onClick={() => setProfilePostImage("")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md"><X size={14}/></button>
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-2">
                            <label className={`cursor-pointer px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all border ${isDarkMode ? 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300' : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'}`}>
                                <ImageIcon size={18} /> Foto
                                <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={isPublishingProfile} />
                            </label>
                            <button type="submit" disabled={isPublishingProfile || (!profilePostTitle && !profilePostText && !profilePostImage)} className={`${redButton} disabled:opacity-50`}>
                                {isPublishingProfile ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>} Publicar
                            </button>
                        </div>
                    </form>
                )}

                {/* Cuadrícula de Posts con Comentarios */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
                    {myPosts.length === 0 ? <p className="text-gray-500 italic col-span-full text-center">Aún no hay publicaciones en este perfil.</p> : null}
                    {myPosts.map(post => {
                        const isEditingThis = editingProfilePostId === post.id;
                        return (
                        <div key={post.id} className={`${glassCard} !p-4 flex flex-col gap-3 group relative`}>
                            {/* Menú de Opciones (Editar/Borrar) */}
                            {isMyProfile && !isEditingThis && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button onClick={() => {setEditingProfilePostId(post.id); setEditProfilePostData({title: post.title || "", text: post.text || ""});}} className="bg-blue-100 text-blue-600 p-1.5 rounded-lg shadow-sm"><Edit3 size={14}/></button>
                                    <button onClick={() => confirmAction("¿Eliminar publicación de tu perfil?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userPosts', post.id)))} className="bg-red-100 text-red-600 p-1.5 rounded-lg shadow-sm"><Trash2 size={14}/></button>
                                </div>
                            )}
                            
                            {/* Renderizado del Post o Modo Edición */}
                            {isEditingThis ? (
                                <div className="flex flex-col gap-2 mt-6">
                                    <input value={editProfilePostData.title} onChange={e => setEditProfilePostData({...editProfilePostData, title: e.target.value})} className={`${glassInput} text-sm font-bold p-2`} placeholder="Título..." />
                                    <textarea value={editProfilePostData.text} onChange={e => setEditProfilePostData({...editProfilePostData, text: e.target.value})} className={`${glassInput} text-sm resize-none p-2 h-20`} placeholder="Texto..." />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingProfilePostId(null)} className="text-gray-500"><XLine size={20}/></button>
                                        <button onClick={() => saveEditedProfilePost(post.id)} className="text-green-600"><CheckLine size={20}/></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {post.title && <h4 className={`font-black text-lg leading-tight pr-12 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{post.title}</h4>}
                                    {post.imageUrl && <img src={post.imageUrl} loading="lazy" onClick={() => setFullScreenImage(post.imageUrl)} alt="Post" className={`w-full aspect-square object-cover rounded-2xl cursor-pointer shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />}
                                    {post.text && <p className={`text-sm leading-relaxed line-clamp-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{post.text}</p>}
                                </>
                            )}
                            
                            <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-500/20">
                                <span className="text-[10px] text-gray-400 font-bold">
                                    {new Date(post.createdAt).toLocaleDateString()} a las {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    {post.isEdited && <span className="italic ml-1">(editado)</span>}
                                </span>
                                
                                {/* Reacciones del Perfil */}
                                <div className="flex items-center gap-1">
                                    {Object.entries(post.reactions || {}).reduce((acc, [uid, emoji]) => {
                                        const existing = acc.find(item => item.emoji === emoji);
                                        if (existing) existing.count++; else acc.push({ emoji, count: 1 });
                                        return acc;
                                    }, []).map((r, idx) => (
                                        <span key={idx} className={`text-xs px-1.5 py-0.5 rounded-full border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>{r.emoji} {r.count}</span>
                                    ))}
                                    <div className="relative group/react">
                                        <button className={`p-1 rounded-full text-gray-400 hover:text-blue-500 transition-colors`}><SmileIcon size={14}/></button>
                                        <div className={`absolute bottom-full right-0 mb-1 hidden group-hover/react:flex gap-1 p-1.5 rounded-full shadow-lg border z-30 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                                            {['❤️','👍','🔥','👏'].map(emj => (
                                                <button key={emj} onClick={() => toggleProfilePostReaction(post.id, emj)} className="hover:scale-125 transition-transform text-sm">{emj}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Sección de Comentarios */}
                            <div className="flex flex-col gap-2 mt-2 bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
                                <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                                    {(post.comments || []).map(c => (
                                        <div key={c.id} className={`p-2 rounded-xl text-xs ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700 shadow-sm border border-gray-100'}`}>
                                            {c.replyTo && (
                                                <div className={`mb-1 pl-2 border-l-2 py-0.5 ${isDarkMode ? 'border-blue-500 bg-gray-900/50 text-gray-400' : 'border-blue-400 bg-gray-50 text-gray-500'} text-[10px] opacity-90 rounded-r-md`}>
                                                    <span className="font-bold text-blue-500 mr-1">{c.replyTo.author}</span>
                                                    <span className="truncate">{c.replyTo.text}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start group/pcomm">
                                                <div>
                                                    <button onClick={() => handleOpenProfileByName(c.author)} className="font-bold text-blue-500 mb-0.5 hover:underline text-left">{c.author}</button>
                                                    <p>{c.text}</p>
                                                </div>
                                                <button onClick={() => setProfileReplyingTo({...profileReplyingTo, [post.id]: c})} className="opacity-0 group-hover/pcomm:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity"><ReplyIcon size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {profileReplyingTo[post.id] && (
                                    <div className={`flex justify-between items-center px-3 py-1.5 rounded-t-xl border-b text-[11px] ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'}`}>
                                        <span className="truncate">Respondiendo a <b className="text-blue-500">{profileReplyingTo[post.id].author}</b></span>
                                        <button type="button" onClick={() => setProfileReplyingTo({...profileReplyingTo, [post.id]: null})}><X size={14}/></button>
                                    </div>
                                )}
                                <form onSubmit={(e) => handleAddProfileComment(post.id, e)} className="flex gap-2 mt-1 relative">
                                    <input value={profileCommentInputs[post.id] || ""} onChange={e => setProfileCommentInputs({...profileCommentInputs, [post.id]: e.target.value})} placeholder="Comentar..." className={`flex-1 px-3 py-1.5 text-xs outline-none rounded-xl border focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`} />
                                    <button type="submit" disabled={!profileCommentInputs[post.id]} className="text-blue-500 disabled:opacity-50"><Send size={16}/></button>
                                </form>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        );
    };
          

          const renderReviews = () => {
            if (draftReview) {
              return (
                <div className="space-y-6 pb-20 md:pb-0">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2 drop-shadow-sm"><Edit3 className="text-[#AD3333]" /> Edición de Diapositivas</h2>
                  <div className={`${glassCard} flex flex-col gap-8`}>
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
                       <label className="text-sm font-bold text-gray-800 mb-2 block">Título de la Presentación</label>
                       <input className={`${glassInput} font-extrabold text-xl`} value={draftReview.topic} onChange={e => setDraftReview({...draftReview, topic: e.target.value})} />
                    </div>
                    {draftReview.slides.map((slide, i) => (
                      <div key={i} className={`bg-gradient-to-br ${slide.gradient || SLIDE_GRADIENTS[0]} p-6 rounded-3xl border border-gray-200 dark:border-gray-700 relative shadow-md`}>
                        <div className="absolute inset-0 bg-black/5 dark:bg-black/40 rounded-3xl pointer-events-none"></div>
                        <div className="relative z-10">
                          <span className="absolute -top-2 -right-2 bg-gray-900 text-white font-bold px-4 py-1.5 rounded-full text-xs shadow-lg">Slide {i + 1}</span>
                          <div className="mb-4 bg-white dark:bg-gray-900 p-2 rounded-2xl inline-flex gap-2 border border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1 ml-1 mr-2"><Palette size={14}/> Color:</span>
                            {SLIDE_GRADIENTS.map(grad => (
                              <button key={grad} type="button" onClick={() => { const newSlides = [...draftReview.slides]; newSlides[i].gradient = grad; setDraftReview({...draftReview, slides: newSlides}); }} className={`w-6 h-6 rounded-full bg-gradient-to-br ${grad} border-2 transition-transform ${slide.gradient === grad ? 'border-gray-800 scale-125' : 'border-white/80'}`} />
                            ))}
                          </div>
                          <div className="mb-6 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <label className="text-sm font-bold text-gray-800 mb-1 block mt-1">Título de la diapositiva</label>
                            <input className={`${glassInput} mb-4 font-bold text-lg`} value={slide.title} onChange={e => { const newSlides = [...draftReview.slides]; newSlides[i].title = e.target.value; setDraftReview({...draftReview, slides: newSlides}); }} />
                            {slide.type === 'quiz' ? (
                              <div className="space-y-4">
                                <div><label className="text-sm font-bold text-gray-800 mb-1 block">Pregunta</label><textarea className={`${glassInput} h-24 resize-none`} value={slide.question || ""} onChange={e => { const newSlides = [...draftReview.slides]; newSlides[i].question = e.target.value; setDraftReview({...draftReview, slides: newSlides}); }} /></div>
                                <div><label className="text-sm font-bold text-green-800 mb-1 block">Respuesta correcta</label><textarea className={`${glassInput} h-20 resize-none border-green-300`} value={slide.answer || ""} onChange={e => { const newSlides = [...draftReview.slides]; newSlides[i].answer = e.target.value; setDraftReview({...draftReview, slides: newSlides}); }} /></div>
                              </div>
                            ) : (
                              <div><label className="text-sm font-bold text-gray-800 mb-1 block">Contenido</label><textarea className={`${glassInput} h-32 resize-none leading-relaxed`} value={slide.content || ""} onChange={e => { const newSlides = [...draftReview.slides]; newSlides[i].content = e.target.value; setDraftReview({...draftReview, slides: newSlides}); }} /></div>
                            )}
                          </div>
                          <div className="bg-gradient-to-r from-purple-100/70 to-indigo-100/70 p-4 rounded-2xl border border-indigo-200/50 flex flex-col sm:flex-row gap-3 sm:items-end">
                            <div className="flex-1">
                              <label className="text-xs font-bold text-indigo-800 mb-1 block">Instrucción para la IA</label>
                              <input placeholder="Ej. Hazla sobre verbos irregulares..." className={`${glassInput} py-2 text-sm border-indigo-200`} value={slideInstructions[i] || ""} onChange={e => setSlideInstructions({...slideInstructions, [i]: e.target.value})} />
                            </div>
                            <button onClick={() => handleRegenerateSingleSlide(i)} disabled={loadingSlides[i]} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 justify-center">
                              {loadingSlides[i] ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} Regenerar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-4 pt-4 border-t border-white/40">
                       <button onClick={() => setDraftReview(null)} className="px-6 py-3 rounded-full font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-red-600 transition flex items-center gap-2 shadow-sm"><X size={20}/> Descartar</button>
                       <button onClick={handlePublishDraft} className={`${redButton} ml-auto`}><Send size={20}/> Publicar Presentación</button>
                    </div>
                  </div>
                </div>
              );
            }

            const activeSlide = activeReview?.slides?.[currentSlide];

            return (
              <div className="space-y-6 pb-20 md:pb-0">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2 drop-shadow-sm">Repasos</h2>
                {role === 'teacher' && !activeReview && (
                  <form onSubmit={handleGenerateReview} className={`${glassCard} mb-8 flex flex-col gap-4`}>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Wand2 size={20}/> Generador Inteligente de Diapositivas</h3>
                    <textarea value={reviewTopic} onChange={(e) => setReviewTopic(e.target.value)} placeholder="Ej. Present Simple con ejemplos de comidas..." className={`${glassInput} h-24 resize-none`} required />
                    <div className="flex justify-between items-center mt-2">
                      <select value={reviewCount} onChange={(e) => setReviewCount(Number(e.target.value))} className={`${glassInput} py-2 w-auto`}>{[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} diapositivas</option>)}</select>
                      <button type="submit" disabled={isReviewLoading} className={`${redButton} disabled:opacity-50`}>{isReviewLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} Generar</button>
                    </div>
                  </form>
                )}

                {activeReview && activeSlide ? (
                  <div className={`relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-[0_10px_30px_0_rgba(0,0,0,0.1)] min-h-[550px] flex flex-col justify-between bg-gradient-to-br ${activeSlide?.gradient || SLIDE_GRADIENTS[0]} backdrop-blur-sm transition-all duration-700`}>
                    <div className="absolute inset-0 bg-white/20 pointer-events-none"></div>
                    <div className="relative z-10 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-black/40">
                      <h3 className="text-xl font-extrabold text-gray-900 drop-shadow-sm">{activeReview.topic}</h3>
                      <button onClick={() => setActiveReview(null)} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full p-2 transition"><X size={24} /></button>
                    </div>
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center">
                      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-8 md:p-12 rounded-[2rem] shadow-xl max-w-3xl w-full">
                        <h4 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 drop-shadow-sm leading-tight">{activeSlide?.title}</h4>
                        {activeSlide?.type === 'quiz' ? (
                          <div className="flex flex-col items-center gap-4 w-full">
                            <p className="text-2xl text-gray-800 font-bold mb-4">{activeSlide.question}</p>
                            {!showQuizAnswer ? (
                              <form onSubmit={handleQuizSubmit} className="w-full flex flex-col gap-4">
                                <input value={studentQuizAnswer} onChange={e => setStudentQuizAnswer(e.target.value)} placeholder="Tu respuesta..." className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-2xl px-6 py-4 text-xl text-center font-medium text-gray-800 dark:text-gray-100" />
                                <button type="submit" disabled={isEvaluatingQuiz} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg mx-auto disabled:opacity-50">
                                  {isEvaluatingQuiz ? <Loader2 className="animate-spin" size={24}/> : <ArrowRightIcon size={20}/>} Comprobar
                                </button>
                              </form>
                            ) : (
                              <div className="w-full bg-green-100/80 border border-green-300 p-6 rounded-3xl"><span className="block text-sm font-black text-green-700 uppercase mb-2">Respuesta Correcta</span><p className="text-xl font-medium text-gray-800">{activeSlide.answer}</p></div>
                            )}
                            {quizFeedback && <div className={`mt-4 p-4 rounded-2xl border w-full font-medium ${showQuizAnswer ? 'bg-green-50/90 text-green-800' : 'bg-indigo-50/90 text-indigo-800'}`}>{quizFeedback}</div>}
                          </div>
                        ) : (
                          <div className="text-xl md:text-2xl text-gray-800 text-left font-medium space-y-4">{activeSlide?.content?.split('\n').map((p, idx) => p.trim() && <p key={idx}>{p}</p>)}</div>
                        )}
                      </div>
                    </div>
                    <div className="relative z-10 flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-black/40 backdrop-blur-md">
                      <button onClick={() => setCurrentSlide(s => Math.max(0, s - 1))} disabled={currentSlide === 0} className="flex gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full font-bold text-gray-900 dark:text-gray-100 disabled:opacity-40"><ChevronLeft size={20} /> Anterior</button>
                      <span className="font-extrabold text-gray-900 dark:text-gray-100 tracking-widest bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-2 rounded-full">{currentSlide + 1} / {activeReview.slides?.length || 1}</span>
                      <button onClick={() => setCurrentSlide(s => Math.min((activeReview.slides?.length || 1) - 1, s + 1))} disabled={currentSlide === (activeReview.slides?.length || 1) - 1} className="flex gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full font-bold text-gray-900 dark:text-gray-100 disabled:opacity-40">Siguiente <ChevronRight size={20} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reviews.length === 0 ? <p className="text-gray-600 italic px-4 col-span-3">No hay repasos generados aún.</p> : null}
                    {reviews.map((r, idx) => (
                      <div key={r.id} className={`cursor-pointer hover:scale-[1.03] transition-transform duration-300 relative overflow-hidden rounded-[1.5rem] border border-white/50 shadow-lg flex flex-col bg-gradient-to-br ${r.slides?.[0]?.gradient || SLIDE_GRADIENTS[0]} backdrop-blur-xl aspect-video`} onClick={() => { setActiveReview(r); setCurrentSlide(0); setShowQuizAnswer(false); }}>
                        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-5 text-center">
                          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-4 rounded-xl w-full"><h4 className="text-lg font-extrabold text-gray-900 drop-shadow-sm line-clamp-3">{r.topic}</h4></div>
                        </div>
                        <div className="relative z-10 flex justify-between items-center px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-black/40 backdrop-blur-md">
                          <span className="text-xs font-bold text-gray-900">{r.slides?.length || 0} diapositivas</span>
                          {role === 'teacher' && <button onClick={(e) => { e.stopPropagation(); confirmAction("¿Borrar este repaso de forma permanente?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', r.id))); }} className="text-gray-800 hover:text-red-600"><Trash2 size={16} /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )};

          const renderSyllabus = () => (
            <div className="space-y-6 pb-20 md:pb-0">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2"><CalendarEmoji className="text-[#AD3333]" /> Contenidos programáticos</h2>
              
              {role === 'teacher' && (
                  <div className={`${glassCard} flex flex-col gap-4 mb-6`}>
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><CuteBotIcon size={20} className="text-gray-500" /> Entrenamiento del Asistente Virtual</h3>
                      <div className="flex-1 max-h-40 overflow-y-auto space-y-2 pr-1">
                          {botInfoList.length === 0 && <p className="text-xs text-gray-500 italic">No hay información guardada. Escribe algo para que el bot lo aprenda.</p>}
                          {botInfoList.map(item => (
                              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-xs flex justify-between items-start gap-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                                  <span className="text-gray-800 break-words flex-1 font-medium">{item.text}</span>
                                  <button onClick={() => {
                                      confirmAction("¿Seguro que desea eliminar esta instrucción del bot?", () => {
                                          const newList = botInfoList.filter(i => i.id !== item.id);
                                          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bot'), { infoList: newList });
                                      });
                                  }} className="text-gray-400 hover:text-red-600 shrink-0 transition-colors" title="Eliminar regla"><Trash2 size={16}/></button>
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-2">
                          <textarea 
                              value={botTrainingInfo} onChange={e => setBotTrainingInfo(e.target.value)} 
                              placeholder="Ej: El parcial de verbos es el 25 de mayo y vale el 30%..." 
                              className={`${glassInput} h-12 py-3 resize-none text-sm flex-1`}
                          />
                          <button onClick={() => {
                              if(!botTrainingInfo.trim()) return;
                              const newItem = { id: Date.now().toString(), text: botTrainingInfo.trim() };
                              const newList = [...botInfoList, newItem];
                              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bot'), { infoList: newList });
                              setBotTrainingInfo("");
                              showMessage("✅ Entrenamiento añadido con éxito.");
                          }} className={`${redButton} h-12 px-6 whitespace-nowrap`}><Plus size={16}/> Añadir Info</button>
                      </div>
                  </div>
              )}

              <div className="w-full space-y-6">
                  {role === 'teacher' && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'syllabus'), { week: Number(e.target.week.value), topic: e.target.topic.value, material: e.target.material.value });
                      e.target.reset();
                    }} className={`${glassCard} flex flex-wrap gap-4 items-end`}>
                      <input type="number" name="week" placeholder="Semana" className={`${glassInput} w-24`} required />
                      <input name="topic" placeholder="Tema..." className={`${glassInput} flex-1`} required />
                      <button type="submit" className={redButton}>Añadir</button>
                    </form>
                  )}
                  <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm`}>
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        <tr><th className="p-4 font-bold">Semana</th><th className="p-4 font-bold">Tema</th><th className="p-4 font-bold">Material</th>{role === 'teacher' && <th></th>}</tr>
                      </thead>
                      <tbody>
                        {syllabus.length === 0 ? <tr><td colSpan="4" className="p-4 text-gray-600 text-center font-medium">No hay contenidos en el calendario.</td></tr> : syllabus.map(item => (
                          <tr key={item.id} className="border-b border-white/20">
                            <td className="p-4 font-bold text-[#AD3333]">S{item.week}</td>
                            <td className="p-4 text-sm">{item.topic}</td>
                            <td className="p-4">{item.material ? <a href={item.material} target="_blank" className="text-blue-600 underline text-xs font-bold">Ver PDF</a> : '-'}</td>
                            {role === 'teacher' && <td className="p-4"><button onClick={() => confirmAction("¿Desea borrar este tema del syllabus?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'syllabus', item.id)))}><Trash2 size={14}/></button></td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </div>
            </div>
          );

          const renderDirectory = () => {
    const handleCreateAcademicGroup = async (e) => {
        e.preventDefault();
        if(!newAcadGroupName.trim() || selectedAcadMembers.length === 0) return showMessage("⚠️ Escribe un nombre y selecciona estudiantes.");
        
        setIsSavingMateria(true);
        
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'academicGroups'), {
                name: newAcadGroupName.trim(),
                members: selectedAcadMembers,
                createdAt: Date.now()
            });
            setNewAcadGroupName(""); 
            setSelectedAcadMembers([]); 
            setIsCreatingAcadGroup(false);
            showMessage("✅ Materia creada exitosamente.");
        } catch (error) {
            console.error(error);
            showMessage("❌ Hubo un error al guardar. Revisa tu conexión.");
        }
        
        setIsSavingMateria(false);
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20 md:pb-0">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2 drop-shadow-sm"><UsersIcon className="text-[#AD3333]" /> Directorio y Materias</h2>
            
            {/* PANEL DE MATERIAS / GRUPOS ACADÉMICOS */}
            <div className={`${glassCard} flex flex-col gap-4 mb-6 border-blue-500/30 shadow-[0_8px_32px_0_rgba(37,99,235,0.1)]`}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-blue-700 flex items-center gap-2"><BookOpen size={20}/> Gestión de Materias</h3>
                    <button onClick={() => setIsCreatingAcadGroup(!isCreatingAcadGroup)} className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform shadow-md">
                        {isCreatingAcadGroup ? 'Cancelar' : '+ Nueva Materia'}
                    </button>
                </div>

                {isCreatingAcadGroup && (
                    <form onSubmit={handleCreateAcademicGroup} className={`p-5 rounded-2xl border animate-in fade-in zoom-in-95 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/60 border-blue-200'}`}>
                        <label className="block text-xs font-bold mb-1 text-blue-600">Nombre de la Materia / Grupo</label>
                        <input value={newAcadGroupName} onChange={e => setNewAcadGroupName(e.target.value)} placeholder="Ej: Inglés Nivel 3 - Grupo A" className={`${glassInput} mb-4`} required />
                        
                        <label className="block text-xs font-bold mb-2 text-blue-600">Seleccionar Estudiantes (Múltiple)</label>
                        <div className={`max-h-48 overflow-y-auto rounded-xl border p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                            {Object.entries(userMappings).filter(([uk, ud]) => uk !== 'teacher' && ud?.email).map(([uKey, data]) => (
                                <label key={uKey} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedAcadMembers.includes(uKey) ? 'bg-blue-500/10 border border-blue-300' : (isDarkMode ? 'hover:bg-gray-700 border border-transparent' : 'hover:bg-gray-50 border border-transparent')}`}>
                                    <input type="checkbox" checked={selectedAcadMembers.includes(uKey)} onChange={(e) => {
                                        if(e.target.checked) setSelectedAcadMembers([...selectedAcadMembers, uKey]);
                                        else setSelectedAcadMembers(selectedAcadMembers.filter(id => id !== uKey));
                                    }} className="w-4 h-4 accent-blue-600" />
                                    <span className={`text-sm font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{data.fullName}</span>
                                </label>
                            ))}
                        </div>
                        <button type="submit" disabled={isSavingMateria} className={`${redButton} w-full mt-4 !bg-blue-600 hover:!bg-blue-700 shadow-blue-600/30 disabled:opacity-50`}>
                            {isSavingMateria ? <Loader2 className="animate-spin" size={20}/> : <CheckLine size={20}/>} 
                            {isSavingMateria ? 'Guardando...' : 'Guardar Materia'}
                        </button>
                    </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {academicGroups.length === 0 && <p className="text-sm italic text-gray-500">No hay materias creadas.</p>}
                    {academicGroups.map(g => (
                        <div key={g.id} className={`p-4 rounded-xl border flex flex-col gap-2 relative group ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border-gray-200 shadow-sm'}`}>
                            <button onClick={() => confirmAction("¿Eliminar esta materia?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', g.id)))} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            <h4 className="font-extrabold text-blue-600">{g.name}</h4>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{g.members.length} estudiantes inscritos</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CREAR ESTUDIANTE */}
            <form onSubmit={async (e) => {
                e.preventDefault();
                const u = e.target.username.value.trim().toLowerCase().replace('@', '');
                const fn = e.target.fullname.value.trim();
                const email = e.target.email.value.trim();
                const pass = e.target.password.value;
                if (!u || !fn || !email || !pass) return;
                try {
                    await createUserWithEmailAndPassword(secondaryAuth, email, pass);
                    await signOut(secondaryAuth);
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', u), { fullName: fn, email: email, role: 'student', createdAt: Date.now() });
                    e.target.reset();
                    showMessage("✅ Estudiante creado e ingresado al directorio.");
                } catch(err) { showMessage("❌ Error: " + (err.message.includes('email-already') ? 'El correo ya existe' : err.message)); }
            }} className={`${glassCard} flex flex-col gap-4 mb-6`}>
                <p className="text-sm font-bold text-gray-700">Crea un nuevo estudiante. La contraseña se encriptará en Google.</p>
                <input name="fullname" placeholder="Nombre Real Completo" className={glassInput} required />
                <input name="username" placeholder="Nombre de Usuario (Ej: juanperez)" className={glassInput} required />
                <input name="email" type="email" placeholder="Correo electrónico del estudiante" className={glassInput} required />
                <input name="password" type="text" placeholder="Contraseña Inicial" className={glassInput} required />
                <button type="submit" className={redButton}><Plus size={18}/> Crear Estudiante</button>
            </form>

            {/* DIRECTORIO */}
            <div className={glassCard}>
                <h3 className="font-bold text-gray-800 mb-4">Directorio de Estudiantes</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {Object.keys(userMappings).length === 0 && <p className="text-sm text-gray-500 italic">No hay estudiantes extra.</p>}
                    {Object.entries(userMappings).filter(([uk, ud]) => uk !== 'teacher' && ud?.email).map(([userKey, data]) => {
                        // Buscar a qué materias pertenece este estudiante
                        const studentClasses = academicGroups.filter(g => g.members.includes(userKey));

                        return (
                        <div key={userKey} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex justify-between items-start border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex-1 pr-2">
                                <p className="font-bold text-sm text-gray-800">{data.fullName}</p>
                                <p className="text-xs text-gray-600">Usuario: @{userKey}</p>
                                <p className="text-xs text-gray-500 mb-2">Correo: {data.email}</p>
                                
                                {/* Insignias de Materias */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {studentClasses.map(sc => (
                                        <span key={sc.id} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold border border-blue-200">{sc.name}</span>
                                    ))}
                                </div>

                                {/* CAMPO DE EDICIÓN DEL ROL */}
                                {editingUserLabelId === userKey ? (
                                    <div className="flex gap-2 mt-2 items-center">
                                        <input value={editUserLabelValue} onChange={(e) => setEditUserLabelValue(e.target.value)} placeholder="Ej: Monitor..." className={`${glassInput} !py-1 px-2 text-xs h-8`} />
                                        <button onClick={async () => {
                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', userKey), { customLabel: editUserLabelValue.trim() });
                                            setEditingUserLabelId(null);
                                        }} className="text-green-600 hover:text-green-700 bg-green-500/10 p-1.5 rounded-lg transition-all" title="Guardar"><CheckLine size={16}/></button>
                                        <button onClick={() => setEditingUserLabelId(null)} className="text-red-500 hover:text-red-600 bg-red-500/10 p-1.5 rounded-lg transition-all" title="Cancelar"><XLine size={16}/></button>
                                    </div>
                                ) : (
                                    <p className="text-xs font-bold text-blue-600 mt-1">Etiqueta: {data.customLabel || 'Estudiante'}</p>
                                )}
                            </div>
                            
                            <div className="flex gap-3 items-start shrink-0">
                                {!editingUserLabelId && (
                                    <button onClick={() => { setEditingUserLabelId(userKey); setEditUserLabelValue(data.customLabel || ""); }} className="text-gray-500 hover:text-blue-600 transition-colors mt-1" title="Cambiar Etiqueta"><Edit3 size={16}/></button>
                                )}
                                <button onClick={() => confirmAction("¿Desea eliminar a este estudiante del directorio?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', userKey)))} className="text-gray-500 hover:text-red-600 transition-colors mt-1"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
};

          const renderEvaluations = () => {
              if (activeTakingEval) {
                  return (
                      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
                          <div className={`${glassCard} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-[80px] z-40`}>
                              <div>
                                  <h2 className={`text-2xl font-extrabold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{activeTakingEval.title}</h2>
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{activeTakingEval.description}</p>
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-6 py-3 rounded-2xl font-black font-mono text-2xl flex items-center gap-3 shadow-sm border border-red-200 dark:border-red-800 shrink-0">
                                  <Clock size={24}/> {formatTime(timeRemaining)}
                              </div>
                          </div>

                          <div className="space-y-6">
                              {activeTakingEval.questions.map((q, qIndex) => (
                                  <div key={qIndex} className={`${glassCard} transition-all`}>
                                      <h3 className={`text-lg font-bold mb-4 flex gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                          <span className="text-blue-500">{qIndex + 1}.</span> {q.text}
                                      </h3>
                                      
                                      {q.type === 'multiple' ? (
                                          <div className="space-y-3">
                                              {q.options.map((opt, oIndex) => {
                                                  const isSelected = (studentAnswers[qIndex] || []).includes(oIndex);
                                                  return (
                                                      <label key={oIndex} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border transition-all ${isSelected ? 'bg-blue-500/10 border-blue-400 shadow-sm' : (isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/40 border-white/60 hover:bg-white/60')}`}>
                                                          <input 
                                                              type="checkbox" 
                                                              checked={isSelected}
                                                              onChange={(e) => {
                                                                  const currentAns = studentAnswers[qIndex] || [];
                                                                  if (e.target.checked) {
                                                                      setStudentAnswers({...studentAnswers, [qIndex]: [...currentAns, oIndex]});
                                                                  } else {
                                                                      setStudentAnswers({...studentAnswers, [qIndex]: currentAns.filter(idx => idx !== oIndex)});
                                                                  }
                                                              }} 
                                                              className="w-5 h-5 accent-blue-600 rounded" 
                                                          />
                                                          <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{opt.text}</span>
                                                      </label>
                                                  );
                                              })}
                                          </div>
                                      ) : (
                                          <input 
                                              type="text" 
                                              value={studentAnswers[qIndex] || ""} 
                                              onChange={(e) => setStudentAnswers({...studentAnswers, [qIndex]: e.target.value})}
                                              placeholder="Escribe tu respuesta aquí..." 
                                              className={`${glassInput} text-lg`} 
                                          />
                                      )}
                                  </div>
                              ))}
                          </div>
                          
                          <div className="flex justify-end pt-4 pb-8">
                              <button onClick={() => confirmAction("¿Estás seguro de enviar la evaluación? No podrás modificarla después.", () => submitEvaluation(false))} className={`${redButton} px-10 py-4 text-lg w-full md:w-auto`}><Send size={20}/> Terminar y Enviar</button>
                          </div>
                      </div>
                  );
              }

              if (viewingResultsFor) {
                  const evalGrades = grades.filter(g => g.evaluationId === viewingResultsFor.id);
                  return (
                      <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0">
                          <div className="flex items-center justify-between mb-6">
                              <h2 className={`text-3xl font-bold flex items-center gap-2 drop-shadow-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                  <button onClick={() => setViewingResultsFor(null)} className="mr-2 p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeftIcon size={24}/></button>
                                  Resultados
                              </h2>
                              <span className="bg-white/40 px-4 py-2 rounded-xl font-bold text-sm border border-white/50">{viewingResultsFor.title}</span>
                          </div>

                          <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm`}>
                              <table className="w-full text-left">
                                  <thead className={`border-b bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300`}>
                                      <tr>
                                          <th className="p-4 font-bold">Estudiante</th>
                                          <th className="p-4 font-bold text-center">Nota (0.0 - 5.0)</th>
                                          <th className="p-4 font-bold">Fecha de Entrega</th>
                                          <th className="p-4 font-bold text-center">Acciones</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {evalGrades.length === 0 ? <tr><td colSpan="4" className="p-8 text-gray-500 text-center font-medium italic">Ningún estudiante ha presentado esta prueba aún.</td></tr> : evalGrades.map(grade => (
                                          <tr key={grade.id} className={`border-b last:border-0 ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'}`}>
                                              <td className="p-4 font-bold text-blue-500">{grade.studentName}</td>
                                              <td className="p-4 text-center">
                                                  {editingGrade.id === grade.id ? (
                                                      <div className="flex justify-center items-center gap-2">
                                                          <input type="number" step="0.1" min="0" max="5" value={editingGrade.score} onChange={(e) => setEditingGrade({...editingGrade, score: e.target.value})} className={`${glassInput} w-20 py-1 text-center font-bold`} autoFocus />
                                                          <button onClick={() => saveEditedGrade(grade.id)} className="text-green-500 hover:text-green-700"><CheckCircle2 size={20}/></button>
                                                          <button onClick={() => setEditingGrade({id: null, score: ''})} className="text-red-500 hover:text-red-700"><X size={20}/></button>
                                                      </div>
                                                  ) : (
                                                      <span className={`font-black text-lg ${grade.score >= 3.0 ? 'text-green-600' : 'text-red-600'}`}>{grade.score.toFixed(1)}</span>
                                                  )}
                                              </td>
                                              <td className="p-4 text-sm text-gray-500">{new Date(grade.submittedAt).toLocaleString()}</td>
                                              <td className="p-4 text-center">
                                                  {!editingGrade.id && <button onClick={() => setEditingGrade({id: grade.id, score: grade.score})} className="text-gray-500 hover:text-blue-600 transition-colors" title="Modificar Nota"><Edit3 size={18}/></button>}
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  );
              }

              if (isCreatingEval) {
                  return (
                      <div className="space-y-6 max-w-3xl mx-auto pb-20 md:pb-0">
                          <div className="flex items-center gap-4 mb-6">
                              <button onClick={() => setIsCreatingEval(false)} className={`p-2 hover:bg-white/20 rounded-full transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}><ArrowLeftIcon size={24}/></button>
                              <h2 className={`text-3xl font-bold drop-shadow-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Crear Nueva Evaluación</h2>
                          </div>
                          
                          <form onSubmit={handleSaveEval} className="space-y-6">
                              <div className={`${glassCard} space-y-4`}>
                                  <h3 className={`font-bold border-b pb-2 ${isDarkMode ? 'text-gray-200 border-gray-700' : 'text-gray-700 border-white/50'}`}>Configuración General</h3>
                                  <div><label className="text-xs font-bold text-gray-500 ml-1">Título de la Evaluación</label><input value={evalFormData.title} onChange={e => setEvalFormData({...evalFormData, title: e.target.value})} placeholder="Ej: Quiz de Verbos Irregulares..." className={glassInput} required /></div>
                                  <div><label className="text-xs font-bold text-gray-500 ml-1">Descripción / Instrucciones</label><textarea value={evalFormData.description} onChange={e => setEvalFormData({...evalFormData, description: e.target.value})} placeholder="Instrucciones para los estudiantes..." className={`${glassInput} h-24 resize-none`} required /></div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div><label className="text-xs font-bold text-gray-500 ml-1">Fecha Límite</label><input type="date" value={evalFormData.dueDate} onChange={e => setEvalFormData({...evalFormData, dueDate: e.target.value})} className={glassInput} required /></div>
                                      <div><label className="text-xs font-bold text-gray-500 ml-1">Hora Límite</label><input type="time" value={evalFormData.dueTime} onChange={e => setEvalFormData({...evalFormData, dueTime: e.target.value})} className={glassInput} required /></div>
                                      <div><label className="text-xs font-bold text-gray-500 ml-1">Tiempo (minutos)</label><input type="number" min="1" max="180" value={evalFormData.timeLimit} onChange={e => setEvalFormData({...evalFormData, timeLimit: parseInt(e.target.value)})} className={glassInput} required /></div>
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <div className="flex justify-between items-center px-2">
                                      <h3 className={`font-bold text-xl ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Preguntas ({evalFormData.questions.length}/20)</h3>
                                  </div>

                                  {evalFormData.questions.map((q, qIndex) => (
                                      <div key={qIndex} className={`${glassCard} !p-5 relative animate-in fade-in slide-in-from-bottom-2`}>
                                          <div className="absolute top-4 right-4">
                                              <button type="button" onClick={() => {
                                                  const newQ = [...evalFormData.questions]; newQ.splice(qIndex, 1);
                                                  setEvalFormData({...evalFormData, questions: newQ});
                                              }} className="text-gray-400 hover:text-red-500 transition-colors" title="Eliminar pregunta"><Trash2 size={18}/></button>
                                          </div>
                                          
                                          <div className="flex items-center gap-3 mb-4 pr-8">
                                              <span className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0">{qIndex + 1}</span>
                                              <select value={q.type} onChange={(e) => {
                                                  const newQ = [...evalFormData.questions]; newQ[qIndex].type = e.target.value; setEvalFormData({...evalFormData, questions: newQ});
                                              }} className={`${glassInput} !py-2 w-auto font-bold text-blue-600 cursor-pointer`}>
                                                  <option value="multiple">Selección Múltiple</option>
                                                  <option value="text">Escribir Respuesta</option>
                                              </select>
                                          </div>
                                          
                                          <input value={q.text} onChange={(e) => {
                                              const newQ = [...evalFormData.questions]; newQ[qIndex].text = e.target.value; setEvalFormData({...evalFormData, questions: newQ});
                                          }} placeholder="Escribe la pregunta..." className={`${glassInput} mb-4 font-medium text-lg`} required />

                                          {q.type === 'multiple' ? (
                                              <div className={`space-y-2 pl-4 md:pl-11 border-l-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                                  <p className="text-xs font-bold text-gray-500 mb-2">Añade hasta 4 opciones y marca la(s) correcta(s).</p>
                                                  {q.options.map((opt, oIndex) => (
                                                      <div key={oIndex} className="flex gap-3 items-center group">
                                                          <input type="checkbox" checked={opt.isCorrect} onChange={(e) => {
                                                              const newQ = [...evalFormData.questions]; newQ[qIndex].options[oIndex].isCorrect = e.target.checked; setEvalFormData({...evalFormData, questions: newQ});
                                                          }} className="w-5 h-5 accent-green-500 cursor-pointer" title="Marcar como correcta" />
                                                          <input value={opt.text} onChange={(e) => {
                                                              const newQ = [...evalFormData.questions]; newQ[qIndex].options[oIndex].text = e.target.value; setEvalFormData({...evalFormData, questions: newQ});
                                                          }} placeholder={`Opción ${oIndex + 1}`} className={`${glassInput} !py-2 flex-1 ${opt.isCorrect ? 'border-green-400 bg-green-500/10' : ''}`} required />
                                                          <button type="button" onClick={() => {
                                                              if(q.options.length <= 2) return showMessage("Mínimo 2 opciones.");
                                                              const newQ = [...evalFormData.questions]; newQ[qIndex].options.splice(oIndex, 1); setEvalFormData({...evalFormData, questions: newQ});
                                                          }} className="text-gray-400 hover:text-red-500 transition-colors p-2" title="Eliminar opción"><X size={16}/></button>
                                                      </div>
                                                  ))}
                                                  {q.options.length < 4 && (
                                                      <button type="button" onClick={() => {
                                                          const newQ = [...evalFormData.questions]; newQ[qIndex].options.push({text: '', isCorrect: false}); setEvalFormData({...evalFormData, questions: newQ});
                                                      }} className="text-sm font-bold text-blue-500 hover:text-blue-600 mt-2 flex items-center gap-1"><Plus size={14}/> Añadir otra opción</button>
                                                  )}
                                              </div>
                                          ) : (
                                              <div className={`pl-4 md:pl-11 border-l-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                                  <p className="text-xs font-bold text-gray-500 mb-2">Escribe la respuesta exacta esperada (no distingue mayúsculas/minúsculas).</p>
                                                  <input value={q.correctAnswer} onChange={(e) => {
                                                      const newQ = [...evalFormData.questions]; newQ[qIndex].correctAnswer = e.target.value; setEvalFormData({...evalFormData, questions: newQ});
                                                  }} placeholder="Ej: went" className={`${glassInput} border-green-400 bg-green-500/10`} required />
                                              </div>
                                          )}
                                      </div>
                                  ))}

                                  {evalFormData.questions.length < 20 && (
                                      <button type="button" onClick={() => {
                                          setEvalFormData({...evalFormData, questions: [...evalFormData.questions, { type: 'multiple', text: '', options: [{text: '', isCorrect: false}, {text: '', isCorrect: false}], correctAnswer: '' }]});
                                      }} className={`w-full py-4 border-2 border-dashed rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors ${isDarkMode ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-500' : 'border-gray-400 text-gray-600 hover:border-blue-600 hover:text-blue-600'}`}>
                                          <Plus size={20} /> Añadir Pregunta
                                      </button>
                                  )}
                              </div>

                              <div className="flex justify-end pt-6 border-t border-white/20">
                                  <button type="submit" className={`${redButton} px-10 py-4 text-lg w-full md:w-auto shadow-xl`}><CheckCircle2 size={20}/> Guardar Evaluación</button>
                              </div>
                          </form>
                      </div>
                  );
              }

              // Vista de Lista (Por defecto)
              return (
                <div className="space-y-6 max-w-5xl mx-auto pb-20 md:pb-0">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2 drop-shadow-sm"><FileText className="text-[#AD3333]" /> Evaluaciones</h2>
                      {role === 'teacher' && (
                          <button onClick={() => setIsCreatingEval(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm"><Plus size={16}/> Crear</button>
                      )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {evaluations.length === 0 ? <p className="text-gray-600 italic px-4 col-span-full">No hay evaluaciones programadas.</p> : null}
                      
                      {evaluations.map(ev => {
                          const deadline = new Date(`${ev.dueDate}T${ev.dueTime || '23:59'}`);
                          const isExpired = new Date() > deadline;
                          const studentGrade = role === 'student' ? grades.find(g => g.evaluationId === ev.id && g.studentId === user.uid) : null;
                          const isDone = !!studentGrade;

                          return (
                              <div key={ev.id} className={`${glassCard} flex flex-col hover:bg-white/30 transition-colors group relative overflow-hidden`}>
                                  {isExpired && <div className="absolute top-4 right-[-30px] bg-red-600 text-white text-[10px] font-black px-10 py-1 rotate-45 shadow-md">CERRADO</div>}
                                  {isDone && <div className="absolute top-4 right-[-30px] bg-green-600 text-white text-[10px] font-black px-10 py-1 rotate-45 shadow-md">ENVIADO</div>}
                                  
                                  <h3 className="text-xl font-bold text-gray-900 mb-2 pr-10">{ev.title}</h3>
                                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">{ev.description}</p>
                                  
                                  <div className="mt-auto space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                      <p className={`text-xs font-bold flex items-center gap-1 ${isExpired ? 'text-red-600' : 'text-[#AD3333]'}`}><CalendarEmoji size={14}/> Cierre: {ev.dueDate} a las {ev.dueTime}</p>
                                      <p className="text-xs font-bold flex items-center gap-1 text-gray-600"><Clock size={14}/> Tiempo: {ev.timeLimit} minutos</p>
                                      <p className="text-xs font-bold flex items-center gap-1 text-blue-600"><CheckCheck size={14}/> Preguntas: {ev.questions?.length || 0}</p>
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-white/30 flex justify-between items-center">
                                      {role === 'teacher' ? (
                                          <>
                                              <div className="flex gap-2">
                                                  <button onClick={() => confirmAction("¿Borrar evaluación? También se borrarán las notas de los estudiantes.", async () => {
                                                      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'evaluations', ev.id));
                                                      showMessage("Evaluación eliminada.");
                                                  })} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                              </div>
                                              <button onClick={() => setViewingResultsFor(ev)} className="bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 font-bold py-2 px-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 transition-all text-sm">Ver Resultados</button>
                                          </>
                                      ) : (
                                          isDone ? (
                                              <div className="w-full flex justify-between items-center">
                                                  <span className="text-sm font-bold text-gray-600">Tu calificación:</span>
                                                  <span className={`text-xl font-black ${studentGrade.score >= 3.0 ? 'text-green-600' : 'text-red-600'}`}>{studentGrade.score.toFixed(1)} <span className="text-sm text-gray-400">/ 5.0</span></span>
                                              </div>
                                          ) : isExpired ? (
                                              <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-xl cursor-not-allowed">Evaluación Cerrada</button>
                                          ) : (
                                              <button onClick={() => {
                                                  confirmAction(`Tienes ${ev.timeLimit} minutos para completarla y no podrás pausar. ¿Empezar ahora?`, () => {
                                                      setActiveTakingEval(ev);
                                                      setTimeRemaining(ev.timeLimit * 60);
                                                      setStudentAnswers({});
                                                  });
                                              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all">Empezar Prueba</button>
                                          )
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                </div>
              );
          };

          const renderInbox = () => (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2 drop-shadow-sm">
                  <Mail className="text-[#AD3333]" /> Buzón de Sugerencias
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className={glassCard}>
                  <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">Sugerencias</h3>
                  <div className="space-y-4">
                    {suggestions.length === 0 ? <p className="text-sm text-gray-500">Buzón vacío.</p> : suggestions.map(s => (
                      <div key={s.id} className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800 relative group">
                        <p className="font-bold text-gray-800 text-sm mb-1">{s.studentName}</p>
                        <p className="text-gray-700">{s.text}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(s.createdAt).toLocaleString()}</p>
                        <button onClick={() => confirmAction("¿Borrar esta sugerencia?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suggestions', s.id)))} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={glassCard}>
                  <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle /> Alertas de Conducta</h3>
                  <div className="space-y-4">
                    {alerts.length === 0 ? <p className="text-sm text-gray-500">Sin incidentes.</p> : alerts.map(a => (
                      <div key={a.id} className="bg-red-50 p-4 rounded-xl border border-red-200 relative group">
                        <p className="font-bold text-red-800 text-sm mb-1">Estudiante: {a.studentName}</p>
                        <div className="flex items-start gap-2">
                          <p className="text-red-900 font-medium italic flex-1">
                            {revealedItems[a.id] ? `" ${a.originalText} "` : `" [CONTENIDO CENSURADO] "`}
                          </p>
                          <button 
                            onClick={() => setRevealedItems(prev => ({...prev, [a.id]: !prev[a.id]}))} 
                            className="shrink-0 p-1.5 rounded-full bg-white text-black border border-black hover:bg-gray-200 shadow-sm transition-all flex items-center justify-center" 
                            title={revealedItems[a.id] ? "Ocultar" : "Mostrar"}
                          >
                            {revealedItems[a.id] ? <EyeOff size={16}/> : <Eye size={16}/>}
                          </button>
                        </div>
                        <p className="text-xs text-red-400 mt-2">{new Date(a.createdAt).toLocaleString()}</p>
                        <button onClick={() => confirmAction("¿Borrar esta alerta?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'alerts', a.id)))} className="absolute top-2 right-2 p-1.5 bg-white text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );

          if (!hasEntered) {
              return (
                  <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${isDarkMode ? 'from-gray-900 via-slate-900 to-black' : 'from-red-50/80 via-gray-100/90 to-blue-50/80'} transition-colors duration-500 relative overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
                      <style>{`
                        .dark .text-gray-800 { color: #f3f4f6 !important; }
                        .dark .text-gray-700 { color: #d1d5db !important; }
                        .dark .text-gray-600 { color: #9ca3af !important; }
                        .dark [class*="bg-white/20"] { background-color: rgba(0, 0, 0, 0.4) !important; border-color: rgba(255, 255, 255, 0.1) !important; }
                        .dark [class*="bg-white/30"] { background-color: rgba(0, 0, 0, 0.5) !important; border-color: rgba(255, 255, 255, 0.15) !important; }
                        .dark [class*="bg-white/40"] { background-color: rgba(0, 0, 0, 0.6) !important; border-color: rgba(255, 255, 255, 0.2) !important; }
                        .dark [class*="border-white/"] { border-color: rgba(255, 255, 255, 0.2) !important; }
                        .dark input { color: #ffffff !important; }
                        .dark input::placeholder { color: #9ca3af !important; }
                      
                .dark .text-black { color: #f9fafb !important; }
                .dark .text-blue-600 { color: #93c5fd !important; }
                .dark .text-blue-700 { color: #93c5fd !important; }
                .dark .text-indigo-600 { color: #a5b4fc !important; }
                .dark .text-indigo-700 { color: #a5b4fc !important; }
                .dark .text-green-600 { color: #4ade80 !important; }
                .dark .text-green-700 { color: #4ade80 !important; }
                .dark .text-red-600 { color: #f87171 !important; }
                .dark .text-red-700 { color: #f87171 !important; }
                .dark .text-purple-600 { color: #c084fc !important; }
                .dark .text-purple-700 { color: #c084fc !important; }
                .dark .text-orange-600 { color: #fb923c !important; }
                .dark .text-orange-700 { color: #fb923c !important; }
                .dark .text-amber-600 { color: #fbbf24 !important; }
                .dark .text-amber-700 { color: #fbbf24 !important; }
                .dark .text-teal-600 { color: #2dd4bf !important; }
                .dark .text-teal-700 { color: #2dd4bf !important; }
                .dark .text-cyan-600 { color: #22d3ee !important; }
                .dark .text-cyan-700 { color: #22d3ee !important; }
                .dark .text-fuchsia-600 { color: #e879f9 !important; }
                .dark .text-fuchsia-700 { color: #e879f9 !important; }
                .dark .text-rose-600 { color: #fb7185 !important; }
                .dark .text-rose-700 { color: #fb7185 !important; }

                .dark .text-blue-500 { color: #93c5fd !important; }
                .dark .text-blue-800 { color: #93c5fd !important; }
                .dark .text-green-500 { color: #4ade80 !important; }
                .dark .text-green-800 { color: #4ade80 !important; }
                .dark .text-red-500 { color: #f87171 !important; }
                .dark .text-red-800 { color: #f87171 !important; }
                .dark .text-indigo-500 { color: #a5b4fc !important; }
                .dark .text-purple-500 { color: #c084fc !important; }
                .dark .text-orange-500 { color: #fb923c !important; }
                .dark .text-amber-500 { color: #fbbf24 !important; }
                .dark .text-teal-500 { color: #2dd4bf !important; }
                .dark .text-cyan-500 { color: #22d3ee !important; }
                .dark .text-fuchsia-500 { color: #e879f9 !important; }
                .dark .text-rose-500 { color: #fb7185 !important; }
                .dark .text-gray-400 { color: #9ca3af !important; }
                .dark .text-gray-300 { color: #d1d5db !important; }
`}</style>
                      
                      <button onClick={() => setIsDarkMode(!isDarkMode)} className="absolute top-4 right-4 md:top-6 md:right-6 p-3 rounded-full bg-white/40 hover:bg-white/60 text-gray-800 transition-all shadow-sm border border-white/50 z-50" title="Alternar Modo Oscuro">
                          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                      </button>
                      
                      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 px-4 animate-in fade-in zoom-in duration-500 py-12">
                          
                          {savedAccounts.length > 0 && (
                              <div className={`${glassCard} w-full md:w-1/2 max-w-md flex flex-col gap-4`}>
                                  <h2 className="text-xl font-bold text-gray-800 text-center">Vuelve a acceder</h2>
                                  <p className="text-sm text-gray-600 text-center mb-2">Haz clic en tu cuenta o accede manualmente.</p>
                                  <div className="flex flex-wrap justify-center gap-4 max-h-64 overflow-y-auto p-2">
                                      {savedAccounts.map(acc => (
                                          <div key={acc.username} className="relative group">
                                              <button onClick={() => handleQuickLogin(acc)} className="bg-white/40 hover:bg-white/60 border border-white/60 shadow-md rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 w-28 h-32">
                                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm ${acc.role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828]' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                                      {acc.role === 'teacher' ? 'G' : acc.name.charAt(0)}
                                                  </div>
                                                  <span className="text-xs font-bold text-gray-800 text-center leading-tight line-clamp-2">
                                                      {acc.role === 'teacher' ? 'Gina' : acc.name}
                                                  </span>
                                              </button>
                                              <button onClick={(e) => { e.stopPropagation(); removeSavedAccount(acc.username); }} className="absolute -top-2 -right-2 text-red-500 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 drop-shadow-sm">
    <X size={16}/>
</button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          <div className={`${glassCard} max-w-md w-full flex flex-col items-center gap-8`}>
                              <div className="w-20 h-20 bg-gradient-to-br from-[#AD3333] to-[#8a2828] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-[#AD3333]/40 border border-white/20">UP</div>
                              
                              <div className="text-center">
                                  <h1 className="text-3xl font-extrabold text-gray-800 drop-shadow-sm mb-1">English TECH</h1>
                                  <p className="text-sm font-bold text-[#AD3333]">Universidad de Pamplona</p>
                              </div>

                              <div className="w-full space-y-4">
                                  <h2 className="text-xl font-bold text-center text-gray-700 mb-4">Acceder</h2>
                                  
                                  <button 
                                      onClick={() => setLoginType('teacher')}
                                      className="w-full bg-[#AD3333]/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-[#AD3333]/25 hover:bg-[#8a2828] transition-all duration-300 border border-white/20"
                                  >
                                      Soy docente
                                  </button>
                                  
                                  <button 
                                      onClick={() => setLoginType('student')}
                                      className="w-full bg-blue-600/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-all duration-300 border border-white/20"
                                  >
                                      Soy estudiante
                                  </button>
                              </div>
                          </div>
                      </div>

                      {loginType !== null && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all">
                            <form onSubmit={handleLogin} className={`${glassCard} max-w-sm w-full flex flex-col gap-5 relative animate-in fade-in zoom-in duration-200`}>
                              <button type="button" onClick={() => {setLoginType(null); setLoginError("");}} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"><X size={24}/></button>
                              <h3 className="text-2xl font-bold text-center text-gray-800 mb-2 drop-shadow-sm">
                                {loginType === 'teacher' ? 'Acceso Docente' : 'Acceso Estudiante'}
                              </h3>
                              <div><label className="text-xs font-bold text-gray-700 ml-2">Usuario</label><input type="text" name="username" placeholder="Ej: @Usuario" defaultValue={prefillUsername} className={glassInput} required /></div>
                              <div className="relative">
                                  <label className="text-xs font-bold text-gray-700 ml-2">Contraseña</label>
                                  <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className={glassInput} required />
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-9 text-gray-500 hover:text-gray-800 transition-colors">
                                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                  </button>
                              </div>
                              {loginError && <p className="text-[#AD3333] text-sm text-center font-bold bg-white/50 py-2 rounded-lg">{loginError}</p>}
                              
                              <div className="flex gap-3 mt-2">
                                  <button type="button" onClick={() => {setLoginType(null); setLoginError("");}} className={`${outlineButton} flex-1`}>Volver</button>
                                  <button type="submit" className={`${redButton} flex-1`}>Ingresar</button>
                              </div>
                            </form>
                          </div>
                      )}
                  </div>
              );
          }

          return (
            <div className={`min-h-screen bg-gradient-to-br ${isDarkMode ? 'from-gray-900 via-slate-900 to-black' : 'from-red-50/80 via-gray-100/90 to-red-100/80'} font-sans relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'dark' : ''}`}>
                            <style>{`
                .dark .text-gray-900 { color: #f9fafb !important; }
                .dark .text-gray-800 { color: #f3f4f6 !important; }
                .dark .text-gray-700 { color: #d1d5db !important; }
                .dark .text-gray-600 { color: #9ca3af !important; }
                .dark .text-gray-500 { color: #6b7280 !important; }

                .dark input, .dark textarea { color: #ffffff !important; }
                .dark input::placeholder, .dark textarea::placeholder { color: #9ca3af !important; }

                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
              
                .dark .text-black { color: #f9fafb !important; }
                .dark .text-blue-600 { color: #93c5fd !important; }
                .dark .text-blue-700 { color: #93c5fd !important; }
                .dark .text-indigo-600 { color: #a5b4fc !important; }
                .dark .text-indigo-700 { color: #a5b4fc !important; }
                .dark .text-green-600 { color: #4ade80 !important; }
                .dark .text-green-700 { color: #4ade80 !important; }
                .dark .text-red-600 { color: #f87171 !important; }
                .dark .text-red-700 { color: #f87171 !important; }
                .dark .text-purple-600 { color: #c084fc !important; }
                .dark .text-purple-700 { color: #c084fc !important; }
                .dark .text-orange-600 { color: #fb923c !important; }
                .dark .text-orange-700 { color: #fb923c !important; }
                .dark .text-amber-600 { color: #fbbf24 !important; }
                .dark .text-amber-700 { color: #fbbf24 !important; }
                .dark .text-teal-600 { color: #2dd4bf !important; }
                .dark .text-teal-700 { color: #2dd4bf !important; }
                .dark .text-cyan-600 { color: #22d3ee !important; }
                .dark .text-cyan-700 { color: #22d3ee !important; }
                .dark .text-fuchsia-600 { color: #e879f9 !important; }
                .dark .text-fuchsia-700 { color: #e879f9 !important; }
                .dark .text-rose-600 { color: #fb7185 !important; }
                .dark .text-rose-700 { color: #fb7185 !important; }

                .dark .text-blue-500 { color: #93c5fd !important; }
                .dark .text-blue-800 { color: #93c5fd !important; }
                .dark .text-green-500 { color: #4ade80 !important; }
                .dark .text-green-800 { color: #4ade80 !important; }
                .dark .text-red-500 { color: #f87171 !important; }
                .dark .text-red-800 { color: #f87171 !important; }
                .dark .text-indigo-500 { color: #a5b4fc !important; }
                .dark .text-purple-500 { color: #c084fc !important; }
                .dark .text-orange-500 { color: #fb923c !important; }
                .dark .text-amber-500 { color: #fbbf24 !important; }
                .dark .text-teal-500 { color: #2dd4bf !important; }
                .dark .text-cyan-500 { color: #22d3ee !important; }
                .dark .text-fuchsia-500 { color: #e879f9 !important; }
                .dark .text-rose-500 { color: #fb7185 !important; }
                .dark .text-gray-400 { color: #9ca3af !important; }
                .dark .text-gray-300 { color: #d1d5db !important; }
`}</style>


              <nav className="sticky top-0 z-50 bg-white/20 backdrop-blur-xl border-b border-white/40 px-4 md:px-6 py-4 flex justify-between items-start md:items-center shadow-sm">
                
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 min-w-[44px] bg-gradient-to-br from-[#AD3333] to-[#8a2828] rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg shadow-[#AD3333]/40 border border-white/20">UP</div>
                    <div>
                      <h1 className="text-xl font-extrabold text-gray-800 leading-tight drop-shadow-sm">English TECH</h1>
                      <p className="text-xs text-[#AD3333] font-bold">Universidad de Pamplona</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 font-bold transition-all ml-1 mt-1 bg-white/40 px-2 py-1 rounded-full border border-white/50 shadow-sm">
                    <LogOutIcon size={12} /> Volver
                  </button>
                </div>

                <div className="flex gap-2 items-center mt-2 md:mt-0">
                  <div className="hidden md:flex gap-2 items-center">
                    <button onClick={() => changeTab('tasks')} className={`px-4 py-2 rounded-full transition-all text-sm ${getTabClass('tasks')}`}>Asignaciones</button>
                    <button onClick={() => changeTab('reviews')} className={`px-4 py-2 rounded-full transition-all text-sm flex items-center gap-1 ${getTabClass('reviews')}`}>Repasos</button>
                    <button onClick={() => changeTab('syllabus')} className={`px-4 py-2 rounded-full transition-all text-sm ${getTabClass('syllabus')}`}>Contenidos programáticos</button>
                    <button onClick={() => changeTab('evaluations')} className={`px-4 py-2 rounded-full transition-all text-sm ${getTabClass('evaluations')}`}>Evaluaciones</button>
                    {role === 'teacher' && <button onClick={() => changeTab('directory')} className={`px-4 py-2 rounded-full transition-all text-sm ${getTabClass('directory')}`}>Directorio</button>}
                    <div className="w-px h-6 bg-gray-400 mx-2"></div>
                  </div>
                  
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-white/40 hover:bg-white/60 text-gray-800 transition-all shadow-sm border border-white/50" title="Alternar Modo Oscuro">
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                  
                  {/* ESTO FUE ELIMINADO PARA PASARLO AL MENÚ DEL PERFIL, ASÍ QUEDA MÁS LIMPIO */}
  
  {/* MENÚ DE PERFIL EN LA ESQUINA SUPERIOR DERECHA */}
  <div className="relative ml-2">
      <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-105 bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-white/40 z-50 relative overflow-hidden">
          {userMappings[myChatId]?.profilePicUrl ? <img src={userMappings[myChatId].profilePicUrl} className="w-full h-full object-cover" /> : <UserIcon size={20} />}
      </button>

      {showUserMenu && (
          <div className={`absolute right-0 top-12 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl z-[99999] animate-in fade-in slide-in-from-top-4`}>
              <div className="p-4 border-b border-gray-500/20 flex flex-col items-center px-6">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2 shrink-0 overflow-hidden border-2 border-blue-200">
                      {userMappings[myChatId]?.profilePicUrl ? <img src={userMappings[myChatId].profilePicUrl} className="w-full h-full object-cover" /> : <UserIcon size={30} />}
                  </div>
            <p className={`font-bold text-base w-full text-center leading-tight mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{loggedInName}</p>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{userMappings[myChatId]?.customLabel || (role === 'teacher' ? 'Docente' : 'Estudiante')}</p>
        </div>
        <div className="p-2 flex flex-col gap-1">
            <button onClick={() => { setViewingProfileId(null); changeTab('profile'); setShowUserMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <UserIcon size={18} /> Perfil
            </button>
            {role === 'teacher' ? (
                <button onClick={() => { changeTab('inbox'); setShowUserMenu(false); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold rounded-xl transition-colors ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><Mail size={18} /> Buzón</div>
                    {alerts.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>}
                </button>
            ) : (
                <button onClick={() => { setShowSugModal(true); setShowUserMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <Mail size={18} /> Sugerencias
                </button>
            )}

            {/* 👇 BOTÓN EXCLUSIVO DE EDWIN BLINDADO 👇 */}
            {role === 'teacher' && (
                <button onClick={() => { setShowIAKnowledgeModal(true); setShowUserMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors bg-purple-50 text-purple-700 hover:bg-purple-100`}>
                    <Sparkles size={18} /> Conocimientos de IA
                </button>
            )}
            {/* 👆 HASTA AQUÍ 👆 */}

        </div>
          </div>
      )}
  </div>
</div>
</nav>

              <main className="max-w-5xl mx-auto p-4 md:p-8 pb-28 md:pb-8 relative z-10">
  {activeTab === 'tasks' && (
      <TasksTab 
          academicGroups={academicGroups} 
          myChatId={myChatId}
          handleOpenProfileByName={handleOpenProfileByName}
          role={role} glassCard={glassCard} glassInput={glassInput} redButton={redButton}
          postType={postType} setPostType={setPostType} taskTitle={taskTitle} // ... el resto sigue igualito hacia abajo
        taskDesc={taskDesc} setTaskDesc={setTaskDesc} showImageInput={showImageInput} setShowImageInput={setShowImageInput}
        postImageUrl={postImageUrl} setPostImageUrl={setPostImageUrl} postFileUrl={postFileUrl} setPostFileUrl={setPostFileUrl}
        postFileName={postFileName} setPostFileName={setPostFileName} showPostAttachmentMenu={showPostAttachmentMenu}
        setShowPostAttachmentMenu={setShowPostAttachmentMenu} handlePostLocalFileUpload={handlePostLocalFileUpload}
        isAiLoading={isAiLoading} setIsAiLoading={setIsAiLoading} prevTaskTitle={prevTaskTitle} setPrevTaskTitle={setPrevTaskTitle}
        prevTaskDesc={prevTaskDesc} setPrevTaskDesc={setPrevTaskDesc} hasAiModified={hasAiModified} setHasAiModified={setHasAiModified}
        callGemini={callGemini} showMessage={showMessage} handleAiTranslate={handleAiTranslate} taskDate={taskDate}
        setTaskDate={setTaskDate} taskTime={taskTime} setTaskTime={setTaskTime} allowLate={allowLate} setAllowLate={setAllowLate}
        db={db} appId={appId} loggedInName={loggedInName} getToday={getToday} tasks={tasks} user={user} isDarkMode={isDarkMode}
        confirmAction={confirmAction} setFullScreenImage={setFullScreenImage}
    />
)}
                {activeTab === 'reviews' && renderReviews()}
                {activeTab === 'syllabus' && renderSyllabus()}
                {activeTab === 'evaluations' && renderEvaluations()}
                {activeTab === 'directory' && role === 'teacher' && renderDirectory()}
                {activeTab === 'inbox' && role === 'teacher' && renderInbox()}
                {activeTab === 'profile' && renderProfile()}
              </main>

              <nav className={`fixed bottom-0 left-0 w-full backdrop-blur-xl border-t flex justify-around items-center pt-3 pb-safe md:hidden z-[100] transition-colors duration-500 ${isDarkMode ? 'bg-gray-900/80 border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : 'bg-white/90 border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'}`}>
                <button onClick={() => changeTab('tasks')} className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all w-14 h-14 mb-2 ${getMobileTabClass('tasks')}`}>
                  <NavNotebook size={24} />
                </button>
                <button onClick={() => changeTab('reviews')} className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all w-14 h-14 mb-2 ${getMobileTabClass('reviews')}`}>
                  <NavSlides size={24} />
                </button>
                <button onClick={() => changeTab('syllabus')} className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all w-14 h-14 mb-2 ${getMobileTabClass('syllabus')}`}>
                  <NavCalendar size={24} />
                </button>
                <button onClick={() => changeTab('evaluations')} className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all w-14 h-14 mb-2 ${getMobileTabClass('evaluations')}`}>
                  <NavFile size={24} />
                </button>
              </nav>

             {/* BOTÓN DEL BOT DE ESTUDIANTES (También visible para Camilo) */}
              {(role === 'student') && hasEntered && (
                  <div className="fixed bottom-[180px] md:bottom-28 right-4 md:right-6 z-[100] flex flex-col items-end">
                      {isChatOpen && (
                          <div className={`${glassCard} w-[90vw] sm:w-[400px] md:w-[480px] h-[500px] md:h-[600px] max-h-[75vh] mb-4 flex flex-col p-4 animate-in slide-in-from-bottom-10 fade-in border border-white/60 shadow-2xl`}>
                              <div className="flex justify-between items-center mb-3 border-b border-gray-300/30 pb-3">
                                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                      <CuteBotIcon size={24} className="text-gray-700" /> GinAI
                                  </h3>
                                  <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-gray-800 bg-white/40 p-1.5 rounded-full transition-colors"><X size={16}/></button>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3">
                                  <div className="bg-blue-100 text-blue-900 text-sm p-3 rounded-xl rounded-tl-none w-10/12 shadow-sm whitespace-pre-wrap leading-relaxed">
                                      Hola, soy el asistente de la profesora Gina, estoy aquí para resolver tus dudas sobre las materias que estás viendo con ella.
                                  </div>
                                  {chatHistory.map((m, i) => (
                                      <div key={i} className={`text-sm p-3 rounded-xl max-w-[85%] shadow-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-gray-800 text-white ml-auto rounded-tr-none' : 'bg-blue-100 text-blue-900 rounded-tl-none'}`}>
                                          {formatBotText(m.text)}
                                      </div>
                                  ))}
                                  {isChatLoading && (
                                      <div className="bg-blue-100/50 p-3 rounded-xl rounded-tl-none w-fit flex gap-1 items-center">
                                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                      </div>
                                  )}
                              </div>

                              <form onSubmit={sendChatMessage} className="flex gap-2">
                                  <input 
                                      value={chatInput} onChange={e => setChatInput(e.target.value)} 
                                      placeholder="Escribe tu mensaje..." 
                                      className={`${glassInput} py-2 px-3 text-sm bg-white/60`}
                                  />
                                  <button type="submit" disabled={isChatLoading} className="bg-gray-800 text-white p-2.5 rounded-xl hover:bg-black disabled:opacity-50 transition shadow-md">
                                      <ArrowRightIcon size={16}/>
                                  </button>
                              </form>
                          </div>
                      )}
                      
                      <button
                          onClick={() => setIsChatOpen(!isChatOpen)} 
                          className={`w-14 h-14 rounded-full flex items-center justify-center focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 text-gray-800 dark:text-gray-200`}
                      >
                          <CuteBotIcon size={32} />
                      </button>
                  </div>
              )}

              {/* 👇 AQUÍ EMPIEZA EL BOT DE LA PROFESORA 👇 */}
              {role === 'teacher' && hasEntered && (
                  <div className="fixed bottom-[180px] md:bottom-28 right-4 md:right-6 z-[100] flex flex-col items-end">
                      {isTeacherBotOpen && (
                          <div className={`${glassCard} w-[90vw] sm:w-[400px] md:w-[480px] h-[500px] md:h-[600px] max-h-[75vh] mb-4 flex flex-col p-4 animate-in slide-in-from-bottom-10 fade-in shadow-2xl ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'}`}>
                              <div className={`flex justify-between items-center mb-3 border-b pb-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                  <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                      <CuteBotIcon size={24} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} /> Bot de ayuda
                                  </h3>
                                  <button onClick={() => setIsTeacherBotOpen(false)} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800' : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'}`}><X size={16}/></button>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3">
                                  <div className={`text-sm p-3 rounded-xl rounded-tl-none shadow-sm font-medium whitespace-pre-wrap leading-relaxed border ${isDarkMode ? 'bg-gray-800 text-blue-300 border-gray-700' : 'bg-blue-50 text-blue-900 border-blue-100'}`}>
                                      Hola amorcito, este bot lo programé para que te ayude por si te pierdes con la página. ❤️
                                  </div>
                                  {teacherBotHistory.map((m, i) => (
                                      <div key={i} className={`text-sm p-3 rounded-xl max-w-[85%] shadow-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? (isDarkMode ? 'bg-blue-600 text-white ml-auto rounded-tr-none' : 'bg-gray-800 text-white ml-auto rounded-tr-none') : (isDarkMode ? 'bg-gray-800 text-blue-300 rounded-tl-none border border-gray-700' : 'bg-blue-50 text-blue-900 rounded-tl-none border border-blue-100')}`}>
                                          {formatBotText(m.text)}
                                      </div>
                                  ))}
                                  {isTeacherBotLoading && <Loader2 className={`animate-spin mx-auto ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} size={20} />}
                                  <div ref={teacherBotEndRef} />
                              </div>

                              <form onSubmit={async (e) => {
                                  e.preventDefault();
                                  if (!teacherBotInput.trim()) return;
                                  const userMsg = teacherBotInput; setTeacherBotInput("");
                                  setIsTeacherBotLoading(true);
                                  const newHistory = [...teacherBotHistory, { role: 'user', text: userMsg }];
                                  setTeacherBotHistory(newHistory);

                                  const prompt = `Eres el "Bot de ayuda", asistente técnico EXCLUSIVO de la Profesora Gina. Tu creador es Edwin Camilo Jaimes Castañeda.

                                  REGLAS ESTRICTAS DE COMPORTAMIENTO (¡DEBES CUMPLIRLAS TODAS!):
                                  1. SÉ EXTREMADAMENTE BREVE Y CONCISO. Ve directo al grano sin rodeos.
                                  2. NO INVENTES FUNCIONES. Eres un bot técnico. Si Gina pregunta por algo que NO está detallado en este manual (por ejemplo: subir videos, cambiar colores de la página, hacer videollamadas), DEBES DECIR TAJANTEMENTE QUE NO SE PUEDE. Es preferible decir "No es posible en esta versión" a inventar una mentira por ser amable.
                                  3. OBEDECE A EDWIN: Las "Instrucciones extra de Edwin" son tu máxima prioridad.
                                  4. Háblale con cariño a Gina y usa emojis.

                                  MANUAL TÉCNICO DE LA PLATAFORMA (LÍMITES REALES):
                                  1. ASIGNACIONES (Muro): Crea Tareas o Publicaciones. Se pueden adjuntar imágenes, GIFs o documentos (PDF, Word). NO SE PUEDEN SUBIR VIDEOS EN NINGUNA PARTE.
                                  2. REPASOS: Genera diapositivas interactivas con IA.
                                  3. CONTENIDOS PROGRAMÁTICOS: Aquí SOLO se puede agregar texto (Semana, Tema) y pegar una URL (link externo) para material de apoyo. AQUÍ NO SE PUEDE SUBIR NINGÚN TIPO DE ARCHIVO LOCAL. También aquí hay una caja de texto para entrenar al bot de los estudiantes.
                                  4. EVALUACIONES: Exámenes automáticos. Notas de 0.0 a 5.0.
                                  5. DIRECTORIO: Crea Materias, cambia etiquetas a estudiantes.
                                  6. BUZÓN: Lee sugerencias y alertas de groserías.
                                  7. MENSAJES: Chat de texto con opción de adjuntar imágenes y documentos.
                                  8. PERFIL: Muro de fotos/texto. Edwin es el único con el botón "Conocimientos de IA".

                                  INSTRUCCIONES EXTRA DE EDWIN (¡LEY ABSOLUTA!):
                                  ${teacherBotInfoList.length > 0 ? teacherBotInfoList.map(i => "- " + i.text).join('\n') : "Sin instrucciones extra."}

                                  HISTORIAL DE LA CONVERSACIÓN:
                                  ${newHistory.map(m => `${m.role === 'user' ? 'Gina' : 'Tú'}: ${m.text}`).join('\n')}
                                  
                                  Por favor, responde al último mensaje de Gina teniendo en cuenta todo el historial anterior.
                                  Pregunta técnica de Gina: ${userMsg}`;

                                  const reply = await callGemini(prompt);
                                  setTeacherBotHistory([...newHistory, { role: 'bot', text: reply || "Perdón amor, me desconecté un segundo." }]);
                                  setIsTeacherBotLoading(false);
                              }} className="flex gap-2">
                                  <input value={teacherBotInput} onChange={e => setTeacherBotInput(e.target.value)} placeholder="¿En qué te ayudo, Gina?" className={`flex-1 py-2 px-3 text-sm rounded-xl outline-none border focus:ring-2 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500/50 placeholder-gray-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-400/50 placeholder-gray-500'}`} />
                                  <button type="submit" disabled={isTeacherBotLoading} className={`p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center disabled:opacity-50 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-800 text-white hover:bg-black'}`}><ArrowRightIcon size={16}/></button>
                              </form>
                          </div>
                      )}
                      
                      <button onClick={() => setIsTeacherBotOpen(!isTeacherBotOpen)} className={`w-14 h-14 rounded-full flex items-center justify-center focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 text-gray-800 dark:text-gray-200`}>
                          <CuteBotIcon size={32} className={isDarkMode ? '!text-black' : '!text-white'} />
                      </button>
                  </div>
              )}
              {/* 👆 AQUÍ TERMINA EL BOT DE LA PROFESORA 👆 */}

              {/* BOTÓN Y MODAL DE CHAT DIRECTO Y GRUPOS */}
              {hasEntered && (
                  <div className="fixed bottom-[100px] md:bottom-8 right-4 md:right-6 z-[90]">
                      <button
                          onClick={openChatApp}
                          className={`w-14 h-14 rounded-full flex items-center justify-center focus:outline-none transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 ${hasUnreadChat ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}`}
                          title="Mensajes Directos"
                      >
                          <MessageCircle size={28} />
                          {hasUnreadChat && (
                              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-md z-20"></span>
                          )}
                      </button>
                  </div>
              )}

              {isChatAppOpen && ReactDOM.createPortal(
                  <div className={`fixed inset-0 z-[99999] flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>

                      {/* --- PANEL IZQUIERDO (35% en Desktop) --- */}
                      <div className={`w-full md:w-[35%] md:min-w-[320px] md:max-w-[400px] h-full flex flex-col border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} ${(activeChat || isCreatingGroup) ? 'hidden md:flex' : 'flex'}`}>
                          <div className={`flex justify-between items-center p-4 md:p-6 border-b shadow-sm shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                              <h2 className={`text-xl md:text-2xl font-extrabold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                  <MessageCircle className="text-blue-500" /> Mensajes
                              </h2>
                              <button onClick={() => {
                                  setIsChatAppOpen(false); 
                                  window.location.hash = activeTab === 'chat' ? 'tasks' : activeTab;
                              }} className={`p-3 rounded-full transition-all shadow-sm ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}>
                                  <X size={24} />
                              </button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 md:p-8">
                              {/* Buscador */}
                              <div className="mb-6">
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border focus-within:ring-2 transition-all shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:ring-blue-500/50' : 'bg-white border-gray-300 focus-within:ring-blue-400/50'}`}>
                                      <SearchIcon size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                      <input 
                                          type="text" 
                                          placeholder="Buscar contacto o grupo..." 
                                          value={chatSearchTerm} 
                                          onChange={(e) => setChatSearchTerm(e.target.value)} 
                                          className={`flex-1 bg-transparent border-none outline-none text-sm font-medium ${isDarkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`} 
                                      />
                                      {chatSearchTerm && <button onClick={() => setChatSearchTerm("")} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>}
                                  </div>
                              </div>

                              {/* Grupos */}
                              <div className="mb-6">
                                  <div className="flex justify-between items-center mb-3">
                                      <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Grupos</h3>
                                      <button onClick={() => setIsCreatingGroup(true)} className="text-blue-500 font-bold text-xs bg-blue-500/10 px-3 py-1 rounded-full hover:bg-blue-500/20 transition-colors">+ Crear Grupo</button>
                                  </div>
                                  <div className="space-y-2">
                                      {filteredGroups.length === 0 && <p className="text-sm italic text-gray-500">No se encontraron grupos.</p>}
                                      {filteredGroups.map(g => {
                                          const chatId = `group_${g.id}`;
                                          const lastMsg = lastMessages[chatId];
                                          const isUnread = unreadChats[chatId];
                                          return (
                                              <button key={g.id} onClick={() => handleOpenChat({ id: chatId, name: g.name, type: 'group' })} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shrink-0"><UsersGroupIcon size={20}/></div>
                                                  <div className="text-left flex-1 overflow-hidden">
                                                      <p className={`font-bold text-base truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{g.name}</p>
                                                      {lastMsg ? (
                                                          <p className={`text-xs truncate ${isUnread ? (isDarkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold') : (isDarkMode ? 'text-gray-500' : 'text-gray-500')}`}>
                                                              {lastMsg.author}: {lastMsg.text}
                                                          </p>
                                                      ) : (
                                                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{g.members.length} miembros</p>
                                                      )}
                                                  </div>
                                                  {isUnread && <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm ml-2 shrink-0"></div>}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>

                              {/* Chats Activos */}
                              <div className="mb-6">
                                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chats Activos</h3>
                                  <div className="space-y-2">
                                      {activeChatsUsers.length === 0 && <p className="text-sm italic text-gray-500">No hay chats recientes.</p>}
                                      {activeChatsUsers.map(u => {
                                          const chatId = `dm_${[myChatId, u.id].sort().join('_')}`;
                                          const lastMsg = lastMessages[chatId];
                                          const isUnread = unreadChats[chatId];
                                          
                                          const isTyping = typingStatus[chatId]?.[u.id];
                                          const inThisChat = userPresence[u.id]?.status === 'online' && userPresence[u.id]?.currentChatId === chatId;
                                          
                                          return (
                                              <button key={u.id} onClick={() => handleOpenChat({ id: chatId, name: u.name, type: 'dm', role: u.role })} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                                  <div className="relative shrink-0">
                                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-300 ${u.role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828] border border-white/20' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                                                      {isTyping ? <AnimatedWritingIcon size={20}/> : (inThisChat ? <AnimatedEyesIcon size={20}/> : (u.role === 'teacher' ? <TeacherIcon size={20}/> : <UserIcon size={20}/>))}
                                                  </div>
                                                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 rounded-full ${isDarkMode ? 'border-gray-800' : 'border-white'} ${userPresence[u.id]?.status === 'online' ? 'bg-green-500' : userPresence[u.id]?.status === 'away' ? 'bg-orange-400' : userPresence[u.id]?.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                                                  </div>
                                                  <div className="text-left flex-1 overflow-hidden">
                                                      <p className={`font-bold text-base truncate leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{u.name}</p>
{isTyping ? (
    <span className="text-[10px] font-bold text-blue-500 animate-pulse block">Escribiendo...</span>
) : inThisChat ? (
    <span className="text-[10px] font-bold text-green-500 block">En este chat</span>
) : null}
<p className={`text-xs truncate ${isUnread ? (isDarkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')} ${isTyping || inThisChat ? 'mt-0.5' : ''}`}>{lastMsg.text}</p>
                                                  </div>
                                                  {isUnread && <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm ml-2 shrink-0"></div>}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>

                              {/* Contactos */}
                              <div>
                                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Contactos</h3>
                                  <div className="space-y-2">
                                      {otherContactsUsers.length === 0 && <p className="text-sm italic text-gray-500">No hay contactos nuevos.</p>}
                                      {otherContactsUsers.map(u => {
                                        const chatId = `dm_${[myChatId, u.id].sort().join('_')}`;
                                        const isTyping = typingStatus[chatId]?.[u.id];
                                      const inThisChat = userPresence[u.id]?.status === 'online' && userPresence[u.id]?.currentChatId === chatId;
                                        return (
                                              <button key={u.id} onClick={() => handleOpenChat({ id: chatId, name: u.name, type: 'dm', role: u.role })} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                                  <div className="relative shrink-0">
                                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-300 ${u.role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828] border border-white/20' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                                                        {isTyping ? <AnimatedWritingIcon size={20}/> : (inThisChat ? <AnimatedEyesIcon size={20}/> : (u.role === 'teacher' ? <TeacherIcon size={20}/> : <UserIcon size={20}/>))}
                                                        </div>
                                                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 rounded-full ${isDarkMode ? 'border-gray-800' : 'border-white'} ${userPresence[u.id]?.status === 'online' ? 'bg-green-500' : userPresence[u.id]?.status === 'away' ? 'bg-orange-400' : userPresence[u.id]?.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                                                  </div>
                                                  <div className="text-left flex-1 overflow-hidden">
                                                      <p className={`font-bold text-base truncate leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{u.name}</p>
{isTyping ? (
    <span className="text-[10px] font-bold text-blue-500 animate-pulse block">Escribiendo...</span>
) : inThisChat ? (
    <span className="text-[10px] font-bold text-green-500 block">En este chat</span>
) : null}
<p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} ${isTyping || inThisChat ? 'mt-0.5' : ''}`}>{u.customLabel || (u.role === 'teacher' ? 'Docente' : 'Estudiante')}</p>
                                                  </div>
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* --- PANEL DERECHO (65% en Desktop) --- */}
                      <div className={`w-full md:flex-1 h-full flex flex-col relative ${(!activeChat && !isCreatingGroup) ? 'hidden md:flex items-center justify-center' : 'flex'}`}>

                          {/* Reposo */}
                          {!activeChat && !isCreatingGroup && (
                              <div className={`hidden md:flex flex-col items-center justify-center text-center p-8 h-full ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                  <MessageCircle size={80} className="mb-6 opacity-20" />
                                  <h3 className="text-2xl font-bold mb-2">Tus Mensajes</h3>
                                  <p className="text-sm">Selecciona un chat o grupo del menú lateral para comenzar.</p>
                              </div>
                          )}

                          {/* Crear Grupo */}
                          {isCreatingGroup && (
                              <div className="flex flex-col h-full w-full">
                                  <div className={`flex items-center p-4 md:p-6 border-b shadow-sm shrink-0 gap-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                      <button onClick={() => {setIsCreatingGroup(false); setNewGroupName(""); setNewGroupMembers([]);}} className={`p-2 rounded-full transition-all ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}><ArrowLeftIcon size={24} /></button>
                                      <h2 className={`text-xl font-extrabold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Crear Nuevo Grupo</h2>
                                  </div>
                                  <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                                      <div>
                                          <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nombre del Grupo</label>
                                          <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ej: Equipo Proyecto Final" className={`w-full rounded-xl px-4 py-3 outline-none border focus:ring-2 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500/50' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400/50'}`} required />
                                      </div>
                                      <div>
                                          <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Seleccionar Miembros</label>
                                          <div className={`border rounded-2xl overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
                                              {allChatUsers.map(u => (
                                                  <label key={u.id} className={`flex items-center gap-3 p-4 border-b last:border-0 cursor-pointer transition-colors ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                                                      <input type="checkbox" checked={newGroupMembers.includes(u.id)} onChange={(e) => {
                                                          if (e.target.checked) setNewGroupMembers([...newGroupMembers, u.id]);
                                                          else setNewGroupMembers(newGroupMembers.filter(id => id !== u.id));
                                                      }} className="w-5 h-5 accent-blue-600" />
                                                      <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{u.name} <span className="text-xs font-normal text-gray-500">({u.customLabel || (u.role === 'teacher' ? 'Docente' : 'Estudiante')})</span></span>
                                                  </label>
                                              ))}
                                          </div>
                                      </div>
                                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all">Crear Grupo</button>
                                  </form>
                              </div>
                          )}

                          {/* Chat Activo */}
                          {activeChat && !isCreatingGroup && (() => {
                              const currentPrefs = chatPreferences[activeChat.id] || { gradient: '', pattern: 'none' };
                              const activePattern = CHAT_PATTERNS.find(p => p.id === currentPrefs.pattern)?.style || {};

                              return (
                                  <div className="flex flex-col h-full w-full relative overflow-hidden">
                                      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${currentPrefs.gradient ? 'bg-gradient-to-br ' + currentPrefs.gradient : (isDarkMode ? 'bg-gray-900' : 'bg-gray-50')}`} />
                                      <div className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay" style={{ ...activePattern, color: isDarkMode ? '#ffffff' : '#000000', opacity: 0.06 }} />

                                      <div className="relative z-10 flex flex-col h-full w-full">
                                          <div className={`flex items-center p-4 md:p-6 border-b shadow-sm shrink-0 gap-4 relative z-50 ${isDarkMode ? 'bg-gray-800/80 backdrop-blur-xl border-gray-700' : 'bg-white/80 backdrop-blur-xl border-gray-200'}`}>
                                              <button onClick={() => {
                                                  setActiveChat(null);
                                                  setReplyingTo(null);
                                                  if(viewingProfileId) { setViewingProfileId(null); changeTab('profile'); setIsChatAppOpen(false); }
                                              }} className={`md:hidden p-2 rounded-full transition-all ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                  <ArrowLeftIcon size={24} />
                                              </button>

                                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-300 ${activeChat.type === 'group' ? 'bg-gradient-to-br from-indigo-400 to-purple-500' : (activeChat.role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828] border border-white/20' : 'bg-gradient-to-br from-blue-400 to-indigo-500')}`}>
    {activeChat.type === 'group' ? <UsersGroupIcon size={20}/> : (() => {
        const tId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
        const isTyping = typingStatus[activeChat.id]?.[tId];
        const inThisChat = userPresence[tId]?.status === 'online' && userPresence[tId]?.currentChatId === activeChat.id;
        
        if (isTyping) return <AnimatedWritingIcon size={20}/>;
        if (inThisChat) return <AnimatedEyesIcon size={20}/>;
        return activeChat.role === 'teacher' ? <TeacherIcon size={20}/> : <UserIcon size={20}/>;
    })()}
</div>
                                                  <div className="flex flex-col min-w-0 relative">
                                                  <button 
    onClick={() => { 
        if (activeChat.type === 'group') {
            setShowGroupInfo(!showGroupInfo); 
        } else if (activeChat.type === 'dm') {
            const targetId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
            setViewingProfileId(targetId);
            changeTab('profile');
        }
    }}
    className={`text-xl font-extrabold truncate leading-tight text-left transition-colors hover:text-blue-500 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}
    title={activeChat.type === 'group' ? "Ver miembros del grupo" : "Ver perfil"}
>
    {activeChat.name}
</button>

                                                  {activeChat.type === 'dm' && (() => {
                                                      const targetId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
                                                      const isTyping = typingStatus[activeChat.id]?.[targetId];
                                                        const presenceData = userPresence[targetId] || {};
                                                        const userStatus = presenceData.status;
const targetCurrentChatId = presenceData.currentChatId;

if (isTyping) return <span className="text-xs font-bold text-blue-500 animate-pulse">Escribiendo...</span>;
if (userStatus === 'online') {
    if (targetCurrentChatId === activeChat.id) {
        return <span className="text-xs font-bold text-green-600">En este chat</span>;
    }
    return <span className="text-xs font-bold text-green-500">En línea</span>;
}
if (userStatus === 'away') return <span className="text-xs font-bold text-orange-400">Ausente</span>;
if (userStatus === 'busy') return <span className="text-xs font-bold text-red-500">Ocupado</span>;
if (presenceData.lastSeen) {
    const date = new Date(presenceData.lastSeen);
    const timeString = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
    const isToday = new Date().toDateString() === date.toDateString();
    return <span className="text-xs font-medium text-gray-400">Última vez {isToday ? 'hoy a las' : date.toLocaleDateString()} {timeString}</span>;
}
return <span className="text-xs font-medium text-gray-400">Desconectado</span>;
                                                  })()}

                                                  {activeChat.type === 'group' && (() => {
    const group = chatGroups.find(g => `group_${g.id}` === activeChat.id);
    
    // Filtramos quién está escribiendo (que no sea yo)
    const typingMembers = Object.keys(typingStatus[activeChat.id] || {}).filter(uid => uid !== myChatId && typingStatus[activeChat.id][uid]);
    
    if (typingMembers.length > 0) {
        const firstTypingUser = allChatUsers.find(u => u.id === typingMembers[0]);
        const firstName = firstTypingUser ? firstTypingUser.name.split(' ')[0] : 'Alguien';
        const textInfo = typingMembers.length === 1 
            ? `${firstName} está escribiendo...` 
            : `${firstName} y ${typingMembers.length - 1} más están escribiendo...`;
            
        return <span className="text-[10px] font-bold text-blue-500 animate-pulse block mt-0.5">{textInfo}</span>;
    }

    return <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{group?.members?.length || 0} miembros</p>;
})()}

                                                  {/* Modal de miembros del grupo */}
                                                  {showGroupInfo && activeChat.type === 'group' && (
                                                      <div className={`absolute top-full left-0 mt-3 w-72 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl z-[99999] animate-in fade-in slide-in-from-top-4`}>
                                                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-500/30">
                                                              <h4 className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Miembros del grupo</h4>
                                                              <button onClick={() => setShowGroupInfo(false)} className="text-gray-500 hover:text-red-500 transition-colors"><X size={16}/></button>
                                                          </div>
                                                          <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                                                              {chatGroups.find(g => `group_${g.id}` === activeChat.id)?.members.map(memberId => {
                                                                  const isMe = memberId === myChatId;
                                                                  const member = allChatUsers.find(u => u.id === memberId) || (isMe ? {name: loggedInName, role: role} : {name: 'Usuario desconocido', role: 'student'});
                                                                  return (
                                                                      <div key={memberId} className="flex items-center gap-3">
                                                                          <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm ${member.role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828]' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                                                                              {member.role === 'teacher' ? <TeacherIcon size={14}/> : <UserIcon size={14}/>}
                                                                          </div>
                                                                          <div className="flex flex-col min-w-0">
                                                                              <span className={`text-sm font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{isMe ? 'Tú' : member.name}</span>
                                                                              <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{member.customLabel || (member.role === 'teacher' ? 'Docente' : 'Estudiante')}</span>
                                                                          </div>
                                                                      </div>
                                                                  );
                                                              })}
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                              </div>

                                              <div className="ml-auto flex gap-2 relative shrink-0">
                                                  <button onClick={() => setShowChatSettings(!showChatSettings)} className={`p-2 rounded-full transition-colors ${showChatSettings ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-600') : (isDarkMode ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-500 hover:bg-gray-200/50')}`} title="Personalizar Chat">
                                                      <Palette size={20}/>
                                                  </button>

                                                  {showChatSettings && (
                                                      <div className={`absolute top-full right-0 mt-3 w-[280px] p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl z-[99999] animate-in fade-in slide-in-from-top-4`}>
                                                          <h4 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Color del Chat</h4>
                                                          <div className="flex flex-wrap gap-2 mb-5">
                                                              {CHAT_GRADIENTS.map((grad, idx) => (
                                                                  <button 
                                                                      key={idx} 
                                                                      type="button"
                                                                      onClick={() => handleUpdateChatPreference(activeChat.id, 'gradient', grad)} 
                                                                      className={`w-8 h-8 rounded-full border-2 transition-transform shadow-sm ${grad ? 'bg-gradient-to-br ' + grad : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')} ${currentPrefs.gradient === grad ? 'border-blue-500 scale-110' : 'border-transparent hover:scale-105'}`} 
                                                                      title={grad === "" ? "Por defecto" : "Color"}
                                                                  />
                                                              ))}
                                                          </div>
                                                          
                                                          <h4 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Patrón de Fondo</h4>
                                                          <div className="grid grid-cols-2 gap-2">
                                                              {CHAT_PATTERNS.map(pat => (
                                                                  <button type="button" key={pat.id} onClick={() => handleUpdateChatPreference(activeChat.id, 'pattern', pat.id)} className={`px-2 py-2 rounded-xl text-xs font-bold border transition-colors ${currentPrefs.pattern === pat.id ? 'border-blue-500 bg-blue-500/10 text-blue-500' : (isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100')}`}>
                                                                      {pat.name}
                                                                  </button>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  )}

                                                  {activeChat.type === 'group' ? (
                                                      chatGroups.find(g => `group_${g.id}` === activeChat.id)?.createdBy === myChatId ? (
                                                          <button onClick={() => confirmAction("¿Eliminar este grupo definitivamente?", handleDeleteGroup)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-50'}`} title="Eliminar Grupo"><Trash2 size={20}/></button>
                                                      ) : (
                                                          <button onClick={() => confirmAction("¿Seguro que deseas abandonar este grupo?", handleLeaveGroup)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-orange-400 hover:bg-orange-900/50' : 'text-orange-500 hover:bg-orange-50'}`} title="Abandonar Grupo"><LogOutIcon size={20}/></button>
                                                      )
                                                  ) : (
                                                      <button onClick={() => confirmAction("¿Seguro que deseas vaciar todo el historial de este chat?", handleDeleteEntireChat)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-50'}`} title="Vaciar Chat"><Trash2 size={20}/></button>
                                                  )}
                                              </div>
                                          </div>

                                          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col scroll-smooth">
                                              {chatMessages.length === 0 && <p className={`text-center italic mt-10 ${currentPrefs.gradient ? 'text-gray-800 dark:text-white font-medium' : 'text-gray-500'}`}>Envía un mensaje para iniciar la conversación.</p>}
                                              {chatMessages.map((m, index) => {
                                                  // 1. Lógica para agrupar mensajes de forma fluida
                                                  const prevMsg = index > 0 ? chatMessages[index - 1] : null;
                                                  const nextMsg = index < chatMessages.length - 1 ? chatMessages[index + 1] : null;
                                                  
                                                  const isFirstInGroup = !prevMsg || prevMsg.authorId !== m.authorId;
                                                  const isLastInGroup = !nextMsg || nextMsg.authorId !== m.authorId;
                                                  const showDateSeparator = !prevMsg || new Date(prevMsg.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                                      
                                                  const isMe = m.authorId === myChatId;
                                                  const isTeacher = m.author === TEACHER_NAME;
                                                  const isEditingThis = editingAppMessageId === m.id;
                                                  
                                                  // 2. Animación de bordes: Curvos en los extremos, chatos donde se unen
                                                  const bubbleRadius = isMe
                                                      ? `rounded-l-2xl ${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-[4px]'} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-[4px]'}`
                                                      : `rounded-r-2xl ${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-[4px]'} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-[4px]'}`;

                                                  const isEmojiOnly = m.text && !m.imageUrl && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(m.text.trim());
                                                  const isImageOnly = m.imageUrl && !m.text;
                                                  const isTransparent = isEmojiOnly || isImageOnly;

                                                  // 3. Ticks de lectura
                                                  let tickIcon = null;
                                                  if (isMe) {
                                                      if (m.status === 'read') {
                                                          const readTimeStr = m.readAt ? new Date(m.readAt).toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit', hour12: true}) : '';
tickIcon = (
    <div title={readTimeStr ? `Leído a las ${readTimeStr}` : 'Leído'} className="inline-flex cursor-help">
        <DoubleTick size={14} className="text-blue-500" />
    </div>
);
                                                      } else {
                                                          const targetId = activeChat.type === 'dm' ? activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId) : null;
                                                          const isDelivered = targetId && userPresence[targetId];
                                                          if (isDelivered || activeChat.type === 'group') {
                                                              tickIcon = <DoubleTick size={14} className={currentPrefs.gradient ? 'text-white/70' : 'text-gray-300'} />;
                                                          } else {
                                                              tickIcon = <SingleTick size={14} className={currentPrefs.gradient ? 'text-white/70' : 'text-gray-300'} />;
                                                          }
                                                      }
                                                  }

                                                  return (
    <React.Fragment key={m.id}>
        {showDateSeparator && (
            <div className="flex justify-center my-4 z-10 relative">
                <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm backdrop-blur-md ${currentPrefs.gradient ? 'bg-black/20 text-white border border-white/20' : (isDarkMode ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-white text-gray-500 border border-gray-200')}`}>
                    {formatChatDate(m.createdAt)}
                </span>
            </div>
        )}
        <div id={`msg-${m.id}`} className={`flex flex-col w-full group relative transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${isMe ? 'items-end' : 'items-start'} ${isLastInGroup ? 'mb-4' : 'mb-[2px]'}`}>
                                                          
                                                          {/* Nombre en Grupos (Solo encima del primer mensaje del grupo) */}
                                                          {!isMe && activeChat.type === 'group' && isFirstInGroup && <span className={`text-[11px] font-bold mb-1 px-1 drop-shadow-sm ${isTeacher ? 'text-[#AD3333] dark:text-[#ff6b6b]' : (currentPrefs.gradient ? 'text-white' : (isDarkMode ? 'text-gray-300' : 'text-gray-600'))}`}>{m.author}</span>}
                                                          
                                                          <div className={`relative max-w-[85%] md:max-w-[70%] flex items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                              
                                                              {/* Burbuja Principal */}
                                                              <div className={isTransparent ? 'relative' : `px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm relative backdrop-blur-xl border transition-all duration-300 ease-out ${bubbleRadius} ${isMe ? (currentPrefs.gradient ? 'bg-black/30 border-white/20 text-white' : (isDarkMode ? 'bg-blue-600/90 text-white border-blue-500/50' : 'bg-blue-600/90 text-white border-blue-500/20')) : (currentPrefs.gradient ? 'bg-white/30 border-white/40 text-gray-900 dark:bg-black/20 dark:border-white/10 dark:text-gray-100' : (isDarkMode ? 'bg-gray-800/80 text-gray-100 border-gray-700/50' : 'bg-white/80 text-gray-800 border-gray-200/50'))}`}>
                                                                  
                                                                  {/* Referencia a Mensaje Respondido */}
                                                                  {m.replyTo && (
                                                                      <div className={`mb-2 pl-3 border-l-4 rounded-r-lg py-1.5 ${isMe ? 'border-blue-300 bg-black/10' : 'border-gray-400 bg-gray-500/10'} text-xs opacity-90 cursor-pointer`} onClick={() => { const el = document.getElementById(`msg-${m.replyTo.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                                                                          <p className="font-bold opacity-90">{m.replyTo.author}</p>
                                                                          <p className="truncate max-w-[200px] opacity-80">{m.replyTo.text || (m.replyTo.imageUrl ? '📷 Imagen' : '')}</p>
                                                                      </div>
                                                                  )}
                                                                  
                                                                  {isEditingThis ? (
                                                                      <div className="flex gap-3 items-center min-w-[200px] bg-black/40 p-2 rounded-xl backdrop-blur-md">
                                                                          <input className="py-1 px-2 text-sm flex-1 rounded bg-white/20 outline-none text-white placeholder-white/50" value={editAppMessageText} onChange={e => setEditAppMessageText(e.target.value)} autoFocus />
                                                                          <button onClick={handleEditAppMessage} className="text-green-300 hover:text-green-400 hover:scale-110 transition-transform" title="Guardar"><CheckLine size={20}/></button>
                                                                          <button onClick={() => setEditingAppMessageId(null)} className="text-red-300 hover:text-red-400 hover:scale-110 transition-transform" title="Cancelar"><XLine size={20}/></button>
                                                                      </div>
                                                                  ) : (
                                                                      <div className="flex flex-col">
                                                                          {/* Texto y/o Imagen y/o Documento */}
{m.text && <p className={isEmojiOnly ? "text-5xl md:text-6xl drop-shadow-lg leading-none" : "text-sm md:text-base leading-relaxed whitespace-pre-wrap pr-10"}>{m.text}</p>}
{m.imageUrl && <img src={m.imageUrl} loading="lazy" decoding="async" alt="Adjunto" onLoad={() => chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })} onClick={() => setFullScreenImage(m.imageUrl)} className={isImageOnly ? "rounded-2xl max-h-72 object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-lg" : "mt-2 rounded-xl max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity bg-black/10 border border-white/20"} />}
{m.fileUrl && (
    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-xl mt-1 w-fit transition-colors border ${isMe ? (currentPrefs.gradient ? 'bg-white/20 border-white/30 hover:bg-white/30' : 'bg-blue-700 border-blue-500 hover:bg-blue-800') : (currentPrefs.gradient ? 'bg-black/20 border-white/20 hover:bg-black/30' : (isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'))}`}>
        <div className="bg-red-500 p-1.5 rounded-lg"><FileDocIcon size={18} className="text-white" /></div>
        <span className={`text-sm font-medium truncate max-w-[150px] md:max-w-[200px] ${isMe ? 'text-white' : (currentPrefs.gradient ? 'text-gray-100' : (isDarkMode ? 'text-gray-200' : 'text-gray-800'))}`}>{m.fileName || 'Documento'}</span>
    </a>
)}
                                                                          
                                                                          {/* Hora y Ticks INCRUSTADOS dentro de la burbuja en la esquina */}
                                                                          {!isTransparent && (
                                                                              <div className={`flex items-center justify-end gap-1 mt-0.5 opacity-80 ${isMe ? 'text-blue-100' : (isDarkMode || currentPrefs.gradient ? 'text-gray-400' : 'text-gray-500')} ${isEmojiOnly ? 'relative' : '-mb-1 -mr-1'}`}>
                                                                                  <span className="text-[10px] font-medium leading-none">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                                  {m.isEdited && <span className="text-[9px] italic leading-none">(editado)</span>}
                                                                                  {tickIcon}
                                                                              </div>
                                                                          )}
                                                                      </div>
                                                                  )}

                                                                  {/* Reacciones */}
                                                                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                                                                      <div className={`flex gap-1 z-20 transition-all duration-300 ${
                                                                          isLastInGroup 
                                                                              ? `absolute -bottom-3 ${isMe ? '-left-3' : '-right-3'}` 
                                                                              : `absolute top-1/2 -translate-y-1/2 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`
                                                                      }`}>
                                                                          {Array.from(new Set(Object.values(m.reactions))).map((emoji, idx) => {
                                                                              const reactorsIds = Object.keys(m.reactions).filter(uid => m.reactions[uid] === emoji);
                                                                              const count = reactorsIds.length;
                                                                              let tooltipText = "";
                                                                              if (activeChat.type === 'group') {
                                                                                  tooltipText = reactorsIds.map(uid => {
                                                                                      if (uid === myChatId) return "Tú";
                                                                                      const user = allChatUsers.find(u => u.id === uid);
                                                                                      return user ? user.name.split(' ')[0] : "Alguien";
                                                                                  }).join(', ');
                                                                              }
                                                                              return (
                                                                                  <div key={idx} className="relative inline-flex items-center cursor-help" title={tooltipText}>
                                                                                      <span className={`text-2xl drop-shadow-lg ${emoji === '❤️' ? '' : ''}`}>{emoji}</span>
                                                                                      {count > 1 && <span className="absolute -bottom-1 -right-1 bg-white/90 text-gray-800 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md border border-gray-200">{count}</span>}
                                                                                  </div>
                                                                              );
                                                                          })}
                                                                      </div>
                                                                  )}
                                                              </div>

                                                              {/* Botones de Acción (Flotantes afuera de la burbuja, no ocupan espacio) */}
                                                              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-10 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                                                  <button onClick={() => setActiveChatReactionMsgId(activeChatReactionMsgId === m.id ? null : m.id)} className={`p-1.5 rounded-full shadow-md bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700`} title="Reaccionar"><SmileIcon size={14}/></button>
                                                                  <button onClick={() => setReplyingTo(m)} className={`p-1.5 rounded-full shadow-md bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700`} title="Responder"><ReplyIcon size={14}/></button>
                                                                  
                                                                  {/* Picker de Emojis Flotante */}
                                                                  {activeChatReactionMsgId === m.id && (
                                                                      <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} flex gap-1.5 rounded-full px-3 py-1.5 border shadow-lg z-[99999] animate-in fade-in zoom-in-95 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                                                                          {['❤️','👍','😂','😲', '🙏', '🔥'].map(emj => (
                                                                              <button key={emj} onClick={() => toggleChatAppReaction(m.id, emj)} className="hover:scale-125 transition-transform text-lg">{emj}</button>
                                                                          ))}
                                                                      </div>
                                                                  )}

                                                                  {isMe && !isEditingThis && (
                                                                      <>
                                                                          <button onClick={() => {setEditingAppMessageId(m.id); setEditAppMessageText(m.text || "");}} className={`p-1.5 rounded-full shadow-md bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700`} title="Editar"><Edit3 size={14}/></button>
                                                                          <button onClick={() => confirmAction("¿Deseas eliminar este mensaje para todos?", () => handleDeleteAppMessage(m.id))} className={`p-1.5 rounded-full shadow-md bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400`} title="Eliminar"><Trash2 size={14}/></button>
                                                                      </>
                                                                  )}
                                                              </div>

                                                          </div>

                                                          {/* HORA Y TICKS (Solo si envían un Emoji o Imagen suelta sin burbuja) */}
                                                          {isTransparent && !isEditingThis && (
                                                              <div className={`flex items-center gap-1 mt-1 px-1 opacity-70 ${isMe ? 'flex-row-reverse text-gray-500' : 'flex-row text-gray-500'}`}>
                                                                  <span className="text-[10px] drop-shadow-sm font-medium">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                  {m.isEdited && <span className="text-[9px] italic drop-shadow-sm">(editado)</span>}
                                                                  {tickIcon}
                                                              </div>
                                                          )}

                                                      </div>
                                                              </React.Fragment>
                                                              );
                                                          })}
                                                          <div ref={chatMessagesEndRef} />
                                          </div>

                                          <form onSubmit={handleSendAppMessage} className={`p-4 border-t shrink-0 flex flex-col gap-3 pb-8 md:pb-4 ${isDarkMode ? 'bg-gray-800/80 backdrop-blur-xl border-gray-700' : 'bg-white/80 backdrop-blur-xl border-gray-200'}`}>
                                              {replyingTo && (
                                                  <div className={`flex justify-between items-center px-4 py-2 rounded-xl border-l-4 border-blue-500 text-sm shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                                      <div className="flex flex-col min-w-0">
                                                          <span className="font-bold text-blue-500 truncate">Respondiendo a {replyingTo.author}</span>
                                                          <span className="truncate opacity-80">{replyingTo.text || (replyingTo.imageUrl ? '📷 Imagen' : '')}</span>
                                                      </div>
                                                      <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-red-500 ml-3 p-1 rounded-full"><X size={16}/></button>
                                                  </div>
                                              )}
                                              
                                              {/* CONTENEDOR CON pr-[13px] PARA LA DISTANCIA EXACTA */}
                                              <div className={`flex gap-2 items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full pl-3 pr-[13px] py-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all`}>
                                                  
                                                  <div className="relative">
                                                      <button type="button" onClick={() => setShowChatAppEmojiPicker(!showChatAppEmojiPicker)} className={`p-2 bg-transparent transition-colors rounded-full ${showChatAppEmojiPicker ? 'text-blue-500' : (isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600')}`}>
    <SmileIcon size={24} />
</button>

                                                      {showChatAppEmojiPicker && (
                                                          <div className={`absolute bottom-full left-0 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-2 flex flex-col gap-1 z-[99999] animate-in fade-in zoom-in duration-200`}>
                                                              {COMMENT_EMOJIS.map(emj => (
                                                                  <button key={emj} type="button" onClick={() => {setChatAppInput(chatAppInput + emj); setShowChatAppEmojiPicker(false);}} className="text-3xl hover:scale-125 transition-transform">{emj}</button>
                                                              ))}
                                                          </div>
                                                      )}
                                                  </div>

                                                  <div className="relative">
                                                      <button type="button" onClick={() => setShowChatAppAttachmentMenu(!showChatAppAttachmentMenu)} className={`p-2 bg-transparent transition-colors rounded-full ${(showChatAppImageInput || showChatAppAttachmentMenu) ? 'text-blue-500' : (isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600')}`} title="Adjuntar">
    <Plus size={24} />
</button>

                                                      {showChatAppAttachmentMenu && (
                                                          <div className={`absolute bottom-full left-0 mb-4 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-2 flex flex-col gap-1 z-[99999] animate-in fade-in zoom-in duration-200`}>
                                                              <button type="button" onClick={() => { setShowChatAppImageInput(!showChatAppImageInput); setShowChatAppAttachmentMenu(false); }} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                                                  <ImageIcon size={16} /> Enlace de imagen
                                                              </button>
                                                              <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                                                  <ImageIcon size={16} /> Imagen
                                                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { handleChatAppLocalFileUpload(e); setShowChatAppAttachmentMenu(false); }} />
                                                              </label>
                                                              <button type="button" onClick={() => { window.openGifPicker((url) => setChatAppImageUrl(url)); setShowChatAppAttachmentMenu(false); }} className={`flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                                                  <span className="font-black border border-current px-1 rounded text-[10px] flex items-center justify-center h-4">GIF</span> GIF
                                                              </button>
                                                              <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                                                  <PaperclipIcon size={16} /> Documento
                                                                  <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => { handleChatAppLocalFileUpload(e); setShowChatAppAttachmentMenu(false); }} />
                                                              </label>
                                                          </div>
                                                      )}
                                                  </div>

                                                  {/* INPUT CON min-w-0 PARA EVITAR QUE SE DESBORDE EN MÓVIL */}
                                                  <input 
                                                      value={chatAppInput} 
                                                      onChange={(e) => {
                                                          setChatAppInput(e.target.value);
                                                          const typingRef = doc(db, 'artifacts', appId, 'public', 'data', 'typing', activeChat.id);
                                                          setDoc(typingRef, { [myChatId]: true }, { merge: true });
                                                          clearTimeout(typingTimeout.current);
                                                          typingTimeout.current = setTimeout(() => {
                                                              setDoc(typingRef, { [myChatId]: false }, { merge: true });
                                                          }, 2000);
                                                      }} 
                                                      placeholder="Escribe un mensaje..." 
                                                      className={`flex-1 min-w-0 bg-transparent border-none outline-none py-2.5 px-2 text-base md:text-lg font-medium ${isDarkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`} 
                                                  />
                                                  
                                                  {/* BOTON CON EL ICONO Y LAS MEDIDAS EXACTAS DE TU IMAGEN */}
<button type="submit" disabled={!chatAppInput.trim() && !chatAppImageUrl && !chatAppFileUrl} className={`w-10 h-10 mr-[8px] rounded-[14px] shrink-0 transition-all flex items-center justify-center shadow-sm disabled:shadow-none disabled:opacity-60 ${(chatAppInput.trim() || chatAppImageUrl || chatAppFileUrl) ? 'bg-blue-600 text-white hover:bg-blue-700' : (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400')}`}>
    <Send size={20} />
</button>
                                              </div>

                                              {(showChatAppImageInput || chatAppImageUrl) && (
                                                  <div className="px-1 animate-in fade-in slide-in-from-top-2 relative">
                                                      {showChatAppImageInput && (
                                                          <input 
                                                              value={chatAppImageUrl} onChange={e => setChatAppImageUrl(e.target.value)} 
                                                              placeholder="Enlace DIRECTO de imagen..." 
                                                              className={`w-full rounded-xl px-4 py-3 outline-none focus:ring-2 transition-all text-sm font-medium border shadow-inner ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-500/50' : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-400/50'}`} 
                                                          />
                                                      )}
                                                      
                                                      {chatAppImageUrl && (
                                                          <div className="relative w-fit mt-3">
                                                              <img src={chatAppImageUrl} alt="Preview" className={`h-24 w-24 object-cover rounded-xl border shadow-sm ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} onError={(e) => e.target.style.display = 'none'} />
                                                              <button type="button" onClick={() => setChatAppImageUrl("")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition shadow-md"><X size={14}/></button>
                                                          </div>
                                                      )}
                                                  </div>
                                              )}
                                          </form>
                                      </div>
                                  </div>
                              );
                          })()}
                      </div>
                  </div>
              , document.body)}

              {showSugModal && (
                  <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                      <div className={`${glassCard} max-w-md w-full flex flex-col gap-4 relative animate-in fade-in zoom-in duration-200`}>
                          <button onClick={() => setShowSugModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"><X size={20}/></button>
                          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mail className="text-[#AD3333]"/> Buzón de sugerencias</h3>
                          <p className="text-sm text-gray-600">Deja tu sugerencia o retroalimentación de las clases de lo que te gustaría ver más (o menos) en clase!</p>
                          <form onSubmit={handleSubmitSuggestion} className="flex flex-col gap-3">
                              <textarea value={sugText} onChange={e => setSugText(e.target.value)} placeholder="Escribe tu sugerencia aquí..." className={`${glassInput} h-32 resize-none`} required />
                              <button type="submit" disabled={isSugLoading} className={redButton}>{isSugLoading ? <Loader2 className="animate-spin" size={20}/> : 'Enviar'}</button>
                          </form>
                      </div>
                  </div>
              )}

              {toastMessage && (
                <div className="fixed bottom-24 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-medium text-sm text-center border border-gray-700 whitespace-nowrap">
                  {toastMessage}
                </div>
              )}

              {/* MODAL IMAGEN PANTALLA COMPLETA (APP) */}
              {fullScreenImage && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
                      <button className="absolute top-4 md:top-8 right-4 md:right-8 text-white/70 hover:text-white bg-black/50 hover:bg-red-600 p-2 rounded-full transition-all shadow-lg"><X size={28}/></button>
                      <img src={fullScreenImage} className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                  </div>
              , document.body)}

              {/* MODAL GLOBAL DE CONFIRMACIÓN */}
              {globalGifCallback && ReactDOM.createPortal(<GifPickerModal onSelect={(url) => { globalGifCallback(url); setGlobalGifCallback(null); }} onClose={() => setGlobalGifCallback(null)} isDarkMode={isDarkMode} />, document.body)}
                {confirmDialog.isOpen && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                      <div className={`max-w-sm w-full flex flex-col gap-4 p-6 rounded-3xl animate-in fade-in zoom-in duration-200 shadow-2xl ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                          <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                              <AlertTriangle className="text-red-500" /> Confirmar Acción
                          </h3>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{confirmDialog.message}</p>
                          <div className="flex gap-3 mt-4">
                                  <button onClick={() => setConfirmDialog({ isOpen: false })} className={`flex-1 py-2.5 rounded-xl font-bold transition-all shadow-sm ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>Cancelar</button>
                                  <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false }); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md">Sí, borrar</button>
                              </div>
                          </div>
                      </div>
                  , document.body)}

                  {/* 👇 AQUÍ VA EL CEREBRO DEL BOT PARA EDWIN 👇 */}
                  {showIAKnowledgeModal && ReactDOM.createPortal(
                      <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                          <div className={`${glassCard} max-w-md w-full flex flex-col gap-4 relative bg-white`}>
                              <button onClick={() => setShowIAKnowledgeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={20}/></button>
                              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Sparkles className="text-purple-600"/> Cerebro del Bot de Ayuda</h3>
                              <p className="text-xs text-gray-500">Edwin, aquí puede escribir cómo funciona la página para que el robot se lo explique a la Profe Gina.</p>
                              
                              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                  {teacherBotInfoList.map(item => {
                                      const isEditing = editingIAId === item.id;
                                      return (
                                      <div key={item.id} className="bg-gray-50 p-3 rounded-xl text-xs flex justify-between items-start gap-3 border border-gray-200 shadow-sm">
                                          {isEditing ? (
                                              <div className="flex flex-col gap-2 w-full">
                                                  <textarea value={editIAText} onChange={e => setEditIAText(e.target.value)} className={`${glassInput} h-24 text-xs resize-none bg-white`} autoFocus />
                                                  <div className="flex gap-3 justify-end">
                                                      <button onClick={() => setEditingIAId(null)} className="text-gray-500 hover:text-red-500 transition-colors bg-gray-200 p-1.5 rounded-lg" title="Cancelar"><XLine size={16}/></button>
                                                      <button onClick={() => {
                                                          if(!editIAText.trim()) return;
                                                          const newList = teacherBotInfoList.map(i => i.id === item.id ? { ...i, text: editIAText.trim() } : i);
                                                          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'teacherBot'), { infoList: newList });
                                                          setEditingIAId(null);
                                                      }} className="text-white bg-green-600 hover:bg-green-700 transition-colors p-1.5 rounded-lg" title="Guardar"><CheckLine size={16}/></button>
                                                  </div>
                                              </div>
                                          ) : (
                                              <>
                                                  <span className="flex-1 whitespace-pre-wrap leading-relaxed text-gray-700">{item.text}</span>
                                                  <div className="flex gap-2 shrink-0">
                                                      <button onClick={() => {setEditingIAId(item.id); setEditIAText(item.text);}} className="text-blue-500 hover:text-blue-700 transition-colors bg-blue-100 p-1.5 rounded-lg" title="Editar"><Edit3 size={14}/></button>
                                                      <button onClick={() => {
                                                          confirmAction("¿Seguro que desea borrar este conocimiento?", () => {
                                                              const newList = teacherBotInfoList.filter(i => i.id !== item.id);
                                                              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'teacherBot'), { infoList: newList });
                                                          });
                                                      }} className="text-red-500 hover:text-red-700 transition-colors bg-red-100 p-1.5 rounded-lg" title="Eliminar"><Trash2 size={14}/></button>
                                                  </div>
                                              </>
                                          )}
                                      </div>
                                  )})}
                                  {teacherBotInfoList.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No hay conocimientos guardados aún.</p>}
                              </div>

                              <div className="flex gap-2 pt-2 border-t border-gray-100">
                                  <textarea value={newIAKnowledge} onChange={e => setNewIAKnowledge(e.target.value)} placeholder="Añadir nuevo conocimiento a la IA..." className={`${glassInput} h-14 text-xs resize-none`} />
                                  <button onClick={() => {
                                      if(!newIAKnowledge.trim()) return;
                                      const newList = [...teacherBotInfoList, { id: Date.now().toString(), text: newIAKnowledge.trim() }];
                                      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'teacherBot'), { infoList: newList });
                                      setNewIAKnowledge("");
                                  }} className={`${redButton} h-auto px-4 !bg-purple-600 hover:!bg-purple-700`}><Plus size={18}/></button>
                              </div>
                          </div>
                      </div>
                  , document.body)}
                  {/* 👆 HASTA AQUÍ 👆 */}

            </div>
          );
}

export default App
