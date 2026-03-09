
import React from 'react';

export enum Role {
  STUDENT = 'student',
  ADMIN = 'admin',
  TEACHER = 'teacher',
  SUPERVISOR = 'supervisor',
}

export type StudentView = 'home' | 'grades' | 'units' | 'lessonDetail' | 'player' | 'subscription' | 'profile' | 'teachers' | 'courses' | 'singleSubjectSubscription' | 'comprehensiveSubscription' | 'results' | 'smartPlan' | 'chatbot' | 'chatBot' | 'cartoonMovies' | 'teacherProfile' | 'courseDetail' | 'questionBank' | 'askTeacher' | 'reels' | 'french' | 'aiLearning' | 'specialTeacherProfile' | 'adhkar' | 'quran';
export type TeacherView = 'dashboard' | 'content' | 'subscriptions' | 'profile' | 'students' | 'studentChats';
export type AdminView = 'dashboard' | 'students' | 'subscriptions' | 'courseManagement' | 'tools' | 'homeManagement' | 'platformSettings' | 'systemHealth' | 'accountSettings' | 'teachers' | 'subscriptionPrices' | 'deviceManagement' | 'content' | 'specialContent' | 'accountCreationDiagnostics' | 'teacherCreationDiagnostics' | 'financials' | 'cartoonMoviesManagement' | 'questionBank' | 'supervisors' | 'reelsManagement' | 'iconSettings' | 'curriculumDiagnostics' | 'subscriptionCodeDiagnostics' | 'cartoonDiagnostics' | 'sessionDiagnostics' | 'courseDiagnostics' | 'notificationDiagnostics' | 'avatarDiagnostics' | 'iconDiagnostics' | 'mediaIntegrity' | 'databaseDiagnostics' | 'storyManagement' | 'storyDiagnostics' | 'userDeletionDiagnostics' | 'fullScan' | 'adsDiagnostics' | 'subscriptionRequestsDiagnostics' | 'lessonDiagnostics' | 'dbAudit' | 'systemTest' | 'passwordDiagnostics' | 'errorLogs' | 'auditLogs';

export interface User {
  id: string;
  name: string; 
  email: string;
  phone: string;
  guardianPhone: string;
  grade: number | null;
  gradeData?: Grade;
  track?: 'Scientific' | 'Literary' | 'All' | null;
  role: Role;
  subscriptionId?: string;
  teacherId?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface ErrorLog {
    id: string;
    source: string;
    message: string;
    stack?: string;
    user_id?: string;
    user_role?: string;
    device_info?: string;
    created_at: string;
    severity: 'error' | 'warning' | 'info';
}

export interface AISubject {
    id: string;
    title: string;
    icon: React.FC<{className?: string}>;
    color: string;
    gradient: string;
    systemRole: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    isActive: boolean;
    priority?: number;
    createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'Monthly' | 'Quarterly' | 'Annual' | 'SemiAnnually';
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired';
  teacherId?: string;
}

export enum LessonType {
  EXPLANATION = 'Explanation',
  HOMEWORK = 'Homework',
  EXAM = 'Exam',
  SUMMARY = 'Summary',
}

export enum QuizType {
  IMAGE = 'image',
  MCQ = 'mcq',
}

export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
  rationale?: string;
}

export interface LessonVideo {
    title: string;
    url: string;
}

export interface Lesson {
  id:string;
  title: string;
  type: LessonType;
  content: string; // Used for single video URL or summary text
  videos?: LessonVideo[]; // Array for multiple videos support
  description?: string;
  isFree?: boolean;
  publishedAt?: string;
  quizType?: QuizType;
  questions?: QuizQuestion[];
  imageUrl?: string; 
  correctAnswers?: string[];
  videoQuestions?: QuizQuestion[];
  timeLimit?: number;
  passingScore?: number;
  dueDate?: string;
  unitId?: string;
  teacherId?: string; // Added for supervisor management
  
