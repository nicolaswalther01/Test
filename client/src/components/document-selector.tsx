import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface DocumentInfo {
  id: number;
  filename: string;
  uploadedAt: string;
}

interface DocumentSelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function DocumentSelector({ selectedIds, onChange }: DocumentSelectorProps) {
  const { data: documents } = useQuery<DocumentInfo[]>({
    queryKey: ["/api/documents"],
  });

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((d) => d !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Collapsible className="w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700">Gespeicherte Dateien</h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="mt-2 space-y-2">
        {documents?.map((doc) => (
          <label key={doc.id} className="flex items-center space-x-2">
            <Checkbox
              checked={selectedIds.includes(doc.id)}
              onCheckedChange={() => toggle(doc.id)}
            />
            <span className="text-sm">{doc.filename}</span>
          </label>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
