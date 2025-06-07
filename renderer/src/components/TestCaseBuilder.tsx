// renderer/src/components/TestCaseBuilder.tsx
import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ProjectMeta, TestSuite, TestCase, Action, PageObject } from '../../../shared/types';
import ActionPalette from './ActionPalette';
import InputDialog from './InputDialog';
import LocatorSearch from './LocatorSearch';

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
    actionType: 'click' | 'fill' | null;
    stepIndex: number;
    isEdit: boolean;
  }>({ open: false, actionType: null, stepIndex: -1, isEdit: false });
  const [editStepIndex, setEditStepIndex] = useState<number | null>(null);

  // load existing steps
  useEffect(() => {
    const suite = meta.suites.find(s => s.name === suiteName);
    const tc = suite?.cases.find(c => c.name === caseName);
    setSteps(tc?.actions || []);
  }, [meta, suiteName, caseName]);

  // persist updated steps
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

  // insert a new step
  const finalizeInsert = (action: Action, index: number) => {
    const ns = [...steps];
    ns.splice(index, 0, action);
    saveSteps(ns);
  };

  // update an existing step
  const finalizeUpdate = (action: Action, index: number) => {
    const ns = [...steps];
    ns[index] = action;
    saveSteps(ns);
  };

  // handle drag & drop
  const onDragEnd = (res: DropResult) => {
    const { source, destination, draggableId } = res;
    if (!destination) return;

    // from palette → steps insertion
    if (source.droppableId === 'palette' && destination.droppableId === 'steps') {
      const type = draggableId as Action['type'];
      // click/fill
      if (type === 'click' || type === 'fill') {
        const hasPO = (meta.pages || []).length > 0;
        setLocPicker({
          open: true,
          actionType: type,
          stepIndex: destination.index,
          isEdit: false,
        });
        return;
      }
      // goto
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
      // wait
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

    // reorder within steps
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

  // start editing a step
  const handleStepEdit = (index: number) => {
    const act = steps[index];
    setEditStepIndex(index);
    const type = act.type;
    // click/fill: open loc picker in edit mode
    if (type === 'click' || type === 'fill') {
      setLocPicker({ open: true, actionType: type, stepIndex: index, isEdit: true });
      return;
    }
    // goto
    if (type === 'goto') {
      setDialog({
        open: true,
        title: 'Edit URL',
        label: 'Enter URL:',
        defaultValue: (act as any).url || '',
        onSubmit: url => {
          setDialog(d => ({ ...d, open: false }));
          if (url) finalizeUpdate({ type, url } as Action, index);
          setEditStepIndex(null);
        },
      });
      return;
    }
    // wait
    if (type === 'wait') {
      setDialog({
        open: true,
        title: 'Edit Timeout',
        label: 'Enter milliseconds:',
        defaultValue: String((act as any).timeout || 1000),
        onSubmit: ms => {
          setDialog(d => ({ ...d, open: false }));
          const t = parseInt(ms, 10);
          if (!isNaN(t)) finalizeUpdate({ type, timeout: t } as Action, index);
          setEditStepIndex(null);
        },
      });
      return;
    }
  };

  // user selects existing locator key
  const handleLocatorSelect = (locatorKey: string) => {
    const { actionType, stepIndex, isEdit } = locPicker;
    // lookup CSS value
    let selector = locatorKey;
    for (const pg of meta.pages as PageObject[]) {
      if (pg.selectors[locatorKey] !== undefined) {
        selector = pg.selectors[locatorKey];
        break;
      }
    }
    if (actionType === 'fill') {
      setDialog({
        open: true,
        title: 'Enter Fill Value',
        label: `Value for "${locatorKey}":`,
        defaultValue: '',
        onSubmit: value => {
          setDialog(d => ({ ...d, open: false }));
          const action: any = { type: 'fill', selector, value, locatorKey };
          if (isEdit) finalizeUpdate(action, stepIndex);
          else finalizeInsert(action, stepIndex);
          setEditStepIndex(null);
        },
      });
    } else { // click
      const action: any = { type: 'click', selector, locatorKey };
      if (isEdit) finalizeUpdate(action, stepIndex);
      else finalizeInsert(action, stepIndex);
      setEditStepIndex(null);
    }
    setLocPicker(lp => ({ ...lp, open: false }));
  };

  // user adds new locator
  const handleLocatorAdd = () => {
    const { actionType, stepIndex, isEdit } = locPicker;
    setLocPicker(lp => ({ ...lp, open: false }));
    setDialog({
      open: true,
      title: 'New Locator CSS',
      label: 'Enter CSS selector:',
      defaultValue: '',
      onSubmit: css => {
        setDialog(d => ({ ...d, open: false }));
        if (!css) return;
        if (actionType === 'fill') {
          setDialog({
            open: true,
            title: 'Enter Fill Value',
            label: `Value for "${css}":`,
            defaultValue: '',
            onSubmit: value => {
              setDialog(d => ({ ...d, open: false }));
              const action: any = { type: 'fill', selector: css, value, locatorKey: css };
              if (isEdit) finalizeUpdate(action, stepIndex);
              else finalizeInsert(action, stepIndex);
              setEditStepIndex(null);
            },
          });
        } else {
          const action: any = { type: 'click', selector: css, locatorKey: css };
          if (isEdit) finalizeUpdate(action, stepIndex);
          else finalizeInsert(action, stepIndex);
          setEditStepIndex(null);
        }
      },
    });
  };

  return (
    <div>
      <h4 className="text-lg font-medium mb-2">Available Actions</h4>
      <DragDropContext onDragEnd={onDragEnd}>
        <ActionPalette />

        <h4 className="text-lg font-medium mb-2">Steps for “{caseName}”</h4>
        <Droppable droppableId="steps">
          {(prov) => (
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
                  {(p) => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                      className="flex items-center justify-between p-2 mb-2 bg-white shadow cursor-move"
                    >
                      <span className="flex-1">
                        {act.type === 'goto' && `Goto: ${(act as any).url}`}
                        {act.type === 'click' &&
                          `Click [${(act as any).locatorKey}] (${(act as any).selector})`}
                        {act.type === 'fill' &&
                          `Fill [${(act as any).locatorKey}] (${(act as any).selector}) = ${(act as any).value}`}
                        {act.type === 'wait' &&
                          `Wait ${(act as any).timeout}ms`}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStepEdit(idx)}
                          className="text-blue-500"
                        >
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

      {/* {locPicker.open && meta.pages.length > 0 && ( */}
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
        onSubmit={value => {
          dialog.onSubmit(value);
        }}
        onCancel={() => setDialog(d => ({ ...d, open: false }))}
      />
    </div>
  );
}