  // New Academy Session fields
  homeworkQuestions?: QuizQuestion[];
  examQuestions?: QuizQuestion[];
  summaryContent?: string;
  hasHomework?: boolean;
  hasExam?: boolean;
  hasSummary?: boolean;
  isVisible?: boolean;
}

export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
  teacherId: string;
  track?: 'Scientific' | 'Literary' | 'Science' | 'Math' | 'All';
  semester_id?: string;
}

export interface Semester {
  id: string;
  title: string;
  units: Unit[];
  grade_id?: number;
}

export interface Grade {
  id: number;
  name: string;
  level: 'Middle' | 'Secondary';
  levelAr: 'الإعدادي' | 'الثانوي';
  semesters: Semester[];
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userName: string;
  plan: 'Monthly' | 'Quarterly' | 'Annual' | 'SemiAnnually';
  paymentFromNumber: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  subjectName?: string;
  unitId?: string;
}

export interface StudentQuestion {
  id: string;
  userId: string;
  userName: string;
  questionText: string;
  answerText?: string;
  status: 'Pending' | 'Answered';
  createdAt: string;
}

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface Teacher {
    id: string;
    name: string;
    subject: string;
    imageUrl: string;
    email?: string;
    phone?: string;
    teachingLevels?: ('Middle' | 'Secondary')[];
    teachingGrades?: number[];
    isSpecial?: boolean; 
}

export interface CourseVideo {
  id: string;
  title: string;
  videoUrl: string;
  isFree: boolean;
}

export interface Course {
  id: string; 
  title: string;
  description: string;
  teacherId: string;
  coverImage: string;
  price: number;
  isFree: boolean;
  pdfUrl?: string;
  videos: CourseVideo[];
}

export interface Book {
  id: string;
  title: string;
  teacherName: string;
  teacherImage: string;
  price: number;
  coverImage: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  lessonId: string;
  submittedAt: string;
  score: number;
  submittedAnswers?: string[] | (number | null)[];
  timeTaken: number;
  isPass: boolean;
}

export interface PlatformFeature {
    title: string;
    description: string;
}

export type SubscriptionMode = 'comprehensive' | 'singleSubject';

export interface IconSettings {
    faviconUrl?: string;
    mainLogoUrl?: string;
    welcomeHeroImageUrl?: string;
    welcomeStatStudentIconUrl?: string;
    welcomeStatLessonIconUrl?: string;
    welcomeStatSatisfactionIconUrl?: string;
    welcomeStatSupportIconUrl?: string;
    welcomeFeatureStatsIconUrl?: string;
    welcomeFeatureStatsImageUrl?: string;
    welcomeFeaturePlayerIconUrl?: string;
    welcomeFeaturePlayerImageUrl?: string;
    welcomeFeatureAiIconUrl?: string;
    welcomeFeatureAiImageUrl?: string;
    welcomeFeatureCinemaIconUrl?: string;
    welcomeFeatureCinemaImageUrl?: string;
    authLoginIconUrl?: string;
    authRegisterIconUrl?: string;
    studentNavHomeIconUrl?: string;
    studentNavCurriculumIconUrl?: string;
    studentNavReelsIconUrl?: string;
    studentNavSubscriptionIconUrl?: string;
    studentNavProfileIconUrl?: string;
    studentNavResultsIconUrl?: string;
    studentNavChatbotIconUrl?: string;
    studentNavCartoonIconUrl?: string;
    studentNavQuestionBankIconUrl?: string;
    studentAvatar1Url?: string;
    studentAvatar2Url?: string;
    studentAvatar3Url?: string;
    studentAvatar4Url?: string;
    studentAvatar5Url?: string;
    studentAvatar6Url?: string;
    adminNavContentIconUrl?: string;
    adminNavTeacherIconUrl?: string;
    adminNavStudentIconUrl?: string;
    adminNavHealthIconUrl?: string;
    adminNavCartoonIconUrl?: string;
}

