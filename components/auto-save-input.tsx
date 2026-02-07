"use client";

import { Input } from "@/components/ui/input";

interface CellInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function CellInput({ value, onChange, onBlur }: CellInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="h-8 text-sm"
    />
  );
}
