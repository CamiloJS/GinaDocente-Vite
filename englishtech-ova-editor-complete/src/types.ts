/**
 * Tipos de datos para el sistema de Objetos Virtuales de Aprendizaje (OVA) de EnglishTech
 */

export type PageType = 
  | 'cover'
  | 'objectives'
  | 'content'
  | 'activity'
  | 'conclusion'
  | 'credits'
  | 'copyright';

export type BlockType =
  | 'text'
  | 'heading'
  | 'math'
  | 'video'
  | 'image'
  | 'callout'
  | 'interactive_table'
  | 'quiz_multiple'
  | 'cloze_fill'
  | 'accordion'
  | 'objectives_list'
  | 'credits_team'
  | 'license_matrix';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  title: string;
  question: string;
  options: QuizOption[];
  feedbackGood: string;
  feedbackBad: string;
  explanation?: string;
  userAnswer?: string;
  isAnswered?: boolean;
}

export interface TableCell {
  value: string;
  isInput?: boolean;
  expectedAnswer?: string;
  userAnswer?: string;
  status?: 'empty' | 'correct' | 'incorrect';
}

export interface TableRow {
  cells: TableCell[];
}

export interface ClozeItem {
  id: string;
  beforeText: string;
  blankId: string;
  expectedWord: string;
  userWord?: string;
  afterText: string;
}

export interface CreditMember {
  role: string;
  name: string;
  institution?: string;
}

export interface CreditColumn {
  category: string;
  members: CreditMember[];
}

export interface LicensePermission {
  action: string;
  allowed: boolean;
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  title?: string;
  content?: string;
  metadata?: {
    videoUrl?: string;
    imageUrl?: string;
    imageCaption?: string;
    imageWidth?: string;
    latex?: string;
    calloutType?: 'info' | 'warning' | 'success' | 'tip';
    questions?: QuizQuestion[];
    tableHeaders?: string[];
    tableRows?: TableRow[];
    clozeText?: string;
    wordBank?: string[];
    creditColumns?: CreditColumn[];
    licenseName?: string;
    licenseYear?: string;
    licenseHolder?: string;
    permissions?: LicensePermission[];
    accordionItems?: { title: string; content: string; isOpen?: boolean }[];
    mainGoal?: string;
    skills?: string[];
  };
}

export interface SubSlide {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

export interface OvaPage {
  id: string;
  title: string;
  type: PageType;
  icon?: string;
  subSlides: SubSlide[];
}

export interface CoverSettings {
  title: string;
  subtitle: string;
  badgeText: string;
  institution: string;
  authorName: string;
  backgroundImage: string;
  backgroundColor: string;
  textColor: string;
  overlayOpacity: number;
  startButtonText: string;
  showEnglishTechBranding: boolean;
}

export interface OvaProject {
  id: string;
  version: string;
  title: string;
  subject: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    isDarkMode: boolean;
  };
  cover: CoverSettings;
  pages: OvaPage[];
}
