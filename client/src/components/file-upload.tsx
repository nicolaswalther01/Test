import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Upload,
  X,
  FileText,
  Wand2,
  BookOpen,
  Briefcase,
  Link,
  Edit3,
  GraduationCap,
  Target,
  Shuffle,
} from "lucide-react";
import { QuestionType } from "@shared/schema";

interface FileUploadProps {
  onFileUpload: (
    files: File[],
    questionTypes: QuestionType[],
    totalQuestions: number,
    difficulty: "basic" | "profi" | "random",
  ) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<
    QuestionType[]
  >(["definition", "case", "assignment", "open"]);
  const [totalQuestions, setTotalQuestions] = useState<number>(25);
  const [difficulty, setDifficulty] = useState<"basic" | "profi" | "random">("basic");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev, ...acceptedFiles];
      return newFiles.slice(0, 6); // Limit to 6 files
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
    },
    maxFiles: 6,
    maxSize: 5 * 1024 * 1024, // 5MB per file
  });

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllFiles = () => {
    setSelectedFiles([]);
  };

  const handleGenerate = () => {
    if (selectedFiles.length > 0 && selectedQuestionTypes.length > 0) {
      onFileUpload(
        selectedFiles,
        selectedQuestionTypes,
        totalQuestions,
        difficulty,
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-blue-50"
            : "border-gray-300 hover:border-primary"
        }`}
        data-testid="file-upload-dropzone"
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {isDragActive
              ? "Dateien hier ablegen..."
              : "Dateien hier ablegen oder klicken zum Auswählen"}
          </p>
          <p className="text-sm text-gray-500">
            Unterstützte Formate: .txt (max. 6 Dateien, je 5MB)
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">
              Ausgewählte Dateien ({selectedFiles.length}/6)
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
            <div
              key={`${file.name}-${index}`}
              className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
              data-testid={`file-preview-${index}`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <p
                    className="font-medium text-sm"
                    data-testid={`file-name-${index}`}
                  >
                    {file.name}
                  </p>
                  <p
                    className="text-xs text-gray-500"
                    data-testid={`file-size-${index}`}
                  >
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

      {/* Total Questions Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Anzahl Fragen</h3>
        <ToggleGroup
          type="single"
          value={String(totalQuestions)}
          onValueChange={(val) => val && setTotalQuestions(Number(val))}
          className="grid grid-cols-2 gap-2"
        >
          <ToggleGroupItem
            value="25"
            aria-label="25 Fragen"
            className="flex items-center justify-center gap-2 data-[state=on]:bg-blue-100 data-[state=on]:text-primary"
          >
            <span className="text-sm">25</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="50"
            aria-label="50 Fragen"
            className="flex items-center justify-center gap-2 data-[state=on]:bg-green-100 data-[state=on]:text-secondary"
          >
            <span className="text-sm">50</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="75"
            aria-label="75 Fragen"
            className="flex items-center justify-center gap-2 data-[state=on]:bg-purple-100 data-[state=on]:text-purple-700"
          >
            <span className="text-sm">75</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="100"
            aria-label="100 Fragen"
            className="flex items-center justify-center gap-2 data-[state=on]:bg-orange-100 data-[state=on]:text-accent"
          >
            <span className="text-sm">100</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-gray-500">
          Davon ca. {Math.round(totalQuestions / 3)} neue und{" "}
          {totalQuestions - Math.round(totalQuestions / 3)} Wiederholungsfragen.
          Falls nicht genügend Wiederholungsfragen vorhanden sind, werden neue
          Fragen ergänzt.
        </p>
      </div>

      {/* Question Type Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Fragentypen auswählen</h3>
        <ToggleGroup
          type="multiple"
          value={selectedQuestionTypes}
          onValueChange={(vals) =>
            setSelectedQuestionTypes(vals as QuestionType[])
          }
          className="grid grid-cols-2 gap-2"
        >
          <ToggleGroupItem
            value="definition"
            aria-label="Definitionsfragen"
            data-testid="toggle-definition"
            className="flex items-center gap-2 data-[state=on]:bg-blue-100 data-[state=on]:text-primary"
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm">Definition</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="case"
            aria-label="Fallfragen"
            data-testid="toggle-case"
            className="flex items-center gap-2 data-[state=on]:bg-green-100 data-[state=on]:text-secondary"
          >
            <Briefcase className="h-4 w-4" />
            <span className="text-sm">Fallfrage</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="assignment"
            aria-label="Zuordnungsfragen"
            data-testid="toggle-assignment"
            className="flex items-center gap-2 data-[state=on]:bg-purple-100 data-[state=on]:text-purple-700"
          >
            <Link className="h-4 w-4" />
            <span className="text-sm">Zuordnung</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="open"
            aria-label="Offene Fragen"
            data-testid="toggle-open"
            className="flex items-center gap-2 data-[state=on]:bg-orange-100 data-[state=on]:text-accent"
          >
            <Edit3 className="h-4 w-4" />
            <span className="text-sm">Offene Frage</span>
          </ToggleGroupItem>
        </ToggleGroup>
        {selectedQuestionTypes.length === 0 && (
          <p className="text-sm text-red-500">
            Mindestens ein Fragentyp muss ausgewählt werden
          </p>
        )}
      </div>

      {/* Difficulty selector */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Schwierigkeitsgrad</h3>
        <ToggleGroup
          type="single"
          value={difficulty}
          onValueChange={(val) => val && setDifficulty(val as "basic" | "profi" | "random")}
          className="grid grid-cols-3 gap-2"
        >
          <ToggleGroupItem
            value="basic"
            aria-label="Basic-Modus"
            className="flex items-center justify-center gap-2 data-[state=on]:bg-blue-100 data-[state=on]:text-primary"
          >
            <GraduationCap className="h-4 w-4" />
            <span className="text-sm">Basic</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="profi"
            aria-label="Profi-Modus"
            className="flex items-center justify-center gap-2 data-[state=on]:bg-green-100 data-[state=on]:text-secondary"
          >
            <Target className="h-4 w-4" />
            <span className="text-sm">Profi</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="random"
            aria-label="Zufalls-Modus"
            className="flex items-center justify-center gap-2 data-[state=on]:bg-purple-100 data-[state=on]:text-purple-700"
          >
            <Shuffle className="h-4 w-4" />
            <span className="text-sm">Zufällig</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-gray-600 mt-1">
          {difficulty === "profi"
            ? "Profi-Modus: Längere Fragen mit irrelevanten Details und sehr ähnliche Antwortoptionen"
            : difficulty === "random"
            ? "Zufalls-Modus: Jede Frage wird zufällig als Basic oder Profi generiert"
            : "Basic-Modus: Direkte Fragen mit klaren Unterschieden zwischen den Antworten"}
        </p>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={
          isLoading ||
          selectedFiles.length === 0 ||
          selectedQuestionTypes.length === 0
        }
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
            Quiz mit {totalQuestions} Fragen starten (
            {difficulty === "profi" ? "Profi" : difficulty === "random" ? "Zufällig" : "Basic"})
          </>
        )}
      </Button>
    </div>
  );
}
