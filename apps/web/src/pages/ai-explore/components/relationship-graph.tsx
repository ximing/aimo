import { useState, useCallback, useMemo } from 'react';
import type { RelationGraphDto, RelationGraphNodeDto, RelationGraphEdgeDto } from '@aimo/dto';
import { GitBranch, X, Maximize2, Minimize2, ArrowRight } from 'lucide-react';

interface RelationshipGraphProps {
  graph: RelationGraphDto;
  onNodeClick?: (nodeId: string) => void;
  onExploreRelated?: (topic: string) => void;
  onClose?: () => void;
}

/**
 * Relationship Graph Widget
 * Displays a visual graph of note relationships
 * Features:
 * - Interactive node click to view memo details
 * - Edge labels showing relationship types
 * - Expandable/collapsible
 * - "Explore Related" suggestions
 */
export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  graph,
  onNodeClick,
  onExploreRelated,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      onNodeClick?.(nodeId);
    },
    [onNodeClick]
  );

  // Calculate graph layout using simple force-directed approach
  const { nodes, edges } = useMemo(() => {
    const width = isExpanded ? 600 : 320;
    const height = isExpanded ? 400 : 240;
    const centerX = width / 2;
    const centerY = height / 2;

    // Position center node
    const positionedNodes = graph.nodes.map((node) => {
      if (node.id === graph.centerMemoId) {
        return { ...node, x: centerX, y: centerY };
      }

      // Position other nodes in a circle around center
      const otherNodes = graph.nodes.filter((n) => n.id !== graph.centerMemoId);
      const nodeIndex = otherNodes.findIndex((n) => n.id === node.id);
      const angle = (nodeIndex / Math.max(1, otherNodes.length)) * 2 * Math.PI - Math.PI / 2;
      const radius = Math.min(width, height) * 0.35;

      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    return { nodes: positionedNodes, edges: graph.edges };
  }, [graph, isExpanded]);

  // Get node color based on type
  const getNodeColor = (node: RelationGraphNodeDto) => {
    switch (node.type) {
      case 'source':
        return '#3b82f6'; // primary-500
      case 'related':
        return '#10b981'; // emerald-500
      case 'backlink':
        return '#f59e0b'; // amber-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  // Get node size based on type
  const getNodeRadius = (node: RelationGraphNodeDto) => {
    return node.type === 'source' ? 24 : 16;
  };

  // Get edge color based on type
  const getEdgeColor = (edge: RelationGraphEdgeDto) => {
    switch (edge.type) {
      case 'outgoing':
        return '#3b82f6';
      case 'incoming':
        return '#f59e0b';
      case 'thematic':
        return '#8b5cf6'; // violet-500
      case 'temporal':
        return '#06b6d4'; // cyan-500
      default:
        return '#9ca3af';
    }
  };

  // Get edge style based on type
  const getEdgeStyle = (edge: RelationGraphEdgeDto): React.CSSProperties => {
    switch (edge.type) {
      case 'thematic':
        return { strokeDasharray: '4,4' };
      case 'temporal':
        return { strokeDasharray: '2,2' };
      default:
        return {};
    }
  };

  // Calculate edge path
  const getEdgePath = (edge: RelationGraphEdgeDto) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return '';

    // Calculate intersection with node circles
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const angle = Math.atan2(dy, dx);

    const sourceRadius = getNodeRadius(sourceNode as RelationGraphNodeDto);
    const targetRadius = getNodeRadius(targetNode as RelationGraphNodeDto);

    const x1 = sourceNode.x + Math.cos(angle) * sourceRadius;
    const y1 = sourceNode.y + Math.sin(angle) * sourceRadius;
    const x2 = targetNode.x - Math.cos(angle) * targetRadius;
    const y2 = targetNode.y - Math.sin(angle) * targetRadius;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  };

  return (
    <div
      className={`bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'w-full max-w-2xl' : 'w-full max-w-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">关系图谱</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({nodes.length} 个笔记, {edges.length} 个关联)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Graph Visualization */}
      <div className={`relative ${isExpanded ? 'h-96' : 'h-60'}`}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${isExpanded ? 600 : 320} ${isExpanded ? 400 : 240}`}
          className="cursor-grab active:cursor-grabbing"
        >
          {/* Edges */}
          {edges.map((edge, index) => (
            <g key={`edge-${index}`}>
              <path
                d={getEdgePath(edge)}
                stroke={getEdgeColor(edge)}
                strokeWidth={2}
                fill="none"
                opacity={0.6}
                style={getEdgeStyle(edge)}
              />
              {/* Edge label */}
              {isExpanded && edge.label && (
                <text
                  x={
                    ((nodes.find((n) => n.id === edge.source)?.x || 0) +
                      (nodes.find((n) => n.id === edge.target)?.x || 0)) /
                    2
                  }
                  y={
                    ((nodes.find((n) => n.id === edge.source)?.y || 0) +
                      (nodes.find((n) => n.id === edge.target)?.y || 0)) /
                      2 -
                    5
                  }
                  textAnchor="middle"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                  style={{ fontSize: '10px' }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          ))}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => handleNodeClick(node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Node circle */}
              <circle
                r={getNodeRadius(node)}
                fill={getNodeColor(node)}
                stroke={selectedNodeId === node.id ? '#1f2937' : 'white'}
                strokeWidth={selectedNodeId === node.id ? 3 : 2}
                className="transition-all duration-200"
                opacity={hoveredNodeId && hoveredNodeId !== node.id ? 0.5 : 1}
              />

              {/* Node icon or initial */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="text-white text-xs font-medium pointer-events-none"
                style={{ fontSize: node.type === 'source' ? '14px' : '10px' }}
              >
                {node.type === 'source' ? '★' : node.title.charAt(0)}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-dark-800/90 rounded-lg border border-gray-200 dark:border-dark-700">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">中心</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-dark-800/90 rounded-lg border border-gray-200 dark:border-dark-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-600 dark:text-gray-400">引用</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-dark-800/90 rounded-lg border border-gray-200 dark:border-dark-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-600 dark:text-gray-400">被引用</span>
          </div>
        </div>
      </div>

      {/* Analysis */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">{graph.analysis}</p>
      </div>

      {/* Explore Related Button */}
      {onExploreRelated && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
          <button
            onClick={() => onExploreRelated('基于当前话题深入探索')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            探索相关
          </button>
        </div>
      )}
    </div>
  );
};
