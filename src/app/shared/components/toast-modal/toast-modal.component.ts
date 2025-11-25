import {
  Component,
  Input,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  Inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-modal-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-modal.component.html',
  styleUrls: ['./toast-modal.component.css'],
})
export class ToastModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() message: string = '';
  @Input() isVisible: boolean = false;
  @Input() type: string = 'success';

  // Nuevo: elegir preset de animación: 'preset-1' (por defecto), 'preset-2', 'preset-3'
  @Input() animationPreset: 'preset-1' | 'preset-2' | 'preset-3' = 'preset-1';

  private appendedToBody = false;

  // Nuevo: control interno para manejar animaciones antes de remover el elemento
  internalVisible: boolean = false;
  animState: 'enter' | 'idle' | 'exit' = 'idle';

  private animationEndUnlisten: (() => void) | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // Mover el host del toast al <body> para evitar que quede dentro de contenedores transformados
    if (this.document?.body && this.el?.nativeElement) {
      this.renderer.appendChild(this.document.body, this.el.nativeElement);
      this.appendedToBody = true;
    }

    // escuchar animationend para transicionar estados
    this.animationEndUnlisten = this.renderer.listen(
      this.el.nativeElement,
      'animationend',
      (event: AnimationEvent) => {
        // solo reaccionar cuando la animación afecte el elemento .toast interno
        const target = event.target as HTMLElement;
        if (!target) return;
        if (!target.classList.contains('toast')) return;

        if (this.animState === 'enter') {
          // entrada completada -> estado idle (animación sutil de flotación)
          this.animState = 'idle';
        } else if (this.animState === 'exit') {
          // salida completada -> ocultar elemento
          this.internalVisible = false;
          this.animState = 'idle';
        }
      }
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('isVisible' in changes) {
      const next = changes['isVisible'].currentValue;
      if (next) {
        // mostrar y reproducir animación de entrada
        this.internalVisible = true;
        // forzar reflow para reiniciar animación cuando se reaparezca rápidamente
        void this.el.nativeElement.offsetWidth;
        this.animState = 'enter';
      } else {
        // si está visible, arrancar animación de salida; si no, asegurar internalVisible false.
        if (this.internalVisible) {
          this.animState = 'exit';
        } else {
          this.internalVisible = false;
          this.animState = 'idle';
        }
      }
    }
  }

  ngOnDestroy(): void {
    // Remover listener animationend
    if (this.animationEndUnlisten) {
      this.animationEndUnlisten();
      this.animationEndUnlisten = null;
    }

    // Remover del body al destruir para no dejar nodos huérfanos
    if (this.appendedToBody && this.document?.body && this.el?.nativeElement) {
      try {
        this.renderer.removeChild(this.document.body, this.el?.nativeElement);
      } catch {
        // noop
      }
      this.appendedToBody = false;
    }
  }
}