export interface PlatformSettings {
  id?: string;
  platformName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroImageUrl?: string;
  teacherImageUrl?: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: PlatformFeature[];
  footerDescription: string;
  contactPhone: string;
  contactFacebookUrl: string;
  contactYoutubeUrl: string;
  contactInstagramUrl: string; 
  contactWhatsappUrl: string; 
  galleryImages: string[]; 
  monthlyPrice: number;
  quarterlyPrice: number;
  semiAnnuallyPrice: number;
  annualPrice: number;
  currency?: string;
  paymentNumbers: string[];
  enabledSubscriptionModes?: SubscriptionMode[];
  announcementBanner?: {
    text: string;
    subtitle?: string; 
    imageUrl?: string;
    enabled: boolean;
  };
  iconSettings?: IconSettings;
}

export type Mode = 'light' | 'dark';
export type Style = 'R1' | 'R2';

export interface CustomColors {
  '--bg-primary': string;
  '--bg-secondary': string;
  '--text-primary': string;
  '--accent-primary': string;
}

export interface AppearanceSettings {
  neon: {
    enabled: boolean;
    color: string;
    intensity: number;
  };
  customColors: Record<string, CustomColors>;
}

export type DurationType = 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom';

export const durationLabels: Record<DurationType, string> = {
  monthly: 'شهر واحد (30 يوم)',
  quarterly: '3 شهور (90 يوم)',
  semi_annually: '6 شهور (180 يوم)',
  annually: 'سنة كاملة (365 يوم)',
  custom: 'مدة مخصصة'
};

export interface SubscriptionCode {
    code: string;
    teacherId?: string | null;
    durationDays: number;
    maxUses: number;
    timesUsed: number;
    usedByUserIds: string[];
    createdAt: string;
}

export interface AppNotification {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: string;
  link?: StudentView;
}

export interface DownloadLink {
    quality: string;
    url: string;
}

export interface CartoonEpisode {
  id: string;
  season_id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  downloadLinks?: DownloadLink[];
  duration?: string;
  releaseDate?: string;
  adUrl?: string;
}

export interface CartoonSeason {
  id: string;
  series_id: string;
  season_number: number;
  title: string;
  description?: string;
  posterUrl: string;
  trailerUrl?: string;
  adUrl?: string;
  releaseYear?: string;
  rating?: number;
  is_published: boolean;
  createdAt: string;
  episodes?: CartoonEpisode[];
}

export interface CartoonMovie {
  id: string;
  title: string;
  story: string;
  posterUrl: string;
  videoUrl?: string;
  adUrl?: string;    
  trailerUrl?: string; 
  downloadLinks?: DownloadLink[];
  duration?: string;
  releaseYear?: string;
  downloadUrl: string;
  downloadInstructions: string;
  loadInstructions: string;
  instructionsThumbnailUrl: string;
  isPublished: boolean;
  createdAt: string;
  type: 'movie' | 'series';
  category: string;
  rating: number;
  showInstructions: boolean; 
  seasons?: CartoonSeason[];
  galleryImages?: string[]; 
  franchise?: string; 
}

export interface Reel {
  id: string;
  title: string;
  youtubeUrl: string;
  isPublished: boolean;
  createdAt: string;
}

export interface SupervisorProfile extends User {
    supervisor_teachers: { teachers: Teacher }[];
}

export interface Story {
  id: string;
  type: 'image' | 'text' | 'movie';
  content: string;
  category: 'main' | 'movies';
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
  movie_data?: { title: string; posterUrl: string; type: string };
}

export interface WatchedVideo {
  lessonId: string;
  unitId: string;
  lessonTitle: string;
  unitTitle: string;
  watchedAt: number;
  teacherId?: string;
}

export interface VideoActivity {
  id: string;
  user_id: string;
  lesson_id: string;
  watched_seconds: number;
  milestone?: string;
  last_updated_at: string;
}