import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { Subscription, debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AlertaService } from '../../../services/alerta.service';
import { CboFamiliaHerramientaComponent } from '../../../shared/components/Cbo/cbo-familia-herramienta/cbo-familia-herramienta.component';
import { CboEstadoFisicoHerramientaComponent } from '../../../shared/components/Cbo/cbo-estado-fisico-herramienta/cbo-estado-fisico-herramienta.component';

@Component({
  selector: 'app-herramientas-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    CboFamiliaHerramientaComponent,
    CboEstadoFisicoHerramientaComponent,
  ],
  templateUrl: './modal-herramienta.component.html',
  styleUrls: ['../../../../styles/modal-style.css'], // Apuntar a la hoja de estilos global
})
export class HerramientasModalComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Output() submit = new EventEmitter<{
    mode: 'create' | 'edit';
    data: any;
    onSuccess: (response: any) => void;
    onError: (error: any) => void;
  }>();
  @Output() close = new EventEmitter<void>();

  @Input() initialData: any | null = null;
  @Input() mode: 'create' | 'edit' = 'create';

  visible = true;
  form!: FormGroup;
  showAdvanced = false;
  serverErrors: { [key: string]: string } = {};
  private subscriptions: Subscription[] = [];
  editingEnabled: boolean = true;
  private toolId: number | null = null;

  @ViewChild('firstInput') firstInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private srvAlerta: AlertaService
  ) {}

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event | KeyboardEvent) {
    this.onCancel();
  }

  ngOnInit(): void {
    this.buildForm();

    // Si hay datos iniciales, aplicarlos inmediatamente
    if (this.initialData) {
      this.patchForm(this.initialData);
    } else if (this.mode === 'create') {
      // En modo creación, establecer valores por defecto inmediatamente
      this.form.patchValue({
        EstadoFisico: { idEstadoFisico: 1, descripcionEstado: 'EXCELENTE' },
        Activo: true,
        Planta: 1,
      });
    }

    // Establecer estado de edición inmediatamente
    this.editingEnabled = this.mode !== 'edit';
    this.setControlsDisabled(!this.editingEnabled);

    // Reducir timeout para focus más rápido
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector(
        'input:not([style*="display:none"])'
      );
      if (firstInput) firstInput.focus();
    }, 50); // Reducido de 150ms a 50ms
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && !changes['initialData'].firstChange) {
      this.patchForm(this.initialData);
    }
    if (changes['mode'] && !changes['mode'].firstChange) {
      this.mode = changes['mode'].currentValue || 'create';
      this.editingEnabled = this.mode !== 'edit';
      this.setControlsDisabled(!this.editingEnabled);
    }
    // Optimizar para modo creación
    if (changes['mode'] && this.mode === 'create' && this.form) {
      this.form.patchValue({
        EstadoFisico: { idEstadoFisico: 1, descripcionEstado: 'EXCELENTE' },
        Activo: true,
        Planta: 1,
      });
    }
  }

  enableEditing(): void {
    this.editingEnabled = true;
    this.setControlsDisabled(false);
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector(
        'input:not([disabled])'
      );
      if (firstInput) firstInput.focus();
    }, 50);
  }

  toggleEditing(): void {
    this.editingEnabled = !this.editingEnabled;
    this.setControlsDisabled(!this.editingEnabled);
    if (this.editingEnabled) {
      setTimeout(() => {
        const firstInput = this.elementRef.nativeElement.querySelector(
          'input:not([disabled])'
        );
        if (firstInput) firstInput.focus();
      }, 50);
    }
  }

  private setControlsDisabled(disabled: boolean) {
    if (!this.form) return;
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (!control) return;
      if (disabled) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      Nombre: ['', [Validators.required, Validators.maxLength(150)]],
      Marca: ['', [Validators.maxLength(100)]],
      Tipo: ['', [Validators.maxLength(100)]],
      Ubicacion: ['', [Validators.maxLength(50)]],
      Planta: [1, [Validators.required]],
      Familia: ['', [Validators.required]],
      Serie: ['', [Validators.maxLength(100)]],
      Valor: [null, [Validators.min(0)]],
      CostoDolares: [null, [Validators.min(0)]],
      UbicacionFisica: ['', [Validators.maxLength(150)]],
      Activo: [true],
      Codigo: ['', [Validators.maxLength(50)]],
      // Valor por defecto optimizado para modo creación
      EstadoFisico: [
        { idEstadoFisico: 1, descripcionEstado: 'EXCELENTE' },
        [Validators.required],
      ],
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  onSubmit(): void {
    if (this.form.invalid) {
      console.error(
        '[HerramientasModal] Formulario inválido:',
        this.form.errors
      );
      this.form.markAllAsTouched();
      return;
    }

    console.debug(
      '[HerramientasModal] Valores del formulario al enviar:',
      this.form.value
    );

    const formValue = { ...this.form.value };

    // Procesar el valor del campo Valor para asegurar formato numérico correcto
    let costoDolares = 0;
    if (
      formValue.Valor !== null &&
      formValue.Valor !== undefined &&
      formValue.Valor !== ''
    ) {
      const valorNumerico = parseFloat(formValue.Valor.toString());
      costoDolares = isNaN(valorNumerico) ? 0 : valorNumerico;
    }

    // Construir el payload con los campos necesarios
    const payload: any = {
      nombreHerramienta: formValue.Nombre,
      idFamilia: formValue.Familia?.idFamilia || formValue.Familia,
      tipo: formValue.Tipo || '',
      marca: formValue.Marca || '',
      serie: formValue.Serie || '',
      codigo: formValue.Codigo || '',
      costoDolares: costoDolares, // Usar el valor procesado
      ubicacionFisica: formValue.UbicacionFisica || '',
      idPlanta: 1, // Valor predeterminado
      activo: formValue.Activo !== undefined ? formValue.Activo : true,
      idDisponibilidad: 1, // Campo obligatorio con valor predeterminado
      diasAlerta: 5, // Valor predeterminado
      idEstadoFisico:
        formValue.EstadoFisico?.idEstadoFisico || formValue.EstadoFisico, // Validar idEstadoFisico
    };

    // Si estamos en modo edición, agregar el ID de la herramienta
    if (this.mode === 'edit' && this.toolId) {
      payload.idHerramienta = this.toolId;
    }

    // Logs de depuración mejorados
    console.debug('[HerramientasModal] Datos procesados:', {
      modo: this.mode,
      idHerramienta: this.toolId,
      valorOriginal: formValue.Valor,
      costoDolaresCalculado: costoDolares,
      idEstadoFisico: payload.idEstadoFisico, // Log del idEstadoFisico
      payloadCompleto: payload,
    });

    this.submit.emit({
      mode: this.mode,
      data: payload,
      onSuccess: (response: any) => {
        console.debug('[HerramientasModal] Éxito al enviar:', response);
        const successMessage =
          response?.message ||
          (this.mode === 'create'
            ? 'Herramienta creada correctamente'
            : 'Herramienta actualizada correctamente');
        this.srvAlerta.success(successMessage);
        this.resetModal();
        this.close.emit();
      },
      onError: (error: any) => {
        console.error('[HerramientasModal] Error al enviar:', error);
        this.handleServerErrors(error);
      },
    });
  }

  private patchForm(data: any) {
    if (!this.form) this.buildForm();

    // Guardar el ID de la herramienta para actualización posterior
    this.toolId = data?.idHerramienta ?? null;

    console.debug('[HerramientasModal] Datos recibidos para patchForm:', data);

    // Mapeo mejorado para considerar todas las variantes de nombres de propiedades
    const mapped = {
      Nombre: data?.nombreHerramienta ?? '',
      Marca: data?.marca ?? '',
      Tipo: data?.tipo ?? '',
      Familia: {
        idFamilia: data?.idFamilia ?? null,
        nombreFamilia: data?.nombreFamilia ?? '',
      },
      Serie: data?.serie ?? '',
      Valor: data?.costoDolares ?? null, // Mapear costoDolares al campo Valor del formulario
      CostoDolares: data?.costoDolares ?? null,
      UbicacionFisica: data?.ubicacionFisica ?? '',
      Activo: data?.activo ?? true,
      Codigo: data?.codigo ?? '', // Mapear el campo Codigo
      EstadoFisico: {
        idEstadoFisico: data?.idEstadoFisico ?? null,
        descripcionEstado: data?.estadoFisico ?? '',
      },
    };

    console.debug(
      '[HerramientasModal] Valores mapeados para el formulario:',
      mapped
    );
    this.form.patchValue(mapped);
  }

  onCancel(): void {
    this.resetModal();
    this.close.emit();
    this.visible = false;
  }

  private resetModal(): void {
    this.toolId = null;
    this.form?.reset();
  }

  private handleServerErrors(error: any) {
    try {
      this.serverErrors = {};

      // Normalizar el formato del error para diferentes tipos de respuestas
      let errorData = error?.error;

      // Si el error es una cadena, intentar analizarla como JSON
      if (typeof errorData === 'string') {
        try {
          errorData = JSON.parse(errorData);
        } catch (e) {
          // Si no es JSON, crear un objeto simple con el mensaje
          errorData = { message: errorData };
        }
      }

      // Manejar errores de validación específicos
      if (errorData?.errors && typeof errorData.errors === 'object') {
        Object.keys(errorData.errors).forEach((k: string) => {
          const val = errorData.errors[k];
          this.serverErrors[k] = Array.isArray(val)
            ? String(val[0])
            : String(val);

          // Mapear errores del backend a campos del formulario
          const formField = this.fromServerKey(k);
          const control = this.form.get(formField);

          if (control) {
            control.setErrors({ server: true });
            control.markAsTouched();
          } else {
            console.warn(
              `[HerramientasModal] No se encontró control para el campo: ${k} -> ${formField}`
            );
          }
        });
      }
      // Manejar mensaje de error general
      else if (errorData?.message || errorData?.detail) {
        const generalError = errorData?.message || errorData?.detail;
        this.serverErrors['general'] = generalError;

        // Mostrar el mensaje de error general
        this.srvAlerta.error(generalError);
      }
      // Manejar error de texto simple
      else if (typeof error?.error === 'string') {
        this.serverErrors['general'] = error.error;
      }
    } catch (e) {
      console.error(
        '[HerramientasModal] Error al procesar respuesta del servidor:',
        e
      );
      this.srvAlerta.error(
        'Ocurrió un error al procesar la respuesta del servidor'
      );
    }
  }

  // Mapeo de nombres de campos del servidor al formulario
  private fromServerKey(serverKey: string): string {
    const map: any = {
      NombreHerramienta: 'Nombre',
      Codigo: 'Codigo',
      Marca: 'Marca',
      Tipo: 'Tipo',
      Disponibilidad: 'Disponibilidad',
      Ubicacion: 'Ubicacion',
      Planta: 'Planta',
    };
    return map[serverKey] ?? serverKey;
  }

  // Mapeo de nombres de campos del formulario al servidor
  private toServerKey(formKey: string): string {
    const map: any = {
      Nombre: 'NombreHerramienta',
      Codigo: 'Codigo',
      Marca: 'Marca',
      Tipo: 'Tipo',
      Disponibilidad: 'Disponibilidad',
      Ubicacion: 'Ubicacion',
      Planta: 'Planta',
    };
    return map[formKey] ?? formKey;
  }
}
