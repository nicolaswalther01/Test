import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight, FileText, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeedbackData {
  correct: boolean;
  explanation: string;
  correctAnswer?: string;
  retryQuestion?: {
    text: string;
    options?: Array<{ id: string; text: string; correct: boolean }>;
    correctAnswer?: string;
  };
  sourceFile?: string;
  topic?: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  feedback: FeedbackData;
  onClose: () => void;
  onNext: () => void;
}

export function FeedbackModal({
  isOpen,
  feedback,
  onClose,
  onNext,
}: FeedbackModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onNext}>
      <DialogContent
        className="max-w-md w-full mx-4"
        data-testid="feedback-modal"
      >
        {feedback.correct ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-white h-8 w-8" />
            </div>
            <DialogHeader>
              <DialogTitle
                className="text-xl font-semibold text-secondary"
                data-testid="feedback-title-correct"
              >
                Richtig!
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Gut gemacht. Die Antwort ist korrekt.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 mt-4">
              <p
                className="text-sm text-gray-700"
                data-testid="feedback-explanation"
              >
                {feedback.explanation}
              </p>
            </div>

            {(feedback.sourceFile || feedback.topic) && (
              <div className="flex gap-2 justify-center mb-4">
                {feedback.sourceFile && (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-700 border-green-200 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {feedback.sourceFile}
                  </Badge>
                )}
                {feedback.topic && (
                  <Badge
                    variant="outline"
                    className="bg-purple-100 text-purple-700 border-purple-200 text-xs"
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {feedback.topic}
                  </Badge>
                )}
              </div>
            )}

            <Button
              onClick={onNext}
              className="w-full bg-secondary hover:bg-green-600 text-white py-3"
              data-testid="button-next-question"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Nächste Frage
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-white h-8 w-8" />
            </div>
            <DialogHeader>
              <DialogTitle
                className="text-xl font-semibold text-red-600"
                data-testid="feedback-title-incorrect"
              >
                Nicht ganz richtig
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Lass uns das nochmal versuchen.
              </DialogDescription>
            </DialogHeader>

            {feedback.correctAnswer && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 mt-4">
                <h4 className="font-medium text-red-800 mb-2">
                  Richtige Antwort:
                </h4>
                <p
                  className="text-sm text-red-700"
                  data-testid="feedback-correct-answer"
                >
                  {feedback.correctAnswer}
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Erklärung:</h4>
              <p
                className="text-sm text-blue-700"
                data-testid="feedback-explanation"
              >
                {feedback.explanation}
              </p>
            </div>

            {(feedback.sourceFile || feedback.topic) && (
              <div className="flex gap-2 justify-center mb-6">
                {feedback.sourceFile && (
                  <Badge
                    variant="outline"
                    className="bg-red-100 text-red-700 border-red-200 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {feedback.sourceFile}
                  </Badge>
                )}
                {feedback.topic && (
                  <Badge
                    variant="outline"
                    className="bg-purple-100 text-purple-700 border-purple-200 text-xs"
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {feedback.topic}
                  </Badge>
                )}
              </div>
            )}

            <Button
              onClick={onNext}
              className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-3"
              data-testid="button-next-question"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Weiter
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
