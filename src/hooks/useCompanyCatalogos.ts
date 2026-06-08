import { useQuery } from '@tanstack/react-query'
import { companyApi } from '@/api/company'

const QK = {
  paises: ['company', 'paises'] as const,
  empresas: ['company', 'empresas'] as const,
  departamentos: (empresaId?: number) => ['company', 'departamentos', empresaId] as const,
  subDepartamentos: (depId?: number) => ['company', 'sub-departamentos', depId] as const,
  puestos: (subId?: number) => ['company', 'puestos', subId] as const,
}
const HORA = 1000 * 60 * 60

export const usePaises = () =>
  useQuery({ queryKey: QK.paises, queryFn: () => companyApi.paises(), staleTime: HORA })

export const useEmpresas = (paisId?: number) =>
  useQuery({
    queryKey: [...QK.empresas, paisId] as const,
    queryFn: () => companyApi.empresas(paisId),
    staleTime: HORA,
  })

export const useDepartamentos = (empresaId?: number) =>
  useQuery({
    queryKey: QK.departamentos(empresaId),
    queryFn: () => companyApi.departamentos(empresaId as number),
    enabled: Boolean(empresaId),
    staleTime: HORA,
  })

export const useSubDepartamentos = (departamentoId?: number) =>
  useQuery({
    queryKey: QK.subDepartamentos(departamentoId),
    queryFn: () => companyApi.subDepartamentos(departamentoId as number),
    enabled: Boolean(departamentoId),
    staleTime: HORA,
  })

export const usePuestos = (subDepartamentoId?: number) =>
  useQuery({
    queryKey: QK.puestos(subDepartamentoId),
    queryFn: () => companyApi.puestos(subDepartamentoId as number),
    enabled: Boolean(subDepartamentoId),
    staleTime: HORA,
  })
