import type { CanvasNode, Connection } from './FlowCanvas';

interface Props {
  nodes: CanvasNode[];
  connections: Connection[];
  nodeWidth: number;
  nodeHeight: number;
}

export default function FlowConnections({ nodes, connections, nodeWidth, nodeHeight }: Props) {
  return (
    <>
      <defs>
        <marker id="arrow-gray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#6b7280" />
        </marker>
        <marker id="arrow-orange" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#f97316" />
        </marker>
        <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#22c55e" />
        </marker>
        <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#ef4444" />
        </marker>
      </defs>
      {connections.map((conn, i) => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return null;

        const fromX = (fromNode.position_x || 0) + nodeWidth / 2;
        const fromY = (fromNode.position_y || 0) + nodeHeight + 8;
        const toX = (toNode.position_x || 0) + nodeWidth / 2;
        const toY = (toNode.position_y || 0) - 8;

        // Bezier curve
        const midY = (fromY + toY) / 2;
        const controlOffset = Math.abs(toY - fromY) * 0.4;
        const path = `M ${fromX} ${fromY} C ${fromX} ${fromY + controlOffset}, ${toX} ${toY - controlOffset}, ${toX} ${toY}`;

        const arrowId = conn.color === '#f97316' ? 'arrow-orange' : conn.color === '#22c55e' ? 'arrow-green' : conn.color === '#ef4444' ? 'arrow-red' : 'arrow-gray';

        return (
          <g key={`${conn.from}-${conn.to}-${i}`}>
            <path d={path} fill="none" stroke={conn.color || '#6b7280'} strokeWidth={2} markerEnd={`url(#${arrowId})`} opacity={0.7} />
            {conn.label && (
              <text x={(fromX + toX) / 2} y={midY - 6} textAnchor="middle" className="text-[9px] fill-muted-foreground font-medium" style={{ fontSize: '9px' }}>
                {conn.label}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
