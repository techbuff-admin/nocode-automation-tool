// renderer/src/components/ActionPalette.tsx
import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { PlayIcon, CursorArrowRippleIcon, PencilIcon, ClockIcon } from '@heroicons/react/24/outline';

const ACTIONS = [
  { id: 'goto',  label: 'Goto URL',   icon: PlayIcon },
  { id: 'fill',  label: 'Fill Field', icon: PencilIcon },
  { id: 'click', label: 'Click',      icon: CursorArrowRippleIcon },
  { id: 'wait',  label: 'Wait',       icon: ClockIcon },
];

export default function ActionPalette() {
  return (
    <Droppable droppableId="palette" isDropDisabled={true} direction="horizontal">
      {(provided) => (
        <div
          ref={provided.innerRef}
          className="flex space-x-4 mb-4 overflow-auto pb-2"
          {...provided.droppableProps}
        >
          {ACTIONS.map((act, idx) => {
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
  );
}
