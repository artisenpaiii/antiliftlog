"use client";

import { Input } from "@/components/ui/input";

interface CellInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
}

export function CellInput({ value, onChange, onBlur, placeholder }: CellInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="h-8 min-w-[8rem] text-sm"
    />
  );
}
