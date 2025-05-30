// renderer/src/components/HookBuilder.tsx
import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { TrashIcon } from '@heroicons/react/24/outline';
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
  projectDir,
  suiteName,
  hookName,
  meta,
  onMetaChange,
}: Props) {
  const [actions, setActions] = useState<Action[]>([]);
  const [dialog, setDialog] = useState<any>({ open: false });
  const [locPicker, setLocPicker] = useState<any>({
    open: false,
    actionType: null,
    stepIndex: -1,
    isEdit: false,
  });

  // Load existing hook actions
  useEffect(() => {
    const suite = meta.suites.find(s => s.name === suiteName)!;
    setActions(suite.hooks?.[hookName] || []);
  }, [meta, suiteName, hookName]);

  // Persist hook actions
  const saveHook = async (newActs: Action[]) => {
    const updated = { ...meta };
    updated.suites = updated.suites.map((s: TestSuite) =>
      s.name === suiteName
        ? {
            ...s,
            hooks: { ...s.hooks!, [hookName]: newActs },
          }
        : s
    );
    await onMetaChange(updated);
    setActions(newActs);
  };

  // Insert or update
  const finalizeInsert = (action: Action, index: number) => {
    const ns = [...actions];
    ns.splice(index, 0, action);
    saveHook(ns);
  };
  const finalizeUpdate = (action: Action, index: number) => {
    const ns = [...actions];
    ns[index] = action;
    saveHook(ns);
  };

  // Drag & drop
  const onDragEnd = (res: DropResult) => {
    const { source, destination, draggableId } = res;
    if (!destination) return;
    const type = draggableId as Action['type'];

    // from palette → hook
    if (source.droppableId === 'palette' && destination.droppableId === 'hook') {
      // same logic as TestCaseBuilder: click/fill open locatorSearch, goto/url, wait/ms, then call finalizeInsert
      if (type === 'click' || type === 'fill') {
        setLocPicker({
          open: true,
          actionType: type,
          stepIndex: destination.index,
          isEdit: false,
        });
        return;
      }
      if (type === 'goto') {
        setDialog({
          open: true,
          title: 'Navigate to URL',
          label: 'Enter URL:',
          defaultValue: '',
          onSubmit: url => {
            setDialog((d: any) => ({ ...d, open: false }));
            if (url) finalizeInsert({ type, url } as Action, destination.index);
          },
        });
        return;
      }
      if (type === 'wait') {
        setDialog({
          open: true,
          title: 'Wait Timeout',
          label: 'Enter ms:',
          defaultValue: '1000',
          onSubmit: ms => {
            setDialog((d: any) => ({ ...d, open: false }));
            const t = parseInt(ms, 10);
            if (!isNaN(t)) finalizeInsert({ type, timeout: t } as Action, destination.index);
          },
        });
        return;
      }
    }

    // reorder
    if (source.droppableId === 'hook' && destination.droppableId === 'hook') {
      const ns = [...actions];
      const [moved] = ns.splice(source.index, 1);
      ns.splice(destination.index, 0, moved);
      saveHook(ns);
    }
  };

  // Handle selecting existing locator
  const handleLocatorSelect = (locatorKey: string) => {
    let css = locatorKey;
    for (const pg of meta.pages as PageObject[]) {
      if (pg.selectors[locatorKey] !== undefined) {
        css = pg.selectors[locatorKey];
        break;
      }
    }
    const { actionType, stepIndex, isEdit } = locPicker;
    if (actionType === 'fill') {
      setDialog({
        open: true,
        title: 'Enter Fill Value',
        label: `Value for "${locatorKey}":`,
        defaultValue: '',
        onSubmit: (value: string) => {
          setDialog((d: any) => ({ ...d, open: false }));
          const action: any = { type: 'fill', selector: css, value, locatorKey };
          isEdit
            ? finalizeUpdate(action, stepIndex)
            : finalizeInsert(action, stepIndex);
          setLocPicker((l: any) => ({ ...l, open: false }));
        },
      });
    } else {
      const action: any = { type: 'click', selector: css, locatorKey };
      isEdit
        ? finalizeUpdate(action, stepIndex)
        : finalizeInsert(action, stepIndex);
      setLocPicker((l: any) => ({ ...l, open: false }));
    }
  };

  // Handle adding a brand-new locator
  const handleLocatorAdd = () => {
    const { actionType, stepIndex, isEdit } = locPicker;
    setLocPicker((l: any) => ({ ...l, open: false }));
    setDialog({
      open: true,
      title: 'New Locator CSS',
      label: 'Enter CSS selector:',
      defaultValue: '',
      onSubmit: (css: string) => {
        setDialog((d: any) => ({ ...d, open: false }));
        if (!css) return;
        if (actionType === 'fill') {
          setDialog({
            open: true,
            title: 'Enter Fill Value',
            label: `Value for "${css}":`,
            defaultValue: '',
            onSubmit: (value: string) => {
              setDialog((d: any) => ({ ...d, open: false }));
              const action: any = { type: 'fill', selector: css, value, locatorKey: css };
              isEdit
                ? finalizeUpdate(action, stepIndex)
                : finalizeInsert(action, stepIndex);
            },
          });
        } else {
          const action: any = { type: 'click', selector: css, locatorKey: css };
          isEdit
            ? finalizeUpdate(action, stepIndex)
            : finalizeInsert(action, stepIndex);
        }
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
              {actions.map((act, i) => (
                <Draggable
                  key={`${hookName}-${act.type}-${i}`}
                  draggableId={`${hookName}-${act.type}-${i}`}
                  index={i}
                >
                  {prov => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="flex items-center justify-between p-2 mb-2 bg-white shadow cursor-move"
                    >
                      <span>
                        {act.type === 'goto' && `Goto: ${(act as any).url}`}
                        {act.type === 'click' &&
                          `Click [${(act as any).locatorKey}] (${(act as any).selector})`}
                        {act.type === 'fill' &&
                          `Fill [${(act as any).locatorKey}] (${(act as any).selector}) = ${(act as any).value}`}
                        {act.type === 'wait' &&
                          `Wait ${(act as any).timeout}ms`}
                      </span>
                      <button
                        onClick={() => {
                          const ns = [...actions];
                          ns.splice(i, 1);
                          saveHook(ns);
                        }}
                        className="text-red-500"
                      >
                        <TrashIcon className="h-5 w-5" />
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

      {locPicker.open && (
        <LocatorSearch
          pages={meta.pages}
          onSelect={handleLocatorSelect}
          onAddNew={handleLocatorAdd}
          onClose={() => setLocPicker((l: any) => ({ ...l, open: false }))}
        />
      )}
      <InputDialog
        open={dialog.open}
        title={dialog.title}
        label={dialog.label}
        defaultValue={dialog.defaultValue}
        onSubmit={dialog.onSubmit}
        onCancel={() => setDialog((d: any) => ({ ...d, open: false }))}
      />
    </div>
  );
}
