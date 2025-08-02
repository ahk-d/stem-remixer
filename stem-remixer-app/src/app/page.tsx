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
  LuArrowRight,
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
  registerWaveSurfer: (id: string, ws: WaveSurfer | null) => void;
  markReady: (id: string) => void;
  addTransformNode: (parentId: string, effect: string) => void; // ✅ new
}

interface TransformEffectNodeData {
  label: string;
  effect: string;
  color: string;
}

type CustomNodeData = SourceNodeData | StemNodeData | TransformEffectNodeData;

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
      <Handle type="source" position={Position.Right} style={{ background: "#fff" }} />
      <div className="text-base font-semibold text-white">{data.label}</div>

      {data.file && (
        <div className="mt-1 text-xs text-gray-300 truncate">{data.file.name}</div>
      )}

      {data.audioUrl && (
        <>
          <audio ref={audioRef} src={data.audioUrl} onEnded={() => setIsPlaying(false)} />
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

const StemNode: React.FC<NodeProps<StemNodeData>> = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState("");
  const waveformRef = React.useRef<HTMLDivElement | null>(null);
  const wavesurfer = React.useRef<WaveSurfer | null>(null);

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

      wavesurfer.current.on("play", () => {
        setIsPlaying(true);
        data.setPlayingStems((prev) => [...new Set([...prev, data.id])]);
      });

      wavesurfer.current.on("pause", () => {
        setIsPlaying(false);
        data.setPlayingStems((prev) => prev.filter((id) => id !== data.id));
      });

      wavesurfer.current.on("finish", () => {
        setIsPlaying(false);
        data.setPlayingStems((prev) => prev.filter((id) => id !== data.id));
      });

      data.registerWaveSurfer(data.id, wavesurfer.current);

      wavesurfer.current.on("ready", () => {
        data.markReady(data.id);
      });
    }

    return () => {
      wavesurfer.current?.destroy();
      data.registerWaveSurfer(data.id, null);
    };
  }, [data.audioUrl]);

  const handlePlayPause = () => {
    if (!wavesurfer.current) return;

    if (!isPlaying) {
      // stop others before playing
      data.setPlayingStems((prev) => {
        prev.forEach((id) => {
          if (id !== data.id) {
            const otherWS = (window as any).waveSurferRegistry?.[id];
            if (otherWS && otherWS.isPlaying()) {
              otherWS.pause();
            }
          }
        });
        return prev;
      });
    }

    wavesurfer.current.playPause();
  };



  const handleTransformClick = () => {
    if (!selectedEffect) return alert("Please select an effect first!");
    data.addTransformNode(data.id, selectedEffect);
    setSelectedEffect(""); // reset dropdown
  };

  return (
    <div
      className="bg-neutral-900 border rounded-xl shadow-lg p-4 w-80 text-center relative"
      style={{ borderColor: data.color }}
    >
      <Handle type="target" position={Position.Left} style={{ background: data.color }} />
      {/* <Handle type="source" position={Position.Right} style={{ background: "#fff" }} /> */}

      <div className="flex items-center justify-center gap-2 mb-2 text-sm font-medium text-white">
        {data.icon}
        <span>{data.label}</span>
      </div>

      <div ref={waveformRef} className="w-full h-12 my-2"></div>

      {data.audioUrl && (
        <button
          onClick={handlePlayPause}
          className="mt-2 p-2 w-full rounded bg-neutral-800 hover:bg-neutral-700 transition text-white"
        >
          {isPlaying ? <LuPause style={{ color: data.color }} /> : <LuPlay style={{ color: data.color }} />}
        </button>
      )}

      {/* ✅ Transform Dropdown + Button */}
      <div className="mt-3 flex gap-2 items-center">
        <select
          className="flex-1 bg-neutral-800 border border-neutral-600 rounded p-1 text-sm text-white"
          value={selectedEffect}
          onChange={(e) => setSelectedEffect(e.target.value)}
        >
          <option value="">Select effect</option>
          <option value="reverb">Reverb</option>
          <option value="lofi">Lo-fi</option>
          <option value="vintage">Vintage</option>
          <option value="robotic">Robotic</option>
        </select>
        <button
          onClick={handleTransformClick}
          className="p-2 bg-purple-600 rounded hover:bg-purple-500 transition text-white"
        >
          <LuArrowRight />
        </button>
      </div>
    </div>
  );
};

const TransformEffectNode: React.FC<NodeProps<TransformEffectNodeData>> = ({ data }) => {
  return (
    <div className="bg-purple-900 border border-purple-500 rounded-lg shadow-md p-3 w-44 text-white">
      <div className="text-sm font-semibold mb-2">🎨 {data.effect}</div>
      <p className="text-xs opacity-80">Effect applied to {data.label}</p>
      <Handle type="target" position={Position.Left} style={{ background: "#a855f7" }} />
    </div>
  );
};

