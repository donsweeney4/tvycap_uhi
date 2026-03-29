
import { useEffect, useRef } from 'react';
import { Button } from 'react-native';

export default function App() {
  const soundObject = useRef(new Audio.Sound());

  useEffect(() => {
    async function loadSound() {
      try {
        await soundObject.current.loadAsync(require('./assets/alarm.wav'));
      } catch (error) {
        console.log('Error loading sound:', error);
      }
    }

    loadSound();

    return () => {
      if (soundObject.current) {
        soundObject.current.unloadAsync();
      }
    };
  }, []);

  const playBeep = async () => {
    try {
      await soundObject.current.replayAsync(); // Or soundObject.current.playAsync() if you don't want to replay if it's already playing
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  return (
    <Button title="Play Beep" onPress={playBeep} />
    // Your other UI components
  );
}