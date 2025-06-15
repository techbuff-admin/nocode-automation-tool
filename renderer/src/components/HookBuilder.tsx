// renderer/src/components/HookBuilder.tsx
import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { ProjectMeta, TestSuite, Action } from '../../../shared/types';
import ActionPalette from './ActionPalette';
import InputDialog from './InputDialog';
import LocatorSearch from './LocatorSearch';
import { PageObject } from '../../../shared/types';

interface Props {
  projectDir: string;
  suiteName: string;
  hookName: 'beforeAll' | 'beforeEach' | 'afterEach' | 'afterAll';
  meta: ProjectMeta;
  onMetaChange: (updated: ProjectMeta) => Promise<void>;
}

export default function HookBuilder({
  suiteName,
  hookName,
  meta,
  onMetaChange,
}: Props) {
  const [actions, setActions] = useState<Action[]>([]);
  const [dialog, setDialog] = useState<{
    open: boolean;
    title?: string;
    label?: string;
    defaultValue?: string;
    onSubmit?: (value: string) => void;
  }>({ open: false });
  const [locPicker, setLocPicker] = useState<{
    open: boolean;
    actionType: Action['type'] | null;
    stepIndex: number;
    isEdit: boolean;
  }>({ open: false, actionType: null, stepIndex: -1, isEdit: false });

  // load existing hook actions
  useEffect(() => {
    const suite = meta.suites.find(s => s.name === suiteName)!;
    setActions(suite.hooks?.[hookName] || []);
  }, [meta, suiteName, hookName]);

  // persist hook actions
  const saveHook = async (newActs: Action[]) => {
    const updated = { ...meta };
    updated.suites = updated.suites.map((s: TestSuite) =>
      s.name === suiteName
        ? { ...s, hooks: { ...s.hooks!, [hookName]: newActs } }
        : s
    );
    await onMetaChange(updated);
    setActions(newActs);
  };

  const finalizeInsert = (action: Action, idx: number) => {
    const ns = [...actions];
    ns.splice(idx, 0, action);
    saveHook(ns);
  };
  const finalizeUpdate = (action: Action, idx: number) => {
    const ns = [...actions];
    ns[idx] = action;
    saveHook(ns);
  };

  // handle drag & drop (insert & reorder)
  const onDragEnd = (res: DropResult) => {
    const { source, destination, draggableId } = res;
    if (!destination) return;
    const type = draggableId as Action['type'];

    // insert from palette
    if (source.droppableId === 'palette' && destination.droppableId === 'hook') {
      // locator-based
      if ([
        'click','fill','dblclick','hover','press',
        'check','uncheck','selectOption','setInputFiles','screenshot'
      ].includes(type)) {
        setLocPicker({ open: true, actionType: type, stepIndex: destination.index, isEdit: false });
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

    // reorder within hook
    if (source.droppableId === 'hook' && destination.droppableId === 'hook') {
      const ns = [...actions];
      const [moved] = ns.splice(source.index, 1);
      ns.splice(destination.index, 0, moved);
      saveHook(ns);
    }
  };

  // edit existing action
  const handleActionEdit = (index: number) => {
    const act = actions[index];
    // locator-based actions
    if (['click','fill','dblclick','hover','press','check','uncheck','selectOption','setInputFiles','screenshot'].includes(act.type)) {
      setLocPicker({
        open: true,
        actionType: act.type,
        stepIndex: index,
        isEdit: true,
      });
      return;
    }
    // goto
    if (act.type === 'goto') {
      setDialog({
        open: true,
        title: 'Edit URL',
        label: 'Enter URL:',
        defaultValue: (act as any).url,
        onSubmit: url => {
          setDialog(d => ({ ...d, open: false }));
          finalizeUpdate({ type: 'goto', url } as Action, index);
        },
      });
      return;
    }
    // wait
    if (act.type === 'wait') {
      setDialog({
        open: true,
        title: 'Edit Timeout',
        label: 'Enter milliseconds:',
        defaultValue: String((act as any).timeout),
        onSubmit: ms => {
          setDialog(d => ({ ...d, open: false }));
          const t = parseInt(ms, 10);
          if (!isNaN(t)) finalizeUpdate({ type: 'wait', timeout: t } as Action, index);
        },
      });
      return;
    }
  };

  // handle locator (and file, value, etc.)
  const handleLocatorSelect = (locKey: string) => {
    let selector = locKey;
    for (const pg of meta.pages as PageObject[]) {
      if (pg.selectors[locKey] !== undefined) {
        selector = pg.selectors[locKey];
        break;
      }
    }
    const { actionType, stepIndex, isEdit } = locPicker;

    // fill
    if (actionType === 'fill') {
      setDialog({
        open: true, title: `Enter value for ${locKey}`, label: 'Value:', defaultValue: '',
        onSubmit: val => {
          setDialog(d => ({ ...d, open: false }));
          const a = { type: 'fill', selector, value: val } as Action;
          isEdit ? finalizeUpdate(a, stepIndex) : finalizeInsert(a, stepIndex);
          setLocPicker(l => ({ ...l, open: false }));
        },
      });
      return;
    }
    // press
    if (actionType === 'press') {
      setDialog({
        open: true, title: 'Enter key for press', label: 'Key:', defaultValue: '',
        onSubmit: key => {
          setDialog(d => ({ ...d, open: false }));
          const a = { type: 'press', selector, key } as Action;
          isEdit ? finalizeUpdate(a, stepIndex) : finalizeInsert(a, stepIndex);
          setLocPicker(l => ({ ...l, open: false }));
        },
      });
      return;
    }
    // selectOption
    if (actionType === 'selectOption') {
      setDialog({
        open: true, title: 'Enter option value', label: 'Value:', defaultValue: '',
        onSubmit: val => {
          setDialog(d => ({ ...d, open: false }));
          const a = { type: 'selectOption', selector, value: val } as Action;
          isEdit ? finalizeUpdate(a, stepIndex) : finalizeInsert(a, stepIndex);
          setLocPicker(l => ({ ...l, open: false }));
        },
      });
      return;
    }
    // setInputFiles
    if (actionType === 'setInputFiles') {
      setDialog({
        open: true, title: 'Enter comma-separated file paths', label: 'Files:', defaultValue: '',
        onSubmit: csv => {
          setDialog(d => ({ ...d, open: false }));
          const files = csv.split(',').map(s => s.trim());
          const a = { type: 'setInputFiles', selector, files } as Action;
          isEdit ? finalizeUpdate(a, stepIndex) : finalizeInsert(a, stepIndex);
          setLocPicker(l => ({ ...l, open: false }));
        },
      });
      return;
    }
    // all others: click, dblclick, hover, check, uncheck, screenshot
    if (actionType) {
      const a = { type: actionType, selector } as Action;
      isEdit ? finalizeUpdate(a, stepIndex) : finalizeInsert(a, stepIndex);
    }
    setLocPicker(l => ({ ...l, open: false }));
  };

  const handleLocatorAdd = () => {
    setLocPicker(l => ({ ...l, open: false }));
    setDialog({
      open: true, title: 'Enter CSS selector', label: 'Selector:', defaultValue: '',
      onSubmit: css => {
        setDialog(d => ({ ...d, open: false }));
        handleLocatorSelect(css);
      },
    });
  };

  return (
    <div>
      <h4 className="text-lg font-medium mb-2">{hookName}</h4>
      <DragDropContext onDragEnd={onDragEnd}>
        <ActionPalette />

        <Droppable droppableId="hook">
          {provided => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="min-h-[200px] p-2 border border-dashed rounded"
            >
              {actions.map((act, idx) => (
                <Draggable
                  key={`${hookName}-${act.type}-${idx}`}
                  draggableId={`${hookName}-${act.type}-${idx}`}
                  index={idx}
                >
                  {prov => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="flex items-center justify-between p-2 mb-2 bg-white shadow cursor-move"
                    >
                      <span className="flex-1">
                        {act.type === 'goto' && `Goto: ${(act as any).url}`}
                        {act.type === 'wait' && `Wait ${(act as any).timeout}ms`}
                        {['click','dblclick','hover','check','uncheck','screenshot'].includes(act.type) &&
                          `${act.type}: ${(act as any).selector}`}
                        {act.type === 'fill' &&
                          `Fill ${(act as any).selector} = ${(act as any).value}`}
                        {act.type === 'press' &&
                          `Press ${(act as any).key} on ${(act as any).selector}`}
                        {act.type === 'selectOption' &&
                          `SelectOption ${(act as any).selector} = ${(act as any).value}`}
                        {act.type === 'setInputFiles' &&
                          `SetFiles ${(act as any).selector} = ${(act as any).files.join(', ')}`}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleActionEdit(idx)}
                          className="text-blue-500"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            const ns = [...actions];
                            ns.splice(idx, 1);
                            saveHook(ns);
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
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {locPicker.open && (
        <LocatorSearch
          pages={meta.pages as PageObject[]}
          onSelect={handleLocatorSelect}
          onAddNew={handleLocatorAdd}
          onClose={() => setLocPicker(l => ({ ...l, open: false }))}
        />
      )}

      <InputDialog
        open={dialog.open}
        title={dialog.title || ''}
        label={dialog.label || ''}
        defaultValue={dialog.defaultValue || ''}
        onSubmit={dialog.onSubmit!}
        onCancel={() => setDialog(d => ({ ...d, open: false }))}
      />
    </div>
  );
}
