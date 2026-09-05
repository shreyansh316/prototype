module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // If you ever install react-native-reanimated, its plugin must go here at the very end:
    // plugins: ['react-native-reanimated/plugin'],
  };
};
