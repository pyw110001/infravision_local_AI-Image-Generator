import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectVersion, GenerationParams, ImageAsset, GenerationStatus } from './types';
import { MUNICIPAL_PRESETS } from './constants';
import * as ComfyService from './services/comfyService'; // Switched to ComfyUI
import CanvasEditor from './components/CanvasEditor';
import { Header, Sidebar, PropertiesPanel } from './components/Layout';

// Global declaration for AI Studio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Restore Landing Page for Auth
const LandingPage: React.FC<{ onConnect: () => void }> = ({ onConnect }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex flex-col items-center justify-center p-4 font-sans transition-colors duration-200">
    <div className="max-w-md w-full bg-white dark:bg-panel border border-gray-200 dark:border-gray-800 rounded-xl p-8 shadow-2xl text-center transition-colors">
      <div className="w-16 h-16 bg-municipal-600 rounded-lg mx-auto mb-6 flex items-center justify-center shadow-lg shadow-municipal-900/50">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">市政AI生图工具 (ComfyUI版)</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">专业的市政基础设施可视化平台。请确保本地 ComfyUI 服务已在 127.0.0.1:8188 启动。</p>

      <button
        onClick={onConnect}
        className="w-full bg-municipal-600 hover:bg-municipal-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-municipal-600/20"
      >
        <span>连接本地服务</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
      </button>

      <p className="mt-6 text-xs text-gray-500 leading-relaxed">
        系统将连接到本地 ComfyUI 节点。
        <br />
        <span className="opacity-50">Powered by SDXL & ControlNet</span>
      </p>
    </div>
  </div>
);

