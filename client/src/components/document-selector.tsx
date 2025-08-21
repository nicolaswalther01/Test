import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ChevronDown, ChevronRight, FileText } from "lucide-react";

interface DocumentSelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

interface DocumentMeta {
  id: number;
  filename: string;
  uploadedAt: string;
}

export function DocumentSelector({ selectedIds, onChange }: DocumentSelectorProps) {
  const [open, setOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, refetch } = useQuery<DocumentMeta[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Fehler beim Laden der Dokumente");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("textFiles", file);
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = "";
    }
  };

  const toggleSelection = (id: number, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((d) => d !== id));
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="flex items-center text-sm font-medium"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          Dokumente
        </button>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
          {documents?.map((doc) => (
            <div key={doc.id} className="flex items-center space-x-2">
              <Checkbox
                id={`doc-${doc.id}`}
                checked={selectedIds.includes(doc.id)}
                onCheckedChange={(c) => toggleSelection(doc.id, !!c)}
              />
              <label htmlFor={`doc-${doc.id}`} className="flex items-center text-sm"> 
                <FileText className="h-4 w-4 mr-2" />
                {doc.filename}
              </label>
            </div>
          ))}
          {documents && documents.length === 0 && (
            <p className="text-sm text-gray-500">Keine Dokumente vorhanden</p>
          )}
        </div>
      )}
    </div>
  );
}
