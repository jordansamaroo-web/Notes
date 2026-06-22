export interface TerminologyItem {
  term: string;
  definition: string;
  context: string;
}

export interface SubtopicItem {
  heading: string;
  keyPoints: string[];
}

export interface OutlineItem {
  heading: string;
  keyPoints: string[];
  subtopics?: SubtopicItem[];
}

export interface FlashcardItem {
  question: string;
  answer: string;
  hint: string;
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StudySuite {
  title: string;
  description: string;
  keyTakeaways: string[];
  terminology: TerminologyItem[];
  outline: OutlineItem[];
  feynmanExplanation: string;
  flashcards: FlashcardItem[];
  quiz: QuizQuestionItem[];
}

export interface SavedGuide {
  id: string;
  timestamp: string;
  url?: string;
  textSnippet: string;
  style: string;
  level: string;
  data: StudySuite;
}
