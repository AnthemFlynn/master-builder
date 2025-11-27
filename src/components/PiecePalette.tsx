import React from 'react';

interface Material {
  name: string;
  color: number;
  icon: string;
  tier: number;
  opacity?: number;
  glow?: boolean;
  metalness?: number;
}

interface BlockType {
  name: string;
  type: string;
  size: number[];
  icon: string;
}

interface PiecePaletteProps {
  materials: Material[];
  blockTypes: BlockType[];
  selectedMaterialIndex: number;
  selectedTypeIndex: number;
  unlockedTiers: number[];
  onMaterialSelect: (index: number) => void;
  onTypeSelect: (index: number) => void;
}

const PiecePalette: React.FC<PiecePaletteProps> = ({
  materials,
  blockTypes,
  selectedMaterialIndex,
  selectedTypeIndex,
  unlockedTiers,
  onMaterialSelect,
  onTypeSelect,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center gap-2 pb-3">
      {/* Materials Palette */}
      <div className="bg-black/80 p-2 rounded-lg backdrop-blur-sm">
        <div className="flex gap-1 flex-wrap justify-center max-w-xl">
          {materials.map((material, index) => {
            const locked = !unlockedTiers.includes(material.tier);
            const isSelected = selectedMaterialIndex === index;

            return (
              <button
                key={index}
                onClick={() => !locked && onMaterialSelect(index)}
                title={material.name + (locked ? ' 🔒' : '')}
                className={`w-8 h-8 rounded border-2 flex items-center justify-center relative transition-transform
                  ${isSelected ? 'border-yellow-400 scale-110' : 'border-gray-600'}
                  ${locked ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}
                  ${material.glow ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: `#${material.color.toString(16).padStart(6, '0')}`
                }}
              >
                <span className="text-xs drop-shadow">{material.icon}</span>
                {locked && <span className="absolute text-[8px]">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Block Types Palette */}
      <div className="bg-black/80 p-2 rounded-lg backdrop-blur-sm flex gap-1">
        {blockTypes.map((blockType, index) => {
          const isSelected = selectedTypeIndex === index;

          return (
            <button
              key={index}
              onClick={() => onTypeSelect(index)}
              title={blockType.name}
              className={`w-9 h-9 rounded border-2 flex items-center justify-center bg-gray-700/80 transition-transform
                ${isSelected ? 'border-yellow-400 scale-110' : 'border-gray-600 hover:scale-105'}`}
            >
              <span className="text-lg">{blockType.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PiecePalette;
