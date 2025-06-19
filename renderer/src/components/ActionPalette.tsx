// renderer/src/components/ActionPalette.tsx
import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import {
  PlayIcon,
  CursorArrowRippleIcon,
  PencilIcon,
  ClockIcon,
  BoltIcon,
  ArrowDownOnSquareIcon,
  DocumentTextIcon,
  CameraIcon,
  CursorArrowRaysIcon,
  CheckIcon,
  CheckBadgeIcon,
  ArrowUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const ACTIONS = [
  { id: 'goto', label: 'Goto URL', icon: PlayIcon },
  { id: 'fill', label: 'Fill Field', icon: PencilIcon },
  { id: 'click', label: 'Click', icon: CursorArrowRippleIcon },
  { id: 'wait', label: 'Wait', icon: ClockIcon },
  { id: 'dblclick', label: 'Double Click', icon: CursorArrowRippleIcon },
  { id: 'hover', label: 'Hover', icon: CursorArrowRaysIcon },
  { id: 'press', label: 'Press Key', icon: BoltIcon },
  { id: 'check', label: 'Check', icon: CheckIcon },
  { id: 'uncheck', label: 'Uncheck', icon: CheckBadgeIcon },
  { id: 'selectOption', label: 'Select Option', icon: ArrowUpIcon },
  { id: 'setInputFiles', label: 'Set Files', icon: PlusIcon },
  { id: 'screenshot', label: 'Screenshot', icon: CameraIcon },
];

export default function ActionPalette() {
  const [expanded, setExpanded] = useState(false);
  const displayList = expanded ? ACTIONS : ACTIONS.slice(0, 10);

  return (
    <div>
      <Droppable droppableId="palette" isDropDisabled direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-wrap gap-4 mb-2"
          >
            {displayList.map((act, idx) => {
              const Icon = act.icon;
              return (
                <Draggable key={act.id} draggableId={act.id} index={idx}>
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="flex items-center space-x-1 p-2 bg-gray-100 rounded shadow cursor-grab"
                    >
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span className="text-sm">{act.label}</span>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {ACTIONS.length > 10 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-sm text-blue-600 hover:underline"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}