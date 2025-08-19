import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, Check, RotateCcw } from 'lucide-react';

interface QuizStats {
  asked: number;
  correctFirstTry: number;
  retries: number;
}

interface QuizStatsProps {
  stats: QuizStats;
}

export function QuizStats({ stats }: QuizStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="text-primary h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold text-textprimary" data-testid="stats-asked">
            {stats.asked}
          </h3>
          <p className="text-gray-600">Fragen gestellt</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="text-secondary h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold text-secondary" data-testid="stats-correct-first-try">
            {stats.correctFirstTry}
          </h3>
          <p className="text-gray-600">Beim ersten Mal richtig</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <RotateCcw className="text-accent h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold text-accent" data-testid="stats-retries">
            {stats.retries}
          </h3>
          <p className="text-gray-600">Wiederholungen</p>
        </CardContent>
      </Card>
    </div>
  );
}
