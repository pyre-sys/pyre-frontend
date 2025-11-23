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
  selector: 'app-modal-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-modal.component.html',
  styleUrls: ['./toast-modal.component.css'],
})
export class ToastModalComponent implements OnInit, OnDestroy {
  @Input() message: string = '';
  @Input() isVisible: boolean = false;
  @Input() type: string = 'success';

  private appendedToBody = false;

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
  }

  ngOnDestroy(): void {
    // Remover del body al destruir para no dejar nodos huérfanos
    if (this.appendedToBody && this.document?.body && this.el?.nativeElement) {
      try {
        this.renderer.removeChild(this.document.body, this.el.nativeElement);
      } catch {
        // noop
      }
      this.appendedToBody = false;
    }
  }
}
