"use client";

import { motion } from "framer-motion";
import { AtlasMark } from "@/components/AtlasMark";
import type { AtlasCanvasNode, AtlasCanvasState } from "./atlasCanvasState";

const CORE_POSITION = { x: 52, y: 48 };

const SATELLITES = [
  { id: "sat-1", x: 36, y: 30 },
  { id: "sat-2", x: 44, y: 18 },
  { id: "sat-3", x: 66, y: 22 },
  { id: "sat-4", x: 77, y: 36 },
  { id: "sat-5", x: 75, y: 64 },
  { id: "sat-6", x: 61, y: 79 },
  { id: "sat-7", x: 39, y: 76 },
  { id: "sat-8", x: 28, y: 58 },
];

function findNode(state: AtlasCanvasState, id: string | null) {
  return state.nodes.find((node) => node.id === id) ?? null;
}

function getNodeLinkSets(state: AtlasCanvasState) {
  const domainLinks = state.nodes
    .filter((node) => node.kind === "domain")
    .map((node) => ({ from: CORE_POSITION, to: { x: node.x, y: node.y }, strong: node.id === `domain-${state.domain}` }));

  if (state.status === "idle") {
    return { domainLinks, branchLinks: [], reportLinks: [] };
  }

  const activeDomainNode = state.nodes.find((node) => node.id === `domain-${state.domain}`) ?? null;
  const branchTargets = state.nodes.filter((node) => ["insight", "signal", "memory", "next"].includes(node.kind));
  const reportTargets = state.nodes.filter((node) => node.kind === "report");

  const branchLinks = activeDomainNode
    ? branchTargets.map((node) => ({ from: { x: activeDomainNode.x, y: activeDomainNode.y }, to: { x: node.x, y: node.y } }))
    : [];

  const insightNode = state.nodes.find((node) => node.kind === "insight") ?? null;
  const reportLinks = insightNode
    ? reportTargets.map((node) => ({ from: { x: insightNode.x, y: insightNode.y }, to: { x: node.x, y: node.y } }))
    : [];

  return { domainLinks, branchLinks, reportLinks };
}

export function AtlasCanvasViewport({
  state,
  activeNodeId,
  isPending,
  onNodeSelect,
}: {
  state: AtlasCanvasState;
  activeNodeId: string | null;
  isPending: boolean;
  onNodeSelect: (node: AtlasCanvasNode) => void;
}) {
  const activeNode = findNode(state, activeNodeId) ?? findNode(state, state.focusNodeId);
  const { domainLinks, branchLinks, reportLinks } = getNodeLinkSets(state);

  return (
    <div className="atlas-canvas-viewport" data-state={state.status}>
      <div className="atlas-canvas-grid" aria-hidden="true" />
      <svg className="atlas-canvas-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="atlasCanvasLink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--atlas-canvas-link-a)" />
            <stop offset="100%" stopColor="var(--atlas-canvas-link-b)" />
          </linearGradient>
        </defs>

        {SATELLITES.map((satellite) => (
          <line
            key={satellite.id}
            x1={String(CORE_POSITION.x)}
            y1={String(CORE_POSITION.y)}
            x2={String(satellite.x)}
            y2={String(satellite.y)}
            stroke="url(#atlasCanvasLink)"
            strokeOpacity="0.18"
            strokeWidth="0.1"
          />
        ))}

        {domainLinks.map((link, index) => (
          <line
            key={`domain-${index}`}
            x1={String(link.from.x)}
            y1={String(link.from.y)}
            x2={String(link.to.x)}
            y2={String(link.to.y)}
            stroke="url(#atlasCanvasLink)"
            strokeOpacity={link.strong ? 0.64 : 0.2}
            strokeWidth={link.strong ? 0.22 : 0.1}
          />
        ))}

        {branchLinks.map((link, index) => (
          <line
            key={`branch-${index}`}
            x1={String(link.from.x)}
            y1={String(link.from.y)}
            x2={String(link.to.x)}
            y2={String(link.to.y)}
            stroke="url(#atlasCanvasLink)"
            strokeOpacity="0.48"
            strokeWidth="0.12"
          />
        ))}

        {reportLinks.map((link, index) => (
          <line
            key={`report-${index}`}
            x1={String(link.from.x)}
            y1={String(link.from.y)}
            x2={String(link.to.x)}
            y2={String(link.to.y)}
            stroke="url(#atlasCanvasLink)"
            strokeOpacity="0.26"
            strokeWidth="0.09"
            strokeDasharray="0.42 0.32"
          />
        ))}
      </svg>

      <motion.div
        className="atlas-canvas-core"
        initial={{ opacity: 0.74, scale: 0.97 }}
        animate={{ opacity: isPending ? 1 : 0.94, scale: isPending ? 1.03 : 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="atlas-canvas-core-cloud atlas-canvas-core-cloud-a" />
        <div className="atlas-canvas-core-cloud atlas-canvas-core-cloud-b" />
        <div className="atlas-canvas-core-brainline atlas-canvas-core-brainline-a" />
        <div className="atlas-canvas-core-brainline atlas-canvas-core-brainline-b" />
        <div className="atlas-canvas-core-brainline atlas-canvas-core-brainline-c" />
        <div className="atlas-canvas-core-cluster">
          {SATELLITES.map((satellite) => (
            <span
              key={satellite.id}
              className="atlas-canvas-core-neuron"
              style={{ left: `${satellite.x}%`, top: `${satellite.y}%` }}
            />
          ))}
          <div className="atlas-canvas-core-center">
            <AtlasMark size="lg" />
          </div>
        </div>
      </motion.div>

      {activeNode ? (
        <div className="atlas-canvas-focusline">
          <span className="atlas-canvas-focus-kicker">{activeNode.label}</span>
          <p className="atlas-canvas-focus-copy">{activeNode.detail}</p>
        </div>
      ) : null}

      {state.nodes.map((node, index) => {
        const isActive = activeNode?.id === node.id;
        return (
          <motion.button
            key={node.id}
            type="button"
            className="atlas-canvas-node"
            data-kind={node.kind}
            data-tone={node.tone}
            data-size={node.size ?? "md"}
            data-active={isActive ? "true" : "false"}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: isActive ? 1.03 : 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: Math.min(index * 0.025, 0.18) }}
            onClick={() => onNodeSelect(node)}
          >
            <span className="atlas-canvas-node-kicker">{node.label}</span>
            <span className="atlas-canvas-node-copy">{node.detail}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
