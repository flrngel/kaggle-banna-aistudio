
import React, { useState, useRef, useCallback } from 'react';
import Konva from 'konva';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Canvas from './components/Canvas';
import LayerItem from './components/LayerItem';
import type { ObjectLayerType, BaseStateType } from './types';
import { generateImageEdit } from './services/geminiService';

const EyeOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeClosedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .946-3.11 3.586-5.58 6.834-6.423M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M3 3l4.35 4.35m0 0A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.562 2.973" />
    </svg>
);


function App() {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseState, setBaseState] = useState<BaseStateType>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [objectLayers, setObjectLayers] = useState<ObjectLayerType[]>([]);
  const stageRef = useRef<Konva.Stage>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseInputRef = useRef<HTMLInputElement>(null);
  const objectsInputRef = useRef<HTMLInputElement>(null);
  const [userPrompt, setUserPrompt] = useState('');

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleBaseImageUpload = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const dataUrl = await readFileAsDataURL(files[0]);
    setBaseImage(dataUrl);
    setFinalImage(null); // Clear previous output
    setError(null);
  };

  const handleObjectLayerUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const reads = Array.from(files).map(readFileAsDataURL);
    const images = await Promise.all(reads);
    setObjectLayers((prev) => [
      ...prev,
      ...images.map((img) => ({
        id: `${Date.now()}${Math.floor(Math.random() * 1000000)}`,
        image: img,
        visible: true,
        x: 50,
        y: 50,
        scale: 1,
        rotation: 0,
      }))
    ]);
  };

  const handleGenerate = async () => {
    if (!baseImage || !stageRef.current) return;
    setIsGenerating(true);
    setFinalImage(null);
    setError(null);
    try {
      const stage = stageRef.current;
      // Ensure the transformer is not visible in the export
      const transformer = stage.findOne('Transformer');
      if (transformer) {
        transformer.visible(false);
      }
      
      const dataUrl = stage.toDataURL({ mimeType: 'image/png', quality: 1, pixelRatio: 1 });
      
      if (transformer) {
        transformer.visible(true);
      }
      
      const resultImage = await generateImageEdit(dataUrl, userPrompt);
      setFinalImage(resultImage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!finalImage) return;
    const link = document.createElement('a');
    link.download = 'final-image.png';
    link.href = finalImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearObjects = () => setObjectLayers([]);

  const toggleLayerVisibility = (id: string) => {
    setObjectLayers(
      objectLayers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const removeLayer = (id: string) => {
    setObjectLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const moveLayer = useCallback((dragIndex: number, hoverIndex: number) => {
    setObjectLayers((prev) => {
        const newLayers = [...prev];
        const dragLayer = newLayers[dragIndex];
        newLayers.splice(dragIndex, 1);
        newLayers.splice(hoverIndex, 0, dragLayer);
        return newLayers;
    });
  }, []);

  const handleObjectChange = (id: string, attrs: Partial<ObjectLayerType>) => {
    setObjectLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...attrs } : l)));
  };

  const handleBaseChange = (attrs: Partial<BaseStateType>) => setBaseState((prev) => ({ ...prev, ...attrs }));

  const Dropzone = ({ onUpload, inputRef, isMulti, text }: { onUpload: (files: FileList | null) => void, inputRef: React.RefObject<HTMLInputElement>, isMulti: boolean, text: string }) => (
    <div
      className="grid place-items-center border border-dashed border-brand-border rounded-lg h-20 mb-2 text-brand-muted cursor-pointer hover:bg-brand-panel hover:border-brand-accent transition-colors"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onUpload(e.dataTransfer.files); }}
    >
      <span>{text}</span>
      <input ref={inputRef} type="file" accept="image/*" multiple={isMulti} onChange={(e) => onUpload(e.target.files)} hidden />
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen font-sans">
        <header className="flex items-center justify-between px-4 py-3 bg-brand-panel border-b border-brand-border shadow-md">
          <div className="font-bold tracking-wide text-lg">AI Photo Studio</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-sm rounded-lg border border-brand-border hover:bg-brand-panel-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleClearObjects} disabled={!objectLayers.length}>Clear Objects</button>
            <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-accent text-brand-bg border border-brand-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleGenerate} disabled={!baseImage || isGenerating}>
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
            <button className="px-3 py-2 text-sm rounded-lg border border-brand-border hover:bg-brand-panel-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleExport} disabled={!finalImage}>Export PNG</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_320px] gap-3 p-3 flex-grow overflow-hidden">
          <aside className="flex flex-col gap-3 overflow-y-auto">
            <section className="bg-brand-panel-2 border border-brand-border rounded-xl p-3">
              <h3 className="m-0 mb-2.5 text-sm font-semibold text-brand-muted">BASE IMAGE</h3>
              <Dropzone onUpload={handleBaseImageUpload} inputRef={baseInputRef} isMulti={false} text="Click or drop base image" />
              {baseImage && <img className="w-full rounded-lg border border-brand-border mt-2" src={baseImage} alt="Base" />}
            </section>
            <section className="bg-brand-panel-2 border border-brand-border rounded-xl p-3 flex-grow flex flex-col">
              <h3 className="m-0 mb-2.5 text-sm font-semibold text-brand-muted">OBJECTS</h3>
              <Dropzone onUpload={handleObjectLayerUpload} inputRef={objectsInputRef} isMulti={true} text="Click or drop object images" />
              <div className="flex-grow flex flex-col gap-2 overflow-y-auto pr-1">
                {objectLayers.map((layer, index) => (
                  <LayerItem key={layer.id} index={index} id={layer.id} moveLayer={moveLayer}>
                    <div className="grid grid-cols-[48px_1fr] gap-2 items-center bg-brand-panel border border-brand-border rounded-lg p-1.5 cursor-move">
                      <img className="w-12 h-12 object-cover rounded-md" src={layer.image} alt={`Object ${index + 1}`} />
                      <div className="flex flex-col gap-1.5">
                        <div className="text-xs font-medium text-brand-text">Object {index + 1}</div>
                        <div className="flex items-center gap-2">
                          <button className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-text" onClick={() => toggleLayerVisibility(layer.id)}>
                            {layer.visible ? <EyeOpenIcon/> : <EyeClosedIcon/>}
                          </button>
                          <button className="p-1 text-xs text-brand-muted hover:text-red-500" onClick={() => removeLayer(layer.id)} title="Delete">✕</button>
                        </div>
                      </div>
                    </div>
                  </LayerItem>
                ))}
              </div>
            </section>
          </aside>

          <main className="grid place-items-center bg-brand-bg border border-brand-border rounded-xl overflow-auto p-2">
            <Canvas
              baseImage={baseImage}
              baseState={baseState}
              onBaseChange={handleBaseChange}
              objectLayers={objectLayers}
              onObjectChange={handleObjectChange}
              stageRef={stageRef}
            />
          </main>

          <aside className="flex flex-col gap-3 overflow-y-auto">
            <section className="bg-brand-panel-2 border border-brand-border rounded-xl p-3">
              <h3 className="m-0 mb-2.5 text-sm font-semibold text-brand-muted">OUTPUT</h3>
              <div className="flex flex-col gap-1.5 mb-2.5">
                <label htmlFor="user-prompt" className="text-xs text-brand-muted">Prompt</label>
                <textarea id="user-prompt" rows={3} placeholder="e.g., add warm lighting, soft shadows"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full resize-y bg-brand-panel text-brand-text border border-brand-border rounded-md p-2 text-sm focus:ring-1 focus:ring-brand-accent focus:outline-none"
                />
              </div>
              <div className="w-full aspect-square grid place-items-center bg-brand-panel rounded-lg border border-brand-border">
                {isGenerating && <div className="text-brand-muted text-sm">Generating...</div>}
                {error && <div className="text-red-400 text-sm p-4 text-center">{error}</div>}
                {finalImage && !isGenerating && !error && (
                    <img className="w-full h-full object-contain rounded-lg" src={finalImage} alt="Final generated" />
                )}
                {!finalImage && !isGenerating && !error && (
                    <div className="text-brand-muted text-sm p-4 text-center">Output will appear here</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DndProvider>
  );
}

export default App;
