import React, { useState, useEffect, useRef } from 'react';
import type { Scene } from '../types';
import { PlayIcon, PauseIcon } from './icons';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
}

const IMAGE_DURATION_MS = 5000; // 5 seconds for static images

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, scenes }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimeoutRef = useRef<number | null>(null);

  const currentScene = scenes[currentSceneIndex];

  const goToNextScene = () => {
    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      setIsPlaying(false); // End of reel
      setCurrentSceneIndex(0); // Reset to beginning
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentSceneIndex(0);
      return;
    }

    if (isPlaying && currentScene) {
      // Clear previous timers/listeners
      if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
      if (audioRef.current) audioRef.current.onended = null;
      if (videoRef.current) videoRef.current.onended = null;

      const voiceoverAudio = new Audio(currentScene.audioUrl || `data:text/plain,`); // Fallback for TTS
      
      if (currentScene.videoUrl && videoRef.current) {
        if(currentScene.audioUrl && audioRef.current) {
            audioRef.current.src = currentScene.audioUrl;
            audioRef.current.play();
        }
        videoRef.current.currentTime = 0;
        videoRef.current.play();
        videoRef.current.onended = goToNextScene;
      } else if (currentScene.imageUrl) {
        if(currentScene.audioUrl && audioRef.current) {
            audioRef.current.src = currentScene.audioUrl;
            audioRef.current.play();
            audioRef.current.onended = goToNextScene;
        } else {
            const utterance = new SpeechSynthesisUtterance(currentScene.voiceover);
            utterance.onend = goToNextScene;
            speechSynthesis.speak(utterance);
        }
      }
    } else {
      if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
      speechSynthesis.cancel();
      videoRef.current?.pause();
      audioRef.current?.pause();
    }

    return () => {
        if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
        speechSynthesis.cancel();
    }

  }, [isOpen, isPlaying, currentSceneIndex, scenes]);


  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };
  
  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      onClick={handleClose}
    >
      <div
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md aspect-[9/16] transform transition-all scale-95 opacity-0 animate-fade-in-scale flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s forwards' }}
      >
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {scenes.map((scene, index) => (
                <div key={scene.sceneNumber} className={`absolute w-full h-full transition-opacity duration-500 ${index === currentSceneIndex ? 'opacity-100' : 'opacity-0'}`}>
                    {scene.videoUrl ? (
                        <video ref={index === currentSceneIndex ? videoRef : null} src={scene.videoUrl} muted={!!scene.audioUrl} className="w-full h-full object-contain" />
                    ) : scene.imageUrl ? (
                        <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">No Visual</div>
                    )}
                </div>
            ))}
            <audio ref={audioRef} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
             <div className="w-full bg-gray-500/30 rounded-full h-1.5 mb-3">
              <div className="bg-white h-1.5 rounded-full" style={{ width: `${((currentSceneIndex + 1) / scenes.length) * 100}%` }}></div>
            </div>
            <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">
                    Scene {currentSceneIndex + 1} / {scenes.length}
                </p>
                <button onClick={handlePlayPause} className="w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm">
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </button>
                 <button onClick={handleClose} className="text-white/80 hover:text-white text-sm">
                    Close
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
