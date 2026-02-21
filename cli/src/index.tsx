// Entry point — polyfill is loaded by bin.mjs before this runs.

import React from 'react';
import { render } from 'ink';
import { getApiKey } from './lib/config.js';
import { App } from './App.js';

// Validate API key before rendering (avoids process.exit during React render)
const apiKey = getApiKey();

render(React.createElement(App, { apiKey }));
