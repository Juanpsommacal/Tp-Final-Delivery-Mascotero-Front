import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CerrarAlFondo } from './cerrar-al-fondo';

@Component({
  imports: [CerrarAlFondo],
  template: `<div class="fondo" (appCerrarAlFondo)="cierres.set(cierres() + 1)"><input class="campo" /></div>`,
})
class Anfitrion {
  cierres = signal(0)
}

describe('CerrarAlFondo', () => {
  function armar() {
    const fixture = TestBed.createComponent(Anfitrion)
    fixture.detectChanges()
    const raiz: HTMLElement = fixture.nativeElement
    return {
      cierres: () => fixture.componentInstance.cierres(),
      fondo: raiz.querySelector<HTMLElement>('.fondo')!,
      campo: raiz.querySelector<HTMLElement>('.campo')!,
    }
  }

  const evento = (tipo: string) => new Event(tipo, { bubbles: true, cancelable: true })

  function arrastrar(desde: HTMLElement, hasta: HTMLElement, clickEn: HTMLElement) {
    desde.dispatchEvent(evento('pointerdown'))
    hasta.dispatchEvent(evento('pointerup'))
    clickEn.dispatchEvent(evento('click'))
  }

  it('no cancela la acción del navegador: el contenido del modal tiene que poder tomar el foco', () => {
    const { campo, fondo } = armar()
    for (const [elemento, tipo] of [[campo, 'pointerdown'], [campo, 'pointerup'], [fondo, 'pointerdown'], [fondo, 'click']] as const) {
      const e = evento(tipo)
      elemento.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(false)
    }
  })

  it('cierra con un click común en el fondo', () => {
    const { fondo, cierres } = armar()
    arrastrar(fondo, fondo, fondo)
    expect(cierres()).toBe(1)
  })

  it('no cierra si se aprieta adentro y se suelta en el fondo', () => {
    const { campo, fondo, cierres } = armar()
    arrastrar(campo, fondo, fondo)
    expect(cierres()).toBe(0)
  })

  it('no cierra si se aprieta en el fondo y se suelta adentro', () => {
    const { campo, fondo, cierres } = armar()
    arrastrar(fondo, campo, fondo)
    expect(cierres()).toBe(0)
  })
})
