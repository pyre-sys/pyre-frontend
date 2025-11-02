import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { CboUsuarioComponent, UsuarioOption } from "../../../shared/components/Cbo/cbo-usuario/cbo-usuario.component";
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

@Component({
  selector: 'app-devolucion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CboUsuarioComponent,
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
  herramientasEnPrestamo: HerramientaDevolucion[] = [];

  isLoading = false;
  isLoadingHerramientas = false;

  // Campos requeridos para calcular el progreso
  private requiredFields = ['usuarioId'];

  // Opciones para estado físico
  estadoFisicoOptions = [
    { id: 1, nombre: 'Excelente' },
    { id: 2, nombre: 'Bueno' },
    { id: 3, nombre: 'Regular' },
    { id: 4, nombre: 'Malo' }
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
      usuarioId: ['', Validators.required]
    });
  }

  /**
   * Calcula el porcentaje de completitud del formulario
   */
  getFormCompletionPercentage(): number {
    let filledFields = 0;
    let totalFields = this.requiredFields.length + 1; // +1 for herramientas selection

    // Check usuario
    this.requiredFields.forEach(field => {
      const control = this.devolucionForm.get(field);
      if (control && control.value && control.valid) {
        filledFields++;
      }
    });

    // Check if at least one tool is selected and properly filled
    const hasValidSelection = this.herramientasEnPrestamo.some(h => 
      h.selected && h.estadoFisicoId !== null
    );
    
    if (hasValidSelection) {
      filledFields++;
    }

    return Math.round((filledFields / totalFields) * 100);
  }

  onUsuarioSelected(usuario: UsuarioOption | null): void {
    this.selectedUsuarioInfo = usuario;
    this.herramientasEnPrestamo = [];

    if (usuario) {
      console.log('Usuario seleccionado:', usuario);
      this.loadHerramientasEnPrestamo(usuario.id);
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
    
    if (!this.devolucionForm.valid || selectedHerramientas.length === 0) {
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
    const confirmMessage = `¿Confirmar registro de devolución?<br><br>Herramientas (${selectedHerramientas.length}): ${herramientasText}<br>Usuario: ${this.selectedUsuarioInfo?.nombre} ${this.selectedUsuarioInfo?.apellido}`;

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

    // Create devoluciones array
    const devoluciones = selectedHerramientas.map(herramienta => ({
      idHerramienta: herramienta.id,
      idUsuarioGenera: currentUserId,
      idUsuarioResponsable: this.selectedUsuarioInfo!.id,
      idTipoMovimiento: 2, // Devolución
      fechaMovimiento: new Date().toISOString(),
      estadoHerramientaAlDevolver: herramienta.estadoFisicoId,
      observaciones: herramienta.observaciones || undefined,
      fechaEstimadaDevolucion: null
    }));

    // Register all devoluciones
    this.movimientoService.registrarMultiplesPrestamos(devoluciones).subscribe({
      next: (responses: any[]) => {
        this.isLoading = false;
        const herramientasText = selectedHerramientas.map(h => h.codigo).join(', ');
        this.alertService.success(`Las devoluciones de las herramientas ${herramientasText} han sido registradas exitosamente.`, '✓ Devoluciones Registradas');
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
    this.selectedUsuarioInfo = null;
    this.herramientasEnPrestamo = [];
  }
}
