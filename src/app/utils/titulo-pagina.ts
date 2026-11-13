import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

// Título de la pestaña: "<página> · Delivery Mascotero"
@Injectable()
export class TituloPagina extends TitleStrategy {
  private title = inject(Title)

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pagina = this.buildTitle(snapshot)
    this.title.setTitle(pagina ? `${pagina} · Delivery Mascotero` : 'Delivery Mascotero')
  }
}
