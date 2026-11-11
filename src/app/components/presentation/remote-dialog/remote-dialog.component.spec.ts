import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { FakeMatIconRegistry } from '@angular/material/icon/testing';
import { RemoteDialogComponent } from './remote-dialog.component';

describe('RemoteDialogComponent', () => {
  let fixture: ComponentFixture<RemoteDialogComponent>;
  const devices = signal(0);
  const away = signal(false);
  const host = {
    roomId: signal<string | null>('abc'),
    devices: computed(() => devices()),
    deviceAway: computed(() => away()),
    roomFailed: signal(false),
    openRoom: vi.fn(),
    closeRoom: vi.fn(),
    newCode: vi.fn(),
  };

  const element = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    devices.set(0);
    away.set(false);
    TestBed.configureTestingModule({
      imports: [RemoteDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: host },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MatIconRegistry, useClass: FakeMatIconRegistry },
      ],
    });
    fixture = TestBed.createComponent(RemoteDialogComponent);
    await fixture.whenStable();
  });

  it('should give the link for a device without a camera and copy it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const input = element().querySelector('input') as HTMLInputElement;

    expect(element().querySelector('svg.qr')).not.toBeNull();
    expect(input.value).toMatch(/\/remote\/abc$/);
    expect(element().querySelector('[role=status]')?.textContent).toContain('Падключаных прылад няма');

    (element().querySelector('.link button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(input.value);
    expect(element().querySelector('.link button')?.textContent).toContain('Скапіявана');
  });

  it('should hide the code once a device controls the presentation', async () => {
    devices.set(1);
    await fixture.whenStable();

    expect(element().querySelector('svg.qr')).toBeNull();
    expect(element().querySelector('input')).toBeNull();
    expect(element().querySelector('[role=status]')?.textContent).toContain('Падключана 1 прылада');

    const disconnect = Array.from(element().querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Адключыць'),
    );
    disconnect?.click();
    expect(host.closeRoom).toHaveBeenCalled();
  });

  it('should wait for a device that lost its connection and offer a new code for another one', async () => {
    away.set(true);
    await fixture.whenStable();

    expect(element().querySelector('svg.qr')).toBeNull();
    expect(element().querySelector('[role=status]')?.textContent).toContain('Прылада не на сувязі');

    const newCode = Array.from(element().querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Новы код'),
    );
    newCode?.click();
    expect(host.newCode).toHaveBeenCalled();
  });
});
