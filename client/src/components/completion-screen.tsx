import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, RotateCcw } from 'lucide-react';

interface QuizStats {
  asked: number;
  correctFirstTry: number;
  retries: number;
}

interface CompletionScreenProps {
  stats: QuizStats;
  totalQuestions: number;
  onStartNew: () => void;
  onRestart: () => void;
}

export function CompletionScreen({ stats, totalQuestions, onStartNew, onRestart }: CompletionScreenProps) {
  const successRate = Math.round((stats.correctFirstTry / stats.asked) * 100) || 0;

  return (
    <Card className="mb-8">
      <CardContent className="p-8 text-center">
        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="text-white h-10 w-10" />
        </div>
        
        <h2 className="text-3xl font-bold text-textprimary mb-4" data-testid="completion-title">
          Quiz abgeschlossen!
        </h2>
        
        <p className="text-xl text-gray-600 mb-8" data-testid="completion-summary">
          Du hast <span className="font-semibold text-secondary">{stats.correctFirstTry}</span> von{' '}
          <span className="font-semibold">{stats.asked}</span> Fragen beim ersten Versuch richtig beantwortet.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Erfolgsrate</h3>
              <p className="text-3xl font-bold text-secondary" data-testid="completion-success-rate">
                {successRate}%
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Wiederholungen</h3>
              <p className="text-3xl font-bold text-accent" data-testid="completion-retries">
                {stats.retries}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onStartNew}
            className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
            data-testid="button-start-new-quiz"
          >
            <Plus className="mr-2 h-4 w-4" />
            Neues Quiz erstellen
          </Button>
          
          <Button
            onClick={onRestart}
            variant="outline"
            className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-8 py-3"
            data-testid="button-restart-quiz"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Quiz wiederholen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
