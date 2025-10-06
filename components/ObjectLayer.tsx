
import React, { useEffect, useRef } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';

interface ObjectLayerProps {
  id: string;
  image: string;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  onSelect: () => void;
  isSelected: boolean;
  visible: boolean;
  onChange: (attrs: { x: number; y: number; scale: number; rotation: number }) => void;
  stageSize: { width: number, height: number };
}

const ObjectLayerComponent: React.FC<ObjectLayerProps> = ({
  id,
  image,
  x = 0,
  y = 0,
  scale = 1,
  rotation = 0,
  onSelect,
  isSelected,
  visible,
  onChange,
  stageSize
}) => {
  const [img] = useImage(image);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const didInitRef = useRef(false);

  // One-time auto-scale and center
  useEffect(() => {
    if (didInitRef.current || !img || scale !== 1) return;

    const targetWidth = Math.max(128, Math.min(512, Math.floor(stageSize.width * 0.25)));
    const newScale = Math.min(1, targetWidth / img.naturalWidth);
    const newWidth = img.naturalWidth * newScale;
    const newHeight = img.naturalHeight * newScale;
    const newX = Math.round((stageSize.width - newWidth) / 2);
    const newY = Math.round((stageSize.height - newHeight) / 2);

    onChange({ scale: newScale, x: newX, y: newY, rotation });
    didInitRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, stageSize, scale, onChange, rotation]);


  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        id={`obj-${id}`}
        name={`obj-${id}`}
        image={img}
        x={x}
        y={y}
        scaleX={scale}
        scaleY={scale}
        rotation={rotation}
        ref={shapeRef}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        visible={visible}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y(), scale, rotation });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const newScale = node.scaleX();
          onChange({ x: node.x(), y: node.y(), scale: newScale, rotation: node.rotation() });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          rotateEnabled={true}
          keepRatio={true}
        />
      )}
    </>
  );
};

export default ObjectLayerComponent;
