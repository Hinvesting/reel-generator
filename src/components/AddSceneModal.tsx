import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { VideoIcon } from './icons';

interface AddSceneModalProps {
  isOpen: boolean;
  isAdding: boolean;
  onClose: () => void;
  onAddScene: (voiceover: string, visualPrompt: string, videoFile?: File) => void;
}

const AddSceneModal: React.FC<AddSceneModalProps> = ({ isOpen, isAdding, onClose, onAddScene }) => {
  const [voiceover, setVoiceover] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVoiceover('');
      setVisualPrompt('');
      setVideoFile(null);
      setError('');
    }
  }, [isOpen]);

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== "video/mp4") {
        setError("Please upload a valid .mp4 file.");
        e.target.value = ''; // Reset file input
        setVideoFile(null);
    } else {
        setVideoFile(file);
        setError('');
    }
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceover) {
      setError('A voiceover is required.');
      return;
    }
    if (!visualPrompt && !videoFile) {
      setError('Either a visual prompt or a video file is required.');
      return;
    }
    setError('');
    onAddScene(voiceover, visualPrompt, videoFile || undefined);
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300" 
        aria-modal="true" 
        role="dialog"
        onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all scale-95 opacity-0 animate-fade-in-scale" 
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <style>{`
            @keyframes fade-in-scale {
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
        `}</style>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Add New Scene</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="new-voiceover" className="block text-sm font-medium text-gray-300 mb-1">Voiceover / Script</label>
                <textarea
                  id="new-voiceover"
                  value={voiceover}
                  onChange={(e) => setVoiceover(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter the voiceover text for the new scene..."
                />
              </div>

              <div>
                <label htmlFor="new-visual-prompt" className="block text-sm font-medium text-gray-300 mb-1">Visual Prompt (for AI generation)</label>
                <textarea
                  id="new-visual-prompt"
                  value={visualPrompt}
                  onChange={(e) => setVisualPrompt(e.target.value)}
                  rows={4}
                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                  placeholder="Describe the visuals for the AI to generate..."
                  disabled={!!videoFile}
                />
              </div>
              
              <div className="flex items-center">
                  <div className="flex-grow border-t border-gray-600"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                  <div className="flex-grow border-t border-gray-600"></div>
              </div>

              <div>
                  <label htmlFor="video-upload" className="block text-sm font-medium text-gray-300 mb-2">Upload Video (replaces AI generation)</label>
                  <label
                    htmlFor="video-upload"
                    className={`flex items-center justify-center w-full px-4 py-3 bg-gray-900 border-2 ${videoFile ? 'border-green-500' : 'border-gray-700'} border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors`}
                  >
                      <VideoIcon className="w-6 h-6 mr-3 text-gray-400" />
                      <span className="text-sm text-gray-300">{videoFile ? `Selected: ${videoFile.name}` : 'Click to choose a .mp4 file'}</span>
                  </label>
                  <input id="video-upload" type="file" className="hidden" accept="video/mp4" onChange={handleVideoFileChange}/>
              </div>
            </div>
          </div>
          {error && <p className="px-6 pb-2 text-sm text-red-400">{error}</p>}
          <div className="bg-gray-700/50 px-6 py-4 flex justify-end items-center gap-4 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isAdding}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-transparent rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding || !voiceover || (!visualPrompt && !videoFile)}
              className="min-w-[170px] flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? <><Spinner /> Adding Scene...</> : 'Add New Scene'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSceneModal;