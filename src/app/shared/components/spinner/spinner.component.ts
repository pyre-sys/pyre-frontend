import {
  Component,
  Input,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  Inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.css'],
})
export class SpinnerComponent implements OnInit, OnDestroy {
  // Entrada pública original, convertida a setter para gestionar debounce/tiempo mínimo
  @Input()
  set isLoading(value: boolean) {
    this._isLoadingInput = !!value;
    this.handleLoadingChange();
  }
  get isLoading(): boolean {
    return this._isLoadingInput;
  }
  private _isLoadingInput = false;

  // Estado real que controla la plantilla (overlay visible)
  visible: boolean = false;

  // Nuevo Input: permitir override del tiempo mínimo visible en milisegundos
  // Si se proporciona, se usará en lugar del valor por defecto.
  @Input() minVisibleMs: number | null = null;

  // Ajustes de timing por defecto (puedes afinar: showDelay ms, defaultMinVisible ms)
  private readonly showDelay = 150; // ms: espera antes de mostrar
  private readonly defaultMinVisible = 300; // ms: tiempo mínimo visible por defecto

  private showTimer: any = null;
  private hideTimer: any = null;
  private visibleSince: number | null = null;

  private appendedToBody = false;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // Mover el host del componente al body para garantizar overlay full-screen
    if (this.document?.body && this.el?.nativeElement) {
      this.renderer.appendChild(this.document.body, this.el.nativeElement);
      this.appendedToBody = true;
    }
  }

  ngOnDestroy(): void {
    // Limpiar timers activos
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // Remover del body al destruir para no dejar elementos huérfanos
    if (this.appendedToBody && this.document?.body && this.el?.nativeElement) {
      try {
        this.renderer.removeChild(this.document.body, this.el.nativeElement);
      } catch {
        // noop: en caso de que ya se haya removido
      }
      this.appendedToBody = false;
    }
  }

  private handleLoadingChange(): void {
    if (this._isLoadingInput) {
      // Inicio de carga: cancelar hideTimer si existe
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      // Si ya visible, no hacer nada
      if (this.visible) return;

      // Arrancar timer para mostrar tras showDelay
      if (!this.showTimer) {
        this.showTimer = setTimeout(() => {
          this.showTimer = null;
          this.visible = true;
          this.visibleSince = Date.now();
        }, this.showDelay);
      }
    } else {
      // Fin de carga: cancelar showTimer si aún no se mostró
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      // Si no está visible, nada que ocultar
      if (!this.visible) return;

      // Determinar el tiempo mínimo visible a usar (override si se pasó como Input)
      const minVisible =
        this.minVisibleMs != null ? this.minVisibleMs : this.defaultMinVisible;

      // Calcular tiempo restante para cumplir minVisible
      const elapsed = this.visibleSince ? Date.now() - this.visibleSince : 0;
      const remaining = Math.max(0, minVisible - elapsed);

      // Programar ocultado tras remaining
      if (!this.hideTimer) {
        this.hideTimer = setTimeout(() => {
          this.hideTimer = null;
          this.visible = false;
          this.visibleSince = null;
        }, remaining);
      }
    }
  }
}
