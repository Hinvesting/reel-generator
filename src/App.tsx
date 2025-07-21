import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Scene } from './types';
import { initGemini, generateImage } from './services/geminiService';
import { initClient, signIn, uploadReelToDrive } from './services/googleDriveService';
import SceneCard from './components/SceneCard';
import Spinner from './components/Spinner';
import AddSceneModal from './components/AddSceneModal';
import PreviewModal from './components/PreviewModal';
import { PlusIcon, GoogleDriveIcon, ClearIcon, FilmIcon } from './components/icons';

const LOCAL_STORAGE_KEY = 'nmmReelGeneratorProject';

const initialInput = `**SCENE 1**
**Voiceover:**
Yo, what's good! It's your boy Sam Stacks. You ever scrollin' the 'gram and see people living their best life and think, "How can I get a piece of that?" That ain't just for them, it's for you too!

**Visual Prompt:**
A young, stylish person on the East Coast, maybe in front of a cool graffiti wall in Philly or a brownstone in Brooklyn. They're looking at their phone with a motivated, inspired expression. Animated dollar signs with wings fly out of the phone.

---

**SCENE 2**
**Voiceover:**
The secret ain't some get-rich-quick scheme. It's about that SIDE HUSTLE! We're talking about using AI to create digital art, writing blogs, or even managing social media for local shops. It's all about that passive income, baby!

**Visual Prompt:**
A fast-paced, split-screen montage. On one side, a laptop screen shows an AI art generator creating amazing images. On the other side, a person is taking product photos for a small business. The vibe is energetic and modern. Text overlays: "AI Artist", "Content King", "Community Manager".`;

const loadState = () => {
    try {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            if (Array.isArray(parsed.scenes)) {
                parsed.scenes = parsed.scenes.map((s: Scene) => ({
                    ...s,
                    audioUrl: undefined, audioFile: undefined,
                    videoUrl: undefined, videoFile: undefined,
                }));
            }
            return parsed;
        }
    } catch (error) {
        console.error("Could not load state from localStorage", error);
    }
    return null;
};

