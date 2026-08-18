// src/App.jsx
import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import confetti from 'canvas-confetti'
import * as XLSX from 'xlsx'
import {
  auth, db, appId, secondaryAuth, collection, onSnapshot, doc, setDoc, getDocs,
  deleteDoc, addDoc, updateDoc, getDoc, query, where, orderBy, limit,
  signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword, signInAnonymously,
  signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail,
} from './firebase/config.js'
import {
  CHAT_GRADIENTS, CHAT_PATTERNS, COMMENT_EMOJIS, FALLBACK_MAP, SLIDE_GRADIENTS,
  TEACHER_NAME, compressImage, containsBadWords, checkBadWordsAsync, formatChatDate, formatTime,
  uploadImageToStorage, uploadRawFileToStorage, speakText, splitNameFirstAndLast, format12HourTime, formatDateTime12H
} from './utils/helpers.js'
import {
  glassCard, glassInput, outlineButton, redButton,
} from './utils/styles.js'
import {
  AlertTriangle, AnimatedEyesIcon, AnimatedWritingIcon, ArrowLeftIcon, ArrowRightIcon,
  BookOpen, CalendarEmoji, CheckCheck, CheckCircle2, CheckLine, ChevronLeft,
  ChevronRight, Clock, CuteBotIcon, DoubleTick, Download, Edit3, Eye, EyeOff, FileDocIcon,
  FileText, ImageIcon, Loader2, LogOutIcon, Mail, MessageCircle, Moon, NavCalendar,
  NavFile, NavNotebook, NavSlides, Palette, PaperclipIcon, Plus, ReplyIcon, SearchIcon, Search,
  Send, SingleTick, SmileIcon, Sparkles, Sun, TeacherIcon, Trash2, UserIcon,
  UsersGroupIcon, UsersIcon, Wand2, X, XLine, Copy, Mic, Square, Bell, BellOff, Volume2, Languages,
  Settings, VolumeX, Shield, Play, Pause, GoogleIcon, KeyRound, UserCheck, UserX,
  ChevronDown, ChevronUp, Minus, HelpCircle, Lightbulb, GraduationCap, Laptop, PenTool,
  Compass, Atom, Award, Bookmark, Terminal, Folder, Globe, Target, Layers, RotateCcw,
  Archive, ShieldAlert, Unlock, Menu, UserPlus, Camera
} from './components/Icons.jsx'
import AudioPlayer, { AudioRecordingVisualizer } from './components/AudioPlayer.jsx'

import GifPickerModal from './components/GifPickerModal.jsx'
import EmptyState from './components/EmptyState.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import LinkifyText from './components/LinkifyText.jsx'
import TasksTab from './components/TasksTab.jsx'
import ReviewsModule from './components/ReviewsModule.jsx'
import { extractTextFromPDF } from './utils/pdfExtractor.js'
import { useClickOutside } from './utils/hooks.js'

// --- CONSTANTES DE DISEÑO Y PERSONALIZACIÓN DE GRUPOS ---
export const GROUP_VECTOR_ICONS = [
  { id: 'BookOpen', label: 'Libro', IconComponent: BookOpen },
  { id: 'GraduationCap', label: 'Graduación', IconComponent: GraduationCap },
  { id: 'Laptop', label: 'Computador', IconComponent: Laptop },
  { id: 'Globe', label: 'Global', IconComponent: Globe },
  { id: 'Palette', label: 'Arte', IconComponent: Palette },
  { id: 'Lightbulb', label: 'Idea', IconComponent: Lightbulb },
  { id: 'PenTool', label: 'Diseño', IconComponent: PenTool },
  { id: 'Compass', label: 'Brújula', IconComponent: Compass },
  { id: 'Atom', label: 'Ciencia', IconComponent: Atom },
  { id: 'Award', label: 'Logro', IconComponent: Award },
  { id: 'FileText', label: 'Documento', IconComponent: FileText },
  { id: 'Sparkles', label: 'Destacado', IconComponent: Sparkles },
  { id: 'Target', label: 'Objetivo', IconComponent: Target },
  { id: 'Folder', label: 'Carpeta', IconComponent: Folder },
  { id: 'Layers', label: 'Capas', IconComponent: Layers },
  { id: 'Bookmark', label: 'Marcador', IconComponent: Bookmark },
  { id: 'Terminal', label: 'Código', IconComponent: Terminal },
  { id: 'Languages', label: 'Idiomas', IconComponent: Languages },
];

export const renderGroupVectorIcon = (iconId, size = 20, className = "") => {
  const item = GROUP_VECTOR_ICONS.find(i => i.id === iconId);
  if (item && item.IconComponent) {
    const Component = item.IconComponent;
    return <Component size={size} className={className} />;
  }
  // Mapeo retrocompatible para emojis antiguos o id directo
  if (iconId === '📚' || iconId === 'BookOpen') return <BookOpen size={size} className={className} />;
  if (iconId === '🎓' || iconId === 'GraduationCap') return <GraduationCap size={size} className={className} />;
  if (iconId === '💻' || iconId === 'Laptop') return <Laptop size={size} className={className} />;
  if (iconId === '🌍' || iconId === 'Globe') return <Globe size={size} className={className} />;
  if (iconId === '🎨' || iconId === 'Palette') return <Palette size={size} className={className} />;
  if (iconId === '💡' || iconId === 'Lightbulb') return <Lightbulb size={size} className={className} />;
  if (iconId === '✏️' || iconId === 'PenTool') return <PenTool size={size} className={className} />;
  if (iconId === '📐' || iconId === 'Compass') return <Compass size={size} className={className} />;
  if (iconId === '🔬' || iconId === '🧪' || iconId === 'Atom') return <Atom size={size} className={className} />;
  if (iconId === '🏆' || iconId === 'Award') return <Award size={size} className={className} />;
  if (iconId === '📝' || iconId === '📖' || iconId === 'FileText') return <FileText size={size} className={className} />;
  if (iconId === '🌟' || iconId === 'Sparkles') return <Sparkles size={size} className={className} />;
  if (iconId === '🎯' || iconId === 'Target') return <Target size={size} className={className} />;
  if (iconId === '🚀' || iconId === 'Folder') return <Folder size={size} className={className} />;
  if (iconId === 'Layers') return <Layers size={size} className={className} />;
  if (iconId === 'Bookmark') return <Bookmark size={size} className={className} />;
  if (iconId === 'Terminal') return <Terminal size={size} className={className} />;
  if (iconId === '🇬🇧' || iconId === '🗣️' || iconId === 'Languages') return <Languages size={size} className={className} />;

  if (typeof iconId === 'string' && iconId.trim() && iconId.length <= 4) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{iconId}</span>;
  }
  return <BookOpen size={size} className={className} />;
};

export const GROUP_COVER_PATTERNS = [
  { id: 'doodle-1', name: 'Académico', bg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%)' },
  { id: 'doodle-2', name: 'Global', bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #3730a3 100%)' },
  { id: 'doodle-3', name: 'Creativo', bg: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #db2777 100%)' },
  { id: 'doodle-4', name: 'Naturaleza', bg: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)' },
  { id: 'doodle-5', name: 'Universitario', bg: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #d97706 100%)' },
];

const BotThinkingIcon = ({ size = 22, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8V4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="9" cy="13" rx="2.2" ry="2.2" fill="currentColor" style={{ animation: 'bot-eye-happy 4s ease-in-out infinite' }} />
    <ellipse cx="15" cy="13" rx="2.2" ry="2.2" fill="currentColor" style={{ animation: 'bot-eye-happy 4s ease-in-out 0.6s infinite' }} />
    <path d="M9.5 17.5 Q12 19.5 14.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

function App() {
  // --- HELPERS BÁSICOS Y CONSTANTES INICIALES ---
  const getInitialHashInfo = () => {
    try {
      const raw = window.location.hash ? window.location.hash.replace('#', '') : '';
      const mainTab = raw.split('/')[0].split('?')[0];
      let profileId = null;
      if (raw.startsWith('profile/')) {
        profileId = raw.replace('profile/', '').trim();
      } else if (raw.startsWith('profile?id=')) {
        profileId = raw.replace('profile?id=', '').trim();
      } else if (mainTab === 'profile') {
        profileId = sessionStorage.getItem('englishTech_viewingProfileId') || null;
      }
      return {
        tab: ['tasks', 'reviews', 'syllabus', 'evaluations', 'directory', 'groups', 'inbox', 'profile', 'settings'].includes(mainTab) ? mainTab : 'tasks',
        profileId: profileId || null
      };
    } catch (e) {
      return { tab: 'tasks', profileId: null };
    }
  };
  const initialHashInfo = getInitialHashInfo();
  
  // Recuperar sesión activa guardada si existe
  const getInitialActiveSession = () => {
    try {
      const raw = localStorage.getItem('englishTech_activeSession');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };
  const initialActiveSession = getInitialActiveSession();

  const getToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Ahora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  const formatBotText = (text) => {
    if (!text) return "";
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => 
      part.startsWith('**') && part.endsWith('**') 
        ? <strong key={index} className="font-black">{part.slice(2, -2)}</strong> 
        : <span key={index}>{part}</span>
    );
  };

  // --- TODOS LOS ESTADOS (useState) ---
  const [hasEntered, setHasEntered] = useState(() => !!initialActiveSession); 
  const [loginType, setLoginType] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState(() => initialHashInfo.profileId);
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

  // BOT DE GINA
  const [isTeacherBotOpen, setIsTeacherBotOpen] = useState(false);
  const [teacherBotHistory, setTeacherBotHistory] = useState([]);
  const [teacherBotInput, setTeacherBotInput] = useState("");
  const [teacherBotInfoList, setTeacherBotInfoList] = useState([]);
  const [isTeacherBotLoading, setIsTeacherBotLoading] = useState(false);
  const [isAiSessionPaused, setIsAiSessionPaused] = useState(false);
  const [showIAKnowledgeModal, setShowIAKnowledgeModal] = useState(false);
  const [newIAKnowledge, setNewIAKnowledge] = useState("");
  const [editingIAId, setEditingIAId] = useState(null);
  const [editIAText, setEditIAText] = useState("");

  const [loggedInUser, setLoggedInUser] = useState(() => initialActiveSession ? (initialActiveSession.role === 'teacher' ? 'GinaDocente' : `@${initialActiveSession.userKey}`) : ""); 
  const [loggedInName, setLoggedInName] = useState(() => initialActiveSession ? (initialActiveSession.name || initialActiveSession.userKey) : ""); 
  const [userMappings, setUserMappings] = useState({}); 
  const [userMappingsLoaded, setUserMappingsLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [prefillUsername, setPrefillUsername] = useState("");
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [editingUserLabelId, setEditingUserLabelId] = useState(null);
  const [editUserLabelValue, setEditUserLabelValue] = useState("");
  
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => initialActiveSession?.role || 'student');
  const [activeTab, setActiveTab] = useState(() => initialHashInfo.tab);
  const [loginError, setLoginError] = useState("");
  
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('englishTech_theme');
      if (saved === 'dim' || saved === 'lights_out' || saved === 'light') return saved;
      if (saved === 'dark') return 'lights_out';
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dim' : 'light';
    } catch (e) {
      return 'light';
    }
  });
  const isDarkMode = themeMode !== 'light';
  const setIsDarkMode = (val) => {
    if (typeof val === 'function') {
      setThemeMode(prev => (prev !== 'light' ? 'light' : 'dim'));
    } else {
      setThemeMode(val ? 'dim' : 'light');
    }
  };

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: "", onConfirm: null });
  const [globalGifCallback, setGlobalGifCallback] = useState(null);
  window.openGifPicker = (cb) => setGlobalGifCallback(() => cb);

  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const mobileProfileMenuRef = useRef(null);
  useClickOutside(mobileProfileMenuRef, () => setMobileProfileMenuOpen(false));

  const [showSugModal, setShowSugModal] = useState(false);
  const [sugText, setSugText] = useState("");
  const [sugCategory, setSugCategory] = useState("");
  const [isSugLoading, setIsSugLoading] = useState(false);
  const [revealedItems, setRevealedItems] = useState({}); 
  const [toastMessage, setToastMessage] = useState("");
  const [profileReplyingTo, setProfileReplyingTo] = useState({});

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
  const [wallSearchTerm, setWallSearchTerm] = useState("");
  const [studentEditModal, setStudentEditModal] = useState({ isOpen: false, userKey: '', fullName: '', customLabel: '', email: '', profilePicUrl: '' });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isStudentRegisterMode, setIsStudentRegisterMode] = useState(false);
  const [isRegisteringStudent, setIsRegisteringStudent] = useState(false);
  const [evalSearchQuery, setEvalSearchQuery] = useState("");
  const [googleOnboarding, setGoogleOnboarding] = useState({
    isOpen: false,
    uid: '',
    email: '',
    fullName: '',
    username: '',
    photoURL: '',
    photoChoice: 'google', // 'google' | 'initials' | 'custom'
    customPhotoUrl: '',
    isSaving: false
  });
  const [forgotPasswordState, setForgotPasswordState] = useState({
    isOpen: false,
    input: '',
    isSending: false,
    sentToEmail: null,
    error: ''
  });

  // --- ESTADOS DE EVALUACIONES ---
  const [isCreatingEval, setIsCreatingEval] = useState(false);
  const [evalTabFilter, setEvalTabFilter] = useState('active'); // 'active' | 'archived'
  const [evalFormData, setEvalFormData] = useState({
    title: "",
    description: "",
    dueDate: getToday(),
    dueTime: "23:59",
    timeLimit: 30,
    strictAntiCheat: false,
    targetGroupId: "all",
    targetGroupName: "Todos los estudiantes (Global)",
    questions: []
  });
  const [activeTakingEval, setActiveTakingEval] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [viewingResultsFor, setViewingResultsFor] = useState(null);
  const [editingGrade, setEditingGrade] = useState({ id: null, score: '' });

  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [botTrainingInfo, setBotTrainingInfo] = useState("");
  const [botInfoList, setBotInfoList] = useState([]); 
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- ESTADOS DE MENSAJERÍA DIRECTA Y GRUPOS ---
  const [isChatAppOpen, setIsChatAppOpen] = useState(() => initialHashInfo.tab === 'chat');
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [unreadChats, setUnreadChats] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [activeChat, setActiveChat] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);
  const [chatGroups, setChatGroups] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [academicGroups, setAcademicGroups] = useState([]);
  const [newAcadGroupAvatarUrl, setNewAcadGroupAvatarUrl] = useState("");
  const [groupMembersModal, setGroupMembersModal] = useState({ isOpen: false, group: null, search: "" });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupNameVal, setEditGroupNameVal] = useState("");
  const [isEditingGroupDesc, setIsEditingGroupDesc] = useState(false);
  const [editGroupDescVal, setEditGroupDescVal] = useState("");
  const [groupInfoSearch, setGroupInfoSearch] = useState("");
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const groupAvatarFileInputRef = useRef(null);
  const [isCreatingAcadGroup, setIsCreatingAcadGroup] = useState(false);
  const [showMateriasList, setShowMateriasList] = useState(false);
  const [showRegisterStudentForm, setShowRegisterStudentForm] = useState(false);
  const [isSavingMateria, setIsSavingMateria] = useState(false);
  const [newAcadGroupName, setNewAcadGroupName] = useState("");
  const [selectedAcadMembers, setSelectedAcadMembers] = useState([]);
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState(null);
  const [showAddStudentToSubject, setShowAddStudentToSubject] = useState(false);
  const [studentSearchInSubject, setStudentSearchInSubject] = useState("");
  const [selectedGroupForFeed, setSelectedGroupForFeed] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  
  const [chatAppInput, setChatAppInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [chatAppImageUrl, setChatAppImageUrl] = useState("");
  const [chatAppFileUrl, setChatAppFileUrl] = useState("");
  const [chatAppFileName, setChatAppFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [chatRecordingTime, setChatRecordingTime] = useState(0);
  const [chatAppAudioUrl, setChatAppAudioUrl] = useState("");
  const [chatTranslations, setChatTranslations] = useState({});
  const [translatingMsgIds, setTranslatingMsgIds] = useState({});

  const [showChatAppAttachmentMenu, setShowChatAppAttachmentMenu] = useState(false);
  const [showChatAppImageInput, setShowChatAppImageInput] = useState(false);
  const [showChatAppEmojiPicker, setShowChatAppEmojiPicker] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [editingAppMessageId, setEditingAppMessageId] = useState(null);
  const [editAppMessageText, setEditAppMessageText] = useState("");

  const [chatPreferences, setChatPreferences] = useState({});
  const [userPresence, setUserPresence] = useState({});
  const userPresenceRef = useRef({});
  const [typingStatus, setTypingStatus] = useState({});
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState('chats'); // 'chats' | 'settings'
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  // Catálogo de 5 sonidos amigables y cortos de chat (Mixkit — libres de derechos)
  const CHAT_SOUNDS = [
    { label: 'Cristal',  emoji: '🎶', url: 'https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3' },
    { label: 'Campana',  emoji: '🔔', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
    { label: 'Pop',      emoji: '💬', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
    { label: 'Chime',    emoji: '🎵', url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' },
    { label: 'Burbuja',  emoji: '🫧', url: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3' },
  ];

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('englishTech_sound') !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [chatSoundIndex, setChatSoundIndex] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('englishTech_chatSound'), 10);
      return Number.isFinite(saved) && saved >= 0 && saved < 5 ? saved : 0;
    } catch (e) {
      return 0;
    }
  });
  const [pushEnabled, setPushEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('englishTech_push');
      if (saved !== null) return saved === 'true';
      return typeof Notification !== 'undefined' && Notification.permission === 'granted';
    } catch (e) {
      return true;
    }
  });
  const [tasks, setTasks] = useState([]);
  const [pinnedTasks, setPinnedTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskLimit, setTaskLimit] = useState(20);
  const loadMoreTasks = () => setTaskLimit(prev => prev + 20);
  const [syllabus, setSyllabus] = useState([]);
  const [showAddSyllabus, setShowAddSyllabus] = useState(false);
  const [showPdfSyllabusModal, setShowPdfSyllabusModal] = useState(false);
  const [isProcessingSyllabusPdf, setIsProcessingSyllabusPdf] = useState(false);
  const [syllabusPdfStep, setSyllabusPdfStep] = useState("");
  const [syllabusPdfFile, setSyllabusPdfFile] = useState(null);
  const [syllabusPdfTargetGroup, setSyllabusPdfTargetGroup] = useState("");
  const [extractedSyllabusPreview, setExtractedSyllabusPreview] = useState(null);
  const [syllabusSearchTerm, setSyllabusSearchTerm] = useState("");
  const [syllabusSubjectFilter, setSyllabusSubjectFilter] = useState("all");
  const [evaluations, setEvaluations] = useState([]);
  const [grades, setGrades] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [inboxTab, setInboxTab] = useState('suggestions');
  const [inboxFilter, setInboxFilter] = useState('all');
  const [inboxSearch, setInboxSearch] = useState('');

  const [syllabusAssistantModal, setSyllabusAssistantModal] = useState({ isOpen: false, weekItem: null, type: null, content: '', isLoading: false });
  const [groupCoverModal, setGroupCoverModal] = useState({ isOpen: false, group: null, emoji: 'BookOpen', coverPattern: 'doodle-1', coverUrl: '', customFile: null, isSaving: false });
  const [newAcadGroupEmoji, setNewAcadGroupEmoji] = useState('BookOpen');

  // --- REFS ---
  const cropDragStart = useRef({ x: 0, y: 0 });
  const cropImageRef = useRef(null);
  const cropContainerRef = useRef(null);
  const teacherBotEndRef = useRef(null);
  const [thinkingMsg, setThinkingMsg] = useState(() => Math.floor(Math.random() * 8));
  const [botPlaceholder, setBotPlaceholder] = useState(() => {
      const p = ["¿En qué necesitas ayuda?", "¿Hay algo que no entiendas?", "Pregúntame lo que sea...", "Escribe tu duda aquí...", "¿Cómo puedo ayudarte?", "¿Necesitas apoyo con algo?", "Estoy aquí para servirte...", "¿Alguna duda, profe?", "Pregúntame sin miedo...", "¿Qué necesitas hoy?", "¿Hay algo que te preocupe?", "¿Necesitas ideas para la clase?", "¿Quieres que te ayude?", "¿Cómo va todo, profe?", "¿Necesitas que te oriente?", "¿Tienes alguna consulta?", "¿En qué te puedo ayudar?", "¿Hay algún problema?", "¿Necesitas apoyo pedagógico?", "¿Qué tal tu día, profe?"];
      return p[Math.floor(Math.random() * p.length)];
  });
  const recordingRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const chatMessagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const chatImageInputRef = useRef(null);
  const chatDocInputRef = useRef(null);
  const notificationSound = useRef(typeof Audio !== "undefined" ? (() => {
    try {
      const snd = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      snd.volume = 0.5;
      return snd;
    } catch (e) {
      return null;
    }
  })() : null);
  const submittingEvalRef = useRef(false);
  const onboardingFileInputRef = useRef(null);
  const isSendingChatAppMessageRef = useRef(false);
  // Fix closure bug: ref siempre tiene el valor actual de soundEnabled
  // (el listener uUnread captura el closure inicial y no ve los cambios de estado)
  const soundEnabledRef = useRef(soundEnabled);
  const chatSoundIndexRef = useRef(chatSoundIndex);
  const pushEnabledRef = useRef(pushEnabled);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  // --- VALORES DERIVADOS Y HELPERS DE USUARIO / CHAT ---
  const myChatId = role === 'teacher' ? 'teacher' : (loggedInUser ? loggedInUser.replace('@', '') : '');

  const allChatUsers = [
    { id: 'teacher', name: TEACHER_NAME, role: 'teacher', profilePicUrl: userMappings['teacher']?.profilePicUrl || '' },
    ...Object.entries(userMappings || {}).filter(([id, data]) => data?.email).map(([id, data]) => ({ 
      id, 
      name: data?.fullName || FALLBACK_MAP[id]?.name || id, 
      role: data?.role || 'student', 
      customLabel: data?.customLabel || "",
      profilePicUrl: data?.profilePicUrl || ''
    })),
    ...Object.entries(FALLBACK_MAP).filter(([id, data]) => data.role !== 'teacher' && !userMappings[id]).map(([id, data]) => ({ 
      id, 
      name: data.name, 
      role: data.role, 
      customLabel: data.customLabel || "",
      profilePicUrl: data.profilePicUrl || ''
    }))
  ].filter(u => u.id !== myChatId); 

  const myGroups = chatGroups.filter(g => g.members?.includes(myChatId));
  const filteredUsers = allChatUsers.filter(u => (u.name || "").toLowerCase().includes((chatSearchTerm || "").toLowerCase()));
  const filteredGroups = myGroups.filter(g => (g.name || "").toLowerCase().includes((chatSearchTerm || "").toLowerCase()));
  const activeChatsUsers = filteredUsers.filter(u => lastMessages[`dm_${[myChatId, u.id].sort().join('_')}`]);
  const otherContactsUsers = filteredUsers.filter(u => !lastMessages[`dm_${[myChatId, u.id].sort().join('_')}`]);

  // --- ACCIONES Y HANDLERS BÁSICOS ---
  const showMessage = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(""), 5000); };
  const confirmAction = (msg, action, confirmText = null, isDestructive = null, title = null) => {
    const isDelete = isDestructive !== null
      ? isDestructive
      : (msg.toLowerCase().includes('borrar') || msg.toLowerCase().includes('eliminar') || msg.toLowerCase().includes('quitar'));
    const text = confirmText || (isDelete ? 'Sí, eliminar' : 'Sí, continuar');
    setConfirmDialog({ 
      isOpen: true, 
      title: title || (isDelete ? 'Confirmar acción' : 'Confirmar'), 
      message: msg, 
      onConfirm: action, 
      confirmText: text, 
      isDestructive: isDelete 
    });
  };
  const changeTab = (tab, profileId = undefined) => { 
    let targetHash = tab;
    if (tab === 'profile') {
      const pid = profileId !== undefined ? profileId : viewingProfileId;
      if (pid) {
        setViewingProfileId(pid);
        targetHash = `profile/${pid}`;
        try { sessionStorage.setItem('englishTech_viewingProfileId', pid); } catch(e) {}
      } else {
        setViewingProfileId(null);
        try { sessionStorage.removeItem('englishTech_viewingProfileId'); } catch(e) {}
      }
    } else if (tab === 'chat') {
      targetHash = 'chat';
    }
    setIsChatAppOpen(tab === 'chat');
    if (tab !== 'chat') {
      if (activeChat) setIsChatMinimized(true);
    }
    window.location.hash = targetHash; 
    setActiveTab(tab); 
  };

  const handleOpenProfileByName = (name, optionalUsernameOrId = null) => {
    if (!name && !optionalUsernameOrId) return;
    const rawKey = optionalUsernameOrId ? String(optionalUsernameOrId).trim().replace('@', '') : '';
    const raw = String(name || optionalUsernameOrId).trim();
    const cleanName = raw.toLowerCase();
    const cleanKey = (rawKey || cleanName).replace('@', '').toLowerCase();

    let targetId = null;
    if (cleanName === TEACHER_NAME.toLowerCase() || cleanName === 'profesora' || cleanName === 'la profe' || cleanName === 'docente' || cleanName.includes('gina') || cleanKey === 'teacher') {
      targetId = 'teacher';
    } else if (rawKey && Object.keys(userMappings).some(k => k.toLowerCase() === rawKey.toLowerCase())) {
      targetId = Object.keys(userMappings).find(k => k.toLowerCase() === rawKey.toLowerCase());
    } else if (myChatId && cleanKey === myChatId.toLowerCase()) {
      targetId = myChatId;
    } else {
      // 1. Buscar en userMappings por clave exacta o case-insensitive
      const matchKey = Object.keys(userMappings).find(k => k.toLowerCase() === cleanKey);
      if (matchKey) {
        targetId = matchKey;
      } else {
        // 2. Buscar en userMappings por fullName
        const matchFullName = Object.entries(userMappings).find(([, u]) => (u?.fullName || '').trim().toLowerCase() === cleanName);
        if (matchFullName) {
          targetId = matchFullName[0];
        } else {
          // 3. Buscar en userMappings por email
          const matchEmail = Object.entries(userMappings).find(([, u]) => (u?.email || '').toLowerCase() === cleanName || (u?.email || '').split('@')[0].toLowerCase() === cleanKey);
          if (matchEmail) {
            targetId = matchEmail[0];
          } else {
            // 4. Buscar en FALLBACK_MAP
            const matchFallback = Object.entries(FALLBACK_MAP).find(([k, u]) => k.toLowerCase() === cleanKey || (u?.name || '').trim().toLowerCase() === cleanName);
            if (matchFallback) {
              targetId = matchFallback[0];
            } else {
              targetId = cleanKey;
            }
          }
        }
      }
    }

    const finalId = targetId || cleanKey;
    setIsChatAppOpen(false);
    if (activeChat) setIsChatMinimized(true);
    setViewingProfileId(finalId);
    try { sessionStorage.setItem('englishTech_viewingProfileId', finalId); } catch(e) {}
    changeTab('profile', finalId);
  };

  const togglePushNotifications = async () => {
    if (!('Notification' in window)) { 
      showMessage("Tu navegador no soporta notificaciones."); 
      return; 
    }
    if (pushEnabled) {
      setPushEnabled(false);
      pushEnabledRef.current = false;
      try { localStorage.setItem('englishTech_push', 'false'); } catch (e) {}
      showMessage("🔕 Notificaciones push desactivadas");
    } else {
      if (Notification.permission === 'denied') {
        showMessage("Permiso bloqueado en tu navegador. Debes habilitarlo en los ajustes del sitio.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setPushEnabled(true);
        pushEnabledRef.current = true;
        try { localStorage.setItem('englishTech_push', 'true'); } catch (e) {}
        showMessage("🔔 ✅ Notificaciones push activadas");
      } else {
        showMessage("Notificaciones no permitidas por el navegador.");
      }
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      showMessage("Copiado al portapapeles");
    } catch (err) {
      showMessage("No se pudo copiar. Selecciona el texto manualmente.");
    }
  };

  const updatePresenceStatus = async (newStatus) => {
    const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
    if (finalPresenceId) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId), {
        isOnline: true,
        status: newStatus,
        lastPing: Date.now()
      }, { merge: true }).catch(() => {});
    }
  };

  const calculateScore = (evalData, answers) => {
    if (!evalData?.questions || evalData.questions.length === 0) return 0;
    let correct = 0;
    evalData.questions.forEach((q, i) => {
      const ans = answers ? answers[i] : undefined;
      if (q.type === 'multiple') {
        const correctIndices = (q.options || []).map((opt, idx) => opt.isCorrect ? idx : -1).filter(idx => idx !== -1);
        const selectedIndices = Array.isArray(ans) ? ans : [];
        if (correctIndices.length === selectedIndices.length && correctIndices.every(idx => selectedIndices.includes(idx))) {
          correct++;
        }
      } else {
        if (typeof ans === 'string' && ans.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase()) {
          correct++;
        }
      }
    });
    return Math.round(((correct / evalData.questions.length) * 5.0) * 10) / 10;
  };

  const studentAnswersRef = useRef({});
  useEffect(() => {
    studentAnswersRef.current = studentAnswers;
  }, [studentAnswers]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    chatSoundIndexRef.current = chatSoundIndex;
  }, [chatSoundIndex]);

  useEffect(() => {
    pushEnabledRef.current = pushEnabled;
  }, [pushEnabled]);

  const playNotificationSound = (customIndex = null) => {
    if (!soundEnabledRef.current && customIndex === null) return;
    try {
      const idx = customIndex !== null ? customIndex : (chatSoundIndexRef.current || 0);
      const soundUrl = CHAT_SOUNDS[idx]?.url || CHAT_SOUNDS[0].url;
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Auto-play evitado:', e));
    } catch (e) {
      console.log('Error reproduciendo sonido:', e);
    }
  };

  const handleCheatCancellation = async (currentEval) => {
    const targetEval = currentEval || activeTakingEval;
    if (!targetEval || submittingEvalRef.current) return;
    submittingEvalRef.current = true;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'grades'), {
        evaluationId: targetEval.id,
        studentId: user?.uid || myChatId,
        studentName: loggedInName,
        score: 0.0,
        status: 'cancelled_tab_change',
        statusReason: 'Cancelada por cambio de pestaña o pantalla',
        answers: studentAnswersRef.current || {},
        submittedAt: Date.now()
      });
      setActiveTakingEval(null);
      setStudentAnswers({});
      showMessage("🚨 Examen cancelado: Se detectó cambio de pestaña o salida de la aplicación con el modo anti-trampas activo. Tu nota ha sido registrada como 0.0.");
    } catch (err) {
      console.error(err);
    } finally {
      submittingEvalRef.current = false;
    }
  };

  // Temporizador y Anti-Trampas para Evaluaciones
  useEffect(() => {
    if (!activeTakingEval || !activeTakingEval.strictAntiCheat) return;

    let isHandling = false;
    const isMobileDevice = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      window.innerWidth <= 768
    );

    const triggerCancellation = () => {
      if (isHandling || submittingEvalRef.current) return;
      isHandling = true;
      handleCheatCancellation(activeTakingEval);
    };

    // 1. visibilitychange: Se dispara cuando el estudiante cambia de pestaña, minimiza la ventana o pasa la app a segundo plano
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerCancellation();
      }
    };

    // 2. pagehide: Se dispara cuando el estudiante sale de la página o cambia de aplicación
    const handlePageHide = () => {
      if (document.visibilityState === 'hidden') {
        triggerCancellation();
      }
    };

    // 3. blur: En dispositivos móviles/táctiles NO se usa blur para evitar falsos positivos con la apertura/cierre del teclado virtual.
    // En computadores de escritorio se monitorea el blur con validación de visibilidad.
    const handleWindowBlur = () => {
      if (isMobileDevice) return; // Descartar en móviles (el teclado virtual y viewport resize emiten blur espurio)
      setTimeout(() => {
        if (!document.hasFocus() && document.visibilityState === 'hidden') {
          triggerCancellation();
        }
      }, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    if (!isMobileDevice) {
      window.addEventListener('blur', handleWindowBlur);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (!isMobileDevice) {
        window.removeEventListener('blur', handleWindowBlur);
      }
    };
  }, [activeTakingEval]);

  const submitEvaluation = async (autoSubmit = false) => {
    if (!activeTakingEval) return;
    if (submittingEvalRef.current) return;
    submittingEvalRef.current = true;
    try {
      const score = calculateScore(activeTakingEval, studentAnswers);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'grades'), {
        evaluationId: activeTakingEval.id,
        studentId: user?.uid || myChatId,
        studentName: loggedInName,
        score: parseFloat(score.toFixed(1)),
        answers: studentAnswers,
        submittedAt: Date.now()
      });
      setActiveTakingEval(null);
      setStudentAnswers({});
      if (!autoSubmit) confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      showMessage(autoSubmit ? "⏳ Tiempo agotado. Evaluación enviada automáticamente." : "✅ Evaluación completada y enviada.");
    } catch (err) {
      console.error(err);
      showMessage("❌ Error al enviar la evaluación. Intenta de nuevo.");
    } finally {
      submittingEvalRef.current = false;
    }
  };

  const handleEnableRetry = async (gradeId, studentName) => {
    confirmAction(`¿Deseas autorizar un nuevo intento a ${studentName}? Se eliminará la anulación y el estudiante podrá volver a presentar la evaluación.`, async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grades', gradeId));
        showMessage(`✅ Reintento autorizado para ${studentName}.`);
      } catch (err) {
        console.error(err);
        showMessage("❌ Error al habilitar reintento.");
      }
    }, "Sí, autorizar", false);
  };

  const toggleArchiveEvaluation = async (evalId, currentIsArchived) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'evaluations', evalId), {
        isArchived: !currentIsArchived
      });
      showMessage(!currentIsArchived ? "📦 Evaluación archivada correctamente." : "📂 Evaluación desarchivada y activa.");
    } catch (err) {
      console.error(err);
      showMessage("❌ Error al cambiar estado de archivado.");
    }
  };

  const saveEditedGrade = async (gradeId) => {
    const newScore = parseFloat(editingGrade.score);
    if (isNaN(newScore) || newScore < 0 || newScore > 5) return showMessage("Nota inválida (debe ser entre 0.0 y 5.0)");
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grades', gradeId), { score: newScore });
      setEditingGrade({ id: null, score: '' });
      showMessage("✅ Nota actualizada.");
    } catch (err) {
      console.error(err);
      showMessage("❌ Error al actualizar la nota.");
    }
  };

  // --- EFECTOS (useEffect) ---
  useEffect(() => {
    if (isTeacherBotOpen) {
      setTimeout(() => teacherBotEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [isTeacherBotOpen, teacherBotHistory]);

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
    try {
      localStorage.setItem('englishTech_theme', themeMode);
    } catch (e) {}
    document.documentElement.classList.remove('theme-dim', 'theme-lights-out');
    if (themeMode === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('bg-gray-100');
      document.body.classList.remove('bg-gray-900');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      if (themeMode === 'dim') {
        document.documentElement.classList.add('theme-dim');
      } else {
        document.documentElement.classList.add('theme-lights-out');
      }
      document.body.classList.add('bg-gray-900');
      document.body.classList.remove('bg-gray-100');
      document.documentElement.style.colorScheme = 'dark';
    }
  }, [themeMode]);

  useEffect(() => {
    const handleOffline = () => {
      showMessage("Estás sin conexión. Algunas funciones pueden estar limitadas.");
      if (myChatId) {
        const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId), {
          isOnline: false,
          status: 'offline',
          lastSeen: Date.now()
        }, { merge: true }).catch(() => {});
      }
    };
    const handleOnline = () => {
      showMessage("Conexión restaurada.");
      if (myChatId) {
        const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId), {
          isOnline: true,
          status: 'online',
          lastPing: Date.now()
        }, { merge: true }).catch(() => {});
      }
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [myChatId, role]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'chat') {
        setIsChatAppOpen(true);
      } else {
        setIsChatAppOpen(false);
        const mainTab = hash.split('/')[0].split('?')[0];
        if (mainTab === 'profile') {
          setActiveTab('profile');
          let pid = null;
          if (hash.startsWith('profile/')) {
            pid = hash.replace('profile/', '').trim();
          } else if (hash.startsWith('profile?id=')) {
            pid = hash.replace('profile?id=', '').trim();
          }
          if (pid) {
            setViewingProfileId(pid);
            try { sessionStorage.setItem('englishTech_viewingProfileId', pid); } catch(e) {}
          } else {
            setViewingProfileId(null);
            try { sessionStorage.removeItem('englishTech_viewingProfileId'); } catch(e) {}
          }
        } else if (mainTab && ['tasks', 'reviews', 'syllabus', 'evaluations', 'directory', 'groups', 'inbox', 'profile', 'settings'].includes(mainTab)) {
          setActiveTab(mainTab);
        } else if (!hash) {
          setActiveTab('tasks');
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sincronización en tiempo real e instantánea de la URL del perfil activo
  useEffect(() => {
    if (activeTab === 'profile') {
      const targetHash = viewingProfileId ? `profile/${viewingProfileId}` : (role === 'teacher' ? 'profile/teacher' : (myChatId ? `profile/${myChatId}` : 'profile'));
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash !== targetHash) {
        try {
          history.replaceState(null, '', `#${targetHash}`);
        } catch (e) {
          window.location.hash = targetHash;
        }
      }
      if (viewingProfileId) {
        try { sessionStorage.setItem('englishTech_viewingProfileId', viewingProfileId); } catch(e) {}
      }
    }
  }, [activeTab, viewingProfileId, role, myChatId]);

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

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      setChatRecordingTime(0);
      interval = setInterval(() => setChatRecordingTime(t => t + 1), 1000);
    } else {
      setChatRecordingTime(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  useEffect(() => {
    let idleMinutes = 0;
    const resetIdleTime = () => { idleMinutes = 0; };
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetIdleTime, { passive: true }));

    const checkServerVersion = async () => {
      try {
        const res = await fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && typeof __APP_BUILD_TIME__ !== 'undefined') {
            if (Number(data.version) !== Number(__APP_BUILD_TIME__)) {
              const isSafeToReload = !taskTitle && !taskDesc && !activeTakingEval && !isCreatingEval && !chatAppInput && !chatInput && !sugText && !isCreatingGroup;
              if (isSafeToReload) {
                window.location.replace(window.location.pathname + '?_v=' + data.version + '&_ts=' + Date.now() + window.location.hash);
              }
            }
          }
        }
      } catch (e) {}
    };

    // Comprobación periódica cada 2 minutos
    const checkUpdateInterval = setInterval(() => {
      idleMinutes += 2;
      checkServerVersion();
    }, 2 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    };
    const handleFocus = () => {
      checkServerVersion();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(checkUpdateInterval);
      events.forEach(e => window.removeEventListener(e, resetIdleTime));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [taskTitle, taskDesc, activeTakingEval, isCreatingEval, chatAppInput, chatInput, sugText, isCreatingGroup]);

  // --- TÍTULOS DINÁMICOS DE PESTAÑA ---
  useEffect(() => {
    const tabNames = {
      tasks: 'Asignaciones',
      reviews: 'Diapositivas',
      syllabus: 'Contenidos',
      evaluations: 'Evaluaciones',
      directory: 'Directorio',
      groups: 'Grupos',
      inbox: 'Buzón',
      profile: 'Perfil',
    };
              if (isChatAppOpen) {
                  document.title = 'Mensajes | English TECH';
              } else {
                  document.title = `${tabNames[activeTab] || 'Inicio'} | English TECH`;
              }
          }, [activeTab, isChatAppOpen]);


          const getTabClass = (tabName) => {
              return activeTab === tabName ? 'nav-active-tab' : 'hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-gray-700 dark:text-gray-300';
          };

          const getMobileTabClass = (tabName) => {
              let isActive = false;
              if (tabName === 'chat') {
                  isActive = (isChatAppOpen || (!!activeChat && !isChatMinimized)) && !isMobileMenuOpen;
              } else if (tabName === 'menu') {
                  isActive = isMobileMenuOpen || (!isChatAppOpen && (!activeChat || isChatMinimized) && ['reviews', 'syllabus', 'directory', 'evaluations'].includes(activeTab));
              } else {
                  isActive = activeTab === tabName && !isChatAppOpen && (!activeChat || isChatMinimized) && !isMobileMenuOpen;
              }
              if (isActive) {
                  return isDarkMode
                      ? 'text-blue-400 bg-blue-500/15 font-black shadow-xs'
                      : 'text-blue-600 bg-blue-50/80 font-black shadow-xs';
              }
              return isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800';
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

          const callGemini = async (promptText) => {
            try {
              const res = await fetch('/api/gemini', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ promptText: promptText }) 
              });

              if (!res.ok) {
                let errData = {};
                try { errData = await res.json(); } catch(e){}
                if (res.status === 429 || errData.isQuotaExceeded || errData.error === 'quota_exceeded') {
                  setIsAiSessionPaused(true);
                  const err = new Error("QUOTA_EXCEEDED");
                  err.code = "QUOTA_EXCEEDED";
                  throw err;
                }
                const msg = errData.error || errData.message || "Error al conectar con la IA.";
                showMessage(`❌ ${msg}`); 
                return "";
              }

              const data = await res.json();
              const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (reply) {
                setIsAiSessionPaused(false);
              }
              return reply;
            } catch (error) {
              if (error.message === 'QUOTA_EXCEEDED' || error.code === 'QUOTA_EXCEEDED' || error.message?.includes('429')) {
                setIsAiSessionPaused(true);
                throw error;
              }
              console.error("callGemini error:", error);
              return "";
            }
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



          const handleSubmitSuggestion = async (e) => {
            e.preventDefault();
            if (!sugText) return;
            setIsSugLoading(true);

            if (await checkBadWordsAsync(sugText)) {
              showMessage("Contenido inapropiado, se le será notificado a la profesora.");
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'alerts'), { studentName: loggedInName, originalText: sugText, createdAt: Date.now() });
              setShowSugModal(false); 
              setSugText("");
              setSugCategory("");
            } else {
              const studentPhoto = userMappings?.[myChatId]?.profilePicUrl || auth.currentUser?.photoURL || '';
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suggestions'), { 
                  studentName: loggedInName, 
                  studentId: myChatId || null,
                  studentPhoto: studentPhoto,
                  text: sugText.trim(), 
                  category: sugCategory || null,
                  createdAt: Date.now(), 
                  read: false 
              });
              showMessage("✅ Sugerencia enviada."); 
              setShowSugModal(false); 
              setSugText("");
              setSugCategory("");
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
                
                const userPhoto = userMappings?.[cleanUser]?.profilePicUrl || auth.currentUser?.photoURL || (expectedRole === 'teacher' ? userMappings?.['teacher']?.profilePicUrl : null) || '';
                const newAcc = { username: cleanUser, name: targetName, role: expectedRole, email: targetEmail, profilePicUrl: userPhoto };
                const accs = JSON.parse(localStorage.getItem('englishTech_savedAccounts') || '[]');
                const filtered = accs.filter(a => a.username !== cleanUser); 
                const updatedAccs = [newAcc, ...filtered];
                localStorage.setItem('englishTech_savedAccounts', JSON.stringify(updatedAccs));
                setSavedAccounts(updatedAccs);

                const sessionObj = { email: targetEmail, uid: auth.currentUser.uid, userKey: cleanUser, name: targetName, role: expectedRole, isGoogle: false };
                localStorage.setItem('englishTech_activeSession', JSON.stringify(sessionObj));

                setRole(expectedRole);
                setLoggedInUser(expectedRole === 'teacher' ? 'GinaDocente' : `@${cleanUser}`);
                setLoggedInName(expectedRole === 'teacher' ? TEACHER_NAME : targetName);
                setHasEntered(true);
                setLoginType(null);
                showMessage(`👋 ¡Bienvenido(a), ${targetName.split(' ')[0]}!`);

                setLoginError("");
                // Pedir permiso para notificaciones
                if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
                changeTab('tasks');
            } catch (error) {
                setLoginError("Contraseña incorrecta.");
            }
          };

          const handleQuickLogin = (acc) => {
              setLoginType(null);
              setLoginError("");
              
              const cleanUser = acc.username ? acc.username.replace('@', '') : '';
              const targetRole = acc.role || 'student';
              const targetName = targetRole === 'teacher' ? TEACHER_NAME : (acc.name || cleanUser);
              const targetUser = targetRole === 'teacher' ? 'GinaDocente' : `@${cleanUser}`;
              
              const sessionObj = {
                  email: acc.email || '',
                  uid: acc.uid || cleanUser,
                  userKey: cleanUser,
                  name: targetName,
                  role: targetRole,
                  isGoogle: !!acc.isGoogle
              };
              
              localStorage.setItem('englishTech_activeSession', JSON.stringify(sessionObj));
              
              setRole(targetRole);
              setLoggedInUser(targetUser);
              setLoggedInName(targetName);
              setHasEntered(true);
              
              showMessage(`👋 ¡Bienvenido(a) de nuevo, ${targetName.split(' ')[0]}!`);
              changeTab('tasks');
          };

          const handleGoogleSignIn = async () => {
            setLoginError("");
            try {
              const provider = new GoogleAuthProvider();
              const res = await signInWithPopup(auth, provider);
              const gUser = res.user;
              if (!gUser) return;
              
              const email = gUser.email || '';
              const fullName = gUser.displayName || 'Estudiante';
              const photo = gUser.photoURL || '';
              
              // Buscar si ya existe este usuario registrado por email o uid en userMappings
              const existingEntry = Object.entries(userMappings || {}).find(([k, v]) => 
                (v?.email && v.email.toLowerCase() === email.toLowerCase()) || 
                (v?.uid && v.uid === gUser.uid)
              );
              
              // Si ya completó onboarding y existe en la base de datos: entrar directo
              if (existingEntry && existingEntry[1]?.onboardingCompleted) {
                const userKey = existingEntry[0];
                const targetFullName = existingEntry[1].fullName || fullName;
                const targetRole = existingEntry[1].role || 'student';
                
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', userKey), {
                  lastLogin: Date.now()
                }).catch(() => {});

                const newAcc = { username: userKey, name: targetFullName, role: targetRole, email: email, isGoogle: true };
                const accs = JSON.parse(localStorage.getItem('englishTech_savedAccounts') || '[]');
                const filtered = accs.filter(a => a.username !== userKey); 
                const updatedAccs = [newAcc, ...filtered];
                localStorage.setItem('englishTech_savedAccounts', JSON.stringify(updatedAccs));
                setSavedAccounts(updatedAccs);

                const sessionObj = { email: email, uid: gUser.uid, userKey: userKey, name: targetFullName, role: targetRole, isGoogle: true };
                localStorage.setItem('englishTech_activeSession', JSON.stringify(sessionObj));

                setRole(targetRole);
                setLoggedInUser(targetRole === 'teacher' ? 'GinaDocente' : `@${userKey}`);
                setLoggedInName(targetRole === 'teacher' ? TEACHER_NAME : targetFullName);
                setHasEntered(true);
                setLoginType(null);
                showMessage(`👋 ¡Bienvenido(a), ${targetFullName.split(' ')[0]}!`);
                if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
                changeTab('tasks');
                return;
              }

              // Si es PRIMER REGISTRO o no ha completado el paso de personalización:
              let suggestedUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
              if (!suggestedUsername) suggestedUsername = 'student_' + Math.floor(Math.random() * 1000);
              
              // Abrir onboarding intermedio
              setLoginType(null);
              setGoogleOnboarding({
                isOpen: true,
                uid: gUser.uid,
                email: email,
                fullName: fullName,
                username: suggestedUsername,
                photoURL: photo,
                photoChoice: photo ? 'google' : 'initials',
                customPhotoUrl: '',
                isSaving: false
              });

            } catch (err) {
              console.error('Google Sign In error:', err);
              if (err.code === 'auth/operation-not-allowed') {
                setLoginError("⚠️ El proveedor de Google aún no está habilitado en Firebase. En Firebase Console > Authentication > Sign-in method > haz clic en 'Google' y activa el interruptor 'Habilitar'.");
              } else if (err.code === 'auth/unauthorized-domain') {
                setLoginError("⚠️ Dominio no autorizado en Firebase. Agrega 'gina-docente-qq2s.vercel.app' en Firebase Console > Authentication > Settings > Authorized domains.");
              } else if (err.code === 'auth/popup-blocked') {
                setLoginError("La ventana emergente de Google fue bloqueada por tu navegador. Permite popups o ingresa con tu usuario y contraseña.");
              } else if (err.code === 'auth/popup-closed-by-user') {
                setLoginError("Inicio de sesión con Google cancelado.");
              } else {
                setLoginError("No se pudo iniciar sesión con Google: " + (err.message || 'Error desconocido'));
              }
            }
          };

          const handleOnboardingPhotoFile = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
              showMessage("⚠️ Formato no permitido. Solo se aceptan imágenes PNG, JPG o WebP.");
              return;
            }
            try {
              const compressed = await compressImage(file, 400, 400, 0.7);
              setGoogleOnboarding(p => ({
                ...p,
                photoChoice: 'custom',
                customPhotoUrl: compressed
              }));
            } catch (err) {
              console.error("Error al procesar foto:", err);
              showMessage("❌ Error al procesar la imagen seleccionada.");
            }
          };

          const handleCompleteGoogleOnboarding = async (e) => {
            e.preventDefault();
            const finalName = (googleOnboarding.fullName || '').trim();
            const rawUser = (googleOnboarding.username || '').trim().toLowerCase().replace('@', '').replace(/[^a-z0-9_]/g, '');
            
            if (!finalName || !rawUser) {
              showMessage("⚠️ Por favor completa tu nombre y nombre de usuario.");
              return;
            }

            setGoogleOnboarding(prev => ({ ...prev, isSaving: true }));

            try {
              // Validar si el username ya está tomado por OTRO usuario distinto
              const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', rawUser);
              const existingSnap = await getDoc(userDocRef);
              if (existingSnap.exists()) {
                const existingData = existingSnap.data();
                if (existingData.email?.toLowerCase() !== googleOnboarding.email.toLowerCase() && existingData.uid !== googleOnboarding.uid) {
                  showMessage(`⚠️ El usuario @${rawUser} ya pertenece a otro estudiante. Elige otro.`);
                  setGoogleOnboarding(prev => ({ ...prev, isSaving: false }));
                  return;
                }
              }

              let finalPhoto = '';
              if (googleOnboarding.photoChoice === 'google') {
                finalPhoto = googleOnboarding.photoURL || '';
              } else if (googleOnboarding.photoChoice === 'custom') {
                finalPhoto = googleOnboarding.customPhotoUrl || '';
              } else {
                finalPhoto = ''; // initials
              }

              await setDoc(userDocRef, {
                fullName: finalName,
                email: googleOnboarding.email,
                role: 'student',
                profilePicUrl: finalPhoto,
                uid: googleOnboarding.uid,
                onboardingCompleted: true,
                createdAt: Date.now(),
                lastLogin: Date.now()
              }, { merge: true });

              const newAcc = { username: rawUser, name: finalName, role: 'student', email: googleOnboarding.email, isGoogle: true };
              const accs = JSON.parse(localStorage.getItem('englishTech_savedAccounts') || '[]');
              const filtered = accs.filter(a => a.username !== rawUser); 
              const updatedAccs = [newAcc, ...filtered];
              localStorage.setItem('englishTech_savedAccounts', JSON.stringify(updatedAccs));
              setSavedAccounts(updatedAccs);

              const sessionObj = { email: googleOnboarding.email, uid: googleOnboarding.uid, userKey: rawUser, name: finalName, role: 'student', isGoogle: true };
              localStorage.setItem('englishTech_activeSession', JSON.stringify(sessionObj));

              setRole('student');
              setLoggedInUser(`@${rawUser}`);
              setLoggedInName(finalName);
              setHasEntered(true);
              setGoogleOnboarding({ isOpen: false, uid: '', email: '', fullName: '', username: '', photoURL: '', photoChoice: 'google', customPhotoUrl: '', isSaving: false });
              showMessage(`🎉 ¡Perfil configurado! Bienvenido(a), ${finalName.split(' ')[0]}.`);
              if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
              changeTab('tasks');
            } catch (err) {
              console.error('Onboarding save error:', err);
              showMessage("❌ Error al guardar perfil: " + err.message);
              setGoogleOnboarding(prev => ({ ...prev, isSaving: false }));
            }
          };

          const handleStudentRegister = async (e) => {
            e.preventDefault();
            const form = e.target;
            const fullName = (form.reg_fullname?.value || '').trim();
            const username = (form.reg_username?.value || '').trim().toLowerCase().replace('@', '').replace(/[^a-z0-9_]/g, '');
            const email = (form.reg_email?.value || '').trim().toLowerCase();
            const password = form.reg_password?.value || '';

            if (!fullName || !username || !email || !password) {
              setLoginError("Por favor completa todos los campos requeridos.");
              return;
            }
            if (password.length < 6) {
              setLoginError("La contraseña debe tener al menos 6 caracteres.");
              return;
            }

            setIsRegisteringStudent(true);
            setLoginError("");

            try {
              // 1. Validar nombre de usuario único
              const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', username);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists() || username === 'teacher' || username === 'admin') {
                const uData = userSnap.data();
                if (uData.email?.toLowerCase() !== email) {
                  setLoginError(`El usuario @${username} ya está en uso por otro estudiante.`);
                  setIsRegisteringStudent(false);
                  return;
                }
              }

              // 2. Intentar crear cuenta en Firebase Auth con manejo de correos eliminados
              let registeredUser = null;
              try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                registeredUser = userCredential.user;
              } catch (authErr) {
                if (authErr.code === 'auth/email-already-in-use') {
                  // El correo ya existía en Firebase Auth (ej: fue eliminado del directorio previamente)
                  // Intentamos autenticar con la contraseña provista
                  try {
                    const cred = await signInWithEmailAndPassword(auth, email, password);
                    registeredUser = cred.user;
                  } catch (signInErr) {
                    setLoginError("Este correo ya estaba registrado previamente en la plataforma. Si olvidaste tu contraseña anterior, puedes usar '¿Olvidaste tu contraseña?' para recuperarla.");
                    setIsRegisteringStudent(false);
                    return;
                  }
                } else {
                  throw authErr;
                }
              }

              // 3. Guardar en userMappings
              await setDoc(userDocRef, {
                fullName: fullName,
                email: email,
                role: 'student',
                createdAt: Date.now(),
                onboardingCompleted: true,
                uid: registeredUser ? registeredUser.uid : ''
              }, { merge: true });

              // 4. Guardar cuenta rápida local
              const newAcc = { username: username, name: fullName, role: 'student', email: email };
              const accs = JSON.parse(localStorage.getItem('englishTech_savedAccounts') || '[]');
              const filtered = accs.filter(a => a.username !== username);
              const updatedAccs = [newAcc, ...filtered];
              localStorage.setItem('englishTech_savedAccounts', JSON.stringify(updatedAccs));
              setSavedAccounts(updatedAccs);

              setLoginType(null);
              setIsStudentRegisterMode(false);
              showMessage(`🎉 ¡Cuenta creada con éxito! Bienvenido(a), ${fullName.split(' ')[0]}.`);
              if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
              changeTab('tasks');
            } catch (err) {
              console.error('Registration error:', err);
              if (err.code === 'auth/invalid-email') {
                setLoginError("El formato de correo electrónico no es válido.");
              } else if (err.code === 'auth/weak-password') {
                setLoginError("La contraseña debe tener al menos 6 caracteres.");
              } else {
                setLoginError("Error al registrarse: " + (err.message || 'Intenta de nuevo.'));
              }
            } finally {
              setIsRegisteringStudent(false);
            }
          };

          const handleForgotPassword = (targetEmailOrUser) => {
            setForgotPasswordState({
              isOpen: true,
              input: targetEmailOrUser || '',
              isSending: false,
              sentToEmail: null,
              error: ''
            });
          };

          const submitForgotPassword = async (e) => {
            if (e) e.preventDefault();
            const input = (forgotPasswordState.input || '').trim().toLowerCase().replace('@', '');
            if (!input) {
              setForgotPasswordState(prev => ({ ...prev, error: 'Por favor ingresa tu usuario o correo electrónico.' }));
              return;
            }

            let emailToSend = '';
            if (input.includes('@')) {
              emailToSend = input;
            } else if (userMappings[input]?.email) {
              emailToSend = userMappings[input].email;
            } else if (FALLBACK_MAP[input]?.email) {
              emailToSend = FALLBACK_MAP[input].email;
            }

            if (!emailToSend) {
              setForgotPasswordState(prev => ({ ...prev, error: 'No encontramos ningún usuario o correo con ese nombre en el directorio.' }));
              return;
            }

            setForgotPasswordState(prev => ({ ...prev, isSending: true, error: '' }));
            try {
              await sendPasswordResetEmail(auth, emailToSend);
              setForgotPasswordState(prev => ({ ...prev, isSending: false, sentToEmail: emailToSend, error: '' }));
            } catch (err) {
              setForgotPasswordState(prev => ({ 
                ...prev, 
                isSending: false, 
                error: 'Error al enviar correo: ' + (err.code === 'auth/user-not-found' ? 'Correo no registrado' : err.message) 
              }));
            }
          };

          const handleResetStudentPasswordByTeacher = async (studentEmail, studentName) => {
            if (!studentEmail) return showMessage("❌ Este estudiante no tiene un correo registrado.");
            try {
              await sendPasswordResetEmail(auth, studentEmail);
              showMessage(`✅ Enlace de restablecimiento enviado a ${studentName} (${studentEmail}).`);
            } catch (err) {
              showMessage("❌ Error al enviar enlace: " + err.message);
            }
          };

          const removeSavedAccount = (username) => {
              const filtered = savedAccounts.filter(a => a.username !== username);
              localStorage.setItem('englishTech_savedAccounts', JSON.stringify(filtered));
              setSavedAccounts(filtered);
          };

          const handleAiTranslate = async (lang) => {
            if (!taskDesc && !taskTitle) return showMessage("Escribe un título o descripción para traducir primero.");
            setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
            
            const prompt = `Traduce el siguiente contenido educativo al idioma ${lang}.
INSTRUCCIÓN ESTRICTA: NO uses asteriscos (** ni *) para negritas ni formato en ninguna palabra. Devuelve texto limpio.

Devuelve ÚNICAMENTE en este formato exacto:
TITULO: [Título traducido al ${lang}]
DESCRIPCION: [Descripción traducida al ${lang}]

Título original: ${taskTitle || 'Sin título'}
Descripción original: ${taskDesc || 'Sin descripción'}`;
            
            try {
                const result = await callGemini(prompt);
                if (!result) { 
                    setIsAiLoading(false); 
                    return showMessage("❌ No se pudo obtener la traducción de la IA."); 
                }
                
                const cleanText = (str) => (str || '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
                const titleMatch = result.match(/(?:T[IÍ]TULO|TITLE)\s*[:\-]?\s*\*?\*?\s*(.*)/i);
                const descMatch = result.match(/(?:DESCRIPCI[OÓ]N|DESCRIPTION)\s*[:\-]?\s*\*?\*?\s*([\s\S]*)/i);

                if (titleMatch && descMatch && titleMatch[1].trim()) {
                    if (taskTitle) setTaskTitle(cleanText(titleMatch[1]));
                    setTaskDesc(cleanText(descMatch[1]));
                    setHasAiModified(true);
                    showMessage(`✅ Traducido a ${lang} exitosamente.`);
                } else if (result.trim()) {
                    setTaskDesc(cleanText(result));
                    setHasAiModified(true);
                    showMessage(`✅ Traducido a ${lang} exitosamente.`);
                } else {
                    showMessage("Hubo un error al procesar la traducción. Intenta de nuevo.");
                }
            } catch(e) {
                console.error("Error en traducción con IA:", e);
                showMessage("❌ Error al procesar la traducción.");
            } finally {
                setIsAiLoading(false);
            }
          };

          const handleTranslateMessage = async (msgId, text) => {
            if (chatTranslations[msgId]) {
              setChatTranslations(prev => {
                const next = { ...prev };
                delete next[msgId];
                return next;
              });
              return;
            }
            setTranslatingMsgIds(prev => ({ ...prev, [msgId]: true }));
            try {
              const result = await callGemini(`Traduce el siguiente texto al español de forma natural, fluida y precisa. Devuelve ÚNICAMENTE la traducción directa sin comillas:\n\n${text}`);
              if (result) {
                const clean = result.replace(/```json/gi, '').replace(/```/gi, '').trim();
                setChatTranslations(prev => ({ ...prev, [msgId]: clean }));
              } else {
                showMessage("❌ No se pudo traducir el mensaje.");
              }
            } catch (e) {
              showMessage("❌ Error al traducir el mensaje.");
            } finally {
              setTranslatingMsgIds(prev => ({ ...prev, [msgId]: false }));
            }
          };

          const handleLogout = async () => {
            // APAGAR EL FOQUITO VERDE ANTES DE SALIR
            if (myChatId) {
                const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId), { isOnline: false, status: 'offline', lastSeen: Date.now() }, { merge: true }).catch(()=>{});
            }
            
            if (role === 'student' && (user || myChatId)) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'users', user?.uid || myChatId, 'chatbot', 'history'));
                } catch(e) { console.error(e); }
            }
            localStorage.removeItem('englishTech_activeSession');
            // No hacemos signOut(auth) para mantener persistencia silenciosa (sin popup de Google)
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

              const prompt = `Rol: Eres el asistente virtual académico de English TECH (orientado a apoyar las clases de la Profesora Gina).
              Reglas pedagógicas:
              1. Mantén un trato respetuoso, claro, pedagógico y motivador.
              2. Responde dudas sobre la materia de inglés, actividades, vocabulario, gramática y temas vistos en clase.
              3. Sé conciso y directo (máximo 2 a 3 oraciones por respuesta). Usa emojis con moderación.
              
              Información y anuncios de la profesora:
              ${botInfoList.map(i => "- " + i.text).join('\n')}
              
              Historial de la conversación:
              ${newHistory.map(m => `${m.role === 'user' ? 'Estudiante' : 'Asistente'}: ${m.text}`).join('\n')}
              Estudiante: ${userMsg}
              Asistente (Respuesta pedagógica y concisa):`;

              try {
                  const reply = await callGemini(prompt);
                  const finalHistory = [...newHistory, { role: 'bot', text: reply || "Disculpa, no pude procesar la respuesta en este momento. Por favor intenta de nuevo." }];
                  await setDoc(doc(db, 'artifacts', appId, 'users', user?.uid || myChatId || 'guest', 'chatbot', 'history'), { messages: finalHistory });
              } catch (err) {
                  console.error(err);
                  const finalHistory = [...newHistory, { role: 'bot', text: "Ocurrió una interrupción al conectar con el asistente. Intenta de nuevo." }];
                  await setDoc(doc(db, 'artifacts', appId, 'users', user?.uid || myChatId || 'guest', 'chatbot', 'history'), { messages: finalHistory }).catch(()=>{});
              } finally {
                  setIsChatLoading(false);
              }
          };

          useEffect(() => {
            const uMappings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userMappings'), s => {
                const maps = {};
                s.docs.forEach(d => { maps[d.id] = d.data(); });
                setUserMappings(maps);
                setUserMappingsLoaded(true);
            }, (err) => {
                console.warn('userMappings snapshot warning:', err);
                setUserMappingsLoaded(true);
            });
            return () => uMappings();
          }, []);

          useEffect(() => {
            const unsubscribe = onAuthStateChanged(auth, async (u) => {
                setUser(u);
                
                if (!u) {
                  try {
                    await signInAnonymously(auth);
                  } catch (e) {
                    console.warn('Anonymous auth note:', e);
                  }
                }
                
                const rawSession = localStorage.getItem('englishTech_activeSession');
                if (!rawSession) {
                    // Si el usuario cerró sesión explícitamente y no hay sesión activa en localStorage, nos quedamos en Login
                    return;
                }

                try {
                    const activeSession = JSON.parse(rawSession);
                    if (activeSession && (activeSession.userKey || activeSession.name)) {
                        const cleanKey = (activeSession.userKey || '').replace('@', '');
                        const finalRole = activeSession.role || 'student';
                        const finalName = finalRole === 'teacher' ? TEACHER_NAME : (activeSession.name || cleanKey);
                        const finalUser = finalRole === 'teacher' ? 'GinaDocente' : `@${cleanKey}`;
                        
                        setRole(finalRole);
                        setLoggedInUser(finalUser);
                        setLoggedInName(finalName);
                        setHasEntered(true);
                        setLoginType(null);
                        return;
                    }
                } catch (e) {
                    console.error('Error al restaurar sesión activa:', e);
                }

                if (u && u.email) {
                    const emailLower = u.email.toLowerCase();
                    let foundKey = Object.keys(userMappings || {}).find(k => 
                        (userMappings[k]?.email && userMappings[k].email.toLowerCase() === emailLower) ||
                        (userMappings[k]?.uid && userMappings[k].uid === u.uid)
                    );
                    if (!foundKey) {
                        foundKey = Object.keys(FALLBACK_MAP).find(k => FALLBACK_MAP[k]?.email?.toLowerCase() === emailLower);
                    }

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
                        localStorage.setItem('englishTech_activeSession', JSON.stringify({ email: u.email, uid: u.uid, userKey: foundKey, name: finalName, role: finalRole }));
                    }
                }
            });
            return () => unsubscribe();
          }, [userMappings]);

          // 1. COSAS GLOBALES (Se necesitan siempre para notificaciones y chats)
useEffect(() => {
    if (!myChatId) return;
    const base = ['artifacts', appId, 'public', 'data'];
    const uidKey = user?.uid || myChatId;
    
    const uBotSettings = onSnapshot(doc(db, ...base, 'settings', 'bot'), d => setBotInfoList(d.data()?.infoList || []));
    const uChat = onSnapshot(doc(db, 'artifacts', appId, 'users', uidKey, 'chatbot', 'history'), d => setChatHistory(d.data()?.messages || []));
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
                    if (soundEnabledRef.current) {
                        playNotificationSound();
                    }
                    if (pushEnabledRef.current && 'Notification' in window && Notification.permission === 'granted') {
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

    const uChatPrefs = onSnapshot(doc(db, 'artifacts', appId, 'users', uidKey, 'preferences', 'chat'), d => {
        if (d.exists()) setChatPreferences(d.data().prefs || {});
        else setChatPreferences({});
    });

    const uPresence = onSnapshot(collection(db, ...base, 'presence'), s => {
        const p = {}; s.docs.forEach(d => p[d.id] = d.data()); setUserPresence(p); userPresenceRef.current = p;
    });

    // 👇 Cazafantasmas: revisa los latidos cada 30 seg y PERSISTE el offline en Firestore
    // (antes solo corregía el estado local, y el snapshot de la BD resucitaba al fantasma)
    const ghostInterval = setInterval(() => {
        const now = Date.now();
        const prev = userPresenceRef.current;
        const staleKeys = Object.keys(prev).filter(k =>
            prev[k].status !== 'offline' && prev[k].lastPing && (now - prev[k].lastPing > 180000)
        );
        if (staleKeys.length === 0) return;
        const newP = { ...prev };
        staleKeys.forEach(k => { newP[k] = { ...newP[k], status: 'offline', isOnline: false }; });
        setUserPresence(newP);
        userPresenceRef.current = newP;
        staleKeys.forEach(k => {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', k), { isOnline: false, status: 'offline', lastSeen: Date.now() }, { merge: true }).catch(() => {});
        });
    }, 30000);

    const uTyping = onSnapshot(collection(db, ...base, 'typing'), s => {
        const t = {}; s.docs.forEach(d => t[d.id] = d.data()); setTypingStatus(t);
    });

    // Listener para el conocimiento del bot de la profe
    const uTeacherBot = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'teacherBot'), d => setTeacherBotInfoList(d.data()?.infoList || []));
    const uTeacherBotHist = onSnapshot(doc(db, 'artifacts', appId, 'users', 'teacher', 'teacherBot', 'history'), d => {
        if (d.exists()) {
            setTeacherBotHistory(d.data()?.messages || []);
        }
    });

   return () => { uBotSettings(); uChat(); uGroups(); uUnread(); uLastMsgs(); uChatPrefs(); uPresence(); uTyping(); uAcad(); uTeacherBot(); uTeacherBotHist(); clearInterval(ghostInterval); };
}, [user, myChatId]);

// Rotación de mensajes del bot mientras "piensa"
useEffect(() => {
    if (!isTeacherBotLoading) return;
    setThinkingMsg(Math.floor(Math.random() * 8));
    const id = setInterval(() => setThinkingMsg(i => (i + 1) % 8), 2500);
    return () => clearInterval(id);
}, [isTeacherBotLoading]);

// Auto-sincronización de materias académicas con salas de chat grupales
useEffect(() => {
  if (!academicGroups || academicGroups.length === 0 || !myChatId) return;
  academicGroups.forEach(g => {
      const chatGroupId = `acad_${g.id}`;
      const existing = chatGroups.find(cg => cg.id === chatGroupId || cg.id === `group_${g.id}`);
      const groupMembers = Array.from(new Set([myChatId, 'teacher', ...(g.members || [])]));
      if (!existing) {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', chatGroupId), {
              id: chatGroupId,
              academicGroupId: g.id,
              name: g.name,
              members: groupMembers,
              emoji: g.emoji || 'BookOpen',
              avatarUrl: g.avatarUrl || g.coverUrl || '',
              createdBy: 'teacher',
              isAcademicGroupChat: true,
              createdAt: g.createdAt || Date.now()
          }, { merge: true }).catch(() => {});
      }
  });
}, [academicGroups, chatGroups, myChatId]);

// 2. PESTAÑA: ASIGNACIONES (Muro de clase)
useEffect(() => {
    if (!hasEntered || !myChatId || activeTab !== 'tasks') return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('createdAt', 'desc'), limit(taskLimit));
    const uTasks = onSnapshot(q, s => { 
        setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))); 
        setTasksLoading(false); 
    }, err => {
        console.error('Error cargando tareas:', err);
        setTasksLoading(false);
    });
    const fallbackTimer = setTimeout(() => setTasksLoading(false), 3500);
    return () => { uTasks(); clearTimeout(fallbackTimer); };
}, [hasEntered, myChatId, activeTab, taskLimit]);

// 2b. POSTS FIJADOS (independiente de la paginación)
useEffect(() => {
    if (!hasEntered || !myChatId || activeTab !== 'tasks') return;
    const qPinned = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), where('isPinned', '==', true));
    const uPinned = onSnapshot(qPinned, s => {
        const pinnedList = s.docs.map(d => ({ id: d.id, ...d.data() }));
        pinnedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPinnedTasks(pinnedList);
    }, err => {
        console.error('Error cargando posts fijados:', err);
    });
    return () => uPinned();
}, [hasEntered, myChatId, activeTab]);

// 3. PESTAÑA: PERFIL (Muro de Pinterest)
useEffect(() => {
    if (!hasEntered || !myChatId || activeTab !== 'profile') return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'userPosts'), orderBy('createdAt', 'desc'), limit(20));
    const uUserPosts = onSnapshot(q, s => setUserPosts(s.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error(err));
    return () => uUserPosts();
}, [hasEntered, myChatId, activeTab]);

// 4. PESTAÑA: REPASOS (Diapositivas)
useEffect(() => {
    if (!hasEntered || !myChatId || activeTab !== 'reviews') return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), orderBy('createdAt', 'desc'), limit(15));
    const uReviews = onSnapshot(q, s => setReviews(s.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error(err));
    return () => uReviews();
}, [hasEntered, myChatId, activeTab]);

// 5. PESTAÑA: SYLLABUS
useEffect(() => {
    if (!hasEntered || !myChatId || activeTab !== 'syllabus') return;
    const uSyllabus = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'syllabus'), limit(100)), s => setSyllabus(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.week - b.week)), err => console.error(err));
    return () => uSyllabus();
}, [hasEntered, myChatId, activeTab]);

// 6. PESTAÑA: EVALUACIONES Y NOTAS
useEffect(() => {
    if (!hasEntered || !myChatId || activeTab !== 'evaluations') return;
    const uEvals = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'evaluations'), limit(50)), s => setEvaluations(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)), err => console.error(err));
    const uGrades = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'grades'), limit(100)), s => setGrades(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)), err => console.error(err));
    return () => { uEvals(); uGrades(); };
}, [hasEntered, myChatId, activeTab]);

// 7. PESTAÑA: BUZÓN (Solo para la profesora)
useEffect(() => {
    if (!hasEntered || !myChatId || activeTab !== 'inbox' || role !== 'teacher') return;
    const uSug = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suggestions'), s => setSuggestions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)), err => console.error(err));
    const uAlerts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'alerts'), s => setAlerts(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)), err => console.error(err));
    return () => { uSug(); uAlerts(); };
}, [hasEntered, myChatId, activeTab, role]);
            useEffect(() => {
              if (myChatId) {
                  const finalPresenceId = role === 'teacher' ? 'teacher' : myChatId;
                  const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', finalPresenceId);
                  
                  let awayTimer;
                  let busyTimer;
                  let pingInterval; 
                  let forceOfflineTimer; // 👈 NUEVO: El contador de 24 horas
                  let currentStatus = 'offline';

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
                          // Re-afirma online/status: se auto-recupera si el cazafantasmas lo marcó offline
                          // por un apagón de red que duró más del margen permitido
                          setDoc(presenceRef, { lastPing: Date.now(), isOnline: true, status: currentStatus }, { merge: true }).catch(()=>{});
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

                  let hiddenTimer; // ← Período de gracia al ocultar pestaña

                  const handleVisibilityForPresence = () => {
                      if (document.visibilityState === 'hidden') {
                          // Esperar 20 seg antes de marcar offline — el usuario puede volver rápido
                          hiddenTimer = setTimeout(handleOffline, 20000);
                      } else {
                          clearTimeout(hiddenTimer); // Volvió antes → cancelar
                          setOnline();
                      }
                  };

                  // NOTA: 'blur' se eliminó — era demasiado agresivo
                  // (se disparaba al hacer clic en la barra de URL, DevTools, cambiar de app 2 seg, etc.)
                  // La combinación de visibilitychange + beforeunload + pagehide cubre todos los casos reales.
                  window.addEventListener('focus', setOnline);
                  window.addEventListener('beforeunload', handleOffline);
                  window.addEventListener('pagehide', handleOffline);
                  document.addEventListener('visibilitychange', handleVisibilityForPresence);

                  return () => { 
                      clearTimeout(awayTimer);
                      clearTimeout(busyTimer);
                      clearTimeout(throttleTimer);
                      clearTimeout(forceOfflineTimer);
                      clearTimeout(hiddenTimer); // ← cleanup del timer de gracia
                      clearInterval(pingInterval);
                      events.forEach(e => window.removeEventListener(e, handleActivity));
                      handleOffline(); 
                      window.removeEventListener('focus', setOnline);
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
              if (!activeChat || !myChatId) return;
              const base = ['artifacts', appId, 'public', 'data'];
              const unsubscribe = onSnapshot(collection(db, ...base, 'chats', activeChat.id, 'messages'), s => {
                  setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.createdAt - b.createdAt));
              }, err => console.error('Chat messages listener error:', err));
              return () => unsubscribe();
          }, [activeChat, myChatId]);
            // NUEVO: Efecto para marcar los mensajes como leídos cuando entras al chat
          useEffect(() => {
              if (!activeChat || !myChatId || chatMessages.length === 0) return;

              const markAsRead = async () => {
                  const unreadMessages = chatMessages.filter(m => m.authorId !== myChatId && m.status !== 'read');
                  
                  for (const msg of unreadMessages) {
                      const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages', msg.id);
                      await updateDoc(msgRef, { status: 'read', readAt: Date.now() }).catch(() => {});
                  }
              };

              markAsRead();
          }, [chatMessages, activeChat, myChatId, db, appId]);
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
                      text: last?.text || (last?.imageUrl ? '📷 Imagen' : ''),
                      author: (last?.author || 'Usuario').split(' ')[0],
                      createdAt: last?.createdAt || Date.now()
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
              const prefsUid = user?.uid || myChatId;
              if (prefsUid) {
                  await setDoc(doc(db, 'artifacts', appId, 'users', prefsUid, 'preferences', 'chat'), { prefs: newPrefs }, { merge: true });
              }
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
            
          const handleUpdateGroupPhoto = async (e) => {
      const file = e.target.files?.[0];
      if (!file || !activeChat) return;
      try {
          setIsUploadingGroupAvatar(true);
          const compressed = await compressImage(file);
          const url = await uploadImageToStorage(compressed, `group_avatars/${activeChat.id}_${Date.now()}.jpg`);
          const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id);
          if (grp) {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', grp.id), { avatarUrl: url });
              if (grp.academicGroupId || grp.id.startsWith('acad_')) {
                  const acadId = grp.academicGroupId || grp.id.replace('acad_', '');
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', acadId), { avatarUrl: url }).catch(() => {});
              }
          }
          setActiveChat(prev => ({ ...prev, avatarUrl: url }));
          setChatGroups(prev => prev.map(cg => (cg.id === activeChat.id || `group_${cg.id}` === activeChat.id || `acad_${cg.id}` === activeChat.id || `acad_${cg.academicGroupId}` === activeChat.id) ? { ...cg, avatarUrl: url } : cg));
          showMessage("✅ Foto del grupo actualizada con éxito");
      } catch (err) {
          console.error("Error updating group photo:", err);
          showMessage("❌ Error al subir la imagen");
      } finally {
          setIsUploadingGroupAvatar(false);
          if (groupAvatarFileInputRef.current) groupAvatarFileInputRef.current.value = "";
      }
  };

  const handleSaveGroupName = async () => {
      if (!editGroupNameVal.trim() || !activeChat) return;
      const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id);
      if (grp) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', grp.id), { name: editGroupNameVal.trim() });
          if (grp.academicGroupId || grp.id.startsWith('acad_')) {
              const acadId = grp.academicGroupId || grp.id.replace('acad_', '');
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', acadId), { name: editGroupNameVal.trim() }).catch(() => {});
          }
      }
      setActiveChat(prev => ({ ...prev, name: editGroupNameVal.trim() }));
      setIsEditingGroupName(false);
      showMessage("✅ Nombre del grupo actualizado");
  };

  const handleSaveGroupDesc = async () => {
      if (!activeChat) return;
      const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id);
      if (grp) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', grp.id), { description: editGroupDescVal.trim() });
          if (grp.academicGroupId || grp.id.startsWith('acad_')) {
              const acadId = grp.academicGroupId || grp.id.replace('acad_', '');
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', acadId), { description: editGroupDescVal.trim() }).catch(() => {});
          }
      }
      setIsEditingGroupDesc(false);
      showMessage("✅ Descripción guardada");
  };

  const handleRemoveGroupMember = async (memberKey, memberName) => {
      confirmAction(`¿Remover a "${memberName}" del grupo?`, async () => {
          const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id);
          if (!grp) return;
          const updatedMembers = (grp.members || []).filter(m => m !== memberKey);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', grp.id), { members: updatedMembers });
          if (grp.academicGroupId || grp.id.startsWith('acad_')) {
              const acadId = grp.academicGroupId || grp.id.replace('acad_', '');
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', acadId), { members: updatedMembers.filter(m => m !== 'teacher') }).catch(() => {});
          }
          showMessage(`✅ "${memberName}" fue removido del grupo`);
      });
  };

  const handleAddMembersToCurrentGroup = async () => {
      if (selectedNewMembers.length === 0 || !activeChat) return;
      const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id);
      if (!grp) return;
      const updatedMembers = Array.from(new Set([...(grp.members || []), ...selectedNewMembers]));
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', grp.id), { members: updatedMembers });
      if (grp.academicGroupId || grp.id.startsWith('acad_')) {
          const acadId = grp.academicGroupId || grp.id.replace('acad_', '');
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', acadId), { members: updatedMembers.filter(m => m !== 'teacher') }).catch(() => {});
      }
      setShowAddMembersModal(false);
      setSelectedNewMembers([]);
      setAddMemberSearch("");
      showMessage(`✅ Se añadieron ${selectedNewMembers.length} integrante(s) al grupo`);
  };

  const handleLeaveGroupChat = async () => {
      confirmAction("¿Estás seguro de que deseas salir de este grupo?", async () => {
          const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id);
          if (!grp) return;
          const updatedMembers = (grp.members || []).filter(m => m !== myChatId);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', grp.id), { members: updatedMembers });
          if (grp.academicGroupId || grp.id.startsWith('acad_')) {
              const acadId = grp.academicGroupId || grp.id.replace('acad_', '');
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', acadId), { members: updatedMembers.filter(m => m !== 'teacher') }).catch(() => {});
          }
          setActiveChat(null);
          setShowGroupInfo(false);
          showMessage("✅ Has salido del grupo.");
      });
  };

  const handleSendAppMessage = async (e) => {
      if (e) e.preventDefault();
      if (isSendingChatAppMessageRef.current) return;
      if (!chatAppInput.trim() && !chatAppImageUrl.trim() && !chatAppFileUrl && !chatAppAudioUrl) return;

      isSendingChatAppMessageRef.current = true;

      // Capturar contenido sincrónicamente
      const textToSend = chatAppInput.trim();
      const imgToSend = chatAppImageUrl.trim();
      const fileToSend = chatAppFileUrl;
      const fileNameToSend = chatAppFileName;
      const audioToSend = chatAppAudioUrl;
      const replyToSend = replyingTo ? { id: replyingTo.id, text: replyingTo.text || '', author: replyingTo.author || '', imageUrl: replyingTo.imageUrl || '' } : null;

      // Limpiar inputs inmediatamente para prevenir re-envíos por doble clic/Enter
      setChatAppInput("");
      setChatAppImageUrl("");
      setChatAppAudioUrl("");
      setChatAppFileUrl("");
      setChatAppFileName("");
      setShowChatAppAttachmentMenu(false);
      setShowChatAppImageInput(false);
      setShowChatAppEmojiPicker(false);
      setReplyingTo(null);

      // Apagar estado 'Escribiendo...' inmediatamente
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'typing', activeChat.id), { [myChatId]: false }, { merge: true }).catch(()=>{});
      clearTimeout(typingTimeout.current);

      try {
          if (textToSend && await checkBadWordsAsync(textToSend)) {
              showMessage("⚠️ Mensaje bloqueado: Lenguaje inapropiado.");
              return;
          }

          const authorName = role === 'teacher' ? TEACHER_NAME : loggedInName;
          const msgPreviewText = textToSend || (imgToSend ? '📷 Imagen' : (fileToSend ? '📄 Documento' : (audioToSend ? '🎤 Nota de voz' : '')));
          const previewName = role === 'teacher' ? 'Profesora' : (loggedInName || 'Estudiante').split(' ')[0];

          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats', activeChat.id, 'messages'), {
              text: textToSend,
              imageUrl: imgToSend,
              fileUrl: fileToSend,
              fileName: fileNameToSend,
              audioUrl: audioToSend,
              author: authorName,
              authorId: myChatId,
              uid: user?.uid || myChatId || '',
              status: 'sent',
              replyTo: replyToSend,
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
              const group = chatGroups.find(g => `group_${g.id}` === activeChat.id || g.id === activeChat.id);
              if (group) targetIds = (group.members || []).filter(id => id !== myChatId);
          } else {
              targetIds = [activeChat.id.replace('dm_', '').split('_').find(id => id !== myChatId)];
          }

          targetIds.forEach(async tId => {
              if(tId) {
                  const alertRef = doc(db, 'artifacts', appId, 'public', 'data', 'chatAlerts', tId);
                  const alertSnap = await getDoc(alertRef).catch(() => null);
                  if (alertSnap && alertSnap.exists()) {
                      await updateDoc(alertRef, { hasUnread: true, timestamp: Date.now(), [`chats.${activeChat.id}`]: true, previewSender: previewName, previewText: msgPreviewText }).catch(() => {});
                  } else {
                      await setDoc(alertRef, { hasUnread: true, timestamp: Date.now(), chats: { [activeChat.id]: true }, previewSender: previewName, previewText: msgPreviewText }).catch(() => {});
                  }
              }
          });
      } catch (err) {
          console.error("Error enviando mensaje de chat:", err);
          showMessage("❌ Error al enviar el mensaje. Intente de nuevo.");
      } finally {
          setTimeout(() => {
              isSendingChatAppMessageRef.current = false;
          }, 350);
      }
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

          const toggleVoiceRecording = async () => {
              if (isRecording) {
                  recordingRef.current?.stop();
                  return;
              }
              try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  recordingStreamRef.current = stream;
                  const mediaRecorder = new MediaRecorder(stream);
                  recordingRef.current = mediaRecorder;
                  const chunks = [];
                  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                  mediaRecorder.onstop = async () => {
                      const blob = new Blob(chunks, { type: 'audio/webm' });
                      stream.getTracks().forEach(t => t.stop());
                      recordingStreamRef.current = null;
                      setIsRecording(false);
                      try {
                          showMessage("⏳ Subiendo audio...");
                          const file = new File([blob], `nota-${Date.now()}.webm`, { type: 'audio/webm' });
                          const url = await uploadRawFileToStorage(file, 'chat_audios');
                          setChatAppAudioUrl(url);
                          showMessage("✅ Nota lista para enviar");
                      } catch (err) {
                          showMessage("Hubo un error al subir el audio.");
                      }
                  };
                  mediaRecorder.start();
                  setIsRecording(true);
                  showMessage("🎙️ Grabando...");
              } catch (err) {
                  showMessage("No se pudo acceder al micrófono.");
              }
          };

          const cancelVoiceRecording = () => {
              setIsRecording(false);
              setChatAppAudioUrl("");
              if (recordingRef.current && recordingRef.current.state !== 'inactive') {
                  try {
                      recordingRef.current.onstop = null;
                      recordingRef.current.stop();
                  } catch (e) {}
              }
              if (recordingStreamRef.current) {
                  try {
                      recordingStreamRef.current.getTracks().forEach(t => t.stop());
                  } catch (e) {}
                  recordingStreamRef.current = null;
              }
              recordingRef.current = null;
          };

          const handleChatAppImageUpload = async (e) => {
             const file = e.target.files?.[0];
             if (!file) return;
             if (!file.type.startsWith('image/')) {
               showMessage("⚠️ Selecciona un archivo de imagen válido.");
               return;
             }
             try {
               showMessage("⏳ Procesando imagen...");
               let finalUrl;
               if (file.type === 'image/gif') {
                 finalUrl = await uploadRawFileToStorage(file, 'chats');
               } else {
                 // Compresión automática ligera al 90% de calidad
                 const compressed = await compressImage(file, 1600, 1600, 0.90);
                 finalUrl = await uploadImageToStorage(compressed, 'chats');
               }
               setChatAppImageUrl(finalUrl);
               setShowChatAppAttachmentMenu(false);
               showMessage("✅ Imagen lista");
             } catch (error) {
               console.error("Error al subir imagen de chat:", error);
               showMessage("Hubo un error al procesar la imagen.");
             } finally {
               if (e.target) e.target.value = '';
             }
           };

           const handleChatAppDocUpload = async (e) => {
             const file = e.target.files?.[0];
             if (!file) return;
             try {
               showMessage("⏳ Subiendo documento...");
               const firebaseURL = await uploadRawFileToStorage(file, 'chats');
               setChatAppFileUrl(firebaseURL);
               setChatAppFileName(file.name);
               setShowChatAppAttachmentMenu(false);
               showMessage("✅ Documento listo");
             } catch (error) {
               console.error("Error al subir documento de chat:", error);
               showMessage("Hubo un error al procesar el documento.");
             } finally {
               if (e.target) e.target.value = '';
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
                  strictAntiCheat: !!evalFormData.strictAntiCheat,
                  isArchived: false,
                  targetGroupId: evalFormData.targetGroupId || 'all',
                  targetGroupName: evalFormData.targetGroupName || 'Todos los estudiantes (Global)',
                  createdAt: Date.now(),
                  createdBy: myChatId
              });
              setIsCreatingEval(false);
              setEvalFormData({
                  title: "",
                  description: "",
                  dueDate: getToday(),
                  dueTime: "23:59",
                  timeLimit: 30,
                  strictAntiCheat: false,
                  targetGroupId: "all",
                  targetGroupName: "Todos los estudiantes (Global)",
                  questions: []
              });
              showMessage("✅ Evaluación creada exitosamente.");
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
            let finalImagePayload = avatarPreviewUrl;

            // Si es un GIF animado, subir el archivo original sin aplanar en canvas
            if (avatarPreviewUrl.startsWith('data:image/gif')) {
                finalImagePayload = avatarPreviewUrl;
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = 400; canvas.height = 400;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#ffffff"; 
                ctx.fillRect(0, 0, 400, 400);

                const img = cropImageRef.current;
                
                // Matemática exacta del recorte interactivo
                if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
                    const scale = Math.max(400 / img.naturalWidth, 400 / img.naturalHeight);
                    const w = img.naturalWidth * scale * cropZoom;
                    const h = img.naturalHeight * scale * cropZoom;
                    
                    const dx = (400 - w) / 2 + (cropOffset.x * 2.08); 
                    const dy = (400 - h) / 2 + (cropOffset.y * 2.08);

                    ctx.drawImage(img, dx, dy, w, h);
                }

                finalImagePayload = (img && img.naturalWidth > 0) ? canvas.toDataURL('image/jpeg', 0.8) : avatarPreviewUrl;
            }
            
            // 🛑 CERRAR EL MODAL INMEDIATAMENTE para evitar congelamientos
            setShowAvatarUploadModal(false); 
            
            const url = await uploadImageToStorage(finalImagePayload, 'avatars');
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
            authorId: user?.uid || myChatId || 'user', authorUsername: myChatId, authorName: loggedInName,
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
        if (!post) return;
        const rep = profileReplyingTo[postId];
        const newComment = { id: Date.now().toString(), author: loggedInName, text: text.trim(), createdAt: Date.now(), replyTo: rep ? { id: rep.id, author: rep.author, text: rep.text } : null };
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userPosts', postId), { comments: [...(post.comments || []), newComment] });
            setProfileCommentInputs({ ...profileCommentInputs, [postId]: "" });
            setProfileReplyingTo({ ...profileReplyingTo, [postId]: null });
        } catch (err) {
            console.error(err);
        }
    };

    const renderProfile = () => {
        const rawTargetId = viewingProfileId ? String(viewingProfileId).trim() : '';
        const isViewingTeacherExplicit = rawTargetId.toLowerCase() === 'teacher' || rawTargetId.toLowerCase() === 'ginadocente';
        const isViewingSelfStudent = Boolean(myChatId && rawTargetId.toLowerCase() === myChatId.toLowerCase());
        const isMyProfile = !rawTargetId || (role === 'teacher' ? isViewingTeacherExplicit : isViewingSelfStudent);

        let targetUserKey = rawTargetId || (role === 'teacher' ? 'teacher' : myChatId);
        let userData = null;

        if (targetUserKey === 'teacher' || targetUserKey.toLowerCase() === 'ginadocente' || (role === 'teacher' && isMyProfile)) {
            userData = {
                fullName: TEACHER_NAME,
                role: 'teacher',
                customLabel: 'Docente titular',
                profilePicUrl: userMappings['teacher']?.profilePicUrl || ''
            };
            targetUserKey = 'teacher';
        } else {
            // 1. Buscar en userMappings por clave exacta o insensible a mayúsculas
            const matchKey = Object.keys(userMappings).find(k => k.toLowerCase() === targetUserKey.toLowerCase().replace('@', ''));
            if (matchKey) {
                targetUserKey = matchKey;
                userData = userMappings[matchKey];
            } else {
                // 2. Buscar en FALLBACK_MAP
                const cleanFbKey = targetUserKey.toLowerCase().replace('@', '');
                if (FALLBACK_MAP[cleanFbKey]) {
                    targetUserKey = cleanFbKey;
                    const fb = FALLBACK_MAP[cleanFbKey];
                    userData = { fullName: fb.name, role: fb.role, customLabel: fb.customLabel, profilePicUrl: fb.profilePicUrl, email: fb.email };
                } else {
                    // 3. Buscar por UID en userMappings
                    const matchUid = Object.entries(userMappings).find(([, u]) => u.uid === targetUserKey);
                    if (matchUid) {
                        targetUserKey = matchUid[0];
                        userData = matchUid[1];
                    }
                }
            }
        }

        // Si todavía está cargando userMappings en el primer arranque de la página
        if (!userMappingsLoaded && !isMyProfile) {
            return (
                <div className="flex flex-col items-center justify-center py-24 space-y-3 animate-in fade-in">
                    <Loader2 className="animate-spin text-[#AD3333]" size={36} />
                    <p className="text-xs text-gray-500 font-medium">Cargando perfil del estudiante...</p>
                </div>
            );
        }

        // Si el estudiante fue eliminado de la base de datos o el enlace no existe
        if (!userData && !isMyProfile) {
            return (
                <div className="max-w-md mx-auto py-16 px-6 text-center space-y-4 animate-in fade-in">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-sm">
                        <UserX size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Perfil no encontrado
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        El estudiante con enlace <code className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-gray-800 dark:text-gray-200">#{`profile/${rawTargetId}`}</code> ya no existe o fue eliminado de la base de datos.
                    </p>
                    <div className="pt-2 flex justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setViewingProfileId(null);
                                try { sessionStorage.removeItem('englishTech_viewingProfileId'); } catch(e) {}
                                changeTab(role === 'teacher' ? 'directory' : 'tasks');
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                        >
                            {role === 'teacher' ? 'Ir al Directorio de estudiantes' : 'Volver a publicaciones'}
                        </button>
                    </div>
                </div>
            );
        }

        const profileName = userData?.fullName || (isMyProfile ? loggedInName : targetUserKey);
        const profileRole = userData?.customLabel || (userData?.role === 'teacher' ? 'Docente' : 'Estudiante');
        const targetProfilePic = userData?.profilePicUrl || (isMyProfile ? (userMappings[myChatId]?.profilePicUrl || '') : '');
        const targetFilterId = targetUserKey;
        const targetUserId = targetUserKey;

        // Estado de presencia en tiempo real (conectado, ausente, ocupado, desconectado)
        const pData = userPresence[targetUserId] || (targetUserId === 'teacher' ? userPresence['teacher'] : userPresence[targetFilterId]) || {};
        const presenceStatus = (!pData.isOnline || pData.status === 'offline') ? 'offline' : (pData.status || 'offline');

        const myPosts = userPosts.filter(p => p.authorUsername === targetFilterId || (isMyProfile && ((p.authorId && p.authorId === user?.uid) || p.authorUsername === myChatId)));
        
        return (
            <div className="space-y-5 pb-20 md:pb-6 max-w-3xl mx-auto">
                
                {/* Cabecera del Perfil Compacta con Indicador de Presencia */}
                <div className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-5 sm:p-6 relative rounded-2xl shadow-xs border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} ${!isMyProfile ? 'pt-14 sm:pt-6 sm:pl-14' : ''}`}>
                    {!isMyProfile && (
                        <button onClick={() => {setViewingProfileId(null); changeTab('chat');}} className={`absolute top-4 left-4 z-20 p-2 rounded-xl transition shadow-xs ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} title="Volver al chat">
                            <ArrowLeftIcon size={18}/>
                        </button>
                    )}
                    
                    {/* Avatar con Punto de Presencia */}
                    <div className="relative group shrink-0">
                        {targetProfilePic ? (
                            <img src={targetProfilePic} className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-md border-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`} />
                        ) : (
                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-blue-600 shadow-md border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-gray-100'}`}>
                                <UserIcon size={36} />
                            </div>
                        )}
                        
                        {/* Indicador de estado de conexión sobre el avatar */}
                        <div 
                            className={`absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 sm:border-3 ${isDarkMode ? 'border-gray-900' : 'border-white'} ${
                                presenceStatus === 'online' ? 'bg-emerald-500 ring-2 ring-emerald-500/20' :
                                presenceStatus === 'away' ? 'bg-amber-400 ring-2 ring-amber-400/20' :
                                presenceStatus === 'busy' ? 'bg-rose-500 ring-2 ring-rose-500/20' : 'bg-gray-400'
                            }`}
                            title={`Estado: ${
                                presenceStatus === 'online' ? 'Conectado' :
                                presenceStatus === 'away' ? 'Ausente' :
                                presenceStatus === 'busy' ? 'Ocupado' : 'Desconectado'
                            }`}
                        />

                        {isMyProfile && (
                            <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-xs">
                                <Edit3 className="text-white" size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                            </label>
                        )}
                    </div>
                    
                    <div className="text-center sm:text-left z-10 flex-1 min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                            <h2 className={`text-xl sm:text-2xl font-black tracking-tight truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{profileName}</h2>
                            
                            {/* Insignia visual del estado de conexión */}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                                presenceStatus === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' :
                                presenceStatus === 'away' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60' :
                                presenceStatus === 'busy' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60' :
                                'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                    presenceStatus === 'online' ? 'bg-emerald-500 animate-pulse' :
                                    presenceStatus === 'away' ? 'bg-amber-400' :
                                    presenceStatus === 'busy' ? 'bg-rose-500' : 'bg-gray-400'
                                }`} />
                                <span>
                                    {presenceStatus === 'online' ? 'Conectado' :
                                     presenceStatus === 'away' ? 'Ausente' :
                                     presenceStatus === 'busy' ? 'Ocupado' : 'Desconectado'}
                                </span>
                            </span>
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">{profileRole}</p>
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
                            <h3 className={`text-xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Ajustar foto</h3>
                            
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
                                            width: '100%', height: '100%', objectFit: 'cover',
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

                {/* Caja de Creación de Publicación Compacta */}
                {isMyProfile && (
                    <form onSubmit={publishProfilePost} className={`${glassCard} !p-4 sm:!p-5 flex flex-col gap-2.5 rounded-2xl shadow-xs`}>
                        <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Crear nueva publicación
                        </h3>
                        <input 
                            value={profilePostTitle} 
                            onChange={e => setProfilePostTitle(e.target.value)} 
                            placeholder="Título de la publicación (opcional)..." 
                            className={`${glassInput} text-xs sm:text-sm font-semibold py-2 px-3`} 
                        />
                        <textarea 
                            value={profilePostText} 
                            onChange={e => setProfilePostText(e.target.value)} 
                            placeholder="¿Qué quieres compartir en tu perfil hoy?" 
                            className={`${glassInput} text-xs sm:text-sm h-16 sm:h-20 resize-none py-2 px-3`} 
                        />
                        {profilePostImage && (
                            <div className="relative w-fit">
                                <img src={profilePostImage} alt="Preview" className="h-28 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-xs" />
                                <button type="button" onClick={() => setProfilePostImage("")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700"><X size={13}/></button>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1">
                            <label className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                                <ImageIcon size={16} className="text-emerald-500" /> 
                                <span>Foto</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={isPublishingProfile} />
                            </label>
                            <button type="submit" disabled={isPublishingProfile || (!profilePostTitle && !profilePostText && !profilePostImage)} className={`${redButton} text-xs font-bold py-1.5 px-4 rounded-xl disabled:opacity-50 flex items-center gap-1.5 shadow-xs`}>
                                {isPublishingProfile ? <Loader2 className="animate-spin" size={16}/> : <Send size={15}/>} 
                                <span>Publicar</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* Feed de Publicaciones del Perfil Cómodo y sin Desbordamientos */}
                <div className="space-y-4 w-full">
                    {myPosts.length === 0 ? (
                        <p className="text-gray-500 text-xs italic text-center py-6">Aún no hay publicaciones en este perfil.</p>
                    ) : null}
                    {myPosts.map(post => {
                        const isEditingThis = editingProfilePostId === post.id;
                        return (
                        <div key={post.id} className={`${glassCard} !p-4 sm:!p-5 flex flex-col gap-3 rounded-2xl group relative w-full min-w-0 overflow-hidden break-words shadow-xs`}>
                            {/* Menú de Opciones (Editar/Borrar) */}
                            {isMyProfile && !isEditingThis && (
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button onClick={() => {setEditingProfilePostId(post.id); setEditProfilePostData({title: post.title || "", text: post.text || ""});}} className="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 p-1.5 rounded-lg shadow-xs hover:bg-blue-100"><Edit3 size={14}/></button>
                                    <button onClick={() => confirmAction("¿Eliminar publicación de tu perfil?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userPosts', post.id)))} className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 p-1.5 rounded-lg shadow-xs hover:bg-red-100"><Trash2 size={14}/></button>
                                </div>
                            )}
                            
                            {/* Renderizado del Post o Modo Edición */}
                            {isEditingThis ? (
                                <div className="flex flex-col gap-2 mt-4">
                                    <input value={editProfilePostData.title} onChange={e => setEditProfilePostData({...editProfilePostData, title: e.target.value})} className={`${glassInput} text-xs font-bold p-2`} placeholder="Título..." />
                                    <textarea value={editProfilePostData.text} onChange={e => setEditProfilePostData({...editProfilePostData, text: e.target.value})} className={`${glassInput} text-xs resize-none p-2 h-20`} placeholder="Texto..." />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingProfilePostId(null)} className="px-3 py-1 text-xs text-gray-500">Cancelar</button>
                                        <button onClick={() => saveEditedProfilePost(post.id)} className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg font-bold">Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 min-w-0 w-full">
                                    {post.title && <h4 className={`font-black text-base sm:text-lg leading-tight pr-14 break-words ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{post.title}</h4>}
                                    {post.imageUrl && <img src={post.imageUrl} loading="lazy" onClick={() => setFullScreenImage(post.imageUrl)} alt="Post" className={`w-full max-h-96 object-cover rounded-xl cursor-pointer shadow-xs border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />}
                                    {post.text && <p className={`text-xs sm:text-sm leading-relaxed break-words whitespace-pre-line ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{post.text}</p>}
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-200 dark:border-gray-800">
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {formatDateTime12H(post.createdAt)}
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
                            
                            {/* Sección de Comentarios Perfectamente Contenida */}
                            <div className="flex flex-col gap-2 mt-1 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/60 w-full min-w-0 box-border">
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 w-full min-w-0">
                                    {(post.comments || []).map(c => (
                                        <div key={c.id} className={`p-2 rounded-xl text-xs w-full min-w-0 break-words ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700 shadow-2xs border border-gray-100'}`}>
                                            {c.replyTo && (
                                                <div className={`mb-1 pl-2 border-l-2 py-0.5 ${isDarkMode ? 'border-blue-500 bg-gray-900/50 text-gray-400' : 'border-blue-400 bg-gray-50 text-gray-500'} text-[10px] opacity-90 rounded-r-md truncate`}>
                                                    <span className="font-bold text-blue-500 mr-1">{c.replyTo.author}</span>
                                                    <span className="truncate">{c.replyTo.text}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start gap-1 group/pcomm">
                                                <div className="min-w-0 flex-1 break-words">
                                                    <button onClick={() => handleOpenProfileByName(c.author, c.authorUsername || c.authorId)} className="font-bold text-blue-500 mb-0.5 hover:underline text-left block truncate">{c.author}</button>
                                                    <p className="break-words leading-relaxed">{c.text}</p>
                                                </div>
                                                <button onClick={() => setProfileReplyingTo({...profileReplyingTo, [post.id]: c})} className="opacity-0 group-hover/pcomm:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity p-1 shrink-0"><ReplyIcon size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {profileReplyingTo[post.id] && (
                                    <div className={`flex justify-between items-center px-2.5 py-1 rounded-lg border text-[11px] ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'}`}>
                                        <span className="truncate">Respondiendo a <b className="text-blue-500">{profileReplyingTo[post.id].author}</b></span>
                                        <button type="button" onClick={() => setProfileReplyingTo({...profileReplyingTo, [post.id]: null})}><X size={13}/></button>
                                    </div>
                                )}
                                <form onSubmit={(e) => handleAddProfileComment(post.id, e)} className="flex items-center gap-1.5 w-full min-w-0">
                                    <input 
                                        value={profileCommentInputs[post.id] || ""} 
                                        onChange={e => setProfileCommentInputs({...profileCommentInputs, [post.id]: e.target.value})} 
                                        placeholder="Escribe un comentario..." 
                                        className={`flex-1 min-w-0 px-3 py-1.5 text-xs outline-none rounded-xl border focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`} 
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!profileCommentInputs[post.id]?.trim()} 
                                        className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-all shrink-0 flex items-center justify-center shadow-2xs"
                                        title="Enviar comentario"
                                    >
                                        <Send size={13}/>
                                    </button>
                                </form>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        );
    };
          

          const renderReviews = () => (
            <ReviewsModule
              role={role}
              isDarkMode={isDarkMode}
              themeMode={themeMode}
              glassCard={glassCard}
              glassInput={glassInput}
              redButton={redButton}
              reviews={reviews}
              db={db}
              appId={appId}
              showMessage={showMessage}
              confirmAction={confirmAction}
              callGemini={callGemini}
            />
          );

          const renderSyllabus = () => {
            // Manejador del procesamiento de PDF con IA
            const handleProcessPdfSyllabus = async (e) => {
              e?.preventDefault();
              if (!syllabusPdfFile) {
                showMessage("⚠️ Selecciona un archivo PDF para procesar.");
                return;
              }

              setIsProcessingSyllabusPdf(true);
              setExtractedSyllabusPreview(null);

              try {
                // Paso 1: Extracción de texto
                setSyllabusPdfStep("1/3: 📄 Extrayendo texto y páginas del documento PDF...");
                const pdfText = await extractTextFromPDF(syllabusPdfFile);
                if (!pdfText || pdfText.length < 50) {
                  throw new Error("El documento no contiene suficiente texto legible.");
                }

                // Paso 2: Análisis profundo con Gemini
                setSyllabusPdfStep("2/3: 🧠 Analizando plan de estudios y objetivos curriculares con IA...");
                const prompt = `Eres un diseñador instruccional y pedagogo universitario de alto nivel.
Analiza minuciosamente el siguiente texto extraído del documento PDF oficial (syllabus, plan de aula o contenido programático):

--- CONTENIDO DEL PDF ---
${pdfText.substring(0, 45000)}
--- FIN DEL CONTENIDO ---

Tu tarea es extraer, organizar y estructurar cronológicamente TODO el plan de estudios del semestre por semanas y unidades de aprendizaje.
Sé minucioso, profundo y detallado. Extrae todas las semanas presentes en el programa sin omitir temas ni actividades clave.

Devuelve ÚNICAMENTE un array JSON plano (sin bloques markdown \`\`\`json ni texto de introducción o cierre):
[
  {
    "week": 1,
    "unit": "Unidad 1: Fundamentos y Diagnóstico",
    "topic": "Tema central o título de la sesión",
    "description": "Descripción pedagógica y objetivos de aprendizaje de la semana.",
    "keyConcepts": ["Concepto clave 1", "Concepto clave 2", "Concepto clave 3"],
    "activities": "Talleres prácticos, entregas o evaluaciones de la semana",
    "material": ""
  }
]`;

                const aiResponse = await callGemini(prompt);
                if (!aiResponse) throw new Error("Sin respuesta del servicio de IA.");

                // Paso 3: Parseo y estructuración
                setSyllabusPdfStep("3/3: ⚡ Estructurando cronograma semanal...");
                let clean = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
                const sIdx = clean.indexOf('[');
                const eIdx = clean.lastIndexOf(']');
                if (sIdx !== -1 && eIdx !== -1) clean = clean.substring(sIdx, eIdx + 1);

                const parsed = JSON.parse(clean);
                if (!Array.isArray(parsed) || parsed.length === 0) {
                  throw new Error("Formato de respuesta inválido.");
                }

                setExtractedSyllabusPreview(parsed);
                showMessage(`✨ Se extrajeron ${parsed.length} semanas del plan de estudios.`);
              } catch (err) {
                console.error("Error al procesar PDF del syllabus:", err);
                showMessage(`❌ ${err.message || 'Error al procesar el archivo PDF. Intenta de nuevo.'}`);
              } finally {
                setIsProcessingSyllabusPdf(false);
                setSyllabusPdfStep("");
              }
            };

            // Confirmar e importar al cronograma
            const handleConfirmImportSyllabus = async () => {
              if (!extractedSyllabusPreview || extractedSyllabusPreview.length === 0) return;
              setIsProcessingSyllabusPdf(true);
              try {
                const targetGroup = academicGroups.find(g => g.id === syllabusPdfTargetGroup);
                const targetGroupName = targetGroup ? targetGroup.name : 'General';

                for (const item of extractedSyllabusPreview) {
                  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'syllabus'), {
                    week: Number(item.week) || 1,
                    unit: item.unit || '',
                    topic: item.topic || 'Tema de clase',
                    description: item.description || '',
                    keyConcepts: Array.isArray(item.keyConcepts) ? item.keyConcepts : [],
                    activities: item.activities || '',
                    targetGroupId: syllabusPdfTargetGroup || 'all',
                    targetGroupName: targetGroupName,
                    createdAt: Date.now()
                  });
                }

                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                showMessage(`🎉 ¡${extractedSyllabusPreview.length} semanas añadidas al cronograma!`);
                setShowPdfSyllabusModal(false);
                setExtractedSyllabusPreview(null);
                setSyllabusPdfFile(null);
              } catch (err) {
                console.error("Error al guardar syllabus:", err);
                showMessage("❌ Error al guardar los contenidos en la base de datos.");
              } finally {
                setIsProcessingSyllabusPdf(false);
              }
            };

            // Filtro por materia y búsqueda
            const filteredSyllabus = syllabus.filter(item => {
              // Filtro por materia: con materia seleccionada SOLO se muestran los contenidos de esa materia
              if (syllabusSubjectFilter !== 'all') {
                const itemGroup = item.targetGroupId && item.targetGroupId !== 'all' ? item.targetGroupId : 'all';
                if (itemGroup !== syllabusSubjectFilter) {
                  return false;
                }
              }
              // Filtro de búsqueda
              if (syllabusSearchTerm.trim()) {
                const query = syllabusSearchTerm.trim().toLowerCase();
                const hay = `${item.week} ${item.unit || ''} ${item.topic || ''} ${item.description || ''} ${(item.keyConcepts || []).join(' ')} ${item.activities || ''}`.toLowerCase();
                return hay.includes(query);
              }
              return true;
            });

            return (
              <div className="space-y-6 pb-20 md:pb-6 max-w-5xl mx-auto">
                {/* Cabecera Principal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
                      <CalendarEmoji className="text-[#AD3333]" size={26} />
                      <span>Contenidos programáticos</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Plan de estudios y desglose cronológico por semanas, unidades y actividades.
                    </p>
                  </div>

                  {role === 'teacher' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPdfSyllabusModal(true);
                          setExtractedSyllabusPreview(null);
                          setSyllabusPdfFile(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center shadow-xs transition-all hover:scale-[1.02]"
                      >
                        <span>Cargar PDF</span>
                      </button>

                      {!showAddSyllabus && (
                        <button
                          type="button"
                          onClick={() => setShowAddSyllabus(true)}
                          className="px-3.5 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center justify-center shadow-xs transition-all hover:scale-[1.02]"
                        >
                          <span>Añadir</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Barra de Búsqueda y Filtro de Materias */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className={`flex-1 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs transition-all ${
                    isDarkMode ? 'bg-gray-800/90 border-gray-700 text-gray-100 focus-within:border-blue-500' : 'bg-white border-gray-200 text-gray-800 focus-within:border-blue-400 shadow-2xs'
                  }`}>
                    <SearchIcon size={14} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={syllabusSearchTerm}
                      onChange={(e) => setSyllabusSearchTerm(e.target.value)}
                      placeholder="Buscar por tema, unidad, conceptos o actividades..."
                      className="w-full bg-transparent border-none outline-none text-xs font-medium placeholder-gray-400"
                    />
                    {syllabusSearchTerm && (
                      <button type="button" onClick={() => setSyllabusSearchTerm("")} className="text-gray-400 hover:text-gray-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {academicGroups.length > 0 && (
                    <select
                      value={syllabusSubjectFilter}
                      onChange={(e) => setSyllabusSubjectFilter(e.target.value)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none shrink-0 ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700 shadow-2xs'
                      }`}
                    >
                      <option value="all">📚 Todas las materias</option>
                      {academicGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Formulario Manual de Añadir Contenido (Solo Docentes) */}
                {role === 'teacher' && showAddSyllabus && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const weekVal = Number(e.target.week.value);
                      const unitVal = e.target.unit ? e.target.unit.value.trim() : '';
                      const topicVal = e.target.topic.value.trim();
                      const descVal = e.target.description ? e.target.description.value.trim() : '';
                      const actVal = e.target.activities ? e.target.activities.value.trim() : '';
                      const targetGrp = e.target.targetGroup ? e.target.targetGroup.value : 'all';
                      if (!weekVal || !topicVal) return;

                      const grpObj = academicGroups.find(g => g.id === targetGrp);

                      try {
                        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'syllabus'), {
                          week: weekVal,
                          unit: unitVal,
                          topic: topicVal,
                          description: descVal,
                          activities: actVal,
                          targetGroupId: targetGrp,
                          targetGroupName: grpObj ? grpObj.name : 'General',
                          createdAt: Date.now()
                        });
                        e.target.reset();
                        setShowAddSyllabus(false);
                        showMessage("✅ Contenido programático añadido con éxito.");
                      } catch (err) {
                        showMessage("❌ No se pudo guardar el tema. Intenta de nuevo.");
                      }
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${glassCard}`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        Nuevo contenido programático manual
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddSyllabus(false)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          name="week"
                          min="1"
                          max="30"
                          placeholder="Semana (1)"
                          className={`w-full ${glassInput} text-xs py-2.5`}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          name="unit"
                          placeholder="Unidad (ej: Unidad 1: Fundamentos)"
                          className={`w-full ${glassInput} text-xs py-2.5`}
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          name="topic"
                          placeholder="Tema central de estudio..."
                          className={`w-full ${glassInput} text-xs py-2.5`}
                          required
                        />
                      </div>
                      <div className="sm:col-span-12">
                        <textarea
                          name="description"
                          placeholder="Descripción y objetivos pedagógicos..."
                          rows={2}
                          className={`w-full ${glassInput} text-xs py-2 resize-none`}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          name="activities"
                          placeholder="Actividades / Talleres de la semana..."
                          className={`w-full ${glassInput} text-xs py-2.5`}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <select
                          name="targetGroup"
                          className={`w-full ${glassInput} text-xs py-2.5 font-bold`}
                        >
                          <option value="all">Todas las materias</option>
                          {academicGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setShowAddSyllabus(false)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className={`${redButton} text-xs font-bold py-2 px-5 rounded-xl shadow-xs`}
                      >
                        Guardar contenido
                      </button>
                    </div>
                  </form>
                )}

                {/* MODAL: CARGA DE PDF Y GENERACIÓN (PORTALIZADO CON Z-INDEX MÁXIMO) */}
                {showPdfSyllabusModal && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                      isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                      {/* Cabecera del Modal */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                            <FileDocIcon size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold">
                              Cargar PDF
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Sube el documento oficial para estructurar automáticamente todas las semanas del cronograma
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isProcessingSyllabusPdf) {
                              setShowPdfSyllabusModal(false);
                              setExtractedSyllabusPreview(null);
                            }
                          }}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Cuerpo del Modal */}
                      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                        {!extractedSyllabusPreview ? (
                          <div className="space-y-4">
                            {/* Dropzone / Selector de Archivo PDF */}
                            <div className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
                              syllabusPdfFile 
                                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20' 
                                : 'border-gray-300 dark:border-gray-700 hover:border-purple-400'
                            }`}>
                              <input
                                type="file"
                                id="syllabusPdfInput"
                                accept="application/pdf"
                                onChange={(e) => setSyllabusPdfFile(e.target.files?.[0] || null)}
                                className="hidden"
                                disabled={isProcessingSyllabusPdf}
                              />
                              <label htmlFor="syllabusPdfInput" className="cursor-pointer block space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto shadow-xs">
                                  <FileDocIcon size={28} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {syllabusPdfFile ? syllabusPdfFile.name : 'Haz clic para seleccionar el archivo PDF'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {syllabusPdfFile ? `${(syllabusPdfFile.size / 1024 / 1024).toFixed(2)} MB • Listo para procesar` : 'Documentos oficiales de planeación curricular o syllabus'}
                                  </p>
                                </div>
                              </label>
                            </div>

                            {/* Selector de Materia de Destino */}
                            {academicGroups.length > 0 && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                  Asignar a materia específica (opcional):
                                </label>
                                <select
                                  value={syllabusPdfTargetGroup}
                                  onChange={(e) => setSyllabusPdfTargetGroup(e.target.value)}
                                  disabled={isProcessingSyllabusPdf}
                                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'
                                  }`}
                                >
                                  <option value="">📚 General / Todas las materias</option>
                                  {academicGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Indicador de Estado / Progreso de Procesamiento */}
                            {isProcessingSyllabusPdf && (
                              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center space-y-2 animate-in fade-in">
                                <Loader2 size={24} className="animate-spin text-purple-600 mx-auto" />
                                <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                                  {syllabusPdfStep || 'Procesando documento...'}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  El análisis exhaustivo puede tomar unos segundos para garantizar la máxima precisión.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Vista Previa de Semanas Extraídas */
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 size={15} />
                                <span>{extractedSyllabusPreview.length} Semanas extraídas con éxito</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setExtractedSyllabusPreview(null)}
                                className="text-xs text-gray-500 hover:underline"
                              >
                                Reintentar con otro PDF
                              </button>
                            </div>

                            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                              {extractedSyllabusPreview.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3.5 rounded-2xl border ${
                                    isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                                  } space-y-1.5`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-[#AD3333] text-white text-[10px] font-black">
                                      Semana {item.week}
                                    </span>
                                    {item.unit && (
                                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 truncate">
                                        {item.unit}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                    {item.topic}
                                  </h4>
                                  {item.description && (
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                      {item.description}
                                    </p>
                                  )}
                                  {item.keyConcepts && item.keyConcepts.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {item.keyConcepts.map((c, cI) => (
                                        <span key={cI} className="text-[9px] font-medium bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pie del Modal */}
                      <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <button
                          type="button"
                          onClick={() => setShowPdfSyllabusModal(false)}
                          disabled={isProcessingSyllabusPdf}
                          className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Cancelar
                        </button>

                        {!extractedSyllabusPreview ? (
                          <button
                            type="button"
                            onClick={handleProcessPdfSyllabus}
                            disabled={!syllabusPdfFile || isProcessingSyllabusPdf}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                          >
                            {isProcessingSyllabusPdf ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Analizando documento...</span>
                              </>
                            ) : (
                              <>
                                <FileDocIcon size={14} />
                                <span>Procesar PDF</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConfirmImportSyllabus}
                            disabled={isProcessingSyllabusPdf}
                            className="px-5 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                          >
                            {isProcessingSyllabusPdf ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                            <span>Confirmar e Importar ({extractedSyllabusPreview.length} semanas)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {/* MODAL: ASISTENCIA DOCENTE POR SEMANA (ACTIVIDAD O PLAN DE CLASE) */}
                {syllabusAssistantModal.isOpen && syllabusAssistantModal.weekItem && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                      isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                            <Lightbulb size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-[#AD3333] text-white text-[10px] font-black">
                                Semana {syllabusAssistantModal.weekItem.week}
                              </span>
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                {syllabusAssistantModal.weekItem.unit || 'Asistencia Pedagógica'}
                              </span>
                            </div>
                            <h3 className="text-base font-extrabold truncate max-w-md">
                              {syllabusAssistantModal.weekItem.topic}
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSyllabusAssistantModal({ isOpen: false, weekItem: null, type: null, content: '', isLoading: false })}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Body */}
                      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                        {!syllabusAssistantModal.type ? (
                          <div className="space-y-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Selecciona qué deseas generar con IA para potenciar esta semana de clase:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <div
                                onClick={async () => {
                                  const item = syllabusAssistantModal.weekItem;
                                  setSyllabusAssistantModal(prev => ({ ...prev, type: 'activity', isLoading: true, content: '' }));
                                  try {
                                    const prompt = `Eres un docente universitario experto en metodología y didáctica de inglés (EFL/ESL).
Diseña una actividad didáctica práctica, dinámica y colaborativa para los estudiantes basada en la siguiente semana del curso:
- Semana ${item.week}: ${item.topic}
- Unidad: ${item.unit || 'General'}
- Objetivos pedagógicos: ${item.description || 'Desarrollar competencias comunicativas'}
- Conceptos clave: ${(item.keyConcepts || []).join(', ')}

Estructura la propuesta de forma muy clara:
1. 🎯 Título de la actividad
2. 💡 Objetivo de aprendizaje
3. 👥 Modalidad (Individual o Parejas/Equipos)
4. 📝 Dinámica paso a paso para la clase
5. 🏆 Entregable / Criterio de evaluación

Escribe en español con tono pedagógico moderno.`;
                                    const res = await callGemini(prompt);
                                    setSyllabusAssistantModal(prev => ({ ...prev, content: res || '', isLoading: false }));
                                  } catch (e) {
                                    setSyllabusAssistantModal(prev => ({ ...prev, content: '❌ Error al generar la actividad. Intenta de nuevo.', isLoading: false }));
                                  }
                                }}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between gap-3 ${
                                  isDarkMode ? 'bg-gray-800/80 border-gray-700 hover:border-amber-500/50' : 'bg-amber-50/50 border-amber-200/80 hover:border-amber-400 shadow-xs'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                  <Target size={20} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Crear una actividad basada en esta semana</h4>
                                  <p className="text-[11px] text-gray-500 mt-1">Genera un taller dinámico, debate, ejercicio interactivo o trabajo en equipo con objetivos y criterios.</p>
                                </div>
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  Generar actividad <ChevronRight size={14}/>
                                </span>
                              </div>

                              <div
                                onClick={() => setSyllabusAssistantModal(prev => ({ ...prev, type: 'lesson_plan_duration' }))}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between gap-3 ${
                                  isDarkMode ? 'bg-gray-800/80 border-gray-700 hover:border-purple-500/50' : 'bg-purple-50/50 border-purple-200/80 hover:border-purple-400 shadow-xs'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                    <BookOpen size={20} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Crear un plan de clase</h4>
                                    <p className="text-[11px] text-gray-500 mt-1">Estructura una sesión universitaria completa (Warm-up, Presentation, Practice y Wrap-up).</p>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                  Generar plan de clase <ChevronRight size={14} />
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : syllabusAssistantModal.type === 'lesson_plan_duration' ? (
                          <div className="flex flex-col items-center justify-center h-full py-8 space-y-6">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 mb-2">
                              <Clock size={28} />
                            </div>
                            <div className="text-center">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">Duración de la clase</h4>
                              <p className="text-sm text-gray-500 mt-1">Selecciona cuánto durará esta sesión para que la IA distribuya el tiempo correctamente.</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
                              {[60, 90, 120].map(mins => (
                                <button
                                  key={mins}
                                  onClick={async () => {
                                    const item = syllabusAssistantModal.weekItem;
                                    setSyllabusAssistantModal(prev => ({ ...prev, type: 'lesson_plan', duration: mins, isLoading: true, content: '' }));
                                    try {
                                      const prompt = `Eres un diseñador instruccional y pedagogo universitario de alto nivel.
Diseña un Plan de Clase (Lesson Plan) completo de ${mins} minutos para la docente Gina, basado en la siguiente semana del programa:
- Semana ${item.week}: ${item.topic}
- Unidad: ${item.unit || 'General'}
- Descripción / Objetivos: ${item.description || ''}
- Conceptos clave: ${(item.keyConcepts || []).join(', ')}

Estructura el plan en 4 momentos pedagógicos clave ajustando los tiempos para que sumen exactamente ${mins} minutos:
1. 🚀 Warm-up / Rompehielos y activación previa
2. 📚 Presentation / Explicación del tema y ejemplos clave
3. ✍️ Practice / Práctica guiada e interactiva
4. 🏁 Wrap-up / Evaluación formativa y cierre de sesión

Incluye recursos recomendados y tips docentes para la profesora Gina.`;
                                      const res = await callGemini(prompt);
                                      setSyllabusAssistantModal(prev => ({ ...prev, content: res || '', isLoading: false }));
                                    } catch (e) {
                                      setSyllabusAssistantModal(prev => ({ ...prev, content: '❌ Error al generar el plan de clase. Intenta de nuevo.', isLoading: false }));
                                    }
                                  }}
                                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-colors border shadow-sm flex flex-col items-center gap-1 hover:scale-105 ${
                                    isDarkMode ? 'bg-gray-800 border-gray-700 text-purple-300 hover:bg-gray-700' : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-50'
                                  }`}
                                >
                                  <span className="text-xl leading-none">{mins}</span>
                                  <span className="text-[10px] uppercase tracking-wider text-purple-500/70 dark:text-purple-400/70">minutos</span>
                                </button>
                              ))}
                            </div>
                            <button
                                onClick={() => setSyllabusAssistantModal(prev => ({ ...prev, type: null }))}
                                className="mt-4 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                          </div>
                        ) : syllabusAssistantModal.isLoading ? (
                          <div className="p-8 text-center space-y-3">
                            <Loader2 size={32} className="animate-spin text-amber-500 mx-auto" />
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              {syllabusAssistantModal.type === 'activity' ? 'Diseñando actividad pedagógica...' : 'Estructurando plan de clase de 90 min...'}
                            </h4>
                            <p className="text-xs text-gray-500">Analizando objetivos y conceptos clave de la semana...</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <CheckCheck size={16} />
                                <span>{syllabusAssistantModal.type === 'activity' ? 'Propuesta de Actividad' : 'Plan de Clase Generado'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setSyllabusAssistantModal(prev => ({ ...prev, type: null, content: '' }))}
                                className="text-xs text-gray-500 hover:underline"
                              >
                                Elegir otra opción
                              </button>
                            </div>

                            <div className={`p-4 rounded-2xl border text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto ${
                              isDarkMode ? 'bg-gray-800/90 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}>
                              <LinkifyText text={syllabusAssistantModal.content} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-2.5 px-5 pt-3.5 pb-safe border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <button
                          type="button"
                          onClick={() => setSyllabusAssistantModal({ isOpen: false, weekItem: null, type: null, content: '', isLoading: false })}
                          className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Cerrar
                        </button>

                        {syllabusAssistantModal.content && !syllabusAssistantModal.isLoading && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(syllabusAssistantModal.content);
                                showMessage("📋 Contenido copiado al portapapeles.");
                              }}
                              className="px-3.5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center gap-1.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-2xs"
                            >
                              <Copy size={14} /> Copiar texto
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTaskTitle(`Semana ${syllabusAssistantModal.weekItem.week}: ${syllabusAssistantModal.weekItem.topic}`);
                                setTaskDesc(syllabusAssistantModal.content);
                                setSyllabusAssistantModal({ isOpen: false, weekItem: null, type: null, content: '', isLoading: false });
                                changeTab('tasks');
                                showMessage("📝 Tarea cargada en el compositor del muro.");
                              }}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                            >
                              <Plus size={14} /> Publicar como tarea
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {/* Lista Cronológica de Contenidos Programáticos (Para Estudiantes y Docentes) */}
                <div className="space-y-3">
                  {filteredSyllabus.length === 0 ? (
                    <EmptyState
                      icon={CalendarEmoji}
                      title={syllabusSearchTerm ? "Sin coincidencias en el cronograma" : "No hay contenidos programados"}
                      message={
                        syllabusSearchTerm 
                          ? `No encontramos semanas que coincidan con "${syllabusSearchTerm}".`
                          : role === 'teacher' 
                            ? 'Usa "Cargar PDF" o "Añadir" para registrar los contenidos del semestre.' 
                            : 'El plan de estudios estará disponible pronto.'
                      }
                      isDarkMode={isDarkMode}
                    />
                  ) : (
                    [...filteredSyllabus].sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0)).map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${glassCard} hover:shadow-xs space-y-2.5`}
                      >
                        {/* Fila 1: Semana, Unidad, Materia y Acciones */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-red-500/10 dark:bg-red-950/40 text-[#AD3333] dark:text-red-400 font-black text-xs shrink-0 border border-red-500/20">
                              Semana {item.week}
                            </span>
                            {item.unit && (
                              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-500/20">
                                {item.unit}
                              </span>
                            )}
                            {item.targetGroupName && item.targetGroupName !== 'General' && (
                              <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-500/20">
                                {item.targetGroupName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {role === 'teacher' && (
                              <button
                                type="button"
                                onClick={() => setSyllabusAssistantModal({ isOpen: true, weekItem: item, type: null, content: '', isLoading: false })}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors"
                                title="Asistencia pedagógica con IA"
                              >
                                <Lightbulb size={13} className="text-amber-500" />
                                <span>Ayuda</span>
                              </button>
                            )}

                            {role === 'teacher' && (
                              <button
                                type="button"
                                onClick={() => confirmAction("¿Eliminar este tema del cronograma?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'syllabus', item.id)))}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title="Eliminar tema"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Fila 2: Título Principal del Tema */}
                        <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 leading-snug">
                          {item.topic}
                        </h4>

                        {/* Fila 3: Descripción Pedagógica */}
                        {item.description && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Fila 4: Conceptos Clave (Pills) */}
                        {item.keyConcepts && item.keyConcepts.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Conceptos:</span>
                            {item.keyConcepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/80"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Fila 5: Actividades y Entregas */}
                        {item.activities && (
                          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2">
                            <span className="font-bold shrink-0">🎯 Actividades:</span>
                            <span className="leading-relaxed">{item.activities}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          };

          const renderDirectory = () => {
    const handleCreateAcademicGroup = async (e) => {
        e.preventDefault();
        if(!newAcadGroupName.trim()) return showMessage("⚠️ Escribe un nombre para la materia.");
        
        setIsSavingMateria(true);
        try {
            const newGroupDoc = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'academicGroups'), {
                name: newAcadGroupName.trim(),
                members: selectedAcadMembers,
                emoji: newAcadGroupEmoji || 'BookOpen',
                avatarUrl: newAcadGroupAvatarUrl.trim() || '',
                coverPattern: 'doodle-1',
                coverUrl: '',
                createdAt: Date.now()
            });

            // Creación automática inmediata de la sala de chat grupal para la materia
            const groupChatMembers = Array.from(new Set([myChatId, 'teacher', ...selectedAcadMembers]));
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', `acad_${newGroupDoc.id}`), {
                id: `acad_${newGroupDoc.id}`,
                academicGroupId: newGroupDoc.id,
                name: newAcadGroupName.trim(),
                members: groupChatMembers,
                emoji: newAcadGroupEmoji || 'BookOpen',
                avatarUrl: newAcadGroupAvatarUrl.trim() || '',
                createdBy: myChatId,
                isAcademicGroupChat: true,
                createdAt: Date.now()
            }, { merge: true });

            setNewAcadGroupName(""); 
            setSelectedAcadMembers([]); 
            setNewAcadGroupAvatarUrl("");
            setNewAcadGroupEmoji('BookOpen');
            setIsCreatingAcadGroup(false);
            showMessage("✅ Materia y chat grupal creados exitosamente.");
        } catch (error) {
            console.error(error);
            showMessage("❌ Hubo un error al guardar. Revisa tu conexión.");
        }
        setIsSavingMateria(false);
    };

    const handleSaveStudentEdit = async (e) => {
        e.preventDefault();
        if (!studentEditModal.userKey) return;
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', studentEditModal.userKey), {
                fullName: studentEditModal.fullName.trim(),
                customLabel: studentEditModal.customLabel.trim(),
                profilePicUrl: studentEditModal.profilePicUrl.trim(),
                email: studentEditModal.email.trim(),
                role: 'student',
                updatedAt: Date.now()
            }, { merge: true });
            showMessage("✅ Perfil de estudiante actualizado.");
            setStudentEditModal({ isOpen: false, userKey: '', fullName: '', customLabel: '', email: '', profilePicUrl: '' });
        } catch (err) {
            showMessage("❌ Error al guardar: " + err.message);
        }
    };

    const studentEntries = Object.entries(userMappings).filter(([uk, ud]) => uk !== 'teacher' && ud?.email);
    const filteredStudents = evalSearchQuery.trim()
        ? studentEntries.filter(([uk, ud]) => {
            const term = evalSearchQuery.toLowerCase();
            return uk.toLowerCase().includes(term) || (ud.fullName || '').toLowerCase().includes(term) || (ud.email || '').toLowerCase().includes(term);
          })
        : studentEntries;

    // VISTA DE GESTIÓN DE UNA MATERIA ESPECÍFICA
    if (selectedSubjectDetail) {
        const currentGroup = academicGroups.find(g => g.id === selectedSubjectDetail.id) || selectedSubjectDetail;
        const enrolledStudentKeys = currentGroup.members || [];
        const enrolledStudents = enrolledStudentKeys
            .map(uk => [uk, userMappings[uk] || FALLBACK_MAP[uk] || { fullName: uk, email: '' }])
            .filter(([uk, ud]) => {
                if (!evalSearchQuery.trim()) return true;
                const term = evalSearchQuery.toLowerCase();
                return uk.toLowerCase().includes(term) || (ud.fullName || '').toLowerCase().includes(term) || (ud.email || '').toLowerCase().includes(term);
            });

        const availableStudentsToAdd = studentEntries.filter(([uk]) => !enrolledStudentKeys.includes(uk));

        const handleRemoveStudentFromSubject = async (studentKey) => {
            confirmAction(`¿Quitar a este estudiante de la materia "${currentGroup.name}"?`, async () => {
                try {
                    const updatedMembers = enrolledStudentKeys.filter(k => k !== studentKey);
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', currentGroup.id), {
                        members: updatedMembers
                    });
                    // Sincronizar chat grupal
                    const updatedChatMembers = Array.from(new Set([myChatId, 'teacher', ...updatedMembers]));
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', `acad_${currentGroup.id}`), {
                        members: updatedChatMembers,
                        name: currentGroup.name,
                        avatarUrl: currentGroup.avatarUrl || currentGroup.coverUrl || '',
                        emoji: currentGroup.emoji || 'BookOpen'
                    }, { merge: true }).catch(() => {});
                    showMessage("✅ Estudiante removido de la materia y del chat grupal.");
                } catch (err) {
                    showMessage("❌ Error al remover estudiante.");
                }
            });
        };

        const handleAddStudentToSubject = async (studentKey) => {
            try {
                const updatedMembers = [...enrolledStudentKeys, studentKey];
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', currentGroup.id), {
                    members: updatedMembers
                });
                // Sincronizar chat grupal
                const updatedChatMembers = Array.from(new Set([myChatId, 'teacher', ...updatedMembers]));
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chatGroups', `acad_${currentGroup.id}`), {
                    members: updatedChatMembers,
                    name: currentGroup.name,
                    avatarUrl: currentGroup.avatarUrl || currentGroup.coverUrl || '',
                    emoji: currentGroup.emoji || 'BookOpen'
                }, { merge: true }).catch(() => {});
                showMessage("✅ Estudiante inscrito en la materia y añadido al chat grupal.");
            } catch (err) {
                showMessage("❌ Error al añadir estudiante.");
            }
        };

        return (
            <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => { setSelectedSubjectDetail(null); setShowAddStudentToSubject(false); setStudentSearchInSubject(""); }}
                            className={`p-2.5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs'}`}
                            title="Volver a Directorio"
                        >
                            <ArrowLeftIcon size={18} />
                        </button>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <BookOpen className="text-blue-500" size={24} /> {currentGroup.name}
                            </h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Gestión de estudiantes inscritos en esta materia
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs">
                            {enrolledStudentKeys.length} inscritos
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddStudentToSubject(prev => !prev);
                                setStudentSearchInSubject("");
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                        >
                            <Plus size={14} /> {showAddStudentToSubject ? 'Cerrar búsqueda' : 'Añadir estudiante'}
                        </button>
                    </div>
                </div>

                {/* BÚSQUEDA PREDICTIVA / DINÁMICA DE ESTUDIANTES */}
                {showAddStudentToSubject && (
                    <div className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-blue-50/80 border-blue-200 shadow-xs'}`}>
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <SearchIcon size={14} /> Buscar y asignar estudiante:
                            </h4>
                            <span className="text-[11px] font-semibold text-gray-500">{availableStudentsToAdd.length} no inscritos</span>
                        </div>

                        {/* Campo de búsqueda predictivo */}
                        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
                            isDarkMode ? 'bg-gray-900 border-gray-700 text-white focus-within:border-blue-500' : 'bg-white border-gray-300 text-gray-800 focus-within:border-blue-500 shadow-2xs'
                        }`}>
                            <SearchIcon size={15} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={studentSearchInSubject}
                                onChange={e => setStudentSearchInSubject(e.target.value)}
                                placeholder="Escribe el nombre completo o usuario del estudiante..."
                                className="w-full bg-transparent border-none outline-none text-xs font-medium placeholder-gray-400"
                                autoFocus
                            />
                            {studentSearchInSubject && (
                                <button type="button" onClick={() => setStudentSearchInSubject("")} className="text-gray-400 hover:text-gray-600">
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Lista de coincidencias predictivas */}
                        {(() => {
                            const matching = studentSearchInSubject.trim()
                                ? availableStudentsToAdd.filter(([uk, data]) => {
                                    const q = studentSearchInSubject.toLowerCase();
                                    return uk.toLowerCase().includes(q) || (data.fullName || '').toLowerCase().includes(q) || (data.email || '').toLowerCase().includes(q);
                                  })
                                : availableStudentsToAdd.slice(0, 4);

                            if (matching.length === 0) {
                                return (
                                    <p className="text-xs text-gray-500 italic py-3 text-center">
                                        {studentSearchInSubject ? 'No se encontraron estudiantes que coincidan.' : 'Todos los alumnos ya están inscritos en esta materia.'}
                                    </p>
                                );
                            }

                            return (
                                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                    {matching.map(([uk, data]) => (
                                        <div
                                            key={uk}
                                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                                                isDarkMode ? 'bg-gray-900/80 border-gray-700 hover:bg-gray-900' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-2xs'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs text-blue-600 dark:text-blue-300">
                                                    {data.profilePicUrl ? (
                                                        <img src={data.profilePicUrl} alt={data.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (data.fullName || uk).charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <strong className="block text-gray-900 dark:text-gray-100 truncate text-xs">{data.fullName}</strong>
                                                    <span className="text-[10px] text-gray-500 truncate block">@{uk} • {data.email}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleAddStudentToSubject(uk);
                                                    setStudentSearchInSubject("");
                                                }}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs active:scale-95"
                                            >
                                                + Inscribir
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Lista de Estudiantes Inscritos */}
                <div className={`${glassCard} space-y-4`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <UsersGroupIcon size={18} className="text-blue-500" /> Estudiantes inscritos ({enrolledStudents.length})
                        </h3>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs w-full sm:w-64 ${
                            isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`}>
                            <SearchIcon size={14} className="text-gray-400 shrink-0" />
                            <input 
                                value={evalSearchQuery} 
                                onChange={e => setEvalSearchQuery(e.target.value)} 
                                placeholder="Filtrar inscritos..." 
                                className="w-full bg-transparent border-none outline-none text-xs"
                            />
                            {evalSearchQuery && <button onClick={() => setEvalSearchQuery("")}><X size={12} className="text-gray-400"/></button>}
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                        {enrolledStudents.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-8 italic">No hay estudiantes inscritos en esta materia todavía.</p>
                        ) : (
                            enrolledStudents.map(([userKey, data]) => (
                                <div
                                    key={userKey}
                                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                                        isDarkMode ? 'bg-gray-800/50 border-gray-700/80 hover:bg-gray-800/80' : 'bg-white border-gray-200/80 hover:bg-gray-50/80 shadow-2xs'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs text-blue-600 dark:text-blue-300">
                                            {data.profilePicUrl ? (
                                                <img src={data.profilePicUrl} alt={data.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                (data.fullName || userKey).substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                {data.fullName}
                                            </h4>
                                            <p className="text-[11px] text-gray-500 truncate">
                                                {data.email || `@${userKey}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveStudentFromSubject(userKey)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                            title="Quitar estudiante de la materia"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8 animate-in fade-in duration-300">
            {/* Header con estadísticas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
                        <UsersIcon className="text-[#AD3333]" size={28} /> Directorio de estudiantes
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                        Gestiona estudiantes, materias, perfiles y credenciales institucionales
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs">
                        {studentEntries.length} alumnos
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs">
                        {academicGroups.length} materias
                    </span>
                </div>
            </div>

            {/* BOTONES DE ACCIÓN PRINCIPALES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setIsCreatingAcadGroup(prev => !prev);
                        if (!isCreatingAcadGroup) setShowMateriasList(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${
                        isCreatingAcadGroup 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : isDarkMode ? 'bg-gray-800/90 border-gray-700 text-gray-100 hover:border-blue-500/50' : 'bg-white border-gray-200 text-gray-900 hover:border-blue-400 shadow-2xs'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isCreatingAcadGroup ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600'}`}>
                            <Plus size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold">Nueva materia</h4>
                            <p className={`text-[10px] ${isCreatingAcadGroup ? 'text-blue-100' : 'text-gray-500'}`}>Crear grupo académico</p>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setShowMateriasList(prev => !prev);
                        if (!showMateriasList) setIsCreatingAcadGroup(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${
                        showMateriasList 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                            : isDarkMode ? 'bg-gray-800/90 border-gray-700 text-gray-100 hover:border-purple-500/50' : 'bg-white border-gray-200 text-gray-900 hover:border-purple-400 shadow-2xs'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${showMateriasList ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-600'}`}>
                            <BookOpen size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold">Ver materias ({academicGroups.length})</h4>
                            <p className={`text-[10px] ${showMateriasList ? 'text-purple-100' : 'text-gray-500'}`}>Listado y estudiantes</p>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setShowRegisterStudentForm(prev => !prev)}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${
                        showRegisterStudentForm 
                            ? 'bg-[#AD3333] text-white border-[#AD3333] shadow-md' 
                            : isDarkMode ? 'bg-gray-800/90 border-gray-700 text-gray-100 hover:border-red-500/50' : 'bg-white border-gray-200 text-gray-900 hover:border-red-400 shadow-2xs'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${showRegisterStudentForm ? 'bg-white/20 text-white' : 'bg-red-500/10 text-[#AD3333]'}`}>
                            <UserCheck size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold">Registrar estudiante</h4>
                            <p className={`text-[10px] ${showRegisterStudentForm ? 'text-red-100' : 'text-gray-500'}`}>Añadir alumno nuevo</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* FORMULARIO: CREAR NUEVA MATERIA CON ÍCONO VECTORIAL */}
            {isCreatingAcadGroup && (
                <form onSubmit={handleCreateAcademicGroup} className={`p-4 sm:p-5 rounded-3xl border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-blue-50/70 border-blue-200 shadow-xs'}`}>
                    <div className="flex items-center justify-between border-b pb-3 border-blue-200/60 dark:border-gray-700">
                        <h3 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={16} /> Crear nueva materia
                        </h3>
                        <button type="button" onClick={() => setIsCreatingAcadGroup(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">Nombre de la materia</label>
                        <input
                            value={newAcadGroupName}
                            onChange={e => setNewAcadGroupName(e.target.value)}
                            placeholder="Ej: Inglés A1 - Grupo A"
                            className={`${glassInput} !py-2.5 text-xs`}
                            required
                            autoFocus
                        />
                    </div>

                    {/* Foto de perfil o avatar del grupo */}
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">
                            Foto de perfil del grupo (Opcional)
                        </label>
                        <div className="flex items-center gap-2">
                            {newAcadGroupAvatarUrl ? (
                                <div className="relative w-11 h-11 rounded-2xl overflow-hidden border-2 border-blue-500 shrink-0 shadow-xs">
                                    <img src={newAcadGroupAvatarUrl} alt="Avatar grupo" className="w-full h-full object-cover" />
                                    <button 
                                        type="button" 
                                        onClick={() => setNewAcadGroupAvatarUrl("")}
                                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                        title="Quitar foto"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : null}
                            <input
                                type="url"
                                value={newAcadGroupAvatarUrl}
                                onChange={e => setNewAcadGroupAvatarUrl(e.target.value)}
                                placeholder="https://ejemplo.com/foto-grupo.jpg o enlace de imagen"
                                className={`${glassInput} !py-2 text-xs flex-1`}
                            />
                            <label className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 text-xs font-bold">
                                <Upload size={14} />
                                <span className="hidden sm:inline">Subir</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (file.size > 4 * 1024 * 1024) return showMessage("⚠️ La imagen no debe superar los 4MB.");
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setNewAcadGroupAvatarUrl(ev.target.result);
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Selector de Ícono Monocromático Vectorial / Doodles */}
                    <div>
                        <label className="block text-xs font-bold mb-1.5 text-gray-700 dark:text-gray-300">Ícono del grupo</label>
                        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-2 rounded-2xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 max-h-36 overflow-y-auto">
                            {GROUP_VECTOR_ICONS.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setNewAcadGroupEmoji(item.id)}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                        (newAcadGroupEmoji || 'BookOpen') === item.id 
                                            ? 'bg-blue-600 text-white scale-110 shadow-md ring-2 ring-blue-400' 
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                    }`}
                                    title={item.label}
                                >
                                    {renderGroupVectorIcon(item.id, 18, (newAcadGroupEmoji || 'BookOpen') === item.id ? 'text-white' : 'currentColor')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setIsCreatingAcadGroup(false)}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSavingMateria}
                            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                        >
                            {isSavingMateria ? <Loader2 className="animate-spin" size={14} /> : <CheckLine size={14} />}
                            <span>{isSavingMateria ? 'Creando...' : 'Crear materia'}</span>
                        </button>
                    </div>
                </form>
            )}

            {/* LISTADO DE MATERIAS */}
            {showMateriasList && (
                <div className={`${glassCard} space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 border border-purple-500/20`}>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div>
                            <h3 className="font-bold text-sm text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                <BookOpen size={18} /> Materias creadas ({academicGroups.length})
                            </h3>
                            <p className="text-[11px] text-gray-500">Haz clic sobre una materia para ver y gestionar sus estudiantes</p>
                        </div>
                        <button type="button" onClick={() => setShowMateriasList(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {academicGroups.length === 0 ? (
                            <p className="text-xs italic text-gray-500 py-4 col-span-2 text-center">No hay materias creadas todavía.</p>
                        ) : (
                            academicGroups.map(g => {
                                return (
                                    <div
                                        key={g.id}
                                        onClick={() => setSelectedSubjectDetail(g)}
                                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] ${
                                            isDarkMode ? 'bg-gray-800/80 border-gray-700 hover:border-purple-500/50' : 'bg-white border-gray-200 hover:border-purple-400 shadow-2xs'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                                                {renderGroupVectorIcon(g.emoji || 'BookOpen', 18, "text-gray-800 dark:text-gray-100")}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-xs truncate text-gray-900 dark:text-gray-100">{g.name}</h4>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setGroupMembersModal({ isOpen: true, group: g, search: "" });
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-0.5 cursor-pointer"
                                                    title="Ver integrantes"
                                                >
                                                    <UsersIcon size={12} /> {g.members?.length || 0} miembros
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSubjectDetail(g)}
                                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 hover:bg-purple-100 transition-colors"
                                            >
                                                Ver alumnos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => confirmAction(`¿Eliminar la materia "${g.name}"?`, () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', g.id)))}
                                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                                                title="Eliminar materia"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* FORMULARIO: REGISTRAR NUEVO ESTUDIANTE */}
            {showRegisterStudentForm && (
                <form
                    onSubmit={async (e) => {
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
                            setShowRegisterStudentForm(false);
                            showMessage("✅ Estudiante registrado exitosamente.");
                        } catch(err) { showMessage("❌ Error: " + (err.message.includes('email-already') ? 'El correo ya existe' : err.message)); }
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200 ${glassCard}`}
                >
                    <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold text-xs text-[#AD3333] dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                            <UserCheck size={16} /> Registro de nuevo estudiante
                        </h3>
                        <button type="button" onClick={() => setShowRegisterStudentForm(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input name="fullname" placeholder="Nombre completo del alumno" className={`${glassInput} !py-2.5 text-xs`} required autoFocus />
                        <input name="username" placeholder="Usuario (ej: marianagomez)" className={`${glassInput} !py-2.5 text-xs`} required />
                        <input name="email" type="email" placeholder="Correo electrónico institucional" className={`${glassInput} !py-2.5 text-xs`} required />
                        <input name="password" type="text" placeholder="Contraseña temporal" className={`${glassInput} !py-2.5 text-xs`} required />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setShowRegisterStudentForm(false)}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="py-2 px-5 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                        >
                            <Plus size={14} /> Guardar estudiante
                        </button>
                    </div>
                </form>
            )}

            {/* LISTA Y DIRECTORIO GENERAL DE ESTUDIANTES */}
            <div className={`${glassCard} space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <UsersGroupIcon size={18} className="text-blue-500" /> Lista general de estudiantes ({filteredStudents.length})
                    </h3>
                    {/* Buscador de alumnos */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs w-full sm:w-64 ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                    }`}>
                        <SearchIcon size={14} className="text-gray-400 shrink-0" />
                        <input 
                            value={evalSearchQuery} 
                            onChange={e => setEvalSearchQuery(e.target.value)} 
                            placeholder="Buscar por nombre o usuario..." 
                            className="w-full bg-transparent border-none outline-none text-xs"
                        />
                        {evalSearchQuery && <button onClick={() => setEvalSearchQuery("")}><X size={12} className="text-gray-400"/></button>}
                    </div>
                </div>

                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {filteredStudents.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-8 italic">No se encontraron estudiantes.</p>
                    ) : (
                        filteredStudents.map(([userKey, data]) => {
                            const studentClasses = academicGroups.filter(g => (g.members || []).includes(userKey));
                            return (
                                <div key={userKey} className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                                    isDarkMode ? 'bg-gray-800/60 border-gray-700/80 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50/80 shadow-2xs'
                                }`}>
                                    {/* Info Estudiante con Enlace a su Perfil */}
                                    <div 
                                        onClick={() => {
                                            setViewingProfileId(userKey);
                                            try { sessionStorage.setItem('englishTech_viewingProfileId', userKey); } catch(e) {}
                                            changeTab('profile', userKey);
                                        }}
                                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                                        title="Ver perfil completo del estudiante"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs text-blue-600 dark:text-blue-300 group-hover:scale-105 transition-transform shadow-xs">
                                            {data.profilePicUrl ? (
                                                <img src={data.profilePicUrl} alt={data.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                data.fullName?.charAt(0)?.toUpperCase() || 'E'
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{data.fullName}</p>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0">
                                                    {data.customLabel || 'Estudiante'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 truncate">@{userKey} • {data.email}</p>
                                            
                                            {/* Materias */}
                                            {studentClasses.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {studentClasses.map(sc => (
                                                        <span key={sc.id} className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-[9px] font-bold border border-blue-500/20">
                                                            {sc.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botones de Acción Docente */}
                                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center" onClick={e => e.stopPropagation()}>
                                        {/* Editar perfil */}
                                        <button 
                                            type="button"
                                            onClick={() => setStudentEditModal({
                                                isOpen: true,
                                                userKey: userKey,
                                                fullName: data.fullName || '',
                                                customLabel: data.customLabel || '',
                                                email: data.email || '',
                                                profilePicUrl: data.profilePicUrl || ''
                                            })} 
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                                            title="Editar información del estudiante"
                                        >
                                            <Edit3 size={15}/>
                                        </button>
                                        
                                        {/* Restablecer Contraseña */}
                                        <button 
                                            type="button"
                                            onClick={() => handleResetStudentPasswordByTeacher(data.email, data.fullName)} 
                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                                            title="Enviar correo de restablecimiento de contraseña"
                                        >
                                            <KeyRound size={15}/>
                                        </button>
                                        {/* Eliminar Estudiante */}
                                        <button 
                                            type="button"
                                            onClick={() => confirmAction(`¿Eliminar a "${data.fullName}" (@${userKey}) del sistema? Su enlace de perfil será eliminado permanentemente.`, async () => {
                                                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userMappings', userKey));
                                                for (const g of academicGroups) {
                                                    if ((g.members || []).includes(userKey)) {
                                                        const updatedMembers = g.members.filter(m => m !== userKey);
                                                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', g.id), { members: updatedMembers });
                                                    }
                                                }
                                                if (viewingProfileId === userKey) {
                                                    setViewingProfileId(null);
                                                    try { sessionStorage.removeItem('englishTech_viewingProfileId'); } catch(e) {}
                                                    window.location.hash = 'directory';
                                                }
                                                showMessage("✅ Estudiante eliminado y enlace invalidado.");
                                            })} 
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                                            title="Eliminar estudiante"
                                        >
                                            <Trash2 size={15}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* MODAL DE EDICIÓN DE ESTUDIANTE */}
            {studentEditModal.isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
                    <form onSubmit={handleSaveStudentEdit} className={`${glassCard} max-w-md w-full space-y-4 relative shadow-2xl animate-in zoom-in-95`}>
                        <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Edit3 size={16} className="text-blue-500"/> Editar estudiante (@{studentEditModal.userKey})
                            </h3>
                            <button type="button" onClick={() => setStudentEditModal({ isOpen: false, userKey: '', fullName: '', customLabel: '', email: '', profilePicUrl: '' })}>
                                <X size={18} className="text-gray-400 hover:text-gray-600"/>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">Nombre completo</label>
                                <input 
                                    value={studentEditModal.fullName} 
                                    onChange={e => setStudentEditModal({ ...studentEditModal, fullName: e.target.value })} 
                                    className={`${glassInput} !py-2`} 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">Rol o etiqueta personalizada (ej: Monitor, Alumno)</label>
                                <input 
                                    value={studentEditModal.customLabel} 
                                    onChange={e => setStudentEditModal({ ...studentEditModal, customLabel: e.target.value })} 
                                    placeholder="Ej: Monitor académico" 
                                    className={`${glassInput} !py-2`} 
                                />
                            </div>
                            <div>
                                <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">Foto de perfil (URL)</label>
                                <input 
                                    value={studentEditModal.profilePicUrl} 
                                    onChange={e => setStudentEditModal({ ...studentEditModal, profilePicUrl: e.target.value })} 
                                    placeholder="https://..." 
                                    className={`${glassInput} !py-2`} 
                                />
                            </div>
                            <div>
                                <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">Correo electrónico</label>
                                <input 
                                    value={studentEditModal.email} 
                                    onChange={e => setStudentEditModal({ ...studentEditModal, email: e.target.value })} 
                                    type="email" 
                                    className={`${glassInput} !py-2`} 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <button 
                                type="button" 
                                onClick={() => setStudentEditModal({ isOpen: false, userKey: '', fullName: '', customLabel: '', email: '', profilePicUrl: '' })} 
                                className={`${outlineButton} !py-2 px-3 text-xs`}
                            >
                                Cancelar
                            </button>
                            <button type="submit" className={`${redButton} !py-2 px-4 text-xs !bg-blue-600 hover:!bg-blue-700`}>
                                Guardar cambios
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

          // --- VISTA DEDICADA DE GRUPOS (DOCENTES Y ESTUDIANTES) ---
          const renderGroupsView = () => {
            // Si no hay grupo seleccionado, mostrar listado de grupos
            if (!selectedGroupForFeed) {
                const availableGroups = role === 'teacher'
                    ? academicGroups
                    : academicGroups.filter(g => (g.members || []).includes(myChatId) || (g.members || []).includes(user?.uid));

                return (
                    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
                                    <UsersGroupIcon className="text-teal-600 dark:text-teal-400" size={28} />
                                    <span>Grupos</span>
                                </h2>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    Consulta el muro de publicaciones y asignaciones exclusivo de cada grupo.
                                </p>
                            </div>
                            <span className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-xs self-start sm:self-auto">
                                {availableGroups.length} {availableGroups.length === 1 ? 'grupo' : 'grupos'}
                            </span>
                        </div>

                        {availableGroups.length === 0 ? (
                            <EmptyState
                                icon={UsersGroupIcon}
                                title="No tienes grupos asignados"
                                message={role === 'teacher' ? 'Crea un nuevo grupo o materia en el Directorio para comenzar.' : 'Aún no has sido inscrito en ningún grupo.'}
                                isDarkMode={isDarkMode}
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {availableGroups.map((group) => {
                                    const groupTasksCount = tasks.filter(t => t.targetGroupId === group.id).length;
                                    const memberCount = group.members?.length || 0;

                                    return (
                                        <div
                                            key={group.id}
                                            onClick={() => setSelectedGroupForFeed(group)}
                                            className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-4 hover:scale-[1.01] ${glassCard} hover:shadow-md relative overflow-hidden group`}
                                            style={{
                                                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-900 dark:text-white shadow-xs shrink-0 transition-transform group-hover:scale-105">
                                                    {renderGroupVectorIcon(group.emoji || 'BookOpen', 22, "text-gray-900 dark:text-white")}
                                                </div>
                                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300">
                                                    {groupTasksCount} publicaciones
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                                                    {group.name}
                                                </h3>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setGroupMembersModal({ isOpen: true, group, search: "" });
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-xs transition-colors border border-teal-500/20 shadow-2xs active:scale-95"
                                                        title="Ver lista de integrantes del grupo"
                                                    >
                                                        <UsersIcon size={13} />
                                                        <span>{memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                <span className="text-xs font-bold flex items-center gap-1 text-teal-600 dark:text-teal-400">
                                                    Ver muro del grupo <ChevronRight size={14} />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }

            // Si un grupo está seleccionado, mostrar el feed exclusivo de ese grupo con portada integrada
            const currentGroupData = academicGroups.find(g => g.id === selectedGroupForFeed.id) || selectedGroupForFeed;
            const currentEmoji = currentGroupData.emoji || 'BookOpen';
            const currentPattern = GROUP_COVER_PATTERNS.find(p => p.id === (currentGroupData.coverPattern || 'doodle-1')) || GROUP_COVER_PATTERNS[0];

            return (
                <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8 animate-in fade-in duration-300">
                    {/* PORTADA / ENCABEZADO INTEGRADO DEL GRUPO */}
                    <div className="relative rounded-3xl overflow-hidden shadow-lg border border-gray-200/80 dark:border-gray-800 transition-all min-h-[190px] sm:min-h-[220px] flex flex-col justify-between p-4 sm:p-6 text-white">
                        {/* Fondo de Portada (Imagen personalizada o Patrón Doodle) */}
                        {currentGroupData.coverUrl ? (
                            <>
                                <img 
                                    src={currentGroupData.coverUrl} 
                                    alt="Portada del grupo" 
                                    className="absolute inset-0 w-full h-full object-cover object-center" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
                            </>
                        ) : (
                            <div 
                                className="absolute inset-0" 
                                style={{ background: currentPattern.bg }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                            </div>
                        )}

                        {/* Barra Superior de la Portada */}
                        <div className="relative z-10 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedGroupForFeed(null)}
                                className="p-2.5 rounded-2xl bg-black/30 hover:bg-black/60 text-white backdrop-blur-xs border border-white/15 transition-all shadow-md active:scale-95"
                                title="Volver a lista de grupos"
                            >
                                <ArrowLeftIcon size={18} />
                            </button>

                            {role === 'teacher' && (
                                <button
                                    type="button"
                                    onClick={() => setGroupCoverModal({
                                        isOpen: true,
                                        group: currentGroupData,
                                        emoji: currentGroupData.emoji || 'BookOpen',
                                        coverPattern: currentGroupData.coverPattern || 'doodle-1',
                                        coverUrl: currentGroupData.coverUrl || '',
                                        customFile: null,
                                        isSaving: false
                                    })}
                                    className="px-3.5 py-1.5 rounded-xl bg-black/25 hover:bg-black/75 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-xs border border-white/10 hover:border-white/30 transition-all flex items-center gap-1.5 shadow-xs opacity-80 hover:opacity-100"
                                >
                                    <Palette size={14} />
                                    <span>Personalizar</span>
                                </button>
                            )}
                        </div>

                        {/* Barra Inferior: Info del Grupo y Ícono Vectorial */}
                        <div className="relative z-10 flex items-end gap-3.5 sm:gap-4 mt-8">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg shrink-0 select-none">
                                {renderGroupVectorIcon(currentEmoji, 30, "text-white drop-shadow-sm")}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/30">
                                        Muro de Grupo
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-md leading-tight mt-1 truncate">
                                    {currentGroupData.name}
                                </h2>
                                <div className="mt-1 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setGroupMembersModal({ isOpen: true, group: currentGroupData, search: "" })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition-all border border-white/30 shadow-xs active:scale-95 cursor-pointer"
                                        title="Ver lista de integrantes del grupo"
                                    >
                                        <UsersIcon size={13} />
                                        <span>{currentGroupData.members?.length || 0} miembros</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MODAL: PERSONALIZAR GRUPO (PORTALIZADO) */}
                    {groupCoverModal.isOpen && ReactDOM.createPortal(
                        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
                            <div className={`w-full max-w-xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                                isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                            }`}>
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center">
                                            <Palette size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-extrabold">
                                                Personalizar grupo
                                            </h3>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs sm:max-w-md">
                                                {groupCoverModal.group?.name}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setGroupCoverModal({ isOpen: false, group: null, emoji: 'BookOpen', coverPattern: 'doodle-1', coverUrl: '', customFile: null, isSaving: false })}
                                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Body: 2 Columnas Compactas */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Columna 1: Patrones de fondo */}
                                        <div className="space-y-2">
                                            <label className="block font-bold text-gray-700 dark:text-gray-300 text-xs">
                                                Patrón de fondo
                                            </label>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {GROUP_COVER_PATTERNS.map((pat) => (
                                                    <button
                                                        key={pat.id}
                                                        type="button"
                                                        onClick={() => setGroupCoverModal(prev => ({ ...prev, coverPattern: pat.id, coverUrl: '', customFile: null }))}
                                                        className={`h-11 rounded-xl px-3 flex items-center justify-between transition-all border text-left ${
                                                            groupCoverModal.coverPattern === pat.id && !groupCoverModal.coverUrl
                                                                ? 'ring-2 ring-teal-500 ring-offset-2 scale-[1.01] shadow-xs'
                                                                : 'opacity-85 hover:opacity-100'
                                                        }`}
                                                        style={{ background: pat.bg }}
                                                    >
                                                        <span className="text-white text-xs font-bold drop-shadow-sm">{pat.name}</span>
                                                        {groupCoverModal.coverPattern === pat.id && !groupCoverModal.coverUrl && (
                                                            <CheckCircle2 size={16} className="text-white fill-teal-500" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Columna 2: Subir imagen personalizada */}
                                        <div className="space-y-2">
                                            <label className="block font-bold text-gray-700 dark:text-gray-300 text-xs">
                                                Imagen personalizada
                                            </label>
                                            <label className="h-[148px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-teal-500 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden">
                                                {groupCoverModal.coverUrl ? (
                                                    <div className="absolute inset-0">
                                                        <img src={groupCoverModal.coverUrl} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                            <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-xs">Cambiar imagen</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-9 h-9 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1">
                                                            <ImageIcon size={18} />
                                                        </div>
                                                        <span className="font-bold text-gray-700 dark:text-gray-200 text-xs">
                                                            Subir imagen
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 mt-0.5">Desde tu dispositivo</span>
                                                    </>
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                const compressedBase64 = await compressImage(file, 1400, 480, 0.90);
                                                                setGroupCoverModal(prev => ({
                                                                    ...prev,
                                                                    customFile: compressedBase64,
                                                                    coverUrl: compressedBase64
                                                                }));
                                                            } catch(err) {
                                                                console.error("Error comprimiendo imagen de portada", err);
                                                            }
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {groupCoverModal.coverUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setGroupCoverModal(prev => ({ ...prev, coverUrl: '', customFile: null }))}
                                                    className="w-full py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-colors"
                                                >
                                                    Quitar imagen
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ícono Monocromático Vectorial / Doodle */}
                                    <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-gray-800">
                                        <label className="block font-bold text-gray-700 dark:text-gray-300 text-xs">
                                            Ícono del grupo
                                        </label>
                                        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-2 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 max-h-36 overflow-y-auto">
                                            {GROUP_VECTOR_ICONS.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setGroupCoverModal(prev => ({ ...prev, emoji: item.id }))}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                                        (groupCoverModal.emoji || 'BookOpen') === item.id 
                                                            ? 'bg-black text-white dark:bg-white dark:text-black scale-110 shadow-xs ring-2 ring-teal-500' 
                                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                                                    }`}
                                                    title={item.label}
                                                >
                                                    {renderGroupVectorIcon(item.id, 18, (groupCoverModal.emoji || 'BookOpen') === item.id ? (isDarkMode ? 'text-black' : 'text-white') : 'currentColor')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                                    <button
                                        type="button"
                                        onClick={() => setGroupCoverModal({ isOpen: false, group: null, emoji: 'BookOpen', coverPattern: 'doodle-1', coverUrl: '', customFile: null, isSaving: false })}
                                        disabled={groupCoverModal.isSaving}
                                        className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={groupCoverModal.isSaving}
                                        onClick={async () => {
                                            if (!groupCoverModal.group?.id) return;
                                            setGroupCoverModal(prev => ({ ...prev, isSaving: true }));
                                            try {
                                                let finalCoverUrl = groupCoverModal.coverUrl;

                                                // Si subió un archivo custom nuevo en Base64, subirlo a Firebase Storage
                                                if (groupCoverModal.customFile && groupCoverModal.customFile.startsWith('data:')) {
                                                    finalCoverUrl = await uploadImageToStorage(groupCoverModal.customFile, 'group_covers');
                                                }

                                                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academicGroups', groupCoverModal.group.id), {
                                                    emoji: groupCoverModal.emoji || 'BookOpen',
                                                    coverPattern: groupCoverModal.coverPattern || 'doodle-1',
                                                    coverUrl: finalCoverUrl || ''
                                                });

                                                // Actualizar el estado de selectedGroupForFeed
                                                setSelectedGroupForFeed(prev => ({
                                                    ...prev,
                                                    emoji: groupCoverModal.emoji || 'BookOpen',
                                                    coverPattern: groupCoverModal.coverPattern || 'doodle-1',
                                                    coverUrl: finalCoverUrl || ''
                                                }));

                                                setGroupCoverModal({ isOpen: false, group: null, emoji: 'BookOpen', coverPattern: 'doodle-1', coverUrl: '', customFile: null, isSaving: false });
                                                showMessage("✅ Personalización del grupo guardada.");
                                            } catch (err) {
                                                console.error("Error guardando portada:", err);
                                                showMessage("❌ Error al guardar personalización. Intenta de nuevo.");
                                                setGroupCoverModal(prev => ({ ...prev, isSaving: false }));
                                            }
                                        }}
                                        className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                                    >
                                        {groupCoverModal.isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                                        <span>{groupCoverModal.isSaving ? 'Guardando...' : 'Guardar'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Muro / Feed filtrado para este grupo */}
                    <React.Suspense fallback={<p className="text-gray-500 p-8 text-center">Cargando publicaciones del grupo...</p>}>
                        <TasksTab 
                            academicGroups={academicGroups} 
                            myChatId={myChatId}
                            userMappings={userMappings}
                            handleOpenProfileByName={handleOpenProfileByName}
                            role={role} glassCard={glassCard} glassInput={glassInput} redButton={redButton}
                            postType={postType} setPostType={setPostType} taskTitle={taskTitle} setTaskTitle={setTaskTitle}
                            taskDesc={taskDesc} setTaskDesc={setTaskDesc} showImageInput={showImageInput} setShowImageInput={setShowImageInput}
                            postImageUrl={postImageUrl} setPostImageUrl={setPostImageUrl} postFileUrl={postFileUrl} setPostFileUrl={setPostFileUrl}
                            postFileName={postFileName} setPostFileName={setPostFileName} showPostAttachmentMenu={showPostAttachmentMenu}
                            setShowPostAttachmentMenu={setShowPostAttachmentMenu} handlePostLocalFileUpload={handlePostLocalFileUpload}
                            isAiLoading={isAiLoading} setIsAiLoading={setIsAiLoading} prevTaskTitle={prevTaskTitle} setPrevTaskTitle={setPrevTaskTitle}
                            prevTaskDesc={prevTaskDesc} setPrevTaskDesc={setPrevTaskDesc} hasAiModified={hasAiModified} setHasAiModified={setHasAiModified}
                            callGemini={callGemini} showMessage={showMessage} handleAiTranslate={handleAiTranslate} taskDate={taskDate}
                            setTaskDate={setTaskDate} taskTime={taskTime} setTaskTime={setTaskTime} allowLate={allowLate} setAllowLate={setAllowLate}
                            db={db} appId={appId} loggedInName={loggedInName} getToday={getToday} tasks={tasks} user={user} isDarkMode={isDarkMode}
                            confirmAction={confirmAction} setFullScreenImage={setFullScreenImage} tasksLoading={tasksLoading} taskLimit={taskLimit} loadMoreTasks={loadMoreTasks} pinnedTasks={pinnedTasks}
                            wallSearchTerm={wallSearchTerm} setWallSearchTerm={setWallSearchTerm}
                            fixedTargetGroup={selectedGroupForFeed.id}
                        />
                    </React.Suspense>
                </div>
            );
          };

          const renderEvaluations = () => {
              // Vista de Rendición de Evaluación (Estudiante respondiendo)
              if (activeTakingEval) {
                  return (
                      <div className="max-w-3xl mx-auto space-y-4 pb-20 md:pb-8 animate-in fade-in">
                          {/* Sticky Header con Temporizador y Progreso */}
                          <div className={`${glassCard} !p-4 sticky top-[76px] z-40 border border-red-500/20 shadow-md backdrop-blur-md flex items-center justify-between gap-4 rounded-2xl`}>
                              <div className="min-w-0">
                                  <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                                      <span>{activeTakingEval.title}</span>
                                      {activeTakingEval.strictAntiCheat && (
                                          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1 shrink-0">
                                              <ShieldAlert size={11} /> Anti-trampas
                                          </span>
                                      )}
                                  </h2>
                                  <p className="text-xs text-gray-500 font-medium truncate">{activeTakingEval.description}</p>
                              </div>
                              <div className="bg-red-500/10 border border-red-500/30 text-[#AD3333] dark:text-red-400 px-3.5 py-1.5 rounded-xl font-bold font-mono text-sm sm:text-base flex items-center gap-2 shrink-0 animate-pulse">
                                  <Clock size={16}/> {formatTime(timeRemaining)}
                              </div>
                          </div>

                          {/* Aviso de Modo Estricto Anti-Trampas */}
                          {activeTakingEval.strictAntiCheat && (
                              <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 p-3.5 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
                                  <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                                  <div>
                                      <p className="font-bold">Modo estricto anti-trampas activado</p>
                                      <p className="text-[11px] text-red-600/90 dark:text-red-400/90 mt-0.5">
                                          Por seguridad académica, <strong>no cambies de pestaña, no minimices la app ni abras otras aplicaciones</strong>. Si sales de esta pantalla, la prueba se anulará inmediatamente con nota 0.0.
                                      </p>
                                  </div>
                              </div>
                          )}

                          {/* Lista de Preguntas */}
                          <div className="space-y-4">
                              {activeTakingEval.questions.map((q, qIndex) => (
                                  <div key={qIndex} className={`${glassCard} !p-5 border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3 shadow-xs`}>
                                      <div className="flex items-start gap-2.5">
                                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                              {qIndex + 1}
                                          </span>
                                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                                              {q.text}
                                          </h3>
                                      </div>
                                      
                                      {q.type === 'multiple' ? (
                                          <div className="space-y-2 pt-1 pl-8">
                                              {q.options.map((opt, oIndex) => {
                                                  const isSelected = (studentAnswers[qIndex] || []).includes(oIndex);
                                                  return (
                                                      <label 
                                                          key={oIndex} 
                                                          className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border text-xs sm:text-sm font-semibold transition-all ${
                                                              isSelected 
                                                                  ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs' 
                                                                  : (isDarkMode ? 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')
                                                          }`}
                                                      >
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
                                                              className="w-4 h-4 accent-blue-600 rounded" 
                                                          />
                                                          <span>{opt.text}</span>
                                                      </label>
                                                  );
                                              })}
                                          </div>
                                      ) : (
                                          <div className="pt-1 pl-8">
                                              <input 
                                                  type="text" 
                                                  value={studentAnswers[qIndex] || ""} 
                                                  onChange={(e) => setStudentAnswers({...studentAnswers, [qIndex]: e.target.value})}
                                                  placeholder="Escribe tu respuesta aquí..." 
                                                  className={`${glassInput} text-sm font-medium`} 
                                              />
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                          
                          <div className="flex justify-end pt-2 pb-6">
                              <button 
                                  type="button"
                                  onClick={() => confirmAction("¿Estás seguro de enviar la evaluación? No podrás modificarla después.", () => submitEvaluation(false), "Sí, entregar", false)} 
                                  className="py-2.5 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-transform active:scale-95"
                              >
                                  <Send size={15}/> Enviar evaluación
                              </button>
                          </div>
                      </div>
                  );
              }

              // Función de Exportación a Excel (.xlsx) con desglose por preguntas y promedio general
              const exportEvaluationToExcel = (evaluation, gradesList) => {
                  if (!evaluation) return;
                  const evalGrades = (gradesList || []).filter(g => g.evaluationId === evaluation.id);
                  const questions = evaluation.questions || [];

                  // 1. Ordenar estudiantes alfabéticamente por apellido (o primer nombre)
                  const sortedGrades = [...evalGrades].sort((a, b) => {
                      const partsA = (a.studentName || '').trim().split(' ');
                      const lastNameA = partsA.length > 1 ? partsA.slice(1).join(' ') : partsA[0] || '';
                      const partsB = (b.studentName || '').trim().split(' ');
                      const lastNameB = partsB.length > 1 ? partsB.slice(1).join(' ') : partsB[0] || '';
                      return lastNameA.localeCompare(lastNameB, 'es', { sensitivity: 'base' });
                  });

                  // 2. Filas de cada estudiante con desglose por pregunta
                  const rows = sortedGrades.map((g, index) => {
                      const row = {
                          'N°': index + 1,
                          'Estudiante': g.studentName || 'Estudiante',
                      };

                      questions.forEach((q, qIdx) => {
                          const qAns = g.answers?.[qIdx];
                          let isCorrect = false;
                          if (q.type === 'multiple') {
                              const correctOpts = (q.options || []).map((opt, oIdx) => opt.isCorrect ? oIdx : null).filter(o => o !== null);
                              const ansArr = Array.isArray(qAns) ? qAns : [];
                              isCorrect = correctOpts.length > 0 && ansArr.length === correctOpts.length && correctOpts.every(i => ansArr.includes(i));
                          } else {
                              isCorrect = typeof qAns === 'string' && qAns.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();
                          }
                          row[`Pregunta ${qIdx + 1}`] = isCorrect ? 'Correcta' : 'Incorrecta';
                      });

                      row['Nota Final (0.0 - 5.0)'] = typeof g.score === 'number' ? g.score.toFixed(1) : Number(g.score || 0).toFixed(1);
                      row['Fecha de Entrega'] = g.submittedAt ? new Date(g.submittedAt).toLocaleDateString('es-ES') + ' ' + new Date(g.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                      return row;
                  });

                  // 3. Promedio general del grupo
                  const averageScore = evalGrades.length > 0
                      ? (evalGrades.reduce((sum, g) => sum + (Number(g.score) || 0), 0) / evalGrades.length).toFixed(2)
                      : '0.00';

                  // Fila de resumen inferior
                  const summaryRow = {
                      'N°': '',
                      'Estudiante': 'PROMEDIO GENERAL DEL GRUPO',
                  };
                  questions.forEach((_, qIdx) => {
                      summaryRow[`Pregunta ${qIdx + 1}`] = '';
                  });
                  summaryRow['Nota Final (0.0 - 5.0)'] = `${averageScore} / 5.0`;
                  summaryRow['Fecha de Entrega'] = `Total evaluados: ${evalGrades.length}`;
                  rows.push(summaryRow);

                  const worksheet = XLSX.utils.json_to_sheet(rows);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones');
                  const safeTitle = (evaluation.title || 'Evaluacion').replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_').toLowerCase();
                  XLSX.writeFile(workbook, `reporte_${safeTitle}.xlsx`);
              };

              // Vista de Resultados (Docente revisando notas y métricas generales)
              if (viewingResultsFor) {
                  const evalGrades = grades.filter(g => g.evaluationId === viewingResultsFor.id);
                  const questions = viewingResultsFor.questions || [];
                  const avgScore = evalGrades.length ? (evalGrades.reduce((acc, g) => acc + (g.score || 0), 0) / evalGrades.length).toFixed(2) : '0.00';
                  const maxScore = evalGrades.length ? Math.max(...evalGrades.map(g => Number(g.score) || 0)).toFixed(1) : '0.0';
                  const passingCount = evalGrades.filter(g => (Number(g.score) || 0) >= 3.0).length;

                  // Ordenados por apellido para la tabla
                  const sortedEvalGrades = [...evalGrades].sort((a, b) => {
                      const partsA = (a.studentName || '').trim().split(' ');
                      const lastNameA = partsA.length > 1 ? partsA.slice(1).join(' ') : partsA[0] || '';
                      const partsB = (b.studentName || '').trim().split(' ');
                      const lastNameB = partsB.length > 1 ? partsB.slice(1).join(' ') : partsB[0] || '';
                      return lastNameA.localeCompare(lastNameB, 'es', { sensitivity: 'base' });
                  });

                  return (
                      <div className="space-y-5 max-w-4xl mx-auto pb-20 md:pb-8 animate-in fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                  <button 
                                      onClick={() => setViewingResultsFor(null)} 
                                      className={`p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                      title="Volver a evaluaciones"
                                  >
                                      <ArrowLeftIcon size={18}/>
                                  </button>
                                  <div>
                                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                          <span>{viewingResultsFor.title}</span>
                                      </h2>
                                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                                          Materia: <strong className="text-blue-500">{viewingResultsFor.targetGroupName || 'Todos los estudiantes'}</strong>
                                      </p>
                                  </div>
                              </div>

                              <button
                                  type="button"
                                  onClick={() => exportEvaluationToExcel(viewingResultsFor, grades)}
                                  disabled={evalGrades.length === 0}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 shrink-0"
                                  title="Exportar reporte completo a Microsoft Excel (.xlsx)"
                              >
                                  <Download size={15} />
                                  <span>Descargar Excel (.xlsx)</span>
                              </button>
                          </div>

                          {/* Métricas Generales del Grupo */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className={`${glassCard} !p-4 text-center rounded-2xl border`}>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Evaluados</p>
                                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{evalGrades.length}</p>
                              </div>
                              <div className={`${glassCard} !p-4 text-center rounded-2xl border`}>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Promedio General</p>
                                  <p className={`text-2xl font-black mt-1 ${parseFloat(avgScore) >= 3.0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{avgScore} <span className="text-xs text-gray-400 font-normal">/ 5.0</span></p>
                              </div>
                              <div className={`${glassCard} !p-4 text-center rounded-2xl border`}>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Nota Más Alta</p>
                                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{maxScore} <span className="text-xs text-gray-400 font-normal">/ 5.0</span></p>
                              </div>
                              <div className={`${glassCard} !p-4 text-center rounded-2xl border`}>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Aprobados</p>
                                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{passingCount} <span className="text-xs text-gray-400 font-normal">de {evalGrades.length}</span></p>
                              </div>
                          </div>

                          {/* Tabla de Calificaciones y Desglose */}
                          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-xs">
                              <table className="w-full text-left text-xs">
                                  <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold">
                                      <tr>
                                          <th className="p-3.5">Estudiante (Alfabético)</th>
                                          <th className="p-3.5 text-center">Desempeño</th>
                                          <th className="p-3.5 text-center">Nota Final (0.0 - 5.0)</th>
                                          <th className="p-3.5">Fecha de entrega</th>
                                          <th className="p-3.5 text-center">Acciones</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                      {sortedEvalGrades.length === 0 ? (
                                          <tr><td colSpan="5" className="p-8 text-gray-500 text-center font-medium italic">Ningún estudiante ha presentado esta prueba aún.</td></tr>
                                      ) : sortedEvalGrades.map((grade) => {
                                          // Contar preguntas correctas
                                          let correctCount = 0;
                                          questions.forEach((q, qIdx) => {
                                              const qAns = grade.answers?.[qIdx];
                                              if (q.type === 'multiple') {
                                                  const correctOpts = (q.options || []).map((opt, oIdx) => opt.isCorrect ? oIdx : null).filter(o => o !== null);
                                                  const ansArr = Array.isArray(qAns) ? qAns : [];
                                                  if (correctOpts.length > 0 && ansArr.length === correctOpts.length && correctOpts.every(i => ansArr.includes(i))) correctCount++;
                                              } else {
                                                  if (typeof qAns === 'string' && qAns.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase()) correctCount++;
                                              }
                                          });

                                          const isCancelled = grade.status === 'cancelled_tab_change';

                                          return (
                                              <tr key={grade.id} className={`transition-colors ${isCancelled ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/60' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'}`}>
                                                  <td className="p-3.5 font-bold text-gray-900 dark:text-gray-100">
                                                      <div>{grade.studentName}</div>
                                                      {isCancelled && (
                                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800 mt-1">
                                                              <ShieldAlert size={11} /> Cancelada por cambio de pestaña
                                                          </span>
                                                      )}
                                                  </td>
                                                  <td className="p-3.5 text-center">
                                                      {isCancelled ? (
                                                          <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-[11px]">
                                                              Anulada (0/{questions.length})
                                                          </span>
                                                      ) : (
                                                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 font-semibold text-[11px]">
                                                              {correctCount} / {questions.length} correctas
                                                          </span>
                                                      )}
                                                  </td>
                                                  <td className="p-3.5 text-center">
                                                      {editingGrade.id === grade.id ? (
                                                          <div className="flex justify-center items-center gap-1.5">
                                                              <input 
                                                                  type="number" 
                                                                  step="0.1" 
                                                                  min="0" 
                                                                  max="5" 
                                                                  value={editingGrade.score} 
                                                                  onChange={(e) => setEditingGrade({...editingGrade, score: e.target.value})} 
                                                                  className={`${glassInput} w-16 !py-1 text-center font-bold text-xs`} 
                                                                  autoFocus 
                                                              />
                                                              <button onClick={() => saveEditedGrade(grade.id)} className="text-green-500 hover:text-green-700" title="Guardar"><CheckCircle2 size={16}/></button>
                                                              <button onClick={() => setEditingGrade({id: null, score: ''})} className="text-red-500 hover:text-red-700" title="Cancelar"><X size={16}/></button>
                                                          </div>
                                                      ) : (
                                                          <span className={`font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl ${
                                                              Number(grade.score) >= 3.0 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                          }`}>
                                                              {Number(grade.score).toFixed(1)}
                                                          </span>
                                                      )}
                                                  </td>
                                                  <td className="p-3.5 text-gray-500 text-[11px]">
                                                      {grade.submittedAt ? new Date(grade.submittedAt).toLocaleDateString('es-ES') + ' ' + new Date(grade.submittedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                                                  </td>
                                                   <td className="p-3.5 text-center">
                                                       <div className="flex items-center justify-center gap-2">
                                                           {isCancelled && (
                                                               <button 
                                                                   type="button"
                                                                   onClick={() => handleEnableRetry(grade.id, grade.studentName)} 
                                                                   className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                                                                   title="Autorizar que el estudiante vuelva a presentar la prueba"
                                                               >
                                                                   <Unlock size={12} />
                                                                   <span>Habilitar reintento</span>
                                                               </button>
                                                           )}
                                                           {!editingGrade.id && (
                                                               <button onClick={() => setEditingGrade({id: grade.id, score: grade.score})} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Modificar nota">
                                                                   <Edit3 size={15}/>
                                                               </button>
                                                           )}
                                                       </div>
                                                   </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  );
              }

              // Vista de Creación de Evaluaciones (Docente)
              if (isCreatingEval) {
                  return (
                      <div className="space-y-4 max-w-3xl mx-auto pb-20 md:pb-8 animate-in fade-in">
                          <div className="flex items-center gap-3">
                              <button onClick={() => setIsCreatingEval(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-600 dark:text-gray-300">
                                  <ArrowLeftIcon size={18}/>
                              </button>
                              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                                  Crear nueva evaluación
                              </h2>
                          </div>
                          
                          <form onSubmit={handleSaveEval} className="space-y-4">
                              <div className={`${glassCard} !p-5 space-y-3.5 rounded-3xl border border-gray-200 dark:border-gray-800`}>
                                  <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Configuración general</h3>
                                  
                                  {/* Asignación por Grupo / Materia */}
                                  <div>
                                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Público objetivo / Materia asignada</label>
                                      <select
                                          value={evalFormData.targetGroupId || 'all'}
                                          onChange={(e) => {
                                              const gId = e.target.value;
                                              const gObj = academicGroups.find(g => g.id === gId);
                                              setEvalFormData({
                                                  ...evalFormData,
                                                  targetGroupId: gId,
                                                  targetGroupName: gObj ? gObj.name : 'Todos los estudiantes (Global)'
                                              });
                                          }}
                                          className={`${glassInput} !py-2 text-xs font-semibold`}
                                      >
                                          <option value="all">🌐 Todos los estudiantes (Global)</option>
                                          {academicGroups.map(g => (
                                              <option key={g.id} value={g.id}>📚 {g.name} ({g.members?.length || 0} estudiantes)</option>
                                          ))}
                                      </select>
                                  </div>

                                  <div>
                                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Título de la prueba</label>
                                      <input value={evalFormData.title} onChange={e => setEvalFormData({...evalFormData, title: e.target.value})} placeholder="Ej: Midterm Exam - Unit 1 & 2" className={`${glassInput} !py-2 text-xs`} required />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Instrucciones</label>
                                      <textarea value={evalFormData.description} onChange={e => setEvalFormData({...evalFormData, description: e.target.value})} placeholder="Instrucciones para los estudiantes..." className={`${glassInput} !py-2 text-xs h-20 resize-none`} required />
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div>
                                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Fecha límite</label>
                                          <input type="date" value={evalFormData.dueDate} onChange={e => setEvalFormData({...evalFormData, dueDate: e.target.value})} className={`${glassInput} !py-2 text-xs`} required />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Hora límite</label>
                                          <input type="time" value={evalFormData.dueTime} onChange={e => setEvalFormData({...evalFormData, dueTime: e.target.value})} className={`${glassInput} !py-2 text-xs`} required />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Tiempo (minutos)</label>
                                          <input type="number" min="1" max="180" value={evalFormData.timeLimit} onChange={e => setEvalFormData({...evalFormData, timeLimit: parseInt(e.target.value)})} className={`${glassInput} !py-2 text-xs`} required />
                                      </div>
                                  </div>
                                   {/* Toggle Modo Anti-Trampas Minimalista */}
                                    <div className="pt-2 border-t border-gray-200/70 dark:border-gray-800">
                                        <label className="flex items-center justify-between p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <ShieldAlert size={18} className="text-red-500 shrink-0" />
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                    Modo anti-trampas
                                                </span>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={evalFormData.strictAntiCheat || false} 
                                                onChange={(e) => setEvalFormData({ ...evalFormData, strictAntiCheat: e.target.checked })} 
                                                className="w-4 h-4 accent-red-600 rounded cursor-pointer shrink-0" 
                                            />
                                        </label>
                                    </div>
                              </div>

                              <div className="space-y-3">
                                  <div className="flex justify-between items-center px-1">
                                      <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                          Preguntas ({evalFormData.questions.length}/20)
                                      </h3>
                                  </div>

                                  {evalFormData.questions.map((q, qIndex) => (
                                      <div key={qIndex} className={`${glassCard} !p-4 relative rounded-3xl border border-gray-200 dark:border-gray-800 space-y-2.5 animate-in fade-in`}>
                                          <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                      {qIndex + 1}
                                                  </span>
                                                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl text-[11px] font-bold">
                                                      <button 
                                                          type="button" 
                                                          onClick={() => {
                                                              const newQ = [...evalFormData.questions]; newQ[qIndex].type = 'multiple'; setEvalFormData({...evalFormData, questions: newQ});
                                                          }}
                                                          className={`px-2.5 py-1 rounded-lg transition-all ${q.type === 'multiple' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs' : 'text-gray-500'}`}
                                                      >
                                                          Selección múltiple
                                                      </button>
                                                      <button 
                                                          type="button" 
                                                          onClick={() => {
                                                              const newQ = [...evalFormData.questions]; newQ[qIndex].type = 'text'; setEvalFormData({...evalFormData, questions: newQ});
                                                          }}
                                                          className={`px-2.5 py-1 rounded-lg transition-all ${q.type === 'text' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs' : 'text-gray-500'}`}
                                                      >
                                                          Respuesta escrita
                                                      </button>
                                                  </div>
                                              </div>
                                              <button type="button" onClick={() => {
                                                  const newQ = [...evalFormData.questions]; newQ.splice(qIndex, 1);
                                                  setEvalFormData({...evalFormData, questions: newQ});
                                              }} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Eliminar pregunta">
                                                  <Trash2 size={16}/>
                                              </button>
                                          </div>
                                          
                                          <input 
                                              value={q.text} 
                                              onChange={(e) => {
                                                  const newQ = [...evalFormData.questions]; newQ[qIndex].text = e.target.value; setEvalFormData({...evalFormData, questions: newQ});
                                              }} 
                                              placeholder="Escribe el enunciado de la pregunta..." 
                                              className={`${glassInput} !py-2 text-xs font-semibold`} 
                                              required 
                                          />

                                          {q.type === 'multiple' ? (
                                              <div className="space-y-1.5 pl-4 sm:pl-7 border-l-2 border-blue-500/30">
                                                  <p className="text-[11px] font-bold text-gray-500">Marca con el checkbox la(s) opción(es) correcta(s):</p>
                                                  {q.options.map((opt, oIndex) => (
                                                      <div key={oIndex} className="flex gap-2 items-center">
                                                          <input 
                                                              type="checkbox" 
                                                              checked={opt.isCorrect} 
                                                              onChange={(e) => {
                                                                  const newQ = [...evalFormData.questions]; newQ[qIndex].options[oIndex].isCorrect = e.target.checked; setEvalFormData({...evalFormData, questions: newQ});
                                                              }} 
                                                              className="w-4 h-4 accent-green-600 rounded cursor-pointer" 
                                                              title="Marcar como correcta" 
                                                          />
                                                          <input 
                                                              value={opt.text} 
                                                              onChange={(e) => {
                                                                  const newQ = [...evalFormData.questions]; newQ[qIndex].options[oIndex].text = e.target.value; setEvalFormData({...evalFormData, questions: newQ});
                                                              }} 
                                                              placeholder={`Opción ${oIndex + 1}`} 
                                                              className={`${glassInput} !py-1.5 flex-1 text-xs ${opt.isCorrect ? 'border-green-500/50 bg-green-500/10' : ''}`} 
                                                              required 
                                                          />
                                                          <button type="button" onClick={() => {
                                                              if(q.options.length <= 2) return showMessage("Mínimo 2 opciones.");
                                                              const newQ = [...evalFormData.questions]; newQ[qIndex].options.splice(oIndex, 1); setEvalFormData({...evalFormData, questions: newQ});
                                                          }} className="text-gray-400 hover:text-red-500 p-1" title="Eliminar opción"><X size={14}/></button>
                                                      </div>
                                                  ))}
                                                  {q.options.length < 4 && (
                                                      <button type="button" onClick={() => {
                                                          const newQ = [...evalFormData.questions]; newQ[qIndex].options.push({text: '', isCorrect: false}); setEvalFormData({...evalFormData, questions: newQ});
                                                      }} className="text-[11px] font-bold text-blue-600 hover:underline pt-1 flex items-center gap-1">
                                                          <Plus size={12}/> Agregar opción
                                                      </button>
                                                  )}
                                              </div>
                                          ) : (
                                              <div className="pl-4 sm:pl-7 border-l-2 border-blue-500/30">
                                                  <p className="text-[11px] font-bold text-gray-500 mb-1">Respuesta exacta esperada:</p>
                                                  <input 
                                                      value={q.correctAnswer} 
                                                      onChange={(e) => {
                                                          const newQ = [...evalFormData.questions]; newQ[qIndex].correctAnswer = e.target.value; setEvalFormData({...evalFormData, questions: newQ});
                                                      }} 
                                                      placeholder="Ej: went" 
                                                      className={`${glassInput} !py-1.5 text-xs border-green-500/40 bg-green-500/10`} 
                                                      required 
                                                  />
                                              </div>
                                          )}
                                      </div>
                                  ))}

                                  {evalFormData.questions.length < 20 && (
                                      <button 
                                          type="button" 
                                          onClick={() => {
                                              setEvalFormData({...evalFormData, questions: [...evalFormData.questions, { type: 'multiple', text: '', options: [{text: '', isCorrect: false}, {text: '', isCorrect: false}], correctAnswer: '' }]});
                                          }} 
                                          className={`w-full py-3 border-2 border-dashed rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                                              isDarkMode ? 'border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400' : 'border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600'
                                          }`}
                                      >
                                          <Plus size={16} /> Añadir pregunta
                                      </button>
                                  )}
                              </div>

                              <div className="flex justify-end pt-3">
                                  <button type="submit" className="py-2.5 px-6 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-transform active:scale-95">
                                      <CheckCircle2 size={16}/> Guardar evaluación
                                  </button>
                              </div>
                          </form>
                      </div>
                  );
              }

              // Filtro de evaluaciones visibles para estudiantes y archivadas para la docente
              const myEnrolledSubjectIds = academicGroups.filter(g => (g.members || []).includes(myChatId) || (g.members || []).includes(user?.uid)).map(g => g.id);
              const visibleEvaluations = role === 'teacher' 
                  ? evaluations.filter(ev => evalTabFilter === 'archived' ? !!ev.isArchived : !ev.isArchived)
                  : evaluations.filter(ev => !ev.isArchived && (!ev.targetGroupId || ev.targetGroupId === 'all' || myEnrolledSubjectIds.includes(ev.targetGroupId)));

              const activeCount = evaluations.filter(e => !e.isArchived).length;
              const archivedCount = evaluations.filter(e => !!e.isArchived).length;

              // Vista de Lista (Por defecto)
              return (
                <div className="space-y-4 max-w-4xl mx-auto pb-20 md:pb-8 animate-in fade-in">
                  <div className="flex items-center justify-between gap-3">
                      <div>
                          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
                              <CheckCheck className="text-[#AD3333]" size={26} /> Evaluaciones
                          </h2>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                              Pruebas académicas, cuestionarios y calificaciones
                          </p>
                      </div>
                      {role === 'teacher' && (
                          <button 
                              onClick={() => setIsCreatingEval(true)} 
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                          >
                              <Plus size={15}/> Crear evaluación
                          </button>
                      )}
                  </div>

                  {/* Selector de Pestañas (Activas vs Archivadas) para la Docente */}
                  {role === 'teacher' && (
                      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                          <button
                              type="button"
                              onClick={() => setEvalTabFilter('active')}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  evalTabFilter === 'active'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                          >
                              <CheckCheck size={14} /> Activas ({activeCount})
                          </button>
                          <button
                              type="button"
                              onClick={() => setEvalTabFilter('archived')}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  evalTabFilter === 'archived'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                          >
                              <Archive size={14} /> Archivadas ({archivedCount})
                          </button>
                      </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {visibleEvaluations.length === 0 ? (
                          <div className="col-span-2">
                              <EmptyState icon={FileText} title="No hay evaluaciones programadas" message="Las pruebas y exámenes aparecerán aquí cuando se creen." isDarkMode={isDarkMode} />
                          </div>
                      ) : null}
                      
                      {visibleEvaluations.map(ev => {
                          const deadline = new Date(`${ev.dueDate}T${ev.dueTime || '23:59'}`);
                          const isExpired = new Date() > deadline;
                          const studentGrade = role === 'student' ? grades.find(g => g.evaluationId === ev.id && (g.studentId === user?.uid || g.studentId === myChatId)) : null;
                          const isDone = !!studentGrade;

                          return (
                              <div key={ev.id} className={`${glassCard} !p-4 flex flex-col justify-between rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xs hover:shadow-md transition-all relative overflow-hidden group`}>
                                  {/* Indicador de degradado suave superior */}
                                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                                      isDone ? 'bg-green-500' : isExpired ? 'bg-red-500' : 'bg-blue-500'
                                  }`} />

                                  <div>
                                      <div className="flex items-start justify-between gap-2 mb-1.5">
                                          <div className="min-w-0 flex-1">
                                               <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{ev.title}</h3>
                                               <div className="flex flex-wrap gap-1 mt-0.5">
                                                   <span className="inline-block text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60">
                                                       {ev.targetGroupName || 'Global'}
                                                   </span>
                                                   {ev.strictAntiCheat && (
                                                       <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-800/60">
                                                           <ShieldAlert size={10} /> Anti-trampas
                                                       </span>
                                                   )}
                                                   {ev.isArchived && (
                                                       <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                                                           <Archive size={10} /> Archivada
                                                       </span>
                                                   )}
                                               </div>
                                          </div>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                              isDone 
                                                  ? 'bg-green-500/15 text-green-600 dark:text-green-400' 
                                                  : isExpired 
                                                      ? 'bg-red-500/15 text-red-600 dark:text-red-400' 
                                                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                          }`}>
                                              {isDone ? 'Completado' : isExpired ? 'Cerrado' : 'Activo'}
                                          </span>
                                      </div>

                                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3 leading-relaxed">{ev.description}</p>
                                      
                                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-gray-500 mb-3 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                                          <span className="flex items-center gap-1 truncate"><Clock size={12}/> {ev.timeLimit} min</span>
                                          <span className="flex items-center gap-1 truncate"><CheckCheck size={12}/> {ev.questions?.length || 0} preguntas</span>
                                          <span className="col-span-2 flex items-center gap-1 truncate text-[#AD3333] dark:text-red-400">
                                              <CalendarEmoji size={12}/> {ev.dueDate} ({ev.dueTime})
                                          </span>
                                      </div>
                                  </div>

                                   <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                                       {role === 'teacher' ? (
                                           <>
                                               <div className="flex items-center gap-1">
                                                   <button 
                                                       type="button"
                                                       onClick={() => toggleArchiveEvaluation(ev.id, ev.isArchived)}
                                                       className={`p-1.5 rounded-lg transition-colors ${
                                                           ev.isArchived 
                                                               ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' 
                                                               : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50/50'
                                                       }`}
                                                       title={ev.isArchived ? "Restaurar evaluación a activas" : "Archivar evaluación"}
                                                   >
                                                       <Archive size={16}/>
                                                   </button>
                                                   <button 
                                                       type="button"
                                                       onClick={() => confirmAction("¿Borrar evaluación? También se borrarán las notas de los estudiantes.", async () => {
                                                           await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'evaluations', ev.id));
                                                           showMessage("Evaluación eliminada.");
                                                       })} 
                                                       className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                                                       title="Eliminar evaluación"
                                                   >
                                                       <Trash2 size={16}/>
                                                   </button>
                                               </div>
                                               <button 
                                                   type="button"
                                                   onClick={() => setViewingResultsFor(ev)} 
                                                   className="py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1"
                                               >
                                                   <CheckCheck size={13} />
                                                   <span>Ver resultados</span>
                                               </button>
                                           </>
                                       ) : (
                                           isDone ? (
                                               studentGrade?.status === 'cancelled_tab_change' ? (
                                                   <div className="w-full flex items-center justify-between">
                                                       <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                                           <ShieldAlert size={14} /> Anulada (0.0)
                                                       </span>
                                                       <span className="text-[10px] text-gray-500 font-medium italic">
                                                           Cancelada por cambio de pestaña
                                                       </span>
                                                   </div>
                                               ) : (
                                                   <div className="w-full flex items-center justify-between">
                                                       <span className="text-xs font-bold text-gray-500">Tu calificación:</span>
                                                       <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${studentGrade.score >= 3.0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                                           {studentGrade.score.toFixed(1)} / 5.0
                                                       </span>
                                                   </div>
                                               )
                                           ) : isExpired ? (
                                               <button disabled className="w-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold py-1.5 rounded-xl text-xs cursor-not-allowed">
                                                   Evaluación cerrada
                                               </button>
                                           ) : (
                                               <button 
                                                   type="button"
                                                   onClick={() => {
                                                        const confirmMsg = ev.strictAntiCheat
                                                            ? "Para esta prueba, necesitas permanecer en esta pestaña o si no la prueba se anulará."
                                                            : `Tienes ${ev.timeLimit} minutos para completar la prueba sin pausas.`;
                                                        confirmAction(confirmMsg, () => {
                                                            setActiveTakingEval(ev);
                                                            setTimeRemaining(ev.timeLimit * 60);
                                                            setStudentAnswers({});
                                                        }, "Empezar", false, "¿Empezar prueba?");
                                                    }} 
                                                   className={`w-full font-bold py-2 rounded-xl text-xs shadow-xs transition-transform active:scale-95 text-white ${
                                                       ev.strictAntiCheat ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                                                   }`}
                                               >
                                                   Empezar prueba
                                               </button>
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

          const renderInbox = () => {
              const unreadSuggestionsCount = suggestions.filter(s => !s.read).length;
              const filteredSuggestions = suggestions.filter(s => {
                  if (inboxFilter === 'unread' && s.read) return false;
                  if (inboxFilter === 'read' && !s.read) return false;
                  if (inboxSearch.trim()) {
                      const term = inboxSearch.toLowerCase();
                      const matchName = (s.studentName || '').toLowerCase().includes(term);
                      const matchText = (s.text || '').toLowerCase().includes(term);
                      if (!matchName && !matchText) return false;
                  }
                  return true;
              });

              const filteredAlerts = alerts.filter(a => {
                  if (inboxSearch.trim()) {
                      const term = inboxSearch.toLowerCase();
                      const matchName = (a.studentName || '').toLowerCase().includes(term);
                      const matchText = (a.originalText || '').toLowerCase().includes(term);
                      if (!matchName && !matchText) return false;
                  }
                  return true;
              });

              const toggleSuggestionRead = async (s) => {
                  try {
                      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suggestions', s.id), {
                          read: !s.read
                      });
                  } catch (err) {
                      console.error(err);
                  }
              };

              const markAllSuggestionsAsRead = async () => {
                  try {
                      const unreadList = suggestions.filter(s => !s.read);
                      await Promise.all(unreadList.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suggestions', s.id), { read: true })));
                      showMessage("✅ Todas las sugerencias han sido marcadas como revisadas.");
                  } catch (err) {
                      showMessage("❌ Error al marcar sugerencias.");
                  }
              };

              return (
                  <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8 animate-in fade-in duration-300">
                      {/* Header con estadísticas rápidas */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
                                  <Mail className="text-[#AD3333]" size={28} /> Buzón y moderación
                              </h2>
                              <p className="text-xs text-gray-500 font-medium mt-1">
                                  Revisa las sugerencias de tus estudiantes y las alertas de lenguaje en tiempo real
                              </p>
                          </div>

                          {unreadSuggestionsCount > 0 && inboxTab === 'suggestions' && (
                              <button
                                  type="button"
                                  onClick={markAllSuggestionsAsRead}
                                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                              >
                                  <CheckCheck size={14} /> Marcar todas como revisadas
                              </button>
                          )}
                      </div>

                      {/* Métricas / Estadísticas del Buzón */}
                      <div className="grid grid-cols-3 gap-3">
                          <div className={`${glassCard} !p-3.5 sm:!p-4 text-center rounded-2xl border`}>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Sugerencias</p>
                              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-0.5">{suggestions.length}</p>
                          </div>
                          <div className={`${glassCard} !p-3.5 sm:!p-4 text-center rounded-2xl border`}>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Por revisar</p>
                              <p className={`text-2xl font-black mt-0.5 ${unreadSuggestionsCount > 0 ? 'text-amber-500' : 'text-green-600 dark:text-green-400'}`}>
                                  {unreadSuggestionsCount}
                              </p>
                          </div>
                          <div className={`${glassCard} !p-3.5 sm:!p-4 text-center rounded-2xl border`}>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Negatividad</p>
                              <p className={`text-2xl font-black mt-0.5 ${alerts.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                  {alerts.length}
                              </p>
                          </div>
                      </div>

                      {/* Selector de Pestañas (Sugerencias vs Negatividad) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-2">
                          <div className="flex items-center gap-2">
                              <button
                                  type="button"
                                  onClick={() => setInboxTab('suggestions')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
                                      inboxTab === 'suggestions'
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : isDarkMode ? 'bg-gray-800/80 text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                  <Mail size={15} />
                                  <span>Sugerencias</span>
                                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${inboxTab === 'suggestions' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                      {suggestions.length}
                                  </span>
                                  {unreadSuggestionsCount > 0 && (
                                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                  )}
                              </button>

                              <button
                                  type="button"
                                  onClick={() => setInboxTab('alerts')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                      inboxTab === 'alerts'
                                          ? 'bg-red-600 text-white shadow-xs'
                                          : isDarkMode ? 'bg-gray-800/80 text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                  <Shield size={15} />
                                  <span>Negatividad</span>
                                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${inboxTab === 'alerts' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                      {alerts.length}
                                  </span>
                              </button>
                          </div>

                          {/* Buscador de Sugerencias / Negatividad */}
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs w-full sm:w-64 transition-all ${
                              isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}>
                              <SearchIcon size={14} className="text-gray-400 shrink-0" />
                              <input
                                  value={inboxSearch}
                                  onChange={(e) => setInboxSearch(e.target.value)}
                                  placeholder={inboxTab === 'suggestions' ? 'Buscar sugerencia...' : 'Buscar reporte de negatividad...'}
                                  className="w-full bg-transparent border-none outline-none text-xs"
                              />
                              {inboxSearch && (
                                  <button onClick={() => setInboxSearch('')} className="text-gray-400 hover:text-gray-600">
                                      <X size={12} />
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* Filtros de Estado para Sugerencias */}
                      {inboxTab === 'suggestions' && (
                          <div className="flex items-center gap-2 text-xs">
                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">Filtrar:</span>
                              {[
                                  { key: 'all', label: 'Todas' },
                                  { key: 'unread', label: `Pendientes (${unreadSuggestionsCount})` },
                                  { key: 'read', label: 'Revisadas' }
                              ].map(f => (
                                  <button
                                      key={f.key}
                                      type="button"
                                      onClick={() => setInboxFilter(f.key)}
                                      className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                                          inboxFilter === f.key
                                              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs'
                                              : isDarkMode ? 'bg-gray-800/80 text-gray-400 hover:bg-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                  >
                                      {f.label}
                                  </button>
                              ))}
                          </div>
                      )}

                      {/* Contenido de Sugerencias */}
                      {inboxTab === 'suggestions' && (
                          <div className="space-y-3">
                              {filteredSuggestions.length === 0 ? (
                                  <div className="py-12 px-4 text-center space-y-2 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-2">
                                          <Mail size={24} />
                                      </div>
                                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No hay sugerencias en esta vista</p>
                                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                          {inboxSearch ? `No se encontraron resultados para "${inboxSearch}"` : 'Las opiniones y comentarios de tus estudiantes aparecerán aquí.'}
                                      </p>
                                  </div>
                              ) : (
                                   filteredSuggestions.map(s => {
                                       const isRead = !!s.read;
                                       
                                       // Extraer categoría de forma limpia sin paréntesis ni corchetes
                                       let catName = s.category;
                                       if (!catName && s.text) {
                                           const match = s.text.match(/^\[(.*?)\]|^\((.*?)\)/);
                                           if (match) catName = (match[1] || match[2]).trim();
                                       }

                                       const getCategoryBadge = (name) => {
                                           if (!name) return null;
                                           const lower = name.toLowerCase();
                                           if (lower.includes('metodolog')) {
                                               return { label: 'Metodología', icon: '💡', className: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' };
                                           }
                                           if (lower.includes('material')) {
                                               return { label: 'Material de apoyo', icon: '📚', className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
                                           }
                                           if (lower.includes('din') || lower.includes('clase')) {
                                               return { label: 'Dinámica en clase', icon: '🎯', className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
                                           }
                                           if (lower.includes('pregunt') || lower.includes('pedag') || lower.includes('consult')) {
                                               return { label: 'Pregunta pedagógica', icon: '❓', className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
                                           }
                                           return { label: name, icon: '💡', className: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
                                       };

                                       const catBadge = getCategoryBadge(catName);
                                       const cleanText = (s.text || '').replace(/^\[.*?\]\s*|^\(.*?\)\s*/, '');

                                       return (
                                           <div
                                               key={s.id}
                                               className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 relative group overflow-hidden ${
                                                   !isRead
                                                       ? (isDarkMode ? 'bg-blue-950/20 border-blue-700/60 shadow-xs' : 'bg-blue-50/50 border-blue-200 shadow-xs')
                                                       : (isDarkMode ? 'bg-gray-800/60 border-gray-700/80 hover:bg-gray-800' : 'bg-white border-gray-200/80 hover:bg-gray-50 shadow-2xs')
                                               }`}
                                           >
                                               {/* Indicador de degradado para mensajes no leídos */}
                                               {!isRead && (
                                                   <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
                                               )}

                                               <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                   <div className="flex items-center gap-3 min-w-0">
                                                        {(() => {
                                                            const studentPhoto = s.studentPhoto || (s.studentId ? userMappings?.[s.studentId]?.profilePicUrl : null) || Object.values(userMappings || {}).find(u => u.fullName?.toLowerCase() === s.studentName?.toLowerCase())?.profilePicUrl;
                                                            return (
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs overflow-hidden border border-gray-200 dark:border-gray-700 ${
                                                                    !isRead
                                                                        ? 'bg-blue-600 text-white'
                                                                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {studentPhoto ? (
                                                                        <img src={studentPhoto} alt={s.studentName || 'Estudiante'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                                                    ) : (
                                                                        <span>{(s.studentName || 'E').charAt(0).toUpperCase()}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                       <div className="min-w-0">
                                                           <div className="flex items-center gap-2 flex-wrap">
                                                               <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                   {s.studentName || 'Estudiante'}
                                                               </h4>
                                                               {catBadge && (
                                                                   <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border shadow-2xs inline-flex items-center gap-1 ${catBadge.className}`}>
                                                                       <span>{catBadge.icon}</span>
                                                                       <span>{catBadge.label}</span>
                                                                   </span>
                                                               )}
                                                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                   !isRead
                                                                       ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                                                       : 'bg-green-500/15 text-green-600 dark:text-green-400'
                                                               }`}>
                                                                   {!isRead ? 'Nueva / Por revisar' : 'Revisada'}
                                                               </span>
                                                           </div>
                                                           <p className="text-[11px] text-gray-500 mt-0.5">
                                                               {s.createdAt ? formatDateTime12H(s.createdAt) : '-'}
                                                           </p>
                                                       </div>
                                                   </div>

                                                   <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                                       <button
                                                           type="button"
                                                           onClick={() => toggleSuggestionRead(s)}
                                                           className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                                                               !isRead
                                                                   ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                                   : isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                           }`}
                                                           title={!isRead ? 'Marcar como revisada' : 'Marcar como pendiente'}
                                                       >
                                                           <CheckCircle2 size={15} />
                                                           <span className="text-[11px]">{!isRead ? 'Marcar revisada' : 'Revisada'}</span>
                                                       </button>

                                                       <button
                                                           type="button"
                                                           onClick={() => confirmAction('¿Eliminar esta sugerencia permanentemente?', () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suggestions', s.id)))}
                                                           className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                                           title="Eliminar sugerencia"
                                                       >
                                                           <Trash2 size={15} />
                                                       </button>
                                                   </div>
                                               </div>

                                               {/* Cuerpo del mensaje limpio */}
                                               <div className={`mt-3.5 p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                                   isDarkMode ? 'bg-gray-900/60 text-gray-200 border border-gray-800' : 'bg-white/90 text-gray-800 border border-gray-100'
                                               }`}
                                               >
                                                   {cleanText}
                                               </div>
                                           </div>
                                       );
                                   })
                              )}
                          </div>
                      )}

                      {/* Contenido de Negatividad */}
                      {inboxTab === 'alerts' && (
                          <div className="space-y-3">
                              {filteredAlerts.length === 0 ? (
                                  <div className="py-12 px-4 text-center space-y-2 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                      <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/40 text-green-500 flex items-center justify-center mx-auto mb-2">
                                          <CheckCircle2 size={24} />
                                      </div>
                                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Sin reportes de negatividad</p>
                                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                          No se han registrado comentarios con tono negativo o censurado en la plataforma.
                                      </p>
                                  </div>
                              ) : (
                                  filteredAlerts.map(a => (
                                      <div
                                          key={a.id}
                                          className={`p-4 sm:p-5 rounded-3xl border transition-all relative group overflow-hidden ${
                                              isDarkMode ? 'bg-red-950/20 border-red-800/60' : 'bg-red-50/50 border-red-200'
                                          }`}
                                      >
                                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                              <div className="flex items-center gap-3 min-w-0">
                                                  {(() => {
                                                       const alertStudentPhoto = a.studentPhoto || (a.studentId ? userMappings?.[a.studentId]?.profilePicUrl : null) || Object.values(userMappings || {}).find(u => u.fullName?.toLowerCase() === a.studentName?.toLowerCase())?.profilePicUrl;
                                                       return (
                                                           <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs overflow-hidden border border-red-400/40">
                                                               {alertStudentPhoto ? (
                                                                   <img src={alertStudentPhoto} alt={a.studentName || 'Estudiante'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                                               ) : (
                                                                   <AlertTriangle size={20} />
                                                               )}
                                                           </div>
                                                       );
                                                   })()}
                                                  <div className="min-w-0">
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                              {a.studentName || 'Estudiante'}
                                                          </h4>
                                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                                                              Negatividad detectada
                                                          </span>
                                                      </div>
                                                      <p className="text-[11px] text-gray-500 mt-0.5">
                                                          {a.createdAt ? formatDateTime12H(a.createdAt) : '-'}
                                                      </p>
                                                  </div>
                                              </div>

                                              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                                  <button
                                                      type="button"
                                                      onClick={() => setRevealedItems(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                          revealedItems[a.id]
                                                              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                                                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                                                      }`}
                                                      title={revealedItems[a.id] ? "Ocultar contenido" : "Revelar contenido original"}
                                                  >
                                                      {revealedItems[a.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                      <span>{revealedItems[a.id] ? 'Ocultar texto' : 'Ver original'}</span>
                                                  </button>

                                                  <button
                                                      type="button"
                                                      onClick={() => confirmAction('¿Borrar esta alerta?', () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'alerts', a.id)))}
                                                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
                                                      title="Eliminar alerta"
                                                  >
                                                      <Trash2 size={15} />
                                                  </button>
                                              </div>
                                          </div>

                                          {/* Contenido censurado / revelado */}
                                          <div className={`mt-3.5 p-3.5 rounded-2xl text-xs sm:text-sm font-mono leading-relaxed border ${
                                              revealedItems[a.id]
                                                  ? (isDarkMode ? 'bg-red-900/30 text-red-200 border-red-800/80' : 'bg-red-100/70 text-red-900 border-red-200')
                                                  : (isDarkMode ? 'bg-gray-900/70 text-gray-400 border-gray-800 italic' : 'bg-white/80 text-gray-500 border-gray-200 italic')
                                          }`}>
                                              {revealedItems[a.id] ? `"${a.originalText}"` : '🔒 [CONTENIDO CENSURADO POR EL FILTRO AUTOMÁTICO]'}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      )}
                  </div>
              );
          };

          const renderSettings = () => (
            <div className="space-y-4 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-1">
                  <Settings className="text-purple-600 dark:text-purple-400" size={24} />
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 drop-shadow-sm">Ajustes y preferencias</h2>
              </div>

              <div className="grid gap-3.5">
                {/* Tarjeta 1: Tema y Apariencia estilo X / Twitter */}
                <div className={`${glassCard} !p-4 sm:!p-5 space-y-3`}>
                    <div>
                        <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Apariencia y tema</h3>
                        <p className="text-[11px] text-gray-500">Personaliza la tonalidad visual y contraste de la plataforma</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {/* Opción Claro */}
                        <button
                            type="button"
                            onClick={() => setThemeMode('light')}
                            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                themeMode === 'light'
                                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                                    : (isDarkMode ? 'bg-gray-800/60 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50')
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center shadow-xs">
                                    <Sun size={18} />
                                </div>
                                {themeMode === 'light' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></div>}
                            </div>
                            <div>
                                <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Modo Claro</p>
                                <p className="text-[10px] text-gray-500">Blanco e iluminado</p>
                            </div>
                        </button>

                        {/* Opción Dim */}
                        <button
                            type="button"
                            onClick={() => setThemeMode('dim')}
                            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                themeMode === 'dim'
                                    ? 'bg-[#15202b] border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                                    : (isDarkMode ? 'bg-gray-800/60 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50')
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs border ${
                                    themeMode === 'dim' ? 'bg-[#1e2732] text-blue-400 border-blue-500/30' : (isDarkMode ? 'bg-gray-700 text-blue-300 border-gray-600' : 'bg-blue-50 text-blue-500 border-blue-200')
                                }`}>
                                    <Moon size={18} />
                                </div>
                                {themeMode === 'dim' && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-blue-800"></div>}
                            </div>
                            <div>
                                <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Modo Dim</p>
                                <p className="text-[10px] text-gray-500">Grisáceo azulado</p>
                            </div>
                        </button>

                        {/* Opción Lights Out */}
                        <button
                            type="button"
                            onClick={() => setThemeMode('lights_out')}
                            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                themeMode === 'lights_out'
                                    ? 'bg-black border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                                    : (isDarkMode ? 'bg-gray-800/60 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50')
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs border ${
                                    themeMode === 'lights_out' ? 'bg-purple-950/60 text-purple-300 border-purple-800' : (isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-purple-50 text-purple-500 border-purple-200')
                                }`}>
                                    <Moon size={18} />
                                </div>
                                {themeMode === 'lights_out' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-800"></div>}
                            </div>
                            <div>
                                <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Lights Out</p>
                                <p className="text-[10px] text-gray-500">Negro puro AMOLED</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Tarjeta 2: Notificaciones y Sonidos */}
                <div className={`${glassCard} !p-4 sm:!p-5 space-y-3`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notificaciones y Sonidos</h3>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${soundEnabled ? (isDarkMode ? 'bg-blue-950/70 text-blue-300 border border-blue-800/40' : 'bg-blue-50 text-blue-600 border border-blue-100') : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </div>
                            <div>
                                <h4 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sonidos del chat</h4>
                                <p className="text-[11px] text-gray-500">{soundEnabled ? 'Alertas sonoras activas' : 'Sonidos desactivados'}</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => {
                                const nextVal = !soundEnabled;
                                setSoundEnabled(nextVal);
                                soundEnabledRef.current = nextVal;
                                try { localStorage.setItem('englishTech_sound', String(nextVal)); } catch (e) {}
                            }} 
                            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 ${soundEnabled ? 'bg-blue-600 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}`}
                        >
                            <div className="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform" />
                        </button>
                    </div>

                    {soundEnabled && (
                        <div className="pt-2 border-t border-gray-200/50 dark:border-gray-800/60 space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <label className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Tono de mensaje:
                                </label>
                                <span className="text-[10px] text-gray-400">Haz clic en ▶ para escuchar</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {CHAT_SOUNDS.map((snd, idx) => {
                                    const isSelected = chatSoundIndex === idx;
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setChatSoundIndex(idx);
                                                chatSoundIndexRef.current = idx;
                                                try { localStorage.setItem('englishTech_chatSound', String(idx)); } catch (e) {}
                                                playNotificationSound(idx);
                                            }}
                                            className={`relative flex items-center justify-between p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                                isSelected 
                                                    ? (isDarkMode ? 'bg-blue-950/50 border-blue-500/80 text-blue-300 ring-1 ring-blue-500/50 shadow-xs' : 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/40 shadow-xs')
                                                    : (isDarkMode ? 'bg-gray-800/60 border-gray-700/70 text-gray-300 hover:bg-gray-800 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300')
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-sm shrink-0">{snd.emoji}</span>
                                                <span className="truncate text-[11px]">{snd.label}</span>
                                            </div>
                                            <button
                                                type="button"
                                                title={`Escuchar muestra de ${snd.label}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    playNotificationSound(idx);
                                                }}
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                    isSelected
                                                        ? (isDarkMode ? 'bg-blue-500/30 text-blue-200 hover:bg-blue-500/50' : 'bg-blue-200/70 text-blue-800 hover:bg-blue-200')
                                                        : (isDarkMode ? 'bg-gray-700/80 text-gray-300 hover:bg-gray-700 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900')
                                                }`}
                                            >
                                                <Play size={10} className="ml-0.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="pt-2.5 border-t border-gray-200/60 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                            <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Notificaciones del navegador</p>
                            <p className="text-[11px] text-gray-500">
                                {pushEnabled ? 'Alertas de escritorio activadas.' : 'Alertas push desactivadas.'}
                            </p>
                        </div>
                        <button 
                            type="button"
                            onClick={togglePushNotifications} 
                            className={`w-full sm:w-auto py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border shadow-xs ${
                                pushEnabled
                                    ? (isDarkMode ? 'bg-red-950/40 border-red-800/60 text-red-300 hover:bg-red-900/50' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100')
                                    : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')
                            }`}
                        >
                            {pushEnabled ? (
                                <>
                                    <BellOff size={14} className="text-red-500" /> Desactivar push
                                </>
                            ) : (
                                <>
                                    <Bell size={14} className="text-blue-500" /> Activar push
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Tarjeta 3: Estado de Disponibilidad */}
                <div className={`${glassCard} !p-4 sm:!p-5 space-y-2.5`}>
                    <div className="flex items-center gap-2">
                        <Shield size={16} className="text-green-500" />
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estado de conexión</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <button 
                            type="button"
                            onClick={() => updatePresenceStatus('online')} 
                            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all text-center ${
                                (!userPresence[role === 'teacher' ? 'teacher' : myChatId]?.status || userPresence[role === 'teacher' ? 'teacher' : myChatId]?.status === 'online') 
                                    ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400 ring-2 ring-green-500/20 shadow-xs font-bold text-xs' 
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                            <span className="truncate">En línea</span>
                        </button>

                        <button 
                            type="button"
                            onClick={() => updatePresenceStatus('away')} 
                            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all text-center ${
                                userPresence[role === 'teacher' ? 'teacher' : myChatId]?.status === 'away' 
                                    ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20 shadow-xs font-bold text-xs' 
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0"></span>
                            <span className="truncate">Ausente</span>
                        </button>

                        <button 
                            type="button"
                            onClick={() => updatePresenceStatus('busy')} 
                            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all text-center ${
                                userPresence[role === 'teacher' ? 'teacher' : myChatId]?.status === 'busy' 
                                    ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-500/20 shadow-xs font-bold text-xs' 
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                            <span className="truncate">Ocupado</span>
                        </button>
                    </div>
                </div>

                {/* Tarjeta 4: Configuración y Entrenamiento de IA (Solo Docente) */}
                {role === 'teacher' && (
                    <div className={`${glassCard} !p-4 sm:!p-5 space-y-2.5 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-indigo-500/5`}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 className={`text-xs font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>Asistente y entrenamiento</h3>
                                <p className="text-[11px] text-gray-500">Instrucciones y conocimientos para el asistente técnico.</p>
                            </div>
                        </div>
                        <div className="pt-1">
                            <button 
                                type="button"
                                onClick={() => setShowIAKnowledgeModal(true)} 
                                className="w-full sm:w-auto py-2 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Sparkles size={14} /> Entrenar bot
                            </button>
                        </div>
                    </div>
                )}

                {/* Tarjeta: Sugerencias / Buzón (Para Estudiante y Docente) */}
                <div className={`${glassCard} !p-4 sm:!p-5 space-y-3 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0 shadow-xs">
                                <Mail size={20} />
                            </div>
                            <div>
                                <h3 className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <span>{role === 'teacher' ? 'Buzón de sugerencias' : 'Sugerencias'}</span>
                                    {role === 'teacher' && suggestions.filter(s => !s.read).length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                                            {suggestions.filter(s => !s.read).length} pendientes
                                        </span>
                                    )}
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    {role === 'teacher' 
                                        ? 'Revisa y modera las ideas y mensajes enviados por tus estudiantes.' 
                                        : 'Comparte ideas, propuestas o dudas pedagógicas para enriquecer las clases.'}
                                </p>
                            </div>
                        </div>

                        {role === 'teacher' ? (
                            <button
                                type="button"
                                onClick={() => changeTab('inbox')}
                                className="py-2 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <Mail size={14} />
                                <span>Ver buzón</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setShowSugModal(true); setSugCategory(""); }}
                                className="py-2 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <Mail size={14} />
                                <span>Enviar sugerencia</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tarjeta 5: Información de la Cuenta */}
                <div className={`${glassCard} !p-4 sm:!p-5 space-y-3`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cuenta institucional</h3>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 overflow-hidden border border-white dark:border-gray-700 shadow-xs">
                                {userMappings[myChatId]?.profilePicUrl ? <img src={userMappings[myChatId].profilePicUrl} className="w-full h-full object-cover" /> : <UserIcon size={22} />}
                            </div>
                            <div className="overflow-hidden">
                                <p className={`font-bold text-xs leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{loggedInName}</p>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{userMappings[myChatId]?.customLabel || (role === 'teacher' ? 'Docente' : 'Estudiante')}</p>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">{loggedInUser} • Univ. de Pamplona</p>
                            </div>
                        </div>

                        <button 
                            type="button"
                            onClick={handleLogout} 
                            className="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 shadow-xs shrink-0"
                        >
                            <LogOutIcon size={14} /> Salir
                        </button>
                    </div>
                </div>
              </div>
            </div>
          );

          if (!hasEntered) {
              return (
                  <div className={`min-h-screen app-root-bg flex items-center justify-center transition-colors duration-300 relative overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
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
                      

                      
                      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 px-4 animate-in fade-in zoom-in duration-500 py-12">
                          
                          {savedAccounts.length > 0 && (
                              <div className={`${glassCard} w-full md:w-1/2 max-w-md flex flex-col gap-4`}>
                                  <h2 className="text-xl font-bold text-gray-800 text-center">Vuelve a acceder</h2>
                                  <p className="text-sm text-gray-600 text-center mb-2">Haz clic en tu cuenta o accede manualmente.</p>
                                  <div className="flex flex-wrap justify-center gap-4 max-h-64 overflow-y-auto p-2">
                                      {savedAccounts.map(acc => {
                                           const userPhoto = acc.profilePicUrl || acc.photoURL || userMappings?.[acc.username]?.profilePicUrl || (acc.role === 'teacher' ? userMappings?.['teacher']?.profilePicUrl : null);
                                           const initial = (acc.role === 'teacher' ? 'G' : (acc.name || 'U').charAt(0)).toUpperCase();
                                           return (
                                               <div key={acc.username} className="relative group">
                                                   <button 
                                                       onClick={() => handleQuickLogin(acc)} 
                                                       className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 shadow-md rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 transition-all hover:scale-105 w-28 h-32"
                                                   >
                                                       <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-lg shadow-sm border-2 border-white dark:border-gray-700 shrink-0 ${
                                                           acc.role === 'teacher' 
                                                               ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828]' 
                                                               : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                       }`}>
                                                           {userPhoto ? (
                                                               <img src={userPhoto} alt={acc.name || 'Usuario'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                                           ) : (
                                                               <span>{initial}</span>
                                                           )}
                                                       </div>
                                                       <span className="text-xs font-bold text-gray-800 dark:text-gray-200 text-center leading-tight line-clamp-2">
                                                           {acc.role === 'teacher' ? 'Gina' : acc.name}
                                                       </span>
                                                   </button>
                                                   <button 
                                                       onClick={(e) => { e.stopPropagation(); removeSavedAccount(acc.username); }} 
                                                       className="absolute -top-2 -right-2 text-red-500 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 drop-shadow-sm bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700"
                                                       title="Olvidar esta cuenta"
                                                   >
                                                       <X size={14}/>
                                                   </button>
                                               </div>
                                           );
                                       })}
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
                                      onClick={() => { setPrefillUsername(''); setLoginError(''); setLoginType('teacher'); }}
                                      className="w-full bg-[#AD3333]/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-[#AD3333]/25 hover:bg-[#8a2828] transition-all duration-300 border border-white/20"
                                  >
                                      Soy docente
                                  </button>
                                  
                                  <button 
                                      onClick={() => { setPrefillUsername(''); setLoginError(''); setLoginType('student'); }}
                                      className="w-full bg-blue-600/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-all duration-300 border border-white/20"
                                  >
                                      Soy estudiante
                                  </button>
                              </div>
                          </div>
                      </div>

                      {loginType !== null && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all">
                            <div className={`${glassCard} max-w-sm w-full flex flex-col gap-3.5 relative animate-in fade-in zoom-in duration-200 shadow-2xl`}>
                              <button type="button" onClick={() => {setLoginType(null); setLoginError(""); setIsStudentRegisterMode(false);}} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"><X size={22}/></button>
                              
                              <div className="text-center">
                                <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 drop-shadow-sm">
                                  {loginType === 'teacher' 
                                    ? 'Acceso docente' 
                                    : isStudentRegisterMode 
                                      ? 'Crear cuenta' 
                                      : 'Acceso estudiante'}
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                  {loginType === 'teacher' 
                                    ? 'Ingresa tus credenciales de profesora' 
                                    : isStudentRegisterMode 
                                      ? 'Regístrate para acceder a tus materias y tareas' 
                                      : 'Inicia sesión con Google o tus credenciales'}
                                </p>
                              </div>

                              {/* Selector Iniciar Sesión / Registrarse para Estudiantes */}
                              {loginType === 'student' && (
                                <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl text-xs font-bold gap-1">
                                  <button
                                    type="button"
                                    onClick={() => { setIsStudentRegisterMode(false); setLoginError(""); }}
                                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${!isStudentRegisterMode ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                  >
                                    Iniciar sesión
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setIsStudentRegisterMode(true); setLoginError(""); }}
                                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${isStudentRegisterMode ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                  >
                                    Crear cuenta
                                  </button>
                                </div>
                              )}

                              {/* Formulario de Registro de Estudiante */}
                              {loginType === 'student' && isStudentRegisterMode ? (
                                <form onSubmit={handleStudentRegister} className="flex flex-col gap-3">
                                  <button 
                                      type="button" 
                                      onClick={handleGoogleSignIn}
                                      className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-bold px-4 py-2.5 rounded-xl border border-gray-300 shadow-xs hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700 transition-all text-xs sm:text-sm active:scale-[0.98]"
                                  >
                                      <GoogleIcon size={18} />
                                      <span>Crear cuenta con Google</span>
                                  </button>
                                  <div className="flex items-center gap-2 my-0.5">
                                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">o con formulario</span>
                                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                                  </div>

                                  <div>
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Nombre completo</label>
                                    <input type="text" name="reg_fullname" placeholder="Ej: Mariana Gómez" className={`${glassInput} !py-2 text-xs`} required />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Nombre de usuario</label>
                                    <input type="text" name="reg_username" placeholder="Ej: marianagomez" className={`${glassInput} !py-2 text-xs`} required />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Correo electrónico</label>
                                    <input type="email" name="reg_email" placeholder="correo@unipamplona.edu.co" className={`${glassInput} !py-2 text-xs`} required />
                                  </div>
                                  <div className="relative">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Contraseña (mínimo 6 caracteres)</label>
                                    <input name="reg_password" type={showPassword ? "text" : "password"} placeholder="••••••••" className={`${glassInput} !py-2 text-xs`} minLength={6} required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-7 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                  </div>

                                  {loginError && <p className="text-red-600 dark:text-red-400 text-xs text-center font-bold bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl border border-red-200 dark:border-red-800/50 leading-relaxed">{loginError}</p>}

                                  <div className="flex gap-2.5 mt-1">
                                    <button type="button" onClick={() => {setLoginType(null); setLoginError(""); setIsStudentRegisterMode(false);}} className={`${outlineButton} flex-1 !py-2.5 text-xs`}>Cancelar</button>
                                    <button type="submit" disabled={isRegisteringStudent} className={`${redButton} flex-1 !py-2.5 text-xs !bg-blue-600 hover:!bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5`}>
                                      {isRegisteringStudent ? <Loader2 className="animate-spin" size={14}/> : null}
                                      {isRegisteringStudent ? 'Registrando...' : 'Registrarme'}
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                /* Formulario de Inicio de Sesión */
                                <form onSubmit={handleLogin} className="flex flex-col gap-3">
                                  {loginType === 'student' && (
                                    <>
                                      <button 
                                          type="button" 
                                          onClick={handleGoogleSignIn}
                                          className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-bold px-4 py-2.5 rounded-xl border border-gray-300 shadow-xs hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700 transition-all text-xs sm:text-sm active:scale-[0.98]"
                                      >
                                          <GoogleIcon size={18} />
                                          <span>Continuar con Google</span>
                                      </button>
                                      <div className="flex items-center gap-2 my-0.5">
                                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">o con usuario</span>
                                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                                      </div>
                                    </>
                                  )}

                                  <div>
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Usuario o correo</label>
                                    <input type="text" name="username" placeholder="Ej: @Usuario o correo" defaultValue={prefillUsername} className={`${glassInput} !py-2 text-xs`} required />
                                  </div>

                                  <div className="relative">
                                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Contraseña</label>
                                      <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className={`${glassInput} !py-2 text-xs`} required />
                                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-7 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                                          {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                      </button>
                                  </div>

                                  <div className="flex justify-end items-center -mt-1">
                                      <button
                                          type="button"
                                          onClick={(e) => {
                                              const form = e.target.closest('form');
                                              const userVal = form?.querySelector('[name=username]')?.value;
                                              handleForgotPassword(userVal);
                                          }}
                                          className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                      >
                                          ¿Olvidaste tu contraseña?
                                      </button>
                                  </div>

                                  {loginError && <p className="text-red-600 dark:text-red-400 text-xs text-center font-bold bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl border border-red-200 dark:border-red-800/50 leading-relaxed">{loginError}</p>}
                                  
                                  <div className="flex gap-2.5 mt-1">
                                      <button type="button" onClick={() => {setLoginType(null); setLoginError(""); setIsStudentRegisterMode(false);}} className={`${outlineButton} flex-1 !py-2.5 text-xs`}>Volver</button>
                                      <button type="submit" className={`${redButton} flex-1 !py-2.5 text-xs ${loginType === 'student' ? '!bg-blue-600 hover:!bg-blue-700' : ''}`}>Ingresar</button>
                                  </div>
                                </form>
                              )}
                            </div>
                          </div>
                      )}

                      {/* MODAL DE ONBOARDING Y PERSONALIZACIÓN DE GOOGLE */}
                      {googleOnboarding.isOpen && (
                          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 transition-all animate-in fade-in">
                              <form onSubmit={handleCompleteGoogleOnboarding} className={`${glassCard} max-w-md w-full flex flex-col gap-4 relative animate-in zoom-in-95 shadow-2xl rounded-3xl p-6`}>
                                  <div className="text-center">
                                      <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-500/20 shadow-xs">
                                          <UserCheck size={24}/>
                                      </div>
                                      <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">Personaliza tu perfil</h3>
                                      <p className="text-xs text-gray-500 font-medium mt-0.5">Confirma tus datos antes de entrar a la plataforma</p>
                                  </div>

                                  {/* Selector de Foto */}
                                  <div className="flex flex-col items-center gap-3 p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700">
                                      <div className="relative">
                                          <div className="w-20 h-20 rounded-full border-2 border-blue-500 overflow-hidden shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                                              {googleOnboarding.photoChoice === 'google' && googleOnboarding.photoURL ? (
                                                  <img src={googleOnboarding.photoURL} alt="Google Avatar" className="w-full h-full object-cover" />
                                              ) : googleOnboarding.photoChoice === 'custom' && googleOnboarding.customPhotoUrl ? (
                                                  <img src={googleOnboarding.customPhotoUrl} alt="Custom Avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                                              ) : (
                                                  googleOnboarding.fullName ? googleOnboarding.fullName.charAt(0).toUpperCase() : 'E'
                                              )}
                                          </div>
                                      </div>

                                      <input
                                          ref={onboardingFileInputRef}
                                          type="file"
                                          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                          className="hidden"
                                          onChange={handleOnboardingPhotoFile}
                                      />

                                      <div className="flex flex-wrap gap-1.5 justify-center text-[11px] font-bold">
                                          {googleOnboarding.photoURL && (
                                              <button
                                                  type="button"
                                                  onClick={() => setGoogleOnboarding(p => ({ ...p, photoChoice: 'google' }))}
                                                  className={`px-3 py-1 rounded-xl transition-all ${googleOnboarding.photoChoice === 'google' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border'}`}
                                              >
                                                  Foto de Google
                                              </button>
                                          )}
                                          <button
                                              type="button"
                                              onClick={() => setGoogleOnboarding(p => ({ ...p, photoChoice: 'initials' }))}
                                              className={`px-3 py-1 rounded-xl transition-all ${googleOnboarding.photoChoice === 'initials' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border'}`}
                                          >
                                              Sin foto (Iniciales)
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => onboardingFileInputRef.current?.click()}
                                              className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${googleOnboarding.photoChoice === 'custom' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border hover:bg-gray-50'}`}
                                          >
                                              <ImageIcon size={13}/>
                                              {googleOnboarding.customPhotoUrl ? 'Cambiar foto subida' : 'Subir foto del dispositivo'}
                                          </button>
                                      </div>
                                  </div>

                                  {/* Campos de Nombre y Usuario */}
                                  <div className="space-y-3">
                                      <div>
                                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Nombre completo</label>
                                          <input 
                                              type="text" 
                                              value={googleOnboarding.fullName} 
                                              onChange={e => setGoogleOnboarding(p => ({ ...p, fullName: e.target.value }))}
                                              placeholder="Tu nombre y apellidos" 
                                              className={`${glassInput} !py-2 text-xs font-semibold`} 
                                              required 
                                          />
                                      </div>

                                      <div>
                                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Nombre de usuario</label>
                                          <div className="relative flex items-center">
                                              <span className="absolute left-3 text-gray-400 font-bold text-xs">@</span>
                                              <input 
                                                  type="text" 
                                                  value={googleOnboarding.username} 
                                                  onChange={e => setGoogleOnboarding(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                                                  placeholder="usuario" 
                                                  className={`${glassInput} !py-2 !pl-7 text-xs font-semibold`} 
                                                  required 
                                              />
                                          </div>
                                      </div>

                                      <p className="text-[11px] text-gray-500 font-medium text-center">
                                          Vinculado a: <strong className="text-gray-700 dark:text-gray-300">{googleOnboarding.email}</strong>
                                      </p>
                                  </div>

                                  <div className="flex gap-2.5 pt-1">
                                      <button
                                          type="button"
                                          onClick={() => setGoogleOnboarding({ isOpen: false, uid: '', email: '', fullName: '', username: '', photoURL: '', photoChoice: 'google', customPhotoUrl: '', isSaving: false })}
                                          className={`${outlineButton} flex-1 !py-2.5 text-xs`}
                                      >
                                          Cancelar
                                      </button>
                                      <button
                                          type="submit"
                                          disabled={googleOnboarding.isSaving}
                                          className={`${redButton} flex-1 !py-2.5 text-xs !bg-blue-600 hover:!bg-blue-700 flex items-center justify-center gap-1.5`}
                                      >
                                          {googleOnboarding.isSaving ? <Loader2 className="animate-spin" size={14}/> : <CheckLine size={16}/>}
                                          {googleOnboarding.isSaving ? 'Guardando...' : 'Completar y entrar'}
                                      </button>
                                  </div>
                              </form>
                          </div>
                      )}

                      {/* MODAL DEDICADO DE RECUPERACIÓN DE CONTRASEÑA */}
                      {forgotPasswordState.isOpen && (
                          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all animate-in fade-in">
                              <div className={`${glassCard} max-w-sm w-full flex flex-col gap-4 relative animate-in zoom-in-95 shadow-2xl rounded-3xl p-6`}>
                                  <button 
                                      type="button" 
                                      onClick={() => setForgotPasswordState({ isOpen: false, input: '', isSending: false, sentToEmail: null, error: '' })} 
                                      className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                  >
                                      <X size={20}/>
                                  </button>

                                  <div className="text-center">
                                      <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-500/20 shadow-xs">
                                          <KeyRound size={22}/>
                                      </div>
                                      <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">Recuperar contraseña</h3>
                                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                                          {forgotPasswordState.sentToEmail ? 'Revisa tu bandeja de entrada' : 'Te enviaremos un enlace oficial para crear una nueva clave'}
                                      </p>
                                  </div>

                                  {forgotPasswordState.sentToEmail ? (
                                      <div className="space-y-4 text-center animate-in fade-in">
                                          <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-300 leading-relaxed font-medium">
                                              📧 Hemos enviado el enlace de restablecimiento a <strong>{forgotPasswordState.sentToEmail}</strong>. Sigue las instrucciones del correo y luego vuelve aquí para iniciar sesión.
                                          </div>
                                          <button 
                                              type="button" 
                                              onClick={() => setForgotPasswordState({ isOpen: false, input: '', isSending: false, sentToEmail: null, error: '' })}
                                              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
                                          >
                                              Entendido, volver al login
                                          </button>
                                      </div>
                                  ) : (
                                      <form onSubmit={submitForgotPassword} className="space-y-3">
                                          <div>
                                              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1">Usuario o correo institucional</label>
                                              <input 
                                                  type="text" 
                                                  value={forgotPasswordState.input} 
                                                  onChange={e => setForgotPasswordState(p => ({ ...p, input: e.target.value, error: '' }))} 
                                                  placeholder="Ej: @usuario o correo@unipamplona.edu.co" 
                                                  className={`${glassInput} !py-2 text-xs`} 
                                                  required 
                                                  autoFocus 
                                              />
                                          </div>

                                          {forgotPasswordState.error && (
                                              <p className="text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl border border-red-200 dark:border-red-800/50 text-center leading-relaxed">
                                                  {forgotPasswordState.error}
                                              </p>
                                          )}

                                          <div className="flex gap-2 pt-1">
                                              <button 
                                                  type="button" 
                                                  onClick={() => setForgotPasswordState({ isOpen: false, input: '', isSending: false, sentToEmail: null, error: '' })}
                                                  className={`${outlineButton} flex-1 !py-2.5 text-xs`}
                                              >
                                                  Cancelar
                                              </button>
                                              <button 
                                                  type="submit" 
                                                  disabled={forgotPasswordState.isSending}
                                                  className={`${redButton} flex-1 !py-2.5 text-xs !bg-blue-600 hover:!bg-blue-700 flex items-center justify-center gap-1.5`}
                                              >
                                                  {forgotPasswordState.isSending ? <Loader2 className="animate-spin" size={14}/> : <Send size={14}/>}
                                                  {forgotPasswordState.isSending ? 'Enviando...' : 'Enviar enlace'}
                                              </button>
                                          </div>
                                      </form>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              );
          }

          return (
            <div className={`h-screen app-root-bg font-sans relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
                            <style>{`
                .dark .text-gray-900 { color: #f9fafb !important; }
                .dark .text-gray-800 { color: #f3f4f6 !important; }
                .dark .text-gray-700 { color: #d1d5db !important; }
                .dark .text-gray-600 { color: #9ca3af !important; }
                .dark .text-gray-500 { color: #6b7280 !important; }

                .dark input, .dark textarea { color: #ffffff !important; }
                .dark input::placeholder, .dark textarea::placeholder { color: #9ca3af !important; }

                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
                .pt-safe { padding-top: env(safe-area-inset-top, 20px); }
              
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
              
              {/* Audio de notificación */}
              <audio ref={notificationSound} src={CHAT_SOUNDS[chatSoundIndex]?.url || CHAT_SOUNDS[0].url} preload="auto" onLoadedMetadata={(e) => { e.currentTarget.volume = 0.5; }} />

              {/* Dialogo de Confirmación Global — manejado por el portal en la parte inferior */}

              {/* Navbar Principal Estilo Moderno */}
              <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDarkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
                <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
                  {/* Left: Brand */}
                  <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => changeTab('tasks')}>
                    <div className="w-10 h-10 bg-gradient-to-br from-[#AD3333] to-[#8a2828] rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-[#AD3333]/30">
                      UP
                    </div>
                    <div>
                      <h1 className="font-extrabold text-lg leading-tight text-gray-900 dark:text-white">English TECH</h1>
                      <p className="text-[10px] font-bold text-[#AD3333] tracking-wide uppercase">Universidad de Pamplona</p>
                    </div>
                  </div>

                  {/* Right Actions for Mobile Only (Hidden on desktop to avoid duplicate controls) */}
                  <div className="flex items-center gap-2 sm:gap-3 lg:hidden">
                    {/* Si es Profesora: Acceso directo a Buzón */}
                    {role === 'teacher' && (
                        <button
                            type="button"
                            onClick={() => changeTab('inbox')}
                            className={`p-2 rounded-xl border relative transition-all shadow-xs ${activeTab === 'inbox' ? 'bg-[#AD3333] text-white border-[#AD3333]' : (isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200')}`}
                            title="Buzón de sugerencias"
                        >
                            <Mail size={17} />
                            {suggestions?.filter(s => !s.read).length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                                    {suggestions.filter(s => !s.read).length}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Si es Profesora: Asistente */}
                    {role === 'teacher' && (
                        <button
                            type="button"
                            onClick={() => setIsTeacherBotOpen(true)}
                            className={`p-2 rounded-xl border transition-all shadow-xs ${isDarkMode ? 'border-purple-800 bg-purple-950/40 text-purple-300 hover:bg-purple-900/40' : 'border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                            title="Asistente"
                        >
                            <CuteBotIcon size={17} />
                        </button>
                    )}

                    {/* Botón de Perfil con Menú Desplegable Móvil */}
                    <div className="relative" ref={mobileProfileMenuRef}>
                        <button
                            type="button"
                            onClick={() => setMobileProfileMenuOpen(prev => !prev)}
                            className={`flex items-center gap-1.5 p-1 pr-2 rounded-full border transition-all ${
                                mobileProfileMenuOpen || activeTab === 'profile'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20' 
                                    : (isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-750' : 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200')
                            }`}
                            title="Menú de perfil y cuenta"
                        >
                            <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white text-xs font-bold shrink-0 shadow-xs">
                                {userMappings[myChatId]?.profilePicUrl ? (
                                    <img src={userMappings[myChatId].profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    loggedInName?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <span className="hidden sm:inline text-xs font-bold truncate max-w-[90px]">
                                {loggedInName?.split(' ')[0]}
                            </span>
                            <ChevronDown size={13} className={`transition-transform duration-200 text-gray-400 ${mobileProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {mobileProfileMenuOpen && (
                            <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-2xl border p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-150 ${
                                isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
                            }`}>
                                {/* Header con nombre y rol */}
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                                    <p className="text-xs font-black truncate">{loggedInName}</p>
                                    <p className="text-[10px] font-bold text-[#AD3333] dark:text-red-400 uppercase tracking-wider">{role === 'teacher' ? 'Docente' : 'Estudiante'}</p>
                                </div>

                                {/* Opción 1: Mi perfil */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileProfileMenuOpen(false);
                                        changeTab('profile', null);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                                        activeTab === 'profile' && !viewingProfileId
                                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                                            : isDarkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    <UserIcon size={16} className="text-blue-500 shrink-0" />
                                    <span>Mi perfil</span>
                                </button>

                                {/* Opción 2: Ajustes */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileProfileMenuOpen(false);
                                        changeTab('settings');
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                                        activeTab === 'settings'
                                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                                            : isDarkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    <Settings size={16} className="text-purple-500 shrink-0" />
                                    <span>Ajustes</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                                {/* Opción 3: Cerrar sesión */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileProfileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                >
                                    <LogOutIcon size={16} className="shrink-0" />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                  </div>
                </div>
              </nav>

              <div className="max-w-[1600px] mx-auto w-full flex justify-center items-start px-2 md:px-4 gap-4 xl:gap-6 relative z-10 h-[calc(100vh-64px)] overflow-y-auto">
                  {/* LEFT SIDEBAR (Panel de Navegación Fijo / Sticky Optimizado) */}
                  <aside className={`w-[245px] xl:w-[265px] hidden lg:flex flex-col justify-between sticky top-0 h-[calc(100vh-64px)] pr-2 py-3.5 z-10 shrink-0 overflow-y-auto overflow-x-hidden select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <div className="space-y-3">
                          {/* Profile Card Compacto */}
                          <div className={`p-3 rounded-2xl border shadow-xs flex items-center gap-3 transition-colors ${isDarkMode ? 'bg-gray-800/90 border-gray-700/80' : 'bg-white border-gray-200'}`}>
                              <div className="relative shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xs">
                                      {userMappings[myChatId]?.profilePicUrl ? <img src={userMappings[myChatId].profilePicUrl} className="w-full h-full object-cover" /> : <UserIcon size={22} />}
                                  </div>
                                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} ${
                                      (!userPresence[role === 'teacher' ? 'teacher' : myChatId]?.isOnline || userPresence[role === 'teacher' ? 'teacher' : myChatId]?.status === 'offline') ? 'bg-gray-400' :
                                      userPresence[role === 'teacher' ? 'teacher' : myChatId]?.status === 'away' ? 'bg-orange-400' :
                                      userPresence[role === 'teacher' ? 'teacher' : myChatId]?.status === 'busy' ? 'bg-red-500' : 'bg-green-500'
                                  }`} />
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                  {(() => {
                                      const { first, last } = splitNameFirstAndLast(loggedInName);
                                      return (
                                          <div className="min-w-0">
                                              <p className={`font-extrabold text-xs leading-tight truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                  {first}
                                              </p>
                                              {last && (
                                                  <p className={`font-semibold text-[11px] leading-tight truncate text-gray-500`}>
                                                      {last}
                                                  </p>
                                              )}
                                          </div>
                                      );
                                  })()}
                                  <p className="text-[9px] text-[#AD3333] dark:text-red-400 font-bold uppercase tracking-wider mt-0.5">{userMappings[myChatId]?.customLabel || (role === 'teacher' ? 'Docente' : 'Estudiante')}</p>
                              </div>
                          </div>

                          {/* Buscador de publicaciones */}
                          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                              isDarkMode ? 'bg-gray-800/90 border-gray-700/80 text-gray-100 focus-within:border-blue-500/60' : 'bg-gray-50 border-gray-200 text-gray-800 focus-within:border-blue-400/60'
                          }`}>
                              <SearchIcon size={13} className="text-gray-400 shrink-0" />
                              <input 
                                  value={wallSearchTerm} 
                                  onChange={(e) => {
                                      setWallSearchTerm(e.target.value);
                                      if (activeTab !== 'tasks') changeTab('tasks');
                                  }} 
                                  placeholder="Buscar en el muro..." 
                                  className="w-full bg-transparent border-none outline-none text-xs font-medium placeholder-gray-400"
                              />
                              {wallSearchTerm && (
                                  <button type="button" onClick={() => setWallSearchTerm("")} className="text-gray-400 hover:text-gray-600">
                                      <X size={12} />
                                  </button>
                              )}
                          </div>

                          {/* Explorar Menú */}
                          <div className="space-y-1">
                              <h3 className={`px-2.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Explorar</h3>
                              <button onClick={() => changeTab('tasks')} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'tasks' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                                  <NavNotebook size={18} className="text-blue-500" /> Asignaciones
                              </button>
                              <button onClick={() => changeTab('reviews')} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'reviews' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                                  <NavSlides size={18} className="text-purple-500" /> Diapositivas
                              </button>
                              <button onClick={() => changeTab('syllabus')} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'syllabus' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                                  <NavFile size={18} className="text-green-500" /> Programación
                              </button>
                              <button onClick={() => changeTab('evaluations')} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'evaluations' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                                  <CheckCheck size={18} className="text-red-500" /> Evaluaciones
                              </button>
                              {role === 'teacher' && (
                                  <button onClick={() => changeTab('directory')} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'directory' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                                      <UsersIcon size={18} className="text-indigo-500" /> Directorio
                                  </button>
                              )}
                              <button onClick={() => changeTab('groups')} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'groups' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                                  <UsersGroupIcon size={18} className="text-teal-500" /> Grupos
                              </button>
                          </div>

                          {/* Mi cuenta Menú */}
                          <div className="space-y-1 pt-2 border-t border-gray-200/80 dark:border-gray-800">
                              <h3 className={`px-2.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Mi cuenta</h3>
                              <button onClick={() => { changeTab('profile', null); }} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'profile' && !viewingProfileId ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                                  <UserIcon size={17} className="text-blue-500" /> Mi perfil
                              </button>
                              <button onClick={() => changeTab('settings')} className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                                  <Settings size={17} className="text-purple-500" /> Ajustes
                              </button>
                          </div>
                      </div>

                      {/* Cerrar Sesión fijo al fondo */}
                      <div className="pt-2">
                          <button onClick={handleLogout} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all border ${isDarkMode ? 'border-gray-700 text-red-400 hover:bg-red-950/30 hover:border-red-800' : 'border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200'} shadow-2xs`}>
                              <LogOutIcon size={16} /> Cerrar sesión
                          </button>
                      </div>
                  </aside>

                  {/* CENTER CONTENT */}
                  <main className="flex-1 max-w-[680px] min-w-0 w-full p-2 md:p-6 pb-28 md:pb-8 relative z-10 shrink-0 mx-auto">
                      {activeTab === 'tasks' && (
                          <React.Suspense fallback={<p className="text-gray-500 p-8 text-center">Cargando muro...</p>}>
                          <TasksTab 
                              academicGroups={academicGroups} 
                              myChatId={myChatId}
                              userMappings={userMappings}
                              handleOpenProfileByName={handleOpenProfileByName}
                              role={role} glassCard={glassCard} glassInput={glassInput} redButton={redButton}
                              postType={postType} setPostType={setPostType} taskTitle={taskTitle} setTaskTitle={setTaskTitle}
                              taskDesc={taskDesc} setTaskDesc={setTaskDesc} showImageInput={showImageInput} setShowImageInput={setShowImageInput}
                              postImageUrl={postImageUrl} setPostImageUrl={setPostImageUrl} postFileUrl={postFileUrl} setPostFileUrl={setPostFileUrl}
                              postFileName={postFileName} setPostFileName={setPostFileName} showPostAttachmentMenu={showPostAttachmentMenu}
                              setShowPostAttachmentMenu={setShowPostAttachmentMenu} handlePostLocalFileUpload={handlePostLocalFileUpload}
                              isAiLoading={isAiLoading} setIsAiLoading={setIsAiLoading} prevTaskTitle={prevTaskTitle} setPrevTaskTitle={setPrevTaskTitle}
                              prevTaskDesc={prevTaskDesc} setPrevTaskDesc={setPrevTaskDesc} hasAiModified={hasAiModified} setHasAiModified={setHasAiModified}
                              callGemini={callGemini} showMessage={showMessage} handleAiTranslate={handleAiTranslate} taskDate={taskDate}
                              setTaskDate={setTaskDate} taskTime={taskTime} setTaskTime={setTaskTime} allowLate={allowLate} setAllowLate={setAllowLate}
                              db={db} appId={appId} loggedInName={loggedInName} getToday={getToday} tasks={tasks} user={user} isDarkMode={isDarkMode}
                              confirmAction={confirmAction} setFullScreenImage={setFullScreenImage} tasksLoading={tasksLoading} taskLimit={taskLimit} loadMoreTasks={loadMoreTasks} pinnedTasks={pinnedTasks}
                              wallSearchTerm={wallSearchTerm} setWallSearchTerm={setWallSearchTerm}
                          />
                          </React.Suspense>
                      )}
                      {activeTab === 'reviews' && renderReviews()}
                      {activeTab === 'syllabus' && renderSyllabus()}
                      {activeTab === 'evaluations' && renderEvaluations()}
                      {activeTab === 'directory' && role === 'teacher' && renderDirectory()}
                      {activeTab === 'groups' && renderGroupsView()}
                      {activeTab === 'inbox' && role === 'teacher' && renderInbox()}
                      {activeTab === 'profile' && renderProfile()}
                      {activeTab === 'settings' && renderSettings()}
                  </main>

                  {/* RIGHT SIDEBAR (Barra lateral de Chats fija estilo Facebook con Scroll Independiente) */}
                  <aside className={`w-[275px] xl:w-[310px] hidden lg:flex flex-col sticky top-0 h-[calc(100vh-64px)] pl-3 border-l z-10 shrink-0 py-3.5 overflow-hidden ${isDarkMode ? 'border-gray-800 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                      {/* Encabezado de Chats (Fijo arriba) */}
                      <div className="flex items-center justify-between px-1 pb-2">
                          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mensajes</h3>
                          <button 
                              onClick={() => { setIsCreatingGroup(true); setIsChatAppOpen(true); setIsChatMinimized(false); }} 
                              className="text-blue-500 hover:text-blue-600 font-bold text-xs bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1"
                              title="Crear nuevo grupo"
                          >
                              <Plus size={13} /> Grupo
                          </button>
                      </div>

                      {/* Barra de Búsqueda de Chats (Fija arriba) */}
                      <div className="relative pb-2.5">
                          <SearchIcon size={14} className={`absolute left-3 top-2.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                          <input 
                              value={chatSearchQuery} 
                              onChange={e => setChatSearchQuery(e.target.value)} 
                              placeholder="Buscar conversaciones..." 
                              className={`w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-xl border outline-none transition-all ${
                                  isDarkMode 
                                      ? 'bg-gray-800/90 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30' 
                                      : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 shadow-2xs'
                              }`}
                          />
                          {chatSearchQuery && (
                              <button 
                                  onClick={() => setChatSearchQuery('')} 
                                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                                  title="Limpiar búsqueda"
                              >
                                  <X size={12} />
                              </button>
                          )}
                      </div>

                      {/* Chat con IA (GinAI / Asistente) - ÚNICAMENTE VISIBLE PARA EL ROL DE DOCENTE (Fijo arriba) */}
                      {role === 'teacher' && (!chatSearchQuery || 'ginai asistente bot ia ayuda'.includes(chatSearchQuery.toLowerCase())) && (
                          <div className="pb-2.5 border-b border-gray-200/80 dark:border-gray-800 mb-2">
                              <button 
                                  onClick={() => setIsTeacherBotOpen(true)} 
                                  className={`w-full flex items-center gap-2.5 p-2 rounded-2xl transition-all relative group border text-left ${
                                      isDarkMode 
                                          ? 'bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border-purple-800/40 hover:border-purple-600/60 shadow-2xs' 
                                          : 'bg-gradient-to-r from-purple-50/90 to-indigo-50/90 border-purple-200 hover:border-purple-300 shadow-2xs'
                                  }`}
                              >
                                  <div className="relative shrink-0">
                                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-2xs group-hover:scale-105 transition-transform">
                                          <CuteBotIcon size={18} className="text-white" />
                                      </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                                  </div>
                                  <div className="text-left flex-1 overflow-hidden">
                                      <p className="font-bold text-xs text-purple-700 dark:text-purple-300 truncate">Asistente</p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Asistente pedagógico</p>
                                  </div>
                              </button>
                          </div>
                      )}

                      {/* Sección de Grupos y Contactos con Scroll Independiente Fluido */}
                      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3.5 pr-1 min-h-0">
                          {(() => {
                              const filteredGroups = myGroups?.filter(g => g.name?.toLowerCase().includes(chatSearchQuery.toLowerCase())) || [];
                              const filteredUsers = allChatUsers?.filter(u => u.name?.toLowerCase().includes(chatSearchQuery.toLowerCase())) || [];
                              const isBotMatch = role === 'teacher' && (!chatSearchQuery || 'ginai asistente bot ia ayuda'.includes(chatSearchQuery.toLowerCase()));
                              const isTotalEmpty = !isBotMatch && filteredGroups.length === 0 && filteredUsers.length === 0;

                              if (isTotalEmpty) {
                                  return (
                                      <div className="py-8 px-3 text-center space-y-2 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700/80">
                                          <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto mb-1">
                                              <SearchIcon size={18} />
                                          </div>
                                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                              {chatSearchQuery ? 'Sin resultados' : 'Sin conversaciones'}
                                          </p>
                                          <p className="text-[10px] text-gray-500 leading-relaxed">
                                              {chatSearchQuery ? `No encontramos chats con "${chatSearchQuery}"` : 'Los contactos y grupos aparecerán aquí.'}
                                          </p>
                                      </div>
                                  );
                              }

                              return (
                                  <div className="space-y-3.5">
                                      {/* Grupos */}
                                      {filteredGroups.length > 0 && (
                                          <div>
                                              <div className="flex justify-between items-center mb-1 px-1">
                                                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Grupos ({filteredGroups.length})</h4>
                                              </div>
                                              <div className="space-y-0.5">
                                                  {filteredGroups.map(g => {
                                                      const chatId = `group_${g.id}`;
                                                      const isUnread = unreadChats[chatId];
                                                      return (
                                                          <button key={g.id} onClick={() => { handleOpenChat({ id: chatId, name: g.name, type: 'group' }); setIsChatMinimized(false); }} className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                                                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-2xs">
                                                              {g.avatarUrl ? (
                                                                  <img src={g.avatarUrl} alt={g.name} className="w-full h-full object-cover" />
                                                              ) : (
                                                                  <UsersGroupIcon size={15}/>
                                                              )}
                                                          </div>
                                                              <div className="text-left flex-1 overflow-hidden">
                                                                  <p className={`font-bold text-xs truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{g.name}</p>
                                                              </div>
                                                              {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                                                          </button>
                                                      );
                                                  })}
                                              </div>
                                          </div>
                                      )}

                                      {/* Contactos */}
                                      {filteredUsers.length > 0 && (
                                          <div>
                                              <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Contactos ({filteredUsers.length})</h4>
                                              <div className="space-y-0.5">
                                                  {filteredUsers.map(u => {
                                                      const chatId = `dm_${[myChatId, u.id].sort().join('_')}`;
                                                      const isUnread = unreadChats[chatId];
                                                      const presenceStatus = userPresence[u.id]?.status;
                                                      const isOnline = presenceStatus === 'online';
                                                      const isAway = presenceStatus === 'away';
                                                      const isBusy = presenceStatus === 'busy';
                                                      
                                                      const statusDotColor = isOnline ? 'bg-green-500' : isAway ? 'bg-orange-400' : isBusy ? 'bg-red-500' : 'bg-gray-400';
                                                      const photo = u.profilePicUrl || userMappings[u.id]?.profilePicUrl;

                                                      return (
                                                          <button key={u.id} onClick={() => { handleOpenChat({ id: chatId, name: u.name, type: 'dm', role: u.role }); setIsChatMinimized(false); }} className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl transition-colors relative ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                                                              <div className="relative shrink-0">
                                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-2xs overflow-hidden border border-gray-200 dark:border-gray-700 ${u.role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828]' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                                                                      {photo ? (
                                                                          <img src={photo} alt={u.name} className="w-full h-full object-cover" />
                                                                      ) : u.role === 'teacher' ? (
                                                                          <TeacherIcon size={14}/>
                                                                      ) : (
                                                                          <span className="font-bold text-xs">{(u.name || 'E').charAt(0).toUpperCase()}</span>
                                                                      )}
                                                                  </div>
                                                                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 rounded-full ${isDarkMode ? 'border-gray-900' : 'border-white'} ${statusDotColor}`}></div>
                                                              </div>
                                                              <div className="text-left flex-1 overflow-hidden">
                                                                  <p className={`font-bold text-xs truncate leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{u.name}</p>
                                                                  <p className="text-[10px] text-gray-500 truncate">{u.customLabel || (u.role === 'teacher' ? 'Docente' : 'Estudiante')}</p>
                                                              </div>
                                                              {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                                          </button>
                                                      );
                                                  })}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })()}
                      </div>
                  </aside>
              </div>

              {/* BARRA DE NAVEGACIÓN MÓVIL REDISEÑADA (4 BOTONES PRINCIPALES LIMPIOS) */}
              <nav className={`fixed bottom-0 left-0 w-full backdrop-blur-2xl border-t grid grid-cols-4 items-center px-1.5 py-1.5 pb-safe md:hidden z-[100] transition-colors duration-300 ${
                  isDarkMode 
                      ? 'bg-gray-900/95 border-gray-800 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]' 
                      : 'bg-white/95 border-gray-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]'
              }`}>
                {/* 1. Muro / Inicio */}
                <button 
                    type="button"
                    onClick={() => { setIsMobileMenuOpen(false); setIsChatAppOpen(false); if (activeChat) setIsChatMinimized(true); changeTab('tasks'); }} 
                    className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 ${getMobileTabClass('tasks')}`}
                >
                  <NavNotebook size={20} />
                  <span className="text-[10px] font-bold mt-0.5 tracking-tight">Muro</span>
                </button>

                {/* 2. Chats / Mensajes */}
                <button 
                    type="button"
                    onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (activeChat) {
                            setIsChatMinimized(false);
                        } else {
                            setIsChatAppOpen(true);
                        }
                    }} 
                    className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 relative ${getMobileTabClass('chat')}`}
                >
                  <MessageCircle size={20} />
                  <span className="text-[10px] font-bold mt-0.5 tracking-tight">Chats</span>
                  {Object.values(unreadChats || {}).filter(Boolean).length > 0 && (
                      <span className="absolute top-0.5 right-4 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
                          {Object.values(unreadChats || {}).filter(Boolean).length}
                      </span>
                  )}
                </button>

                {/* 3. Grupos */}
                <button 
                    type="button"
                    onClick={() => { setIsMobileMenuOpen(false); setIsChatAppOpen(false); if (activeChat) setIsChatMinimized(true); changeTab('groups'); }} 
                    className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 ${getMobileTabClass('groups')}`}
                >
                  <UsersGroupIcon size={20} />
                  <span className="text-[10px] font-bold mt-0.5 tracking-tight">Grupos</span>
                </button>

                {/* 4. Menú / Más opciones */}
                <button 
                    type="button"
                    onClick={() => {
                        if (activeChat) setIsChatMinimized(true);
                        setIsChatAppOpen(false);
                        setIsMobileMenuOpen(prev => !prev);
                    }} 
                    className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-150 relative ${getMobileTabClass('menu')}`}
                >
                  <Menu size={20} />
                  <span className="text-[10px] font-bold mt-0.5 tracking-tight">Menú</span>
                </button>
              </nav>

              {/* MODAL / POPUP DEL BOT DE LA PROFESORA (Abierto desde el panel derecho) */}
              {role === 'teacher' && hasEntered && isTeacherBotOpen && (
                  <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end">
                      <div className={`${glassCard} w-[92vw] sm:w-[420px] md:w-[480px] h-[520px] md:h-[600px] max-h-[80vh] flex flex-col p-4 animate-in slide-in-from-bottom-10 fade-in shadow-2xl ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'}`}>
                          <div className={`flex justify-between items-center mb-3 border-b pb-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <div className="flex items-center gap-2.5">
                                  <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                                      isTeacherBotLoading
                                          ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  }`} style={isTeacherBotLoading ? { animation: 'bot-think 2.5s ease-in-out infinite' } : {}}>
                                      {isTeacherBotLoading ? <BotThinkingIcon size={22} /> : <CuteBotIcon size={22} />}
                                  </div>
                                  <div>
                                      <h3 className={`text-sm font-extrabold flex items-center gap-1.5 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                          Asistente
                                      </h3>
                                      {isAiSessionPaused ? (
                                           <span className="text-[10px] text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1">
                                               <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Sesión pausada
                                           </span>
                                       ) : isTeacherBotLoading ? (
                                           <span className="text-[10px] text-purple-500 dark:text-purple-400 font-bold flex items-center gap-1" style={{ transition: 'opacity 0.3s' }}>
                                               <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                               {["Hmm, déjame pensar...", "Interesante pregunta...", "Un segundito...", "Procesando...", "Analizando...", "Cargando conocimiento...", "Ya casi...", "Oooh buena esa..."][thinkingMsg]}
                                           </span>
                                       ) : (
                                           <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sesión activa
                                           </span>
                                       )}
                                  </div>
                              </div>
                              <div className="flex items-center gap-1">
                                  <button 
                                      type="button"
                                      onClick={async () => {
                                          await deleteDoc(doc(db, 'artifacts', appId, 'users', 'teacher', 'teacherBot', 'history')).catch(()=>{});
                                          setTeacherBotHistory([]);
                                          showMessage("🔄 Sesión del asistente reiniciada.");
                                      }} 
                                      className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`} 
                                      title="Reiniciar conversación / Nueva sesión"
                                  >
                                      <RotateCcw size={16} />
                                  </button>
                                  <button 
                                      type="button"
                                      onClick={() => setIsTeacherBotOpen(false)} 
                                      className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800' : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'}`} 
                                      title="Cerrar"
                                  >
                                      <X size={18}/>
                                  </button>
                              </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
                              <div className={`text-xs sm:text-sm p-3.5 rounded-2xl rounded-tl-none shadow-xs font-medium whitespace-pre-wrap leading-relaxed border ${
                                  isDarkMode ? 'bg-gray-800/80 text-blue-200 border-gray-700/80' : 'bg-blue-50/90 text-blue-950 border-blue-100'
                              }`}>
                                  ¡Hola, Profesora Gina! 👋 Soy su Asistente de English TECH. Estoy aquí para orientarle en la gestión de contenidos, evaluaciones, asignaciones y uso de las herramientas de la plataforma. ¿En qué le puedo colaborar hoy?
                              </div>
                              {teacherBotHistory.map((m, i) => (
                                  <div key={i} className={`text-xs sm:text-sm p-3 rounded-2xl max-w-[88%] shadow-xs whitespace-pre-wrap leading-relaxed ${
                                      m.role === 'user' 
                                          ? (isDarkMode ? 'bg-blue-600 text-white ml-auto rounded-tr-none' : 'bg-gray-800 text-white ml-auto rounded-tr-none') 
                                          : (isDarkMode ? 'bg-gray-800/90 text-gray-100 rounded-tl-none border border-gray-700' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200 shadow-2xs')
                                  }`}>
                                      {formatBotText(m.text)}
                                  </div>
                              ))}
                              {isTeacherBotLoading && (
                                  <div className="flex items-center gap-2 py-2 px-3">
                                      <div className="flex gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-purple-500" style={{ animation: 'typing-dot 1.4s ease-in-out infinite' }} />
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-purple-500" style={{ animation: 'typing-dot 1.4s ease-in-out 0.2s infinite' }} />
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-purple-500" style={{ animation: 'typing-dot 1.4s ease-in-out 0.4s infinite' }} />
                                      </div>
                                      <span className="text-[10px] text-purple-500 dark:text-purple-400 italic font-medium">escribiendo...</span>
                                  </div>
                              )}
                              <div ref={teacherBotEndRef} />
                          </div>

                          <form onSubmit={async (e) => {
                              e.preventDefault();
                              if (!teacherBotInput.trim()) return;
                              const userMsg = teacherBotInput.trim(); 
                              setTeacherBotInput("");
                              const ph = ["¿En qué necesitas ayuda?", "¿Hay algo que no entiendas?", "Pregúntame lo que sea...", "Escribe tu duda aquí...", "¿Cómo puedo ayudarte?", "¿Necesitas apoyo con algo?", "Estoy aquí para servirte...", "¿Alguna duda, profe?", "Pregúntame sin miedo...", "¿Qué necesitas hoy?", "¿Hay algo que te preocupe?", "¿Necesitas ideas para la clase?", "¿Quieres que te ayude?", "¿Cómo va todo, profe?", "¿Necesitas que te oriente?", "¿Tienes alguna consulta?", "¿En qué te puedo ayudar?", "¿Hay algún problema?", "¿Necesitas apoyo pedagógico?", "¿Qué tal tu día, profe?", "¿Necesitas que te explique algo?", "¿Hay algo nuevo para aprender?", "¿Quieres que repasemos juntos?", "¿Cómo están tus alumnos?", "¿Necesitas recursos didácticos?", "¿Quieres que genere una actividad?", "¿Hay algo que mejorar?", "¿Necesitas una idea fresca?", "¿Qué tal el semestre, profe?", "¿Necesitas motivación hoy?", "¿Hay algo que te cause curiosidad?", "¿Quieres que te sorprenda?", "¿Necesitas un consejo rápido?", "¿Cómo va la clase de hoy?", "¿Necesitas que te recuerde algo?", "¿Hay algo pendiente?", "¿Quieres que revisemos algo juntos?", "¿Qué necesitas saber ahora?", "¿Necesitas que te guíe?", "¿Hay algo que te cause duda?", "¿Quieres practicar algo?", "¿Cómo podemos mejorar hoy?", "¿Necesitas que te recomiende algo?", "¿Hay algo nuevo en tu clase?", "¿Quieres que te apoye?", "¿Necesitas una mano amiga?", "¿Qué tal tu progreso, profe?", "¿Necesitas que te ayude a planear?", "¿Hay algo que te inspire?", "¿Quieres que creemos algo juntos?"];
                              setBotPlaceholder(ph[Math.floor(Math.random() * ph.length)]);
                              setIsTeacherBotLoading(true);
                              const newHistory = [...teacherBotHistory, { role: 'user', text: userMsg }];
                              setTeacherBotHistory(newHistory);

                              const prompt = `Eres el "Asistente Técnico y Pedagógico" oficial de English TECH, la plataforma académica integral diseñada para la Profesora Gina y sus estudiantes de inglés.

CONTEXTO ACTUAL DE LA PLATAFORMA (en tiempo real):
Fecha y hora actual (Bogotá, Colombia): ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'long' })}

DATOS REALES DE LA PLATAFORMA (acceso directo):
- Total de publicaciones/tareas en el muro: ${tasks.length}
- Últimas 5 publicaciones: ${tasks.slice(0, 5).map(t => `"${t.title || 'Sin título'}" (${t.targetGroupName || 'Global'}, ${new Date(t.createdAt).toLocaleDateString('es-CO')})`).join(' | ')}
- Total de evaluaciones creadas: ${evaluations.length}
- Evaluaciones próximas (por vencer): ${evaluations.filter(e => e.dueDate && new Date(e.dueDate) > new Date()).slice(0, 5).map(e => `"${e.title}" (vence: ${new Date(e.dueDate).toLocaleDateString('es-CO')})`).join(' | ')}
- Total de estudiantes registrados: ${Object.keys(userMappings).filter(k => userMappings[k]?.role === 'student').length}
- Nombres de estudiantes: ${Object.entries(userMappings).filter(([, u]) => u?.role === 'student').map(([, u]) => u.fullName || u.name).slice(0, 30).join(', ')}
- Grupos académicos: ${academicGroups.length > 0 ? academicGroups.map(g => g.name).join(', ') : 'Ninguno creado aún'}
- Semanas del syllabus: ${syllabus.length}
- Contenido programático más reciente: ${syllabus.length > 0 ? `"Semana ${syllabus[syllabus.length - 1]?.week}: ${syllabus[syllabus.length - 1]?.topic || 'Sin tema'}"` : 'Sin contenido aún'}

CONOCIMIENTO TOTAL Y MANUAL MAESTRO DE LA PLATAFORMA ENGLISH TECH:

1. ROL DOCENTE Y ADMINISTRACIÓN:
- La Profesora Gina cuenta con permisos administrativos totales: creación y gestión de asignaciones, calificaciones, estructuración de syllabus, generación de evaluaciones, salas de chat, buzón de sugerencias y herramientas avanzadas de IA.

2. MÓDULO MURO (ASIGNACIONES Y PUBLICACIONES):
- Publicación de tareas, comunicados y proyectos con título, descripción y fecha límite.
- Asignación segmentada: permite publicar para "Todos los grupos" o exclusivamente para un "Grupo Académico" específico.
- Adjuntos multimedia completos:
  * Imágenes y fotografías.
  * GIFs animados integrados mediante buscador Giphy.
  * Notas de voz grabadas en directo con reproductor interactivo.
  * Documentos adjuntos (PDF, Word, presentaciones).
  * Videos de YouTube o enlaces con reproductor embebido.
- Herramientas de IA para la Docente:
  * "Potenciar con IA": Enriquece la redacción pedagógica, objetivos y claridad de la tarea sin asteriscos.
  * "Corregir": Revisa ortografía y gramática manteniendo el idioma original.
  * "Traducir a inglés" y "Traducir a francés": Traduce el contenido instantáneamente.
- Interacción y Entregas: Comentarios en tiempo real con traducción integrada con IA. Los estudiantes suben entregas de tareas y la docente califica y retroalimenta.

3. MÓDULO DIAPOSITIVAS (REPASOS INTERACTIVOS):
- Generador de presentaciones interactivas con IA a partir de cualquier tema de inglés o texto de clase.
- Modo visor de diapositivas a pantalla completa para clases en vivo o estudio individual.
- Tarjetas de memoria (Flashcards) para memorizar y repasar vocabulario y conceptos.
- Quizzes rápidos integrados en las diapositivas para validar comprensión inmediata.

4. MÓDULO SYLLABUS (PROGRAMACIÓN Y PLANEACIÓN ACADÉMICA):
- Planificación semestral organizada por semanas cronológicas y unidades temáticas.
- Repositorio de enlaces de apoyo, videos y recursos educativos por semana.
- Asistente de IA integrado para generar planeaciones de clase, ideas de actividades pedagógicas y rúbricas.

5. MÓDULO EVALUACIONES (PRUEBAS Y EXÁMENES EN LÍNEA):
- Creación de evaluaciones con banco de preguntas: opción múltiple, verdadero/falso y desarrollo.
- Temporizador en minutos con cuenta regresiva interactiva y entrega automática cuando el tiempo expira.
- Calificación automática e instantánea para preguntas objetivas.
- Libreta de calificaciones centralizada para la docente con registro de puntajes de cada estudiante.

6. MÓDULO GRUPOS ACADÉMICOS:
- Creación y administración de cursos/grados escolares (ej. Grado 9°, Grado 10°, etc.).
- Personalización de portadas y colores para cada grupo.
- Filtrado de tareas y materiales dirigidos a grupos específicos.
- Creación y sincronización automática de salas de chat grupales por materia/grupo.

7. MÓDULO MENSAJERÍA (CHATS EN TIEMPO REAL):
- Chats privados individuales (Docente-Estudiante o entre Estudiantes) y salas grupales de clase.
- Envío de notas de voz en directo con onda de audio, fotos, archivos y GIFs.
- Indicador de presencia en tiempo real: En línea (punto verde) y Desconectado (inactividad tras 3 min).
- Indicador interactivo de "Escribiendo..." en vivo.
- Notificaciones sonoras con 5 tonos amigables a elegir: Cristal (predeterminado), Campana, Pop, Chime y Burbuja.
- Notificaciones Push del navegador con opción de activar o desactivar fácilmente.
- Traductor instantáneo de mensajes de chat al español.
- Filtro de seguridad de contenido que bloquea automáticamente palabras ofensivas o lenguaje inapropiado.

8. MÓDULO BUZÓN (SUGERENCIAS Y REPORTES):
- Espacio constructivo para que los estudiantes envíen sugerencias, inquietudes o reportes a la profesora.
- Panel de lectura para la docente con contador de mensajes no leídos y opción de marcar como atendido.

9. PERFIL Y AJUSTES:
- Edición de nombre, avatar con recorte y zoom interactivo, y foto de portada.
- Muro de perfil personal con fotos y comentarios.
- Selector de tema visual: Modo Oscuro y Modo Claro.
- Configuración de sonidos de notificación (volumen, tono y botón de prueba ▶).
- "Cerebro del Asistente": Panel donde se pueden agregar instrucciones personalizadas para el Asistente.

10. DIRECTRICES ESTRICTAS DE RESPUESTA:
- Tono: Profesional, sobrio, respetuoso, motivador y pedagógico.
- Concisión y precisión: Explica claramente, paso a paso y directo al grano sin divagar.
- Formato: NO uses asteriscos (** ni *) en tus respuestas. Escribe en texto limpio, fluido y elegante.
- Responde siempre en español formal y educado.

INSTRUCCIONES EXTRA CONFIGURADAS POR LA DOCENTE:
${teacherBotInfoList.length > 0 ? teacherBotInfoList.map(i => "- " + i.text).join('\n') : "Sin notas adicionales."}

HISTORIAL DE LA SESIÓN ACTIVA:
${newHistory.filter(m => !m.text.includes('❌') && !m.text.includes('error')).map(m => `${m.role === 'user' ? 'Profesora Gina' : 'Asistente'}: ${m.text}`).join('\n')}

Consulta de la docente: ${userMsg}
Respuesta del asistente (Profesional, sobria, sin asteriscos de markdown innecesarios y concisa):`;

                              try {
                                  const reply = await callGemini(prompt);
                                  const cleanReply = reply && reply.trim() 
                                      ? reply.trim().replace(/\*\*/g, '').replace(/\*/g, '') 
                                      : "Disculpe, no pude procesar la respuesta en este momento. Por favor intente de nuevo.";
                                  const finalHistory = [...newHistory, { role: 'bot', text: cleanReply }];
                                  setTeacherBotHistory(finalHistory);
                                  // Persistencia en Firestore no bloqueante
                                  setDoc(doc(db, 'artifacts', appId, 'users', 'teacher', 'teacherBot', 'history'), { messages: finalHistory }).catch(e => console.warn("Historial local guardado:", e));
                              } catch (err) {
                                  console.error("Teacher bot error:", err);
                                  let errorText = "❌ Ocurrió un error al procesar su solicitud. Por favor, intente de nuevo.";
                                  if (err?.message === 'QUOTA_EXCEEDED' || err?.code === 'QUOTA_EXCEEDED' || err?.toString()?.includes('429') || err?.toString()?.includes('quota') || err?.toString()?.includes('RESOURCE_EXHAUSTED')) {
                                      setIsAiSessionPaused(true);
                                      errorText = "❌ Cuota de uso agotada temporalmente.";
                                  }
                                  const finalHistory = [...newHistory, { role: 'bot', text: errorText }];
                                  setTeacherBotHistory(finalHistory);
                                  setDoc(doc(db, 'artifacts', appId, 'users', 'teacher', 'teacherBot', 'history'), { messages: finalHistory }).catch(()=>{});
                              } finally {
                                  setIsTeacherBotLoading(false);
                              }
                          }} className="flex gap-2">
                              <input 
                                  value={teacherBotInput} 
                                  onChange={e => setTeacherBotInput(e.target.value)} 
                                  placeholder={botPlaceholder} 
                                  className={`flex-1 py-2 px-3 text-xs sm:text-sm rounded-xl outline-none border focus:ring-2 transition-all ${
                                      isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500/50 placeholder-gray-500' : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-400/50 placeholder-gray-500'
                                  }`} 
                              />
                              <button 
                                  type="submit" 
                                  disabled={isTeacherBotLoading || !teacherBotInput.trim()} 
                                  className={`p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center disabled:opacity-40 ${
                                      isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-[#AD3333] text-white hover:bg-[#8a2828]'
                                  }`}
                              >
                                  <ArrowRightIcon size={16}/>
                              </button>
                          </form>
                      </div>
                  </div>
              )}

              {/* MODAL DE CREAR GRUPO */}
              {isCreatingGroup && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                      <div className={`max-w-md w-full rounded-3xl shadow-2xl p-6 flex flex-col gap-4 border ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
                              <h3 className="text-xl font-extrabold flex items-center gap-2">
                                  <UsersGroupIcon className="text-blue-500"/> Crear nuevo grupo
                              </h3>
                              <button type="button" onClick={() => { setIsCreatingGroup(false); setNewGroupName(""); setNewGroupMembers([]); }} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                                  <X size={20}/>
                              </button>
                          </div>
                          <form onSubmit={handleCreateGroup} className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">Nombre del grupo</label>
                                  <input 
                                      value={newGroupName} 
                                      onChange={e => setNewGroupName(e.target.value)} 
                                      placeholder="Ej: Equipo proyecto final" 
                                      className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-2 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500/50' : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-400/50'}`} 
                                      required 
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">Seleccionar miembros</label>
                                  <div className={`max-h-56 overflow-y-auto border rounded-2xl divide-y ${isDarkMode ? 'border-gray-700 bg-gray-800/50 divide-gray-700' : 'border-gray-200 bg-white divide-gray-100'}`}>
                                      {allChatUsers.map(u => (
                                          <label key={u.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-500/10 transition-colors">
                                              <input 
                                                  type="checkbox" 
                                                  checked={newGroupMembers.includes(u.id)} 
                                                  onChange={(e) => {
                                                      if (e.target.checked) setNewGroupMembers([...newGroupMembers, u.id]);
                                                      else setNewGroupMembers(newGroupMembers.filter(id => id !== u.id));
                                                  }} 
                                                  className="w-4 h-4 accent-blue-600 rounded" 
                                              />
                                              <div className="flex-1 min-w-0">
                                                  <p className="font-bold text-xs truncate">{u.name}</p>
                                                  <p className="text-[10px] text-gray-400 truncate">{u.customLabel || (u.role === 'teacher' ? 'Docente' : 'Estudiante')}</p>
                                              </div>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                              <div className="flex gap-2 justify-end pt-2">
                                  <button type="button" onClick={() => { setIsCreatingGroup(false); setNewGroupName(""); setNewGroupMembers([]); }} className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      Cancelar
                                  </button>
                                  <button type="submit" className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all">
                                      Crear grupo
                                  </button>
                              </div>
                          </form>
                      </div>
                  </div>,
                  document.body
              )}

              {/* MODAL DE CONVERSACIONES EN MÓVIL (CUANDO SE ABRE DESDE EL NAV MÓVIL Y NO HAY ACTIVE CHAT) */}
              {isChatAppOpen && !activeChat && ReactDOM.createPortal(
                  <div className={`fixed inset-0 z-[99999] flex flex-col md:hidden animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
                      <div className={`flex justify-between items-center p-4 pt-safe border-b shadow-sm shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                          <h2 className="text-xl font-extrabold flex items-center gap-2">
                              <MessageCircle className="text-blue-500" /> Mensajes
                          </h2>
                          <button onClick={() => { setIsChatAppOpen(false); window.location.hash = activeTab; }} className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                              <X size={20} />
                          </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 pb-safe space-y-4">
                          {/* Buscador */}
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border focus-within:ring-2 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:ring-blue-500/50' : 'bg-white border-gray-300 focus-within:ring-blue-400/50'}`}>
                              <SearchIcon size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                              <input 
                                  type="text" 
                                  placeholder="Buscar contacto o grupo..." 
                                  value={chatSearchTerm} 
                                  onChange={(e) => setChatSearchTerm(e.target.value)} 
                                  className="flex-1 bg-transparent border-none outline-none text-xs font-medium placeholder-gray-500" 
                              />
                              {chatSearchTerm && <button onClick={() => setChatSearchTerm("")} className="text-gray-400"><X size={14}/></button>}
                          </div>

                          {/* Grupos */}
                          <div>
                              <div className="flex justify-between items-center mb-2 px-1">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Grupos</h3>
                                  <button onClick={() => setIsCreatingGroup(true)} className="text-blue-500 font-bold text-xs bg-blue-500/10 px-2.5 py-1 rounded-full">+ Crear</button>
                              </div>
                              <div className="space-y-1.5">
                                  {filteredGroups.length === 0 && <p className="text-xs italic text-gray-400 px-1">No hay grupos.</p>}
                                  {filteredGroups.map(g => (
                                      <button key={g.id} onClick={() => { handleOpenChat({ id: `group_${g.id}`, name: g.name, type: 'group' }); setIsChatMinimized(false); }} className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xs'}`}>
                                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-xs">
                                               {g.avatarUrl ? (
                                                   <img src={g.avatarUrl} alt={g.name} className="w-full h-full object-cover" />
                                               ) : (
                                                   g.emoji ? renderGroupVectorIcon(g.emoji, 16, "text-white") : <UsersGroupIcon size={16}/>
                                               )}
                                           </div>
                                          <div className="flex-1 min-w-0">
                                              <p className="font-bold text-xs truncate">{g.name}</p>
                                              <p className="text-[10px] text-gray-400">{g.members?.length || 0} miembros</p>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Contactos */}
                          <div>
                              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">Contactos</h3>
                              <div className="space-y-1.5">
                                  {filteredUsers.map(u => {
                                      const chatId = `dm_${[myChatId, u.id].sort().join('_')}`;
                                      const photo = u.profilePicUrl || userMappings[u.id]?.profilePicUrl;
                                      return (
                                          <button key={u.id} onClick={() => { handleOpenChat({ id: chatId, name: u.name, type: 'dm', role: u.role }); setIsChatMinimized(false); }} className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xs'}`}>
                                              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-blue-400 to-indigo-500">
                                                  {photo ? <img src={photo} alt={u.name} className="w-full h-full object-cover" /> : u.role === 'teacher' ? <TeacherIcon size={16}/> : <span className="font-bold text-xs">{(u.name || 'E').charAt(0).toUpperCase()}</span>}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <p className="font-bold text-xs truncate">{u.name}</p>
                                                  <p className="text-[10px] text-gray-400 truncate">{u.customLabel || (u.role === 'teacher' ? 'Docente' : 'Estudiante')}</p>
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>
                  </div>,
                  document.body
              )}

              {/* VENTANA EMERGENTE FLOTANTE DE CHAT (Estilo Facebook Messenger Web) */}
              {activeChat && ReactDOM.createPortal(
                  isChatMinimized ? (
                      /* PESTAÑA MINIMIZADA ANCLADA ABAJO A LA DERECHA (SOBRE LA NAV EN MÓVIL) */
                      <div 
                          onClick={() => setIsChatMinimized(false)}
                          className={`fixed bottom-20 sm:bottom-0 right-3 sm:right-6 md:right-8 z-[120] w-auto sm:w-80 max-w-[calc(100vw-24px)] rounded-2xl sm:rounded-t-2xl sm:rounded-b-none shadow-2xl border transition-all duration-300 flex items-center justify-between p-2.5 px-3.5 cursor-pointer select-none ${
                              isDarkMode ? 'bg-gray-800 border-gray-700 text-white shadow-black/60 hover:bg-gray-750' : 'bg-white border-gray-200 text-gray-800 shadow-xl hover:bg-gray-50'
                          }`}
                      >
                          <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                                      {activeChat.type === 'group' ? (
                                          <UsersGroupIcon size={14}/>
                                      ) : (() => {
                                          const tId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
                                          const photo = userMappings[tId]?.profilePicUrl;
                                          return photo ? (
                                              <img src={photo} alt={activeChat.name} className="w-full h-full object-cover" />
                                          ) : (
                                              activeChat.name?.charAt(0).toUpperCase() || 'U'
                                          );
                                      })()}
                                  </div>
                                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-gray-800 bg-green-500"></div>
                              </div>
                              <p className="font-bold text-xs truncate max-w-[150px]">{activeChat.name}</p>
                          </div>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button 
                                  type="button" 
                                  onClick={() => setIsChatMinimized(false)} 
                                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
                                  title="Expandir conversación"
                              >
                                  <ChevronUp size={16}/>
                              </button>
                              <button 
                                  type="button" 
                                  onClick={() => { setActiveChat(null); setIsChatAppOpen(false); }} 
                                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" 
                                  title="Cerrar chat"
                              >
                                  <X size={16}/>
                              </button>
                          </div>
                      </div>
                  ) : (
                      /* VENTANA FLOTANTE EXPANDIDA ESTILO FACEBOOK MESSENGER (FULLSCREEN ADAPTATIVO EN MÓVIL) */
                      (() => {
                          const currentPrefs = chatPreferences[activeChat.id] || { gradient: '', pattern: 'none' };
                          const activePattern = CHAT_PATTERNS.find(p => p.id === currentPrefs.pattern)?.style || {};

                          return (
                              <div className={`fixed inset-x-0 bottom-0 top-0 sm:top-auto sm:bottom-0 sm:right-6 md:right-8 sm:left-auto z-[120] w-full sm:w-[380px] sm:max-w-[calc(100vw-24px)] h-full sm:h-[520px] sm:max-h-[calc(100vh-80px)] rounded-none sm:rounded-t-2xl shadow-2xl border-t sm:border flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 ${
                                  isDarkMode ? 'bg-gray-900 border-gray-700 shadow-black/70' : 'bg-white border-gray-200 shadow-2xl'
                              }`}>
                                  {/* Encabezado del Chat */}
                                  <div className={`p-2.5 px-3.5 pt-safe sm:pt-2.5 border-b shadow-xs flex items-center justify-between shrink-0 relative z-30 ${
                                      isDarkMode ? 'bg-gray-800/95 border-gray-700 backdrop-blur-md' : 'bg-white/95 border-gray-200 backdrop-blur-md'
                                  }`}>
                                      <div className="flex items-center gap-2 min-w-0">
                                          <button 
                                              type="button" 
                                              onClick={() => { setActiveChat(null); setIsChatAppOpen(true); }} 
                                              className="sm:hidden p-1 -ml-1 text-gray-500 hover:text-gray-800 dark:text-gray-300" 
                                              title="Volver a lista de chats"
                                          >
                                              <ArrowLeftIcon size={18} />
                                          </button>
                                          <div className="relative shrink-0">
                                              <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white shadow-xs ${
                                                  activeChat.type === 'group' 
                                                      ? 'bg-gradient-to-br from-indigo-400 to-purple-500' 
                                                      : (activeChat.role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828]' : 'bg-gradient-to-br from-blue-400 to-indigo-500')
                                              }`}>
                                                  {activeChat.type === 'group' ? (() => {
                                                       const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id);
                                                       const gPhoto = activeChat.avatarUrl || grp?.avatarUrl;
                                                       if (gPhoto) return <img src={gPhoto} alt={activeChat.name} className="w-full h-full object-cover" />;
                                                       return <UsersGroupIcon size={16}/>;
                                                   })() : (() => {
                                                      const tId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
                                                      const photo = userMappings[tId]?.profilePicUrl;
                                                      if (photo) return <img src={photo} alt={activeChat.name} className="w-full h-full object-cover" />;
                                                      return activeChat.role === 'teacher' ? <TeacherIcon size={16}/> : <span className="font-bold text-xs">{activeChat.name?.charAt(0).toUpperCase() || 'U'}</span>;
                                                  })()}
                                              </div>
                                              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} ${
                                                  (() => {
                                                      const tId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
                                                      const st = userPresence[tId]?.status;
                                                      return st === 'online' ? 'bg-green-500' : st === 'away' ? 'bg-orange-400' : st === 'busy' ? 'bg-red-500' : 'bg-gray-400';
                                                  })()
                                              }`}></div>
                                          </div>

                                          <div className="min-w-0">
                                              <button 
                                                  type="button"
                                                  onClick={() => { 
                                                      if (activeChat.type === 'group') {
                                                          setShowGroupInfo(!showGroupInfo); 
                                                      } else if (activeChat.type === 'dm') {
                                                          const targetId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
                                                          setViewingProfileId(targetId);
                                                          changeTab('profile', targetId);
                                                      }
                                                  }}
                                                  className={`text-xs font-black truncate block text-left hover:underline leading-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}
                                                  title="Ver información"
                                              >
                                                  {activeChat.name}
                                              </button>
                                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
                                                   {(() => {
                                                       if (activeChat.type === 'group') {
                                                           const typingInGroup = typingStatus[activeChat.id] || {};
                                                           const typers = Object.entries(typingInGroup)
                                                               .filter(([uid, val]) => uid !== myChatId && (val === true || (typeof val === 'object' && val.isTyping)))
                                                               .map(([uid, val]) => (typeof val === 'object' && val.name) ? val.name.split(' ')[0] : (userMappings[uid]?.fullName?.split(' ')[0] || (uid === 'teacher' ? 'Gina' : uid)));
                                                           if (typers.length > 0) {
                                                               return <span className="text-emerald-500 font-bold animate-pulse">{typers.join(', ')} está escribiendo...</span>;
                                                           }
                                                           const grp = chatGroups.find(g => `group_${g.id}` === activeChat.id || g.id === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id);
                                                           return `${grp?.members?.length || activeChat.members?.length || 0} miembros`;
                                                       }
                                                       const targetId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
                                                       const isTyping = typingStatus[activeChat.id]?.[targetId];
                                                       if (isTyping || (typeof isTyping === 'object' && isTyping?.isTyping)) return <span className="text-blue-500 font-bold animate-pulse">Escribiendo...</span>;
                                                       const pData = userPresence[targetId] || {};
                                                       if (pData.status === 'online') {
                                                           return pData.currentChatId === activeChat.id ? <span className="text-green-600 font-bold">En este chat</span> : <span className="text-green-500 font-bold">En línea</span>;
                                                       }
                                                       if (pData.status === 'away') return 'Ausente';
                                                       if (pData.status === 'busy') return 'Ocupado';
                                                       return 'Desconectado';
                                                   })()}
                                               </p>
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-0.5 relative shrink-0">
                                          <button 
                                              type="button"
                                              onClick={() => setShowChatSettings(!showChatSettings)} 
                                              className={`p-1.5 rounded-lg transition-colors ${showChatSettings ? 'bg-blue-500/20 text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
                                              title="Fondo y color"
                                          >
                                              <Palette size={16}/>
                                          </button>

                                          {showChatSettings && (
                                              <div className={`absolute top-full right-0 mt-2 w-[240px] p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl z-[99999] animate-in fade-in zoom-in-95 duration-150`}>
                                                  <h4 className={`text-xs font-bold mb-2.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Color del chat</h4>
                                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                                      {CHAT_GRADIENTS.map((grad, idx) => (
                                                          <button 
                                                              key={idx} 
                                                              type="button"
                                                              onClick={() => handleUpdateChatPreference(activeChat.id, 'gradient', grad)} 
                                                              className={`w-6 h-6 rounded-full border-2 transition-transform shadow-xs ${grad ? 'bg-gradient-to-br ' + grad : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')} ${currentPrefs.gradient === grad ? 'border-blue-500 scale-110' : 'border-transparent hover:scale-105'}`} 
                                                          />
                                                      ))}
                                                  </div>
                                                  <h4 className={`text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Patrón de fondo</h4>
                                                  <div className="grid grid-cols-2 gap-1.5">
                                                      {CHAT_PATTERNS.map(pat => (
                                                          <button 
                                                              type="button" 
                                                              key={pat.id} 
                                                              onClick={() => handleUpdateChatPreference(activeChat.id, 'pattern', pat.id)} 
                                                              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${currentPrefs.pattern === pat.id ? 'border-blue-500 bg-blue-500/10 text-blue-500' : (isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-100')}`}
                                                          >
                                                              {pat.name}
                                                          </button>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}

                                          <button 
                                              type="button" 
                                              onClick={() => setIsChatMinimized(true)} 
                                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" 
                                              title="Minimizar"
                                          >
                                              <Minus size={16}/>
                                          </button>
                                          <button 
                                              type="button" 
                                              onClick={() => { setActiveChat(null); setIsChatAppOpen(false); }} 
                                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" 
                                              title="Cerrar chat"
                                          >
                                              <X size={16}/>
                                          </button>
                                      </div>
                                  </div>

                                  {/* VISTA DE INFORMACIÓN DEL GRUPO (ESTILO WHATSAPP / TELEGRAM) */}
                                   {showGroupInfo && activeChat.type === 'group' ? (() => {
                                       const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id) || activeChat;
                                       const membersList = grp.members || [];
                                       const filteredMembers = membersList.filter(uk => {
                                           if (uk === 'teacher') return 'docente gina marcela quintana'.includes(groupInfoSearch.toLowerCase());
                                           const uData = userMappings[uk] || {};
                                           return (uData.fullName || uk || '').toLowerCase().includes(groupInfoSearch.toLowerCase()) || (uData.email || '').toLowerCase().includes(groupInfoSearch.toLowerCase());
                                       });

                                       return (
                                           <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                                               {/* Perfil y Foto del Grupo */}
                                               <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                                                   <div className="relative group">
                                                       <div 
                                                           onClick={() => grp.avatarUrl && setFullScreenImage(grp.avatarUrl)} 
                                                           className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 shadow-lg flex items-center justify-center cursor-pointer ${
                                                               isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-white bg-indigo-500'
                                                           }`}
                                                           title={grp.avatarUrl ? 'Ver foto completa' : 'Foto de perfil del grupo'}
                                                       >
                                                           {grp.avatarUrl ? (
                                                               <img src={grp.avatarUrl} alt={grp.name} className="w-full h-full object-cover" />
                                                           ) : (
                                                               <UsersGroupIcon size={44} className="text-white" />
                                                           )}
                                                       </div>
                                                       
                                                       {/* Botón de Cambiar Foto */}
                                                       {role === 'teacher' && (
                                                           <button
                                                               type="button"
                                                               onClick={() => groupAvatarFileInputRef.current?.click()}
                                                               disabled={isUploadingGroupAvatar}
                                                               className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white dark:border-gray-800 transition-transform active:scale-90"
                                                               title="Cambiar foto del grupo"
                                                           >
                                                               {isUploadingGroupAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                                           </button>
                                                       )}
                                                       <input 
                                                           type="file" 
                                                           ref={groupAvatarFileInputRef} 
                                                           onChange={handleUpdateGroupPhoto} 
                                                           accept="image/*" 
                                                           className="hidden" 
                                                       />
                                                   </div>

                                                   {/* Nombre del Grupo */}
                                                   <div className="mt-3 w-full max-w-xs">
                                                       {isEditingGroupName ? (
                                                           <div className="flex items-center gap-1.5 justify-center">
                                                               <input 
                                                                   type="text" 
                                                                   value={editGroupNameVal} 
                                                                   onChange={e => setEditGroupNameVal(e.target.value)} 
                                                                   className="px-2.5 py-1 text-xs sm:text-sm font-bold rounded-xl border border-blue-500 bg-white dark:bg-gray-900 outline-none w-full"
                                                                   placeholder="Nombre del grupo"
                                                                   autoFocus
                                                               />
                                                               <button 
                                                                   type="button" 
                                                                   onClick={handleSaveGroupName} 
                                                                   className="p-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                                                                   title="Guardar"
                                                               >
                                                                   <CheckLine size={14} />
                                                               </button>
                                                               <button 
                                                                   type="button" 
                                                                   onClick={() => setIsEditingGroupName(false)} 
                                                                   className="p-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                                   title="Cancelar"
                                                               >
                                                                   <X size={14} />
                                                               </button>
                                                           </div>
                                                       ) : (
                                                           <div className="flex items-center justify-center gap-1.5">
                                                               <h3 className="font-extrabold text-sm sm:text-base truncate">{grp.name}</h3>
                                                               {role === 'teacher' && (
                                                                   <button 
                                                                       type="button" 
                                                                       onClick={() => { setEditGroupNameVal(grp.name); setIsEditingGroupName(true); }}
                                                                       className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                                       title="Editar nombre"
                                                                   >
                                                                       <Edit3 size={13} />
                                                                   </button>
                                                               )}
                                                           </div>
                                                       )}
                                                       <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                                           Grupo · {membersList.length} integrante{membersList.length !== 1 ? 's' : ''}
                                                       </p>
                                                   </div>

                                                   {/* Descripción del Grupo */}
                                                   <div className="mt-2 w-full max-w-xs border-t border-gray-200/60 dark:border-gray-700/60 pt-2 text-left">
                                                       <div className="flex items-center justify-between mb-1">
                                                           <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Descripción</span>
                                                           {role === 'teacher' && !isEditingGroupDesc && (
                                                               <button 
                                                                   type="button" 
                                                                   onClick={() => { setEditGroupDescVal(grp.description || ''); setIsEditingGroupDesc(true); }}
                                                                   className="text-[10px] font-bold text-blue-500 hover:underline"
                                                               >
                                                                   {grp.description ? 'Editar' : '+ Añadir'}
                                                               </button>
                                                           )}
                                                       </div>
                                                       {isEditingGroupDesc ? (
                                                           <div className="space-y-1.5">
                                                               <textarea 
                                                                   value={editGroupDescVal} 
                                                                   onChange={e => setEditGroupDescVal(e.target.value)} 
                                                                   className="w-full p-2 text-xs rounded-xl border border-blue-500 bg-white dark:bg-gray-900 outline-none resize-none h-16"
                                                                   placeholder="Agrega una descripción para la materia o grupo..."
                                                               />
                                                               <div className="flex justify-end gap-1.5">
                                                                   <button type="button" onClick={() => setIsEditingGroupDesc(false)} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-gray-200 dark:bg-gray-700">Cancelar</button>
                                                                   <button type="button" onClick={handleSaveGroupDesc} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700">Guardar</button>
                                                               </div>
                                                           </div>
                                                       ) : (
                                                           <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                                               {grp.description || 'Sin descripción asignada por el docente.'}
                                                           </p>
                                                       )}
                                                   </div>
                                               </div>

                                               {/* Acciones de Grupo (Docente) */}
                                               {role === 'teacher' && (
                                                   <div>
                                                       <button 
                                                           type="button"
                                                           onClick={() => { setShowAddMembersModal(true); setSelectedNewMembers([]); setAddMemberSearch(""); }}
                                                           className="w-full p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs"
                                                       >
                                                           <UserPlus size={16} />
                                                           <span>Añadir integrantes</span>
                                                       </button>
                                                   </div>
                                               )}

                                               {/* Lista de Integrantes Adaptable a Modo Oscuro */}
                                               <div className={`rounded-2xl border overflow-hidden shadow-2xs ${
                                                   isDarkMode ? 'bg-gray-850 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                                               }`}>
                                                   <div className={`p-3 border-b flex items-center justify-between ${
                                                       isDarkMode ? 'border-gray-700 bg-gray-800/90' : 'border-gray-200 bg-gray-50/70'
                                                   }`}>
                                                       <div>
                                                           <h4 className="font-black text-xs">Integrantes ({membersList.length})</h4>
                                                           <p className="text-[10px] text-gray-500 dark:text-gray-400">Participantes activos en la sala</p>
                                                       </div>
                                                   </div>

                                                   {/* Buscador de Miembros */}
                                                   <div className={`p-2 border-b ${
                                                       isDarkMode ? 'border-gray-700/80 bg-gray-800/40' : 'border-gray-100 bg-gray-50'
                                                   }`}>
                                                       <div className="relative">
                                                           <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                           <input 
                                                               type="text"
                                                               value={groupInfoSearch}
                                                               onChange={e => setGroupInfoSearch(e.target.value)}
                                                               placeholder="Buscar participante..."
                                                               className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                                                                   isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                                                               }`}
                                                           />
                                                       </div>
                                                   </div>

                                                   {/* Lista scrollable de miembros */}
                                                   <div className={`divide-y max-h-64 overflow-y-auto ${
                                                       isDarkMode ? 'divide-gray-750' : 'divide-gray-100'
                                                   }`}>
                                                       {/* Docente / Administrador con Foto Real */}
                                                       {filteredMembers.includes('teacher') && (() => {
                                                           const teacherPhoto = userMappings['teacher']?.profilePicUrl || (role === 'teacher' ? auth.currentUser?.photoURL : null);
                                                           return (
                                                               <div className={`p-2.5 flex items-center justify-between transition-colors ${
                                                                   isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'
                                                               }`}>
                                                                   <div className="flex items-center gap-2.5 min-w-0">
                                                                       <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border border-white dark:border-gray-700">
                                                                           {teacherPhoto ? (
                                                                               <img src={teacherPhoto} alt={TEACHER_NAME} className="w-full h-full object-cover" />
                                                                           ) : (
                                                                               <TeacherIcon size={14} />
                                                                           )}
                                                                       </div>
                                                                   <div className="min-w-0">
                                                                       <div className="flex items-center gap-1.5">
                                                                           <p className="font-extrabold text-xs truncate">Gina Marcela Quintana</p>
                                                                           <span className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[9px]">Admin</span>
                                                                       </div>
                                                                       <p className="text-[10px] text-gray-500">Docente a cargo</p>
                                                                   </div>
                                                               </div>
                                                               {myChatId !== 'teacher' && (
                                                                   <button 
                                                                       type="button" 
                                                                       onClick={() => { setShowGroupInfo(false); handleOpenChat({ id: `dm_${[myChatId, 'teacher'].sort().join('_')}`, name: TEACHER_NAME, type: 'dm', role: 'teacher' }); }}
                                                                       className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                                       title="Mensaje privado"
                                                                   >
                                                                       <MessageCircle size={15} />
                                                                   </button>
                                                               )}
                                                                </div>
                                                            );
                                                        })()}

                                                       {/* Estudiantes */}
                                                       {filteredMembers.filter(m => m !== 'teacher').map(uk => {
                                                           const uData = userMappings[uk] || {};
                                                           const isOnline = userPresence[uk]?.status === 'online';
                                                           const isMe = uk === myChatId;

                                                           return (
                                                               <div key={uk} className={`p-2.5 flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'}`}>
                                                                   <div className="flex items-center gap-2.5 min-w-0">
                                                                       <div className="relative shrink-0">
                                                                           <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs border border-white dark:border-gray-700">
                                                                               {uData.profilePicUrl ? (
                                                                                   <img src={uData.profilePicUrl} alt={uData.fullName || uk} className="w-full h-full object-cover" />
                                                                               ) : (
                                                                                   (uData.fullName || uk).charAt(0).toUpperCase()
                                                                               )}
                                                                           </div>
                                                                           <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white dark:ring-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                                       </div>
                                                                       <div className="min-w-0">
                                                                           <p className="font-extrabold text-xs truncate">
                                                                               {uData.fullName || uk} {isMe && <span className="text-[10px] text-blue-500 font-bold">(Tú)</span>}
                                                                           </p>
                                                                           <p className="text-[10px] text-gray-500 truncate">@{uk}</p>
                                                                       </div>
                                                                   </div>

                                                                   <div className="flex items-center gap-1">
                                                                       {!isMe && (
                                                                           <button 
                                                                               type="button" 
                                                                               onClick={() => { setShowGroupInfo(false); handleOpenChat({ id: `dm_${[myChatId, uk].sort().join('_')}`, name: uData.fullName || uk, type: 'dm', role: 'student' }); }}
                                                                               className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                                               title="Mensaje privado"
                                                                           >
                                                                               <MessageCircle size={15} />
                                                                           </button>
                                                                       )}

                                                                       {/* Botón de Expulsar Miembro (Sólo Docente) */}
                                                                       {role === 'teacher' && !isMe && (
                                                                           <button 
                                                                               type="button" 
                                                                               onClick={() => handleRemoveGroupMember(uk, uData.fullName || uk)}
                                                                               className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                                               title="Remover del grupo"
                                                                           >
                                                                               <Trash2 size={15} />
                                                                           </button>
                                                                       )}
                                                                   </div>
                                                               </div>
                                                           );
                                                       })}
                                                   </div>
                                               </div>

                                               {/* Opciones de Salida o Eliminación */}
                                               <div className="pt-2">
                                                   {role !== 'teacher' ? (
                                                       <button 
                                                           type="button"
                                                           onClick={handleLeaveGroupChat}
                                                           className="w-full p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                                                       >
                                                           <LogOutIcon size={16} />
                                                           <span>Salir del grupo</span>
                                                       </button>
                                                   ) : (
                                                       <button 
                                                           type="button"
                                                           onClick={handleDeleteGroup}
                                                           className="w-full p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                                                       >
                                                           <Trash2 size={16} />
                                                           <span>Eliminar grupo</span>
                                                       </button>
                                                   )}
                                               </div>
                                           </div>
                                       );
                                   })() : (
                                       /* Cuerpo de Mensajes Normal */
                                  <div className="flex-1 relative overflow-hidden flex flex-col">
                                      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${currentPrefs.gradient ? 'bg-gradient-to-br ' + currentPrefs.gradient : (isDarkMode ? 'bg-gray-900' : 'bg-gray-50')}`} />
                                      <div className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay" style={{ ...activePattern, color: isDarkMode ? '#ffffff' : '#000000', opacity: 0.06 }} />

                                      <div className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                                          {chatMessages.length === 0 && (
                                              <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                                                  <MessageCircle size={36} className="text-gray-400 mb-2"/>
                                                  <p className="text-xs font-bold text-gray-500">Inicia la conversación</p>
                                                  <p className="text-[11px] text-gray-400">Saluda a {activeChat.name} 👋</p>
                                              </div>
                                          )}

                                          {chatMessages.map((m, index) => {
                                              const prevMsg = chatMessages[index - 1];
                                              const nextMsg = chatMessages[index + 1];
                                              
                                              const isFirstInGroup = !prevMsg || prevMsg.authorId !== m.authorId;
                                              const isLastInGroup = !nextMsg || nextMsg.authorId !== m.authorId;
                                              const showDateSeparator = !prevMsg || new Date(prevMsg.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                                  
                                              const isMe = m.authorId === myChatId;
                                              const isTeacher = m.author === TEACHER_NAME;
                                              const isEditingThis = editingAppMessageId === m.id;
                                              
                                              const bubbleRadius = isMe
                                                  ? `rounded-l-2xl ${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-[4px]'} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-[4px]'}`
                                                  : `rounded-r-2xl ${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-[4px]'} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-[4px]'}`;

                                              const isEmojiOnly = m.text && !m.imageUrl && !m.audioUrl && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(m.text.trim());
                                              const isImageOnly = m.imageUrl && !m.text && !m.audioUrl;
                                              const isAudioOnly = !!m.audioUrl && !m.text && !m.imageUrl && !m.fileUrl;
                                              const isYouTubeOnly = m.text && !m.imageUrl && !m.audioUrl && !m.fileUrl && m.text.trim().match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/[^\s]+$/i);
                                              const isTransparent = isEmojiOnly || isImageOnly || isAudioOnly || isYouTubeOnly;

                                              let tickIcon = null;
                                               if (isMe) {
                                                   const isGroupChat = activeChat.type === 'group';
                                                   const readByOthers = (m.readBy || []).filter(uid => uid !== myChatId);
                                                   const isRead = m.status === 'read' || readByOthers.length > 0;
                                                   const readTimeStr = m.readAt ? new Date(m.readAt).toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit', hour12: true}) : '';

                                                   if (isRead) {
                                                       const readTitle = isGroupChat 
                                                           ? `Leído por ${readByOthers.length} miembro(s)`
                                                           : (readTimeStr ? `Leído a las ${readTimeStr}` : 'Leído');
                                                       tickIcon = (
                                                           <div title={readTitle} className="inline-flex items-center cursor-help">
                                                               <DoubleTick size={13} className="text-blue-500 dark:text-blue-400" />
                                                           </div>
                                                       );
                                                   } else {
                                                       const targetId = !isGroupChat ? activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId) : null;
                                                       const isDelivered = isGroupChat || (targetId && userPresence[targetId]?.status === 'online');
                                                       if (isDelivered) {
                                                           tickIcon = (
                                                               <div title="Entregado" className="inline-flex items-center">
                                                                   <DoubleTick size={13} className={currentPrefs.gradient ? 'text-white/70' : 'text-gray-400'} />
                                                               </div>
                                                           );
                                                       } else {
                                                           tickIcon = (
                                                               <div title="Enviado" className="inline-flex items-center">
                                                                   <SingleTick size={13} className={currentPrefs.gradient ? 'text-white/70' : 'text-gray-400'} />
                                                               </div>
                                                           );
                                                       }
                                                   }
                                               }

                                               return (
                                                  <React.Fragment key={m.id}>
                                                      {showDateSeparator && (
                                                          <div className="flex justify-center my-3 z-10 relative">
                                                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-md ${currentPrefs.gradient ? 'bg-black/20 text-white border border-white/20' : (isDarkMode ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-white text-gray-500 border border-gray-200')}`}>
                                                                  {formatChatDate(m.createdAt)}
                                                              </span>
                                                          </div>
                                                      )}
                                                      <div id={`msg-${m.id}`} className={`flex flex-col w-full group relative transition-all duration-200 animate-in fade-in slide-in-from-bottom-1 ${isMe ? 'items-end' : 'items-start'} ${isLastInGroup ? 'mb-2.5' : 'mb-[2px]'}`}>
                                                          
                                                          {!isMe && activeChat.type === 'group' && isFirstInGroup && <span className={`text-[10px] font-bold mb-0.5 px-1 ${isTeacher ? 'text-[#AD3333] dark:text-[#ff6b6b]' : (currentPrefs.gradient ? 'text-white' : (isDarkMode ? 'text-gray-300' : 'text-gray-600'))}`}>{m.author}</span>}
                                                          
                                                          <div className={`relative max-w-[90%] sm:max-w-[85%] flex items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                              
                                                              {/* Burbuja Principal */}
                                                              <div className={isTransparent ? 'relative' : `px-3 py-2 shadow-xs relative backdrop-blur-xl border transition-all duration-200 ${bubbleRadius} ${isMe ? (currentPrefs.gradient ? 'bg-black/30 border-white/20 text-white' : (isDarkMode ? 'bg-blue-600/90 text-white border-blue-500/50' : 'bg-blue-600/90 text-white border-blue-500/20')) : (currentPrefs.gradient ? 'bg-white/30 border-white/40 text-gray-900 dark:bg-black/20 dark:border-white/10 dark:text-gray-100' : (isDarkMode ? 'bg-gray-800/80 text-gray-100 border-gray-700/50' : 'bg-white/80 text-gray-800 border-gray-200/50'))}`}>
                                                                  
                                                                  {/* Referencia a Mensaje Respondido */}
                                                                  {m.replyTo && (
                                                                      <div className={`mb-1.5 pl-2.5 border-l-2 rounded-r-md py-1 ${isMe ? 'border-blue-300 bg-black/10' : 'border-gray-400 bg-gray-500/10'} text-[11px] opacity-90 cursor-pointer`} onClick={() => { const el = document.getElementById(`msg-${m.replyTo.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                                                                          <p className="font-bold opacity-90">{m.replyTo.author}</p>
                                                                          <p className="truncate max-w-[180px] opacity-80">{m.replyTo.text || (m.replyTo.imageUrl ? '📷 Imagen' : '')}</p>
                                                                      </div>
                                                                  )}
                                                                  
                                                                  {isEditingThis ? (
                                                                      <div className="flex gap-2 items-center min-w-[180px] bg-black/40 p-1.5 rounded-xl backdrop-blur-md">
                                                                          <input className="py-1 px-2 text-xs flex-1 rounded bg-white/20 outline-none text-white placeholder-white/50" value={editAppMessageText} onChange={e => setEditAppMessageText(e.target.value)} autoFocus />
                                                                          <button onClick={handleEditAppMessage} className="text-green-300 hover:text-green-400" title="Guardar"><CheckLine size={16}/></button>
                                                                          <button onClick={() => setEditingAppMessageId(null)} className="text-red-300 hover:text-red-400" title="Cancelar"><XLine size={16}/></button>
                                                                      </div>
                                                                  ) : (
                                                                      <div className="flex flex-col">
                                                                          {m.text && (
                                                                              <div>
                                                                                  {chatTranslations[m.id] ? (
                                                                                      <div className="space-y-1">
                                                                                          <div className="flex items-center gap-1 text-[10px] font-bold opacity-90 text-blue-200">
                                                                                              <button type="button" onClick={() => handleTranslateMessage(m.id, m.text)} className="underline hover:opacity-75 flex items-center gap-1">
                                                                                                  <Languages size={10} /> Ver original
                                                                                              </button>
                                                                                          </div>
                                                                                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap pr-6">
                                                                                              <LinkifyText text={chatTranslations[m.id]} />
                                                                                          </p>
                                                                                      </div>
                                                                                  ) : (
                                                                                      <p className={isEmojiOnly ? "text-4xl drop-shadow-md leading-none py-1" : "text-xs sm:text-sm leading-relaxed whitespace-pre-wrap pr-6"}>
                                                                                          <LinkifyText text={m.text} />
                                                                                      </p>
                                                                                  )}
                                                                                  {translatingMsgIds[m.id] && (
                                                                                      <span className="text-[10px] italic opacity-80 animate-pulse block mt-0.5">Traduciendo...</span>
                                                                                  )}
                                                                              </div>
                                                                          )}
                                                                          
                                                                          {/* Reproductor de Nota de Voz estilo WhatsApp */}
                                                                          {m.audioUrl && (
                                                                              <div className={isAudioOnly ? "relative flex flex-col" : "mt-1.5"}>
                                                                                  <AudioPlayer src={m.audioUrl} title="Nota de voz" isDarkMode={isDarkMode} isMe={isMe} compact={true} />
                                                                              </div>
                                                                          )}

                                                                          {m.imageUrl && <img src={m.imageUrl} loading="lazy" decoding="async" alt="Adjunto" onLoad={() => chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })} onClick={() => setFullScreenImage(m.imageUrl)} className={isImageOnly ? "rounded-2xl max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-md" : "mt-1.5 rounded-xl max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity bg-black/10 border border-white/20"} />}
                                                                          
                                                                          {m.fileUrl && (
                                                                              <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-xl mt-1 w-fit transition-colors border ${isMe ? 'bg-white/20 border-white/30 text-white' : 'bg-black/10 border-black/10 dark:bg-white/10 dark:border-white/10 text-gray-800 dark:text-gray-100'}`}>
                                                                                  <div className="bg-red-500 p-1 rounded-lg"><FileDocIcon size={15} className="text-white" /></div>
                                                                                  <span className="text-xs font-medium truncate max-w-[140px]">{m.fileName || 'Documento'}</span>
                                                                              </a>
                                                                          )}
                                                                          
                                                                          {/* Hora y Ticks INCRUSTADOS */}
                                                                          {!isTransparent && (
                                                                              <div className={`flex items-center justify-end gap-1 mt-0.5 opacity-80 ${isMe ? 'text-blue-100' : (isDarkMode || currentPrefs.gradient ? 'text-gray-400' : 'text-gray-500')} ${isEmojiOnly ? 'relative' : '-mb-0.5 -mr-0.5'}`}>
                                                                                  <span className="text-[9px] font-medium leading-none">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                                  {m.isEdited && <span className="text-[8px] italic leading-none">(editado)</span>}
                                                                                  {tickIcon}
                                                                              </div>
                                                                          )}
                                                                      </div>
                                                                  )}

                                                                  {/* Reacciones */}
                                                                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                                                                      <div className={`flex gap-1 z-20 transition-all duration-300 absolute -bottom-2.5 ${isMe ? '-left-2' : '-right-2'}`}>
                                                                          {Array.from(new Set(Object.values(m.reactions))).map((emoji, idx) => {
                                                                              const reactorsIds = Object.keys(m.reactions).filter(uid => m.reactions[uid] === emoji);
                                                                              const count = reactorsIds.length;
                                                                              return (
                                                                                  <div key={idx} className="relative inline-flex items-center cursor-help">
                                                                                      <span className="text-base drop-shadow-sm">{emoji}</span>
                                                                                      {count > 1 && <span className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[9px] font-bold rounded-full px-1 shadow-xs border border-gray-200 dark:border-gray-700">{count}</span>}
                                                                                  </div>
                                                                              );
                                                                          })}
                                                                      </div>
                                                                  )}
                                                              </div>

                                                              {/* Botones de Acción Flotantes al Hover */}
                                                              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-10 ${isMe ? 'right-full mr-1.5' : 'left-full ml-1.5'}`}>
                                                                  <button onClick={() => setActiveChatReactionMsgId(activeChatReactionMsgId === m.id ? null : m.id)} className="p-1 rounded-full shadow-xs bg-white/90 text-gray-600 hover:bg-white dark:bg-gray-800 dark:text-gray-300" title="Reaccionar"><SmileIcon size={13}/></button>
                                                                  <button onClick={() => setReplyingTo(m)} className="p-1 rounded-full shadow-xs bg-white/90 text-gray-600 hover:bg-white dark:bg-gray-800 dark:text-gray-300" title="Responder"><ReplyIcon size={13}/></button>
                                                                  
                                                                  {activeChatReactionMsgId === m.id && (
                                                                      <div className={`absolute bottom-full mb-1.5 ${isMe ? 'right-0' : 'left-0'} flex gap-1 rounded-full px-2.5 py-1 border shadow-lg z-[99999] animate-in fade-in zoom-in-95 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                                                                          {['❤️','👍','😂','😲', '🙏', '🔥'].map(emj => (
                                                                              <button key={emj} onClick={() => toggleChatAppReaction(m.id, emj)} className="hover:scale-125 transition-transform text-base">{emj}</button>
                                                                          ))}
                                                                      </div>
                                                                  )}

                                                                  {isMe && !isEditingThis && (
                                                                      <>
                                                                          <button onClick={() => {setEditingAppMessageId(m.id); setEditAppMessageText(m.text || "");}} className="p-1 rounded-full shadow-xs bg-white/90 text-gray-600 hover:bg-white dark:bg-gray-800 dark:text-gray-300" title="Editar"><Edit3 size={13}/></button>
                                                                          <button onClick={() => confirmAction("¿Deseas eliminar este mensaje para todos?", () => handleDeleteAppMessage(m.id))} className="p-1 rounded-full shadow-xs bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400" title="Eliminar"><Trash2 size={13}/></button>
                                                                      </>
                                                                  )}
                                                              </div>

                                                          </div>

                                                          {isTransparent && !isEditingThis && (
                                                              <div className={`flex items-center gap-1 mt-0.5 px-1 opacity-70 ${isMe ? 'flex-row-reverse text-gray-500' : 'flex-row text-gray-500'}`}>
                                                                  <span className="text-[9px] drop-shadow-xs font-medium">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                  {m.isEdited && <span className="text-[8px] italic">(editado)</span>}
                                                                  {tickIcon}
                                                              </div>
                                                          )}

                                                      </div>
                                                  </React.Fragment>
                                              );
                                          })}
                                          {/* Burbuja animada de escribiendo en tiempo real */}
                                           {(() => {
                                               if (activeChat.type === 'group') {
                                                   const typingInGroup = typingStatus[activeChat.id] || {};
                                                   const typers = Object.entries(typingInGroup)
                                                       .filter(([uid, val]) => uid !== myChatId && (val === true || (typeof val === 'object' && val.isTyping)))
                                                       .map(([uid, val]) => (typeof val === 'object' && val.name) ? val.name.split(' ')[0] : (userMappings[uid]?.fullName?.split(' ')[0] || (uid === 'teacher' ? 'Gina' : uid)));
                                                   if (typers.length === 0) return null;
                                                   return (
                                                       <div className="flex items-center gap-2 py-1.5 px-3 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 w-fit text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-bottom-1">
                                                           <span className="font-bold text-emerald-600 dark:text-emerald-400">{typers.join(', ')}</span> {typers.length === 1 ? 'está escribiendo' : 'están escribiendo'}
                                                           <span className="flex gap-0.5 items-center ml-0.5">
                                                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                           </span>
                                                       </div>
                                                   );
                                               } else {
                                                   const targetId = activeChat.id.split('_').find(id => id !== 'dm' && id !== myChatId);
                                                   const isTyping = typingStatus[activeChat.id]?.[targetId];
                                                   if (!isTyping || (typeof isTyping === 'object' && !isTyping.isTyping)) return null;
                                                   const targetName = userMappings[targetId]?.fullName?.split(' ')[0] || activeChat.name?.split(' ')[0] || 'Usuario';
                                                   return (
                                                       <div className="flex items-center gap-2 py-1.5 px-3 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 w-fit text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-bottom-1">
                                                           <span>{targetName} está escribiendo</span>
                                                           <span className="flex gap-0.5 items-center ml-0.5">
                                                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                           </span>
                                                       </div>
                                                   );
                                               }
                                           })()}
                                           <div ref={chatMessagesEndRef} />
                                      </div>

                                      {/* Pie de Envío de Mensajes */}
                                      <form onSubmit={handleSendAppMessage} className={`p-2.5 pb-safe px-3 border-t shrink-0 flex flex-col gap-2 relative z-30 ${isDarkMode ? 'bg-gray-800/95 backdrop-blur-md border-gray-700' : 'bg-white/95 backdrop-blur-md border-gray-200'}`}>
                                          {replyingTo && (
                                              <div className={`flex justify-between items-center px-3 py-1 rounded-xl border-l-3 border-blue-500 text-xs shadow-xs ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                                  <div className="flex flex-col min-w-0">
                                                      <span className="font-bold text-blue-500 truncate">Respondiendo a {replyingTo.author}</span>
                                                      <span className="truncate opacity-80">{replyingTo.text || (replyingTo.imageUrl ? '📷 Imagen' : '')}</span>
                                                  </div>
                                                  <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-red-500 ml-2 p-0.5 rounded-full"><X size={14}/></button>
                                              </div>
                                          )}

                                          {isRecording && (
                                              <div className="mb-0.5">
                                                  <AudioRecordingVisualizer
                                                      recordingTime={chatRecordingTime}
                                                      onStop={toggleVoiceRecording}
                                                      onCancel={cancelVoiceRecording}
                                                      isDarkMode={isDarkMode}
                                                  />
                                              </div>
                                          )}
                                          
                                          {/* Input bar flotante estilo Messenger */}
                                          <div className={`flex gap-1.5 items-center bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl pl-2 pr-1.5 py-1 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all`}>
                                              
                                              <div className="relative">
                                                  <button type="button" onClick={() => setShowChatAppEmojiPicker(!showChatAppEmojiPicker)} className={`p-1.5 bg-transparent transition-colors rounded-full ${showChatAppEmojiPicker ? 'text-blue-500' : (isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600')}`}>
                                                      <SmileIcon size={18} />
                                                  </button>

                                                  {showChatAppEmojiPicker && (
                                                      <div className={`absolute bottom-full left-0 mb-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl p-2 flex flex-col gap-1 z-[99999] animate-in fade-in zoom-in-95 duration-150`}>
                                                          {COMMENT_EMOJIS.map(emj => (
                                                              <button key={emj} type="button" onClick={() => {setChatAppInput(chatAppInput + emj); setShowChatAppEmojiPicker(false);}} className="text-2xl hover:scale-125 transition-transform">{emj}</button>
                                                          ))}
                                                      </div>
                                                  )}
                                              </div>

                                              <div className="relative">
                                                  <input 
                                                      type="file" 
                                                      ref={chatImageInputRef} 
                                                      accept="image/*" 
                                                      onChange={handleChatAppImageUpload} 
                                                      className="hidden" 
                                                  />
                                                  <input 
                                                      type="file" 
                                                      ref={chatDocInputRef} 
                                                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" 
                                                      onChange={handleChatAppDocUpload} 
                                                      className="hidden" 
                                                  />

                                                  <button type="button" onClick={() => setShowChatAppAttachmentMenu(!showChatAppAttachmentMenu)} className={`p-1.5 bg-transparent transition-colors rounded-full ${showChatAppAttachmentMenu ? 'text-blue-500' : (isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600')}`} title="Adjuntar">
                                                      <PaperclipIcon size={17} />
                                                  </button>

                                                  {showChatAppAttachmentMenu && (
                                                      <div className={`absolute bottom-full left-0 mb-3 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-1 z-[99999] animate-in fade-in zoom-in-95 duration-150 text-xs font-bold`}>
                                                          <button 
                                                              type="button" 
                                                              onClick={() => { chatImageInputRef.current?.click(); setShowChatAppAttachmentMenu(false); }} 
                                                              className="flex items-center gap-2.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left text-gray-800 dark:text-gray-200"
                                                          >
                                                              <ImageIcon size={16} className="text-blue-500"/> Subir imagen
                                                          </button>
                                                          <button 
                                                              type="button" 
                                                              onClick={() => { chatDocInputRef.current?.click(); setShowChatAppAttachmentMenu(false); }} 
                                                              className="flex items-center gap-2.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left text-gray-800 dark:text-gray-200"
                                                          >
                                                              <FileDocIcon size={16} className="text-purple-500"/> Subir documento
                                                          </button>
                                                      </div>
                                                  )}
                                              </div>

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
                                                  className={`flex-1 min-w-0 bg-transparent border-none outline-none py-1.5 px-1.5 text-xs font-medium ${isDarkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} 
                                              />

                                              {/* Botón de Micrófono para Nota de Voz */}
                                              {!chatAppInput.trim() && !chatAppImageUrl && !chatAppFileUrl && !chatAppAudioUrl && (
                                                  <button 
                                                      type="button" 
                                                      onClick={toggleVoiceRecording} 
                                                      className={`p-1.5 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : (isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-200/60')}`}
                                                      title="Grabar nota de voz"
                                                  >
                                                      <Mic size={18} />
                                                  </button>
                                              )}
                                              
                                              {/* Botón de Enviar */}
                                              <button 
                                                  type="submit" 
                                                  disabled={!chatAppInput.trim() && !chatAppImageUrl && !chatAppFileUrl && !chatAppAudioUrl} 
                                                  className={`w-7 h-7 rounded-xl shrink-0 transition-all flex items-center justify-center shadow-xs disabled:shadow-none disabled:opacity-40 ${(chatAppInput.trim() || chatAppImageUrl || chatAppFileUrl || chatAppAudioUrl) ? 'bg-blue-600 text-white hover:bg-blue-700 scale-100' : (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400')}`}
                                              >
                                                  <Send size={14} />
                                              </button>
                                          </div>

                                          {/* Previews de adjuntos */}
                                          {chatAppAudioUrl && (
                                              <div className="relative w-fit mt-1">
                                                  <AudioPlayer src={chatAppAudioUrl} title="Nota de voz lista" isDarkMode={isDarkMode} onDelete={() => setChatAppAudioUrl("")} compact={true} />
                                              </div>
                                          )}
                                          {chatAppImageUrl && (
                                              <div className="relative w-fit mt-1.5">
                                                  <img src={chatAppImageUrl} alt="Preview" className={`h-16 w-16 object-cover rounded-xl border shadow-xs ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} onError={(e) => e.target.style.display = 'none'} />
                                                  <button type="button" onClick={() => setChatAppImageUrl("")} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 transition shadow-xs"><X size={12}/></button>
                                              </div>
                                          )}
                                          {chatAppFileUrl && (
                                              <div className="relative w-fit mt-1.5 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300 font-bold">
                                                  <FileDocIcon size={14} className="text-purple-500" />
                                                  <span className="max-w-[180px] truncate">{chatAppFileName || 'Documento adjunto'}</span>
                                                  <button type="button" onClick={() => { setChatAppFileUrl(""); setChatAppFileName(""); }} className="text-red-500 hover:text-red-700 ml-1 p-0.5"><X size={12}/></button>
                                              </div>
                                          )}
                                      </form>
                                    </div>
                                    )}
                                </div>
                            );
                        })()
                  ),
                  document.body
              )}

              {showSugModal && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                      <div className={`max-w-md w-full rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 border relative animate-in zoom-in-95 duration-200 ${
                          isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}>
                          {/* Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0 shadow-xs">
                                      <Mail size={20} />
                                  </div>
                                  <div>
                                      <h3 className="text-base font-extrabold flex items-center gap-1.5">
                                          Sugerencias
                                      </h3>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                          Espacio para retroalimentación constructiva de las clases
                                      </p>
                                  </div>
                              </div>
                              <button 
                                  type="button" 
                                  onClick={() => { setShowSugModal(false); setSugText(""); setSugCategory(""); }} 
                                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                  <X size={18}/>
                              </button>
                          </div>

                          {/* Chips de Categorías Rápidas */}
                          <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                                  Tipo de idea (opcional):
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                  {[
                                      { key: 'Metodología', label: 'Metodología', icon: '💡' },
                                      { key: 'Material de apoyo', label: 'Material de apoyo', icon: '📚' },
                                      { key: 'Dinámica en clase', label: 'Dinámica en clase', icon: '🎯' },
                                      { key: 'Pregunta pedagógica', label: 'Pregunta pedagógica', icon: '❓' },
                                  ].map(chip => {
                                      const isSelected = sugCategory === chip.key;
                                      return (
                                          <button
                                              key={chip.key}
                                              type="button"
                                              onClick={() => setSugCategory(prev => prev === chip.key ? "" : chip.key)}
                                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 ${
                                                  isSelected
                                                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-[1.02]'
                                                      : isDarkMode ? 'bg-gray-800/90 border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                              }`}
                                          >
                                              <span>{chip.icon}</span>
                                              <span className="truncate">{chip.label}</span>
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* Formulario */}
                          <form onSubmit={handleSubmitSuggestion} className="flex flex-col gap-3">
                              <div className="relative">
                                  <textarea 
                                      value={sugText} 
                                      onChange={e => setSugText(e.target.value)} 
                                      maxLength={500}
                                      placeholder="Escribe tu sugerencia, propuesta o comentario sobre la materia aquí..." 
                                      className={`w-full h-32 rounded-2xl p-3.5 text-xs sm:text-sm outline-none border resize-none transition-all focus:ring-2 ${
                                          isDarkMode 
                                              ? 'bg-gray-800/80 border-gray-700 text-gray-100 focus:ring-amber-500/50 placeholder-gray-500' 
                                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-amber-400/50 placeholder-gray-400'
                                      }`} 
                                      required 
                                  />
                                  <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-gray-400">
                                      {sugText.length}/500
                                  </span>
                              </div>

                              <div className="flex items-center justify-end gap-2 mt-1">
                                  <button
                                      type="button"
                                      onClick={() => { setShowSugModal(false); setSugText(""); setSugCategory(""); }}
                                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                          isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                                      }`}
                                  >
                                      Cancelar
                                  </button>
                                  <button 
                                      type="submit" 
                                      disabled={isSugLoading || !sugText.trim()} 
                                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all disabled:opacity-40 flex items-center gap-2"
                                  >
                                      {isSugLoading ? <Loader2 className="animate-spin" size={15}/> : <Send size={14} />}
                                      <span>Enviar sugerencia</span>
                                  </button>
                              </div>
                          </form>
                      </div>
                  </div>
              , document.body)}

              {toastMessage && (
                <div className="fixed bottom-24 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-medium text-sm text-center border border-gray-700 whitespace-nowrap">
                  {toastMessage}
                </div>
              )}

              {/* MODAL IMAGEN PANTALLA COMPLETA (APP) */}
              {fullScreenImage && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
                      <button className="absolute top-4 md:top-8 right-4 md:right-8 text-white/70 hover:text-white bg-black/50 hover:bg-red-600 p-2 rounded-full transition-all shadow-lg"><X size={28}/></button>
<img src={fullScreenImage} loading="lazy" className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                  </div>
              , document.body)}

              {/* MODAL GLOBAL DE CONFIRMACIÓN */}
              {globalGifCallback && ReactDOM.createPortal(<React.Suspense fallback={null}><GifPickerModal onSelect={(url) => { globalGifCallback(url); setGlobalGifCallback(null); }} onClose={() => setGlobalGifCallback(null)} isDarkMode={isDarkMode} /></React.Suspense>, document.body)}
                {confirmDialog?.isOpen && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                      <div className={`max-w-sm w-full flex flex-col gap-4 p-6 rounded-3xl animate-in fade-in zoom-in duration-200 shadow-2xl ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                          <h3 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                              {confirmDialog.title || (confirmDialog.isDestructive ? 'Confirmar acción' : 'Confirmar')}
                          </h3>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{confirmDialog.message}</p>
                          <div className="flex gap-3 mt-4">
                                  <button onClick={() => setConfirmDialog({ isOpen: false })} className={`flex-1 py-2.5 rounded-xl font-bold transition-all shadow-sm ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>Cancelar</button>
                                  <button 
                                      onClick={() => { if (confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false }); }} 
                                      className={`flex-1 text-white py-2.5 rounded-xl font-bold transition-all shadow-md ${confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                  >
                                      {confirmDialog.confirmText || (confirmDialog.isDestructive ? 'Sí, eliminar' : 'Sí, continuar')}
                                  </button>
                              </div>
                          </div>
                      </div>
                  , document.body)}

                  {/* MODAL / DRAWER DE MENÚ MÓVIL ESTILO FACEBOOK APP */}
              {isMobileMenuOpen && ReactDOM.createPortal(
                  <div 
                      className="fixed inset-0 z-[99999] md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                  >
                      <div 
                          className={`w-full max-h-[85vh] rounded-t-3xl border-t shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ${
                              isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                          onClick={e => e.stopPropagation()}
                      >
                          {/* Cabecera del Menú */}
                          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                              <div className="flex items-center gap-3 min-w-0">
                                  {(() => {
                                      const userPhoto = userMappings[myChatId]?.profilePicUrl || (role === 'teacher' ? userMappings['teacher']?.profilePicUrl : null) || auth.currentUser?.photoURL;
                                      return (
                                          <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-xs border-2 border-white dark:border-gray-700 shrink-0 ${
                                              role === 'teacher' ? 'bg-gradient-to-br from-[#AD3333] to-[#8a2828]' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                          }`}>
                                              {userPhoto ? (
                                                  <img src={userPhoto} alt={loggedInName} className="w-full h-full object-cover" />
                                              ) : (
                                                  loggedInName?.charAt(0).toUpperCase() || 'U'
                                              )}
                                          </div>
                                      );
                                  })()}
                                  <div className="min-w-0">
                                      <h3 className="font-extrabold text-sm truncate">{loggedInName}</h3>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                          {role === 'teacher' ? 'Docente a cargo' : 'Estudiante'}
                                      </p>
                                  </div>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                  <X size={20} />
                              </button>
                          </div>

                          {/* Contenido del Menú Deslizante */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
                              {/* Sección: Accesos Principales */}
                              <div>
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 mb-2">
                                      Secciones y contenidos
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2.5">
                                      {/* Evaluaciones (Renombrado desde 'Notas') */}
                                      <button
                                          type="button"
                                          onClick={() => { setIsMobileMenuOpen(false); changeTab('evaluations'); }}
                                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 shadow-2xs hover:scale-[1.01] active:scale-95 ${
                                              activeTab === 'evaluations'
                                                  ? (isDarkMode ? 'bg-red-950/40 border-red-800' : 'bg-red-50 border-red-200')
                                                  : (isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200')
                                          }`}
                                      >
                                          <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shadow-xs">
                                              <NavFile size={18} />
                                          </div>
                                          <div>
                                              <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">Evaluaciones</p>
                                              <p className="text-[10px] text-gray-500 truncate">Pruebas y cuestionarios</p>
                                          </div>
                                      </button>

                                      {/* Diapositivas */}
                                      <button
                                          type="button"
                                          onClick={() => { setIsMobileMenuOpen(false); changeTab('reviews'); }}
                                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 shadow-2xs hover:scale-[1.01] active:scale-95 ${
                                              activeTab === 'reviews'
                                                  ? (isDarkMode ? 'bg-amber-950/40 border-amber-800' : 'bg-amber-50 border-amber-200')
                                                  : (isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200')
                                          }`}
                                      >
                                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-xs">
                                              <NavSlides size={18} />
                                          </div>
                                          <div>
                                              <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">Diapositivas</p>
                                              <p className="text-[10px] text-gray-500 truncate">Material de clase</p>
                                          </div>
                                      </button>

                                      {/* Syllabus */}
                                      <button
                                          type="button"
                                          onClick={() => { setIsMobileMenuOpen(false); changeTab('syllabus'); }}
                                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 shadow-2xs hover:scale-[1.01] active:scale-95 ${
                                              activeTab === 'syllabus'
                                                  ? (isDarkMode ? 'bg-emerald-950/40 border-emerald-800' : 'bg-emerald-50 border-emerald-200')
                                                  : (isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200')
                                          }`}
                                      >
                                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
                                              <NavCalendar size={18} />
                                          </div>
                                          <div>
                                              <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">Syllabus</p>
                                              <p className="text-[10px] text-gray-500 truncate">Plan y cronograma</p>
                                          </div>
                                      </button>

                                      {/* Directorio (Visible para docente) */}
                                      {role === 'teacher' && (
                                          <button
                                              type="button"
                                              onClick={() => { setIsMobileMenuOpen(false); changeTab('directory'); }}
                                              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 shadow-2xs hover:scale-[1.01] active:scale-95 ${
                                                  activeTab === 'directory'
                                                      ? (isDarkMode ? 'bg-blue-950/40 border-blue-800' : 'bg-blue-50 border-blue-200')
                                                      : (isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200')
                                              }`}
                                          >
                                              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-xs">
                                                  <UsersIcon size={18} />
                                              </div>
                                              <div>
                                                  <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">Directorio</p>
                                                  <p className="text-[10px] text-gray-500 truncate">Alumnos y materias</p>
                                              </div>
                                          </button>
                                      )}
                                  </div>
                              </div>

                              {/* Sección: Configuración y Cuenta */}
                              <div>
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 mb-2">
                                      Cuenta y ajustes
                                  </h4>
                                  <div className={`rounded-2xl border overflow-hidden divide-y ${
                                      isDarkMode ? 'bg-gray-800/80 border-gray-700 divide-gray-700/60' : 'bg-white border-gray-200 divide-gray-100 shadow-2xs'
                                  }`}>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setIsMobileMenuOpen(false);
                                              if (role === 'teacher') {
                                                  setViewingProfileId('teacher');
                                                  changeTab('profile', 'teacher');
                                              } else {
                                                  setViewingProfileId(myChatId);
                                                  changeTab('profile', myChatId);
                                              }
                                          }}
                                          className="w-full flex items-center justify-between p-3.5 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                                  <UserIcon size={16} />
                                              </div>
                                              <span className="text-xs font-bold">Mi perfil</span>
                                          </div>
                                          <ChevronRight size={16} className="text-gray-400" />
                                      </button>

                                      <button
                                          type="button"
                                          onClick={() => {
                                              setIsMobileMenuOpen(false);
                                              setShowSettingsModal(true);
                                          }}
                                          className="w-full flex items-center justify-between p-3.5 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 flex items-center justify-center">
                                                  <Settings size={16} />
                                              </div>
                                              <span className="text-xs font-bold">Ajustes y sugerencias</span>
                                          </div>
                                          <ChevronRight size={16} className="text-gray-400" />
                                      </button>

                                      <button
                                          type="button"
                                          onClick={() => {
                                              setIsMobileMenuOpen(false);
                                              handleSignOut();
                                          }}
                                          className="w-full flex items-center justify-between p-3.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left text-red-600 dark:text-red-400"
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                                                  <LogOutIcon size={16} />
                                              </div>
                                              <span className="text-xs font-bold">Cerrar sesión</span>
                                          </div>
                                          <ChevronRight size={16} className="text-red-400" />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              , document.body)}

              {/* MODAL PARA AÑADIR MIEMBROS AL GRUPO */}
              {showAddMembersModal && activeChat && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                      <div className={`max-w-md w-full rounded-3xl shadow-2xl p-5 flex flex-col gap-4 border animate-in zoom-in-95 duration-200 ${
                          isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}>
                          {/* Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
                                      <UserPlus size={18} />
                                  </div>
                                  <div>
                                      <h3 className="text-sm font-extrabold">Añadir integrantes</h3>
                                      <p className="text-[11px] text-gray-500">Selecciona los alumnos a inscribir</p>
                                  </div>
                              </div>
                              <button 
                                  type="button" 
                                  onClick={() => { setShowAddMembersModal(false); setSelectedNewMembers([]); }}
                                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                  <X size={18} />
                              </button>
                          </div>

                          {/* Buscador */}
                          <div className="relative">
                              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                  type="text"
                                  value={addMemberSearch}
                                  onChange={e => setAddMemberSearch(e.target.value)}
                                  placeholder="Buscar estudiante por nombre o usuario..."
                                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none ${
                                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                  }`}
                              />
                          </div>

                          {/* Lista de Alumnos Disponibles */}
                          <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
                              {(() => {
                                  const grp = chatGroups.find(g => g.id === activeChat.id || `group_${g.id}` === activeChat.id || `acad_${g.academicGroupId}` === activeChat.id || `acad_${g.id}` === activeChat.id) || activeChat;
                                  const currentMembers = grp.members || [];
                                  const availableStudents = Object.entries(userMappings || {})
                                      .filter(([uk]) => !currentMembers.includes(uk))
                                      .filter(([uk, data]) => {
                                          const term = addMemberSearch.toLowerCase();
                                          return uk.toLowerCase().includes(term) || (data.fullName || '').toLowerCase().includes(term) || (data.email || '').toLowerCase().includes(term);
                                      });

                                  if (availableStudents.length === 0) {
                                      return (
                                          <p className="text-center py-6 text-xs text-gray-400">
                                              No hay más alumnos disponibles para agregar.
                                          </p>
                                      );
                                  }

                                  return availableStudents.map(([uk, data]) => {
                                      const isSelected = selectedNewMembers.includes(uk);
                                      return (
                                          <label 
                                              key={uk} 
                                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                                                  isSelected 
                                                      ? 'bg-blue-500/10 border border-blue-500/30' 
                                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                              }`}
                                          >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                                                      {data.profilePicUrl ? <img src={data.profilePicUrl} alt={data.fullName} className="w-full h-full object-cover" /> : (data.fullName || uk).charAt(0).toUpperCase()}
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="font-extrabold text-xs truncate">{data.fullName || uk}</p>
                                                      <p className="text-[10px] text-gray-500 truncate">@{uk}</p>
                                                  </div>
                                              </div>
                                              <input 
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => {
                                                      setSelectedNewMembers(prev => 
                                                          prev.includes(uk) ? prev.filter(k => k !== uk) : [...prev, uk]
                                                      );
                                                  }}
                                                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                                              />
                                          </label>
                                      );
                                  });
                              })()}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                              <button 
                                  type="button" 
                                  onClick={() => { setShowAddMembersModal(false); setSelectedNewMembers([]); }}
                                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                              >
                                  Cancelar
                              </button>
                              <button 
                                  type="button" 
                                  disabled={selectedNewMembers.length === 0}
                                  onClick={handleAddMembersToCurrentGroup}
                                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl shadow-xs transition-all"
                              >
                                  Añadir ({selectedNewMembers.length})
                              </button>
                          </div>
                      </div>
                  </div>
              , document.body)}

              {/* MODAL INTERACTIVO DE LISTA DE INTEGRANTES DE GRUPO */}
              {groupMembersModal?.isOpen && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
                      <div className={`w-full max-w-md max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                          isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}>
                          {/* Cabecera del Modal */}
                          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                      {groupMembersModal.group?.avatarUrl ? (
                                          <img src={groupMembersModal.group.avatarUrl} alt={groupMembersModal.group.name} className="w-full h-full object-cover" />
                                      ) : (
                                          renderGroupVectorIcon(groupMembersModal.group?.emoji || 'BookOpen', 20, "text-teal-600 dark:text-teal-400")
                                      )}
                                  </div>
                                  <div className="min-w-0">
                                      <h3 className="font-extrabold text-sm sm:text-base truncate">
                                          {groupMembersModal.group?.name || 'Grupo'}
                                      </h3>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                                          <span>Integrantes</span>
                                          <span>•</span>
                                          <span className="font-bold text-teal-600 dark:text-teal-400">
                                              {(groupMembersModal.group?.members || []).length} miembros
                                          </span>
                                      </p>
                                  </div>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => setGroupMembersModal({ isOpen: false, group: null, search: "" })}
                                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                  <X size={18} />
                              </button>
                          </div>

                          {/* Buscador de Miembros */}
                          <div className="p-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30">
                              <div className="relative">
                                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                  <input
                                      type="text"
                                      value={groupMembersModal.search || ""}
                                      onChange={(e) => setGroupMembersModal(prev => ({ ...prev, search: e.target.value }))}
                                      placeholder="Buscar estudiante por nombre o correo..."
                                      className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border outline-none transition-all ${
                                          isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-teal-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-teal-500'
                                      }`}
                                  />
                              </div>
                          </div>

                          {/* Lista de Miembros */}
                          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-gray-100 dark:divide-gray-800/60">
                              {/* Docente / Creador */}
                              <div className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white flex items-center justify-center font-bold text-xs shrink-0 border-2 border-white dark:border-gray-700 shadow-2xs">
                                          {userMappings['teacher']?.profilePicUrl ? (
                                              <img src={userMappings['teacher'].profilePicUrl} alt={TEACHER_NAME} className="w-full h-full object-cover" />
                                          ) : (
                                              'G'
                                          )}
                                      </div>
                                      <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                              <p className="font-bold text-xs truncate">{TEACHER_NAME}</p>
                                              <span className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold text-[9px] uppercase">
                                                  Docente
                                              </span>
                                          </div>
                                          <p className="text-[10px] text-gray-500 truncate">Docente a cargo</p>
                                      </div>
                                  </div>
                                  {role === 'student' && (
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setGroupMembersModal({ isOpen: false, group: null, search: "" });
                                              handleOpenChat({ id: `dm_${[myChatId, 'teacher'].sort().join('_')}`, name: TEACHER_NAME, type: 'dm', role: 'teacher' });
                                              setIsChatMinimized(false);
                                          }}
                                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors shrink-0"
                                          title="Enviar mensaje directo"
                                      >
                                          <MessageCircle size={15} />
                                      </button>
                                  )}
                              </div>

                              {/* Lista de Estudiantes Inscritos */}
                              {(() => {
                                  const memberKeys = groupMembersModal.group?.members || [];
                                  const searchTerm = (groupMembersModal.search || "").toLowerCase().trim();
                                  const filteredMemberKeys = memberKeys.filter(uk => {
                                      if (!searchTerm) return true;
                                      const uData = userMappings[uk] || FALLBACK_MAP[uk] || {};
                                      return uk.toLowerCase().includes(searchTerm) || 
                                             (uData.fullName || '').toLowerCase().includes(searchTerm) ||
                                             (uData.email || '').toLowerCase().includes(searchTerm);
                                  });

                                  if (filteredMemberKeys.length === 0) {
                                      return (
                                          <div className="py-8 text-center text-xs text-gray-400 italic">
                                              {searchTerm ? 'No se encontraron estudiantes con esa búsqueda.' : 'No hay estudiantes inscritos en este grupo.'}
                                          </div>
                                      );
                                  }

                                  return filteredMemberKeys.map(uk => {
                                      const uData = userMappings[uk] || FALLBACK_MAP[uk] || { fullName: uk };
                                      const isOnline = userPresence[uk]?.status === 'online';
                                      const isSelf = uk === myChatId;

                                      return (
                                          <div key={uk} className="flex items-center justify-between gap-3 p-2 pt-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                              <div 
                                                  onClick={() => {
                                                      setGroupMembersModal({ isOpen: false, group: null, search: "" });
                                                      setViewingProfileId(uk);
                                                      changeTab('profile', uk);
                                                  }}
                                                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                                                  title="Ver perfil completo del estudiante"
                                              >
                                                  <div className="relative shrink-0">
                                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs border-2 border-white dark:border-gray-700 shadow-2xs group-hover:scale-105 transition-transform">
                                                          {uData.profilePicUrl ? (
                                                              <img src={uData.profilePicUrl} alt={uData.fullName || uk} className="w-full h-full object-cover" />
                                                          ) : (
                                                              (uData.fullName || uk).charAt(0).toUpperCase()
                                                          )}
                                                      </div>
                                                      {isOnline && (
                                                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900" title="En línea" />
                                                      )}
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                      <div className="flex items-center gap-1.5">
                                                          <p className="font-bold text-xs truncate text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                              {uData.fullName || uk} {isSelf && <span className="text-[10px] text-gray-400 font-normal">(Tú)</span>}
                                                          </p>
                                                      </div>
                                                      <p className="text-[10px] text-gray-500 truncate">
                                                          {uData.email || `@${uk}`}
                                                      </p>
                                                  </div>
                                              </div>

                                              {!isSelf && (
                                                  <div className="flex items-center gap-1 shrink-0">
                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              setGroupMembersModal({ isOpen: false, group: null, search: "" });
                                                              handleOpenChat({ id: `dm_${[myChatId, uk].sort().join('_')}`, name: uData.fullName || uk, type: 'dm', role: 'student' });
                                                              setIsChatMinimized(false);
                                                          }}
                                                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors"
                                                          title="Enviar mensaje directo"
                                                      >
                                                          <MessageCircle size={14} />
                                                      </button>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  });
                              })()}
                          </div>

                          {/* Footer */}
                          <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                              <button
                                  type="button"
                                  onClick={() => setGroupMembersModal({ isOpen: false, group: null, search: "" })}
                                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                              >
                                  Cerrar
                              </button>
                          </div>
                      </div>
                  </div>
              , document.body)}

              <ScrollToTop isDarkMode={isDarkMode} />

              {/* 👇 AQUÍ VA EL CEREBRO DEL BOT PARA EDWIN 👇 */}
                  {showIAKnowledgeModal && ReactDOM.createPortal(
                      <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                          <div className={`${glassCard} max-w-md w-full flex flex-col gap-4 relative bg-white`}>
                              <button onClick={() => setShowIAKnowledgeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={20}/></button>
                              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Sparkles className="text-purple-600"/> Cerebro del Asistente</h3>
                              <p className="text-xs text-gray-500">Edwin, aquí puede escribir cómo funciona la página para que el Asistente se lo explique a la Profe Gina.</p>
                              
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
