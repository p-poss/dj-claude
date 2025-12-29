'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

// Editor API interface
export interface StrudelEditorAPI {
  setCode: (code: string) => void;
  evaluate: (code?: string) => Promise<void>;
  start: () => void;
  stop: () => void;
  getCode: () => string;
}

interface StrudelEditorProps {
  initialCode?: string;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export const StrudelEditor = forwardRef<StrudelEditorAPI, StrudelEditorProps>(
  function StrudelEditor({ initialCode = '', onReady, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorElementRef = useRef<HTMLElement | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    // Expose API to parent via ref
    useImperativeHandle(ref, () => ({
      setCode: (code: string) => {
        try {
          const editorEl = editorElementRef.current as any;
          const strudelMirror = editorEl?.editor;

          console.log('setCode called with:', code.substring(0, 50) + '...');
          console.log('Editor element:', editorEl);
          console.log('StrudelMirror:', strudelMirror);

          if (!strudelMirror) {
            console.error('setCode: No StrudelMirror');
            return;
          }

          // Update CodeMirror EditorView - this is what shows the code visually
          const cmView = strudelMirror?.editor;
          console.log('CodeMirror view:', cmView);

          if (cmView?.dispatch && cmView?.state?.doc !== undefined) {
            const docLength = cmView.state.doc.length;
            console.log('Dispatching change, current doc length:', docLength);
            cmView.dispatch({
              changes: {
                from: 0,
                to: docLength,
                insert: code
              }
            });
            console.log('After dispatch, doc length:', cmView.state.doc.length);
            console.log('Doc content:', cmView.state.doc.toString().substring(0, 100));
          } else {
            console.log('Could not dispatch - missing cmView or doc');
          }

          // Update the repl state (code and activeCode)
          const replState = strudelMirror?.repl?.state;
          if (replState) {
            replState.code = code;
            replState.activeCode = code;
          }

          // Also call repl.setCode if available
          if (strudelMirror?.repl?.setCode) {
            strudelMirror.repl.setCode(code);
          }

          // Try setting via the element's code attribute
          if (editorEl?.setAttribute) {
            editorEl.setAttribute('code', code);
          }

          // Force CodeMirror to render by scrolling into view and focusing
          // This fixes the "inView: false" issue
          setTimeout(() => {
            try {
              // Scroll the editor DOM into view
              if (cmView?.dom) {
                cmView.dom.scrollIntoView({ behavior: 'instant', block: 'nearest' });
              }

              // Force a measure/layout pass
              if (cmView?.requestMeasure) {
                cmView.requestMeasure();
              }

              // Dispatch a no-op transaction to force re-render
              if (cmView?.dispatch) {
                cmView.dispatch({
                  effects: []  // Empty effects array triggers update
                });
              }

              // Also try scrolling the container
              if (containerRef.current) {
                containerRef.current.scrollTop = 0;
              }

              console.log('Forced CodeMirror update, inView:', cmView?.viewState?.inView);
            } catch (e) {
              console.log('Force update error:', e);
            }
          }, 100);
        } catch (err) {
          console.error('setCode error:', err);
        }
      },
      evaluate: async (codeToEval?: string) => {
        try {
          const editorEl = editorElementRef.current as any;
          const strudelMirror = editorEl?.editor;

          // Get code to evaluate - either passed in or from editor
          const code = codeToEval ||
                       strudelMirror?.repl?.state?.code ||
                       '';

          if (!code) {
            throw new Error('No code to evaluate');
          }

          // Validate editor state before evaluating
          const cmView = strudelMirror?.editor;
          if (!cmView?.dom || !document.body.contains(cmView.dom)) {
            console.warn('CodeMirror view not properly attached, forcing re-measure');
            if (cmView?.requestMeasure) {
              cmView.requestMeasure();
            }
          }

          console.log('Evaluating code:', code.substring(0, 100) + '...');
          console.log('StrudelMirror methods:', {
            hasActivateCode: !!strudelMirror?.activateCode,
            hasRepl: !!strudelMirror?.repl,
            hasReplEvaluate: !!strudelMirror?.repl?.evaluate,
            replKeys: strudelMirror?.repl ? Object.keys(strudelMirror.repl) : [],
          });

          // NOTE: We do NOT update the CodeMirror document here.
          // The editor display is already set correctly via setCode() with the ASCII header.
          // We only want to evaluate the code for audio, not touch the display.

          // Try to resume audio context first (needed for browser autoplay policy)
          try {
            const audioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (audioCtx) {
              const ctx = new audioCtx();
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }
            }
            // Also try Strudel's getAudioContext
            if ((window as any).getAudioContext) {
              const strudelCtx = (window as any).getAudioContext();
              if (strudelCtx?.state === 'suspended') {
                await strudelCtx.resume();
              }
            }
          } catch (e) {
            console.log('Audio context resume:', e);
          }

          // Primary method: Use repl.evaluate directly
          // This evaluates the code and starts audio playback
          if (strudelMirror?.repl?.evaluate) {
            console.log('Using repl.evaluate method');
            // Update repl state only (NOT setCode - that would overwrite the editor display)
            if (strudelMirror.repl.state) {
              strudelMirror.repl.state.code = code;
              strudelMirror.repl.state.activeCode = code;
            }

            try {
              // Evaluate the code - this starts audio
              // Note: evaluate(code) returns a promise that resolves to the pattern
              const result = await strudelMirror.repl.evaluate(code);
              console.log('Evaluate result:', result);
              // Start the scheduler/playback
              if (strudelMirror.repl.start) {
                console.log('Calling repl.start()');
                await strudelMirror.repl.start();
              }
              // Audio should now be playing after evaluate + start
              console.log('Playback state:', strudelMirror.repl.state?.playing);
              return;
            } catch (evalErr: any) {
              // Handle contentEditable error - Strudel tries to update DOM elements that don't exist
              if (evalErr?.message?.includes('contentEditable') || evalErr?.message?.includes('null')) {
                console.warn('repl.evaluate DOM error, trying alternative method:', evalErr);
                // Try using activateCode as fallback
                if (strudelMirror?.activateCode) {
                  await strudelMirror.activateCode({ code, shouldToggle: false });
                  return;
                }
              }
              throw evalErr;
            }
          }

          // Fallback: Use StrudelMirror's activateCode if available
          if (strudelMirror?.activateCode) {
            console.log('Using activateCode method');
            await strudelMirror.activateCode({ code, shouldToggle: false });
            return;
          }

          // Last resort: Try global evaluate from strudel
          if (typeof (window as any).evaluate === 'function') {
            console.log('Using global evaluate function');
            await (window as any).evaluate(code);
            return;
          }

          // Very last resort: try to use the repl's toggle to start
          if (strudelMirror?.repl?.toggle) {
            console.log('Using repl.toggle to start');
            strudelMirror.repl.toggle();
            return;
          }

          throw new Error('No evaluate method found');
        } catch (err) {
          console.error('evaluate error:', err);
          onError?.(String(err));
          throw err;
        }
      },
      start: () => {
        try {
          const editorEl = editorElementRef.current as any;
          if (editorEl?.editor?.start) {
            editorEl.editor.start();
          } else if (editorEl?.start) {
            editorEl.start();
          }
        } catch (err) {
          console.error('start error:', err);
        }
      },
      stop: () => {
        try {
          const editorEl = editorElementRef.current as any;
          if (editorEl?.editor?.stop) {
            editorEl.editor.stop();
          } else if (editorEl?.stop) {
            editorEl.stop();
          } else if (typeof (window as any).hush === 'function') {
            (window as any).hush();
          }
        } catch (err) {
          console.error('stop error:', err);
        }
      },
      getCode: () => {
        try {
          const editorEl = editorElementRef.current as any;
          return editorEl?.editor?.getCode?.() ||
                 editorEl?.getCode?.() ||
                 editorEl?.getAttribute?.('code') ||
                 '';
        } catch (err) {
          console.error('getCode error:', err);
          return '';
        }
      },
    }), [onError]);

    // Load the strudel-repl script
    useEffect(() => {
      if (typeof window === 'undefined') return;

      // Check if already loaded
      if ((window as any).StrudelEditor || document.querySelector('script[src*="strudel/repl"]')) {
        setScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      // Use latest version for best visualization support
      // Note: Some versions have broken sample URLs, but visualizations are more important
      script.src = 'https://unpkg.com/@strudel/repl@latest';
      script.async = true;

      script.onload = () => {
        // Give it a moment to register the web component
        setTimeout(() => setScriptLoaded(true), 200);
      };

      script.onerror = () => {
        onError?.('Failed to load Strudel editor');
      };

      document.head.appendChild(script);
    }, [onError]);

    // Create the editor element once script is loaded
    useEffect(() => {
      if (!scriptLoaded || !containerRef.current || isLoaded) return;

      // Wait for customElements to be defined
      const waitForComponent = async () => {
        // Check if strudel-editor is defined
        if (customElements.get('strudel-editor')) {
          createEditor();
        } else {
          // Wait and retry
          await customElements.whenDefined('strudel-editor').catch(() => {
            // Timeout fallback
            setTimeout(createEditor, 500);
          });
          createEditor();
        }
      };

      const createEditor = () => {
        if (!containerRef.current || isLoaded) return;

        try {
          // Create the strudel-editor element
          const editor = document.createElement('strudel-editor');

          // Set initial code (placeholder text)
          // Note: Do NOT use innerHTML - it creates a text layer that overlaps CodeMirror
          editor.setAttribute('code', '// Give DJ Claude a prompt below to start coding music...');

          // Style the editor
          editor.style.display = 'block';
          editor.style.width = '100%';
          editor.style.height = '100%';
          editor.style.minHeight = '400px';

          // Clear container and append
          containerRef.current!.innerHTML = '';
          containerRef.current!.appendChild(editor);

          editorElementRef.current = editor;
          setIsLoaded(true);

          // Delay onReady to let the editor fully initialize
          setTimeout(() => {
            const el = editor as any;
            const strudelMirror = el?.editor;

            // Log available options for debugging
            console.log('StrudelMirror options:', {
              hasDrawContext: !!strudelMirror?.drawContext,
              hasCanvas: !!strudelMirror?.drawContext?.canvas,
              drawContextKeys: strudelMirror?.drawContext ? Object.keys(strudelMirror.drawContext) : [],
              replKeys: strudelMirror?.repl ? Object.keys(strudelMirror.repl) : [],
            });

            // Force the CodeMirror editor to be visible
            const cmView = strudelMirror?.editor;
            if (cmView) {
              console.log('Initial inView state:', cmView.viewState?.inView);

              // Try to force visibility
              if (cmView.dom) {
                // Make sure the editor DOM is visible
                cmView.dom.style.height = '100%';
                cmView.dom.style.minHeight = '400px';
                cmView.dom.style.display = 'block';

                // Scroll into view
                cmView.dom.scrollIntoView({ behavior: 'instant', block: 'start' });
              }

              // Measure (but don't focus - let the prompt input keep focus)
              setTimeout(() => {
                if (cmView.requestMeasure) cmView.requestMeasure();

                // Force a resize event which often fixes visibility
                window.dispatchEvent(new Event('resize'));

                console.log('After init, inView state:', cmView.viewState?.inView);
              }, 100);
            }

            // The canvas should be auto-managed by strudel-editor
            const canvas = el?.querySelector?.('canvas') ||
                          strudelMirror?.drawContext?.canvas ||
                          containerRef.current?.querySelector('canvas');

            if (canvas) {
              console.log('Found canvas:', canvas.width, 'x', canvas.height);
              canvas.style.display = 'block';
            }

            onReady?.();
          }, 500);
        } catch (err) {
          console.error('Error creating strudel-editor:', err);
          onError?.(String(err));
        }
      };

      waitForComponent();
    }, [scriptLoaded, initialCode, isLoaded, onReady, onError]);

    return (
      <>
        <style>{`
          /* Strudel editor wrapper - Fairlight CMI styling */
          .strudel-editor-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
          }
          .strudel-editor-wrapper strudel-editor {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          /* Force CodeMirror to fill container with Fairlight colors */
          .strudel-editor-wrapper .cm-editor {
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-color: #0a0f0a !important;
          }
          .strudel-editor-wrapper .cm-scroller {
            overflow: auto !important;
            height: 100% !important;
            background-color: #0a0f0a !important;
            /* Hide scrollbar visually but keep scroll functionality */
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
          }
          .strudel-editor-wrapper .cm-scroller::-webkit-scrollbar {
            display: none; /* Chrome/Safari/Opera */
          }
          /* Fairlight CMI phosphor green syntax */
          .strudel-editor-wrapper .cm-content {
            color: #33ff33 !important;
            caret-color: #22aa22 !important;
          }
          .strudel-editor-wrapper .cm-cursor {
            border-left-color: #22aa22 !important;
            border-left-width: 2px !important;
          }
          .strudel-editor-wrapper .cm-selectionBackground {
            background-color: rgba(51, 255, 51, 0.3) !important;
          }
          .strudel-editor-wrapper .cm-gutters {
            background-color: #0a0f0a !important;
            border-right: 1px solid #22aa22 !important;
            color: #116611 !important;
          }
          .strudel-editor-wrapper .cm-lineNumbers .cm-gutterElement {
            color: #22aa22 !important;
          }
          .strudel-editor-wrapper .cm-activeLine {
            background-color: rgba(51, 255, 51, 0.05) !important;
          }
          .strudel-editor-wrapper .cm-activeLineGutter {
            background-color: rgba(51, 255, 51, 0.1) !important;
          }
          /* Strudel mini locations (active highlighting) */
          .strudel-editor-wrapper .cm-strudel-highlight,
          .strudel-editor-wrapper .cm-strudel-flash {
            background-color: rgba(102, 255, 102, 0.2) !important;
            box-shadow: 0 0 8px rgba(51, 255, 51, 0.4);
          }
          /* Syntax highlighting - all shades of phosphor green */
          .strudel-editor-wrapper .cm-string { color: #22aa22 !important; }
          .strudel-editor-wrapper .cm-number { color: #44dd44 !important; }
          .strudel-editor-wrapper .cm-keyword { color: #88ff88 !important; }
          .strudel-editor-wrapper .cm-comment { color: #116611 !important; }
          .strudel-editor-wrapper .cm-function { color: #55ff55 !important; }
          .strudel-editor-wrapper .cm-variableName { color: #33ff33 !important; }
          .strudel-editor-wrapper .cm-operator { color: #22aa22 !important; }
          .strudel-editor-wrapper .cm-punctuation { color: #22aa22 !important; }
          .strudel-editor-wrapper .cm-propertyName { color: #44cc44 !important; }
          .strudel-editor-wrapper .cm-bracket { color: #22aa22 !important; }
        `}</style>
        <div
          ref={containerRef}
          className="strudel-editor-wrapper"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#0a0f0a',
            border: '1px solid #22aa22',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
          }}
          suppressHydrationWarning
        />
      </>
    );
  }
);
