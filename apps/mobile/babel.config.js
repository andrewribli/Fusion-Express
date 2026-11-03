module.exports = function (api) {
  api.cache(true);
  // nativewind/babel → css-interop babel hard-requires react-native-worklets/plugin.
  // Replicate the useful parts without worklets (Expo 53 / no Reanimated 4).
  const cssInteropPlugin =
    require("react-native-css-interop/dist/babel-plugin").default;

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
        },
      ],
    ],
    plugins: [
      cssInteropPlugin,
      [
        "@babel/plugin-transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "react-native-css-interop",
        },
      ],
    ],
  };
};
