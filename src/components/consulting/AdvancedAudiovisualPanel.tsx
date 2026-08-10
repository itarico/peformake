import {
  AudiovisualProvider,
  ContextDisplay,
} from './audiovisual';
import { UnifiedAudiovisualFlow } from './audiovisual/UnifiedAudiovisualFlow';

interface AdvancedAudiovisualPanelProps {
  instanceId: string;
  clientId: string;
  monthId: string;
  disabled?: boolean;
  clientName?: string;
}

export function AdvancedAudiovisualPanel({
  instanceId,
  clientId,
  monthId,
  disabled = false,
  clientName,
}: AdvancedAudiovisualPanelProps) {
  return (
    <AudiovisualProvider
      clientId={clientId}
      monthId={monthId}
      instanceId={instanceId}
    >
      <div className="space-y-6">
        <ContextDisplay clientId={clientId} monthId={monthId} />
        <UnifiedAudiovisualFlow
          instanceId={instanceId}
          monthId={monthId}
          disabled={disabled}
          clientName={clientName}
        />
      </div>
    </AudiovisualProvider>
  );
}
