import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { CboHerramientasComponent, HerramientaOption } from '../../../shared/components/Cbo/cbo-herramientas/cbo-herramientas.component';
import { MovimientoService, CreateMovimientoDto } from '../../../services/movimiento.service';
import { AuthService } from '../../../services/auth.service';
import { PageTitleService } from '../../../services/page-title.service';
import { AlertaService } from '../../../services/alerta.service';
import { CboProveedorComponent } from "../../../shared/components/Cbo/cbo-proveedor/cbo-proveedor.component";


@Component({
  selector: 'app-reparacion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CboHerramientasComponent,
    CboProveedorComponent
  ],
  templateUrl: './reparacion.component.html',
  styleUrls: ['../../../../styles/visor-style.css', '../../../../styles/movimientos-style.css', './reparacion.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ReparacionComponent implements OnInit {
  reparacionForm!: FormGroup;
  selectedHerramientas: HerramientaOption[] = [];
  selectedProveedorInfo: any | null = null;
  currentHerramientaSelection: HerramientaOption | null = null;

  isLoading = false;
  isLoadingMovimiento = false;

  // Campos requeridos para calcular el progreso
  private requiredFields = ['proveedorId', 'fechaEstimadaFinalizacion'];

  // Placeholder original para observaciones
  private originalPlaceholder: string = 'Agregue cualquier detalle adicional sobre la reparación... (Opcional)';

  // Opciones para estado físico (ejemplo; no usado en reparación pero para consistencia)
  estadoFisicoOptions = [
    { id: 1, nombre: 'Excelente' },
    { id: 2, nombre: 'Bueno' },
    { id: 3, nombre: 'Regular' },
    { id: 4, nombre: 'Malo' }
  ];

  constructor(
    private fb: FormBuilder,
    private movimientoService: MovimientoService,
    private authService: AuthService,
    private pageTitleService: PageTitleService,
    private alertService: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Registrar Reparación');
    this.buildForm();
    this.setupFormListeners();
    this.setInitialPlaceholder();
  }

  private buildForm(): void {
    this.reparacionForm = this.fb.group({
      herramientaId: [''], // Solo para selección temporal
      proveedorId: ['', Validators.required],
      fechaEstimadaFinalizacion: ['', [Validators.required]],
      observaciones: ['', Validators.maxLength(500)]
    });
  }

  private setupFormListeners(): void {
    // Escuchar cambios en el formulario para actualizar el progreso en tiempo real
    this.reparacionForm.valueChanges.subscribe(() => {
      // Podrías agregar lógica adicional aquí si es necesario
    });
  }

  private setInitialPlaceholder(): void {
    setTimeout(() => {
      const textarea = document.querySelector('textarea[formControlName="observaciones"]') as HTMLTextAreaElement;
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

    this.requiredFields.forEach(field => {
      const control = this.reparacionForm.get(field);
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
      this.alertService.error('Debe seleccionar una herramienta primero', 'Selección requerida');
      return;
    }

    // Verificar si la herramienta ya está en la lista
    const exists = this.selectedHerramientas.some(h => h.id === this.currentHerramientaSelection!.id);
    if (exists) {
      this.alertService.error('Esta herramienta ya está en la lista', 'Herramienta duplicada');
      return;
    }

    // Agregar herramienta a la lista
    this.selectedHerramientas.push(this.currentHerramientaSelection);

    // Limpiar selección temporal
    this.reparacionForm.get('herramientaId')?.setValue('');
    this.currentHerramientaSelection = null;
  }

  removeHerramienta(index: number): void {
    this.selectedHerramientas.splice(index, 1);
  }

  isFormValid(): boolean {
    return this.reparacionForm.valid && this.selectedHerramientas.length > 0;
  }

  onProveedorSelected(proveedor: any | null): void {
    this.selectedProveedorInfo = proveedor;

    if (proveedor) {
      console.log('Proveedor seleccionado:', proveedor);
    }
  }

  onSubmit(): void {
    // Validar herramientas seleccionadas
    if (this.selectedHerramientas.length === 0) {
      this.alertService.error('Debe seleccionar al menos una herramienta', 'Herramientas requeridas');
      return;
    }

    // Marcar todos los campos como tocados para mostrar errores
    if (this.reparacionForm.invalid) {
      this.reparacionForm.markAllAsTouched();
      this.scrollToFirstError();
      return;
    }

    // Crear mensaje de confirmación con los datos esenciales de la reparación
    const herramientasText = this.selectedHerramientas.map(h => h.nombre).join(', ');
    const confirmMessage = `¿Confirmar registro de reparación?<br><br>Herramientas (${this.selectedHerramientas.length}): ${herramientasText}<br>Proveedor: ${this.selectedProveedorInfo?.nombreProveedor}`;

    this.alertService.confirm(confirmMessage, 'Confirmar Reparación').then((result) => {
      if (result.isConfirmed) {
        this.registrarReparacion();
      }
    });
  }

  private registrarReparacion(): void {
    this.isLoading = true;

    const formData = this.reparacionForm.value;
    const currentUserId = this.authService.getUserId();

    if (!currentUserId) {
      this.isLoading = false;
      this.alertService.error('No se pudo obtener la información del usuario. Por favor, inicie sesión nuevamente.', 'Error de Autenticación');
      return;
    }

    // Crear una reparación por cada herramienta seleccionada
    const reparaciones = this.selectedHerramientas.map(herramienta => ({
      idHerramienta: herramienta.id,
      idUsuarioGenera: currentUserId,
      idUsuarioResponsable: null, // Para reparaciones no hay usuario responsable
      idTipoMovimiento: 3, // Reparación
      fechaMovimiento: new Date().toISOString(),
      fechaEstimadaDevolucion: formData.fechaEstimadaFinalizacion,
      estadoHerramientaAlDevolver: null, // Estado inicial
      idObra: null, // No aplica para reparaciones
      idProveedor: formData.proveedorId.idProveedor, // El ID del proveedor seleccionado
      observaciones: formData.observaciones || undefined,
    }));

    // Registrar todas las reparaciones
    this.movimientoService.registrarMultiplesPrestamos(reparaciones).subscribe({
      next: (responses: any[]) => {
        this.isLoading = false;
        const herramientasText = this.selectedHerramientas.map(h => h.codigo).join(', ');
        this.alertService.success(`Las reparaciones de las herramientas ${herramientasText} han sido registradas exitosamente.`, '✓ Reparaciones Registradas');
        this.resetForm();
      },
      error: (error) => {
        this.isLoading = false;
        this.alertService.error(error.error?.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente.', '✗ Error al Registrar');
        console.error('Error al crear reparaciones:', error);
      }
    });
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
    this.reparacionForm.reset();
    this.selectedHerramientas = [];
    this.currentHerramientaSelection = null;
    this.selectedProveedorInfo = null;
  }

  // Métodos para manejar el placeholder del textarea
  onTextareaFocus(): void {
    const textarea = document.querySelector('textarea[formControlName="observaciones"]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.placeholder = '';
    }
  }

  onTextareaBlur(): void {
    const control = this.reparacionForm.get('observaciones');
    if (!control?.value) {
      const textarea = document.querySelector('textarea[formControlName="observaciones"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.placeholder = this.originalPlaceholder;
      }
    }
  }

  getDaysOverdue(): number {
    // Para reparación, no aplica overdue ya que es futuro
    return 0;
  }

  isOverdue(): boolean {
    // Para reparación, no aplica overdue
    return false;
  }
}
