import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { CboUsuarioComponent, UsuarioOption } from "../../../shared/components/Cbo/cbo-usuario/cbo-usuario.component";
import { CboProveedorComponent, ProveedorOption } from "../../../shared/components/Cbo/cbo-proveedor/cbo-proveedor.component";
import { HerramientaService } from '../../../services/herramienta.service';
import { MovimientoService, CreateMovimientoDto } from '../../../services/movimiento.service';
import { AuthService } from '../../../services/auth.service';
import { PageTitleService } from '../../../services/page-title.service';
import { AlertaService } from '../../../services/alerta.service';

interface HerramientaDevolucion {
  id: number;
  codigo: string;
  nombre: string;
  marca: string;
  fechaPrestamo: string;
  fechaEstimadaDevolucion: string;
  nombreObra?: string;
  observacionesPrestamo?: string;
  selected: boolean;
  estadoFisicoId: number | null;
  observaciones: string;
}

type TipoOperacion = 'prestamo' | 'reparacion';

@Component({
  selector: 'app-devolucion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CboUsuarioComponent,
    CboProveedorComponent,
  ],
  templateUrl: './devolucion.component.html',
  styleUrls: ['../../../../styles/visor-style.css', '../../../../styles/movimientos-style.css', './devolucion.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DevolucionComponent implements OnInit {

  devolucionForm!: FormGroup;
  selectedUsuarioInfo: UsuarioOption | null = null;
  selectedProveedorInfo: ProveedorOption | null = null;
  herramientasEnPrestamo: HerramientaDevolucion[] = [];
  tipoOperacion: TipoOperacion | null = null;

  isLoading = false;
  isLoadingHerramientas = false;

  // Campos requeridos para calcular el progreso
  private requiredFields = ['responsableId'];

  // Opciones para estado físico
  estadoFisicoOptions = [
    { id: 1, nombre: 'Excelente' },
    { id: 2, nombre: 'Bueno' },
    { id: 3, nombre: 'Regular' },
    { id: 4, nombre: 'Malo' }
  ];

  // Opciones para tipo de operación
  tipoOperacionOptions = [
    { value: 'prestamo', label: 'Devolución de Préstamo', icon: 'bi-person-check', description: 'Devolver herramientas prestadas a usuarios' },
    { value: 'reparacion', label: 'Devolución de Reparación', icon: 'bi-tools', description: 'Recibir herramientas de reparación de proveedores' }
  ];

  constructor(
    private fb: FormBuilder,
    private herramientaService: HerramientaService,
    private movimientoService: MovimientoService,
    private authService: AuthService,
    private pageTitleService: PageTitleService,
    private alertService: AlertaService
  ) { }

  ngOnInit(): void {
    this.pageTitleService.setTitle('Registrar Devolución');
    this.buildForm();
  }

  private buildForm(): void {
    this.devolucionForm = this.fb.group({
      responsableId: ['', Validators.required]
    });
  }

  /**
   * Calcula el porcentaje de completitud del formulario
   */
  getFormCompletionPercentage(): number {
    let filledFields = 0;
    let totalFields = this.requiredFields.length + 2; // +1 for tipo operacion, +1 for herramientas selection

    // Check tipo operacion
    if (this.tipoOperacion) {
      filledFields++;
    }

    // Check responsable (usuario o proveedor)
    const control = this.devolucionForm.get('responsableId');
    if (control && control.value && control.valid) {
      filledFields++;
    }

    // Check if at least one tool is selected and properly filled
    const hasValidSelection = this.herramientasEnPrestamo.some(h =>
      h.selected && h.estadoFisicoId !== null
    );

    if (hasValidSelection) {
      filledFields++;
    }

    return Math.round((filledFields / totalFields) * 100);
  }

  onTipoOperacionSelected(tipo: any): void {
    this.tipoOperacion = tipo;
    this.resetResponsableSelection();

    // Update form validators based on operation type
    this.updateFormValidators();
  }

  private updateFormValidators(): void {
    const responsableControl = this.devolucionForm.get('responsableId');
    if (responsableControl) {
      responsableControl.setValidators([Validators.required]);
      responsableControl.updateValueAndValidity();
    }
  }

  private resetResponsableSelection(): void {
    this.selectedUsuarioInfo = null;
    this.selectedProveedorInfo = null;
    this.herramientasEnPrestamo = [];
    this.devolucionForm.get('responsableId')?.setValue('');
  }

  onUsuarioSelected(usuario: UsuarioOption | null): void {
    this.selectedUsuarioInfo = usuario;
    this.herramientasEnPrestamo = [];

    if (usuario && this.tipoOperacion === 'prestamo') {
      console.log('Usuario seleccionado:', usuario);
      this.loadHerramientasEnPrestamo(usuario.id);
    }
  }

  onProveedorSelected(proveedor: ProveedorOption | null): void {
    this.selectedProveedorInfo = proveedor;
    this.herramientasEnPrestamo = [];

    if (proveedor && this.tipoOperacion === 'reparacion') {
      console.log('Proveedor seleccionado:', proveedor);
      this.loadHerramientasEnReparacion(proveedor.idProveedor);
    }
  }

  private loadHerramientasEnPrestamo(usuarioId: number): void {
    this.isLoadingHerramientas = true;

    this.herramientaService.getHerramientasEnPrestamoByUsuario(usuarioId).subscribe({
      next: (response) => {
        this.isLoadingHerramientas = false;
        if (response.success && response.data) {
          this.herramientasEnPrestamo = response.data.map((item: any) => ({
            id: item.idHerramienta,
            codigo: item.codigoHerramienta,
            nombre: item.nombreHerramienta,
            marca: item.marca || 'N/A',
            fechaPrestamo: item.fechaPrestamo,
            fechaEstimadaDevolucion: item.fechaEstimadaDevolucion,
            nombreObra: item.nombreObra,
            observacionesPrestamo: item.observaciones,
            selected: false,
            estadoFisicoId: null,
            observaciones: ''
          }));
        } else {
          this.herramientasEnPrestamo = [];
          this.alertService.error('Este usuario no tiene herramientas en préstamo actualmente.', 'Sin Herramientas');
        }
      },
      error: (error) => {
        this.isLoadingHerramientas = false;
        this.herramientasEnPrestamo = [];
        console.error('Error al cargar herramientas en préstamo:', error);
        this.alertService.error('No se pudieron cargar las herramientas en préstamo.', 'Error al Cargar');
      }
    });
  }

  private loadHerramientasEnReparacion(proveedorId: number): void {
    this.isLoadingHerramientas = true;

    // TODO: Implement service method for tools in repair by provider
    // For now, using a placeholder structure similar to prestamo
    this.herramientaService.getHerramientasEnReparacionByProveedor(proveedorId).subscribe({
      next: (response) => {
        this.isLoadingHerramientas = false;
        if (response.success && response.data) {
          this.herramientasEnPrestamo = response.data.map((item: any) => ({
            id: item.idHerramienta,
            codigo: item.codigoHerramienta,
            nombre: item.nombreHerramienta,
            marca: item.marca || 'N/A',
            fechaPrestamo: item.fechaReparacion || item.fechaIngreso,
            fechaEstimadaDevolucion: item.fechaEstimadaFinalizacion,
            nombreObra: null, // No aplica para reparaciones
            observacionesPrestamo: item.observaciones,
            selected: false,
            estadoFisicoId: null,
            observaciones: ''
          }));
        } else {
          this.herramientasEnPrestamo = [];
          this.alertService.error('Este proveedor no tiene herramientas en reparación actualmente.', 'Sin Herramientas');
        }
      },
      error: (error) => {
        this.isLoadingHerramientas = false;
        this.herramientasEnPrestamo = [];
        console.error('Error al cargar herramientas en reparación:', error);
        this.alertService.error('No se pudieron cargar las herramientas en reparación.', 'Error al Cargar');
      }
    });
  }

  onHerramientaToggle(herramienta: HerramientaDevolucion): void {
    herramienta.selected = !herramienta.selected;

    // If deselected, clear the fields
    if (!herramienta.selected) {
      herramienta.estadoFisicoId = null;
      herramienta.observaciones = '';
    }
  }

  onEstadoFisicoChange(herramienta: HerramientaDevolucion, estadoId: number): void {
    herramienta.estadoFisicoId = estadoId;
  }

  onObservacionesChange(herramienta: HerramientaDevolucion, observaciones: string): void {
    herramienta.observaciones = observaciones;
  }

  getSelectedHerramientas(): HerramientaDevolucion[] {
    return this.herramientasEnPrestamo.filter(h => h.selected);
  }

  isFormValid(): boolean {
    const selectedHerramientas = this.getSelectedHerramientas();

    if (!this.tipoOperacion || !this.devolucionForm.valid || selectedHerramientas.length === 0) {
      return false;
    }

    // Check if all selected tools have required fields filled
    return selectedHerramientas.every(h => h.estadoFisicoId !== null);
  }

  getDaysOverdue(fechaEstimada: string): number {
    if (!fechaEstimada) return 0;

    const today = new Date();
    const estimatedDate = new Date(fechaEstimada + (fechaEstimada.includes('Z') ? '' : 'Z'));
    const diffTime = today.getTime() - estimatedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  isOverdue(fechaEstimada: string): boolean {
    return this.getDaysOverdue(fechaEstimada) > 0;
  }

  onSubmit(): void {
    const selectedHerramientas = this.getSelectedHerramientas();

    // Validations
    if (!this.tipoOperacion) {
      this.alertService.error('Debe seleccionar el tipo de operación', 'Tipo de operación requerido');
      return;
    }

    if (selectedHerramientas.length === 0) {
      this.alertService.error('Debe seleccionar al menos una herramienta para devolver', 'Herramientas requeridas');
      return;
    }

    if (this.devolucionForm.invalid) {
      this.devolucionForm.markAllAsTouched();
      return;
    }

    // Check if all selected tools have required fields
    const invalidTools = selectedHerramientas.filter(h => h.estadoFisicoId === null);
    if (invalidTools.length > 0) {
      this.alertService.error('Debe especificar el estado físico para todas las herramientas seleccionadas', 'Campos requeridos');
      return;
    }

    // Create confirmation message
    const herramientasText = selectedHerramientas.map(h => h.codigo).join(', ');
    const responsableName = this.tipoOperacion === 'prestamo'
      ? `${this.selectedUsuarioInfo?.nombre} ${this.selectedUsuarioInfo?.apellido}`
      : this.selectedProveedorInfo?.nombreProveedor;

    const operacionText = this.tipoOperacion === 'prestamo' ? 'préstamo' : 'reparación';

    const confirmMessage = `¿Confirmar registro de devolución de ${operacionText}?<br><br>Herramientas (${selectedHerramientas.length}): ${herramientasText}<br>${this.tipoOperacion === 'prestamo' ? 'Usuario' : 'Proveedor'}: ${responsableName}`;

    this.alertService.confirm(confirmMessage, 'Confirmar Devolución').then((result) => {
      if (result.isConfirmed) {
        this.registrarDevoluciones();
      }
    });
  }

  private registrarDevoluciones(): void {
    this.isLoading = true;

    const currentUserId = this.authService.getUserId();
    const selectedHerramientas = this.getSelectedHerramientas();

    if (!currentUserId) {
      this.isLoading = false;
      this.alertService.error('No se pudo obtener la información del usuario. Por favor, inicie sesión nuevamente.', 'Error de Autenticación');
      return;
    }

    // Create devoluciones array based on operation type
    const devoluciones = selectedHerramientas.map(herramienta => {
      const baseMovimiento: any = {
        idHerramienta: herramienta.id,
        idUsuarioGenera: currentUserId,
        fechaMovimiento: new Date().toISOString(),
        estadoHerramientaAlDevolver: herramienta.estadoFisicoId,
        observaciones: herramienta.observaciones || undefined,
        fechaEstimadaDevolucion: null
      };

      if (this.tipoOperacion === 'prestamo') {
        return {
          ...baseMovimiento,
          idUsuarioResponsable: this.selectedUsuarioInfo!.id,
          idTipoMovimiento: 2, // Devolución de préstamo
          idProveedor: null
        };
      } else {
        return {
          ...baseMovimiento,
          idUsuarioResponsable: null,
          idTipoMovimiento: 2, // Devolución de reparación
          idProveedor: this.selectedProveedorInfo!.idProveedor
        };
      }
    });

    // Register all devoluciones
    this.movimientoService.registrarMultiplesPrestamos(devoluciones).subscribe({
      next: (responses: any[]) => {
        this.isLoading = false;
        const herramientasText = selectedHerramientas.map(h => h.codigo).join(', ');
        const operacionText = this.tipoOperacion === 'prestamo' ? 'préstamos' : 'reparaciones';
        this.alertService.success(`Las devoluciones de ${operacionText} de las herramientas ${herramientasText} han sido registradas exitosamente.`, '✓ Devoluciones Registradas');
        this.resetForm();
      },
      error: (error) => {
        this.isLoading = false;
        this.alertService.error(error.error?.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente.', '✗ Error al Registrar');
        console.error('Error al crear devoluciones:', error);
      }
    });
  }

  resetForm(): void {
    this.devolucionForm.reset();
    this.tipoOperacion = null;
    this.selectedUsuarioInfo = null;
    this.selectedProveedorInfo = null;
    this.herramientasEnPrestamo = [];
  }

  // Helper methods for template
  isPrestamoOperation(): boolean {
    return this.tipoOperacion === 'prestamo';
  }

  isReparacionOperation(): boolean {
    return this.tipoOperacion === 'reparacion';
  }

  getResponsableName(): string {
    if (this.tipoOperacion === 'prestamo' && this.selectedUsuarioInfo) {
      return `${this.selectedUsuarioInfo.nombre} ${this.selectedUsuarioInfo.apellido}`;
    }
    if (this.tipoOperacion === 'reparacion' && this.selectedProveedorInfo) {
      return this.selectedProveedorInfo.nombreProveedor;
    }
    return '';
  }
}
