import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, HelpCircle } from 'lucide-react';

interface Question {
  id: string;
  type: 'definition' | 'case' | 'assignment' | 'open';
  text: string;
  options?: Array<{ id: string; text: string; correct: boolean }>;
  correctAnswer?: string;
  explanation: string;
  sourceFile?: string;
  storedQuestionId?: number;
  isReviewQuestion?: boolean;
  timesAsked?: number;
  lastCorrect?: boolean;
  correctRemaining?: number;
}

interface QuizQuestionProps {
  question: Question;
  onSubmit: (answer: string | string[]) => void;
  isLoading: boolean;
}

export function QuizQuestion({ question, onSubmit, isLoading }: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [openAnswer, setOpenAnswer] = useState<string>('');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [question.id]);

  const correctCount = question.options?.filter(o => o.correct).length || 0;
  const isMultipleAnswer = question.type !== 'open' && correctCount > 1;

  const handleSubmit = () => {
    const answer =
      question.type === 'open'
        ? openAnswer.trim()
        : isMultipleAnswer
          ? selectedAnswers
          : selectedAnswer;
    if (
      question.type === 'open'
        ? openAnswer.trim().length > 0
        : isMultipleAnswer
          ? selectedAnswers.length === correctCount
          : selectedAnswer.length > 0
    ) {
      onSubmit(answer);
      setSelectedAnswer('');
      setSelectedAnswers([]);
      setOpenAnswer('');
    }
  };

  const handleNoIdea = () => {
    onSubmit(isMultipleAnswer ? [] : '');
    setSelectedAnswer('');
    setSelectedAnswers([]);
    setOpenAnswer('');
  };

  const isAnswerValid =
    question.type === 'open'
      ? openAnswer.trim().length > 0
      : isMultipleAnswer
        ? selectedAnswers.length === correctCount
        : selectedAnswer.length > 0;

  const renderOptions = () => {
    if (!question.options || question.options.length === 0) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Fehler: Keine Antwortoptionen für diese Frage verfügbar.</p>
        </div>
      );
    }

    if (isMultipleAnswer) {
      return (
        <div className="space-y-3">
          {question.options.map(option => (
            <div key={option.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border hover:border-gray-300 transition-colors">
              <Checkbox
                id={option.id}
                checked={selectedAnswers.includes(option.id)}
                onCheckedChange={checked => {
                  setSelectedAnswers(prev =>
                    checked ? [...prev, option.id] : prev.filter(id => id !== option.id)
                  );
                }}
                className="mt-1"
              />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer text-base">
                {option.text}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    return (
      <RadioGroup
        value={selectedAnswer}
        onValueChange={setSelectedAnswer}
        className="space-y-3"
        data-testid="radio-group-options"
      >
        {question.options.map(option => (
          <div
            key={option.id}
            className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <RadioGroupItem
              value={option.id}
              id={option.id}
              className="mt-1"
              data-testid={`radio-option-${option.id}`}
            />
            <Label
              htmlFor={option.id}
              className="flex-1 cursor-pointer text-base"
              data-testid={`label-option-${option.id}`}
            >
              {option.text}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  const getContainerStyles = () => {
    switch (question.type) {
      case 'assignment':
        return 'w-full bg-blue-50 p-4 rounded-lg border-2 border-blue-300 mb-4';
      case 'definition':
        return 'w-full bg-green-50 p-4 rounded-lg border-2 border-green-300 mb-4';
      case 'case':
        return 'w-full bg-orange-50 p-4 rounded-lg border-2 border-orange-300 mb-4';
      default:
        return 'w-full bg-gray-50 p-4 rounded-lg border-2 border-gray-300 mb-4';
    }
  };

  const getHeaderText = () => {
    const base: Record<string, string> = {
      assignment: '🔗 Zuordnungsfrage',
      definition: '📚 Definitionsfrage',
      case: '💼 Fallfrage',
      default: '❓ Multiple Choice'
    };
    const prefix = base[question.type] || base.default;
    if (isMultipleAnswer) {
      return `${prefix} - Wähle ${correctCount} Antworten:`;
    }
    if (question.type === 'assignment') return `${prefix} - Wählen Sie das passende Oberthema:`;
    if (question.type === 'definition') return `${prefix} - Wählen Sie die richtige Definition:`;
    if (question.type === 'case') return `${prefix} - Wählen Sie die beste Lösung:`;
    return `${prefix} - Wählen Sie die richtige Antwort:`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4">
        <h3 className="text-lg font-semibold" data-testid="question-text">
          {question.text}
        </h3>

        {question.isReviewQuestion && (
          <p className="text-sm text-gray-500">
            {typeof question.timesAsked === 'number' && <>Bereits {question.timesAsked}× gestellt. </>}
            {typeof question.lastCorrect === 'boolean' && <>Letzte Antwort {question.lastCorrect ? 'richtig' : 'falsch'}. </>}
            {typeof question.correctRemaining === 'number' && <>Noch {question.correctRemaining}× richtig bis zur Entfernung.</>}
          </p>
        )}

        {question.type === 'open' ? (
          <div className="w-full bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
            <p className="text-base font-medium text-gray-800 mb-4">
              🖊️ Offene Frage - Bitte Ihre ausführliche Antwort hier eingeben:
            </p>
            <Textarea
              value={openAnswer}
              onChange={e => setOpenAnswer(e.target.value)}
              placeholder="Geben Sie hier Ihre vollständige Antwort in ganzen Sätzen ein."
              className="w-full p-4 border-2 border-gray-400 rounded-lg resize-none min-h-[160px] text-base"
              data-testid="input-open-answer"
            />
            <p className="text-xs text-gray-600 mt-2">
              Zeichen eingegeben: {openAnswer.length}
              {openAnswer.length < 20 && (
                <span className="text-orange-600 ml-2">(Mindestens 20 Zeichen empfohlen)</span>
              )}
            </p>
          </div>
        ) : (
          <div className={getContainerStyles()}>
            <p className="text-base font-medium text-gray-800 mb-4">{getHeaderText()}</p>
            {renderOptions()}
          </div>
        )}
      </div>

      <div className="pt-4 space-y-4">
        <div className="flex space-x-4">
          <Button
            onClick={handleSubmit}
            disabled={!isAnswerValid || isLoading}
            className="bg-primary hover:bg-blue-700 text-white px-6 py-3 flex-1"
            data-testid="button-submit-answer"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Prüfe...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Antwort bestätigen
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleNoIdea}
            disabled={isLoading}
            className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-6 py-3 flex-1"
            data-testid="button-no-idea"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Keine Ahnung
          </Button>
        </div>
      </div>
    </div>
  );
}
