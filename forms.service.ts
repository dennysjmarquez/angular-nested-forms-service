import { Injectable } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { Observable, Subject } from 'rxjs';

/**
 * Interfaz que define la estructura de los eventos emitidos por el servicio de formularios.
 */
interface FormEvent {
  /**
   * Tipo de evento que puede ser 'form' o 'control'.
   * - 'form': Indica que se ha registrado un nuevo formulario principal.
   * - 'formElement': Indica que se ha registrado un nuevo FormControl |o FormGroup en un formulario.
   */
  type: 'form' | 'formElement';

  /**
   * Ruta del formulario o control registrado.
   * - Para eventos de tipo 'form', es el identificador del formulario.
   * - Para eventos de tipo 'formElement', es el identificador del formulario y el control en formato
   * 'formPath.controlPath'.
   */
  path: string;

  /**
   * Instancia del control registrado. Esta propiedad es opcional y solo se incluye en eventos
   * de tipo 'control'.
   */
  control?: AbstractControl;
}

/**
 * Servicio para gestionar formularios anidados y sus controles.
 *
 * Este servicio resuelve la problemática de gestionar formularios anidados entre componentes.
 * Permite centralizar la gestión de formularios y sus controles, facilitando la interacción
 * entre componentes padres, hijos y nietos dentro de un único form principal.
 *
 * **Importante, correcto uso:** Para evitar problemas de estado compartido entre diferentes pantallas,
 * este servicio debe ser proporcionado a nivel del componente principal de la pantalla.
 * Los componentes hijos deben inyectar el servicio normalmente para compartir la misma instancia.
 * Esto asegura que cada instancia del componente principal tenga su propia instancia del servicio,
 * reiniciando su estado al entrar de nuevo en la pantalla y manteniendo la integridad de los datos.
 *
 * @example
 * ```typescript
 * import { Component, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
 * import { FormBuilder, FormGroup, FormControl, NgForm } from '@angular/forms';
 * import { FormService } from './form.service';
 * import { Subscription } from 'rxjs';
 *
 * @Component({
 *   selector: 'app-ejemplo',
 *   templateUrl: './ejemplo.component.html',
 *   providers: [FormService] // Proveedor a nivel de componente principal
 * })
 * export class EjemploComponent implements AfterViewInit, OnDestroy {
 *   @ViewChild('f') f!: NgForm;
 *   private formEventSubscription: Subscription;
 *
 *   constructor(
 *     private formService: FormService
 *   ) {}
 *
 *   ngAfterViewInit() {
 *     // Registrar el formulario en el servicio
 *     this.formService.registerRootForms('miFormulario', this.f);
 *
 *     // Suscribirse a eventos del servicio
 *     this.formEventSubscription = this.formService.getFormEventObservable().subscribe(event => {
 *       console.log('Evento de formulario:', event);
 *     });
 *   }
 *
 *   ngOnDestroy() {
 *     // Desuscribirse del observable para evitar fugas de memoria
 *     if (this.formEventSubscription) {
 *       this.formEventSubscription.unsubscribe();
 *     }
 *   }
 *
 *   // Método para agregar un control dinámicamente
 *   addControl() {
 *     const nuevoControl = new FormControl('');
 *     this.formService.registerFormElement('miFormulario', 'nuevoControl', nuevoControl);
 *   }
 * }
 *
 * @Component({
 *   selector: 'app-hijo',
 *   templateUrl: './hijo.component.html',
 * })
 * export class HijoComponent {
 *   constructor(private formService: FormService) {
 *     // Se usa la misma instancia del servicio en los hijos sin usar en los hijos nietos etc.
 *     providers: [FormService]
 *   }
 * }
 * ```
 *
 * @author
 * Nombre del Autor: Dennys Jose Marquez Reyes - dennysjmarquez
 * Contacto: dennysjmarquez@gmail.com
 * Sitio Web: https://dennysjmarquez.dev/
 *
 * @repository
 * URL del Repositorio: https://github.com/dennysjmarquez/angular-nested-forms-service
 */
@Injectable({
  providedIn: 'root',
})
export class FormService {
  private readonly mainForm: FormGroup;
  private formEventSubject = new Subject<FormEvent>();

  constructor(private fb: FormBuilder) {
    this.mainForm = this.fb.group({});
  }

  /**
   * Registra un formulario en el servicio.
   *
   * @param name - Nombre del formulario.
   * @param formGroup - Instancia del FormGroup que representa el formulario.
   *
   * @example
   * ```typescript
   * // Usando FormGroup
   * const formGroup = this.fb.group({
   *   nombre: new FormControl(''),
   *   edad: new FormControl('')
   * });
   * this.formService.registerRootForms('miFormulario', formGroup);
   *
   * // Usando NgForm con @ViewChild
   * @ViewChild('f') f!: NgForm;
   * this.formService.registerRootForms('miFormulario', this.f);
   * ```
   *
   */
  registerRootForms(name: string, formGroup: FormGroup): void {
    this.mainForm.setControl(name, formGroup);
    this.formEventSubject.next({ type: 'form', path: name });
  }

  /**
   *
   * Registra un control dentro de un formulario anidado.
   * @param path - Ruta del formulario anidado en formato "formulario.control".
   * @param controlName - Nombre del control.
   * @param control - Instancia del FormControl o FormGroup que representa el control.
   *
   * @example
   * ```typescript
   * const nuevoControl = new FormControl('');
   * this.formService.registerFormElement('miFormulario', 'nuevoControl', nuevoControl);
   * ```
   *
   */
  registerFormElement(
    path: string,
    controlName: string,
    control: FormControl | FormGroup
  ): void {
    const formGroup = this.getNestedFormGroup(path);
    if (formGroup) {
      if (!formGroup.contains(controlName)) {
        formGroup.addControl(controlName, control);
        this.formEventSubject.next({
          type: 'formElement',
          path: `${path}.${controlName}`,
          control,
        });
      }
    }
  }

