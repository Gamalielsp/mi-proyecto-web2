import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type UiFeedbackType =
  'success' |
  'error' |
  'warning' |
  'info' |
  'danger';

export interface UiToast {
  id: number;
  type: UiFeedbackType;
  title: string;
  message: string;
}

export interface UiConfirmRequest {
  id: number;
  type: UiFeedbackType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class UiFeedbackService {

  private toastId = 1;
  private confirmId = 1;

  private toastsSubject =
    new BehaviorSubject<UiToast[]>([]);

  private confirmSubject =
    new BehaviorSubject<UiConfirmRequest | null>(null);

  public toasts$: Observable<UiToast[]> =
    this.toastsSubject.asObservable();

  public confirm$: Observable<UiConfirmRequest | null> =
    this.confirmSubject.asObservable();

  success(
    message: string,
    title: string = 'Operación completada'
  ): void {
    this.showToast('success', title, message);
  }

  error(
    message: string,
    title: string = 'No se pudo completar la acción'
  ): void {
    this.showToast('error', title, message);
  }

  warning(
    message: string,
    title: string = 'Atención'
  ): void {
    this.showToast('warning', title, message);
  }

  info(
    message: string,
    title: string = 'Información'
  ): void {
    this.showToast('info', title, message);
  }

  confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: UiFeedbackType;
  }): Observable<boolean> {
    return new Observable<boolean>(subscriber => {

      const request: UiConfirmRequest = {
        id: this.confirmId++,
        type: options.type || 'info',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Aceptar',
        cancelText: options.cancelText || 'Cancelar',
        resolve: (value: boolean) => {
          subscriber.next(value);
          subscriber.complete();
        }
      };

      this.confirmSubject.next(request);

      return () => {
        const currentRequest = this.confirmSubject.value;

        if (currentRequest?.id === request.id) {
          this.confirmSubject.next(null);
        }
      };
    });
  }

  respondToConfirm(value: boolean): void {
    const request = this.confirmSubject.value;

    if (!request) {
      return;
    }

    this.confirmSubject.next(null);
    request.resolve(value);
  }

  closeToast(id: number): void {
    this.toastsSubject.next(
      this.toastsSubject.value.filter(toast =>
        toast.id !== id
      )
    );
  }

  private showToast(
    type: UiFeedbackType,
    title: string,
    message: string
  ): void {
    const toast: UiToast = {
      id: this.toastId++,
      type,
      title,
      message
    };

    this.toastsSubject.next([
      ...this.toastsSubject.value,
      toast
    ]);

    setTimeout(() => {
      this.closeToast(toast.id);
    }, 4200);
  }
}
