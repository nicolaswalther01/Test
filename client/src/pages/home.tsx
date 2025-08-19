import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/file-upload";
import { QuizQuestion } from "@/components/quiz-question";
import { FeedbackModal } from "@/components/feedback-modal";
import { QuizStats } from "@/components/quiz-stats";
import { CompletionScreen } from "@/components/completion-screen";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Upload,
  Wand2,
  ArrowRight,
  RotateCcw,
  FileText,
  BookOpen,
} from "lucide-react";

interface QuizSession {
  id: string;
  summaryText: string;
  questions: Question[];
  currentQuestionIndex: number;
  stats: QuizStats;
  completed: boolean;
}

interface Question {
  id: string;
  type: "definition" | "case" | "assignment" | "open";
  text: string;
  options?: Array<{ id: string; text: string; correct: boolean }>;
  correctAnswer?: string;
  explanation: string;
  retryQuestion?: {
    text: string;
    options?: Array<{ id: string; text: string; correct: boolean }>;
    correctAnswer?: string;
  };
  sourceFile?: string;
  topic?: string;
  storedQuestionId?: number;
}

interface QuizStats {
  asked: number;
  correctFirstTry: number;
  retries: number;
}

interface FeedbackData {
  correct: boolean;
  explanation: string;
  correctAnswer?: string;
  retryQuestion?: Question["retryQuestion"];
  sourceFile?: string;
  topic?: string;
}