function App() {
  const [rawInput, setRawInput] = useState<string>(() => loadState()?.rawInput || initialInput);
  const [reelTitle, setReelTitle] = useState<string>(() => loadState()?.reelTitle || 'My First AI Side Hustle');
  const [scenes, setScenes] = useState<Scene[]>(() => loadState()?.scenes || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSingleGenerating, setIsSingleGenerating] = useState<boolean>(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState<boolean>(false);
  const [driveUploadProgress, setDriveUploadProgress] = useState<string>('');
  const [isAddSceneModalOpen, setIsAddSceneModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => loadState()?.geminiApiKey || '');
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => loadState()?.googleApiKey || '');
  const [googleClientId, setGoogleClientId] = useState<string>(() => loadState()?.googleClientId || '');
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isGoogleAuthReady, setIsGoogleAuthReady] = useState<boolean>(false);
  const [isUserSignedIn, setIsUserSignedIn] = useState<boolean>(false);

  const [currentlyPlaying, setCurrentlyPlaying] = useState<{ type: 'tts'; sceneNumber: number } | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const isAnyGenerationInProgress = isLoading || isSingleGenerating;
  const isAnyActionInProgress = isAnyGenerationInProgress || isSavingToDrive;

  useEffect(() => {
    const stateToSave = {
      rawInput, reelTitle,
      scenes: scenes.map(({ audioFile, audioUrl, videoFile, videoUrl, ...rest }) => rest),
      geminiApiKey, googleApiKey, googleClientId,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [rawInput, reelTitle, scenes, geminiApiKey, googleApiKey, googleClientId]);

  useEffect(() => {
    initGemini(geminiApiKey);
  }, [geminiApiKey]);

  const handleStartNew = () => {
    if (window.confirm("Are you sure you want to start fresh? Your current masterpiece will be cleared.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        window.location.reload();
    }
  };
  
  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const scenesCopy = [...scenes];
    const dragItemContent = scenesCopy.splice(dragItem.current, 1)[0];
    scenesCopy.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setScenes(scenesCopy.map((s, i) => ({ ...s, sceneNumber: i + 1 })));
  };

  const parseInput = useCallback((text: string): Scene[] => {
    if (!text.trim()) return [];
    const sceneBlocks = text.trim().split(/\n---\n/);
    return sceneBlocks.map((block, index) => {
        const sceneMatch = block.match(/\*\*SCENE (\d+)\*\*/);
        const voiceoverMatch = block.match(/\*\*Voiceover:\*\*\s*([\s\S]*?)(?=\n\*\*Visual Prompt:\*\*|$)/);
        const visualPromptMatch = block.match(/\*\*Visual Prompt:\*\*\s*([\s\S]*)/);
        return {
            sceneNumber: sceneMatch ? parseInt(sceneMatch[1], 10) : index + 1,
            voiceover: voiceoverMatch ? voiceoverMatch[1].trim() : '',
            visualPrompt: visualPromptMatch ? visualPromptMatch[1].trim() : '',
            isGeneratingImage: false,
        };
    }).filter(s => s.visualPrompt && s.voiceover);
  }, []);

  const handleGenerateReel = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    speechSynthesis.cancel();
    setCurrentlyPlaying(null);

    const parsedScenes = parseInput(rawInput);
    if (parsedScenes.length === 0) {
        setError("Couldn't find any scenes in your script. Check the format, champ!");
        setIsLoading(false);
        return;
    }
    setScenes(parsedScenes.map(s => ({...s, isGeneratingImage: true})));

    await Promise.allSettled(parsedScenes.map(async (scene) => {
        try {
            const imageUrl = await generateImage(scene.visualPrompt);
            setScenes(prev => prev.map(s => s.sceneNumber === scene.sceneNumber ? { ...s, imageUrl, isGeneratingImage: false } : s));
        } catch (e) {
            const errorMessage = (e as Error).message;
            console.error(`Failed to generate image for scene ${scene.sceneNumber}:`, e);
            setError(prevError => prevError ? `${prevError}, and scene ${scene.sceneNumber}` : `Image generation failed for scene ${scene.sceneNumber}. Error: ${errorMessage}`);
            setScenes(prev => prev.map(s => s.sceneNumber === scene.sceneNumber ? { ...s, isGeneratingImage: false } : s));
        }
    }));

    setIsLoading(false);
  }, [rawInput, parseInput]);

  const handlePlayTTS = useCallback((text: string, sceneNumber: number) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setCurrentlyPlaying(null);
    utterance.onerror = () => {
        setError("Text-to-speech ain't working right now.");
        setCurrentlyPlaying(null);
    };
    speechSynthesis.speak(utterance);
    setCurrentlyPlaying({ type: 'tts', sceneNumber });
  }, []);

  const handlePauseAudio = useCallback(() => {
    speechSynthesis.cancel();
    setCurrentlyPlaying(null);
  }, []);

  const handleAudioUpload = useCallback((file: File, sceneNumber: number) => {
    const audioUrl = URL.createObjectURL(file);
    setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, audioUrl, audioFile: file } : s));
    if (currentlyPlaying?.sceneNumber === sceneNumber) {
        handlePauseAudio();
    }
  }, [currentlyPlaying, handlePauseAudio]);

  const handleUpdateScene = (sceneNumber: number, voiceover: string, visualPrompt: string) => {
    setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? {...s, voiceover, visualPrompt} : s));
  };

  const handleRegenerateScene = useCallback(async (sceneNumber: number) => {
    if (isAnyActionInProgress) return;
    const sceneToRegenerate = scenes.find(s => s.sceneNumber === sceneNumber);
    if (!sceneToRegenerate || sceneToRegenerate.videoUrl) return;
    
    setIsSingleGenerating(true);
    setError(null);
    setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, isGeneratingImage: true, imageUrl: undefined } : s));
    if (currentlyPlaying?.sceneNumber === sceneNumber) handlePauseAudio();

    try {
        const imageUrl = await generateImage(sceneToRegenerate.visualPrompt);
        setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, imageUrl, isGeneratingImage: false } : s));
    } catch (e) {
        const errorMessage = (e as Error).message;
        console.error(`Failed to regenerate image for scene ${sceneNumber}:`, e);
        setError(`Failed to regenerate image for scene ${sceneNumber}. Error: ${errorMessage}`);
        setScenes(prev => prev.map(s => s.sceneNumber === sceneNumber ? { ...s, isGeneratingImage: false } : s));
    } finally {
        setIsSingleGenerating(false);
    }
  }, [scenes, isAnyActionInProgress, currentlyPlaying, handlePauseAudio]);
  
  const handleAddScene = useCallback(async (voiceover: string, visualPrompt: string, videoFile?: File) => {
      if (isAnyActionInProgress) return;
      const newSceneNumber = scenes.length > 0 ? Math.max(...scenes.map(s => s.sceneNumber)) + 1 : 1;
      setIsAddSceneModalOpen(false);
      if (videoFile) {
        const videoUrl = URL.createObjectURL(videoFile);
        const newScene: Scene = { sceneNumber: newSceneNumber, voiceover, visualPrompt, videoFile, videoUrl, isGeneratingImage: false };
        setScenes(prev => [...prev, newScene]);
        return;
      }
      setIsSingleGenerating(true);
      setError(null);
      const newScene: Scene = { sceneNumber: newSceneNumber, voiceover, visualPrompt, isGeneratingImage: true };
      setScenes(prev => [...prev, newScene]);
      try {
          const imageUrl = await generateImage(visualPrompt);
          setScenes(prev => prev.map(s => s.sceneNumber === newSceneNumber ? { ...s, imageUrl, isGeneratingImage: false } : s));
      } catch (e) {
          const errorMessage = (e as Error).message;
          console.error(`Failed to generate image for new scene ${newSceneNumber}:`, e);
          setError(`Failed to generate image for new scene. Error: ${errorMessage}`);
          setScenes(prev => prev.map(s => s.sceneNumber === newSceneNumber ? { ...s, isGeneratingImage: false } : s));
      } finally {
          setIsSingleGenerating(false);
      }
  }, [scenes, isAnyActionInProgress]);

  const handleSaveToDrive = useCallback(async () => {
    if (!reelTitle.trim()) {
        setDriveError("Gotta give your reel a title, my friend.");
        return;
    }
    if (scenes.length === 0) {
        setDriveError("No scenes to save. Let's create something first!");
        return;
    }
    setIsSavingToDrive(true);
    setDriveError(null);
    setDriveUploadProgress('Connecting...');
    try {
        await uploadReelToDrive(reelTitle, scenes, setDriveUploadProgress);
        setDriveUploadProgress('All saved! Go check your Drive.');
        setTimeout(() => setDriveUploadProgress(''), 3000);
    } catch (e) {
        console.error("Error saving to Google Drive:", e);
        setDriveError((e as Error).message || "An unknown error occurred while saving.");
        setDriveUploadProgress('');
    } finally {
        setIsSavingToDrive(false);
    }
  }, [reelTitle, scenes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddSceneModalOpen(false);
        setIsPreviewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); speechSynthesis.cancel(); };
  }, []);
  
  useEffect(() => {
    if (googleApiKey && googleClientId) {
      initClient(googleApiKey, googleClientId, (isReady, isSignedIn, error) => {
        setIsGoogleAuthReady(isReady);
        setIsUserSignedIn(isSignedIn);
        if (error) setDriveError(error);
      });
    } else {
      setIsGoogleAuthReady(false);
      setIsUserSignedIn(false);
    }
  }, [googleApiKey, googleClientId]);

  return (
    <>
      <AddSceneModal isOpen={isAddSceneModalOpen} isAdding={isSingleGenerating} onClose={() => setIsAddSceneModalOpen(false)} onAddScene={handleAddScene} />
      <PreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} scenes={scenes} />
      <div className="min-h-screen bg-primary-blue text-secondary-silver p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8">
            <div className="flex justify-center items-center gap-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-primary-gold to-secondary-sky">
                  New Money Millionaires
                </h1>
                <button onClick={handleStartNew} title="Start New Reel" className="p-2 text-gray-400 hover:text-white hover:bg-dark-card rounded-full transition-colors">
                    <ClearIcon className="w-6 h-6" />
                </button>
            </div>
            <p className="mt-2 text-lg text-secondary-sky font-semibold">
              The Official AI Reel Generator
            </p>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:pr-4 flex flex-col">
              <div className="mb-4">
                  <label htmlFor="reel-title" className="block text-lg font-semibold font-heading text-secondary-silver mb-2">
                    Reel Title
                  </label>
                  <input id="reel-title" type="text" value={reelTitle} onChange={(e) => setReelTitle(e.target.value)} placeholder="Give your masterpiece a name..." className="w-full p-3 bg-dark-card border-2 border-dark-border rounded-lg text-secondary-silver placeholder-gray-500 focus:ring-2 focus:ring-primary-gold focus:border-primary-gold transition-colors" />
              </div>

              <div className="bg-dark-card/50 border border-dark-border rounded-lg p-4 mb-4">
                <h3 className="text-md font-semibold font-heading text-secondary-silver mb-2">API Keys (Your Keys to the Kingdom)</h3>
                <p className="text-xs text-gray-500 mb-3">
                    These are needed to power up the AI. They're saved in your browser, for your eyes only.
                </p>
                <div className="grid grid-cols-1 gap-4">
                   <div>
                    <label htmlFor="gemini-api-key" className="block text-xs font-medium text-gray-400 mb-1">Gemini API Key (for visuals)</label>
                    <input id="gemini-api-key" type="password" value={geminiApiKey} onChange={(e) => { setGeminiApiKey(e.target.value); setError(null); }} placeholder="Enter Gemini API Key" className="w-full p-2 bg-primary-blue border border-dark-border rounded-md text-secondary-silver placeholder-gray-500 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="google-api-key" className="block text-xs font-medium text-gray-400 mb-1">Google API Key (for Drive)</label>
                    <input id="google-api-key" type="password" value={googleApiKey} onChange={(e) => { setGoogleApiKey(e.target.value); setDriveError(null); }} placeholder="Enter Google API Key" className="w-full p-2 bg-primary-blue border border-dark-border rounded-md text-secondary-silver placeholder-gray-500 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="google-client-id" className="block text-xs font-medium text-gray-400 mb-1">Google Client ID (for Drive)</label>
                    <input id="google-client-id" type="password" value={googleClientId} onChange={(e) => { setGoogleClientId(e.target.value); setDriveError(null); }} placeholder="Enter Google Client ID" className="w-full p-2 bg-primary-blue border border-dark-border rounded-md text-secondary-silver placeholder-gray-500 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold transition-colors" />
                  </div>
                </div>
              </div>

              <div className="flex-grow flex flex-col">
                <label htmlFor="script-input" className="block text-lg font-semibold font-heading text-secondary-silver mb-2">
                  What's the Play? (Your Script)
                </label>
                <textarea id="script-input" value={rawInput} onChange={(e) => setRawInput(e.target.value)} placeholder="Drop your script here..." className="w-full p-4 bg-dark-card border-2 border-dark-border rounded-lg text-secondary-silver placeholder-gray-500 focus:ring-2 focus:ring-primary-gold focus:border-primary-gold transition-all duration-200 resize-none font-mono text-sm flex-grow h-96 lg:h-auto" />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                  <button onClick={handleGenerateReel} disabled={isAnyActionInProgress || !geminiApiKey} className="w-full flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold font-heading rounded-md text-primary-blue bg-primary-gold hover:opacity-90 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105">
                    {isLoading ? <><Spinner /> Generating...</> : "LET'S COOK! 🔥"}
                  </button>
                  
                  {!isUserSignedIn ? (
                      <button onClick={signIn} disabled={!isGoogleAuthReady || isAnyActionInProgress} className="w-full flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-dark-border text-base font-medium rounded-md text-white bg-dark-card hover:bg-opacity-80 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                          <GoogleDriveIcon className="w-5 h-5" /> Connect Google Drive
                      </button>
                  ) : (
                      <button onClick={handleSaveToDrive} disabled={isAnyActionInProgress || scenes.length === 0} className="w-full flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-accent-green hover:opacity-90 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                          {isSavingToDrive ? <><Spinner /> {driveUploadProgress || 'Saving...'}</> : <><GoogleDriveIcon className="w-5 h-5" /> Save to Drive</>}
                      </button>
                  )}
              </div>
              {error && <p className="mt-4 text-center text-accent-coral bg-red-900/50 p-3 rounded-md">{error}</p>}
              {driveError && <p className="mt-4 text-center text-accent-coral bg-red-900/50 p-3 rounded-md">{driveError}</p>}
            </div>

            <div className="lg:pl-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-primary-blue py-2 z-10">
                <h2 className="text-xl font-semibold font-heading text-secondary-silver">Your Scenes</h2>
                {scenes.length > 0 && (
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsPreviewModalOpen(true)} disabled={isAnyActionInProgress} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-secondary-sky rounded-md hover:opacity-90 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            <FilmIcon className="w-4 h-4" /> Preview
                        </button>
                        <button onClick={() => setIsAddSceneModalOpen(true)} disabled={isAnyActionInProgress} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-accent-green rounded-md hover:opacity-90 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            <PlusIcon className="w-4 h-4" /> Add Scene
                        </button>
                    </div>
                )}
              </div>

              {scenes.length === 0 && !isLoading && (
                   <div className="flex flex-col items-center justify-center h-full bg-dark-card/50 rounded-lg border-2 border-dashed border-dark-border p-8">
                      <h3 className="text-xl font-semibold text-gray-400">Your Scenes Appear Here</h3>
                      <p className="text-gray-500 mt-2 text-center">Load up a script, drop your Gemini API key, and hit "Let's Cook!" to get started.</p>
                  </div>
              )}
              {isLoading && scenes.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full bg-dark-card/50 rounded-lg p-8">
                      <Spinner />
                      <p className="mt-4 text-lg text-gray-400">Warming up the AI...</p>
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scenes.map((scene, index) => (
                      <div key={scene.sceneNumber} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()} className="transition-all">
                          <SceneCard scene={scene} onPlayTTS={handlePlayTTS} onPauseAudio={handlePauseAudio} onAudioUpload={handleAudioUpload} onUpdateScene={handleUpdateScene} currentlyPlaying={currentlyPlaying} onRegenerate={handleRegenerateScene} isAnyGenerationInProgress={isAnyGenerationInProgress} />
                      </div>
                  ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;