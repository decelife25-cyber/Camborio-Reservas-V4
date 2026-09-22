import type { CSSProperties } from 'react';

export type MesaPlanoLayout = {
  nombre: string;
  mesas: Array<{ numero: string; x: number; y: number; zona: string }>;
};

export type MesaPlanoEstado = 'disponible' | 'reservada' | 'ocupada' | 'desactivada' | 'principal' | 'adicional';

type Props = {
  layout: MesaPlanoLayout;
  zona: string;
  mesas: Array<{ numero: string; x: number; y: number; zona: string; estado: MesaPlanoEstado }>;
  assignmentMode: boolean;
  assignmentTables: string[];
  onTableClick: (numero: string) => void;
};

export default function MesaPlano({ layout, zona, mesas, assignmentMode, assignmentTables, onTableClick }: Props) {
  const principal = assignmentTables[0] || null;
  const assignmentSet = new Set(assignmentTables);
  return (
    <>
      <div className="cr-planos-mesas__canvas-wrap">
        <div className={'cr-planos-mesas__canvas cr-planos-mesas__canvas--' + zona}>
          <div className="cr-planos-mesas__rotulo">{layout.nombre}</div>
          {zona === 'terraza' && <div className="cr-planos-mesas__terraza-marco" aria-hidden="true" />}
          {mesas.map(mesa => {
            const estado = assignmentMode
              ? (assignmentSet.has(mesa.numero) ? (principal === mesa.numero ? 'principal' : 'adicional') : mesa.estado)
              : mesa.estado;
            return (
              <button
                key={mesa.numero}
                type="button"
                className={'cr-planos-mesas__mesa cr-planos-mesas__mesa--' + estado}
                style={{ '--mesa-x': mesa.x + '%', '--mesa-y': mesa.y + '%' } as CSSProperties}
                onClick={() => onTableClick(mesa.numero)}
                aria-label={'Mesa ' + mesa.numero + ' ' + mesa.estado}
              >
                {mesa.numero}
              </button>
            );
          })}
        </div>
      </div>
      <div className={'cr-planos-mesas__leyenda' + (assignmentMode ? ' cr-planos-mesas__leyenda--asignacion' : ' cr-planos-mesas__leyenda--consulta')} aria-label="Leyenda de estados de mesas">
        {assignmentMode && <>
          <span><i className="principal" />PRINCIPAL</span>
          <span><i className="adicional" />ADICIONAL</span>
          <span><i className="cambio-pendiente" />CAMBIO PENDIENTE</span>
        </>}
        <span><i className="libre" />LIBRE</span>
        <span><i className="reservada" />RESERVADA</span>
        <span><i className="ocupada" />OCUPADA</span>
        <span><i className="desactivada" />DESACTIVADA</span>
      </div>
    </>
  );
}
