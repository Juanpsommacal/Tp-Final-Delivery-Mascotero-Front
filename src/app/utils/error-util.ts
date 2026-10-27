import { HttpErrorResponse } from '@angular/common/http';

// El back responde con ErrorResponseDTO: { message, errorsMap: { campo: [mensajes] } }
export function extraerMensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) {
        return 'Sin respuesta del servidor (backend apagado o bloqueado por CORS).'
    }

    if (error.status === 403) {
        return 'No tenes permisos para realizar esta accion.'
    }

    const errorsMap: Record<string, string[]> | undefined = error.error?.errorsMap
    if (errorsMap) {
        return Object.values(errorsMap).flat().join('. ')
    }

    return error.error?.message ?? `Error ${error.status}: error inesperado`
}
