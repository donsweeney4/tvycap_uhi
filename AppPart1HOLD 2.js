import Toast from 'react-native-root-toast';
import { Dimensions } from 'react-native';

const screenHeight = Dimensions.get('window').height; // Get screen height

export const showToastAsync = (message, duration = 3000) => {

  return new Promise((resolve) => {
    Toast.show(message, {
      duration: duration, // Directly use the provided duration
      position: screenHeight * 0.15, // 15% from the top
      shadow: true,
      animation: true,
      hideOnPress: true,
      delay: 0,
      opacity: 1,  // Ensures visibility
      containerStyle: {
        backgroundColor: 'blue', // Set toast background color
        borderRadius: 10, // Optional: Round corners
        padding: 10,
      },
      textStyle: {
        color: 'yellow',
        fontSize: 20,
      },
    });

    // ✅ Resolve the promise after the provided duration
    setTimeout(resolve, duration);
  });
};