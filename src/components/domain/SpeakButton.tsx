import { Button } from '@/components/ui/Button';
import { voiceService } from '@/services/voice';

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export function SpeakButton({ text, label = '语音播报', className = '' }: Props) {
  const supported = voiceService.isSupported();
  return (
    <Button
      variant="secondary"
      size="lg"
      className={className}
      disabled={!supported}
      onClick={() => voiceService.speak(text, { force: true })}
      aria-label="语音播报"
    >
      <span aria-hidden>🔊</span>
      <span>{label}</span>
    </Button>
  );
}
