// src/services/firestoreService.ts
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Reel } from '../types'; // Assuming Reel type is defined in src/types.ts

const saveReel = async (reelData: Reel) => {
  try {
    const docRef = await addDoc(collection(db, 'reels'), reelData);
    console.log('Document written with ID: ', docRef.id);
  } catch (e) {
    console.error('Error adding document: ', e);
  }
};

const getReels = async (): Promise<Reel[]> => {
  const reelsCollection = collection(db, 'reels');
  const reelSnapshot = await getDocs(reelsCollection);
  const reelList = reelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reel[];
  return reelList;
};

export { saveReel, getReels };
