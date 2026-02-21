// MCP server state — lightweight singleton matching DJState shape.

import type { Message } from '../lib/types.js';

interface MCPState {
  engineReady: boolean;
  isPlaying: boolean;
  currentCode: string;
  previousCode: string;
  mcCommentary: string;
  messages: Message[];
}

const state: MCPState = {
  engineReady: false,
  isPlaying: false,
  currentCode: '',
  previousCode: '',
  mcCommentary: '',
  messages: [],
};

export function getState(): Readonly<MCPState> {
  return state;
}

export function setEngineReady(): void {
  state.engineReady = true;
}

export function updateAfterPlay(code: string, commentary: string): void {
  state.previousCode = state.currentCode;
  state.currentCode = code;
  state.isPlaying = true;
  state.mcCommentary = commentary;
}

export function updateAfterHush(): void {
  state.isPlaying = false;
}

export function addMessage(msg: Message): void {
  state.messages.push(msg);
  // Keep last 12 messages (6 exchanges) to match claude.ts behavior
  if (state.messages.length > 12) {
    state.messages = state.messages.slice(-12);
  }
}
