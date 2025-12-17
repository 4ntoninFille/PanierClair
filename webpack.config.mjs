import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default env => {
  const browser = env.browser || 'chrome'; // Default to 'chrome'
  const manifestFile = `manifest.${browser}.json`;

  return {
    mode: 'development',
    devtool: 'cheap-module-source-map',
    entry: {
      background: './src/background.ts',
      content: './src/content.ts',
      popup: './src/popup.ts',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, `dist/${browser}`),
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: `public/${manifestFile}`, to: 'manifest.json' },
          { from: `public/popup.html`, to: '.' },
          { from: `public/popup.css`, to: '.' },
          { from: `public/content-styles.css`, to: '.' },
          { from: 'public/icons', to: 'icons' },
          { from: 'public/assets', to: 'assets' },
        ],
      }),
    ],
  };
};
