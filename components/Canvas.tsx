import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import ObjectLayer from './ObjectLayer';
import type { ObjectLayerType, BaseStateType } from '../types';
// Fix: Import Konva to resolve 'Konva' namespace not found errors.
import Konva from 'konva';

interface BaseImageProps {
    src: string;
    x: number;
    y: number;
    scale?: number;
    rotation?: number;
    draggable: boolean;
    onChange?: (attrs: Partial<BaseStateType>) => void;
    onSelect: () => void;
    isSelected: boolean;
}

const BaseImage: React.FC<BaseImageProps> = ({ src, x, y, scale = 1, rotation = 0, draggable, onChange, onSelect, isSelected }) => {
  const [image] = useImage(src);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        id="base-image"
        name="base-image"
        image={image}
        ref={shapeRef}
        x={x}
        y={y}
        scaleX={scale}
        scaleY={scale}
        rotation={rotation}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onChange?.({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const newScale = node.scaleX();
          onChange?.({ x: node.x(), y: node.y(), scale: newScale, rotation: node.rotation() });
        }}
      />
      {isSelected && <Transformer ref={trRef} rotateEnabled={true} keepRatio={true} />}
    </>
  );
};

interface CanvasProps {
    baseImage: string | null;
    baseState: BaseStateType;
    onBaseChange: (attrs: Partial<BaseStateType>) => void;
    objectLayers: ObjectLayerType[];
    onObjectChange: (id: string, attrs: Partial<ObjectLayerType>) => void;
    stageRef: React.RefObject<Konva.Stage>;
}

const Canvas: React.FC<CanvasProps> = ({ baseImage, objectLayers, stageRef, baseState, onBaseChange, onObjectChange }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 512, height: 512 });
  const [baseImageEl] = useImage(baseImage || '');

  useEffect(() => {
    if (baseImageEl && baseImageEl.width && baseImageEl.height) {
        const MAX_DIM = 768;
        const ratio = baseImageEl.width / baseImageEl.height;
        let width = baseImageEl.width;
        let height = baseImageEl.height;
        if (width > MAX_DIM || height > MAX_DIM) {
            if (ratio > 1) { // wider
                width = MAX_DIM;
                height = MAX_DIM / ratio;
            } else { // taller
                height = MAX_DIM;
                width = MAX_DIM * ratio;
            }
        }
      setStageSize({ width, height });
    }
  }, [baseImageEl]);

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  return (
    <Stage
      width={stageSize.width}
      height={stageSize.height}
      ref={stageRef}
      onMouseDown={checkDeselect}
      onTouchStart={checkDeselect}
    >
      <Layer>
        {baseImage && (
          <BaseImage
            src={baseImage}
            {...baseState}
            draggable
            onChange={onBaseChange}
            onSelect={() => setSelectedId('base-image')}
            isSelected={selectedId === 'base-image'}
          />
        )}
        {objectLayers.map((layer) => (
          <ObjectLayer
            key={layer.id}
            {...layer}
            isSelected={layer.id === selectedId}
            onSelect={() => setSelectedId(layer.id)}
            onChange={(attrs) => onObjectChange(layer.id, attrs)}
            stageSize={stageSize}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default Canvas;