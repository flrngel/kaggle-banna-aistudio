
import React, { useRef, FC, ReactNode } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';

const ItemTypes = {
  LAYER: 'layer',
};

interface LayerItemProps {
  id: string;
  index: number;
  moveLayer: (dragIndex: number, hoverIndex: number) => void;
  children: ReactNode;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const LayerItem: FC<LayerItemProps> = ({ id, index, moveLayer, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop<DragItem, void, unknown>({
    accept: ItemTypes.LAYER,
    hover(item, monitor) {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      moveLayer(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.LAYER,
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity }}>
      {children}
    </div>
  );
};

export default LayerItem;
