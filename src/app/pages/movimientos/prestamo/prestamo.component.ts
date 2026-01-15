import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  CboUsuarioComponent,
  UsuarioOption,
} from '../../../shared/components/Cbo/cbo-usuario/cbo-usuario.component';
import {
  CboHerramientasComponent,
  HerramientaOption,
} from '../../../shared/components/Cbo/cbo-herramientas/cbo-herramientas.component';
import {
  CboObraComponent,
  ObraOption,
} from '../../../shared/components/Cbo/cbo-obra/cbo-obra.component';
import {
  MovimientoService,
  CreateMovimientoDto,
} from '../../../services/movimiento.service';
import { AuthService } from '../../../services/auth.service';
import { PageTitleService } from '../../../services/page-title.service';
import { AlertaService } from '../../../services/alerta.service';
import { CboClienteComponent } from '../../../shared/components/Cbo/cbo-cliente/cbo-cliente.component';

@Component({
  selector: 'app-prestamo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CboHerramientasComponent,
    CboUsuarioComponent,
    CboObraComponent,
    CboClienteComponent,
  ],
  templateUrl: './prestamo.component.html',
  styleUrls: [
    '../../../../styles/visor-style.css',
    '../../../../styles/movimientos-style.css',
    './prestamo.component.css',
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class PrestamoComponent implements OnInit {
  prestamoForm!: FormGroup;
  selectedHerramientas: HerramientaOption[] = [];
  selectedUsuarioInfo: UsuarioOption | null = null;
  selectedObraInfo: ObraOption | null = null;
  currentHerramientaSelection: HerramientaOption | null = null;

  isLoading = false;
  isLoadingMovimiento = false;

  // Campos requeridos para calcular el progreso
  private requiredFields = [
    'responsableId',
    'fechaEstimadaDevolucion',
    'obraId',
  ];

  // Placeholder original para observaciones
  private originalPlaceholder: string =
    'Agregue cualquier detalle adicional sobre el préstamo...';

  // Opciones para estado físico (ejemplo; no usado en préstamo pero para consistencia)
  estadoFisicoOptions = [
    { id: 1, nombre: 'Excelente' },
    { id: 2, nombre: 'Bueno' },
    { id: 3, nombre: 'Regular' },
    { id: 4, nombre: 'Malo' },
  ];

  constructor(
    private fb: FormBuilder,
    private movimientoService: MovimientoService,
    private authService: AuthService,
    private pageTitleService: PageTitleService,
    private alertService: AlertaService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle('Registrar Préstamo');
    this.buildForm();
    this.setupFormListeners();
    this.setInitialPlaceholder();
  }

  private buildForm(): void {
    this.prestamoForm = this.fb.group({
      herramientaId: [''], // Solo para selección temporal
      responsableId: ['', Validators.required],
      fechaEstimadaDevolucion: ['', Validators.required],
      obraId: ['', Validators.required],
      clienteId: [null], // nuevo control para el combo cliente
      observaciones: ['', Validators.maxLength(500)],
    });
  }

  private setupFormListeners(): void {
    // Escuchar cambios en el formulario para actualizar el progreso en tiempo real
    this.prestamoForm.valueChanges.subscribe(() => {
      // Podrías agregar lógica adicional aquí si es necesario
    });
  }

  private setInitialPlaceholder(): void {
    setTimeout(() => {
      const textarea = document.querySelector(
        'textarea[formControlName="observaciones"]'
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.placeholder = this.originalPlaceholder;
      }
    });
  }

  public getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Calcula el porcentaje de completitud del formulario
   */
  getFormCompletionPercentage(): number {
    let filledFields = 0;
    let totalFields = this.requiredFields.length + 1; // +1 for herramientas array

    // Check herramientas
    if (this.selectedHerramientas.length > 0) {
      filledFields++;
    }

    this.requiredFields.forEach((field) => {
      const control = this.prestamoForm.get(field);
      if (control && control.value && control.valid) {
        filledFields++;
      }
    });

    return Math.round((filledFields / totalFields) * 100);
  }

  onHerramientaSelected(herramienta: HerramientaOption | null): void {
    this.currentHerramientaSelection = herramienta;
  }

  addHerramienta(): void {
    if (!this.currentHerramientaSelection) {
      this.alertService.error(
        'Debe seleccionar una herramienta primero',
        'Selección requerida'
      );
      return;
    }

    // Verificar si la herramienta ya está en la lista
    const exists = this.selectedHerramientas.some(
      (h) => h.id === this.currentHerramientaSelection!.id
    );
    if (exists) {
      this.alertService.error(
        'Esta herramienta ya está en la lista',
        'Herramienta duplicada'
      );
      return;
    }

    // Agregar herramienta a la lista
    this.selectedHerramientas.push(this.currentHerramientaSelection);

    // Limpiar selección temporal
    this.prestamoForm.get('herramientaId')?.setValue('');
    this.currentHerramientaSelection = null;
  }

  removeHerramienta(index: number): void {
    this.selectedHerramientas.splice(index, 1);
  }

  isFormValid(): boolean {
    return this.prestamoForm.valid && this.selectedHerramientas.length > 0;
  }

  onSubmit(): void {
    // Validar herramientas seleccionadas
    if (this.selectedHerramientas.length === 0) {
      this.alertService.error(
        'Debe seleccionar al menos una herramienta',
        'Herramientas requeridas'
      );
      return;
    }

    // Marcar todos los campos como tocados para mostrar errores
    if (this.prestamoForm.invalid) {
      this.prestamoForm.markAllAsTouched();
      this.scrollToFirstError();
      return;
    }

    // Crear mensaje de confirmación con los datos esenciales del préstamo
    const herramientasText = this.selectedHerramientas
      .map((h) => h.nombre)
      .join(', ');
    const confirmMessage = `¿Confirmar registro de préstamo?<br><br>Herramientas (${this.selectedHerramientas.length}): ${herramientasText}<br>Responsable: ${this.selectedUsuarioInfo?.nombre} ${this.selectedUsuarioInfo?.apellido}`;

    this.alertService
      .confirm(confirmMessage, 'Confirmar Préstamo')
      .then((result) => {
        if (result.isConfirmed) {
          this.registrarPrestamo();
        }
      });
  }

  private registrarPrestamo(): void {
    this.isLoading = true;

    const formData = this.prestamoForm.value;
    const currentUserId = this.authService.getUserId();

    if (!currentUserId) {
      this.isLoading = false;
      this.alertService.error(
        'No se pudo obtener la información del usuario. Por favor, inicie sesión nuevamente.',
        'Error de Autenticación'
      );
      return;
    }

    const prestamos = this.selectedHerramientas.map((herramienta) => ({
      idHerramienta: herramienta.id,
      idUsuarioResponsable: formData.responsableId,
      idUsuarioGenera: currentUserId,
      idTipoMovimiento: 1,
      fechaMovimiento: this.getLocalIsoNow(),
      fechaEstimadaDevolucion: formData.fechaEstimadaDevolucion,
      estadoHerramientaAlDevolver: formData.estadoFisicoHerramientaId,
      idObra: formData.obraId,
      idProveedor: formData.proveedorId || null,
      observaciones: formData.observaciones || undefined,
    }));

    this.movimientoService.registrarMultiplesPrestamos(prestamos).subscribe({
      next: (responses: any[]) => {
        this.isLoading = false;
        const herramientasText = this.selectedHerramientas
          .map((h) => h.codigo)
          .join(', ');
        this.alertService.success(
          `Los préstamos de las herramientas ${herramientasText} han sido registrados exitosamente.`,
          '✓ Préstamos Registrados'
        );
        this.resetForm();
      },
      error: (error) => {
        this.isLoading = false;
        this.alertService.error(
          error?.error?.message ||
            'Ha ocurrido un error inesperado. Por favor, intente nuevamente.',
          '✗ Error al Registrar'
        );
        console.error('Error al crear préstamos:', error);
      },
    });
  }

  // Helper: devuelve la fecha/hora local en formato ISO con offset (YYYY-MM-DDTHH:mm:ss.SSS±HH:MM)
  private getLocalIsoNow(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');

    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    // getTimezoneOffset: minutes to add to local time to get UTC
    // tzOffset = -getTimezoneOffset -> minutes offset from UTC to local
    const tzMinutes = -d.getTimezoneOffset();
    const tzSign = tzMinutes >= 0 ? '+' : '-';
    const tzAbs = Math.abs(tzMinutes);
    const tzH = pad(Math.floor(tzAbs / 60));
    const tzM = pad(tzAbs % 60);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${tzSign}${tzH}:${tzM}`;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Hace scroll al primer campo con error
   */
  private scrollToFirstError(): void {
    const firstError = document.querySelector('.is-invalid, .has-error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  resetForm(): void {
    this.prestamoForm.reset();
    this.selectedHerramientas = [];
    this.currentHerramientaSelection = null;
    this.selectedUsuarioInfo = null;
    this.selectedObraInfo = null;
  }

  // Métodos para manejar el placeholder del textarea
  onTextareaFocus(): void {
    const textarea = document.querySelector(
      'textarea[formControlName="observaciones"]'
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.placeholder = '';
    }
  }

  onTextareaBlur(): void {
    const control = this.prestamoForm.get('observaciones');
    if (!control?.value) {
      const textarea = document.querySelector(
        'textarea[formControlName="observaciones"]'
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.placeholder = this.originalPlaceholder;
      }
    }
  }

  getDaysOverdue(): number {
    // Para préstamo, no aplica overdue ya que es futuro
    return 0;
  }

  isOverdue(): boolean {
    // Para préstamo, no aplica overdue
    return false;
  }

  onUsuarioSelected(usuario: UsuarioOption | null): void {
    this.selectedUsuarioInfo = usuario;

    if (usuario) {
      console.log('Usuario seleccionado:', usuario);
    }
  }

  onObraSelected(obra: ObraOption | null): void {
    this.selectedObraInfo = obra;

    if (obra) {
      console.log('Obra seleccionada:', obra);
    }
  }

  // Handler llamado desde <app-cbo-cliente (clienteSelected)="onClienteSelected($event)">
  onClienteSelected(event: any): void {
    try {
      if (this.prestamoForm) {
        const id = event?.idCliente ?? null;
        this.prestamoForm.patchValue(
          {
            clienteId: id,
            obraId: null, // Limpiar obra cuando cambia el cliente
          },
          { emitEvent: false }
        );
        // Limpiar información de obra seleccionada
        this.selectedObraInfo = null;
      }
    } catch (e) {
      console.warn('[Prestamo] onClienteSelected error', e);
    }
  }
}
