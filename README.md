# angular-nested-forms-service
Servicio Angular diseñado para gestionar formularios anidados de manera eficiente y centralizada. Ideal para aplicaciones complejas, este servicio facilita la interacción entre componentes padres, hijos y nietos dentro de un único formulario principal, asegurando la integridad y sincronización de los datos.

## Características Principales

- **Registro Dinámico de Formularios y Controles**: Registra formularios y controles de manera dinámica y sencilla.
- **Eventos de Registro**: Emite eventos cuando se registran formularios o controles, permitiendo mantener sincronizados los componentes.
- **Obtención de Controles**: Permite obtener controles específicos dentro del formulario principal o anidado.
- **Uso de Observables**: Utiliza `Subject` y `Observable` para un enfoque reactivo y eficiente.

## Instalación

Para utilizar `FormService` en tu proyecto Angular, sigue estos pasos:

1. **Instalación**: Añade el servicio a tu proyecto Angular.
2. **Importación**: Importa el servicio en tu componente principal.

`import { FormService } from './form.service';`

## Uso del Servicio

### Registro de Formularios

Registra un formulario en el servicio para centralizar su gestión:

```typescript
import { Component, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm } from '@angular/forms';
import { FormService } from './form.service';
import { Subscription } from 'rxjs';
@Component({
	selector: 'app-ejemplo',
	templateUrl: './ejemplo.component.html',
	providers: [FormService],
})
export class EjemploComponent implements AfterViewInit, OnDestroy {
	@ViewChild('f') f!: NgForm;
	private formEventSubscription: Subscription;
	constructor(private formService: FormService) {}
	ngAfterViewInit() {
		this.formService.registerForm('miFormulario', this.f);
		this.formEventSubscription = this.formService
			.getFormEventObservable()
			.subscribe((event) => {
				console.log('Evento de formulario:', event);
			});
	}
	ngOnDestroy() {
		if (this.formEventSubscription) {
			this.formEventSubscription.unsubscribe();
		}
	}
	addControl() {
		const nuevoControl = new FormControl('');
		this.formService.registerControl('miFormulario', 'nuevoControl', nuevoControl);
	}
}
```

### Registro de Controles

Añade controles dinámicamente a un formulario registrado:

```typescript
const nuevoControl = new FormControl('');
this.formService.registerControl('miFormulario', 'nuevoControl', nuevoControl);
```

### Suscripción a Eventos

Suscríbete a los eventos emitidos por el servicio para realizar acciones adicionales:

```typescript
this.formService.getFormEventObservable().subscribe((event) => {
	if (event.type === 'form' && event.path === 'form-1') {
		this.formService.registerControl(
			'form-1',
			'listado',
			new FormControl(this.dataTable)
		);
		this.formEventSubscription$.unsubscribe();
	}
});
```

### Obtención de Controles

Obtén un control específico dentro del formulario principal o anidado:

```typescript
const control = this.formService.getControl('miFormulario.nuevoControl');
if (control) {
	console.log('Control encontrado:', control);
} else {
	console.log('Control no encontrado');
}
```

## Beneficios

- **Centralización**: Gestiona todos tus formularios y controles desde un único servicio.
- **Sincronización**: Mantén tus componentes sincronizados mediante eventos de registro.
- **Flexibilidad**: Añade y manipula formularios y controles dinámicamente.
- **Simplicidad**: Evita la complejidad de las soluciones existentes con una API clara y directa.
