// renderer/src/components/TestCaseBuilder.tsx
import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  ProjectMeta,
  TestSuite,
  TestCase,
  Action,
  PageObject,
} from '../../../shared/types';
import ActionPalette from './ActionPalette';
import AssertionPalette from './AssertionPalette';
import InputDialog from './InputDialog';
import LocatorSearch from './LocatorSearch';
import { selectors } from 'playwright';

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
  const [locPicker, setLocPicker] = useState<{
    open: boolean;
    actionType: Action['type'] | 'assertion' | null;
    stepIndex: number;
    isEdit: boolean;
    assertionName?: string;
  }>({ open: false, actionType: null, stepIndex: -1, isEdit: false });

  // Load existing steps
  useEffect(() => {
    const suite = meta.suites.find(s => s.name === suiteName);
    const tc = suite?.cases.find(c => c.name === caseName);
    setSteps(tc?.actions || []);
  }, [meta, suiteName, caseName]);

  // Persist updated steps
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

  const finalizeInsert = (action: Action, index: number) => {
    const ns = [...steps];
    ns.splice(index, 0, action);
    saveSteps(ns);
  };
  const finalizeUpdate = (action: Action, index: number) => {
    const ns = [...steps];
    ns[index] = action;
    saveSteps(ns);
  };

  const onDragEnd = (res: DropResult) => {
    const { source, destination, draggableId } = res;
    if (!destination) return;

    // ---- Assertions palette → steps ----
    if (source.droppableId === 'assertions' && destination.droppableId === 'steps') {
      const name = draggableId; // e.g. 'toHaveText', 'toHaveURL', etc.

      
      // special: page‐level assertions need only a value
      if (name === 'toHaveURL' || name === 'toHaveTitle') {
        setDialog({
          open: true,
          title: `Enter value for ${name}`,
          label: 'Value:',
          defaultValue: '',
          onSubmit: val => {
            setDialog(d => ({ ...d, open: false }));
            finalizeInsert(
              { type: 'assertion', assertion: name, expected: val },
              destination.index
            );
          },
        });
        return;
      }

      // locator‐based assertions
      setLocPicker({
        open: true,
        actionType: 'assertion',
        stepIndex: destination.index,
        isEdit: false,
        assertionName: name,
      });
      return;
    }

    // ---- Actions palette → steps ----
    if (source.droppableId === 'palette' && destination.droppableId === 'steps') {
      const type = draggableId as Action['type'];

           // ─── page-level screenshot ───
           if (type === 'screenshot') {
            // no locator, no dialog
            finalizeInsert({ type: 'screenshot',selector:'' }, destination.index);
            return;
         }
      // locator‐based actions
      if (
        [
          'click','fill','dblclick','hover','press',
          'check','uncheck','selectOption','setInputFiles',
        ].includes(type)
      ) {
        setLocPicker({
          open: true,
          actionType: type,
          stepIndex: destination.index,
          isEdit: false,
        });
        return;
      }

      // goto URL
      if (type === 'goto') {
        setDialog({
          open: true,
          title: 'Navigate to URL',
          label: 'Enter URL:',
          defaultValue: '',
          onSubmit: url => {
            setDialog(d => ({ ...d, open: false }));
            if (url) finalizeInsert({ type, url } as Action, destination.index);
          },
        });
        return;
      }
      // wait timeout
      if (type === 'wait') {
        setDialog({
          open: true,
          title: 'Wait Timeout',
          label: 'Enter milliseconds:',
          defaultValue: '1000',
          onSubmit: ms => {
            setDialog(d => ({ ...d, open: false }));
            const t = parseInt(ms, 10);
            if (!isNaN(t)) finalizeInsert({ type, timeout: t } as Action, destination.index);
          },
        });
        return;
      }
    }

    // ---- Reorder within steps ----
    if (
      source.droppableId === 'steps' &&
      destination.droppableId === 'steps'
    ) {
      const ns = Array.from(steps);
      const [moved] = ns.splice(source.index, 1);
      ns.splice(destination.index, 0, moved);
      saveSteps(ns);
    }
  };

  // Inline edit handler
  const handleStepEdit = (index: number) => {
    const act = steps[index];

    // ---- Assertions inline edit ----
    if (act.type === 'assertion') {
      const name = act.assertion;
      // page‐level
      if (name === 'toHaveURL' || name === 'toHaveTitle') {
        setDialog({
          open: true,
          title: `Edit value for ${name}`,
          label: 'Value:',
          defaultValue: act.expected as string || '',
          onSubmit: val => {
            setDialog(d => ({ ...d, open: false }));
            finalizeUpdate({ ...act, expected: val }, index);
          },
        });
        return;
      }
      // locator‐based only
      if (!act.expected) {
        setLocPicker({
          open: true,
          actionType: 'assertion',
          stepIndex: index,
          isEdit: true,
          assertionName: name,
        });
        return;
      }
      // locator + value
      setDialog({
        open: true,
        title: `Edit expected for ${name}`,
        label: 'Expected:',
        defaultValue: String(act.expected),
        onSubmit: val => {
          setDialog(d => ({ ...d, open: false }));
          const expected =
            name === 'toHaveCount' ? parseInt(val, 10) : val;
          finalizeUpdate({ ...act, expected }, index);
        },
      });
      return;
    }

    // ---- Actions inline edit ----
    if (
      [
        'click','fill','dblclick','hover','press',
        'check','uncheck','selectOption','setInputFiles',,
      ].includes(act.type)
    ) {
      setLocPicker({
        open: true,
        actionType: act.type,
        stepIndex: index,
        isEdit: true,
      });
      return;
    }
    if (act.type === 'goto') {
      setDialog({
        open: true,
        title: 'Edit URL',
        label: 'Enter URL:',
        defaultValue: act.url,
        onSubmit: url => {
          setDialog(d => ({ ...d, open: false }));
          finalizeUpdate({ type: 'goto', url }, index);
        },
      });
      return;
    }
      // screenshot has no editable parameters
    if (act.type === 'screenshot') {
      return;
     }
     
    if (act.type === 'wait') {
      setDialog({
        open: true,
        title: 'Edit Timeout',
        label: 'Enter milliseconds:',
        defaultValue: String(act.timeout),
        onSubmit: ms => {
          setDialog(d => ({ ...d, open: false }));
          const t = parseInt(ms, 10);
          if (!isNaN(t)) finalizeUpdate({ type: 'wait', timeout: t }, index);
        },
      });
      return;
    }
  };

  // Locator or assertion locator handler
  const handleLocatorSelect = (key: string) => {
    const { actionType, stepIndex, isEdit, assertionName } = locPicker;
    let selector = key;
    for (const pg of meta.pages as PageObject[]) {
      if (pg.selectors[key] !== undefined) {
        selector = pg.selectors[key];
        break;
      }
    }

    // ---- Assertion locator chosen ----
    if (actionType === 'assertion' && assertionName) {
      const name = assertionName;
      const needsValue = [
        'toHaveText','toHaveValue','toContainText',
        'toHaveAttribute','toHaveClass','toHaveCount',
      ].includes(name);

      if (needsValue) {
        setDialog({
          open: true,
          title: `Enter expected for ${name}`,
          label: 'Expected:',
          defaultValue: '',
          onSubmit: val => {
            setDialog(d => ({ ...d, open: false }));
            finalizeInsert(
              {
                type: 'assertion',
                assertion: name,
                selector,
                expected: name === 'toHaveCount' ? parseInt(val, 10) : val,
              },
              stepIndex
            );
          },
        });
      } else {
        finalizeInsert(
          { type: 'assertion', assertion: name, selector },
          stepIndex
        );
      }
      setLocPicker(lp => ({ ...lp, open: false }));
      return;
    }

    // ---- Normal action locator chosen ----
    let action: any;
    switch (actionType) {
      case 'fill':
        setDialog({
          open: true,
          title: `Enter value for ${key}`,
          label: 'Value:',
          defaultValue: '',
          onSubmit: val => {
            setDialog(d => ({ ...d, open: false }));
            action = { type: 'fill', selector, value: val };
            isEdit ? finalizeUpdate(action, stepIndex) : finalizeInsert(action, stepIndex);
          },
        });
        break;
      case 'press':
        setDialog({
          open: true,
          title: 'Enter key:',
          label: 'Key:',
          defaultValue: '',
          onSubmit: val => {
            setDialog(d => ({ ...d, open: false }));
            action = { type: 'press', selector, key: val };
            isEdit ? finalizeUpdate(action, stepIndex) : finalizeInsert(action, stepIndex);
          },
        });
        break;
      case 'selectOption':
        setDialog({
          open: true,
          title: 'Enter option value:',
          label: 'Value:',
          defaultValue: '',
          onSubmit: val => {
            setDialog(d => ({ ...d, open: false }));
            action = { type: 'selectOption', selector, value: val };
            isEdit ? finalizeUpdate(action, stepIndex) : finalizeInsert(action, stepIndex);
          },
        });
        break;
      case 'setInputFiles':
        setDialog({
          open: true,
          title: 'Enter file paths (comma-sep):',
          label: 'Files:',
          defaultValue: '',
          onSubmit: csv => {
            setDialog(d => ({ ...d, open: false }));
            action = { type: 'setInputFiles', selector, files: csv.split(',').map(s=>s.trim()) };
            isEdit ? finalizeUpdate(action, stepIndex) : finalizeInsert(action, stepIndex);
          },
        });
        break;
      default:
        action = { type: actionType!, selector };
        isEdit ? finalizeUpdate(action, stepIndex) : finalizeInsert(action, stepIndex);
    }
    setLocPicker(lp => ({ ...lp, open: false }));
  };

  const handleLocatorAdd = () =>
    setDialog({
      open: true,
      title: 'New Locator CSS',
      label: 'CSS Selector:',
      defaultValue: '',
      onSubmit: css => {
        setDialog(d => ({ ...d, open: false }));
        handleLocatorSelect(css);
      },
    });

  return (
    <div>
      <h4 className="text-lg font-medium mb-2">Available Actions</h4>
      <DragDropContext onDragEnd={onDragEnd}>
        <ActionPalette />

        <h4 className="text-lg font-medium mb-2">Available Assertions</h4>
        <AssertionPalette />

        <h4 className="text-lg font-medium mb-2">Steps for “{caseName}”</h4>
        <Droppable droppableId="steps">
          {prov => (
            <div
              ref={prov.innerRef}
              {...prov.droppableProps}
              className="min-h-[200px] p-2 border border-dashed rounded"
            >
              {steps.map((act, idx) => (
                <Draggable
                  key={`${act.type}-${idx}`}
                  draggableId={`${act.type}-${idx}`}
                  index={idx}
                >
                  {p => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                      className="flex items-center justify-between p-2 mb-2 bg-white shadow cursor-move"
                    >
                      <span className="flex-1">
                        {/* Actions */}
                        {act.type === 'goto' && `Goto: ${act.url}`}
                        {act.type === 'wait' && `Wait ${act.timeout}ms`}
                        {['click','dblclick','hover','check','uncheck'].includes(act.type) &&
                          `${act.type}: ${act.selector}`}
                        {act.type === 'fill' &&
                          `Fill ${act.selector} = ${act.value}`}
                        {act.type === 'press' &&
                          `Press ${act.key} on ${act.selector}`}
                        {act.type === 'selectOption' &&
                          `SelectOption ${act.selector} = ${act.value}`}
                        {act.type === 'setInputFiles' &&
                          `SetFiles ${act.selector} = ${act.files.join(', ')}`}
                        {act.type === 'screenshot' &&
                          `Capture Page Screenshot`}

                        {/* Assertions */}
                        {act.type === 'assertion' && (
                          act.assertion === 'toHaveURL' || act.assertion === 'toHaveTitle'
                            ? `expect(page).${act.assertion}(${JSON.stringify(act.expected)})`
                            : act.expected !== undefined
                              ? `expect(page.locator('${act.selector}')).${act.assertion}(${JSON.stringify(act.expected)})`
                              : `expect(page.locator('${act.selector}')).${act.assertion}()`
                        )}
                      </span>
                      <div className="flex space-x-2">
                        <button onClick={() => handleStepEdit(idx)} className="text-blue-500">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            const ns = [...steps];
                            ns.splice(idx, 1);
                            saveSteps(ns);
                          }}
                          className="text-red-500"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {locPicker.open && (
        <LocatorSearch
          pages={meta.pages as PageObject[]}
          onSelect={handleLocatorSelect}
          onAddNew={handleLocatorAdd}
          onClose={() => setLocPicker(lp => ({ ...lp, open: false }))}
        />
      )}

      <InputDialog
        open={dialog.open}
        title={dialog.title}
        label={dialog.label}
        defaultValue={dialog.defaultValue}
        onSubmit={dialog.onSubmit}
        onCancel={() => setDialog(d => ({ ...d, open: false }))}
      />
    </div>
  );
}
