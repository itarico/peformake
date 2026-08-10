import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface Props {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}

export default function AgentSliderField({ label, value, min = 0, max = 10, step = 1, onChange, leftLabel, rightLabel }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-bold text-primary">{value}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
