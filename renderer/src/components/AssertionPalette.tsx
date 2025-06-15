// renderer/src/components/AssertionPalette.tsx
import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import {
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  BoltSlashIcon,
  TagIcon,
  CheckBadgeIcon,
  ListBulletIcon,
  LinkIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline';

const ASSERTIONS = [
  { id: 'toBeVisible',     label: 'toBeVisible',     icon: EyeIcon            },
  { id: 'toBeHidden',      label: 'toBeHidden',      icon: EyeSlashIcon       },
  { id: 'toHaveText',      label: 'toHaveText',      icon: DocumentTextIcon   },
  { id: 'toHaveValue',     label: 'toHaveValue',     icon: HashtagIcon        },
  { id: 'toContainText',   label: 'toContainText',   icon: MagnifyingGlassIcon},
  { id: 'toBeEnabled',     label: 'toBeEnabled',     icon: BoltIcon           },
  { id: 'toBeDisabled',    label: 'toBeDisabled',    icon: BoltSlashIcon      },
  { id: 'toHaveAttribute', label: 'toHaveAttribute', icon: TagIcon            },
  { id: 'toHaveClass',     label: 'toHaveClass',     icon: CheckBadgeIcon     },
  { id: 'toHaveCount',     label: 'toHaveCount',     icon: ListBulletIcon     },
  { id: 'toHaveURL',       label: 'toHaveURL',       icon: LinkIcon           },
  { id: 'toHaveTitle',     label: 'toHaveTitle',     icon: ArrowPathRoundedSquareIcon },
  // …add more as needed…
];

export default function AssertionPalette() {
  const [expanded, setExpanded] = useState(false);
  const list = expanded ? ASSERTIONS : ASSERTIONS.slice(0, 10);

  return (
    <div className="mt-4">
      <Droppable
        droppableId="assertions"
        isDropDisabled={true}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-wrap gap-2 mb-2"
          >
            {list.map((assertion, idx) => {
              const Icon = assertion.icon;
              return (
                <Draggable key={assertion.id} draggableId={assertion.id} index={idx}>
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded shadow cursor-grab"
                    >
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span className="text-sm">{assertion.label}</span>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {ASSERTIONS.length > 10 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-sm text-blue-600 hover:underline"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}
