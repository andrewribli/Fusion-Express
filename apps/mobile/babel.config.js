module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // reanimated/plugin is already included by nativewind/babel (css-interop 0.1.x).
  };
};
