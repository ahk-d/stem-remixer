"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import {
  LuDrum,
  LuGuitar,
  LuLoader,
  LuMic,
  LuMusic,
  LuPause,
  LuPlay,
  LuUpload,
} from "react-icons/lu";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  useEdgesState,
  useNodesState,
  BaseEdge,
  EdgeProps,
  getBezierPath,
} from "reactflow";
import "reactflow/dist/style.css";
import WaveSurfer from "wavesurfer.js";

// =================== TYPES ===================

interface SourceNodeData {
  label: string;
  file?: File;
  audioUrl?: string;
}

interface StemNodeData {
  label: string;
  audioUrl?: string;
  color: string;
  icon: JSX.Element;
  id: string;
  loading?: boolean;
  playingStems: string[];
  setPlayingStems: React.Dispatch<React.SetStateAction<string[]>>;
}

type CustomNodeData = SourceNodeData | StemNodeData;

const EDGE_COLORS: Record<string, string> = {
  Drums: "#f59e0b",
  Bass: "#3b82f6",
  Other: "#10b981",
  Vocals: "#ef4444",
};

// =================== CUSTOM EDGE ===================

const MusicEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  animated,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <path
      id={id}
      d={edgePath}
      style={{
        stroke: style?.stroke || "#aaa",
        strokeWidth: animated ? 3 : 2,
        opacity: animated ? 1 : 0.4,
        filter: animated
          ? "drop-shadow(0 0 8px rgba(255,255,255,0.6))"
          : "none",
        transition: "all 0.3s ease",
      }}
      className="react-flow__edge-path"
    />
  );
};

const edgeTypes = { musicEdge: MusicEdge };

// =================== NODES ===================

// ✅ Source Node Component
const SourceNode: React.FC<NodeProps<SourceNodeData>> = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-lg p-4 w-64 text-center relative">
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#fff" }}
      />
      <div className="text-base font-semibold text-white">{data.label}</div>

      {data.file && (
        <div className="mt-1 text-xs text-gray-300 truncate">
          {data.file.name}
        </div>
      )}

      {data.audioUrl && (
        <>
          <audio
            ref={audioRef}
            src={data.audioUrl}
            onEnded={() => setIsPlaying(false)}
          />
          <button
            onClick={handlePlayPause}
            className="mt-3 p-2 w-full rounded bg-neutral-800 text-white hover:bg-neutral-700 transition"
          >
            {isPlaying ? <LuPause /> : <LuPlay />}
          </button>
        </>
      )}
    </div>
  );
};

// ✅ Stem Node Component
const StemNode: React.FC<NodeProps<StemNodeData>> = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRef = React.useRef<HTMLDivElement | null>(null);
  const wavesurfer = React.useRef<WaveSurfer | null>(null);

  // ✅ Load Spotify-like waveform
  useEffect(() => {
    if (data.audioUrl && waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "rgba(255,255,255,0.3)",
        progressColor: data.color,
        cursorColor: "transparent",
        barWidth: 2,
        barRadius: 2,
        responsive: true,
        height: 50,
        normalize: true,
        barGap: 2,
      });
      wavesurfer.current.load(data.audioUrl);
    }

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [data.audioUrl]);

  const handlePlayPause = () => {
    if (!wavesurfer.current) return;
    wavesurfer.current.playPause();
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      data.setPlayingStems((prev) => prev.filter((id) => id !== data.id));
    } else {
      data.setPlayingStems((prev) => [...prev, data.id]);
    }
  };

  return (
    <div
      className="bg-neutral-900 border rounded-xl shadow-lg p-4 w-80 text-center relative"
      style={{ borderColor: data.color }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: data.color }}
      />

      <div
        className="flex items-center justify-center gap-2 mb-2 text-sm font-medium text-white"
      >
        {data.icon}
        <span>{data.label}</span>
      </div>

      {/* ✅ Waveform Container */}
      <div ref={waveformRef} className="w-full h-12 my-2"></div>

      {data.audioUrl && (
        <button
          onClick={handlePlayPause}
          className="mt-2 p-2 w-full rounded bg-neutral-800 hover:bg-neutral-700 transition text-white"
        >
          {isPlaying ? (
            <LuPause style={{ color: data.color }} />
          ) : (
            <LuPlay style={{ color: data.color }} />
          )}
        </button>
      )}
    </div>
  );
};

// =================== NODE TYPES ===================

const nodeTypes = {
  stemNode: (props: NodeProps<StemNodeData>) => <StemNode {...props} />,
  sourceNode: SourceNode,
};

// =================== INITIAL STATE ===================

const initialNodes: Node<CustomNodeData>[] = [
  {
    id: "1",
    type: "sourceNode",
    position: { x: 0, y: 0 },
    data: { label: "Source" },
    sourcePosition: Position.Right,
  },
];

