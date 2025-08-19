import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Wand2 } from 'lucide-react';
import { QuestionType } from '@shared/schema';

interface FileUploadProps {
  onFileUpload: (files: File[], questionTypes: QuestionType[], totalNewQuestions: number) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>([
    'definition', 'case', 'assignment', 'open'
  ]);
  const [totalNewQuestions, setTotalNewQuestions] = useState<number>(10);

  const questionTypeLabels: Record<QuestionType, string> = {
    definition: 'Definitionsfragen',
    case: 'Fallfragen', 
    assignment: 'Zuordnungsfragen',
    open: 'Offene Fragen'
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev, ...acceptedFiles];
      return newFiles.slice(0, 5); // Limit to 5 files
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt']
    },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024, // 5MB per file
  });

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllFiles = () => {
    setSelectedFiles([]);
  };

  const handleQuestionTypeChange = (type: QuestionType, checked: boolean) => {
    setSelectedQuestionTypes(prev => {
      if (checked) {
        return [...prev, type];
      } else {
        return prev.filter(t => t !== type);
      }
    });
  };

  const handleGenerate = () => {
    if (selectedFiles.length > 0 && selectedQuestionTypes.length > 0) {
      onFileUpload(selectedFiles, selectedQuestionTypes, totalNewQuestions);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-blue-50' 
            : 'border-gray-300 hover:border-primary'
        }`}
        data-testid="file-upload-dropzone"
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {isDragActive ? 'Dateien hier ablegen...' : 'Dateien hier ablegen oder klicken zum Auswählen'}
          </p>
          <p className="text-sm text-gray-500">
            Unterstützte Formate: .txt (max. 5 Dateien, je 5MB)
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">
              Ausgewählte Dateien ({selectedFiles.length}/5)
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAllFiles}
              className="text-red-500 hover:text-red-700"
              data-testid="button-remove-all-files"
            >
              Alle entfernen
            </Button>
          </div>
          
          {selectedFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between" data-testid={`file-preview-${index}`}>
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-sm" data-testid={`file-name-${index}`}>{file.name}</p>
                  <p className="text-xs text-gray-500" data-testid={`file-size-${index}`}>
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                data-testid={`button-remove-file-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Total New Questions Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Anzahl neuer Fragen</h3>
        <div className="flex items-center space-x-4">
          <Label htmlFor="total-questions" className="text-sm">
            Neue Fragen insgesamt:
          </Label>
          <select 
            id="total-questions"
            value={totalNewQuestions}
            onChange={(e) => setTotalNewQuestions(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value={5}>5 Fragen</option>
            <option value={10}>10 Fragen</option>
            <option value={15}>15 Fragen</option>
            <option value={20}>20 Fragen</option>
            <option value={25}>25 Fragen</option>
            <option value={30}>30 Fragen</option>
          </select>
        </div>
        <p className="text-xs text-gray-500">
          Zusätzlich werden automatisch {Math.round(totalNewQuestions * 3)} Wiederholungsfragen aus falsch beantworteten Fragen hinzugefügt (falls verfügbar).
        </p>
      </div>

      {/* Question Type Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Fragentypen auswählen</h3>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`question-type-${type}`}
                checked={selectedQuestionTypes.includes(type)}
                onCheckedChange={(checked) => handleQuestionTypeChange(type, checked as boolean)}
                data-testid={`checkbox-${type}`}
              />
              <Label htmlFor={`question-type-${type}`} className="text-sm cursor-pointer">
                {questionTypeLabels[type]}
              </Label>
            </div>
          ))}
        </div>
        {selectedQuestionTypes.length === 0 && (
          <p className="text-sm text-red-500">Mindestens ein Fragentyp muss ausgewählt werden</p>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isLoading || selectedFiles.length === 0 || selectedQuestionTypes.length === 0}
        className="w-full bg-primary hover:bg-blue-700 text-white px-8 py-3"
        data-testid="button-generate-questions"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Generiere Fragen...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            {totalNewQuestions} neue Fragen generieren
          </>
        )}
      </Button>
    </div>
  );
}
