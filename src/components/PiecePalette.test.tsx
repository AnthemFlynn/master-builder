import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PiecePalette from './PiecePalette';

describe('PiecePalette', () => {
  const mockMaterials = [
    { name: 'Oak Wood', color: 0x8B4513, icon: '🪵', tier: 1 },
    { name: 'Brick', color: 0xB22222, icon: '🧱', tier: 1 },
    { name: 'White Marble', color: 0xF0F0F0, icon: '🏛️', tier: 2 },
  ];

  const mockBlockTypes = [
    { name: 'Block', type: 'cube', size: [1, 1, 1], icon: '⬜' },
    { name: 'Slab', type: 'slab', size: [1, 0.5, 1], icon: '▬' },
  ];

  it('should render materials palette', () => {
    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={() => {}}
      />
    );

    expect(screen.getByText('🪵')).toBeInTheDocument();
    expect(screen.getByText('🧱')).toBeInTheDocument();
  });

  it('should render block types palette', () => {
    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={() => {}}
      />
    );

    expect(screen.getByText('⬜')).toBeInTheDocument();
    expect(screen.getByText('▬')).toBeInTheDocument();
  });

  it('should call onMaterialSelect when material is clicked', () => {
    const handleMaterialSelect = vi.fn();

    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={handleMaterialSelect}
        onTypeSelect={() => {}}
      />
    );

    const brickButton = screen.getByTitle('Brick');
    fireEvent.click(brickButton);

    expect(handleMaterialSelect).toHaveBeenCalledWith(1);
  });

  it('should call onTypeSelect when block type is clicked', () => {
    const handleTypeSelect = vi.fn();

    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={handleTypeSelect}
      />
    );

    const slabButton = screen.getByTitle('Slab');
    fireEvent.click(slabButton);

    expect(handleTypeSelect).toHaveBeenCalledWith(1);
  });

  it('should highlight selected material', () => {
    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={1}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={() => {}}
      />
    );

    const brickButton = screen.getByTitle('Brick');
    expect(brickButton.className).toContain('border-yellow-400');
  });

  it('should highlight selected block type', () => {
    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={1}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={() => {}}
      />
    );

    const slabButton = screen.getByTitle('Slab');
    expect(slabButton.className).toContain('border-yellow-400');
  });

  it('should disable locked materials', () => {
    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={() => {}}
      />
    );

    const marbleButton = screen.getByTitle('White Marble 🔒');
    expect(marbleButton.className).toContain('cursor-not-allowed');
    expect(marbleButton.className).toContain('opacity-30');
  });

  it('should not call onMaterialSelect for locked materials', () => {
    const handleMaterialSelect = vi.fn();

    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={handleMaterialSelect}
        onTypeSelect={() => {}}
      />
    );

    const marbleButton = screen.getByTitle('White Marble 🔒');
    fireEvent.click(marbleButton);

    expect(handleMaterialSelect).not.toHaveBeenCalled();
  });

  it('should display material color as background', () => {
    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={() => {}}
      />
    );

    const brickButton = screen.getByTitle('Brick');
    expect(brickButton.style.backgroundColor).toBe('rgb(178, 34, 34)');
  });

  it('should show lock icon for locked materials', () => {
    render(
      <PiecePalette
        materials={mockMaterials}
        blockTypes={mockBlockTypes}
        selectedMaterialIndex={0}
        selectedTypeIndex={0}
        unlockedTiers={[1]}
        onMaterialSelect={() => {}}
        onTypeSelect={() => {}}
      />
    );

    const marbleButton = screen.getByTitle('White Marble 🔒');
    expect(marbleButton).toHaveTextContent('🔒');
  });
});
