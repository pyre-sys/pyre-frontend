import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-historial',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './modal-historial.component.html',
  styleUrls: ['./modal-historial.component.css']
})
export class ModalHistorialComponent {
  @Input() data: any | null = null;
  @Output() close = new EventEmitter<void>();

  visible = true;

  constructor(private elementRef: ElementRef) { }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.onClose();
  }

  onClose(): void {
    this.visible = false;
    this.close.emit();
  }
}