const App: React.FC = () => {
  // --- State ---
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark Mode

  const [project, setProject] = useState<Project>({
    id: 'default-project',
    name: '新建市政项目',
    updatedAt: Date.now(),
    versions: [],
    activeVersionId: null,
    assets: {}
  });

  const [prompt, setPrompt] = useState('');
  const [params, setParams] = useState<GenerationParams>({
    aspectRatio: '16:9',
    fidelity: 0.8,
    styleStrength: 0.5,
    seed: 42,
    lockedSeed: false,
    presetId: '',
    outputQuality: 'Speed'
  });

  const [baseImageId, setBaseImageId] = useState<string | null>(null);
  const [styleImageIds, setStyleImageIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'mask' | 'compare'>('view');
  const [maskData, setMaskData] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derived State
  const activeVersion = project.versions.find(v => v.id === project.activeVersionId);
  const baseAsset = baseImageId ? project.assets[baseImageId] : null;
  const resultAsset = activeVersion?.resultImageId ? project.assets[activeVersion.resultImageId] : null;

  // --- Effects ---

  useEffect(() => {
    // Initialize Theme
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Check for Local Service
  useEffect(() => {
    // Only auto-connect if we want to check blindly
    // For now, let user manually click connect to be safe
  }, []);

  // --- Handlers ---

  const handleConnect = async () => {
    try {
      // Simple fetch check
      await fetch("http://127.0.0.1:8188/system_stats");
      setHasApiKey(true); // Reusing this state as "HasConnected" 
    } catch (e) {
      alert("无法连接到本地 ComfyUI 服务。请确认服务已开启。");
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'style') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const id = generateId();
        const newAsset: ImageAsset = {
          id,
          url: ev.target?.result as string,
          file,
          type
        };

        setProject(prev => ({
          ...prev,
          assets: { ...prev.assets, [id]: newAsset }
        }));

        if (type === 'base') setBaseImageId(id);
        else if (styleImageIds.length < 3) setStyleImageIds(prev => [...prev, id]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = MUNICIPAL_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setPrompt(preset.promptTemplate);
      setParams(prev => ({ ...prev, presetId, ...preset.defaultParams }));
    }
  };

  const handleGenerate = async () => {
    if (!baseAsset) {
      setErrorMsg("请先上传底图");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    // Create a pending version
    const newVersionId = generateId();
    const newVersion: ProjectVersion = {
      id: newVersionId,
      parentId: activeVersion ? activeVersion.id : null,
      timestamp: Date.now(),
      baseImageId: baseAsset.id,
      prompt,
      params: { ...params },
      status: GenerationStatus.GENERATING,
      isFavorite: false
    };

    setProject(prev => ({
      ...prev,
      versions: [newVersion, ...prev.versions],
      activeVersionId: newVersionId
    }));

    try {
      const styleAssets = styleImageIds.map(id => project.assets[id]).filter(Boolean);

      //       // Double check Key before call
      //       if (!hasApiKey && window.aistudio) {
      //          const hasKey = await window.aistudio.hasSelectedApiKey();
      //          if (!hasKey) {
      //              throw new Error("API Key 未选择。请先连接服务。");
      //          }
      //       }

      const imageUrl = await ComfyService.generateImage(
        prompt,
        baseAsset,
        styleAssets,
        params,
        maskData || undefined
      );

      // Save Result Asset
      const resultAssetId = generateId();
      const resultAsset: ImageAsset = {
        id: resultAssetId,
        url: imageUrl,
        type: 'generated'
      };

      setProject(prev => {
        const updatedVersions = prev.versions.map(v =>
          v.id === newVersionId
            ? { ...v, status: GenerationStatus.COMPLETED, resultImageId: resultAssetId }
            : v
        );
        return {
          ...prev,
          assets: { ...prev.assets, [resultAssetId]: resultAsset },
          versions: updatedVersions
        };
      });

      // Switch to compare mode automatically after generation
      setViewMode('compare');

    } catch (err: any) {
      const msg = err.message || '';
      setErrorMsg(msg);

      if (
        msg.includes("403") ||
        msg.includes("Permission denied") ||
        msg.includes("Requested entity was not found")
      ) {
        setHasApiKey(false);
      }

      setProject(prev => ({
        ...prev,
        versions: prev.versions.map(v =>
          v.id === newVersionId
            ? { ...v, status: GenerationStatus.FAILED, errorMessage: msg }
            : v
        )
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAsset = () => {
    if (resultAsset) {
      const link = document.createElement('a');
      link.href = resultAsset.url;
      link.download = `infravision_${activeVersion?.id}.png`;
      link.click();
    }
  };

  if (!hasApiKey) {
    return <LandingPage onConnect={handleConnect} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-darkbg text-gray-900 dark:text-gray-200 font-sans transition-colors duration-200">
      <Header title={project.name} onExport={downloadAsset} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      <main className="flex flex-1 overflow-hidden">
        {/* LEFT: History & Layers */}
        <Sidebar>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">项目素材</h2>

            {/* Base Image Upload */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">底图</label>
              <div
                className={`border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 text-center transition-colors ${!baseAsset ? 'hover:border-municipal-500 cursor-pointer' : ''}`}
              >
                {!baseAsset ? (
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'base')} />
                    <div className="text-gray-400 dark:text-gray-500 text-xs">点击上传</div>
                  </label>
                ) : (
                  <div className="relative group">
                    <img src={baseAsset.url} className="h-20 w-full object-cover rounded" />
                    <button onClick={() => setBaseImageId(null)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 text-xs">✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Style Images */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">风格参考 (最多3张)</label>
              <div className="flex gap-2">
                {styleImageIds.map(id => (
                  <div key={id} className="relative w-12 h-12 shrink-0">
                    <img src={project.assets[id].url} className="w-full h-full object-cover rounded border border-gray-300 dark:border-gray-700" />
                  </div>
                ))}
                {styleImageIds.length < 3 && (
                  <label className="w-12 h-12 border border-dashed border-gray-300 dark:border-gray-700 rounded flex items-center justify-center cursor-pointer hover:border-municipal-500 text-gray-400 dark:text-gray-500">
                    +
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'style')} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">历史记录</h2>
            <div className="space-y-2">
              {project.versions.map(v => (
                <div
                  key={v.id}
                  onClick={() => setProject(p => ({ ...p, activeVersionId: v.id }))}
                  className={`p-2 rounded cursor-pointer text-sm flex gap-2 items-center border transition-colors ${v.id === project.activeVersionId
                      ? 'bg-municipal-50 dark:bg-municipal-900/30 border-municipal-200 dark:border-municipal-600'
                      : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${v.status === GenerationStatus.COMPLETED ? 'bg-green-500' : v.status === GenerationStatus.FAILED ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                  <div className="flex-1 truncate">
                    <div className="font-medium text-gray-700 dark:text-gray-300 truncate">{v.prompt.substring(0, 20)}...</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(v.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
              {project.versions.length === 0 && <div className="text-xs text-gray-400 dark:text-gray-600 italic text-center py-4">暂无生成记录</div>}
            </div>
          </div>
        </Sidebar>

        {/* CENTER: Canvas */}
        <div className="flex-1 flex flex-col relative bg-gray-100 dark:bg-neutral-900 transition-colors duration-200">
          {/* Toolbar */}
          <div className="h-12 bg-white dark:bg-panel border-b border-gray-200 dark:border-gray-800 flex items-center justify-center gap-4 px-4 transition-colors">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-1 transition-colors">
              <button
                onClick={() => setViewMode('view')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'view' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
              >查看</button>
              <button
                onClick={() => setViewMode('compare')}
                disabled={!resultAsset}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'compare' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-50'}`}
              >对比模式</button>
              <button
                onClick={() => setViewMode('mask')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'mask' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
              >局部重绘</button>
            </div>
          </div>

          {/* Viewport */}
          <div className="flex-1 overflow-hidden relative">
            <CanvasEditor
              baseImageUrl={baseAsset?.url || null}
              resultImageUrl={resultAsset?.url || null}
              mode={viewMode}
              brushSize={20}
              onMaskChange={setMaskData}
            />

            {/* Overlay Error */}
            {errorMsg && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 dark:bg-red-900/90 text-red-800 dark:text-red-100 px-4 py-2 rounded shadow-lg border border-red-200 dark:border-red-700 text-sm">
                错误: {errorMsg}
              </div>
            )}
          </div>

          {/* Prompt Bar */}
          <div className="h-auto min-h-[5rem] bg-white dark:bg-panel border-t border-gray-200 dark:border-gray-800 p-4 flex gap-4 items-start transition-colors">
            <div className="flex-1">
              <textarea
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-municipal-500 resize-none h-16 placeholder-gray-400 dark:placeholder-gray-600"
                placeholder="描述效果图内容（例如：'夕阳下的现代斜拉桥，暖色调灯光'...）"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isProcessing || !baseAsset}
              className={`h-16 px-6 rounded font-bold uppercase tracking-wide transition-all ${isProcessing ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400 dark:text-gray-500' : 'bg-gradient-to-r from-municipal-600 to-municipal-500 hover:from-municipal-500 hover:to-municipal-400 text-white shadow-lg shadow-municipal-500/30'}`}
            >
              {isProcessing ? '生成中...' : '生成'}
            </button>
          </div>
        </div>

        {/* RIGHT: Parameters */}
        <PropertiesPanel>
          <div className="p-4 space-y-6">

            {/* Presets */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">场景预设</h3>
              <div className="grid grid-cols-2 gap-2">
                {MUNICIPAL_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`text-left p-2 rounded border text-xs transition-colors ${params.presetId === preset.id ? 'border-municipal-500 bg-municipal-50 dark:bg-municipal-900/20 text-municipal-700 dark:text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">几何还原度</span>
                  <span className="text-gray-800 dark:text-gray-200">{Math.round(params.fidelity * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={params.fidelity}
                  onChange={(e) => setParams(p => ({ ...p, fidelity: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-municipal-500"
                />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">数值越高，越严格遵循原始线条 (ControlNet)。</p>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">风格强度</span>
                  <span className="text-gray-800 dark:text-gray-200">{Math.round(params.styleStrength * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={params.styleStrength}
                  onChange={(e) => setParams(p => ({ ...p, styleStrength: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-municipal-500"
                />
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Config */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">生成质量</span>
                <select
                  value={params.outputQuality}
                  onChange={(e) => setParams(p => ({ ...p, outputQuality: e.target.value as 'Speed' | 'Quality' }))}
                  className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded px-2 py-1 focus:outline-none"
                >
                  <option value="Speed">速度优先 (Speed)</option>
                  <option value="Quality">质量优先 (Quality)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">长宽比</span>
                <select
                  value={params.aspectRatio}
                  onChange={(e) => setParams(p => ({ ...p, aspectRatio: e.target.value as any }))}
                  className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded px-2 py-1 focus:outline-none"
                >
                  <option value="16:9">16:9 横向</option>
                  <option value="4:3">4:3 标准</option>
                  <option value="1:1">1:1 正方</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.lockedSeed}
                    onChange={(e) => setParams(p => ({ ...p, lockedSeed: e.target.checked }))}
                    className="rounded bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                  锁定种子 (Seed)
                </label>
                {params.lockedSeed && <span className="text-xs text-gray-600 dark:text-gray-600 font-mono">{params.seed}</span>}
              </div>
            </div>

            {/* FAKE FOOOCUS STATUS LABEL (As Requested) */}
            <div className="mt-8 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded text-xs text-blue-800 dark:text-blue-200">
              <strong>当前环境:</strong> Local ComfyUI
              <br />
              <span className="opacity-70">http://127.0.0.1:8188</span>
            </div>

          </div>
        </PropertiesPanel>
      </main>
    </div>
  );
};

export default App;