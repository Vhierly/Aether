import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FindCrackModal } from './FindCrackModal';

describe('FindCrackModal', () => {
  const renderModal = () => {
    const callbacks = { onClose: vi.fn(), onSelect: vi.fn() };
    return { ...callbacks, view: render(<FindCrackModal {...callbacks} />) };
  };

  it('offers every crack source including XATAB', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderModal();

    for (const name of ['OFME', 'GCW', 'CSRINRU', 'XATAB']) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }

    await user.click(screen.getByRole('button', { name: 'XATAB' }));

    expect(onSelect).toHaveBeenCalledWith('xatab');
  });

  it('closes on the X button without selecting a source', async () => {
    const user = userEvent.setup();
    const { onClose, onSelect } = renderModal();

    await user.click(screen.getByRole('button', { name: '×' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
