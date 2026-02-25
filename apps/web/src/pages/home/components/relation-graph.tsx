import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { MemoListItemDto } from '@aimo/dto';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  content: string;
  createdAt: number;
  type: 'center' | 'forward' | 'backlink';
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'forward' | 'backlink';
}

interface RelationGraphProps {
  centerMemo: MemoListItemDto;
  forwardMemos: MemoListItemDto[];
  backlinkMemos: MemoListItemDto[];
  onNodeClick?: (memoId: string) => void;
  width?: number;
  height?: number;
}

const MAX_NODES = 50;

const extractTitle = (content: string, maxLength = 30): string => {
  const withoutImages = content.replace(/!\[.*?\]\((.*?)\)/g, '');
  const withoutLinks = withoutImages.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  const plainText = withoutLinks
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/\n/g, ' ')
    .trim();

  return plainText.length > maxLength
    ? plainText.substring(0, maxLength) + '...'
    : plainText || '无标题';
};

export const RelationGraph = ({
  centerMemo,
  forwardMemos,
  backlinkMemos,
  onNodeClick,
  width = 700,
  height = 400,
}: RelationGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  const handleNodeClick = useCallback(
    (event: MouseEvent, node: GraphNode) => {
      event.stopPropagation();
      if (onNodeClick && node.id !== centerMemo.memoId) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick, centerMemo.memoId]
  );

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Clear SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Prepare data with node limit
    const nodes: GraphNode[] = [
      {
        id: centerMemo.memoId,
        content: centerMemo.content,
        createdAt: centerMemo.createdAt,
        type: 'center',
      },
    ];

    const links: GraphLink[] = [];

    // Add forward relations (limited to keep total under MAX_NODES)
    const maxForward = Math.min(forwardMemos.length, Math.floor((MAX_NODES - 1) / 2));
    const maxBacklinks = Math.min(backlinkMemos.length, MAX_NODES - 1 - maxForward);

    forwardMemos.slice(0, maxForward).forEach((memo) => {
      nodes.push({
        id: memo.memoId,
        content: memo.content,
        createdAt: memo.createdAt,
        type: 'forward',
      });
      links.push({
        source: centerMemo.memoId,
        target: memo.memoId,
        type: 'forward',
      });
    });

    // Add backlinks
    backlinkMemos.slice(0, maxBacklinks).forEach((memo) => {
      nodes.push({
        id: memo.memoId,
        content: memo.content,
        createdAt: memo.createdAt,
        type: 'backlink',
      });
      links.push({
        source: memo.memoId,
        target: centerMemo.memoId,
        type: 'backlink',
      });
    });

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create main group for zoom
    const g = svg.append('g');

    // Define arrow markers
    const defs = svg.append('defs');

    // Forward link arrow (blue)
    defs
      .append('marker')
      .attr('id', 'arrow-forward')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3b82f6');

    // Backlink arrow (green, dashed)
    defs
      .append('marker')
      .attr('id', 'arrow-backlink')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#22c55e');

    // Create simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => (d.type === 'forward' ? 120 : 100))
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    // Create links
    const link = g
      .append('g')
      .attr('stroke-opacity', 0.8)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => (d.type === 'forward' ? '#3b82f6' : '#22c55e'))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d) => (d.type === 'forward' ? '0' : '5,5'))
      .attr('marker-end', (d) =>
        d.type === 'forward' ? 'url(#arrow-forward)' : 'url(#arrow-backlink)'
      );

    // Create drag behavior
    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Create nodes group
    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', (d) => (d.type === 'center' ? 'default' : 'pointer'))
      .call(
        dragBehavior as unknown as (
          selection: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>
        ) => void
      )
      .on('click', handleNodeClick);

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', (d) => (d.type === 'center' ? 24 : 18))
      .attr('fill', (d) => {
        if (d.type === 'center') return '#f59e0b';
        if (d.type === 'forward') return '#3b82f6';
        return '#22c55e';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Add labels to nodes
    node
      .append('text')
      .text((d) => extractTitle(d.content))
      .attr('x', (d) => (d.type === 'center' ? 28 : 24))
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('font-weight', (d) => (d.type === 'center' ? '600' : '400'))
      .attr('fill', '#374151')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [centerMemo, forwardMemos, backlinkMemos, width, height, handleNodeClick]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
        style={{ minHeight: height }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-dark-700 p-3 shadow-sm">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">图例</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">当前笔记</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">主动关联</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">被关联</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 dark:text-gray-500">
        拖拽节点 · 滚轮缩放 · 点击查看
      </div>
    </div>
  );
};

export default RelationGraph;
