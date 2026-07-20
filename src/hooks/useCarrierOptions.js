import { useTenant } from '../contexts/TenantContext';

const ALL_CARRIERS = [
  { serviceKey: 'carrier_transcargo',       value: 'transcargo',      label: 'Transcargo' },
  { serviceKey: 'carrier_aereo',            value: 'aereo',           label: 'Aéreo' },
  { serviceKey: 'carrier_palco',            value: 'palco',           label: 'Palco' },
  { serviceKey: 'carrier_cubapack',         value: 'cubapack',        label: 'CubaPack' },
  { serviceKey: 'carrier_cubapost',         value: 'cubapost',        label: 'CubaPost' },
  { serviceKey: 'carrier_transcargo_aereo', value: 'transcargoaereo', label: 'Transcargo Aéreo' },
];

export function useCarrierOptions() {
  const { tenantConfig } = useTenant();
  const enabled = new Set(tenantConfig?.enabledServices ?? []);
  return ALL_CARRIERS.filter(c => enabled.has(c.serviceKey));
}
