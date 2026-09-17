import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { AreasWithoutCleaningTab } from './AreasWithoutCleaningTab'
import { ByAreaTab } from './ByAreaTab'
import { ByEmployeeTab } from './ByEmployeeTab'
import { CleaningTimesTab } from './CleaningTimesTab'
import { useReportFilterOptions } from './useReportFilterOptions'

const TABS = [
  { key: 'cleaning-times', label: 'Tiempos de limpieza por área' },
  { key: 'by-area', label: 'Por área' },
  { key: 'by-employee', label: 'Por empleado' },
  { key: 'without-cleaning', label: 'Áreas sin atender' },
]

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].key)
  const { areas, users } = useReportFilterOptions()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Reportes</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Analice tiempos de limpieza, cobertura por área y desempeño por empleado.
        </p>
      </div>

      <Tabs items={TABS} activeKey={activeTab} onChange={setActiveTab} />

      <div className="pt-2">
        {activeTab === 'cleaning-times' && <CleaningTimesTab areas={areas} users={users} />}
        {activeTab === 'by-area' && <ByAreaTab areas={areas} users={users} />}
        {activeTab === 'by-employee' && <ByEmployeeTab areas={areas} users={users} />}
        {activeTab === 'without-cleaning' && <AreasWithoutCleaningTab />}
      </div>
    </div>
  )
}