  /**
   *
   * Obtiene un observable que emite eventos cuando se registran formularios o controles.
   *
   * Método proporcionado para que los componentes hijos o descendientes del componente principal
   * puedan registrar formularios o controles adicionales. Esto asegura que los formularios y
   * controles estén completamente cargados y disponibles antes de que se intente agregar
   * cualquier control adicional, siguiendo el flujo del ciclo de vida del componente.
   *
   * Una forma de asegurarse de que los formularios y controles estén completamente cargados y
   * disponibles antes de que se intente agregar cualquier control adicional.
   * Esto se logra mediante el uso de un Observable que emite eventos cuando los formularios
   * y controles están listos.
   *
   * Eventos de Registro:
   *
   * - Tipo de Evento 'form': Indica que se ha registrado un nuevo formulario. El event.path contiene el identificador del formulario registrado.
   * - Tipo de Evento 'control': Indica que se ha registrado un nuevo control en un formulario. El event.path contiene el identificador del formulario y el control registrado en formato formPath.controlPath.
   *
   * Uso de event.path:
   *
   * - Para los eventos de tipo 'form', event.path será el identificador del formulario, por ejemplo, 'mainForm'.
   * - Para los eventos de tipo 'control', event.path será el identificador del formulario y el control, por ejemplo, 'mainForm.newControl'.
   *
   * Nota:
   *
   * Es importante asegurarse de destruir las suscripciones al observable utilizando `ngOnDestroy`
   * para evitar problemas de rendimiento o comportamiento inesperado.
   *
   * Además, en algunos casos específicos, puede ser útil desuscribirse dentro del propio `subscribe`
   * después de realizar una acción específica para evitar llamadas repetidas. Por ejemplo, si solo
   * deseas realizar una acción una vez cuando se registra un formulario específico.
   *
   *
   * @returns Observable que emite eventos de tipo FormEvent.
   *
   * @example
   * Ejemplo 1: Registro de un control adicional cuando se registra un formulario específico.
   *
   * ```typescript
   * this.formService.getFormEventObservable().subscribe(event => {
   *   if (event.type === 'form' && event.path === 'form-1') {
   *     this.formService.registerFormElement(
   *       'form-1',
   *       'listado',
   *       new FormControl(this.dataTable)
   *     );
   *     this.formEventSubscription$.unsubscribe();
   *   }
   * });
   * ```
   *
   * Ejemplo 2: Registro de un control adicional cuando se registra un control específico en un formulario.
   *
   * ```typescript
   * this.formService.getFormEventObservable().subscribe(event => {
   *   if (event.type === 'control' && event.path === 'mainForm.existingForm') {
   *     this.formService.registerFormElement(
   *       'mainForm.existingForm',
   *       'newControl',
   *       new FormControl('')
   *     );
   *   }
   * });
   * ```
   */
  getFormEventObservable(): Observable<FormEvent> {
    return this.formEventSubject.asObservable();
  }

  /**
   * Obtiene un control específico dentro del formulario principal o anidado.
   *
   * @param path - Ruta del control en formato "formulario.control".
   * @returns La instancia del AbstractControl correspondiente a la ruta especificada, o null
   * si no se encuentra.
   *
   * @example
   * ```typescript
   * const control = this.formService.getControl('miFormulario.nuevoControl');
   * if (control) {
   *   console.log('Control encontrado:', control);
   * } else {
   *   console.log('Control no encontrado');
   * }
   * ```
   */
  getControl(path: string): AbstractControl | null {
    const keys = path.split('.');
    let currentControl: AbstractControl | null = this.mainForm;

    for (const key of keys) {
      if (currentControl && currentControl.get(key)) {
        currentControl = currentControl.get(key);
      } else {
        return null;
      }
    }

    return currentControl;
  }

  /**
   * Obtiene el formulario principal gestionado por el servicio.
   *
   * @returns La instancia del FormGroup principal.
   *
   * @example
   * ```typescript
   * const mainForm = this.formService.getForm();
   * console.log('Formulario principal:', mainForm);
   * ```
   */
  getForm(): FormGroup {
    return this.mainForm;
  }

  /**
   * Obtiene un formulario anidado dentro del formulario principal.
   *
   * @param path - Ruta del formulario anidado en formato "formulario.control".
   * @returns La instancia del FormGroup correspondiente a la ruta especificada, o null
   * si no se encuentra.
   *
   * @example
   * ```typescript
   * const nestedFormGroup = this.formService.getNestedFormGroup('miFormulario.subFormulario');
   * if (nestedFormGroup) {
   *   console.log('Formulario anidado encontrado:', nestedFormGroup);
   * } else {
   *   console.log('Formulario anidado no encontrado');
   * }
   * ```
   */
  private getNestedFormGroup(path: string): FormGroup | null {
    const keys = path.split('.');
    let currentGroup: FormGroup | null = this.mainForm;

    for (const key of keys) {
      if (currentGroup && currentGroup.get(key) instanceof FormGroup) {
        currentGroup = currentGroup.get(key) as FormGroup;
      } else {
        return null;
      }
    }

    return currentGroup;
  }
}
