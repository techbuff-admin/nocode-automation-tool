// import React, { useState } from 'react';

// export default function TestCaseBuilder({ projectDir, suiteFile, onRefresh }) {
//   const [code, setCode] = useState('');
//   const [adding, setAdding] = useState(false);

//   const addCase = async () => {
//     if (!code.trim()) return;
//     setAdding(true);
//     await window.api.createTestCase({
//       projectDir,
//       suiteFile,
//       caseCode: code.trim(),
//     });
//     setCode('');
//     setAdding(false);
//     onRefresh();
//   };

//   return (
//     <div className="mb-4">
//       <textarea
//         rows={4}
//         value={code}
//         onChange={e => setCode(e.target.value)}
//         placeholder="Playwright code…"
//         className="w-full border rounded p-2 text-sm"
//       />
//       <button
//         disabled={adding}
//         onClick={addCase}
//         className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
//       >
//         {adding ? 'Adding…' : 'Add Test Case'}
//       </button>
//     </div>
//   );
// }
// renderer/src/components/TestCaseBuilder.tsx
// renderer/src/components/TestCaseBuilder.tsx
import React, { useEffect, useState } from 'react';
import { ProjectMeta, TestSuite, TestCase, Action } from '../../../shared/types';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import ActionPalette from './ActionPalette';
import InputDialog from './InputDialog';

interface Props {
  projectDir: string;
  suiteName: string;
  caseName: string;
  meta: ProjectMeta;
  onMetaChange: (updated: ProjectMeta) => Promise<void>;
}

export default function TestCaseBuilder({
  projectDir,
  suiteName,
  caseName,
  meta,
  onMetaChange,
}: Props) {
  const [steps, setSteps] = useState<Action[]>([]);
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    label: string;
    defaultValue: string;
    onSubmit: (value: string) => void;
  }>({
    open: false,
    title: '',
    label: '',
    defaultValue: '',
    onSubmit: () => {},
  });

  // Load existing steps
  useEffect(() => {
    const suite = meta.suites.find((s: TestSuite) => s.name === suiteName);
    const tc = suite?.cases.find((c: TestCase) => c.name === caseName);
    setSteps(tc?.actions || []);
  }, [meta, suiteName, caseName]);

  // Helper to persist steps back into meta
  const saveSteps = async (newSteps: Action[]) => {
    const updatedMeta = { ...meta };
    updatedMeta.suites = updatedMeta.suites.map((s: TestSuite) =>
      s.name === suiteName
        ? {
            ...s,
            cases: s.cases.map((c: TestCase) =>
              c.name === caseName ? { ...c, actions: newSteps } : c
            ),
          }
        : s
    );
    await onMetaChange(updatedMeta);
    setSteps(newSteps);
  };

  // Insert a finalized action
  const finalize = (action: Action, index: number) => {
    const ns = Array.from(steps);
    ns.splice(index, 0, action);
    saveSteps(ns);
  };

  // Drag & drop handler
  const onDragEnd = (res: DropResult) => {
    const { source, destination, draggableId } = res;
    if (!destination) return;

    // Palette → Steps
    if (source.droppableId === 'palette' && destination.droppableId === 'steps') {
      const type = draggableId as Action['type'];
      const base: Partial<Action> = { type };

      // “fill” or “click” need a locator
      if (type === 'fill' || type === 'click') {
        setDialog({
          open: true,
          title: 'Select or Add Locator',
          label: 'Enter locator key (or new):',
          defaultValue: '',
          onSubmit: (key) => {
            setDialog(dialog => ({ ...dialog, open: false }));
            if (!key) return;
            // collect existing keys
            const existing = meta.pages.flatMap(p => Object.keys(p.selectors));
            if (!existing.includes(key)) {
              // prompt for selector value
              setDialog({
                open: true,
                title: `CSS Selector for "${key}"`,
                label: 'Enter CSS selector:',
                defaultValue: '',
                onSubmit: (sel) => {
                  setDialog(d => ({ ...d, open: false }));
                  if (!sel) return;
                  // add to first page
                  meta.pages[0].selectors[key] = sel;
                  finalize({ ...(base as Action), selector: key }, destination.index);
                },
              });
            } else {
              finalize({ ...(base as Action), selector: key }, destination.index);
            }
          },
        });
        return;
      }

      // “goto” needs URL
      if (type === 'goto') {
        setDialog({
          open: true,
          title: 'Goto URL',
          label: 'Enter URL:',
          defaultValue: '',
          onSubmit: (url) => {
            setDialog(d => ({ ...d, open: false }));
            if (!url) return;
            finalize({ type: 'goto', url } as Action, destination.index);
          },
        });
        return;
      }

      // “wait” needs timeout
      if (type === 'wait') {
        setDialog({
          open: true,
          title: 'Wait Timeout',
          label: 'Enter milliseconds:',
          defaultValue: '1000',
          onSubmit: (ms) => {
            setDialog(d => ({ ...d, open: false }));
            const t = parseInt(ms, 10);
            if (isNaN(t)) return;
            finalize({ type: 'wait', timeout: t } as Action, destination.index);
          },
        });
        return;
      }
    }

    // Reorder within steps
    if (source.droppableId === 'steps' && destination.droppableId === 'steps') {
      const ns = Array.from(steps);
      const [moved] = ns.splice(source.index, 1);
      ns.splice(destination.index, 0, moved);
      saveSteps(ns);
    }
  };

  return (
    <div>
      <h4 className="text-lg font-medium mb-2">Available Actions</h4>
      <DragDropContext onDragEnd={onDragEnd}>
        <ActionPalette />

        <h4 className="text-lg font-medium mb-2">Steps for “{caseName}”</h4>
        <Droppable droppableId="steps">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="min-h-[200px] p-2 border border-dashed rounded"
            >
              {steps.map((act, idx) => (
                <Draggable
                  key={`${act.type}-${idx}`}
                  draggableId={`${act.type}-${idx}`}
                  index={idx}
                >
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="flex items-center justify-between p-2 mb-2 bg-white shadow cursor-move"
                    >
                      <span>
                        {act.type === 'goto' && `Goto: ${(act as any).url}`}
                        {act.type === 'fill' && `Fill [${(act as any).selector}]`}
                        {act.type === 'click' && `Click [${(act as any).selector}]`}
                        {act.type === 'wait' && `Wait ${(act as any).timeout}ms`}
                      </span>
                      <button
                        onClick={() => {
                          const ns = [...steps];
                          ns.splice(idx, 1);
                          saveSteps(ns);
                        }}
                        className="text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <InputDialog
        open={dialog.open}
        title={dialog.title}
        label={dialog.label}
        defaultValue={dialog.defaultValue}
        onSubmit={dialog.onSubmit}
        onCancel={() =>
          setDialog(d => ({ ...d, open: false }))
        }
      />
    </div>
  );
}
