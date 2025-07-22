// src/components/SavedProjectsList.tsx
import React, { useEffect, useState } from 'react';
import { getReels } from '../services/firestoreService';
import { Reel } from '../types'; // Import Reel type

const SavedProjectsList: React.FC = () => {
  const [savedReels, setSavedReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const reels = await getReels();
        setSavedReels(reels);
      } catch (err) {
        setError('Error fetching saved projects.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, []);

  if (loading) {
    return <div>Loading saved projects...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Saved Projects</h2>
      {savedReels.length === 0 ? (
        <p>No saved projects yet.</p>
      ) : (
        <ul>
          {savedReels.map((reel) => (
            <li key={reel.id} className="border-b py-2">
              {reel.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SavedProjectsList;
