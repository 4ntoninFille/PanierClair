# PanierClair
This is a web extension made to reveal online food drive Nutriscore and carbon impact.

## API Usage
PanierClair uses the OpenFoodFacts API for calculating the Nutriscore and carbon impact of food products. The API provides access to a large, open database of food product information that helps generate accurate nutrition and environmental data.
OpenFoodFacts

## How to Build

Follow these steps to build PanierClair:

1. Ensure you have [Node.js](https://nodejs.org/) (version 12 or higher) installed on your system.

2. Clone the PanierClair repository:
```shell
git clone git@github.com:4ntoninFille/PanierClair.git
```
```shell
cd PanierClair
```

3. Install the project dependencies:
```shell
npm install
```

4. Build the extension:
```shell
npm run build
```

This command will create a `dist` folder containing the built extension.

5. For development with auto-rebuilding on file changes, use:
```shell
npm run watch:chrome
```
for Chrome, or:
```shell
npm run watch:firefox
```
for Firefox.


## Loading PanierClair in Your Browser

### Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `dist` folder from the PanierClair project.

### Firefox

1. Open Firefox and navigate to `about:debugging`.
2. Click "This Firefox" in the left sidebar.
3. Click "Load Temporary Add-on" and select any file in the `dist` folder of PanierClair.

## Development

- Make changes to the TypeScript files in the `src` folder.
- The extension will automatically rebuild if you're running `npm run watch`.
- Reload the extension in your browser to see the changes.

Alternatively, you can use web-ext (make sure to [have it installed](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)) instead of reloading manually the extension. This command will both benefit from auto-rebuilding on file changes, and from auto-reloading the extension.
```shell
npm run web-ext-chrome
```
(also exists for chrome and firefox)