// =================== MAIN APP ===================

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [gradioClient, setGradioClient] = useState<any | null>(null);
  const [playingStems, setPlayingStems] = useState<string[]>([]);

  // ✅ Load Gradio Client dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";
    script.type = "module";

    script.onload = () => {
      (async () => {
        const gradio = await import(
          /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js"
        );
        setGradioClient(gradio);
      })();
    };

    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // ✅ Handle File Upload
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const selectedFile = e.target.files[0];
      const url = URL.createObjectURL(selectedFile);
      setFile(selectedFile);
      setFileUrl(url);

      setNodes((nds) =>
        nds.map((node) =>
          node.id === "1"
            ? {
                ...node,
                data: { ...node.data, file: selectedFile, audioUrl: url },
              }
            : node
        )
      );

      setEdges([]);
    }
  };

  // ✅ Animate edges only when audio is playing
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: playingStems.includes(edge.target),
      }))
    );
  }, [playingStems]);

  // ✅ Separate Stems
  const handleSeparate = async () => {
    if (!file) return alert("Please upload a file first.");
    if (!gradioClient) return alert("Gradio client is loading. Try again.");

    setIsLoading(true);
    setEdges([]);

    const stems = [
      { id: "2", label: "Drums", icon: <LuDrum />, color: EDGE_COLORS.Drums, y: -180 },
      { id: "3", label: "Bass", icon: <LuMusic />, color: EDGE_COLORS.Bass, y: 0 },
      { id: "4", label: "Other", icon: <LuGuitar />, color: EDGE_COLORS.Other, y: 180 },
      { id: "5", label: "Vocals", icon: <LuMic />, color: EDGE_COLORS.Vocals, y: 360 },
    ];

    // ✅ Add placeholders
    const placeholderNodes: Node<CustomNodeData>[] = stems.map((stem) => ({
      id: stem.id,
      type: "stemNode",
      position: { x: 400, y: stem.y },
      data: {
        label: stem.label,
        color: stem.color,
        icon: stem.icon,
        id: stem.id,
        loading: true,
        playingStems,
        setPlayingStems,
      },
      targetPosition: Position.Left,
    }));

    const placeholderEdges: Edge[] = stems.map((stem) => ({
      id: `e1-${stem.id}`,
      source: "1",
      target: stem.id,
      type: "musicEdge",
      animated: false,
      style: { stroke: stem.color },
    }));

    setNodes((prev) => [...prev, ...placeholderNodes]);
    setEdges(placeholderEdges);

    try {
      // ✅ Call API
      const app = await gradioClient.client("ahk-d/HT-Demucs-Stem-Separation-2025");
      const result = await app.predict("/separate_stems", [
        gradioClient.handle_file(file),
      ]);
      const [drumsData, bassData, otherData, vocalsData] = result.data;

      const urls = {
        Drums: drumsData?.url,
        Bass: bassData?.url,
        Other: otherData?.url,
        Vocals: vocalsData?.url,
      };

      // ✅ Update placeholder nodes
      setNodes((prev) =>
        prev.map((node) => {
          if (["2", "3", "4", "5"].includes(node.id)) {
            const label = (node.data as StemNodeData).label;
            return {
              ...node,
              data: {
                ...(node.data as StemNodeData),
                loading: false,
                audioUrl: urls[label as keyof typeof urls],
              },
            };
          }
          return node;
        })
      );
    } catch (err) {
      console.error("Separation failed:", err);
      alert("❌ Stem separation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // =================== RENDER ===================

  return (
    <div className="w-screen h-screen bg-neutral-950 relative">
      {/* ✅ Full-screen ReactFlow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        style={{ width: "100%", height: "100%" }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={14} size={1} />
      </ReactFlow>

      {/* ✅ Floating Toolbar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 
                      w-[600px] bg-neutral-900 border border-neutral-700 shadow-md 
                      rounded-md px-5 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white whitespace-nowrap">
          Music Stem Separator
        </h1>

        {/* Upload Box */}
        <div className="relative flex-1 h-12 border border-neutral-700 rounded-md 
                        px-4 flex items-center hover:border-neutral-500 transition">
          <LuUpload className="text-xl text-gray-300 mr-2" />
          <p className="text-gray-300 text-sm truncate">
            {file ? file.name : "Click to upload a song"}
          </p>
          <input
            type="file"
            onChange={handleFileChange}
            accept="audio/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Separate Button */}
        <button
          onClick={handleSeparate}
          disabled={!file || isLoading || !gradioClient}
          className="h-12 px-5 rounded-md bg-green-600 text-white text-sm font-medium 
                     hover:bg-green-500 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? <LuLoader className="animate-spin text-xl" /> : "Separate"}
        </button>
      </div>
    </div>
  );
}
