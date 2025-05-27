// src/heroicons.d.ts
declare module '@heroicons/react/outline' {
    import { ComponentType, SVGProps } from 'react';
    // You can list only the icons you actually use, or use `export *`
    export const PlusCircleIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const PencilIcon:    ComponentType<SVGProps<SVGSVGElement>>;
    export const TrashIcon:     ComponentType<SVGProps<SVGSVGElement>>;
    // …and so on for any other icons you import…
  }
  