import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  onSubmit: (answer: string[]) => void;
  isLoading: boolean;
}

export function QuizQuestion({ question, onSubmit, isLoading }: QuizQuestionProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [openAnswer, setOpenAnswer] = useState<string>('');

  const toggleAnswer = (id: string) => {
    setSelectedAnswers((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    const answer =
      question.type === 'open'
        ? [openAnswer.trim()]
        : selectedAnswers;
    if (answer.length > 0 && answer.every((a) => a !== '')) {
      onSubmit(answer);
      // Reset form
      setSelectedAnswers([]);
      setOpenAnswer('');
    }
  };

  const handleNoIdea = () => {
    // Submit empty answer array to mark as incorrect and show solution
    onSubmit([]);
    // Reset form
    setSelectedAnswers([]);
    setOpenAnswer('');
  };

  const isAnswerValid =
    question.type === 'open'
      ? openAnswer.trim().length > 0
      : selectedAnswers.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold mb-6" data-testid="question-text">
          {question.text}
        </h3>

        {question.isReviewQuestion && (
          <p className="text-sm text-gray-500 mb-4">
            {typeof question.timesAsked === 'number' && (
              <>
                Bereits {question.timesAsked}× gestellt.{' '}
              </>
            )}
            {typeof question.lastCorrect === 'boolean' && (
              <>
                Letzte Antwort {question.lastCorrect ? 'richtig' : 'falsch'}.{' '}
              </>
            )}
            {typeof question.correctRemaining === 'number' && (
              <>
                Noch {question.correctRemaining}× richtig bis zur Entfernung.
              </>
            )}
          </p>
        )}

        {question.type === 'open' ? (
          <div className="w-full bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
            <p className="text-lg font-medium text-gray-800 mb-4">🖊️ Offene Frage - Bitte Ihre ausführliche Antwort hier eingeben:</p>
            <textarea
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
              placeholder="Geben Sie hier Ihre vollständige Antwort in ganzen Sätzen ein. Erklären Sie das Thema ausführlich..."
              className="w-full p-4 border-2 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-200 focus:border-blue-500 resize-none min-h-[200px] bg-white text-gray-900 text-base"
              data-testid="input-open-answer"
              style={{ display: 'block', visibility: 'visible' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              Zeichen eingegeben: {openAnswer.length} 
              {openAnswer.length < 20 && <span className="text-orange-600 ml-2">(Mindestens 20 Zeichen empfohlen)</span>}
            </p>
          </div>
        ) : question.type === 'assignment' ? (
          <div className="w-full bg-blue-50 p-4 rounded-lg border-2 border-blue-300 mb-4">
            <p className="text-lg font-medium text-gray-800 mb-4">🔗 Zuordnungsfrage - Wählen Sie das passende Oberthema:</p>
            <div className="space-y-3">
              {question.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors">
                  <Checkbox
                    id={option.id}
                    checked={selectedAnswers.includes(option.id)}
                    onCheckedChange={() => toggleAnswer(option.id)}
                    className="text-blue-600"
                  />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer text-base font-medium"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ) : question.type === 'definition' ? (
          <div className="w-full bg-green-50 p-4 rounded-lg border-2 border-green-300 mb-4">
            <p className="text-lg font-medium text-gray-800 mb-4">📚 Definitionsfrage - Wählen Sie die richtige Definition:</p>
            {question.options && question.options.length > 0 ? (
              <div className="space-y-3" data-testid="radio-group-options">
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id={option.id}
                      checked={selectedAnswers.includes(option.id)}
                      onCheckedChange={() => toggleAnswer(option.id)}
                      className="mt-1 text-green-600"
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
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">Fehler: Keine Antwortoptionen für diese Frage verfügbar.</p>
              </div>
            )}
          </div>
        ) : question.type === 'case' ? (
          <div className="w-full bg-orange-50 p-4 rounded-lg border-2 border-orange-300 mb-4">
            <p className="text-lg font-medium text-gray-800 mb-4">💼 Fallfrage - Wählen Sie die beste Lösung:</p>
            {question.options && question.options.length > 0 ? (
              <div className="space-y-3" data-testid="radio-group-options">
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id={option.id}
                      checked={selectedAnswers.includes(option.id)}
                      onCheckedChange={() => toggleAnswer(option.id)}
                      className="mt-1 text-orange-600"
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
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">Fehler: Keine Antwortoptionen für diese Frage verfügbar.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-gray-50 p-4 rounded-lg border-2 border-gray-300 mb-4">
            <p className="text-lg font-medium text-gray-800 mb-4">❓ Multiple Choice - Wählen Sie die richtige Antwort:</p>
            {question.options && question.options.length > 0 ? (
              <div className="space-y-3" data-testid="radio-group-options">
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id={option.id}
                      checked={selectedAnswers.includes(option.id)}
                      onCheckedChange={() => toggleAnswer(option.id)}
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
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">Fehler: Keine Antwortoptionen für diese Frage verfügbar.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <Button
          onClick={handleSubmit}
          disabled={!isAnswerValid || isLoading}
          className="bg-primary hover:bg-blue-700 text-white px-6 py-3"
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
          className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-6 py-3"
          data-testid="button-no-idea"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Keine Ahnung
        </Button>
      </div>
    </div>
  );
}