const nodeTypes = {
  stemNode: StemNode,
  sourceNode: SourceNode,
  transformEffect: TransformEffectNode,
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
  const [waveSurfers, setWaveSurfers] = useState<Record<string, WaveSurfer | null>>({});
  const [readyMap, setReadyMap] = useState<Record<string, boolean>>({});

  const registerWaveSurfer = (id: string, ws: WaveSurfer | null) => {
    setWaveSurfers((prev) => ({ ...prev, [id]: ws }));
  };

  const markReady = (id: string) => {
    setReadyMap((prev) => ({ ...prev, [id]: true }));
  };

  // ✅ Function to spawn transform effect node
  const addTransformNode = (parentId: string, effect: string) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const newNodeId = `transform-${parentId}-${Date.now()}`;
    const newNode: Node<TransformEffectNodeData> = {
      id: newNodeId,
      type: "transformEffect",
      position: { x: parentNode.position.x + 300, y: parentNode.position.y },
      data: {
        label: (parentNode.data as StemNodeData).label,
        effect,
        color: "#a855f7",
      },
      targetPosition: Position.Left,
    };

    setNodes((prev) => [...prev, newNode]);
    setEdges((prev) => [
      ...prev,
      {
        id: `edge-${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: "musicEdge",
        style: { stroke: "#a855f7" },
      },
    ]);
  };

  // ✅ Handle file upload
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const selectedFile = e.target.files[0];
      const url = URL.createObjectURL(selectedFile);
      setFile(selectedFile);
      setFileUrl(url);

      setNodes((nds) =>
        nds.map((node) =>
          node.id === "1"
            ? { ...node, data: { ...node.data, file: selectedFile, audioUrl: url } }
            : node
        )
      );

      setEdges([]);
    }
  };

  const [selectedStems, setSelectedStems] = useState<string[]>([
  "Drums",
  "Bass",
  "Other",
  "Vocals",
]);

  // ✅ Animate edges when audio is playing
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: playingStems.includes(edge.target),
      }))
    );
  }, [playingStems]);

  // ✅ Separate stems logic unchanged EXCEPT we add transform dropdown in each stem node now
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
        registerWaveSurfer,
        markReady,
        addTransformNode,
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
    setEdges([...placeholderEdges]);

    try {
      const app = await gradioClient.client("ahk-d/HT-Demucs-Stem-Separation-2025");
      const result = await app.predict("/separate_stems", [gradioClient.handle_file(file)]);
      const [drumsData, bassData, otherData, vocalsData] = result.data;

      const urls = {
        Drums: drumsData?.url,
        Bass: bassData?.url,
        Other: otherData?.url,
        Vocals: vocalsData?.url,
      };

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
const stopAllStems = () => {
  Object.entries(waveSurfers).forEach(([id, ws]) => {
    if (ws?.isPlaying()) {
      ws.pause();
    }
  });
  setPlayingStems([]);
};

const playAllSelectedStems = () => {
  const activeWS = Object.values(waveSurfers).find((ws) => ws?.isPlaying());
  const syncTime = activeWS ? activeWS.getCurrentTime() : 0;

  Object.entries(waveSurfers).forEach(([id, ws]) => {
    if (!ws) return;
    
    const node = nodes.find((n) => n.id === id);
    const label = node?.data?.label as string;
    
    if (selectedStems.includes(label) && readyMap[id]) {
      if (syncTime > 0) {
        ws.seekTo(syncTime / ws.getDuration());
      }
      if (!ws.isPlaying()) {
        ws.play();
      }
    }
  });
};

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

  const toggleStem = (stem: string) => {
  setSelectedStems((prev) =>
    prev.includes(stem)
      ? prev.filter((s) => s !== stem)
      : [...prev, stem]
  );
};

const handleSync = () => {
  const activeWS = Object.values(waveSurfers).find((ws) => ws?.isPlaying());
  if (!activeWS) return alert("No stem is currently playing to sync from.");

  const currentTime = activeWS.getCurrentTime();

  Object.entries(waveSurfers).forEach(([id, ws]) => {
    if (!ws) return;

    const label = nodes.find((n) => n.id === id)?.data?.label as string;
    if (selectedStems.includes(label)) {
      if (readyMap[id]) {
        ws.seekTo(currentTime / ws.getDuration());
        if (!ws.isPlaying()) ws.play();
      }
    }
  });
};


 return (
  <div className="w-screen h-screen bg-neutral-950 relative">
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

    {/* ✅ Upload Top Bar */}
    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[700px] 
              bg-neutral-900/80 border border-neutral-700 shadow-lg 
              rounded-xl px-5 py-4 flex items-center gap-4 backdrop-blur-sm">
      <h1 className="text-base font-semibold text-white">
        Music Stem Separator
      </h1>

      <div className="relative flex-1 h-11 border border-neutral-700 rounded-lg px-3 flex items-center 
                hover:border-neutral-500 transition-colors duration-200">
        <LuUpload className="text-lg text-gray-400 mr-2" />
        <p className="text-gray-300 text-sm truncate">
          {file ? file.name : "Upload a song"}
        </p>
        <input
          type="file"
          onChange={handleFileChange}
          accept="audio/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <button
        onClick={handleSeparate}
        disabled={!file || isLoading || !gradioClient}
        className="h-11 px-5 rounded-lg bg-emerald-600 text-white text-sm font-medium 
             hover:bg-emerald-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {isLoading ? <LuLoader className="animate-spin text-lg" /> : "Separate"}
      </button>
    </div>



{/* ✅ IMPROVED RIGHT-SIDE SYNC PANEL */}
<div className="absolute right-[600px] top-1/2 transform -translate-y-1/2
                bg-neutral-900 border border-neutral-700 shadow-md rounded-md p-4
                min-w-[240px]">
  
  {/* Header */}
  <div className="text-center mb-4">
    <h3 className="text-white font-medium text-base mb-1">Sync Control</h3>
    <p className="text-gray-400 text-xs">Select stems to synchronize</p>
  </div>

  {/* Stem Selection Buttons */}
 {/* Stem Selection Buttons */}
<div className="space-y-2 mb-4">
 {["Drums", "Bass", "Other", "Vocals"].map((stem) => {
   const isSelected = selectedStems.includes(stem);
   const stemColor = EDGE_COLORS[stem];
   const getIcon = () => {
     switch(stem) {
       case "Drums": return <LuDrum className="w-4 h-4" style={{ color: stemColor }} />;
       case "Bass": return <LuMusic className="w-4 h-4" style={{ color: stemColor }} />;
       case "Other": return <LuGuitar className="w-4 h-4" style={{ color: stemColor }} />;
       case "Vocals": return <LuMic className="w-4 h-4" style={{ color: stemColor }} />;
       default: return null;
     }
   };
   
   return (
     <button
       key={stem}
       onClick={() => toggleStem(stem)}
       className={`w-full px-3 py-2 rounded text-sm font-medium transition
                  flex items-center gap-2
                  ${isSelected 
                    ? 'bg-neutral-800 text-white border' 
                    : 'bg-neutral-800/50 text-gray-400 border border-transparent hover:bg-neutral-800'
                  }`}
       style={{
         borderColor: isSelected ? stemColor : 'transparent'
       }}
     >
       {getIcon()}
       {stem}
     </button>
   );
 })}
</div>

  {/* Control Buttons */}
  <div className="space-y-2">
    {/* Sync Button */}
    <button
      onClick={handleSync}
      disabled={selectedStems.length === 0}
      className="w-full px-3 py-2 rounded text-sm font-medium
                 bg-neutral-800 text-white hover:bg-neutral-700 
                 disabled:bg-neutral-800/50 disabled:text-gray-500 disabled:cursor-not-allowed
                 transition"
    >
      Sync Selected
    </button>

    {/* Play All Button */}
    <button
      onClick={playAllSelectedStems}
      disabled={selectedStems.length === 0}
      className="w-full px-3 py-2 rounded text-sm font-medium
                 bg-neutral-800 text-white hover:bg-neutral-700 
                 disabled:bg-neutral-800/50 disabled:text-gray-500 disabled:cursor-not-allowed
                 transition flex items-center justify-center gap-2"
    >
      <LuPlay className="w-4 h-4" />
      Play All
    </button>

    {/* Stop All Button */}
    <button
      onClick={stopAllStems}
      className="w-full px-3 py-2 rounded text-sm font-medium
                 bg-neutral-800 text-white hover:bg-neutral-700 
                 transition flex items-center justify-center gap-2"
    >
      <LuPause className="w-4 h-4" />
      Stop All
    </button>
  </div>

  {/* Status Indicator */}
  <div className="mt-3 pt-3 border-t border-neutral-700">
    <div className="text-center text-xs text-gray-400">
      {selectedStems.length}/{["Drums", "Bass", "Other", "Vocals"].length} selected
    </div>
  </div>
</div>
  </div>
);

}
