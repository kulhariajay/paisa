"use client";

import { ConfirmButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toggleTemplate, deleteTemplate } from "@/app/actions";
import { Trash2, Pause, Play } from "lucide-react";

export function TemplateActions({ id, active }: { id: number; active: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        title={active ? "Pause" : "Resume"}
        onClick={() => toggleTemplate(id, !active)}
      >
        {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <ConfirmButton
        variant="ghost"
        message="Delete this recurring item and all its dues?"
        onConfirm={() => deleteTemplate(id)}
      >
        <Trash2 className="h-4 w-4" />
      </ConfirmButton>
    </div>
  );
}