export default function Home() {
  const [match, params] = useRoute("/quiz/:sessionId");
  const sessionId = params?.sessionId;

  const [isGenerating, setIsGenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);

  const { toast } = useToast();

  // Fetch quiz session if we have a sessionId
  const { data: quizSession, isLoading: isLoadingQuiz } = useQuery<QuizSession>(
    {
      queryKey: ["/api/quiz", sessionId],
      enabled: !!sessionId,
    },
  );

  // Upload and generate questions mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
      questionTypes,
    }: {
      files: File[];
      questionTypes: string[];
    }) => {
      const formData = new FormData();

      // Add each file to FormData
      files.forEach((file) => {
        formData.append("textFiles", file);
      });

      // Add question types as JSON string
      formData.append("questionTypes", JSON.stringify(questionTypes));

      const response = await fetch("/api/upload-and-generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload fehlgeschlagen");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolgreich generiert!",
        description: data.message,
      });
      window.location.href = `/quiz/${data.sessionId}`;
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Generieren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit answer mutation
  const answerMutation = useMutation({
    mutationFn: async ({
      questionId,
      answer,
    }: {
      questionId: string;
      answer: string;
    }) => {
      const response = await fetch(`/api/quiz/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Antwort konnte nicht übermittelt werden",
        );
      }

      return response.json();
    },
    onSuccess: (data: FeedbackData) => {
      setFeedbackData(data);
      setShowFeedback(true);
      // Refetch quiz session to get updated stats
      queryClient.invalidateQueries({ queryKey: ["/api/quiz", sessionId] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update progress mutation
  const progressMutation = useMutation({
    mutationFn: async (updates: {
      currentQuestionIndex?: number;
      completed?: boolean;
    }) => {
      const response = await fetch(`/api/quiz/${sessionId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Fortschritt konnte nicht gespeichert werden",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quiz", sessionId] });
    },
  });

  const handleFileUpload = async (
    files: File[],
    questionTypes: ("definition" | "case" | "assignment" | "open")[],
  ) => {
    setIsGenerating(true);
    try {
      await uploadMutation.mutateAsync({ files, questionTypes });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (!quizSession) return;

    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    answerMutation.mutate({
      questionId: currentQuestion.id,
      answer,
    });
  };

  const handleNextQuestion = () => {
    if (!quizSession) return;

    const nextIndex = quizSession.currentQuestionIndex + 1;
    const isLastQuestion = nextIndex >= quizSession.questions.length;

    if (isLastQuestion) {
      progressMutation.mutate({ completed: true });
    } else {
      progressMutation.mutate({ currentQuestionIndex: nextIndex });
    }

    setShowFeedback(false);
    setFeedbackData(null);
  };

  const handleShowAnswer = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    // Create feedback data to show the answer
    const correctAnswer =
      currentQuestion.type === "open"
        ? currentQuestion.correctAnswer
        : currentQuestion.options?.find(
            (opt: any) => opt.isCorrect === true || opt.correct === true,
          )?.text;

    setFeedbackData({
      correct: false,
      explanation: currentQuestion.explanation,
      correctAnswer: correctAnswer || "Keine Antwort verfügbar",
    });
    setShowFeedback(true);
  };

  const handleStartNew = () => {
    window.location.href = "/";
  };

  const handleRestartQuiz = () => {
    if (!quizSession) return;
    progressMutation.mutate({
      currentQuestionIndex: 0,
      completed: false,
    });
  };

  const handleSkipQuestion = () => {
    if (!quizSession) return;

    const nextIndex = quizSession.currentQuestionIndex + 1;
    const isLastQuestion = nextIndex >= quizSession.questions.length;

    if (isLastQuestion) {
      progressMutation.mutate({ completed: true });
    } else {
      progressMutation.mutate({ currentQuestionIndex: nextIndex });
    }
  };

  const getCurrentQuestion = (): Question | null => {
    if (!quizSession) return null;
    return quizSession.questions[quizSession.currentQuestionIndex] || null;
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels = {
      definition: "Definitionsfrage",
      case: "Fallfrage",
      assignment: "Zuordnungsfrage",
      open: "Offene Frage",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getQuestionTypeIcon = (type: string) => {
    const icons = {
      definition: "fas fa-book",
      case: "fas fa-briefcase",
      assignment: "fas fa-link",
      open: "fas fa-edit",
    };
    return icons[type as keyof typeof icons] || "fas fa-question-circle";
  };

  // Show completion screen
  if (quizSession?.completed) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-textprimary">
                  StudyHelper
                </h1>
                <p className="text-sm text-gray-500">
                  Erstelle effektive IHK-Abfragen aus deinen Zusammenfassungen
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <CompletionScreen
            stats={quizSession.stats}
            totalQuestions={quizSession.questions.length}
            onStartNew={handleStartNew}
            onRestart={handleRestartQuiz}
          />
        </main>
      </div>
    );
  }

  // Show quiz interface
  if (sessionId && quizSession) {
    const currentQuestion = getCurrentQuestion();
    const progress =
      (quizSession.currentQuestionIndex / quizSession.questions.length) * 100;

    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-textprimary">
                  StudyHelper
                </h1>
                <p className="text-sm text-gray-500">
                  Erstelle effektive IHK-Abfragen aus deinen Zusammenfassungen
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {currentQuestion && (
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">IHK-Abfrage</h2>
                    <p className="text-gray-600">
                      Frage {quizSession.currentQuestionIndex + 1} von{" "}
                      {quizSession.questions.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Fortschritt</p>
                    <p className="text-lg font-semibold text-secondary">
                      {quizSession.stats.correctFirstTry}/
                      {quizSession.stats.asked} Richtig
                    </p>
                  </div>
                </div>

                <Progress value={progress} className="mb-8" />

                <div className="mb-6 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-primary border-blue-200"
                  >
                    <i
                      className={`${getQuestionTypeIcon(currentQuestion.type)} mr-2`}
                    />
                    {getQuestionTypeLabel(currentQuestion.type)}
                  </Badge>
                  
                  {currentQuestion.sourceFile && (
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {currentQuestion.sourceFile}
                    </Badge>
                  )}
                  
                  {currentQuestion.topic && (
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-700 border-purple-200"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      {currentQuestion.topic}
                    </Badge>
                  )}

                  {currentQuestion.storedQuestionId && (
                    <Badge
                      variant="outline" 
                      className="bg-orange-100 text-orange-700 border-orange-200"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Wiederholung
                    </Badge>
                  )}
                </div>

                <QuizQuestion
                  question={currentQuestion}
                  onSubmit={handleAnswerSubmit}
                  onSkip={handleSkipQuestion}
                  onShowAnswer={handleShowAnswer}
                  isLoading={answerMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          <QuizStats stats={quizSession.stats} />

          {showFeedback && feedbackData && (
            <FeedbackModal
              isOpen={showFeedback}
              feedback={feedbackData}
              onClose={() => setShowFeedback(false)}
              onNext={handleNextQuestion}
            />
          )}
        </main>
      </div>
    );
  }

  // Show loading state
  if (isLoadingQuiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Quiz wird geladen...</p>
        </div>
      </div>
    );
  }

  // Show upload interface
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-textprimary">
                StudyHelper
              </h1>
              <p className="text-sm text-gray-500">
                Erstelle effektive IHK-Abfragen aus deinen Zusammenfassungen
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {isGenerating ? (
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">
                  Fragen werden generiert!
                </h2>
                <div className="max-w-md mx-auto">
                  <Progress value={75} className="mb-4" />
                  <p className="text-gray-600 mb-4">
                    Analysiere Text und erstelle Quizfragen (kann länger
                    dauern)...
                  </p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">
                  Zusammenfassungen hochladen!
                </h2>
                <p className="text-gray-600 mb-8">
                  Lade bis zu 5 .txt Dateien mit deinen Zusammenfassungen hoch,
                  um automatisch Quizfragen zu generieren. Wähle die gewünschten
                  Fragentypen aus.
                </p>

                <FileUpload
                  onFileUpload={handleFileUpload}
                  isLoading={uploadMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Types Info */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Fragetypen im IHK-Stil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <i className="fas fa-book text-primary mt-1" />
                <div>
                  <h4 className="font-medium text-primary">
                    Definitionsfragen
                  </h4>
                  <p className="text-sm text-gray-600">
                    Begriffe und Konzepte erklären
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <i className="fas fa-briefcase text-secondary mt-1" />
                <div>
                  <h4 className="font-medium text-secondary">Fallfragen</h4>
                  <p className="text-sm text-gray-600">
                    Praxisnahe Mini-Szenarien
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                <i className="fas fa-link text-purple-600 mt-1" />
                <div>
                  <h4 className="font-medium text-purple-600">
                    Zuordnungsfragen
                  </h4>
                  <p className="text-sm text-gray-600">
                    Begriffe richtig verknüpfen
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                <i className="fas fa-edit text-accent mt-1" />
                <div>
                  <h4 className="font-medium text-accent">Offene Fragen</h4>
                  <p className="text-sm text-gray-600">
                    Freie Antworten formulieren
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500">
            <p className="text-sm">
              StudyHelper - Erstelle effektive IHK-Abfragen aus deinen
              Zusammenfassungen
            </p>
            <p className="text-xs mt-2">
              Alle Inhalte werden nur aus deinem hochgeladenen Text generiert!
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
