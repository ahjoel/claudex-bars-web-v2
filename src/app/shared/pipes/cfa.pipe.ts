import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'cfa', standalone: true })
export class CfaPipe implements PipeTransform {
  transform(value: number | null | undefined, symbol = 'FCFA'): string {
    if (value == null || isNaN(value)) return `0 ${symbol}`;
    return `${Number(value).toLocaleString('fr-FR')} ${symbol}`;
  }
}
